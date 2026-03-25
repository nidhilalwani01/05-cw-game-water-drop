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
    timerBurstTimeout: null,    // Timeout for Time Burst timer highlight cleanup
    goalPulseTimeout: null,     // Timeout for goal pulse class cleanup
    milestoneFeedbackTimeout: null, // Timeout for transient milestone feedback cleanup
    cascadeInterval: null,      // Interval handle for active cascade bonus rain
    cascadeTimeout: null,       // Timeout handle to end cascade bonus rain
    cascadeActive: false,       // Whether a cascade bonus-rain event is active
    cascadeCooldownUntil: 0,    // Timestamp until another cascade can trigger
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
    nextMilestoneScore: 100,    // Next score threshold for dynamic milestone feedback
    milestonesReached: 0,       // Count of reached milestones this round
    magnetActiveUntil: 0,       // Timestamp until the bucket magnet pull is active
    magnetTimeout: null,        // Timeout handle for magnet visual cleanup
    magnetWarningTimeout: null, // Timeout handle for warning before magnet expires
    isMobileOptimized: false,   // Whether lightweight mobile rendering/perf mode is active
    collisionFrameIntervalMs: 16, // Minimum spacing between collision checks
    magnetFrameIntervalMs: 16,  // Minimum spacing between magnet pull updates
    lastCollisionCheckAt: 0,    // Timestamp of the most recent collision check
    lastMagnetPullCheckAt: 0,   // Timestamp of the most recent magnet pull update
    stormsSurvived: 0,          // Number of completed storms this round
    unlockedBadges: new Set(),  // Badge ids unlocked this round
    badgeToastTimeout: null,    // Timeout handle for badge popup cleanup
    activeCueUntil: 0,          // Timestamp until current cue finishes playing
    lastCueCooldownUntil: 0,    // Timestamp until next cue can play (anti-spam)
};

const BADGE_DEFINITIONS = [
    { id: 'streak-master', name: 'Streak Master' },
    { id: 'clean-crusader', name: 'Clean Crusader' },
    { id: 'storm-survivor', name: 'Storm Survivor' },
    { id: 'unstoppable', name: 'Unstoppable' },
];

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
    bucket: document.getElementById('collector-bucket'),
    rainLayer: document.getElementById('rain-layer'),
    lightningFlash: document.getElementById('lightning-flash'),
    lightningBolt: document.getElementById('lightning-bolt'),
    scoreCard: document.querySelector('.scoreboard .stat-card:nth-child(1)'),
    timerCard: document.querySelector('.scoreboard .stat-card:nth-child(2)'),
    goalCard: document.querySelector('.scoreboard .stat-card:nth-child(3)'),
    scoreboard: document.querySelector('.scoreboard'),
    actionFeedback: document.getElementById('action-feedback'),
    milestoneFeedback: document.getElementById('milestone-feedback'),
    pregameOverlay: document.getElementById('pregame-overlay'),
    countdownOverlay: document.getElementById('countdown-overlay'),
    countdownNumber: document.getElementById('countdown-number'),
    resultStatus: document.getElementById('result-status'),
    modalContent: document.querySelector('.modal-content'),
    badgeToast: document.getElementById('badge-toast'),
    badgeSummary: document.getElementById('badge-summary'),
    badgeSummaryList: document.getElementById('badge-summary-list'),
};

function getBadgeNameById(badgeId) {
    const definition = BADGE_DEFINITIONS.find((badge) => badge.id === badgeId);
    return definition ? definition.name : badgeId;
}

function playCueSound(cueType, badgeName = '') {
    if (!soundState.enabled) {
        return;
    }

    const now = performance.now();
    if (now < gameState.activeCueUntil) {
        return;
    }

    let text = '';
    let duration = 0.8;

    if (cueType === 'achievement') {
        text = badgeName ? `${badgeName} unlocked!` : 'Achievement unlocked!';
        duration = 1.4;
    } else if (cueType === 'time-boost') {
        text = 'Time burst!';
        duration = 0.8;
    } else if (cueType === 'bonus-rain') {
        text = 'Bonus rain!';
        duration = 0.8;
    }

    if (text && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.2;
        utterance.pitch = 1.2;
        utterance.volume = 1.0;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    }

    gameState.activeCueUntil = now + (duration * 1000) + 200;
}

function showBadgeToast(badgeName) {
    if (!elements.badgeToast) {
        return;
    }

    elements.badgeToast.textContent = `🏆 ${badgeName} Unlocked!`;
    elements.badgeToast.classList.remove('show');
    void elements.badgeToast.offsetWidth;
    elements.badgeToast.classList.add('show');

    clearTimeout(gameState.badgeToastTimeout);
    gameState.badgeToastTimeout = setTimeout(() => {
        elements.badgeToast?.classList.remove('show');
    }, 1600);
}

function unlockBadge(badgeId) {
    if (gameState.unlockedBadges.has(badgeId)) {
        return;
    }

    gameState.unlockedBadges.add(badgeId);
    const badgeName = getBadgeNameById(badgeId);
    showBadgeToast(badgeName);
    playCueSound('achievement', badgeName);
}

