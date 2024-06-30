const container = document.getElementById('lava-lamp-container');
const audio = document.getElementById("myAudio");
const unmuteIcon = document.getElementById('unmute-icon');
const muteIcon = document.getElementById('mute-icon');
const overlay = document.getElementById('overlay');
const playButton = document.getElementById('play-button');
const volumeControl = document.getElementById('volume-control');
const bubbles = [];
const MAX_BUBBLES = 40; // Maximum number of bubbles allowed on screen
const MAX_MERGES = 1; // Maximum number of merges allowed per bubble
const MERGE_DURATION = 1000; // Duration of merge animation in milliseconds
const SLOW_DOWN_FACTOR = 0.05; // Factor by which the bubbles slow down during merging
const MAX_SPEED = 1.25; // Maximum speed for bubbles
const BUBBLE_CREATION_INTERVAL = 500; // Interval for creating new bubbles
const OFFSCREEN_DURATION = 12000; // Duration for bubbles to move off screen
const MOVE_OFFSCREEN_FORCE = 1; // Force applied to move bubbles offscreen

let BackGroundColorCase = 0;
let bubbleCreationIntervalId;
let isMovingOffScreen = false;

class Bubble {
    constructor() {
        this.element = document.createElement('div');
        this.element.classList.add('lava-bubble');
        this.initBubble();
        container.appendChild(this.element);
        this.isMerging = false; // Flag to check if the bubble is in the process of merging

    }

    initBubble() {
        this.size = Math.random() * 100 + 50;
        this.element.style.width = `${this.size}px`;
        this.element.style.height = `${this.size}px`;
        this.element.style.display = 'initial';

        this.hue = Math.random() * 360; // Initial random hue
        this.mergeCount = 0; // Reset merge count
        this.isMerging = true;

        const side = Math.random();
        if (side < 0.25) {
            this.x = -this.size; // Left
            this.y = Math.random() * window.innerHeight;
            this.vx = Math.random() * MAX_SPEED;
            this.vy = Math.random() * MAX_SPEED - MAX_SPEED / 2;
        } else if (side < 0.5) {
            this.x = window.innerWidth; // Right
            this.y = Math.random() * window.innerHeight;
            this.vx = -Math.random() * MAX_SPEED;
            this.vy = Math.random() * MAX_SPEED - MAX_SPEED / 2;
        } else if (side < 0.75) {
            this.x = Math.random() * window.innerWidth;
            this.y = -this.size; // Top
            this.vx = Math.random() * MAX_SPEED - MAX_SPEED / 2;
            this.vy = Math.random() * MAX_SPEED;
        } else {
            this.x = Math.random() * window.innerWidth;
            this.y = window.innerHeight; // Bottom
            this.vx = Math.random() * MAX_SPEED - MAX_SPEED / 2;
            this.vy = -Math.random() * MAX_SPEED;
        }

        this.isMerging = false;
        this.updatePosition();
        this.updateColor();
    }

    updatePosition() {
        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;
    }

    updateColor() {
        this.hue += 0.4; // Slower hue increment for slower color change
        if (this.hue >= 360) this.hue = 0; // Reset hue to stay within 0-360
        this.element.style.backgroundColor = `hsl(${this.hue}, 100%, 50%)`; // Use HSL for smooth transition
    }

    move() {
        this.x += this.vx;
        this.y += this.vy;
        this.updatePosition();
        this.updateColor(); // Update color as bubble moves
    }

    isOffScreen() {
        return (
            this.x + this.size < 0 ||
            this.x > window.innerWidth ||
            this.y + this.size < 0 ||
            this.y > window.innerHeight
        );
    }

    isFullyOnScreen() {
        return (
            this.x >= 0 &&
            this.x + this.size <= window.innerWidth &&
            this.y >= 0 &&
            this.y + this.size <= window.innerHeight
        );
    }

