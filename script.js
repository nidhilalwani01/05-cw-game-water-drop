/* ==========================================
   DROP FOR CHANGE - GAME LOGIC
   A charity: water inspired clicking game
   ========================================== */

// ==========================================
// GAME STATE VARIABLES
// ==========================================

let gameState = {
    isRunning: false,           // Whether the game is actively playing
    score: 0,                   // Current score
    timeRemaining: 60,          // Seconds left to play
    targetScore: 150,           // Score needed to win (about 15 clean drops or fewer with bonuses)
    highScore: 0,               // Best score saved across rounds
    timerInterval: null,        // Store timer so we can stop it
    dropInterval: null,         // Store drop creation so we can stop it
    bucketX: 0,                 // Horizontal bucket position in px
    bucketSpeed: 9,             // How fast the bucket moves with keyboard
    bucketVelocity: 0,          // Current horizontal velocity for smooth movement
    bucketAcceleration: 1.1,    // Keyboard acceleration applied each frame
    bucketMaxSpeed: 13,         // Velocity cap to keep control predictable
    bucketFriction: 0.9,        // Friction when no input is pressed
    touchTargetX: null,         // Active touch target in px while dragging
    hasBucketPosition: false,   // Whether initial placement has been done
};

// Load the saved high score once when the script starts.
gameState.highScore = Number(localStorage.getItem('drop-for-change-high-score')) || 0;

// ==========================================
// DOM ELEMENT REFERENCES
// ==========================================

const elements = {
    scoreDisplay: document.getElementById('score'),
    timerDisplay: document.getElementById('time'),
    gameContainer: document.getElementById('game-container'),
    startBtn: document.getElementById('start-btn'),
    resetBtn: document.getElementById('reset-btn'),
    gameOverModal: document.getElementById('game-over-modal'),
    gameOverTitle: document.getElementById('game-over-title'),
    gameOverMessage: document.getElementById('game-over-message'),
    resultMessage: document.getElementById('result-message'),
    finalScore: document.getElementById('final-score'),
    playAgainBtn: document.getElementById('play-again-btn'),
    confettiCanvas: document.getElementById('confetti-canvas'),
    themeToggle: document.getElementById('theme-toggle'),
    bucket: document.getElementById('collector-bucket'),
};

const inputState = {
    leftPressed: false,
    rightPressed: false,
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

// ==========================================
// EVENT LISTENERS - Attach buttons to game functions
// ==========================================

elements.startBtn.addEventListener('click', startGame);
elements.resetBtn.addEventListener('click', resetGame);
elements.playAgainBtn.addEventListener('click', resetGame);
initializeThemeToggle();
initializeBucketControls();
requestAnimationFrame(gameLoop);

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
    // Don't start if already running
    if (gameState.isRunning) return;

    gameState.isRunning = true;
    gameState.score = 0;
    gameState.timeRemaining = 60;

    // Update UI to reflect game status
    updateScore();
    updateTimer();
    elements.startBtn.disabled = true;
    ensureBucketPosition();

    // Create drops every 800ms (slightly faster for more challenge)
    gameState.dropInterval = setInterval(createDrop, 800);

    // Update timer every second
    gameState.timerInterval = setInterval(tick, 1000);
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

    // Clear all intervals
    clearInterval(gameState.dropInterval);
    clearInterval(gameState.timerInterval);

    // Reset state
    gameState.score = 0;
    gameState.timeRemaining = 60;
    gameState.bucketVelocity = 0;
    gameState.touchTargetX = null;
    inputState.leftPressed = false;
    inputState.rightPressed = false;

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
    updateTimer();
    ensureBucketPosition();

    // Re-enable start button
    elements.startBtn.disabled = false;

    // Hide game over modal
    elements.gameOverModal.classList.add('hidden');
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

    // Stop creating new drops
    clearInterval(gameState.dropInterval);
    clearInterval(gameState.timerInterval);

    // Disable start button
    elements.startBtn.disabled = true;

    // Display results
    elements.finalScore.textContent = gameState.score;

    // Calculate impact from total score.
    const familiesHelped = Math.floor(gameState.score / gameState.targetScore);
    const pointsToNextFamily = gameState.targetScore - (gameState.score % gameState.targetScore);
    const isNewHighScore = gameState.score > gameState.highScore;

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

        elements.gameOverTitle.textContent = "Time's Up - Amazing Impact!";
        elements.gameOverTitle.style.color = '#FFC907';
        elements.resultMessage.textContent =
            `You brought clean water to ${familiesHelped} ${familyLabel}.${highScoreMessage}`;
        playConfetti();
    } else {
        const targetHint = pointsToNextFamily === gameState.targetScore
            ? gameState.targetScore
            : pointsToNextFamily;

        elements.gameOverTitle.textContent = 'Keep Going';
        elements.gameOverTitle.style.color = '#FF902A';
        elements.resultMessage.textContent =
            `You are ${targetHint} points away from helping your first family. High score: ${gameState.highScore}.`;
    }

    // Show the modal
    elements.gameOverModal.classList.remove('hidden');
}

