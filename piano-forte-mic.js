/**
 * Piano Forte microphone: G → B → A arms capture; subsequent notes build the string.
 * STOP ends capture (mic stays on); SUBMIT filters in the main feature.
 * Exposes window.PianoForteMic.attach(options) -> { detach, stopCapture }.
 */
(function (global) {
    'use strict';

    const LETTER_TO_PC = { A: 9, B: 11, C: 0, D: 2, E: 4, F: 5, G: 7 };
    const START_PHRASE = ['G', 'B', 'A'];

    const SAME_NOTE_GAP_MS = 220;
    const POST_PHRASE_ARM_MS = 150;
    const YIN_THRESHOLD = 0.14;
    const MIN_RMS = 0.008;

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

    function nearestLetter(midi, allowedUpper) {
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

    function attach(options) {
        const {
            allowedLetters,
            statusEl,
            enableBtn,
            disableBtn,
            resetStringBtn,
            stopBtn,
            getSequence,
            setSequence,
            updateDisplay,
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

        /** 'off' | 'listen_phrase' | 'capture' */
        let mode = 'off';
        let phraseStep = 0;
        let lastNoteTs = 0;
        let lastDetectedLetter = '';
        let postPhraseUntil = 0;
        let noteArmed = true;

        function setStatus(t) {
            if (statusEl) statusEl.textContent = t || '\u00a0';
        }

        function phraseStatusHint() {
            const need = START_PHRASE[phraseStep];
            const done = START_PHRASE.slice(0, phraseStep).join('–');
            if (phraseStep === 0) return 'Play G – B – A to start capture…';
            return `Phrase: ${done ? done + ' – ' : ''}next: ${need}`;
        }

        function resetPhrase() {
            phraseStep = 0;
        }

        function beginCapture(ts) {
            mode = 'capture';
            setSequence([]);
            updateDisplay();
            lastDetectedLetter = '';
            postPhraseUntil = ts + POST_PHRASE_ARM_MS;
            noteArmed = true;
            if (stopBtn) stopBtn.style.display = '';
            setStatus('Capture on — play notes, then STOP. String: (empty)');
        }

        function tryDetectNote(ts, allowedSet) {
            if (noiseBelowMin()) return null;
            if (!noteArmed) return null;
            const hz = yinPitch(winBuffer, audioCtx.sampleRate);
            if (hz <= 0) return null;
            const letter = nearestLetter(hzToMidi(hz), allowedSet);
            if (!letter) return null;
            if (letter === lastDetectedLetter && ts - lastNoteTs < SAME_NOTE_GAP_MS) return null;
            lastDetectedLetter = letter;
            lastNoteTs = ts;
            noteArmed = false;
            return letter;
        }

        let lastNoise = 0;
        function noiseBelowMin() {
            return lastNoise < MIN_RMS;
        }

        function consumeNote(letter, ts) {
            if (mode === 'listen_phrase') {
                const expected = START_PHRASE[phraseStep];
                if (letter === expected) {
                    phraseStep += 1;
                    if (phraseStep >= START_PHRASE.length) {
                        resetPhrase();
                        beginCapture(ts);
                        setStatus('Phrase complete — next note is first in string.');
                    } else {
                        setStatus(`Heard ${letter}. ${phraseStatusHint()}`);
                    }
                } else {
                    resetPhrase();
                    setStatus(`Heard ${letter} (expected ${expected}). ${phraseStatusHint()}`);
                }
                return;
            }

            if (mode === 'capture') {
                if (!allowed.includes(letter)) {
                    setStatus(`Heard ${letter} (not in your range). String: ${getSequence().join('') || '(empty)'}`);
                    return;
                }
                const seq = getSequence().slice();
                seq.push(letter);
                setSequence(seq);
                updateDisplay();
                setStatus(`Heard ${letter} — string: ${seq.join('')}`);
            }
        }

        function tick(ts) {
            rafId = requestAnimationFrame(tick);
            if (!analyser || !audioCtx) return;

            const fftSize = analyser.fftSize;
            if (!procBuffer || procBuffer.length !== fftSize) {
                procBuffer = new Float32Array(fftSize);
                winBuffer = new Float32Array(fftSize);
            }
            analyser.getFloatTimeDomainData(procBuffer);
            lastNoise = rms(procBuffer);
            if (lastNoise < MIN_RMS * 0.35) {
                noteArmed = true;
            }
            applyHann(procBuffer, winBuffer);

            if (mode !== 'listen_phrase' && mode !== 'capture') return;
            if (mode === 'capture' && ts < postPhraseUntil) return;

            const letter =
                mode === 'listen_phrase'
                    ? tryDetectNote(ts, START_PHRASE)
                    : tryDetectNote(ts, allowed);
            if (letter) consumeNote(letter, ts);
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
            resetPhrase();
            if (enableBtn) enableBtn.style.display = '';
            if (disableBtn) disableBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'none';
            setStatus('Microphone off.');
        }

        function stopCapture() {
            if (mode !== 'capture' && mode !== 'listen_phrase') return;
            const seq = getSequence().join('');
            mode = 'listen_phrase';
            resetPhrase();
            lastDetectedLetter = '';
            noteArmed = true;
            postPhraseUntil = 0;
            if (stopBtn) stopBtn.style.display = 'none';
            setStatus(
                seq
                    ? `Stopped. String: ${seq} — tap SUBMIT to filter, or G–B–A to capture again.`
                    : 'Stopped — play G–B–A to capture, or tap letter buttons.'
            );
        }

        async function startMic() {
            stopAudio();
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                if (onError) onError('Microphone not supported in this browser.');
                return;
            }
            try {
                mediaStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
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
            analyser.smoothingTimeConstant = 0.2;
            src.connect(analyser);

            if (audioCtx.state === 'suspended') {
                try {
                    await audioCtx.resume();
                } catch (_) {}
            }

            mode = 'listen_phrase';
            resetPhrase();
            lastNoteTs = 0;
            lastDetectedLetter = '';
            postPhraseUntil = 0;
            noteArmed = true;

            if (enableBtn) enableBtn.style.display = 'none';
            if (disableBtn) disableBtn.style.display = '';
            if (stopBtn) stopBtn.style.display = 'none';

            setStatus(phraseStatusHint());

            rafId = requestAnimationFrame(tick);
        }

        function onEnableClick() {
            startMic();
        }
        function onDisableClick() {
            stopAudio();
        }
        function onResetStringClick() {
            setSequence([]);
            updateDisplay();
            lastDetectedLetter = '';
            noteArmed = true;
            if (mode === 'capture') {
                setStatus('String cleared — keep playing notes, then STOP.');
            } else if (mode === 'listen_phrase') {
                setStatus(phraseStatusHint());
            }
        }
        function onStopClick() {
            stopCapture();
        }

        if (enableBtn) enableBtn.addEventListener('click', onEnableClick);
        if (disableBtn) disableBtn.addEventListener('click', onDisableClick);
        if (resetStringBtn) resetStringBtn.addEventListener('click', onResetStringClick);
        if (stopBtn) stopBtn.addEventListener('click', onStopClick);

        return {
            stopAudio,
            stopCapture,
            detach() {
                stopAudio();
                if (enableBtn) enableBtn.removeEventListener('click', onEnableClick);
                if (disableBtn) disableBtn.removeEventListener('click', onDisableClick);
                if (resetStringBtn) resetStringBtn.removeEventListener('click', onResetStringClick);
                if (stopBtn) stopBtn.removeEventListener('click', onStopClick);
            },
        };
    }

    global.PianoForteMic = { attach };
})(typeof window !== 'undefined' ? window : globalThis);