    shrink() {
        const shrinkInterval = setInterval(() => {
            if (this.size > 0) {
                this.size -= 2; // Shrink size by 2 pixels
                this.element.style.width = `${this.size}px`;
                this.element.style.height = `${this.size}px`;
            } else {
                clearInterval(shrinkInterval);
                if (container.contains(this.element)) {
                    container.removeChild(this.element);
                }
            }
        }, 100); // Shrink every 100ms
    }

    collide(other) {
        const dx = other.x + other.size / 2 - (this.x + this.size / 2);
        const dy = other.y + other.size / 2 - (this.y + this.size / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (this.size + other.size) / 2;
    }

    merge(other) {
        this.isMerging = true; // Set merging flag
        other.isMerging = true; // Set merging flag

        // Calculate target size for the larger bubble
        const largerBubble = this.size >= other.size ? this : other;
        const smallerBubble = this.size < other.size ? this : other;

        const initialSize = largerBubble.size;
        const targetSize = Math.sqrt(Math.PI * (largerBubble.size / 2) ** 2 + Math.PI * (smallerBubble.size / 2) ** 2) * 2;

        const targetX = (largerBubble.x * largerBubble.size + smallerBubble.x * smallerBubble.size) / (largerBubble.size + smallerBubble.size);
        const targetY = (largerBubble.y * largerBubble.size + smallerBubble.y * smallerBubble.size) / (largerBubble.size + smallerBubble.size);

        const targetVx = (largerBubble.vx * largerBubble.size + smallerBubble.vx * smallerBubble.size) / (largerBubble.size + smallerBubble.size) * SLOW_DOWN_FACTOR;
        const targetVy = (largerBubble.vy * largerBubble.size + smallerBubble.vy * smallerBubble.size) / (largerBubble.size + smallerBubble.size) * SLOW_DOWN_FACTOR;

        const initialHue = largerBubble.hue;
        const targetHue = smallerBubble.hue;

        const mergeStartTime = Date.now();
        const animateMerge = () => {
            const elapsed = Date.now() - mergeStartTime;
            const progress = Math.min(elapsed / MERGE_DURATION, 1);

            // Animate the larger bubble's growth
            largerBubble.size = initialSize + (targetSize - initialSize) * progress;
            largerBubble.x = largerBubble.x + (targetX - largerBubble.x) * progress;
            largerBubble.y = largerBubble.y + (targetY - largerBubble.y) * progress;
            largerBubble.vx = largerBubble.vx + (targetVx - largerBubble.vx) * progress;
            largerBubble.vy = largerBubble.vy + (targetVy - largerBubble.vy) * progress;
            largerBubble.hue = initialHue + (targetHue - initialHue) * progress;

            largerBubble.element.style.width = `${largerBubble.size}px`;
            largerBubble.element.style.height = `${largerBubble.size}px`;
            largerBubble.element.style.left = `${largerBubble.x}px`;
            largerBubble.element.style.top = `${largerBubble.y}px`;
            largerBubble.element.style.backgroundColor = `hsl(${largerBubble.hue}, 100%, 50%)`;

            // Shrink the smaller bubble until it disappears
            smallerBubble.size *= 1 - progress;
            smallerBubble.element.style.width = `${smallerBubble.size}px`;
            smallerBubble.element.style.height = `${smallerBubble.size}px`;

            if (progress < 1) {
                requestAnimationFrame(animateMerge);
            } else {
                this.isMerging = true; // Reset merging flag for this bubble
                if (container.contains(smallerBubble.element)) {
                    container.removeChild(smallerBubble.element); // Remove the smaller bubble
                }
                bubbles.splice(bubbles.indexOf(smallerBubble), 1); // Remove smaller bubble from array
            }
        };
        animateMerge();
        this.mergeCount++;

    }

    bounce(other) {

        if (this.isOffScreen() || other.isOffScreen()) {
            return; // Exit without bouncing if either bubble is off-screen
        } else if (isMovingOffScreen == true) {
            return;
        }

        // Calculate initial velocities
        const vx1 = this.vx;
        const vy1 = this.vy;
        const vx2 = other.vx;
        const vy2 = other.vy;

        // Calculate mass (size) of each bubble
        const m1 = this.size;
        const m2 = other.size;

        // Calculate velocities after collision (elastic collision formula)
        const newVx1 = (vx1 * (m1 - m2) + 2 * m2 * vx2) / (m1 + m2);
        const newVy1 = (vy1 * (m1 - m2) + 2 * m2 * vy2) / (m1 + m2);
        const newVx2 = (vx2 * (m2 - m1) + 2 * m1 * vx1) / (m1 + m2);
        const newVy2 = (vy2 * (m2 - m1) + 2 * m1 * vy1) / (m1 + m2);

        // Limit velocities to MAX_SPEED
        this.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, newVx1));
        this.vy = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, newVy1));
        other.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, newVx2));
        other.vy = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, newVy2));
    }

    moveOffScreen() {
        const angle = Math.atan2(
            this.y - window.innerHeight / 2,
            this.x - window.innerWidth / 2
        );

        this.vx = Math.cos(angle) * MOVE_OFFSCREEN_FORCE + MOVE_OFFSCREEN_FORCE;
        this.vy = Math.sin(angle) * MOVE_OFFSCREEN_FORCE + MOVE_OFFSCREEN_FORCE;
    }
}

