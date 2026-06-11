/**
 * BOOK UPLOAD: extract long words from PDFs via PDF.js; save/load from localStorage.
 * Exposes window.BookUpload.init(options).
 */
(function (global) {
    'use strict';

    const STORAGE_PREFIX = 'bookUpload_';

    /** Known digital-book watermark tokens (stripped even if detection misses a line). */
    const JUNK_WORDS = new Set([
        'DIGITAL', 'INTERFACE', 'BOOKVIRTUAL', 'PENDING', 'RESERVED',
        'NAVIGATE', 'CONTROL', 'INTERNET', 'GUTENBERG', 'EBOOK', 'EBOOKS',
        'VOLUMEONE', 'VOLUMETWO', 'VOLUMETHREE', 'TYPOGRAPHICALLY', 'MONOTYPE',
        'POSTSCRIPT', 'TYPESETTING', 'OLOPHON', 'DISTRIBUTE', 'TRANSMITTED',
    ]);

    /** Imprint / colophon vocabulary — used to skip non-story pages, not per-word removal. */
    const PUBLISHING_MARKERS = new Set([
        'TYPOGRAPHY', 'TYPOGRAPHICALLY', 'PUBLICATION', 'PUBLISHER', 'PUBLISHED',
        'MACMILLAN', 'MONOTYPE', 'POSTSCRIPT', 'TYPESETTING', 'COLOPHON',
        'COPYRIGHT', 'REPRINTED', 'DISTRIBUTE', 'TRANSMITTED', 'EXCLUSIVELY',
        'FOUNDRY', 'CORPORATION', 'TYPESETTING', 'PRODUCING', 'PRODUCED',
        'INSTANT', 'REQUESTED', 'ENTIRETY', 'LANSTON', 'NEWBERRY', 'LIBRARY',
        'ADJUSTMENTS', 'AUTHORITATIVE', 'TYPESET', 'TYPESETTER',
    ]);

    const MAX_WORD_LENGTH = 22;

    function escapeRegExp(str) {
        return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function parseStandalonePageNum(str) {
        const t = String(str || '').trim();
        if (!/^\d{1,4}$/.test(t)) return null;
        const n = parseInt(t, 10);
        if (n < 1 || n > 9999) return null;
        // Copyright years and similar footer noise (e.g. 1998).
        if (n >= 1800 && n <= 2099) return null;
        return n;
    }

    /**
     * Read a printed page number from header/footer only (not body text).
     * Prefers a line that is just a number; otherwise first valid token in margin lines.
     */
    function detectPrintedPageNumber(items) {
        const lines = groupItemsIntoLines(items);
        const marginLines = lines.filter((line) => line.y <= 0.14 || line.y >= 0.86);
        const footerFirst = marginLines.slice().sort((a, b) => a.y - b.y);
        const ordered = footerFirst.concat(marginLines.filter((l) => l.y >= 0.86));

        for (let i = 0; i < ordered.length; i++) {
            const whole = parseStandalonePageNum(ordered[i].text);
            if (whole != null) return whole;
        }
        for (let i = 0; i < ordered.length; i++) {
            const tokens = ordered[i].text.split(/\s+/).filter(Boolean);
            for (let t = 0; t < tokens.length; t++) {
                const n = parseStandalonePageNum(tokens[t]);
                if (n != null) return n;
            }
        }
        return null;
    }

    /**
     * Map each PDF page to a book page number.
     * Uses one printed anchor + 1:1 fill forward/back; validates against every other
     * detected printed number. Falls back to PDF order (page 1, 2, 3…) on mismatch.
     */
    function assignBookPageNumbers(pdfPageCount, detectedPrinted) {
        const pdfOrder = () => Array.from({ length: pdfPageCount }, (_, i) => i + 1);

        const anchors = [];
        for (let i = 0; i < pdfPageCount; i++) {
            if (detectedPrinted[i] != null) {
                anchors.push({ pdfIndex: i + 1, printed: detectedPrinted[i] });
            }
        }

        if (!anchors.length) {
            return {
                assigned: pdfOrder(),
                mode: 'pdf_order',
                usedFallback: true,
                anchorCount: 0,
                validatedPrintedCount: 0,
            };
        }

        function buildFromAnchor(anchor) {
            return Array.from({ length: pdfPageCount }, (_, i) => {
                const pdfIdx = i + 1;
                return Math.max(1, anchor.printed + (pdfIdx - anchor.pdfIndex));
            });
        }

        function validatesAgainstPrinted(assigned) {
            for (let i = 0; i < pdfPageCount; i++) {
                if (detectedPrinted[i] != null && assigned[i] !== detectedPrinted[i]) {
                    return false;
                }
            }
            return true;
        }

        for (let a = 0; a < anchors.length; a++) {
            const assigned = buildFromAnchor(anchors[a]);
            if (validatesAgainstPrinted(assigned)) {
                return {
                    assigned,
                    mode: 'printed',
                    usedFallback: false,
                    anchorCount: anchors.length,
                    validatedPrintedCount: anchors.length,
                };
            }
        }

        return {
            assigned: pdfOrder(),
            mode: 'pdf_order',
            usedFallback: true,
            anchorCount: anchors.length,
            validatedPrintedCount: 0,
        };
    }

    /** Group PDF text items into horizontal lines by Y position. */
    function groupItemsIntoLines(items, yTolerance) {
        const tol = yTolerance != null ? yTolerance : 0.01;
        const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
        const lines = [];
        for (let i = 0; i < sorted.length; i++) {
            const it = sorted[i];
            let line = null;
            for (let j = 0; j < lines.length; j++) {
                if (Math.abs(lines[j].y - it.y) <= tol) {
                    line = lines[j];
                    break;
                }
            }
            if (!line) {
                line = { y: it.y, parts: [] };
                lines.push(line);
            }
            line.parts.push(it.str);
        }
        return lines.map((l) => ({
            y: l.y,
            text: l.parts.join(' ').replace(/\s+/g, ' ').trim(),
        }));
    }

    /**
     * Lines repeated in header/footer on many pages are treated as boilerplate
     * (Gutenberg / library watermarks, etc.).
     */
    function detectBoilerplateLineTexts(pages) {
        const counts = new Map();
        const pageCount = pages.length;
        if (pageCount < 2) return [];

        for (let p = 0; p < pages.length; p++) {
            const lines = groupItemsIntoLines(pages[p].items);
            const seenOnPage = new Set();
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.y > 0.14 && line.y < 0.86) continue;
                const norm = line.text.toUpperCase();
                if (norm.length < 6) continue;
                if (seenOnPage.has(norm)) continue;
                seenOnPage.add(norm);
                counts.set(norm, (counts.get(norm) || 0) + 1);
            }
        }

        const threshold = Math.max(3, Math.ceil(pageCount * 0.2));
        const boilerplate = [];
        counts.forEach((count, text) => {
            if (count >= threshold) boilerplate.push(text);
        });
        boilerplate.sort((a, b) => b.length - a.length);
        return boilerplate;
    }

    function stripBoilerplateFromText(text, boilerplateLines) {
        let out = String(text || '');
        for (let i = 0; i < boilerplateLines.length; i++) {
            const phrase = boilerplateLines[i];
            if (!phrase) continue;
            out = out.replace(new RegExp(escapeRegExp(phrase), 'gi'), ' ');
        }
        return out.replace(/\s+/g, ' ').trim();
    }

    function extractWordsFromText(text, minLength) {
        const min = Math.max(3, parseInt(minLength, 10) || 7);
        const parts = String(text || '').split(/[^A-Za-z]+/);
        const out = [];
        const seen = new Set();
        for (let i = 0; i < parts.length; i++) {
            const w = parts[i].toUpperCase();
            if (w.length < min || w.length > MAX_WORD_LENGTH) continue;
            if (seen.has(w) || JUNK_WORDS.has(w)) continue;
            seen.add(w);
            out.push(w);
        }
        return out;
    }

    function countUniqueWords(entries) {
        return new Set(entries.map((e) => e.word)).size;
    }

    function summarizeEntries(entries) {
        const pages = new Set();
        const words = new Set();
        for (let i = 0; i < entries.length; i++) {
            pages.add(entries[i].page);
            words.add(entries[i].word);
        }
        return {
            pagesWithWords: pages.size,
            totalInstances: entries.length,
            uniqueWords: words.size,
        };
    }

    /** Skip colophon, imprint, and title-spread pages that inflate unique-word counts. */
    function isBackMatterOrImprintPage(words, pageIndex, totalPages) {
        if (!words || words.length === 0) return true;

        let markerHits = 0;
        for (let i = 0; i < words.length; i++) {
            if (PUBLISHING_MARKERS.has(words[i])) markerHits++;
        }

        if (markerHits >= 3) return true;
        if (markerHits >= 2 && words.length >= 12) return true;

        const inTail = pageIndex >= Math.floor(totalPages * 0.9);
        if (inTail && markerHits >= 1 && words.length >= 8) return true;

        const titleMarkers = ['CARROLL', 'ADVENTURES', 'ILLINOIS', 'CHICAGO', 'EDITION', 'NOVEMBER'];
        let titleHits = 0;
        for (let i = 0; i < words.length; i++) {
            if (titleMarkers.indexOf(words[i]) !== -1) titleHits++;
        }
        if (titleHits >= 2 && words.length <= 30) return true;

        return false;
    }

    /** Trim leading/trailing whitespace only — internal spaces are kept. */
    function normalizeBookTitle(raw) {
        return String(raw || '').replace(/^\s+|\s+$/g, '');
    }

    function generateBookStorageId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    }

    /** Stable localStorage key; title (with spaces) is stored separately in the payload. */
    function makeStorageKey(existingKey) {
        if (existingKey && String(existingKey).startsWith(STORAGE_PREFIX)) {
            return existingKey;
        }
        return STORAGE_PREFIX + 'id_' + generateBookStorageId();
    }

    function legacyTitleFromStorageKey(key) {
        const bare = String(key || '').replace(STORAGE_PREFIX, '');
        if (!bare || bare.indexOf('id_') === 0) return 'Untitled book';
        return bare.replace(/_/g, ' ');
    }

    function bindBookTextInput(input) {
        if (!input) return;
        input.addEventListener('keydown', (e) => {
            if (e.key === ' ') e.stopPropagation();
        });
    }

    async function processPdfArrayBuffer(arrayBuffer, minLength, onProgress) {
        if (!global.pdfjsLib) {
            throw new Error('PDF.js is not loaded.');
        }
        const pdf = await global.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        const pages = [];

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            if (onProgress) onProgress(pageNum, numPages, `Reading page ${pageNum} of ${numPages}…`);

            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.0 });
            const viewportHeight = viewport.height;
            const textContent = await page.getTextContent();

            const items = textContent.items.map((item) => ({
                str: item.str,
                x: item.transform[4],
                y: 1 - item.transform[5] / viewportHeight,
            }));
            const fullText = items.map((it) => it.str).join(' ');

            const printedPage = detectPrintedPageNumber(items);
            pages.push({ pageNum, items, fullText, printedPage });
        }

        const detectedPrinted = pages.map((p) => p.printedPage);
        const pageNumbering = assignBookPageNumbers(numPages, detectedPrinted);
        const boilerplateLines = detectBoilerplateLineTexts(pages);
        const entries = [];
        let skippedImprintPages = 0;

        for (let i = 0; i < pages.length; i++) {
            const { pageNum, fullText } = pages[i];
            const bookPage = pageNumbering.assigned[i];
            if (onProgress) {
                onProgress(pageNum, numPages, `Extracting words from page ${pageNum} of ${numPages}…`);
            }

            const cleaned = stripBoilerplateFromText(fullText, boilerplateLines);
            const words = extractWordsFromText(cleaned, minLength);
            if (isBackMatterOrImprintPage(words, i, pages.length)) {
                skippedImprintPages++;
                continue;
            }
            for (let w = 0; w < words.length; w++) {
                entries.push({ word: words[w], page: bookPage });
            }
        }

        entries.sort((a, b) => a.word.localeCompare(b.word) || a.page - b.page);
        const stats = summarizeEntries(entries);

        return {
            entries,
            usedFallback: pageNumbering.usedFallback,
            pageNumberingMode: pageNumbering.mode,
            anchorCount: pageNumbering.anchorCount,
            validatedPrintedCount: pageNumbering.validatedPrintedCount,
            skippedUnnumbered: 0,
            skippedImprintPages,
            pageCount: numPages,
            uniqueWordCount: stats.uniqueWords,
            pagesWithWords: stats.pagesWithWords,
            totalInstances: stats.totalInstances,
            boilerplateLineCount: boilerplateLines.length,
        };
    }

    function saveBookToStorage(title, barcode, minLength, entries, existingStorageKey) {
        const storageKey = makeStorageKey(existingStorageKey);
        const existing = loadBookFromStorage(storageKey);
        const payload = {
            storageId: (existing && existing.storageId) || storageKey.replace(STORAGE_PREFIX + 'id_', ''),
            title: normalizeBookTitle(title),
            barcode: barcode ? String(barcode).trim() : '',
            minLength: parseInt(minLength, 10) || 7,
            entries,
            processedAt: new Date().toISOString(),
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
        return storageKey;
    }

    function loadBookFromStorage(storageKey) {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (_) {
            return null;
        }
    }

    function listSavedBooks() {
        const books = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
            const data = loadBookFromStorage(key);
            if (!data || !Array.isArray(data.entries)) continue;
            books.push({
                storageKey: key,
                title: data.title ? normalizeBookTitle(data.title) : legacyTitleFromStorageKey(key),
                barcode: data.barcode || '',
                minLength: data.minLength || 7,
                processedAt: data.processedAt || '',
                wordCount: countUniqueWords(data.entries),
            });
        }
        books.sort((a, b) => String(b.processedAt).localeCompare(String(a.processedAt)));
        return books;
    }

    function deleteBookFromStorage(storageKey) {
        if (!storageKey || !String(storageKey).startsWith(STORAGE_PREFIX)) return false;
        localStorage.removeItem(storageKey);
        return true;
    }

    function updateBookMetadata(storageKey, title, barcode) {
        const data = loadBookFromStorage(storageKey);
        if (!data || !Array.isArray(data.entries)) {
            return { ok: false, error: 'Could not load saved book.' };
        }
        const newTitle = normalizeBookTitle(title);
        const newBarcode = barcode ? String(barcode).trim() : '';
        if (!newTitle) {
            return { ok: false, error: 'Please enter a book title.' };
        }
        const payload = {
            storageId: data.storageId || storageKey.replace(STORAGE_PREFIX + 'id_', ''),
            title: newTitle,
            barcode: newBarcode,
            minLength: data.minLength || 7,
            entries: data.entries,
            processedAt: data.processedAt || new Date().toISOString(),
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
        return { ok: true, storageKey, data: payload };
    }

    function init(options) {
        const { panelEl, onWordlistReady, onError } = options;
        if (!panelEl) return null;

        const titleInput = panelEl.querySelector('#bookUploadTitle');
        const barcodeInput = panelEl.querySelector('#bookUploadBarcode');
        const minLengthInput = panelEl.querySelector('#bookUploadMinLength');
        const dropZone = panelEl.querySelector('#bookUploadDropZone');
        const fileInput = panelEl.querySelector('#bookUploadFileInput');
        const fileNameEl = panelEl.querySelector('#bookUploadFileName');
        const processBtn = panelEl.querySelector('#bookUploadProcessBtn');
        const progressWrap = panelEl.querySelector('#bookUploadProgressWrap');
        const progressBar = panelEl.querySelector('#bookUploadProgressBar');
        const progressLabel = panelEl.querySelector('#bookUploadProgressLabel');
        const statusNote = panelEl.querySelector('#bookUploadStatusNote');
        const savedList = panelEl.querySelector('#bookUploadSavedList');

        let selectedFile = null;
        let sessionBookStorageKey = null;

        function setError(msg) {
            if (onError) onError(msg);
            else alert(msg);
        }

        function updateProcessEnabled() {
            const title = normalizeBookTitle(titleInput && titleInput.value);
            if (processBtn) processBtn.disabled = !(title && selectedFile);
        }

        function setProgress(visible, pct, label) {
            if (progressWrap) progressWrap.style.display = visible ? '' : 'none';
            if (progressBar) progressBar.value = pct;
            if (progressLabel) progressLabel.textContent = label || '';
        }

        function loadSavedBook(storageKey) {
            const data = loadBookFromStorage(storageKey);
            if (!data || !Array.isArray(data.entries)) {
                setError('Could not load saved book.');
                return;
            }
            sessionBookStorageKey = storageKey;
            const bookTitle = data.title ? normalizeBookTitle(data.title) : legacyTitleFromStorageKey(storageKey);
            if (titleInput) titleInput.value = bookTitle;
            if (barcodeInput) barcodeInput.value = data.barcode || '';
            if (minLengthInput) minLengthInput.value = String(data.minLength || 7);
            if (statusNote) {
                statusNote.textContent = `Loaded “${bookTitle}” (${countUniqueWords(data.entries)} words).`;
            }
            if (onWordlistReady) {
                onWordlistReady(data.entries, {
                    title: bookTitle,
                    barcode: data.barcode,
                    minLength: data.minLength,
                    storageKey,
                    fromStorage: true,
                });
            }
        }

        function renderSavedBookEditRow(book) {
            const row = document.createElement('div');
            row.className = 'book-upload-saved-row book-upload-saved-row--editing';

            const form = document.createElement('div');
            form.className = 'book-upload-saved-edit';

            const titleLabel = document.createElement('label');
            titleLabel.className = 'book-upload-label';
            titleLabel.textContent = 'Book title';
            const titleField = document.createElement('input');
            titleField.type = 'text';
            titleField.className = 'book-upload-input';
            titleField.value = book.title || '';
            titleField.autocomplete = 'off';
            bindBookTextInput(titleField);

            const barcodeLabel = document.createElement('label');
            barcodeLabel.className = 'book-upload-label';
            barcodeLabel.textContent = 'Barcode / ISBN';
            const barcodeField = document.createElement('input');
            barcodeField.type = 'text';
            barcodeField.className = 'book-upload-input';
            barcodeField.value = book.barcode || '';
            barcodeField.autocomplete = 'off';
            bindBookTextInput(barcodeField);

            const actions = document.createElement('div');
            actions.className = 'book-upload-saved-actions';

            const saveBtn = document.createElement('button');
            saveBtn.type = 'button';
            saveBtn.className = 'book-upload-process-btn book-upload-saved-action-btn';
            saveBtn.textContent = 'Save';

            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'secondary-btn book-upload-saved-action-btn';
            cancelBtn.textContent = 'Cancel';

            saveBtn.addEventListener('click', () => {
                const result = updateBookMetadata(
                    book.storageKey,
                    titleField.value,
                    barcodeField.value
                );
                if (!result.ok) {
                    setError(result.error || 'Could not save changes.');
                    return;
                }
                if (sessionBookStorageKey === book.storageKey && titleInput) {
                    titleInput.value = result.data.title || '';
                }
                if (statusNote) {
                    statusNote.textContent = `Updated “${result.data.title}”.`;
                }
                renderSavedBooks();
            });

            cancelBtn.addEventListener('click', () => renderSavedBooks());

            form.appendChild(titleLabel);
            form.appendChild(titleField);
            form.appendChild(barcodeLabel);
            form.appendChild(barcodeField);
            actions.appendChild(saveBtn);
            actions.appendChild(cancelBtn);
            form.appendChild(actions);
            row.appendChild(form);
            return row;
        }

        function renderSavedBooks() {
            if (!savedList) return;
            const books = listSavedBooks();
            if (!books.length) {
                savedList.innerHTML = '<p class="book-upload-saved-empty">No saved books yet.</p>';
                return;
            }
            savedList.innerHTML = '';
            books.forEach((book) => {
                const row = document.createElement('div');
                row.className = 'book-upload-saved-row';

                const meta = document.createElement('div');
                meta.className = 'book-upload-saved-meta';
                const titleLine = document.createElement('strong');
                titleLine.textContent = book.title;
                const sub = document.createElement('span');
                sub.className = 'book-upload-saved-sub';
                const parts = [`${book.wordCount} words`, `min ${book.minLength}`];
                if (book.barcode) parts.unshift(book.barcode);
                sub.textContent = parts.join(' · ');
                meta.appendChild(titleLine);
                meta.appendChild(sub);

                const actions = document.createElement('div');
                actions.className = 'book-upload-saved-actions';

                const loadBtn = document.createElement('button');
                loadBtn.type = 'button';
                loadBtn.className = 'secondary-btn book-upload-saved-action-btn';
                loadBtn.textContent = 'Load';
                loadBtn.addEventListener('click', () => loadSavedBook(book.storageKey));

                const editBtn = document.createElement('button');
                editBtn.type = 'button';
                editBtn.className = 'secondary-btn book-upload-saved-action-btn';
                editBtn.textContent = 'Edit';
                editBtn.addEventListener('click', () => {
                    const editRow = renderSavedBookEditRow(book);
                    row.replaceWith(editRow);
                    const firstInput = editRow.querySelector('input');
                    if (firstInput) firstInput.focus();
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.type = 'button';
                deleteBtn.className = 'secondary-btn book-upload-saved-action-btn book-upload-saved-action-btn--danger';
                deleteBtn.textContent = 'Delete';
                deleteBtn.addEventListener('click', () => {
                    const label = book.title || 'this book';
                    if (!global.confirm(`Delete “${label}”? This cannot be undone.`)) return;
                    deleteBookFromStorage(book.storageKey);
                    if (sessionBookStorageKey === book.storageKey) {
                        sessionBookStorageKey = null;
                    }
                    if (statusNote && statusNote.textContent.indexOf(label) !== -1) {
                        statusNote.textContent = '';
                    }
                    renderSavedBooks();
                });

                actions.appendChild(loadBtn);
                actions.appendChild(editBtn);
                actions.appendChild(deleteBtn);

                row.appendChild(meta);
                row.appendChild(actions);
                savedList.appendChild(row);
            });
        }

        function onFileSelected(file) {
            if (!file) return;
            if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
                setError('Please select a PDF file.');
                return;
            }
            selectedFile = file;
            if (fileNameEl) fileNameEl.textContent = file.name;
            updateProcessEnabled();
        }

        bindBookTextInput(titleInput);
        bindBookTextInput(barcodeInput);
        if (titleInput) titleInput.addEventListener('input', updateProcessEnabled);
        if (minLengthInput && !minLengthInput.value) minLengthInput.value = '7';

        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => fileInput.click());
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('book-upload-drop-zone--over');
            });
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('book-upload-drop-zone--over');
            });
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('book-upload-drop-zone--over');
                const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
                onFileSelected(file);
            });
            fileInput.addEventListener('change', () => {
                onFileSelected(fileInput.files && fileInput.files[0]);
            });
        }

        if (processBtn) {
            processBtn.addEventListener('click', async () => {
                const title = normalizeBookTitle(titleInput && titleInput.value);
                if (!title) {
                    setError('Please enter a book title.');
                    return;
                }
                if (!selectedFile) {
                    setError('Please select a PDF file.');
                    return;
                }
                const minLength = minLengthInput ? minLengthInput.value : 7;
                processBtn.disabled = true;
                if (statusNote) statusNote.textContent = '';
                setProgress(true, 0, 'Reading PDF…');

                try {
                    const arrayBuffer = await selectedFile.arrayBuffer();
                    const result = await processPdfArrayBuffer(arrayBuffer, minLength, (cur, total, label) => {
                        const pct = total > 0 ? Math.round((cur / total) * 100) : 0;
                        setProgress(true, pct, label);
                    });

                    if (!result.entries.length) {
                        setError('No words found matching your criteria.');
                        return;
                    }

                    let reuseStorageKey = sessionBookStorageKey;
                    if (reuseStorageKey) {
                        const prev = loadBookFromStorage(reuseStorageKey);
                        if (prev && normalizeBookTitle(prev.title) !== title) {
                            reuseStorageKey = null;
                        }
                    }
                    const savedKey = saveBookToStorage(
                        title,
                        barcodeInput ? barcodeInput.value : '',
                        minLength,
                        result.entries,
                        reuseStorageKey
                    );
                    sessionBookStorageKey = savedKey;

                    if (statusNote) {
                        const stats = summarizeEntries(result.entries);
                        const unique = result.uniqueWordCount || stats.uniqueWords;
                        const pagesWithWords = result.pagesWithWords != null ? result.pagesWithWords : stats.pagesWithWords;
                        const totalInstances = result.totalInstances != null ? result.totalInstances : stats.totalInstances;
                        const stripped = result.boilerplateLineCount
                            ? ` Stripped ${result.boilerplateLineCount} repeated header/footer line(s).`
                            : '';
                        const skippedImprint = result.skippedImprintPages
                            ? ` Skipped ${result.skippedImprintPages} imprint/colophon page(s).`
                            : '';
                        let pageNote = 'Page numbers: PDF order (1, 2, 3…).';
                        if (result.pageNumberingMode === 'printed' && result.anchorCount > 0) {
                            pageNote = `Page numbers: from printed anchors (${result.anchorCount} found, all checked).`;
                        } else if (result.anchorCount > 0) {
                            pageNote = `Page numbers: PDF order (printed anchors did not validate).`;
                        }
                        statusNote.textContent =
                            `${result.pageCount} PDF pages scanned · ${pagesWithWords} pages with long words · ${totalInstances} instances · ${unique} unique words (min ${minLength}). ${pageNote}${stripped}${skippedImprint}`;
                    }

                    renderSavedBooks();

                    if (onWordlistReady) {
                        onWordlistReady(result.entries, {
                            title,
                            barcode: barcodeInput ? barcodeInput.value.trim() : '',
                            minLength,
                            pageCount: result.pageCount,
                            uniqueWordCount: result.uniqueWordCount,
                            fromStorage: false,
                        });
                    }
                } catch (err) {
                    console.error('BOOK UPLOAD process error:', err);
                    setError(err && err.message ? err.message : 'Failed to process PDF.');
                } finally {
                    setProgress(false, 0, '');
                    updateProcessEnabled();
                }
            });
        }

        renderSavedBooks();
        updateProcessEnabled();

        return {
            refreshSavedBooks: renderSavedBooks,
            show() {
                panelEl.style.display = '';
                renderSavedBooks();
            },
            hide() {
                panelEl.style.display = 'none';
            },
        };
    }

    global.BookUpload = {
        init,
        processPdfArrayBuffer,
        saveBookToStorage,
        loadBookFromStorage,
        listSavedBooks,
        deleteBookFromStorage,
        updateBookMetadata,
        makeStorageKey,
        normalizeBookTitle,
        countUniqueWords,
        summarizeEntries,
        detectPrintedPageNumber,
        assignBookPageNumbers,
        JUNK_WORDS,
    };
})(typeof window !== 'undefined' ? window : globalThis);
