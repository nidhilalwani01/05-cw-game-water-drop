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
    timerInterval: null,        // Store timer so we can stop it
    dropInterval: null,         // Store drop creation so we can stop it
};

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
};

// ==========================================
// EVENT LISTENERS - Attach buttons to game functions
// ==========================================

elements.startBtn.addEventListener('click', startGame);
elements.resetBtn.addEventListener('click', resetGame);
elements.playAgainBtn.addEventListener('click', resetGame);

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

    // Check if player won
    if (gameState.score >= gameState.targetScore) {
        elements.gameOverTitle.textContent = '🎉 YOU DID IT! 🎉';
        elements.gameOverTitle.style.color = '#FFC907';
        elements.resultMessage.textContent = 
            `You brought clean water to 1 family. Every drop counts! 💧`;
        playConfetti();
    } else {
        elements.gameOverTitle.textContent = 'Game Over';
        elements.gameOverTitle.style.color = '#FF902A';
        elements.resultMessage.textContent = 
            `Almost there! Keep collecting to bring water to more families. You need ${gameState.targetScore} points.`;
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
        size = 50 + Math.random() * 15; // 50-65px
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

    // Add click listener to score points
    drop.addEventListener('click', (e) => {
        scorePoints(drop, points);
        e.stopPropagation(); // Prevent event bubbling
    });

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
    drop.removeEventListener('animationend', null); // Remove animation listener
    drop.style.animation = 'none'; // Stop falling animation
    drop.style.opacity = '0'; // Fade out
    drop.style.transform = 'scale(0.5)'; // Shrink
    setTimeout(() => drop.remove(), 150); // Remove from DOM

    // CHECK FOR EARLY WIN (reach target before time runs out)
    if (gameState.isRunning && gameState.score >= gameState.targetScore) {
        endGame();
    }
}

/**
 * Shows floating text feedback when points are scored
 */
function showPointsFeedback(drop, points) {
    const feedback = document.createElement('div');
    feedback.style.position = 'absolute';
    feedback.style.left = drop.style.left;
    feedback.style.top = drop.style.top;
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
});