function evaluateBadgeProgress() {
    if (!gameState.isRunning) {
        return;
    }

    if (gameState.bestStreak >= 12) {
        unlockBadge('streak-master');
    }

    if (gameState.cleanCaught >= 50) {
        unlockBadge('clean-crusader');
    }

    if (gameState.stormsSurvived >= 3) {
        unlockBadge('storm-survivor');
    }

    if (gameState.score >= 500) {
        unlockBadge('unstoppable');
    }
}

function renderBadgeSummary() {
    if (!elements.badgeSummary || !elements.badgeSummaryList) {
        return;
    }

    const earnedBadgeIds = Array.from(gameState.unlockedBadges);
    elements.badgeSummaryList.innerHTML = '';

    if (earnedBadgeIds.length === 0) {
        elements.badgeSummary.classList.add('hidden');
        return;
    }

    earnedBadgeIds.forEach((badgeId) => {
        const item = document.createElement('li');
        item.className = 'badge-summary-item';
        item.textContent = `🏆 ${getBadgeNameById(badgeId)}`;
        elements.badgeSummaryList.appendChild(item);
    });

    elements.badgeSummary.classList.remove('hidden');
}

const gameplayTuning = {
    stormDelayMin: 8000,
    stormDelayMax: 12000,
    stormDurationMs: 2800,
    lightningWarningMs: 600,
    lightningFlashMs: 1000,
    freezeMs: 900,
    timeBurstChance: 0.05,
    magnetChance: 0,
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
};

const speedRamp = {
    pointsPerStep: 18,
    maxSpeedMultiplier: 1.85,
    uiPulseStartMultiplier: 1.25,
    uiPulseHighMultiplier: 1.55,
};

const inputState = {
    leftPressed: false,
    rightPressed: false,
};

const soundState = {
    enabled: true,
    audioContext: null,
    speechUnlocked: false,
    speechReady: false,
};

function unlockSpeechSynthesis() {
    if (!window.speechSynthesis) {
        return;
    }

    soundState.speechUnlocked = true;

    try {
        window.speechSynthesis.getVoices();
        const warmup = new SpeechSynthesisUtterance(' ');
        warmup.volume = 0;
        warmup.rate = 1;
        warmup.pitch = 1;
        warmup.onend = () => {
            soundState.speechReady = true;
        };
        warmup.onerror = () => {
            soundState.speechReady = true;
        };
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(warmup);
        setTimeout(() => {
            soundState.speechReady = true;
        }, 250);
    } catch (_) {
        soundState.speechReady = true;
    }
}

const MAGNET_SPAWN_CHANCE = 0.04;
const MAGNET_DURATION_MS = 6500;
const MAGNET_PULL_RADIUS_PX = 920;
const MAGNET_WARNING_LEAD_MS = 700;
const TIME_BURST_SPAWN_CHANCE = 0.05;
const TIME_BURST_SECONDS = 6;

const STREAK_MULTIPLIERS = {
    medium: 1.2,
    high: 1.5,
    max: 2.0,
};

const BASE_MILESTONE_STEPS = [100, 250, 500, 750, 1000];
const MILESTONE_MESSAGES = ['Nice start!', 'Strong run!', 'Impressive!', 'Unstoppable!'];
const CASCADE_TRIGGER_CHANCE = 0.16;
const CASCADE_DURATION_MS = 2400;
const CASCADE_SPAWN_INTERVAL_MS = 280;
const CASCADE_MAX_SPAWNS = 8;
const CASCADE_COOLDOWN_MS = 14000;

function calculateFamiliesHelped(score) {
    return Math.floor(Math.max(0, score) / gameState.targetScore);
}

function getNextMilestoneAfter(currentMilestone) {
    if (currentMilestone < BASE_MILESTONE_STEPS[BASE_MILESTONE_STEPS.length - 1]) {
        return BASE_MILESTONE_STEPS.find((value) => value > currentMilestone) || 1000;
    }

    // After 1000, grow by larger intervals to stay meaningful for long endless runs.
    const dynamicStep = Math.max(250, Math.floor(currentMilestone * 0.25));
    return currentMilestone + dynamicStep;
}

function getMilestoneMessage() {
    const messageIndex = gameState.milestonesReached % MILESTONE_MESSAGES.length;
    const cheer = MILESTONE_MESSAGES[messageIndex];
    const families = calculateFamiliesHelped(gameState.score);

    if (families > 0) {
        const familyLabel = families === 1 ? 'family' : 'families';
        return `${cheer} You helped provide water to ${families} ${familyLabel}.`;
    }

    return cheer;
}

function showMilestoneFeedback(message) {
    if (!elements.milestoneFeedback) {
        return;
    }

    elements.milestoneFeedback.textContent = message;
    elements.milestoneFeedback.classList.remove('show');
    void elements.milestoneFeedback.offsetWidth;
    elements.milestoneFeedback.classList.add('show');

    clearTimeout(gameState.milestoneFeedbackTimeout);
    gameState.milestoneFeedbackTimeout = setTimeout(() => {
        elements.milestoneFeedback?.classList.remove('show');
    }, 1400);
}