function createBubble() {
    if (bubbles.length < MAX_BUBBLES && !isMovingOffScreen) {
        const bubble = new Bubble();
        bubbles.push(bubble);
    }
}

function animate() {
    for (let i = bubbles.length - 1; i >= 0; i--) {
        const bubble = bubbles[i];
        bubble.move();

        if (!isMovingOffScreen) {
            for (let j = i - 1; j >= 0; j--) {
                const otherBubble = bubbles[j];

                if (bubble.collide(otherBubble)) {
                    if (!bubble.isMerging && !otherBubble.isMerging) {
                        if (bubble.mergeCount < MAX_MERGES && otherBubble.mergeCount < MAX_MERGES) {
                            if (bubble.isFullyOnScreen() && otherBubble.isFullyOnScreen()) {
                                bubble.merge(otherBubble);
                            } else {
                                bubble.bounce(otherBubble);
                            }
                        } else {
                            bubble.bounce(otherBubble);
                        }
                    } else {
                        // Allow interaction with merging bubbles but handle smoothly
                        const dx = (otherBubble.x + otherBubble.size / 2) - (bubble.x + bubble.size / 2);
                        const dy = (otherBubble.y + otherBubble.size / 2) - (bubble.y + bubble.size / 2);
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const overlap = (bubble.size + otherBubble.size) / 2 - distance;

                        if (overlap > 0) {
                            const adjustX = (dx / distance) * overlap / 2;
                            const adjustY = (dy / distance) * overlap / 2;

                            bubble.x -= adjustX;
                            bubble.y -= adjustY;
                            otherBubble.x += adjustX;
                            otherBubble.y += adjustY;

                            bubble.updatePosition();
                            otherBubble.updatePosition();
                        }
                    }
                    bubble.bounce(otherBubble);
                }
            }
        }

        if (bubble.isOffScreen()) {
            if (isMovingOffScreen == false) {
                bubble.initBubble(); // Reset and recycle bubble
            }
        }
    }

    requestAnimationFrame(animate);
}

function startBubbles() {
    if (isMovingOffScreen == false) {
        // Create initial bubbles continuously
        bubbleCreationIntervalId = setInterval(createBubble, BUBBLE_CREATION_INTERVAL);
    }
    // Start the animation
    animate();
}

