const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const progressBar = document.getElementById('progress-bar');
const attemptVal = document.getElementById('attempt-val');

canvas.width = 800;
canvas.height = 400;

// --- GAME CONSTANTS ---
const CONFIG = {
    GRAVITY: 0.98,
    JUMP_FORCE: -16,
    SHIP_LIFT: -0.9,
    SPEED: 450, // Pixels per second
    GROUND_Y: 350,
    PLAYER_SIZE: 30
};

// --- GAME STATE ---
let state = {
    active: false,
    distance: 0,
    attempts: 1,
    lastTime: 0,
    isPressing: false,
    levelLength: 15000
};

let player = {
    x: 150,
    y: CONFIG.GROUND_Y - CONFIG.PLAYER_SIZE,
    dy: 0,
    rotation: 0,
    mode: 'CUBE', // CUBE or SHIP
    reset() {
        this.y = CONFIG.GROUND_Y - CONFIG.PLAYER_SIZE;
        this.dy = 0;
        this.rotation = 0;
        this.mode = 'CUBE';
    }
};

// --- LEVEL DATA ---
// X positions and types for obstacles
const levelData = [
    {x: 800, type: 'SPIKE'}, {x: 1100, type: 'SPIKE'}, {x: 1400, type: 'SPIKE'},
    {x: 1800, type: 'PORTAL_SHIP'}, {x: 2200, type: 'SPIKE_TOP'}, {x: 2500, type: 'SPIKE_TOP'},
    {x: 3000, type: 'PORTAL_CUBE'}, {x: 3500, type: 'TRIPLE_SPIKE'},
];

// --- INPUT HANDLING ---
function handleInput(isDown) {
    if (!state.active && isDown) {
        startLevel();
    }
    state.isPressing = isDown;
}

window.addEventListener('keydown', (e) => { if (e.code === 'Space' || e.code === 'ArrowUp') handleInput(true); });
window.addEventListener('keyup', (e) => { if (e.code === 'Space' || e.code === 'ArrowUp') handleInput(false); });
window.addEventListener('mousedown', () => handleInput(true));
window.addEventListener('mouseup', () => handleInput(false));

function startLevel() {
    overlay.style.display = 'none';
    state.active = true;
    state.distance = 0;
    player.reset();
    state.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function die() {
    state.attempts++;
    attemptVal.innerText = state.attempts;
    state.distance = 0;
    player.reset();
}

// --- CORE ENGINE ---
function update(dt) {
    if (!state.active) return;

    state.distance += CONFIG.SPEED * dt;

    // Mode-Specific Physics
    if (player.mode === 'CUBE') {
        player.dy += CONFIG.GRAVITY;
        // Jump logic
        if (player.y + CONFIG.PLAYER_SIZE >= CONFIG.GROUND_Y) {
            player.y = CONFIG.GROUND_Y - CONFIG.PLAYER_SIZE;
            player.dy = 0;
            if (state.isPressing) player.dy = CONFIG.JUMP_FORCE;
            player.rotation = 0;
        } else {
            player.rotation += 450 * dt; // Smooth 90-degree feel
        }
    } else if (player.mode === 'SHIP') {
        player.dy += state.isPressing ? CONFIG.SHIP_LIFT : CONFIG.GRAVITY * 0.6;
        player.dy = Math.max(Math.min(player.dy, 8), -8); // Velocity cap
        player.rotation = player.dy * 2;
    }

    player.y += player.dy;

    // Screen Bounds
    if (player.y < 0) { player.y = 0; player.dy = 0; }
    if (player.y + CONFIG.PLAYER_SIZE > CONFIG.GROUND_Y && player.mode === 'SHIP') die();

    // Collision Detection
    levelData.forEach(obj => {
        let relX = obj.x - state.distance;
        if (relX > 100 && relX < 200) { // Broad phase
            if (obj.type.includes('PORTAL')) {
                player.mode = obj.type.includes('SHIP') ? 'SHIP' : 'CUBE';
            } else if (player.x < relX + 30 && player.x + CONFIG.PLAYER_SIZE > relX) {
                // Precise Spike Collision
                if (player.y + CONFIG.PLAYER_SIZE > CONFIG.GROUND_Y - 25) die();
            }
        }
    });

    // Progress Bar
    progressBar.style.width = Math.min((state.distance / state.levelLength) * 100, 100) + "%";
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background Grid
    ctx.strokeStyle = '#111';
    let offset = -(state.distance % 50);
    for (let x = offset; x < canvas.width; x += 50) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }

    // Floor
    ctx.fillStyle = '#000c1a';
    ctx.fillRect(0, CONFIG.GROUND_Y, canvas.width, 50);
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-1, CONFIG.GROUND_Y, canvas.width + 2, 2);

    // Player
    ctx.save();
    ctx.translate(player.x + CONFIG.PLAYER_SIZE/2, player.y + CONFIG.PLAYER_SIZE/2);
    ctx.rotate(player.rotation * Math.PI / 180);
    ctx.fillStyle = '#00ffff';
    ctx.shadowBlur = 10; ctx.shadowColor = '#00ffff';
    ctx.fillRect(-CONFIG.PLAYER_SIZE/2, -CONFIG.PLAYER_SIZE/2, CONFIG.PLAYER_SIZE, CONFIG.PLAYER_SIZE);
    ctx.strokeRect(-CONFIG.PLAYER_SIZE/2, -CONFIG.PLAYER_SIZE/2, CONFIG.PLAYER_SIZE, CONFIG.PLAYER_SIZE);
    ctx.restore();

    // Obstacles
    levelData.forEach(obj => {
        let relX = obj.x - state.distance;
        if (relX < -100 || relX > 900) return;

        if (obj.type === 'SPIKE') {
            ctx.fillStyle = '#ff3333';
            ctx.shadowBlur = 5; ctx.shadowColor = 'red';
            ctx.beginPath();
            ctx.moveTo(relX, CONFIG.GROUND_Y);
            ctx.lineTo(relX + 15, CONFIG.GROUND_Y - 30);
            ctx.lineTo(relX + 30, CONFIG.GROUND_Y);
            ctx.fill();
        } else if (obj.type.includes('PORTAL')) {
            ctx.fillStyle = obj.type.includes('SHIP') ? '#ff00ff' : '#00ff00';
            ctx.fillRect(relX, 50, 15, 300);
        }
    });
}

function gameLoop(currentTime) {
    if (!state.active) return;
    let dt = (currentTime - state.lastTime) / 1000;
    if (dt > 0.1) dt = 0.016; // Prevent massive jumps on tab focus
    state.lastTime = currentTime;

    update(dt);
    draw();
    requestAnimationFrame(gameLoop);
}