// ==========================================
// DROP CREATION & MANAGEMENT
// ==========================================

/**
 * Creates a new falling drop with random type and position
 * Types: 70% clean (blue), 20% polluted (red), 10% bonus (yellow)
 */
function createDrop() {
    // Don't create drops if game isn't running
    if (!gameState.isRunning) return;

    const drop = document.createElement('div');
    drop.className = 'drop';

    // Randomly decide drop type
    const rand = Math.random();
    let dropType;
    let points;
    let size;

    if (rand < 0.7) {
        // 70% chance: Clean water drop
        dropType = 'clean';
        points = 10;
        size = 40 + Math.random() * 20; // 40-60px
    } else if (rand < 0.9) {
        // 20% chance: Polluted drop
        dropType = 'polluted';
        points = -20;
        size = 45 + Math.random() * 20; // 45-65px
    } else {
        // 10% chance: Bonus jerry can
        dropType = 'bonus';
        points = 50;
        size = 66 + Math.random() * 16; // 66-82px
    }

    // Store points value on the element
    drop.dataset.points = points;

    // Set drop appearance
    drop.classList.add(dropType);
    drop.style.width = size + 'px';
    drop.style.height = size + 'px';

    // Random horizontal position
    const containerWidth = elements.gameContainer.offsetWidth;
    const xPosition = Math.random() * (containerWidth - size);
    drop.style.left = xPosition + 'px';

    // Vary fall speed for visual interest (2-4 seconds)
    const fallSpeed = 2 + Math.random() * 2;
    drop.style.animationDuration = fallSpeed + 's';

    // Add the drop to the game area
    elements.gameContainer.appendChild(drop);

    // Remove drop after it falls off screen (animation ends)
    drop.addEventListener('animationend', () => {
        drop.remove();
    });
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

    // Update score (never go below 0)
    gameState.score += points;
    if (gameState.score < 0) {
        gameState.score = 0;
    }
    
    updateScore();

    // Show feedback message based on item type
    let message = '';
    if (drop.classList.contains('clean')) {
        message = 'You brought clean water! ✓';
    } else if (drop.classList.contains('polluted')) {
        message = 'Oops! That was contaminated water.';
    } else if (drop.classList.contains('bonus')) {
        message = 'Bonus! Extra water access! 🎉';
    }
    
    // Show both the message and point feedback
    showFeedbackMessage(message);
    showPointsFeedback(drop, points);

    // Remove the clicked drop
    drop.style.animation = 'none'; // Stop falling animation
    drop.style.opacity = '0'; // Fade out
    drop.style.transform = 'scale(0.5)'; // Shrink
    setTimeout(() => drop.remove(), 150); // Remove from DOM

    // No early game end: players can keep building impact until time runs out.
}

/**
 * Shows floating text feedback when points are scored
 */