function stopBubbles() {
    // Stop creating new bubbles
    clearInterval(bubbleCreationIntervalId);
    // Move existing bubbles off screen
    isMovingOffScreen = true;
    bubbles.forEach(bubble => bubble.moveOffScreen());
    simulateKeyPress('m');
    // Check and forcefully remove bubbles after OFFSCREEN_DURATION
    setTimeout(() => {
        for (let i = bubbles.length - 1; i >= 0; i--) {
            const bubble = bubbles[i];
            bubble.shrink(); // Shrink and remove the bubble
        }
        bubbles.length = 0; // Clear the bubbles array
        isMovingOffScreen = false;
    }, OFFSCREEN_DURATION);
}

audio.addEventListener('ended', () => {
    simulateKeyPress('m');
    stopBubbles();
    setTimeout(() => {
        if (BackGroundColorCase < 4) {
            BackGroundColorCase++;
        } else {
            BackGroundColorCase = 0;
        }
        switch (BackGroundColorCase) {
            case 0:
                container.style.background = 'linear-gradient(to bottom right, #300018, #000042)';
                break;
            case 1:
                container.style.background = 'linear-gradient(to bottom right, #004400, #0033cc)';
                break;
            case 2:
                container.style.background = 'radial-gradient(circle, rgba(153,111,129,1) 0%, rgba(79,101,126,1) 100%)';
                break
            case 3:
                container.style.background = 'linear-gradient(90deg, rgba(98,29,64,1) 0%, rgba(11,77,148,1) 100%)';
                break
            case 4:
                container.style.background = 'linear-gradient(90deg, rgba(97,98,29,1) 0%, rgba(27,82,94,1) 100%)';
                break
            default:
                container.style.background = 'linear-gradient(to bottom right, #300018, #000042)';
                break;
        }
        audio.play();
        startBubbles();
    }, OFFSCREEN_DURATION);
});

// Start the audio and bubbles initially after user interaction
document.addEventListener('DOMContentLoaded', () => {
    const audio = document.getElementById("myAudio");
    const container = document.getElementById('lava-lamp-container');
    function startInteraction() {
        console.log('User interacted, starting the action...');

        audio.play().then(() => {
            console.log('Audio is playing');
            startBubbles();
        }).catch((error) => {
            console.log("Audio play was prevented by the browser:", error);
        });

        // Remove the event listeners after the first interaction
        document.removeEventListener('mousemove', startInteraction);
    }

    // Function to check if document is fully loaded
    function checkReadyState() {
        if (document.readyState === 'complete') {
            document.addEventListener('mousemove', startInteraction);
        } else {
            // If not loaded, wait for it
            window.addEventListener('load', () => {
                document.addEventListener('mousemove', startInteraction);
            });
        }
    }
    checkReadyState();
});

function simulateKeyPress(key) {
    // Create a new KeyboardEvent
    const event = new KeyboardEvent('keydown', {
        key: key,
        keyCode: key.charCodeAt(0),
        code: 'Key' + key.toUpperCase(),
        which: key.charCodeAt(0),
        bubbles: true,
        cancelable: true
    });

    // Dispatch the event on the document
    document.dispatchEvent(event);
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'm') {
        for (let a = 1; a <= 5; a++) {
            bubbles.forEach(bubble => bubble.moveOffScreen());
        }
    }
});

// Skip to the end of the song for testing
document.addEventListener('keydown', (event) => {
    if (event.key === 's') {
        audio.currentTime = audio.duration - 5;
    }
});
// Function to toggle sound
function toggleSound() {
    if (audio.muted) {
        audio.muted = false;
        muteIcon.style.display = 'none';
        unmuteIcon.style.display = 'block';
    } else {
        audio.muted = true;
        unmuteIcon.style.display = 'none';
        muteIcon.style.display = 'block';
    }
}

// Add click event listener to the sound icon
unmuteIcon.parentElement.addEventListener('click', toggleSound);
muteIcon.parentElement.addEventListener('click', toggleSound);

volumeControl.addEventListener('input', (event) => {
    audio.volume = event.target.value;
});