function checkMilestoneProgress(previousScore, currentScore) {
    if (currentScore <= previousScore) {
        return;
    }

    let reachedAnyMilestone = false;

    while (currentScore >= gameState.nextMilestoneScore) {
        gameState.milestonesReached += 1;
        reachedAnyMilestone = true;
        gameState.nextMilestoneScore = getNextMilestoneAfter(gameState.nextMilestoneScore);
    }

    if (!reachedAnyMilestone) {
        return;
    }

    showMilestoneFeedback(getMilestoneMessage());
    elements.gameContainer?.classList.remove('milestone-pulse');
    void elements.gameContainer?.offsetWidth;
    elements.gameContainer?.classList.add('milestone-pulse');
    setTimeout(() => {
        elements.gameContainer?.classList.remove('milestone-pulse');
    }, 520);
}

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

    if (!soundState.speechUnlocked || !soundState.speechReady) {
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
        const isMobileAudioProfile = window.matchMedia('(pointer: coarse)').matches;
        const effectiveVolume = Math.min(0.18, volume * (isMobileAudioProfile ? 1.85 : 1));

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(startFrequency, now);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + durationSec);

        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.exponentialRampToValueAtTime(effectiveVolume, now + 0.015);
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
        case 'time-burst':
            playTone(560, 860, 0.1, 0.07, 'sine');
            setTimeout(() => playTone(860, 1020, 0.08, 0.064, 'triangle'), 70);
            break;
        case 'magnet-off':
            playTone(560, 410, 0.11, 0.06, 'triangle');
            setTimeout(() => playTone(410, 300, 0.1, 0.052, 'sine'), 70);
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
            unlockSpeechSynthesis();
            soundState.enabled = !soundState.enabled;

            if (soundState.enabled) {
                getAudioContext();
                playTone(520, 700, 0.07, 0.06, 'triangle');
            }

            updateSoundToggleUI();
        });
    }

    const unlockAudio = () => {
        unlockSpeechSynthesis();
        const audioContext = getAudioContext();
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().catch(() => {
                // Ignore resume failures; another gesture can retry.
            });
        }

        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio, { passive: true });

    elements.startBtn?.addEventListener('click', () => {
        unlockSpeechSynthesis();
        const audioContext = getAudioContext();
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().catch(() => {
                // Ignore resume failures; the user can retry with another tap.
            });
        }
    });
}

function getActiveWeatherPreset() {
    return gameplayTuning;
}

function getDynamicSpeedMultiplier() {
    // Smooth logarithmic ramp: subtle early game, increasingly noticeable later.
    const clampedScore = Math.max(0, gameState.score);
    const growth = Math.log1p(clampedScore / speedRamp.pointsPerStep);
    const speedMultiplier = 1 + Math.min(speedRamp.maxSpeedMultiplier - 1, growth * 0.3);
    return Math.max(1, Math.min(speedRamp.maxSpeedMultiplier, speedMultiplier));
}