function showPointsFeedback(drop, points) {
    const containerRect = elements.gameContainer.getBoundingClientRect();
    const dropRect = drop.getBoundingClientRect();

    const feedback = document.createElement('div');
    feedback.style.position = 'absolute';
    feedback.style.left = `${dropRect.left - containerRect.left + (dropRect.width / 2)}px`;
    feedback.style.top = `${dropRect.top - containerRect.top}px`;
    feedback.style.fontSize = '24px';
    feedback.style.fontWeight = 'bold';
    feedback.style.pointerEvents = 'none';
    feedback.style.animation = 'popUp 1s ease-out forwards';
    feedback.textContent = (points > 0 ? '+' : '') + points;
    feedback.style.color = points > 0 ? '#2E9DF7' : '#FF902A';
    feedback.style.textShadow = '2px 2px 4px rgba(0,0,0,0.3)';

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
        if (event.key === 'ArrowLeft') {
            inputState.leftPressed = true;
            event.preventDefault();
        }

        if (event.key === 'ArrowRight') {
            inputState.rightPressed = true;
            event.preventDefault();
        }
    });

    window.addEventListener('keyup', (event) => {
        if (event.key === 'ArrowLeft') {
            inputState.leftPressed = false;
        }

        if (event.key === 'ArrowRight') {
            inputState.rightPressed = false;
        }
    });

    const moveToTouchX = (clientX) => {
        const containerRect = elements.gameContainer.getBoundingClientRect();
        const bucketWidth = elements.bucket.offsetWidth;
        gameState.touchTargetX = clientX - containerRect.left - (bucketWidth / 2);
    };

    elements.gameContainer.addEventListener('touchstart', (event) => {
        const touch = event.touches[0];
        if (!touch) return;
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
    });

    elements.gameContainer.addEventListener('touchcancel', () => {
        gameState.touchTargetX = null;
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
    elements.bucket.style.transform = 'none';
}

function updateBucketMovement() {
    ensureBucketPosition();

    let direction = 0;
    if (inputState.leftPressed) direction -= 1;
    if (inputState.rightPressed) direction += 1;

    if (direction !== 0) {
        gameState.bucketVelocity += direction * gameState.bucketAcceleration;
    }

    if (gameState.touchTargetX !== null) {
        // Spring-like pull toward finger position for smooth touch control.
        const distanceToTarget = gameState.touchTargetX - gameState.bucketX;
        gameState.bucketVelocity += distanceToTarget * 0.12;
    }

    if (direction === 0 && gameState.touchTargetX === null) {
        gameState.bucketVelocity *= gameState.bucketFriction;
    }

    const maxSpeed = gameState.bucketMaxSpeed;
    gameState.bucketVelocity = Math.max(-maxSpeed, Math.min(maxSpeed, gameState.bucketVelocity));

    if (Math.abs(gameState.bucketVelocity) < 0.05) {
        gameState.bucketVelocity = 0;
    }

    if (gameState.bucketVelocity !== 0) {
        setBucketX(gameState.bucketX + gameState.bucketVelocity);
    }
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

function gameLoop() {
    if (gameState.isRunning) {
        updateBucketMovement();
        checkDropCollisions();
    }

    requestAnimationFrame(gameLoop);
}

/**
 * Shows feedback message at the top of the screen
 * These are the action messages like "You collected clean water!"
 */
function showFeedbackMessage(message) {
    // Create message element
    const messageBox = document.createElement('div');
    messageBox.textContent = message;
    messageBox.style.position = 'fixed';
    messageBox.style.top = '10px';
    messageBox.style.left = '50%';
    messageBox.style.transform = 'translateX(-50%)';
    messageBox.style.backgroundColor = '#FFC907';
    messageBox.style.color = '#000';
    messageBox.style.padding = '12px 24px';
    messageBox.style.borderRadius = '8px';
    messageBox.style.fontSize = '16px';
    messageBox.style.fontWeight = 'bold';
    messageBox.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    messageBox.style.zIndex = '999';
    messageBox.style.animation = 'slideDown 0.3s ease-out, slideUp 0.3s ease-in 1.7s forwards';
    messageBox.style.pointerEvents = 'none';
    messageBox.style.maxWidth = '90vw';

    document.body.appendChild(messageBox);

    // Define slide animations for message
    if (!document.getElementById('message-style')) {
        const style = document.createElement('style');
        style.id = 'message-style';
        style.textContent = `
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

    // Remove message after 2 seconds
    setTimeout(() => messageBox.remove(), 2000);
}

// ==========================================
// UI UPDATE FUNCTIONS
// ==========================================

/**
 * Updates the score display
 */
function updateScore() {
    elements.scoreDisplay.textContent = gameState.score;
}

/**
 * Updates the timer display
 */
function updateTimer() {
    elements.timerDisplay.textContent = gameState.timeRemaining;

    // Change color if time is running out (red warning)
    if (gameState.timeRemaining <= 10) {
        elements.timerDisplay.style.color = '#FF4444';
    } else {
        elements.timerDisplay.style.color = '#2E9DF7';
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
    if (elements.confettiCanvas.style.display !== 'none') {
        elements.confettiCanvas.width = window.innerWidth;
        elements.confettiCanvas.height = window.innerHeight;
    }

    gameState.hasBucketPosition = false;
    ensureBucketPosition();
});
