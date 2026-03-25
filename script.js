/* ==========================================
   DROP FOR CHANGE - GAME LOGIC
   A charity: water inspired clicking game
   ========================================== */

// ==========================================
// GAME STATE VARIABLES
// ==========================================

let gameState = {
    isRunning: false,           // Whether the game is actively playing
    isStarting: false,          // Whether a pre-round countdown is running
    score: 0,                   // Current score
    streak: 0,                  // Consecutive clean catches
    bestStreak: 0,              // Highest clean catch streak this round
    cleanCaught: 0,             // Number of clean drops caught this round
    pollutedAvoided: 0,         // Number of polluted drops that fell past the bucket
    timeRemaining: 60,          // Seconds left to play
    targetScore: 150,           // Score needed to win (about 15 clean drops or fewer with bonuses)
    highScore: 0,               // Best score saved across rounds
    timerInterval: null,        // Store timer so we can stop it
    dropInterval: null,         // Store drop creation so we can stop it
    bucketX: 0,                 // Horizontal bucket position in px
    bucketVelocity: 0,          // Current horizontal velocity for smooth movement
    bucketSteer: 0,             // Smoothed steering value so turns feel less abrupt
    bucketAcceleration: 1.1,    // Keyboard acceleration applied each frame
    bucketMaxSpeed: 13,         // Velocity cap to keep control predictable
    steerLerp: 0.28,            // How quickly keyboard steering reacts to direction changes
    bucketFriction: 0.9,        // Friction when no input is pressed
    baseBucketAcceleration: 1.1, // Baseline acceleration tuned for mobile-sized play areas
    baseBucketMaxSpeed: 13,     // Baseline max speed tuned for mobile-sized play areas
    speedScale: 1,              // Dynamic width-based movement multiplier
    touchTargetX: null,         // Active touch target in px while dragging
    touchIsActive: false,       // Whether a touch drag is currently controlling the bucket
    bucketFrozenUntil: 0,       // Timestamp until which lightning freezes movement
    bucketFreezeTimeout: null,  // Timeout handle to clear freeze visual state safely
    stormActive: false,         // Whether a storm is currently active
    stormTimeout: null,         // Timeout handle for the next random storm trigger
    stormEndTimeout: null,      // Timeout handle for ending current storm
    lightningWarningTimeout: null, // Timeout handle before a lightning strike lands
    lightningTimeout: null,     // Timeout handle to remove lightning flash class
    stormRainInterval: null,    // Interval handle for spawning rain particles
    bucketCatchGlowTimeout: null, // Timeout for positive catch glow state
    bucketShakeTimeout: null,   // Timeout for storm shake animation state
    gameMomentTimeout: null,    // Timeout for short visual moment classes on the game container
    scorePulseTimeout: null,    // Timeout for score pulse class cleanup
    timerPulseTimeout: null,    // Timeout for timer pulse class cleanup
    goalPulseTimeout: null,     // Timeout for goal pulse class cleanup
    actionFeedbackTimeout: null, // Timeout for action feedback state cleanup
    scoreboardFlashTimeout: null, // Timeout for scoreboard gain/loss flash cleanup
    lightningShakeTimeout: null, // Timeout for lightning screen-shake cleanup
    startCountdownTimeouts: [], // Timeout handles used for the visible start countdown
    startSequenceToken: 0,      // Token used to cancel stale countdown callbacks safely
    weatherMode: 'dramatic',    // User selected weather profile
    hasBucketPosition: false,   // Whether initial placement has been done
    stormCycleIndex: 0,         // Pattern index used for deterministic storm cadence
    stormPatternTipShown: false, // Whether the player has seen the warning pattern tip this round
    lightningWarningStep: 0,    // Current warning beat before lightning lands
    progressCelebrated: false,  // Whether full progress celebration has already played this round
    impactCelebrateTimeout: null, // Timeout for progress celebration class cleanup
    magnetActiveUntil: 0,       // Timestamp until the bucket magnet pull is active
    magnetTimeout: null,        // Timeout handle for magnet visual cleanup
    magnetWarningTimeout: null, // Timeout handle for warning before magnet expires
    isMobileOptimized: false,   // Whether lightweight mobile rendering/perf mode is active
    collisionFrameIntervalMs: 16, // Minimum spacing between collision checks
    magnetFrameIntervalMs: 16,  // Minimum spacing between magnet pull updates
    lastCollisionCheckAt: 0,    // Timestamp of the most recent collision check
    lastMagnetPullCheckAt: 0,   // Timestamp of the most recent magnet pull update
};

// Load the saved high score once when the script starts.
gameState.highScore = Number(localStorage.getItem('drop-for-change-high-score')) || 0;

// ==========================================
// DOM ELEMENT REFERENCES
// ==========================================

const elements = {
    scoreDisplay: document.getElementById('score'),
    streakDisplay: document.getElementById('streak-display'),
    gameStreakDisplay: document.getElementById('game-streak-display'),
    magnetCountdown: document.getElementById('magnet-countdown'),
    timerDisplay: document.getElementById('time'),
    gameContainer: document.getElementById('game-container'),
    startBtn: document.getElementById('start-btn'),
    resetBtn: document.getElementById('reset-btn'),
    gameOverModal: document.getElementById('game-over-modal'),
    gameOverTitle: document.getElementById('game-over-title'),
    gameOverMessage: document.getElementById('game-over-message'),
    impactMessage: document.getElementById('impact-message'),
    modalFamiliesCount: document.getElementById('modal-families-count'),
    resultMessage: document.getElementById('result-message'),
    finalScore: document.getElementById('final-score'),
    summaryScore: document.getElementById('summary-score'),
    summaryClean: document.getElementById('summary-clean'),
    summaryPollutedAvoided: document.getElementById('summary-polluted-avoided'),
    summaryBestStreak: document.getElementById('summary-best-streak'),
    playAgainBtn: document.getElementById('play-again-btn'),
    confettiCanvas: document.getElementById('confetti-canvas'),
    themeToggle: document.getElementById('theme-toggle'),
    soundToggle: document.getElementById('sound-toggle'),
    weatherModeSelect: document.getElementById('weather-mode'),
    weatherModeHint: document.getElementById('weather-mode-hint'),
    bucket: document.getElementById('collector-bucket'),
    rainLayer: document.getElementById('rain-layer'),
    lightningFlash: document.getElementById('lightning-flash'),
    lightningBolt: document.getElementById('lightning-bolt'),
    scoreCard: document.querySelector('.scoreboard .stat-card:nth-child(1)'),
    timerCard: document.querySelector('.scoreboard .stat-card:nth-child(2)'),
    goalCard: document.querySelector('.scoreboard .stat-card:nth-child(3)'),
    scoreboard: document.querySelector('.scoreboard'),
    actionFeedback: document.getElementById('action-feedback'),
    pregameOverlay: document.getElementById('pregame-overlay'),
    countdownOverlay: document.getElementById('countdown-overlay'),
    countdownNumber: document.getElementById('countdown-number'),
    resultStatus: document.getElementById('result-status'),
    modalContent: document.querySelector('.modal-content'),
    impactProgressFill: document.getElementById('impact-progress-fill'),
    impactProgressValue: document.getElementById('impact-progress-value'),
    impactProgressTrack: document.querySelector('.impact-track'),
    impactProgressSection: document.querySelector('.impact-progress'),
};

const weatherPresets = {
    calm: {
        label: 'Level 1 - Calm (Easy)',
        hint: 'Difficulty Level 1 selected: easy pace with slower drops, fewer polluted drops, and gentler storms.',
        stormDelayMin: 13000,
        stormDelayMax: 18000,
        stormDurationMs: 1900,
        lightningWarningMs: 920,
        lightningFlashMs: 760,
        freezeMs: 520,
        rainBurstCount: 6,
        rainSpawnIntervalMs: 210,
        rainDurationMin: 0.62,
        rainDurationMax: 1,
        rainOpacityMin: 0.28,
        rainOpacityMax: 0.58,
        dropSpawnIntervalMs: 940,
        dropFallMinSec: 2.8,
        dropFallMaxSec: 4.4,
        cleanChance: 0.76,
        pollutedChance: 0.14,
        stormPatternMs: [17000, 15000, 16200],
        stormDelayFloorMs: 7600,
        stormSpeedupMax: 0.3,
        lightningWarningBeats: 3,
    },
    dramatic: {
        label: 'Level 2 - Dramatic (Medium)',
        hint: 'Difficulty Level 2 selected: balanced challenge with steady pressure and frequent lightning windows.',
        stormDelayMin: 8000,
        stormDelayMax: 12000,
        stormDurationMs: 2800,
        lightningWarningMs: 600,
        lightningFlashMs: 1000,
        freezeMs: 900,
        rainBurstCount: 14,
        rainSpawnIntervalMs: 130,
        rainDurationMin: 0.45,
        rainDurationMax: 0.85,
        rainOpacityMin: 0.45,
        rainOpacityMax: 0.9,
        dropSpawnIntervalMs: 800,
        dropFallMinSec: 2,
        dropFallMaxSec: 3.4,
        cleanChance: 0.7,
        pollutedChance: 0.2,
        stormPatternMs: [11000, 9600, 10400, 9000],
        stormDelayFloorMs: 4700,
        stormSpeedupMax: 0.36,
        lightningWarningBeats: 3,
    },
    hard: {
        label: 'Level 3 - Hard (Intense)',
        hint: 'Difficulty Level 3 selected: intense mode with faster drops, more polluted drops, and harsher storms.',
        stormDelayMin: 5200,
        stormDelayMax: 8200,
        stormDurationMs: 3400,
        lightningWarningMs: 430,
        lightningFlashMs: 1120,
        freezeMs: 1350,
        rainBurstCount: 18,
        rainSpawnIntervalMs: 95,
        rainDurationMin: 0.34,
        rainDurationMax: 0.62,
        rainOpacityMin: 0.56,
        rainOpacityMax: 0.98,
        dropSpawnIntervalMs: 640,
        dropFallMinSec: 1.45,
        dropFallMaxSec: 2.75,
        cleanChance: 0.6,
        pollutedChance: 0.3,
        stormPatternMs: [7600, 6800, 7200, 6200, 6600],
        stormDelayFloorMs: 3300,
        stormSpeedupMax: 0.4,
        lightningWarningBeats: 3,
    },
};

const inputState = {
    leftPressed: false,
    rightPressed: false,
};

const soundState = {
    enabled: true,
    audioContext: null,
};