function updateIntensityCue() {
    if (!elements.gameContainer || !elements.scoreboard) {
        return;
    }

    const speedMultiplier = getDynamicSpeedMultiplier();
    elements.gameContainer.classList.toggle('intensity-rising', speedMultiplier >= speedRamp.uiPulseStartMultiplier);
    elements.scoreboard.classList.toggle('intensity-rising', speedMultiplier >= speedRamp.uiPulseStartMultiplier);
    elements.gameContainer.classList.toggle('intensity-high', speedMultiplier >= speedRamp.uiPulseHighMultiplier);
    elements.scoreboard.classList.toggle('intensity-high', speedMultiplier >= speedRamp.uiPulseHighMultiplier);
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
        gameState.magnetFrameIntervalMs = 24;
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
    gameState.stormsSurvived = 0;
    gameState.unlockedBadges = new Set();
    gameState.timeRemaining = 60;
    gameState.stormCycleIndex = 0;
    gameState.stormPatternTipShown = false;
    gameState.lightningWarningStep = 0;
    gameState.progressCelebrated = false;
    gameState.cascadeActive = false;
    gameState.cascadeCooldownUntil = 0;
    clearInterval(gameState.cascadeInterval);
    clearTimeout(gameState.cascadeTimeout);
    gameState.cascadeInterval = null;
    gameState.cascadeTimeout = null;
    elements.gameContainer.classList.remove('cascade-rain-moment');
    gameState.magnetActiveUntil = 0;
    clearTimeout(gameState.magnetTimeout);
    clearTimeout(gameState.magnetWarningTimeout);
    clearTimeout(gameState.badgeToastTimeout);
    gameState.magnetTimeout = null;
    gameState.magnetWarningTimeout = null;
    gameState.badgeToastTimeout = null;
    elements.badgeToast?.classList.remove('show');
    elements.badgeSummary?.classList.add('hidden');
    if (elements.badgeSummaryList) {
        elements.badgeSummaryList.innerHTML = '';
    }
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
    gameState.stormsSurvived = 0;
    gameState.unlockedBadges = new Set();
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
    gameState.cascadeActive = false;
    gameState.cascadeCooldownUntil = 0;
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
    clearTimeout(gameState.timerBurstTimeout);
    clearTimeout(gameState.goalPulseTimeout);
    clearTimeout(gameState.milestoneFeedbackTimeout);
    clearInterval(gameState.cascadeInterval);
    clearTimeout(gameState.cascadeTimeout);
    clearTimeout(gameState.actionFeedbackTimeout);
    clearTimeout(gameState.scoreboardFlashTimeout);
    clearTimeout(gameState.lightningShakeTimeout);
    clearTimeout(gameState.impactCelebrateTimeout);
    clearTimeout(gameState.magnetTimeout);
    clearTimeout(gameState.magnetWarningTimeout);
    clearTimeout(gameState.badgeToastTimeout);
    gameState.bucketCatchGlowTimeout = null;
    gameState.bucketShakeTimeout = null;
    gameState.gameMomentTimeout = null;
    gameState.scorePulseTimeout = null;
    gameState.timerPulseTimeout = null;
    gameState.timerBurstTimeout = null;
    gameState.goalPulseTimeout = null;
    gameState.milestoneFeedbackTimeout = null;
    gameState.cascadeInterval = null;
    gameState.cascadeTimeout = null;
    gameState.actionFeedbackTimeout = null;
    gameState.scoreboardFlashTimeout = null;
    gameState.lightningShakeTimeout = null;
    gameState.impactCelebrateTimeout = null;
    gameState.magnetTimeout = null;
    gameState.magnetWarningTimeout = null;
    gameState.badgeToastTimeout = null;

    elements.gameContainer.classList.remove('bonus-moment');
    elements.gameContainer.classList.remove('time-moment');
    elements.gameContainer.classList.remove('storm-moment');
    elements.gameContainer.classList.remove('negative-flash');
    elements.gameContainer.classList.remove('cascade-rain-moment');
    elements.gameContainer.classList.remove('lightning-warning-dim');
    elements.bucket.classList.remove('bucket-bonus-boost');
    elements.bucket.classList.remove('bucket-time-boost');
    elements.bucket.classList.remove('bucket-magnet-active');
    elements.scoreDisplay.classList.remove('score-pop');
    elements.timerDisplay.classList.remove('timer-low-pulse');
    elements.timerDisplay.classList.remove('timer-burst-pop');
    elements.scoreCard?.classList.remove('stat-pop');
    elements.timerCard?.classList.remove('stat-pop');
    elements.timerCard?.classList.remove('timer-card-burst');
    elements.goalCard?.classList.remove('stat-pop');
    elements.scoreboard?.classList.remove('score-positive', 'score-negative');
    elements.badgeToast?.classList.remove('show');
    elements.badgeSummary?.classList.add('hidden');
    if (elements.badgeSummaryList) {
        elements.badgeSummaryList.innerHTML = '';
    }
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
    renderBadgeSummary();

    // Calculate impact from total score.
    const familiesHelped = Math.floor(gameState.score / gameState.targetScore);
    const pointsToNextFamily = gameState.targetScore - (gameState.score % gameState.targetScore);
    const isNewHighScore = gameState.score > gameState.highScore;

    const isCompactMobile = window.matchMedia('(max-width: 520px)').matches;

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
        elements.resultMessage.textContent = isCompactMobile
            ? `Great run. ${familiesHelped} ${familyLabel} helped.${isNewHighScore ? ' New high score!' : ''}`
            : `Strong round. You delivered progress for ${familiesHelped} ${familyLabel}.${highScoreMessage}`;
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
        elements.resultMessage.textContent = isCompactMobile
            ? `${targetHint} points short. Keep streaks and avoid polluted drops.`
            : `${targetHint} points to go for mission success. Stay on clean-drop streaks and avoid polluted drops. High score: ${gameState.highScore}.`;
        setActionFeedback(`Round ended. You need ${targetHint} more points for success.`, 'negative');
        playSoundEffect('lose');
    }

    // Show the modal with a two-frame handoff to avoid abrupt transition on mobile.
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            elements.gameOverModal.classList.remove('hidden');
        });
    });
}

// ==========================================
// DROP CREATION & MANAGEMENT
// ==========================================

