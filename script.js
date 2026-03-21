let wordList = [];
let totalWords = 0;
let isNewMode = true;
let isColour3Mode = true;
let isVowelMode = true;
let isShapeMode = true;
let currentFilteredWords = [];
let latestExportWords = [];
let exportButton = null;
let currentPosition = 0;
let currentPosition2 = -1;
let currentVowelIndex = 0;
let uniqueVowels = [];
let currentFilteredWordsForVowels = [];
let originalFilteredWords = [];
let hasAdjacentConsonants = null;
let hasO = null;
let selectedCurvedLetter = null;
let eeeCompleted = false;
let lexiconCompleted = false;
let originalLexCompleted = false;
let originalLexPosition = -1;
let currentPosition1Word = '';
let mostFrequentLetter = null;
let leastFrequentLetter = null;
let usedLettersInWorkflow = [];  // Track letters used in current workflow
let letterFrequencyMap = new Map();  // Store frequency of all letters
let scrabble1ExactMatchSet = new Set();  // Words with exact SCRABBLE1 score (highlighted blue)
let engineDisplayMap = null; // normalized word -> human-readable title

// SOLOGRAM: last submitted Y/N string and whether current workflow includes SOLOGRAM (for overlay)
let lastSologramYnString = null;
let workflowHasSologram = false;

// ATLAS Colours: when user enters 0–6, store count so we can show applicable colours at end of workflow (null = not used or skipped)
let lastAtlasColoursCount = null;

// BIRTHDAY: NUMEROLOGY helper data (dates + month names).
const BIRTHDAY_MONTH_NAMES = { 1: 'January', 2: 'February', 3: 'March', 4: 'April', 5: 'May', 6: 'June', 7: 'July', 8: 'August', 9: 'September', 10: 'October', 11: 'November', 12: 'December' };
let lastNumerologyDates = []; // [{ day, monthNum, monthName }, ...]

// BIRTHDAY: star sign helper
function getBirthdayStarSign(day, monthNum) {
    // Using standard Western zodiac date ranges
    const m = monthNum;
    const d = day;
    if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return 'ARIES';
    if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return 'TAURUS';
    if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return 'GEMINI';
    if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return 'CANCER';
    if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return 'LEO';
    if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return 'VIRGO';
    if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return 'LIBRA';
    if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return 'SCORPIO';
    if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return 'SAGITTARIUS';
    if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return 'CAPRICORN';
    if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return 'AQUARIUS';
    if ((m === 2 && d >= 19) || (m === 3 && d <= 20)) return 'PISCES';
    return '';
}

function numerologyDigitSum(n) {
    n = Math.abs(parseInt(n, 10)) || 0;
    while (n > 9) {
        let s = 0;
        while (n) { s += n % 10; n = Math.floor(n / 10); }
        n = s;
    }
    return n;
}

function computeNumerologyDates(numerologyNum, difference) {
    const N = Math.max(1, Math.min(9, parseInt(numerologyNum, 10)));
    const D = Math.max(0, parseInt(difference, 10));
    const m1 = N + D;
    const m2 = N - D;
    const monthNums = [];
    if (m1 >= 1 && m1 <= 12) monthNums.push(m1);
    if (m2 >= 1 && m2 <= 12 && m2 !== m1) monthNums.push(m2);
    if (monthNums.length === 0) return { valid: false, dates: [] };
    const daysForN = [];
    for (let d = 1; d <= 31; d++) {
        if (numerologyDigitSum(d) === N) daysForN.push(d);
    }
    const dates = [];
    for (const monthNum of monthNums) {
        const monthName = BIRTHDAY_MONTH_NAMES[monthNum] || '';
        for (const day of daysForN) {
            dates.push({ day, monthNum, monthName });
        }
    }
    lastNumerologyDates = dates;
    return { valid: true, dates };
}

// Version constant - increment .1 for each push update, major version when specified
const APP_VERSION = '12.0';

// Store T9 1 LIE (L4) data for "B" feature
let t9OneLieBlankIndex = null;  // Position of BLANK (0-3)
let t9LastGuessDigits = [];    // GUESS digits from LAST (1 or 2 digits 2-9), used by GUESS filter
let t9OneLiePossibleDigits = []; // Array of possible digits for BLANK
let t9OneLieSelectedDigits = []; // The full 4-digit selection from 1 LIE
let t9LastActual = '';           // ACTUAL from LAST (1 or 2 digits), used when 1 LIE follows LAST
let t9OneLieLastActualLength = 0; // When 1 LIE follows LAST: length of t9LastActual so B uses same slice

// Track if current workflow contains any T9 features
let workflowHasT9Feature = false;
// Tap-to-hold on wordlist to show T9 strings under each word (toggle)
let userShowT9ByLongPress = false;
// T9 B-IDENTITY definites overlay: only show after B-IDENTITY has been submitted
let workflowHasT9B = false;
let t9BSubmitted = false;

// SOLOGRAM: secondary wordlist (pointed-to words). One entry per word, uppercase.
const SOLOGRAM_SECONDARY_WORDS = [
    'HEADSCARF', 'POTPOURRI', 'SUPERHERO', 'TOSHIHARU', 'UNDERWEAR', 'NEWSPAPER', 'BARTENDER', 'DRUGSTORE', 'GRAVEYARD', 'APARTMENT', 'LOUDSPEAKER',
    'ECONOMISTS', 'CANDELABRA', 'WILLOWHERB', 'SCHOOLWORK', 'SCHOOLGIRL', 'PEPPERCORN', 'SWEETHEART', 'FLATLINERZ', 'SUPERSHARP', 'TELEVISION', 'SNOWFLAKES', 'EYEGLASSES', 'JACKHAMMER',
    'TEMPERATURE', 'ANNIVERSARY', 'BRILLIANTLY', 'CANDLELIGHT', 'DISQUIETING', 'ZESTFULNESS', 'FIRECRACKER', 'CANDLESTICK',
    'INDEPENDENCE', 'JOHANNESBURG', 'THUNDERSTORM', 'HEADQUARTERS', 'JUDGMENTALLY', 'TROUBLEMAKER', 'ILLUSTRATION', 'PHOTOGRAPHER', 'HANDKERCHIEF', 'RECEPTIONIST', 'MOUNTAINSIDE', 'OPTOMETRIST', 'WEIGHTLIFTER',
    'GRANDCHILDREN', 'POSSIBILITIES', 'SPORTSMANSHIP', 'THOUGHTLESSLY', 'UNCOMFORTABLY', 'EMBARRASSMENT', 'FLABBERGASTED', 'GRANDFATHERLY', 'HALFHEARTEDLY', 'KNOWLEDGEABLE', 'PREDETERMINED', 'THUNDERSTRUCK', 'VIDEOCASSETTE',
    'ABSENTMINDEDLY', 'LIGHTHEARTEDLY', 'RECOMMENDATION',
    'HEARTBREAKINGLY', 'STRAIGHTFORWARD'
];

// SOLOGRAM: word groups for pointed-to words. Default is "all" (button shows "DEFAULT").
let sologramSelectedGroupId = 'all';
const SOLOGRAM_WORD_GROUPS = {
    all: { label: 'ALL', words: SOLOGRAM_SECONDARY_WORDS },
    moabt: { label: 'MOABT', words: ['LOUDSPEAKER', 'KITCHENWARE', 'UNDERWEAR', 'ILLUSTRATION', 'RECEPTIONIST', 'FIRECRACKER', 'MOUNTAINSIDE', 'NEWSPAPER', 'EYEGLASSES', 'TELEVISION', 'BARTENDER', 'DRUGSTORE', 'OPTOMETRIST', 'VIDEOCASSETTE', 'WEIGHTLIFTER', 'HANDKERCHIEF', 'SNOWFLAKES', 'GRAVEYARD', 'APARTMENT', 'PHOTOGRAPHER', 'CANDLESTICK', 'JACKHAMMER'] },
    brushwood: { label: 'BRUSHWOOD', words: ['ABSENTMINDEDLY', 'BRILLIANTLY', 'CANDLELIGHT', 'DISQUIETING', 'EMBARRASSMENT', 'FLABBERGASTED', 'GRANDFATHERLY', 'HALFHEARTEDLY', 'JUDGMENTALLY', 'KNOWLEDGEABLE', 'LIGHTHEARTEDLY', 'PREDETERMINED', 'RECOMMENDATION', 'THUNDERSTRUCK', 'ZESTFULNESS'] },
    glance: { label: 'GLANCE', words: ['ECONOMISTS', 'GRANDCHILDREN', 'HEARTBREAKINGLY', 'INDEPENDENCE', 'POSSIBILITIES', 'SPORTSMANSHIP', 'THOUGHTLESSLY', 'UNCOMFORTABLY'] },
    months: { label: 'MONTHS', words: ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'] },
    other: { label: 'OTHER', words: ['CANDELABRA', 'WILLOWHERB', 'STRAIGHTFORWARD', 'TEMPERATURE', 'HEADSCARF', 'JOHANNESBURG', 'POTPOURRI', 'SCHOOLWORK', 'SCHOOLGIRL', 'THUNDERSTORM', 'PEPPERCORN', 'SUPERHERO', 'SUPERSHARP', 'TROUBLEMAKER', 'HEADQUARTERS', 'SWEETHEART', 'TOSHIHARU', 'ANNIVERSARY', 'FLATLINERZ'] }
};
function getSologramSecondaryWords() {
    const bookId = (appSettings && appSettings.sologramBook) || 'all';
    const group = SOLOGRAM_WORD_GROUPS[bookId] || SOLOGRAM_WORD_GROUPS.all;
    return group.words;
}

const ALPHABET_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
const VOWEL_SET = new Set(['A', 'E', 'I', 'O', 'U']);
const CONSONANT_LETTERS = ALPHABET_LETTERS.filter(letter => !VOWEL_SET.has(letter));

// POSITION-CONS State Management
const positionConsSequenceState = {};
let lastPositionConsLetters = '';
let lastPositionConsGeneratedLetters = '';

// Workflow Management
let workflows = JSON.parse(localStorage.getItem('workflows')) || [];
let currentWorkflow = null;

// App-wide settings (persisted in localStorage)
const DEFAULT_SETTINGS = {
    lengthBuffer1: false,
    t9LengthBuffer1: false,
    e21CheckAnywhere: false,
    atlasLetterSource: 'default',
    atlasCustomName: '',
    atlasCustomLetters: '',
    letterLyingMode: 'static',
    letterLyingStringSource: 'default',   // 'default' | 'personal' | 'saved'
    letterLyingStaticString: 'NTRLCSAIEUO',
    letterLyingSavedSets: [],             // [{ id, name, string }, ...]
    letterLyingSavedId: null,             // id of selected saved set when source is 'saved'
    letterLyingStaticMaxSteps: 0,         // 0 = use full static string (no auto-advance)
    letterLyingDynamicSteps: 4,
    zeroCurvesApprox: false,
    loveLettersRowCount: 5,
    loveLettersRow1: 'ABC',
    loveLettersRow2: 'DEF',
    loveLettersRow3: 'GHI',
    loveLettersRow4: 'JKL',
    loveLettersRow5: 'MNO',
    scrabbleBuffer1: false,
    decodePositionOn: false,
    decodePosition: 1,
    sologramBook: 'all',
    lexiconOverrideOn: false,
    lexiconOverrideThreshold: 50,
    lexiconOverrideContinueWorkflow: true,
    pianoForteUseCustomRange: false,
    pianoForteStartLetter: 'A',
    pianoForteEndLetter: 'G',
    dictionaryAlphaUseCustomRange: false,
    dictionaryAlphaBeginStart: 'A',
    dictionaryAlphaBeginEnd: 'M',
    dictionaryAlphaMidStart: 'I',
    dictionaryAlphaMidEnd: 'T',
    dictionaryAlphaEndStart: 'N',
    dictionaryAlphaEndEnd: 'Z',
    omegaMode: 'esp',
    omegaCustomGroupName: '',
    omegaCustomShapes: [], // [{ name: "Shape", letters: "ABC" }, ...]
    omegaShapesCount: 0,    // 0 = until SUBMIT; N = auto-submit after N shapes
    skipWorkflowDeleteConfirm: false,
    alphaDirectionsCount: 0,  // 0 = enter until SUBMIT; N = auto-submit after N directions
    alphaSwapPov: false,       // OFF: Left=toward A, Right=toward Z; ON: swap
    eyeTestFirstLetter: 'E',
    calculusMode: 'abstract',  // 'abstract' (digits 0–9) or 'curvesStraight' (C/S)
    advLexIgnorePosition1: false,  // ADV-LEX: when ON, do not suggest Position 1; use next best position
    // MUTE / MUTE DUO: letter mode: 'az' = A–Z fixed sequence, 'mostFrequent' = dynamic most-frequent letter,
    // 'custom' = user-defined string then Most Frequent after it is exhausted
    muteLetterMode: 'az',
    muteCustomSequence: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    // ENGINE API keys (stored locally in this browser)
    tmdbApiKey: '',
    anthropicApiKey: '',
    /** Empty = auto: localhost:3000 when app is opened from localhost/127.0.0.1, else production Render URL */
    engineApiBaseUrl: '',
    // NAME ENGINE: after loading filmography, optional step to filter by number of words in each title
    nameEngineWordCount: false,
    // NAME ENGINE Word Count: when ON, allow titles with (N-1)..(N+1) words like LENGTH 1 buffer
    nameEngineWordCountBuffer1: false,
};

const DEFAULT_LETTER_LYING_STRING = 'NTRLCSAIEUO';

// OMEGA: positional shape filter (mode = esp | pocket | restaurant)
const omegaMappings = {
    esp: {
        Circle: 'BCDGJOPQRSU',
        Cross: 'ABDEFGHIJKLMNPRTVWXYZ',
        WavyLines: 'BCEFGIJLMNPRSUWYZ',
        Square: 'ABCDEFGHIJKLMNOPQRTUWZ',
        Star: 'AEHJKLMNRTVWXYZ'
    },
    pocket: {
        Keys: 'MNRT',
        Coin: 'OCDG',
        Card: 'ACEK',
        Phone: 'PHNOE',
        Wallet: 'WALT'
    },
    restaurant: {
        Plate: 'PLATE',
        Knife: 'KNIFE',
        Fork: 'FORK',
        Glass: 'GLASS',
        Napkin: 'NAPKIN'
    },
    straightCurved: {
        Straight: 'AEFHIKLMNTVWXYZ',
        Curved: 'BCDGJOPQRSUW'
    }
};
const omegaForbiddenPairs = [['Q', 'Z'], ['J', 'Q'], ['V', 'Q']];
let omegaSelections = [];
let omegaActiveMapping = {};

// CALCULUS: positional digit filter (like OMEGA Short but digits 0-9 → fixed letter sets). Same forbidden pairs as OMEGA.
const calculusMapping = {
    '1': 'ADEFHIJKLMNPRTUVWXYZ',
    '2': 'BCDJLMNOPQRSUVWXYZ',
    '3': 'BCDEGJKMNOPQRSUVWZ',
    '4': 'ACDEFGHIJKLMNPQRTVWXYZ',
    '5': 'BCDEFGHJMOPSUVZ',
    '6': 'BCDEFGJMOPQRSUY',
    '7': 'ADFHIJKLMNPRTVWXYZ',
    '8': 'BCDEFGHJMOPQRSUWXYZ',
    '9': 'BCDEGJMOPQRSYZ',
    '0': 'BCDGOPQRS'
};
// CALCULUS Curves/Straight mode: C = curved letters, S = straight letters
const calculusCurvesStraightMapping = {
    'C': 'BCDGJOPQRSUWY',
    'S': 'AEFHIKLMNTVWXYZ'
};

// EYE TEST Snellen-style chart configuration
const EYE_ROW_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const EYE_RANDOM_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const EYE_CHART_W = 600;
const EYE_CHART_H = 820;

function buildEyeTestChartLetters() {
    const g1 = (document.getElementById('eyeTestWord1')?.value || '').toUpperCase();
    const g2 = (document.getElementById('eyeTestWord2')?.value || '').toUpperCase();
    const g3 = (document.getElementById('eyeTestWord3')?.value || '').toUpperCase();
    const g4 = (document.getElementById('eyeTestWord4')?.value || '').toUpperCase();
    const g5 = (document.getElementById('eyeTestWord5')?.value || '').toUpperCase();

    const rows = [];

    // Row 1: single configurable letter (default E)
    let firstLetter = 'E';
    try {
        const raw = appSettings && typeof appSettings.eyeTestFirstLetter === 'string'
            ? appSettings.eyeTestFirstLetter
            : 'E';
        const cleaned = raw.toUpperCase().replace(/[^A-Z]/g, '');
        if (cleaned.length === 1) {
            firstLetter = cleaned;
        }
    } catch (e) {
        firstLetter = 'E';
    }
    rows.push(firstLetter);

    // Rows 2–6: derived from EYE TEST groups (pad with E if short)
    rows.push(g1.slice(0, 2).padEnd(2, 'E')); // row 2
    rows.push(g2.slice(0, 3).padEnd(3, 'E')); // row 3
    rows.push(g3.slice(0, 4).padEnd(4, 'E')); // row 4
    rows.push(g4.slice(0, 5).padEnd(5, 'E')); // row 5
    rows.push(g5.slice(0, 6).padEnd(6, 'E')); // row 6

    // Rows 7–11: random letters
    for (let row = 6; row < EYE_ROW_COUNTS.length; row++) {
        let s = '';
        const count = EYE_ROW_COUNTS[row];
        for (let i = 0; i < count; i++) {
            s += EYE_RANDOM_LETTERS[Math.floor(Math.random() * 26)];
        }
        rows.push(s);
    }

    return rows.join('');
}

function drawEyeTestChart(canvas, letters) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width || EYE_CHART_W;
    const H = canvas.height || EYE_CHART_H;
    const scaleX = W / EYE_CHART_W;
    const scaleY = H / EYE_CHART_H;

    ctx.save();
    ctx.scale(scaleX, scaleY);
    ctx.clearRect(0, 0, EYE_CHART_W, EYE_CHART_H);

    ctx.fillStyle = '#FDFCF7';
    ctx.fillRect(0, 0, EYE_CHART_W, EYE_CHART_H);

    ctx.fillStyle = '#C0392B';
    ctx.fillRect(0, 0, EYE_CHART_W, 6);

    ctx.fillStyle = '#1a1a1a';
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('SNELLEN CHART', EYE_CHART_W / 2, 28);

    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(40, 36);
    ctx.lineTo(EYE_CHART_W - 40, 36);
    ctx.stroke();

    const maxFontSize = 90;
    const minFontSize = 10;
    let letterIndex = 0;
    let y = 50;

    const acuityLabels = ['20/200', '20/160', '20/125', '20/100', '20/80', '20/63', '20/50', '20/40', '20/32', '20/25', '20/20'];

    for (let row = 0; row < EYE_ROW_COUNTS.length; row++) {
        const count = EYE_ROW_COUNTS[row];
        const t = row / (EYE_ROW_COUNTS.length - 1);
        const fontSize = Math.round(maxFontSize - t * (maxFontSize - minFontSize));
        const spacing = fontSize * 1.3;
        const rowWidth = count * spacing;
        const startX = (EYE_CHART_W - rowWidth) / 2 + spacing / 2;

        ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
        ctx.fillStyle = '#1a1a1a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        for (let i = 0; i < count; i++) {
            const letter = letters[letterIndex++] || 'E';
            ctx.fillText(letter, startX + i * spacing, y);
        }

        ctx.font = `${Math.max(7, fontSize * 0.25)}px 'Courier New', monospace`;
        ctx.fillStyle = '#C0392B';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(acuityLabels[row], EYE_CHART_W - 56, y + fontSize * 0.3);
        ctx.fillStyle = '#1a1a1a';

        y += fontSize * 1.55 + 4;
    }

    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(40, EYE_CHART_H - 22);
    ctx.lineTo(EYE_CHART_W - 40, EYE_CHART_H - 22);
    ctx.stroke();

    ctx.font = "10px 'Courier New', monospace";
    ctx.fillStyle = '#999';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('TEST DISTANCE: 6 METRES / 20 FEET', EYE_CHART_W / 2, EYE_CHART_H - 8);

    ctx.fillStyle = '#C0392B';
    ctx.fillRect(0, EYE_CHART_H - 3, EYE_CHART_W, 3);

    ctx.restore();
}

function applyCalculusFilter(words, digitString) {
    if (!digitString || digitString.length === 0) return words;
    const len = digitString.length;
    const exactWordLen = len;  // word length must equal sequence length
    const mode = (appSettings && appSettings.calculusMode) || 'abstract';
    return words.filter(word => {
        const w = word.toUpperCase();
        if (w.length !== exactWordLen) return false;
        for (let i = 0; i < len; i++) {
            const d = digitString[i];
            let allowed;
            if (mode === 'curvesStraight') {
                allowed = calculusCurvesStraightMapping[d];
            } else {
                allowed = calculusMapping[d];
            }
            if (!allowed || !allowed.includes(w[i])) return false;
        }
        for (let i = 1; i < w.length; i++) {
            if (omegaForbiddenPairs.some(pair =>
                pair[0] === w[i - 1] && pair[1] === w[i]
            )) return false;
        }
        return true;
    });
}

function applyOmegaFilter(words, selections) {
    if (!selections || selections.length === 0) return words;
    return words.filter(word => {
        const w = word.toUpperCase();
        if (w.length < selections.length) return false;
        for (let i = 0; i < selections.length; i++) {
            const allowed = omegaActiveMapping[selections[i]];
            if (!allowed || !allowed.includes(w[i])) return false;
        }
        for (let i = 1; i < w.length; i++) {
            if (omegaForbiddenPairs.some(pair =>
                pair[0] === w[i - 1] && pair[1] === w[i]
            )) return false;
        }
        return true;
    });
}

function getWordlistPathForEfficiency(value) {
    switch (value) {
        case '4000': return { wordlistPath: 'words/4000.txt', gzippedPath: 'words/4000.txt.gz' };
        case '19127': return { wordlistPath: 'words/19127.txt', gzippedPath: 'words/19127.txt.gz' };
        case 'emotions': return { wordlistPath: 'words/EmotionsJobsSpiritAnimals.txt', gzippedPath: 'words/EmotionsJobsSpiritAnimals.txt.gz' };
        case '10000': return { wordlistPath: 'words/10000.txt', gzippedPath: 'words/10000.txt.gz' };
        case '134k':
        case '134K':
            return { wordlistPath: 'words/134K.txt', gzippedPath: 'words/134K.txt.gz' };
        case 'boysnames': return { wordlistPath: 'words/BoysNames.txt', gzippedPath: 'words/BoysNames.txt.gz' };
        case 'girlsnames': return { wordlistPath: 'words/GirlsNames.txt', gzippedPath: 'words/GirlsNames.txt.gz' };
        case 'allnames': return { wordlistPath: 'words/AllNames.txt', gzippedPath: 'words/AllNames.txt.gz' };
        case 'colouritems': return { wordlistPath: 'words/ColourItems.txt', gzippedPath: 'words/ColourItems.txt.gz' };
        case 'enuk': return { wordlistPath: 'words/ENUK-Long words Noun.txt', gzippedPath: 'words/ENUK-Long words Noun.txt.gz' };
        case 'months_starsigns': return { wordlistPath: 'words/MONTHS_STARSIGNS.txt', gzippedPath: null };
        default: return { wordlistPath: 'words/4000.txt', gzippedPath: 'words/4000.txt.gz' };
    }
}

function permutations(arr, len) {
    if (len <= 0 || len > arr.length) return len === 0 ? [[]] : [];
    const out = [];
    function pick(rest, chosen) {
        if (chosen.length === len) {
            out.push(chosen.slice());
            return;
        }
        for (let i = 0; i < rest.length; i++) {
            chosen.push(rest[i]);
            pick(rest.slice(0, i).concat(rest.slice(i + 1)), chosen);
            chosen.pop();
        }
    }
    pick(arr.slice(), []);
    return out;
}

function computeOmegaEfficiency(mapping, words) {
    if (!words || words.length === 0) return null;
    const keys = Object.keys(mapping);
    if (keys.length === 0) return 0;
    const saved = omegaActiveMapping;
    omegaActiveMapping = mapping;
    let minWords = words.length + 1;  // best among permutations with >= 1 word
    let zeroCount = 0;
    let totalCount = 0;
    const maxLen = Math.min(5, keys.length);
    try {
        for (let len = 1; len <= maxLen; len++) {
            const perms = permutations(keys, len);
            for (const seq of perms) {
                const filtered = applyOmegaFilter(words, seq);
                totalCount++;
                if (filtered.length === 0) {
                    zeroCount++;
                } else if (filtered.length < minWords) {
                    minWords = filtered.length;
                }
            }
        }
    } finally {
        omegaActiveMapping = saved;
    }
    const W = words.length;
    if (W <= 1) return zeroCount === totalCount ? 0 : (minWords <= 1 ? 100 : 0);
    if (totalCount === 0) return 0;
    const noValidBest = minWords > words.length;  // no permutation had >= 1 word
    if (noValidBest) return 0;
    const base = minWords === 1 ? 100 : (W - minWords) / (W - 1) * 100;
    const multiplier = 1 - zeroCount / totalCount;
    return Math.round(Math.max(0, Math.min(100, multiplier * base)));
}

const LOVE_LETTERS_DEFAULT = {
    rowCount: 5,
    row1: 'ABC', row2: 'DEF', row3: 'GHI', row4: 'JKL', row5: 'MNO',
};

let appSettings = loadAppSettings();

function loadAppSettings() {
    try {
        const raw = localStorage.getItem('revolutionSettings');
        if (!raw) return { ...DEFAULT_SETTINGS };
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (e) {
        console.warn('Failed to load settings, using defaults', e);
        return { ...DEFAULT_SETTINGS };
    }
}

function saveAppSettings() {
    try {
        localStorage.setItem('revolutionSettings', JSON.stringify(appSettings));
    } catch (e) {
        console.warn('Failed to save settings', e);
    }
}

const DEFAULT_ENGINE_API_PRODUCTION = 'https://coretest-new.onrender.com';
const DEFAULT_ENGINE_API_LOCAL = 'http://localhost:3000';

/** Base URL for ENGINE requests (no trailing slash). Used by NAME / WORD ENGINE pre-step. */
function getEngineApiBaseUrl() {
    const custom = (appSettings && typeof appSettings.engineApiBaseUrl === 'string')
        ? appSettings.engineApiBaseUrl.trim()
        : '';
    if (custom) {
        return custom.replace(/\/+$/, '');
    }
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
        const h = window.location.hostname;
        if (h === 'localhost' || h === '127.0.0.1') {
            return DEFAULT_ENGINE_API_LOCAL;
        }
    }
    return DEFAULT_ENGINE_API_PRODUCTION;
}

function getEngineClaudeApiUrl() {
    return `${getEngineApiBaseUrl()}/api/claude`;
}

// Global workflow state management
let workflowState = {
    confirmedLetters: new Set(), // Letters we KNOW are in the word
    excludedLetters: new Set(),  // Letters we KNOW are NOT in the word
    confirmedPositions: {},      // Letters we know are at specific positions
    wordLength: null,           // If we know the word length
    hasVowels: new Set(),       // Vowels we've confirmed are in the word
    excludedVowels: new Set(),  // Vowels we've confirmed are NOT in the word
    hasO: null,                 // Whether word contains 'O' (from O? feature)
    hasE: null,                 // Whether word contains 'E' (from EEE features)
    abcdeSelection: new Set(),  // Letters selected in ABCDE feature
    abcSelection: new Set(),    // Letters selected in ABC feature
    mostFrequentRank: 1,        // Current rank for most frequent letter
    leastFrequentRank: 1,       // Current rank for least frequent letter
    usedLettersInWorkflow: []   // Track letters used in workflow (existing)
};

// Function to reset workflow state
function resetWorkflowState() {
    workflowState = {
        confirmedLetters: new Set(),
        excludedLetters: new Set(),
        confirmedPositions: {},
        wordLength: null,
        hasVowels: new Set(),
        excludedVowels: new Set(),
        hasO: null,
        hasE: null,
        abcdeSelection: new Set(),
        abcSelection: new Set(),
        mostFrequentRank: 1,
        leastFrequentRank: 1,
        usedLettersInWorkflow: []
    };
}

// T9 conversion mapping (standard phone keypad)
const t9Mapping = {
    'A': '2', 'B': '2', 'C': '2',
    'D': '3', 'E': '3', 'F': '3',
    'G': '4', 'H': '4', 'I': '4',
    'J': '5', 'K': '5', 'L': '5',
    'M': '6', 'N': '6', 'O': '6',
    'P': '7', 'Q': '7', 'R': '7', 'S': '7',
    'T': '8', 'U': '8', 'V': '8',
    'W': '9', 'X': '9', 'Y': '9', 'Z': '9'
};

// Convert word to T9 string
function wordToT9(word) {
    return word.toUpperCase().split('').map(char => t9Mapping[char] || '').join('');
}

// Calculate and store T9 strings for wordlist (only when needed)
let t9StringsMap = new Map();
let t9StringsCalculated = false;

function calculateT9Strings(words) {
    if (!t9StringsCalculated) {
        words.forEach(word => {
            t9StringsMap.set(word, wordToT9(word));
        });
        t9StringsCalculated = true;
    }
}

// Function to check if a letter is already known
function isLetterKnown(letter) {
    return workflowState.confirmedLetters.has(letter) || workflowState.excludedLetters.has(letter);
}

// Function to get known status of a letter
function getLetterStatus(letter) {
    if (workflowState.confirmedLetters.has(letter)) return 'confirmed';
    if (workflowState.excludedLetters.has(letter)) return 'excluded';
    return 'unknown';
}

// Function to log workflow state for debugging
function logWorkflowState() {
    console.log('=== WORKFLOW STATE ===');
    console.log('Confirmed letters:', Array.from(workflowState.confirmedLetters));
    console.log('Excluded letters:', Array.from(workflowState.excludedLetters));
    console.log('Confirmed positions:', workflowState.confirmedPositions);
    console.log('Word length:', workflowState.wordLength);
    console.log('Has vowels:', Array.from(workflowState.hasVowels));
    console.log('Excluded vowels:', Array.from(workflowState.excludedVowels));
    console.log('Has O:', workflowState.hasO);
    console.log('Has E:', workflowState.hasE);
    console.log('ABCDE selection:', Array.from(workflowState.abcdeSelection));
    console.log('ABC selection:', Array.from(workflowState.abcSelection));
    console.log('=====================');
}

// DOM Elements
const createWorkflowButton = document.getElementById('createWorkflowButton');
const cancelWorkflowButton = document.getElementById('cancelWorkflowButton');
const saveWorkflowButton = document.getElementById('saveWorkflowButton');
const backToHomeButton = document.getElementById('backToHomeButton');
const workflowName = document.getElementById('workflowName');
const selectedFeaturesList = document.getElementById('selectedFeaturesList');
const workflowSelect = document.getElementById('workflowSelect');
const performButton = document.getElementById('performButton');

// MUTE feature state
let muteSequence = [];
let muteLetterIndex = 0;
let muteUsedLetters = new Set();
let muteDynamicSequence = [];
let muteLetterSequence = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let muteMostFrequentEnabled = true;

// MUTE DUO feature state (two independent words, shared letter stream)
let muteDuoSequence1 = []; // Binary choices for Word 1
let muteDuoSequence2 = []; // Binary choices for Word 2
let muteDuoLetterIndex = 0; // Shared current letter index (like SpectatorFilterPage)
let muteDuoLetterSequence = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let muteDuoUsedLetters = new Set();
let muteDuoDynamicSequence = [];

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Register service worker for PWA functionality
    if ('serviceWorker' in navigator) {
        try {
            // Register from current path so PWA works at any URL (e.g. /coretest/, /coretest-new/)
            const swPath = new URL('service-worker.js', document.baseURI).href;
            const registration = await navigator.serviceWorker.register(swPath, {
                updateViaCache: 'none' // Never use cached service worker
            });
            console.log('Service Worker registered successfully:', registration);
            
            // Check for updates immediately and on focus
            const checkForUpdates = () => {
                registration.update().catch(err => console.log('Update check failed:', err));
            };
            
            // Check immediately
            checkForUpdates();
            
            // Check when page becomes visible (user returns to app)
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    checkForUpdates();
                }
            });
            
            // Check when window gains focus
            window.addEventListener('focus', checkForUpdates);
            
            // Check for updates periodically
            setInterval(checkForUpdates, 30000); // Check every 30 seconds
            
            // Listen for service worker updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New service worker available, reload to use it
                            console.log('New service worker available, reloading...');
                            // Force reload after a short delay to ensure cache is cleared
                            setTimeout(() => {
                                window.location.reload(true);
                            }, 100);
                        } else if (newWorker.state === 'activated') {
                            // Service worker activated, reload to get fresh content
                            console.log('Service worker activated, reloading...');
                            window.location.reload(true);
                        }
                    });
                }
            });
            
            // Listen for controller change (service worker takeover)
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('Service worker controller changed, reloading...');
                window.location.reload(true);
            });
            
            // Listen for messages from service worker
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'SW_ACTIVATED') {
                    console.log('Service worker activated, version:', event.data.version, '- reloading to get fresh content...');
                    // Clear all caches before reload
                    if ('caches' in window) {
                        caches.keys().then(cacheNames => {
                            return Promise.all(
                                cacheNames.map(cacheName => {
                                    console.log('Clearing cache:', cacheName);
                                    return caches.delete(cacheName);
                                })
                            );
                        }).then(() => {
                            console.log('All caches cleared, reloading...');
                            window.location.reload(true);
                        });
                    } else {
                        window.location.reload(true);
                    }
                }
            });
            
            // Manual cache clear function (for testing/debugging)
            window.clearAllCaches = async function() {
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => {
                        console.log('Deleting cache:', name);
                        return caches.delete(name);
                    }));
                }
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
                }
                console.log('All caches cleared. Reloading...');
                window.location.reload(true);
            };
            
            // Send skip waiting message to service worker if it's waiting
            if (registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
        } catch (error) {
            console.log('Service Worker registration failed:', error);
        }
    }
    
    // Load saved workflows from localStorage
    const savedWorkflows = localStorage.getItem('workflows');
    if (savedWorkflows) {
        workflows = JSON.parse(savedWorkflows);
        // Set the most recent workflow as default if there are any workflows
        if (workflows.length > 0) {
            const mostRecentWorkflow = workflows[workflows.length - 1];
            workflowSelect.value = mostRecentWorkflow.name;
            const workflowCustomSelect = document.getElementById('workflowCustomSelect');
            if (workflowCustomSelect) {
                const selectedText = workflowCustomSelect.querySelector('.selected-text');
                if (selectedText) {
                    selectedText.textContent = mostRecentWorkflow.name;
                }
            }
        }
    }

    // Initialize Settings UI (buffer toggles etc.)
    initSettingsUI();
    
    // Initialize version display
    function initializeVersionDisplay() {
        const versionDisplay = document.getElementById('versionDisplay');
        if (versionDisplay) {
            // Check if in PWA mode (standalone or fullscreen)
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                                window.matchMedia('(display-mode: fullscreen)').matches ||
                                (window.navigator.standalone === true);
            
            // Format version: "B12.0" in browser, "12.0" in PWA
            if (isStandalone) {
                versionDisplay.textContent = `V: ${APP_VERSION}`;
            } else {
                versionDisplay.textContent = `V: B${APP_VERSION}`;
            }
        }
    }
    
    // Initialize version display
    initializeVersionDisplay();
    
    // Also check on resize/orientation change (in case mode changes)
    window.addEventListener('resize', initializeVersionDisplay);
    window.addEventListener('orientationchange', initializeVersionDisplay);
    
    // Initialize dropdowns and button listeners
    initializeDropdowns();
    
    // Display saved workflows
    displaySavedWorkflows();
    
    // Initialize NOT IN feature
    initializeNotInFeature();

    // Ensure export button is available immediately
    initializeExportButton();

    // Add wordlist change listener - reset loaded flag when wordlist changes
    const wordlistSelect = document.getElementById('wordlistSelect');
    wordlistSelect.addEventListener('change', () => {
        // Reset the loaded flag so new wordlist will be loaded when workflow executes
        wordListLoaded = false;
        wordList = [];
        currentFilteredWords = [];
        updateExportButtonState(currentFilteredWords);
    });

    const availableFeatures = document.getElementById('availableFeatures');
    if (availableFeatures) {
        console.log('[DEBUG] On load: scrollHeight:', availableFeatures.scrollHeight, 'clientHeight:', availableFeatures.clientHeight);
        setTimeout(() => {
            console.log('[DEBUG] After 500ms: scrollHeight:', availableFeatures.scrollHeight, 'clientHeight:', availableFeatures.clientHeight);
        }, 500);
        window.addEventListener('resize', () => {
            console.log('[DEBUG] On resize: scrollHeight:', availableFeatures.scrollHeight, 'clientHeight:', availableFeatures.clientHeight);
        });
    }
});

// Function to initialize dropdowns
function initializeDropdowns() {
    // --- WORKFLOW DROPDOWN ---
    const workflowSelect = document.getElementById('workflowSelect');
    // Remove all options except the first two
    while (workflowSelect.options.length > 2) {
        workflowSelect.remove(2);
    }
    // Add options for each saved workflow
    const savedWorkflows = JSON.parse(localStorage.getItem('workflows') || '[]');
    savedWorkflows.forEach(workflow => {
        const option = document.createElement('option');
        option.value = workflow.name;
        option.textContent = workflow.name;
        workflowSelect.appendChild(option);
    });
    // Remove any existing custom-select immediately after workflowSelect
    let nextElem = workflowSelect.nextElementSibling;
    while (nextElem && nextElem.classList && nextElem.classList.contains('custom-select')) {
        const toRemove = nextElem;
        nextElem = nextElem.nextElementSibling;
        toRemove.parentNode.removeChild(toRemove);
    }
    // Create new custom select
    const workflowCustomSelect = document.createElement('div');
    workflowCustomSelect.className = 'custom-select';
    workflowCustomSelect.id = 'workflowCustomSelect';
    workflowCustomSelect.innerHTML = `
        <div class="selected-text">${workflowSelect.options[workflowSelect.selectedIndex]?.textContent || 'Select a workflow...'}</div>
        <div class="options-list"></div>
    `;
    workflowSelect.insertAdjacentElement('afterend', workflowCustomSelect);
    // Find and set z-index on parent dropdown container
    const workflowDropdownContainer = workflowSelect.closest('.dropdown');
    if (workflowDropdownContainer) {
        workflowDropdownContainer.style.zIndex = '99999';
        workflowDropdownContainer.style.position = 'relative';
    }
    const workflowSelectedText = workflowCustomSelect.querySelector('.selected-text');
    const workflowOptionsList = workflowCustomSelect.querySelector('.options-list');
    // Set very high z-index to ensure workflow dropdown is always on top
    workflowCustomSelect.style.zIndex = '99999';
    workflowCustomSelect.style.position = 'relative';
    workflowOptionsList.style.zIndex = '99999';
    // Populate options
    workflowOptionsList.innerHTML = '';
    const defaultWorkflowOptions = [
        { value: '', text: 'Select a workflow...' },
        { value: 'create-new', text: 'New Workflow' }
    ];
    defaultWorkflowOptions.forEach(option => {
        const optionElement = document.createElement('div');
        optionElement.className = 'option';
        optionElement.textContent = option.text;
        optionElement.dataset.value = option.value;
        workflowOptionsList.appendChild(optionElement);
    });
    savedWorkflows.forEach(workflow => {
        const optionElement = document.createElement('div');
        optionElement.className = 'option';
        optionElement.textContent = workflow.name;
        optionElement.dataset.value = workflow.name;
        workflowOptionsList.appendChild(optionElement);
    });
    // Event handlers
    const closeWorkflowDropdown = () => {
        workflowOptionsList.classList.remove('show');
        workflowOptionsList.style.cssText = '';
        document.body.classList.remove('workflow-dropdown-open');
    };
    const toggleWorkflowDropdown = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        closeWordlistDropdown();
        if (workflowOptionsList.classList.contains('show')) {
            closeWorkflowDropdown();
        } else {
            // Ensure workflow dropdown container and parent are on top
            const workflowDropdownContainer = workflowSelect.closest('.dropdown');
            if (workflowDropdownContainer) {
                workflowDropdownContainer.style.zIndex = '99999';
                workflowDropdownContainer.style.position = 'relative';
            }
            workflowCustomSelect.style.zIndex = '99999';
            workflowCustomSelect.style.position = 'relative';
            workflowOptionsList.classList.add('show');
            workflowOptionsList.style.cssText = `
                display: block !important;
                position: absolute;
                width: 100%;
                height: auto;
                max-height: none;
                overflow: visible;
                z-index: 99999 !important;
                background: white;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            `;
            document.body.classList.add('workflow-dropdown-open');
        }
    };
    workflowCustomSelect.addEventListener('click', toggleWorkflowDropdown);
    workflowCustomSelect.addEventListener('touchstart', toggleWorkflowDropdown, { passive: false });
    const handleWorkflowOptionSelect = (e) => {
        e.preventDefault(); e.stopPropagation();
        const option = e.target.closest('.option');
        if (!option) return;
        const value = option.dataset.value;
        const text = option.textContent;
        workflowSelect.value = value;
        workflowSelectedText.textContent = text;
        closeWorkflowDropdown();
        if (value === 'create-new') { showWorkflowCreation(); }
    };
    workflowOptionsList.addEventListener('click', handleWorkflowOptionSelect);
    workflowOptionsList.addEventListener('touchstart', handleWorkflowOptionSelect, { passive: false });

    // --- WORDLIST DROPDOWN ---
    const wordlistSelect = document.getElementById('wordlistSelect');
    // Remove any existing custom-select immediately after wordlistSelect
    nextElem = wordlistSelect.nextElementSibling;
    while (nextElem && nextElem.classList && nextElem.classList.contains('custom-select')) {
        const toRemove = nextElem;
        nextElem = nextElem.nextElementSibling;
        toRemove.parentNode.removeChild(toRemove);
    }
    // Create new custom select
    const wordlistCustomSelect = document.createElement('div');
    wordlistCustomSelect.className = 'custom-select';
    wordlistCustomSelect.id = 'wordlistCustomSelect';
    wordlistCustomSelect.innerHTML = `
        <div class="selected-text">${wordlistSelect.options[wordlistSelect.selectedIndex]?.textContent || '4000 Wordlist'}</div>
        <div class="options-list"></div>
    `;
    wordlistSelect.insertAdjacentElement('afterend', wordlistCustomSelect);
    const wordlistSelectedText = wordlistCustomSelect.querySelector('.selected-text');
    const wordlistOptionsList = wordlistCustomSelect.querySelector('.options-list');
    wordlistCustomSelect.style.zIndex = '100';
    wordlistOptionsList.style.zIndex = '101';
    // Populate options
    wordlistOptionsList.innerHTML = '';
    Array.from(wordlistSelect.options).forEach(option => {
        const customOption = document.createElement('div');
        customOption.className = 'option';
        customOption.textContent = option.textContent;
        customOption.dataset.value = option.value;
        if (option.selected) { customOption.classList.add('selected'); }
        wordlistOptionsList.appendChild(customOption);
    });
    // Event handlers
    const closeWordlistDropdown = () => {
        wordlistOptionsList.classList.remove('show');
        wordlistOptionsList.style.cssText = '';
    };
    const toggleWordlistDropdown = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        closeWorkflowDropdown();
        if (wordlistOptionsList.classList.contains('show')) {
            closeWordlistDropdown();
        } else {
            wordlistOptionsList.classList.add('show');
            wordlistOptionsList.style.cssText = `
                display: block !important;
                position: absolute;
                width: 100%;
                height: auto;
                max-height: none;
                overflow: visible;
                z-index: 101;
                background: white;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            `;
        }
    };
    wordlistCustomSelect.addEventListener('click', toggleWordlistDropdown);
    wordlistCustomSelect.addEventListener('touchstart', toggleWordlistDropdown, { passive: false });
    const handleWordlistOptionSelect = (e) => {
        e.preventDefault(); e.stopPropagation();
        const option = e.target.closest('.option');
        if (!option) return;
        const value = option.dataset.value;
        const text = option.textContent;
        wordlistSelect.value = value;
        wordlistSelectedText.textContent = text;
        closeWordlistDropdown();
    };
    wordlistOptionsList.addEventListener('click', handleWordlistOptionSelect);
    wordlistOptionsList.addEventListener('touchstart', handleWordlistOptionSelect, { passive: false });

    // --- OUTSIDE CLICK HANDLERS ---
    const closeDropdowns = (e) => {
        if (!workflowCustomSelect.contains(e.target)) { closeWorkflowDropdown(); }
        if (!wordlistCustomSelect.contains(e.target)) { closeWordlistDropdown(); }
    };
    document.addEventListener('click', closeDropdowns);
    document.addEventListener('touchstart', closeDropdowns, { passive: true });

    // Set up button listeners
    setupButtonListeners();
}

// Function to setup button listeners
function setupButtonListeners() {
    // Create Workflow button
    const createWorkflowButton = document.getElementById('createWorkflowButton');
    if (createWorkflowButton) {
        createWorkflowButton.replaceWith(createWorkflowButton.cloneNode(true));
        const newCreateWorkflowButton = document.getElementById('createWorkflowButton');
        newCreateWorkflowButton.addEventListener('click', showWorkflowCreation);
        newCreateWorkflowButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            showWorkflowCreation();
        }, { passive: false });
    }
    
    // Toggle Saved Workflows button
    const toggleSavedWorkflowsButton = document.getElementById('toggleSavedWorkflows');
    if (toggleSavedWorkflowsButton) {
        toggleSavedWorkflowsButton.replaceWith(toggleSavedWorkflowsButton.cloneNode(true));
        const newToggleButton = document.getElementById('toggleSavedWorkflows');
        newToggleButton.addEventListener('click', toggleSavedWorkflows);
        newToggleButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            toggleSavedWorkflows();
        }, { passive: false });
    }
    
    // Workflow Builder: Home (top left)
    const workflowBuilderHomeButton = document.getElementById('workflowBuilderHomeButton');
    if (workflowBuilderHomeButton) {
        workflowBuilderHomeButton.addEventListener('click', hideWorkflowCreation);
        workflowBuilderHomeButton.addEventListener('touchstart', (e) => { e.preventDefault(); hideWorkflowCreation(); }, { passive: false });
    }
    // Workflow Builder: BACK (under Home when in group) – shown/hidden by showT9Features etc.
    const workflowBuilderBackButton = document.getElementById('workflowBuilderBackButton');
    if (workflowBuilderBackButton) {
        workflowBuilderBackButton.addEventListener('click', function() {
            if (typeof showNormalFeatures === 'function') showNormalFeatures();
            workflowBuilderBackButton.style.display = 'none';
        });
        workflowBuilderBackButton.addEventListener('touchstart', (e) => { e.preventDefault(); workflowBuilderBackButton.click(); }, { passive: false });
    }
    // Cancel Workflow button
    const cancelWorkflowButton = document.getElementById('cancelWorkflowButton');
    if (cancelWorkflowButton) {
        cancelWorkflowButton.replaceWith(cancelWorkflowButton.cloneNode(true));
        const newCancelWorkflowButton = document.getElementById('cancelWorkflowButton');
        newCancelWorkflowButton.addEventListener('click', hideWorkflowCreation);
        newCancelWorkflowButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            hideWorkflowCreation();
        }, { passive: false });
    }

    // Workflow builder HOME / BACK / SAVE icon buttons
    const wbHome = document.getElementById('workflowBuilderHomeButton');
    if (wbHome) {
        wbHome.replaceWith(wbHome.cloneNode(true));
        const newHome = document.getElementById('workflowBuilderHomeButton');
        newHome.addEventListener('click', hideWorkflowCreation);
        newHome.addEventListener('touchstart', (e) => { e.preventDefault(); hideWorkflowCreation(); }, { passive: false });
    }
    const wbBack = document.getElementById('workflowBuilderBackButton');
    if (wbBack) {
        wbBack.replaceWith(wbBack.cloneNode(true));
        const newBack = document.getElementById('workflowBuilderBackButton');
        newBack.style.display = 'none';
        newBack.addEventListener('click', showNormalFeatures);
        newBack.addEventListener('touchstart', (e) => { e.preventDefault(); showNormalFeatures(); }, { passive: false });
    }
    // Save Workflow button
    const saveWorkflowButton = document.getElementById('saveWorkflowButton');
    if (saveWorkflowButton) {
        saveWorkflowButton.replaceWith(saveWorkflowButton.cloneNode(true));
        const newSaveWorkflowButton = document.getElementById('saveWorkflowButton');
        newSaveWorkflowButton.addEventListener('click', saveWorkflow);
        newSaveWorkflowButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            saveWorkflow();
        }, { passive: false });
    }
    
    // Perform button
    const performButton = document.getElementById('performButton');
    if (performButton) {
        performButton.replaceWith(performButton.cloneNode(true));
        const newPerformButton = document.getElementById('performButton');
        newPerformButton.addEventListener('click', async () => {
            const selectedWorkflow = document.getElementById('workflowSelect').value;
            if (!selectedWorkflow) {
                alert('Please select a workflow first');
                return;
            }
            try {
                const workflow = workflows.find(w => w.name === selectedWorkflow);
                if (!workflow) {
                    throw new Error('Selected workflow not found');
                }
                document.getElementById('homepage').style.display = 'none';
                document.getElementById('workflowCreation').style.display = 'none';
                const workflowExecution = document.getElementById('workflowExecution');
                workflowExecution.style.display = 'block';
                await executeWorkflow(workflow.steps);
            } catch (error) {
                console.error('Error executing workflow:', error);
                alert('Error executing workflow: ' + error.message);
            }
        });
        newPerformButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            newPerformButton.click();
        }, { passive: false });
    }

}

// Function to add feature to selected features list
function addFeatureToList(feature) {
    const selectedFeaturesList = document.getElementById('selectedFeaturesList');
    if (!selectedFeaturesList) return;
    
    // Check if feature is already selected
    const existingFeature = selectedFeaturesList.querySelector(`[data-feature="${feature}"]`);
    if (!existingFeature) {
        const featureItem = document.createElement('div');
        featureItem.className = 'selected-feature-item';
        featureItem.setAttribute('data-feature', feature);
        featureItem.draggable = true;
        
        const featureName = document.createElement('span');
        featureName.textContent = feature.toUpperCase();
        featureItem.appendChild(featureName);
        
        // Add click event to remove feature
        featureItem.addEventListener('click', () => {
            featureItem.remove();
        });
        
        // Add touch and drag events for mobile
        featureItem.addEventListener('touchstart', (e) => {
            e.preventDefault();
            featureItem.classList.add('dragging');
            featureItem.remove();
        }, { passive: false });
        
        featureItem.addEventListener('touchend', (e) => {
            e.preventDefault();
            featureItem.classList.remove('dragging');
        }, { passive: false });
        
        featureItem.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', feature);
            e.dataTransfer.effectAllowed = 'move';
            featureItem.classList.add('dragging');
        });
        
        featureItem.addEventListener('dragend', () => {
            featureItem.classList.remove('dragging');
        });
        
        selectedFeaturesList.appendChild(featureItem);
    }
}

// Function to check if a letter is curved
function isCurvedLetter(letter) {
    if (!letter) return false;
    letter = letter.toUpperCase();
    return letterShapes.curved.has(letter);
}

// Function to filter words by curved letter positions
function filterWordsByCurvedPositions(words, positions) {
    // Special case: if input is "0", filter for words with all straight letters in first 5 positions
    if (positions === "0") {
        return words.filter(word => {
            // Check first 5 positions (or word length if shorter)
            for (let i = 0; i < Math.min(5, word.length); i++) {
                if (isCurvedLetter(word[i])) {
                    return false; // Reject if any curved letter found
                }
            }
            return true; // Keep if all letters are straight
        });
    }

    // Convert positions string to array of numbers and validate
    const positionArray = positions.split('')
        .map(Number)
        .filter(pos => pos >= 1 && pos <= 5); // Only allow positions 1-5
    
    if (positionArray.length === 0) {
        console.log('No valid positions provided');
        return words;
    }
    
    return words.filter(word => {
        // Skip words shorter than the highest required position
        const maxPosition = Math.max(...positionArray);
        if (word.length < maxPosition) {
            return false;
        }
        
        // Check each position from 1 to 5
        for (let i = 0; i < 5; i++) {
            const pos = i + 1; // Convert to 1-based position
            const letter = word[i];
            
            // Skip if we've reached the end of the word
            if (!letter) {
                continue;
            }
            
            if (positionArray.includes(pos)) {
                // This position should have a curved letter
                if (!isCurvedLetter(letter)) {
                    return false;
                }
            } else {
                // This position should have a straight letter
                if (isCurvedLetter(letter)) {
                    return false;
                }
            }
        }
        
        return true;
    });
}

/** ZERO CURVES: positions 1–6 only. approx: if true, only require curved at entered positions; if false, non-entered positions in 1–6 must be straight. "0" = no curved letters in 1–6. */
function filterWordsByZeroCurves(words, positions, approx) {
    const posStr = (positions || '').toString().trim();
    const checkLen = 6;

    if (posStr === '0') {
        return words.filter(word => {
            for (let i = 0; i < Math.min(checkLen, word.length); i++) {
                if (isCurvedLetter(word[i])) return false;
            }
            return true;
        });
    }

    const positionArray = posStr.split('').map(Number).filter(p => p >= 1 && p <= checkLen);
    if (positionArray.length === 0) return words;

    return words.filter(word => {
        const maxPos = Math.max(...positionArray);
        if (word.length < maxPos) return false;
        for (let i = 0; i < checkLen; i++) {
            const pos = i + 1;
            const letter = word[i];
            if (!letter) continue;
            const isCurved = isCurvedLetter(letter);
            if (positionArray.includes(pos)) {
                if (!isCurved) return false;
            } else {
                if (!approx && isCurved) return false;
            }
        }
        return true;
    });
}

// --- Love Letters: count of distinct letters per group (rows 1-5) ---
/** Build array of Sets from settings; each Set = distinct A-Z letters for that row. */
function getLoveLettersGroups() {
    const count = Math.max(1, Math.min(5, (appSettings && appSettings.loveLettersRowCount) || 5));
    const out = [];
    for (let r = 1; r <= count; r++) {
        const key = 'loveLettersRow' + r;
        const s = (appSettings && appSettings[key]) || '';
        const set = new Set();
        const upper = (typeof s === 'string' ? s : '').toUpperCase().replace(/[^A-Z]/g, '');
        for (const c of upper) set.add(c);
        out.push(set);
    }
    return out;
}

/** Pure filter: keep words where, for each row, the number of distinct letters from that row's group that appear in the word equals the digit at that position. */
function filterWordsByLoveLetters(words, digitString, groups) {
    if (!groups || groups.length === 0) return words;
    const digits = (digitString || '').toString().replace(/\D/g, '');
    if (digits.length !== groups.length) return words;
    return words.filter(word => {
        const upper = word.toUpperCase();
        for (let i = 0; i < groups.length; i++) {
            let distinct = 0;
            for (const letter of groups[i]) {
                if (upper.includes(letter)) distinct++;
            }
            const want = parseInt(digits[i], 10);
            if (isNaN(want) || distinct !== want) return false;
        }
        return true;
    });
}

// Word categories mapping
const wordCategories = {
    // Business and commerce
    business: new Set(['BUSINESS', 'COMPANY', 'CORPORATION', 'ENTERPRISE', 'INDUSTRY', 'MARKET', 'TRADE', 'COMMERCE', 'OFFICE', 'STORE', 'SHOP']),
    
    // Technology and electronics
    technology: new Set(['COMPUTER', 'PHONE', 'CAMERA', 'RADIO', 'TELEVISION', 'LAPTOP', 'CHARGING', 'BATTERY', 'SCREEN', 'KEYBOARD', 'MOUSE', 'PRINTER', 'SCANNER', 'ROUTER', 'SERVER', 'NETWORK', 'WIFI', 'BLUETOOTH', 'USB', 'HDMI']),
    
    // Food and drink
    food: new Set(['PIZZA', 'PASTA', 'BURGER', 'SANDWICH', 'SALAD', 'SOUP', 'STEW', 'CAKE', 'BREAD', 'COFFEE', 'TEA', 'WINE', 'BEER', 'MEAT', 'FISH', 'CHICKEN', 'RICE', 'NOODLE', 'FRUIT', 'VEGETABLE']),
    
    // Elements and chemistry
    element: new Set(['CARBON', 'OXYGEN', 'NITROGEN', 'HYDROGEN', 'SILVER', 'GOLD', 'IRON', 'COPPER', 'ALUMINUM', 'CALCIUM', 'SODIUM', 'POTASSIUM', 'MAGNESIUM', 'CHLORINE', 'FLUORINE', 'BROMINE', 'IODINE']),
    
    // Transportation
    transport: new Set(['CARRIAGE', 'TRAIN', 'PLANE', 'BOAT', 'SHIP', 'TRUCK', 'BUS', 'TAXI', 'CAR', 'BIKE', 'MOTORCYCLE', 'HELICOPTER', 'SUBWAY', 'TRAM', 'FERRY', 'JET', 'ROCKET', 'SPACESHIP']),
    
    // Buildings and structures
    building: new Set(['HOUSE', 'BUILDING', 'TOWER', 'BRIDGE', 'TUNNEL', 'GATE', 'WALL', 'CASTLE', 'PALACE', 'TEMPLE', 'CHURCH', 'MOSQUE', 'SYNAGOGUE', 'STADIUM', 'ARENA', 'THEATER', 'CINEMA', 'MUSEUM', 'LIBRARY', 'SCHOOL', 'HOSPITAL', 'OFFICE', 'FACTORY', 'WAREHOUSE', 'STORE', 'SHOP', 'MARKET', 'MALL', 'PARK', 'GARDEN', 'PARK', 'PLAYGROUND', 'POOL', 'GARDEN', 'FARM', 'BARN', 'SHED', 'GARAGE', 'STABLE']),
    
    // Nature and environment
    nature: new Set(['RIVER', 'MOUNTAIN', 'FOREST', 'OCEAN', 'LAKE', 'STREAM', 'VALLEY', 'DESERT', 'JUNGLE', 'MEADOW', 'GRASSLAND', 'WETLAND', 'CAVE', 'VOLCANO', 'GLACIER', 'ISLAND', 'BEACH', 'COAST', 'CLIFF', 'CANYON']),
    
    // Animals
    animal: new Set(['LION', 'TIGER', 'ELEPHANT', 'GIRAFFE', 'MONKEY', 'DOLPHIN', 'WHALE', 'SHARK', 'EAGLE', 'HAWK', 'OWL', 'PENGUIN', 'KANGAROO', 'KOALA', 'PANDA', 'BEAR', 'WOLF', 'FOX', 'DEER', 'RABBIT', 'SQUIRREL', 'MOUSE', 'RAT', 'HAMSTER', 'GERBIL', 'GUINEA', 'PIG', 'FERRET', 'WEASEL', 'OTTER', 'BEAVER', 'RACCOON', 'SKUNK', 'BADGER', 'HEDGEHOG', 'PORCUPINE', 'SLOTH', 'ANTEATER', 'ARMADILLO', 'PLATYPUS', 'ECHIDNA', 'ANIMAL']),
    
    // Plants
    plant: new Set(['TREE', 'FLOWER', 'GRASS', 'BUSH', 'VINE', 'LEAF', 'ROSE', 'LILY', 'TULIP', 'DAISY', 'SUNFLOWER', 'PALM', 'PINE', 'OAK', 'MAPLE', 'BAMBOO', 'CACTUS', 'MUSHROOM', 'FERN', 'MOSS', 'HERB', 'SPICE', 'SEED', 'SPROUT', 'BUD', 'STEM', 'BRANCH', 'TRUNK', 'ROOT', 'BARK', 'THORN', 'PETAL', 'POLLEN', 'NECTAR', 'SAP', 'PLANT']),
    
    // Weather
    weather: new Set(['RAIN', 'STORM', 'CLOUD', 'WIND', 'SUN', 'SNOW', 'FROST', 'THUNDER', 'LIGHTNING', 'HAIL', 'SLEET', 'FOG', 'MIST', 'HUMIDITY', 'DROUGHT', 'FLOOD', 'TORNADO', 'HURRICANE', 'CYCLONE', 'BLIZZARD']),
    
    // Time
    time: new Set(['YEAR', 'MONTH', 'WEEK', 'DAY', 'HOUR', 'MINUTE', 'SECOND', 'CENTURY', 'DECADE', 'SEASON', 'SPRING', 'SUMMER', 'AUTUMN', 'WINTER', 'MORNING', 'EVENING', 'NIGHT', 'DAWN', 'DUSK', 'TIME', 'PERIOD', 'ERA', 'AGE', 'STAGE', 'PHASE', 'STEP', 'POINT', 'MOMENT', 'INSTANT', 'WHILE', 'DURATION', 'SPAN', 'INTERVAL', 'GAP', 'BREAK', 'PAUSE']),
    
    // Body parts
    body: new Set(['HEAD', 'HAND', 'FOOT', 'ARM', 'LEG', 'EYE', 'EAR', 'NOSE', 'MOUTH', 'FACE', 'HAIR', 'SKIN', 'BONE', 'MUSCLE', 'HEART', 'LUNG', 'LIVER', 'BRAIN', 'STOMACH', 'INTESTINE']),
    
    // Clothing
    clothing: new Set(['SHIRT', 'PANTS', 'DRESS', 'SKIRT', 'JACKET', 'COAT', 'HAT', 'SHOES', 'SOCKS', 'GLOVES', 'SCARF', 'TIE', 'BELT', 'WATCH', 'JEWELRY', 'NECKLACE', 'BRACELET', 'RING', 'EARRING']),
    
    // Tools
    tool: new Set(['HAMMER', 'SCREWDRIVER', 'WRENCH', 'PLIERS', 'DRILL', 'SAW', 'AXE', 'SHOVEL', 'RAKE', 'BROOM', 'MOP', 'BRUSH', 'KNIFE', 'FORK', 'SPOON', 'PLATE', 'BOWL', 'CUP', 'GLASS']),
    
    // Furniture
    furniture: new Set(['TABLE', 'CHAIR', 'SOFA', 'BED', 'DESK', 'SHELF', 'CABINET', 'WARDROBE', 'DRESSER', 'BOOKCASE', 'COUCH', 'OTTOMAN', 'STOOL', 'BENCH', 'MIRROR', 'LAMP', 'CLOCK', 'PICTURE']),
    
    // Music
    music: new Set(['PIANO', 'GUITAR', 'DRUM', 'VIOLIN', 'FLUTE', 'TRUMPET', 'SAXOPHONE', 'CLARINET', 'HARP', 'CELLO', 'BASS', 'ORGAN', 'ACCORDION', 'TAMBOURINE', 'CYMBAL', 'XYLOPHONE', 'HARMONICA', 'MUSIC', 'SONG', 'MELODY', 'HARMONY', 'RHYTHM', 'BEAT', 'TUNE', 'NOTE', 'CHORD', 'SCALE', 'INSTRUMENT']),
    
    // Materials and products
    material: new Set(['PAPER', 'PLASTIC', 'METAL', 'WOOD', 'GLASS', 'RUBBER', 'LEATHER', 'FABRIC', 'CLOTH', 'COTTON', 'SILK', 'WOOL', 'NYLON', 'POLYESTER', 'CELLOPHANE', 'CELLOTAPE', 'TAPE', 'FOIL', 'FILM', 'SHEET', 'ROLL', 'STRIP', 'BAND', 'CORD', 'ROPE', 'STRING', 'WIRE', 'CABLE', 'PIPE', 'TUBE', 'ROD', 'BEAM', 'PLANK', 'BOARD', 'TILE', 'BRICK', 'STONE', 'CONCRETE', 'CEMENT', 'PAINT', 'INK', 'DYE', 'PIGMENT', 'WAX', 'OIL', 'GREASE', 'GLUE', 'ADHESIVE', 'SEALANT', 'COATING', 'FINISH']),
    
    // Sports
    sport: new Set(['FOOTBALL', 'BASKETBALL', 'TENNIS', 'GOLF', 'SWIMMING', 'RUNNING', 'JUMPING', 'THROWING', 'CATCHING', 'KICKING', 'HITTING', 'SCORING', 'RACING', 'COMPETITION', 'TOURNAMENT', 'CHAMPIONSHIP']),
    
    // Colors
    color: new Set(['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE', 'ORANGE', 'BLACK', 'WHITE', 'PINK', 'BROWN', 'GRAY', 'GOLD', 'SILVER', 'BRONZE', 'MAROON', 'NAVY', 'TEAL', 'TURQUOISE', 'INDIGO', 'VIOLET', 'COLOR', 'HUE', 'SHADE', 'TINT', 'TONE']),
    
    // Emotions
    emotion: new Set(['HAPPY', 'SAD', 'ANGRY', 'SCARED', 'EXCITED', 'WORRIED', 'CALM', 'NERVOUS', 'ANXIOUS', 'DEPRESSED', 'JOYFUL', 'PEACEFUL', 'FRUSTRATED', 'CONFUSED', 'SURPRISED', 'DISGUSTED', 'EMBARRASSED']),
    
    // Professions
    profession: new Set(['DOCTOR', 'TEACHER', 'LAWYER', 'ENGINEER', 'ARTIST', 'MUSICIAN', 'SCIENTIST', 'WRITER', 'ACTOR', 'DIRECTOR', 'CHEF', 'FARMER', 'DRIVER', 'PILOT', 'SOLDIER', 'POLICE', 'FIREFIGHTER']),
    
    // Places
    place: new Set(['CITY', 'TOWN', 'VILLAGE', 'COUNTRY', 'STATE', 'PROVINCE', 'REGION', 'CONTINENT', 'ISLAND', 'PENINSULA', 'BAY', 'GULF', 'STRAIT', 'CHANNEL', 'HARBOR', 'PORT', 'AIRPORT', 'STATION', 'TERMINAL', 'PARK', 'GARDEN', 'PLAYGROUND', 'FIELD', 'GROUND', 'AREA', 'ZONE', 'SPACE', 'PLACE', 'LOCATION', 'SITE', 'SPOT', 'POINT', 'CORNER', 'EDGE', 'SIDE', 'END', 'START', 'MIDDLE', 'CENTER']),
    
    // Education
    education: new Set(['SCHOOL', 'COLLEGE', 'UNIVERSITY', 'CLASS', 'COURSE', 'LESSON', 'LECTURE', 'SEMINAR', 'WORKSHOP', 'TRAINING', 'STUDY', 'LEARN', 'TEACH', 'EDUCATE', 'GRADUATE', 'DEGREE', 'DIPLOMA', 'CERTIFICATE']),
    
    // Communication
    communication: new Set(['LETTER', 'EMAIL', 'MESSAGE', 'TEXT', 'CALL', 'PHONE', 'VOICE', 'SPEAK', 'TALK', 'CHAT', 'CONVERSATION', 'DISCUSSION', 'MEETING', 'CONFERENCE', 'PRESENTATION', 'BROADCAST', 'TRANSMISSION']),
    
    // Money and finance
    finance: new Set(['MONEY', 'CASH', 'COIN', 'BANK', 'ACCOUNT', 'CREDIT', 'DEBIT', 'LOAN', 'MORTGAGE', 'INVESTMENT', 'STOCK', 'BOND', 'SHARE', 'DIVIDEND', 'INTEREST', 'TAX', 'INSURANCE', 'PENSION']),
    
    // Health and medicine
    health: new Set(['HEALTH', 'MEDICAL', 'DOCTOR', 'NURSE', 'PATIENT', 'HOSPITAL', 'CLINIC', 'PHARMACY', 'MEDICINE', 'DRUG', 'VACCINE', 'TREATMENT', 'THERAPY', 'SURGERY', 'RECOVERY', 'WELLNESS', 'FITNESS']),
    
    // Entertainment
    entertainment: new Set(['MOVIE', 'FILM', 'THEATER', 'CINEMA', 'SHOW', 'PLAY', 'MUSICAL', 'CONCERT', 'PERFORMANCE', 'GAME', 'SPORT', 'COMPETITION', 'FESTIVAL', 'CELEBRATION', 'PARTY', 'EVENT', 'EXHIBITION', 'ADVENTURE', 'PARK', 'PLAYGROUND', 'CARNIVAL', 'FAIR', 'CIRCUS', 'ZOO', 'AQUARIUM', 'MUSEUM', 'GALLERY', 'STUDIO', 'STAGE', 'ARENA', 'STADIUM']),
    
    // Science
    science: new Set(['SCIENCE', 'RESEARCH', 'EXPERIMENT', 'LABORATORY', 'OBSERVATION', 'THEORY', 'HYPOTHESIS', 'ANALYSIS', 'DATA', 'RESULT', 'DISCOVERY', 'INVENTION', 'INNOVATION', 'TECHNOLOGY', 'ENGINEERING', 'MATHEMATICS']),
    
    // Scientific instruments and devices
    instrument: new Set(['ACCELERATOR', 'ACCELEROMETER', 'THERMOMETER', 'BAROMETER', 'HYGROMETER', 'ANEMOMETER', 'SPECTROMETER', 'MICROSCOPE', 'TELESCOPE', 'OSCILLOSCOPE', 'VOLTMETER', 'AMMETER', 'OHMMETER', 'MULTIMETER', 'CALORIMETER', 'CHROMATOGRAPH', 'ELECTROMETER', 'GALVANOMETER', 'MANOMETER', 'PHOTOMETER', 'RADAR', 'SONAR', 'SEISMOMETER', 'GRAVIMETER', 'MAGNETOMETER', 'GYROSCOPE', 'COMPASS', 'PROTRACTOR', 'MICROMETER', 'CALIPER']),
    
    // Government
    government: new Set(['GOVERNMENT', 'POLITICS', 'POLICY', 'LAW', 'REGULATION', 'ADMINISTRATION', 'DEPARTMENT', 'AGENCY', 'COMMITTEE', 'COUNCIL', 'PARLIAMENT', 'CONGRESS', 'SENATE', 'ELECTION', 'VOTE', 'CITIZEN']),
    
    // Military
    military: new Set(['MILITARY', 'ARMY', 'NAVY', 'AIRFORCE', 'SOLDIER', 'OFFICER', 'COMMANDER', 'GENERAL', 'ADMIRAL', 'COLONEL', 'CAPTAIN', 'LIEUTENANT', 'SERGEANT', 'TROOP', 'BATTALION', 'REGIMENT', 'DIVISION']),
    
    // Religion
    religion: new Set(['RELIGION', 'FAITH', 'BELIEF', 'GOD', 'CHURCH', 'TEMPLE', 'MOSQUE', 'SYNAGOGUE', 'PRAYER', 'WORSHIP', 'SACRED', 'HOLY', 'DIVINE', 'SPIRITUAL', 'RELIGIOUS', 'THEOLOGICAL', 'MYSTICAL']),
    
    // Recreation and leisure
    recreation: new Set(['PARK', 'PLAYGROUND', 'GARDEN', 'POOL', 'BEACH', 'LAKE', 'RIVER', 'MOUNTAIN', 'TRAIL', 'PATH', 'FIELD', 'COURT', 'PITCH', 'GROUND', 'SPACE', 'AREA', 'ZONE', 'SITE', 'LOCATION', 'PLACE', 'SPOT', 'VENUE']),
    
    // Compound words
    compound: new Set(['ADVENTURE', 'PLAYGROUND', 'PARK', 'GARDEN', 'HOUSE', 'ROOM', 'PLACE', 'SPACE', 'TIME', 'WORK', 'LIFE', 'WORLD', 'LIGHT', 'SIDE', 'WAY', 'LINE', 'POINT', 'LEVEL', 'FORM', 'TYPE', 'STYLE', 'MODE', 'STATE', 'PHASE', 'STAGE', 'STEP', 'PART', 'PIECE', 'UNIT', 'ITEM', 'THING', 'OBJECT', 'ELEMENT', 'FACTOR', 'ASPECT', 'FEATURE', 'TRAIT', 'QUALITY', 'NATURE', 'CHARACTER', 'PERSON', 'PLACE', 'THING', 'BLACK', 'WHITE', 'RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE', 'ORANGE', 'PINK', 'BROWN', 'GRAY']),
    
    // Activities and actions
    activity: new Set(['PLAY', 'GAME', 'SPORT', 'EXERCISE', 'WORK', 'STUDY', 'LEARN', 'TEACH', 'READ', 'WRITE', 'DRAW', 'PAINT', 'SING', 'DANCE', 'ACT', 'PERFORM', 'PRACTICE', 'TRAIN', 'COMPETE', 'RACE', 'RUN', 'JUMP', 'SWIM', 'CLIMB', 'WALK', 'RIDE', 'DRIVE', 'FLY', 'SAIL', 'TRAVEL', 'EXPLORE', 'ADVENTURE', 'DISCOVER', 'CREATE', 'BUILD', 'MAKE', 'DO']),
    
    // States and conditions
    state: new Set(['STATE', 'CONDITION', 'SITUATION', 'CIRCUMSTANCE', 'POSITION', 'PLACE', 'LEVEL', 'STAGE', 'PHASE', 'STEP', 'POINT', 'MOMENT', 'TIME', 'PERIOD', 'ERA', 'AGE', 'FORM', 'TYPE', 'KIND', 'SORT', 'NATURE', 'CHARACTER', 'QUALITY', 'TRAIT', 'FEATURE', 'ASPECT', 'FACTOR', 'ELEMENT', 'PART', 'PIECE', 'UNIT', 'ITEM', 'THING', 'OBJECT']),
    
    // Movement and motion
    movement: new Set(['MOVE', 'MOTION', 'MOVEMENT', 'FLOW', 'STREAM', 'CURRENT', 'DRIFT', 'FLOW', 'FLUX', 'FLOW', 'STREAM', 'CURRENT', 'DRIFT', 'FLOW', 'FLUX', 'FLOW', 'STREAM', 'CURRENT', 'DRIFT', 'FLOW', 'FLUX', 'FLOW', 'STREAM', 'CURRENT', 'DRIFT', 'FLOW', 'FLUX', 'FLOW', 'STREAM', 'CURRENT', 'DRIFT', 'FLOW', 'FLUX']),
    
    // Size and dimension
    size: new Set(['SIZE', 'DIMENSION', 'LENGTH', 'WIDTH', 'HEIGHT', 'DEPTH', 'THICKNESS', 'WEIGHT', 'MASS', 'VOLUME', 'AREA', 'SPACE', 'EXTENT', 'RANGE', 'SCOPE', 'SCALE', 'PROPORTION', 'RATIO', 'AMOUNT', 'QUANTITY', 'NUMBER', 'COUNT', 'TOTAL', 'SUM', 'AVERAGE', 'MEDIAN', 'MODE', 'RANGE', 'SPREAD', 'DISTRIBUTION']),
    
    // Quality and characteristic
    quality: new Set(['QUALITY', 'CHARACTERISTIC', 'TRAIT', 'FEATURE', 'ASPECT', 'FACTOR', 'ELEMENT', 'PART', 'PIECE', 'UNIT', 'ITEM', 'THING', 'OBJECT', 'NATURE', 'CHARACTER', 'TYPE', 'KIND', 'SORT', 'FORM', 'STYLE', 'MODE', 'WAY', 'MANNER', 'METHOD', 'APPROACH', 'TECHNIQUE', 'PROCESS', 'PROCEDURE', 'SYSTEM', 'STRUCTURE', 'PATTERN', 'DESIGN', 'PLAN', 'SCHEME', 'STRATEGY', 'TACTIC']),
    
    // Fruits and berries
    fruit: new Set(['APPLE', 'BANANA', 'ORANGE', 'LEMON', 'LIME', 'GRAPE', 'PEACH', 'PLUM', 'CHERRY', 'BERRY', 'BLACKBERRY', 'RASPBERRY', 'STRAWBERRY', 'BLUEBERRY', 'CRANBERRY', 'GOOSEBERRY', 'ELDERBERRY', 'MELON', 'WATERMELON', 'CANTALOUPE', 'HONEYDEW', 'PINEAPPLE', 'MANGO', 'PAPAYA', 'KIWI', 'FIG', 'DATE', 'PRUNE', 'RAISIN', 'CURRANT', 'FRUIT']),
    
    // Birds
    bird: new Set(['BIRD', 'EAGLE', 'HAWK', 'FALCON', 'OWL', 'VULTURE', 'BLACKBIRD', 'ROBIN', 'SPARROW', 'FINCH', 'CARDINAL', 'BLUEBIRD', 'THRUSH', 'WREN', 'WARBLER', 'SWALLOW', 'SWIFT', 'MARTIN', 'LARK', 'NIGHTINGALE', 'CUCKOO', 'WOODPECKER', 'DOVE', 'PIGEON', 'PARROT', 'MACAW', 'COCKATOO', 'BUDGIE', 'CANARY', 'CHICKEN', 'TURKEY', 'DUCK', 'GOOSE', 'SWAN', 'PELICAN', 'STORK', 'HERON', 'CRANE', 'FLAMINGO', 'PENGUIN', 'OSTRICH', 'EMU', 'KIWI']),
};

// Function to get word category
function getWordCategory(word) {
    const upperWord = word.toUpperCase();
    
    // Check each category
    for (const [category, words] of Object.entries(wordCategories)) {
        // Check if the word starts with any of the category words
        for (const categoryWord of words) {
            if (upperWord.startsWith(categoryWord)) {
                return category;
            }
        }
    }
    
    return null; // No category found
}

// Function to check if words are in the same family
function areWordsInSameFamily(word1, word2) {
    // Get the first 5 characters of each word
    const prefix1 = word1.slice(0, 5).toLowerCase();
    const prefix2 = word2.slice(0, 5).toLowerCase();
    
    // Words must share the first 5 characters exactly
    if (prefix1 !== prefix2) {
        return false;
    }
    
    // Get categories for both words
    const category1 = getWordCategory(word1);
    const category2 = getWordCategory(word2);
    
    // If either word is in a specific category (fruit, bird, etc.), they must match exactly
    const specificCategories = ['fruit', 'bird', 'animal', 'plant', 'music', 'material'];
    if (specificCategories.includes(category1) || specificCategories.includes(category2)) {
        return category1 === category2;
    }
    
    // For compound words, check if they share the same base word
    const baseWords = {
        'apple': ['pie', 'mac', 'sauce', 'juice', 'cider'],
        'black': ['berry', 'bird', 'board', 'smith', 'mail'],
        'blue': ['berry', 'bird', 'print', 'jeans'],
        'red': ['berry', 'bird', 'wood', 'wine'],
        'white': ['board', 'wash', 'wine', 'fish'],
        'green': ['house', 'wood', 'tea', 'bean'],
        'yellow': ['stone', 'wood', 'cake'],
        'brown': ['stone', 'sugar', 'rice'],
        'gray': ['stone', 'matter', 'area'],
        'pink': ['slip', 'eye', 'lady'],
        'purple': ['heart', 'haze', 'rain'],
        'orange': ['juice', 'peel', 'tree'],
        'gold': ['fish', 'mine', 'rush'],
        'silver': ['fish', 'mine', 'ware'],
        'bronze': ['age', 'medal', 'statue']
    };
    
    // Check if both words are compound words with the same base
    for (const [base, suffixes] of Object.entries(baseWords)) {
        if (word1.toLowerCase().startsWith(base) && word2.toLowerCase().startsWith(base)) {
            // Check if both words end with one of the known suffixes
            const suffix1 = word1.toLowerCase().slice(base.length);
            const suffix2 = word2.toLowerCase().slice(base.length);
            if (suffixes.includes(suffix1) && suffixes.includes(suffix2)) {
                return true;
            }
        }
    }
    
    // If no specific category match and no compound word match, use the original category check
    return category1 !== null && category1 === category2;
}

// Function to group similar words
function groupSimilarWords(words) {
    const groups = new Map(); // Maps representative word to its group
    const processedWords = new Set();
    
    // Sort words by length (shorter first) and then alphabetically
    const sortedWords = [...words].sort((a, b) => {
        if (a.length === b.length) {
            return a.localeCompare(b);
        }
        return a.length - b.length;
    });
    
    // First pass: identify word families
    for (let i = 0; i < sortedWords.length; i++) {
        const word = sortedWords[i];
        
        // Skip if already processed
        if (processedWords.has(word)) continue;
        
        // Start a new group with this word
        const group = [word];
        processedWords.add(word);
        
        // Look for related words
        for (let j = i + 1; j < sortedWords.length; j++) {
            const otherWord = sortedWords[j];
            
            // Skip if already processed
            if (processedWords.has(otherWord)) continue;
            
            // Check if words are in the same family
            if (areWordsInSameFamily(word, otherWord)) {
                group.push(otherWord);
                processedWords.add(otherWord);
            }
        }
        
        // Only create a group if we found related words
        if (group.length > 1) {
            // Sort the group by length and then alphabetically
            group.sort((a, b) => {
                if (a.length === b.length) {
                    return a.localeCompare(b);
                }
                return a.length - b.length;
            });
            
            // Use the shortest word as the representative
            const representative = group[0];
            groups.set(representative, group);
        }
    }
    
    return {
        representativeWords: groups,
        displayWords: Array.from(groups.keys())
    };
}

// Function to create and show overlay
function showWordGroupOverlay(words) {
    // Create overlay container
    const overlay = document.createElement('div');
    overlay.className = 'word-group-overlay';
    
    // Create content container
    const content = document.createElement('div');
    content.className = 'word-group-content';
    
    // Add words to content
    words.forEach(word => {
        const wordElement = document.createElement('div');
        wordElement.className = 'word-group-item';
        wordElement.textContent = word;
        content.appendChild(wordElement);
    });
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'word-group-close';
    closeButton.textContent = '×';
    closeButton.onclick = () => {
        document.body.removeChild(overlay);
    };
    
    // Assemble overlay
    content.appendChild(closeButton);
    overlay.appendChild(content);
    
    // Add click handler to close when clicking outside content
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    };
    
    // Add to document
    document.body.appendChild(overlay);
}

// Handle workflow creation
document.getElementById('createWorkflowButton').addEventListener('click', () => {
    document.getElementById('homepage').style.display = 'none';
    document.getElementById('workflowCreation').style.display = 'block';
});

// Function to save workflow
function saveWorkflow() {
    const workflowNameInput = document.getElementById('workflowName');
    const workflowName = workflowNameInput ? workflowNameInput.value.trim() : '';
    const selectedFeatures = Array.from(document.querySelectorAll('#selectedFeaturesList .selected-feature-item'))
        .map(item => item.dataset.feature);
    
    // Validate workflow name
    if (!workflowName) {
        alert('Please enter a workflow name');
        if (workflowNameInput) {
            workflowNameInput.focus();
        }
        return;
    }
    
    // Validate selected features
    if (selectedFeatures.length === 0) {
        alert('Please select at least one feature');
        return;
    }
    
    // Check if workflow name already exists
    if (workflows.some(w => w.name === workflowName)) {
        alert('A workflow with this name already exists. Please choose a different name.');
        if (workflowNameInput) {
            workflowNameInput.focus();
        }
        return;
    }

    try {
        // Create new workflow
        const newWorkflow = {
            name: workflowName,
            steps: selectedFeatures.map(feature => ({ feature }))
        };
        
        // Add to workflows array
        workflows.push(newWorkflow);
        
        // Save to localStorage
        localStorage.setItem('workflows', JSON.stringify(workflows));
        
        // Update workflow select
        const workflowSelect = document.getElementById('workflowSelect');
        if (workflowSelect) {
            const option = document.createElement('option');
            option.value = newWorkflow.name;
            option.textContent = newWorkflow.name;
            workflowSelect.appendChild(option);
        }
        
        // Clear form
        if (workflowNameInput) {
            workflowNameInput.value = '';
        }
        document.getElementById('selectedFeaturesList').innerHTML = '';
        
        // Reinitialize dropdowns
        initializeDropdowns();
        
        // Show success message and return to homepage
        alert('Workflow saved successfully!');
        hideWorkflowCreation();
        
    } catch (error) {
        console.error('Error saving workflow:', error);
        alert('There was an error saving the workflow. Please try again.');
    }
}

// Handle cancel workflow creation
document.getElementById('cancelWorkflowButton').addEventListener('click', () => {
    document.getElementById('workflowCreation').style.display = 'none';
    document.getElementById('homepage').style.display = 'block';
    
    // Clear form
    document.getElementById('workflowName').value = '';
    document.querySelectorAll('.feature-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
});

// Handle workflow selection change
workflowSelect.addEventListener('change', function() {
    if (this.value === 'create-new') {
        showWorkflowCreation();
    }
});

// Add touch event handling for workflow selection
workflowSelect.addEventListener('touchstart', function(e) {
    e.preventDefault();
    // Trigger the native select dropdown
    this.click();
}, { passive: false });

// Add touch event handling for workflow options
workflowSelect.addEventListener('touchend', function(e) {
    e.preventDefault();
    const selectedOption = this.options[this.selectedIndex];
    if (selectedOption && selectedOption.value === 'create-new') {
        showWorkflowCreation();
    }
}, { passive: false });

// Function to load word list
async function loadWordList() {
    try {
        const startTime = performance.now();
        console.log('=== WORDLIST LOADING START ===');
        
        // Show loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'loadingIndicator';
        loadingIndicator.innerHTML = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 10px; 
                        z-index: 10000; text-align: center;">
                <div>Loading wordlist...</div>
                <div id="loadingProgress" style="margin-top: 10px; font-size: 12px;">Initializing...</div>
            </div>
        `;
        document.body.appendChild(loadingIndicator);
        
        const updateProgress = (message) => {
            const progressElement = document.getElementById('loadingProgress');
            if (progressElement) {
                progressElement.textContent = message;
            }
            console.log('Progress:', message);
        };
        
        const wordlistSelect = document.getElementById('wordlistSelect');
        const selectedWordlist = wordlistSelect.value;
        console.log('Selected wordlist value:', selectedWordlist);
        let wordlistPath;
        let gzippedPath;
        
        switch(selectedWordlist) {
            case '4000':
                wordlistPath = 'words/4000.txt';
                gzippedPath = 'words/4000.txt.gz';
                break;
            case '19127':
                wordlistPath = 'words/19127.txt';
                gzippedPath = 'words/19127.txt.gz';
                break;
            case 'emotions':
                wordlistPath = 'words/EmotionsJobsSpiritAnimals.txt';
                gzippedPath = 'words/EmotionsJobsSpiritAnimals.txt.gz';
                break;
            case '134k':
                wordlistPath = 'words/134K.txt';
                gzippedPath = 'words/134K.txt.gz';
                break;
            case 'boysnames':
                wordlistPath = 'words/BoysNames.txt';
                gzippedPath = 'words/BoysNames.txt.gz';
                break;
            case 'girlsnames':
                wordlistPath = 'words/GirlsNames.txt';
                gzippedPath = 'words/GirlsNames.txt.gz';
                break;
            case 'allnames':
                wordlistPath = 'words/AllNames.txt';
                gzippedPath = 'words/AllNames.txt.gz';
                break;
            case 'colouritems':
                wordlistPath = 'words/ColourItems.txt';
                gzippedPath = 'words/ColourItems.txt.gz';
                break;
            case 'enuk':
                wordlistPath = 'words/ENUK-Long words Noun.txt';
                gzippedPath = 'words/ENUK-Long words Noun.txt.gz';
                break;
            default:
                wordlistPath = 'words/4000.txt';
                gzippedPath = 'words/4000.txt.gz';
                break;
            case 'months_starsigns':
                wordlistPath = 'words/MONTHS_STARSIGNS.txt';
                break;
            case 'engine':
                // ENGINE wordlist is generated at runtime in executeWorkflow pre-step.
                wordlistPath = 'words/4000.txt';
                gzippedPath = 'words/4000.txt.gz';
                break;
        }
        console.log('Selected wordlist path:', wordlistPath);
        console.log('Gzipped path:', gzippedPath);
        
        let response;
        let text;
        let usedGzip = false;
        
        // Try gzipped file first for better performance
        try {
            updateProgress('Loading compressed file...');
            console.log('Attempting to load gzipped file...');
            const fetchStart = performance.now();
            response = await fetch(gzippedPath);
            const fetchTime = performance.now() - fetchStart;
            console.log(`Fetch time: ${fetchTime.toFixed(2)}ms`);
            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers.entries()));
            
            if (response.ok) {
                updateProgress('Decompressing file...');
                const decompressStart = performance.now();
                const arrayBuffer = await response.arrayBuffer();
                const bufferTime = performance.now() - decompressStart;
                console.log(`ArrayBuffer time: ${bufferTime.toFixed(2)}ms`);
                console.log('ArrayBuffer size:', arrayBuffer.byteLength, 'bytes');
                
                // Decompress using pako (if available) or fallback to text
                if (typeof pako !== 'undefined') {
                    console.log('Pako library available, decompressing...');
                    const pakoStart = performance.now();
                    const decompressed = pako.inflate(new Uint8Array(arrayBuffer), { to: 'string' });
                    const pakoTime = performance.now() - pakoStart;
                    console.log(`Pako decompression time: ${pakoTime.toFixed(2)}ms`);
                    console.log('Decompressed size:', decompressed.length, 'characters');
                    text = decompressed;
                    usedGzip = true;
                    console.log('✅ Successfully loaded and decompressed gzipped file');
                } else {
                    console.log('❌ Pako not available, falling back to uncompressed');
                    throw new Error('Pako not available, falling back to uncompressed');
                }
            } else {
                console.log('❌ Gzipped file not found, falling back to uncompressed');
                throw new Error('Gzipped file not found, falling back to uncompressed');
            }
        } catch (gzipError) {
            console.log('❌ Gzipped file failed, loading uncompressed file:', gzipError.message);
            updateProgress('Loading uncompressed file...');
            response = await fetch(wordlistPath);
            if (!response.ok) {
                throw new Error('Failed to load wordlist');
            }
            text = await response.text();
            usedGzip = false;
        }
        
        console.log('Text loaded, length:', text.length);
        console.log('Used gzip:', usedGzip);
        updateProgress('Processing wordlist...');
        
        // Optimize the word processing
        const processStart = performance.now();
        
        // Use more efficient string processing
        const lines = text.split('\n');
        console.log(`Split into ${lines.length} lines`);
        
        // Use Set for faster filtering and deduplication
        const wordSet = new Set();
        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (trimmed) {
                wordSet.add(trimmed);
            }
        }
        
        wordList = Array.from(wordSet);
        const processTime = performance.now() - processStart;
        console.log(`Processing time: ${processTime.toFixed(2)}ms`);
        console.log('Filtered words count:', wordList.length);
        
        currentFilteredWords = [...wordList];
        currentWordlistForVowels = [...wordList];
        
        const totalTime = performance.now() - startTime;
        console.log(`Total loading time: ${totalTime.toFixed(2)}ms`);
        console.log('Wordlist loaded successfully:', wordList.length, 'words');
        console.log('=== WORDLIST LOADING END ===');
        
        // Remove loading indicator
        if (loadingIndicator.parentNode) {
            loadingIndicator.parentNode.removeChild(loadingIndicator);
        }
        
        return wordList;
    } catch (error) {
        console.error('Error loading wordlist:', error);
        // Remove loading indicator on error
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator && loadingIndicator.parentNode) {
            loadingIndicator.parentNode.removeChild(loadingIndicator);
        }
        throw error;
    }
}

async function loadWordsForEfficiency() {
    const wordlistSelect = document.getElementById('wordlistSelect');
    const value = (wordlistSelect && wordlistSelect.value) || '4000';
    if (wordList.length > 0 && lastLoadedWordlist === value) {
        return [...wordList];
    }
    const { wordlistPath, gzippedPath } = getWordlistPathForEfficiency(value);
    let text;
    if (gzippedPath && typeof pako !== 'undefined') {
        try {
            const res = await fetch(gzippedPath);
            if (res.ok) {
                const buf = await res.arrayBuffer();
                text = pako.inflate(new Uint8Array(buf), { to: 'string' });
            } else {
                const res2 = await fetch(wordlistPath);
                text = await res2.text();
            }
        } catch (_) {
            const res = await fetch(wordlistPath);
            text = await res.text();
        }
    } else {
        const res = await fetch(wordlistPath);
        text = await res.text();
    }
    const wordSet = new Set();
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const t = lines[i].trim();
        if (t) wordSet.add(t);
    }
    return Array.from(wordSet);
}

// ADV-LEX: dedicated 10000-word source (independent of performance wordlist)
let advLexWordList = null;

async function loadAdvLexWordList() {
    if (advLexWordList && Array.isArray(advLexWordList) && advLexWordList.length > 0) {
        return advLexWordList;
    }

    const { wordlistPath, gzippedPath } = getWordlistPathForEfficiency('10000');
    let text;

    if (gzippedPath && typeof pako !== 'undefined') {
        try {
            const res = await fetch(gzippedPath);
            if (res.ok) {
                const buf = await res.arrayBuffer();
                text = pako.inflate(new Uint8Array(buf), { to: 'string' });
            } else {
                const res2 = await fetch(wordlistPath);
                text = await res2.text();
            }
        } catch (_) {
            const fallbackRes = await fetch(wordlistPath);
            text = await fallbackRes.text();
        }
    } else {
        const res = await fetch(wordlistPath);
        text = await res.text();
    }

    const words = [];
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i].trim();
        if (!raw) continue;
        const upper = raw.toUpperCase();
        // Only keep simple A–Z words with no spaces
        if (/^[A-Z]+$/.test(upper)) {
            words.push(upper);
        }
    }

    advLexWordList = words;
    return advLexWordList;
}

// Add lazy loading flag
let wordListLoaded = false;
let lastLoadedWordlist = '';

// ALPHA: first-letter range comes from Dictionary (Alpha) when that step ran in this workflow
let lastDictionaryAlphaSection = null;
// NUMBER START: section (low/mid/high) when that step ran in this workflow
let lastNumberStartSection = null;

/**
 * Count "words" in a displayed title for NAME ENGINE word-count filter:
 * whitespace-separated tokens that contain at least one letter or digit.
 * Standalone punctuation (e.g. a lone "-") does not count — so
 * "Mission Impossible - The Final Reckoning" → 5 words.
 */
function countDisplayTitleWords(displayTitle) {
    const s = String(displayTitle || '').trim();
    if (!s) return 0;
    return s.split(/\s+/).filter(tok => /[a-zA-Z0-9]/.test(tok)).length;
}

/**
 * Keep titles whose display word count matches targetCount, or if buffer1, count in [N-1, N+1] (min 1).
 * Word count uses countDisplayTitleWords (same rules as LENGTH-style buffer).
 */
function filterNameEngineByTitleWordCount(words, displayMap, targetCount, buffer1) {
    const n = parseInt(String(targetCount), 10);
    if (!Number.isFinite(n) || n < 1) {
        return { words: [...words], displayMap: new Map(displayMap) };
    }
    const minW = buffer1 ? Math.max(1, n - 1) : n;
    const maxW = buffer1 ? n + 1 : n;
    const nextWords = [];
    const nextMap = new Map();
    for (const w of words) {
        const disp = displayMap.get(w);
        const c = countDisplayTitleWords(disp);
        if (c >= minW && c <= maxW) {
            nextWords.push(w);
            nextMap.set(w, disp);
        }
    }
    return { words: nextWords, displayMap: nextMap };
}

function normalizeEngineWorkflowWord(raw) {
    const digitMap = {
        '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
        '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine'
    };
    const withWords = String(raw || '').replace(/\d/g, (d) => digitMap[d] || '');
    return withWords
        .toLowerCase()
        .replace(/[()]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\s/g, '');
}

/** NAME ENGINE: user chose among TMDB people after ambiguous search. */
function waitForNameEnginePersonPick(featurePre, candidates, searchLabel) {
    return new Promise((resolve) => {
        const listItems = Array.isArray(candidates) ? candidates : [];
        featurePre.innerHTML = `
        <div class="feature-title">NAME ENGINE – WHO DID YOU MEAN?</div>
        <p class="name-engine-picker-hint">Several people matched <span class="name-engine-picker-query"></span>. Choose one:</p>
        <div class="name-engine-picker-list"></div>`;
        const qEl = featurePre.querySelector('.name-engine-picker-query');
        if (qEl) qEl.textContent = `"${searchLabel}"`;
        const list = featurePre.querySelector('.name-engine-picker-list');
        if (!list) {
            resolve(null);
            return;
        }
        for (const c of listItems) {
            const id = Number(c.id);
            if (!Number.isFinite(id)) continue;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'name-engine-picker-btn';
            const strong = document.createElement('strong');
            strong.textContent = String(c.name || `Person ${id}`);
            const sub = document.createElement('span');
            sub.className = 'name-engine-picker-sub';
            sub.textContent = String(c.subtitle || '');
            btn.appendChild(strong);
            btn.appendChild(document.createElement('br'));
            btn.appendChild(sub);
            btn.addEventListener('click', () => resolve(id));
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                resolve(id);
            }, { passive: false });
            list.appendChild(btn);
        }
    });
}

async function runEnginePrefilterStep(featureArea, resultsContainer, engineMode) {
    if (!featureArea) throw new Error('Feature area not found for ENGINE pre-step');
    const mode = engineMode === 'name' ? 'name' : 'association';
    const title = mode === 'name' ? 'NAME ENGINE WORDLIST' : 'WORD ENGINE WORDLIST';
    const placeholder = mode === 'name' ? 'Enter a name...' : 'Enter a word...';
    const statusText = mode === 'name'
        ? 'Enter a name.'
        : 'Enter a word.';

    featureArea.innerHTML = '';
    const pre = document.createElement('div');
    pre.id = 'enginePrefilterFeature';
    pre.className = 'feature-section';
    pre.style.display = 'block';
    pre.innerHTML = `
        <div class="feature-title">${title}</div>
        <div class="position-input">
            <input type="text" id="enginePrefilterInput" placeholder="${placeholder}">
            <button id="enginePrefilterButton">DONE</button>
        </div>
    `;
    featureArea.appendChild(pre);
    if (resultsContainer) {
        resultsContainer.innerHTML = `<p>${statusText}</p>`;
    }

    const inputEl = pre.querySelector('#enginePrefilterInput');
    const btnEl = pre.querySelector('#enginePrefilterButton');
    if (!inputEl || !btnEl) throw new Error('ENGINE pre-step UI failed to initialize');

    return await new Promise((resolve, reject) => {
        let inFlight = false;
        const submit = async () => {
            const input = (inputEl.value || '').trim();
            if (!input) {
                alert('Please enter a word or name');
                return;
            }
            if (inFlight) return;
            inFlight = true;
            btnEl.disabled = true;
            if (resultsContainer) resultsContainer.innerHTML = '<p>Generating ENGINE wordlist...</p>';

            try {
                let data;
                let extraBody = {};
                for (;;) {
                    const resp = await fetch(getEngineClaudeApiUrl(), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            input_word: input,
                            limit: mode === 'name' ? 500 : 250,
                            mode,
                            tmdb_api_key: (appSettings && appSettings.tmdbApiKey) || '',
                            anthropic_api_key: (appSettings && appSettings.anthropicApiKey) || '',
                            ...extraBody
                        })
                    });
                    data = await resp.json();
                    if (!resp.ok) throw new Error(data?.error || 'ENGINE generation failed');

                    if (mode === 'name' && data.needs_person_picker) {
                        const cands = Array.isArray(data.picker_candidates) ? data.picker_candidates : [];
                        if (cands.length < 1) {
                            throw new Error('NAME ENGINE could not disambiguate people (no candidates).');
                        }
                        if (resultsContainer) {
                            resultsContainer.innerHTML = '<p>Choose the correct person below.</p>';
                        }
                        const picked = await waitForNameEnginePersonPick(pre, cands, input);
                        if (picked == null || !Number.isFinite(picked)) {
                            throw new Error('NAME ENGINE: person selection failed.');
                        }
                        extraBody = { tmdb_person_id: picked };
                        if (resultsContainer) {
                            resultsContainer.innerHTML = '<p>Loading credits…</p>';
                        }
                        continue;
                    }
                    break;
                }

                const raw = Array.isArray(data.results) ? data.results : [];
                const map = new Map();
                for (const item of raw) {
                    const display = String(item?.display || item?.word || '').trim();
                    const normalized = normalizeEngineWorkflowWord(item?.word || display);
                    if (!normalized || !display) continue;
                    if (!map.has(normalized)) map.set(normalized, display);
                }

                let words = Array.from(map.keys());
                if (words.length === 0) {
                    throw new Error('ENGINE returned no usable words');
                }

                let finalWords = words;
                let finalMap = map;

                const wordCountOn = mode === 'name' && !!(appSettings && appSettings.nameEngineWordCount);
                if (wordCountOn) {
                    engineDisplayMap = map;
                    displayResults(words);
                    const wcBuf = !!(appSettings && appSettings.nameEngineWordCountBuffer1);
                    const wcBufHintText = wcBuf
                        ? ' <strong>±1 word buffer is ON</strong> (keeps titles with (N−1) through (N+1) words, N = your number).'
                        : '';

                    const step2 = await new Promise((innerResolve) => {
                        pre.innerHTML = `
        <div class="feature-title">NAME ENGINE – AMOUNT OF WORDS</div>
        <p style="text-align:center;margin:8px 16px;font-size:14px;color:#666;">${words.length} title(s) loaded. Enter how many words each kept title must have (tokens with letters or numbers only; punctuation alone does not count).${wcBufHintText}</p>
        <div class="position-input" style="flex-wrap:wrap;justify-content:center;">
            <input type="number" id="nameEngineWordCountInput" min="1" max="99" placeholder="e.g. 5" inputmode="numeric" style="max-width:120px;">
            <button type="button" id="nameEngineWordCountFilterBtn">FILTER</button>
            <button type="button" id="nameEngineWordCountSkipBtn" class="skip-button">SKIP</button>
        </div>
    `;
                        const wcInput = pre.querySelector('#nameEngineWordCountInput');
                        const filterBtn = pre.querySelector('#nameEngineWordCountFilterBtn');
                        const skipBtn = pre.querySelector('#nameEngineWordCountSkipBtn');

                        const finishSkip = () => {
                            innerResolve({ words, displayMap: map });
                        };
                        const finishFilter = () => {
                            const rawN = (wcInput && wcInput.value != null) ? wcInput.value.trim() : '';
                            const n = parseInt(rawN, 10);
                            if (!Number.isFinite(n) || n < 1) {
                                alert('Enter a positive whole number (e.g. 5).');
                                return;
                            }
                            const filtered = filterNameEngineByTitleWordCount(words, map, n, wcBuf);
                            if (filtered.words.length === 0) {
                                const rangeMsg = wcBuf
                                    ? `between ${Math.max(1, n - 1)} and ${n + 1} words`
                                    : `exactly ${n} word(s)`;
                                alert(`No titles with ${rangeMsg}. Try another number or SKIP.`);
                                return;
                            }
                            engineDisplayMap = filtered.displayMap;
                            displayResults(filtered.words);
                            innerResolve({ words: filtered.words, displayMap: filtered.displayMap });
                        };

                        if (filterBtn) {
                            filterBtn.addEventListener('click', finishFilter);
                            filterBtn.addEventListener('touchstart', (e) => { e.preventDefault(); finishFilter(); }, { passive: false });
                        }
                        if (skipBtn) {
                            skipBtn.addEventListener('click', finishSkip);
                            skipBtn.addEventListener('touchstart', (e) => { e.preventDefault(); finishSkip(); }, { passive: false });
                        }
                        if (wcInput) {
                            wcInput.addEventListener('keypress', (e) => {
                                if (e.key === 'Enter') finishFilter();
                            });
                        }
                    });

                    finalWords = step2.words;
                    finalMap = new Map(step2.displayMap);
                }

                resolve({ words: finalWords, displayMap: finalMap });
            } catch (e) {
                reject(e);
            } finally {
                inFlight = false;
                btnEl.disabled = false;
            }
        };

        btnEl.addEventListener('click', submit);
        btnEl.addEventListener('touchstart', (e) => { e.preventDefault(); submit(); }, { passive: false });
        inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') submit();
        });
    });
}

// Function to execute workflow
async function executeWorkflow(steps) {
    try {
        const workflowSteps = Array.isArray(steps) ? steps.slice() : [];
        let lexiconOverrideTriggered = false;

        // Get the currently selected wordlist
        const wordlistSelect = document.getElementById('wordlistSelect');
        const selectedWordlist = wordlistSelect.value;
        console.log('Selected wordlist:', selectedWordlist);
        const usingWordEngineWordlist = selectedWordlist === 'wordengine';
        const usingNameEngineWordlist = selectedWordlist === 'nameengine';
        const usingEngineWordlist = usingWordEngineWordlist || usingNameEngineWordlist;
        
        // Check if we need to load a new wordlist
        const needsReload = !wordListLoaded || 
                           wordList.length === 0 || 
                           lastLoadedWordlist !== selectedWordlist;
        
        if (needsReload && !usingEngineWordlist) {
            await loadWordList();
            wordListLoaded = true;
            lastLoadedWordlist = selectedWordlist;
        }
        console.log('Wordlist loaded, word count:', wordList.length);
        
        // Reset workflow state at the beginning of each workflow
        resetWorkflowState();
        console.log('Workflow state reset');
        
        // Reset all feature states
        currentFilteredWords = usingEngineWordlist ? [] : [...wordList]; // Start with selected wordlist
        lexiconCompleted = false;
        originalLexCompleted = false;
        eeeCompleted = false;
        hasAdjacentConsonants = null;
        hasO = null;
        selectedCurvedLetter = null;
        currentVowelIndex = 0;
        uniqueVowels = [];
        currentFilteredWordsForVowels = [];
        currentPosition1Word = '';
        leastFrequentLetter = null;  // Reset least frequent letter state
        engineDisplayMap = null;
        
        // Reset used letters at the start of a new workflow
        usedLettersInWorkflow = [];
        
        // Reset T9 state at the beginning of each workflow
        t9StringsMap.clear();
        t9StringsCalculated = false;
        t9OneLieBlankIndex = null;
        t9OneLiePossibleDigits = [];
        t9OneLieSelectedDigits = [];
        t9LastGuessDigits = [];
        t9LastActual = '';
        t9OneLieLastActualLength = 0;
        
        // Check if workflow contains any T9 features
        workflowHasT9Feature = workflowSteps.some(step => step.feature.startsWith('t9'));
        console.log('Workflow has T9 feature:', workflowHasT9Feature);
        // T9 B-IDENTITY definites overlay: only after B-IDENTITY has been submitted
        workflowHasT9B = workflowSteps.some(step => step.feature === 't9B' || step.feature === 't9OneLie');
        t9BSubmitted = false;
        userShowT9ByLongPress = false; // Reset tap-to-hold T9 when starting a run
        // SOLOGRAM: clear last Y/N and set flag if this workflow includes SOLOGRAM
        lastSologramYnString = null;
        workflowHasSologram = workflowSteps.some(step => step.feature === 'sologram');
        // OMEGA: reset state
        omegaSelections = [];
        omegaActiveMapping = {};
        // ALPHA: reset so first-letter range is taken from Dictionary (Alpha) only if that step ran
        lastDictionaryAlphaSection = null;
        lastNumberStartSection = null;

        console.log('Starting workflow with steps:', steps);
        console.log('Using wordlist:', selectedWordlist);
        console.log('Current word count:', currentFilteredWords.length);
        
        // Hide homepage and show workflow execution
        const homepage = document.getElementById('homepage');
        const workflowExecution = document.getElementById('workflowExecution');
        
        if (homepage) {
            homepage.style.display = 'none';
        }
        
        if (workflowExecution) {
            workflowExecution.style.display = 'flex';
            workflowExecution.style.flexDirection = 'column';
            workflowExecution.style.height = '100dvh';
            document.body.classList.add('perform-view');
        }
        if (exportButton) exportButton.style.display = ''; /* Show export floppy only in PERFORM */

        // Add home button if it doesn't exist (fixed top-left so visible on mobile where header is hidden)
        let homeButton = document.getElementById('homeButton');
        if (!homeButton) {
            homeButton = document.createElement('button');
            homeButton.id = 'homeButton';
            homeButton.className = 'home-button perform-home-button';
            homeButton.innerHTML = '⌂';
            homeButton.title = 'Return to Home';
            
            const handleHomeAction = () => {
                if (workflowExecution) workflowExecution.style.display = 'none';
                if (homepage) homepage.style.display = 'block';
                if (exportButton) exportButton.style.display = 'none';
                document.body.classList.remove('perform-view');
                const preview = document.getElementById('t9OneLiePreview');
                if (preview) {
                    preview.style.display = 'none';
                    preview.innerHTML = '';
                }
                const resetButton = document.getElementById('resetWorkflowButton');
                if (resetButton) resetButton.remove();
                homeButton.remove();
            };
            
            homeButton.addEventListener('click', handleHomeAction);
            homeButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                handleHomeAction();
            }, { passive: false });
            
            document.body.appendChild(homeButton);
        }

        // Add reset button if it doesn't exist
        let resetButton = document.getElementById('resetWorkflowButton');
        if (!resetButton) {
            resetButton = document.createElement('button');
            resetButton.id = 'resetWorkflowButton';
            resetButton.className = 'reset-workflow-button';
            resetButton.innerHTML = '↺';
            resetButton.title = 'Reset Workflow';
            
            // Function to handle reset action
            const handleResetAction = () => {
                if (currentWorkflow) {
                    executeWorkflow(currentWorkflow.steps);
                }
                const preview = document.getElementById('t9OneLiePreview');
                if (preview) {
                    preview.style.display = 'none';
                    preview.innerHTML = '';
                }
            };
            
            // Add both click and touch events
            resetButton.addEventListener('click', handleResetAction);
            resetButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                handleResetAction();
            }, { passive: false });
            
            document.body.appendChild(resetButton);
        }
        
        // Store current workflow for reset functionality
        currentWorkflow = { steps };
        
        // Create feature elements if they don't exist
        const featureElements = {
            position1Feature: createPosition1Feature(),
            vowelFeature: createVowelFeature(),
            oFeature: createOFeature(),
            oCurvesFeature: createOCurvesFeature(),
            lexiconFeature: createLexiconFeature(),
            zeroCurvesFeature: createZeroCurvesFeature(),
            eeeFeature: createEeeFeature(),
            eeeFirstFeature: createEeeFirstFeature(),
            originalLexFeature: createOriginalLexFeature(),
            advLexFeature: createAdvLexFeature(),
            consonantQuestion: createConsonantQuestion(),
            colour3Feature: createColour3Feature(),
            atlasFeature: createAtlasFeature(),
            theCoreFeature: createTheCoreFeature(),
            letterLyingFeature: createLetterLyingFeature(),
            loveLettersFeature: createLoveLettersFeature(),
            shapeFeature: createShapeFeature(),
            curvedFeature: createCurvedFeature(),
            lengthFeature: createLengthFeature(),
            letterShapesFeature: createLetterShapesFeature(),
            scrabbleFeature: createScrabbleFeature(),
            scrabble1Feature: createScrabble1Feature(),
            sologramFeature: createSologramFeature(),
            scrambleFeature: createScrambleFeature(),
            mostFrequentFeature: createMostFrequentFeature(),
            leastFrequentFeature: createLeastFrequentFeature(),
            notInFeature: createNotInFeature(),
            presentFeature: createPresentFeature(),
            abcde: createAbcdeFeature(),
            abc: createAbcFeature(),
            findEee: createFindEeeFeature(),
            positionConsFeature: createPositionConsFeature(),
            firstCurvedFeature: createFirstCurvedFeature(),
            eyeTestFeature: createEyeTestFeature(),
            pinFeature: createPinFeature(),
            eeeFeature: createEeeFeature(),
            eeeFirstFeature: createEeeFirstFeature(),
            numerologyFeature: createNumerologyFeature(),
        };
        
        // Add all feature elements to the document body
        Object.values(featureElements).forEach(element => {
            if (element) {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
                document.body.appendChild(element);
                element.style.display = 'none';
                element.classList.remove('completed');
            }
        });
        
        // Get or create the feature area and results container
        let featureArea = document.getElementById('featureArea');
        let resultsContainer = document.getElementById('results');
        
        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'results';
            resultsContainer.className = 'results-container';
            workflowExecution.appendChild(resultsContainer);
        }
        
        if (!featureArea) {
            featureArea = document.createElement('div');
            featureArea.id = 'featureArea';
            featureArea.className = 'feature-area';
            workflowExecution.appendChild(featureArea);
        }

        // Ensure 1 LIE preview line exists between wordlist (results) and bottom feature section
        let t9OneLiePreview = document.getElementById('t9OneLiePreview');
        if (!t9OneLiePreview) {
            t9OneLiePreview = document.createElement('p');
            t9OneLiePreview.id = 't9OneLiePreview';
            t9OneLiePreview.className = 't9-one-lie-preview';
            t9OneLiePreview.style.display = 'none';
            if (featureArea && workflowExecution.contains(featureArea)) {
                workflowExecution.insertBefore(t9OneLiePreview, featureArea);
            } else {
                workflowExecution.appendChild(t9OneLiePreview);
            }
        }

        // Set up the layout: results and feature area share space so Hydra label fits in 100% height
        resultsContainer.style.flex = '1 1 0';
        resultsContainer.style.minHeight = '0';
        resultsContainer.style.overflowY = 'auto';
        resultsContainer.style.padding = '20px';
        resultsContainer.style.backgroundColor = '#fff';
        resultsContainer.style.borderBottom = '1px solid #ddd';
        
        featureArea.style.flex = '1 1 0';
        featureArea.style.minHeight = '0';
        featureArea.style.overflowY = 'auto';
        featureArea.style.padding = '20px';
        featureArea.style.backgroundColor = '#f5f5f5';
        
        // Clear any existing content in the feature area; BIRTHDAY results will sit under the active feature
        const birthdayResultsEl = document.getElementById('birthdayResults');
        featureArea.innerHTML = '';
        resultsContainer.innerHTML = '';
        lastAtlasColoursCount = null;

        // Hide and clear Hydra label (shown when T9 LAST submits GUESS+ACTUAL sum)
        const hydraLabelContainer = document.getElementById('hydraLabelContainer');
        if (hydraLabelContainer) {
            hydraLabelContainer.style.display = 'none';
            const hydraLabelValue = document.getElementById('hydraLabelValue');
            if (hydraLabelValue) hydraLabelValue.textContent = '';
        }

        // ENGINE wordlist mode: generate a fresh pre-workflow list from user input.
        if (usingEngineWordlist) {
            const engineMode = usingNameEngineWordlist ? 'name' : 'association';
            const generated = await runEnginePrefilterStep(featureArea, resultsContainer, engineMode);
            wordList = [...generated.words];
            currentFilteredWords = [...generated.words];
            currentWordlistForVowels = [...generated.words];
            engineDisplayMap = generated.displayMap;
            wordListLoaded = true;
            lastLoadedWordlist = selectedWordlist;
        }
        
        // Display initial wordlist
        displayResults(currentFilteredWords);
        
        // Track the rank of MOST FREQUENT features
        let mostFrequentRank = 1;
        
        // Execute each step in sequence
        for (let stepIndex = 0; stepIndex < workflowSteps.length; stepIndex++) {
            const step = workflowSteps[stepIndex];
            const previousStepFeature = stepIndex > 0 ? workflowSteps[stepIndex - 1].feature : null;
            console.log('Executing step:', step);
            
            let featureId = step.feature + 'Feature';
            if (step.feature === 'consonant') {
                featureId = 'consonantQuestion';
            }
            
            // Always create a fresh feature element for each step
            let featureElement;
            switch (step.feature) {
                case 'mostFrequent':
                    featureElement = createMostFrequentFeature();
                    break;
                case 'leastFrequent':
                    featureElement = createLeastFrequentFeature();
                    break;
                case 'length':
                    featureElement = createLengthFeature();
                    break;
                case 'letterShapes':
                    featureElement = createLetterShapesFeature();
                    break;
                case 'notIn':
                    featureElement = createNotInFeature();
                    break;
                case 'present':
                    featureElement = createPresentFeature();
                    break;
                case 'anywhere':
                    featureElement = createAnywhereFeature();
                    break;
                case 'together':
                    featureElement = createTogetherFeature();
                    break;
                case 'middle':
                    featureElement = createMiddleFeature();
                    break;
                case 'consonants':
                    featureElement = createConsonantsFeature();
                    break;
                case 'position1':
                    featureElement = createPosition1Feature();
                    break;
                case 'consMid':
                    featureElement = createConsMidFeature();
                    break;
                case 'consMid2':
                    featureElement = createConsMid2Feature();
                    break;
                case 'vowel':
                    featureElement = createVowelFeature();
                    break;
                case 'vowel2':
                    featureElement = createVowel2Feature();
                    break;
                case 'vowelPos':
                    featureElement = createVowelPosFeature();
                    break;
                case 'name':
                    featureElement = createNameFeature();
                    break;
                case 'o':
                    featureElement = createOFeature();
                    break;
                case 'oCurves':
                    featureElement = createOCurvesFeature();
                    break;
                case 'lexicon':
                    featureElement = createLexiconFeature();
                    break;
                case 'zeroCurves':
                    featureElement = createZeroCurvesFeature();
                    break;
                case 'eee':
                    featureElement = createEeeFeature();
                    break;
                case 'eeeFirst':
                    featureElement = createEeeFirstFeature();
                    break;
                case 'e21':
                    featureElement = createE21Feature();
                    break;
                case 'originalLex':
                    featureElement = createOriginalLexFeature();
                    break;
                case 'advLex':
                    featureElement = createAdvLexFeature();
                    break;
                case 'consonant':
                    featureElement = createConsonantQuestion();
                    break;
                case 'colour3':
                    featureElement = createColour3Feature();
                    break;
                case 'atlas':
                    featureElement = createAtlasFeature();
                    break;
                case 'numerology':
                    featureElement = createNumerologyFeature();
                    break;
                case 'letterLying':
                    featureElement = createLetterLyingFeature();
                    break;
                case 'loveLetters':
                    featureElement = createLoveLettersFeature();
                    break;
                case 'shape':
                    featureElement = createShapeFeature();
                    break;
                case 'omega':
                    featureElement = createShapeFeature();
                    break;
                case 'calculus':
                    featureElement = createCalculusFeature();
                    break;
                case 'curved':
                    featureElement = createCurvedFeature();
                    break;
                case 'abcde':
                    featureElement = createAbcdeFeature();
                    break;
                case 'abc':
                    featureElement = createAbcFeature();
                    break;
                case 'findEee':
                    featureElement = createFindEeeFeature();
                    break;
                case 'positionCons':
                    featureElement = createPositionConsFeature();
                    break;
                case 'firstCurved':
                    featureElement = createFirstCurvedFeature();
                    break;
                case 'eyeTest':
                    featureElement = createEyeTestFeature();
                    break;
                case 'pin':
                    featureElement = createPinFeature();
                    break;
                case 'scrabble':
                    featureElement = createScrabbleFeature();
                    break;
                case 'scrabble1':
                    featureElement = createScrabble1Feature();
                    break;
                case 'sologram':
                    featureElement = createSologramFeature();
                    break;
                case 'scramble':
                    featureElement = createScrambleFeature();
                    break;
                case 'pianoForte':
                    featureElement = createPianoForteFeature();
                    break;
                case 'pianoPiano':
                    featureElement = createPianoPianoFeature();
                    break;
                case 'mute':
                    featureElement = createMuteFeature();
                    break;
                case 'muteDuo':
                    featureElement = createMuteDuoFeature();
                    break;
                case 't9Length':
                    featureElement = createT9LengthFeature();
                    break;
                case 't9LastTwo':
                    featureElement = createT9LastTwoFeature();
                    break;
                case 't9Last':
                    featureElement = createT9LastFeature();
                    break;
                case 't9Position5':
                    featureElement = createT9Position5Feature();
                    break;
                case 't9Guess':
                    featureElement = createT9GuessFeature();
                    break;
                case 't9OneLie':
                    featureElement = createT9OneLieFeature();
                    break;
                case 't9Repeat':
                    featureElement = createT9RepeatFeature();
                    break;
                case 't9Higher':
                    featureElement = createT9HigherFeature();
                    break;
                case 't9Singing':
                    featureElement = createT9SingingFeature();
                    break;
                case 't9NumberStart':
                    featureElement = createT9NumberStartFeature();
                    break;
                case 't9OneTruth':
                    featureElement = createT9OneTruthFeature();
                    break;
                case 'alphaNumeric':
                    featureElement = createAlphaNumericFeature();
                    break;
                case 'lettersAbove':
                    featureElement = createLettersAboveFeature();
                    break;
                case 'dictionaryAlpha':
                    featureElement = createDictionaryAlphaFeature();
                    break;
                case 'alpha':
                    featureElement = createAlphaFeature();
                    break;
                case 'smlLength':
                    featureElement = createSmlLengthFeature();
                    break;
                case 'theCore':
                    featureElement = createTheCoreFeature();
                    break;
                default:
                    featureElement = null;
            }
            if (!featureElement) {
                console.log('No feature element created for:', step.feature);
                continue;
            }
            console.log('Created feature element for:', step.feature, featureElement);
            // Clear feature area; show active feature first, then shared BIRTHDAY results container underneath for numerology
            let birthdayResultsElStep = document.getElementById('birthdayResults');
            featureArea.innerHTML = '';
            featureArea.appendChild(featureElement);
            const isBirthdayStep = (step.feature === 'numerology');
            if (isBirthdayStep) {
                if (!birthdayResultsElStep) {
                    birthdayResultsElStep = document.createElement('div');
                    birthdayResultsElStep.id = 'birthdayResults';
                    birthdayResultsElStep.className = 'birthday-results';
                    birthdayResultsElStep.setAttribute('aria-live', 'polite');
                }
                featureArea.appendChild(birthdayResultsElStep);
            } else if (birthdayResultsElStep && birthdayResultsElStep.innerHTML.trim() !== '') {
                featureArea.appendChild(birthdayResultsElStep);
            }
            featureElement.style.display = 'block';
            console.log('Feature element display set to block');
            
            // For MOST FREQUENT feature, use the current rank
            if (step.feature === 'mostFrequent') {
                mostFrequentLetter = findMostFrequentLetter(currentFilteredWords, mostFrequentRank);
                if (mostFrequentLetter) {
                    const letterDisplay = featureElement.querySelector('.letter');
                    if (letterDisplay) {
                        letterDisplay.textContent = mostFrequentLetter;
                    }
                }
            }
            // For LEAST FREQUENT feature
            else if (step.feature === 'leastFrequent') {
                leastFrequentLetter = findLeastFrequentLetter(currentFilteredWords);
                if (leastFrequentLetter) {
                    const letterDisplay = featureElement.querySelector('.letter');
                    if (letterDisplay) {
                        letterDisplay.textContent = leastFrequentLetter;
                    }
                }
            }
            
            // Set up event listeners for this feature (use setTimeout to ensure DOM is ready)
            setTimeout(() => {
                setupFeatureListeners(step.feature, (filteredWords) => {
                    currentFilteredWords = filteredWords;
                    displayResults(currentFilteredWords);
                }, { previousStepFeature, steps: workflowSteps, stepIndex });
            }, 0);
            
            // Wait for user interaction
            await new Promise((resolve) => {
                const handleFeatureComplete = () => {
                    console.log(`Feature ${featureId} completed`);
                    featureElement.classList.add('completed');
                    featureElement.style.display = 'none';
                    
                    // If this was the MOST FREQUENT feature and YES was selected, increment the rank
                    if (step.feature === 'mostFrequent' && mostFrequentLetter) {
                        usedLettersInWorkflow.push(mostFrequentLetter);
                        mostFrequentRank++;
                    }

                    // Lexicon OVERRIDE: insert Original Lex once per workflow when words drop to threshold or below
                    const overrideOn = !!(appSettings && appSettings.lexiconOverrideOn);
                    const continueWorkflow = !!(appSettings && appSettings.lexiconOverrideContinueWorkflow);
                    const thresholdRaw = (appSettings && appSettings.lexiconOverrideThreshold);
                    const threshold = Math.max(1, Math.min(5000, parseInt(thresholdRaw != null ? thresholdRaw : 50, 10) || 50));
                    const shouldOverride = overrideOn
                        && !lexiconOverrideTriggered
                        && step.feature !== 'originalLex'
                        && Array.isArray(currentFilteredWords)
                        && currentFilteredWords.length <= threshold
                        && !(workflowSteps[stepIndex + 1] && workflowSteps[stepIndex + 1].feature === 'originalLex');
                    if (shouldOverride) {
                        lexiconOverrideTriggered = true;
                        workflowSteps.splice(stepIndex + 1, 0, { feature: 'originalLex' });
                        if (!continueWorkflow) {
                            // Original Lex becomes the final step of this performance
                            workflowSteps.length = stepIndex + 2;
                        }
                    }
                    
                    resolve();
                };
                
                featureElement.addEventListener('completed', handleFeatureComplete, { once: true });
            });
        }
        
        // Show final results
        displayResults(currentFilteredWords);
    } catch (error) {
        console.error('Error executing workflow:', error);
        throw error;
    }
}

// Export button helpers
function initializeExportButton() {
    if (exportButton) {
        return;
    }
    
    exportButton = document.createElement('button');
    exportButton.id = 'exportButton';
    exportButton.className = 'home-button export-button';
    exportButton.innerHTML = '💾';
    exportButton.title = 'Export filtered wordlist as .txt file';
    
    const triggerExport = () => {
        if (!latestExportWords || latestExportWords.length === 0) {
            alert('No words to export!');
            return;
        }

        const defaultName = `filtered_wordlist_${new Date().toISOString().slice(0, 10)}.txt`;
        let userFileName = prompt('Enter a name for your export (.txt):', defaultName);

        if (userFileName === null) {
            return; // User cancelled
        }

        userFileName = userFileName.trim();
        if (!userFileName) {
            userFileName = defaultName;
        }
        if (!userFileName.toLowerCase().endsWith('.txt')) {
            userFileName += '.txt';
        }

        exportWordlist(latestExportWords, userFileName);
    };
    
    exportButton.addEventListener('click', triggerExport);
    exportButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        triggerExport();
    }, { passive: false });
    
    document.body.appendChild(exportButton);
    exportButton.style.display = 'none';
    updateExportButtonState([]);
}

function updateExportButtonState(words = latestExportWords) {
    latestExportWords = Array.isArray(words) ? [...words] : [];
    
    if (!exportButton) {
        return;
    }
    
    const hasWords = latestExportWords.length > 0;
    exportButton.disabled = !hasWords;
    exportButton.classList.toggle('export-button--disabled', !hasWords);
}

// Function to export wordlist as .txt file
function exportWordlist(words, fileName) {
    if (!words || words.length === 0) {
        alert('No words to export!');
        return;
    }
    
    // Create the content for the .txt file
    const content = words.join('\n');
    
    // Create a blob with the content
    const blob = new Blob([content], { type: 'text/plain' });
    
    // Create a download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sanitizeFilename(fileName) || `filtered_wordlist_${new Date().toISOString().slice(0, 10)}.txt`;
    
    // Trigger the download
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function sanitizeFilename(name) {
    if (!name) return '';
    return name.replace(/[<>:"/\\|?*]+/g, '_').slice(0, 200);
}

// Helper functions to create feature elements
function createPosition1Feature() {
    const div = document.createElement('div');
    div.id = 'position1Feature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">SHORT WORD</h2>
        <div class="position-input">
            <input type="text" id="position1Input" placeholder="Enter a word">
            <button id="position1Button">SUBMIT</button>
            <button id="position1DoneButton">DONE</button>
        </div>
    `;
    return div;
}

function createConsMidFeature() {
    const div = document.createElement('div');
    div.id = 'consMidFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">3 LETTER WORD</h2>
        <div class="position-input">
            <input type="text" id="consMidInput" placeholder="Enter a word">
            <button id="consMidButton">SUBMIT</button>
            <button id="consMidDoneButton">DONE</button>
        </div>
    `;
    return div;
}

function createConsMid2Feature() {
    const div = document.createElement('div');
    div.id = 'consMid2Feature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">CONS MID</h2>
        <div class="position-input">
            <input type="text" id="consMid2Input" placeholder="Enter a word">
            <button id="consMid2Button">SUBMIT</button>
            <button id="consMid2DoneButton">DONE</button>
        </div>
    `;
    return div;
}

function createVowelFeature() {
    const div = document.createElement('div');
    div.id = 'vowelFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">VOWEL</h2>
        <div class="vowel-letter"></div>
        <div class="button-container">
            <button class="vowel-btn yes-btn">YES</button>
            <button class="vowel-btn no-btn">NO</button>
        </div>
        <div class="position-buttons">
            <button class="position-btn" data-position="1">1</button>
            <button class="position-btn" data-position="2">2</button>
            <button class="position-btn" data-position="3">3</button>
            <button class="position-btn" data-position="4">4</button>
            <button class="position-btn" data-position="5">5</button>
            <button class="position-btn" data-position="6">6</button>
            <button class="position-btn" data-position="7">7</button>
            <button class="position-btn" data-position="8">8</button>
        </div>
    `;
    return div;
}

function createVowel2Feature() {
    const div = document.createElement('div');
    div.id = 'vowel2Feature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">VOWEL2</h2>
        <p style="text-align: center; margin: 10px 0; font-size: 14px; color: #666;">Is there a vowel (A, E, I, O, U) in the second position?</p>
        <div class="button-container">
            <button class="vowel-btn yes-btn">YES</button>
            <button class="vowel-btn no-btn">NO</button>
            <button id="vowel2SkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

function createVowelPosFeature() {
    console.log('Creating VOWEL POS feature element');
    const div = document.createElement('div');
    div.id = 'vowelPosFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">VOWEL POS</h2>
        <div class="vowel-letter"></div>
        <div class="button-container">
            <button class="vowel-btn yes-btn">YES</button>
            <button class="vowel-btn no-btn">NO</button>
        </div>
        <div class="section-buttons">
            <button class="section-btn" data-section="begin">BEGIN</button>
            <button class="section-btn" data-section="mid">MID</button>
            <button class="section-btn" data-section="end">END</button>
        </div>
    `;
    console.log('VOWEL POS feature element created:', div);
    return div;
}

function createNameFeature() {
    const div = document.createElement('div');
    div.id = 'nameFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">NAME</h2>
        <div class="name-input-container" style="margin: 20px 0;">
            <input type="text" id="nameInput" placeholder="Enter full name (e.g., John Smith)" style="padding: 10px; width: 100%; max-width: 300px; font-size: 16px;">
        </div>
        <div class="vowel-buttons" style="display: flex; justify-content: center; gap: 10px; margin: 20px 0; flex-wrap: wrap;">
            <button class="vowel-btn" data-vowel="a">A</button>
            <button class="vowel-btn" data-vowel="e">E</button>
            <button class="vowel-btn" data-vowel="i">I</button>
            <button class="vowel-btn" data-vowel="o">O</button>
            <button class="vowel-btn" data-vowel="u">U</button>
        </div>
        <div class="section-buttons" style="display: flex; justify-content: center; gap: 10px; margin: 20px 0;">
            <button class="section-btn" data-section="start">START</button>
            <button class="section-btn" data-section="middle">MID</button>
            <button class="section-btn" data-section="end">END</button>
        </div>
        <div style="display: flex; justify-content: center; margin-top: 20px;">
            <button id="nameSubmitButton" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">SUBMIT</button>
            <button id="nameNoVowelButton" style="padding: 10px 20px; background: #ff9800; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin-left: 10px;">NO VOWEL</button>
            <button id="nameSkipButton" class="skip-button" style="margin-left: 10px;">SKIP</button>
        </div>
    `;
    return div;
}

function createOFeature() {
    const div = document.createElement('div');
    div.id = 'oFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">O?</h2>
        <div class="button-container">
            <button id="oYesBtn" class="yes-btn">YES</button>
            <button id="oNoBtn" class="no-btn">NO</button>
            <button id="oSkipBtn" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

function createOCurvesFeature() {
    const div = document.createElement('div');
    div.id = 'oCurvesFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">O-CURVES</h2>
        <div id="oCurvesPart1" class="o-curves-part">
            <p class="o-curves-prompt">Is there an O in the word?</p>
            <div class="button-container">
                <button id="oCurvesYesBtn" class="yes-btn">YES</button>
                <button id="oCurvesNoBtn" class="no-btn">NO</button>
                <button id="oCurvesSkipBtn" class="skip-button">SKIP</button>
            </div>
        </div>
        <div id="oCurvesPart2" class="o-curves-part" style="display: none;">
            <p class="o-curves-prompt">Positions of curved letters (1–5). e.g. 123 or 0 for all straight.</p>
            <div class="lexicon-input">
                <input type="text" id="oCurvesPositionsInput" placeholder="Enter positions (e.g. 123)">
                <button id="oCurvesSubmitBtn">SUBMIT</button>
                <button id="oCurvesCurvedSkipBtn" class="skip-button">SKIP</button>
            </div>
        </div>
    `;
    return div;
}

function createLexiconFeature() {
    const div = document.createElement('div');
    div.id = 'lexiconFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">LEXICON</h2>
        <div class="lexicon-input">
            <input type="text" id="lexiconInput" placeholder="Enter positions (e.g., 123)">
            <button id="lexiconButton">SUBMIT</button>
            <button id="lexiconSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

function createZeroCurvesFeature() {
    const div = document.createElement('div');
    div.id = 'zeroCurvesFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">ZERO CURVES</h2>
        <p style="text-align: center; margin: 10px 0; font-size: 14px; color: #666;">Enter positions 1–6 where letters are curved (e.g. 135, or 0 for no curved letters in 1–6). APPROX in Settings relaxes other positions.</p>
        <div class="lexicon-input">
            <input type="text" id="zeroCurvesInput" placeholder="Enter positions (e.g. 135 or 0)">
            <button id="zeroCurvesButton">SUBMIT</button>
            <button id="zeroCurvesSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

function createEeeFeature() {
    const div = document.createElement('div');
    div.id = 'eeeFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">EEE?</h2>
        <div class="button-container">
            <button id="eeeButton">E</button>
            <button id="eeeYesBtn" class="yes-btn">YES</button>
            <button id="eeeNoBtn" class="no-btn">NO</button>
        </div>
    `;
    return div;
}

function createEeeFirstFeature() {
    const div = document.createElement('div');
    div.id = 'eeeFirstFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">EEEFIRST</h2>
        <div class="button-container">
            <button id="eeeFirstButton">E</button>
            <button id="eeeFirstYesBtn" class="yes-btn">YES</button>
            <button id="eeeFirstNoBtn" class="no-btn">NO</button>
        </div>
        <button id="eeeFirstSkipButton" class="skip-button">SKIP</button>
    `;
    return div;
}

function createE21Feature() {
    const div = document.createElement('div');
    div.id = 'e21Feature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">E21</h2>
        <div id="e21Part1" class="e21-part">
            <p style="text-align: center; margin: 10px 0; font-size: 14px; color: #666;">Second letter (EEE?): E, E-sound, or No E.</p>
            <div class="button-container">
                <button id="e21SecondEBtn" class="yes-btn">E</button>
                <button id="e21SecondYesBtn" class="yes-btn">E SOUND</button>
                <button id="e21SecondNoBtn" class="no-btn">NO E</button>
            </div>
        </div>
        <div id="e21Part2" class="e21-part" style="display: none;">
            <p style="text-align: center; margin: 10px 0; font-size: 14px; color: #666;">First letter (EEEFIRST): E, E-sound, or No E.</p>
            <div class="button-container">
                <button id="e21FirstEBtn" class="yes-btn">E</button>
                <button id="e21FirstYesBtn" class="yes-btn">E SOUND</button>
                <button id="e21FirstNoBtn" class="no-btn">NO E</button>
            </div>
        </div>
        <div id="e21Part3" class="e21-part" style="display: none;">
            <p style="text-align: center; margin: 10px 0; font-size: 14px; color: #666;">Is there an E anywhere in the word?</p>
            <div class="button-container">
                <button id="e21AnywhereYesBtn" class="yes-btn">YES</button>
                <button id="e21AnywhereNoBtn" class="no-btn">NO</button>
            </div>
        </div>
        <div class="button-container" style="margin-top: 16px;">
            <button id="e21SkipBtn" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

function createOriginalLexFeature() {
    const div = document.createElement('div');
    div.id = 'originalLexFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">LEXICON</h2>
        <div class="position-info">
            <div class="position-display">Position: <span class="position-number">1</span></div>
            <div class="possible-letters">Possible letters: <span class="letters-list"></span></div>
        </div>
        <div class="lexicon-input">
            <input type="text" id="originalLexInput" placeholder="Enter a word">
            <button id="originalLexButton">SUBMIT</button>
            <button id="originalLexSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

function createAdvLexFeature() {
    const div = document.createElement('div');
    div.id = 'advLexFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">ADV-LEX</h2>
        <div class="position-info">
            <div class="position-display">Position <span class="position-number">-</span></div>
        </div>
        <div id="advLexWordList" class="advlex-list"></div>
        <div class="button-row">
            <button id="advLexSubmitButton" class="submit-button">SUBMIT</button>
            <button id="advLexSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

function createConsonantQuestion() {
    const div = document.createElement('div');
    div.id = 'consonantQuestion';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">CONSONANTS TOGETHER?</h2>
        <div class="button-container">
            <button id="consonantYesBtn" class="yes-btn">YES</button>
            <button id="consonantNoBtn" class="no-btn">NO</button>
        </div>
    `;
    return div;
}

function createTheCoreFeature() {
    const div = document.createElement('div');
    div.id = 'theCoreFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">THE CORE</h2>
        <div class="the-core-section" id="theCoreStep1">
            <p style="text-align: center; margin: 8px 0; font-size: 14px; color: #666;">Are there two consonants together in your word?</p>
            <div class="button-container">
                <button id="theCoreQ1YesBtn" class="yes-btn">YES</button>
                <button id="theCoreQ1NoBtn" class="no-btn">NO</button>
            </div>
        </div>
        <div class="the-core-section" id="theCoreYesBranch" style="display: none; margin-top: 12px;">
            <p style="text-align: center; margin: 4px 0; font-size: 14px; color: #666;">Enter a short word. Any two of its consonants will appear together in the word (in either order).</p>
            <div class="position-input">
                <input type="text" id="theCoreShortWordInput" placeholder="e.g. CAT or HELLO" autocomplete="off" style="text-transform: uppercase;">
                <button id="theCoreShortWordSubmitBtn">SUBMIT</button>
            </div>
        </div>
        <div class="the-core-section" id="theCoreNoBranch" style="display: none; margin-top: 12px;">
            <p style="text-align: center; margin: 4px 0; font-size: 14px; color: #666;">Enter a word. Any two of its consonants may appear in the word, but never together.</p>
            <div class="position-input">
                <input type="text" id="theCoreConsMidInput" placeholder="e.g. PLANET" autocomplete="off" style="text-transform: uppercase;">
                <button id="theCoreConsMidSubmitBtn">SUBMIT</button>
            </div>
        </div>
        <div class="the-core-section" id="theCoreVowelSection" style="display: none; margin-top: 12px;">
            <p style="text-align: center; margin: 4px 0; font-size: 14px; color: #666;">Vowels from your short word. Does each vowel appear in the word?</p>
            <div style="text-align: center; margin-bottom: 6px;">
                <span id="theCoreVowelLetter" style="font-size: 20px; font-weight: bold;">-</span>
            </div>
            <div class="button-container" id="theCoreVowelYesNo">
                <button id="theCoreVowelYesBtn" class="yes-btn">YES</button>
                <button id="theCoreVowelNoBtn" class="no-btn">NO</button>
            </div>
            <div id="theCoreVowelPosSection" style="display: none; margin-top: 12px;">
                <p style="text-align: center; margin: 4px 0; font-size: 14px; color: #666;">
                    Where is the letter <span id="theCoreVowelPosLetter" style="font-weight: bold;">-</span> in their word?
                </p>
                <div class="button-container">
                    <button type="button" class="section-btn" data-section="begin">Beginning</button>
                    <button type="button" class="section-btn" data-section="mid">Middle</button>
                    <button type="button" class="section-btn" data-section="end">End</button>
                </div>
            </div>
        </div>
    `;
    return div;
}

function createColour3Feature() {
    const div = document.createElement('div');
    div.id = 'colour3Feature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">COLOUR3</h2>
        <div class="button-container">
            <button id="colour3YesBtn" class="yes-btn">YES</button>
            <button id="colour3SkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

// --- ATLAS: how many of positions 1–6 are colour-start letters ---
function createAtlasFeature() {
    const div = document.createElement('div');
    div.id = 'atlasFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">ATLAS</h2>
        <p style="text-align: center; margin: 10px 0; font-size: 14px; color: #666;">Enter positions 1–6 that are definitely colour letters (e.g. 145).</p>
        <div class="atlas-input-row">
            <input type="text" id="atlasInput" placeholder="Positions (e.g. 145)" autocomplete="off">
        </div>
        <div class="input-group">
            <button id="atlasButton">SUBMIT</button>
            <button id="atlasSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

function createLetterLyingFeature() {
    const div = document.createElement('div');
    div.id = 'letterLyingFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">Letter Lying</h2>
        <p style="text-align: center; margin: 10px 0; font-size: 14px; color: #666;">Is this letter in your word?</p>
        <div class="letter-lying-letter-display" id="letterLyingLetterDisplay">—</div>
        <div class="button-container">
            <button id="letterLyingYesBtn" class="yes-btn">YES</button>
            <button id="letterLyingNoBtn" class="no-btn">NO</button>
            <button id="letterLyingSkipLetterBtn" class="skip-letter-btn" title="Skip this letter">→</button>
            <button id="letterLyingSkipBtn" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

function createLoveLettersFeature() {
    const rowCount = Math.max(1, Math.min(5, (appSettings && appSettings.loveLettersRowCount) || 5));
    const div = document.createElement('div');
    div.id = 'loveLettersFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">Love Letters</h2>
        <p style="text-align: center; margin: 10px 0; font-size: 14px; color: #666;">Enter the number for each row (how many distinct letters from that row appear in the word). ${rowCount} digit(s).</p>
        <div class="input-group">
            <input type="text" id="loveLettersInput" placeholder="e.g. 11112" inputmode="numeric" pattern="[0-9]*" maxlength="5" autocomplete="off">
            <button id="loveLettersButton">SUBMIT</button>
            <button id="loveLettersSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

function createShapeFeature() {
    const div = document.createElement('div');
    div.id = 'shapeFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">SHAPE</h2>
        <div class="shape-display">
            <div class="position-display"></div>
            <div class="category-buttons"></div>
        </div>
    `;
    return div;
}

function updateOmegaSequenceDisplay() {
    const el = document.querySelector('#shapeFeature .position-display');
    if (!el) return;
    if (omegaSelections.length === 0) {
        el.textContent = 'Tap shapes to build sequence, then SUBMIT';
    } else {
        el.textContent = omegaSelections.length + ' shape(s): ' + omegaSelections.join(' → ');
    }
}

function getOmegaActiveMapping() {
    const mode = (appSettings && appSettings.omegaMode) || 'esp';
    if (mode === 'custom') {
        const shapes = (appSettings && appSettings.omegaCustomShapes) || [];
        return Object.fromEntries(
            shapes
                .filter(s => s && (s.name || '').trim() && (s.letters || '').trim())
                .map(s => [(s.name || '').trim(), (s.letters || '').toUpperCase().replace(/[^A-Z]/g, '')])
        );
    }
    return omegaMappings[mode] || omegaMappings.esp;
}

function updateOmegaEfficiencySubtitle() {
    const el = document.getElementById('omegaEfficiencySubtitle');
    if (!el) return;
    el.textContent = 'Loading…';
    const modeSelect = document.getElementById('omegaModeSelect');
    const mode = (modeSelect && modeSelect.value) || (appSettings && appSettings.omegaMode) || 'esp';
    const mapping = mode === 'custom' ? getOmegaActiveMapping() : (omegaMappings[mode] || omegaMappings.esp);
    const keys = Object.keys(mapping);
    loadWordsForEfficiency()
        .then(words => {
            const pct = computeOmegaEfficiency(mapping, words);
            const wordlistSelect = document.getElementById('wordlistSelect');
            const label = (wordlistSelect && wordlistSelect.options[wordlistSelect.selectedIndex])
                ? wordlistSelect.options[wordlistSelect.selectedIndex].textContent
                : 'wordlist';
            if (pct === null) {
                el.textContent = '';
                return;
            }
            if (keys.length === 0) {
                el.textContent = '0% effective (add shapes)';
                return;
            }
            el.textContent = pct + '% effective (vs ' + label + ')';
        })
        .catch(() => {
            el.textContent = '—';
        });
}

function updateAlphaEfficiencySubtitle() {
    const el = document.getElementById('alphaEfficiencySubtitle');
    if (!el) return;
    const n = Math.max(0, parseInt((appSettings && appSettings.alphaDirectionsCount) || 0, 10));
    const swapPov = !!(appSettings && appSettings.alphaSwapPov);
    if (n === 0) {
        el.textContent = 'Set number of directions to see efficiency';
        return;
    }
    el.textContent = 'Loading…';
    loadWordsForEfficiency()
        .then(words => {
            const pct = computeAlphaEfficiency(words, n, swapPov);
            const wordlistSelect = document.getElementById('wordlistSelect');
            const label = (wordlistSelect && wordlistSelect.options[wordlistSelect.selectedIndex])
                ? wordlistSelect.options[wordlistSelect.selectedIndex].textContent
                : 'wordlist';
            if (pct === null) {
                el.textContent = '';
                return;
            }
            el.textContent = pct + '% effective with ' + n + ' direction(s) (vs ' + label + ')';
        })
        .catch(() => {
            el.textContent = '—';
        });
}

function startOmega(callback) {
    const modeSelect = document.getElementById('omegaModeSelect');
    const mode = (modeSelect && modeSelect.value) || (appSettings && appSettings.omegaMode) || 'esp';
    omegaActiveMapping = mode === 'custom' ? getOmegaActiveMapping() : (omegaMappings[mode] || omegaMappings.esp);
    omegaSelections = [];

    const shapeFeature = document.getElementById('shapeFeature');
    if (!shapeFeature) return;
    const titleEl = shapeFeature.querySelector('.feature-title');
    if (titleEl) titleEl.textContent = 'OMEGA: Short';
    const positionDisplay = shapeFeature.querySelector('.position-display');
    const categoryButtons = shapeFeature.querySelector('.category-buttons');
    if (!categoryButtons) return;

    updateOmegaSequenceDisplay();

    const omegaShapesCount = Math.max(0, parseInt((appSettings && appSettings.omegaShapesCount) || 0, 10));
    const omegaAutoSubmit = () => {
        const filtered = applyOmegaFilter(currentFilteredWords, omegaSelections);
        callback(filtered);
        shapeFeature.classList.add('completed');
        shapeFeature.dispatchEvent(new Event('completed'));
    };
    categoryButtons.innerHTML = '';
    Object.keys(omegaActiveMapping).forEach(shape => {
        const btn = document.createElement('button');
        btn.className = 'shape-btn';
        btn.textContent = shape;
        btn.type = 'button';
        btn.onclick = () => {
            omegaSelections.push(shape);
            updateOmegaSequenceDisplay();
            if (omegaShapesCount > 0 && omegaSelections.length >= omegaShapesCount) omegaAutoSubmit();
        };
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); btn.click(); }, { passive: false });
        categoryButtons.appendChild(btn);
    });
    if (mode === 'custom' && Object.keys(omegaActiveMapping).length === 0) {
        const msg = document.createElement('p');
        msg.className = 'omega-empty-custom-msg';
        msg.style.margin = '12px 0'; msg.style.color = '#666'; msg.style.fontSize = '0.9em';
        msg.textContent = 'Add shapes in Settings → OMEGA → Custom';
        categoryButtons.appendChild(msg);
    }

    let actionsRow = shapeFeature.querySelector('.omega-actions');
    if (!actionsRow) {
        actionsRow = document.createElement('div');
        actionsRow.className = 'omega-actions';
        actionsRow.style.marginTop = '16px';
        actionsRow.style.display = 'flex';
        actionsRow.style.gap = '10px';
        actionsRow.style.flexWrap = 'wrap';
        actionsRow.style.justifyContent = 'center';
        shapeFeature.querySelector('.shape-display').appendChild(actionsRow);
    }
    actionsRow.innerHTML = '';
    const backspaceBtn = document.createElement('button');
    backspaceBtn.className = 'omega-backspace-btn';
    backspaceBtn.textContent = 'Backspace';
    backspaceBtn.type = 'button';
    backspaceBtn.onclick = () => {
        if (omegaSelections.length) {
            omegaSelections.pop();
            updateOmegaSequenceDisplay();
        }
    };
    backspaceBtn.addEventListener('touchstart', (e) => { e.preventDefault(); backspaceBtn.click(); }, { passive: false });
    const submitBtn = document.createElement('button');
    submitBtn.className = 'omega-submit-btn';
    submitBtn.textContent = 'SUBMIT';
    submitBtn.type = 'button';
    submitBtn.onclick = () => {
        if (omegaSelections.length === 0) {
            alert('Add at least one shape to the sequence, then SUBMIT.');
            return;
        }
        const filtered = applyOmegaFilter(currentFilteredWords, omegaSelections);
        callback(filtered);
        shapeFeature.classList.add('completed');
        shapeFeature.dispatchEvent(new Event('completed'));
    };
    submitBtn.addEventListener('touchstart', (e) => { e.preventDefault(); submitBtn.click(); }, { passive: false });
    const skipBtn = document.createElement('button');
    skipBtn.className = 'skip-button';
    skipBtn.textContent = 'SKIP';
    skipBtn.type = 'button';
    skipBtn.onclick = () => {
        callback(currentFilteredWords);
        shapeFeature.classList.add('completed');
        shapeFeature.dispatchEvent(new Event('completed'));
    };
    skipBtn.addEventListener('touchstart', (e) => { e.preventDefault(); skipBtn.click(); }, { passive: false });
    actionsRow.appendChild(backspaceBtn);
    actionsRow.appendChild(submitBtn);
    actionsRow.appendChild(skipBtn);
}

// CALCULUS: OMEGA-style filter with digits 0-9 (word length >= digit string length + 1, same forbidden pairs)
function createCalculusFeature() {
    const div = document.createElement('div');
    div.id = 'calculusFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">CALCULUS</h2>
        <div class="calculus-display">
            <div class="calculus-sequence-display"></div>
            <div class="calculus-digit-buttons"></div>
        </div>
    `;
    return div;
}

function startCalculus(callback) {
    const calculusFeature = document.getElementById('calculusFeature');
    if (!calculusFeature) return;
    const calculusMode = (appSettings && appSettings.calculusMode) || 'abstract';
    const isCurvesStraight = calculusMode === 'curvesStraight';
    let calculusSelections = [];  // array of '0'-'9' or 'C'/'S'

    const sequenceDisplay = calculusFeature.querySelector('.calculus-sequence-display');
    const digitButtonsContainer = calculusFeature.querySelector('.calculus-digit-buttons');
    if (!sequenceDisplay || !digitButtonsContainer) return;

    function updateCalculusDisplay() {
        const prompt = isCurvesStraight
            ? 'Tap C (Curves) or S (Straight) to build sequence, then SUBMIT'
            : 'Tap digits to build sequence, then SUBMIT';
        sequenceDisplay.textContent = calculusSelections.length === 0 ? prompt : calculusSelections.join('');
    }
    updateCalculusDisplay();

    digitButtonsContainer.innerHTML = '';
    const buttons = isCurvesStraight
        ? [{ key: 'C', label: 'C (Curves)' }, { key: 'S', label: 'S (Straight)' }]
        : ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => ({ key: d, label: d }));
    buttons.forEach(({ key, label }) => {
        const btn = document.createElement('button');
        btn.className = 'calculus-digit-btn';
        btn.textContent = label;
        btn.type = 'button';
        btn.onclick = () => {
            calculusSelections.push(key);
            updateCalculusDisplay();
        };
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); btn.click(); }, { passive: false });
        digitButtonsContainer.appendChild(btn);
    });

    let actionsRow = calculusFeature.querySelector('.calculus-actions');
    if (!actionsRow) {
        actionsRow = document.createElement('div');
        actionsRow.className = 'calculus-actions';
        actionsRow.style.marginTop = '16px';
        actionsRow.style.display = 'flex';
        actionsRow.style.gap = '10px';
        actionsRow.style.flexWrap = 'wrap';
        actionsRow.style.justifyContent = 'center';
        calculusFeature.querySelector('.calculus-display').appendChild(actionsRow);
    }
    actionsRow.innerHTML = '';
    const backspaceBtn = document.createElement('button');
    backspaceBtn.className = 'omega-backspace-btn';
    backspaceBtn.textContent = 'Backspace';
    backspaceBtn.type = 'button';
    backspaceBtn.onclick = () => {
        if (calculusSelections.length) {
            calculusSelections.pop();
            updateCalculusDisplay();
        }
    };
    backspaceBtn.addEventListener('touchstart', (e) => { e.preventDefault(); backspaceBtn.click(); }, { passive: false });
    const submitBtn = document.createElement('button');
    submitBtn.className = 'omega-submit-btn';
    submitBtn.textContent = 'SUBMIT';
    submitBtn.type = 'button';
    submitBtn.onclick = () => {
        if (calculusSelections.length === 0) {
            alert(isCurvesStraight ? 'Add at least one C or S to the sequence, then SUBMIT.' : 'Add at least one digit to the sequence, then SUBMIT.');
            return;
        }
        const digitString = calculusSelections.join('');
        const filtered = applyCalculusFilter(currentFilteredWords, digitString);
        callback(filtered);
        calculusFeature.classList.add('completed');
        calculusFeature.dispatchEvent(new Event('completed'));
    };
    submitBtn.addEventListener('touchstart', (e) => { e.preventDefault(); submitBtn.click(); }, { passive: false });
    const skipBtn = document.createElement('button');
    skipBtn.className = 'skip-button';
    skipBtn.textContent = 'SKIP';
    skipBtn.type = 'button';
    skipBtn.onclick = () => {
        callback(currentFilteredWords);
        calculusFeature.classList.add('completed');
        calculusFeature.dispatchEvent(new Event('completed'));
    };
    skipBtn.addEventListener('touchstart', (e) => { e.preventDefault(); skipBtn.click(); }, { passive: false });
    actionsRow.appendChild(backspaceBtn);
    actionsRow.appendChild(submitBtn);
    actionsRow.appendChild(skipBtn);
}

function createCurvedFeature() {
    const div = document.createElement('div');
    div.id = 'curvedFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">CURVED</h2>
        <div class="curved-buttons">
            <button class="curved-btn">B</button>
            <button class="curved-btn">C</button>
            <button class="curved-btn">D</button>
            <button class="curved-btn">G</button>
            <button class="curved-btn">J</button>
            <button class="curved-btn">O</button>
            <button class="curved-btn">P</button>
            <button class="curved-btn">Q</button>
            <button class="curved-btn">R</button>
            <button class="curved-btn">S</button>
            <button class="curved-btn">U</button>
        </div>
        <button id="curvedSkipBtn" class="skip-button">SKIP</button>
    `;
    return div;
}

function createLengthFeature() {
    const div = document.createElement('div');
    div.id = 'lengthFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">LENGTH</h2>
        <div class="length-input">
            <input type="text" id="lengthInput" placeholder="Enter length (3+)" inputmode="numeric" pattern="[0-9]*" autocomplete="off">
            <button id="lengthButton">SUBMIT</button>
            <button id="lengthSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

/** LETTER SHAPES pre-filter: position 1–6 + STRAIGHT / MIXED / CURVED letter sets (distinct from lexicon shapeFeature). */
function createLetterShapesFeature() {
    const div = document.createElement('div');
    div.id = 'letterShapesFeature';
    div.className = 'feature-section';
    div.dataset.selectedPosition = '';
    div.innerHTML = `
        <h2 class="feature-title">LETTER SHAPES</h2>
        <p class="letter-shapes-hint">Pick a position (1–6), then STRAIGHT, MIXED, or CURVED. Only words long enough are kept.</p>
        <div class="letter-shapes-section">
            <div class="letter-shapes-label">Position</div>
            <div class="letter-shapes-pos-buttons">
                <button type="button" class="letter-shapes-pos-btn" data-pos="1">1</button>
                <button type="button" class="letter-shapes-pos-btn" data-pos="2">2</button>
                <button type="button" class="letter-shapes-pos-btn" data-pos="3">3</button>
                <button type="button" class="letter-shapes-pos-btn" data-pos="4">4</button>
                <button type="button" class="letter-shapes-pos-btn" data-pos="5">5</button>
                <button type="button" class="letter-shapes-pos-btn" data-pos="6">6</button>
            </div>
        </div>
        <div class="letter-shapes-section">
            <div class="letter-shapes-label">Shape at that position</div>
            <div class="letter-shapes-shape-buttons">
                <button type="button" class="letter-shapes-shape-btn" data-shape="straight">STRAIGHT</button>
                <button type="button" class="letter-shapes-shape-btn" data-shape="mixed">MIXED</button>
                <button type="button" class="letter-shapes-shape-btn" data-shape="curved">CURVED</button>
            </div>
        </div>
        <div class="letter-shapes-skip-wrap">
            <button type="button" id="letterShapesSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

function createScrabbleFeature() {
    const div = document.createElement('div');
    div.id = 'scrabbleFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">SCRABBLE</h2>
        <div class="length-input">
            <input type="text" id="scrabbleInput" placeholder="Enter Scrabble score" inputmode="numeric" pattern="[0-9]*" autocomplete="off">
            <button id="scrabbleButton">SUBMIT</button>
            <button id="scrabbleSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

function createScrabble1Feature() {
    const div = document.createElement('div');
    div.id = 'scrabble1Feature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">SCRABBLE1</h2>
        <div class="length-input">
            <input type="text" id="scrabble1Input" placeholder="Enter score (±1)" inputmode="numeric" pattern="[0-9]*" autocomplete="off">
            <button id="scrabble1Button">SUBMIT</button>
            <button id="scrabble1SkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

function createSologramFeature() {
    const bookId = (appSettings && appSettings.sologramBook) || 'all';
    const group = SOLOGRAM_WORD_GROUPS[bookId] || SOLOGRAM_WORD_GROUPS.all;
    const div = document.createElement('div');
    div.id = 'sologramFeature';
    div.className = 'feature-section';
    div.dataset.sologramYn = '';
    div.innerHTML = `
        <h2 class="feature-title">SOLOGRAM</h2>
        <p class="sologram-using-label">Using: <span id="sologramBookLabel">${group.label}</span></p>
        <div class="sologram-yn-area">
            <div class="sologram-display-label">Y/N string:</div>
            <div id="sologramDisplay" class="sologram-display">(empty)</div>
            <div class="sologram-buttons">
                <button type="button" id="sologramYBtn" class="sologram-yn-btn sologram-y-btn">Y</button>
                <button type="button" id="sologramNBtn" class="sologram-yn-btn sologram-n-btn">N</button>
                <button type="button" id="sologramBackspaceBtn" class="sologram-backspace-btn">Backspace</button>
            </div>
        </div>
        <div class="length-input">
            <button id="sologramButton">SUBMIT</button>
            <button id="sologramSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

function createScrambleFeature() {
    const div = document.createElement('div');
    div.id = 'scrambleFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">DECODE</h2>
        <p style="text-align: center; margin: 10px 0; font-size: 14px; color: #666;">Enter the letter string. One character is correct at its position (Settings: Position for which one).</p>
        <div class="length-input">
            <input type="text" id="scrambleInput" placeholder="Enter letter string" autocomplete="off" style="text-transform: uppercase;">
            <button id="scrambleButton">SUBMIT</button>
            <button id="scrambleSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

function createMostFrequentFeature() {
    const div = document.createElement('div');
    div.id = 'mostFrequentFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">MOST FREQUENT</h2>
        <div class="frequent-letter-display">
            <div class="letter">-</div>
        </div>
        <div class="button-container">
            <button id="frequentYesBtn" class="yes-btn">YES</button>
            <button id="frequentNoBtn" class="no-btn">NO</button>
            <button id="frequentSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

function createLeastFrequentFeature() {
    const div = document.createElement('div');
    div.id = 'leastFrequentFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">LEAST FREQUENT</h2>
        <div class="frequent-letter-display">
            <div class="letter">-</div>
        </div>
        <div class="button-container">
            <button id="leastFrequentYesBtn" class="yes-btn">YES</button>
            <button id="leastFrequentNoBtn" class="no-btn">NO</button>
            <button id="leastFrequentSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

function createNotInFeature() {
    const div = document.createElement('div');
    div.id = 'notInFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">ABSENT</h2>
        <div class="input-group">
            <input type="text" id="notInInput" placeholder="Enter letters...">
            <button id="notInButton">SUBMIT</button>
            <button id="notInSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

function createPresentFeature() {
    const div = document.createElement('div');
    div.id = 'presentFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">PRESENT</h2>
        <div class="input-group">
            <input type="text" id="presentInput" placeholder="Enter letters in the word...">
            <button id="presentButton">SUBMIT</button>
            <button id="presentSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

function createAnywhereFeature() {
    const div = document.createElement('div');
    div.id = 'anywhereFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">ANYWHERE</h2>
        <p style="text-align: center; margin: 10px 0; font-size: 14px; color: #666;">Two consonants: word must contain both letters (any position, any order).</p>
        <div class="input-group">
            <input type="text" id="anywhereInput" placeholder="Two consonants (e.g. RP)" maxlength="2" autocomplete="off" style="text-transform: uppercase;">
            <button id="anywhereButton">SUBMIT</button>
            <button id="anywhereSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

function createTogetherFeature() {
    const div = document.createElement('div');
    div.id = 'togetherFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">TOGETHER</h2>
        <p style="text-align: center; margin: 10px 0; font-size: 14px; color: #666;">Two consonants: word must have both letters adjacent (RP or PR).</p>
        <div class="input-group">
            <input type="text" id="togetherInput" placeholder="Two consonants (e.g. RP)" maxlength="2" autocomplete="off" style="text-transform: uppercase;">
            <button id="togetherButton">SUBMIT</button>
            <button id="togetherSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

function createMiddleFeature() {
    const div = document.createElement('div');
    div.id = 'middleFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">MIDDLE</h2>
        <p style="text-align: center; margin: 10px 0; font-size: 14px; color: #666;">Two consonants: both must appear in the word and neither as first or last letter.</p>
        <div class="input-group">
            <input type="text" id="middleInput" placeholder="Two consonants (e.g. RP)" maxlength="2" autocomplete="off" style="text-transform: uppercase;">
            <button id="middleButton">SUBMIT</button>
            <button id="middleSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

// --- CONSONANTS (merged: ANYWHERE / TOGETHER / MIDDLE) ---
function createConsonantsFeature() {
    const div = document.createElement('div');
    div.id = 'consonantsFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">CONSONANTS</h2>
        <p style="text-align: center; margin: 10px 0; font-size: 14px; color: #666;">Enter two consonants, then choose how to filter.</p>
        <div class="input-group" style="margin-bottom: 16px; display: flex; justify-content: center; align-items: center;">
            <input type="text" id="consonantsInput" placeholder="Two consonants (e.g. RP)" maxlength="2" autocomplete="off" style="text-transform: uppercase; width: 120px; text-align: center;">
        </div>
        <div class="consonants-mode-buttons" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin: 16px 0;">
            <button type="button" id="consonantsTogetherBtn" class="consonants-mode-btn">TOGETHER</button>
            <button type="button" id="consonantsMiddleBtn" class="consonants-mode-btn">MIDDLE</button>
            <button type="button" id="consonantsAnywhereBtn" class="consonants-mode-btn">ANYWHERE</button>
        </div>
        <div style="display: flex; justify-content: center; margin-top: 16px;">
            <button type="button" id="consonantsSkipBtn" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

// --- NUMEROLOGY (date from numerology number + difference) ---
function createNumerologyFeature() {
    const div = document.createElement('div');
    div.id = 'numerologyFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">NUMEROLOGY</h2>
        <p style="text-align: center; margin: 10px 0; font-size: 14px; color: #666;">Enter numerology number (1–9) and difference. Finds dates in the year.</p>
        <div class="numerology-form">
            <div class="numerology-row">
                <label for="numerologyInput">Numerology Number (1–9):</label>
                <input
                    type="number"
                    id="numerologyInput"
                    placeholder="1–9"
                    min="1"
                    max="9"
                    value=""
                >
            </div>
            <div class="numerology-row">
                <label for="numerologyDifferenceInput">Difference:</label>
                <input
                    type="number"
                    id="numerologyDifferenceInput"
                    placeholder="0–11"
                    min="0"
                    max="11"
                    value=""
                >
            </div>
            <div class="numerology-actions">
                <button id="numerologySubmitButton">SUBMIT</button>
                <button id="numerologySkipButton" class="skip-button">SKIP</button>
            </div>
        </div>
        <div id="numerologyMessage" class="position-cons-message" style="margin-top: 8px;"></div>
    `;
    return div;
}

// --- ABCDE Feature Logic ---
function createAbcdeFeature() {
    const div = document.createElement('div');
    div.id = 'abcdeFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">ABCDE</h2>
        <div class="abcde-row" style="display: flex; justify-content: center; gap: 10px;">
            <button class="abcde-btn" data-letter="A">A</button>
            <button class="abcde-btn" data-letter="B">B</button>
            <button class="abcde-btn" data-letter="C">C</button>
            <button class="abcde-btn" data-letter="D">D</button>
            <button class="abcde-btn" data-letter="E">E</button>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; margin-top: 20px; gap: 10px;">
            <button id="abcdeDoneButton">DONE</button>
            <button id="abcdeNoneButton" class="none-button">NONE</button>
            <button id="abcdeSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

// --- ABC Feature Logic ---
function createAbcFeature() {
    const div = document.createElement('div');
    div.id = 'abcFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">ABC</h2>
        <div class="abc-row" style="display: flex; justify-content: center; gap: 10px;">
            <button class="abc-btn" data-letter="A">A</button>
            <button class="abc-btn" data-letter="B">B</button>
            <button class="abc-btn" data-letter="C">C</button>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; margin-top: 20px; gap: 10px;">
            <button id="abcDoneButton">DONE</button>
            <button id="abcNoneButton" class="none-button">NONE</button>
            <button id="abcSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

// --- PIANO FORTE Feature Logic ---
function getPianoForteLetters() {
    const DEFAULT = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    if (!appSettings || !appSettings.pianoForteUseCustomRange) return DEFAULT;
    const start = (appSettings.pianoForteStartLetter || '').toUpperCase();
    const end = (appSettings.pianoForteEndLetter || '').toUpperCase();
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const iStart = alphabet.indexOf(start);
    const iEnd = alphabet.indexOf(end);
    if (iStart === -1 || iEnd === -1 || iStart === iEnd) return DEFAULT;
    const step = iEnd > iStart ? 1 : -1;
    const letters = [];
    for (let i = iStart; ; i += step) {
        letters.push(alphabet[i]);
        if (i === iEnd) break;
    }
    return letters;
}

function createPianoForteFeature() {
    const letters = getPianoForteLetters();
    const buttonHtml = letters.map(l => `<button class="piano-forte-btn" data-letter="${l}">${l}</button>`).join('\n            ');
    const div = document.createElement('div');
    div.id = 'pianoForteFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">PIANO FORTE</h2>
        <div class="piano-forte-row" style="display: flex; justify-content: center; gap: 10px;">
            ${buttonHtml}
        </div>
        <div id="pianoForteStringDisplay" style="display: flex; justify-content: center; align-items: center; min-height: 50px; margin-top: 20px; padding: 10px; font-size: 24px; font-weight: bold; color: #1B5E20; letter-spacing: 8px;">
            <span id="pianoForteString">-</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; margin-top: 20px; gap: 10px;">
            <button id="pianoForteSubmitButton">SUBMIT</button>
            <button id="pianoForteNoneButton" class="none-button">NONE</button>
            <button id="pianoForteSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

// --- PIANO PIANO Feature Logic ---
function createPianoPianoFeature() {
    const div = document.createElement('div');
    div.id = 'pianoPianoFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">PIANO PIANO</h2>
        <div class="piano-piano-row" style="display: flex; justify-content: center; gap: 10px;">
            <button class="piano-piano-btn" data-count="1">1</button>
            <button class="piano-piano-btn" data-count="2">2</button>
            <button class="piano-piano-btn" data-count="3">3</button>
            <button class="piano-piano-btn" data-count="4">4</button>
            <button class="piano-piano-btn" data-count="5">5</button>
            <button class="piano-piano-btn" data-count="6">6</button>
            <button class="piano-piano-btn" data-count="7">7</button>
        </div>
        <div id="pianoPianoDisplay" style="display: flex; justify-content: center; align-items: center; min-height: 50px; margin-top: 20px; padding: 10px; font-size: 24px; font-weight: bold; color: #1B5E20;">
            <span id="pianoPianoString">-</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; margin-top: 20px; gap: 10px;">
            <button id="pianoPianoSubmitButton">SUBMIT</button>
            <button id="pianoPianoNoneButton" class="none-button">NONE</button>
            <button id="pianoPianoSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

// --- MUTE (Binary) Feature Logic ---
function createMuteFeature() {
    const div = document.createElement('div');
    div.id = 'muteFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">MUTE (Binary)</h2>
        <div class="mute-letter-display mute-letter-display-large">
            <span id="muteCurrentLetter" class="mute-letter-char">-</span>
        </div>
        <div class="mute-buttons mute-buttons-centered">
            <button id="muteLeftButton" class="yes-btn">L</button>
            <button id="muteRightButton" class="no-btn">R</button>
        </div>
    `;
    return div;
}

function displayMuteResults(leftWords, rightWords) {
    const resultsContainer = document.getElementById('results');
    if (!resultsContainer) return;

    const engine = window.muteBinaryEngine || {};
    const leftClass = engine.getWordCountClass ? engine.getWordCountClass(leftWords.length) : '';
    const rightClass = engine.getWordCountClass ? engine.getWordCountClass(rightWords.length) : '';

    resultsContainer.innerHTML = `
        <div class="mute-results-2col">
            <div class="mute-column ${leftClass}">
                <h3>LEFT (${leftWords.length})</h3>
                <ul class="word-list">
                    ${leftWords.map(w => `<li>${w}</li>`).join('')}
                </ul>
            </div>
            <div class="mute-column ${rightClass}">
                <h3>RIGHT (${rightWords.length})</h3>
                <ul class="word-list">
                    ${rightWords.map(w => `<li>${w}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
}

// --- MUTE DUO (Binary, two independent words) Feature Logic ---
function createMuteDuoFeature() {
    const div = document.createElement('div');
    div.id = 'muteDuoFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">MUTE DUO (Binary)</h2>
        <div class="mute-letter-display mute-letter-display-large">
            <span id="muteDuoCurrentLetter" class="mute-letter-char">-</span>
        </div>
        <div class="mute-duo-controls mute-duo-centered">
            <div class="mute-duo-buttons-grid">
                <button id="muteDuoButtonUp" class="yes-btn mute-duo-btn mute-duo-btn-up">1 &amp; 4</button>
                <button id="muteDuoButtonRight" class="yes-btn mute-duo-btn mute-duo-btn-right">2 &amp; 4</button>
                <button id="muteDuoButtonDown" class="no-btn mute-duo-btn mute-duo-btn-down">2 &amp; 3</button>
                <button id="muteDuoButtonLeft" class="no-btn mute-duo-btn mute-duo-btn-left">1 &amp; 3</button>
            </div>
        </div>
    `;
    return div;
}

function displayMuteDuoResults(word1Left, word1Right, word2Left, word2Right) {
    const resultsContainer = document.getElementById('results');
    if (!resultsContainer) return;

    const engine = window.muteBinaryEngine || {};
    const class1Top = engine.getWordCountClass ? engine.getWordCountClass(word1Left.length) : '';
    const class1Bottom = engine.getWordCountClass ? engine.getWordCountClass(word1Right.length) : '';
    const class2Top = engine.getWordCountClass ? engine.getWordCountClass(word2Left.length) : '';
    const class2Bottom = engine.getWordCountClass ? engine.getWordCountClass(word2Right.length) : '';

    resultsContainer.innerHTML = `
        <div class="mute-results-2col mute-duo-grid">
            <div class="mute-column ${class1Top}">
                <h3>SPEC 1 – LEFT (${word1Left.length})</h3>
                <ul class="word-list">
                    ${word1Left.map(w => `<li>${w}</li>`).join('')}
                </ul>
            </div>
            <div class="mute-column ${class1Bottom}">
                <h3>SPEC 1 – RIGHT (${word1Right.length})</h3>
                <ul class="word-list">
                    ${word1Right.map(w => `<li>${w}</li>`).join('')}
                </ul>
            </div>
            <div class="mute-column ${class2Top}">
                <h3>SPEC 2 – LEFT (${word2Left.length})</h3>
                <ul class="word-list">
                    ${word2Left.map(w => `<li>${w}</li>`).join('')}
                </ul>
            </div>
            <div class="mute-column ${class2Bottom}">
                <h3>SPEC 2 – RIGHT (${word2Right.length})</h3>
                <ul class="word-list">
                    ${word2Right.map(w => `<li>${w}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
}

// --- T9 LENGTH Feature Logic ---
function createT9LengthFeature() {
    const div = document.createElement('div');
    div.id = 't9LengthFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">LENGTH</h2>
        <div class="length-input">
            <input type="text" id="t9LengthInput" placeholder="Enter length (3+)" inputmode="numeric" pattern="[0-9]*" autocomplete="off" min="3">
            <button id="t9LengthButton">SUBMIT</button>
            <button id="t9LengthSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

// --- T9 LAST TWO Feature Logic ---
function createT9LastTwoFeature() {
    const div = document.createElement('div');
    div.id = 't9LastTwoFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">LAST TWO</h2>
        <div class="t9-last-two-row" style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
            <button class="t9-last-two-btn" data-digit="2">2</button>
            <button class="t9-last-two-btn" data-digit="3">3</button>
            <button class="t9-last-two-btn" data-digit="4">4</button>
            <button class="t9-last-two-btn" data-digit="5">5</button>
            <button class="t9-last-two-btn" data-digit="6">6</button>
            <button class="t9-last-two-btn" data-digit="7">7</button>
            <button class="t9-last-two-btn" data-digit="8">8</button>
            <button class="t9-last-two-btn" data-digit="9">9</button>
        </div>
        <div id="t9LastTwoDisplay" style="display: flex; justify-content: center; align-items: center; min-height: 50px; margin-top: 20px; padding: 10px; font-size: 24px; font-weight: bold; color: #1B5E20;">
            <span id="t9LastTwoString">-</span>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; margin-top: 20px; gap: 10px;">
            <button id="t9LastTwoSubmitButton">SUBMIT</button>
            <button id="t9LastTwoResetButton" class="reset-button">RESET</button>
            <button id="t9LastTwoSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

// --- T9 LAST Feature Logic ---
function createT9LastFeature() {
    const div = document.createElement('div');
    div.id = 't9LastFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">LAST</h2>
        <p style="text-align: center; margin: 10px 0; font-size: 14px; color: #666;">Last digit(s) of T9 string. GUESS optional; ACTUAL required (1 or 2 digits, 2-9).</p>
        <div class="length-input" style="display: flex; flex-direction: column; gap: 10px; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <label for="t9LastGuessInput">GUESS</label>
                <input type="text" id="t9LastGuessInput" placeholder="Optional" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="2" style="width: 80px;">
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <label for="t9LastActualInput">ACTUAL</label>
                <input type="text" id="t9LastActualInput" placeholder="1 or 2 digits (2-9)" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="2" style="width: 80px;">
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="t9LastButton">SUBMIT</button>
                <button id="t9LastSkipButton" class="skip-button">SKIP</button>
            </div>
        </div>
    `;
    return div;
}

// --- T9 POSITION 5 Feature Logic (filter by digit at position 5 of T9 string; GUESS/ACTUAL 1 digit each) ---
function createT9Position5Feature() {
    const div = document.createElement('div');
    div.id = 't9Position5Feature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">POSITION 5</h2>
        <p style="text-align: center; margin: 10px 0; font-size: 14px; color: #666;">Digit at position 5 of T9 string. GUESS optional; ACTUAL required (1 digit, 2-9).</p>
        <div class="length-input" style="display: flex; flex-direction: column; gap: 10px; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <label for="t9Position5GuessInput">GUESS</label>
                <input type="text" id="t9Position5GuessInput" placeholder="Optional" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="1" style="width: 80px;">
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <label for="t9Position5ActualInput">ACTUAL</label>
                <input type="text" id="t9Position5ActualInput" placeholder="1 digit (2-9)" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="1" style="width: 80px;">
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="t9Position5Button">SUBMIT</button>
                <button id="t9Position5SkipButton" class="skip-button">SKIP</button>
            </div>
        </div>
    `;
    return div;
}

// --- T9 GUESS Feature Logic (uses GUESS digits from LAST or POSITION 5; works if either appears anywhere before in workflow) ---
function createT9GuessFeature() {
    const div = document.createElement('div');
    div.id = 't9GuessFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">GUESS</h2>
        <p style="text-align: center; margin: 10px 0; font-size: 14px; color: #666;">Is the GUESS number in the first 4 digits of your T9 string?</p>
        <div id="t9GuessQuestions" style="display: flex; flex-direction: column; gap: 16px; align-items: center; margin: 16px 0;"></div>
        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button id="t9GuessSubmitButton" disabled style="opacity: 0.6;">SUBMIT</button>
            <button id="t9GuessSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

// --- T9 1 LIE (L4) Feature Logic (merged with B-IDENTITY: phase 2 = truth selection or most-likely lie + override) ---
function createT9OneLieFeature() {
    const div = document.createElement('div');
    div.id = 't9OneLieFeature';
    div.className = 'feature-section t9-one-lie-merged';
    div.innerHTML = `
        <h2 class="feature-title">1 LIE (L4)</h2>
        <div id="t9OneLiePhase1" class="t9-one-lie-phase">
            <div class="t9-one-lie-row">
                <button class="t9-one-lie-btn" data-digit="2">2</button>
                <button class="t9-one-lie-btn" data-digit="3">3</button>
                <button class="t9-one-lie-btn" data-digit="4">4</button>
                <button class="t9-one-lie-btn" data-digit="5">5</button>
                <button class="t9-one-lie-btn" data-digit="6">6</button>
                <button class="t9-one-lie-btn" data-digit="7">7</button>
                <button class="t9-one-lie-btn" data-digit="8">8</button>
                <button class="t9-one-lie-btn" data-digit="9">9</button>
                <button class="t9-one-lie-btn blank-btn" data-digit="BLANK">B</button>
            </div>
            <div class="t9-one-lie-display-row">
                <div id="t9OneLieDisplay" class="t9-one-lie-display"><span id="t9OneLieString">-</span></div>
                <button id="t9OneLieBackspaceButton" class="t9-one-lie-btn t9-backspace-btn" title="Remove last digit">⌫</button>
            </div>
            <div class="t9-one-lie-actions">
                <button id="t9OneLieSubmitButton">SUBMIT</button>
                <button id="t9OneLieResetButton" class="reset-button">RESET</button>
                <button id="t9OneLieSkipButton" class="skip-button">SKIP</button>
            </div>
        </div>
        <div id="t9OneLiePhase2" class="t9-one-lie-phase t9-one-lie-phase2" style="display: none;">
            <p id="t9OneLiePhase2Title" class="t9-one-lie-phase2-title"></p>
            <div id="t9OneLieTruthDigits" class="t9-one-lie-truth-digits"></div>
            <p id="t9OneLieOverrideLabel" class="t9-one-lie-override-label" style="display: none;">Override lie position:</p>
            <div id="t9OneLieOverrideRow" class="t9-one-lie-override-row" style="display: none;"></div>
        </div>
    `;
    return div;
}

// --- T9 REPEAT Feature Logic ---
function createT9RepeatFeature() {
    const div = document.createElement('div');
    div.id = 't9RepeatFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">Repeat?</h2>
        <p style="text-align: center; margin: 20px 0; font-size: 18px; font-weight: bold;">Repeated Digits?</p>
        <div class="button-container">
            <button id="t9RepeatYesBtn" class="yes-btn">YES</button>
            <button id="t9RepeatNoBtn" class="no-btn">NO</button>
            <button id="t9RepeatSkipBtn" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

// --- T9 HIGHER Feature Logic ---
function createT9HigherFeature() {
    const div = document.createElement('div');
    div.id = 't9HigherFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">Higher?</h2>
        <p style="text-align: center; margin: 20px 0; font-size: 18px; font-weight: bold;">Second digit higher than first?</p>
        <div class="button-container">
            <button id="t9HigherYesBtn" class="yes-btn">YES</button>
            <button id="t9HigherNoBtn" class="no-btn">NO</button>
            <button id="t9HigherSameBtn" class="yes-btn" style="background-color: #ff9800;">SAME</button>
            <button id="t9HigherSkipBtn" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

// --- T9 SINGING Feature Logic (directional UP/DOWN on T9 digits) ---
function createT9SingingFeature() {
    const div = document.createElement('div');
    div.id = 't9SingingFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">SINGING</h2>
        <p class="alpha-sequence-display" id="t9SingingSequenceDisplay">—</p>
        <div class="alpha-direction-buttons">
            <button type="button" class="alpha-btn" id="t9SingingUpBtn" aria-label="Up (higher digit)">↑ UP</button>
            <button type="button" class="alpha-btn" id="t9SingingDownBtn" aria-label="Down (lower digit)">DOWN ↓</button>
        </div>
        <div class="alpha-actions">
            <button type="button" id="t9SingingSubmitBtn" class="alpha-submit-btn">SUBMIT</button>
            <button type="button" id="t9SingingSkipBtn" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

// --- T9 SINGING Feature Logic (directional UP/DOWN on T9 digits) ---
function createT9SingingFeature() {
    const div = document.createElement('div');
    div.id = 't9SingingFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">SINGING</h2>
        <p class="alpha-sequence-display" id="t9SingingSequenceDisplay">—</p>
        <div class="alpha-direction-buttons">
            <button type="button" class="alpha-btn t9-singing-up" id="t9SingingUpBtn" aria-label="UP (higher digit)">UP ↑</button>
            <button type="button" class="alpha-btn t9-singing-down" id="t9SingingDownBtn" aria-label="DOWN (lower digit)">DOWN ↓</button>
        </div>
        <div class="alpha-actions">
            <button type="button" id="t9SingingSubmitBtn" class="alpha-submit-btn">SUBMIT</button>
            <button type="button" id="t9SingingSkipBtn" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

// --- T9 NUMBER START Feature Logic (first T9 digit: Low 2-4, Mid 4-6, High 6-9) ---
function createT9NumberStartFeature() {
    const div = document.createElement('div');
    div.id = 't9NumberStartFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">NUMBER START</h2>
        <p style="text-align: center; margin: 10px 0; font-size: 14px; color: #666;">First T9 digit: Low (2-4), Mid (4-6), High (6-9).</p>
        <div class="section-buttons" style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
            <button type="button" class="section-btn number-start-btn" data-section="low">Low (2-4)</button>
            <button type="button" class="section-btn number-start-btn" data-section="mid">Mid (4-6)</button>
            <button type="button" class="section-btn number-start-btn" data-section="high">High (6-9)</button>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; margin-top: 20px; gap: 10px;">
            <button type="button" id="t9NumberStartSkipBtn" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

// --- T9 1 TRUTH (F4) Feature Logic ---
function createT9OneTruthFeature() {
    const div = document.createElement('div');
    div.id = 't9OneTruthFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">1 TRUTH (F4)</h2>
        <div class="t9-one-truth-row" style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
            <button class="t9-one-truth-btn" data-digit="2">2</button>
            <button class="t9-one-truth-btn" data-digit="3">3</button>
            <button class="t9-one-truth-btn" data-digit="4">4</button>
            <button class="t9-one-truth-btn" data-digit="5">5</button>
            <button class="t9-one-truth-btn" data-digit="6">6</button>
            <button class="t9-one-truth-btn" data-digit="7">7</button>
            <button class="t9-one-truth-btn" data-digit="8">8</button>
            <button class="t9-one-truth-btn" data-digit="9">9</button>
            <button class="t9-one-truth-btn blank-btn" data-digit="BLANK" style="background-color: #f44336; color: white; font-weight: bold;">B</button>
        </div>
        <div class="t9-one-truth-display-row" style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 12px;">
            <div id="t9OneTruthDisplay" style="display: flex; justify-content: center; align-items: center; min-height: 44px; min-width: 120px; padding: 0 10px; font-size: 24px; font-weight: bold; color: #1B5E20;">
                <span id="t9OneTruthString">-</span>
            </div>
            <button id="t9OneTruthBackspaceButton" class="t9-one-truth-btn t9-backspace-btn" title="Remove last digit">⌫</button>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; margin-top: 20px; gap: 10px;">
            <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
                <button id="t9OneTruthSubmitButton">SUBMIT</button>
                <button id="t9OneTruthResetButton" class="reset-button">RESET</button>
                <button id="t9OneTruthSkipButton" class="skip-button">SKIP</button>
            </div>
            <div id="t9OneTruthPossibleDigits" style="margin-top: 15px; padding: 10px; font-size: 14px; color: #666; text-align: center; min-height: 20px;">
                <span style="font-weight: bold;">Possible T9 digits for BLANK:</span> <span id="t9OneTruthPossibleDigitsList">-</span>
            </div>
        </div>
    `;
    return div;
}

// (B-IDENTITY is now handled inside the merged 1 LIE (L4) feature.)

// --- AlphaNumeric Feature Logic ---
function createAlphaNumericFeature() {
    const div = document.createElement('div');
    div.id = 'alphaNumericFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">AlphaNumeric</h2>
        <div class="button-container">
            <button id="alphaNumericYesBtn" class="yes-btn">YES</button>
            <button id="alphaNumericNoBtn" class="no-btn">NO</button>
            <button id="alphaNumericSkipBtn" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

// --- Letters Above Feature Logic ---
function createLettersAboveFeature() {
    const div = document.createElement('div');
    div.id = 'lettersAboveFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">Letters Above</h2>
        <div class="length-input">
            <input type="text" id="lettersAboveInput" placeholder="Enter number (0-26)" inputmode="numeric" pattern="[0-9]*" autocomplete="off">
            <button id="lettersAboveButton">SUBMIT</button>
            <button id="lettersAboveSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

// --- Dictionary (Alpha) Feature Logic ---
function createDictionaryAlphaFeature() {
    const ranges = getDictionaryAlphaRanges();
    const label = (section) => {
        const [minCode, maxCode] = ranges[section] || [65, 90];
        return String.fromCharCode(minCode) + '–' + String.fromCharCode(maxCode);
    };
    const div = document.createElement('div');
    div.id = 'dictionaryAlphaFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">Dictionary (Alpha)</h2>
        <div class="section-buttons">
            <button class="section-btn" data-section="begin">Beginning (${label('begin')})</button>
            <button class="section-btn" data-section="mid">Middle (${label('mid')})</button>
            <button class="section-btn" data-section="end">End (${label('end')})</button>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; margin-top: 20px; gap: 10px;">
            <button id="dictionaryAlphaSubmitButton">SUBMIT</button>
            <button id="dictionaryAlphaSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

// --- ALPHA Feature Logic ---
function createAlphaFeature() {
    const div = document.createElement('div');
    div.id = 'alphaFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">ALPHA (ORIGIN)</h2>
        <p class="alpha-sequence-display" id="alphaSequenceDisplay">—</p>
        <div class="alpha-direction-buttons">
            <button type="button" class="alpha-btn alpha-left" id="alphaLeftBtn" aria-label="Left (toward A)">← Left</button>
            <button type="button" class="alpha-btn alpha-repeat" id="alphaRepeatBtn" aria-label="Repeat (same letter)">Repeat</button>
            <button type="button" class="alpha-btn alpha-right" id="alphaRightBtn" aria-label="Right (toward Z)">Right →</button>
        </div>
        <div class="alpha-actions">
            <button type="button" id="alphaSubmitBtn" class="alpha-submit-btn">SUBMIT</button>
            <button type="button" id="alphaSkipBtn" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

// --- S/M/L (Length) Feature Logic ---
function createSmlLengthFeature() {
    const div = document.createElement('div');
    div.id = 'smlLengthFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">S/M/L (Length)</h2>
        <div class="section-buttons">
            <button class="section-btn" data-section="small">Small</button>
            <button class="section-btn" data-section="medium">Medium</button>
            <button class="section-btn" data-section="long">Long</button>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; margin-top: 20px; gap: 10px;">
            <button id="smlLengthSubmitButton">SUBMIT</button>
            <button id="smlLengthSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

// --- FIND-EEE Feature Logic ---
function createFindEeeFeature() {
    const div = document.createElement('div');
    div.id = 'findEeeFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <h2 class="feature-title">FIND-EEE</h2>
        <div class="find-eee-row" style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
            <button class="find-eee-btn" data-letter="B">B</button>
            <button class="find-eee-btn" data-letter="C">C</button>
            <button class="find-eee-btn" data-letter="D">D</button>
            <button class="find-eee-btn" data-letter="E">E</button>
            <button class="find-eee-btn" data-letter="G">G</button>
            <button class="find-eee-btn" data-letter="P">P</button>
            <button class="find-eee-btn" data-letter="T">T</button>
            <button class="find-eee-btn" data-letter="V">V</button>
            <button class="find-eee-btn" data-letter="Z">Z</button>
        </div>
        <div class="find-eee-position-row" style="display: flex; justify-content: center; gap: 10px; margin-top: 15px;">
            <button class="find-eee-position-btn" data-position="1">1</button>
            <button class="find-eee-position-btn" data-position="2">2</button>
            <button class="find-eee-position-btn" data-position="3">3</button>
            <button class="find-eee-position-btn" data-position="4">4</button>
            <button class="find-eee-position-btn" data-position="5">5</button>
            <button class="find-eee-position-btn" data-position="6">6</button>
            <button class="find-eee-position-btn" data-position="7">7</button>
            <button class="find-eee-position-btn" data-position="8">8</button>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; margin-top: 20px; gap: 10px;">
            <button id="findEeeSkipButton" class="skip-button">SKIP</button>
        </div>
    `;
    return div;
}

function createPositionConsFeature() {
    const div = document.createElement('div');
    div.id = 'positionConsFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <div class="feature-title">POSITION-CONS</div>
        <div class="position-cons-form">
            <div class="position-cons-main-layout">
                <div class="position-cons-left">
                    <div class="position-cons-input-group">
                        <label for="positionConsPosition">Position (1-6)</label>
                        <input type="number" id="positionConsPosition" min="1" max="6" placeholder="1-6">
                    </div>
                    <div class="position-cons-input-group">
                        <label for="positionConsLetters">Letters</label>
                        <input type="text" id="positionConsLetters" placeholder="Enter letters...">
                    </div>
                    <div class="position-cons-input-group">
                        <label for="positionConsCount">Letter count (total)</label>
                        <input type="number" id="positionConsCount" min="0" placeholder="0+">
                    </div>
                </div>
                <div class="position-cons-right">
                    <button id="positionConsGenerate" class="secondary-btn">Random Letters</button>
                    <button id="positionConsSubmit" class="primary-btn">FILTER</button>
                </div>
            </div>
            <div id="positionConsMessage" class="position-cons-message"></div>
        </div>
    `;
    return div;
}

function createFirstCurvedFeature() {
    const div = document.createElement('div');
    div.id = 'firstCurvedFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <div class="feature-title">FIRST CURVED</div>
        <div class="position-cons-form">
            <div class="position-input">
                <label for="firstCurvedPosition">Position of first curved letter</label>
                <input type="number" id="firstCurvedPosition" min="1" placeholder="Enter position...">
            </div>
            <button id="firstCurvedSubmit" class="primary-btn">SUBMIT</button>
            <div id="firstCurvedMessage" class="position-cons-message"></div>
        </div>
    `;
    return div;
}

// Helper for EYE TEST: compute entropy of distinct-letter counts for a group
function computeEyeTestGroupEntropy(upperWords, group) {
    if (!group || group.length === 0 || !Array.isArray(upperWords) || upperWords.length === 0) return 0;
    const groupLetters = group.split('');
    const maxCount = groupLetters.length;
    const counts = new Array(maxCount + 1).fill(0);

    for (const upperWord of upperWords) {
        let occurrenceCount = 0;
        for (const letter of groupLetters) {
            if (upperWord.includes(letter)) {
                occurrenceCount++;
            }
        }
        if (occurrenceCount < 0) occurrenceCount = 0;
        if (occurrenceCount > maxCount) occurrenceCount = maxCount;
        counts[occurrenceCount]++;
    }

    const total = upperWords.length;
    if (total === 0) return 0;

    let entropy = 0;
    for (let c = 0; c <= maxCount; c++) {
        const freq = counts[c];
        if (!freq) continue;
        const p = freq / total;
        entropy -= p * Math.log2(p);
    }
    return entropy;
}

// Build dynamic letter groups for EYE TEST (sizes 2,3,4,5,6)
function buildEyeTestGroups(words) {
    if (!Array.isArray(words) || words.length === 0) {
        return ['', '', '', '', ''];
    }

    const upperWords = words.map(w => (w || '').toString().toUpperCase());

    // Count in how many words each letter appears (distinct presence per word)
    const letterCounts = {};
    for (const w of upperWords) {
        const seen = new Set();
        for (const ch of w) {
            if (ch < 'A' || ch > 'Z') continue;
            if (!seen.has(ch)) {
                seen.add(ch);
                letterCounts[ch] = (letterCounts[ch] || 0) + 1;
            }
        }
    }

    let letters = Object.keys(letterCounts);
    if (letters.length === 0) {
        return ['', '', '', '', ''];
    }

    // Sort by frequency (desc) so higher-frequency letters are considered first.
    // We keep all distinct letters (up to 26), to allow up to 20 unique slots.
    letters.sort((a, b) => letterCounts[b] - letterCounts[a]);

    const boxSizes = [2, 3, 4, 5, 6];
    const groups = [];
    const usedAcrossGroups = new Set();

    for (const size of boxSizes) {
        let group = '';

        for (let i = 0; i < size; i++) {
            let bestLetter = null;
            let bestEntropy = -1;

            for (const L of letters) {
                if (group.includes(L)) continue;          // no repeats within a group
                if (usedAcrossGroups.has(L)) continue;    // strict uniqueness across groups
                const testGroup = group + L;
                const entropy = computeEyeTestGroupEntropy(upperWords, testGroup);
                if (entropy > bestEntropy) {
                    bestEntropy = entropy;
                    bestLetter = L;
                }
            }

            if (!bestLetter) break; // no more unused letters available

            group += bestLetter;
            usedAcrossGroups.add(bestLetter);
        }

        groups.push(group);
    }

    while (groups.length < 5) {
        groups.push('');
    }

    return groups;
}

function createEyeTestFeature() {
    const div = document.createElement('div');
    div.id = 'eyeTestFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <div class="feature-title">EYE TEST</div>
        <div class="position-cons-form">
            <div class="pin-inputs-grid">
                <input type="text" id="eyeTestWord1" class="pin-word-input" placeholder="Group 1 (2 letters)" readonly>
                <input type="text" id="eyeTestWord4" class="pin-word-input" placeholder="Group 4 (5 letters)" readonly>
                <input type="text" id="eyeTestWord2" class="pin-word-input" placeholder="Group 2 (3 letters)" readonly>
                <input type="text" id="eyeTestWord5" class="pin-word-input" placeholder="Group 5 (6 letters)" readonly>
                <input type="text" id="eyeTestWord3" class="pin-word-input" placeholder="Group 3 (4 letters)" readonly>
                <input type="text" id="eyeTestCode" class="pin-code-input" placeholder="CODE" maxlength="5">
                <button id="eyeTestSubmit" class="primary-btn pin-submit-btn">SUBMIT</button>
                <button id="eyeTestChartButton" class="secondary-btn eye-test-chart-btn">CHART</button>
            </div>
            <div id="eyeTestMessage" class="position-cons-message"></div>
        </div>
    `;

    try {
        let groups;
        if (appSettings && appSettings.eyeTestUseFixedGroups) {
            groups = [
                (appSettings.eyeTestFixedGroup1 || '').toUpperCase().replace(/[^A-Z]/g, ''),
                (appSettings.eyeTestFixedGroup2 || '').toUpperCase().replace(/[^A-Z]/g, ''),
                (appSettings.eyeTestFixedGroup3 || '').toUpperCase().replace(/[^A-Z]/g, ''),
                (appSettings.eyeTestFixedGroup4 || '').toUpperCase().replace(/[^A-Z]/g, ''),
                (appSettings.eyeTestFixedGroup5 || '').toUpperCase().replace(/[^A-Z]/g, '')
            ];
        } else {
            groups = buildEyeTestGroups(currentFilteredWords || []);
        }
        const inputs = [
            div.querySelector('#eyeTestWord1'),
            div.querySelector('#eyeTestWord2'),
            div.querySelector('#eyeTestWord3'),
            div.querySelector('#eyeTestWord4'),
            div.querySelector('#eyeTestWord5')
        ];
        // Fill boxes 1–6 with groups 1–6 directly:
        // Box 1 → 2 letters, Box 2 → 3 letters, Box 3 → 4 letters,
        // Box 4 → 5 letters, Box 5 → 6 letters, Box 6 → 7 letters.
        inputs.forEach((input, i) => {
            if (input && groups[i]) {
                input.value = groups[i];
            }
        });
    } catch (e) {
        console.error('Error building EYE TEST groups', e);
    }

    return div;
}

function createPinFeature() {
    const div = document.createElement('div');
    div.id = 'pinFeature';
    div.className = 'feature-section';
    div.innerHTML = `
        <div class="feature-title">PIN</div>
        <div class="position-cons-form">
            <div class="pin-inputs-grid">
                <input type="text" id="pinWord1" class="pin-word-input" placeholder="Word 1">
                <input type="text" id="pinWord4" class="pin-word-input" placeholder="Word 4">
                <input type="text" id="pinWord2" class="pin-word-input" placeholder="Word 2">
                <input type="text" id="pinWord5" class="pin-word-input" placeholder="Word 5">
                <input type="text" id="pinWord3" class="pin-word-input" placeholder="Word 3">
                <input type="text" id="pinWord6" class="pin-word-input" placeholder="Word 6">
                <input type="text" id="pinCode" class="pin-code-input" placeholder="CODE" maxlength="6">
                <button id="pinSubmit" class="primary-btn pin-submit-btn">SUBMIT</button>
            </div>
            <div id="pinMessage" class="position-cons-message"></div>
        </div>
    `;
    return div;
}

// Filtering logic for ABCDE feature
function filterWordsByAbcde(words, yesLetters) {
    return words.filter(word => {
        const wordUpper = word.toUpperCase();
        // Convert yesLetters to uppercase for consistent comparison
        const yesLettersUpper = yesLetters.map(letter => letter.toUpperCase());
        // Must include all YES letters
        for (const letter of yesLettersUpper) {
            if (!wordUpper.includes(letter)) return false;
        }
        // Must NOT include any of the other letters (A-E not in yesLetters)
        for (const letter of ['A','B','C','D','E']) {
            if (!yesLettersUpper.includes(letter) && wordUpper.includes(letter)) return false;
        }
        return true;
    });
}

// Filtering logic for ABC feature
function filterWordsByAbc(words, yesLetters) {
    return words.filter(word => {
        const wordUpper = word.toUpperCase();
        // Convert yesLetters to uppercase for consistent comparison
        const yesLettersUpper = yesLetters.map(letter => letter.toUpperCase());
        // Must include all YES letters
        for (const letter of yesLettersUpper) {
            if (!wordUpper.includes(letter)) return false;
        }
        // Must NOT include any of the other letters (A-C not in yesLetters)
        for (const letter of ['A','B','C']) {
            if (!yesLettersUpper.includes(letter) && wordUpper.includes(letter)) return false;
        }
        return true;
    });
}

// Filtering logic for PIANO FORTE feature (chronological order)
function filterWordsByPianoForte(words, letterSequence) {
    const letters = getPianoForteLetters();
    const letterSet = new Set(letters);
    return words.filter(word => {
        const wordUpper = word.toUpperCase();
        const sequence = letterSequence.map(letter => letter.toUpperCase());
        
        // Get unique letters that were pressed
        const pressedLetters = new Set(sequence);
        
        // Get letters in the range that were NOT pressed
        const unpressedLetters = letters.filter(letter => !pressedLetters.has(letter));
        
        // Check that unpressed letters are NOT in the word
        for (const letter of unpressedLetters) {
            if (wordUpper.includes(letter)) return false;
        }
        
        // Extract only letters from the range in the word, maintaining their order
        const wordPressedSequence = wordUpper.split('').filter(char => letterSet.has(char));
        
        // Check if the extracted sequence matches the pressed sequence exactly
        if (wordPressedSequence.length !== sequence.length) {
            return false;
        }
        
        // Check each letter matches in order
        for (let i = 0; i < sequence.length; i++) {
            if (wordPressedSequence[i] !== sequence[i]) {
                return false;
            }
        }
        
        return true;
    });
}

// Filtering logic for PIANO PIANO feature
function filterWordsByPianoPiano(words, count) {
    return words.filter(word => {
        const wordUpper = word.toUpperCase();
        
        // Extract only A-G letters from the word
        const agLetters = wordUpper.split('').filter(char => 
            ['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(char)
        );
        
        // Check if the count matches exactly
        return agLetters.length === count;
    });
}

// Filtering logic for T9 LENGTH feature
function filterWordsByT9Length(words, length) {
    // Calculate T9 strings if not already done
    calculateT9Strings(words);
    
    return words.filter(word => {
        const t9String = t9StringsMap.get(word) || wordToT9(word);
        return t9String.length === length;
    });
}

// Filtering logic for T9 LAST TWO feature
function filterWordsByT9LastTwo(words, lastTwo) {
    // Calculate T9 strings if not already done
    calculateT9Strings(words);
    
    return words.filter(word => {
        const t9String = t9StringsMap.get(word) || wordToT9(word);
        // Check if T9 string ends with the last two digits
        return t9String.length >= 2 && t9String.slice(-2) === lastTwo;
    });
}

// Filtering logic for T9 REPEAT feature
function filterWordsByT9Repeat(words, hasRepeat) {
    // Calculate T9 strings if not already done
    calculateT9Strings(words);
    
    return words.filter(word => {
        const t9String = t9StringsMap.get(word) || wordToT9(word);
        
        // Check for consecutive repeated digits
        for (let i = 0; i < t9String.length - 1; i++) {
            if (t9String[i] === t9String[i + 1]) {
                return hasRepeat; // Found a repeat
            }
        }
        
        return !hasRepeat; // No repeats found
    });
}

// Filtering logic for T9 HIGHER feature
function filterWordsByT9Higher(words, option) {
    // Calculate T9 strings if not already done
    calculateT9Strings(words);
    
    return words.filter(word => {
        const t9String = t9StringsMap.get(word) || wordToT9(word);
        
        // Must have at least 2 digits
        if (t9String.length < 2) return false;
        
        const firstDigit = parseInt(t9String[0]);
        const secondDigit = parseInt(t9String[1]);
        
        if (option === 'yes') {
            return secondDigit > firstDigit;
        } else if (option === 'no') {
            return secondDigit < firstDigit;
        } else if (option === 'same') {
            return secondDigit === firstDigit;
        }
        
        return false;
    });
}

// Filtering logic for T9 SINGING feature (directional UP/DOWN over consecutive T9 digits).
// Exact length: word (T9) length must equal directions.length + 1.
function filterWordsByT9Singing(words, directions) {
    if (!directions || directions.length === 0) return words;

    // Calculate T9 strings if not already done
    calculateT9Strings(words);

    const neededLen = directions.length + 1;  // exact T9 length

    return words.filter(word => {
        const t9String = t9StringsMap.get(word) || wordToT9(word);
        if (!t9String || t9String.length !== neededLen) return false;

        for (let i = 0; i < directions.length; i++) {
            const dir = directions[i];
            const prevDigit = parseInt(t9String[i], 10);
            const curDigit = parseInt(t9String[i + 1], 10);

            if (Number.isNaN(prevDigit) || Number.isNaN(curDigit)) return false;

            if (dir === 'U') {
                // UP: next digit must be strictly higher
                if (!(curDigit > prevDigit)) return false;
            } else if (dir === 'D') {
                // DOWN: next digit must be strictly lower
                if (!(curDigit < prevDigit)) return false;
            } else {
                // Unknown direction token; fail safe
                return false;
            }
        }

        return true;
    });
}

// NUMBER START: filter by first T9 digit in Low (2-4), Mid (4-6), or High (6-9). Like Dictionary (Alpha) for digits.
function filterWordsByNumberStart(words, section) {
    if (!section) return words;
    calculateT9Strings(words);
    const low = new Set(['2', '3', '4']);
    const mid = new Set(['4', '5', '6']);
    const high = new Set(['6', '7', '8', '9']);
    let allowed = null;
    if (section === 'low') allowed = low;
    else if (section === 'mid') allowed = mid;
    else if (section === 'high') allowed = high;
    if (!allowed) return words;
    return words.filter(word => {
        const t9 = t9StringsMap.get(word) || wordToT9(word);
        if (!t9 || t9.length < 1) return false;
        return allowed.has(t9[0]);
    });
}

// Filtering logic for T9 SINGING feature (directional UP/DOWN on consecutive T9 digits)
function filterWordsBySinging(words, directions) {
    if (!directions || directions.length === 0) return words;

    // Calculate T9 strings if not already done
    calculateT9Strings(words);

    const needLen = directions.length + 1;

    return words.filter(word => {
        const t9String = t9StringsMap.get(word) || wordToT9(word);
        if (!t9String || t9String.length < needLen) return false;

        for (let i = 0; i < directions.length; i++) {
            const dir = directions[i]; // 'U' or 'D'
            const prev = t9String.charCodeAt(i);
            const cur = t9String.charCodeAt(i + 1);

            if (dir === 'U') {
                // UP = next digit strictly higher than previous
                if (cur <= prev) return false;
            } else if (dir === 'D') {
                // DOWN = next digit strictly lower than previous
                if (cur >= prev) return false;
            } else {
                // Unknown direction token
                return false;
            }
        }

        return true;
    });
}

// Filtering logic for T9 1 TRUTH (F4) feature
function filterWordsByT9OneTruth(words, selectedDigits) {
    // Calculate T9 strings if not already done
    calculateT9Strings(words);
    
    // Count BLANKs and find non-BLANK positions
    const blankCount = selectedDigits.filter(d => d === 'BLANK').length;
    const nonBlankIndices = [];
    selectedDigits.forEach((digit, index) => {
        if (digit !== 'BLANK') {
            nonBlankIndices.push(index);
        }
    });
    
    return words.filter(word => {
        const t9String = t9StringsMap.get(word) || wordToT9(word);
        
        // Must have at least 4 digits
        if (t9String.length < 4) return false;
        
        const firstFour = t9String.slice(0, 4);
        const firstFourDigits = firstFour.split('');
        
        // New logic: 3 B's and 1 value - the 1 value is correct, B's are unknown
        if (blankCount === 3 && nonBlankIndices.length === 1) {
            const correctIndex = nonBlankIndices[0];
            const correctDigit = selectedDigits[correctIndex];
            
            // Check that the known digit position matches
            return firstFourDigits[correctIndex] === correctDigit;
        }
        // Original logic: 1 B and 3 values - B position is correct, others are wrong
        else if (blankCount === 1 && nonBlankIndices.length === 3) {
            const blankIndex = selectedDigits.indexOf('BLANK');
            
            // Check that all non-BLANK positions do NOT match (they are incorrect)
            for (let i = 0; i < 4; i++) {
                if (i !== blankIndex && selectedDigits[i] !== 'BLANK') {
                    if (firstFourDigits[i] === selectedDigits[i]) {
                        return false; // This position should be wrong but it matches
                    }
                }
            }
            
            // The BLANK position is correct (we don't check what it is, just that others are wrong)
            return true; // All conditions met
        }
        // No BLANK - check all 4 scenarios where exactly one digit is correct
        else if (blankCount === 0) {
            // Convert selectedDigits array to string for backward compatibility
            const digits = Array.isArray(selectedDigits) ? selectedDigits : selectedDigits.split('');
            
            // Scenario 1: First digit correct, others wrong
            if (firstFourDigits[0] === digits[0] && 
                firstFourDigits[1] !== digits[1] && 
                firstFourDigits[2] !== digits[2] && 
                firstFourDigits[3] !== digits[3]) {
                return true;
            }
            
            // Scenario 2: Second digit correct, others wrong
            if (firstFourDigits[0] !== digits[0] && 
                firstFourDigits[1] === digits[1] && 
                firstFourDigits[2] !== digits[2] && 
                firstFourDigits[3] !== digits[3]) {
                return true;
            }
            
            // Scenario 3: Third digit correct, others wrong
            if (firstFourDigits[0] !== digits[0] && 
                firstFourDigits[1] !== digits[1] && 
                firstFourDigits[2] === digits[2] && 
                firstFourDigits[3] !== digits[3]) {
                return true;
            }
            
            // Scenario 4: Fourth digit correct, others wrong
            if (firstFourDigits[0] !== digits[0] && 
                firstFourDigits[1] !== digits[1] && 
                firstFourDigits[2] !== digits[2] && 
                firstFourDigits[3] === digits[3]) {
                return true;
            }
        }
        
        return false;
    });
}

// Helper function to calculate possible T9 digits for BLANK position, ordered by likelihood (most frequent first)
// When lastActualLen > 0 (1 LIE follows LAST), use the 4 digits before the last lastActualLen digits
function calculatePossibleT9DigitsForBlank(words, selectedDigits, lastActualLen) {
    lastActualLen = lastActualLen || 0;
    // Check if BLANK is used
    const blankIndex = selectedDigits.indexOf('BLANK');
    if (blankIndex === -1 || selectedDigits.length !== 4) {
        return [];
    }
    
    // Calculate T9 strings if not already done
    calculateT9Strings(words);
    
    const digitCounts = new Map();
    const minLen = 4 + lastActualLen;
    
    words.forEach(word => {
        const t9String = t9StringsMap.get(word) || wordToT9(word);
        
        if (t9String.length < minLen) return;
        
        const lastFour = lastActualLen > 0
            ? t9String.slice(-4 - lastActualLen, -lastActualLen)
            : t9String.slice(-4);
        const lastFourDigits = lastFour.split('');
        
        // Check if this word matches the pattern (non-BLANK positions must match)
        let matches = true;
        for (let i = 0; i < 4; i++) {
            if (i !== blankIndex && selectedDigits[i] !== 'BLANK') {
                if (lastFourDigits[i] !== selectedDigits[i]) {
                    matches = false;
                    break;
                }
            }
        }
        
        if (matches) {
            const digit = lastFourDigits[blankIndex];
            digitCounts.set(digit, (digitCounts.get(digit) || 0) + 1);
        }
    });
    
    // Return digits ordered by count descending (most likely first)
    return Array.from(digitCounts.entries()).sort((a, b) => b[1] - a[1]).map(([digit]) => digit);
}

// Count words whose last 4 T9 digits match userFourDigits in exactly 3 positions (exactly one lie). userFourDigits: 4 strings (no BLANK).
function countWordsWithExactlyOneLie(words, userFourDigits, lastActualLen) {
    lastActualLen = lastActualLen || 0;
    calculateT9Strings(words);
    const minLen = 4 + lastActualLen;
    let count = 0;
    words.forEach(word => {
        const t9String = t9StringsMap.get(word) || wordToT9(word);
        if (t9String.length < minLen) return;
        const lastFour = lastActualLen > 0 ? t9String.slice(-4 - lastActualLen, -lastActualLen) : t9String.slice(-4);
        const lastFourDigits = lastFour.split('');
        let mismatches = 0;
        for (let i = 0; i < 4; i++) {
            if (lastFourDigits[i] !== userFourDigits[i]) mismatches++;
        }
        if (mismatches === 1) count++;
    });
    return count;
}

// Get positions that are most likely the lie (positions where the most words have that position as the single mismatch). Returns { positions: number[], scores: number[] }.
function getMostLikelyLiePositions(words, userFourDigits, lastActualLen) {
    lastActualLen = lastActualLen || 0;
    calculateT9Strings(words);
    const minLen = 4 + lastActualLen;
    const scores = [0, 0, 0, 0];
    words.forEach(word => {
        const t9String = t9StringsMap.get(word) || wordToT9(word);
        if (t9String.length < minLen) return;
        const lastFour = lastActualLen > 0 ? t9String.slice(-4 - lastActualLen, -lastActualLen) : t9String.slice(-4);
        const lastFourDigits = lastFour.split('');
        let mismatchCount = 0;
        let mismatchIndex = -1;
        for (let i = 0; i < 4; i++) {
            if (lastFourDigits[i] !== userFourDigits[i]) {
                mismatchCount++;
                mismatchIndex = i;
            }
        }
        if (mismatchCount === 1 && mismatchIndex >= 0) scores[mismatchIndex]++;
    });
    const maxScore = Math.max(...scores);
    const positions = scores.map((s, i) => (s === maxScore ? i + 1 : null)).filter(p => p != null);
    return { positions, scores };
}

// Get distinct digits at liePosition (1-4) among words that have exactly one lie at that position. userFourDigits: 4 strings.
function getPossibleDigitsAtPosition(words, liePosition, userFourDigits, lastActualLen) {
    lastActualLen = lastActualLen || 0;
    const pos0 = liePosition - 1;
    calculateT9Strings(words);
    const minLen = 4 + lastActualLen;
    const digits = new Set();
    words.forEach(word => {
        const t9String = t9StringsMap.get(word) || wordToT9(word);
        if (t9String.length < minLen) return;
        const lastFour = lastActualLen > 0 ? t9String.slice(-4 - lastActualLen, -lastActualLen) : t9String.slice(-4);
        const lastFourDigits = lastFour.split('');
        let mismatches = 0;
        for (let i = 0; i < 4; i++) {
            if (lastFourDigits[i] !== userFourDigits[i]) mismatches++;
        }
        if (mismatches === 1 && lastFourDigits[pos0] !== userFourDigits[pos0]) digits.add(lastFourDigits[pos0]);
    });
    return Array.from(digits).sort();
}

// Filter words where the lie is at liePosition (1-4) and the true digit at that position is truthDigit.
function filterWordsByT9OneLieWithTruth(words, userFourDigits, liePosition, truthDigit, lastActualLen) {
    lastActualLen = lastActualLen || 0;
    const pos0 = liePosition - 1;
    calculateT9Strings(words);
    const minLen = 4 + lastActualLen;
    return words.filter(word => {
        const t9String = t9StringsMap.get(word) || wordToT9(word);
        if (t9String.length < minLen) return false;
        const lastFour = lastActualLen > 0 ? t9String.slice(-4 - lastActualLen, -lastActualLen) : t9String.slice(-4);
        const lastFourDigits = lastFour.split('');
        for (let i = 0; i < 4; i++) {
            if (i === pos0) {
                if (lastFourDigits[i] !== truthDigit) return false;
            } else {
                if (lastFourDigits[i] !== userFourDigits[i]) return false;
            }
        }
        return true;
    });
}

// Helper function to calculate possible T9 digits for BLANK position in 1 TRUTH (F4), ordered by likelihood (most frequent first)
function calculatePossibleT9DigitsForBlankTruth(words, selectedDigits) {
    // Check if BLANK is used
    const blankIndex = selectedDigits.indexOf('BLANK');
    if (blankIndex === -1 || selectedDigits.length !== 4) {
        return [];
    }
    
    // Calculate T9 strings if not already done
    calculateT9Strings(words);
    
    const digitCounts = new Map();
    
    words.forEach(word => {
        const t9String = t9StringsMap.get(word) || wordToT9(word);
        
        // Must have at least 4 digits
        if (t9String.length < 4) return;
        
        const firstFour = t9String.slice(0, 4);
        const firstFourDigits = firstFour.split('');
        
        // Check if this word matches the pattern:
        // BLANK position is correct (we collect all possible values),
        // other positions must NOT match (they are incorrect)
        let matches = true;
        for (let i = 0; i < 4; i++) {
            if (i === blankIndex) {
                // BLANK position - this will be collected, continue
                continue;
            } else if (selectedDigits[i] !== 'BLANK') {
                // Non-BLANK positions must NOT match (they are incorrect)
                if (firstFourDigits[i] === selectedDigits[i]) {
                    matches = false;
                    break;
                }
            }
        }
        
        if (matches) {
            const digit = firstFourDigits[blankIndex];
            digitCounts.set(digit, (digitCounts.get(digit) || 0) + 1);
        }
    });
    
    // Return digits ordered by count descending (most likely first)
    return Array.from(digitCounts.entries()).sort((a, b) => b[1] - a[1]).map(([digit]) => digit);
}

// Filtering logic for T9 LAST: filter by last 1 or 2 digits of T9 string (actualString must be 1 or 2 digits, each 2-9)
function filterWordsByT9Last(words, actualString) {
    const actual = (actualString || '').trim();
    if (!/^[2-9]{1,2}$/.test(actual)) return words;
    calculateT9Strings(words);
    const n = actual.length;
    return words.filter(word => {
        const t9 = t9StringsMap.get(word) || wordToT9(word);
        if (t9.length < n) return false;
        return t9.slice(-n) === actual;
    });
}

// Filtering logic for T9 POSITION 5: filter by digit at position 5 (0-indexed 4) of T9 string (1 digit 2-9)
function filterWordsByT9Position5(words, actualString) {
    const actual = (actualString || '').trim();
    if (!/^[2-9]$/.test(actual)) return words;
    calculateT9Strings(words);
    const pos = 4; // 1-based position 5 = 0-indexed 4
    return words.filter(word => {
        const t9 = t9StringsMap.get(word) || wordToT9(word);
        return t9.length > pos && t9[pos] === actual;
    });
}

// Filtering logic for T9 GUESS: filter by whether each GUESS digit is in the first 4 digits of T9 string
// guessDigits: array of 1 or 2 digit strings e.g. ['6','7']; answers: array of booleans (true = in first 4, false = not)
function filterWordsByT9Guess(words, guessDigits, answers) {
    if (!guessDigits || !answers || guessDigits.length !== answers.length || guessDigits.length === 0) return words;
    calculateT9Strings(words);
    return words.filter(word => {
        const t9 = t9StringsMap.get(word) || wordToT9(word);
        const first4 = t9.slice(0, 4);
        for (let i = 0; i < guessDigits.length; i++) {
            const inFirst4 = first4.includes(guessDigits[i]);
            if (inFirst4 !== answers[i]) return false;
        }
        return true;
    });
}

// Filtering logic for T9 B feature
function filterWordsByT9B(words, selectedDigit) {
    // Calculate T9 strings if not already done
    calculateT9Strings(words);
    
    // Must have stored data from 1 LIE (L4)
    if (t9OneLieBlankIndex === null || t9OneLieSelectedDigits.length !== 4) {
        return words; // Return unfiltered if no data
    }
    
    const n = t9OneLieLastActualLength || 0;
    const minLen = 4 + n;
    
    return words.filter(word => {
        const t9String = t9StringsMap.get(word) || wordToT9(word);
        
        if (t9String.length < minLen) return false;
        
        const lastFour = n > 0 ? t9String.slice(-4 - n, -n) : t9String.slice(-4);
        const lastFourDigits = lastFour.split('');
        
        // Check that all non-BLANK positions match
        for (let i = 0; i < 4; i++) {
            if (i !== t9OneLieBlankIndex && t9OneLieSelectedDigits[i] !== 'BLANK') {
                if (lastFourDigits[i] !== t9OneLieSelectedDigits[i]) {
                    return false; // This position must match and doesn't
                }
            }
        }
        
        // The BLANK position must match the selected digit
        return lastFourDigits[t9OneLieBlankIndex] === selectedDigit;
    });
}

// Filtering logic for T9 1 LIE (4) feature
// When lastActualLen > 0 (LAST immediately before), use the 4 digits before the last lastActualLen digits
function filterWordsByT9OneLie(words, selectedDigits, lastActualLen) {
    lastActualLen = lastActualLen || 0;
    // Calculate T9 strings if not already done
    calculateT9Strings(words);
    
    // Check if BLANK is used (marking a specific position as the lie)
    const blankIndex = selectedDigits.indexOf('BLANK');
    const hasBlank = blankIndex !== -1;
    
    return words.filter(word => {
        const t9String = t9StringsMap.get(word) || wordToT9(word);
        
        const minLen = 4 + lastActualLen;
        if (t9String.length < minLen) return false;
        
        const lastFour = lastActualLen > 0
            ? t9String.slice(-4 - lastActualLen, -lastActualLen)
            : t9String.slice(-4);
        const lastFourDigits = lastFour.split('');
        
        if (hasBlank) {
            // BLANK is specified - only check that specific position as the lie
            // All other positions must be correct
            
            // Check that all non-BLANK positions match
            for (let i = 0; i < 4; i++) {
                if (i !== blankIndex && selectedDigits[i] !== 'BLANK') {
                    if (lastFourDigits[i] !== selectedDigits[i]) {
                        return false; // This position must match and doesn't
                    }
                }
            }
            
            // The BLANK position must NOT match (it's the lie)
            // Since BLANK means "this position is wrong", we just need to ensure
            // all other positions are correct, which we've already checked above
            return true; // All conditions met
        } else {
            // No BLANK - check all 4 scenarios where exactly one digit is wrong
            // Scenario 1: First digit wrong, others correct
            if (lastFourDigits[1] === selectedDigits[1] && 
                lastFourDigits[2] === selectedDigits[2] && 
                lastFourDigits[3] === selectedDigits[3] && 
                lastFourDigits[0] !== selectedDigits[0]) {
                return true;
            }
            
            // Scenario 2: Second digit wrong, others correct
            if (lastFourDigits[0] === selectedDigits[0] && 
                lastFourDigits[2] === selectedDigits[2] && 
                lastFourDigits[3] === selectedDigits[3] && 
                lastFourDigits[1] !== selectedDigits[1]) {
                return true;
            }
            
            // Scenario 3: Third digit wrong, others correct
            if (lastFourDigits[0] === selectedDigits[0] && 
                lastFourDigits[1] === selectedDigits[1] && 
                lastFourDigits[3] === selectedDigits[3] && 
                lastFourDigits[2] !== selectedDigits[2]) {
                return true;
            }
            
            // Scenario 4: Fourth digit wrong, others correct
            if (lastFourDigits[0] === selectedDigits[0] && 
                lastFourDigits[1] === selectedDigits[1] && 
                lastFourDigits[2] === selectedDigits[2] && 
                lastFourDigits[3] !== selectedDigits[3]) {
                return true;
            }
        }
        
        return false;
    });
}

// --- AlphaNumeric Filter Logic ---
function filterWordsByAlphaNumeric(words, keepRule) {
    return words.filter(word => {
        const wordLength = word.length;
        const upperWord = word.toUpperCase();
        
        // Check if word follows the rule: length matches letter position AND letter is in word
        let followsRule = false;
        for (let i = 1; i <= 26 && i <= wordLength; i++) {
            const letter = String.fromCharCode(64 + i); // A=65, B=66, etc.
            if (wordLength === i && upperWord.includes(letter)) {
                followsRule = true;
                break;
            }
        }
        
        // YES: keep words that follow rule, NO: keep words that don't follow rule
        return keepRule ? followsRule : !followsRule;
    });
}

// --- Letters Above Filter Logic ---
function filterWordsByLettersAbove(words, count) {
    const numCount = parseInt(count, 10);
    if (isNaN(numCount) || numCount < 0 || numCount > 26) {
        return words; // Invalid input, return all words
    }
    
    return words.filter(word => {
        const upperWord = word.toUpperCase();
        const lettersInWord = new Set(upperWord.split('').filter(c => c >= 'A' && c <= 'Z'));
        
        // Check if there exists a letter L in the word such that
        // exactly 'count' letters before L (in alphabet) are also in the word
        for (const letter of lettersInWord) {
            const letterPos = letter.charCodeAt(0) - 64; // A=1, B=2, etc.
            
            // Count how many letters before this letter are in the word
            let lettersBeforeCount = 0;
            for (let i = 1; i < letterPos; i++) {
                const beforeLetter = String.fromCharCode(64 + i);
                if (lettersInWord.has(beforeLetter)) {
                    lettersBeforeCount++;
                }
            }
            
            // If exactly 'count' letters before are in the word, this word matches
            if (lettersBeforeCount === numCount) {
                return true;
            }
        }
        
        return false;
    });
}

// --- Dictionary (Alpha) Filter Logic ---
const DICTIONARY_ALPHA_DEFAULT_RANGES = {
    begin: [65, 77],   // A-M
    mid: [73, 84],     // I-T
    end: [78, 90]      // N-Z
};

function getDictionaryAlphaRanges() {
    if (!appSettings || !appSettings.dictionaryAlphaUseCustomRange) {
        return DICTIONARY_ALPHA_DEFAULT_RANGES;
    }
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const toCode = (letter) => {
        const L = (letter || '').toUpperCase();
        const i = alphabet.indexOf(L);
        return i === -1 ? null : L.charCodeAt(0);
    };
    const beginStart = toCode(appSettings.dictionaryAlphaBeginStart);
    const beginEnd = toCode(appSettings.dictionaryAlphaBeginEnd);
    const midStart = toCode(appSettings.dictionaryAlphaMidStart);
    const midEnd = toCode(appSettings.dictionaryAlphaMidEnd);
    const endStart = toCode(appSettings.dictionaryAlphaEndStart);
    const endEnd = toCode(appSettings.dictionaryAlphaEndEnd);
    if ([beginStart, beginEnd, midStart, midEnd, endStart, endEnd].some(c => c === null)) {
        return DICTIONARY_ALPHA_DEFAULT_RANGES;
    }
    return {
        begin: [Math.min(beginStart, beginEnd), Math.max(beginStart, beginEnd)],
        mid: [Math.min(midStart, midEnd), Math.max(midStart, midEnd)],
        end: [Math.min(endStart, endEnd), Math.max(endStart, endEnd)]
    };
}

function filterWordsByDictionaryAlpha(words, section) {
    const ranges = getDictionaryAlphaRanges();
    const range = ranges[section];
    if (!range) return words.filter(() => false);
    const [minCode, maxCode] = range;
    return words.filter(word => {
        if (!word || word.length === 0) return false;
        const letterCode = word[0].toUpperCase().charCodeAt(0);
        return letterCode >= minCode && letterCode <= maxCode;
    });
}

// --- ALPHA: directional filter (Left/Right/Repeat); first letter from Dictionary (Alpha) ---
function filterWordsByAlpha(words, directions, firstLetterSection, swapPov) {
    if (!directions || directions.length === 0) return words;
    const ranges = getDictionaryAlphaRanges();
    const range = ranges[firstLetterSection] || ranges.begin;
    const [minCode, maxCode] = range;
    const needLen = 1 + directions.length;
    return words.filter(word => {
        const w = (word || '').toUpperCase();
        if (w.length < needLen) return false;
        const code0 = w.charCodeAt(0);
        if (code0 < minCode || code0 > maxCode) return false;
        for (let i = 0; i < directions.length; i++) {
            const d = directions[i];
            const cPrev = w.charCodeAt(i);
            const cCur = w.charCodeAt(i + 1);
            if (d === 'Repeat') {
                if (cCur !== cPrev) return false;
            } else {
                const towardA = (d === 'L' && !swapPov) || (d === 'R' && swapPov);
                if (towardA) {
                    if (cCur >= cPrev) return false;
                } else {
                    if (cCur <= cPrev) return false;
                }
            }
        }
        return true;
    });
}

function alphaDirectionSequences(n) {
    if (n <= 0) return [[]];
    const options = ['L', 'R', 'Repeat'];
    const out = [];
    function build(seq) {
        if (seq.length === n) {
            out.push(seq.slice());
            return;
        }
        for (const d of options) {
            seq.push(d);
            build(seq);
            seq.pop();
        }
    }
    build([]);
    return out;
}

function computeAlphaEfficiency(words, nDirections, swapPov) {
    if (!words || words.length === 0) return null;
    const n = Math.max(0, Math.min(6, nDirections)); // cap at 6 so 3^6 sequences is manageable
    if (n === 0) return null;
    const sequences = alphaDirectionSequences(n);
    let minWords = words.length + 1;
    let zeroCount = 0;
    const totalCount = sequences.length;
    const section = 'begin'; // use beginning range for efficiency estimate
    for (const seq of sequences) {
        const filtered = filterWordsByAlpha(words, seq, section, swapPov);
        if (filtered.length === 0) zeroCount++;
        else if (filtered.length < minWords) minWords = filtered.length;
    }
    const W = words.length;
    if (W <= 1) return zeroCount === totalCount ? 0 : (minWords <= 1 ? 100 : 0);
    if (totalCount === 0) return 0;
    const noValidBest = minWords > words.length;
    if (noValidBest) return 0;
    const base = minWords === 1 ? 100 : (W - minWords) / (W - 1) * 100;
    const multiplier = 1 - zeroCount / totalCount;
    return Math.round(Math.max(0, Math.min(100, multiplier * base)));
}

// --- ANYWHERE / TOGETHER / MIDDLE (two consonants) ---
function parseTwoConsonants(input) {
    const raw = (input || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (raw.length !== 2) return null;
    const vowels = new Set(['A', 'E', 'I', 'O', 'U']);
    if (vowels.has(raw[0]) || vowels.has(raw[1])) return null;
    return raw;
}

function filterWordsByAnywhere(words, twoLetters) {
    if (!twoLetters || twoLetters.length !== 2) return [];
    const a = twoLetters[0];
    const b = twoLetters[1];
    return words.filter(word => {
        const w = word.toUpperCase();
        return w.includes(a) && w.includes(b);
    });
}

function filterWordsByTogether(words, twoLetters) {
    if (!twoLetters || twoLetters.length !== 2) return [];
    const pair1 = twoLetters;
    const pair2 = twoLetters[1] + twoLetters[0];
    return words.filter(word => {
        const w = word.toUpperCase();
        return w.includes(pair1) || w.includes(pair2);
    });
}

function filterWordsByMiddle(words, twoLetters) {
    if (!twoLetters || twoLetters.length !== 2) return [];
    const a = twoLetters[0];
    const b = twoLetters[1];
    return words.filter(word => {
        const w = word.toUpperCase();
        if (w.length < 3) return false;
        const middle = w.slice(1, -1);
        return middle.includes(a) && middle.includes(b);
    });
}

// --- S/M/L (Length) Filter Logic ---
function filterWordsBySmlLength(words, category) {
    return words.filter(word => {
        const length = word.length;
        if (category === 'small') {
            // Small: 1-6 characters
            return length >= 1 && length <= 6;
        } else if (category === 'medium') {
            // Medium: 5-9 characters
            return length >= 5 && length <= 9;
        } else if (category === 'long') {
            // Long: 7+ characters
            return length >= 7;
        }
        return false;
    });
}

// Filtering logic for FIRST CURVED feature
function filterWordsByFirstCurved(words, position) {
    if (!Array.isArray(words) || typeof position !== 'number' || position < 1) return [];
    
    const curvedLetters = letterShapes.curved;
    const targetIndex = position - 1;
    
    return words.filter(word => {
        const upperWord = word.toUpperCase();
        
        // Exclude words shorter than the target position
        if (upperWord.length <= targetIndex) return false;
        
        // Check that the target position IS curved
        if (!curvedLetters.has(upperWord[targetIndex])) return false;
        
        // Check that all positions BEFORE the target are NOT curved
        for (let i = 0; i < targetIndex; i++) {
            if (curvedLetters.has(upperWord[i])) return false;
        }
        
        return true;
    });
}

// Filtering logic for PIN feature
function filterWordsByPin(words, wordBoxes, code) {
    if (!Array.isArray(words) || !Array.isArray(wordBoxes) || !code) return [];
    
    // Extract only digits from code, max 6
    const digitsOnly = code.toString().replace(/[^0-9]/g, '').slice(0, 6);
    if (!digitsOnly) return [];
    
    // Get non-empty word boxes and their corresponding code digits
    const wordCodePairs = [];
    for (let i = 0; i < wordBoxes.length && i < digitsOnly.length; i++) {
        const word = (wordBoxes[i] || '').trim().toUpperCase();
        if (word) {
            const codeDigit = parseInt(digitsOnly[i], 10);
            if (!isNaN(codeDigit)) {
                wordCodePairs.push({ word, codeDigit });
            }
        }
    }
    
    if (wordCodePairs.length === 0) return [];
    
    // Filter words that match all code requirements
    return words.filter(targetWord => {
        const upperTarget = targetWord.toUpperCase();
        
        // Check each word-code pair
        for (const { word, codeDigit } of wordCodePairs) {
            // Count total occurrences: for each letter in the word box,
            // count how many times it appears in the target word
            let occurrenceCount = 0;
            
            // Create a map to track how many times each letter from word box
            // has been "used" from the target word
            const targetLetterCounts = new Map();
            for (const letter of upperTarget) {
                targetLetterCounts.set(letter, (targetLetterCounts.get(letter) || 0) + 1);
            }
            
            // For each letter in the word box, count occurrences in target
            for (const letter of word) {
                const available = targetLetterCounts.get(letter) || 0;
                if (available > 0) {
                    occurrenceCount++;
                    // Decrement to avoid double-counting the same letter instance
                    targetLetterCounts.set(letter, available - 1);
                }
            }
            
            // Must match exactly
            if (occurrenceCount !== codeDigit) {
                return false;
            }
        }
        
        return true;
    }).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

// Filtering logic for FIND-EEE feature
function filterWordsByFindEee(words, selectedLetter, selectedPosition) {
    return words.filter(word => {
        if (selectedPosition === null) {
            // Only letter filtering - word must contain the letter anywhere
            return word.toUpperCase().includes(selectedLetter);
        } else {
            // Letter + position filtering - word must have the letter at the specific position
            const position = selectedPosition - 1;
            return word.length > position && word[position].toUpperCase() === selectedLetter;
        }
    });
}

// Function to setup feature listeners
function setupFeatureListeners(feature, callback, options) {
    options = options || {};
    switch (feature) {
        case 'position1': {
            const position1Button = document.getElementById('position1Button');
            const position1DoneButton = document.getElementById('position1DoneButton');
            const position1Input = document.getElementById('position1Input');
            
            if (position1Button) {
                position1Button.onclick = () => {
                    const input = position1Input?.value.trim();
                    if (input) {
                        const consonants = getConsonantsInOrder(input);
                        if (consonants.length >= 2) {
                            const filteredWords = filterWordsByPosition1(currentFilteredWords, consonants);
                            // Store the input word for vowel feature
                            currentPosition1Word = input.toUpperCase(); // Ensure it's uppercase
                            callback(filteredWords);
                            document.getElementById('position1Feature').dispatchEvent(new Event('completed'));
    } else {
                            alert('Please enter a word with at least 2 consonants');
                        }
                    } else {
                        alert('Please enter a word');
                    }
                };
                
                // Add touch event for mobile
                position1Button.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    position1Button.click();
                }, { passive: false });
            }
            
            if (position1DoneButton) {
                position1DoneButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('position1Feature').dispatchEvent(new Event('completed'));
                };
                
                // Add touch event for mobile
                position1DoneButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    position1DoneButton.click();
                }, { passive: false });
            }
            break;
        }
        
        case 'consMid': {
            const consMidButton = document.getElementById('consMidButton');
            const consMidDoneButton = document.getElementById('consMidDoneButton');
            const consMidInput = document.getElementById('consMidInput');
            
            if (consMidButton) {
                consMidButton.onclick = () => {
                    const input = consMidInput?.value.trim();
                    if (input) {
                        const letters = input.toLowerCase().split('').filter(char => /[a-z]/.test(char));
                        if (letters.length >= 2) {
                            const filteredWords = filterWordsByConsMid(currentFilteredWords, letters);
                            // Store the input word for potential future use
                            currentPosition1Word = input.toUpperCase(); // Ensure it's uppercase
                            callback(filteredWords);
                            document.getElementById('consMidFeature').dispatchEvent(new Event('completed'));
                        } else {
                            alert('Please enter a word with at least 2 letters');
                        }
                    } else {
                        alert('Please enter a word');
                    }
                };
                
                // Add touch event for mobile
                consMidButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    consMidButton.click();
                }, { passive: false });
            }
            
            if (consMidDoneButton) {
                consMidDoneButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('consMidFeature').dispatchEvent(new Event('completed'));
                };
                
                // Add touch event for mobile
                consMidDoneButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    consMidDoneButton.click();
                }, { passive: false });
            }
            break;
        }
        
        case 'consMid2': {
            const consMid2Button = document.getElementById('consMid2Button');
            const consMid2DoneButton = document.getElementById('consMid2DoneButton');
            const consMid2Input = document.getElementById('consMid2Input');
            
            if (consMid2Button) {
                consMid2Button.onclick = () => {
                    const input = consMid2Input?.value.trim();
                    if (input) {
                        const consonants = getConsonantsInOrder(input);
                        if (consonants.length >= 2) {
                            const filteredWords = filterWordsByConsMid2(currentFilteredWords, consonants);
                            // Store the input word for potential future use
                            currentPosition1Word = input.toUpperCase(); // Ensure it's uppercase
                            callback(filteredWords);
                            document.getElementById('consMid2Feature').dispatchEvent(new Event('completed'));
                        } else {
                            alert('Please enter a word with at least 2 consonants');
                        }
                    } else {
                        alert('Please enter a word');
                    }
                };
                
                // Add touch event for mobile
                consMid2Button.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    consMid2Button.click();
                }, { passive: false });
            }
            
            if (consMid2DoneButton) {
                consMid2DoneButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('consMid2Feature').dispatchEvent(new Event('completed'));
                };
                
                // Add touch event for mobile
                consMid2DoneButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    consMid2DoneButton.click();
                }, { passive: false });
            }
            break;
        }
            
        case 'vowel': {
            const vowelYesBtn = document.querySelector('#vowelFeature .yes-btn');
            const vowelNoBtn = document.querySelector('#vowelFeature .no-btn');
            const positionBtns = document.querySelectorAll('#vowelFeature .position-btn');
            
            // Initialize vowel processing with current words
            currentFilteredWordsForVowels = [...currentFilteredWords];
            originalFilteredWords = [...currentFilteredWords];
            currentVowelIndex = 0;
            
            // Get vowels from Position 1 word in order
            const vowels = new Set(['a', 'e', 'i', 'o', 'u']);
            uniqueVowels = [];
            if (currentPosition1Word) {
                for (const char of currentPosition1Word.toLowerCase()) {
                    if (vowels.has(char)) {
                        uniqueVowels.push(char);
                    }
                }
            }
            
            // Set up the vowel display
            const vowelFeature = document.getElementById('vowelFeature');
            const vowelLetter = vowelFeature.querySelector('.vowel-letter');
            if (uniqueVowels.length > 0) {
                vowelLetter.textContent = uniqueVowels[0].toUpperCase();
                vowelLetter.style.display = 'inline-block';
            }

            // Function to filter words by vowel position
            function filterWordsByVowelPosition(words, vowel, position) {
                return words.filter(word => {
                    // Convert position to 0-based index
                    const pos = position - 1;
                    // Check if word is long enough and has the vowel in the specified position
                    return word.length > pos && word[pos].toLowerCase() === vowel.toLowerCase();
                });
            }

            // Add click handlers for position buttons
            positionBtns.forEach(btn => {
                btn.onclick = () => {
                    const position = parseInt(btn.dataset.position);
                    const currentVowel = uniqueVowels[currentVowelIndex];
                    if (currentVowel) {
                        const filteredWords = filterWordsByVowelPosition(currentFilteredWords, currentVowel, position);
                        callback(filteredWords);
                        document.getElementById('vowelFeature').dispatchEvent(new Event('completed'));
                    }
                };
                
                // Add touch event for mobile
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    btn.click();
                }, { passive: false });
            });

            // Existing YES/NO button handlers remain unchanged
            if (vowelYesBtn) {
                vowelYesBtn.onclick = () => {
                    handleVowelSelection(true);
                };
                
                // Add touch event for mobile
                vowelYesBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    vowelYesBtn.click();
                }, { passive: false });
            }
            
            if (vowelNoBtn) {
                vowelNoBtn.onclick = () => {
                    handleVowelSelection(false);
                };
                
                // Add touch event for mobile
                vowelNoBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    vowelNoBtn.click();
                }, { passive: false });
            }
            break;
        }
            
        case 'vowel2': {
            const vowel2YesBtn = document.querySelector('#vowel2Feature .yes-btn');
            const vowel2NoBtn = document.querySelector('#vowel2Feature .no-btn');
            const vowel2SkipButton = document.getElementById('vowel2SkipButton');
            if (vowel2YesBtn && vowel2NoBtn && vowel2SkipButton) {
                const newYes = vowel2YesBtn.cloneNode(true);
                const newNo = vowel2NoBtn.cloneNode(true);
                const newSkip = vowel2SkipButton.cloneNode(true);
                vowel2YesBtn.parentNode.replaceChild(newYes, vowel2YesBtn);
                vowel2NoBtn.parentNode.replaceChild(newNo, vowel2NoBtn);
                vowel2SkipButton.parentNode.replaceChild(newSkip, vowel2SkipButton);
                const complete = () => {
                    document.getElementById('vowel2Feature').classList.add('completed');
                    document.getElementById('vowel2Feature').dispatchEvent(new Event('completed'));
                };
                newYes.addEventListener('click', () => {
                    const filtered = filterWordsByVowel2(currentFilteredWords, 'yes');
                    currentFilteredWords = filtered;
                    displayResults(currentFilteredWords);
                    callback(currentFilteredWords);
                    complete();
                });
                newNo.addEventListener('click', () => {
                    const filtered = filterWordsByVowel2(currentFilteredWords, 'no');
                    currentFilteredWords = filtered;
                    displayResults(currentFilteredWords);
                    callback(currentFilteredWords);
                    complete();
                });
                newSkip.addEventListener('click', () => {
                    callback(currentFilteredWords);
                    complete();
                });
                [newYes, newNo, newSkip].forEach(btn => {
                    btn.addEventListener('touchstart', (e) => {
                        e.preventDefault();
                        btn.click();
                    }, { passive: false });
                });
            }
            break;
        }
            
        case 'vowelPos': {
            const vowelPosYesBtn = document.querySelector('#vowelPosFeature .yes-btn');
            const vowelPosNoBtn = document.querySelector('#vowelPosFeature .no-btn');
            const vowelPosPositionBtns = document.querySelectorAll('#vowelPosFeature .position-btn');
            
            // Initialize vowel processing with current words
            currentFilteredWordsForVowels = [...currentFilteredWords];
            originalFilteredWords = [...currentFilteredWords];
            currentVowelIndex = 0;
            
            // Get vowels from Position 1 word in order
            const vowels = new Set(['a', 'e', 'i', 'o', 'u']);
            uniqueVowels = [];
            if (currentPosition1Word) {
                for (const char of currentPosition1Word.toLowerCase()) {
                    if (vowels.has(char)) {
                        uniqueVowels.push(char);
                    }
                }
            }
            
            // Set up the vowel display
            const vowelPosFeature = document.getElementById('vowelPosFeature');
            const vowelPosLetter = vowelPosFeature.querySelector('.vowel-letter');
            if (uniqueVowels.length > 0) {
                vowelPosLetter.textContent = uniqueVowels[0].toUpperCase();
                vowelPosLetter.style.display = 'inline-block';
            }

            // Function to get section positions based on word length
            function getSectionPositions(wordLength) {
                const beginEnd = Math.ceil(wordLength / 2);
                
                let midStart, midEnd;
                if (wordLength <= 5) {
                    midStart = 2;
                    midEnd = wordLength - 1;
                } else if (wordLength <= 8) {
                    midStart = 2;
                    midEnd = wordLength - 1;
                } else if (wordLength <= 12) {
                    midStart = 4;
                    midEnd = wordLength - 1;
                } else {
                    midStart = 4;
                    midEnd = wordLength - 1;
                }
                
                return {
                    begin: [0, beginEnd],
                    mid: [midStart - 1, midEnd],
                    end: [beginEnd, wordLength]
                };
            }

            // Function to filter words by vowel section
            function filterWordsByVowelSection(words, vowel, section) {
                return words.filter(word => {
                    const wordLower = word.toLowerCase();
                    const sections = getSectionPositions(word.length);
                    const [start, end] = sections[section];
                    const sectionText = wordLower.slice(start, end);
                    return sectionText.includes(vowel.toLowerCase());
                });
            }

            // Add click handlers for section buttons
            const vowelPosSectionBtns = document.querySelectorAll('#vowelPosFeature .section-btn');
            vowelPosSectionBtns.forEach(btn => {
                btn.onclick = () => {
                    const section = btn.dataset.section;
                    const currentVowel = uniqueVowels[currentVowelIndex];
                    if (currentVowel) {
                        const filteredWords = filterWordsByVowelSection(currentFilteredWords, currentVowel, section);
                        callback(filteredWords);
                        // Immediately advance to the next feature
                        document.getElementById('vowelPosFeature').dispatchEvent(new Event('completed'));
                    }
                };
                
                // Add touch event for mobile
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    btn.click();
                }, { passive: false });
            });

            // YES/NO button handlers
            if (vowelPosYesBtn) {
                vowelPosYesBtn.onclick = () => {
                    const currentVowel = uniqueVowels[currentVowelIndex];
                    if (currentVowel) {
                        const filteredWords = currentFilteredWords.filter(word => word.toLowerCase().includes(currentVowel.toLowerCase()));
                        callback(filteredWords);
                        document.getElementById('vowelPosFeature').dispatchEvent(new Event('completed'));
                    }
                };
                // Add touch event for mobile
                vowelPosYesBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    vowelPosYesBtn.click();
                }, { passive: false });
            }
            
            if (vowelPosNoBtn) {
                vowelPosNoBtn.onclick = () => {
                    const currentVowel = uniqueVowels[currentVowelIndex];
                    if (currentVowel) {
                        const filteredWords = currentFilteredWords.filter(word => !word.toLowerCase().includes(currentVowel.toLowerCase()));
                        callback(filteredWords);
                        document.getElementById('vowelPosFeature').dispatchEvent(new Event('completed'));
                    }
                };
                // Add touch event for mobile
                vowelPosNoBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    vowelPosNoBtn.click();
                }, { passive: false });
            }
            break;
        }
            
        case 'name': {
            const nameInput = document.getElementById('nameInput');
            const nameSubmitButton = document.getElementById('nameSubmitButton');
            const nameSkipButton = document.getElementById('nameSkipButton');
            const vowelButtons = document.querySelectorAll('#nameFeature .vowel-btn');
            const sectionButtons = document.querySelectorAll('#nameFeature .section-btn');
            
            let selectedVowel = null;
            let selectedSection = null;
            
            // Vowel button handlers
            vowelButtons.forEach(btn => {
                btn.onclick = () => {
                    // Remove previous selection
                    vowelButtons.forEach(b => b.classList.remove('active'));
                    // Add selection to clicked button
                    btn.classList.add('active');
                    selectedVowel = btn.dataset.vowel;
                };
                
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    btn.onclick();
                }, { passive: false });
            });
            
            // Section button handlers
            sectionButtons.forEach(btn => {
                btn.onclick = () => {
                    // Remove previous selection
                    sectionButtons.forEach(b => b.classList.remove('active'));
                    // Add selection to clicked button
                    btn.classList.add('active');
                    selectedSection = btn.dataset.section;
                };
                
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    btn.onclick();
                }, { passive: false });
            });
            
            // Helper function to filter words by vowel section (same as VOWEL-POS)
            function filterWordsByVowelSection(words, vowel, section) {
                return words.filter(word => {
                    const wordLower = word.toLowerCase();
                    const vowelLower = vowel.toLowerCase();
                    
                    if (!wordLower.includes(vowelLower)) {
                        return false; // Word doesn't contain the vowel
                    }
                    
                    const wordLength = word.length;
                    
                    // Find all positions where the vowel appears
                    const vowelPositions = [];
                    for (let i = 0; i < wordLength; i++) {
                        if (wordLower[i] === vowelLower) {
                            vowelPositions.push(i);
                        }
                    }
                    
                    // Check if any vowel position is in the specified section
                    return vowelPositions.some(pos => {
                        if (section === 'start') {
                            // First half: positions 0 to Math.floor(wordLength/2)
                            return pos <= Math.floor(wordLength / 2);
                        } else if (section === 'end') {
                            // Last half: positions Math.ceil(wordLength/2) to end
                            return pos >= Math.ceil(wordLength / 2);
                        } else if (section === 'middle') {
                            // Middle half: positions in the middle third
                            const start = Math.floor(wordLength / 3);
                            const end = Math.ceil((2 * wordLength) / 3);
                            return pos >= start && pos < end;
                        }
                        return false;
                    });
                });
            }
            
            if (nameSubmitButton) {
                nameSubmitButton.onclick = () => {
                    const nameInputValue = nameInput?.value.trim();
                    
                    if (!nameInputValue) {
                        alert('Please enter a full name');
                        return;
                    }
                    
                    // Extract initials (first letter of first name and surname)
                    const nameParts = nameInputValue.split(/\s+/).filter(part => part.length > 0);
                    if (nameParts.length < 2) {
                        alert('Please enter both first name and surname');
                        return;
                    }
                    
                    const initials = nameParts.map(part => part[0].toLowerCase()).join('');
                    const consonants = getConsonantsInOrder(initials);
                    
                    if (consonants.length < 2) {
                        alert('The initials must contain at least 2 consonants');
                        return;
                    }
                    
                    // Filter by consonants (like Short Word)
                    let filteredWords = filterWordsByPosition1(currentFilteredWords, consonants);
                    
                    // Optionally filter by vowel position if both vowel and section are selected
                    if (selectedVowel && selectedSection) {
                        filteredWords = filterWordsByVowelSection(filteredWords, selectedVowel, selectedSection);
                    }
                    
                    callback(filteredWords);
                    document.getElementById('nameFeature').classList.add('completed');
                    document.getElementById('nameFeature').dispatchEvent(new Event('completed'));
                };
                
                nameSubmitButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    nameSubmitButton.onclick();
                }, { passive: false });
            }
            
            if (nameSkipButton) {
                nameSkipButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('nameFeature').classList.add('completed');
                    document.getElementById('nameFeature').dispatchEvent(new Event('completed'));
                };
                
                nameSkipButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    nameSkipButton.onclick();
                }, { passive: false });
            }
            
            // No Vowel button handler
            const nameNoVowelButton = document.getElementById('nameNoVowelButton');
            if (nameNoVowelButton) {
                nameNoVowelButton.onclick = () => {
                    const nameInputValue = nameInput?.value.trim();
                    
                    if (!nameInputValue) {
                        alert('Please enter a full name');
                        return;
                    }
                    
                    // Extract initials (first letter of first name and surname)
                    const nameParts = nameInputValue.split(/\s+/).filter(part => part.length > 0);
                    if (nameParts.length < 2) {
                        alert('Please enter both first name and surname');
                        return;
                    }
                    
                    const initials = nameParts.map(part => part[0].toLowerCase()).join('');
                    const consonants = getConsonantsInOrder(initials);
                    
                    if (consonants.length < 2) {
                        alert('The initials must contain at least 2 consonants');
                        return;
                    }
                    
                    // Filter by consonants only (like Short Word) - bypass vowel selection
                    const filteredWords = filterWordsByPosition1(currentFilteredWords, consonants);
                    
                    callback(filteredWords);
                    document.getElementById('nameFeature').classList.add('completed');
                    document.getElementById('nameFeature').dispatchEvent(new Event('completed'));
                };
                
                nameNoVowelButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    nameNoVowelButton.onclick();
                }, { passive: false });
            }
            break;
        }
            
        case 'o': {
            const oYesBtn = document.getElementById('oYesBtn');
            const oNoBtn = document.getElementById('oNoBtn');
            const oSkipBtn = document.getElementById('oSkipBtn');
            
            if (oYesBtn) {
                oYesBtn.onclick = () => {
                    const filteredWords = filterWordsByO(currentFilteredWords, true);
                    callback(filteredWords);
                    document.getElementById('oFeature').dispatchEvent(new Event('completed'));
                };
                
                // Add touch event for mobile
                oYesBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    oYesBtn.click();
                }, { passive: false });
            }
            
            if (oNoBtn) {
                oNoBtn.onclick = () => {
                    const filteredWords = filterWordsByO(currentFilteredWords, false);
                    callback(filteredWords);
                    document.getElementById('oFeature').dispatchEvent(new Event('completed'));
                };
                
                // Add touch event for mobile
                oNoBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    oNoBtn.click();
                }, { passive: false });
            }
            
            if (oSkipBtn) {
                oSkipBtn.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('oFeature').dispatchEvent(new Event('completed'));
                };
                
                // Add touch event for mobile
                oSkipBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    oSkipBtn.click();
                }, { passive: false });
            }
            break;
        }

        case 'oCurves': {
            const part1 = document.getElementById('oCurvesPart1');
            const part2 = document.getElementById('oCurvesPart2');
            const yesBtn = document.getElementById('oCurvesYesBtn');
            const noBtn = document.getElementById('oCurvesNoBtn');
            const skipBtn = document.getElementById('oCurvesSkipBtn');
            const positionsInput = document.getElementById('oCurvesPositionsInput');
            const submitBtn = document.getElementById('oCurvesSubmitBtn');
            const curvedSkipBtn = document.getElementById('oCurvesCurvedSkipBtn');
            const complete = () => {
                document.getElementById('oCurvesFeature').classList.add('completed');
                document.getElementById('oCurvesFeature').dispatchEvent(new Event('completed'));
            };
            const showPart2 = () => {
                if (part1) part1.style.display = 'none';
                if (part2) part2.style.display = 'block';
            };
            if (yesBtn) {
                yesBtn.onclick = () => {
                    const filtered = filterWordsByO(currentFilteredWords, true);
                    currentFilteredWords = filtered;
                    displayResults(currentFilteredWords);
                    showPart2();
                };
                yesBtn.addEventListener('touchstart', (e) => { e.preventDefault(); yesBtn.click(); }, { passive: false });
            }
            if (noBtn) {
                noBtn.onclick = () => {
                    const filtered = filterWordsByO(currentFilteredWords, false);
                    currentFilteredWords = filtered;
                    displayResults(currentFilteredWords);
                    showPart2();
                };
                noBtn.addEventListener('touchstart', (e) => { e.preventDefault(); noBtn.click(); }, { passive: false });
            }
            if (skipBtn) {
                skipBtn.onclick = () => {
                    callback(currentFilteredWords);
                    complete();
                };
                skipBtn.addEventListener('touchstart', (e) => { e.preventDefault(); skipBtn.click(); }, { passive: false });
            }
            if (submitBtn && positionsInput) {
                submitBtn.onclick = () => {
                    const input = positionsInput.value.trim();
                    if (input) {
                        const filtered = filterWordsByCurvedPositions(currentFilteredWords, input);
                        currentFilteredWords = filtered;
                        displayResults(currentFilteredWords);
                        callback(currentFilteredWords);
                        complete();
                    } else {
                        alert('Please enter positions (e.g. 123 or 0 for all straight)');
                    }
                };
                submitBtn.addEventListener('touchstart', (e) => { e.preventDefault(); submitBtn.click(); }, { passive: false });
                positionsInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') submitBtn.click(); });
            }
            if (curvedSkipBtn) {
                curvedSkipBtn.onclick = () => {
                    callback(currentFilteredWords);
                    complete();
                };
                curvedSkipBtn.addEventListener('touchstart', (e) => { e.preventDefault(); curvedSkipBtn.click(); }, { passive: false });
            }
            break;
        }
            
        case 'curved': {
            const curvedButtons = document.querySelectorAll('.curved-btn');
            const curvedSkipBtn = document.getElementById('curvedSkipBtn');
            
            curvedButtons.forEach(button => {
                button.onclick = () => {
                    const letter = button.textContent;
                    const filteredWords = filterWordsByCurvedPositions(currentFilteredWords, letter);
                    callback(filteredWords);
                    document.getElementById('curvedFeature').dispatchEvent(new Event('completed'));
                };
                
                // Add touch event for mobile
                button.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    button.click();
                }, { passive: false });
            });
            
            if (curvedSkipBtn) {
                curvedSkipBtn.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('curvedFeature').dispatchEvent(new Event('completed'));
                };
                
                // Add touch event for mobile
                curvedSkipBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    curvedSkipBtn.click();
                }, { passive: false });
            }
            break;
        }
            
        case 'colour3': {
            const colour3YesBtn = document.getElementById('colour3YesBtn');
            const colour3SkipButton = document.getElementById('colour3SkipButton');
            
            if (colour3YesBtn) {
                colour3YesBtn.onclick = () => {
                    const filteredWords = filterWordsByColour3(currentFilteredWords);
                    callback(filteredWords);
                    document.getElementById('colour3Feature').dispatchEvent(new Event('completed'));
                };
                
                // Add touch event for mobile
                colour3YesBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    colour3YesBtn.click();
                }, { passive: false });
            }
            
            if (colour3SkipButton) {
                colour3SkipButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('colour3Feature').dispatchEvent(new Event('completed'));
                };
                
                // Add touch event for mobile
                colour3SkipButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    colour3SkipButton.click();
                }, { passive: false });
            }
            break;
        }

        case 'atlas': {
            const atlasButton = document.getElementById('atlasButton');
            const atlasSkipButton = document.getElementById('atlasSkipButton');
            const atlasInput = document.getElementById('atlasInput');
            if (atlasButton && atlasInput && atlasSkipButton) {
                const newAtlasButton = atlasButton.cloneNode(true);
                const newAtlasSkipButton = atlasSkipButton.cloneNode(true);
                const newAtlasInput = atlasInput.cloneNode(true);
                atlasButton.parentNode.replaceChild(newAtlasButton, atlasButton);
                atlasSkipButton.parentNode.replaceChild(newAtlasSkipButton, atlasSkipButton);
                atlasInput.parentNode.replaceChild(newAtlasInput, atlasInput);
                newAtlasButton.addEventListener('click', () => {
                    const raw = (newAtlasInput.value || '').toString().trim().replace(/\s+/g, '');
                    if (!raw) return;
                    const filtered = filterWordsByAtlas(currentFilteredWords, raw);
                    currentFilteredWords = filtered;
                    const source = (appSettings && appSettings.atlasLetterSource) || 'default';
                    if (source === 'default') lastAtlasColoursCount = raw.length;
                    displayResults(currentFilteredWords);
                    callback(currentFilteredWords);
                    document.getElementById('atlasFeature').classList.add('completed');
                    document.getElementById('atlasFeature').dispatchEvent(new Event('completed'));
                });
                newAtlasSkipButton.addEventListener('click', () => {
                    callback(currentFilteredWords);
                    document.getElementById('atlasFeature').classList.add('completed');
                    document.getElementById('atlasFeature').dispatchEvent(new Event('completed'));
                });
                newAtlasInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') newAtlasButton.click();
                });
                newAtlasButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    newAtlasButton.click();
                }, { passive: false });
                newAtlasSkipButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    newAtlasSkipButton.click();
                }, { passive: false });
            }
            break;
        }

        case 'numerology': {
            const submitBtn = document.getElementById('numerologySubmitButton');
            const skipBtn = document.getElementById('numerologySkipButton');
            const numInput = document.getElementById('numerologyInput');
            const diffInput = document.getElementById('numerologyDifferenceInput');
            const messageEl = document.getElementById('numerologyMessage');

            const setMessage = (text = '', isError = false) => {
                if (!messageEl) return;
                messageEl.textContent = text;
                messageEl.style.color = isError ? '#f44336' : '#4CAF50';
            };

            const handleSubmit = () => {
                if (!numInput || !diffInput) return;
                const nRaw = (numInput.value || '').trim();
                const dRaw = (diffInput.value || '').trim();
                if (!nRaw) {
                    setMessage('Enter a numerology number (1–9).', true);
                    return;
                }
                const N = parseInt(nRaw, 10);
                const D = dRaw === '' ? 0 : parseInt(dRaw, 10);
                if (isNaN(N) || N < 1 || N > 9) {
                    setMessage('Numerology must be 1–9.', true);
                    return;
                }
                if (isNaN(D) || D < 0) {
                    setMessage('Difference must be 0 or higher.', true);
                    return;
                }
                const { valid, dates } = computeNumerologyDates(N, D);
                if (!valid || !dates || dates.length === 0) {
                    setMessage('No valid month matches this numerology and difference. Please check your input.', true);
                    return;
                }
                setMessage(`NUMEROLOGY stored ${dates.length} date(s).`, false);
                const birthdayResultsEl = document.getElementById('birthdayResults');
                if (birthdayResultsEl) {
                    const html = dates.map(d => {
                        const sign = getBirthdayStarSign(d.day, d.monthNum);
                        const dateText = `${d.day} ${d.monthName}`;
                        const signText = sign || '';
                        return `
<div class="birthday-date-line">${dateText}</div>
<div class="birthday-sign-line">${signText}</div>
<div class="birthday-separator">&nbsp;</div>`;
                    }).join('').trim();
                    birthdayResultsEl.innerHTML = html || 'No dates found.';
                }
                callback(currentFilteredWords);
                const featureDiv = document.getElementById('numerologyFeature');
                if (featureDiv) {
                    featureDiv.classList.add('completed');
                    featureDiv.dispatchEvent(new Event('completed'));
                }
            };

            if (submitBtn) {
                submitBtn.onclick = handleSubmit;
                submitBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleSubmit(); }, { passive: false });
            }
            if (skipBtn) {
                skipBtn.onclick = () => {
                    callback(currentFilteredWords);
                    const featureDiv = document.getElementById('numerologyFeature');
                    if (featureDiv) {
                        featureDiv.classList.add('completed');
                        featureDiv.dispatchEvent(new Event('completed'));
                    }
                };
                skipBtn.addEventListener('touchstart', (e) => { e.preventDefault(); skipBtn.click(); }, { passive: false });
            }
            if (numInput) {
                numInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSubmit(); });
            }
            if (diffInput) {
                diffInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSubmit(); });
            }
            break;
        }
            
        case 'lexicon': {
            const lexiconButton = document.getElementById('lexiconButton');
            const lexiconSkipButton = document.getElementById('lexiconSkipButton');
            
            if (lexiconButton) {
                lexiconButton.onclick = () => {
                    const input = document.getElementById('lexiconInput')?.value.trim();
                    if (input) {
                        const filteredWords = filterWordsByLexicon(currentFilteredWords, input);
                        callback(filteredWords);
                        document.getElementById('lexiconFeature').dispatchEvent(new Event('completed'));
                    } else {
                        alert('Please enter positions (e.g., 123)');
                    }
                };
                
                // Add touch event for mobile
                lexiconButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    lexiconButton.click();
                }, { passive: false });
            }
            
            if (lexiconSkipButton) {
                lexiconSkipButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('lexiconFeature').dispatchEvent(new Event('completed'));
                };
                
                // Add touch event for mobile
                lexiconSkipButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    lexiconSkipButton.click();
                }, { passive: false });
            }
            break;
        }

        case 'zeroCurves': {
            const zeroCurvesButton = document.getElementById('zeroCurvesButton');
            const zeroCurvesSkipButton = document.getElementById('zeroCurvesSkipButton');
            const zeroCurvesInput = document.getElementById('zeroCurvesInput');
            if (zeroCurvesButton && zeroCurvesInput) {
                zeroCurvesButton.onclick = () => {
                    const input = zeroCurvesInput.value.trim();
                    if (input) {
                        const approx = !!(appSettings && appSettings.zeroCurvesApprox);
                        const filteredWords = filterWordsByZeroCurves(currentFilteredWords, input, approx);
                        currentFilteredWords = filteredWords;
                        displayResults(currentFilteredWords);
                        callback(currentFilteredWords);
                        document.getElementById('zeroCurvesFeature').classList.add('completed');
                        document.getElementById('zeroCurvesFeature').dispatchEvent(new Event('completed'));
                    } else {
                        alert('Please enter positions (e.g. 135 or 0)');
                    }
                };
                zeroCurvesButton.addEventListener('touchstart', (e) => { e.preventDefault(); zeroCurvesButton.click(); }, { passive: false });
            }
            if (zeroCurvesSkipButton) {
                zeroCurvesSkipButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('zeroCurvesFeature').classList.add('completed');
                    document.getElementById('zeroCurvesFeature').dispatchEvent(new Event('completed'));
                };
                zeroCurvesSkipButton.addEventListener('touchstart', (e) => { e.preventDefault(); zeroCurvesSkipButton.click(); }, { passive: false });
            }
            if (zeroCurvesInput) {
                zeroCurvesInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') zeroCurvesButton.click(); });
            }
            break;
        }
            
        case 'consonant': {
            const consonantYesBtn = document.getElementById('consonantYesBtn');
            const consonantNoBtn = document.getElementById('consonantNoBtn');
            
            if (consonantYesBtn) {
                consonantYesBtn.onclick = () => {
                    hasAdjacentConsonants = true;
                    const filteredWords = currentFilteredWords.filter(word => hasWordAdjacentConsonants(word));
                    callback(filteredWords);
                    document.getElementById('consonantQuestion').dispatchEvent(new Event('completed'));
                };
                
                // Add touch event for mobile
                consonantYesBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    consonantYesBtn.click();
                }, { passive: false });
            }
            
            if (consonantNoBtn) {
                consonantNoBtn.onclick = () => {
                    hasAdjacentConsonants = false;
                    const filteredWords = currentFilteredWords.filter(word => !hasWordAdjacentConsonants(word));
                    callback(filteredWords);
                    document.getElementById('consonantQuestion').dispatchEvent(new Event('completed'));
                };
                
                // Add touch event for mobile
                consonantNoBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    consonantNoBtn.click();
                }, { passive: false });
            }
            break;
        }

        case 'theCore': {
            const featureDiv = document.getElementById('theCoreFeature');
            if (!featureDiv) {
                callback(currentFilteredWords);
                break;
            }

            const step1 = document.getElementById('theCoreStep1');
            const yesBranch = document.getElementById('theCoreYesBranch');
            const noBranch = document.getElementById('theCoreNoBranch');
            const q1YesBtn = document.getElementById('theCoreQ1YesBtn');
            const q1NoBtn = document.getElementById('theCoreQ1NoBtn');

            const shortWordInput = document.getElementById('theCoreShortWordInput');
            const shortWordSubmitBtn = document.getElementById('theCoreShortWordSubmitBtn');

            const vowelSection = document.getElementById('theCoreVowelSection');
            const vowelLetterSpan = document.getElementById('theCoreVowelLetter');
            const vowelYesBtn = document.getElementById('theCoreVowelYesBtn');
            const vowelNoBtn = document.getElementById('theCoreVowelNoBtn');

            const vowelPosSection = document.getElementById('theCoreVowelPosSection');
            const vowelPosSectionBtns = vowelPosSection
                ? Array.from(vowelPosSection.querySelectorAll('.section-btn'))
                : [];
            const vowelPresenceButtons = document.getElementById('theCoreVowelYesNo');
            const vowelPosLetterSpan = document.getElementById('theCoreVowelPosLetter');

            const consMidInput = document.getElementById('theCoreConsMidInput');
            const consMidSubmitBtn = document.getElementById('theCoreConsMidSubmitBtn');

            let workingWords = [...currentFilteredWords];
            let coreVowels = [];
            let coreVowelIndex = 0;
            let coreVowelStage = 'presence'; // 'presence' or 'position'

            function completeCore(finalWords) {
                callback(finalWords);
                featureDiv.classList.add('completed');
                featureDiv.dispatchEvent(new Event('completed'));
            }

            function getConsonantPairsFromWord(word) {
                const vowelsSet = new Set(['A', 'E', 'I', 'O', 'U']);
                const upper = (word || '').toString().toUpperCase().replace(/[^A-Z]/g, '');
                const consonants = upper.split('').filter(ch => !vowelsSet.has(ch));
                const pairs = new Set();
                for (let i = 0; i < consonants.length; i++) {
                    for (let j = i + 1; j < consonants.length; j++) {
                        const a = consonants[i];
                        const b = consonants[j];
                        const key = a <= b ? a + b : b + a;
                        pairs.add(key);
                    }
                }
                return pairs;
            }

            function filterWordsByAdjacentConsonantPairs(words, helperWord) {
                const pairs = getConsonantPairsFromWord(helperWord);
                if (!pairs.size) return words;
                return words.filter(word => {
                    const upper = (word || '').toString().toUpperCase();
                    for (let i = 0; i < upper.length - 1; i++) {
                        const a = upper[i];
                        const b = upper[i + 1];
                        if (a < 'A' || a > 'Z' || b < 'A' || b > 'Z') continue;
                        const key = a <= b ? a + b : b + a;
                        if (pairs.has(key)) return true;
                    }
                    return false;
                });
            }

            function filterWordsByNonAdjacentConsonantPairs(words, helperWord) {
                const pairs = getConsonantPairsFromWord(helperWord);
                if (!pairs.size) return words;
                return words.filter(word => {
                    const upper = (word || '').toString().toUpperCase();
                    const letters = new Set(upper.split('').filter(ch => ch >= 'A' && ch <= 'Z'));
                    for (const key of pairs) {
                        const a = key[0];
                        const b = key[1];
                        if (letters.has(a) && letters.has(b)) {
                            return true;
                        }
                    }
                    return false;
                });
            }

            function startVowelPhase(helperWord) {
                const vowelsSet = new Set(['A', 'E', 'I', 'O', 'U']);
                const upper = (helperWord || '').toString().toUpperCase();
                coreVowels = [];
                const seen = new Set();
                for (const ch of upper) {
                    if (vowelsSet.has(ch) && !seen.has(ch)) {
                        seen.add(ch);
                        coreVowels.push(ch);
                    }
                }
                coreVowelIndex = 0;
                coreVowelStage = 'presence';
                if (!coreVowels.length) {
                    completeCore(workingWords);
                    return;
                }
                // Move to Part 3 screen (hide Part 2 branches)
                if (yesBranch) yesBranch.style.display = 'none';
                if (noBranch) noBranch.style.display = 'none';
                if (vowelSection) vowelSection.style.display = '';
                if (vowelPresenceButtons) vowelPresenceButtons.style.display = '';
                if (vowelPosSection) vowelPosSection.style.display = 'none';
                if (vowelLetterSpan) vowelLetterSpan.textContent = coreVowels[0];
                if (vowelPosLetterSpan) vowelPosLetterSpan.textContent = coreVowels[0];
            }

            // Helper for vowel position sections (Beginning / Middle / End), adapted from VOWEL POS
            function getCoreSectionPositions(wordLength) {
                const beginEnd = Math.ceil(wordLength / 2);
                
                let midStart, midEnd;
                if (wordLength <= 5) {
                    midStart = 2;
                    midEnd = wordLength - 1;
                } else if (wordLength <= 8) {
                    midStart = 2;
                    midEnd = wordLength - 1;
                } else if (wordLength <= 12) {
                    midStart = 4;
                    midEnd = wordLength - 1;
                } else {
                    midStart = 4;
                    midEnd = wordLength - 1;
                }
                
                return {
                    begin: [0, beginEnd],
                    mid: [midStart - 1, midEnd],
                    end: [beginEnd, wordLength]
                };
            }

            function filterWordsByCoreVowelSection(words, vowel, section) {
                return words.filter(word => {
                    const wordLower = (word || '').toString().toLowerCase();
                    const sections = getCoreSectionPositions(wordLower.length);
                    const [start, end] = sections[section] || [];
                    if (start == null || end == null) return false;
                    const sectionText = wordLower.slice(start, end);
                    return sectionText.includes((vowel || '').toString().toLowerCase());
                });
            }

            function advanceVowel(include) {
                const current = coreVowels[coreVowelIndex];
                if (!current) {
                    completeCore(workingWords);
                    return;
                }

                if (coreVowelStage === 'presence') {
                    const lower = current.toLowerCase();
                    if (include) {
                        // VOWEL = YES: keep words containing this vowel, then move to VOWEL POS
                        workingWords = workingWords.filter(w => (w || '').toString().toLowerCase().includes(lower));
                        callback(workingWords);
                        coreVowelStage = 'position';
                        if (vowelPresenceButtons) vowelPresenceButtons.style.display = 'none';
                        if (vowelPosSection) vowelPosSection.style.display = '';
                        if (vowelPosLetterSpan) vowelPosLetterSpan.textContent = current;
                    } else {
                        // VOWEL = NO: exclude words containing this vowel, then go straight to next vowel
                        workingWords = workingWords.filter(w => !(w || '').toString().toLowerCase().includes(lower));
                        callback(workingWords);
                        coreVowelIndex++;
                        coreVowelStage = 'presence';
                        if (vowelPosSection) vowelPosSection.style.display = 'none';
                        if (coreVowelIndex >= coreVowels.length || workingWords.length === 0) {
                            completeCore(workingWords);
                        } else if (vowelLetterSpan) {
                            vowelLetterSpan.textContent = coreVowels[coreVowelIndex];
                            if (vowelPosLetterSpan) vowelPosLetterSpan.textContent = coreVowels[coreVowelIndex];
                        }
                    }
                }
            }

            if (q1YesBtn) {
                q1YesBtn.onclick = () => {
                    workingWords = workingWords.filter(word => hasWordAdjacentConsonants(word));
                    callback(workingWords);
                    if (step1) step1.style.display = 'none';
                    if (yesBranch) yesBranch.style.display = '';
                };
                q1YesBtn.addEventListener('touchstart', (e) => { e.preventDefault(); q1YesBtn.click(); }, { passive: false });
            }

            if (q1NoBtn) {
                q1NoBtn.onclick = () => {
                    workingWords = workingWords.filter(word => !hasWordAdjacentConsonants(word));
                    callback(workingWords);
                    if (step1) step1.style.display = 'none';
                    if (noBranch) noBranch.style.display = '';
                };
                q1NoBtn.addEventListener('touchstart', (e) => { e.preventDefault(); q1NoBtn.click(); }, { passive: false });
            }

            if (shortWordSubmitBtn && shortWordInput) {
                shortWordSubmitBtn.onclick = () => {
                    const raw = shortWordInput.value.trim();
                    if (!raw) {
                        alert('Please enter a short word.');
                        return;
                    }
                    const filtered = filterWordsByAdjacentConsonantPairs(workingWords, raw);
                    workingWords = filtered;
                    callback(workingWords);
                    startVowelPhase(raw);
                };
                shortWordSubmitBtn.addEventListener('touchstart', (e) => { e.preventDefault(); shortWordSubmitBtn.click(); }, { passive: false });
            }

            if (vowelYesBtn) {
                vowelYesBtn.onclick = () => advanceVowel(true);
                vowelYesBtn.addEventListener('touchstart', (e) => { e.preventDefault(); vowelYesBtn.click(); }, { passive: false });
            }
            if (vowelNoBtn) {
                vowelNoBtn.onclick = () => advanceVowel(false);
                vowelNoBtn.addEventListener('touchstart', (e) => { e.preventDefault(); vowelNoBtn.click(); }, { passive: false });
            }

            if (vowelPosSectionBtns && vowelPosSectionBtns.length > 0) {
                vowelPosSectionBtns.forEach(btn => {
                    btn.onclick = () => {
                        const current = coreVowels[coreVowelIndex];
                        if (!current) {
                            completeCore(workingWords);
                            return;
                        }
                        const section = btn.dataset.section;
                        workingWords = filterWordsByCoreVowelSection(workingWords, current, section);
                        callback(workingWords);

                        // Advance to next vowel
                        coreVowelIndex++;
                        coreVowelStage = 'presence';
                        if (vowelPosSection) vowelPosSection.style.display = 'none';
                        if (vowelPresenceButtons) vowelPresenceButtons.style.display = '';

                        if (coreVowelIndex >= coreVowels.length || workingWords.length === 0) {
                            completeCore(workingWords);
                        } else if (vowelLetterSpan) {
                            vowelLetterSpan.textContent = coreVowels[coreVowelIndex];
                            if (vowelPosLetterSpan) vowelPosLetterSpan.textContent = coreVowels[coreVowelIndex];
                        }
                    };
                    btn.addEventListener('touchstart', (e) => {
                        e.preventDefault();
                        btn.click();
                    }, { passive: false });
                });
            }

            if (consMidSubmitBtn && consMidInput) {
                consMidSubmitBtn.onclick = () => {
                    const raw = consMidInput.value.trim();
                    if (!raw) {
                        alert('Please enter a word.');
                        return;
                    }
                    workingWords = filterWordsByNonAdjacentConsonantPairs(workingWords, raw);
                    callback(workingWords);
                    startVowelPhase(raw);
                };
                consMidSubmitBtn.addEventListener('touchstart', (e) => { e.preventDefault(); consMidSubmitBtn.click(); }, { passive: false });
            }

            break;
        }
            
        case 'eee': {
            const eeeButton = document.getElementById('eeeButton');
            const eeeYesBtn = document.getElementById('eeeYesBtn');
            const eeeNoBtn = document.getElementById('eeeNoBtn');
            
            if (eeeButton) {
                eeeButton.onclick = () => {
                    const filteredWords = filterWordsByEee(currentFilteredWords, 'E');
                    callback(filteredWords);
                    document.getElementById('eeeFeature').dispatchEvent(new Event('completed'));
                };
                
                // Add touch event for mobile
                eeeButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    eeeButton.click();
                }, { passive: false });
            }
            
            if (eeeYesBtn) {
                eeeYesBtn.onclick = () => {
                    const filteredWords = filterWordsByEee(currentFilteredWords, 'YES');
                    callback(filteredWords);
                    document.getElementById('eeeFeature').dispatchEvent(new Event('completed'));
                };
                
                // Add touch event for mobile
                eeeYesBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    eeeYesBtn.click();
                }, { passive: false });
            }
            
            if (eeeNoBtn) {
                eeeNoBtn.onclick = () => {
                    const filteredWords = filterWordsByEee(currentFilteredWords, 'NO');
                    callback(filteredWords);
                    document.getElementById('eeeFeature').dispatchEvent(new Event('completed'));
                };
                
                // Add touch event for mobile
                eeeNoBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    eeeNoBtn.click();
                }, { passive: false });
            }
            break;
        }

        case 'eeeFirst': {
            const eeeFirstButton = document.getElementById('eeeFirstButton');
            const eeeFirstYesBtn = document.getElementById('eeeFirstYesBtn');
            const eeeFirstNoBtn = document.getElementById('eeeFirstNoBtn');
            const eeeFirstSkipButton = document.getElementById('eeeFirstSkipButton');
            
            if (eeeFirstButton) {
                eeeFirstButton.onclick = () => {
                    const filteredWords = filterWordsByEeeFirst(currentFilteredWords, 'E');
                    callback(filteredWords);
                    document.getElementById('eeeFirstFeature').dispatchEvent(new Event('completed'));
                };
                
                // Add touch event for mobile
                eeeFirstButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    eeeFirstButton.click();
                }, { passive: false });
            }
            
            if (eeeFirstYesBtn) {
                eeeFirstYesBtn.onclick = () => {
                    const filteredWords = filterWordsByEeeFirst(currentFilteredWords, 'YES');
                    callback(filteredWords);
                    document.getElementById('eeeFirstFeature').dispatchEvent(new Event('completed'));
                };
                
                // Add touch event for mobile
                eeeFirstYesBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    eeeFirstYesBtn.click();
                }, { passive: false });
            }
            
            if (eeeFirstNoBtn) {
                eeeFirstNoBtn.onclick = () => {
                    const filteredWords = filterWordsByEeeFirst(currentFilteredWords, 'NO');
                    callback(filteredWords);
                    document.getElementById('eeeFirstFeature').dispatchEvent(new Event('completed'));
                };
                
                // Add touch event for mobile
                eeeFirstNoBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    eeeFirstNoBtn.click();
                }, { passive: false });
            }

            if (eeeFirstSkipButton) {
                eeeFirstSkipButton.onclick = () => {
                    callback(currentFilteredWords); // Keep the current word list unchanged
                    document.getElementById('eeeFirstFeature').dispatchEvent(new Event('completed'));
                };
                
                // Add touch event for mobile
                eeeFirstSkipButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    eeeFirstSkipButton.click();
                }, { passive: false });
            }
            break;
        }

        case 'e21': {
            const part1 = document.getElementById('e21Part1');
            const part2 = document.getElementById('e21Part2');
            const part3 = document.getElementById('e21Part3');
            const secondEBtn = document.getElementById('e21SecondEBtn');
            const secondYesBtn = document.getElementById('e21SecondYesBtn');
            const secondNoBtn = document.getElementById('e21SecondNoBtn');
            const firstEBtn = document.getElementById('e21FirstEBtn');
            const firstYesBtn = document.getElementById('e21FirstYesBtn');
            const firstNoBtn = document.getElementById('e21FirstNoBtn');
            const anywhereYesBtn = document.getElementById('e21AnywhereYesBtn');
            const anywhereNoBtn = document.getElementById('e21AnywhereNoBtn');
            const skipBtn = document.getElementById('e21SkipBtn');

            const hasAnywherePart = appSettings && appSettings.e21CheckAnywhere;
            let e21AnsweredEInPosition = false; // true if user answered "E" for part 1 or part 2

            const showStage = (stage) => {
                if (part1) part1.style.display = stage === 1 ? 'block' : 'none';
                if (part2) part2.style.display = stage === 2 ? 'block' : 'none';
                if (part3) part3.style.display = stage === 3 ? 'block' : 'none';
            };

            const complete = () => {
                const featureDiv = document.getElementById('e21Feature');
                if (featureDiv) {
                    featureDiv.classList.add('completed');
                    featureDiv.dispatchEvent(new Event('completed'));
                }
            };

            showStage(1);

            const applyEee = (mode) => {
                const filtered = filterWordsByEee(currentFilteredWords, mode);
                currentFilteredWords = filtered;
                displayResults(currentFilteredWords);
            };

            const applyEeeFirst = (mode) => {
                const filtered = filterWordsByEeeFirst(currentFilteredWords, mode);
                currentFilteredWords = filtered;
                displayResults(currentFilteredWords);
            };

            // Part 1: EEE? (second letter)
            if (secondEBtn) {
                secondEBtn.onclick = () => {
                    e21AnsweredEInPosition = true; // E in second position => E is in the word
                    applyEee('E');
                    showStage(2);
                };
                secondEBtn.addEventListener('touchstart', (e) => { e.preventDefault(); secondEBtn.click(); }, { passive: false });
            }
            if (secondYesBtn) {
                secondYesBtn.onclick = () => {
                    applyEee('YES');
                    showStage(2);
                };
                secondYesBtn.addEventListener('touchstart', (e) => { e.preventDefault(); secondYesBtn.click(); }, { passive: false });
            }
            if (secondNoBtn) {
                secondNoBtn.onclick = () => {
                    applyEee('NO');
                    showStage(2);
                };
                secondNoBtn.addEventListener('touchstart', (e) => { e.preventDefault(); secondNoBtn.click(); }, { passive: false });
            }

            // Part 2: EEEFIRST (first letter). Skip "Is E in the word?" if user answered E in part 1 or part 2.
            const finishOrNext = () => {
                if (hasAnywherePart && !e21AnsweredEInPosition) {
                    showStage(3);
                } else {
                    callback(currentFilteredWords);
                    complete();
                }
            };

            if (firstEBtn) {
                firstEBtn.onclick = () => {
                    e21AnsweredEInPosition = true; // E in first position => E is in the word
                    applyEeeFirst('E');
                    finishOrNext();
                };
                firstEBtn.addEventListener('touchstart', (e) => { e.preventDefault(); firstEBtn.click(); }, { passive: false });
            }
            if (firstYesBtn) {
                firstYesBtn.onclick = () => {
                    applyEeeFirst('YES');
                    finishOrNext();
                };
                firstYesBtn.addEventListener('touchstart', (e) => { e.preventDefault(); firstYesBtn.click(); }, { passive: false });
            }
            if (firstNoBtn) {
                firstNoBtn.onclick = () => {
                    applyEeeFirst('NO');
                    finishOrNext();
                };
                firstNoBtn.addEventListener('touchstart', (e) => { e.preventDefault(); firstNoBtn.click(); }, { passive: false });
            }

            // Part 3: E anywhere (optional)
            const applyEAnywhere = (hasE) => {
                const filtered = currentFilteredWords.filter(word => {
                    const has = word.toUpperCase().includes('E');
                    return hasE ? has : !has;
                });
                currentFilteredWords = filtered;
                displayResults(currentFilteredWords);
                callback(currentFilteredWords);
                complete();
            };

            if (anywhereYesBtn) {
                anywhereYesBtn.onclick = () => applyEAnywhere(true);
                anywhereYesBtn.addEventListener('touchstart', (e) => { e.preventDefault(); anywhereYesBtn.click(); }, { passive: false });
            }
            if (anywhereNoBtn) {
                anywhereNoBtn.onclick = () => applyEAnywhere(false);
                anywhereNoBtn.addEventListener('touchstart', (e) => { e.preventDefault(); anywhereNoBtn.click(); }, { passive: false });
            }

            // Skip entire E21
            if (skipBtn) {
                skipBtn.onclick = () => {
                    callback(currentFilteredWords);
                    complete();
                };
                skipBtn.addEventListener('touchstart', (e) => { e.preventDefault(); skipBtn.click(); }, { passive: false });
            }

            break;
        }

        case 'letterLying': {
            const letterDisplay = document.getElementById('letterLyingLetterDisplay');
            const yesBtn = document.getElementById('letterLyingYesBtn');
            const noBtn = document.getElementById('letterLyingNoBtn');
            const skipLetterBtn = document.getElementById('letterLyingSkipLetterBtn');
            const skipBtn = document.getElementById('letterLyingSkipBtn');
            const askedLetters = new Set();

            const complete = () => {
                const featureDiv = document.getElementById('letterLyingFeature');
                if (featureDiv) {
                    featureDiv.classList.add('completed');
                    featureDiv.dispatchEvent(new Event('completed'));
                }
            };

            const isStatic = (appSettings && appSettings.letterLyingMode) === 'static';
            const staticLetters = getLetterLyingStaticLetters();
            const staticMax = (appSettings && typeof appSettings.letterLyingStaticMaxSteps === 'number')
                ? appSettings.letterLyingStaticMaxSteps
                : 0;
            const totalParts = isStatic
                ? (staticMax && staticMax > 0 ? Math.min(staticMax, staticLetters.length) : staticLetters.length)
                : (Math.max(1, Math.min(26, (appSettings && appSettings.letterLyingDynamicSteps) || 4)));
            let partIndex = 0;
            let currentLetter = null;

            const showNextLetter = () => {
                if (currentFilteredWords.length === 0) {
                    callback(currentFilteredWords);
                    complete();
                    return;
                }
                if (partIndex >= totalParts) {
                    callback(currentFilteredWords);
                    complete();
                    return;
                }
                currentLetter = isStatic ? staticLetters[partIndex] : getMostFrequentLetterInWordlist(currentFilteredWords, askedLetters);
                if (!currentLetter) {
                    callback(currentFilteredWords);
                    complete();
                    return;
                }
                askedLetters.add(currentLetter);
                if (letterDisplay) letterDisplay.textContent = currentLetter;
            };

            showNextLetter();
            if (partIndex >= totalParts || currentFilteredWords.length === 0) break;

            const advanceOrComplete = () => {
                partIndex++;
                if (partIndex >= totalParts) {
                    callback(currentFilteredWords);
                    complete();
                    return;
                }
                showNextLetter();
            };

            if (yesBtn) {
                yesBtn.onclick = () => {
                    if (!currentLetter) return;
                    const filtered = filterWordsByLetterPresence(currentFilteredWords, currentLetter, true);
                    currentFilteredWords = filtered;
                    callback(currentFilteredWords);
                    displayResults(currentFilteredWords);
                    if (filtered.length === 0) {
                        complete();
                        return;
                    }
                    advanceOrComplete();
                };
                yesBtn.addEventListener('touchstart', (e) => { e.preventDefault(); yesBtn.click(); }, { passive: false });
            }
            if (noBtn) {
                noBtn.onclick = () => {
                    if (!currentLetter) return;
                    const filtered = filterWordsByLetterPresence(currentFilteredWords, currentLetter, false);
                    currentFilteredWords = filtered;
                    callback(currentFilteredWords);
                    displayResults(currentFilteredWords);
                    if (filtered.length === 0) {
                        complete();
                        return;
                    }
                    advanceOrComplete();
                };
                noBtn.addEventListener('touchstart', (e) => { e.preventDefault(); noBtn.click(); }, { passive: false });
            }
            if (skipLetterBtn) {
                skipLetterBtn.onclick = () => advanceOrComplete();
                skipLetterBtn.addEventListener('touchstart', (e) => { e.preventDefault(); skipLetterBtn.click(); }, { passive: false });
            }
            if (skipBtn) {
                skipBtn.onclick = () => {
                    callback(currentFilteredWords);
                    complete();
                };
                skipBtn.addEventListener('touchstart', (e) => { e.preventDefault(); skipBtn.click(); }, { passive: false });
            }
            break;
        }

        case 'loveLetters': {
            const loveLettersButton = document.getElementById('loveLettersButton');
            const loveLettersSkipButton = document.getElementById('loveLettersSkipButton');
            const loveLettersInput = document.getElementById('loveLettersInput');
            const groups = getLoveLettersGroups();
            const rowCount = groups.length;
            if (loveLettersInput) loveLettersInput.maxLength = rowCount;
            if (loveLettersButton && loveLettersInput) {
                loveLettersButton.onclick = () => {
                    const raw = loveLettersInput.value.trim();
                    const digits = raw.replace(/\D/g, '');
                    if (digits.length !== rowCount) {
                        alert(`Enter exactly ${rowCount} digit(s) (one per row).`);
                        return;
                    }
                    let valid = true;
                    for (let i = 0; i < rowCount; i++) {
                        const d = parseInt(digits[i], 10);
                        if (isNaN(d) || d < 0 || d > groups[i].size) {
                            valid = false;
                            break;
                        }
                    }
                    if (!valid) {
                        alert(`Each digit must be 0–${Math.max(...groups.map(g => g.size))} (max per row).`);
                        return;
                    }
                    const filtered = filterWordsByLoveLetters(currentFilteredWords, digits, groups);
                    currentFilteredWords = filtered;
                    displayResults(currentFilteredWords);
                    callback(currentFilteredWords);
                    document.getElementById('loveLettersFeature').classList.add('completed');
                    document.getElementById('loveLettersFeature').dispatchEvent(new Event('completed'));
                };
                loveLettersButton.addEventListener('touchstart', (e) => { e.preventDefault(); loveLettersButton.click(); }, { passive: false });
            }
            if (loveLettersSkipButton) {
                loveLettersSkipButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('loveLettersFeature').classList.add('completed');
                    document.getElementById('loveLettersFeature').dispatchEvent(new Event('completed'));
                };
                loveLettersSkipButton.addEventListener('touchstart', (e) => { e.preventDefault(); loveLettersSkipButton.click(); }, { passive: false });
            }
            if (loveLettersInput) {
                loveLettersInput.addEventListener('input', () => {
                    loveLettersInput.value = loveLettersInput.value.replace(/\D/g, '').slice(0, rowCount);
                });
                loveLettersInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') loveLettersButton.click(); });
            }
            break;
        }
        
        case 'originalLex': {
            const originalLexButton = document.getElementById('originalLexButton');
            const originalLexSkipButton = document.getElementById('originalLexSkipButton');
            const originalLexInput = document.getElementById('originalLexInput');
            
            // Find position with most variance and update display
            // ORIGINAL-LEX: Always ignore Position 1 (index 0) when picking the most efficient position.
            // This avoids suggesting Position 1 even if ADV-LEX's setting is OFF.
            const { position, letters } = findPositionWithMostVariance(currentFilteredWords, true);
            originalLexPosition = position;
            
            // Update position display
            const positionNumber = document.querySelector('#originalLexFeature .position-number');
            if (positionNumber) {
                positionNumber.textContent = position + 1; // Convert to 1-based position
            }
            
            // Update possible letters display
            const lettersList = document.querySelector('#originalLexFeature .letters-list');
            if (lettersList) {
                lettersList.textContent = letters.join(', ');
            }
            
            if (originalLexButton) {
                originalLexButton.onclick = () => {
                    const raw = (originalLexInput?.value ?? '').trim();
                    const letter = raw.length > 0 ? raw[0] : '';
                    if (letter) {
                        const filteredWords = filterWordsByOriginalLex(currentFilteredWords, originalLexPosition, letter);
                        callback(filteredWords);
                        document.getElementById('originalLexFeature').dispatchEvent(new Event('completed'));
                    } else {
                        alert('Please enter a word');
                    }
                };
                
                // Add touch event for mobile
                originalLexButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    originalLexButton.click();
                }, { passive: false });
            }
            
            if (originalLexSkipButton) {
                originalLexSkipButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('originalLexFeature').dispatchEvent(new Event('completed'));
                };
                
                // Add touch event for mobile
                originalLexSkipButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    originalLexSkipButton.click();
                }, { passive: false });
            }
            break;
        }

        case 'advLex': {
            const positionNumberEl = document.querySelector('#advLexFeature .position-number');
            const lettersListEl = document.querySelector('#advLexFeature .letters-list');
            const listContainer = document.getElementById('advLexWordList');
            const submitBtn = document.getElementById('advLexSubmitButton');
            const skipBtn = document.getElementById('advLexSkipButton');

            if (!listContainer || !submitBtn || !skipBtn) {
                callback(currentFilteredWords);
                const featureDiv = document.getElementById('advLexFeature');
                if (featureDiv) {
                    featureDiv.classList.add('completed');
                    featureDiv.dispatchEvent(new Event('completed'));
                }
                break;
            }

            // Find position with most variance and update display (optionally ignore Position 1 per Settings)
            const ignorePos1 = !!(appSettings && appSettings.advLexIgnorePosition1);
            const { position, letters } = findPositionWithMostVariance(currentFilteredWords, ignorePos1);
            const advLexPosition = position;

            if (positionNumberEl) {
                positionNumberEl.textContent = advLexPosition >= 0 ? (advLexPosition + 1).toString() : '-';
            }
            if (lettersListEl) {
                lettersListEl.textContent = letters.join(', ');
            }

            // If we couldn't find a valid position or letters, just allow SKIP
            if (advLexPosition < 0 || !letters || letters.length === 0) {
                listContainer.textContent = 'ADV-LEX unavailable for this wordlist step.';

                skipBtn.onclick = () => {
                    callback(currentFilteredWords);
                    const featureDiv = document.getElementById('advLexFeature');
                    if (featureDiv) {
                        featureDiv.classList.add('completed');
                        featureDiv.dispatchEvent(new Event('completed'));
                    }
                };
                skipBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    skipBtn.click();
                }, { passive: false });

                submitBtn.onclick = () => {
                    // No-op; require SKIP
                    alert('ADV-LEX is not available for this step. Please SKIP.');
                };
                submitBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    submitBtn.click();
                }, { passive: false });

                break;
            }

            // Build ADV-LEX words asynchronously from 19127 wordlist
            (async () => {
                try {
                    const sourceWords = await loadAdvLexWordList();
                    const lexSet = new Set(letters);
                    listContainer.innerHTML = '';

                    letters.forEach((letter, index) => {
                        const upperLetter = letter.toUpperCase();
                        const otherLetters = letters.filter(l => l !== letter)
                            .map(l => l.toUpperCase());

                        const candidates = [];
                        for (let i = 0; i < sourceWords.length; i++) {
                            const w = sourceWords[i];
                            if (!w.includes(upperLetter)) continue;
                            let bad = false;
                            for (let j = 0; j < otherLetters.length; j++) {
                                if (w.includes(otherLetters[j])) {
                                    bad = true;
                                    break;
                                }
                            }
                            if (bad) continue;
                            candidates.push(w);
                        }

                        let displayWord;
                        if (candidates.length === 0) {
                            displayWord = `ERROR (${upperLetter})`;
                        } else {
                            let maxLen = 0;
                            for (let i = 0; i < candidates.length; i++) {
                                if (candidates[i].length > maxLen) {
                                    maxLen = candidates[i].length;
                                }
                            }
                            const longest = candidates.filter(w => w.length === maxLen);
                            displayWord = longest[Math.floor(Math.random() * longest.length)];
                        }

                        const row = document.createElement('div');
                        row.className = 'advlex-row';
                        row.innerHTML = `
                            <label>
                                <input type="radio" name="advLexChoice" value="${index}" data-letter="${upperLetter}">
                                <span class="advlex-word">${displayWord}</span>
                            </label>
                        `;
                        listContainer.appendChild(row);
                    });
                } catch (e) {
                    console.error('Error building ADV-LEX word list:', e);
                    listContainer.textContent = 'Error building ADV-LEX words.';
                }
            })();

            submitBtn.onclick = () => {
                const choice = document.querySelector('input[name="advLexChoice"]:checked');
                if (!choice) {
                    alert('Select a word or use SKIP.');
                    return;
                }
                const letter = choice.getAttribute('data-letter');
                if (!letter) {
                    alert('Unexpected error: missing letter. Please SKIP.');
                    return;
                }

                const filteredWords = filterWordsByOriginalLex(currentFilteredWords, advLexPosition, letter);
                callback(filteredWords);

                const featureDiv = document.getElementById('advLexFeature');
                if (featureDiv) {
                    featureDiv.classList.add('completed');
                    featureDiv.dispatchEvent(new Event('completed'));
                }
            };
            submitBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                submitBtn.click();
            }, { passive: false });

            skipBtn.onclick = () => {
                callback(currentFilteredWords);
                const featureDiv = document.getElementById('advLexFeature');
                if (featureDiv) {
                    featureDiv.classList.add('completed');
                    featureDiv.dispatchEvent(new Event('completed'));
                }
            };
            skipBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                skipBtn.click();
            }, { passive: false });

            break;
        }

        case 'letterShapes': {
            const letterShapesRoot = document.getElementById('letterShapesFeature');
            const posBtns = letterShapesRoot ? letterShapesRoot.querySelectorAll('.letter-shapes-pos-btn') : [];
            const shapeBtns = letterShapesRoot ? letterShapesRoot.querySelectorAll('.letter-shapes-shape-btn') : [];
            const skipBtn = document.getElementById('letterShapesSkipButton');

            const setSelectedPosition = (n) => {
                if (!letterShapesRoot) return;
                letterShapesRoot.dataset.selectedPosition = String(n);
                posBtns.forEach((b) => {
                    b.classList.toggle('letter-shapes-pos-btn--selected', b.getAttribute('data-pos') === String(n));
                });
            };

            const applyShape = (shape) => {
                if (!letterShapesRoot) return;
                const posStr = letterShapesRoot.dataset.selectedPosition || '';
                const pos = parseInt(posStr, 10);
                if (!Number.isFinite(pos) || pos < 1 || pos > 6) {
                    alert('Choose a position from 1 to 6 first.');
                    return;
                }
                const filtered = filterWordsByLetterShapesPrefilter(currentFilteredWords, pos, shape);
                callback(filtered);
                letterShapesRoot.dispatchEvent(new Event('completed'));
            };

            posBtns.forEach((btn) => {
                const onPick = (e) => {
                    e.preventDefault();
                    const p = parseInt(btn.getAttribute('data-pos') || '0', 10);
                    if (p >= 1 && p <= 6) setSelectedPosition(p);
                };
                btn.addEventListener('click', onPick);
                btn.addEventListener('touchstart', (e) => { e.preventDefault(); onPick(e); }, { passive: false });
            });

            shapeBtns.forEach((btn) => {
                const onShape = (e) => {
                    e.preventDefault();
                    const shape = btn.getAttribute('data-shape');
                    if (shape === 'straight' || shape === 'mixed' || shape === 'curved') applyShape(shape);
                };
                btn.addEventListener('click', onShape);
                btn.addEventListener('touchstart', (e) => { e.preventDefault(); onShape(e); }, { passive: false });
            });

            if (skipBtn) {
                skipBtn.onclick = () => {
                    callback(currentFilteredWords);
                    if (letterShapesRoot) letterShapesRoot.dispatchEvent(new Event('completed'));
                };
                skipBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    skipBtn.click();
                }, { passive: false });
            }
            break;
        }

        case 'length': {
            const lengthButton = document.getElementById('lengthButton');
            const lengthSkipButton = document.getElementById('lengthSkipButton');
            const lengthInput = document.getElementById('lengthInput');
            
            if (lengthButton) {
                lengthButton.onclick = () => {
                    const input = lengthInput?.value.trim();
                    if (input) {
                        const length = parseInt(input);
                        if (length >= 3) {
                            let filteredWords;
                            if (appSettings && appSettings.lengthBuffer1) {
                                const minLen = Math.max(1, length - 1);
                                const maxLen = length + 1;
                                filteredWords = currentFilteredWords.filter(word => {
                                    const len = word.length;
                                    return len >= minLen && len <= maxLen;
                                });
                            } else {
                                filteredWords = filterWordsByLength(currentFilteredWords, length);
                            }
                            callback(filteredWords);
                            document.getElementById('lengthFeature').dispatchEvent(new Event('completed'));
                        } else {
                            alert('Please enter a length of 3 or more');
                        }
                    } else {
                        alert('Please enter a length');
                    }
                };
                
                // Add touch event for mobile
                lengthButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    lengthButton.click();
                }, { passive: false });
            }
            
            if (lengthSkipButton) {
                lengthSkipButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('lengthFeature').dispatchEvent(new Event('completed'));
                };
                
                // Add touch event for mobile
                lengthSkipButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    lengthSkipButton.click();
                }, { passive: false });
            }
            break;
        }

        case 'scrabble': {
            const scrabbleButton = document.getElementById('scrabbleButton');
            const scrabbleSkipButton = document.getElementById('scrabbleSkipButton');
            const scrabbleInput = document.getElementById('scrabbleInput');
            
            if (scrabbleButton) {
                scrabbleButton.onclick = () => {
                    const input = scrabbleInput?.value.trim();
                    if (input) {
                        const score = parseInt(input);
                        if (!isNaN(score) && score > 0) {
                            const useBuffer = !!(appSettings && appSettings.scrabbleBuffer1);
                            const filteredWords = useBuffer
                                ? filterWordsByScrabble1(currentFilteredWords, score)
                                : filterWordsByScrabble(currentFilteredWords, score);
                            callback(filteredWords);
                            document.getElementById('scrabbleFeature').classList.add('completed');
                            document.getElementById('scrabbleFeature').dispatchEvent(new Event('completed'));
                        } else {
                            alert('Please enter a valid positive number');
                        }
                    } else {
                        alert('Please enter a Scrabble score');
                    }
                };
                
                // Add touch event for mobile
                scrabbleButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    scrabbleButton.click();
                }, { passive: false });
            }
            
            if (scrabbleSkipButton) {
                scrabbleSkipButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('scrabbleFeature').classList.add('completed');
                    document.getElementById('scrabbleFeature').dispatchEvent(new Event('completed'));
                };
                
                // Add touch event for mobile
                scrabbleSkipButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    scrabbleSkipButton.click();
                }, { passive: false });
            }
            break;
        }

        case 'scrabble1': {
            const scrabble1Button = document.getElementById('scrabble1Button');
            const scrabble1SkipButton = document.getElementById('scrabble1SkipButton');
            const scrabble1Input = document.getElementById('scrabble1Input');
            
            if (scrabble1Button) {
                scrabble1Button.onclick = () => {
                    const input = scrabble1Input?.value.trim();
                    if (input) {
                        const score = parseInt(input);
                        if (!isNaN(score) && score > 0) {
                            const filteredWords = filterWordsByScrabble1(currentFilteredWords, score);
                            callback(filteredWords);
                            document.getElementById('scrabble1Feature').classList.add('completed');
                            document.getElementById('scrabble1Feature').dispatchEvent(new Event('completed'));
                        } else {
                            alert('Please enter a valid positive number');
                        }
                    } else {
                        alert('Please enter a score');
                    }
                };
                
                scrabble1Button.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    scrabble1Button.click();
                }, { passive: false });
            }
            
            if (scrabble1SkipButton) {
                scrabble1SkipButton.onclick = () => {
                    scrabble1ExactMatchSet = new Set();
                    callback(currentFilteredWords);
                    document.getElementById('scrabble1Feature').classList.add('completed');
                    document.getElementById('scrabble1Feature').dispatchEvent(new Event('completed'));
                };
                
                scrabble1SkipButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    scrabble1SkipButton.click();
                }, { passive: false });
            }
            break;
        }

        case 'sologram': {
            const sologramFeature = document.getElementById('sologramFeature');
            const sologramDisplay = document.getElementById('sologramDisplay');
            const sologramBookLabel = document.getElementById('sologramBookLabel');
            const sologramYBtn = document.getElementById('sologramYBtn');
            const sologramNBtn = document.getElementById('sologramNBtn');
            const sologramBackspaceBtn = document.getElementById('sologramBackspaceBtn');
            const sologramButton = document.getElementById('sologramButton');
            const sologramSkipButton = document.getElementById('sologramSkipButton');
            const getSologramString = () => (sologramFeature?.dataset?.sologramYn || '');
            const setSologramString = (s) => {
                if (sologramFeature) sologramFeature.dataset.sologramYn = s;
                if (sologramDisplay) sologramDisplay.textContent = s || '(empty)';
            };
            const bookId = (appSettings && appSettings.sologramBook) || 'all';
            const group = SOLOGRAM_WORD_GROUPS[bookId] || SOLOGRAM_WORD_GROUPS.all;
            if (sologramBookLabel) sologramBookLabel.textContent = group.label;
            if (sologramYBtn) {
                sologramYBtn.onclick = () => setSologramString(getSologramString() + 'Y');
                sologramYBtn.addEventListener('touchstart', (e) => { e.preventDefault(); sologramYBtn.click(); }, { passive: false });
            }
            if (sologramNBtn) {
                sologramNBtn.onclick = () => setSologramString(getSologramString() + 'N');
                sologramNBtn.addEventListener('touchstart', (e) => { e.preventDefault(); sologramNBtn.click(); }, { passive: false });
            }
            if (sologramBackspaceBtn) {
                sologramBackspaceBtn.onclick = () => setSologramString(getSologramString().slice(0, -1));
                sologramBackspaceBtn.addEventListener('touchstart', (e) => { e.preventDefault(); sologramBackspaceBtn.click(); }, { passive: false });
            }
            if (sologramButton) {
                sologramButton.onclick = () => {
                    const ynOnly = getSologramString();
                    if (ynOnly.length > 0) {
                        lastSologramYnString = ynOnly;
                        const filteredWords = filterWordsBySologram(currentFilteredWords, ynOnly);
                        callback(filteredWords);
                        document.getElementById('sologramFeature').classList.add('completed');
                        document.getElementById('sologramFeature').dispatchEvent(new Event('completed'));
                    } else {
                        alert('Add at least one Y or N (use the Y and N buttons).');
                    }
                };
                sologramButton.addEventListener('touchstart', (e) => { e.preventDefault(); sologramButton.click(); }, { passive: false });
            }
            if (sologramSkipButton) {
                sologramSkipButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('sologramFeature').classList.add('completed');
                    document.getElementById('sologramFeature').dispatchEvent(new Event('completed'));
                };
                sologramSkipButton.addEventListener('touchstart', (e) => { e.preventDefault(); sologramSkipButton.click(); }, { passive: false });
            }
            setSologramString(''); // reset when step is shown
            break;
        }

        case 'scramble': {
            const scrambleButton = document.getElementById('scrambleButton');
            const scrambleSkipButton = document.getElementById('scrambleSkipButton');
            const scrambleInput = document.getElementById('scrambleInput');
            if (scrambleInput) {
                scrambleInput.addEventListener('input', (e) => {
                    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
                });
            }
            if (scrambleButton && scrambleInput) {
                scrambleButton.onclick = () => {
                    const input = scrambleInput.value.trim();
                    if (!input || input.length === 0) {
                        alert('Please enter a letter string');
                        return;
                    }
                    const usePosition = !!(appSettings && appSettings.decodePositionOn);
                    let specifiedPosition = null;
                    if (usePosition && appSettings.decodePosition != null) {
                        const pos = parseInt(appSettings.decodePosition, 10);
                        if (pos >= 1 && pos <= input.length) {
                            specifiedPosition = pos;
                        } else {
                            alert(`Truth position must be between 1 and ${input.length} for this string.`);
                            return;
                        }
                    }
                    const filteredWords = filterWordsByScramble(currentFilteredWords, input, true, specifiedPosition);
                    callback(filteredWords);
                    document.getElementById('scrambleFeature').classList.add('completed');
                    document.getElementById('scrambleFeature').dispatchEvent(new Event('completed'));
                };
                scrambleButton.addEventListener('touchstart', (e) => { e.preventDefault(); scrambleButton.click(); }, { passive: false });
            }
            if (scrambleSkipButton) {
                scrambleSkipButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('scrambleFeature').classList.add('completed');
                    document.getElementById('scrambleFeature').dispatchEvent(new Event('completed'));
                };
                scrambleSkipButton.addEventListener('touchstart', (e) => { e.preventDefault(); scrambleSkipButton.click(); }, { passive: false });
            }
            break;
        }

        case 'mostFrequent': {
            const frequentYesBtn = document.getElementById('frequentYesBtn');
            const frequentNoBtn = document.getElementById('frequentNoBtn');
            const frequentSkipButton = document.getElementById('frequentSkipButton');
            const letterDisplay = document.querySelector('#mostFrequentFeature .letter');
            
            // Find and display most frequent letter (will skip already-answered letters)
            mostFrequentLetter = findMostFrequentLetter(currentFilteredWords);
            
            if (letterDisplay) {
                if (mostFrequentLetter) {
                    letterDisplay.textContent = mostFrequentLetter;
                    letterDisplay.style.color = '#000'; // Normal color
                    // Enable buttons if we have a letter
                    if (frequentYesBtn) frequentYesBtn.disabled = false;
                    if (frequentNoBtn) frequentNoBtn.disabled = false;
                } else {
                    letterDisplay.textContent = 'No more unique letters';
                    // Disable buttons if no more letters
                    if (frequentYesBtn) frequentYesBtn.disabled = true;
                    if (frequentNoBtn) frequentNoBtn.disabled = true;
                }
            }
            
            if (frequentYesBtn) {
                frequentYesBtn.onclick = () => {
                    if (mostFrequentLetter) {
                        // Update workflow state
                        workflowState.confirmedLetters.add(mostFrequentLetter);
                        console.log(`MOST FREQUENT: ${mostFrequentLetter} confirmed`);
                        logWorkflowState();
                        
                        const filteredWords = filterWordsByMostFrequent(currentFilteredWords, mostFrequentLetter, true);
                        callback(filteredWords);
                        document.getElementById('mostFrequentFeature').classList.add('completed');
                        document.getElementById('mostFrequentFeature').dispatchEvent(new Event('completed'));
                    }
                };
                
                // Add touch event for mobile
                frequentYesBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    if (!frequentYesBtn.disabled) {
                        frequentYesBtn.click();
                    }
                }, { passive: false });
            }
            
            if (frequentNoBtn) {
                frequentNoBtn.onclick = () => {
                    if (mostFrequentLetter) {
                        // Update workflow state
                        workflowState.excludedLetters.add(mostFrequentLetter);
                        console.log(`MOST FREQUENT: ${mostFrequentLetter} excluded`);
                        logWorkflowState();
                        
                        const filteredWords = filterWordsByMostFrequent(currentFilteredWords, mostFrequentLetter, false);
                        callback(filteredWords);
                        document.getElementById('mostFrequentFeature').classList.add('completed');
                        document.getElementById('mostFrequentFeature').dispatchEvent(new Event('completed'));
                    }
                };
                
                // Add touch event for mobile
                frequentNoBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    if (!frequentNoBtn.disabled) {
                        frequentNoBtn.click();
                    }
                }, { passive: false });
            }
            
            if (frequentSkipButton) {
                frequentSkipButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('mostFrequentFeature').classList.add('completed');
                    document.getElementById('mostFrequentFeature').dispatchEvent(new Event('completed'));
                };
                
                // Add touch event for mobile
                frequentSkipButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    frequentSkipButton.click();
                }, { passive: false });
            }
            break;
        }
        case 'mute': {
            const engine = window.muteBinaryEngine || {};
            const letterEl = document.getElementById('muteCurrentLetter');
            const leftBtn = document.getElementById('muteLeftButton');
            const rightBtn = document.getElementById('muteRightButton');

            // Reset MUTE state
            muteSequence = [];
            muteLetterIndex = 0;
            muteUsedLetters = new Set();
            muteDynamicSequence = [];

            const modeSetting = (appSettings && appSettings.muteLetterMode) || 'az';
            const customSeq = (appSettings && appSettings.muteCustomSequence) || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

            const getMuteLetterParams = () => {
                if (modeSetting === 'az') {
                    return { effectiveMode: 'az', seq: muteLetterSequence, dyn: [] };
                }
                if (modeSetting === 'custom') {
                    // While within the custom string length, use fixed custom letters.
                    // After it's exhausted (muteLetterIndex >= customSeq.length), fall back to Most Frequent.
                    const upperCustom = String(customSeq || '').toUpperCase();
                    if (muteLetterIndex < upperCustom.length) {
                        return { effectiveMode: 'customFixed', seq: upperCustom, dyn: [] };
                    }
                    return { effectiveMode: 'mostFrequent', seq: '', dyn: muteDynamicSequence };
                }
                // modeSetting === 'mostFrequent'
                return { effectiveMode: 'mostFrequent', seq: '', dyn: muteDynamicSequence };
            };

            // Ensure a dynamic letter exists for most-frequent modes *before* first filter
            const initialParams = getMuteLetterParams();
            if (initialParams.effectiveMode === 'mostFrequent') {
                const nextLetter = engine.selectNextDynamicLetter
                    ? engine.selectNextDynamicLetter(currentFilteredWords, muteUsedLetters)
                    : null;
                if (nextLetter) {
                    muteUsedLetters.add(nextLetter);
                    if (!muteDynamicSequence.includes(nextLetter)) {
                        muteDynamicSequence.push(nextLetter);
                    }
                }
            }
            const initial = engine.filterWords
                ? engine.filterWords(currentFilteredWords, muteSequence, muteLetterIndex, initialParams.seq, initialParams.dyn)
                : { leftWords: currentFilteredWords, rightWords: currentFilteredWords, currentLetter: '' };

            displayMuteResults(initial.leftWords, initial.rightWords);
            if (letterEl) letterEl.textContent = initial.currentLetter || '-';
            if (initialParams.effectiveMode === 'mostFrequent' && initial.currentLetter) {
                muteUsedLetters.add(initial.currentLetter);
                if (!muteDynamicSequence.includes(initial.currentLetter)) {
                    muteDynamicSequence.push(initial.currentLetter);
                }
            }

            const makeChoice = (choice) => {
                if (!engine.filterWords) return;
                muteSequence.push(choice);
                // Letter index should advance one step per choice; use current sequence length
                muteLetterIndex = muteSequence.length;

                const params = getMuteLetterParams();
                if (params.effectiveMode === 'mostFrequent') {
                    const nextLetter = engine.selectNextDynamicLetter
                        ? engine.selectNextDynamicLetter(currentFilteredWords, muteUsedLetters)
                        : null;
                    if (nextLetter) {
                        muteUsedLetters.add(nextLetter);
                        if (!muteDynamicSequence.includes(nextLetter)) {
                            muteDynamicSequence.push(nextLetter);
                        }
                    }
                }
                const res = engine.filterWords(
                    currentFilteredWords,
                    muteSequence,
                    muteLetterIndex,
                    params.seq,
                    params.dyn
                );

                displayMuteResults(res.leftWords, res.rightWords);
                if (letterEl) letterEl.textContent = res.currentLetter || '-';
                if (params.effectiveMode === 'mostFrequent' && res.currentLetter) {
                    muteUsedLetters.add(res.currentLetter);
                    if (!muteDynamicSequence.includes(res.currentLetter)) {
                        muteDynamicSequence.push(res.currentLetter);
                    }
                }

                // For now, keep both interpretations in play: union of left/right
                const combined = Array.from(new Set([...res.leftWords, ...res.rightWords]));
                currentFilteredWords = combined;
                updateWordCount(currentFilteredWords.length);
            };

            if (leftBtn) {
                leftBtn.onclick = () => makeChoice('L');
            }
            if (rightBtn) {
                rightBtn.onclick = () => makeChoice('R');
            }

            // Do not call callback yet; next feature will see narrowed currentFilteredWords
            break;
        }
        case 'muteDuo': {
            const engine = window.muteBinaryEngine || {};

            const letterEl = document.getElementById('muteDuoCurrentLetter');
            const btnUp = document.getElementById('muteDuoButtonUp');
            const btnRight = document.getElementById('muteDuoButtonRight');
            const btnDown = document.getElementById('muteDuoButtonDown');
            const btnLeft = document.getElementById('muteDuoButtonLeft');

            // Two independent candidate sets (Word 1, Word 2), both starting from currentFilteredWords
            let candidates1 = currentFilteredWords.slice();
            let candidates2 = currentFilteredWords.slice();

            // Reset DUO state
            muteDuoSequence1 = [];
            muteDuoSequence2 = [];
            muteDuoLetterIndex = 0;
            muteDuoUsedLetters = new Set();
            muteDuoDynamicSequence = [];

            const duoModeSetting = (appSettings && appSettings.muteLetterMode) || 'az';
            const duoCustomSeq = (appSettings && appSettings.muteCustomSequence) || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

            const getDuoLetterParams = () => {
                if (duoModeSetting === 'az') {
                    return { effectiveMode: 'az', seq: muteDuoLetterSequence, dyn: [] };
                }
                if (duoModeSetting === 'custom') {
                    const upperCustom = String(duoCustomSeq || '').toUpperCase();
                    if (muteDuoLetterIndex < upperCustom.length) {
                        return { effectiveMode: 'customFixed', seq: upperCustom, dyn: [] };
                    }
                    return { effectiveMode: 'mostFrequent', seq: '', dyn: muteDuoDynamicSequence };
                }
                // duoModeSetting === 'mostFrequent'
                return { effectiveMode: 'mostFrequent', seq: '', dyn: muteDuoDynamicSequence };
            };

            const updateAll = () => {
                if (!engine.filterWords) {
                    displayMuteDuoResults(candidates1, [], candidates2, []);
                    if (letterEl) letterEl.textContent = '-';
                    return;
                }

                const params = getDuoLetterParams();
                if (params.effectiveMode === 'mostFrequent') {
                    const unionWords = Array.from(new Set([...candidates1, ...candidates2]));
                    const nextLetter = engine.selectNextDynamicLetter
                        ? engine.selectNextDynamicLetter(unionWords, muteDuoUsedLetters)
                        : null;
                    if (nextLetter) {
                        muteDuoUsedLetters.add(nextLetter);
                        if (!muteDuoDynamicSequence.includes(nextLetter)) {
                            muteDuoDynamicSequence.push(nextLetter);
                        }
                    }
                }

                const res1 = engine.filterWords(
                    candidates1,
                    muteDuoSequence1,
                    muteDuoLetterIndex,
                    params.seq,
                    params.dyn
                );
                const res2 = engine.filterWords(
                    candidates2,
                    muteDuoSequence2,
                    muteDuoLetterIndex,
                    params.seq,
                    params.dyn
                );

                // Keep left/right separate for display
                const word1Left = res1.leftWords;
                const word1Right = res1.rightWords;
                const word2Left = res2.leftWords;
                const word2Right = res2.rightWords;

                // Update candidate sets as union of interpretations for each word
                candidates1 = Array.from(new Set([...word1Left, ...word1Right]));
                candidates2 = Array.from(new Set([...word2Left, ...word2Right]));

                displayMuteDuoResults(word1Left, word1Right, word2Left, word2Right);

                if (letterEl) {
                    // Use the same shared letter for display; prefer non-empty letter from either result
                    const letter = res1.currentLetter || res2.currentLetter || '-';
                    letterEl.textContent = letter;
                    if (params.effectiveMode === 'mostFrequent' && letter && letter !== '-') {
                        muteDuoUsedLetters.add(letter);
                        if (!muteDuoDynamicSequence.includes(letter)) {
                            muteDuoDynamicSequence.push(letter);
                        }
                    }
                }

                // For downstream features, keep union of both candidate sets (across both interpretations and both words)
                const union = Array.from(new Set([...word1Left, ...word1Right, ...word2Left, ...word2Right]));
                currentFilteredWords = union;
                updateWordCount(currentFilteredWords.length);
            };

            // Map a single button press to (choice for word1, choice for word2)
            const applyCombo = (choice1, choice2) => {
                if (!engine.filterWords) return;

                muteDuoSequence1.push(choice1);
                muteDuoSequence2.push(choice2);

                // Shared letter stream: increment index once per combo press
                muteDuoLetterIndex = muteDuoSequence1.length;

                updateAll();
            };

            // Initial display
            updateAll();

            // Button wiring – mirror 2 PERSON PERFORM style combos:
            // Up:    "1 & 4"  → (L, R)
            // Right: "2 & 4"  → (R, R)
            // Down:  "2 & 3"  → (R, L)
            // Left:  "1 & 3"  → (L, L)
            if (btnUp) {
                btnUp.onclick = () => applyCombo('L', 'R');
            }
            if (btnRight) {
                btnRight.onclick = () => applyCombo('R', 'R');
            }
            if (btnDown) {
                btnDown.onclick = () => applyCombo('R', 'L');
            }
            if (btnLeft) {
                btnLeft.onclick = () => applyCombo('L', 'L');
            }

            // As with MUTE, do not call callback; workflow continues with narrowed currentFilteredWords
            break;
        }

        case 'leastFrequent': {
            const leastFrequentYesBtn = document.getElementById('leastFrequentYesBtn');
            const leastFrequentNoBtn = document.getElementById('leastFrequentNoBtn');
            const leastFrequentSkipButton = document.getElementById('leastFrequentSkipButton');
            const letterDisplay = document.querySelector('#leastFrequentFeature .letter');
            
            // Find and display least frequent letter (will skip already-answered letters)
            leastFrequentLetter = findLeastFrequentLetter(currentFilteredWords);
            
            if (letterDisplay) {
                if (leastFrequentLetter) {
                    letterDisplay.textContent = leastFrequentLetter;
                    letterDisplay.style.color = '#000'; // Normal color
                    // Enable buttons if we have a letter
                    if (leastFrequentYesBtn) leastFrequentYesBtn.disabled = false;
                    if (leastFrequentNoBtn) leastFrequentNoBtn.disabled = false;
                } else {
                    letterDisplay.textContent = 'No more unique letters';
                    // Disable buttons if no more letters
                    if (leastFrequentYesBtn) leastFrequentYesBtn.disabled = true;
                    if (leastFrequentNoBtn) leastFrequentNoBtn.disabled = true;
                }
            }
            
            if (leastFrequentYesBtn) {
                leastFrequentYesBtn.onclick = () => {
                    if (leastFrequentLetter) {
                        // Update workflow state
                        workflowState.confirmedLetters.add(leastFrequentLetter);
                        console.log(`LEAST FREQUENT: ${leastFrequentLetter} confirmed`);
                        logWorkflowState();
                        
                        const filteredWords = filterWordsByLeastFrequent(currentFilteredWords, leastFrequentLetter, true);
                        callback(filteredWords);
                        document.getElementById('leastFrequentFeature').classList.add('completed');
                        document.getElementById('leastFrequentFeature').dispatchEvent(new Event('completed'));
                    }
                };
                
                // Add touch event for mobile
                leastFrequentYesBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    if (!leastFrequentYesBtn.disabled) {
                        leastFrequentYesBtn.click();
                    }
                }, { passive: false });
            }
            
            if (leastFrequentNoBtn) {
                leastFrequentNoBtn.onclick = () => {
                    if (leastFrequentLetter) {
                        // Update workflow state
                        workflowState.excludedLetters.add(leastFrequentLetter);
                        console.log(`LEAST FREQUENT: ${leastFrequentLetter} excluded`);
                        logWorkflowState();
                        
                        const filteredWords = filterWordsByLeastFrequent(currentFilteredWords, leastFrequentLetter, false);
                        callback(filteredWords);
                        document.getElementById('leastFrequentFeature').classList.add('completed');
                        document.getElementById('leastFrequentFeature').dispatchEvent(new Event('completed'));
                    }
                };
                
                // Add touch event for mobile
                leastFrequentNoBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    if (!leastFrequentNoBtn.disabled) {
                        leastFrequentNoBtn.click();
                    }
                }, { passive: false });
            }
            
            if (leastFrequentSkipButton) {
                leastFrequentSkipButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('leastFrequentFeature').classList.add('completed');
                    document.getElementById('leastFrequentFeature').dispatchEvent(new Event('completed'));
                };
                
                // Add touch event for mobile
                leastFrequentSkipButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    leastFrequentSkipButton.click();
                }, { passive: false });
            }
            break;
        }

        case 'notIn': {
            const notInButton = document.getElementById('notInButton');
            const notInSkipButton = document.getElementById('notInSkipButton');
            const notInInput = document.getElementById('notInInput');

            if (notInButton && notInInput && notInSkipButton) {
                // Remove any existing event listeners
                const newNotInButton = notInButton.cloneNode(true);
                const newNotInSkipButton = notInSkipButton.cloneNode(true);
                const newNotInInput = notInInput.cloneNode(true);
                
                notInButton.parentNode.replaceChild(newNotInButton, notInButton);
                notInSkipButton.parentNode.replaceChild(newNotInSkipButton, notInSkipButton);
                notInInput.parentNode.replaceChild(newNotInInput, notInInput);

                newNotInButton.addEventListener('click', () => {
                    const letters = newNotInInput.value.toLowerCase();
                    if (letters) {
                        filterWordsByNotIn(letters);
                        callback(currentFilteredWords);
                        document.getElementById('notInFeature').classList.add('completed');
                        document.getElementById('notInFeature').dispatchEvent(new Event('completed'));
                    }
                });

                newNotInSkipButton.addEventListener('click', () => {
                    callback(currentFilteredWords);
                    document.getElementById('notInFeature').classList.add('completed');
                    document.getElementById('notInFeature').dispatchEvent(new Event('completed'));
                });

                // Add enter key support
                newNotInInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        newNotInButton.click();
                    }
                });

                // Add touch events for mobile
                newNotInButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    newNotInButton.click();
                }, { passive: false });

                newNotInSkipButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    newNotInSkipButton.click();
                }, { passive: false });
            }
            break;
        }

        case 'present': {
            const presentButton = document.getElementById('presentButton');
            const presentSkipButton = document.getElementById('presentSkipButton');
            const presentInput = document.getElementById('presentInput');

            if (presentButton && presentInput && presentSkipButton) {
                const newPresentButton = presentButton.cloneNode(true);
                const newPresentSkipButton = presentSkipButton.cloneNode(true);
                const newPresentInput = presentInput.cloneNode(true);
                presentButton.parentNode.replaceChild(newPresentButton, presentButton);
                presentSkipButton.parentNode.replaceChild(newPresentSkipButton, presentSkipButton);
                presentInput.parentNode.replaceChild(newPresentInput, presentInput);

                newPresentButton.addEventListener('click', () => {
                    const letters = newPresentInput.value.trim();
                    if (letters) {
                        filterWordsByPresent(letters);
                        callback(currentFilteredWords);
                        document.getElementById('presentFeature').classList.add('completed');
                        document.getElementById('presentFeature').dispatchEvent(new Event('completed'));
                    }
                });

                newPresentSkipButton.addEventListener('click', () => {
                    callback(currentFilteredWords);
                    document.getElementById('presentFeature').classList.add('completed');
                    document.getElementById('presentFeature').dispatchEvent(new Event('completed'));
                });

                newPresentInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        newPresentButton.click();
                    }
                });

                newPresentButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    newPresentButton.click();
                }, { passive: false });

                newPresentSkipButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    newPresentSkipButton.click();
                }, { passive: false });
            }
            break;
        }

        case 'anywhere': {
            const anywhereInput = document.getElementById('anywhereInput');
            const anywhereButton = document.getElementById('anywhereButton');
            const anywhereSkipButton = document.getElementById('anywhereSkipButton');
            if (anywhereInput) {
                anywhereInput.addEventListener('input', (e) => {
                    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
                });
                anywhereInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') anywhereButton?.click(); });
            }
            if (anywhereButton) {
                anywhereButton.onclick = () => {
                    const two = parseTwoConsonants(anywhereInput?.value);
                    if (!two) {
                        alert('Enter exactly two consonants (no vowels).');
                        return;
                    }
                    const filteredWords = filterWordsByAnywhere(currentFilteredWords, two);
                    callback(filteredWords);
                    document.getElementById('anywhereFeature').classList.add('completed');
                    document.getElementById('anywhereFeature').dispatchEvent(new Event('completed'));
                };
                anywhereButton.addEventListener('touchstart', (e) => { e.preventDefault(); anywhereButton.click(); }, { passive: false });
            }
            if (anywhereSkipButton) {
                anywhereSkipButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('anywhereFeature').classList.add('completed');
                    document.getElementById('anywhereFeature').dispatchEvent(new Event('completed'));
                };
                anywhereSkipButton.addEventListener('touchstart', (e) => { e.preventDefault(); anywhereSkipButton.click(); }, { passive: false });
            }
            break;
        }

        case 'together': {
            const togetherInput = document.getElementById('togetherInput');
            const togetherButton = document.getElementById('togetherButton');
            const togetherSkipButton = document.getElementById('togetherSkipButton');
            if (togetherInput) {
                togetherInput.addEventListener('input', (e) => {
                    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
                });
                togetherInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') togetherButton?.click(); });
            }
            if (togetherButton) {
                togetherButton.onclick = () => {
                    const two = parseTwoConsonants(togetherInput?.value);
                    if (!two) {
                        alert('Enter exactly two consonants (no vowels).');
                        return;
                    }
                    const filteredWords = filterWordsByTogether(currentFilteredWords, two);
                    callback(filteredWords);
                    document.getElementById('togetherFeature').classList.add('completed');
                    document.getElementById('togetherFeature').dispatchEvent(new Event('completed'));
                };
                togetherButton.addEventListener('touchstart', (e) => { e.preventDefault(); togetherButton.click(); }, { passive: false });
            }
            if (togetherSkipButton) {
                togetherSkipButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('togetherFeature').classList.add('completed');
                    document.getElementById('togetherFeature').dispatchEvent(new Event('completed'));
                };
                togetherSkipButton.addEventListener('touchstart', (e) => { e.preventDefault(); togetherSkipButton.click(); }, { passive: false });
            }
            break;
        }

        case 'middle': {
            const middleInput = document.getElementById('middleInput');
            const middleButton = document.getElementById('middleButton');
            const middleSkipButton = document.getElementById('middleSkipButton');
            if (middleInput) {
                middleInput.addEventListener('input', (e) => {
                    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
                });
                middleInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') middleButton?.click(); });
            }
            if (middleButton) {
                middleButton.onclick = () => {
                    const two = parseTwoConsonants(middleInput?.value);
                    if (!two) {
                        alert('Enter exactly two consonants (no vowels).');
                        return;
                    }
                    const filteredWords = filterWordsByMiddle(currentFilteredWords, two);
                    callback(filteredWords);
                    document.getElementById('middleFeature').classList.add('completed');
                    document.getElementById('middleFeature').dispatchEvent(new Event('completed'));
                };
                middleButton.addEventListener('touchstart', (e) => { e.preventDefault(); middleButton.click(); }, { passive: false });
            }
            if (middleSkipButton) {
                middleSkipButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('middleFeature').classList.add('completed');
                    document.getElementById('middleFeature').dispatchEvent(new Event('completed'));
                };
                middleSkipButton.addEventListener('touchstart', (e) => { e.preventDefault(); middleSkipButton.click(); }, { passive: false });
            }
            break;
        }

        case 'consonants': {
            const consonantsInput = document.getElementById('consonantsInput');
            const consonantsTogetherBtn = document.getElementById('consonantsTogetherBtn');
            const consonantsMiddleBtn = document.getElementById('consonantsMiddleBtn');
            const consonantsAnywhereBtn = document.getElementById('consonantsAnywhereBtn');
            const consonantsSkipBtn = document.getElementById('consonantsSkipBtn');
            const consonantsFeature = document.getElementById('consonantsFeature');
            function consonantsComplete(filtered) {
                callback(filtered);
                if (consonantsFeature) {
                    consonantsFeature.classList.add('completed');
                    consonantsFeature.dispatchEvent(new Event('completed'));
                }
            }
            if (consonantsInput) {
                consonantsInput.addEventListener('input', (e) => {
                    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
                });
                consonantsInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') consonantsTogetherBtn?.focus();
                });
            }
            if (consonantsTogetherBtn) {
                consonantsTogetherBtn.onclick = () => {
                    const two = parseTwoConsonants(consonantsInput?.value);
                    if (!two) {
                        alert('Enter exactly two consonants (no vowels).');
                        return;
                    }
                    consonantsComplete(filterWordsByTogether(currentFilteredWords, two));
                };
                consonantsTogetherBtn.addEventListener('touchstart', (e) => { e.preventDefault(); consonantsTogetherBtn.click(); }, { passive: false });
            }
            if (consonantsMiddleBtn) {
                consonantsMiddleBtn.onclick = () => {
                    const two = parseTwoConsonants(consonantsInput?.value);
                    if (!two) {
                        alert('Enter exactly two consonants (no vowels).');
                        return;
                    }
                    consonantsComplete(filterWordsByMiddle(currentFilteredWords, two));
                };
                consonantsMiddleBtn.addEventListener('touchstart', (e) => { e.preventDefault(); consonantsMiddleBtn.click(); }, { passive: false });
            }
            if (consonantsAnywhereBtn) {
                consonantsAnywhereBtn.onclick = () => {
                    const two = parseTwoConsonants(consonantsInput?.value);
                    if (!two) {
                        alert('Enter exactly two consonants (no vowels).');
                        return;
                    }
                    consonantsComplete(filterWordsByAnywhere(currentFilteredWords, two));
                };
                consonantsAnywhereBtn.addEventListener('touchstart', (e) => { e.preventDefault(); consonantsAnywhereBtn.click(); }, { passive: false });
            }
            if (consonantsSkipBtn) {
                consonantsSkipBtn.onclick = () => consonantsComplete(currentFilteredWords);
                consonantsSkipBtn.addEventListener('touchstart', (e) => { e.preventDefault(); consonantsSkipBtn.click(); }, { passive: false });
            }
            break;
        }

        case 'omega': {
            startOmega(callback);
            break;
        }

        case 'calculus': {
            startCalculus(callback);
            break;
        }

        case 'abcde': {
            const yesBtns = Array.from(document.querySelectorAll('.abcde-btn'));
            const doneBtn = document.getElementById('abcdeDoneButton');
            const skipBtn = document.getElementById('abcdeSkipButton');
            const noneBtn = document.getElementById('abcdeNoneButton');
            let yesLetters = [];

            yesBtns.forEach(btn => {
                btn.classList.remove('active');
                btn.onclick = () => {
                    const letter = btn.dataset.letter;
                    if (yesLetters.includes(letter)) {
                        yesLetters = yesLetters.filter(l => l !== letter);
                        btn.classList.remove('active');
                    } else {
                        yesLetters.push(letter);
                        btn.classList.add('active');
                    }
                };
                // Touch event for mobile
                btn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    btn.onclick();
                }, { passive: false });
            });

            if (doneBtn) {
                doneBtn.onclick = () => {
                    // Update workflow state with ABCDE selections
                    workflowState.abcdeSelection = new Set(yesLetters);
                    
                    // Add selected letters to confirmed letters
                    yesLetters.forEach(letter => {
                        workflowState.confirmedLetters.add(letter);
                    });
                    
                    // Add unselected letters to excluded letters
                    ['A', 'B', 'C', 'D', 'E'].forEach(letter => {
                        if (!yesLetters.includes(letter)) {
                            workflowState.excludedLetters.add(letter);
                        }
                    });
                    
                    console.log(`ABCDE feature completed. Selected: ${yesLetters.join(', ')}`);
                    logWorkflowState();
                    
                    const filteredWords = filterWordsByAbcde(currentFilteredWords, yesLetters);
                    callback(filteredWords);
                    const featureDiv = document.getElementById('abcdeFeature');
                    featureDiv.classList.add('completed');
                    featureDiv.dispatchEvent(new Event('completed'));
                };
                doneBtn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    doneBtn.onclick();
                }, { passive: false });
            }
            
            if (noneBtn) {
                noneBtn.onclick = () => {
                    // Update workflow state - exclude all ABCDE letters
                    workflowState.abcdeSelection = new Set([]);
                    
                    // Add all ABCDE letters to excluded letters
                    ['A', 'B', 'C', 'D', 'E'].forEach(letter => {
                        workflowState.excludedLetters.add(letter);
                    });
                    
                    console.log(`ABCDE feature completed. NONE selected - all letters excluded`);
                    logWorkflowState();
                    
                    // Filter out words containing any of A, B, C, D, E
                    const filteredWords = currentFilteredWords.filter(word => {
                        return !['A', 'B', 'C', 'D', 'E'].some(letter => 
                            word.toUpperCase().includes(letter)
                        );
                    });
                    
                    callback(filteredWords);
                    const featureDiv = document.getElementById('abcdeFeature');
                    featureDiv.classList.add('completed');
                    featureDiv.dispatchEvent(new Event('completed'));
                };
                noneBtn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    noneBtn.onclick();
                }, { passive: false });
            }
            
            if (skipBtn) {
                skipBtn.onclick = () => {
                    callback(currentFilteredWords);
                    const featureDiv = document.getElementById('abcdeFeature');
                    featureDiv.classList.add('completed');
                    featureDiv.dispatchEvent(new Event('completed'));
                };
                skipBtn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    skipBtn.onclick();
                }, { passive: false });
            }
            break;
        }
        case 'abc': {
            const yesBtns = Array.from(document.querySelectorAll('.abc-btn'));
            const doneBtn = document.getElementById('abcDoneButton');
            const skipBtn = document.getElementById('abcSkipButton');
            const noneBtn = document.getElementById('abcNoneButton');
            let yesLetters = [];

            yesBtns.forEach(btn => {
                btn.classList.remove('active');
                btn.onclick = () => {
                    const letter = btn.dataset.letter;
                    if (yesLetters.includes(letter)) {
                        yesLetters = yesLetters.filter(l => l !== letter);
                        btn.classList.remove('active');
                    } else {
                        yesLetters.push(letter);
                        btn.classList.add('active');
                    }
                };
                // Touch event for mobile
                btn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    btn.onclick();
                }, { passive: false });
            });

            if (doneBtn) {
                doneBtn.onclick = () => {
                    // Update workflow state with ABC selections
                    workflowState.abcSelection = new Set(yesLetters);
                    
                    // Add selected letters to confirmed letters
                    yesLetters.forEach(letter => {
                        workflowState.confirmedLetters.add(letter);
                    });
                    
                    // Add unselected letters to excluded letters
                    ['A', 'B', 'C'].forEach(letter => {
                        if (!yesLetters.includes(letter)) {
                            workflowState.excludedLetters.add(letter);
                        }
                    });
                    
                    console.log(`ABC feature completed. Selected: ${yesLetters.join(', ')}`);
                    logWorkflowState();
                    
                    const filteredWords = filterWordsByAbc(currentFilteredWords, yesLetters);
                    callback(filteredWords);
                    const featureDiv = document.getElementById('abcFeature');
                    featureDiv.classList.add('completed');
                    featureDiv.dispatchEvent(new Event('completed'));
                };
                doneBtn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    doneBtn.onclick();
                }, { passive: false });
            }
            
            if (noneBtn) {
                noneBtn.onclick = () => {
                    // Update workflow state - exclude all ABC letters
                    workflowState.abcSelection = new Set([]);
                    
                    // Add all ABC letters to excluded letters
                    ['A', 'B', 'C'].forEach(letter => {
                        workflowState.excludedLetters.add(letter);
                    });
                    
                    console.log(`ABC feature completed. NONE selected - all letters excluded`);
                    logWorkflowState();
                    
                    // Filter out words containing any of A, B, C
                    const filteredWords = currentFilteredWords.filter(word => {
                        return !['A', 'B', 'C'].some(letter => 
                            word.toUpperCase().includes(letter)
                        );
                    });
                    
                    callback(filteredWords);
                    const featureDiv = document.getElementById('abcFeature');
                    featureDiv.classList.add('completed');
                    featureDiv.dispatchEvent(new Event('completed'));
                };
                noneBtn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    noneBtn.onclick();
                }, { passive: false });
            }
            
            if (skipBtn) {
                skipBtn.onclick = () => {
                    callback(currentFilteredWords);
                    const featureDiv = document.getElementById('abcFeature');
                    featureDiv.classList.add('completed');
                    featureDiv.dispatchEvent(new Event('completed'));
                };
                skipBtn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    skipBtn.onclick();
                }, { passive: false });
            }
            break;
        }
        case 'pianoForte': {
            const yesBtns = Array.from(document.querySelectorAll('.piano-forte-btn'));
            const submitBtn = document.getElementById('pianoForteSubmitButton');
            const skipBtn = document.getElementById('pianoForteSkipButton');
            const noneBtn = document.getElementById('pianoForteNoneButton');
            const stringDisplay = document.getElementById('pianoForteString');
            let letterSequence = []; // Array to store the chronological sequence

            // Initialize display
            if (stringDisplay) {
                stringDisplay.textContent = '-';
            }

            yesBtns.forEach(btn => {
                btn.classList.remove('active');
                btn.onclick = () => {
                    const letter = btn.dataset.letter;
                    // Add letter to sequence (can be pressed multiple times)
                    letterSequence.push(letter);
                    
                    // Update display
                    if (stringDisplay) {
                        stringDisplay.textContent = letterSequence.join('');
                    }
                    
                    // Visual feedback - briefly highlight the button
                    btn.classList.add('active');
                    setTimeout(() => {
                        btn.classList.remove('active');
                    }, 200);
                };
                // Touch event for mobile
                btn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    btn.onclick();
                }, { passive: false });
            });

            if (submitBtn) {
                submitBtn.onclick = () => {
                    if (letterSequence.length === 0) {
                        alert('Please select at least one letter');
                        return;
                    }
                    
                    // Update workflow state with Piano Forte selections
                    workflowState.pianoForteSelection = letterSequence;
                    
                    // Get unique pressed letters and unpressed letters in the range
                    const pianoForteLetters = getPianoForteLetters();
                    const pressedLetters = new Set(letterSequence);
                    const unpressedLetters = pianoForteLetters.filter(
                        letter => !pressedLetters.has(letter)
                    );
                    
                    // Add pressed letters to confirmed letters
                    pressedLetters.forEach(letter => {
                        workflowState.confirmedLetters.add(letter);
                    });
                    
                    // Add unpressed letters to excluded letters
                    unpressedLetters.forEach(letter => {
                        workflowState.excludedLetters.add(letter);
                    });
                    
                    console.log(`Piano Forte feature completed. Sequence: ${letterSequence.join('')}`);
                    logWorkflowState();
                    
                    const filteredWords = filterWordsByPianoForte(currentFilteredWords, letterSequence);
                    callback(filteredWords);
                    const featureDiv = document.getElementById('pianoForteFeature');
                    featureDiv.classList.add('completed');
                    featureDiv.dispatchEvent(new Event('completed'));
                };
                submitBtn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    submitBtn.onclick();
                }, { passive: false });
            }
            
            if (noneBtn) {
                noneBtn.onclick = () => {
                    // Update workflow state - exclude all Piano Forte letters in the range
                    workflowState.pianoForteSelection = [];
                    const pianoForteLetters = getPianoForteLetters();
                    pianoForteLetters.forEach(letter => {
                        workflowState.excludedLetters.add(letter);
                    });
                    
                    console.log(`Piano Forte feature completed. NONE selected - all letters excluded`);
                    logWorkflowState();
                    
                    // Filter out words containing any letter in the range
                    const filteredWords = currentFilteredWords.filter(word => {
                        return !pianoForteLetters.some(letter => 
                            word.toUpperCase().includes(letter)
                        );
                    });
                    
                    callback(filteredWords);
                    const featureDiv = document.getElementById('pianoForteFeature');
                    featureDiv.classList.add('completed');
                    featureDiv.dispatchEvent(new Event('completed'));
                };
                noneBtn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    noneBtn.onclick();
                }, { passive: false });
            }
            
            if (skipBtn) {
                skipBtn.onclick = () => {
                    callback(currentFilteredWords);
                    const featureDiv = document.getElementById('pianoForteFeature');
                    featureDiv.classList.add('completed');
                    featureDiv.dispatchEvent(new Event('completed'));
                };
                skipBtn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    skipBtn.onclick();
                }, { passive: false });
            }
            break;
        }
        case 'pianoPiano': {
            const countBtns = Array.from(document.querySelectorAll('.piano-piano-btn'));
            const submitBtn = document.getElementById('pianoPianoSubmitButton');
            const skipBtn = document.getElementById('pianoPianoSkipButton');
            const noneBtn = document.getElementById('pianoPianoNoneButton');
            const countDisplay = document.getElementById('pianoPianoString');
            let selectedCount = null;

            // Initialize display
            if (countDisplay) {
                countDisplay.textContent = '-';
            }

            countBtns.forEach(btn => {
                btn.classList.remove('active');
                btn.onclick = () => {
                    // Remove active from all buttons
                    countBtns.forEach(b => b.classList.remove('active'));
                    
                    // Set selected count
                    selectedCount = parseInt(btn.dataset.count);
                    
                    // Update display
                    if (countDisplay) {
                        countDisplay.textContent = selectedCount.toString();
                    }
                    
                    // Visual feedback
                    btn.classList.add('active');
                };
                // Touch event for mobile
                btn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    btn.onclick();
                }, { passive: false });
            });

            if (submitBtn) {
                submitBtn.onclick = () => {
                    if (selectedCount === null) {
                        alert('Please select a count');
                        return;
                    }
                    
                    // Update workflow state
                    workflowState.pianoPianoSelection = selectedCount;
                    
                    console.log(`Piano Piano feature completed. Count: ${selectedCount}`);
                    logWorkflowState();
                    
                    const filteredWords = filterWordsByPianoPiano(currentFilteredWords, selectedCount);
                    callback(filteredWords);
                    const featureDiv = document.getElementById('pianoPianoFeature');
                    featureDiv.classList.add('completed');
                    featureDiv.dispatchEvent(new Event('completed'));
                };
                submitBtn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    submitBtn.onclick();
                }, { passive: false });
            }
            
            if (noneBtn) {
                noneBtn.onclick = () => {
                    // Filter out words containing any A-G letters
                    const filteredWords = currentFilteredWords.filter(word => {
                        const wordUpper = word.toUpperCase();
                        return !['A', 'B', 'C', 'D', 'E', 'F', 'G'].some(letter => 
                            wordUpper.includes(letter)
                        );
                    });
                    
                    callback(filteredWords);
                    const featureDiv = document.getElementById('pianoPianoFeature');
                    featureDiv.classList.add('completed');
                    featureDiv.dispatchEvent(new Event('completed'));
                };
                noneBtn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    noneBtn.onclick();
                }, { passive: false });
            }
            
            if (skipBtn) {
                skipBtn.onclick = () => {
                    callback(currentFilteredWords);
                    const featureDiv = document.getElementById('pianoPianoFeature');
                    featureDiv.classList.add('completed');
                    featureDiv.dispatchEvent(new Event('completed'));
                };
                skipBtn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    skipBtn.onclick();
                }, { passive: false });
            }
            break;
        }
        case 't9Length': {
            const t9LengthButton = document.getElementById('t9LengthButton');
            const t9LengthInput = document.getElementById('t9LengthInput');
            const t9LengthSkipButton = document.getElementById('t9LengthSkipButton');
            
            if (t9LengthButton && t9LengthInput) {
                t9LengthButton.onclick = () => {
                    const lengthValue = parseInt(t9LengthInput.value.trim());
                    if (isNaN(lengthValue) || lengthValue < 3) {
                        alert('Please enter a valid length (3 or greater)');
                        return;
                    }
                    
                    // Calculate T9 strings if not already done
                    calculateT9Strings(currentFilteredWords);
                    
                    let filteredWords;
                    if (appSettings && appSettings.t9LengthBuffer1) {
                        const minLen = Math.max(1, lengthValue - 1);
                        const maxLen = lengthValue + 1;
                        filteredWords = currentFilteredWords.filter(word => {
                            const t9String = t9StringsMap.get(word) || wordToT9(word);
                            const len = t9String.length;
                            return len >= minLen && len <= maxLen;
                        });
                    } else {
                        filteredWords = filterWordsByT9Length(currentFilteredWords, lengthValue);
                    }
                    callback(filteredWords);
                    document.getElementById('t9LengthFeature').classList.add('completed');
                    document.getElementById('t9LengthFeature').dispatchEvent(new Event('completed'));
                };
                
                t9LengthButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    t9LengthButton.onclick();
                }, { passive: false });
                
                // Enter key support
                t9LengthInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        t9LengthButton.onclick();
                    }
                });
            }
            
            if (t9LengthSkipButton) {
                t9LengthSkipButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('t9LengthFeature').classList.add('completed');
                    document.getElementById('t9LengthFeature').dispatchEvent(new Event('completed'));
                };
                
                t9LengthSkipButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    t9LengthSkipButton.onclick();
                }, { passive: false });
            }
            break;
        }
        case 't9LastTwo': {
            let selectedDigits = [];
            const t9LastTwoButtons = document.querySelectorAll('.t9-last-two-btn');
            const t9LastTwoDisplay = document.getElementById('t9LastTwoString');
            const t9LastTwoSubmitButton = document.getElementById('t9LastTwoSubmitButton');
            const t9LastTwoResetButton = document.getElementById('t9LastTwoResetButton');
            const t9LastTwoSkipButton = document.getElementById('t9LastTwoSkipButton');
            
            // Initialize display
            if (t9LastTwoDisplay) {
                t9LastTwoDisplay.textContent = '-';
            }
            
            // Number button handlers
            t9LastTwoButtons.forEach(btn => {
                btn.onclick = () => {
                    if (selectedDigits.length < 2) {
                        const digit = btn.dataset.digit;
                        selectedDigits.push(digit);
                        if (t9LastTwoDisplay) {
                            t9LastTwoDisplay.textContent = selectedDigits.join('');
                        }
                        btn.classList.add('active');
                    }
                };
                
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    if (selectedDigits.length < 2) {
                        const digit = btn.dataset.digit;
                        selectedDigits.push(digit);
                        if (t9LastTwoDisplay) {
                            t9LastTwoDisplay.textContent = selectedDigits.join('');
                        }
                        btn.classList.add('active');
                    }
                }, { passive: false });
            });
            
            // Submit button
            if (t9LastTwoSubmitButton) {
                t9LastTwoSubmitButton.onclick = () => {
                    if (selectedDigits.length !== 2) {
                        alert('Please select exactly 2 digits');
                        return;
                    }
                    
                    const lastTwo = selectedDigits.join('');
                    
                    // Calculate T9 strings if not already done
                    calculateT9Strings(currentFilteredWords);
                    
                    const filteredWords = filterWordsByT9LastTwo(currentFilteredWords, lastTwo);
                    callback(filteredWords);
                    document.getElementById('t9LastTwoFeature').classList.add('completed');
                    document.getElementById('t9LastTwoFeature').dispatchEvent(new Event('completed'));
                };
                
                t9LastTwoSubmitButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    t9LastTwoSubmitButton.onclick();
                }, { passive: false });
            }
            
            // Reset button
            if (t9LastTwoResetButton) {
                t9LastTwoResetButton.onclick = () => {
                    selectedDigits = [];
                    if (t9LastTwoDisplay) {
                        t9LastTwoDisplay.textContent = '-';
                    }
                    t9LastTwoButtons.forEach(btn => {
                        btn.classList.remove('active');
                    });
                };
                
                t9LastTwoResetButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    t9LastTwoResetButton.onclick();
                }, { passive: false });
            }
            
            // Skip button
            if (t9LastTwoSkipButton) {
                t9LastTwoSkipButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('t9LastTwoFeature').classList.add('completed');
                    document.getElementById('t9LastTwoFeature').dispatchEvent(new Event('completed'));
                };
                
                t9LastTwoSkipButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    t9LastTwoSkipButton.onclick();
                }, { passive: false });
            }
            break;
        }
        case 't9Last': {
            const t9LastButton = document.getElementById('t9LastButton');
            const t9LastGuessInput = document.getElementById('t9LastGuessInput');
            const t9LastActualInput = document.getElementById('t9LastActualInput');
            const t9LastSkipButton = document.getElementById('t9LastSkipButton');
            if (t9LastButton && t9LastActualInput) {
                t9LastButton.onclick = () => {
                    const actualRaw = (t9LastActualInput?.value || '').trim();
                    const actual = actualRaw.replace(/[^2-9]/g, '').slice(0, 2);
                    if (!actual) {
                        alert('Enter ACTUAL: 1 or 2 digits (2-9).');
                        return;
                    }
                    if (!/^[2-9]{1,2}$/.test(actual)) {
                        alert('ACTUAL must be digits 2-9 only (1 or 2 digits).');
                        return;
                    }
                    // Store GUESS digits for GUESS filter (only digits 2-9, max 2)
                    const guessRaw = (t9LastGuessInput?.value || '').trim();
                    t9LastGuessDigits = guessRaw.replace(/[^2-9]/g, '').slice(0, 2).split('');
                    t9LastActual = actual;
                    const filteredWords = filterWordsByT9Last(currentFilteredWords, actual);
                    callback(filteredWords);
                    document.getElementById('t9LastFeature').classList.add('completed');
                    document.getElementById('t9LastFeature').dispatchEvent(new Event('completed'));
                    // Show SEND TO HYDRA label (sum of GUESS + ACTUAL) for rest of workflow
                    // Use raw digit parse for sum - GUESS filter strips to 2-9, but HYDRA sum needs all digits (e.g. 11)
                    const guessForSum = (t9LastGuessInput?.value || '').trim().replace(/\D/g, '').slice(0, 2) || '0';
                    const actualForSum = (t9LastActualInput?.value || '').trim().replace(/\D/g, '').slice(0, 2) || '0';
                    const hydraSum = parseInt(guessForSum, 10) + parseInt(actualForSum, 10);
                    const hydraLabelContainer = document.getElementById('hydraLabelContainer');
                    const hydraLabelValue = document.getElementById('hydraLabelValue');
                    if (hydraLabelContainer && hydraLabelValue) {
                        hydraLabelValue.textContent = String(hydraSum);
                        hydraLabelContainer.style.display = 'block';
                    }
                };
                t9LastButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    t9LastButton.onclick();
                }, { passive: false });
            }
            if (t9LastSkipButton) {
                t9LastSkipButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('t9LastFeature').classList.add('completed');
                    document.getElementById('t9LastFeature').dispatchEvent(new Event('completed'));
                };
                t9LastSkipButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    t9LastSkipButton.onclick();
                }, { passive: false });
            }
            break;
        }
        case 't9Position5': {
            const t9Position5Button = document.getElementById('t9Position5Button');
            const t9Position5GuessInput = document.getElementById('t9Position5GuessInput');
            const t9Position5ActualInput = document.getElementById('t9Position5ActualInput');
            const t9Position5SkipButton = document.getElementById('t9Position5SkipButton');
            if (t9Position5Button && t9Position5ActualInput) {
                t9Position5Button.onclick = () => {
                    const actualRaw = (t9Position5ActualInput?.value || '').trim();
                    const actual = actualRaw.replace(/[^2-9]/g, '').slice(0, 1);
                    if (!actual) {
                        alert('Enter ACTUAL: 1 digit (2-9).');
                        return;
                    }
                    if (!/^[2-9]$/.test(actual)) {
                        alert('ACTUAL must be 1 digit 2-9.');
                        return;
                    }
                    const guessRaw = (t9Position5GuessInput?.value || '').trim();
                    t9LastGuessDigits = guessRaw.replace(/[^2-9]/g, '').slice(0, 1).split('');
                    const filteredWords = filterWordsByT9Position5(currentFilteredWords, actual);
                    callback(filteredWords);
                    document.getElementById('t9Position5Feature').classList.add('completed');
                    document.getElementById('t9Position5Feature').dispatchEvent(new Event('completed'));
                    const guessForSum = (t9Position5GuessInput?.value || '').trim().replace(/\D/g, '').slice(0, 1) || '0';
                    const actualForSum = (t9Position5ActualInput?.value || '').trim().replace(/\D/g, '').slice(0, 1) || '0';
                    const hydraSum = parseInt(guessForSum, 10) + parseInt(actualForSum, 10);
                    const hydraLabelContainer = document.getElementById('hydraLabelContainer');
                    const hydraLabelValue = document.getElementById('hydraLabelValue');
                    if (hydraLabelContainer && hydraLabelValue) {
                        hydraLabelValue.textContent = String(hydraSum);
                        hydraLabelContainer.style.display = 'block';
                    }
                };
                t9Position5Button.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    t9Position5Button.onclick();
                }, { passive: false });
            }
            if (t9Position5SkipButton) {
                t9Position5SkipButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('t9Position5Feature').classList.add('completed');
                    document.getElementById('t9Position5Feature').dispatchEvent(new Event('completed'));
                };
                t9Position5SkipButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    t9Position5SkipButton.onclick();
                }, { passive: false });
            }
            break;
        }
        case 't9Guess': {
            const t9GuessQuestions = document.getElementById('t9GuessQuestions');
            const t9GuessSubmitButton = document.getElementById('t9GuessSubmitButton');
            const t9GuessSkipButton = document.getElementById('t9GuessSkipButton');
            if (t9LastGuessDigits.length === 0) {
                if (t9GuessQuestions) {
                    t9GuessQuestions.innerHTML = '<p style="color: #666; text-align: center;">GUESS only works after LAST or POSITION 5 when a GUESS value was entered. Use SKIP to continue.</p>';
                }
                if (t9GuessSubmitButton) t9GuessSubmitButton.style.display = 'none';
            } else {
                const answers = t9LastGuessDigits.map(() => null);
                t9GuessQuestions.innerHTML = '';
                t9LastGuessDigits.forEach((digit, i) => {
                    const row = document.createElement('div');
                    row.style.display = 'flex';
                    row.style.flexWrap = 'wrap';
                    row.style.alignItems = 'center';
                    row.style.gap = '10px';
                    row.style.justifyContent = 'center';
                    const label = document.createElement('span');
                    label.textContent = `Is there a ${digit} in the first 4 digits of your T9 string?`;
                    label.style.fontWeight = 'bold';
                    const yesBtn = document.createElement('button');
                    yesBtn.className = 'yes-btn';
                    yesBtn.textContent = 'YES';
                    const noBtn = document.createElement('button');
                    noBtn.className = 'no-btn';
                    noBtn.textContent = 'NO';
                    const setAnswer = (val) => {
                        answers[i] = val;
                        yesBtn.style.opacity = val === true ? '1' : '0.5';
                        noBtn.style.opacity = val === false ? '1' : '0.5';
                        if (t9GuessSubmitButton) {
                            t9GuessSubmitButton.disabled = answers.some(a => a === null);
                            t9GuessSubmitButton.style.opacity = t9GuessSubmitButton.disabled ? '0.6' : '1';
                        }
                        // Auto-confirm when all answers are set (one question = on first answer; two = on second)
                        if (!answers.some(a => a === null)) {
                            const filteredWords = filterWordsByT9Guess(currentFilteredWords, t9LastGuessDigits, answers);
                            callback(filteredWords);
                            document.getElementById('t9GuessFeature').classList.add('completed');
                            document.getElementById('t9GuessFeature').dispatchEvent(new Event('completed'));
                        }
                    };
                    yesBtn.onclick = () => setAnswer(true);
                    noBtn.onclick = () => setAnswer(false);
                    yesBtn.addEventListener('touchstart', (e) => { e.preventDefault(); setAnswer(true); }, { passive: false });
                    noBtn.addEventListener('touchstart', (e) => { e.preventDefault(); setAnswer(false); }, { passive: false });
                    row.appendChild(label);
                    row.appendChild(yesBtn);
                    row.appendChild(noBtn);
                    t9GuessQuestions.appendChild(row);
                });
                const updateSubmitState = () => {
                    if (t9GuessSubmitButton) {
                        t9GuessSubmitButton.disabled = answers.some(a => a === null);
                        t9GuessSubmitButton.style.opacity = t9GuessSubmitButton.disabled ? '0.6' : '1';
                    }
                };
                updateSubmitState();
                if (t9GuessSubmitButton) {
                    t9GuessSubmitButton.onclick = () => {
                        if (answers.some(a => a === null)) return;
                        const filteredWords = filterWordsByT9Guess(currentFilteredWords, t9LastGuessDigits, answers);
                        callback(filteredWords);
                        document.getElementById('t9GuessFeature').classList.add('completed');
                        document.getElementById('t9GuessFeature').dispatchEvent(new Event('completed'));
                    };
                    t9GuessSubmitButton.addEventListener('touchstart', (e) => {
                        e.preventDefault();
                        t9GuessSubmitButton.onclick();
                    }, { passive: false });
                }
            }
            if (t9GuessSkipButton) {
                t9GuessSkipButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('t9GuessFeature').classList.add('completed');
                    document.getElementById('t9GuessFeature').dispatchEvent(new Event('completed'));
                };
                t9GuessSkipButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    t9GuessSkipButton.onclick();
                }, { passive: false });
            }
            break;
        }
                case 't9OneLie': {
            let selectedDigits = [];
            let lastActualLen = 0;
            if (options.previousStepFeature === 't9Last' && t9LastActual) {
                lastActualLen = t9LastActual.length;
            } else if (options.previousStepFeature === 't9LastTwo') {
                lastActualLen = 2;
            }
            const phase1 = document.getElementById('t9OneLiePhase1');
            const phase2 = document.getElementById('t9OneLiePhase2');
            const previewLine = document.getElementById('t9OneLiePreview');
            if (previewLine) {
                const workflowExecution = document.getElementById('workflowExecution');
                const resultsContainer = document.getElementById('results');
                const featureAreaEl = document.getElementById('featureArea');
                if (workflowExecution && resultsContainer && previewLine.parentNode !== workflowExecution) {
                    previewLine.parentNode.removeChild(previewLine);
                    workflowExecution.insertBefore(previewLine, featureAreaEl || null);
                }
            }
            const phase2Title = document.getElementById('t9OneLiePhase2Title');
            const truthDigitsContainer = document.getElementById('t9OneLieTruthDigits');
            const overrideLabel = document.getElementById('t9OneLieOverrideLabel');
            const overrideRow = document.getElementById('t9OneLieOverrideRow');
            const t9OneLieButtons = document.querySelectorAll('#t9OneLieFeature .t9-one-lie-btn:not(.t9-backspace-btn)');
            const t9OneLieDisplay = document.getElementById('t9OneLieString');
            const t9OneLieSubmitButton = document.getElementById('t9OneLieSubmitButton');
            const t9OneLieResetButton = document.getElementById('t9OneLieResetButton');
            const t9OneLieSkipButton = document.getElementById('t9OneLieSkipButton');

            let phase2HasBlank = false;
            let phase2BlankIndex = -1;
            let phase2CurrentLiePosition = 1;
            let phase2StoredDigits = [];

            const hidePreview = () => {
                if (!previewLine) return;
                previewLine.style.display = 'none';
                previewLine.innerHTML = '';
            };

            const updatePreview = () => {
                if (!previewLine) return;
                if (selectedDigits.length !== 4) {
                    hidePreview();
                    return;
                }

                // Ensure T9 strings are ready
                calculateT9Strings(currentFilteredWords);

                const blankIndex = selectedDigits.indexOf('BLANK');

                if (blankIndex !== -1) {
                    // B present: preview B-IDENTITY-style info (position + options)
                    const matching = filterWordsByT9OneLie(currentFilteredWords, selectedDigits, lastActualLen);
                    if (!matching || matching.length === 0) {
                        hidePreview();
                        return;
                    }

                    const possible = calculatePossibleT9DigitsForBlank(currentFilteredWords, selectedDigits, lastActualLen);
                    let options = possible && possible.length > 0 ? possible : Array.from(new Set(matching.map(w => {
                        const t9 = t9StringsMap.get(w) || wordToT9(w);
                        const lastFour = lastActualLen > 0 ? t9.slice(-4 - lastActualLen, -lastActualLen) : t9.slice(-4);
                        return lastFour[blankIndex];
                    })));

                    options = Array.from(new Set(options)).filter(Boolean);
                    if (!options.length) {
                        hidePreview();
                        return;
                    }

                    const pos = blankIndex + 1;
                    const optionsText = options.join(', ');
                    previewLine.innerHTML = `
                        <div>
                            <span class="t9-one-lie-title">LIE POSITION:</span>
                            <span class="t9-one-lie-pos">${pos}</span>
                        </div>
                        <div>
                            <span class="t9-one-lie-title">POSSIBLE:</span>
                            <span class="t9-one-lie-opts">${optionsText}</span>
                        </div>
                    `;
                    previewLine.style.display = 'block';
                } else {
                    // No B: preview Most Likely Lie position + options
                    const userFour = selectedDigits;
                    const count = countWordsWithExactlyOneLie(currentFilteredWords, userFour, lastActualLen);
                    if (count === 0) {
                        hidePreview();
                        return;
                    }

                    const { positions } = getMostLikelyLiePositions(currentFilteredWords, userFour, lastActualLen);
                    if (!positions || positions.length === 0) {
                        hidePreview();
                        return;
                    }

                    const liePos = positions[0];
                    const possibleDigits = getPossibleDigitsAtPosition(currentFilteredWords, liePos, userFour, lastActualLen);
                    const options = Array.from(new Set(possibleDigits || [])).filter(Boolean);
                    if (!options.length) {
                        hidePreview();
                        return;
                    }

                    const optionsText = options.join(', ');
                    previewLine.innerHTML = `
                        <div>
                            <span class="t9-one-lie-title">MOST LIKELY LIE:</span>
                            <span class="t9-one-lie-pos">${liePos}</span>
                        </div>
                        <div>
                            <span class="t9-one-lie-title">POSSIBLE:</span>
                            <span class="t9-one-lie-opts">${optionsText}</span>
                        </div>
                    `;
                    previewLine.style.display = 'block';
                }
            };

            const completeOneLie = (filteredWords) => {
                const preview = document.getElementById('t9OneLiePreview');
                if (preview) {
                    preview.style.display = 'none';
                    preview.innerHTML = '';
                }
                t9BSubmitted = true;
                callback(filteredWords);
                document.getElementById('t9OneLieFeature').classList.add('completed');
                document.getElementById('t9OneLieFeature').dispatchEvent(new Event('completed'));
            };

            const renderTruthDigitButtons = (digits, onDigitClick) => {
                truthDigitsContainer.innerHTML = '';
                digits.forEach(d => {
                    const btn = document.createElement('button');
                    btn.className = 't9-b-btn t9-one-lie-truth-btn';
                    btn.textContent = d;
                    btn.dataset.digit = d;
                    btn.onclick = () => onDigitClick(d);
                    btn.addEventListener('touchstart', (e) => { e.preventDefault(); onDigitClick(d); }, { passive: false });
                    truthDigitsContainer.appendChild(btn);
                });
            };

            const showPhase2WithB = (blankIndex, digits) => {
                phase2HasBlank = true;
                phase2BlankIndex = blankIndex;
                phase2Title.textContent = 'Lie at position ' + (blankIndex + 1) + '. Select the true digit:';
                overrideLabel.style.display = 'none';
                overrideRow.style.display = 'none';
                overrideRow.innerHTML = '';
                renderTruthDigitButtons(digits, (digit) => {
                    const filtered = filterWordsByT9B(currentFilteredWords, digit);
                    if (filtered.length === 0) {
                        alert('No words match that choice. Please try another digit.');
                        return;
                    }
                    completeOneLie(filtered);
                });
                if (phase1) phase1.style.display = 'none';
                if (phase2) phase2.style.display = 'block';
            };

            const showPhase2NoB = (positions, storedDigits) => {
                phase2HasBlank = false;
                phase2StoredDigits = storedDigits;
                phase2CurrentLiePosition = positions[0];
                const titleText = positions.length > 1
                    ? 'MOST LIKELY LIE: ' + positions.join(' or ')
                    : 'MOST LIKELY LIE: ' + phase2CurrentLiePosition;
                phase2Title.textContent = titleText;
                overrideLabel.style.display = 'block';
                overrideRow.style.display = 'flex';
                overrideRow.innerHTML = '';
                [1, 2, 3, 4].forEach(pos => {
                    const btn = document.createElement('button');
                    btn.className = 't9-one-lie-override-btn';
                    btn.textContent = pos;
                    btn.dataset.position = pos;
                    btn.onclick = () => {
                        phase2CurrentLiePosition = pos;
                        phase2Title.textContent = 'CHOSEN LIE: ' + pos;
                        const possible = getPossibleDigitsAtPosition(currentFilteredWords, pos, phase2StoredDigits, lastActualLen);
                        renderTruthDigitButtons(possible, (digit) => {
                            const filtered = filterWordsByT9OneLieWithTruth(currentFilteredWords, phase2StoredDigits, pos, digit, lastActualLen);
                            if (filtered.length === 0) {
                                alert('No words match that choice. Please try another digit.');
                                return;
                            }
                            completeOneLie(filtered);
                        });
                    };
                    btn.addEventListener('touchstart', (e) => { e.preventDefault(); btn.onclick(); }, { passive: false });
                    overrideRow.appendChild(btn);
                });
                const possible = getPossibleDigitsAtPosition(currentFilteredWords, phase2CurrentLiePosition, phase2StoredDigits, lastActualLen);
                renderTruthDigitButtons(possible, (digit) => {
                    const filtered = filterWordsByT9OneLieWithTruth(currentFilteredWords, phase2StoredDigits, phase2CurrentLiePosition, digit, lastActualLen);
                    if (filtered.length === 0) {
                        alert('No words match that choice. Please try another digit.');
                        return;
                    }
                    completeOneLie(filtered);
                });
                if (phase1) phase1.style.display = 'none';
                if (phase2) phase2.style.display = 'block';
            };

            if (t9OneLieDisplay) t9OneLieDisplay.textContent = '-';

            t9OneLieButtons.forEach(btn => {
                const addDigit = () => {
                    if (selectedDigits.length >= 4) return;
                    const digit = btn.dataset.digit;
                    selectedDigits.push(digit);
                    if (t9OneLieDisplay) {
                        t9OneLieDisplay.innerHTML = selectedDigits.map(d => d === 'BLANK' ? '<span class="t9-one-lie-b">B</span>' : d).join('');
                    }
                    btn.classList.add('active');
                    updatePreview();
                };
                btn.onclick = addDigit;
                btn.addEventListener('touchstart', (e) => { e.preventDefault(); addDigit(); }, { passive: false });
            });

            const t9OneLieBackspaceButton = document.getElementById('t9OneLieBackspaceButton');
            if (t9OneLieBackspaceButton) {
                let lastBackspaceAt = 0;
                const handleBackspace = () => {
                    if (Date.now() - lastBackspaceAt < 400) return;
                    lastBackspaceAt = Date.now();
                    if (selectedDigits.length === 0) return;
                    selectedDigits.pop();
                    if (t9OneLieDisplay) {
                        t9OneLieDisplay.textContent = selectedDigits.length === 0 ? '-' : selectedDigits.map(d => d === 'BLANK' ? 'B' : d).join('');
                        if (selectedDigits.length > 0) t9OneLieDisplay.innerHTML = selectedDigits.map(d => d === 'BLANK' ? '<span class="t9-one-lie-b">B</span>' : d).join('');
                    }
                    t9OneLieButtons.forEach(b => { if (!selectedDigits.includes(b.dataset.digit)) b.classList.remove('active'); });
                    if (selectedDigits.length < 4) {
                        hidePreview();
                    } else {
                        updatePreview();
                    }
                };
                t9OneLieBackspaceButton.onclick = (e) => { e.preventDefault(); handleBackspace(); };
                t9OneLieBackspaceButton.addEventListener('touchstart', (e) => { e.preventDefault(); handleBackspace(); }, { passive: false });
            }

            if (t9OneLieSubmitButton) {
                t9OneLieSubmitButton.onclick = () => {
                    if (selectedDigits.length !== 4) {
                        alert('Please select exactly 4 digits (or use BLANK).');
                        return;
                    }
                    calculateT9Strings(currentFilteredWords);
                    t9OneLieLastActualLength = lastActualLen;
                    const blankIndex = selectedDigits.indexOf('BLANK');

                    if (blankIndex !== -1) {
                        const matching = filterWordsByT9OneLie(currentFilteredWords, selectedDigits, lastActualLen);
                        if (matching.length === 0) {
                            alert('No words match this pattern with exactly one lie at the B position. Please check your input.');
                            return;
                        }
                        t9OneLieBlankIndex = blankIndex;
                        t9OneLieSelectedDigits = [...selectedDigits];
                        t9OneLiePossibleDigits = calculatePossibleT9DigitsForBlank(currentFilteredWords, selectedDigits, lastActualLen);
                        showPhase2WithB(blankIndex, t9OneLiePossibleDigits.length > 0 ? t9OneLiePossibleDigits : Array.from(new Set(matching.map(w => {
                            const t9 = t9StringsMap.get(w) || wordToT9(w);
                            const lastFour = lastActualLen > 0 ? t9.slice(-4 - lastActualLen, -lastActualLen) : t9.slice(-4);
                            return lastFour[blankIndex];
                        }))));
                    } else {
                        const userFour = selectedDigits;
                        const count = countWordsWithExactlyOneLie(currentFilteredWords, userFour, lastActualLen);
                        if (count === 0) {
                            alert('No words match this pattern with exactly one lie. Please check your input.');
                            return;
                        }
                        t9OneLieBlankIndex = null;
                        t9OneLieSelectedDigits = [];
                        t9OneLiePossibleDigits = [];
                        const { positions } = getMostLikelyLiePositions(currentFilteredWords, userFour, lastActualLen);
                        showPhase2NoB(positions, userFour);
                    }
                };
                t9OneLieSubmitButton.addEventListener('touchstart', (e) => { e.preventDefault(); t9OneLieSubmitButton.onclick(); }, { passive: false });
            }

            if (t9OneLieResetButton) {
                t9OneLieResetButton.onclick = () => {
                    selectedDigits = [];
                    if (t9OneLieDisplay) t9OneLieDisplay.textContent = '-';
                    t9OneLieButtons.forEach(btn => btn.classList.remove('active'));
                    if (phase1) phase1.style.display = '';
                    if (phase2) phase2.style.display = 'none';
                    hidePreview();
                };
                t9OneLieResetButton.addEventListener('touchstart', (e) => { e.preventDefault(); t9OneLieResetButton.onclick(); }, { passive: false });
            }

            if (t9OneLieSkipButton) {
                t9OneLieSkipButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('t9OneLieFeature').classList.add('completed');
                    document.getElementById('t9OneLieFeature').dispatchEvent(new Event('completed'));
                    hidePreview();
                };
                t9OneLieSkipButton.addEventListener('touchstart', (e) => { e.preventDefault(); t9OneLieSkipButton.onclick(); }, { passive: false });
            }
            break;
        }
        case 't9Repeat': {
            const t9RepeatYesBtn = document.getElementById('t9RepeatYesBtn');
            const t9RepeatNoBtn = document.getElementById('t9RepeatNoBtn');
            const t9RepeatSkipBtn = document.getElementById('t9RepeatSkipBtn');
            
            if (t9RepeatYesBtn) {
                t9RepeatYesBtn.onclick = () => {
                    calculateT9Strings(currentFilteredWords);
                    const filteredWords = filterWordsByT9Repeat(currentFilteredWords, true);
                    callback(filteredWords);
                    document.getElementById('t9RepeatFeature').classList.add('completed');
                    document.getElementById('t9RepeatFeature').dispatchEvent(new Event('completed'));
                };
                
                t9RepeatYesBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    t9RepeatYesBtn.onclick();
                }, { passive: false });
            }
            
            if (t9RepeatNoBtn) {
                t9RepeatNoBtn.onclick = () => {
                    calculateT9Strings(currentFilteredWords);
                    const filteredWords = filterWordsByT9Repeat(currentFilteredWords, false);
                    callback(filteredWords);
                    document.getElementById('t9RepeatFeature').classList.add('completed');
                    document.getElementById('t9RepeatFeature').dispatchEvent(new Event('completed'));
                };
                
                t9RepeatNoBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    t9RepeatNoBtn.onclick();
                }, { passive: false });
            }
            
            if (t9RepeatSkipBtn) {
                t9RepeatSkipBtn.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('t9RepeatFeature').classList.add('completed');
                    document.getElementById('t9RepeatFeature').dispatchEvent(new Event('completed'));
                };
                
                t9RepeatSkipBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    t9RepeatSkipBtn.onclick();
                }, { passive: false });
            }
            break;
        }
        case 't9Higher': {
            const t9HigherYesBtn = document.getElementById('t9HigherYesBtn');
            const t9HigherNoBtn = document.getElementById('t9HigherNoBtn');
            const t9HigherSameBtn = document.getElementById('t9HigherSameBtn');
            const t9HigherSkipBtn = document.getElementById('t9HigherSkipBtn');
            
            if (t9HigherYesBtn) {
                t9HigherYesBtn.onclick = () => {
                    calculateT9Strings(currentFilteredWords);
                    const filteredWords = filterWordsByT9Higher(currentFilteredWords, 'yes');
                    callback(filteredWords);
                    document.getElementById('t9HigherFeature').classList.add('completed');
                    document.getElementById('t9HigherFeature').dispatchEvent(new Event('completed'));
                };
                
                t9HigherYesBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    t9HigherYesBtn.onclick();
                }, { passive: false });
            }
            
            if (t9HigherNoBtn) {
                t9HigherNoBtn.onclick = () => {
                    calculateT9Strings(currentFilteredWords);
                    const filteredWords = filterWordsByT9Higher(currentFilteredWords, 'no');
                    callback(filteredWords);
                    document.getElementById('t9HigherFeature').classList.add('completed');
                    document.getElementById('t9HigherFeature').dispatchEvent(new Event('completed'));
                };
                
                t9HigherNoBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    t9HigherNoBtn.onclick();
                }, { passive: false });
            }
            
            if (t9HigherSameBtn) {
                t9HigherSameBtn.onclick = () => {
                    calculateT9Strings(currentFilteredWords);
                    const filteredWords = filterWordsByT9Higher(currentFilteredWords, 'same');
                    callback(filteredWords);
                    document.getElementById('t9HigherFeature').classList.add('completed');
                    document.getElementById('t9HigherFeature').dispatchEvent(new Event('completed'));
                };
                
                t9HigherSameBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    t9HigherSameBtn.onclick();
                }, { passive: false });
            }
            
            if (t9HigherSkipBtn) {
                t9HigherSkipBtn.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('t9HigherFeature').classList.add('completed');
                    document.getElementById('t9HigherFeature').dispatchEvent(new Event('completed'));
                };
                
                t9HigherSkipBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    t9HigherSkipBtn.onclick();
                }, { passive: false });
            }
            break;
        }

        case 't9Singing': {
            const upBtn = document.getElementById('t9SingingUpBtn');
            const downBtn = document.getElementById('t9SingingDownBtn');
            const submitBtn = document.getElementById('t9SingingSubmitBtn');
            const skipBtn = document.getElementById('t9SingingSkipBtn');
            const sequenceDisplay = document.getElementById('t9SingingSequenceDisplay');
            let singingDirections = [];

            function singingUpdateDisplay() {
                if (!sequenceDisplay) return;
                if (!singingDirections.length) {
                    sequenceDisplay.textContent = '—';
                } else {
                    sequenceDisplay.textContent = singingDirections
                        .map(d => d === 'U' ? 'UP' : 'DOWN')
                        .join(', ');
                }
            }

            function singingSubmit() {
                if (!singingDirections.length) {
                    alert('Add at least one direction (UP or DOWN), then SUBMIT.');
                    return;
                }
                const filtered = filterWordsByT9Singing(currentFilteredWords, singingDirections);
                callback(filtered);
                const featureEl = document.getElementById('t9SingingFeature');
                if (featureEl) {
                    featureEl.classList.add('completed');
                    featureEl.dispatchEvent(new Event('completed'));
                }
            }

            if (upBtn) {
                upBtn.onclick = () => {
                    singingDirections.push('U');
                    singingUpdateDisplay();
                };
                upBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    upBtn.click();
                }, { passive: false });
            }

            if (downBtn) {
                downBtn.onclick = () => {
                    singingDirections.push('D');
                    singingUpdateDisplay();
                };
                downBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    downBtn.click();
                }, { passive: false });
            }

            if (submitBtn) {
                submitBtn.onclick = () => {
                    singingSubmit();
                };
                submitBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    submitBtn.click();
                }, { passive: false });
            }

            if (skipBtn) {
                skipBtn.onclick = () => {
                    callback(currentFilteredWords);
                    const featureEl = document.getElementById('t9SingingFeature');
                    if (featureEl) {
                        featureEl.classList.add('completed');
                        featureEl.dispatchEvent(new Event('completed'));
                    }
                };
                skipBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    skipBtn.click();
                }, { passive: false });
            }

            break;
        }

        case 't9NumberStart': {
            const sectionBtns = document.querySelectorAll('#t9NumberStartFeature .number-start-btn');
            const skipBtn = document.getElementById('t9NumberStartSkipBtn');
            sectionBtns.forEach(btn => {
                btn.onclick = () => {
                    const section = btn.dataset.section;
                    lastNumberStartSection = section;
                    sectionBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const filtered = filterWordsByNumberStart(currentFilteredWords, section);
                    callback(filtered);
                    const el = document.getElementById('t9NumberStartFeature');
                    if (el) {
                        el.classList.add('completed');
                        el.dispatchEvent(new Event('completed'));
                    }
                };
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    btn.click();
                }, { passive: false });
            });
            if (skipBtn) {
                skipBtn.onclick = () => {
                    callback(currentFilteredWords);
                    const el = document.getElementById('t9NumberStartFeature');
                    if (el) {
                        el.classList.add('completed');
                        el.dispatchEvent(new Event('completed'));
                    }
                };
                skipBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    skipBtn.click();
                }, { passive: false });
            }
            break;
        }

        case 't9OneTruth': {
            let selectedDigits = [];
            const t9OneTruthButtons = document.querySelectorAll('.t9-one-truth-btn');
            const t9OneTruthDisplay = document.getElementById('t9OneTruthString');
            const t9OneTruthPossibleDigitsList = document.getElementById('t9OneTruthPossibleDigitsList');
            const t9OneTruthSubmitButton = document.getElementById('t9OneTruthSubmitButton');
            const t9OneTruthResetButton = document.getElementById('t9OneTruthResetButton');
            const t9OneTruthSkipButton = document.getElementById('t9OneTruthSkipButton');
            
            // Function to update the possible digits display
            const updatePossibleDigits = () => {
                if (t9OneTruthPossibleDigitsList) {
                    const blankIndex = selectedDigits.indexOf('BLANK');
                    if (blankIndex !== -1 && selectedDigits.length === 4) {
                        const possibleDigits = calculatePossibleT9DigitsForBlankTruth(currentFilteredWords, selectedDigits);
                        if (possibleDigits.length > 0) {
                            t9OneTruthPossibleDigitsList.textContent = possibleDigits.join(', ');
                        } else {
                            t9OneTruthPossibleDigitsList.textContent = 'None found';
                        }
                    } else {
                        t9OneTruthPossibleDigitsList.textContent = '-';
                    }
                }
            };
            
            // Initialize display
            if (t9OneTruthDisplay) {
                t9OneTruthDisplay.textContent = '-';
            }
            if (t9OneTruthPossibleDigitsList) {
                t9OneTruthPossibleDigitsList.textContent = '-';
            }
            
            // Number button handlers
            t9OneTruthButtons.forEach(btn => {
                btn.onclick = () => {
                    if (selectedDigits.length < 4) {
                        const digit = btn.dataset.digit;
                        selectedDigits.push(digit);
                        if (t9OneTruthDisplay) {
                            // Build display with red "B" for BLANK
                            const displayHTML = selectedDigits.map(d => {
                                if (d === 'BLANK') {
                                    return '<span style="color: #f44336; font-weight: bold;">B</span>';
                                }
                                return d;
                            }).join('');
                            t9OneTruthDisplay.innerHTML = displayHTML;
                        }
                        btn.classList.add('active');
                        
                        // Update possible digits display
                        updatePossibleDigits();
                    }
                };
                
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    if (selectedDigits.length < 4) {
                        const digit = btn.dataset.digit;
                        selectedDigits.push(digit);
                        if (t9OneTruthDisplay) {
                            // Build display with red "B" for BLANK
                            const displayHTML = selectedDigits.map(d => {
                                if (d === 'BLANK') {
                                    return '<span style="color: #f44336; font-weight: bold;">B</span>';
                                }
                                return d;
                            }).join('');
                            t9OneTruthDisplay.innerHTML = displayHTML;
                        }
                        btn.classList.add('active');
                        
                        // Update possible digits display
                        updatePossibleDigits();
                    }
                }, { passive: false });
            });
            
            // Backspace button (guard so touch + click don't both run and remove two digits)
            const t9OneTruthBackspaceButton = document.getElementById('t9OneTruthBackspaceButton');
            if (t9OneTruthBackspaceButton) {
                let lastBackspaceAt = 0;
                const handleBackspace = () => {
                    if (Date.now() - lastBackspaceAt < 400) return;
                    lastBackspaceAt = Date.now();
                    if (selectedDigits.length === 0) return;
                    const popped = selectedDigits.pop();
                    if (t9OneTruthDisplay) {
                        if (selectedDigits.length === 0) {
                            t9OneTruthDisplay.textContent = '-';
                        } else {
                            t9OneTruthDisplay.innerHTML = selectedDigits.map(d => d === 'BLANK' ? '<span style="color: #f44336; font-weight: bold;">B</span>' : d).join('');
                        }
                    }
                    updatePossibleDigits();
                    const btnForPopped = document.querySelector(`.t9-one-truth-btn[data-digit="${popped}"]`);
                    if (btnForPopped && !selectedDigits.includes(popped)) btnForPopped.classList.remove('active');
                };
                t9OneTruthBackspaceButton.onclick = (e) => { e.preventDefault(); handleBackspace(); };
                t9OneTruthBackspaceButton.addEventListener('touchstart', (e) => { e.preventDefault(); handleBackspace(); }, { passive: false });
            }
            
            // Submit button
            if (t9OneTruthSubmitButton) {
                t9OneTruthSubmitButton.onclick = () => {
                    if (selectedDigits.length !== 4) {
                        alert('Please select exactly 4 digits (or use BLANK)');
                        return;
                    }
                    
                    // Calculate T9 strings if not already done
                    calculateT9Strings(currentFilteredWords);
                    
                    const filteredWords = filterWordsByT9OneTruth(currentFilteredWords, selectedDigits);
                    callback(filteredWords);
                    document.getElementById('t9OneTruthFeature').classList.add('completed');
                    document.getElementById('t9OneTruthFeature').dispatchEvent(new Event('completed'));
                };
                
                t9OneTruthSubmitButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    t9OneTruthSubmitButton.onclick();
                }, { passive: false });
            }
            
            // Reset button
            if (t9OneTruthResetButton) {
                t9OneTruthResetButton.onclick = () => {
                    selectedDigits = [];
                    if (t9OneTruthDisplay) {
                        t9OneTruthDisplay.textContent = '-';
                    }
                    if (t9OneTruthPossibleDigitsList) {
                        t9OneTruthPossibleDigitsList.textContent = '-';
                    }
                    t9OneTruthButtons.forEach(btn => {
                        btn.classList.remove('active');
                    });
                };
                
                t9OneTruthResetButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    t9OneTruthResetButton.onclick();
                }, { passive: false });
            }
            
            // Skip button
            if (t9OneTruthSkipButton) {
                t9OneTruthSkipButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('t9OneTruthFeature').classList.add('completed');
                    document.getElementById('t9OneTruthFeature').dispatchEvent(new Event('completed'));
                };
                
                t9OneTruthSkipButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    t9OneTruthSkipButton.onclick();
                }, { passive: false });
            }
            break;
        }
        case 'alphaNumeric': {
            const alphaNumericYesBtn = document.getElementById('alphaNumericYesBtn');
            const alphaNumericNoBtn = document.getElementById('alphaNumericNoBtn');
            const alphaNumericSkipBtn = document.getElementById('alphaNumericSkipBtn');
            
            if (alphaNumericYesBtn) {
                alphaNumericYesBtn.onclick = () => {
                    const filteredWords = filterWordsByAlphaNumeric(currentFilteredWords, true);
                    callback(filteredWords);
                    document.getElementById('alphaNumericFeature').classList.add('completed');
                    document.getElementById('alphaNumericFeature').dispatchEvent(new Event('completed'));
                };
                
                alphaNumericYesBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    alphaNumericYesBtn.onclick();
                }, { passive: false });
            }
            
            if (alphaNumericNoBtn) {
                alphaNumericNoBtn.onclick = () => {
                    const filteredWords = filterWordsByAlphaNumeric(currentFilteredWords, false);
                    callback(filteredWords);
                    document.getElementById('alphaNumericFeature').classList.add('completed');
                    document.getElementById('alphaNumericFeature').dispatchEvent(new Event('completed'));
                };
                
                alphaNumericNoBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    alphaNumericNoBtn.onclick();
                }, { passive: false });
            }
            
            if (alphaNumericSkipBtn) {
                alphaNumericSkipBtn.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('alphaNumericFeature').classList.add('completed');
                    document.getElementById('alphaNumericFeature').dispatchEvent(new Event('completed'));
                };
                
                alphaNumericSkipBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    alphaNumericSkipBtn.onclick();
                }, { passive: false });
            }
            break;
        }
        case 'lettersAbove': {
            const lettersAboveButton = document.getElementById('lettersAboveButton');
            const lettersAboveInput = document.getElementById('lettersAboveInput');
            const lettersAboveSkipButton = document.getElementById('lettersAboveSkipButton');
            
            if (lettersAboveButton && lettersAboveInput) {
                lettersAboveButton.onclick = () => {
                    const count = lettersAboveInput.value.trim();
                    if (count === '' || isNaN(parseInt(count, 10))) {
                        alert('Please enter a valid number (0-26)');
                        return;
                    }
                    
                    const numCount = parseInt(count, 10);
                    if (numCount < 0 || numCount > 26) {
                        alert('Please enter a number between 0 and 26');
                        return;
                    }
                    
                    const filteredWords = filterWordsByLettersAbove(currentFilteredWords, count);
                    callback(filteredWords);
                    document.getElementById('lettersAboveFeature').classList.add('completed');
                    document.getElementById('lettersAboveFeature').dispatchEvent(new Event('completed'));
                };
                
                lettersAboveButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    lettersAboveButton.onclick();
                }, { passive: false });
            }
            
            if (lettersAboveSkipButton) {
                lettersAboveSkipButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('lettersAboveFeature').classList.add('completed');
                    document.getElementById('lettersAboveFeature').dispatchEvent(new Event('completed'));
                };
                
                lettersAboveSkipButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    lettersAboveSkipButton.onclick();
                }, { passive: false });
            }
            break;
        }
        case 'dictionaryAlpha': {
            const sectionBtns = document.querySelectorAll('#dictionaryAlphaFeature .section-btn');
            const dictionaryAlphaSkipButton = document.getElementById('dictionaryAlphaSkipButton');
            
            // Section button handlers - auto-submit on click
            sectionBtns.forEach(btn => {
                btn.onclick = () => {
                    const section = btn.dataset.section;
                    lastDictionaryAlphaSection = section; // for ALPHA step if it runs later in workflow
                    // Visual feedback
                    sectionBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    // Immediately filter and progress
                    const filteredWords = filterWordsByDictionaryAlpha(currentFilteredWords, section);
                    callback(filteredWords);
                    document.getElementById('dictionaryAlphaFeature').classList.add('completed');
                    document.getElementById('dictionaryAlphaFeature').dispatchEvent(new Event('completed'));
                };
                
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    btn.onclick();
                }, { passive: false });
            });
            
            // Skip button
            if (dictionaryAlphaSkipButton) {
                dictionaryAlphaSkipButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('dictionaryAlphaFeature').classList.add('completed');
                    document.getElementById('dictionaryAlphaFeature').dispatchEvent(new Event('completed'));
                };
                
                dictionaryAlphaSkipButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    dictionaryAlphaSkipButton.onclick();
                }, { passive: false });
            }
            break;
        }

        case 'alpha': {
            const alphaLeftBtn = document.getElementById('alphaLeftBtn');
            const alphaRepeatBtn = document.getElementById('alphaRepeatBtn');
            const alphaRightBtn = document.getElementById('alphaRightBtn');
            const alphaSubmitBtn = document.getElementById('alphaSubmitBtn');
            const alphaSkipBtn = document.getElementById('alphaSkipBtn');
            const alphaSequenceDisplay = document.getElementById('alphaSequenceDisplay');
            const alphaDirectionsCount = Math.max(0, parseInt((appSettings && appSettings.alphaDirectionsCount) || 0, 10));
            const alphaSwapPov = !!(appSettings && appSettings.alphaSwapPov);
            let alphaDirections = [];

            function alphaUpdateDisplay() {
                if (alphaSequenceDisplay) {
                    alphaSequenceDisplay.textContent = alphaDirections.length ? alphaDirections.map(d => d === 'L' ? 'Left' : d === 'R' ? 'Right' : 'Repeat').join(', ') : '—';
                }
            }

            function alphaSubmit() {
                const section = lastDictionaryAlphaSection || 'begin';
                const filtered = filterWordsByAlpha(currentFilteredWords, alphaDirections, section, alphaSwapPov);
                callback(filtered);
                document.getElementById('alphaFeature').classList.add('completed');
                document.getElementById('alphaFeature').dispatchEvent(new Event('completed'));
            }

            if (alphaLeftBtn) {
                alphaLeftBtn.onclick = () => {
                    alphaDirections.push('L');
                    alphaUpdateDisplay();
                    if (alphaDirectionsCount > 0 && alphaDirections.length >= alphaDirectionsCount) alphaSubmit();
                };
                alphaLeftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); alphaLeftBtn.click(); }, { passive: false });
            }
            if (alphaRepeatBtn) {
                alphaRepeatBtn.onclick = () => {
                    alphaDirections.push('Repeat');
                    alphaUpdateDisplay();
                    if (alphaDirectionsCount > 0 && alphaDirections.length >= alphaDirectionsCount) alphaSubmit();
                };
                alphaRepeatBtn.addEventListener('touchstart', (e) => { e.preventDefault(); alphaRepeatBtn.click(); }, { passive: false });
            }
            if (alphaRightBtn) {
                alphaRightBtn.onclick = () => {
                    alphaDirections.push('R');
                    alphaUpdateDisplay();
                    if (alphaDirectionsCount > 0 && alphaDirections.length >= alphaDirectionsCount) alphaSubmit();
                };
                alphaRightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); alphaRightBtn.click(); }, { passive: false });
            }
            if (alphaSubmitBtn) {
                alphaSubmitBtn.onclick = () => {
                    if (alphaDirections.length === 0) {
                        alert('Add at least one direction (Left, Right, or Repeat), then SUBMIT.');
                        return;
                    }
                    alphaSubmit();
                };
                alphaSubmitBtn.addEventListener('touchstart', (e) => { e.preventDefault(); alphaSubmitBtn.click(); }, { passive: false });
            }
            if (alphaSkipBtn) {
                alphaSkipBtn.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('alphaFeature').classList.add('completed');
                    document.getElementById('alphaFeature').dispatchEvent(new Event('completed'));
                };
                alphaSkipBtn.addEventListener('touchstart', (e) => { e.preventDefault(); alphaSkipBtn.click(); }, { passive: false });
            }
            break;
        }

        case 'smlLength': {
            const categoryBtns = document.querySelectorAll('#smlLengthFeature .section-btn');
            const smlLengthSkipButton = document.getElementById('smlLengthSkipButton');
            
            // Category button handlers - auto-submit on click
            categoryBtns.forEach(btn => {
                btn.onclick = () => {
                    const category = btn.dataset.section;
                    // Visual feedback
                    categoryBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    // Immediately filter and progress
                    const filteredWords = filterWordsBySmlLength(currentFilteredWords, category);
                    callback(filteredWords);
                    document.getElementById('smlLengthFeature').classList.add('completed');
                    document.getElementById('smlLengthFeature').dispatchEvent(new Event('completed'));
                };
                
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    btn.onclick();
                }, { passive: false });
            });
            
            // Skip button
            if (smlLengthSkipButton) {
                smlLengthSkipButton.onclick = () => {
                    callback(currentFilteredWords);
                    document.getElementById('smlLengthFeature').classList.add('completed');
                    document.getElementById('smlLengthFeature').dispatchEvent(new Event('completed'));
                };
                
                smlLengthSkipButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    smlLengthSkipButton.onclick();
                }, { passive: false });
            }
            break;
        }
        case 'findEee': {
            const letterBtns = Array.from(document.querySelectorAll('.find-eee-btn'));
            const positionBtns = Array.from(document.querySelectorAll('.find-eee-position-btn'));
            const skipBtn = document.getElementById('findEeeSkipButton');
            let selectedLetter = null;
            let selectedPosition = null;

            // Reset all buttons
            letterBtns.forEach(btn => {
                btn.classList.remove('active');
                btn.onclick = () => {
                    const letter = btn.dataset.letter;
                    
                    // Select the letter
                    letterBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    selectedLetter = letter;
                    
                    console.log('Letter selected:', letter, 'Button classes:', btn.className);
                    
                    // Filter immediately by letter only
                    const filteredWords = filterWordsByFindEee(currentFilteredWords, letter, null);
                    callback(filteredWords);
                };
                // Touch event for mobile
                btn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    btn.onclick();
                }, { passive: false });
            });

            positionBtns.forEach(btn => {
                btn.classList.remove('active');
                btn.onclick = () => {
                    const position = parseInt(btn.dataset.position);
                    
                    // Select the position
                    positionBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    selectedPosition = position;
                    
                    console.log('Position selected:', position, 'Button classes:', btn.className);
                    
                    // If both letter and position are selected, apply filter and move to next feature
                    if (selectedLetter && selectedPosition) {
                        const filteredWords = filterWordsByFindEee(currentFilteredWords, selectedLetter, selectedPosition);
                        callback(filteredWords);
                        
                        // Move to next feature automatically
                        const featureDiv = document.getElementById('findEeeFeature');
                        featureDiv.classList.add('completed');
                        featureDiv.dispatchEvent(new Event('completed'));
                    }
                };
                // Touch event for mobile
                btn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    btn.onclick();
                }, { passive: false });
            });

            if (skipBtn) {
                skipBtn.onclick = () => {
                    // If letter is selected but no position, keep the letter filter
                    if (selectedLetter && !selectedPosition) {
                        // Keep current filtered words (letter filter already applied)
                        callback(currentFilteredWords);
                    } else if (!selectedLetter && !selectedPosition) {
                        // Nothing selected, no changes to wordlist
                        callback(currentFilteredWords);
                    }
                    
                    const featureDiv = document.getElementById('findEeeFeature');
                    featureDiv.classList.add('completed');
                    featureDiv.dispatchEvent(new Event('completed'));
                };
                skipBtn.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    skipBtn.onclick();
                }, { passive: false });
            }
            break;
        }
        
        case 'positionCons': {
            const positionInput = document.getElementById('positionConsPosition');
            const countInput = document.getElementById('positionConsCount');
            const lettersInput = document.getElementById('positionConsLetters');
            const submitBtn = document.getElementById('positionConsSubmit');
            const useCurrentBtn = document.getElementById('positionConsUseCurrent');
            const generateBtn = document.getElementById('positionConsGenerate');
            const messageDiv = document.getElementById('positionConsMessage');
            
            // Real-time letter sanitization
            if (lettersInput) {
                lettersInput.addEventListener('input', (e) => {
                    const sanitized = sanitizeLetterString(e.target.value);
                    if (sanitized !== e.target.value) {
                        e.target.value = sanitized;
                    }
                });
                
                // Ensure input is easily focusable on touch
                lettersInput.addEventListener('touchstart', (e) => {
                    e.stopPropagation();
                    lettersInput.focus();
                }, { passive: true });
                
                lettersInput.addEventListener('touchend', (e) => {
                    e.stopPropagation();
                    lettersInput.focus();
                }, { passive: true });
            }
            
            // Make position and count inputs easily focusable
            if (positionInput) {
                positionInput.addEventListener('touchstart', (e) => {
                    e.stopPropagation();
                    positionInput.focus();
                }, { passive: true });
                
                positionInput.addEventListener('touchend', (e) => {
                    e.stopPropagation();
                    positionInput.focus();
                }, { passive: true });
            }
            
            if (countInput) {
                countInput.addEventListener('touchstart', (e) => {
                    e.stopPropagation();
                    countInput.focus();
                }, { passive: true });
                
                countInput.addEventListener('touchend', (e) => {
                    e.stopPropagation();
                    countInput.focus();
                }, { passive: true });
            }
            
            // Use Last Letters button
            if (useCurrentBtn) {
                useCurrentBtn.onclick = () => {
                    if (lastPositionConsLetters) {
                        if (lettersInput) {
                            lettersInput.value = lastPositionConsLetters;
                        }
                        if (messageDiv) {
                            messageDiv.textContent = 'Loaded last used letters';
                            messageDiv.style.color = '#4CAF50';
                            setTimeout(() => {
                                messageDiv.textContent = '';
                            }, 2000);
                        }
                    } else {
                        if (messageDiv) {
                            messageDiv.textContent = 'No last letters available';
                            messageDiv.style.color = '#f44336';
                            setTimeout(() => {
                                messageDiv.textContent = '';
                            }, 2000);
                        }
                    }
                };
                useCurrentBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    useCurrentBtn.onclick();
                }, { passive: false });
            }
            
            // Random Letters button
            if (generateBtn) {
                generateBtn.onclick = () => {
                    const requestedPosition = parseInt(positionInput?.value);
                    const positionIsValid = !isNaN(requestedPosition) && requestedPosition >= 1 && requestedPosition <= 6;
                    const effectivePosition = positionIsValid ? requestedPosition : Math.floor(Math.random() * 6) + 1;
                    const generated = generateStructuredLetterString(effectivePosition);
                    if (lettersInput) {
                        lettersInput.value = generated;
                    }
                    lastPositionConsGeneratedLetters = generated;
                    if (messageDiv) {
                        messageDiv.textContent = `Generated letters for position ${effectivePosition}`;
                        messageDiv.style.color = '#4CAF50';
                        setTimeout(() => {
                            messageDiv.textContent = '';
                        }, 2000);
                    }
                };
                generateBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    generateBtn.onclick();
                }, { passive: false });
            }
            
            // FILTER button
            if (submitBtn) {
                submitBtn.onclick = () => {
                    const positionRaw = positionInput?.value?.trim() || '';
                    const hasPositionValue = positionRaw.length > 0;
                    const parsedPosition = parseInt(positionRaw);
                    const positionIsValid = !isNaN(parsedPosition) && parsedPosition >= 1 && parsedPosition <= 6;
                    const resolvedPosition = hasPositionValue ? (positionIsValid ? parsedPosition : null) : null;
                    const letterCount = parseInt(countInput?.value);
                    const letters = lettersInput?.value || '';
                    
                    // Validation
                    if (hasPositionValue && !positionIsValid) {
                        if (messageDiv) {
                            messageDiv.textContent = 'Please enter a valid position (1-6)';
                            messageDiv.style.color = '#f44336';
                            setTimeout(() => {
                                messageDiv.textContent = '';
                            }, 2000);
                        }
                        return;
                    }
                    
                    if (letterCount === null || letterCount < 0 || isNaN(letterCount)) {
                        if (messageDiv) {
                            messageDiv.textContent = 'Please enter a valid letter count (0 or more)';
                            messageDiv.style.color = '#f44336';
                            setTimeout(() => {
                                messageDiv.textContent = '';
                            }, 2000);
                        }
                        return;
                    }
                    
                    const sanitizedLetters = sanitizeLetterString(letters);
                    if (!sanitizedLetters) {
                        if (messageDiv) {
                            messageDiv.textContent = 'Please enter at least one letter';
                            messageDiv.style.color = '#f44336';
                            setTimeout(() => {
                                messageDiv.textContent = '';
                            }, 2000);
                        }
                        return;
                    }
                    
                    // Store for "Use Last Letters" button
                    lastPositionConsLetters = sanitizedLetters;
                    
                    // Filter words
                    const filteredWords = filterWordsByPositionCons(currentFilteredWords, {
                        position: resolvedPosition,
                        letters: sanitizedLetters,
                        letterCount
                    });
                    
                    callback(filteredWords);
                    
                    // Show result message
                    if (messageDiv) {
                        const scopeText = resolvedPosition ? `position ${resolvedPosition}` : 'all positions';
                        messageDiv.textContent = `Filtered to ${filteredWords.length} words (${scopeText})`;
                        messageDiv.style.color = '#4CAF50';
                    }
                    
                    // Complete feature
                    const featureDiv = document.getElementById('positionConsFeature');
                    featureDiv.classList.add('completed');
                    featureDiv.dispatchEvent(new Event('completed'));
                };
                
                submitBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    submitBtn.onclick();
                }, { passive: false });
                
                // Enter key support
                if (lettersInput) {
                    lettersInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            submitBtn.onclick();
                        }
                    });
                }
                if (positionInput) {
                    positionInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            submitBtn.onclick();
                        }
                    });
                }
                if (countInput) {
                    countInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            submitBtn.onclick();
                        }
                    });
                }
            }
            break;
        }
        
        case 'firstCurved': {
            const positionInput = document.getElementById('firstCurvedPosition');
            const submitButton = document.getElementById('firstCurvedSubmit');
            const messageElement = document.getElementById('firstCurvedMessage');

            const setMessage = (text = '', isError = false) => {
                if (messageElement) {
                    messageElement.textContent = text;
                    messageElement.style.color = isError ? '#f44336' : '#4CAF50';
                }
            };

            const handleSubmit = () => {
                setMessage('');
                const positionValue = parseInt(positionInput?.value, 10);
                if (Number.isNaN(positionValue) || positionValue < 1) {
                    setMessage('Position must be a positive number.', true);
                    return;
                }

                const filteredWords = filterWordsByFirstCurved(currentFilteredWords, positionValue);

                if (filteredWords.length === 0) {
                    setMessage('No matches found.', true);
                } else {
                    setMessage(`${filteredWords.length} matches found.`);
                }

                callback(filteredWords);
                
                // Complete feature
                const featureDiv = document.getElementById('firstCurvedFeature');
                if (featureDiv) {
                    featureDiv.classList.add('completed');
                    featureDiv.dispatchEvent(new Event('completed'));
                }
            };

            if (submitButton) {
                submitButton.addEventListener('click', handleSubmit);
                submitButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    handleSubmit();
                }, { passive: false });
            }
            
            // Enter key support
            if (positionInput) {
                positionInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        handleSubmit();
                    }
                });
                
                // Make input easily focusable on touch
                positionInput.addEventListener('touchstart', (e) => {
                    e.stopPropagation();
                    positionInput.focus();
                }, { passive: true });
                
                positionInput.addEventListener('touchend', (e) => {
                    e.stopPropagation();
                    positionInput.focus();
                }, { passive: true });
            }
            break;
        }
        
        case 'eyeTest': {
            const wordInputs = [
                document.getElementById('eyeTestWord1'),
                document.getElementById('eyeTestWord2'),
                document.getElementById('eyeTestWord3'),
                document.getElementById('eyeTestWord4'),
                document.getElementById('eyeTestWord5')
            ];
            const codeInput = document.getElementById('eyeTestCode');
            const submitButton = document.getElementById('eyeTestSubmit');
            const chartButton = document.getElementById('eyeTestChartButton');
            const messageElement = document.getElementById('eyeTestMessage');

            const setMessage = (text = '', isError = false) => {
                if (messageElement) {
                    messageElement.textContent = text;
                    messageElement.style.color = isError ? '#f44336' : '#4CAF50';
                }
            };

            const handleSubmit = () => {
                setMessage('');

                // Get and validate code
                const codeValue = (codeInput?.value || '').trim();
                if (!codeValue) {
                    setMessage('Enter a code.', true);
                    return;
                }

                // Extract digits only, max 5 (one per EYE TEST box)
                const digitsOnly = codeValue.replace(/[^0-9]/g, '').slice(0, 5);
                if (!digitsOnly) {
                    setMessage('Code must contain at least one digit.', true);
                    return;
                }

                // Use as many groups as digits supplied; later boxes are ignored
                const activeCount = Math.min(digitsOnly.length, wordInputs.length);
                const effectiveWordInputs = wordInputs.map((input, index) =>
                    index < activeCount ? (input?.value || '') : ''
                );

                // Filter words using PIN logic
                const filteredWords = filterWordsByPin(currentFilteredWords, effectiveWordInputs, digitsOnly);

                if (filteredWords.length === 0) {
                    setMessage('No matches found.', true);
                } else {
                    setMessage(`${filteredWords.length} matches found.`);
                }

                callback(filteredWords);

                // Complete feature
                const featureDiv = document.getElementById('eyeTestFeature');
                if (featureDiv) {
                    featureDiv.classList.add('completed');
                    featureDiv.dispatchEvent(new Event('completed'));
                }
            };

            if (submitButton) {
                submitButton.addEventListener('click', handleSubmit);
                submitButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    handleSubmit();
                }, { passive: false });
            }

            if (codeInput) {
                codeInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        handleSubmit();
                    }
                });

                codeInput.addEventListener('touchstart', (e) => {
                    e.stopPropagation();
                    codeInput.focus();
                }, { passive: true });

                codeInput.addEventListener('touchend', (e) => {
                    e.stopPropagation();
                    codeInput.focus();
                }, { passive: true });
            }

            if (chartButton) {
                const overlay = document.getElementById('eyeTestChartOverlay');
                const canvas = document.getElementById('eyeTestChartCanvas');
                if (overlay && canvas) {
                    const TAP_WINDOW_MS = 600;
                    let tapCount = 0;
                    let lastTapTime = 0;

                    const showChart = () => {
                        overlay.style.display = 'flex';
                        const w = overlay.clientWidth || window.innerWidth;
                        const h = overlay.clientHeight || window.innerHeight;
                        canvas.width = w;
                        canvas.height = h;
                        const letters = buildEyeTestChartLetters();
                        drawEyeTestChart(canvas, letters);
                        tapCount = 0;
                        lastTapTime = 0;
                        const versionDisplay = document.getElementById('versionDisplay');
                        if (versionDisplay) versionDisplay.style.display = 'none';
                        const homeButton = document.getElementById('homeButton');
                        if (homeButton) homeButton.style.display = 'none';
                        const wordCountDisplay = document.getElementById('wordCountDisplay');
                        if (wordCountDisplay) wordCountDisplay.style.display = 'none';
                        const resetBtn = document.getElementById('resetWorkflowButton');
                        if (resetBtn) resetBtn.style.display = 'none';
                    };

                    const hideChart = () => {
                        overlay.style.display = 'none';
                        tapCount = 0;
                        lastTapTime = 0;
                        const versionDisplay = document.getElementById('versionDisplay');
                        if (versionDisplay) versionDisplay.style.display = '';
                        const homeButton = document.getElementById('homeButton');
                        if (homeButton) homeButton.style.display = '';
                        const wordCountDisplay = document.getElementById('wordCountDisplay');
                        if (wordCountDisplay) wordCountDisplay.style.display = '';
                        const resetBtn = document.getElementById('resetWorkflowButton');
                        if (resetBtn) resetBtn.style.display = '';
                    };

                    const handleTap = () => {
                        const now = Date.now();
                        if (now - lastTapTime > TAP_WINDOW_MS) {
                            tapCount = 0;
                        }
                        tapCount += 1;
                        lastTapTime = now;
                        if (tapCount >= 3) {
                            hideChart();
                        }
                    };

                    chartButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        showChart();
                    });
                    chartButton.addEventListener('touchstart', (e) => {
                        e.preventDefault();
                        showChart();
                    }, { passive: false });

                    overlay.addEventListener('touchstart', (e) => {
                        e.stopPropagation();
                        handleTap();
                    }, { passive: true });

                    overlay.addEventListener('click', (e) => {
                        e.stopPropagation();
                        handleTap();
                    });
                }
            }

            break;
        }

        case 'pin': {
            const wordInputs = [
                document.getElementById('pinWord1'),
                document.getElementById('pinWord2'),
                document.getElementById('pinWord3'),
                document.getElementById('pinWord4'),
                document.getElementById('pinWord5'),
                document.getElementById('pinWord6')
            ];
            const codeInput = document.getElementById('pinCode');
            const submitButton = document.getElementById('pinSubmit');
            const messageElement = document.getElementById('pinMessage');

            const setMessage = (text = '', isError = false) => {
                if (messageElement) {
                    messageElement.textContent = text;
                    messageElement.style.color = isError ? '#f44336' : '#4CAF50';
                }
            };

            const handleSubmit = () => {
                setMessage('');
                
                // Get non-empty word boxes
                const wordBoxes = wordInputs
                    .map(input => (input?.value || '').trim())
                    .filter(word => word.length > 0);
                
                if (wordBoxes.length === 0) {
                    setMessage('Enter at least one word.', true);
                    return;
                }
                
                // Get and validate code
                const codeValue = (codeInput?.value || '').trim();
                if (!codeValue) {
                    setMessage('Enter a code.', true);
                    return;
                }
                
                // Extract digits only, max 6
                const digitsOnly = codeValue.replace(/[^0-9]/g, '').slice(0, 6);
                if (!digitsOnly) {
                    setMessage('Code must contain at least one digit.', true);
                    return;
                }
                
                // Validate code length matches number of non-empty boxes
                if (digitsOnly.length < wordBoxes.length) {
                    setMessage(`Code must have at least ${wordBoxes.length} digits for ${wordBoxes.length} word(s).`, true);
                    return;
                }
                
                // Filter words
                const filteredWords = filterWordsByPin(currentFilteredWords, wordInputs.map(input => input?.value || ''), digitsOnly);
                
                if (filteredWords.length === 0) {
                    setMessage('No matches found.', true);
                } else {
                    setMessage(`${filteredWords.length} matches found.`);
                }
                
                callback(filteredWords);
                
                // Complete feature
                const featureDiv = document.getElementById('pinFeature');
                if (featureDiv) {
                    featureDiv.classList.add('completed');
                    featureDiv.dispatchEvent(new Event('completed'));
                }
            };

            if (submitButton) {
                submitButton.addEventListener('click', handleSubmit);
                submitButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    handleSubmit();
                }, { passive: false });
            }
            
            // Auto-uppercase word inputs (not case-sensitive)
            wordInputs.forEach(input => {
                if (input) {
                    input.addEventListener('input', () => {
                        const value = input.value;
                        const upperValue = value.toUpperCase();
                        if (value !== upperValue) {
                            input.value = upperValue;
                        }
                    });
                    
                    // Make inputs easily focusable on touch
                    input.addEventListener('touchstart', (e) => {
                        e.stopPropagation();
                        input.focus();
                    }, { passive: true });
                    
                    input.addEventListener('touchend', (e) => {
                        e.stopPropagation();
                        input.focus();
                    }, { passive: true });
                    
                    // Enter key support
                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            handleSubmit();
                        }
                    });
                }
            });
            
            // Restrict code input to digits only
            if (codeInput) {
                codeInput.addEventListener('input', () => {
                    const value = codeInput.value;
                    const digitsOnly = value.replace(/[^0-9]/g, '').slice(0, 6);
                    if (value !== digitsOnly) {
                        codeInput.value = digitsOnly;
                    }
                });
                
                // Make input easily focusable on touch
                codeInput.addEventListener('touchstart', (e) => {
                    e.stopPropagation();
                    codeInput.focus();
                }, { passive: true });
                
                codeInput.addEventListener('touchend', (e) => {
                    e.stopPropagation();
                    codeInput.focus();
                }, { passive: true });
                
                // Enter key support
                codeInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        handleSubmit();
                    }
                });
            }
            break;
        }
    }
}

// Function to display results
function displayResults(words) {
    const resultsContainer = document.getElementById('results');
    if (!resultsContainer) {
        console.error('Results container not found');
        return;
    }
    
    console.log('Displaying results in container:', resultsContainer);
    
    // Clear the results container
    resultsContainer.innerHTML = '';
    
    // Capture SCRABBLE1 exact-match set for highlighting (used in list build and load-more)
    const exactHighlightSet = new Set(scrabble1ExactMatchSet);
    const getDisplayWord = (word) => (engineDisplayMap && engineDisplayMap.get(word)) || word;
    
    if (words.length === 0) {
        resultsContainer.innerHTML = '<p>No words match the current criteria.</p>';
        updateWordCount(0);
        updateSologramOverlay([]);
        updateT9DefinitesOverlay([]);
        return;
    }
    
    // Update word count first
    updateWordCount(words.length);
    updateExportButtonState(words);
    
    // Calculate T9 strings if needed (workflow has T9 features, or user tapped to hold)
    const shouldShowT9 = workflowHasT9Feature && words.length <= 20;
    const shouldAutoShowT9 = workflowHasT9Feature && words.length <= 10; // Auto-display for 10 or fewer
    if (shouldShowT9) {
        calculateT9Strings(words);
    }
    if (userShowT9ByLongPress && words.length > 0) {
        words.forEach(w => {
            if (!t9StringsMap.has(w)) t9StringsMap.set(w, wordToT9(w));
        });
    }
    
    // For large lists, use virtual scrolling approach
    if (words.length > 1000) {
        // Show first 1000 words with a "show more" option
        const initialWords = words.slice(0, 1000);
        const remainingCount = words.length - 1000;
        
        // Create HTML string for initial words (SCRABBLE1 exact-match highlight; T9 if tap-to-hold)
        const wordListHTML = initialWords.map(word => {
            const displayWord = getDisplayWord(word);
            const scrabble1Cls = exactHighlightSet.has(word) ? ' scrabble1-exact' : '';
            if (userShowT9ByLongPress) {
                const t9String = t9StringsMap.get(word) || wordToT9(word);
                const firstFour = t9String.substring(0, 4);
                const rest = t9String.substring(4);
                return `<li class="word-with-t9${scrabble1Cls}" data-word="${word}"><div style="font-weight: bold; margin-bottom: 8px;">${displayWord}</div><div style="border-top: 1px solid #ddd; margin: 8px 0; padding-top: 8px;"><span style="color: red; font-weight: bold;">${firstFour}</span>${rest}</div></li>`;
            }
            const cls = exactHighlightSet.has(word) ? ' class="scrabble1-exact"' : '';
            return `<li${cls}>${displayWord}</li>`;
        }).join('');
        
        resultsContainer.innerHTML = `
            <ul class="word-list">
                ${wordListHTML}
            </ul>
            <div class="load-more-container" style="text-align: center; margin: 20px 0;">
                <button id="loadMoreBtn" class="load-more-btn" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Show ${remainingCount.toLocaleString()} more words
                </button>
            </div>
        `;
        
        // Add event listener for load more button
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                // Show all words (preserve SCRABBLE1 highlight; T9 if tap-to-hold)
                const allWordsHTML = words.map(word => {
                    const displayWord = getDisplayWord(word);
                    const scrabble1Cls = exactHighlightSet.has(word) ? ' scrabble1-exact' : '';
                    if (userShowT9ByLongPress) {
                        const t9String = t9StringsMap.get(word) || wordToT9(word);
                        const firstFour = t9String.substring(0, 4);
                        const rest = t9String.substring(4);
                        return `<li class="word-with-t9${scrabble1Cls}" data-word="${word}"><div style="font-weight: bold; margin-bottom: 8px;">${displayWord}</div><div style="border-top: 1px solid #ddd; margin: 8px 0; padding-top: 8px;"><span style="color: red; font-weight: bold;">${firstFour}</span>${rest}</div></li>`;
                    }
                    const cls = exactHighlightSet.has(word) ? ' class="scrabble1-exact"' : '';
                    return `<li${cls}>${displayWord}</li>`;
                }).join('');
                resultsContainer.innerHTML = `
                    <ul class="word-list">
                        ${allWordsHTML}
                    </ul>
                `;
                updateSologramOverlay(words);
                updateT9DefinitesOverlay(words);
                attachAtlasColoursHandlers(words);
            });
        }
    } else {
        // For smaller lists, show all words at once using innerHTML
        const wordListHTML = words.map(word => {
            const displayWord = getDisplayWord(word);
            const scrabble1Cls = exactHighlightSet.has(word) ? ' scrabble1-exact' : '';
            if (shouldAutoShowT9 || userShowT9ByLongPress) {
                // Auto-display or tap-to-hold: word and T9 string (first 4 digits in red)
                const t9String = t9StringsMap.get(word) || wordToT9(word);
                const firstFour = t9String.substring(0, 4);
                const rest = t9String.substring(4);
                
                return `<li class="word-with-t9${scrabble1Cls}" data-word="${word}" style="cursor: pointer;">
                    <div style="font-weight: bold; margin-bottom: 8px;">${displayWord}</div>
                    <div style="border-top: 1px solid #ddd; margin: 8px 0; padding-top: 8px;">
                        <span style="color: red; font-weight: bold;">${firstFour}</span>${rest}
                    </div>
                </li>`;
            } else if (shouldShowT9) {
                // Make clickable for 11-20 words (click to reveal T9)
                return `<li class="word-clickable${scrabble1Cls}" data-word="${word}" style="cursor: pointer;">${displayWord}</li>`;
            } else {
                // Just show word for 21+ words or no T9 features
                const cls = scrabble1Cls ? ` class="${scrabble1Cls.trim()}"` : '';
                return `<li${cls}>${displayWord}</li>`;
            }
        }).join('');
        
        resultsContainer.innerHTML = `
            <ul class="word-list">
                ${wordListHTML}
            </ul>
        `;
        
        // Add click handlers for words if T9 features are enabled or tap-to-hold is on
        if (shouldShowT9 || userShowT9ByLongPress) {
            if (shouldAutoShowT9 || userShowT9ByLongPress) {
                // For 10 or fewer: clicking copies T9 string to clipboard
                const wordElements = resultsContainer.querySelectorAll('.word-with-t9');
                const TAP_MOVE_THRESHOLD = 10;
                wordElements.forEach(li => {
                    const doCopyT9 = () => {
                        const word = li.dataset.word;
                        const t9String = t9StringsMap.get(word) || wordToT9(word);
                        navigator.clipboard.writeText(t9String).then(() => {
                            li.style.backgroundColor = '#d4edda';
                            setTimeout(() => { li.style.backgroundColor = ''; }, 300);
                        }).catch(err => { console.error('Failed to copy to clipboard:', err); });
                    };
                    const handleWordClick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        doCopyT9();
                    };
                    let touchStartX = 0, touchStartY = 0, touchMoved = false;
                    li.addEventListener('click', handleWordClick);
                    li.addEventListener('touchstart', (e) => {
                        touchMoved = false;
                        touchStartX = e.touches[0].clientX;
                        touchStartY = e.touches[0].clientY;
                    }, { passive: true });
                    li.addEventListener('touchmove', (e) => {
                        if (!touchMoved && e.touches[0]) {
                            const dx = Math.abs(e.touches[0].clientX - touchStartX);
                            const dy = Math.abs(e.touches[0].clientY - touchStartY);
                            if (dx > TAP_MOVE_THRESHOLD || dy > TAP_MOVE_THRESHOLD) touchMoved = true;
                        }
                    }, { passive: true });
                    li.addEventListener('touchend', (e) => {
                        if (!touchMoved) {
                            e.preventDefault();
                            doCopyT9();
                        }
                    }, { passive: false });
                });
            } else {
                // For 11-20: clicking reveals T9 string (replaces word text)
                const wordElements = resultsContainer.querySelectorAll('.word-clickable');
                const TAP_MOVE_THRESHOLD = 10;
                wordElements.forEach(li => {
                    const doRevealAndCopyT9 = () => {
                        const word = li.dataset.word;
                        const t9String = t9StringsMap.get(word) || wordToT9(word);
                        const firstFour = t9String.substring(0, 4);
                        const rest = t9String.substring(4);
                        li.innerHTML = `<span style="color: red; font-weight: bold;">${firstFour}</span>${rest}`;
                        navigator.clipboard.writeText(t9String).then(() => {
                            li.style.backgroundColor = '#d4edda';
                            setTimeout(() => { li.style.backgroundColor = ''; }, 300);
                        }).catch(err => { console.error('Failed to copy to clipboard:', err); });
                    };
                    const handleWordClick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        doRevealAndCopyT9();
                    };
                    let touchStartX = 0, touchStartY = 0, touchMoved = false;
                    li.addEventListener('click', handleWordClick);
                    li.addEventListener('touchstart', (e) => {
                        touchMoved = false;
                        touchStartX = e.touches[0].clientX;
                        touchStartY = e.touches[0].clientY;
                    }, { passive: true });
                    li.addEventListener('touchmove', (e) => {
                        if (!touchMoved && e.touches[0]) {
                            const dx = Math.abs(e.touches[0].clientX - touchStartX);
                            const dy = Math.abs(e.touches[0].clientY - touchStartY);
                            if (dx > TAP_MOVE_THRESHOLD || dy > TAP_MOVE_THRESHOLD) touchMoved = true;
                        }
                    }, { passive: true });
                    li.addEventListener('touchend', (e) => {
                        if (!touchMoved) {
                            e.preventDefault();
                            doRevealAndCopyT9();
                        }
                    }, { passive: false });
                });
            }
        }
        attachAtlasColoursHandlers(words);
    }
    
    // Clear SCRABBLE1 highlight set so next display doesn't reuse it
    scrabble1ExactMatchSet = new Set();
    
    // Tap-to-hold on wordlist (top section): hold 1s to toggle T9 strings under each word
    if (!resultsContainer._t9LongPressAttached) {
        resultsContainer._t9LongPressAttached = true;
        const LONG_PRESS_MS = 1000;
        const MOVE_THRESHOLD = 10;
        let longPressTimer = null;
        let startX = 0, startY = 0;
        const clearTimer = () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        };
        const onPointerDown = (e) => {
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            startX = e.clientX;
            startY = e.clientY;
            clearTimer();
            longPressTimer = setTimeout(() => {
                longPressTimer = null;
                userShowT9ByLongPress = !userShowT9ByLongPress;
                displayResults(currentFilteredWords);
            }, LONG_PRESS_MS);
        };
        const onPointerMove = (e) => {
            if (!longPressTimer) return;
            if (Math.abs(e.clientX - startX) > MOVE_THRESHOLD || Math.abs(e.clientY - startY) > MOVE_THRESHOLD) clearTimer();
        };
        const onPointerUp = () => clearTimer();
        const onPointerCancel = () => clearTimer();
        resultsContainer.addEventListener('pointerdown', onPointerDown, { passive: true });
        resultsContainer.addEventListener('pointermove', onPointerMove, { passive: true });
        resultsContainer.addEventListener('pointerup', onPointerUp, { passive: true });
        resultsContainer.addEventListener('pointercancel', onPointerCancel, { passive: true });
    }
    
    // SOLOGRAM: show possible pointed-to words at bottom of results when workflow has SOLOGRAM
    updateSologramOverlay(words);
    // T9 B-IDENTITY: show definites (first 4 digits/letters) at bottom of results after B-IDENTITY submitted
    updateT9DefinitesOverlay(words);
    
    // Ensure the feature area is empty and visible
    const featureArea = document.getElementById('featureArea');
    if (featureArea) {
        featureArea.style.display = 'block';
        // Clear any wordlist that might have been accidentally added to the feature area
        if (featureArea.querySelector('.word-list')) {
            featureArea.innerHTML = '';
        }
    }
}

// Function to update word count
function updateWordCount(count) {
    let wordCountDisplay = document.getElementById('wordCountDisplay');
    
    // Create the display if it doesn't exist
    if (!wordCountDisplay) {
        wordCountDisplay = document.createElement('div');
        wordCountDisplay.id = 'wordCountDisplay';
        wordCountDisplay.className = 'word-count-display';
        document.body.appendChild(wordCountDisplay);
    }
    
    wordCountDisplay.textContent = count;
}

// Add CSS for word count display
const style = document.createElement('style');
style.textContent = `
    .word-count-display {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(0, 0, 0, 0.75);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 16px;
        font-weight: bold;
        z-index: 1000;
        min-width: 40px;
        text-align: center;
    }
`;
document.head.appendChild(style);

// Function to handle vowel selection
function handleVowelSelection(includeVowel) {
    const currentVowel = uniqueVowels[currentVowelIndex];
    console.log('Handling vowel selection:', currentVowel, 'Include:', includeVowel);
    
    if (includeVowel) {
        currentFilteredWordsForVowels = currentFilteredWordsForVowels.filter(word => 
            word.toLowerCase().includes(currentVowel)
        );
        } else {
        currentFilteredWordsForVowels = currentFilteredWordsForVowels.filter(word => 
            !word.toLowerCase().includes(currentVowel)
        );
    }
    
    // Move to next vowel
    currentVowelIndex++;
    
    // Update the display with the filtered words
    displayResults(currentFilteredWordsForVowels);
    
    // If we still have vowels to process, show the next one
    if (currentVowelIndex < uniqueVowels.length) {
        const vowelFeature = document.getElementById('vowelFeature');
        const vowelLetter = vowelFeature.querySelector('.vowel-letter');
        vowelLetter.textContent = uniqueVowels[currentVowelIndex].toUpperCase();
        vowelLetter.style.display = 'inline-block';
    } else {
        // No more vowels to process, mark as completed
        const vowelFeature = document.getElementById('vowelFeature');
        vowelFeature.classList.add('completed');
        // Update currentFilteredWords with the vowel-filtered results
        currentFilteredWords = [...currentFilteredWordsForVowels];
        
        // Hide vowel feature
        vowelFeature.style.display = 'none';
        
        // Reset both lexicon states
        lexiconCompleted = false;
        originalLexCompleted = false;
        
        // Dispatch the completed event
        console.log('Dispatching vowel feature completed event');
        const completedEvent = new Event('completed');
        vowelFeature.dispatchEvent(completedEvent);
        
        // Show next feature
        showNextFeature();
    }
}

// Function to filter words by O? feature
function filterWordsByO(words, includeO) {
    console.log('Filtering words by O? mode:', includeO ? 'YES' : 'NO');
    
    const filteredWords = words.filter(word => {
        const hasO = word.toLowerCase().includes('o');
        return includeO ? hasO : !hasO;
    });
    
    return filteredWords;
}

// Default ATLAS/Colours letters (locked; COLOUR3 always uses this set)
// Updated to use the colour letter string: ABCGILMOPRSTUVWY
const ATLAS_DEFAULT_LETTERS = new Set(['A', 'B', 'C', 'G', 'I', 'L', 'M', 'O', 'P', 'R', 'S', 'T', 'U', 'V', 'W', 'Y']);

// Letter → colour name for ATLAS "applicable colours" display at end of workflow
const ATLAS_COLOUR_NAMES = {
    A: 'Amber', B: 'Blue', C: 'Cyan', E: 'Emerald', G: 'Green', I: 'Indigo', L: 'Lime',
    M: 'Magenta', N: 'Navy', O: 'Orange', P: 'Pink', R: 'Red', S: 'Silver', T: 'Teal',
    V: 'Violet', W: 'White', Y: 'Yellow'
};

// Months preset: first letters of month names, deduplicated → J F M A S O N D
const ATLAS_MONTHS_LETTERS = new Set(['J', 'F', 'M', 'A', 'S', 'O', 'N', 'D']);

function lettersStringToSet(s) {
    if (typeof s !== 'string') return new Set();
    const letters = s.toUpperCase().replace(/[^A-Z]/g, '').split('');
    return new Set(letters);
}

/** Returns the letter set for ATLAS based on settings. Empty custom defaults to Colours. */
function getAtlasLetterSet() {
    const source = appSettings && appSettings.atlasLetterSource;
    if (source === 'months') return new Set(ATLAS_MONTHS_LETTERS);
    if (source === 'custom') {
        const custom = (appSettings && appSettings.atlasCustomLetters) || '';
        const set = lettersStringToSet(custom);
        if (set.size === 0) return new Set(ATLAS_DEFAULT_LETTERS);
        return set;
    }
    return new Set(ATLAS_DEFAULT_LETTERS);
}

// Function to filter words by COLOUR3 (always uses default colour letters)
function filterWordsByColour3(words) {
    const filteredWords = words.filter(word => {
        const pos5 = word.length > 4 ? word[4].toUpperCase() : null;
        return pos5 && ATLAS_DEFAULT_LETTERS.has(pos5);
    });
    return filteredWords;
}

/** Pure filter: keep words where all specified positions (1–6) are in the ATLAS letter set. */
function filterWordsByAtlas(words, positionsInput) {
    const raw = (positionsInput || '').toString().trim();
    if (!raw) return words;

    const positions = new Set();
    for (const ch of raw) {
        if (ch >= '1' && ch <= '6') {
            positions.add(parseInt(ch, 10) - 1); // store as 0-based
        }
    }
    if (positions.size === 0) return words;

    const letterSet = getAtlasLetterSet();
    return words.filter(word => {
        const upper = (word || '').toString().toUpperCase();
        for (const idx of positions) {
            if (idx < 0 || idx >= upper.length) return false;
            if (!letterSet.has(upper[idx])) return false;
        }
        return true;
    });
}

/** Get applicable colour names from words' first 6 positions (for ATLAS Colours end-of-workflow display). */
function getApplicableAtlasColourNames(words) {
    if (!Array.isArray(words) || words.length === 0) return [];
    const letterSet = ATLAS_DEFAULT_LETTERS;
    const seen = new Set();
    for (const word of words) {
        const slice = (word || '').toString().toUpperCase().slice(0, 6);
        for (let i = 0; i < slice.length; i++) {
            const ch = slice[i];
            if (letterSet.has(ch)) seen.add(ch);
        }
    }
    return Array.from(seen).sort().map(ch => ATLAS_COLOUR_NAMES[ch]).filter(Boolean);
}

/** Attach click handlers / auto-display for ATLAS applicable colours in results. */
function attachAtlasColoursHandlers(words) {
    if (lastAtlasColoursCount == null) return; // ATLAS (Colours) not used
    if (!Array.isArray(words) || words.length === 0) return;

    const resultsContainer = document.getElementById('results');
    if (!resultsContainer) return;

    let info = document.getElementById('atlasApplicableColours');
    if (!info) {
        info = document.createElement('p');
        info.id = 'atlasApplicableColours';
        info.className = 'atlas-applicable-colours';
        info.style.color = 'red';
        info.style.marginTop = '16px';
        info.style.fontWeight = 'bold';
        resultsContainer.appendChild(info);
    }
    info.textContent = '';
    info.style.display = 'none';

    const list = resultsContainer.querySelector('ul.word-list');
    if (!list) return;
    const items = Array.from(list.querySelectorAll('li'));
    if (!items.length) return;

    const getWordFromLi = (li) => {
        if (li.dataset && li.dataset.word) return li.dataset.word;
        return (li.textContent || '').trim();
    };

    if (items.length === 1) {
        const word = getWordFromLi(items[0]);
        const names = getApplicableAtlasColourNames([word]);
        if (names.length > 0) {
            info.textContent = 'Applicable colours: ' + names.join(', ');
            info.style.display = '';
        }
    } else {
        items.forEach(li => {
            const word = getWordFromLi(li);
            const handler = (e) => {
                // Don't interfere with other click handlers like T9 copy,
                // just update the colours information.
                const names = getApplicableAtlasColourNames([word]);
                if (names.length > 0) {
                    info.textContent = 'Applicable colours: ' + names.join(', ');
                } else {
                    info.textContent = 'Applicable colours: (none)';
                }
                info.style.display = '';
            };
            li.addEventListener('click', handler);
            li.addEventListener('touchstart', handler, { passive: true });
        });
    }
}

// --- Letter Lying: letter presence in word (any position) ---
/** Pure filter: keep words that contain / do not contain the letter (anywhere). */
function filterWordsByLetterPresence(words, letter, inWord) {
    if (!letter || typeof letter !== 'string') return words;
    const L = letter.toUpperCase().charAt(0);
    if (!/^[A-Z]$/.test(L)) return words;
    return words.filter(word => {
        const has = word.toUpperCase().includes(L);
        return inWord ? has : !has;
    });
}

/** Letter that appears in the most words; tie-break alphabetical. Returns null if words empty.
 *  `excludedLetters` is an optional Set of letters that must NOT be returned (e.g. already asked).
 */
function getMostFrequentLetterInWordlist(words, excludedLetters) {
    if (!words || words.length === 0) return null;
    const countByLetter = new Map();
    for (const word of words) {
        const seen = new Set();
        const upper = word.toUpperCase();
        for (let i = 0; i < upper.length; i++) {
            const c = upper[i];
            if (/^[A-Z]$/.test(c) && !seen.has(c)) {
                if (excludedLetters && excludedLetters.has(c)) continue;
                seen.add(c);
                countByLetter.set(c, (countByLetter.get(c) || 0) + 1);
            }
        }
    }
    if (countByLetter.size === 0) return null;
    const sorted = [...countByLetter.entries()]
        .sort((a, b) => {
            if (b[1] !== a[1]) return b[1] - a[1];
            return a[0].localeCompare(b[0]);
        });
    return sorted[0][0];
}

/** Static letter list for Letter Lying: from Default, Unique, Personal, or Saved set. */
function getLetterLyingStaticLetters() {
    const source = (appSettings && appSettings.letterLyingStringSource) || 'default';
    let s = '';
    if (source === 'default') {
        s = DEFAULT_LETTER_LYING_STRING;
    } else if (source === 'personal') {
        s = (appSettings && appSettings.letterLyingStaticString) || DEFAULT_LETTER_LYING_STRING;
    } else if (source === 'saved') {
        const sets = (appSettings && appSettings.letterLyingSavedSets) || [];
        const id = appSettings && appSettings.letterLyingSavedId;
        const set = sets.find(x => x.id === id);
        s = (set && set.string) || DEFAULT_LETTER_LYING_STRING;
    } else {
        s = (appSettings && appSettings.letterLyingStaticString) || DEFAULT_LETTER_LYING_STRING;
    }
    const normalized = (typeof s === 'string' ? s : '').toUpperCase().replace(/[^A-Z]/g, '');
    const seen = new Set();
    const out = [];
    for (const c of normalized) {
        if (!seen.has(c)) {
            seen.add(c);
            out.push(c);
        }
    }
    return out;
}

const VOWEL2_VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
/** Pure filter: answer 'yes' = keep words with vowel in position 2; 'no' = keep words without vowel in position 2. */
function filterWordsByVowel2(words, answer) {
    if (answer === 'yes') {
        return words.filter(word => word.length >= 2 && VOWEL2_VOWELS.has(word[1].toLowerCase()));
    }
    if (answer === 'no') {
        return words.filter(word => word.length < 2 || !VOWEL2_VOWELS.has(word[1].toLowerCase()));
    }
    return words;
}

// Function to show next feature
function showNextFeature() {
    const features = [
        'position1Feature',
        'vowelFeature',
        'oFeature',
        'lexiconFeature',
        'zeroCurvesFeature',
        'loveLettersFeature',
        'eeeFeature',
        'eeeFirstFeature',
        'lengthFeature',
        'letterShapesFeature',
        'mostFrequentFeature',
        'leastFrequentFeature',
        'notInFeature',
        'abcdeFeature',
        'abcFeature',
    ];
    
    // Hide all features first
    features.forEach(feature => {
        const element = document.getElementById(feature);
        if (element) {
            element.style.display = 'none';
        }
    });
    
    // Show the first non-completed feature
    if (!document.getElementById('position1Feature').classList.contains('completed')) {
        document.getElementById('position1Feature').style.display = 'block';
    }
    else if (!document.getElementById('vowelFeature').classList.contains('completed')) {
        document.getElementById('vowelFeature').style.display = 'block';
    }
    else if (!document.getElementById('oFeature').classList.contains('completed')) {
        document.getElementById('oFeature').style.display = 'block';
    }
    else if (!document.getElementById('lexiconFeature').classList.contains('completed')) {
        document.getElementById('lexiconFeature').style.display = 'block';
    }
    else if (!document.getElementById('eeeFeature').classList.contains('completed')) {
        document.getElementById('eeeFeature').style.display = 'block';
    }
    else if (!document.getElementById('eeeFirstFeature').classList.contains('completed')) {
        document.getElementById('eeeFirstFeature').style.display = 'block';
    }
    else if (!document.getElementById('lengthFeature').classList.contains('completed')) {
        document.getElementById('lengthFeature').style.display = 'block';
    }
    else if (document.getElementById('letterShapesFeature') && !document.getElementById('letterShapesFeature').classList.contains('completed')) {
        document.getElementById('letterShapesFeature').style.display = 'block';
    }
    else if (!document.getElementById('mostFrequentFeature').classList.contains('completed')) {
        document.getElementById('mostFrequentFeature').style.display = 'block';
    }
    else if (!document.getElementById('leastFrequentFeature').classList.contains('completed')) {
        document.getElementById('leastFrequentFeature').style.display = 'block';
    }
    else if (!document.getElementById('notInFeature').classList.contains('completed')) {
        document.getElementById('notInFeature').style.display = 'block';
    }
    else if (!document.getElementById('abcdeFeature').classList.contains('completed')) {
        document.getElementById('abcdeFeature').style.display = 'block';
    }
    else if (!document.getElementById('abcFeature').classList.contains('completed')) {
        document.getElementById('abcFeature').style.display = 'block';
    }
    else {
        expandWordList();
    }
}

// Function to expand word list
function expandWordList() {
    const wordListContainer = document.getElementById('wordListContainer');
    wordListContainer.classList.add('expanded');
}

// Function to reset the app
function resetApp() {
    // Reset all variables
    currentFilteredWords = [...originalFilteredWords];
    currentVowelIndex = 0;
    uniqueVowels = [];
    hasAdjacentConsonants = null;
    selectedCurvedLetter = null;
    hasO = null;
    currentFilteredWordsForVowels = [];
    currentPosition1Word = '';
    originalLexCompleted = false;
    lexiconCompleted = false;
    eeeCompleted = false;
    
    // Clear all results and show full wordlist
    displayResults(originalFilteredWords);
    
    // Reset all features
    const features = [
        'consonantQuestion',
        'position1Feature',
        'vowelFeature',
        'colour3Feature',
        'atlasFeature',
        'shapeFeature',
        'oFeature',
        'curvedFeature',
        'lexiconFeature',
        'zeroCurvesFeature',
        'loveLettersFeature',
        'originalLexFeature',
        'eeeFeature',
        'eeeFirstFeature',
        'lengthFeature',
        'letterShapesFeature',
        'mostFrequentFeature',
        'leastFrequentFeature',
        'notInFeature',
        'abcdeFeature',
        'abcFeature',
    ];
    
    features.forEach(featureId => {
        const feature = document.getElementById(featureId);
        if (feature) {
            feature.classList.remove('completed');
            feature.style.display = 'none';
        }
    });
    
    // Reset all input fields
    document.getElementById('position1Input').value = '';
    document.getElementById('originalLexInput').value = '';
    document.getElementById('lexiconInput').value = '';
    const loveLettersInputEl = document.getElementById('loveLettersInput');
    if (loveLettersInputEl) loveLettersInputEl.value = '';
    document.getElementById('notInInput').value = '';
    const atlasInputEl = document.getElementById('atlasInput');
    if (atlasInputEl) atlasInputEl.value = '';
    
    // Show the first feature (consonant question)
    document.getElementById('consonantQuestion').style.display = 'block';
    
    // Remove export button if it exists
    const exportButton = document.getElementById('exportButton');
    if (exportButton) {
        exportButton.remove();
    }
}

// Function to check if a word has any adjacent consonants
function hasWordAdjacentConsonants(word) {
    const vowels = new Set(['a', 'e', 'i', 'o', 'u']);
    const wordLower = word.toLowerCase();
    
    for (let i = 0; i < wordLower.length - 1; i++) {
        const currentChar = wordLower[i];
        const nextChar = wordLower[i + 1];
        
        // Check if both current and next characters are consonants
        if (!vowels.has(currentChar) && !vowels.has(nextChar)) {
            return true;
        }
    }
    return false;
}

// Letter shape categories with exact categorization
const letterShapes = {
    straight: new Set(['A', 'E', 'F', 'H', 'I', 'K', 'L', 'M', 'N', 'T', 'V', 'W', 'X', 'Y', 'Z']),
    curved: new Set(['B', 'C', 'D', 'G', 'J', 'O', 'P', 'Q', 'R', 'S', 'U'])
};

// Function to get letter shape
function getLetterShape(letter) {
    letter = letter.toUpperCase();
    if (letterShapes.straight.has(letter)) return 'straight';
    if (letterShapes.curved.has(letter)) return 'curved';
    return null;
}

// Function to filter words by shape category
function filterWordsByShape(words, position, category) {
    return words.filter(word => {
        if (word.length <= position) return false;
        const letter = word[position];
        return getLetterShape(letter) === category;
    });
}

// Function to update shape display
function updateShapeDisplay(words) {
    const shapeFeature = document.getElementById('shapeFeature');
    const shapeDisplay = shapeFeature.querySelector('.shape-display');
    
    if (!isShapeMode || words.length === 0) {
        shapeFeature.style.display = 'none';
        return;
    }
    
    // Get the length of the shortest word to avoid out-of-bounds
    const shortestLength = Math.min(...words.map(word => word.length));
    
    // Analyze all positions in the words
    const startPos = 0;
    const endPos = shortestLength;
    
    const position = findLeastVariancePosition(words, startPos, endPos);
    
    if (position === -1) {
        shapeFeature.style.display = 'none';
        return;
    }
    
    currentPosition = position;
    const analysis = analyzePositionShapes(words, position);
    const shapes = analysis.shapes;
    
    const positionDisplay = shapeDisplay.querySelector('.position-display');
    positionDisplay.textContent = `Position ${position + 1}`;
    
    const categoryButtons = shapeDisplay.querySelector('.category-buttons');
    categoryButtons.innerHTML = '';
    
    Object.entries(shapes).forEach(([category, letters]) => {
        if (letters.size > 0) {
            const button = document.createElement('button');
            button.className = 'category-button';
            const percentage = Math.round(analysis.distribution[category] * 100);
            button.textContent = `${category.toUpperCase()} (${percentage}%)`;
            button.addEventListener('click', () => {
                const filteredWords = filterWordsByShape(words, position, category);
                displayResults(filteredWords);
                expandWordList();
            });
            categoryButtons.appendChild(button);
        }
    });
    
    shapeFeature.style.display = 'block';
}

// Function to analyze position shapes
function analyzePositionShapes(words, position) {
    const shapes = {
        straight: new Set(),
        curved: new Set()
    };
    
    let totalLetters = 0;
    
    words.forEach(word => {
        if (word.length > position) {
            const letter = word[position];
            const shape = getLetterShape(letter);
            if (shape) {
                shapes[shape].add(letter);
                totalLetters++;
            }
        }
    });
    
    const distribution = {
        straight: shapes.straight.size / totalLetters,
        curved: shapes.curved.size / totalLetters
    };
    
    return {
        shapes,
        distribution,
        totalLetters
    };
}

// Function to find position with least variance
function findLeastVariancePosition(words, startPos, endPos) {
    let maxVariance = -1;
    let result = -1;
    
    for (let pos = startPos; pos < endPos; pos++) {
        const analysis = analyzePositionShapes(words, pos);
        
        // Skip if we don't have at least one letter of each shape
        if (analysis.shapes.straight.size === 0 || analysis.shapes.curved.size === 0) {
            continue;
        }
        
        // Calculate variance between the two distributions
        const variance = Math.abs(analysis.distribution.straight - analysis.distribution.curved);
        
        if (variance > maxVariance) {
            maxVariance = variance;
            result = pos;
        }
    }
    
    return result;
}

// Function to find position with most variance
// ignorePosition1: when true, do not pick position 0 (Position 1); use next best of positions 1–5
function findPositionWithMostVariance(words, ignorePosition1) {
    // Initialize array to store unique letters for each position
    const positionLetters = Array(5).fill().map(() => new Set());

    // Collect unique letters for each position
    words.forEach(word => {
        for (let i = 0; i < Math.min(5, word.length); i++) {
            positionLetters[i].add(word[i].toUpperCase());
        }
    });

    // Find position with most unique letters (optionally skip position 0)
    let maxVariance = -1;
    let result = -1;
    let resultLetters = [];

    positionLetters.forEach((letters, index) => {
        if (ignorePosition1 && index === 0) return;
        if (letters.size > maxVariance) {
            maxVariance = letters.size;
            result = index;
            resultLetters = Array.from(letters).sort();
        }
    });

    return {
        position: result,
        letters: resultLetters
    };
}

// Function to filter words by original lex
function filterWordsByOriginalLex(words, position, letter) {
    return words.filter(word => {
        if (word.length <= position) return false;
        return word[position].toUpperCase() === letter.toUpperCase();
    });
}

// Function to filter words by EEE? feature
function filterWordsByEee(words, mode) {
    return words.filter(word => {
        if (word.length < 2) return false;
        
        const secondChar = word[1].toUpperCase();
        
        switch(mode) {
            case 'E':
                return secondChar === 'E';
                
            case 'YES':
                const yesLetters = new Set(['B', 'C', 'D', 'G', 'P', 'T', 'V', 'Z']);
                return yesLetters.has(secondChar);
                
            case 'NO':
                const noLetters = new Set(['B', 'C', 'D', 'G', 'P', 'T', 'V', 'Z']);
                return !noLetters.has(secondChar);
        }
    });
}

// Function to filter words by EEEFIRST feature
function filterWordsByEeeFirst(words, mode) {
    return words.filter(word => {
        if (word.length < 1) return false;
        
        const firstChar = word[0].toUpperCase();
        
        switch(mode) {
            case 'E':
                return firstChar === 'E';
                
            case 'YES':
                const yesLetters = new Set(['B', 'C', 'D', 'G', 'P', 'T', 'V', 'Z']);
                return yesLetters.has(firstChar);
                
            case 'NO':
                const noLetters = new Set(['B', 'C', 'D', 'G', 'P', 'T', 'V', 'Z']);
                return !noLetters.has(firstChar);
        }
    });
}

// Function to filter words by LEXICON feature
function filterWordsByLexicon(words, positions) {
    const curvedLetters = new Set(['B', 'C', 'D', 'G', 'J', 'O', 'P', 'Q', 'R', 'S', 'U']);
    
    // Special case: if input is "0", filter for words with all straight letters in first 5 positions
    if (positions === "0") {
        return words.filter(word => {
            // Check first 5 positions (or word length if shorter)
            for (let i = 0; i < Math.min(5, word.length); i++) {
                if (curvedLetters.has(word[i].toUpperCase())) {
                    return false;
                }
            }
            return true;
        });
    }
    
    // Convert positions string to array of numbers
    const positionArray = positions.split('').map(Number);
    
    return words.filter(word => {
        // Skip words shorter than 5 characters
        if (word.length < 5) return false;
        
        // Check each position from 1 to 5
        for (let i = 0; i < 5; i++) {
            const pos = i + 1; // Convert to 1-based position
            const letter = word[i].toUpperCase();
            const isCurved = curvedLetters.has(letter);
            
            if (positionArray.includes(pos)) {
                // This position should have a curved letter
                if (!isCurved) return false;
    } else {
                // This position should have a straight letter
                if (isCurved) return false;
            }
        }
        
        return true;
    });
}

// Function to get consonants in order
function getConsonantsInOrder(str) {
    const vowels = new Set(['a', 'e', 'i', 'o', 'u']);
    const consonants = [];
    const word = str.toLowerCase();
    
    for (let i = 0; i < word.length; i++) {
        if (!vowels.has(word[i])) {
            consonants.push(word[i]);
        }
    }
    
    return consonants;
}

// Function to get unique vowels
function getUniqueVowels(str) {
    const vowels = new Set(['a', 'e', 'i', 'o', 'u']);
    const uniqueVowels = new Set();
    str.toLowerCase().split('').forEach(char => {
        if (vowels.has(char)) {
            uniqueVowels.add(char);
        }
    });
    return Array.from(uniqueVowels);
}

// Function to find least common vowel
function findLeastCommonVowel(words, vowels) {
    const vowelCounts = {};
    vowels.forEach(vowel => {
        vowelCounts[vowel] = 0;
    });

    words.forEach(word => {
        const wordLower = word.toLowerCase();
        vowels.forEach(vowel => {
            if (wordLower.includes(vowel)) {
                vowelCounts[vowel]++;
            }
        });
    });

    let leastCommonVowel = vowels[0];
    let lowestCount = vowelCounts[vowels[0]];

    vowels.forEach(vowel => {
        if (vowelCounts[vowel] < lowestCount) {
            lowestCount = vowelCounts[vowel];
            leastCommonVowel = vowel;
        }
    });

    return leastCommonVowel;
}

// Function to toggle mode
function toggleMode() {
    isNewMode = true; // Default to new mode
    resetApp();
}

// Function to toggle feature
function toggleFeature(featureId) {
    // Default all features to enabled
    isColour3Mode = true;
    isVowelMode = true;
    isShapeMode = true;
    
    // Update the display
        showNextFeature();
}

function filterWordsByPosition1(words, consonants) {
    if (!consonants || consonants.length < 2) return words;
    
    return words.filter(word => {
                        const wordLower = word.toLowerCase();
                        
        if (hasAdjacentConsonants) {
            // YES to Consonants Together: look for the specific consonant pairs together
                        // Create all possible pairs of consonants from the input word
                        const consonantPairs = [];
                        for (let i = 0; i < consonants.length; i++) {
                            for (let j = i + 1; j < consonants.length; j++) {
                                consonantPairs.push([consonants[i], consonants[j]]);
                            }
                        }
                        
                        // Check if any of the consonant pairs appear together in the word
                        for (const [con1, con2] of consonantPairs) {
                            const pair1 = con1 + con2;
                            const pair2 = con2 + con1;
                            if (wordLower.includes(pair1) || wordLower.includes(pair2)) {
                                return true;
                            }
                        }
                        return false;
                } else {
                    // NO to Consonants Together: look for ANY pair of consonants in middle 5/6 characters
                        const wordLength = wordLower.length;
                        
                        // Determine middle section length (5 for odd, 6 for even)
                        const middleLength = wordLength % 2 === 0 ? 6 : 5;
                        const startPos = Math.floor((wordLength - middleLength) / 2);
                        const middleSection = wordLower.slice(startPos, startPos + middleLength);
                        
                        // Create all possible pairs of consonants from the input word
                        const consonantPairs = [];
                        for (let i = 0; i < consonants.length; i++) {
                            for (let j = i + 1; j < consonants.length; j++) {
                                consonantPairs.push([consonants[i], consonants[j]]);
                            }
                        }
                        
                        // Check if ANY pair of consonants appears in the middle section
                        for (const [con1, con2] of consonantPairs) {
                            if (middleSection.includes(con1) && middleSection.includes(con2)) {
                                return true;
                            }
                        }
                        return false;
        }
    });
}

function filterWordsByConsMid(words, letters) {
    if (!letters || letters.length < 2) return words;
    
    return words.filter(word => {
        const wordLower = word.toLowerCase();
        
        // Check if the word contains ALL of the letters from the input
        for (const letter of letters) {
            if (!wordLower.includes(letter)) {
                return false;
            }
        }
        return true;
    });
}

function filterWordsByConsMid2(words, consonants) {
    if (!consonants || consonants.length < 2) return words;
    
    return words.filter(word => {
        const wordLower = word.toLowerCase();
        
        // Skip words that are too short (need at least 3 characters for middle positions)
        if (wordLower.length < 3) return false;
        
        // Get middle positions (exclude first and last character)
        const middlePositions = wordLower.slice(1, -1);
        
        // Create a copy of consonants to track which ones we've found
        const consonantsToFind = [...consonants];
        
        // Check each middle position for consonants
        for (const char of middlePositions) {
            const consonantIndex = consonantsToFind.indexOf(char);
            if (consonantIndex !== -1) {
                // Remove the found consonant from our search list
                consonantsToFind.splice(consonantIndex, 1);
            }
        }
        
        // Return true if we found all consonants
        return consonantsToFind.length === 0;
    });
}

// Function to display saved workflows in the workflow builder
function displaySavedWorkflows() {
    const savedWorkflowsContainer = document.getElementById('savedWorkflows');
    if (!savedWorkflowsContainer) {
        console.error('Saved workflows container not found');
        return;
    }
    
    // Clear existing content
    savedWorkflowsContainer.innerHTML = '';
    
    // Create list container
    const workflowList = document.createElement('div');
    workflowList.className = 'saved-workflow-list';
    
    // Add each workflow
    workflows.forEach(workflow => {
        const workflowItem = document.createElement('div');
        workflowItem.className = 'saved-workflow-item';
        
        // Workflow name
        const nameSpan = document.createElement('span');
        nameSpan.textContent = workflow.name;
        nameSpan.className = 'workflow-name';
        nameSpan.onclick = () => editWorkflow(workflow);
        workflowItem.appendChild(nameSpan);
        
        // Delete button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '×';
        deleteButton.className = 'delete-workflow';
        deleteButton.onclick = (e) => {
            e.stopPropagation();
            deleteWorkflow(workflow);
        };
        workflowItem.appendChild(deleteButton);
        
        workflowList.appendChild(workflowItem);
    });
    
    savedWorkflowsContainer.appendChild(workflowList);
}

// Function to toggle saved workflows visibility
function toggleSavedWorkflows() {
    let modal = document.getElementById('savedWorkflowsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'savedWorkflowsModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Saved Workflows</h2>
                    <button class="close-button" aria-label="Close">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="savedWorkflowsList"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Add close button functionality with both click and touch events
        const closeButton = modal.querySelector('.close-button');
        const closeModal = (e) => {
            e.preventDefault();
            e.stopPropagation();
            modal.style.display = 'none';
            document.body.style.overflow = '';
        };
        closeButton.addEventListener('click', closeModal);
        closeButton.addEventListener('touchstart', closeModal, { passive: false });

        // Close modal when clicking/touching outside
        const closeOnOutside = (e) => {
            if (e.target === modal) {
                e.preventDefault();
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }
        };
        modal.addEventListener('click', closeOnOutside);
        modal.addEventListener('touchstart', closeOnOutside, { passive: false });

        // Prevent body scrolling when modal is open
        modal.addEventListener('touchmove', (e) => {
            if (e.target === modal) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    // Display the modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    // Update the workflows list
    const workflowsList = document.getElementById('savedWorkflowsList');
    workflowsList.innerHTML = '';

    if (workflows.length === 0) {
        workflowsList.innerHTML = '<p class="no-workflows">No saved workflows yet.</p>';
        return;
    }

    // Create list of workflows
    workflows.forEach(workflow => {
        const workflowItem = document.createElement('div');
        workflowItem.className = 'workflow-item';
        workflowItem.setAttribute('role', 'button');
        workflowItem.setAttribute('tabindex', '0');
        
        const workflowInfo = document.createElement('div');
        workflowInfo.className = 'workflow-info';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'workflow-name';
        nameSpan.textContent = workflow.name;
        
        const stepsSpan = document.createElement('span');
        stepsSpan.className = 'workflow-steps';
        stepsSpan.textContent = workflow.steps.map(step => step.feature).join(' → ');
        
        workflowInfo.appendChild(nameSpan);
        workflowInfo.appendChild(stepsSpan);
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-workflow';
        deleteButton.textContent = '×';
        deleteButton.setAttribute('aria-label', `Delete workflow ${workflow.name}`);
        
        // Handle delete with both click and touch events (custom confirm so browser "don't ask again" doesn't block future deletes)
        const handleDelete = (e) => {
            e.preventDefault();
            e.stopPropagation();
            showDeleteWorkflowConfirm(workflow, () => {
                const index = workflows.findIndex(w => w.name === workflow.name);
                if (index !== -1) {
                    workflows.splice(index, 1);
                    localStorage.setItem('workflows', JSON.stringify(workflows));
                    const workflowSelect = document.getElementById('workflowSelect');
                    if (workflowSelect) {
                        const option = workflowSelect.querySelector(`option[value="${workflow.name}"]`);
                        if (option) option.remove();
                    }
                    workflowItem.remove();
                    if (workflows.length === 0) {
                        workflowsList.innerHTML = '<p class="no-workflows">No saved workflows yet.</p>';
                    }
                }
            });
        };
        
        deleteButton.addEventListener('click', handleDelete);
        deleteButton.addEventListener('touchstart', handleDelete, { passive: false });
        
        workflowItem.appendChild(workflowInfo);
        workflowItem.appendChild(deleteButton);
        workflowsList.appendChild(workflowItem);
    });
}

// Function to edit a workflow
function editWorkflow(workflow) {
    // Set workflow name
    const workflowNameInput = document.getElementById('workflowName');
    if (workflowNameInput) {
        workflowNameInput.value = workflow.name;
    }
    
    // Clear existing selected features
    const selectedFeaturesList = document.getElementById('selectedFeaturesList');
    if (selectedFeaturesList) {
        selectedFeaturesList.innerHTML = '';
    }
    
    // Add workflow steps to selected features
    workflow.steps.forEach(step => {
        const featureItem = document.createElement('div');
        featureItem.className = 'selected-feature-item';
        // Add T9 class if it's a T9 feature
        if (step.feature.startsWith('t9')) {
            featureItem.classList.add('t9-selected-feature');
        }
        // Add Alpha-Numeric class if it's an Alpha-Numeric feature
        if (step.feature === 'alphaNumeric' || step.feature === 'lettersAbove') {
            featureItem.classList.add('alphanumeric-selected-feature');
        }
        featureItem.setAttribute('data-feature', step.feature);
        featureItem.draggable = true;
        
        const featureName = document.createElement('span');
        featureName.textContent = step.feature.toUpperCase();
        featureItem.appendChild(featureName);
        

        
        // Add drag and drop for reordering
        featureItem.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', step.feature);
            e.dataTransfer.effectAllowed = 'move';
            featureItem.classList.add('dragging');
        });
        
        featureItem.addEventListener('dragend', () => {
            featureItem.classList.remove('dragging');
        });
        
        selectedFeaturesList.appendChild(featureItem);
    });
    
    // Show workflow creation page
    showWorkflowCreation();
}

// Custom confirm dialog for workflow delete (avoids browser "don't ask again" blocking future deletes)
let deleteWorkflowConfirmCallback = null;

function showDeleteWorkflowConfirm(workflow, onConfirmed) {
    if (appSettings && appSettings.skipWorkflowDeleteConfirm) {
        onConfirmed();
        return;
    }
    let modal = document.getElementById('deleteWorkflowConfirmModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'deleteWorkflowConfirmModal';
        modal.className = 'modal delete-workflow-confirm-modal';
        modal.innerHTML = `
            <div class="modal-content delete-workflow-confirm-content">
                <p class="delete-workflow-confirm-message"></p>
                <label class="delete-workflow-confirm-dont-ask">
                    <input type="checkbox" class="delete-workflow-confirm-checkbox"> Don't ask again
                </label>
                <div class="delete-workflow-confirm-actions">
                    <button type="button" class="delete-workflow-confirm-cancel">Cancel</button>
                    <button type="button" class="delete-workflow-confirm-delete">Delete</button>
                </div>
            </div>
        `;
        const cancelBtn = modal.querySelector('.delete-workflow-confirm-cancel');
        const deleteBtn = modal.querySelector('.delete-workflow-confirm-delete');
        function close(doConfirm) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            if (doConfirm) {
                const cb = modal.querySelector('.delete-workflow-confirm-checkbox');
                if (cb && cb.checked) {
                    appSettings.skipWorkflowDeleteConfirm = true;
                    saveAppSettings();
                }
                if (typeof deleteWorkflowConfirmCallback === 'function') deleteWorkflowConfirmCallback();
            }
            deleteWorkflowConfirmCallback = null;
        }
        // Single handler for both click and touch; use delegation so we always see the event (mobile-friendly)
        function handleModalPointer(e) {
            var t = e.target;
            if (!t || !t.closest) return;
            if (t.closest('.delete-workflow-confirm-cancel')) {
                e.preventDefault();
                e.stopPropagation();
                close(false);
                return;
            }
            if (t.closest('.delete-workflow-confirm-delete')) {
                e.preventDefault();
                e.stopPropagation();
                close(true);
                return;
            }
            if (t === modal) {
                e.preventDefault();
                close(false);
            }
        }
        modal.addEventListener('click', handleModalPointer);
        modal.addEventListener('touchstart', handleModalPointer, { passive: false });
        document.body.appendChild(modal);
    }
    deleteWorkflowConfirmCallback = onConfirmed;
    const msg = modal.querySelector('.delete-workflow-confirm-message');
    if (msg) msg.textContent = `Are you sure you want to delete "${workflow.name}"?`;
    const checkbox = modal.querySelector('.delete-workflow-confirm-checkbox');
    if (checkbox) checkbox.checked = !!(appSettings && appSettings.skipWorkflowDeleteConfirm);
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    const deleteBtn = modal.querySelector('.delete-workflow-confirm-delete');
    if (deleteBtn) deleteBtn.focus();
}

// Function to delete a workflow
function deleteWorkflow(workflow) {
    showDeleteWorkflowConfirm(workflow, () => {
        const index = workflows.findIndex(w => w.id === workflow.id);
        if (index !== -1) {
            workflows.splice(index, 1);
            localStorage.setItem('workflows', JSON.stringify(workflows));
            const workflowSelect = document.getElementById('workflowSelect');
            if (workflowSelect) {
                const option = workflowSelect.querySelector(`option[value="${workflow.name}"]`);
                if (option) option.remove();
            }
            displaySavedWorkflows();
        }
    });
}

// Initialize drag and drop functionality
function initializeDragAndDrop() {
    const availableFeatures = document.getElementById('availableFeatures');
    const selectedFeatures = document.getElementById('selectedFeaturesList');
    
    // Add drag events to available features
    const featureButtons = availableFeatures.querySelectorAll('.feature-button');
    featureButtons.forEach(button => {
        button.addEventListener('dragstart', handleDragStart);
        button.addEventListener('dragend', handleDragEnd);
    });

    // Add drop events to selected features container
    selectedFeatures.addEventListener('dragover', handleDragOver);
    selectedFeatures.addEventListener('dragenter', handleDragEnter);
    selectedFeatures.addEventListener('dragleave', handleDragLeave);
    selectedFeatures.addEventListener('drop', handleDrop);
}

function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.feature);
    e.target.classList.add('dragging');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    const selectedFeatures = document.getElementById('selectedFeaturesList');
    selectedFeatures.classList.add('drag-over');
}

function handleDragLeave(e) {
    const selectedFeatures = document.getElementById('selectedFeaturesList');
    selectedFeatures.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    const selectedFeatures = document.getElementById('selectedFeaturesList');
    selectedFeatures.classList.remove('drag-over');
    
    const featureType = e.dataTransfer.getData('text/plain');
    const featureButton = document.querySelector(`.feature-button[data-feature="${featureType}"]`);
    
    if (featureButton && !isFeatureAlreadySelected(featureType)) {
        addFeatureToSelected(featureType);
    }
}

function isFeatureAlreadySelected(featureType) {
    const selectedFeatures = document.getElementById('selectedFeaturesList');
    // Allow multiple instances of MOST FREQUENT, LEAST FREQUENT, and POSITION-CONS
    if (featureType === 'mostFrequent' || 
        featureType === 'leastFrequent' || 
        featureType === 'positionCons') {
        return false;
    }
    // For all other features, maintain the single instance rule
    return selectedFeatures.querySelector(`[data-feature="${featureType}"]`) !== null;
}

function addFeatureToSelected(featureType) {
    const selectedFeatures = document.getElementById('selectedFeaturesList');
    const featureButton = document.querySelector(`.feature-button[data-feature="${featureType}"]`);
    
    const selectedFeature = document.createElement('div');
    selectedFeature.className = 'selected-feature-item';
    // Add T9 class if it's a T9 feature
    if (featureType.startsWith('t9')) {
        selectedFeature.classList.add('t9-selected-feature');
    }
    // Add Alpha-Numeric class if it's an Alpha-Numeric feature
    if (featureType === 'alphaNumeric' || featureType === 'lettersAbove') {
        selectedFeature.classList.add('alphanumeric-selected-feature');
    }
    selectedFeature.dataset.feature = featureType;
    
    const featureName = document.createElement('span');
    featureName.textContent = featureButton.textContent;
    selectedFeature.appendChild(featureName);
    
    // Add click event to remove feature
    selectedFeature.addEventListener('click', () => {
        selectedFeature.remove();
        adjustSelectedFeaturesHeight();
    });
    
    // Add touch event for mobile
    selectedFeature.addEventListener('touchstart', (e) => {
        e.preventDefault();
        selectedFeature.remove();
        adjustSelectedFeaturesHeight();
    }, { passive: false });
    
    selectedFeatures.appendChild(selectedFeature);
    adjustSelectedFeaturesHeight();
}

function adjustSelectedFeaturesHeight() {
    const selectedFeatures = document.getElementById('selectedFeaturesList');
    const featureItems = selectedFeatures.querySelectorAll('.selected-feature-item');
    const totalFeatures = featureItems.length;
    
    // Base height is 48px, minimum height is 24px (50% reduction)
    const baseHeight = 48;
    const minHeight = 24;
    
    if (totalFeatures <= 3) {
        // Normal height for 3 or fewer features
        featureItems.forEach(item => {
            item.style.minHeight = '48px';
            item.style.padding = '12px 16px';
        });
    } else if (totalFeatures <= 6) {
        // Slight reduction for 4-6 features
        featureItems.forEach(item => {
            item.style.minHeight = '40px';
            item.style.padding = '10px 14px';
        });
    } else if (totalFeatures <= 10) {
        // Medium reduction for 7-10 features
        featureItems.forEach(item => {
            item.style.minHeight = '32px';
            item.style.padding = '8px 12px';
        });
    } else {
        // Maximum reduction (50%) for 10+ features
        featureItems.forEach(item => {
            item.style.minHeight = '24px';
            item.style.padding = '6px 10px';
        });
    }
}

function removeFeature(featureType) {
    const selectedFeature = document.querySelector(`.selected-feature-item[data-feature="${featureType}"]`);
    if (selectedFeature) {
        selectedFeature.remove();
    }
}

// Initialize drag and drop when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeDragAndDrop();
    
    // Initialize scroll indicator
    const scrollIndicator = document.getElementById('scrollIndicator');
    const availableFeatures = document.getElementById('availableFeatures');
    
    if (scrollIndicator && availableFeatures) {
        // Check if scrolling is needed
        const checkScrollNeeded = () => {
            const isScrollable = availableFeatures.scrollHeight > availableFeatures.clientHeight;
            scrollIndicator.classList.toggle('hidden', !isScrollable);
        };
        
        // Check on load
        checkScrollNeeded();
        
        // Check on resize
        window.addEventListener('resize', checkScrollNeeded);
        
        // Handle scroll indicator click
        scrollIndicator.addEventListener('click', () => {
            console.log('Scroll indicator clicked');
            console.log('availableFeatures:', availableFeatures);
            console.log('scrollHeight:', availableFeatures.scrollHeight, 'clientHeight:', availableFeatures.clientHeight);
            availableFeatures.scrollTo({
                top: availableFeatures.scrollHeight,
                behavior: 'smooth'
            });
        });
        
        // Hide indicator when scrolled to bottom
        availableFeatures.addEventListener('scroll', () => {
            const isAtBottom = availableFeatures.scrollTop + availableFeatures.clientHeight >= availableFeatures.scrollHeight - 10;
            scrollIndicator.classList.toggle('hidden', isAtBottom);
        });
    } else {
        if (!scrollIndicator) console.log('Scroll indicator button not found');
        if (!availableFeatures) console.log('Available features container not found');
    }
    
    // Improve LENGTH input touch sensitivity
    const lengthInput = document.getElementById('lengthInput');
    if (lengthInput) {
        lengthInput.setAttribute('tabindex', '0');
        lengthInput.addEventListener('touchstart', function(e) {
            e.stopPropagation();
            this.focus();
        }, { passive: false });
        lengthInput.addEventListener('click', function() {
            this.focus();
        });
    }
    // ... existing code ...
});

// Re-initialize drag and drop when new content is added
function reinitializeDragAndDrop() {
    initializeDragAndDrop();
}

// Initialize feature selection functionality
function initializeFeatureSelection() {
    const availableFeatures = document.getElementById('availableFeatures');
    const selectedFeaturesList = document.getElementById('selectedFeaturesList');
    
    if (availableFeatures) {
        const featureButtons = availableFeatures.querySelectorAll('.feature-button');
        
        featureButtons.forEach(button => {
            // Remove existing event listeners
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Track touch state for scroll detection
            let touchStartX = 0;
            let touchStartY = 0;
            let touchStartTime = 0;
            let hasMoved = false;
            
            // Add click event (desktop)
            newButton.addEventListener('click', () => {
                const featureType = newButton.dataset.feature;
                if (!isFeatureAlreadySelected(featureType)) {
                    addFeatureToSelected(featureType);
                }
            });
            
            // Track touch start
            newButton.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                touchStartTime = Date.now();
                hasMoved = false;
            }, { passive: true });
            
            // Track touch move to detect scrolling
            newButton.addEventListener('touchmove', (e) => {
                if (!hasMoved) {
                    const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
                    const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
                    // If moved more than 18px, consider it a scroll (reduces accidental taps)
                    if (deltaX > 18 || deltaY > 18) {
                        hasMoved = true;
                    }
                }
            }, { passive: true });
            
            // Handle touch end - only trigger if it was a tap, not a scroll
            newButton.addEventListener('touchend', (e) => {
                const touchEndTime = Date.now();
                const touchDuration = touchEndTime - touchStartTime;
                
                // Only trigger if:
                // 1. Touch didn't move significantly (not a scroll)
                // 2. Touch duration was short (less than 300ms - indicates a tap)
                if (!hasMoved && touchDuration < 300) {
                    e.preventDefault();
                    const featureType = newButton.dataset.feature;
                if (!isFeatureAlreadySelected(featureType)) {
                    addFeatureToSelected(featureType);
                }
                }
                
                // Reset state
                hasMoved = false;
            }, { passive: false });
        });
    }
}

function isFeatureAlreadySelected(featureType) {
    const selectedFeatures = document.getElementById('selectedFeaturesList');
    // Allow multiple instances of MOST FREQUENT and LEAST FREQUENT features
    if (featureType === 'mostFrequent' || featureType === 'leastFrequent') {
        // Check if the feature was just added (within the last 500ms)
        const lastAdded = selectedFeatures.getAttribute('lastAdded');
        const lastAddedTime = selectedFeatures.getAttribute('lastAddedTime');
        const now = Date.now();
        
        if (lastAdded === featureType && lastAddedTime && (now - parseInt(lastAddedTime)) < 500) {
            return true;
        }
        
        selectedFeatures.setAttribute('lastAdded', featureType);
        selectedFeatures.setAttribute('lastAddedTime', now.toString());
        return false;
    }
    // For all other features, maintain the single instance rule
    return selectedFeatures.querySelector(`[data-feature="${featureType}"]`) !== null;
}

function addFeatureToSelected(featureType) {
    const selectedFeatures = document.getElementById('selectedFeaturesList');
    const featureButton = document.querySelector(`.feature-button[data-feature="${featureType}"]`);
    
    if (!featureButton) return;
    
    const selectedFeature = document.createElement('div');
    selectedFeature.className = 'selected-feature-item';
    // Add T9 class if it's a T9 feature
    if (featureType.startsWith('t9')) {
        selectedFeature.classList.add('t9-selected-feature');
    }
    // Add Alpha-Numeric class if it's an Alpha-Numeric feature
    if (featureType === 'alphaNumeric' || featureType === 'lettersAbove') {
        selectedFeature.classList.add('alphanumeric-selected-feature');
    }
    selectedFeature.dataset.feature = featureType;
    
    const featureName = document.createElement('span');
    featureName.textContent = featureButton.textContent;
    selectedFeature.appendChild(featureName);
    
    // Add click event to remove feature
    selectedFeature.addEventListener('click', () => {
        selectedFeature.remove();
        adjustSelectedFeaturesHeight();
    });
    
    // Add touch event for mobile
    selectedFeature.addEventListener('touchstart', (e) => {
        e.preventDefault();
        selectedFeature.remove();
        adjustSelectedFeaturesHeight();
    }, { passive: false });
    
    selectedFeatures.appendChild(selectedFeature);
    adjustSelectedFeaturesHeight();
}

// Remove the duplicate addFeatureToList function since we're using addFeatureToSelected
// ... existing code ...

// Track T9 mode state
let isT9Mode = false;

// Track Alpha-Numeric mode state
let isAlphaNumericMode = false;

function showT9Features() {
    isT9Mode = true;
    const availableFeatures = document.getElementById('availableFeatures');
    const normalFeatures = availableFeatures.innerHTML;
    
    // Store normal features (if not already stored)
    if (!availableFeatures.dataset.normalFeatures) {
        availableFeatures.dataset.normalFeatures = normalFeatures;
    }
    
    // Show T9 features
    availableFeatures.innerHTML = `
        <div class="feature-group">
            <button class="feature-button t9-feature-button" data-feature="t9Length" draggable="true">LENGTH</button>
            <button class="info-button" data-feature="t9Length"><i class="fas fa-info-circle"></i></button>
        </div>
        <div class="feature-group">
            <button class="feature-button t9-feature-button" data-feature="t9LastTwo" draggable="true">LAST TWO</button>
            <button class="info-button" data-feature="t9LastTwo"><i class="fas fa-info-circle"></i></button>
        </div>
        <div class="feature-group">
            <button class="feature-button t9-feature-button" data-feature="t9Last" draggable="true">LAST</button>
            <button class="info-button" data-feature="t9Last"><i class="fas fa-info-circle"></i></button>
        </div>
        <div class="feature-group">
            <button class="feature-button t9-feature-button" data-feature="t9Position5" draggable="true">POSITION 5</button>
            <button class="info-button" data-feature="t9Position5"><i class="fas fa-info-circle"></i></button>
        </div>
        <div class="feature-group">
            <button class="feature-button t9-feature-button" data-feature="t9Guess" draggable="true">GUESS</button>
            <button class="info-button" data-feature="t9Guess"><i class="fas fa-info-circle"></i></button>
        </div>
        <div class="feature-group">
            <button class="feature-button t9-feature-button" data-feature="t9OneLie" draggable="true">1 LIE (L4)</button>
            <button class="info-button" data-feature="t9OneLie"><i class="fas fa-info-circle"></i></button>
        </div>
        <div class="feature-group">
            <button class="feature-button t9-feature-button" data-feature="t9Repeat" draggable="true">Repeat?</button>
            <button class="info-button" data-feature="t9Repeat"><i class="fas fa-info-circle"></i></button>
        </div>
        <div class="feature-group">
            <button class="feature-button t9-feature-button" data-feature="t9Higher" draggable="true">Higher?</button>
            <button class="info-button" data-feature="t9Higher"><i class="fas fa-info-circle"></i></button>
        </div>
        <div class="feature-group">
            <button class="feature-button t9-feature-button" data-feature="t9NumberStart" draggable="true">NUMBER START</button>
            <button class="info-button" data-feature="t9NumberStart"><i class="fas fa-info-circle"></i></button>
        </div>
        <div class="feature-group">
            <button class="feature-button t9-feature-button" data-feature="t9Singing" draggable="true">SINGING</button>
            <button class="info-button" data-feature="t9Singing"><i class="fas fa-info-circle"></i></button>
        </div>
        <div class="feature-group">
            <button class="feature-button t9-feature-button" data-feature="t9OneTruth" draggable="true">1 TRUTH (F4)</button>
            <button class="info-button" data-feature="t9OneTruth"><i class="fas fa-info-circle"></i></button>
        </div>
    `;
    
    // Show BACK under HOME (same as BIRTHDAY)
    const headerBack = document.getElementById('workflowBuilderBackButton');
    if (headerBack) headerBack.style.display = 'inline-block';
    
    // Reinitialize feature selection
    initializeFeatureSelection();
    
    // Reinitialize info buttons for dynamically added features
    initializeInfoButtons();
}

function showNormalFeatures() {
    isT9Mode = false;
    isAlphaNumericMode = false;
    const availableFeatures = document.getElementById('availableFeatures');
    
    // Restore normal features
    if (availableFeatures.dataset.normalFeatures) {
        availableFeatures.innerHTML = availableFeatures.dataset.normalFeatures;
    }
    
    // Remove BACK button
    const backButton = document.querySelector('.available-features .back-button');
    if (backButton) {
        backButton.remove();
    }
    const headerBack = document.getElementById('workflowBuilderBackButton');
    if (headerBack) headerBack.style.display = 'none';
    
    // Reinitialize feature selection
    initializeFeatureSelection();
    
    // Re-attach mode folder button handlers (lost when innerHTML was restored)
    initializeModeButtons();
    
    // Reinitialize info buttons for dynamically added features
    initializeInfoButtons();
}

function showAlphaNumericFeatures() {
    isAlphaNumericMode = true;
    const availableFeatures = document.getElementById('availableFeatures');
    const normalFeatures = availableFeatures.innerHTML;
    
    // Store normal features (if not already stored)
    if (!availableFeatures.dataset.normalFeatures) {
        availableFeatures.dataset.normalFeatures = normalFeatures;
    }
    
    // Show Alpha-Numeric features
    availableFeatures.innerHTML = `
        <div class="feature-group">
            <button class="feature-button alphanumeric-feature-button" data-feature="alphaNumeric" draggable="true">AlphaNumeric</button>
            <button class="info-button" data-feature="alphaNumeric"><i class="fas fa-info-circle"></i></button>
        </div>
        <div class="feature-group">
            <button class="feature-button alphanumeric-feature-button" data-feature="lettersAbove" draggable="true">Letters Above</button>
            <button class="info-button" data-feature="lettersAbove"><i class="fas fa-info-circle"></i></button>
        </div>
    `;
    
    // Show BACK button
    const backButton = document.querySelector('.available-features .back-button');
    if (!backButton) {
        const h3 = document.querySelector('.available-features h3');
        if (h3 && h3.parentElement) {
            const backBtn = document.createElement('button');
            backBtn.className = 'back-button';
            backBtn.textContent = 'BACK';
            backBtn.onclick = showNormalFeatures;
            
            // Add touch event handler for PWA/mobile
            backBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showNormalFeatures();
            }, { passive: false });
            
            // Ensure button is clickable
            backBtn.style.pointerEvents = 'auto';
            backBtn.style.zIndex = '100';
            
            h3.parentElement.style.position = 'relative';
            h3.parentElement.insertBefore(backBtn, h3);
        }
    }
    
    // Reinitialize feature selection
    initializeFeatureSelection();
    
    // Reinitialize info buttons for dynamically added features
    initializeInfoButtons();
}

// Initialize feature selection when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeFeatureSelection();
    initializeModeButtons();
});

// Initialize mode folder buttons (PIN-NACLE, Alpha-Numeric)
// Must be called after initializeFeatureSelection when content is restored (e.g. after BACK)
// Uses touch move threshold so scrolling doesn't trigger selection
function initializeModeButtons() {
    const TOUCH_MOVE_THRESHOLD = 18; // px - treat as scroll above this
    const TAP_MAX_MS = 300;

    function addModeButtonTouchHandlers(button, onTap) {
        let touchStartX = 0, touchStartY = 0, touchStartTime = 0, hasMoved = false;
        button.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchStartTime = Date.now();
            hasMoved = false;
        }, { passive: true });
        button.addEventListener('touchmove', (e) => {
            if (!hasMoved) {
                const dx = Math.abs(e.touches[0].clientX - touchStartX);
                const dy = Math.abs(e.touches[0].clientY - touchStartY);
                if (dx > TOUCH_MOVE_THRESHOLD || dy > TOUCH_MOVE_THRESHOLD) hasMoved = true;
            }
        }, { passive: true });
        button.addEventListener('touchend', (e) => {
            if (!hasMoved && (Date.now() - touchStartTime) < TAP_MAX_MS) {
                e.preventDefault();
                onTap();
            }
        }, { passive: false });
    }

    const t9Button = document.getElementById('t9ModeButton');
    if (t9Button) {
        t9Button.addEventListener('click', showT9Features);
        addModeButtonTouchHandlers(t9Button, () => {
            showT9Features();
            const headerBack = document.getElementById('workflowBuilderBackButton');
            if (headerBack) headerBack.style.display = 'inline-block';
        });
    }
    const alphanumericButton = document.getElementById('alphanumericModeButton');
    if (alphanumericButton) {
        alphanumericButton.addEventListener('click', showAlphaNumericFeatures);
        addModeButtonTouchHandlers(alphanumericButton, showAlphaNumericFeatures);
    }

    const binaryButton = document.getElementById('binaryModeButton');
    if (binaryButton) {
        const showBinaryFeatures = () => {
            const availableFeatures = document.getElementById('availableFeatures');
            if (!availableFeatures) return;
            const normalFeatures = availableFeatures.innerHTML;
            if (!availableFeatures.dataset.normalFeatures) {
                availableFeatures.dataset.normalFeatures = normalFeatures;
            }
            availableFeatures.innerHTML = `
                <div class="feature-group">
                    <button class="feature-button binary-feature-button" data-feature="mute" draggable="true">MUTE</button>
                    <button class="info-button" data-feature="mute"><i class="fas fa-info-circle"></i></button>
                </div>
                <div class="feature-group">
                    <button class="feature-button binary-feature-button" data-feature="muteDuo" draggable="true">MUTE DUO</button>
                    <button class="info-button" data-feature="muteDuo"><i class="fas fa-info-circle"></i></button>
                </div>
            `;
            const headerBack = document.getElementById('workflowBuilderBackButton');
            if (headerBack) headerBack.style.display = 'inline-block';
            initializeFeatureSelection();
            initializeInfoButtons();
        };
        binaryButton.addEventListener('click', showBinaryFeatures);
        addModeButtonTouchHandlers(binaryButton, showBinaryFeatures);
    }

    const prefiltersButton = document.getElementById('prefiltersModeButton');
    if (prefiltersButton) {
        const showPrefiltersFeatures = () => {
            const availableFeatures = document.getElementById('availableFeatures');
            if (!availableFeatures) return;
            const normalFeatures = availableFeatures.innerHTML;
            if (!availableFeatures.dataset.normalFeatures) {
                availableFeatures.dataset.normalFeatures = normalFeatures;
            }
            availableFeatures.innerHTML = `
                <div class="feature-group">
                    <button class="feature-button" data-feature="length" draggable="true">LENGTH</button>
                    <button class="info-button" data-feature="length"><i class="fas fa-info-circle"></i></button>
                </div>
                <div class="feature-group">
                    <button class="feature-button" data-feature="letterShapes" draggable="true">LETTER SHAPES</button>
                    <button class="info-button" data-feature="letterShapes"><i class="fas fa-info-circle"></i></button>
                </div>
                <div class="feature-group">
                    <button class="feature-button" data-feature="vowel2" draggable="true">VOWEL2</button>
                    <button class="info-button" data-feature="vowel2"><i class="fas fa-info-circle"></i></button>
                </div>
                <div class="feature-group">
                    <button class="feature-button" data-feature="oCurves" draggable="true">O-CURVES</button>
                    <button class="info-button" data-feature="oCurves"><i class="fas fa-info-circle"></i></button>
                </div>
                <div class="feature-group">
                    <button class="feature-button" data-feature="e21" draggable="true">E21</button>
                    <button class="info-button" data-feature="e21"><i class="fas fa-info-circle"></i></button>
                </div>
                <div class="feature-group">
                    <button class="feature-button" data-feature="atlas" draggable="true">ATLAS</button>
                    <button class="info-button" data-feature="atlas"><i class="fas fa-info-circle"></i></button>
                </div>
                <div class="feature-group">
                    <button class="feature-button" data-feature="letterLying" draggable="true">Letter Lying</button>
                    <button class="info-button" data-feature="letterLying"><i class="fas fa-info-circle"></i></button>
                </div>
                <div class="feature-group">
                    <button class="feature-button" data-feature="loveLetters" draggable="true">Love Letters</button>
                    <button class="info-button" data-feature="loveLetters"><i class="fas fa-info-circle"></i></button>
                </div>
                <div class="feature-group">
                    <button class="feature-button" data-feature="notIn" draggable="true">ABSENT</button>
                    <button class="info-button" data-feature="notIn"><i class="fas fa-info-circle"></i></button>
                </div>
                <div class="feature-group">
                    <button class="feature-button" data-feature="present" draggable="true">PRESENT</button>
                    <button class="info-button" data-feature="present"><i class="fas fa-info-circle"></i></button>
                </div>
                <div class="feature-group">
                    <button class="feature-button" data-feature="abcde" draggable="true">ABCDE</button>
                    <button class="info-button" data-feature="abcde"><i class="fas fa-info-circle"></i></button>
                </div>
                <div class="feature-group">
                    <button class="feature-button" data-feature="abc" draggable="true">ABC</button>
                    <button class="info-button" data-feature="abc"><i class="fas fa-info-circle"></i></button>
                </div>
                <div class="feature-group">
                    <button class="feature-button" data-feature="pin" draggable="true">PIN</button>
                    <button class="info-button" data-feature="pin"><i class="fas fa-info-circle"></i></button>
                </div>
                <div class="feature-group">
                    <button class="feature-button" data-feature="scrabble" draggable="true">SCRABBLE</button>
                    <button class="info-button" data-feature="scrabble"><i class="fas fa-info-circle"></i></button>
                </div>
                <div class="feature-group">
                    <button class="feature-button" data-feature="scramble" draggable="true">DECODE</button>
                    <button class="info-button" data-feature="scramble"><i class="fas fa-info-circle"></i></button>
                </div>
                <div class="feature-group">
                    <button class="feature-button" data-feature="sologram" draggable="true">SOLOGRAM</button>
                    <button class="info-button" data-feature="sologram"><i class="fas fa-info-circle"></i></button>
                </div>
                <div class="feature-group">
                    <button class="feature-button" data-feature="pianoForte" draggable="true">PIANO FORTE</button>
                    <button class="info-button" data-feature="pianoForte"><i class="fas fa-info-circle"></i></button>
                </div>
                <div class="feature-group">
                    <button class="feature-button" data-feature="alpha" draggable="true">ALPHA (SHORT)</button>
                    <button class="info-button" data-feature="alpha"><i class="fas fa-info-circle"></i></button>
                </div>
                <div class="feature-group">
                    <button class="feature-button" data-feature="omega" draggable="true">OMEGA: Short</button>
                    <button class="info-button" data-feature="omega"><i class="fas fa-info-circle"></i></button>
                </div>
                <div class="feature-group">
                    <button class="feature-button" data-feature="dictionaryAlpha" draggable="true">DICTIONARY (B/M/E)</button>
                    <button class="info-button" data-feature="dictionaryAlpha"><i class="fas fa-info-circle"></i></button>
                </div>
                <div class="feature-group">
                    <button class="feature-button" data-feature="smlLength" draggable="true">LENGTH (S/M/L)</button>
                    <button class="info-button" data-feature="smlLength"><i class="fas fa-info-circle"></i></button>
                </div>
                <div class="feature-group">
                    <button class="feature-button" data-feature="theCore" draggable="true">THE CORE</button>
                    <button class="info-button" data-feature="theCore"><i class="fas fa-info-circle"></i></button>
                </div>
            `;
            const headerBack = document.getElementById('workflowBuilderBackButton');
            if (headerBack) headerBack.style.display = 'inline-block';
            initializeFeatureSelection();
            initializeInfoButtons();
        };
        prefiltersButton.addEventListener('click', showPrefiltersFeatures);
        addModeButtonTouchHandlers(prefiltersButton, showPrefiltersFeatures);
    }
}

// Re-initialize feature selection when new content is added
function reinitializeFeatureSelection() {
    initializeFeatureSelection();
}

// Add CSS for the new elements
const originalLexStyle = document.createElement('style');
originalLexStyle.textContent = `
    .position-info {
        margin: 10px 0;
        padding: 10px;
        background-color: #f5f5f5;
        border-radius: 5px;
    }
    
    .position-display {
        font-weight: bold;
        margin-bottom: 5px;
    }
    
    .possible-letters {
        font-size: 0.9em;
        color: #666;
    }
    
    .letters-list {
        font-family: monospace;
    }
`;
document.head.appendChild(originalLexStyle);

// Add CSS for reset button
const resetButtonStyle = document.createElement('style');
resetButtonStyle.textContent = `
    .reset-workflow-button {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: rgba(0, 0, 0, 0.75);
        color: white;
        border: none;
        font-size: 24px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        transition: background-color 0.2s;
    }
    
    .reset-workflow-button:hover {
        background-color: rgba(0, 0, 0, 0.9);
    }
    
    .reset-workflow-button:active {
        transform: scale(0.95);
    }
`;
document.head.appendChild(resetButtonStyle);

// Add CSS for home button
const homeButtonStyle = document.createElement('style');
homeButtonStyle.textContent = `
    .home-button {
        background: none;
        border: none;
        color: #333;
        font-size: 24px;
        cursor: pointer;
        padding: 0 10px;
        margin-right: 10px;
        transition: color 0.2s;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }
    
    .home-button:hover {
        color: #666;
    }
    
    .home-button:active {
        transform: scale(0.95);
    }
`;
document.head.appendChild(homeButtonStyle);

// Update CSS for buttons to improve touch targets
const buttonStyles = document.createElement('style');
buttonStyles.textContent = `
    .reset-workflow-button {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background-color: rgba(0, 0, 0, 0.75);
        color: white;
        border: none;
        font-size: 24px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        transition: background-color 0.2s;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
    }
    
    .reset-workflow-button:hover {
        background-color: rgba(0, 0, 0, 0.9);
    }
    
    .reset-workflow-button:active {
        transform: scale(0.95);
    }
    
    .home-button {
        background: none;
        border: none;
        color: #333;
        font-size: 24px;
        cursor: pointer;
        padding: 10px;
        margin-right: 10px;
        transition: color 0.2s;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 48px;
        min-height: 48px;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
    }
    
    .home-button:hover {
        color: #666;
    }
    
    .home-button:active {
        transform: scale(0.95);
    }
`;
document.head.appendChild(buttonStyles);

// Add CSS for button consistency
const buttonConsistencyStyle = document.createElement('style');
buttonConsistencyStyle.textContent = `
    #createWorkflowButton {
        width: 200px;
        height: 40px;
        font-size: 16px;
        font-weight: bold;
        padding: 8px 16px;
        margin: 10px;
        border-radius: 4px;
        background-color: #4CAF50;
        color: white;
        border: none;
        cursor: pointer;
        transition: background-color 0.2s;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        box-sizing: border-box;
        line-height: 1;
        white-space: nowrap;
    }
    
    #createWorkflowButton:hover {
        background-color: #45a049;
    }
    
    #performButton {
        width: 200px;
        height: 40px;
        font-size: 16px;
        font-weight: bold;
        padding: 8px 16px;
        margin: 10px;
        border-radius: 4px;
        background-color: #4169E1; /* Royal Blue */
        color: white;
        border: none;
        cursor: pointer;
        transition: background-color 0.2s;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        box-sizing: border-box;
        line-height: 1;
        white-space: nowrap;
    }
    
    #performButton:hover {
        background-color: #1E40AF; /* Darker Royal Blue for hover */
    }
    
    #createWorkflowButton:active, #performButton:active {
        transform: scale(0.98);
    }

    /* Ensure the button container doesn't affect button size */
    .button-container {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
    }

    /* Make dropdown options scrollable */
    .options-list {
        max-height: 200px;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: #888 #f1f1f1;
    }

    /* Style scrollbar for Webkit browsers */
    .options-list::-webkit-scrollbar {
        width: 8px;
    }

    .options-list::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
    }

    .options-list::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
    }

    .options-list::-webkit-scrollbar-thumb:hover {
        background: #555;
    }
`;
document.head.appendChild(buttonConsistencyStyle);

// Feature Info Modal Functions
function showFeatureInfo(featureId) {
    console.log('Showing info for feature:', featureId);
    const modal = document.getElementById(`${featureId}Info`);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        // Prevent background scrolling
        document.body.addEventListener('touchmove', preventScroll, { passive: false });
    } else {
        console.error('Modal not found for feature:', featureId);
    }
}

function hideFeatureInfo(featureId) {
    console.log('Hiding info for feature:', featureId);
    const modal = document.getElementById(`${featureId}Info`);
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
        document.body.style.overflow = '';
        // Re-enable background scrolling
        document.body.removeEventListener('touchmove', preventScroll);
    }
}

function preventScroll(e) {
    e.preventDefault();
}

// Add event listeners for info buttons
function initializeInfoButtons() {
    console.log('Initializing info buttons');
    // Info button click handlers
    document.querySelectorAll('.info-button').forEach(button => {
        console.log('Adding listeners to button:', button);
        // Remove any existing listeners
        button.removeEventListener('click', handleInfoClick);
        button.removeEventListener('touchstart', handleInfoClick);
        button.removeEventListener('touchend', handleInfoClick);
        
        // Add both click and touch events (use touchstart for better mobile/PWA support)
        button.addEventListener('click', handleInfoClick);
        button.addEventListener('touchstart', handleInfoClick, { passive: false });
    });

    // Close button click handlers
    document.querySelectorAll('.close-info-button').forEach(button => {
        // Remove any existing listeners
        button.removeEventListener('click', handleCloseClick);
        button.removeEventListener('touchstart', handleCloseClick);
        button.removeEventListener('touchend', handleCloseClick);
        
        // Add both click and touch events (use touchstart for better mobile/PWA support)
        button.addEventListener('click', handleCloseClick);
        button.addEventListener('touchstart', handleCloseClick, { passive: false });
    });

    // Close modal when clicking outside
    document.querySelectorAll('.feature-info-modal').forEach(modal => {
        // Remove any existing listeners
        modal.removeEventListener('click', handleOutsideClick);
        modal.removeEventListener('touchstart', handleOutsideClick);
        modal.removeEventListener('touchend', handleOutsideClick);
        
        // Add both click and touch events (use touchstart for better mobile/PWA support)
        modal.addEventListener('click', handleOutsideClick);
        modal.addEventListener('touchstart', handleOutsideClick, { passive: false });
    });
}

function handleInfoClick(e) {
    console.log('Info button clicked');
    e.preventDefault();
    e.stopPropagation(); // Prevent drag start
    const featureId = this.getAttribute('data-feature');
    console.log('Feature ID:', featureId);
    if (featureId) {
        showFeatureInfo(featureId);
    } else {
        console.error('No feature ID found on info button');
    }
}

function handleCloseClick(e) {
    console.log('Close button clicked');
    e.preventDefault();
    e.stopPropagation();
    const modal = this.closest('.feature-info-modal');
    const featureId = modal.id.replace('Info', '');
    hideFeatureInfo(featureId);
}

function handleOutsideClick(e) {
    console.log('Outside clicked');
    e.preventDefault();
    if (e.target === this) {
        const featureId = this.id.replace('Info', '');
        hideFeatureInfo(featureId);
    }
}

// Initialize info buttons when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing info buttons');
    initializeInfoButtons();
});

// Also initialize info buttons when the workflow creation page is shown
function showWorkflowCreation() {
    document.getElementById('homepage').style.display = 'none';
    document.getElementById('workflowExecution').style.display = 'none';
    document.getElementById('workflowCreation').style.display = 'block';
    if (exportButton) exportButton.style.display = 'none'; /* Export floppy only in PERFORM */
    var backBtn = document.getElementById('workflowBuilderBackButton');
    if (backBtn) {
        backBtn.style.display = 'none';
        var af = document.getElementById('availableFeatures');
        if (af && af.dataset.normalFeatures && af.innerHTML !== af.dataset.normalFeatures) {
            backBtn.style.display = 'inline-block';
        }
    }
    var savedWorkflows = document.getElementById('savedWorkflows');
    if (savedWorkflows) savedWorkflows.style.display = 'none';
    initializeInfoButtons();
}

function hideWorkflowCreation() {
    document.getElementById('homepage').style.display = 'block';
    document.getElementById('workflowCreation').style.display = 'none';
    const workflowExecution = document.getElementById('workflowExecution');
    if (workflowExecution) workflowExecution.style.display = 'none';
    document.body.classList.remove('perform-view');
    if (exportButton) exportButton.style.display = 'none';
}

// Hide native select elements to prevent overlap with custom dropdowns (aggressive)
const hideNativeSelectStyle = document.createElement('style');
hideNativeSelectStyle.textContent = `
select#workflowSelect,
select#wordlistSelect {
    display: none !important;
    position: absolute !important;
    left: -9999px !important;
    width: 1px !important;
    height: 1px !important;
    opacity: 0 !important;
    pointer-events: none !important;
    z-index: -1 !important;
}
`;
document.head.appendChild(hideNativeSelectStyle);

// Inject CSS to ensure workflow dropdown is always on top of everything
const workflowDropdownCSS = document.createElement('style');
workflowDropdownCSS.textContent = `
#workflowCustomSelect {
    z-index: 99999 !important;
    position: relative !important;
}
#workflowCustomSelect .options-list,
#workflowCustomSelect .options-list.show {
    z-index: 99999 !important;
    position: absolute !important;
}
body.workflow-dropdown-open #workflowCustomSelect,
body.workflow-dropdown-open #workflowCustomSelect .options-list {
    z-index: 99999 !important;
}
/* Ensure wordlist dropdown stays below workflow dropdown */
#wordlistCustomSelect {
    z-index: 100 !important;
    position: relative;
}
#wordlistCustomSelect .options-list {
    z-index: 101 !important;
}
`;
document.head.appendChild(workflowDropdownCSS);

// Add filtering function
function filterWordsByLength(words, length) {
    return words.filter(word => word.length === length);
}

/**
 * LETTER SHAPES pre-filter sets (workflow): not the same as `letterShapes` used by Curved Pos / shape UI.
 * CURVED list per spec: C, O, S, G, Q, U (deduped from user list).
 */
const letterShapesPrefilterSets = {
    straight: new Set(['A', 'E', 'F', 'H', 'I', 'K', 'L', 'M', 'N', 'T', 'V', 'W', 'X', 'Y', 'Z']),
    mixed: new Set(['B', 'D', 'G', 'J', 'P', 'Q', 'R', 'U']),
    curved: new Set(['C', 'O', 'S', 'G', 'Q', 'U'])
};

function filterWordsByLetterShapesPrefilter(words, positionOneBased, category) {
    const set = letterShapesPrefilterSets[category];
    if (!set || positionOneBased < 1 || positionOneBased > 6) return words;
    const idx = positionOneBased - 1;
    return words.filter((word) => {
        if (idx >= word.length) return false;
        const ch = word.charAt(idx);
        if (!/[a-zA-Z]/.test(ch)) return false;
        return set.has(ch.toUpperCase());
    });
}

function initSettingsUI() {
    const engineApiBaseUrlInput = document.getElementById('engineApiBaseUrlInput');
    if (engineApiBaseUrlInput) {
        engineApiBaseUrlInput.value = (appSettings && appSettings.engineApiBaseUrl != null) ? appSettings.engineApiBaseUrl : '';
        const persistEngineUrl = () => {
            appSettings.engineApiBaseUrl = engineApiBaseUrlInput.value.trim();
            saveAppSettings();
        };
        engineApiBaseUrlInput.addEventListener('change', persistEngineUrl);
        engineApiBaseUrlInput.addEventListener('blur', persistEngineUrl);
    }

    const lengthToggle = document.getElementById('lengthBuffer1Toggle');
    const t9LengthToggle = document.getElementById('t9LengthBuffer1Toggle');
    const e21Toggle = document.getElementById('e21AnywhereToggle');
    
    if (lengthToggle) {
        lengthToggle.checked = !!appSettings.lengthBuffer1;
        lengthToggle.addEventListener('change', () => {
            appSettings.lengthBuffer1 = lengthToggle.checked;
            saveAppSettings();
        });
    }
    
    if (t9LengthToggle) {
        t9LengthToggle.checked = !!appSettings.t9LengthBuffer1;
        t9LengthToggle.addEventListener('change', () => {
            appSettings.t9LengthBuffer1 = t9LengthToggle.checked;
            saveAppSettings();
        });
    }

    if (e21Toggle) {
        e21Toggle.checked = !!appSettings.e21CheckAnywhere;
        e21Toggle.addEventListener('change', () => {
            appSettings.e21CheckAnywhere = e21Toggle.checked;
            saveAppSettings();
        });
    }

    const scrabbleBuffer1Toggle = document.getElementById('scrabbleBuffer1Toggle');
    if (scrabbleBuffer1Toggle) {
        scrabbleBuffer1Toggle.checked = !!appSettings.scrabbleBuffer1;
        scrabbleBuffer1Toggle.addEventListener('change', () => {
            appSettings.scrabbleBuffer1 = scrabbleBuffer1Toggle.checked;
            saveAppSettings();
        });
    }

    const decodePositionToggle = document.getElementById('decodePositionToggle');
    const decodePositionFields = document.getElementById('decodePositionFields');
    const decodePositionInput = document.getElementById('decodePositionInput');
    if (decodePositionToggle) {
        decodePositionToggle.checked = !!appSettings.decodePositionOn;
        if (decodePositionFields) decodePositionFields.style.display = appSettings.decodePositionOn ? '' : 'none';
        if (decodePositionInput) decodePositionInput.value = Math.max(1, Math.min(20, (appSettings.decodePosition || 1)));
        decodePositionToggle.addEventListener('change', () => {
            appSettings.decodePositionOn = decodePositionToggle.checked;
            if (decodePositionFields) decodePositionFields.style.display = decodePositionToggle.checked ? '' : 'none';
            saveAppSettings();
        });
    }
    if (decodePositionInput) {
        decodePositionInput.addEventListener('input', () => {
            const n = parseInt(decodePositionInput.value, 10);
            if (!isNaN(n) && n >= 1 && n <= 20) {
                appSettings.decodePosition = n;
                saveAppSettings();
            }
        });
    }

    const sologramBookSelect = document.getElementById('sologramBookSelect');
    if (sologramBookSelect) {
        const book = (appSettings && appSettings.sologramBook) || 'all';
        sologramBookSelect.value = book;
        sologramBookSelect.addEventListener('change', () => {
            appSettings.sologramBook = sologramBookSelect.value;
            saveAppSettings();
        });
    }

    const calculusModeSelect = document.getElementById('calculusModeSelect');
    if (calculusModeSelect) {
        const mode = (appSettings && appSettings.calculusMode) || 'abstract';
        calculusModeSelect.value = (mode === 'curvesStraight' ? 'curvesStraight' : 'abstract');
        calculusModeSelect.addEventListener('change', () => {
            appSettings.calculusMode = calculusModeSelect.value;
            saveAppSettings();
        });
    }

    const lexiconOverrideToggle = document.getElementById('lexiconOverrideToggle');
    const lexiconOverrideFields = document.getElementById('lexiconOverrideFields');
    const lexiconOverrideThresholdInput = document.getElementById('lexiconOverrideThresholdInput');
    const lexiconOverrideContinueToggle = document.getElementById('lexiconOverrideContinueToggle');
    if (lexiconOverrideToggle) {
        lexiconOverrideToggle.checked = !!(appSettings && appSettings.lexiconOverrideOn);
        if (lexiconOverrideFields) lexiconOverrideFields.style.display = lexiconOverrideToggle.checked ? '' : 'none';
        if (lexiconOverrideThresholdInput) {
            const n = parseInt((appSettings && appSettings.lexiconOverrideThreshold) || 50, 10);
            lexiconOverrideThresholdInput.value = String(Math.max(1, Math.min(5000, isNaN(n) ? 50 : n)));
        }
        if (lexiconOverrideContinueToggle) {
            lexiconOverrideContinueToggle.checked = !!(appSettings && appSettings.lexiconOverrideContinueWorkflow);
        }
        lexiconOverrideToggle.addEventListener('change', () => {
            appSettings.lexiconOverrideOn = lexiconOverrideToggle.checked;
            if (lexiconOverrideFields) lexiconOverrideFields.style.display = lexiconOverrideToggle.checked ? '' : 'none';
            saveAppSettings();
        });
    }
    if (lexiconOverrideThresholdInput) {
        lexiconOverrideThresholdInput.addEventListener('input', () => {
            const n = parseInt(lexiconOverrideThresholdInput.value, 10);
            if (!isNaN(n) && n >= 1 && n <= 5000) {
                appSettings.lexiconOverrideThreshold = n;
                saveAppSettings();
            }
        });
    }
    if (lexiconOverrideContinueToggle) {
        lexiconOverrideContinueToggle.addEventListener('change', () => {
            appSettings.lexiconOverrideContinueWorkflow = lexiconOverrideContinueToggle.checked;
            saveAppSettings();
        });
    }

    const pianoForteUseCustomRangeToggle = document.getElementById('pianoForteUseCustomRangeToggle');
    const pianoForteCustomRangeFields = document.getElementById('pianoForteCustomRangeFields');
    const pianoForteStartLetterInput = document.getElementById('pianoForteStartLetterInput');
    const pianoForteEndLetterInput = document.getElementById('pianoForteEndLetterInput');
    if (pianoForteUseCustomRangeToggle) {
        pianoForteUseCustomRangeToggle.checked = !!(appSettings && appSettings.pianoForteUseCustomRange);
        if (pianoForteCustomRangeFields) pianoForteCustomRangeFields.style.display = pianoForteUseCustomRangeToggle.checked ? '' : 'none';
        pianoForteUseCustomRangeToggle.addEventListener('change', () => {
            appSettings.pianoForteUseCustomRange = pianoForteUseCustomRangeToggle.checked;
            if (pianoForteCustomRangeFields) pianoForteCustomRangeFields.style.display = pianoForteUseCustomRangeToggle.checked ? '' : 'none';
            saveAppSettings();
        });
    }
    if (pianoForteStartLetterInput) {
        pianoForteStartLetterInput.value = (appSettings && appSettings.pianoForteStartLetter) || 'A';
        pianoForteStartLetterInput.addEventListener('input', () => {
            const v = pianoForteStartLetterInput.value.toUpperCase().replace(/[^A-Z]/g, '');
            pianoForteStartLetterInput.value = v;
            if (v.length) { appSettings.pianoForteStartLetter = v; saveAppSettings(); }
        });
    }
    if (pianoForteEndLetterInput) {
        pianoForteEndLetterInput.value = (appSettings && appSettings.pianoForteEndLetter) || 'G';
        pianoForteEndLetterInput.addEventListener('input', () => {
            const v = pianoForteEndLetterInput.value.toUpperCase().replace(/[^A-Z]/g, '');
            pianoForteEndLetterInput.value = v;
            if (v.length) { appSettings.pianoForteEndLetter = v; saveAppSettings(); }
        });
    }

    const eyeTestFirstLetterInput = document.getElementById('eyeTestFirstLetterInput');
    if (eyeTestFirstLetterInput) {
        const current = (appSettings && typeof appSettings.eyeTestFirstLetter === 'string'
            ? appSettings.eyeTestFirstLetter
            : 'E');
        eyeTestFirstLetterInput.value = (current || 'E').toUpperCase().slice(0, 1).replace(/[^A-Z]/g, '') || 'E';
        eyeTestFirstLetterInput.addEventListener('input', () => {
            let v = (eyeTestFirstLetterInput.value || '').toUpperCase().replace(/[^A-Z]/g, '');
            if (v.length > 1) v = v.slice(0, 1);
            eyeTestFirstLetterInput.value = v;
            if (v.length === 1) {
                appSettings.eyeTestFirstLetter = v;
                saveAppSettings();
            }
        });
    }

    const eyeTestUseFixedGroupsToggle = document.getElementById('eyeTestUseFixedGroupsToggle');
    if (eyeTestUseFixedGroupsToggle) {
        eyeTestUseFixedGroupsToggle.checked = !!(appSettings && appSettings.eyeTestUseFixedGroups);
        eyeTestUseFixedGroupsToggle.addEventListener('change', () => {
            appSettings.eyeTestUseFixedGroups = eyeTestUseFixedGroupsToggle.checked;
            saveAppSettings();
        });
    }
    const eyeTestFixedInputs = [
        { id: 'eyeTestFixedGroup1Input', key: 'eyeTestFixedGroup1' },
        { id: 'eyeTestFixedGroup2Input', key: 'eyeTestFixedGroup2' },
        { id: 'eyeTestFixedGroup3Input', key: 'eyeTestFixedGroup3' },
        { id: 'eyeTestFixedGroup4Input', key: 'eyeTestFixedGroup4' },
        { id: 'eyeTestFixedGroup5Input', key: 'eyeTestFixedGroup5' },
        { id: 'eyeTestFixedGroup6Input', key: 'eyeTestFixedGroup6' }
    ];
    eyeTestFixedInputs.forEach(({ id, key }) => {
        const el = document.getElementById(id);
        if (!el) return;
        const current = appSettings && typeof appSettings[key] === 'string' ? appSettings[key] : '';
        el.value = (current || '').toUpperCase().replace(/[^A-Z]/g, '');
        el.addEventListener('input', () => {
            let v = (el.value || '').toUpperCase().replace(/[^A-Z]/g, '');
            el.value = v;
            appSettings[key] = v;
            saveAppSettings();
        });
    });

    const dictionaryAlphaUseCustomRangeToggle = document.getElementById('dictionaryAlphaUseCustomRangeToggle');
    const dictionaryAlphaCustomRangeFields = document.getElementById('dictionaryAlphaCustomRangeFields');
    const dictAlphaInputs = [
        { id: 'dictionaryAlphaBeginStartInput', key: 'dictionaryAlphaBeginStart', default: 'A' },
        { id: 'dictionaryAlphaBeginEndInput', key: 'dictionaryAlphaBeginEnd', default: 'M' },
        { id: 'dictionaryAlphaMidStartInput', key: 'dictionaryAlphaMidStart', default: 'I' },
        { id: 'dictionaryAlphaMidEndInput', key: 'dictionaryAlphaMidEnd', default: 'T' },
        { id: 'dictionaryAlphaEndStartInput', key: 'dictionaryAlphaEndStart', default: 'N' },
        { id: 'dictionaryAlphaEndEndInput', key: 'dictionaryAlphaEndEnd', default: 'Z' }
    ];
    if (dictionaryAlphaUseCustomRangeToggle) {
        dictionaryAlphaUseCustomRangeToggle.checked = !!(appSettings && appSettings.dictionaryAlphaUseCustomRange);
        if (dictionaryAlphaCustomRangeFields) dictionaryAlphaCustomRangeFields.style.display = dictionaryAlphaUseCustomRangeToggle.checked ? '' : 'none';
        dictionaryAlphaUseCustomRangeToggle.addEventListener('change', () => {
            appSettings.dictionaryAlphaUseCustomRange = dictionaryAlphaUseCustomRangeToggle.checked;
            if (dictionaryAlphaCustomRangeFields) dictionaryAlphaCustomRangeFields.style.display = dictionaryAlphaUseCustomRangeToggle.checked ? '' : 'none';
            saveAppSettings();
        });
    }
    dictAlphaInputs.forEach(({ id, key, default: d }) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = (appSettings && appSettings[key]) || d;
            el.addEventListener('input', () => {
                const v = el.value.toUpperCase().replace(/[^A-Z]/g, '');
                el.value = v;
                if (v.length) { appSettings[key] = v; saveAppSettings(); }
            });
        }
    });

    const omegaModeSelect = document.getElementById('omegaModeSelect');
    const omegaCustomFields = document.getElementById('omegaCustomFields');
    const omegaCustomGroupName = document.getElementById('omegaCustomGroupName');
    const omegaCustomShapeList = document.getElementById('omegaCustomShapeList');
    const omegaCustomAddShapeBtn = document.getElementById('omegaCustomAddShapeBtn');

    function syncOmegaCustomUI() {
        const mode = (appSettings && appSettings.omegaMode) || 'esp';
        if (omegaCustomFields) omegaCustomFields.style.display = mode === 'custom' ? '' : 'none';
        if (omegaCustomGroupName) omegaCustomGroupName.value = (appSettings && appSettings.omegaCustomGroupName) || '';
        if (!Array.isArray(appSettings.omegaCustomShapes)) appSettings.omegaCustomShapes = [];
        if (omegaCustomShapeList && mode === 'custom') {
            const shapes = appSettings.omegaCustomShapes;
            omegaCustomShapeList.innerHTML = '';
            shapes.forEach((item, index) => {
                const row = document.createElement('div');
                row.className = 'omega-custom-row';
                row.dataset.index = String(index);
                row.innerHTML = `
                    <input type="text" class="omega-custom-shape-name" placeholder="Shape name" value="${(item.name || '').replace(/"/g, '&quot;')}" maxlength="30">
                    <input type="text" class="omega-custom-shape-letters" placeholder="Letters (A-Z)" value="${(item.letters || '').replace(/"/g, '&quot;')}" maxlength="26" style="text-transform: uppercase;">
                    <button type="button" class="omega-custom-remove-btn small-button">Remove</button>
                `;
                const nameInput = row.querySelector('.omega-custom-shape-name');
                const lettersInput = row.querySelector('.omega-custom-shape-letters');
                const removeBtn = row.querySelector('.omega-custom-remove-btn');
                nameInput.addEventListener('input', () => {
                    const i = parseInt(row.dataset.index, 10);
                    if (!appSettings.omegaCustomShapes[i]) return;
                    appSettings.omegaCustomShapes[i].name = nameInput.value.trim();
                    saveAppSettings();
                    updateOmegaEfficiencySubtitle();
                });
                lettersInput.addEventListener('input', () => {
                    const v = lettersInput.value.toUpperCase().replace(/[^A-Z]/g, '');
                    lettersInput.value = v;
                    const i = parseInt(row.dataset.index, 10);
                    if (!appSettings.omegaCustomShapes[i]) return;
                    appSettings.omegaCustomShapes[i].letters = v;
                    saveAppSettings();
                    updateOmegaEfficiencySubtitle();
                });
                removeBtn.addEventListener('click', () => {
                    const i = parseInt(row.dataset.index, 10);
                    if (appSettings.omegaCustomShapes) appSettings.omegaCustomShapes.splice(i, 1);
                    saveAppSettings();
                    syncOmegaCustomUI();
                });
                omegaCustomShapeList.appendChild(row);
            });
        }
        updateOmegaEfficiencySubtitle();
    }

    if (omegaModeSelect) {
        const mode = (appSettings && appSettings.omegaMode) || 'esp';
        omegaModeSelect.value = mode;
        omegaModeSelect.addEventListener('change', () => {
            appSettings.omegaMode = omegaModeSelect.value;
            saveAppSettings();
            syncOmegaCustomUI();
            updateOmegaEfficiencySubtitle();
        });
    }
    const omegaShapesCountInput = document.getElementById('omegaShapesCountInput');
    if (omegaShapesCountInput) {
        omegaShapesCountInput.value = String(Math.max(0, parseInt((appSettings && appSettings.omegaShapesCount) || 0, 10)));
        omegaShapesCountInput.addEventListener('input', () => {
            const n = parseInt(omegaShapesCountInput.value, 10);
            if (!isNaN(n) && n >= 0 && n <= 99) {
                appSettings.omegaShapesCount = n;
                saveAppSettings();
            }
        });
    }
    if (omegaCustomGroupName) {
        omegaCustomGroupName.addEventListener('input', () => {
            appSettings.omegaCustomGroupName = omegaCustomGroupName.value.trim();
            saveAppSettings();
        });
    }
    if (omegaCustomAddShapeBtn) {
        omegaCustomAddShapeBtn.addEventListener('click', () => {
            if (!appSettings.omegaCustomShapes) appSettings.omegaCustomShapes = [];
            appSettings.omegaCustomShapes.push({ name: '', letters: '' });
            saveAppSettings();
            syncOmegaCustomUI();
        });
    }
    syncOmegaCustomUI();

    const alphaDirectionsCountInput = document.getElementById('alphaDirectionsCountInput');
    const alphaSwapPovToggle = document.getElementById('alphaSwapPovToggle');
    if (alphaDirectionsCountInput) {
        alphaDirectionsCountInput.value = String(Math.max(0, parseInt((appSettings && appSettings.alphaDirectionsCount) || 0, 10)));
        alphaDirectionsCountInput.addEventListener('input', () => {
            const n = parseInt(alphaDirectionsCountInput.value, 10);
            if (!isNaN(n) && n >= 0 && n <= 99) {
                appSettings.alphaDirectionsCount = n;
                saveAppSettings();
                updateAlphaEfficiencySubtitle();
            }
        });
    }
    if (alphaSwapPovToggle) {
        alphaSwapPovToggle.checked = !!(appSettings && appSettings.alphaSwapPov);
        alphaSwapPovToggle.addEventListener('change', () => {
            appSettings.alphaSwapPov = alphaSwapPovToggle.checked;
            saveAppSettings();
            updateAlphaEfficiencySubtitle();
        });
    }
    updateAlphaEfficiencySubtitle();

    const atlasSourceSelect = document.getElementById('atlasLetterSourceSelect');
    const atlasCustomFields = document.getElementById('atlasCustomFields');
    const atlasLettersDisplay = document.getElementById('atlasLettersDisplay');
    const atlasCustomName = document.getElementById('atlasCustomName');
    const atlasCustomLetters = document.getElementById('atlasCustomLetters');

    function getAtlasLetterDisplayString() {
        const source = (appSettings && appSettings.atlasLetterSource) || 'default';
        if (source === 'default') return Array.from(ATLAS_DEFAULT_LETTERS).sort().join(' ');
        if (source === 'months') return Array.from(ATLAS_MONTHS_LETTERS).sort().join(' ');
        const custom = (appSettings && appSettings.atlasCustomLetters) || '';
        const set = lettersStringToSet(custom);
        if (set.size === 0) return Array.from(ATLAS_DEFAULT_LETTERS).sort().join(' ') + ' (defaulting to Colours)';
        return Array.from(set).sort().join(' ');
    }

    function syncAtlasUI() {
        const source = (appSettings && appSettings.atlasLetterSource) || 'default';
        if (atlasSourceSelect) atlasSourceSelect.value = source;
        if (atlasCustomFields) atlasCustomFields.style.display = source === 'custom' ? '' : 'none';
        if (atlasLettersDisplay) atlasLettersDisplay.textContent = getAtlasLetterDisplayString();
        if (atlasCustomName) atlasCustomName.value = (appSettings && appSettings.atlasCustomName) || '';
        if (atlasCustomLetters) atlasCustomLetters.value = (appSettings && appSettings.atlasCustomLetters) || '';
    }

    if (atlasSourceSelect) {
        syncAtlasUI();
        atlasSourceSelect.addEventListener('change', () => {
            appSettings.atlasLetterSource = atlasSourceSelect.value;
            syncAtlasUI();
            saveAppSettings();
        });
    }
    if (atlasCustomName) {
        atlasCustomName.addEventListener('input', () => {
            appSettings.atlasCustomName = atlasCustomName.value.trim();
            saveAppSettings();
        });
    }
    if (atlasCustomLetters) {
        atlasCustomLetters.addEventListener('input', () => {
            appSettings.atlasCustomLetters = atlasCustomLetters.value;
            saveAppSettings();
            if (atlasLettersDisplay) atlasLettersDisplay.textContent = getAtlasLetterDisplayString();
        });
    }

    const letterLyingModeSelect = document.getElementById('letterLyingModeSelect');
    const letterLyingStaticFields = document.getElementById('letterLyingStaticFields');
    const letterLyingDynamicFields = document.getElementById('letterLyingDynamicFields');
    const letterLyingStringSourceSelect = document.getElementById('letterLyingStringSourceSelect');
    const letterLyingDefaultFields = document.getElementById('letterLyingDefaultFields');
    const letterLyingPersonalFields = document.getElementById('letterLyingPersonalFields');
    const letterLyingSavedFields = document.getElementById('letterLyingSavedFields');
    
    const letterLyingStaticInput = document.getElementById('letterLyingStaticInput');
    const letterLyingDuplicateMsg = document.getElementById('letterLyingDuplicateMsg');
    const letterLyingResetDefaultBtn = document.getElementById('letterLyingResetDefaultBtn');
    const letterLyingSavedOptgroup = document.getElementById('letterLyingSavedOptgroup');
    const letterLyingSavedSelectedName = document.getElementById('letterLyingSavedSelectedName');
    const letterLyingDeleteSavedBtn = document.getElementById('letterLyingDeleteSavedBtn');
    const letterLyingSaveNameInput = document.getElementById('letterLyingSaveNameInput');
    const letterLyingSaveAsBtn = document.getElementById('letterLyingSaveAsBtn');
    const letterLyingSavedList = document.getElementById('letterLyingSavedList');
    const letterLyingStepsInput = document.getElementById('letterLyingStepsInput');

    function getCurrentLetterLyingStringForSave() {
        const source = (appSettings && appSettings.letterLyingStringSource) || 'default';
        if (source === 'default') return DEFAULT_LETTER_LYING_STRING;
        if (source === 'personal') return (appSettings && appSettings.letterLyingStaticString) || DEFAULT_LETTER_LYING_STRING;
        if (source === 'saved') {
            const sets = (appSettings && appSettings.letterLyingSavedSets) || [];
            const set = sets.find(x => x.id === (appSettings && appSettings.letterLyingSavedId));
            return (set && set.string) || DEFAULT_LETTER_LYING_STRING;
        }
        return (appSettings && appSettings.letterLyingStaticString) || DEFAULT_LETTER_LYING_STRING;
    }

    function populateLetterLyingSavedOptgroup() {
        if (!letterLyingSavedOptgroup) return;
        letterLyingSavedOptgroup.innerHTML = '';
        const sets = (appSettings && appSettings.letterLyingSavedSets) || [];
        sets.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            letterLyingSavedOptgroup.appendChild(opt);
        });
    }

    function syncLetterLyingSourcePanels() {
        const source = (appSettings && appSettings.letterLyingStringSource) || 'default';
        const savedId = appSettings && appSettings.letterLyingSavedId;
        const showDefault = source === 'default';
        const showPersonal = source === 'personal';
        const showSaved = source === 'saved' && savedId;
        if (letterLyingDefaultFields) letterLyingDefaultFields.style.display = showDefault ? '' : 'none';
        if (letterLyingPersonalFields) letterLyingPersonalFields.style.display = showPersonal ? '' : 'none';
        if (letterLyingSavedFields) letterLyingSavedFields.style.display = showSaved ? '' : 'none';
        if (showPersonal && letterLyingStaticInput) letterLyingStaticInput.value = (appSettings && appSettings.letterLyingStaticString) || DEFAULT_LETTER_LYING_STRING;
        if (showSaved && letterLyingSavedSelectedName) {
            const sets = (appSettings && appSettings.letterLyingSavedSets) || [];
            const set = sets.find(x => x.id === savedId);
            letterLyingSavedSelectedName.textContent = set ? (set.name + ': ' + set.string) : '';
        }
        if (letterLyingSavedList) {
            letterLyingSavedList.innerHTML = '';
            const sets = (appSettings && appSettings.letterLyingSavedSets) || [];
            sets.forEach(s => {
                const row = document.createElement('div');
                row.className = 'letter-lying-saved-row';
                const nameSpan = document.createElement('span');
                nameSpan.className = 'letter-lying-saved-item-name';
                nameSpan.textContent = s.name;
                const strSpan = document.createElement('span');
                strSpan.className = 'letter-lying-saved-item-string';
                strSpan.textContent = s.string;
                const useBtn = document.createElement('button');
                useBtn.type = 'button';
                useBtn.className = 'small-button letter-lying-use-saved-btn';
                useBtn.dataset.id = s.id;
                useBtn.textContent = 'Use';
                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.className = 'small-button letter-lying-delete-saved-btn';
                delBtn.dataset.id = s.id;
                delBtn.textContent = 'Delete';
                row.append(nameSpan, ' ', strSpan, ' ', useBtn, ' ', delBtn);
                letterLyingSavedList.appendChild(row);
            });
        }
    }

    function syncLetterLyingUI() {
        const mode = (appSettings && appSettings.letterLyingMode) || 'static';
        if (letterLyingModeSelect) letterLyingModeSelect.value = mode;
        if (letterLyingStaticFields) letterLyingStaticFields.style.display = mode === 'static' ? '' : 'none';
        if (letterLyingDynamicFields) letterLyingDynamicFields.style.display = mode === 'dynamic' ? '' : 'none';
        if (letterLyingStepsInput) {
            const v = (appSettings && typeof appSettings.letterLyingStaticMaxSteps === 'number')
                ? appSettings.letterLyingStaticMaxSteps
                : 0;
            letterLyingStepsInput.value = v;
        }
        if (letterLyingDuplicateMsg) letterLyingDuplicateMsg.style.display = 'none';
        if (mode !== 'static') return;
        const sets = (appSettings && appSettings.letterLyingSavedSets) || [];
        const savedId = appSettings && appSettings.letterLyingSavedId;
        const source = (appSettings && appSettings.letterLyingStringSource) || 'default';
        if (source === 'saved' && (!savedId || !sets.some(s => s.id === savedId))) {
            appSettings.letterLyingStringSource = 'default';
            appSettings.letterLyingSavedId = null;
        }
        populateLetterLyingSavedOptgroup();
        const effectiveSource = (appSettings && appSettings.letterLyingStringSource) || 'default';
        const effectiveSavedId = appSettings && appSettings.letterLyingSavedId;
        if (letterLyingStringSourceSelect) {
            if (effectiveSource === 'saved' && effectiveSavedId) {
                letterLyingStringSourceSelect.value = effectiveSavedId;
            } else {
                letterLyingStringSourceSelect.value = effectiveSource;
            }
        }
        syncLetterLyingSourcePanels();
    }

    if (letterLyingModeSelect) {
        syncLetterLyingUI();
        letterLyingModeSelect.addEventListener('change', () => {
            appSettings.letterLyingMode = letterLyingModeSelect.value;
            syncLetterLyingUI();
            saveAppSettings();
        });
    }
    if (letterLyingStringSourceSelect) {
        letterLyingStringSourceSelect.addEventListener('change', () => {
            const val = letterLyingStringSourceSelect.value;
            const sets = (appSettings && appSettings.letterLyingSavedSets) || [];
            const isSavedId = sets.some(s => s.id === val);
            if (isSavedId) {
                appSettings.letterLyingStringSource = 'saved';
                appSettings.letterLyingSavedId = val;
            } else {
                appSettings.letterLyingStringSource = val;
                appSettings.letterLyingSavedId = null;
            }
            syncLetterLyingSourcePanels();
            saveAppSettings();
        });
    }
    if (letterLyingStaticInput) {
        letterLyingStaticInput.addEventListener('input', () => {
            const raw = letterLyingStaticInput.value.toUpperCase().replace(/[^A-Z]/g, '');
            const seen = new Set();
            let result = '';
            let hadDuplicate = false;
            for (const c of raw) {
                if (seen.has(c)) hadDuplicate = true;
                else { seen.add(c); result += c; }
            }
            letterLyingStaticInput.value = result;
            appSettings.letterLyingStaticString = result || DEFAULT_LETTER_LYING_STRING;
            saveAppSettings();
            if (letterLyingDuplicateMsg) {
                letterLyingDuplicateMsg.style.display = hadDuplicate ? 'inline' : 'none';
                if (hadDuplicate) setTimeout(() => { if (letterLyingDuplicateMsg) letterLyingDuplicateMsg.style.display = 'none'; }, 2000);
            }
        });
        letterLyingStaticInput.addEventListener('keypress', (e) => {
            if (!/^[a-zA-Z]$/.test(e.key) && !e.ctrlKey && !e.metaKey && e.key.length === 1) e.preventDefault();
        });
    }
    if (letterLyingResetDefaultBtn) {
        letterLyingResetDefaultBtn.addEventListener('click', () => {
            appSettings.letterLyingStaticString = DEFAULT_LETTER_LYING_STRING;
            if (letterLyingStaticInput) letterLyingStaticInput.value = DEFAULT_LETTER_LYING_STRING;
            if (letterLyingDuplicateMsg) letterLyingDuplicateMsg.style.display = 'none';
            syncLetterLyingSourcePanels();
            saveAppSettings();
        });
    }
    if (letterLyingDeleteSavedBtn) {
        letterLyingDeleteSavedBtn.addEventListener('click', () => {
            const id = appSettings && appSettings.letterLyingSavedId;
            if (!id) return;
            if (!appSettings.letterLyingSavedSets) return;
            appSettings.letterLyingSavedSets = appSettings.letterLyingSavedSets.filter(s => s.id !== id);
            appSettings.letterLyingSavedId = null;
            appSettings.letterLyingStringSource = 'default';
            if (letterLyingStringSourceSelect) letterLyingStringSourceSelect.value = 'default';
            populateLetterLyingSavedOptgroup();
            syncLetterLyingSourcePanels();
            saveAppSettings();
        });
    }
    if (letterLyingSaveAsBtn && letterLyingSaveNameInput) {
        letterLyingSaveAsBtn.addEventListener('click', () => {
            const name = letterLyingSaveNameInput.value.trim();
            if (!name) return;
            const str = getCurrentLetterLyingStringForSave();
            if (!appSettings.letterLyingSavedSets) appSettings.letterLyingSavedSets = [];
            const id = Date.now().toString();
            appSettings.letterLyingSavedSets.push({ id, name, string: str });
            letterLyingSaveNameInput.value = '';
            populateLetterLyingSavedOptgroup();
            appSettings.letterLyingStringSource = 'saved';
            appSettings.letterLyingSavedId = id;
            if (letterLyingStringSourceSelect) letterLyingStringSourceSelect.value = id;
            syncLetterLyingSourcePanels();
            saveAppSettings();
        });
    }
    if (letterLyingSavedList) {
        letterLyingSavedList.addEventListener('click', (e) => {
            const useBtn = e.target.closest('.letter-lying-use-saved-btn');
            const delBtn = e.target.closest('.letter-lying-delete-saved-btn');
            if (useBtn && useBtn.dataset.id) {
                appSettings.letterLyingStringSource = 'saved';
                appSettings.letterLyingSavedId = useBtn.dataset.id;
                if (letterLyingStringSourceSelect) letterLyingStringSourceSelect.value = useBtn.dataset.id;
                syncLetterLyingSourcePanels();
                saveAppSettings();
            } else if (delBtn && delBtn.dataset.id) {
                const id = delBtn.dataset.id;
                appSettings.letterLyingSavedSets = (appSettings.letterLyingSavedSets || []).filter(s => s.id !== id);
                if (appSettings.letterLyingSavedId === id) {
                    appSettings.letterLyingSavedId = null;
                    appSettings.letterLyingStringSource = 'default';
                    if (letterLyingStringSourceSelect) letterLyingStringSourceSelect.value = 'default';
                }
                populateLetterLyingSavedOptgroup();
                syncLetterLyingSourcePanels();
                saveAppSettings();
            }
        });
    }
    if (letterLyingStepsInput) {
        letterLyingStepsInput.addEventListener('input', () => {
            const n = parseInt(letterLyingStepsInput.value, 10);
            const val = !isNaN(n) && n >= 0 && n <= 26 ? n : 0;
            appSettings.letterLyingStaticMaxSteps = val;
            saveAppSettings();
        });
    }

    const muteLetterModeSelect = document.getElementById('muteLetterModeSelect');
    const muteCustomSequenceFields = document.getElementById('muteCustomSequenceFields');
    const muteCustomSequenceInput = document.getElementById('muteCustomSequenceInput');
    if (muteLetterModeSelect) {
        if (appSettings && appSettings.muteLetterMode) {
            muteLetterModeSelect.value = appSettings.muteLetterMode;
        }
        const syncMuteCustomUI = () => {
            const mode = muteLetterModeSelect.value;
            if (muteCustomSequenceFields) {
                muteCustomSequenceFields.style.display = mode === 'custom' ? '' : 'none';
            }
            if (mode === 'custom' && muteCustomSequenceInput && appSettings && appSettings.muteCustomSequence) {
                muteCustomSequenceInput.value = appSettings.muteCustomSequence;
            }
        };
        syncMuteCustomUI();
        muteLetterModeSelect.addEventListener('change', () => {
            let mode = 'az';
            if (muteLetterModeSelect.value === 'mostFrequent') mode = 'mostFrequent';
            if (muteLetterModeSelect.value === 'custom') mode = 'custom';
            appSettings.muteLetterMode = mode;
            saveAppSettings();
            syncMuteCustomUI();
        });
        if (muteCustomSequenceInput) {
            if (appSettings && appSettings.muteCustomSequence) {
                muteCustomSequenceInput.value = appSettings.muteCustomSequence;
            }
            muteCustomSequenceInput.addEventListener('input', () => {
                let val = (muteCustomSequenceInput.value || '').toUpperCase().replace(/[^A-Z]/g, '');
                // Optional: dedupe to avoid repeated letters
                let seen = new Set();
                let deduped = '';
                for (const ch of val) {
                    if (!seen.has(ch)) {
                        seen.add(ch);
                        deduped += ch;
                    }
                }
                if (deduped.length === 0) {
                    deduped = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                }
                muteCustomSequenceInput.value = deduped;
                appSettings.muteCustomSequence = deduped;
                saveAppSettings();
            });
        }
    }

    const zeroCurvesApproxToggle = document.getElementById('zeroCurvesApproxToggle');
    if (zeroCurvesApproxToggle) {
        zeroCurvesApproxToggle.checked = !!(appSettings && appSettings.zeroCurvesApprox);
        zeroCurvesApproxToggle.addEventListener('change', () => {
            appSettings.zeroCurvesApprox = zeroCurvesApproxToggle.checked;
            saveAppSettings();
        });
    }

    const nameEngineWordCountToggle = document.getElementById('nameEngineWordCountToggle');
    const nameEngineWordCountBufferFields = document.getElementById('nameEngineWordCountBufferFields');
    const nameEngineWordCountBuffer1Toggle = document.getElementById('nameEngineWordCountBuffer1Toggle');

    function syncNameEngineWordCountBufferUI() {
        const wcOn = !!(appSettings && appSettings.nameEngineWordCount);
        if (nameEngineWordCountBufferFields) {
            nameEngineWordCountBufferFields.style.display = wcOn ? '' : 'none';
        }
    }

    if (nameEngineWordCountBuffer1Toggle) {
        nameEngineWordCountBuffer1Toggle.checked = !!(appSettings && appSettings.nameEngineWordCountBuffer1);
        nameEngineWordCountBuffer1Toggle.addEventListener('change', () => {
            appSettings.nameEngineWordCountBuffer1 = nameEngineWordCountBuffer1Toggle.checked;
            saveAppSettings();
        });
    }

    if (nameEngineWordCountToggle) {
        nameEngineWordCountToggle.checked = !!(appSettings && appSettings.nameEngineWordCount);
        syncNameEngineWordCountBufferUI();
        nameEngineWordCountToggle.addEventListener('change', () => {
            appSettings.nameEngineWordCount = nameEngineWordCountToggle.checked;
            saveAppSettings();
            syncNameEngineWordCountBufferUI();
        });
    }

    const advLexIgnorePosition1Toggle = document.getElementById('advLexIgnorePosition1Toggle');
    if (advLexIgnorePosition1Toggle) {
        advLexIgnorePosition1Toggle.checked = !!(appSettings && appSettings.advLexIgnorePosition1);
        advLexIgnorePosition1Toggle.addEventListener('change', () => {
            appSettings.advLexIgnorePosition1 = advLexIgnorePosition1Toggle.checked;
            saveAppSettings();
        });
    }

    const loveLettersRowCountSelect = document.getElementById('loveLettersRowCountSelect');
    const loveLettersRowInputs = [1, 2, 3, 4, 5].map(r => document.getElementById('loveLettersRow' + r + 'Input'));
    const loveLettersResetDefaultBtn = document.getElementById('loveLettersResetDefaultBtn');

    function syncLoveLettersUI() {
        const count = Math.max(1, Math.min(5, (appSettings && appSettings.loveLettersRowCount) || 5));
        if (loveLettersRowCountSelect) loveLettersRowCountSelect.value = String(count);
        loveLettersRowInputs.forEach((el, i) => {
            if (el) {
                const key = 'loveLettersRow' + (i + 1);
                el.value = (appSettings && appSettings[key]) || (LOVE_LETTERS_DEFAULT['row' + (i + 1)] || '');
            }
        });
        document.querySelectorAll('#loveLettersRowFields .love-letters-row').forEach(row => {
            const r = parseInt(row.getAttribute('data-row'), 10);
            row.style.display = r <= count ? '' : 'none';
        });
    }

    if (loveLettersRowCountSelect) {
        syncLoveLettersUI();
        loveLettersRowCountSelect.addEventListener('change', () => {
            appSettings.loveLettersRowCount = parseInt(loveLettersRowCountSelect.value, 10);
            syncLoveLettersUI();
            saveAppSettings();
        });
    }
    loveLettersRowInputs.forEach((el, i) => {
        if (el) {
            el.addEventListener('input', () => {
                const key = 'loveLettersRow' + (i + 1);
                appSettings[key] = el.value.toUpperCase().replace(/[^A-Z]/g, '');
                saveAppSettings();
            });
        }
    });
    if (loveLettersResetDefaultBtn) {
        loveLettersResetDefaultBtn.addEventListener('click', () => {
            appSettings.loveLettersRowCount = LOVE_LETTERS_DEFAULT.rowCount;
            appSettings.loveLettersRow1 = LOVE_LETTERS_DEFAULT.row1;
            appSettings.loveLettersRow2 = LOVE_LETTERS_DEFAULT.row2;
            appSettings.loveLettersRow3 = LOVE_LETTERS_DEFAULT.row3;
            appSettings.loveLettersRow4 = LOVE_LETTERS_DEFAULT.row4;
            appSettings.loveLettersRow5 = LOVE_LETTERS_DEFAULT.row5;
            syncLoveLettersUI();
            saveAppSettings();
        });
    }
}

// Scrabble letter values
const SCRABBLE_VALUES = {
    'A': 1, 'E': 1, 'I': 1, 'O': 1, 'U': 1, 'L': 1, 'N': 1, 'S': 1, 'T': 1, 'R': 1,
    'D': 2, 'G': 2,
    'B': 3, 'C': 3, 'M': 3, 'P': 3,
    'F': 4, 'H': 4, 'V': 4, 'W': 4, 'Y': 4,
    'K': 5,
    'J': 8, 'X': 8,
    'Q': 10, 'Z': 10
};

// Calculate Scrabble score for a word
function calculateScrabbleScore(word) {
    let score = 0;
    const upperWord = word.toUpperCase();
    for (let i = 0; i < upperWord.length; i++) {
        const letter = upperWord[i];
        score += SCRABBLE_VALUES[letter] || 0;
    }
    return score;
}

// Filter words by Scrabble score
function filterWordsByScrabble(words, targetScore) {
    return words.filter(word => {
        const score = calculateScrabbleScore(word);
        return score === targetScore;
    });
}

// Filter words by SCRABBLE1: score within target ± 1; exact-match words are stored for blue highlight
function filterWordsByScrabble1(words, targetScore) {
    const exact = [];
    const within = [];
    for (const word of words) {
        const score = calculateScrabbleScore(word);
        if (score === targetScore) {
            exact.push(word);
            within.push(word);
        } else if (score === targetScore - 1 || score === targetScore + 1) {
            within.push(word);
        }
    }
    scrabble1ExactMatchSet = new Set(exact);
    return within;
}

// Filter words by SOLOGRAM: Y/N string defines length of pointed-to word P; keep main-list W if
// there exists some secondary word P (of that length) with no letter having both Y and N, such that
// W contains all letters at Y positions and contains none of the letters at N positions.
function filterWordsBySologram(words, ynString) {
    const raw = (ynString || '').toUpperCase().replace(/[^YN]/g, '');
    if (raw.length === 0) return words;
    const L = raw.length;
    const secondaryWords = getSologramSecondaryWords();
    const secondaryOfLength = secondaryWords.filter(w => w.length === L);
    const consistentP = secondaryOfLength.filter(P => {
        const letterToVerdict = new Map();
        for (let i = 0; i < L; i++) {
            const letter = P[i];
            const verdict = raw[i];
            if (!letterToVerdict.has(letter)) letterToVerdict.set(letter, verdict);
            else if (letterToVerdict.get(letter) !== verdict) return false; // contradiction
        }
        return true;
    });
    if (consistentP.length === 0) return [];
    return words.filter(W => {
        const wUpper = W.toUpperCase();
        for (const P of consistentP) {
            let ok = true;
            for (let i = 0; i < L; i++) {
                const letter = P[i];
                const inW = wUpper.includes(letter);
                if (raw[i] === 'Y' && !inW) { ok = false; break; }
                if (raw[i] === 'N' && inW) { ok = false; break; }
            }
            if (ok) return true;
        }
        return false;
    });
}

// Return list of pointed-to words P (from secondary list) that are consistent with ynString and
// have at least one word in words matching (for SOLOGRAM overlay).
function getPossibleSologramPointedToWords(words, ynString) {
    const raw = (ynString || '').toUpperCase().replace(/[^YN]/g, '');
    if (raw.length === 0) return [];
    const L = raw.length;
    const secondaryWords = getSologramSecondaryWords();
    const secondaryOfLength = secondaryWords.filter(w => w.length === L);
    const consistentP = secondaryOfLength.filter(P => {
        const letterToVerdict = new Map();
        for (let i = 0; i < L; i++) {
            const letter = P[i];
            const verdict = raw[i];
            if (!letterToVerdict.has(letter)) letterToVerdict.set(letter, verdict);
            else if (letterToVerdict.get(letter) !== verdict) return false;
        }
        return true;
    });
    return consistentP.filter(P => {
        for (const W of words) {
            const wUpper = W.toUpperCase();
            let ok = true;
            for (let i = 0; i < L; i++) {
                const letter = P[i];
                const inW = wUpper.includes(letter);
                if (raw[i] === 'Y' && !inW) { ok = false; break; }
                if (raw[i] === 'N' && inW) { ok = false; break; }
            }
            if (ok) return true;
        }
        return false;
    });
}

// Show or update SOLOGRAM overlay at bottom of results container (only when workflow has SOLOGRAM and we have a Y/N string).
function updateSologramOverlay(words) {
    const resultsContainer = document.getElementById('results');
    if (!resultsContainer) return;
    let overlay = document.getElementById('sologramOverlay');
    if (!workflowHasSologram || !lastSologramYnString) {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        return;
    }
    const possibleP = getPossibleSologramPointedToWords(words, lastSologramYnString);
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sologramOverlay';
        overlay.className = 'sologram-overlay';
    }
    overlay.innerHTML = `
        <div class="sologram-overlay-title">Possible pointed-to words</div>
        <div class="sologram-overlay-list">${possibleP.length ? possibleP.map(p => `<span class="sologram-overlay-word">${p}</span>`).join(' ') : '<span class="sologram-overlay-empty">None</span>'}</div>
    `;
    if (!overlay.parentNode || overlay.parentNode !== resultsContainer) {
        resultsContainer.appendChild(overlay);
    }
}

// T9 B-IDENTITY definites: first 4 digits/letters of T9 string. Returns [{ position, digit, letter }] for positions with numerical definite.
function getT9Definites(words) {
    if (!words || words.length === 0) return [];
    const withLength4 = words.filter(w => w.length >= 4);
    if (withLength4.length === 0) return [];
    calculateT9Strings(withLength4);
    const definites = [];
    for (let p = 1; p <= 4; p++) {
        const i = p - 1;
        const digits = withLength4.map(w => {
            const t9 = t9StringsMap.get(w) || wordToT9(w);
            return t9.length > i ? t9[i] : null;
        }).filter(Boolean);
        if (digits.length !== withLength4.length) continue;
        const firstDigit = digits[0];
        if (!digits.every(d => d === firstDigit)) continue; // no numerical definite
        const letters = withLength4.map(w => w.toUpperCase()[i]);
        const firstLetter = letters[0];
        const sameLetter = letters.every(l => l === firstLetter);
        definites.push({ position: p, digit: firstDigit, letter: sameLetter ? firstLetter : null });
    }
    return definites;
}

// Show or update T9 definites overlay at bottom of results (only after B-IDENTITY submitted; does not block touch).
function updateT9DefinitesOverlay(words) {
    const resultsContainer = document.getElementById('results');
    if (!resultsContainer) return;
    let overlay = document.getElementById('t9DefinitesOverlay');
    if (!workflowHasT9B || !t9BSubmitted) {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        return;
    }
    const definites = getT9Definites(words);
    if (definites.length === 0) {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        return;
    }
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 't9DefinitesOverlay';
        overlay.className = 't9-definites-overlay';
    }
    overlay.innerHTML = definites.map(d =>
        d.letter ? `${d.position} = ${d.digit} (${d.letter})` : `${d.position} = ${d.digit}`
    ).join('<br>');
    if (!overlay.parentNode || overlay.parentNode !== resultsContainer) {
        resultsContainer.appendChild(overlay);
    }
}

// Filter words by SCRAMBLE feature
// When truthOnOne is false: Each position is a "lie" - the letter at that position is different from the user's input
// When truthOnOne is true: ANY one letter is correct at its position (others are wrong at their positions)
// If specifiedPosition is provided (1-based), only that position is correct, all others are wrong
// The word length must match the input string length
function filterWordsByScramble(words, letterString, truthOnOne, specifiedPosition = null) {
    if (!letterString || letterString.length === 0) return words;
    
    const letters = letterString.toUpperCase().split('');
    const requiredLength = letters.length;
    
    if (!truthOnOne) {
        // Mode 1: Each position is a "lie" - the letter at that position must be different from the user's input
        return words.filter(word => {
            const upperWord = word.toUpperCase();
            
            // Word must be exactly the same length as the input string
            if (upperWord.length !== requiredLength) {
                return false;
            }
            
            // Each position is incorrect: the letter at that position must differ from the user's input
            for (let i = 0; i < letters.length; i++) {
                if (upperWord[i] === letters[i]) {
                    return false; // Position matches - not a lie at this position
                }
            }
            
            return true;
        });
    } else {
        // Mode 2: Truth on one position
        if (specifiedPosition !== null) {
            // Specific position is correct (1-based input, convert to 0-based)
            const correctIndex = specifiedPosition - 1;
            const correctLetter = letters[correctIndex];
            
            return words.filter(word => {
                const upperWord = word.toUpperCase();
                
                // Word must be exactly the same length as the input string
                if (upperWord.length !== requiredLength) {
                    return false;
                }
                
                // Check that the specified position has the correct letter
                if (upperWord[correctIndex] !== correctLetter) {
                    return false;
                }
                
                // Check that all other positions don't match their corresponding letters
                for (let i = 0; i < letters.length; i++) {
                    if (i !== correctIndex && upperWord[i] === letters[i]) {
                        return false; // This position should be wrong but it matches
                    }
                }
                
                return true;
            });
        } else {
            // ANY one letter is correct at its position, others are wrong at their positions
            return words.filter(word => {
                const upperWord = word.toUpperCase();
                
                // Word must be exactly the same length as the input string
                if (upperWord.length !== requiredLength) {
                    return false;
                }
                
                // Check each possible scenario where one letter is correct
                for (let correctIndex = 0; correctIndex < letters.length; correctIndex++) {
                    const correctLetter = letters[correctIndex];
                    
                    // Check if this position has the correct letter
                    if (upperWord[correctIndex] === correctLetter) {
                        // Check that all other positions don't match their corresponding letters
                        let allOthersWrong = true;
                        for (let i = 0; i < letters.length; i++) {
                            if (i !== correctIndex && upperWord[i] === letters[i]) {
                                allOthersWrong = false;
                                break;
                            }
                        }
                        
                        if (allOthersWrong) {
                            return true; // This scenario matches
                        }
                    }
                }
                
                return false; // No scenario matched
            });
        }
    }
}

// Add helper function to find most frequent letter
function findMostFrequentLetter(words, rank = 1) {
    // Count frequencies of all letters
    const frequencyMap = new Map();
    words.forEach(word => {
        [...word].forEach(letter => {
            // Only count letters A-Z, convert to uppercase first
            const upperLetter = letter.toUpperCase();
            if (/^[A-Z]$/.test(upperLetter)) {
                frequencyMap.set(upperLetter, (frequencyMap.get(upperLetter) || 0) + 1);
            }
        });
    });
    
    // Sort letters by frequency
    const sortedLetters = [...frequencyMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0]);
    
    // Find the nth most frequent letter that hasn't been answered in this workflow
    let count = 0;
    for (const letter of sortedLetters) {
        // Skip letters that have already been confirmed or excluded in this workflow
        if (!workflowState.confirmedLetters.has(letter) && !workflowState.excludedLetters.has(letter)) {
            count++;
            if (count === rank) {
                return letter;
            }
        }
    }
    return null;  // No more unique frequent letters that haven't been answered
}

// Add filtering function
function filterWordsByMostFrequent(words, letter, include) {
    return words.filter(word => {
        const hasLetter = word.toUpperCase().includes(letter);
        return include ? hasLetter : !hasLetter;
    });
}

// Function to find the least frequent letter
function findLeastFrequentLetter(words) {
    // Count frequencies of all letters
    const frequencyMap = new Map();
    words.forEach(word => {
        [...word].forEach(letter => {
            // Only count letters A-Z, convert to uppercase first
            const upperLetter = letter.toUpperCase();
            if (/^[A-Z]$/.test(upperLetter)) {
                frequencyMap.set(upperLetter, (frequencyMap.get(upperLetter) || 0) + 1);
            }
        });
    });
    
    // Sort letters by frequency (ascending)
    const sortedLetters = [...frequencyMap.entries()]
        .sort((a, b) => a[1] - b[1])
        .map(entry => entry[0]);
    
    // Return the least frequent letter that hasn't been answered in this workflow
    for (const letter of sortedLetters) {
        // Skip letters that have already been confirmed or excluded in this workflow
        if (!workflowState.confirmedLetters.has(letter) && !workflowState.excludedLetters.has(letter)) {
            return letter;
        }
    }
    return null;  // No more unique letters that haven't been answered
}

// Function to filter words based on least frequent letter
function filterWordsByLeastFrequent(words, letter, include) {
    if (!letter) return words;
    return words.filter(word => {
        const hasLetter = word.toUpperCase().includes(letter);
        return include ? hasLetter : !hasLetter;
    });
}

// Add a cooldown map to track when features were last added
const featureCooldown = new Map();

function initializeFeatureSelection() {
    const availableFeatures = document.getElementById('availableFeatures');
    const selectedFeaturesList = document.getElementById('selectedFeaturesList');
    
    if (availableFeatures) {
        const featureButtons = availableFeatures.querySelectorAll('.feature-button');
        
        featureButtons.forEach(button => {
            // Remove existing event listeners
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Track touch state for scroll detection
            let touchStartX = 0;
            let touchStartY = 0;
            let touchStartTime = 0;
            let hasMoved = false;
            
            // Handle click (desktop)
            newButton.addEventListener('click', (e) => {
                const featureType = newButton.dataset.feature;
                
                // Check cooldown
                const lastAdded = featureCooldown.get(featureType);
                const now = Date.now();
                if (lastAdded && (now - lastAdded) < 1000) {
                    return;
                }
                
                if (!isFeatureAlreadySelected(featureType)) {
                    addFeatureToSelected(featureType);
                    featureCooldown.set(featureType, now);
                }
            });
            
            // Track touch start
            newButton.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                touchStartTime = Date.now();
                hasMoved = false;
            }, { passive: true });
            
            // Track touch move to detect scrolling
            newButton.addEventListener('touchmove', (e) => {
                if (!hasMoved) {
                    const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
                    const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
                    // If moved more than 10px, consider it a scroll
                    if (deltaX > 18 || deltaY > 18) {
                        hasMoved = true;
                    }
                }
            }, { passive: true });
            
            // Handle touch end - only trigger if it was a tap, not a scroll
            newButton.addEventListener('touchend', (e) => {
                const touchEndTime = Date.now();
                const touchDuration = touchEndTime - touchStartTime;
                
                // Only trigger if:
                // 1. Touch didn't move significantly (not a scroll)
                // 2. Touch duration was short (less than 300ms - indicates a tap)
                // 3. Not within cooldown period
                if (!hasMoved && touchDuration < 300) {
                e.preventDefault();
                const featureType = newButton.dataset.feature;
                
                // Check cooldown
                const lastAdded = featureCooldown.get(featureType);
                const now = Date.now();
                if (lastAdded && (now - lastAdded) < 1000) {
                        return;
                }
                
                if (!isFeatureAlreadySelected(featureType)) {
                    addFeatureToSelected(featureType);
                    featureCooldown.set(featureType, now);
                }
                }
                
                // Reset state
                hasMoved = false;
            }, { passive: false });
        });
    }
}

function isFeatureAlreadySelected(featureType) {
    const selectedFeatures = document.getElementById('selectedFeaturesList');
    // Allow multiple instances of MOST FREQUENT, LEAST FREQUENT, and POSITION-CONS
    if (featureType === 'mostFrequent' || 
        featureType === 'leastFrequent' || 
        featureType === 'positionCons') {
        return false;
    }
    // For all other features, maintain the single instance rule
    return selectedFeatures.querySelector(`[data-feature="${featureType}"]`) !== null;
}

function addFeatureToSelected(featureType) {
    const selectedFeatures = document.getElementById('selectedFeaturesList');
    const featureButton = document.querySelector(`.feature-button[data-feature="${featureType}"]`);
    
    if (!featureButton) return;
    
    const selectedFeature = document.createElement('div');
    selectedFeature.className = 'selected-feature-item';
    // Add T9 class if it's a T9 feature
    if (featureType.startsWith('t9')) {
        selectedFeature.classList.add('t9-selected-feature');
    }
    // Add Alpha-Numeric class if it's an Alpha-Numeric feature
    if (featureType === 'alphaNumeric' || featureType === 'lettersAbove') {
        selectedFeature.classList.add('alphanumeric-selected-feature');
    }
    selectedFeature.dataset.feature = featureType;
    
    const featureName = document.createElement('span');
    featureName.textContent = featureButton.textContent;
    selectedFeature.appendChild(featureName);
    
    // Add click event to remove feature
    selectedFeature.addEventListener('click', () => {
        selectedFeature.remove();
        adjustSelectedFeaturesHeight();
    });
    
    // Add touch event for mobile
    selectedFeature.addEventListener('touchstart', (e) => {
        e.preventDefault();
        selectedFeature.remove();
        adjustSelectedFeaturesHeight();
    }, { passive: false });
    
    selectedFeatures.appendChild(selectedFeature);
    adjustSelectedFeaturesHeight();
}

// Add NOT IN feature to the featureElements object
const featureElements = {
    // ... existing features ...
    notIn: createNotInFeature(),
};

// Add NOT IN feature handlers
function initializeNotInFeature() {
    const notInButton = document.getElementById('notInButton');
    const notInInput = document.getElementById('notInInput');
    const notInSkipButton = document.getElementById('notInSkipButton');

    if (notInButton && notInInput && notInSkipButton) {
        // Remove any existing event listeners
        const newNotInButton = notInButton.cloneNode(true);
        const newNotInSkipButton = notInSkipButton.cloneNode(true);
        const newNotInInput = notInInput.cloneNode(true);
        
        notInButton.parentNode.replaceChild(newNotInButton, notInButton);
        notInSkipButton.parentNode.replaceChild(newNotInSkipButton, notInSkipButton);
        notInInput.parentNode.replaceChild(newNotInInput, notInInput);

        newNotInButton.addEventListener('click', () => {
            const letters = newNotInInput.value.toLowerCase();
            if (letters) {
                filterWordsByNotIn(letters);
                callback(currentFilteredWords);
                document.getElementById('notInFeature').classList.add('completed');
                document.getElementById('notInFeature').dispatchEvent(new Event('completed'));
            }
        });

        newNotInSkipButton.addEventListener('click', () => {
            callback(currentFilteredWords);
            document.getElementById('notInFeature').classList.add('completed');
            document.getElementById('notInFeature').dispatchEvent(new Event('completed'));
        });

        // Add enter key support
        newNotInInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                newNotInButton.click();
            }
        });

        // Add touch events for mobile
        newNotInButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            newNotInButton.click();
        }, { passive: false });

        newNotInSkipButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            newNotInSkipButton.click();
        }, { passive: false });
    }
}

function filterWordsByNotIn(letters) {
    const sanitized = sanitizeLetterString(letters);
    const letterSet = new Set(sanitized.split(''));
    currentFilteredWords = currentFilteredWords.filter(word => {
        const upper = word.toUpperCase();
        // Check if ANY of the letters are in the word; if so, exclude
        return !Array.from(letterSet).some(letter => upper.includes(letter));
    });
    displayResults(currentFilteredWords);
}

function filterWordsByPresent(letters) {
    const sanitized = sanitizeLetterString(letters);
    const letterSet = new Set(sanitized.split(''));
    if (letterSet.size === 0) return;
    currentFilteredWords = currentFilteredWords.filter(word => {
        const upper = word.toUpperCase();
        for (const letter of letterSet) {
            if (!upper.includes(letter)) return false;
        }
        return true;
    });
    displayResults(currentFilteredWords);
}

/** Pure filter: keep words whose letter at the given position IS one of the letters in the set (one of these is correct). position: 1, 2, 3, or 'L' (last). Words without that position are excluded. */
function filterWordsByNotInPosition(words, letters, position) {
    const letterSet = new Set(sanitizeLetterString(letters));
    if (letterSet.size === 0) return words;
    return words.filter(word => {
        const idx = position === 'L' ? word.length - 1 : position - 1;
        if (idx < 0 || idx >= word.length) return false;
        return letterSet.has(word[idx].toUpperCase());
    });
}

/** Keep words whose first letter is one of the given letters. */
function filterWordsByNotInPosition1(words, letters) {
    return filterWordsByNotInPosition(words, letters, 1);
}

// ========== POSITION-CONS Helper Functions ==========

// Letter String Sanitization
function sanitizeLetterString(value = '') {
    return (value || '')
        .toUpperCase()
        .replace(/[^A-Z]/g, '');
}

// Source Word Selection
function getSourceWordsForPosition(position = 1) {
    const source = (currentFilteredWords && currentFilteredWords.length 
                   ? currentFilteredWords 
                   : wordList) || [];
    return source.filter(word => typeof word === 'string' && word.length >= position);
}

// Position Letter Statistics
function buildPositionLetterStats(words, position) {
    const freq = new Map();
    const index = Math.max(0, position - 1);
    words.forEach(word => {
        const letter = (word[index] || '').toUpperCase();
        if (!letter || letter < 'A' || letter > 'Z') return;
        freq.set(letter, (freq.get(letter) || 0) + 1);
    });
    return freq;
}

// Letter Group Generation
function getPositionLetterGroups(position) {
    const sourceWords = getSourceWordsForPosition(position);
    const freq = buildPositionLetterStats(sourceWords, position);
    const orderedLetters = [...freq.entries()]
        .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
        .map(([letter]) => letter);
    const consonants = orderedLetters.filter(letter => !VOWEL_SET.has(letter));
    const vowels = orderedLetters.filter(letter => VOWEL_SET.has(letter));
    const allGroups = [];
    if (orderedLetters.length) {
        for (let i = 0; i < orderedLetters.length; i += 6) {
            const chunk = orderedLetters.slice(i, i + 6);
            while (chunk.length < 6 && consonants.length) {
                const filler = consonants.find(letter => !chunk.includes(letter)) ||
                              CONSONANT_LETTERS.find(letter => !chunk.includes(letter));
                if (!filler) break;
                chunk.push(filler);
            }
            allGroups.push(chunk.slice(0, 6));
        }
    } else {
        allGroups.push(CONSONANT_LETTERS.slice(0, 6));
    }
    return {
        signature: orderedLetters.join(''),
        allGroups,
        consonants,
        vowels,
    };
}

// Structured String Generation
function generateStructuredLetterString(position = 1) {
    const { signature, allGroups, consonants, vowels } = getPositionLetterGroups(position);
    // Initialize or reset state if wordlist changed
    if (!positionConsSequenceState[position] || 
        positionConsSequenceState[position].signature !== signature) {
        positionConsSequenceState[position] = {
            signature,
            index: -1,
            useVowels: false,
        };
    }
    const state = positionConsSequenceState[position];
    const groups = allGroups.length ? allGroups : [CONSONANT_LETTERS.slice(0, 6)];
    
    // Cycle through groups
    state.index = (state.index + 1) % groups.length;
    
    // Alternate vowel inclusion
    state.useVowels = !state.useVowels;
    const baseChunk = groups[state.index];
    
    if (state.useVowels && vowels.length) {
        // Vowel turn: show group as-is (includes vowels)
        return baseChunk.join('');
    } else {
        // Consonant turn: filter out vowels, pad with consonants
        const consonantOnly = baseChunk.filter(letter => !VOWEL_SET.has(letter));
        const used = new Set(consonantOnly);
        while (consonantOnly.length < 6) {
            const filler = consonants.find(letter => !used.has(letter)) ||
                          CONSONANT_LETTERS.find(letter => !used.has(letter));
            if (!filler) break;
            consonantOnly.push(filler);
            used.add(filler);
        }
        return consonantOnly.slice(0, 6).join('');
    }
}

// Filtering Logic
function filterWordsByPositionCons(words, options) {
    if (!Array.isArray(words) || !options) return [];
    const { position, letters, letterCount } = options;
    const sanitizedLetters = sanitizeLetterString(letters);
    if (!sanitizedLetters) return [];
    
    const uniqueLetters = [...new Set(sanitizedLetters.split(''))];
    const letterSet = new Set(uniqueLetters);
    const normalizedLetterCount = typeof letterCount === 'number' && letterCount >= 0
        ? letterCount
        : uniqueLetters.length;
    const hasSpecificPosition = typeof position === 'number' && position >= 1 && position <= 6;
    const targetIndex = hasSpecificPosition ? Math.max(0, position - 1) : null;
    
    const countMatches = (upperWord) => {
        let total = 0;
        letterSet.forEach(letter => {
            if (upperWord.includes(letter)) {
                total += 1;
            }
        });
        return total;
    };
    
    const seen = new Set();
    const results = [];
    
    for (const word of words) {
        const upperWord = word.toUpperCase();
        if (!upperWord) continue;
        
        if (hasSpecificPosition) {
            if (upperWord.length <= targetIndex) continue;
            const targetLetter = upperWord[targetIndex];
            if (!letterSet.has(targetLetter)) continue;
            
            const totalMatches = countMatches(upperWord);
            if (totalMatches !== normalizedLetterCount) continue;
            
            const key = upperWord;
            if (!seen.has(key)) {
                seen.add(key);
                results.push(word);
            }
            continue;
        }
        
        const totalMatches = countMatches(upperWord);
        if (totalMatches !== normalizedLetterCount) continue;
        
        let hasLetterMatch = normalizedLetterCount === 0;
        if (!hasLetterMatch) {
            for (let i = 0; i < upperWord.length; i++) {
                if (letterSet.has(upperWord[i])) {
                    hasLetterMatch = true;
                    break;
                }
            }
        }
        
        if (!hasLetterMatch) continue;
        
        const key = upperWord;
        if (!seen.has(key)) {
            seen.add(key);
            results.push(word);
        }
    }
    
    return results.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}
