/**
 * Piano Forte microphone: G → B → A arms capture; sustained notes supported.
 * Live tuner readout while holding; stable pitch commits one letter per note.
 * STOP ends capture; SUBMIT filters in the main feature.
 */
(function (global) {
    'use strict';

    const LETTER_TO_PC = { A: 9, B: 11, C: 0, D: 2, E: 4, F: 5, G: 7 };
    const START_PHRASE = ['G', 'B', 'A'];

    const SAME_NOTE_GAP_MS = 220;
    const POST_PHRASE_ARM_MS = 150;
    const STABLE_COMMIT_MS = 120;
    const YIN_THRESHOLD = 0.14;
    const MIN_RMS = 0.008;
    const IN_TUNE_CENTS = 10;

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

    /** Cents vs nearest occurrence of pitch class for letter (any octave). */
    function centsToLetter(hz, letter) {
        const targetPc = LETTER_TO_PC[letter];
        if (targetPc === undefined) return 0;
        const midi = hzToMidi(hz);
        let nearest = Math.round(midi);
        let pc = ((nearest % 12) + 12) % 12;
        nearest += targetPc - pc;
        if (midi - (nearest - 12) < Math.abs(midi - nearest)) nearest -= 12;
        if (Math.abs(midi - (nearest + 12)) < Math.abs(midi - nearest)) nearest += 12;
        return (midi - nearest) * 100;
    }

    function formatCents(cents) {
        const c = Math.round(cents);
        if (Math.abs(c) <= IN_TUNE_CENTS) return 'in tune';
        return c > 0 ? `+${c}¢` : `${c}¢`;
    }

    function attach(options) {
        const {
            allowedLetters,
            statusEl,
            livePitchEl,
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
        let lastNoise = 0;

        let mode = 'off';
        let phraseStep = 0;
        let lastNoteTs = 0;
        let lastCommittedLetter = '';
        let postPhraseUntil = 0;
        let noteArmed = true;
        let idleStatus = 'Microphone off.';

        let stableLetter = '';
        let stableSince = 0;

        function setStatus(t) {
            idleStatus = t || '\u00a0';
            if (statusEl) statusEl.textContent = idleStatus;
        }

        function setLiveDisplay(text) {
            if (livePitchEl) livePitchEl.textContent = text || '—';
        }

        function phraseStatusHint() {
            const need = START_PHRASE[phraseStep];
            const done = START_PHRASE.slice(0, phraseStep).join('–');
            if (phraseStep === 0) return 'Play G – B – A (hold each note) to start capture…';
            return `Phrase: ${done ? done + ' – ' : ''}hold ${need}`;
        }

        function resetPhrase() {
            phraseStep = 0;
        }

        function resetStability() {
            stableLetter = '';
            stableSince = 0;
        }

        function beginCapture(ts) {
            mode = 'capture';
            setSequence([]);
            updateDisplay();
            lastCommittedLetter = '';
            postPhraseUntil = ts + POST_PHRASE_ARM_MS;
            noteArmed = true;
            resetStability();
            if (stopBtn) stopBtn.style.display = '';
            setStatus('Capture on — hold each note, then STOP. String: (empty)');
        }

        function readPitch(allowedSet) {
            if (lastNoise < MIN_RMS) return null;
            const hz = yinPitch(winBuffer, audioCtx.sampleRate);
            if (hz <= 0) return null;
            const midi = hzToMidi(hz);
            const letter = nearestLetter(midi, allowedSet);
            if (!letter) return { hz, letter: null, cents: 0 };
            return { hz, letter, cents: centsToLetter(hz, letter) };
        }

        function updateLiveReadout(pitch) {
            if (!pitch || !pitch.letter) {
                if (pitch && pitch.hz > 0) {
                    setLiveDisplay(`${Math.round(pitch.hz)} Hz`);
                } else {
                    setLiveDisplay('—');
                }
                return;
            }
            const tune = formatCents(pitch.cents);
            setLiveDisplay(`${pitch.letter}  ·  ${Math.round(pitch.hz)} Hz  ·  ${tune}`);
        }

        function consumeNote(letter, ts) {
            if (mode === 'listen_phrase') {
                const expected = START_PHRASE[phraseStep];
                if (letter === expected) {
                    phraseStep += 1;
                    if (phraseStep >= START_PHRASE.length) {
                        resetPhrase();
                        beginCapture(ts);
                        setStatus('Phrase complete — hold next note for first letter.');
                    } else {
                        setStatus(`Got ${letter}. ${phraseStatusHint()}`);
                    }
                } else {
                    resetPhrase();
                    setStatus(`Got ${letter} (expected ${expected}). ${phraseStatusHint()}`);
                }
                return;
            }

            if (mode === 'capture') {
                if (!allowed.includes(letter)) {
                    setStatus(
                        `Got ${letter} (not in range). String: ${getSequence().join('') || '(empty)'}`
                    );
                    return;
                }
                const seq = getSequence().slice();
                seq.push(letter);
                setSequence(seq);
                updateDisplay();
                setStatus(`Added ${letter} — string: ${seq.join('')}`);
            }
        }

        function tryCommitStable(ts, allowedSet, pitch) {
            if (!noteArmed) return;
            if (!pitch || !pitch.letter) {
                resetStability();
                return;
            }

            if (pitch.letter !== stableLetter) {
                stableLetter = pitch.letter;
                stableSince = ts;
                return;
            }

            if (ts - stableSince < STABLE_COMMIT_MS) return;

            if (
                pitch.letter === lastCommittedLetter &&
                ts - lastNoteTs < SAME_NOTE_GAP_MS
            ) {
                return;
            }

            lastCommittedLetter = pitch.letter;
            lastNoteTs = ts;
            noteArmed = false;
            resetStability();
            consumeNote(pitch.letter, ts);
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
                resetStability();
                if (mode === 'listen_phrase' || mode === 'capture') {
                    setLiveDisplay('—');
                    if (statusEl) statusEl.textContent = idleStatus;
                }
            }
            applyHann(procBuffer, winBuffer);

            if (mode !== 'listen_phrase' && mode !== 'capture') return;
            if (mode === 'capture' && ts < postPhraseUntil) {
                setLiveDisplay('—');
                return;
            }

            const allowedSet = mode === 'listen_phrase' ? START_PHRASE : allowed;

            if (lastNoise >= MIN_RMS) {
                const pitch = readPitch(allowedSet);
                updateLiveReadout(pitch);
                if (noteArmed) tryCommitStable(ts, allowedSet, pitch);
            } else if (statusEl) {
                statusEl.textContent = idleStatus;
            }
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
            resetStability();
            if (enableBtn) enableBtn.style.display = '';
            if (disableBtn) disableBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = 'none';
            setLiveDisplay('—');
            setStatus('Microphone off.');
        }

        function stopCapture() {
            if (mode !== 'capture' && mode !== 'listen_phrase') return;
            const seq = getSequence().join('');
            mode = 'listen_phrase';
            resetPhrase();
            lastCommittedLetter = '';
            noteArmed = true;
            postPhraseUntil = 0;
            resetStability();
            if (stopBtn) stopBtn.style.display = 'none';
            setLiveDisplay('—');
            setStatus(
                seq
                    ? `Stopped. String: ${seq} — SUBMIT to filter, or G–B–A to capture again.`
                    : 'Stopped — hold G–B–A to capture, or tap letter buttons.'
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
            analyser.smoothingTimeConstant = 0.15;
            src.connect(analyser);

            if (audioCtx.state === 'suspended') {
                try {
                    await audioCtx.resume();
                } catch (_) {}
            }

            mode = 'listen_phrase';
            resetPhrase();
            lastNoteTs = 0;
            lastCommittedLetter = '';
            postPhraseUntil = 0;
            noteArmed = true;
            resetStability();

            if (enableBtn) enableBtn.style.display = 'none';
            if (disableBtn) disableBtn.style.display = '';
            if (stopBtn) stopBtn.style.display = 'none';

            setLiveDisplay('—');
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
            lastCommittedLetter = '';
            noteArmed = true;
            resetStability();
            if (mode === 'capture') {
                setStatus('String cleared — hold notes, then STOP.');
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