const MAGNET_SPAWN_CHANCE = 0.04;
const MAGNET_DURATION_MS = 6500;
const MAGNET_PULL_RADIUS_PX = 920;
const MAGNET_WARNING_LEAD_MS = 700;

const STREAK_MULTIPLIERS = {
    medium: 1.2,
    high: 1.5,
    max: 2.0,
};

// ==========================================
// THEME TOGGLE (Visual only, does not affect game logic)
// ==========================================

function applyTheme(theme) {
    const selectedTheme = theme === 'dark' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', selectedTheme);

    if (elements.themeToggle) {
        const isDark = selectedTheme === 'dark';
        elements.themeToggle.textContent = isDark ? 'Light Mode' : 'Dark Mode';
        elements.themeToggle.setAttribute('aria-pressed', String(isDark));
        elements.themeToggle.setAttribute(
            'aria-label',
            isDark ? 'Switch to light mode' : 'Switch to dark mode'
        );
        elements.themeToggle.disabled = false;
    }
}

function initializeThemeToggle() {
    const savedTheme = localStorage.getItem('drop-for-change-theme');
    applyTheme(savedTheme || 'light');

    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme');
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(nextTheme);
            localStorage.setItem('drop-for-change-theme', nextTheme);
        });
    }
}

function updateSoundToggleUI() {
    if (!elements.soundToggle) {
        return;
    }

    elements.soundToggle.textContent = soundState.enabled ? 'Sound: On' : 'Sound: Off';
    elements.soundToggle.setAttribute('aria-pressed', String(soundState.enabled));
    elements.soundToggle.setAttribute(
        'aria-label',
        soundState.enabled ? 'Mute game sounds' : 'Unmute game sounds'
    );

    elements.soundToggle.classList.toggle('sound-off', !soundState.enabled);
}

function getAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
        return null;
    }

    if (!soundState.audioContext) {
        soundState.audioContext = new AudioContextClass();
    }

    if (soundState.audioContext.state === 'suspended') {
        soundState.audioContext.resume().catch(() => {
            // Ignore resume errors; a later interaction can unlock audio again.
        });
    }

    return soundState.audioContext;
}

function playTone(startFrequency, endFrequency, durationSec = 0.1, volume = 0.045, type = 'sine') {
    if (!soundState.enabled) {
        return;
    }

    const audioContext = getAudioContext();
    if (!audioContext) {
        return;
    }

    const scheduleTone = () => {
        const now = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(startFrequency, now);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + durationSec);

        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.exponentialRampToValueAtTime(volume, now + 0.015);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start(now);
        oscillator.stop(now + durationSec + 0.01);
    };

    if (audioContext.state !== 'running') {
        audioContext.resume().then(scheduleTone).catch(() => {
            // Ignore resume failures; a later user interaction can retry.
        });
        return;
    }

    scheduleTone();
}

function playSoundEffect(effectName) {
    if (!soundState.enabled) {
        return;
    }

    switch (effectName) {
        case 'start':
            playTone(520, 760, 0.11, 0.08, 'triangle');
            setTimeout(() => playTone(720, 940, 0.09, 0.075, 'triangle'), 75);
            break;
        case 'clean':
            playTone(700, 880, 0.08, 0.055, 'sine');
            break;
        case 'bonus':
            playTone(620, 980, 0.12, 0.09, 'triangle');
            setTimeout(() => playTone(980, 1240, 0.12, 0.082, 'triangle'), 85);
            break;
        case 'polluted':
            playTone(240, 130, 0.15, 0.078, 'sawtooth');
            break;
        case 'storm':
            playTone(160, 85, 0.22, 0.085, 'square');
            break;
        case 'win':
            playTone(540, 820, 0.12, 0.08, 'triangle');
            setTimeout(() => playTone(820, 1180, 0.16, 0.075, 'triangle'), 100);
            break;
        case 'lose':
            playTone(360, 220, 0.18, 0.078, 'sine');
            break;
        default:
            break;
    }
}

function initializeSoundSystem() {
    // Always start enabled so grading/demo sessions consistently have sound.
    soundState.enabled = true;
    updateSoundToggleUI();

    if (elements.soundToggle) {
        elements.soundToggle.addEventListener('click', () => {
            soundState.enabled = !soundState.enabled;

            if (soundState.enabled) {
                getAudioContext();
                playTone(520, 700, 0.07, 0.06, 'triangle');
            }

            updateSoundToggleUI();
        });
    }

    const unlockAudio = () => {
        getAudioContext();
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio, { passive: true });
}

function getActiveWeatherPreset() {
    return weatherPresets[gameState.weatherMode] || weatherPresets.dramatic;
}

function applyWeatherMode(mode) {
    const selectedMode = weatherPresets[mode] ? mode : 'dramatic';
    const preset = weatherPresets[selectedMode];
    gameState.weatherMode = selectedMode;

    elements.gameContainer.classList.remove('weather-calm', 'weather-dramatic', 'weather-hard');
    elements.gameContainer.classList.add(`weather-${selectedMode}`);

    if (elements.weatherModeSelect) {
        elements.weatherModeSelect.value = selectedMode;
        elements.weatherModeSelect.setAttribute('title', preset.label);
        elements.weatherModeSelect.setAttribute('aria-label', `Choose difficulty level. Current level: ${preset.label}`);
    }

    if (elements.weatherModeHint) {
        elements.weatherModeHint.textContent = preset.hint;
    }

    if (gameState.isRunning) {
        updateDropInterval();
    }
}

function initializeWeatherModeControl() {
    const savedMode = localStorage.getItem('drop-for-change-weather-mode');
    applyWeatherMode(savedMode || 'dramatic');

    if (elements.weatherModeSelect) {
        elements.weatherModeSelect.addEventListener('change', (event) => {
            const previousMode = gameState.weatherMode;
            const selectedMode = event.target.value;
            applyWeatherMode(selectedMode);
            localStorage.setItem('drop-for-change-weather-mode', gameState.weatherMode);

            if (gameState.isRunning && previousMode !== gameState.weatherMode) {
                const activePreset = getActiveWeatherPreset();
                showFeedbackMessage(`Mode switched: ${activePreset.label}.`, 'storm', 1300);
            }
        });
    }
}

function updateDropInterval() {
    clearInterval(gameState.dropInterval);

    if (!gameState.isRunning) {
        gameState.dropInterval = null;
        return;
    }

    const preset = getActiveWeatherPreset();
    gameState.dropInterval = setInterval(createDrop, preset.dropSpawnIntervalMs);
}

// ==========================================
// EVENT LISTENERS - Attach buttons to game functions
// ==========================================

elements.startBtn.addEventListener('click', startGame);
elements.resetBtn.addEventListener('click', resetGame);
elements.playAgainBtn.addEventListener('click', resetGame);
initializeThemeToggle();
initializeSoundSystem();
initializeWeatherModeControl();
initializeBucketControls();
applyDevicePerformanceProfile();
initializeAmbientParallax();
requestAnimationFrame(gameLoop);

function shouldUseMobileOptimization() {
    const usesCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    return usesCoarsePointer || window.innerWidth <= 820;
}

function applyDevicePerformanceProfile() {
    gameState.isMobileOptimized = shouldUseMobileOptimization();
    document.body.classList.toggle('mobile-optimized', gameState.isMobileOptimized);

    if (gameState.isMobileOptimized) {
        gameState.collisionFrameIntervalMs = 34;
        gameState.magnetFrameIntervalMs = 50;
    } else {
        gameState.collisionFrameIntervalMs = 16;
        gameState.magnetFrameIntervalMs = 16;
    }
}

