/**
 * Piano Forte microphone capture: dyad+ chord starts and ends capture;
 * monophonic A–G (within allowed set) appends to the sequence.
 * Exposes window.PianoForteMic.attach(options) -> { detach }.
 */
(function (global) {
    'use strict';

    const LETTER_TO_PC = { A: 9, B: 11, C: 0, D: 2, E: 4, F: 5, G: 7 };

    const CHORD_HOLD_MS = 100;
    const POST_CHORD_SILENCE_MS = 200;
    const SAME_NOTE_GAP_MS = 220;
    const YIN_THRESHOLD = 0.12;
    const MIN_RMS = 0.012;

    function rms(buf) {
        let s = 0;
        for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
        return Math.sqrt(s / buf.length);
    }

    function applyHann(w, out) {
        const n = w.length;
        for (let i = 0; i < n; i++) {
            out[i] = w[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
        }
    }

    /** YIN fundamental frequency (Hz) or -1 */
    function yinPitch(buffer, sampleRate) {
        const half = Math.floor(buffer.length / 2);
        if (half < 4) return -1;
        const d = new Float32Array(half);
        for (let tau = 1; tau < half; tau++) {
            let sum = 0;
            for (let j = 0; j < half; j++) {
                const delta = buffer[j] - buffer[j + tau];
                sum += delta * delta;
            }
            d[tau] = sum;
        }
        let cumsum = 0;
        const dPrime = new Float32Array(half);
        dPrime[0] = 1;
        for (let tau = 1; tau < half; tau++) {
            cumsum += d[tau];
            dPrime[tau] = cumsum < 1e-10 ? 1 : (d[tau] * tau) / cumsum;
        }
        let tau = 2;
        for (; tau < half - 1; tau++) {
            if (dPrime[tau] < YIN_THRESHOLD) {
                while (tau + 1 < half && dPrime[tau + 1] < dPrime[tau]) tau++;
                let betterTau = tau;
                if (tau > 0 && tau < half - 1) {
                    const x0 = dPrime[tau - 1];
                    const x1 = dPrime[tau];
                    const x2 = dPrime[tau + 1];
                    const denom = 2 * x1 - x0 - x2;
                    if (Math.abs(denom) > 1e-10) {
                        betterTau = tau + (x2 - x0) / (2 * denom);
                    }
                }
                const hz = sampleRate / betterTau;
                if (hz > 55 && hz < 4200) return hz;
                return -1;
            }
        }
        return -1;
    }

    function hzToMidi(hz) {
        return 12 * Math.log2(hz / 440) + 69;
    }

    function nearestAllowedLetter(midi, allowedUpper) {
        const pc = Math.round(midi) % 12;
        const pcNorm = (pc + 12) % 12;
        let best = null;
        let bestDist = 99;
        for (let i = 0; i < allowedUpper.length; i++) {
            const L = allowedUpper[i];
            const t = LETTER_TO_PC[L];
            if (t === undefined) continue;
            const d = Math.min(Math.abs(pcNorm - t), 12 - Math.abs(pcNorm - t));
            if (d < bestDist) {
                bestDist = d;
                best = L;
            }
        }
        if (best === null) return null;
        if (bestDist > 2) return null;
        return best;
    }

    function chromaFromFrequencyData(freqData, sampleRate) {
        const chroma = new Float32Array(12);
        const n = freqData.length;
        const nyq = sampleRate / 2;
        for (let i = 0; i < n; i++) {
            const hz = (i / n) * nyq;
            if (hz < 65 || hz > 5000) continue;
            const db = freqData[i];
            if (!isFinite(db) || db < -92) continue;
            const lin = Math.pow(10, db / 20);
            const midi = 12 * Math.log2(hz / 440) + 69;
            const bin = ((Math.round(midi) % 12) + 12) % 12;
            chroma[bin] += lin * 0.86;
            chroma[(bin + 1) % 12] += lin * 0.07;
            chroma[(bin + 11) % 12] += lin * 0.07;
        }
        return chroma;
    }

    function countStrongChromaBins(chroma, relFloor) {
        let max = 0;
        for (let i = 0; i < 12; i++) if (chroma[i] > max) max = chroma[i];
        if (max < 1e-10) return 0;
        const thr = max * relFloor;
        let n = 0;
        for (let i = 0; i < 12; i++) {
            if (chroma[i] >= thr) n++;
        }
        return n;
    }

    function isChordLike(chroma) {
        return countStrongChromaBins(chroma, 0.32) >= 2;
    }

    function attach(options) {
        const {
            allowedLetters,
            statusEl,
            enableBtn,
            disableBtn,
            resetStringBtn,
            testStartBtn,
            testEndBtn,
            getSequence,
            setSequence,
            updateDisplay,
            onEndChordSubmit,
            onError,
        } = options;

        const allowed = (allowedLetters || ['A', 'B', 'C', 'D', 'E', 'F', 'G']).map((x) =>
            String(x).toUpperCase()
        );

        let audioCtx = null;
        let mediaStream = null;
        let analyser = null;
        let procBuffer = null;
        let winBuffer = null;
        let rafId = 0;
        let freqBuffer = null;
        let lastTs = 0;

        /** 'off' | 'idle_chord' | 'capture' */
        let mode = 'off';
        let chordHoldStart = 0;
        let lastNoteTs = 0;
        let lastAppendedLetter = '';
        let postChordUntil = 0;
        let noteArmed = true;

        function setStatus(t) {
            if (statusEl) statusEl.textContent = t || '\u00a0';
        }

        function stopAudio() {
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = 0;
            }
            if (mediaStream) {
                mediaStream.getTracks().forEach((t) => t.stop());
                mediaStream = null;
            }
            if (audioCtx) {
                audioCtx.close().catch(() => {});
                audioCtx = null;
            }
            analyser = null;
            mode = 'off';
            if (enableBtn) enableBtn.style.display = '';
            if (disableBtn) disableBtn.style.display = 'none';
            setStatus('Microphone off.');
        }

        function tick(ts) {
            rafId = requestAnimationFrame(tick);
            if (!analyser || !audioCtx) return;
            lastTs = ts;

            const fftSize = analyser.fftSize;
            if (!procBuffer || procBuffer.length !== fftSize) {
                procBuffer = new Float32Array(fftSize);
                winBuffer = new Float32Array(fftSize);
            }
            if (!freqBuffer || freqBuffer.length !== analyser.frequencyBinCount) {
                freqBuffer = new Float32Array(analyser.frequencyBinCount);
            }
            analyser.getFloatTimeDomainData(procBuffer);
            analyser.getFloatFrequencyData(freqBuffer);
            const noise = rms(procBuffer);
            if (noise < MIN_RMS * 0.35) {
                noteArmed = true;
            }
            applyHann(procBuffer, winBuffer);
            const chromaFreq = chromaFromFrequencyData(freqBuffer, audioCtx.sampleRate);
            const chord = noise >= MIN_RMS && isChordLike(chromaFreq);

            if (mode === 'idle_chord') {
                if (chord) {
                    if (!chordHoldStart) chordHoldStart = ts;
                    else if (ts - chordHoldStart >= CHORD_HOLD_MS) {
                        mode = 'capture';
                        chordHoldStart = 0;
                        postChordUntil = ts + POST_CHORD_SILENCE_MS;
                        setStatus('Listening for notes… (play another chord when done)');
                    }
                } else {
                    chordHoldStart = 0;
                }
                return;
            }

            if (mode === 'capture') {
                if (chord) {
                    if (!chordHoldStart) chordHoldStart = ts;
                    else if (ts - chordHoldStart >= CHORD_HOLD_MS && ts > postChordUntil) {
                        chordHoldStart = 0;
                        stopAudio();
                        onEndChordSubmit();
                        return;
                    }
                } else {
                    chordHoldStart = 0;
                }

                if (ts < postChordUntil) return;

                if (noise < MIN_RMS) return;

                if (!isChordLike(chromaFreq) && noteArmed) {
                    const hz = yinPitch(winBuffer, audioCtx.sampleRate);
                    if (hz > 0) {
                        const midi = hzToMidi(hz);
                        const letter = nearestAllowedLetter(midi, allowed);
                        if (letter) {
                            const seq = getSequence().slice();
                            const same =
                                letter === lastAppendedLetter && ts - lastNoteTs < SAME_NOTE_GAP_MS;
                            if (!same) {
                                seq.push(letter);
                                setSequence(seq);
                                updateDisplay();
                                lastAppendedLetter = letter;
                                lastNoteTs = ts;
                                noteArmed = false;
                                setStatus(`Heard ${letter} — string: ${seq.join('')}`);
                            }
                        }
                    }
                }
            }
        }

        async function startMic(fromManualCapture) {
            stopAudio();
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                if (onError) onError('Microphone not supported in this browser.');
                return;
            }
            try {
                mediaStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: true,
                        autoGainControl: false,
                    },
                });
            } catch (e) {
                if (onError) onError('Microphone permission denied or unavailable.');
                return;
            }
            audioCtx = new (global.AudioContext || global.webkitAudioContext)();
            const src = audioCtx.createMediaStreamSource(mediaStream);
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 8192;
            analyser.smoothingTimeConstant = 0.35;
            src.connect(analyser);

            if (audioCtx.state === 'suspended') {
                try {
                    await audioCtx.resume();
                } catch (_) {}
            }

            lastTs = 0;
            chordHoldStart = 0;
            lastNoteTs = 0;
            lastAppendedLetter = '';
            postChordUntil = 0;
            noteArmed = true;

            if (fromManualCapture) {
                mode = 'capture';
                postChordUntil = performance.now() + 50;
                setStatus('Test mode: capture on — add notes, then Test: end & submit.');
            } else {
                mode = 'idle_chord';
                setStatus('Play any 2+ note chord to begin…');
            }

            if (enableBtn) enableBtn.style.display = 'none';
            if (disableBtn) disableBtn.style.display = '';

            rafId = requestAnimationFrame(tick);
        }

        function onEnableClick() {
            startMic(false);
        }
        function onDisableClick() {
            stopAudio();
        }
        function onResetStringClick() {
            setSequence([]);
            updateDisplay();
            lastAppendedLetter = '';
            noteArmed = true;
            if (mode === 'capture' || mode === 'idle_chord') {
                setStatus('String cleared — keep playing notes, then end chord.');
            }
        }
        function onTestStartClick() {
            if (mode === 'off') startMic(true);
            else if (mode === 'idle_chord' || mode === 'capture') {
                mode = 'capture';
                postChordUntil = performance.now() + 50;
                noteArmed = true;
                setStatus('Test mode: capture on (start chord skipped).');
            }
        }
        function onTestEndClick() {
            if (mode === 'capture' || mode === 'idle_chord') {
                stopAudio();
                onEndChordSubmit();
            }
        }

        if (enableBtn) enableBtn.addEventListener('click', onEnableClick);
        if (disableBtn) disableBtn.addEventListener('click', onDisableClick);
        if (resetStringBtn) resetStringBtn.addEventListener('click', onResetStringClick);
        if (testStartBtn) testStartBtn.addEventListener('click', onTestStartClick);
        if (testEndBtn) testEndBtn.addEventListener('click', onTestEndClick);

        return {
            stopAudio,
            detach() {
                stopAudio();
                if (enableBtn) enableBtn.removeEventListener('click', onEnableClick);
                if (disableBtn) disableBtn.removeEventListener('click', onDisableClick);
                if (resetStringBtn) resetStringBtn.removeEventListener('click', onResetStringClick);
                if (testStartBtn) testStartBtn.removeEventListener('click', onTestStartClick);
                if (testEndBtn) testEndBtn.removeEventListener('click', onTestEndClick);
            },
        };
    }

    global.PianoForteMic = { attach };
})(typeof window !== 'undefined' ? window : globalThis);