/**
 * Creates a new falling drop with random type and position
 * Mix stays consistent while fall speed ramps smoothly with score.
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

    const powerUpRoll = Math.random();
    const timeBurstChance = Number.isFinite(preset.timeBurstChance)
        ? Math.max(0, Math.min(0.2, preset.timeBurstChance))
        : TIME_BURST_SPAWN_CHANCE;
    const magnetChance = Number.isFinite(preset.magnetChance)
        ? Math.max(0, Math.min(0.2, preset.magnetChance))
        : MAGNET_SPAWN_CHANCE;

    if (powerUpRoll < timeBurstChance) {
        dropType = 'powerup-time';
        points = 0;
        size = 44 + Math.random() * 8;
    } else if (powerUpRoll < (timeBurstChance + magnetChance)) {
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
    } else if (dropType === 'powerup-time') {
        drop.textContent = 'schedule';
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

    // Fall speed scales smoothly with score and is capped to keep gameplay fair.
    const fallRange = Math.max(0, preset.dropFallMaxSec - preset.dropFallMinSec);
    const baseFallDurationSec = preset.dropFallMinSec + Math.random() * fallRange;
    const speedMultiplier = getDynamicSpeedMultiplier();
    const fallDurationSec = Math.max(0.7, baseFallDurationSec / speedMultiplier);
    drop.style.setProperty('--fall-duration', `${fallDurationSec}s`);
    const dropTilt = dropType === 'powerup-magnet' || dropType === 'powerup-time'
        ? '0deg'
        : `${(Math.random() * 16 - 8).toFixed(2)}deg`;
    drop.style.setProperty('--drop-tilt', dropTilt);
    drop.style.setProperty('--drop-sway', `${(Math.random() * 8 + 5).toFixed(2)}px`);
    drop.dataset.baseSway = drop.style.getPropertyValue('--drop-sway') || '0px';

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

function createCascadeBonusDrop() {
    if (!gameState.isRunning) {
        return;
    }

    const activeDropCount = elements.gameContainer.querySelectorAll('.drop').length;
    const maxActiveDrops = gameState.isMobileOptimized ? 16 : 30;
    if (activeDropCount >= maxActiveDrops) {
        return;
    }

    const drop = document.createElement('div');
    drop.className = 'drop bonus material-symbols-rounded cascade-drop';
    drop.textContent = 'water_drop';
    drop.dataset.points = 50;
    drop.dataset.type = 'bonus';

    let size = 56 + Math.random() * 10;
    if (gameState.isMobileOptimized) {
        size *= 0.88;
    }

    drop.style.width = `${size}px`;
    drop.style.height = `${size}px`;
    drop.style.fontSize = `${Math.round(size * 0.9)}px`;

    const containerWidth = elements.gameContainer.offsetWidth;
    const marginX = Math.max(6, size * 0.2);
    const xPosition = marginX + Math.random() * Math.max(0, containerWidth - size - marginX * 2);
    drop.style.left = `${xPosition}px`;

    const fallDurationSec = (gameState.isMobileOptimized ? 1.85 : 1.7) + Math.random() * 0.45;
    drop.style.setProperty('--fall-duration', `${fallDurationSec}s`);
    drop.style.setProperty('--drop-tilt', `${(Math.random() * 10 - 5).toFixed(2)}deg`);
    drop.style.setProperty('--drop-sway', `${(Math.random() * 6 + 3).toFixed(2)}px`);
    drop.dataset.baseSway = drop.style.getPropertyValue('--drop-sway') || '0px';

    elements.gameContainer.appendChild(drop);

    drop.addEventListener('animationend', () => {
        if (gameState.isRunning && !drop.classList.contains('collected')) {
            resetStreak();
        }
        drop.remove();
    });
}

function triggerCascadeEvent() {
    if (!gameState.isRunning || gameState.cascadeActive) {
        return;
    }

    const now = performance.now();
    if (now < gameState.cascadeCooldownUntil) {
        return;
    }

    gameState.cascadeActive = true;
    gameState.cascadeCooldownUntil = now + CASCADE_COOLDOWN_MS;
    playCueSound('bonus-rain');

    showFeedbackMessage('Bonus Rain!', 'bonus', 1300);
    setActionFeedback('Bonus Rain! Catch the golden drops.', 'positive', 1500);
    triggerGameMoment('bonus', 620);

    elements.gameContainer.classList.remove('cascade-rain-moment');
    void elements.gameContainer.offsetWidth;
    elements.gameContainer.classList.add('cascade-rain-moment');

    let spawned = 0;
    gameState.cascadeInterval = setInterval(() => {
        if (!gameState.isRunning || spawned >= CASCADE_MAX_SPAWNS) {
            clearInterval(gameState.cascadeInterval);
            gameState.cascadeInterval = null;
            return;
        }

        createCascadeBonusDrop();
        spawned += 1;
    }, CASCADE_SPAWN_INTERVAL_MS);

    gameState.cascadeTimeout = setTimeout(() => {
        clearInterval(gameState.cascadeInterval);
        gameState.cascadeInterval = null;
        gameState.cascadeActive = false;
        elements.gameContainer.classList.remove('cascade-rain-moment');
    }, CASCADE_DURATION_MS);
}

function maybeTriggerCascadeFromSpecialCatch(isSpecialCatch) {
    if (!isSpecialCatch || !gameState.isRunning || gameState.cascadeActive) {
        return;
    }

    if (Math.random() < CASCADE_TRIGGER_CHANCE) {
        triggerCascadeEvent();
    }
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
    const multiplier = getStreakMultiplier(gameState.streak);
    const streakTierOne = gameState.streak >= 3;
    const streakTierTwo = gameState.streak >= 7;
    const streakTierThree = gameState.streak >= 12;

    if (elements.streakDisplay) {
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
    }

    if (elements.scoreCard) {
        if (gameState.isMobileOptimized) {
            elements.scoreCard.classList.remove('streak-hot', 'streak-hot-2', 'streak-hot-3');
        } else {
            elements.scoreCard.classList.toggle('streak-hot', streakTierOne);
            elements.scoreCard.classList.toggle('streak-hot-2', streakTierTwo);
            elements.scoreCard.classList.toggle('streak-hot-3', streakTierThree);
        }
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

    evaluateBadgeProgress();
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
        playSoundEffect('magnet-off');
    }, remainingMs + 20);
}

function triggerTimerBurstHighlight() {
    elements.timerDisplay.classList.remove('timer-burst-pop');
    elements.timerCard?.classList.remove('timer-card-burst');
    void elements.timerDisplay.offsetWidth;
    elements.timerDisplay.classList.add('timer-burst-pop');
    elements.timerCard?.classList.add('timer-card-burst');

    clearTimeout(gameState.timerBurstTimeout);
    gameState.timerBurstTimeout = setTimeout(() => {
        elements.timerDisplay.classList.remove('timer-burst-pop');
        elements.timerCard?.classList.remove('timer-card-burst');
    }, 480);
}

function showTimeBurstFeedback(drop, secondsAdded) {
    const containerRect = elements.gameContainer.getBoundingClientRect();
    const dropRect = drop.getBoundingClientRect();
    const feedback = document.createElement('div');

    feedback.style.position = 'absolute';
    feedback.style.left = `${dropRect.left - containerRect.left + (dropRect.width / 2)}px`;
    feedback.style.top = `${dropRect.top - containerRect.top}px`;
    feedback.style.fontSize = '24px';
    feedback.style.fontWeight = '800';
    feedback.style.letterSpacing = '0.03em';
    feedback.style.pointerEvents = 'none';
    feedback.style.animation = 'popUpBonus 0.95s ease-out forwards';
    feedback.style.color = '#5BE6FF';
    feedback.style.textShadow = '0 0 16px rgba(91, 230, 255, 0.9), 2px 2px 4px rgba(0, 0, 0, 0.25)';
    feedback.textContent = `+${secondsAdded}s`;

    elements.gameContainer.appendChild(feedback);
    setTimeout(() => feedback.remove(), 950);
}

function grantTimeBurst(secondsAdded, drop) {
    playCueSound('time-boost');
    gameState.timeRemaining += secondsAdded;
    updateTimer();
    triggerTimerBurstHighlight();
    showTimeBurstFeedback(drop, secondsAdded);
}

function clearMagnetOffsets() {
    const magneticDrops = document.querySelectorAll('.drop.magnet-target-clean');

    magneticDrops.forEach((drop) => {
        drop.dataset.magnetOffsetX = '0';
        drop.dataset.magnetOffsetY = '0';
        drop.dataset.magnetLocked = '0';
        drop.style.setProperty('--magnet-offset-x', '0px');
        drop.style.setProperty('--magnet-offset-y', '0px');
        drop.style.setProperty('--drop-sway', drop.dataset.baseSway || '0px');
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
    const isTimePowerUp = drop.classList.contains('powerup-time');

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
    } else if (isTimePowerUp) {
        grantTimeBurst(TIME_BURST_SECONDS, drop);
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
    } else if (isTimePowerUp) {
        dropType = 'powerup-time';
    }

    if (awardedPoints > 0 || isMagnetPowerUp || isTimePowerUp) {
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
    } else if (dropType === 'powerup-time') {
        playSoundEffect('time-burst');
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
    } else if (drop.classList.contains('powerup-time')) {
        message = `Time Burst! +${TIME_BURST_SECONDS} seconds.`;
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
    } else if (dropType === 'powerup-time') {
        triggerGameMoment('time', 380);
        triggerHaptic([14, 24, 14]);
    } else if (dropType === 'polluted') {
        triggerHaptic([25]);
    } else {
        triggerHaptic([15]);
    }
    
    // Use top toast feedback for catches - skip for clean drops since streak shows that.
    const feedbackType = dropType === 'powerup-magnet'
        ? 'bonus'
        : (dropType === 'powerup-time' ? 'time' : dropType);
    const activeMultiplier = isClean ? getStreakMultiplier(gameState.streak) : 1;
    const visualType = dropType === 'powerup-magnet'
        ? 'bonus'
        : (dropType === 'powerup-time' ? 'time' : dropType);
    
    // Suppress individual item messages (jerry cans, polluted, magnet, etc)
    // Only cascade event messages (bonus rain, time burst events) are shown

    maybeTriggerCascadeFromSpecialCatch(isBonus || isMagnetPowerUp || isTimePowerUp);
    
    // Show points feedback (popups) for all drops
    if (!isMagnetPowerUp && !isTimePowerUp) {
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

    if (gameState.isMobileOptimized) {
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
    elements.bucket.classList.remove('bucket-time-boost');
    elements.bucket.classList.remove('bucket-catch-bounce');
    void elements.bucket.offsetWidth;
    elements.bucket.classList.add('bucket-catch-glow');
    elements.bucket.classList.add('bucket-catch-bounce');

    if (type === 'bonus') {
        elements.bucket.classList.add('bucket-bonus-boost');
    } else if (type === 'powerup-time') {
        elements.bucket.classList.add('bucket-time-boost');
    } else if (type === 'powerup-magnet') {
        elements.bucket.classList.add('bucket-magnet-active');
    }

    clearTimeout(gameState.bucketCatchGlowTimeout);
    gameState.bucketCatchGlowTimeout = setTimeout(() => {
        elements.bucket.classList.remove('bucket-catch-glow');
        elements.bucket.classList.remove('bucket-bonus-boost');
        elements.bucket.classList.remove('bucket-time-boost');
    }, type === 'bonus' ? 420 : (type === 'powerup-time' ? 380 : 260));
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
    const particleCount = type === 'bonus' ? 12 : (type === 'polluted' ? 7 : (type === 'time' ? 10 : 9));

    // Small radial particles reinforce catch impact while staying visually clean.
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('span');
        particle.className = `catch-particle catch-particle-${type}`;

        const angle = (Math.PI * 2 * i) / particleCount + (Math.random() * 0.35);
        const distance = type === 'bonus'
            ? 34 + Math.random() * 18
            : (type === 'polluted' ? 24 + Math.random() * 12 : (type === 'time' ? 30 + Math.random() * 16 : 28 + Math.random() * 14));

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
    const className = type === 'storm'
        ? 'storm-moment'
        : (type === 'time' ? 'time-moment' : 'bonus-moment');

    clearTimeout(gameState.gameMomentTimeout);
    elements.gameContainer.classList.remove('bonus-moment', 'time-moment', 'storm-moment');
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
    if (gameState.isRunning) {
        gameState.stormsSurvived += 1;
        evaluateBadgeProgress();
    }
    elements.gameContainer.classList.remove('storm-active');
    elements.gameContainer.classList.remove('lightning-warning');
    elements.gameContainer.classList.remove('lightning-active');
    elements.gameContainer.classList.remove('lightning-warning-dim');
    elements.gameContainer.classList.remove('lightning-warning-pattern');
    elements.gameContainer.classList.remove('bonus-moment');
    elements.gameContainer.classList.remove('time-moment');
    elements.gameContainer.classList.remove('storm-moment');
    elements.gameContainer.classList.remove('intensity-rising');
    elements.gameContainer.classList.remove('intensity-high');
    elements.scoreboard?.classList.remove('intensity-rising');
    elements.scoreboard?.classList.remove('intensity-high');
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
    elements.gameContainer.classList.remove('time-moment');
    elements.gameContainer.classList.remove('storm-moment');
    elements.gameContainer.classList.remove('intensity-rising');
    elements.gameContainer.classList.remove('intensity-high');
    elements.scoreboard?.classList.remove('intensity-rising');
    elements.scoreboard?.classList.remove('intensity-high');
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
    const bucketRimY = bucketRect.top + (gameState.isMobileOptimized ? 8 : 6);
    const magnetCatchPaddingX = gameState.isMobileOptimized ? 220 : 170;
    const magnetCatchPaddingY = gameState.isMobileOptimized ? 250 : 200;
    const magneticDrops = document.querySelectorAll('.drop.magnet-target-clean:not(.collected)');

    magneticDrops.forEach((drop) => {
        const dropRect = drop.getBoundingClientRect();
        const dropCenterX = dropRect.left + (dropRect.width / 2);
        const dropCenterY = dropRect.top + (dropRect.height / 2);
        const deltaX = bucketCenterX - dropCenterX;
        const deltaY = bucketRimY - dropCenterY;
        const distance = Math.hypot(deltaX, deltaY);
        const pullRadius = MAGNET_PULL_RADIUS_PX + 260;

        const inMagnetCatchZone =
            dropRect.right >= (bucketRect.left - magnetCatchPaddingX) &&
            dropRect.left <= (bucketRect.right + magnetCatchPaddingX) &&
            dropRect.bottom >= (bucketRect.top - magnetCatchPaddingY) &&
            dropRect.top <= (bucketRect.bottom + magnetCatchPaddingY);

        const isLocked = drop.dataset.magnetLocked === '1';
        // Engage magnet on drops within full pull radius but also stay locked once engaged
        const shouldLock = isLocked || inMagnetCatchZone || distance <= pullRadius;

        if (shouldLock) {
            drop.dataset.magnetLocked = '1';
            // Disable side sway while magnet is pulling so motion feels direct.
            drop.style.setProperty('--drop-sway', '0px');
        } else {
            drop.dataset.magnetLocked = '0';
            drop.style.setProperty('--drop-sway', drop.dataset.baseSway || '0px');
        }

        let offsetX = Number(drop.dataset.magnetOffsetX || 0);
        let offsetY = Number(drop.dataset.magnetOffsetY || 0);

        if (shouldLock && distance > 0.01) {
            const normalizedDistance = 1 - Math.min(1, distance / pullRadius);
            // Moderate easing so drops visibly travel toward bucket instead of vanishing
            const pullEase = 0.32 + (normalizedDistance * 0.28);

            // Home clean drops toward bucket with measured damping for visibility.
            // Drops appear on-screen and gradually get pulled in as player moves bucket.
            // Use stronger downward pull to help them fall INTO bucket, not around it.
            const targetOffsetX = deltaX * 0.62;
            const targetOffsetY = deltaY * 0.85;
            offsetX += (targetOffsetX - offsetX) * pullEase;
            offsetY += (targetOffsetY - offsetY) * pullEase;
        } else {
            // Smoothly decay offsets when magnet is off, but decay faster to prevent dragging
            offsetX *= 0.72;
            offsetY *= 0.72;
        }

        const maxOffsetX = 520;
        const maxOffsetYUp = 380;
        const maxOffsetYDown = 540;
        const clampedOffsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, offsetX));
        const clampedOffsetY = Math.max(-maxOffsetYUp, Math.min(maxOffsetYDown, offsetY));
        drop.dataset.magnetOffsetX = String(clampedOffsetX);
        drop.dataset.magnetOffsetY = String(clampedOffsetY);
        drop.style.setProperty('--magnet-offset-x', `${clampedOffsetX.toFixed(2)}px`);
        drop.style.setProperty('--magnet-offset-y', `${clampedOffsetY.toFixed(2)}px`);

        // Score when drop is pulled close enough to bucket or enters catch zone.
        // Enlarged zone to catch drops that complete their magnet journey.
        const updatedRect = drop.getBoundingClientRect();
        const catchPaddingX = gameState.isMobileOptimized ? 80 : 60;
        const catchPaddingY = gameState.isMobileOptimized ? 100 : 80;
        const reachedBucket =
            updatedRect.bottom >= (bucketRect.top - catchPaddingY) &&
            updatedRect.top <= (bucketRect.bottom + catchPaddingY) &&
            updatedRect.left < (bucketRect.right + catchPaddingX) &&
            updatedRect.right > (bucketRect.left - catchPaddingX);

        if (reachedBucket) {
            scorePoints(drop, Number(drop.dataset.points));
        }
    });
}

function gameLoop(timestamp = performance.now()) {
    if (gameState.isRunning) {
        updateBucketMovement();

        if ((timestamp - gameState.lastCollisionCheckAt) >= gameState.collisionFrameIntervalMs) {
            checkDropCollisions();
            gameState.lastCollisionCheckAt = timestamp;
        }
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
            .feedback-time {
                background: rgba(93, 231, 255, 0.95);
                color: #052536;
                border-color: rgba(202, 248, 255, 0.68);
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

    elements.actionFeedback.style.display = 'block';
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

function clearActionFeedback() {
    if (!elements.actionFeedback) {
        return;
    }
    elements.actionFeedback.style.display = 'none';
    elements.actionFeedback.classList.remove('feedback-positive', 'feedback-negative', 'feedback-alert');
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
    checkMilestoneProgress(previousScore, gameState.score);
    updateIntensityCue();

    const allowScoreAnimations = !gameState.isMobileOptimized;

    if (gameState.score !== previousScore) {
        if (allowScoreAnimations) {
            elements.scoreDisplay.classList.remove('score-pop');
            void elements.scoreDisplay.offsetWidth;
            elements.scoreDisplay.classList.add('score-pop');

            elements.scoreCard?.classList.remove('stat-pop');
            void elements.scoreCard?.offsetWidth;
            elements.scoreCard?.classList.add('stat-pop');
        }

        clearTimeout(gameState.scorePulseTimeout);
        gameState.scorePulseTimeout = setTimeout(() => {
            elements.scoreDisplay.classList.remove('score-pop');
            elements.scoreCard?.classList.remove('stat-pop');
        }, 320);

        if (gameState.score > previousScore && gameState.score > 0 && gameState.score % 50 === 0) {
            if (allowScoreAnimations) {
                elements.goalCard?.classList.remove('stat-pop');
                void elements.goalCard?.offsetWidth;
                elements.goalCard?.classList.add('stat-pop');
            }

            clearTimeout(gameState.goalPulseTimeout);
            gameState.goalPulseTimeout = setTimeout(() => {
                elements.goalCard?.classList.remove('stat-pop');
            }, 430);
        }
    }

    evaluateBadgeProgress();
}

/**
 * Updates the timer display
 */
function updateTimer() {
    elements.timerDisplay.textContent = gameState.timeRemaining;

    const allowTimerAnimations = !gameState.isMobileOptimized;

    // Change color if time is running out (red warning)
    if (gameState.timeRemaining <= 10) {
        elements.timerDisplay.style.color = '#FF4444';
        if (allowTimerAnimations) {
            elements.timerDisplay.classList.add('timer-low-pulse');
            elements.timerCard?.classList.add('stat-pop');
        }

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