function initializeAmbientParallax() {
    if (gameState.isMobileOptimized || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.documentElement.style.setProperty('--ambient-parallax-x', '0px');
        document.documentElement.style.setProperty('--ambient-parallax-y', '0px');
        return;
    }

    let ticking = false;
    let lastParallaxY = null;
    let lastParallaxX = null;
    let pointerOffsetX = 0;
    let pointerOffsetY = 0;

    const applyParallax = () => {
        const scrollY = window.scrollY || window.pageYOffset || 0;
        const scrollParallaxY = Math.max(-18, Math.min(18, scrollY * -0.03));
        const nextParallaxX = Math.max(-12, Math.min(12, pointerOffsetX));
        const nextParallaxY = Math.max(-22, Math.min(22, scrollParallaxY + pointerOffsetY));

        if (lastParallaxX === null || Math.abs(nextParallaxX - lastParallaxX) > 0.08) {
            document.documentElement.style.setProperty('--ambient-parallax-x', `${nextParallaxX.toFixed(2)}px`);
            lastParallaxX = nextParallaxX;
        }

        if (lastParallaxY === null || Math.abs(nextParallaxY - lastParallaxY) > 0.08) {
            document.documentElement.style.setProperty('--ambient-parallax-y', `${nextParallaxY.toFixed(2)}px`);
            lastParallaxY = nextParallaxY;
        }

        ticking = false;
    };

    const onScroll = () => {
        if (ticking) {
            return;
        }

        ticking = true;
        window.requestAnimationFrame(applyParallax);
    };

    const onPointerMove = (event) => {
        const width = window.innerWidth || 1;
        const height = window.innerHeight || 1;
        const normalizedX = ((event.clientX / width) - 0.5) * 2;
        const normalizedY = ((event.clientY / height) - 0.5) * 2;

        pointerOffsetX = normalizedX * 5;
        pointerOffsetY = normalizedY * 4;

        onScroll();
    };

    const resetPointerDrift = () => {
        pointerOffsetX = 0;
        pointerOffsetY = 0;
        onScroll();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', resetPointerDrift, { passive: true });
    applyParallax();
}

// ==========================================
// MAIN GAME FUNCTIONS
// ==========================================

/**
 * Starts the game
 * - Prevents multiple games from running
 * - Initializes game state
 * - Starts the timer and drop creation
 */
function startGame() {
    // Don't start if already running or in a start sequence.
    if (gameState.isRunning || gameState.isStarting) return;

    beginRoundStartSequence();
}

function beginRoundStartSequence() {
    gameState.isStarting = true;
    gameState.startSequenceToken += 1;
    const currentToken = gameState.startSequenceToken;

    clearStartCountdownTimeouts();
    elements.startBtn.disabled = true;
    elements.gameOverModal.classList.add('hidden');
    elements.pregameOverlay?.classList.add('hidden');
    setActionFeedback('Get ready. Countdown starting...', 'alert');

    const countdownSteps = ['3', '2', '1', 'Go!'];
    elements.countdownOverlay?.classList.remove('hidden');

    countdownSteps.forEach((label, index) => {
        const timeoutId = setTimeout(() => {
            if (currentToken !== gameState.startSequenceToken) {
                return;
            }

            if (!elements.countdownNumber) {
                return;
            }

            elements.countdownNumber.textContent = label;
            elements.countdownNumber.classList.remove('countdown-pulse');
            void elements.countdownNumber.offsetWidth;
            elements.countdownNumber.classList.add('countdown-pulse');
        }, index * 640);

        gameState.startCountdownTimeouts.push(timeoutId);
    });

    const finishTimeoutId = setTimeout(() => {
        if (currentToken !== gameState.startSequenceToken) {
            return;
        }

        elements.countdownOverlay?.classList.add('hidden');
        gameState.isStarting = false;
        startActiveRound();
    }, countdownSteps.length * 640);

    gameState.startCountdownTimeouts.push(finishTimeoutId);
}

function startActiveRound() {
    gameState.isRunning = true;
    gameState.score = 0;
    gameState.streak = 0;
    gameState.bestStreak = 0;
    gameState.cleanCaught = 0;
    gameState.pollutedAvoided = 0;
    gameState.timeRemaining = 60;
    gameState.stormCycleIndex = 0;
    gameState.stormPatternTipShown = false;
    gameState.lightningWarningStep = 0;
    gameState.progressCelebrated = false;
    gameState.magnetActiveUntil = 0;
    clearTimeout(gameState.magnetTimeout);
    clearTimeout(gameState.magnetWarningTimeout);
    gameState.magnetTimeout = null;
    gameState.magnetWarningTimeout = null;
    elements.bucket.classList.remove('bucket-magnet-active');
    updateMagnetCountdownDisplay();

    // Update UI to reflect game status.
    updateScore();
    updateStreakDisplay();
    if (elements.gameStreakDisplay) {
        elements.gameStreakDisplay.style.display = 'block';
    }
    updateTimer();
    getAudioContext();
    playSoundEffect('start');
    setActionFeedback('Go! Catch clean water and avoid pollution.', 'alert');
    ensureBucketPosition();

    // Spawn cadence is controlled by the selected weather mode.
    updateDropInterval();

    // Update timer every second.
    gameState.timerInterval = setInterval(tick, 1000);

    // Start random weather events that make the world feel alive.
    scheduleNextStorm();
}

function clearStartCountdownTimeouts() {
    if (!Array.isArray(gameState.startCountdownTimeouts)) {
        gameState.startCountdownTimeouts = [];
        return;
    }

    gameState.startCountdownTimeouts.forEach((timeoutId) => {
        clearTimeout(timeoutId);
    });

    gameState.startCountdownTimeouts = [];
}

function cancelRoundStartSequence() {
    gameState.startSequenceToken += 1;
    gameState.isStarting = false;
    clearStartCountdownTimeouts();
    elements.countdownOverlay?.classList.add('hidden');
}

/**
 * Resets the game to initial state
 * - Clears all drops
 * - Stops timers
 * - Resets score and time
 * - Closes game over modal
 */
function resetGame() {
    // Stop the game
    gameState.isRunning = false;
    cancelRoundStartSequence();

    // Clear all intervals
    clearInterval(gameState.dropInterval);
    clearInterval(gameState.timerInterval);

    // Reset state
    gameState.score = 0;
    gameState.streak = 0;
    gameState.bestStreak = 0;
    gameState.cleanCaught = 0;
    gameState.pollutedAvoided = 0;
    gameState.timeRemaining = 60;
    gameState.bucketVelocity = 0;
    gameState.bucketSteer = 0;
    gameState.touchTargetX = null;
    gameState.touchIsActive = false;
    gameState.bucketFrozenUntil = 0;
    gameState.stormCycleIndex = 0;
    gameState.stormPatternTipShown = false;
    gameState.lightningWarningStep = 0;
    gameState.progressCelebrated = false;
    gameState.magnetActiveUntil = 0;
    inputState.leftPressed = false;
    inputState.rightPressed = false;

    stopStormSystem();
    clearRainParticles();
    elements.bucket.classList.remove('bucket-frozen');
    elements.bucket.classList.remove('bucket-shock');
    elements.bucket.classList.remove('bucket-catch-glow');
    elements.bucket.classList.remove('bucket-storm-hit');
    elements.bucket.classList.remove('bucket-catch-bounce');

    clearTimeout(gameState.bucketCatchGlowTimeout);
    clearTimeout(gameState.bucketShakeTimeout);
    clearTimeout(gameState.gameMomentTimeout);
    clearTimeout(gameState.scorePulseTimeout);
    clearTimeout(gameState.timerPulseTimeout);
    clearTimeout(gameState.goalPulseTimeout);
    clearTimeout(gameState.actionFeedbackTimeout);
    clearTimeout(gameState.scoreboardFlashTimeout);
    clearTimeout(gameState.lightningShakeTimeout);
    clearTimeout(gameState.impactCelebrateTimeout);
    clearTimeout(gameState.magnetTimeout);
    clearTimeout(gameState.magnetWarningTimeout);
    gameState.bucketCatchGlowTimeout = null;
    gameState.bucketShakeTimeout = null;
    gameState.gameMomentTimeout = null;
    gameState.scorePulseTimeout = null;
    gameState.timerPulseTimeout = null;
    gameState.goalPulseTimeout = null;
    gameState.actionFeedbackTimeout = null;
    gameState.scoreboardFlashTimeout = null;
    gameState.lightningShakeTimeout = null;
    gameState.impactCelebrateTimeout = null;
    gameState.magnetTimeout = null;
    gameState.magnetWarningTimeout = null;

    elements.gameContainer.classList.remove('bonus-moment');
    elements.gameContainer.classList.remove('storm-moment');
    elements.gameContainer.classList.remove('negative-flash');
    elements.gameContainer.classList.remove('lightning-warning-dim');
    elements.bucket.classList.remove('bucket-bonus-boost');
    elements.bucket.classList.remove('bucket-magnet-active');
    elements.scoreDisplay.classList.remove('score-pop');
    elements.timerDisplay.classList.remove('timer-low-pulse');
    elements.scoreCard?.classList.remove('stat-pop');
    elements.timerCard?.classList.remove('stat-pop');
    elements.goalCard?.classList.remove('stat-pop');
    elements.scoreboard?.classList.remove('score-positive', 'score-negative');
    elements.impactProgressSection?.classList.remove('impact-full-celebrate');
    document.body.classList.remove('lightning-screen-shake');

    // Remove all drops from game area
    const allDrops = document.querySelectorAll('.drop');
    allDrops.forEach(drop => drop.remove());

    // Clear confetti canvas
    const canvas = elements.confettiCanvas;
    canvas.style.display = 'none';
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update all displays
    updateScore();
    updateStreakDisplay();
    updateMagnetCountdownDisplay();
    updateTimer();
    ensureBucketPosition();

    // Re-enable start button
    elements.startBtn.disabled = false;
    elements.pregameOverlay?.classList.remove('hidden');
    setActionFeedback('Press Start to begin your clean water mission.', 'alert');

    // Hide game over modal
    elements.gameOverModal.classList.add('hidden');
    elements.modalContent?.classList.remove('result-success', 'result-failure');
}

/**
 * Called every second to decrease timer and check for game over
 */
function tick() {
    gameState.timeRemaining--;
    updateTimer();

    // Game over when time runs out
    if (gameState.timeRemaining <= 0) {
        endGame();
    }
}

/**
 * Ends the game and shows the result
 */
function endGame() {
    gameState.isRunning = false;

    // Hide game-level streak display
    if (elements.gameStreakDisplay) {
        elements.gameStreakDisplay.style.display = 'none';
    }

    // Stop creating new drops
    clearInterval(gameState.dropInterval);
    clearInterval(gameState.timerInterval);
    stopStormSystem();
    clearTimeout(gameState.magnetTimeout);
    clearTimeout(gameState.magnetWarningTimeout);
    gameState.magnetTimeout = null;
    gameState.magnetWarningTimeout = null;
    gameState.magnetActiveUntil = 0;
    elements.bucket.classList.remove('bucket-magnet-active');
    clearMagnetOffsets();
    updateMagnetCountdownDisplay();

    // Disable start button
    elements.startBtn.disabled = true;

    // Display results
    elements.finalScore.textContent = gameState.score;
    elements.summaryScore.textContent = String(gameState.score);
    elements.summaryClean.textContent = String(gameState.cleanCaught);
    elements.summaryPollutedAvoided.textContent = String(gameState.pollutedAvoided);
    elements.summaryBestStreak.textContent = String(gameState.bestStreak);

    // Calculate impact from total score.
    const familiesHelped = Math.floor(gameState.score / gameState.targetScore);
    const pointsToNextFamily = gameState.targetScore - (gameState.score % gameState.targetScore);
    const isNewHighScore = gameState.score > gameState.highScore;

    if (familiesHelped > 0) {
        const familyLabel = familiesHelped === 1 ? 'family' : 'families';
        elements.impactMessage.textContent = `You helped provide water to ${familiesHelped} ${familyLabel}.`;
    } else {
        elements.impactMessage.textContent = `Keep going. Reach ${gameState.targetScore} points to support your first family.`;
    }

    // Update the modal donation CTA with families count
    if (elements.modalFamiliesCount) {
        elements.modalFamiliesCount.textContent = String(familiesHelped > 0 ? familiesHelped : '0');
    }

    if (isNewHighScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('drop-for-change-high-score', String(gameState.highScore));
    }

    // End-of-round summary is based on total impact after the full timer.
    if (familiesHelped > 0) {
        const familyLabel = familiesHelped === 1 ? 'family' : 'families';
        const highScoreMessage = isNewHighScore
            ? ` New high score: ${gameState.highScore}!`
            : ` High score to beat: ${gameState.highScore}.`;

        elements.resultStatus.textContent = 'Mission Success';
        elements.modalContent?.classList.remove('result-failure');
        elements.modalContent?.classList.add('result-success');
        elements.gameOverTitle.textContent = 'Clean Water Delivered';
        elements.gameOverTitle.style.color = '#FFC907';
        elements.resultMessage.textContent =
            `Strong round. You delivered progress for ${familiesHelped} ${familyLabel}.${highScoreMessage}`;
        setActionFeedback(`Mission success. Final score: ${gameState.score}.`, 'positive');
        playSoundEffect('win');
        playConfetti();
    } else {
        const targetHint = pointsToNextFamily === gameState.targetScore
            ? gameState.targetScore
            : pointsToNextFamily;

        elements.resultStatus.textContent = 'Mission Incomplete';
        elements.modalContent?.classList.remove('result-success');
        elements.modalContent?.classList.add('result-failure');
        elements.gameOverTitle.textContent = 'Mission Incomplete';
        elements.gameOverTitle.style.color = '#FF902A';
        elements.resultMessage.textContent =
            `${targetHint} points to go for mission success. Stay on clean-drop streaks and avoid polluted drops. High score: ${gameState.highScore}.`;
        setActionFeedback(`Round ended. You need ${targetHint} more points for success.`, 'negative');
        playSoundEffect('lose');
    }

    // Show the modal with a small delay to ensure smooth animation
    requestAnimationFrame(() => {
        elements.gameOverModal.classList.remove('hidden');
    });
}

// ==========================================
// DROP CREATION & MANAGEMENT
// ==========================================

/**
 * Creates a new falling drop with random type and position
 * Mix and speed adapt to selected weather mode.
 */
function createDrop() {
    // Don't create drops if game isn't running
    if (!gameState.isRunning) return;

    const activeDropCount = elements.gameContainer.querySelectorAll('.drop').length;
    const maxActiveDrops = gameState.isMobileOptimized ? 16 : 30;

    if (activeDropCount >= maxActiveDrops) {
        return;
    }

    const drop = document.createElement('div');
    drop.className = 'drop';

    // Randomly decide drop type
    const rand = Math.random();
    const preset = getActiveWeatherPreset();
    const cleanChance = Math.max(0, Math.min(1, preset.cleanChance || 0.7));
    const pollutedChance = Math.max(0, Math.min(1 - cleanChance, preset.pollutedChance || 0.2));
    const pollutedThreshold = cleanChance + pollutedChance;
    let dropType;
    let points;
    let size;

    if (Math.random() < MAGNET_SPAWN_CHANCE) {
        dropType = 'powerup-magnet';
        points = 0;
        size = 46 + Math.random() * 10;
    } else if (rand < cleanChance) {
        // Clean water drop (mode-adjusted chance)
        dropType = 'clean';
        points = 10;
        size = 40 + Math.random() * 20; // 40-60px
    } else if (rand < pollutedThreshold) {
        // Polluted drop (mode-adjusted chance)
        dropType = 'polluted';
        points = -20;
        size = 45 + Math.random() * 20; // 45-65px
    } else {
        // Remaining chance: Bonus jerry can
        dropType = 'bonus';
        points = 50;
        size = 66 + Math.random() * 16; // 66-82px
    }

    if (gameState.isMobileOptimized) {
        size *= 0.88;
    }

    // Store points value on the element
    drop.dataset.points = points;
    drop.dataset.type = dropType;

    // Set drop appearance
    drop.classList.add(dropType);
    drop.classList.add('material-symbols-rounded');
    if (dropType === 'powerup-magnet') {
        drop.textContent = 'auto_awesome';
    } else {
        drop.textContent = 'water_drop';
    }
    drop.style.width = size + 'px';
    drop.style.height = size + 'px';
    drop.style.fontSize = Math.round(size * 0.92) + 'px';

    // Random horizontal position
    const containerWidth = elements.gameContainer.offsetWidth;
    const xPosition = Math.random() * (containerWidth - size);
    drop.style.left = xPosition + 'px';

    // Fall speed shifts by weather mode so difficulty is clearly different.
    const fallRange = Math.max(0, preset.dropFallMaxSec - preset.dropFallMinSec);
    const fallSpeed = preset.dropFallMinSec + Math.random() * fallRange;
    drop.style.setProperty('--fall-duration', `${fallSpeed}s`);
    const dropTilt = dropType === 'powerup-magnet'
        ? '0deg'
        : `${(Math.random() * 16 - 8).toFixed(2)}deg`;
    drop.style.setProperty('--drop-tilt', dropTilt);
    drop.style.setProperty('--drop-sway', `${(Math.random() * 8 + 5).toFixed(2)}px`);
    drop.style.setProperty('--magnet-offset-x', '0px');
    drop.style.setProperty('--magnet-offset-y', '0px');
    drop.dataset.magnetOffsetX = '0';
    drop.dataset.magnetOffsetY = '0';

    // Add the drop to the game area
    elements.gameContainer.appendChild(drop);

    // Remove drop after it falls off screen (animation ends)
    drop.addEventListener('animationend', () => {
        if (gameState.isRunning && !drop.classList.contains('collected')) {
            if (!drop.classList.contains('polluted')) {
                resetStreak();
            }

            if (drop.classList.contains('polluted')) {
                gameState.pollutedAvoided += 1;
            }
        }

        drop.remove();
    });
}

function getStreakMultiplier(streakCount) {
    if (streakCount >= 12) {
        return STREAK_MULTIPLIERS.max;
    }

    if (streakCount >= 7) {
        return STREAK_MULTIPLIERS.high;
    }

    if (streakCount >= 3) {
        return STREAK_MULTIPLIERS.medium;
    }

    return 1;
}

function updateStreakDisplay() {
    if (!elements.streakDisplay) {
        return;
    }

    const multiplier = getStreakMultiplier(gameState.streak);
    const streakTierOne = gameState.streak >= 3;
    const streakTierTwo = gameState.streak >= 7;
    const streakTierThree = gameState.streak >= 12;

    if (gameState.isMobileOptimized) {
        if (gameState.streak === 0) {
            elements.streakDisplay.textContent = 'Streak 0';
        } else if (gameState.streak < 3) {
            elements.streakDisplay.textContent = `Streak ${gameState.streak}/3`;
        } else {
            elements.streakDisplay.textContent = `Streak ${gameState.streak} x${multiplier.toFixed(1)}`;
        }
    } else if (gameState.streak === 0) {
        elements.streakDisplay.textContent = 'Streak 0';
    } else if (gameState.streak < 3) {
        elements.streakDisplay.textContent = `Streak ${gameState.streak} - 3 catches for bonus`;
    } else {
        elements.streakDisplay.textContent = `Streak ${gameState.streak} x${multiplier.toFixed(1)} active - do not miss`;
    }

    if (gameState.isMobileOptimized) {
        elements.streakDisplay.classList.remove('streak-active', 'streak-warning');
    } else {
        elements.streakDisplay.classList.toggle('streak-active', gameState.streak >= 3);
        elements.streakDisplay.classList.toggle('streak-warning', gameState.streak >= 3);
    }

    if (elements.scoreCard) {
        elements.scoreCard.classList.toggle('streak-hot', streakTierOne);
        elements.scoreCard.classList.toggle('streak-hot-2', streakTierTwo);
        elements.scoreCard.classList.toggle('streak-hot-3', streakTierThree);
    }

    // Update game-level streak display (floating on top of game)
    if (elements.gameStreakDisplay) {
        const streakTextEl = elements.gameStreakDisplay.querySelector('.streak-text');
        if (streakTextEl) {
            if (gameState.streak === 0) {
                streakTextEl.textContent = '';
            } else {
                const mult = multiplier.toFixed(1);
                streakTextEl.textContent = `Streak ${gameState.streak} x${mult}`;
            }
            // Add pulse animation when streak increases (non-zero streak catching)
            if (gameState.streak > 0) {
                streakTextEl.classList.remove('streak-pulse');
                // Trigger reflow to restart animation
                void streakTextEl.offsetWidth;
                streakTextEl.classList.add('streak-pulse');
            }
        }
    }
}

function resetStreak() {
    if (gameState.streak === 0) {
        return;
    }

    gameState.streak = 0;
    updateStreakDisplay();
}

function activateMagnetPowerUp(durationMs = MAGNET_DURATION_MS) {
    const nextEnd = performance.now() + durationMs;
    gameState.magnetActiveUntil = Math.max(gameState.magnetActiveUntil, nextEnd);
    const remainingMs = Math.max(0, gameState.magnetActiveUntil - performance.now());

    elements.bucket.classList.add('bucket-magnet-active');

    clearTimeout(gameState.magnetTimeout);
    clearTimeout(gameState.magnetWarningTimeout);

    if (remainingMs > MAGNET_WARNING_LEAD_MS) {
        gameState.magnetWarningTimeout = setTimeout(() => {
            if (!gameState.isRunning || performance.now() >= gameState.magnetActiveUntil) {
                return;
            }

            showFeedbackMessage('Magnet fading soon. Pull in drops now.', 'bonus', 1200);
            setActionFeedback('Magnet effect ending soon.', 'alert', 900);
        }, remainingMs - MAGNET_WARNING_LEAD_MS);
    }

    gameState.magnetTimeout = setTimeout(() => {
        if (performance.now() < gameState.magnetActiveUntil) {
            return;
        }

        elements.bucket.classList.remove('bucket-magnet-active');
        clearMagnetOffsets();
    }, remainingMs + 20);
}

function clearMagnetOffsets() {
    const magneticDrops = document.querySelectorAll('.drop:not(.polluted)');

    magneticDrops.forEach((drop) => {
        drop.dataset.magnetOffsetX = '0';
        drop.dataset.magnetOffsetY = '0';
        drop.style.setProperty('--magnet-offset-x', '0px');
        drop.style.setProperty('--magnet-offset-y', '0px');
    });
}

function updateMagnetCountdownDisplay() {
    if (!elements.magnetCountdown) {
        return;
    }

    const remainingMs = gameState.magnetActiveUntil - performance.now();
    const magnetIsActive = gameState.isRunning && remainingMs > 0;

    if (!magnetIsActive) {
        elements.magnetCountdown.textContent = '';
        elements.magnetCountdown.classList.remove('magnet-active', 'magnet-ending');
        return;
    }

    const secondsRemaining = Math.max(0, remainingMs / 1000);
    let countdownText = '';
    
    if (secondsRemaining > 3) {
        countdownText = `Magnet Active`;
    } else if (secondsRemaining > 2) {
        countdownText = 'OFF in 3';
    } else if (secondsRemaining > 1) {
        countdownText = 'OFF in 2';
    } else if (secondsRemaining > 0) {
        countdownText = 'OFF in 1';
    } else {
        countdownText = 'Magnet Ended';
    }
    
    elements.magnetCountdown.textContent = countdownText;
    elements.magnetCountdown.classList.add('magnet-active');
    elements.magnetCountdown.classList.toggle('magnet-ending', secondsRemaining <= 3);
}

// ==========================================
// SCORING & POINTS
// ==========================================

/**
 * Awards points when a drop is clicked
 * - Updates score (never below 0)
 * - Removes the drop with animation
 * - Shows feedback message
 */
function scorePoints(drop, points) {
    if (drop.classList.contains('collected')) {
        return;
    }

    drop.classList.add('collected');

    const isClean = drop.classList.contains('clean');
    const isPolluted = drop.classList.contains('polluted');
    const isBonus = drop.classList.contains('bonus');
    const isMagnetPowerUp = drop.classList.contains('powerup-magnet');

    let awardedPoints = points;

    if (isClean) {
        gameState.cleanCaught += 1;
        gameState.streak += 1;
        gameState.bestStreak = Math.max(gameState.bestStreak, gameState.streak);
        awardedPoints = Math.round(points * getStreakMultiplier(gameState.streak));
    } else if (isPolluted) {
        resetStreak();
    } else if (isMagnetPowerUp) {
        activateMagnetPowerUp();
    }

    // Update score (never go below 0)
    gameState.score += awardedPoints;
    if (gameState.score < 0) {
        gameState.score = 0;
    }
    
    updateScore();
    updateStreakDisplay();

    let dropType = 'clean';

    if (isBonus) {
        dropType = 'bonus';
    } else if (isPolluted) {
        dropType = 'polluted';
    } else if (isMagnetPowerUp) {
        dropType = 'powerup-magnet';
    }

    if (awardedPoints > 0 || isMagnetPowerUp) {
        triggerBucketCatchGlow(dropType);
    }

    if (awardedPoints !== 0) {
        const isPositive = awardedPoints > 0;
        triggerScoreboardFlash(isPositive ? 'positive' : 'negative');
    }

    if (dropType === 'polluted') {
        playSoundEffect('polluted');
        triggerNegativeFlash();
    } else if (dropType === 'bonus') {
        playSoundEffect('bonus');
    } else if (dropType === 'powerup-magnet') {
        playSoundEffect('bonus');
    } else {
        playSoundEffect('clean');
    }

    // Show feedback message based on item type.
    let message = '';
    if (drop.classList.contains('clean')) {
        message = 'Clean catch! Keep bringing safe water closer.';
    } else if (drop.classList.contains('polluted')) {
        message = 'Polluted drop! Adjust and recover.';
    } else if (drop.classList.contains('powerup-magnet')) {
        message = 'Magnet active! Nearby clean drops are pulled in.';
    } else if (drop.classList.contains('bonus')) {
        message = 'Bonus can! Big boost for clean water access.';
    }

    if (isClean && [3, 7, 12].includes(gameState.streak)) {
        const streakMultiplier = getStreakMultiplier(gameState.streak);
        showFeedbackMessage(`Streak boost: x${streakMultiplier.toFixed(1)}`, 'clean', 1200);
    }

    if (dropType === 'bonus') {
        triggerGameMoment('bonus', 420);
        triggerHaptic([20, 35, 45]);
    } else if (dropType === 'powerup-magnet') {
        triggerGameMoment('bonus', 360);
        triggerHaptic([18, 40, 18]);
    } else if (dropType === 'polluted') {
        triggerHaptic([25]);
    } else {
        triggerHaptic([15]);
    }
    
    // Use top toast feedback for catches - skip for clean drops since streak shows that.
    const feedbackType = dropType === 'powerup-magnet' ? 'bonus' : dropType;
    const activeMultiplier = isClean ? getStreakMultiplier(gameState.streak) : 1;
    const visualType = dropType === 'powerup-magnet' ? 'bonus' : dropType;
    
    // Only show toast message for non-clean drops (polluted, bonus, magnet), clean catches are shown via streak
    if (!isClean) {
        showFeedbackMessage(message, feedbackType, 1700);
    }
    
    // Show points feedback (popups) for all drops
    if (!isMagnetPowerUp) {
        showPointsFeedback(drop, awardedPoints, visualType, activeMultiplier);
    }

    triggerCatchBurst(drop, visualType);
    triggerCatchParticles(drop, visualType);

    // Remove the clicked drop
    drop.style.animation = 'none'; // Stop falling animation
    drop.style.opacity = '0'; // Fade out
    drop.style.transform = 'scale(0.5)'; // Shrink
    setTimeout(() => drop.remove(), 150); // Remove from DOM

    // No early game end: players can keep building impact until time runs out.
}

function triggerScoreboardFlash(type) {
    if (!elements.scoreboard) {
        return;
    }

    elements.scoreboard.classList.remove('score-positive', 'score-negative');
    void elements.scoreboard.offsetWidth;
    elements.scoreboard.classList.add(type === 'negative' ? 'score-negative' : 'score-positive');

    clearTimeout(gameState.scoreboardFlashTimeout);
    gameState.scoreboardFlashTimeout = setTimeout(() => {
        elements.scoreboard?.classList.remove('score-positive', 'score-negative');
    }, 380);
}

function triggerBucketCatchGlow(type = 'clean') {
    elements.bucket.classList.remove('bucket-catch-glow');
    elements.bucket.classList.remove('bucket-bonus-boost');
    elements.bucket.classList.remove('bucket-catch-bounce');
    void elements.bucket.offsetWidth;
    elements.bucket.classList.add('bucket-catch-glow');
    elements.bucket.classList.add('bucket-catch-bounce');

    if (type === 'bonus') {
        elements.bucket.classList.add('bucket-bonus-boost');
    } else if (type === 'powerup-magnet') {
        elements.bucket.classList.add('bucket-magnet-active');
    }

    clearTimeout(gameState.bucketCatchGlowTimeout);
    gameState.bucketCatchGlowTimeout = setTimeout(() => {
        elements.bucket.classList.remove('bucket-catch-glow');
        elements.bucket.classList.remove('bucket-bonus-boost');
    }, type === 'bonus' ? 420 : 260);
}

function triggerCatchBurst(drop, type) {
    const containerRect = elements.gameContainer.getBoundingClientRect();
    const dropRect = drop.getBoundingClientRect();

    const burst = document.createElement('span');
    burst.className = `catch-burst catch-burst-${type}`;
    burst.style.left = `${dropRect.left - containerRect.left + (dropRect.width / 2)}px`;
    burst.style.top = `${dropRect.top - containerRect.top + (dropRect.height / 2)}px`;

    elements.gameContainer.appendChild(burst);
    setTimeout(() => burst.remove(), 420);
}

function triggerCatchParticles(drop, type) {
    const containerRect = elements.gameContainer.getBoundingClientRect();
    const dropRect = drop.getBoundingClientRect();
    const originX = dropRect.left - containerRect.left + (dropRect.width / 2);
    const originY = dropRect.top - containerRect.top + (dropRect.height / 2);
    const particleCount = type === 'bonus' ? 12 : (type === 'polluted' ? 7 : 9);

    // Small radial particles reinforce catch impact while staying visually clean.
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('span');
        particle.className = `catch-particle catch-particle-${type}`;

        const angle = (Math.PI * 2 * i) / particleCount + (Math.random() * 0.35);
        const distance = type === 'bonus'
            ? 34 + Math.random() * 18
            : (type === 'polluted' ? 24 + Math.random() * 12 : 28 + Math.random() * 14);

        particle.style.left = `${originX}px`;
        particle.style.top = `${originY}px`;
        particle.style.setProperty('--particle-x', `${Math.cos(angle) * distance}px`);
        particle.style.setProperty('--particle-y', `${Math.sin(angle) * distance}px`);

        elements.gameContainer.appendChild(particle);
        setTimeout(() => particle.remove(), 520);
    }
}

function triggerNegativeFlash() {
    elements.gameContainer.classList.remove('negative-flash');
    void elements.gameContainer.offsetWidth;
    elements.gameContainer.classList.add('negative-flash');
}

function triggerGameMoment(type, durationMs = 360) {
    const className = type === 'storm' ? 'storm-moment' : 'bonus-moment';

    clearTimeout(gameState.gameMomentTimeout);
    elements.gameContainer.classList.remove('bonus-moment', 'storm-moment');
    void elements.gameContainer.offsetWidth;
    elements.gameContainer.classList.add(className);

    gameState.gameMomentTimeout = setTimeout(() => {
        elements.gameContainer.classList.remove(className);
    }, durationMs);
}

function triggerHaptic(pattern) {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
    }
}

/**
 * Shows floating text feedback when points are scored
 */
function showPointsFeedback(drop, points, type = 'clean', multiplier = 1) {
    const containerRect = elements.gameContainer.getBoundingClientRect();
    const dropRect = drop.getBoundingClientRect();

    // Add random horizontal spread to prevent popups from stacking
    const horizontalOffset = (Math.random() - 0.5) * 60; // ±30px spread

    const feedback = document.createElement('div');
    feedback.style.position = 'absolute';
    feedback.style.left = `${dropRect.left - containerRect.left + (dropRect.width / 2) + horizontalOffset}px`;
    feedback.style.top = `${dropRect.top - containerRect.top}px`;
    feedback.style.fontSize = type === 'bonus' ? '28px' : '24px';
    feedback.style.fontWeight = 'bold';
    feedback.style.pointerEvents = 'none';
    feedback.style.animation = type === 'bonus'
        ? 'popUpBonus 1s ease-out forwards'
        : (type === 'polluted' ? 'popUpNegative 1s ease-out forwards' : 'popUp 1s ease-out forwards');
    feedback.textContent = (points > 0 ? '+' : '') + points;

    if (type === 'clean' && multiplier > 1) {
        feedback.textContent += ` x${multiplier.toFixed(1)}`;
    }
    feedback.style.color = type === 'bonus' ? '#FFC907' : (type === 'polluted' ? '#9A907E' : '#2E9DF7');
    feedback.style.textShadow = type === 'bonus'
        ? '0 0 14px rgba(255, 201, 7, 0.85), 2px 2px 4px rgba(0,0,0,0.3)'
        : (type === 'polluted'
            ? '0 0 8px rgba(127, 117, 100, 0.45), 2px 2px 4px rgba(0,0,0,0.25)'
            : '2px 2px 4px rgba(0,0,0,0.3)');

    elements.gameContainer.appendChild(feedback);

    // Define pop-up animation
    if (!document.getElementById('popup-style')) {
        const style = document.createElement('style');
        style.id = 'popup-style';
        style.textContent = `
            @keyframes popUp {
                from {
                    transform: translateY(0) scale(1);
                    opacity: 1;
                }
                to {
                    transform: translateY(-80px) scale(0.5);
                    opacity: 0;
                }
            }
            @keyframes popUpBonus {
                0% {
                    transform: translateY(0) scale(0.9);
                    opacity: 0.1;
                }
                20% {
                    transform: translateY(-10px) scale(1.3);
                    opacity: 1;
                }
                100% {
                    transform: translateY(-92px) scale(0.55);
                    opacity: 0;
                }
            }
            @keyframes popUpNegative {
                0% {
                    transform: translateY(0) scale(1);
                    opacity: 1;
                }
                40% {
                    transform: translateY(-24px) scale(1.02);
                    opacity: 1;
                }
                100% {
                    transform: translateY(-72px) scale(0.6);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    setTimeout(() => feedback.remove(), 1000);
}

// ==========================================
// BUCKET CONTROLS + COLLISION LOOP
// ==========================================

function initializeBucketControls() {
    window.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
            inputState.leftPressed = true;
            event.preventDefault();
        }

        if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
            inputState.rightPressed = true;
            event.preventDefault();
        }
    });

    window.addEventListener('keyup', (event) => {
        if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
            inputState.leftPressed = false;
        }

        if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
            inputState.rightPressed = false;
        }
    });

    const moveToTouchX = (clientX) => {
        if (performance.now() < gameState.bucketFrozenUntil) {
            return;
        }

        const containerRect = elements.gameContainer.getBoundingClientRect();
        const bucketWidth = elements.bucket.offsetWidth;
        gameState.touchTargetX = clientX - containerRect.left - (bucketWidth / 2);

        // Move immediately on drag updates so thumb control feels direct.
        setBucketX(gameState.touchTargetX);
        gameState.bucketVelocity = 0;
    };

    elements.gameContainer.addEventListener('touchstart', (event) => {
        const touch = event.touches[0];
        if (!touch) return;
        gameState.touchIsActive = true;
        moveToTouchX(touch.clientX);
        event.preventDefault();
    }, { passive: false });

    elements.gameContainer.addEventListener('touchmove', (event) => {
        const touch = event.touches[0];
        if (!touch) return;
        moveToTouchX(touch.clientX);
        event.preventDefault();
    }, { passive: false });

    elements.gameContainer.addEventListener('touchend', () => {
        gameState.touchTargetX = null;
        gameState.touchIsActive = false;
        gameState.bucketVelocity = 0;
    });

    elements.gameContainer.addEventListener('touchcancel', () => {
        gameState.touchTargetX = null;
        gameState.touchIsActive = false;
        gameState.bucketVelocity = 0;
    });

    elements.gameContainer.addEventListener('mousemove', (event) => {
        if (!gameState.isRunning || gameState.touchIsActive) {
            return;
        }

        if (performance.now() < gameState.bucketFrozenUntil) {
            return;
        }

        const containerRect = elements.gameContainer.getBoundingClientRect();
        const bucketWidth = elements.bucket.offsetWidth;
        const pointerTargetX = event.clientX - containerRect.left - (bucketWidth / 2);
        setBucketX(pointerTargetX);
        gameState.bucketVelocity = 0;
        gameState.bucketSteer = 0;
    });
}

function ensureBucketPosition() {
    if (gameState.hasBucketPosition) {
        return;
    }

    const containerWidth = elements.gameContainer.clientWidth;
    const bucketWidth = elements.bucket.offsetWidth;
    gameState.bucketX = (containerWidth - bucketWidth) / 2;
    gameState.hasBucketPosition = true;
    renderBucketPosition();
}

function updateBucketTuning() {
    const containerWidth = elements.gameContainer.clientWidth || window.innerWidth || 390;
    const mobileBaselineWidth = 390;
    const rawScale = containerWidth / mobileBaselineWidth;

    // Keep mobile feel intact while scaling desktop speed without becoming overly twitchy.
    const speedScale = Math.min(2.6, Math.max(1, Math.pow(rawScale, 0.9)));
    gameState.speedScale = speedScale;
    gameState.bucketAcceleration = gameState.baseBucketAcceleration * speedScale;
    gameState.bucketMaxSpeed = gameState.baseBucketMaxSpeed * speedScale;
    gameState.steerLerp = Math.min(0.42, 0.28 + ((speedScale - 1) * 0.08));
}

function isDesktopControlProfile() {
    return window.matchMedia('(min-width: 768px) and (pointer: fine)').matches;
}

function setBucketX(nextX) {
    const containerWidth = elements.gameContainer.clientWidth;
    const bucketWidth = elements.bucket.offsetWidth;
    const maxX = Math.max(0, containerWidth - bucketWidth);
    const clampedX = Math.min(maxX, Math.max(0, nextX));
    gameState.bucketX = clampedX;

    // Cancel outward velocity when the bucket hits either boundary.
    if ((clampedX <= 0 && gameState.bucketVelocity < 0) || (clampedX >= maxX && gameState.bucketVelocity > 0)) {
        gameState.bucketVelocity = 0;
    }

    gameState.hasBucketPosition = true;
    renderBucketPosition();
}

function renderBucketPosition() {
    elements.bucket.style.left = `${gameState.bucketX}px`;

    const speedRatio = Math.min(1, Math.abs(gameState.bucketVelocity) / gameState.bucketMaxSpeed);
    const squashX = (1 + speedRatio * 0.06).toFixed(3);
    const squashY = (1 - speedRatio * 0.06).toFixed(3);
    const idleBob = Math.sin(performance.now() * 0.004) * 1.2;
    const movementBob = Math.sin(performance.now() * 0.02) * speedRatio * 1.8;
    const bounceY = (idleBob + movementBob).toFixed(2);

    // Tiny squash + bounce keeps the bucket feeling responsive during motion.
    elements.bucket.style.transform = `translateY(${bounceY}px) scaleX(${squashX}) scaleY(${squashY})`;
}

function updateBucketMovement() {
    ensureBucketPosition();

    if (performance.now() < gameState.bucketFrozenUntil) {
        // Lightning effect: briefly freeze movement for a short, readable penalty.
        gameState.bucketVelocity = 0;
        return;
    }

    if (gameState.touchIsActive && gameState.touchTargetX !== null) {
        const distanceToTarget = gameState.touchTargetX - gameState.bucketX;

        // Apply light easing between touch events for smooth visual tracking.
        if (Math.abs(distanceToTarget) > 0.5) {
            setBucketX(gameState.bucketX + distanceToTarget * 0.45);
        } else {
            setBucketX(gameState.touchTargetX);
        }

        gameState.bucketVelocity = 0;
        return;
    }

    let direction = 0;
    if (inputState.leftPressed) direction -= 1;
    if (inputState.rightPressed) direction += 1;

    const maxSpeed = gameState.bucketMaxSpeed;

    if (isDesktopControlProfile()) {
        // Desktop profile: reduce inertia so keyboard movement feels immediate.
        const targetVelocity = direction * maxSpeed;
        const followStrength = direction === 0 ? 0.56 : 0.64;
        gameState.bucketVelocity += (targetVelocity - gameState.bucketVelocity) * followStrength;

        if (direction === 0) {
            gameState.bucketSteer = 0;
        } else {
            gameState.bucketSteer = direction;
        }
    } else {
        // Smooth direction changes so movement feels less twitchy.
        gameState.bucketSteer += (direction - gameState.bucketSteer) * gameState.steerLerp;

        if (Math.abs(gameState.bucketSteer) > 0.01) {
            gameState.bucketVelocity += gameState.bucketSteer * gameState.bucketAcceleration;
        }

        if (direction === 0 && gameState.touchTargetX === null) {
            gameState.bucketVelocity *= gameState.bucketFriction;
            gameState.bucketSteer *= 0.84;
        }
    }

    gameState.bucketVelocity = Math.max(-maxSpeed, Math.min(maxSpeed, gameState.bucketVelocity));

    if (Math.abs(gameState.bucketVelocity) < 0.05) {
        gameState.bucketVelocity = 0;
    }

    if (gameState.bucketVelocity !== 0) {
        setBucketX(gameState.bucketX + gameState.bucketVelocity);
    }
}

// ==========================================
// ENVIRONMENT + STORM SYSTEM
// ==========================================

function scheduleNextStorm() {
    clearTimeout(gameState.stormTimeout);

    if (!gameState.isRunning) {
        return;
    }

    // Storms follow a repeating pattern that speeds up as the round progresses.
    const nextDelayMs = getNextStormDelayMs();
    gameState.stormTimeout = setTimeout(() => {
        triggerStorm();
    }, nextDelayMs);
}

function getNextStormDelayMs() {
    const preset = getActiveWeatherPreset();
    const pattern = Array.isArray(preset.stormPatternMs) && preset.stormPatternMs.length > 0
        ? preset.stormPatternMs
        : [preset.stormDelayMin, preset.stormDelayMax];

    const cycleIndex = gameState.stormCycleIndex % pattern.length;
    const baseDelay = pattern[cycleIndex];
    gameState.stormCycleIndex += 1;

    const totalRoundTime = 60;
    const elapsedRatio = Math.max(0, Math.min(1, (totalRoundTime - gameState.timeRemaining) / totalRoundTime));
    const speedupMax = Number.isFinite(preset.stormSpeedupMax) ? preset.stormSpeedupMax : 0.32;
    const speedMultiplier = 1 - (elapsedRatio * speedupMax);
    const scaledDelay = Math.round(baseDelay * speedMultiplier);

    const floorDelay = Number.isFinite(preset.stormDelayFloorMs)
        ? preset.stormDelayFloorMs
        : Math.max(3000, Math.round(preset.stormDelayMin * 0.6));

    return Math.max(floorDelay, scaledDelay);
}

function triggerStorm() {
    if (!gameState.isRunning || gameState.stormActive) {
        return;
    }

    gameState.stormActive = true;
    elements.gameContainer.classList.add('storm-active');

    const preset = getActiveWeatherPreset();

    startRainParticles();
    triggerLightningStrike();

    clearTimeout(gameState.stormEndTimeout);
    gameState.stormEndTimeout = setTimeout(() => {
        endStorm();
    }, preset.stormDurationMs);
}

function triggerLightningStrike() {
    // Lightning uses a fixed warning cadence so players can learn the timing.
    const preset = getActiveWeatherPreset();
    const warningBeats = Math.max(3, Number(preset.lightningWarningBeats) || 3);
    const warningStepMs = Math.max(140, Math.floor(preset.lightningWarningMs / warningBeats));

    if (!gameState.stormPatternTipShown) {
        showFeedbackMessage('Storm pattern: 3 warning pulses, then lightning.', 'storm', 1600);
        gameState.stormPatternTipShown = true;
    }

    clearTimeout(gameState.lightningWarningTimeout);
    elements.gameContainer.classList.remove('lightning-active');
    elements.gameContainer.classList.remove('lightning-warning');
    elements.gameContainer.classList.remove('lightning-warning-dim');
    elements.gameContainer.classList.remove('lightning-warning-pattern');

    void elements.gameContainer.offsetWidth;
    elements.gameContainer.classList.add('lightning-warning');
    elements.gameContainer.classList.add('lightning-warning-dim');
    elements.gameContainer.classList.add('lightning-warning-pattern');
    gameState.lightningWarningStep = warningBeats;
    elements.gameContainer.dataset.lightningLabel = `Lightning in ${gameState.lightningWarningStep}`;

    const runWarningStep = () => {
        if (!gameState.isRunning || !gameState.stormActive) {
            elements.gameContainer.classList.remove('lightning-warning');
            elements.gameContainer.classList.remove('lightning-warning-dim');
            elements.gameContainer.classList.remove('lightning-warning-pattern');
            delete elements.gameContainer.dataset.lightningLabel;
            return;
        }

        gameState.lightningWarningStep -= 1;

        if (gameState.lightningWarningStep > 0) {
            elements.gameContainer.dataset.lightningLabel = `Lightning in ${gameState.lightningWarningStep}`;
            gameState.lightningWarningTimeout = setTimeout(runWarningStep, warningStepMs);
            return;
        }

        elements.gameContainer.dataset.lightningLabel = 'Lightning now';

        elements.gameContainer.classList.remove('lightning-warning');
        elements.gameContainer.classList.remove('lightning-warning-dim');
        elements.gameContainer.classList.remove('lightning-warning-pattern');
        void elements.gameContainer.offsetWidth;
        elements.gameContainer.classList.add('lightning-active');
        triggerScreenShake();
        playSoundEffect('storm');
        triggerGameMoment('storm', 320);
        showFeedbackMessage('Storm strike! Movement briefly frozen.', 'storm', 1200);
        setActionFeedback('Storm strike. Bucket movement frozen briefly.', 'alert', 1200);
        triggerHaptic([30, 50, 30]);

        // Storm gameplay effect: lightning freezes bucket movement briefly.
        freezeBucketFor(preset.freezeMs);
    };

    gameState.lightningWarningTimeout = setTimeout(runWarningStep, warningStepMs);

    clearTimeout(gameState.lightningTimeout);
    gameState.lightningTimeout = setTimeout(() => {
        elements.gameContainer.classList.remove('lightning-active');
        delete elements.gameContainer.dataset.lightningLabel;
    }, (warningStepMs * warningBeats) + preset.lightningFlashMs);
}

function triggerScreenShake() {
    document.body.classList.remove('lightning-screen-shake');
    void document.body.offsetWidth;
    document.body.classList.add('lightning-screen-shake');

    clearTimeout(gameState.lightningShakeTimeout);
    gameState.lightningShakeTimeout = setTimeout(() => {
        document.body.classList.remove('lightning-screen-shake');
    }, 320);
}

function freezeBucketFor(durationMs) {
    const freezeUntil = performance.now() + durationMs;
    gameState.bucketFrozenUntil = Math.max(gameState.bucketFrozenUntil, freezeUntil);
    gameState.bucketVelocity = 0;
    gameState.bucketSteer = 0;
    elements.bucket.classList.add('bucket-frozen');
    elements.bucket.classList.add('bucket-shock');
    triggerBucketStormShake();

    clearTimeout(gameState.bucketFreezeTimeout);
    gameState.bucketFreezeTimeout = setTimeout(() => {
        elements.bucket.classList.remove('bucket-frozen');
        elements.bucket.classList.remove('bucket-shock');
    }, durationMs);
}

function triggerBucketStormShake() {
    elements.bucket.classList.remove('bucket-storm-hit');
    void elements.bucket.offsetWidth;
    elements.bucket.classList.add('bucket-storm-hit');

    clearTimeout(gameState.bucketShakeTimeout);
    gameState.bucketShakeTimeout = setTimeout(() => {
        elements.bucket.classList.remove('bucket-storm-hit');
    }, 420);
}

function startRainParticles() {
    clearInterval(gameState.stormRainInterval);
    const preset = getActiveWeatherPreset();
    const rainBurstCount = gameState.isMobileOptimized
        ? Math.max(3, Math.floor(preset.rainBurstCount * 0.45))
        : preset.rainBurstCount;
    const rainSpawnIntervalMs = gameState.isMobileOptimized
        ? Math.round(preset.rainSpawnIntervalMs * 1.55)
        : preset.rainSpawnIntervalMs;
    const maxRainDrops = gameState.isMobileOptimized ? 42 : 120;

    const spawnBatch = () => {
        if (!gameState.stormActive || !elements.rainLayer) {
            return;
        }

        if (elements.rainLayer.childElementCount >= maxRainDrops) {
            return;
        }

        for (let i = 0; i < rainBurstCount; i++) {
            const rainDrop = document.createElement('span');
            rainDrop.className = 'rain-drop';
            rainDrop.style.left = `${Math.random() * 100}%`;

            const durationRange = Math.max(0, preset.rainDurationMax - preset.rainDurationMin);
            const durationScale = gameState.isMobileOptimized ? 1.2 : 1;
            const duration = (preset.rainDurationMin + Math.random() * durationRange) * durationScale;
            rainDrop.style.animationDuration = `${duration}s`;
            const opacityRange = Math.max(0, preset.rainOpacityMax - preset.rainOpacityMin);
            rainDrop.style.opacity = `${preset.rainOpacityMin + Math.random() * opacityRange}`;

            elements.rainLayer.appendChild(rainDrop);

            setTimeout(() => {
                rainDrop.remove();
            }, Math.ceil(duration * 1000));
        }
    };

    spawnBatch();
    gameState.stormRainInterval = setInterval(spawnBatch, rainSpawnIntervalMs);
}

function clearRainParticles() {
    if (elements.rainLayer) {
        elements.rainLayer.innerHTML = '';
    }
}

function endStorm() {
    gameState.stormActive = false;
    elements.gameContainer.classList.remove('storm-active');
    elements.gameContainer.classList.remove('lightning-warning');
    elements.gameContainer.classList.remove('lightning-active');
    elements.gameContainer.classList.remove('lightning-warning-dim');
    elements.gameContainer.classList.remove('lightning-warning-pattern');
    elements.gameContainer.classList.remove('bonus-moment');
    elements.gameContainer.classList.remove('storm-moment');
    delete elements.gameContainer.dataset.lightningLabel;

    clearInterval(gameState.stormRainInterval);
    gameState.stormRainInterval = null;
    clearRainParticles();

    scheduleNextStorm();
}

function stopStormSystem() {
    clearTimeout(gameState.stormTimeout);
    clearTimeout(gameState.stormEndTimeout);
    clearTimeout(gameState.lightningWarningTimeout);
    clearTimeout(gameState.lightningTimeout);
    clearTimeout(gameState.bucketFreezeTimeout);
    clearTimeout(gameState.bucketShakeTimeout);
    clearTimeout(gameState.gameMomentTimeout);
    clearTimeout(gameState.lightningShakeTimeout);
    clearInterval(gameState.stormRainInterval);

    gameState.stormActive = false;
    gameState.stormTimeout = null;
    gameState.stormEndTimeout = null;
    gameState.lightningWarningTimeout = null;
    gameState.lightningTimeout = null;
    gameState.bucketFreezeTimeout = null;
    gameState.bucketShakeTimeout = null;
    gameState.stormRainInterval = null;
    gameState.gameMomentTimeout = null;
    gameState.lightningShakeTimeout = null;

    elements.gameContainer.classList.remove('storm-active');
    elements.gameContainer.classList.remove('lightning-warning');
    elements.gameContainer.classList.remove('lightning-active');
    elements.gameContainer.classList.remove('lightning-warning-dim');
    elements.gameContainer.classList.remove('lightning-warning-pattern');
    elements.gameContainer.classList.remove('bonus-moment');
    elements.gameContainer.classList.remove('storm-moment');
    delete elements.gameContainer.dataset.lightningLabel;
    document.body.classList.remove('lightning-screen-shake');
}

function isDropCollected(dropRect, bucketRect) {
    const overlapX = dropRect.right > bucketRect.left && dropRect.left < bucketRect.right;
    const dropBottomInCatchZone = dropRect.bottom >= bucketRect.top && dropRect.top < bucketRect.bottom;
    return overlapX && dropBottomInCatchZone;
}

function checkDropCollisions() {
    const bucketRect = elements.bucket.getBoundingClientRect();
    const drops = document.querySelectorAll('.drop');

    drops.forEach((drop) => {
        if (drop.classList.contains('collected')) {
            return;
        }

        const dropRect = drop.getBoundingClientRect();

        if (isDropCollected(dropRect, bucketRect)) {
            scorePoints(drop, Number(drop.dataset.points));
        }
    });
}

function applyMagnetPull() {
    if (!gameState.isRunning || performance.now() >= gameState.magnetActiveUntil) {
        return;
    }

    const bucketRect = elements.bucket.getBoundingClientRect();
    const bucketCenterX = bucketRect.left + (bucketRect.width / 2);
    const bucketCenterY = bucketRect.top + (bucketRect.height / 2);
    const magneticDrops = document.querySelectorAll('.drop:not(.polluted):not(.collected)');

    magneticDrops.forEach((drop) => {
        const dropRect = drop.getBoundingClientRect();
        const dropCenterX = dropRect.left + (dropRect.width / 2);
        const dropCenterY = dropRect.top + (dropRect.height / 2);
        const deltaX = bucketCenterX - dropCenterX;
        const deltaY = bucketCenterY - dropCenterY;
        const distance = Math.hypot(deltaX, deltaY);
        const isBonusDrop = drop.classList.contains('bonus');
        const pullRadius = isBonusDrop ? MAGNET_PULL_RADIUS_PX + 90 : MAGNET_PULL_RADIUS_PX;

        let offsetX = Number(drop.dataset.magnetOffsetX || 0);
        let offsetY = Number(drop.dataset.magnetOffsetY || 0);

        if (distance <= pullRadius && distance > 0.01) {
            const normalizedDistance = 1 - (distance / pullRadius);
            const basePullStrength = (normalizedDistance * 6.8) + 1.6;
            const pullStrength = isBonusDrop ? basePullStrength * 2.4 : basePullStrength;
            const directionX = deltaX / distance;
            const directionY = deltaY / distance;

            offsetX += directionX * pullStrength;
            offsetY += directionY * pullStrength;
        } else {
            // Smoothly decay offsets when magnet is off, but decay faster to prevent dragging
            offsetX *= 0.8;
            offsetY *= 0.8;
        }

        const maxOffsetX = isBonusDrop ? 500 : 420;
        const maxOffsetYUp = isBonusDrop ? 380 : 340;
        const maxOffsetYDown = isBonusDrop ? 700 : 580;
        const clampedOffsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, offsetX));
        const clampedOffsetY = Math.max(-maxOffsetYUp, Math.min(maxOffsetYDown, offsetY));
        drop.dataset.magnetOffsetX = String(clampedOffsetX);
        drop.dataset.magnetOffsetY = String(clampedOffsetY);
        drop.style.setProperty('--magnet-offset-x', `${clampedOffsetX.toFixed(2)}px`);
        drop.style.setProperty('--magnet-offset-y', `${clampedOffsetY.toFixed(2)}px`);
    });
}

function gameLoop(timestamp = performance.now()) {
    if (gameState.isRunning) {
        updateMagnetCountdownDisplay();
        updateBucketMovement();

        if ((timestamp - gameState.lastMagnetPullCheckAt) >= gameState.magnetFrameIntervalMs) {
            applyMagnetPull();
            gameState.lastMagnetPullCheckAt = timestamp;
        }

        if ((timestamp - gameState.lastCollisionCheckAt) >= gameState.collisionFrameIntervalMs) {
            checkDropCollisions();
            gameState.lastCollisionCheckAt = timestamp;
        }
    } else {
        updateMagnetCountdownDisplay();
    }

    requestAnimationFrame(gameLoop);
}

/**
 * Shows feedback message at the top of the screen
 * These are the action messages like "You collected clean water!"
 */
function showFeedbackMessage(message, type = 'clean', durationMs = 2000) {
    // Create message element
    const messageBox = document.createElement('div');
    messageBox.textContent = message;
    messageBox.className = `feedback-message feedback-${type}`;
    messageBox.style.position = 'fixed';
    messageBox.style.top = '10px';
    messageBox.style.left = '50%';
    messageBox.style.transform = 'translateX(-50%)';
    messageBox.style.padding = '12px 24px';
    messageBox.style.borderRadius = '10px';
    messageBox.style.fontSize = '16px';
    messageBox.style.fontWeight = 'bold';
    messageBox.style.zIndex = '999';
    messageBox.style.animation = `slideDown 0.25s ease-out, slideUp 0.25s ease-in ${Math.max(300, durationMs - 300)}ms forwards`;
    messageBox.style.pointerEvents = 'none';
    messageBox.style.maxWidth = '90vw';

    document.body.appendChild(messageBox);

    // Define slide animations for message
    if (!document.getElementById('message-style')) {
        const style = document.createElement('style');
        style.id = 'message-style';
        style.textContent = `
            .feedback-message {
                border: 1px solid rgba(255, 255, 255, 0.45);
                box-shadow: 0 8px 22px rgba(0, 0, 0, 0.22);
                backdrop-filter: blur(2px);
                -webkit-backdrop-filter: blur(2px);
            }
            .feedback-clean {
                background: rgba(52, 181, 255, 0.93);
                color: #07243a;
            }
            .feedback-polluted {
                background: rgba(255, 151, 76, 0.95);
                color: #2d1303;
            }
            .feedback-bonus {
                background: rgba(255, 214, 61, 0.95);
                color: #3b2a00;
            }
            .feedback-storm {
                background: rgba(34, 54, 77, 0.94);
                color: #dff1ff;
                border-color: rgba(159, 209, 240, 0.55);
            }
            @keyframes slideDown {
                from {
                    transform: translateX(-50%) translateY(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
            }
            @keyframes slideUp {
                from {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(-50%) translateY(-100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Remove message after configured duration
    setTimeout(() => messageBox.remove(), durationMs);
}

function setActionFeedback(message, tone = 'alert', durationMs = 0) {
    if (!elements.actionFeedback) {
        return;
    }

    elements.actionFeedback.textContent = message;
    elements.actionFeedback.classList.remove('feedback-positive', 'feedback-negative', 'feedback-alert');

    if (tone === 'positive') {
        elements.actionFeedback.classList.add('feedback-positive');
    } else if (tone === 'negative') {
        elements.actionFeedback.classList.add('feedback-negative');
    } else {
        elements.actionFeedback.classList.add('feedback-alert');
    }

    clearTimeout(gameState.actionFeedbackTimeout);
    if (durationMs > 0) {
        gameState.actionFeedbackTimeout = setTimeout(() => {
            elements.actionFeedback?.classList.remove('feedback-positive', 'feedback-negative');
            elements.actionFeedback?.classList.add('feedback-alert');
        }, durationMs);
    }
}

// ==========================================
// UI UPDATE FUNCTIONS
// ==========================================

/**
 * Updates the score display
 */
function updateScore() {
    const previousScore = Number(elements.scoreDisplay.dataset.lastScore || 0);
    elements.scoreDisplay.textContent = gameState.score;
    elements.scoreDisplay.dataset.lastScore = String(gameState.score);
    updateImpactProgress(previousScore, gameState.score);

    if (gameState.score !== previousScore) {
        elements.scoreDisplay.classList.remove('score-pop');
        void elements.scoreDisplay.offsetWidth;
        elements.scoreDisplay.classList.add('score-pop');

        elements.scoreCard?.classList.remove('stat-pop');
        void elements.scoreCard?.offsetWidth;
        elements.scoreCard?.classList.add('stat-pop');

        clearTimeout(gameState.scorePulseTimeout);
        gameState.scorePulseTimeout = setTimeout(() => {
            elements.scoreDisplay.classList.remove('score-pop');
            elements.scoreCard?.classList.remove('stat-pop');
        }, 320);

        if (gameState.score > previousScore && gameState.score > 0 && gameState.score % 50 === 0) {
            elements.goalCard?.classList.remove('stat-pop');
            void elements.goalCard?.offsetWidth;
            elements.goalCard?.classList.add('stat-pop');

            clearTimeout(gameState.goalPulseTimeout);
            gameState.goalPulseTimeout = setTimeout(() => {
                elements.goalCard?.classList.remove('stat-pop');
            }, 430);
        }
    }
}

function updateImpactProgress(previousScore, currentScore) {
    if (!elements.impactProgressFill || !elements.impactProgressValue || !elements.impactProgressTrack) {
        return;
    }

    const clampedRatio = Math.max(0, Math.min(1, currentScore / gameState.targetScore));
    const progressPercent = Math.round(clampedRatio * 100);

    elements.impactProgressFill.style.width = `${progressPercent}%`;
    elements.impactProgressValue.textContent = String(progressPercent);
    elements.impactProgressTrack.setAttribute('aria-valuenow', String(progressPercent));

    const wasFull = previousScore >= gameState.targetScore;
    const isNowFull = currentScore >= gameState.targetScore;

    if (isNowFull && !wasFull && !gameState.progressCelebrated) {
        elements.impactProgressSection?.classList.remove('impact-full-celebrate');
        void elements.impactProgressSection?.offsetWidth;
        elements.impactProgressSection?.classList.add('impact-full-celebrate');

        gameState.progressCelebrated = true;
        clearTimeout(gameState.impactCelebrateTimeout);
        gameState.impactCelebrateTimeout = setTimeout(() => {
            elements.impactProgressSection?.classList.remove('impact-full-celebrate');
        }, 620);
    }

    if (!isNowFull) {
        gameState.progressCelebrated = false;
    }
}

/**
 * Updates the timer display
 */
function updateTimer() {
    elements.timerDisplay.textContent = gameState.timeRemaining;

    // Change color if time is running out (red warning)
    if (gameState.timeRemaining <= 10) {
        elements.timerDisplay.style.color = '#FF4444';
        elements.timerDisplay.classList.add('timer-low-pulse');
        elements.timerCard?.classList.add('stat-pop');

        clearTimeout(gameState.timerPulseTimeout);
        gameState.timerPulseTimeout = setTimeout(() => {
            elements.timerCard?.classList.remove('stat-pop');
        }, 320);
    } else {
        elements.timerDisplay.style.color = '#2E9DF7';
        elements.timerDisplay.classList.remove('timer-low-pulse');
        elements.timerCard?.classList.remove('stat-pop');
    }
}

// ==========================================
// CONFETTI CELEBRATION ANIMATION
// ==========================================

/**
 * Plays confetti animation when player wins
 */
function playConfetti() {
    const canvas = elements.confettiCanvas;
    const ctx = canvas.getContext('2d');

    // Set canvas to full screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create confetti particles
    const particles = [];
    const colors = ['#FFC907', '#2E9DF7', '#FF902A', '#4FCB53', '#8BD1CB'];

    // Generate 100 confetti pieces
    for (let i = 0; i < 100; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            velocityX: (Math.random() - 0.5) * 8,
            velocityY: Math.random() * 5 + 5,
            size: Math.random() * 8 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.1,
        });
    }

    // Animation loop
    function animate() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let hasParticles = false;

        // Update and draw each particle
        particles.forEach((p, index) => {
            p.y += p.velocityY;
            p.x += p.velocityX;
            p.velocityY += 0.2; // Gravity
            p.rotation += p.rotationSpeed;

            // Only draw if still in view
            if (p.y > canvas.height) {
                particles.splice(index, 1);
            } else {
                hasParticles = true;
                drawConfetti(ctx, p);
            }
        });

        // Continue animation if there are particles left
        if (hasParticles) {
            requestAnimationFrame(animate);
        } else {
            canvas.style.display = 'none'; // Hide when done
        }
    }

    canvas.style.display = 'block';
    animate();
}

/**
 * Draws a single confetti piece
 */
function drawConfetti(ctx, particle) {
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);
    ctx.fillStyle = particle.color;
    ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
    ctx.restore();
}

// ==========================================
// RESPONSIVE CANVAS HANDLING
// ==========================================

// Update confetti canvas size on window resize
window.addEventListener('resize', () => {
    applyDevicePerformanceProfile();
    updateBucketTuning();

    if (elements.confettiCanvas.style.display !== 'none') {
        elements.confettiCanvas.width = window.innerWidth;
        elements.confettiCanvas.height = window.innerHeight;
    }

    gameState.hasBucketPosition = false;
    ensureBucketPosition();
});

updateBucketTuning();
setActionFeedback('Press Start to begin your clean water mission.', 'alert');
