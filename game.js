// ================================================================
//  🎮 GAME.JS — «КИСКИ VS КРЫСКИ» — финальная версия
// ================================================================

const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.('#0d001a');
    tg.setBackgroundColor?.('#0d001a');
}

const $ = id => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

let TILE = 24, COLS = 19, ROWS = 19;

function resize() {
    const hudW = $('hud').offsetWidth || 130;
    const topbarH = $('topbar')?.offsetHeight || 60;
    const availW = window.innerWidth - hudW - 30;
    const availH = window.innerHeight - topbarH - 30;
    TILE = Math.floor(Math.min(availW / COLS, availH / ROWS));
    if (TILE < 8) TILE = 8;
    canvas.width = TILE * COLS;
    canvas.height = TILE * ROWS;
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
}
window.addEventListener('resize', resize);

function toast(text, subtitle = '') {
    const box = $('toast-container');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = subtitle ? `<b>${text}</b><br><small>${subtitle}</small>` : text;
    box.appendChild(el);
    setTimeout(() => {
        el.style.transition = 'opacity 0.3s';
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 300);
    }, 2500);
}

const DIRS = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
    left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};

let maze = null;
let levelConfig = null;
let score = 0;
let lives = 3;
let level = 1;
let bestScore = 0;
let paused = false;
let gameOver = false;
let rat = null;
let cats = [];
let boss = null;
let particles = [];
let floatingTexts = [];
let bonuses = { speed: 0, invincible: 0 };
let lastTime = performance.now();
let animTime = 0;
let joystickActive = false;
let ghostEatCombo = 0;

let levelCleared = false;
let awaitingLevelStart = false;

let trapInventory = 0;
let placedTraps = [];

let catHouse = [1, 1];

// === УПРАВЛЕНИЕ ===
let controlMode = 'magnet';
let heldKeys = new Set();
let touchStart = null;
// === МОБИЛЬНОЕ УПРАВЛЕНИЕ ===
const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
              || window.matchMedia('(hover: none)').matches;

let mobileControlType = 'joystick';

function loadMobileControlType() {
    try {
        const saved = localStorage.getItem('rat_mobile_control');
        if (saved === 'joystick' || saved === 'dpad') mobileControlType = saved;
    } catch (e) {}
    applyMobileControlType();
}

function saveMobileControlType() {
    try {
        localStorage.setItem('rat_mobile_control', mobileControlType);
    } catch (e) {}
}

function applyMobileControlType() {
    if (!isMobile) return;
    const joy = $('joystick');
    const dpad = $('dpad');
    const icon = $('control-icon');
    if (!joy || !dpad) return;

    if (mobileControlType === 'joystick') {
        joy.classList.remove('hidden');
        dpad.classList.add('hidden');
        if (icon) icon.textContent = '🕹';
    } else {
        joy.classList.add('hidden');
        dpad.classList.remove('hidden');
        if (icon) icon.textContent = '⬅➡';
    }
}

function toggleMobileControlType() {
    mobileControlType = mobileControlType === 'joystick' ? 'dpad' : 'joystick';
    saveMobileControlType();
    applyMobileControlType();
    audio.button();
}

function updateMobileControlsVisibility() {
    const mc = $('mobile-controls');
    if (!mc) return;
    if (isMobile && !awaitingLevelStart && !gameOver && !paused && !levelCleared) {
        mc.classList.remove('hidden');
    } else {
        mc.classList.add('hidden');
    }
}

// === D-pad обработчики ===
function initDpad() {
    document.querySelectorAll('.dpad-btn').forEach(btn => {
        const dir = btn.dataset.dir;

        btn.addEventListener('touchstart', e => {
            e.preventDefault();
            audio.init();
            if (awaitingLevelStart) { continueToNextLevel(); return; }
            if (controlMode === 'classic') heldKeys.add(dir);
            setDirection(dir);
        }, { passive: false });

        btn.addEventListener('touchend', e => {
            e.preventDefault();
            if (controlMode === 'classic') heldKeys.delete(dir);
        }, { passive: false });

        btn.addEventListener('touchcancel', () => {
            if (controlMode === 'classic') heldKeys.delete(dir);
        });

        btn.addEventListener('mousedown', e => {
            e.preventDefault();
            audio.init();
            if (controlMode === 'classic') heldKeys.add(dir);
            setDirection(dir);
        });

        btn.addEventListener('mouseup', () => {
            if (controlMode === 'classic') heldKeys.delete(dir);
        });

        btn.addEventListener('mouseleave', () => {
            if (controlMode === 'classic') heldKeys.delete(dir);
        });
    });

    $('control-toggle-btn')?.addEventListener('click', toggleMobileControlType);
}

function loadControlMode() {
    try {
        const saved = localStorage.getItem('rat_controls');
        if (saved === 'classic' || saved === 'magnet') controlMode = saved;
    } catch (e) {}
    updateControlsButton();
}

function saveControlMode() {
    try {
        localStorage.setItem('rat_controls', controlMode);
    } catch (e) {}
}

function toggleControlMode() {
    controlMode = controlMode === 'magnet' ? 'classic' : 'magnet';
    saveControlMode();
    updateControlsButton();
    toast(`🎮 CONTROLS: ${controlMode.toUpperCase()}`,
        controlMode === 'magnet'
            ? 'Magnet — поворот с запасом'
            : 'Classic — шаг за шагом');
}

function updateControlsButton() {
    const label = `🎮 CONTROLS: ${controlMode.toUpperCase()}`;
    const btn1 = $('controls-toggle');
    const btn2 = $('pause-controls-btn');
    if (btn1) btn1.textContent = label;
    if (btn2) btn2.textContent = label;
}

// === МУЗЫКА ===
function playLevelMusic() {
    if (!audio.musicEnabled) return;
    if (levelConfig?.hasBoss) {
        audio.startMusic(3);
    } else {
        audio.startMusic((level - 1) % 3);
    }
}

// ================================================================
//  ИНИЦИАЛИЗАЦИЯ
// ================================================================
function resetGame() {
    score = 0;
    lives = 3;
    level = 1;
    paused = false;
    gameOver = false;
    animTime = 0;
    lastTime = performance.now();
    particles = [];
    floatingTexts = [];
    bonuses = { speed: 0, invincible: 0 };
    ghostEatCombo = 0;
    trapInventory = 0;
    placedTraps = [];
    levelCleared = false;
    awaitingLevelStart = false;
    heldKeys.clear();

    $('next-level-btn').classList.add('hidden');
    $('level-complete-overlay').classList.add('hidden');

    loadLevel(level);
    updateHUD();
    hideOverlays();
    playLevelMusic();
}

function loadLevel(num) {
    bonuses.speed = 0;
    bonuses.invincible = 0;
    updateBonusIndicators();

    levelCleared = false;
    awaitingLevelStart = false;

    levelConfig = buildLevel(num);
    COLS = levelConfig.cols;
    ROWS = levelConfig.rows;
    maze = levelConfig.maze;
    catHouse = levelConfig.catHouse;

    resize();

    const [rx, ry] = levelConfig.ratStart;
    rat = {
        x: rx, y: ry, px: rx, py: ry,
        dir: null, nextDir: null,
        baseSpeed: levelConfig.ratSpeed,
        startX: rx, startY: ry,
        moving: false, animFrame: 0,
    };

    cats = [];
    for (let i = 0; i < levelConfig.catCount; i++) {
        const [cx, cy] = levelConfig.catStarts[i] || levelConfig.catStarts[0];
        cats.push(makeCat(cx, cy, i, levelConfig.catSpeed));
    }

    boss = null;
    if (levelConfig.hasBoss && levelConfig.bossStart) {
        const [bx, by] = levelConfig.bossStart;
        boss = makeBoss(bx, by, levelConfig.bossSpeed, levelConfig.bossHp,
                        levelConfig.bossWave, levelConfig.isFinalBoss);
    }

    placedTraps = [];
    trapInventory += 1;
    updateTrapButton();

    if (window.matchMedia('(hover: hover)').matches) {
        $('joystick').classList.add('hidden');
        $('trap-btn').classList.add('hidden');
    } else {
        $('joystick').classList.remove('hidden');
        $('trap-btn').classList.remove('hidden');
    }

    heldKeys.clear();
    $('level-complete-overlay').classList.add('hidden');

    if (levelConfig.hasBoss) {
        setTimeout(() => showBossWarning(levelConfig.bossWave, levelConfig.isFinalBoss), 400);
    }
    updateMobileControlsVisibility();
}

function makeCat(x, y, colorIdx, baseSpeed) {
    return {
        x, y, px: x, py: y,
        dir: DIRS.left, lastDir: 'left',
        colorIdx,
        color: CAT_COLORS[colorIdx % CAT_COLORS.length],
        spriteName: ['cat-red', 'cat-orange', 'cat-blue', 'cat-pink', 'cat-green'][colorIdx % 5],
        stunnedSprite: ['stunned-red', 'stunned-orange', 'stunned-blue', 'stunned-pink', 'stunned-green'][colorIdx % 5],
        baseSpeed,
        mode: 'scatter',
        frightenedTimer: 0, respawnTimer: 0,
        stunnedTimer: 0,
        startX: x, startY: y,
        animFrame: 0,
        isBoss: false,
        chaseChance: 0.08,
        chaseDuration: 0,
    };
}

function makeBoss(x, y, baseSpeed, hp, wave = 1, isFinal = false) {
    return {
        x, y, px: x, py: y,
        dir: DIRS.left, lastDir: 'left',
        baseSpeed,
        color: isFinal ? '#ff006e' : '#f100ff',
        spriteName: isFinal ? 'cat-red' : 'cat-pink',
        stunnedSprite: isFinal ? 'stunned-red' : 'stunned-pink',
        mode: 'chase',
        frightenedTimer: 0, respawnTimer: 0,
        stunnedTimer: 0,
        hitUnderPower: false,
        hp, maxHp: hp,
        wave,
        isBoss: true,
        isFinal,
        phase: 1,
        phaseTransitioning: false,
        lastSummonTime: 0,
        summonCooldown: 12000,
        startX: x, startY: y,
        animFrame: 0,
    };
}

function updateHUD() {
    $('score').textContent = score;
    $('level').textContent = level;
    $('traps').textContent = trapInventory;
    if (score > bestScore) bestScore = score;
    $('best').textContent = bestScore;
    renderHearts(lives);
    updateBonusIndicators();
}

function renderHearts(count) {
    const box = $('lives-hearts');
    if (!box) return;
    let html = '';

    if (count <= 5) {
        for (let i = 0; i < 5; i++) {
            if (i < count) html += '<span class="heart full">❤</span>';
            else html += '<span class="heart empty">❤</span>';
        }
    } else {
        let colorClass = 'bronze';
        if (count >= 21) colorClass = 'turquoise';
        else if (count >= 16) colorClass = 'gold';
        else if (count >= 11) colorClass = 'silver';

        for (let i = 0; i < 5; i++) {
            html += `<span class="heart full ${colorClass}">❤</span>`;
        }
        html += `<span class="heart-count" style="
            font-family: 'Press Start 2P', monospace;
            font-size: 10px;
            color: #ffea00;
            margin-left: 4px;
            text-shadow: 0 0 6px #ffea00;
            align-self: center;
        ">×${count}</span>`;
    }

    box.innerHTML = html;
}

function updateTrapButton() {
    const btn = $('trap-btn');
    if (!btn) return;
    btn.disabled = trapInventory <= 0 || gameOver || paused;
    btn.textContent = `🪤 SET (${trapInventory})`;
}

function updateBonusIndicators() {
    const box = $('bonuses');
    box.innerHTML = '';

    if (bonuses.speed > 0) {
        const el = document.createElement('div');
        el.className = 'bonus-badge';
        const seconds = Math.max(0, bonuses.speed / 1000);
        el.innerHTML = `⚡ ${seconds.toFixed(1)}s`;
        box.appendChild(el);
    }
    if (bonuses.invincible > 0) {
        const el = document.createElement('div');
        el.className = 'bonus-badge';
        const seconds = Math.max(0, bonuses.invincible / 1000);
        el.innerHTML = `🛡 ${seconds.toFixed(1)}s`;
        box.appendChild(el);
    }
}

// ================================================================
//  УПРАВЛЕНИЕ
// ================================================================
function setDirection(dirName) {
    if (!DIRS[dirName] || gameOver || paused || !rat) return;
    if (awaitingLevelStart) return;

    rat.nextDir = dirName;
    audio.init();

    if (controlMode === 'magnet') {
        if (rat.dir !== dirName) {
            const d = DIRS[dirName];
            const nx = Math.round(rat.px) + d.x;
            const ny = Math.round(rat.py) + d.y;
            if (!isWall(nx, ny)) {
                if (atCell(rat)) {
                    rat.dir = dirName;
                    rat.nextDir = null;
                }
            }
        }
    } else {
        if (atCell(rat)) {
            const d = DIRS[dirName];
            const nx = rat.x + d.x;
            const ny = rat.y + d.y;
            if (!isWall(nx, ny)) {
                rat.dir = dirName;
                rat.nextDir = null;
            }
        }
    }
}

function continueToNextLevel() {
    if (!awaitingLevelStart) return;
    awaitingLevelStart = false;
    $('level-complete-overlay').classList.add('hidden');

    level++;
    if (level > LEVEL_CONFIG.MAX_LEVELS) {
        winGame();
        return;
    }

    loadLevel(level);
    updateHUD();
    playLevelMusic();

    const info = levelConfig.hasBoss
        ? (levelConfig.isFinalBoss ? '👑 FINAL BOSS' : `BOSS WAVE ${levelConfig.bossWave}`)
        : `CATS: ${levelConfig.catCount}`;
    toast(`LEVEL ${level}`, info);
}

// === Клавиатура ===
window.addEventListener('keydown', e => {
    if (awaitingLevelStart) {
        if (e.key || e.code) {
            e.preventDefault?.();
            continueToNextLevel();
        }
        return;
    }

    const map = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right',
        KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
    };

    if (map[e.key] || map[e.code]) {
        e.preventDefault();
        const dir = map[e.key] || map[e.code];

        if (controlMode === 'magnet') {
            setDirection(dir);
        } else {
            heldKeys.add(dir);
            setDirection(dir);
        }
    }

    if (e.key === 'Escape' || e.key === 'p') togglePause();
    if (e.key === ' ' || e.key === 'Space') { e.preventDefault(); placeTrap(); }
});

window.addEventListener('keyup', e => {
    const map = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right',
        KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
    };
    const dir = map[e.key] || map[e.code];
    if (dir) heldKeys.delete(dir);
});

canvas.addEventListener('click', () => {
    if (awaitingLevelStart) continueToNextLevel();
});

canvas.addEventListener('touchstart', e => {
    audio.init();
    if (awaitingLevelStart) {
        continueToNextLevel();
        return;
    }
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY };
}, { passive: true });

canvas.addEventListener('touchmove', e => {
    if (!touchStart || awaitingLevelStart) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) setDirection(dx > 0 ? 'right' : 'left');
    else setDirection(dy > 0 ? 'down' : 'up');
    touchStart = { x: t.clientX, y: t.clientY };
}, { passive: true });
canvas.addEventListener('touchend', () => { touchStart = null; }, { passive: true });

// === Джойстик ===
const joystick = $('joystick');
const joystickKnob = $('joystick-knob');
let joystickCenter = null;

function onJoystickStart(e) {
    e.preventDefault();
    if (awaitingLevelStart) { continueToNextLevel(); return; }
    audio.init();
    const rect = joystick.getBoundingClientRect();
    joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    joystickActive = true;
    onJoystickMove(e);
}
function onJoystickMove(e) {
    if (!joystickActive || !joystickCenter || awaitingLevelStart) return;
    const t = e.touches ? e.touches[0] : e;
    const dx = t.clientX - joystickCenter.x;
    const dy = t.clientY - joystickCenter.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, 40);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;
    joystickKnob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
    if (dist > 15) {
        const dir = Math.abs(dx) > Math.abs(dy) ?
            (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        if (controlMode === 'classic') heldKeys.add(dir);
        setDirection(dir);
    }
}
function onJoystickEnd() {
    joystickActive = false;
    joystickKnob.style.transform = 'translate(-50%, -50%)';
    if (controlMode === 'classic') heldKeys.clear();
}
joystick.addEventListener('touchstart', onJoystickStart, { passive: false });
joystick.addEventListener('touchmove', onJoystickMove, { passive: false });
joystick.addEventListener('touchend', onJoystickEnd, { passive: true });
joystick.addEventListener('touchcancel', onJoystickEnd, { passive: true });

$('trap-btn').addEventListener('click', placeTrap);

// ================================================================
//  ЛОВУШКИ
// ================================================================
function placeTrap() {
    if (gameOver || paused || !rat || awaitingLevelStart) return;
    if (trapInventory <= 0) {
        toast('NO TRAPS!', 'Pick up 🪤 in the maze');
        return;
    }
    const tx = Math.round(rat.px);
    const ty = Math.round(rat.py);

    if (isWall(tx, ty)) return;
    if (placedTraps.some(t => t.x === tx && t.y === ty)) return;

    placedTraps.push({ x: tx, y: ty });
    trapInventory--;
    audio.trapSet();
    spawnParticles(tx, ty, '#ff006e', 8);
    showFloatingText(tx, ty, '🪤', '#fff');
    updateHUD();
    updateTrapButton();
}

function checkTrapCollisions() {
    const allEnemies = boss ? [...cats, boss] : cats;

    allEnemies.forEach(cat => {
        if (cat.respawnTimer > 0 || cat.stunnedTimer > 0) return;
        if (cat.mode === 'frightened') return;

        const catCellX = Math.round(cat.px);
        const catCellY = Math.round(cat.py);

        const dxToCenter = Math.abs(cat.px - catCellX);
        const dyToCenter = Math.abs(cat.py - catCellY);
        if (dxToCenter > 0.15 || dyToCenter > 0.15) return;

        for (let i = placedTraps.length - 1; i >= 0; i--) {
            const trap = placedTraps[i];
            if (trap.x === catCellX && trap.y === catCellY) {
                placedTraps.splice(i, 1);
                cat.stunnedTimer = cat.isBoss ? 1500 : 2500;
                cat.mode = 'scatter';
                cat.frightenedTimer = 0;

                cat.px = catCellX;
                cat.py = catCellY;
                cat.x = catCellX;
                cat.y = catCellY;

                audio.trapTrigger();
                audio.catStunned();
                spawnParticles(trap.x, trap.y, '#ff006e', 12);
                showFloatingText(trap.x, trap.y, 'SNAP!', '#ff006e');

                score += cat.isBoss ? 300 : 150;
                updateHUD();
                if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
                return;
            }
        }
    });
}

// ================================================================
//  ГЕОМЕТРИЯ
// ================================================================
function isWall(x, y) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return true;
    if (!maze || !maze[y]) return true;
    return maze[y][x] === 1;
}

function atCell(e) {
    return Math.abs(e.px - e.x) < 0.01 && Math.abs(e.py - e.y) < 0.01;
}

function updatePosition(entity, dt, speed) {
    const dist = speed * dt;
    if (atCell(entity)) return;
    const dx = entity.x - entity.px;
    const dy = entity.y - entity.py;
    const len = Math.hypot(dx, dy);
    if (len <= dist) {
        entity.px = entity.x;
        entity.py = entity.y;
    } else {
        entity.px += (dx / len) * dist;
        entity.py += (dy / len) * dist;
    }
}

function isCellOccupiedByOtherCat(cat, x, y, allEnemies) {
    for (const other of allEnemies) {
        if (other === cat) continue;
        const dx = other.px - x;
        const dy = other.py - y;
        if (Math.hypot(dx, dy) < 0.7) return true;
    }
    return false;
}

// ================================================================
//  КРЫСА
// ================================================================
function updateRat(dt) {
    if (!rat) return;
    let speed = rat.baseSpeed;
    if (bonuses.speed > 0) speed *= 1.6;

    if (controlMode === 'classic') {
        let activeDir = null;
        for (const dir of heldKeys) activeDir = dir;

        if (activeDir) {
            rat.dir = activeDir;
            rat.nextDir = null;
        } else {
            rat.dir = null;
            rat.nextDir = null;
        }
    }

    if (controlMode === 'magnet') {
        if (rat.nextDir) {
            const d = DIRS[rat.nextDir];
            const cellX = Math.round(rat.px);
            const cellY = Math.round(rat.py);
            const targetX = cellX + d.x;
            const targetY = cellY + d.y;
            const distToCenter = Math.hypot(rat.px - cellX, rat.py - cellY);

            if (!isWall(targetX, targetY) && distToCenter < 0.35) {
                rat.px = cellX;
                rat.py = cellY;
                rat.x = cellX;
                rat.y = cellY;
                rat.dir = rat.nextDir;
                rat.nextDir = null;
            }
        }
    }

    if (atCell(rat)) {
        collectTile(rat.x, rat.y);

        if (controlMode === 'classic') {
            let activeDir = null;
            for (const dir of heldKeys) activeDir = dir;

            if (activeDir) {
                const d = DIRS[activeDir];
                if (!isWall(rat.x + d.x, rat.y + d.y)) {
                    rat.dir = activeDir;
                    rat.x = rat.x + d.x;
                    rat.y = rat.y + d.y;
                } else {
                    rat.dir = null;
                }
            } else {
                rat.dir = null;
            }
        } else {
            if (rat.nextDir) {
                const d = DIRS[rat.nextDir];
                if (!isWall(rat.x + d.x, rat.y + d.y)) {
                    rat.dir = rat.nextDir;
                    rat.nextDir = null;
                }
            }
            if (rat.dir) {
                const d = DIRS[rat.dir];
                const nx = rat.x + d.x;
                const ny = rat.y + d.y;
                if (isWall(nx, ny)) rat.dir = null;
                else { rat.x = nx; rat.y = ny; }
            }
        }
    }

    updatePosition(rat, dt, speed);
    rat.moving = !!rat.dir;
    if (rat.moving) rat.animFrame = (rat.animFrame + dt / 100) % 2;
}

function collectTile(x, y) {
    if (!maze || !maze[y]) return;
    const cell = maze[y][x];
    if (cell === 2) {
        maze[y][x] = 0;
        score += 10;
        audio.eatWheat();
        spawnParticles(x, y, '#ffea00', 4);
        updateHUD();
    } else if (cell === 3) {
        maze[y][x] = 0;
        score += 50;
        audio.eatPowerWheat();
        spawnParticles(x, y, '#00f5ff', 10);

        [...cats, boss].filter(Boolean).forEach(c => {
            c.mode = 'frightened';
            c.frightenedTimer = 8000;
            c.hitUnderPower = false;
            c.lastDir = { up: 'down', down: 'up', left: 'right', right: 'left' }[c.lastDir] || c.lastDir;
        });

        ghostEatCombo = 0;
        updateHUD();
    } else if (cell === 4) {
        maze[y][x] = 0;
        score += 30;
        bonuses.speed = 6000;
        audio.eatCheese();
        spawnParticles(x, y, '#ff9500', 8);
        showFloatingText(x, y, '⚡ SPEED!', '#ff9500');
        updateHUD();
    } else if (cell === 5) {
        maze[y][x] = 0;
        score += 30;
        bonuses.invincible = 6000;
        audio.drinkMilk();
        spawnParticles(x, y, '#ffffff', 8);
        showFloatingText(x, y, '🛡 SHIELD!', '#fff');
        updateHUD();
    } else if (cell === 6) {
        maze[y][x] = 0;
        trapInventory++;
        score += 20;
        audio.trapSet();
        spawnParticles(x, y, '#ff006e', 6);
        showFloatingText(x, y, '🪤 +1', '#ff006e');
        updateHUD();
        updateTrapButton();
    }
}

// ================================================================
//  ФАЗЫ БОССА
// ================================================================
function updateBossPhases() {
    if (!boss) return;
    const hpRatio = boss.hp / boss.maxHp;
    let newPhase = 1;
    if (hpRatio > 0.66) newPhase = 1;
    else if (hpRatio > 0.33) newPhase = 2;
    else newPhase = 3;

    if (newPhase !== boss.phase && !boss.phaseTransitioning) {
        boss.phase = newPhase;
        boss.phaseTransitioning = true;
        audio.bossPhaseChange(newPhase);
        showPhaseBanner(newPhase, boss.isFinal);
        spawnParticles(boss.x, boss.y, boss.color, 30);

        setTimeout(() => {
            if (!boss) return;
            boss.phaseTransitioning = false;
            if (boss.phase === 3) {
                audio.bossEnrage();
                boss.baseSpeed *= 1.3;
                boss.frightenedTimer = 0;
                boss.mode = 'chase';
                showBossMessage('💀 PHASE 3 - RAGE', '#ff006e');
                if (boss.isFinal) summonMinions(2);
            }
            if (boss.phase === 2) {
                boss.baseSpeed *= 1.15;
                showBossMessage('⚡ PHASE 2', '#ff9500');
                if (boss.isFinal) summonMinions(1);
            }
        }, 800);

        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('warning');
    }
}

function summonMinions(count) {
    if (!boss || !maze) return;
    audio.bossSummon();

    const empties = [];
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const c = maze[y][x];
            if (c === 0 || c === 2 || c === 3) {
                const dist = Math.hypot(x - rat.px, y - rat.py);
                if (dist > 5) empties.push([x, y]);
            }
        }
    }

    empties.sort((a, b) => {
        const da = Math.hypot(a[0] - boss.px, a[1] - boss.py);
        const db = Math.hypot(b[0] - boss.px, b[1] - boss.py);
        return da - db;
    });

    const spawnCount = Math.min(count, empties.length);
    for (let i = 0; i < spawnCount; i++) {
        const pos = empties[i * 2 + 1] || empties[i];
        if (!pos) continue;
        const [x, y] = pos;
        const minion = makeCat(x, y, cats.length, levelConfig.catSpeed * 0.85);
        minion.isMinion = true;
        minion.color = '#8338ec';
        minion.spriteName = 'cat-pink';
        minion.stunnedSprite = 'stunned-pink';
        minion.mode = 'chase';
        cats.push(minion);
        spawnParticles(x, y, '#8338ec', 12);
    }

    showBossMessage(`👹 BOSS SUMMONS ${spawnCount}!`, '#8338ec');
}

// ================================================================
//  КОШКИ
// ================================================================
function updateCats(dt) {
    if (boss && !boss.phaseTransitioning && boss.isFinal && boss.phase >= 2) {
        const now = performance.now();
        if (now - boss.lastSummonTime > boss.summonCooldown) {
            boss.lastSummonTime = now;
            const count = boss.phase === 3 ? 2 : 1;
            summonMinions(count);
        }
    }

    const allEnemies = boss ? [...cats, boss] : cats;

    allEnemies.forEach(cat => {
        if (cat.stunnedTimer > 0) {
            cat.stunnedTimer -= dt;
            if (cat.stunnedTimer <= 0) cat.mode = 'chase';
            return;
        }

        if (cat.respawnTimer > 0) {
            cat.respawnTimer -= dt;
            if (cat.respawnTimer <= 0) {
                cat.x = cat.startX;
                cat.y = cat.startY;
                cat.px = cat.x;
                cat.py = cat.y;
                cat.mode = 'scatter';
            }
            return;
        }

        if (cat.frightenedTimer > 0) {
            cat.frightenedTimer -= dt;
            if (cat.frightenedTimer <= 0) {
                cat.mode = 'scatter';
                cat.hitUnderPower = false;
            }
        }

        if (atCell(cat)) {
            if (cat.mode !== 'frightened' && !cat.isBoss) {
                cat.chaseDuration -= dt;
                if (cat.chaseDuration <= 0 && cat.mode === 'chase') {
                    cat.mode = 'scatter';
                    cat.chaseDuration = 0;
                }
                if (cat.mode === 'scatter' && cat.chaseDuration <= 0) {
                    if (Math.random() < cat.chaseChance) {
                        cat.mode = 'chase';
                        cat.chaseDuration = 1500 + Math.random() * 2000;
                    }
                }
            }

            const possible = [];
            for (const name in DIRS) {
                const d = DIRS[name];
                const nx = cat.x + d.x;
                const ny = cat.y + d.y;
                if (!isWall(nx, ny)) possible.push({ name, nx, ny });
            }
            if (possible.length === 0) return;

            const back = { up: 'down', down: 'up', left: 'right', right: 'left' };
            const noBack = possible.length > 1
                ? possible.filter(p => p.name !== back[cat.lastDir])
                : possible;
            const choices = noBack.length ? noBack : possible;

            let filteredChoices = choices.filter(p => !isCellOccupiedByOtherCat(cat, p.nx, p.ny, allEnemies));
            if (filteredChoices.length === 0) filteredChoices = choices;

            let best;
            if (cat.mode === 'frightened') {
                best = filteredChoices.reduce((a, b) => {
                    const da = Math.hypot(a.nx - rat.px, a.ny - rat.py);
                    const db = Math.hypot(b.nx - rat.px, b.ny - rat.py);
                    return da > db ? a : b;
                });
            } else if (cat.isBoss || (cat.mode === 'chase' && cat.chaseDuration > 0)) {
                best = filteredChoices.reduce((a, b) => {
                    const da = Math.hypot(a.nx - rat.px, a.ny - rat.py);
                    const db = Math.hypot(b.nx - rat.px, b.ny - rat.py);
                    return da < db ? a : b;
                });
            } else {
                best = filteredChoices[Math.floor(Math.random() * filteredChoices.length)];
            }

            cat.lastDir = best.name;
            cat.x = best.nx;
            cat.y = best.ny;
        }

        let speed = cat.baseSpeed;
        if (cat.mode === 'frightened') speed *= 0.55;
        else if (cat.mode === 'chase') speed *= 1.05;
        else speed *= 0.9;

        updatePosition(cat, dt, speed);
        cat.animFrame = (cat.animFrame + dt / 120) % 2;
    });

    if (bonuses.speed > 0) {
        bonuses.speed -= dt;
        if (bonuses.speed <= 0) { bonuses.speed = 0; updateBonusIndicators(); }
    }
    if (bonuses.invincible > 0) {
        bonuses.invincible -= dt;
        if (bonuses.invincible <= 0) { bonuses.invincible = 0; updateBonusIndicators(); }
    }
}

// ================================================================
//  СТОЛКНОВЕНИЯ
// ================================================================
function checkCollisions() {
    if (gameOver || !rat) return;
    if (levelCleared || awaitingLevelStart) return;

    const allEnemies = boss ? [...cats, boss] : cats;

    allEnemies.forEach(cat => {
        if (cat.respawnTimer > 0 || cat.stunnedTimer > 0) return;

        const d = Math.hypot(cat.px - rat.px, cat.py - rat.py);
        if (d < 0.7) {
            if (cat.mode === 'frightened') {
                if (cat.isBoss) {
                    if (cat.phaseTransitioning) return;
                    if (cat.hitUnderPower) return;

                    cat.hp--;
                    score += 500;
                    audio.eatCat();
                    spawnParticles(cat.x, cat.y, cat.color, 15);
                    showFloatingText(cat.x, cat.y, `BOSS -1 HP (${cat.hp}/${cat.maxHp})`, '#ffea00');

                    cat.hitUnderPower = true;

                    const dx = rat.px - cat.px;
                    const dy = rat.py - cat.py;
                    const len = Math.hypot(dx, dy) || 1;
                    rat.px += (dx / len) * 0.5;
                    rat.py += (dy / len) * 0.5;
                    rat.px = Math.max(0.5, Math.min(COLS - 0.5, rat.px));
                    rat.py = Math.max(0.5, Math.min(ROWS - 0.5, rat.py));

                    if (cat.hp <= 0) defeatBoss(cat);
                    else updateBossPhases();
                    updateHUD();
                } else {
                    ghostEatCombo++;
                    const points = 200 * Math.pow(2, Math.min(ghostEatCombo - 1, 3));
                    score += points;
                    audio.eatCat();
                    spawnParticles(cat.x, cat.y, cat.color, 12);
                    showFloatingText(cat.x, cat.y, `+${points}`, cat.color);
                    if (ghostEatCombo >= 2) showCombo(ghostEatCombo, points);

                    cat.respawnTimer = 3000;
                    cat.mode = 'scatter';
                    cat.frightenedTimer = 0;
                    updateHUD();
                    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
                }
            } else if (bonuses.invincible <= 0) {
                lives--;
                audio.hurt();
                if (lives <= 0) audio.death();
                spawnParticles(rat.px, rat.py, '#ff006e', 15);
                updateHUD();
                if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
                if (lives <= 0) endGame();
                else respawnRat();
            }
        }
    });
}

// ================================================================
//  УБИЙСТВО БОССА
// ================================================================
function defeatBoss(cat) {
    const isFinal = cat.isFinal;
    const waveNum = cat.wave;
    const rewardScore = isFinal ? 20000 : 5000;
    score += rewardScore;

    const defX = cat.x, defY = cat.y;

    for (let i = 0; i < 6; i++) {
        setTimeout(() => spawnParticles(defX, defY, i % 2 ? '#ffea00' : '#f100ff', 20), i * 100);
    }

    if (isFinal) audio.bossFinalDefeat();
    else audio.bossDefeated();

    trapInventory += 1;
    lives += 5;
    showFloatingText(defX, defY, '+5 ❤️', '#ff006e');
    updateTrapButton();

    toast(
        isFinal ? '👑 FINAL BOSS DEFEATED!' : `👑 Boss wave ${waveNum} defeated!`,
        `+1 🪤 · +5 ❤️ · +${rewardScore} — собери всё!`
    );

    boss = null;
    cats = cats.filter(c => !c.isMinion);

    const flash = document.createElement('div');
    flash.style.cssText = `
        position: absolute;
        inset: 0;
        background: radial-gradient(circle, rgba(255,234,0,0.5) 0%, transparent 60%);
        pointer-events: none;
        z-index: 11;
        animation: bossFlash 0.6s ease-out;
    `;
    $('game-wrapper').appendChild(flash);
    setTimeout(() => flash.remove(), 700);

    updateHUD();
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
}

// === Респавн крысы: кошки не в домике ===
function respawnRat() {
    if (!rat) return;
    rat.x = rat.startX;
    rat.y = rat.startY;
    rat.px = rat.x;
    rat.py = rat.y;
    rat.dir = null;
    rat.nextDir = null;
    ghostEatCombo = 0;
    heldKeys.clear();

    cats.forEach(c => {
        const spawnPos = findSpawnForCat(c);
        c.x = spawnPos[0];
        c.y = spawnPos[1];
        c.px = c.x;
        c.py = c.y;
        c.mode = 'scatter';
        c.frightenedTimer = 0;
        c.respawnTimer = 0;
        c.stunnedTimer = 0;
        c.chaseDuration = 0;
        c.hitUnderPower = false;
    });

    cats = cats.filter(c => !c.isMinion);

    if (boss) {
        boss.x = boss.startX; boss.y = boss.startY;
        boss.px = boss.x; boss.py = boss.y;
        boss.mode = 'chase'; boss.frightenedTimer = 0; boss.stunnedTimer = 0;
        boss.hitUnderPower = false;
    }
}

function findSpawnForCat(cat) {
    const candidates = [];
    const minDistFromRat = 6;
    const minDistFromBoss = 4;

    for (let y = 1; y < ROWS - 1; y++) {
        for (let x = 1; x < COLS - 1; x++) {
            if (maze[y][x] === 1) continue;

            const distToRat = Math.hypot(x - rat.px, y - rat.py);
            if (distToRat < minDistFromRat) continue;

            if (boss) {
                const distToBoss = Math.hypot(x - boss.px, y - boss.py);
                if (distToBoss < minDistFromBoss) continue;
            }

            if (catHouse) {
                const distToHouse = Math.hypot(x - catHouse[0], y - catHouse[1]);
                if (distToHouse < 2) continue;
            }

            candidates.push([x, y, distToRat]);
        }
    }

    if (candidates.length === 0) return [cat.startX, cat.startY];

    candidates.sort((a, b) => b[2] - a[2]);
    const topN = Math.min(15, candidates.length);
    const pick = candidates[Math.floor(Math.random() * topN)];
    return [pick[0], pick[1]];
}

function showCombo(combo, points) {
    const el = $('combo');
    el.innerHTML = `COMBO ×${Math.pow(2, Math.min(combo - 1, 3))}<br><small>+${points}</small>`;
    el.classList.remove('hidden');
    el.style.animation = 'none';
    void el.offsetHeight;
    el.style.animation = 'comboPop 0.6s steps(6)';
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.add('hidden'), 900);
}

// === Проверка победы: всё собрано ИЛИ (всё собрано + есть босс, но не убит) ===
function checkWin() {
    if (!maze) return false;

    // Есть ли ещё айтемы на карте?
    let remaining = 0;
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const c = maze[y][x];
            if (c === 2 || c === 3 || c === 6) remaining++;
        }
    }

    // Если что-то есть — уровень не пройден
    if (remaining > 0) return false;

    // Если босс жив — уровень не пройден
    if (boss) return false;

    return true;
}

// === Проверка: осталась ли только золотая пшеница ===
function hasRemainingItems() {
    if (!maze) return false;
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const c = maze[y][x];
            if (c === 2 || c === 3 || c === 6) return true;
        }
    }
    return false;
}

// === Спавн золотой пшеницы на босс-уровне, если всё собрано, а босс жив ===
function spawnGoldenWheatForBoss() {
    if (!maze || !boss) return false;
    if (!rat) return false;

    // Ищем свободные клетки, где можно поставить золотую пшеницу
    const candidates = [];
    for (let y = 1; y < ROWS - 1; y++) {
        for (let x = 1; x < COLS - 1; x++) {
            if (maze[y][x] !== 0) continue; // только пустые клетки
            // Не слишком близко к крысе, чтобы её не съели сразу
            const distToRat = Math.hypot(x - rat.px, y - rat.py);
            if (distToRat < 3) continue;
            // Не рядом с боссом
            const distToBoss = Math.hypot(x - boss.px, y - boss.py);
            if (distToBoss < 2) continue;

            candidates.push([x, y]);
        }
    }

    if (candidates.length === 0) {
        // Fallback — любая пустая клетка
        for (let y = 1; y < ROWS - 1; y++) {
            for (let x = 1; x < COLS - 1; x++) {
                if (maze[y][x] === 0) {
                    candidates.push([x, y]);
                }
            }
        }
    }

    if (candidates.length === 0) return false;

    const [x, y] = candidates[Math.floor(Math.random() * candidates.length)];
    maze[y][x] = 3;

    spawnParticles(x, y, '#ffea00', 15);
    showFloatingText(x, y, '✨ GOLDEN WHEAT!', '#ffea00');
    toast('✨ GOLDEN WHEAT!', 'Ударь босса!');

    return true;
}

// === Флаги для отслеживания спавна золотой пшеницы на босс-уровнях ===
let lastGoldenWheatSpawnTime = 0;

// ================================================================
//  ЭФФЕКТЫ
// ================================================================
function spawnParticles(x, y, color, count = 6) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        particles.push({
            x: x + 0.5, y: y + 0.5,
            vx: Math.cos(angle) * 0.008,
            vy: Math.sin(angle) * 0.008,
            life: 500, maxLife: 500,
            color, size: 2 + Math.random() * 2,
        });
    }
}

function showFloatingText(x, y, text, color) {
    floatingTexts.push({
        x: x + 0.5, y: y + 0.5,
        text, color, life: 1200, maxLife: 1200,
    });
}

// ================================================================
//  ОТРИСОВКА
// ================================================================
function draw(time) {
    ctx.fillStyle = '#0a0515';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255, 0, 110, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * TILE + 0.5, 0);
        ctx.lineTo(x * TILE + 0.5, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * TILE + 0.5);
        ctx.lineTo(canvas.width, y * TILE + 0.5);
        ctx.stroke();
    }

    if (!maze || !rat) return;

    for (let y = 0; y < ROWS; y++) {
        if (!maze[y]) continue;
        for (let x = 0; x < COLS; x++) {
            const cell = maze[y][x];
            const px = x * TILE;
            const py = y * TILE;

            if (cell === 1) {
                ctx.fillStyle = '#1a0a2e';
                ctx.fillRect(px, py, TILE, TILE);

                const padding = Math.max(2, TILE * 0.1);
                const grad = ctx.createLinearGradient(px, py, px, py + TILE);
                grad.addColorStop(0, '#4a1a7e');
                grad.addColorStop(1, '#3a1060');
                ctx.fillStyle = grad;
                ctx.fillRect(px + padding, py + padding,
                             TILE - padding * 2, TILE - padding * 2);

                ctx.fillStyle = 'rgba(160, 100, 220, 0.35)';
                ctx.fillRect(px + padding, py + padding,
                             TILE - padding * 2, Math.max(1, TILE * 0.06));

                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.fillRect(px + padding,
                             py + TILE - padding - Math.max(1, TILE * 0.06),
                             TILE - padding * 2, Math.max(1, TILE * 0.06));
            } else if (cell === 2) {
                drawSpriteCanvas('wheat', px + TILE/2, py + TILE/2, TILE * 0.7);
            } else if (cell === 3) {
                const pulse = 1 + Math.sin(time / 200) * 0.15;
                ctx.save();
                ctx.shadowColor = '#ffea00';
                ctx.shadowBlur = 20;
                drawSpriteCanvas('wheat-power', px + TILE/2, py + TILE/2, TILE * 0.8 * pulse);
                ctx.restore();
            } else if (cell === 4) {
                const bob = Math.sin(time / 300) * 2;
                drawSpriteCanvas('cheese', px + TILE/2, py + TILE/2 + bob, TILE * 0.75);
            } else if (cell === 5) {
                const bob = Math.sin(time / 300 + 1) * 2;
                drawSpriteCanvas('milk', px + TILE/2, py + TILE/2 + bob, TILE * 0.75);
            } else if (cell === 6) {
                const bob = Math.sin(time / 400) * 2;
                drawSpriteCanvas('trap', px + TILE/2, py + TILE/2 + bob, TILE * 0.8);
            }
        }
    }

    if (catHouse) {
        const cx = catHouse[0] * TILE + TILE/2;
        const cy = catHouse[1] * TILE + TILE/2;
        ctx.save();
        ctx.shadowColor = '#f100ff';
        ctx.shadowBlur = 15;
        drawSpriteCanvas('cat-house', cx, cy, TILE * 1.1);
        ctx.restore();
    }

    placedTraps.forEach(t => {
        ctx.save();
        ctx.shadowColor = '#ff006e';
        ctx.shadowBlur = 10;
        drawSpriteCanvas('trap-set', t.x * TILE + TILE/2, t.y * TILE + TILE/2, TILE * 0.75);
        ctx.restore();
    });

    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
        p.life -= 16;
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.96; p.vy *= 0.96;
        if (p.life <= 0) return;
        const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
        const radius = Math.max(0.1, p.size * alpha);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x * TILE, p.y * TILE, radius, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    const allEnemies = boss ? [...cats, boss] : cats;
    allEnemies.forEach(cat => {
        const cx = cat.px * TILE + TILE/2;
        const cy = cat.py * TILE + TILE/2;

        if (cat.respawnTimer > 0) {
            if (Math.floor(cat.respawnTimer / 200) % 2 === 0) {
                ctx.globalAlpha = 0.5;
                drawSpriteCanvas('cat-frightened', cx, cy, TILE * 0.85);
                ctx.globalAlpha = 1;
            }
            return;
        }

        const flipX = cat.lastDir === 'left';

        if (cat.stunnedTimer > 0) {
            ctx.save();
            ctx.globalAlpha = 0.7 + Math.sin(time / 100) * 0.2;
            if (cat.isBoss) {
                ctx.shadowColor = cat.color;
                ctx.shadowBlur = 20;
                drawSpriteCanvas(cat.stunnedSprite, cx, cy, TILE * 1.15, 0, flipX);
            } else {
                drawSpriteCanvas(cat.stunnedSprite, cx, cy, TILE * 0.9, 0, flipX);
            }
            ctx.restore();
            return;
        }

        if (cat.isBoss) {
            drawBoss(cat, cx, cy, flipX, time);
        } else if (cat.mode === 'frightened') {
            const blink = cat.frightenedTimer < 2000 && Math.floor(time / 200) % 2 === 0;
            ctx.save();
            ctx.shadowColor = blink ? '#fff' : '#00f5ff';
            ctx.shadowBlur = 18;
            drawSpriteCanvas('cat-frightened', cx, cy, TILE * 0.85, 0, flipX);
            ctx.restore();
        } else {
            ctx.save();
            ctx.shadowColor = cat.color;
            ctx.shadowBlur = 15;
            drawSpriteCanvas(cat.spriteName, cx, cy, TILE * 0.9, 0, flipX);
            ctx.restore();
        }
    });

    const rx = rat.px * TILE + TILE/2;
    const ry = rat.py * TILE + TILE/2;
    const flipRat = rat.dir === 'left' || rat.nextDir === 'left';

    ctx.save();
    if (bonuses.invincible > 0) {
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 25 + Math.sin(time / 100) * 5;
    } else if (bonuses.speed > 0) {
        ctx.shadowColor = '#ff9500';
        ctx.shadowBlur = 20;
    } else {
        ctx.shadowColor = '#ff006e';
        ctx.shadowBlur = 12;
    }
    const wobble = rat.moving ? Math.sin(time / 80) * 1.5 : 0;
    drawSpriteCanvas('rat', rx, ry + wobble, TILE * 0.9, 0, flipRat);
    ctx.restore();

    floatingTexts = floatingTexts.filter(t => t.life > 0);
    floatingTexts.forEach(t => {
        t.life -= 16;
        t.y -= 0.015;
        const alpha = Math.max(0, Math.min(1, t.life / 400));
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${TILE * 0.5}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = t.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(t.text, t.x * TILE, t.y * TILE);
        ctx.shadowColor = t.color;
        ctx.shadowBlur = 8;
        ctx.fillText(t.text, t.x * TILE, t.y * TILE);
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
}

function drawBoss(cat, cx, cy, flipX, time) {
    let auraColor = '#f100ff';
    if (cat.isFinal) {
        auraColor = cat.phase === 3 ? '#ff006e' :
                    cat.phase === 2 ? '#ff9500' : '#f100ff';
    } else {
        auraColor = cat.phase === 3 ? '#ff006e' :
                    cat.phase === 2 ? '#ff9500' : '#f100ff';
    }

    const pulse = Math.sin(time / (150 - cat.phase * 30)) * 8;
    const auraIntensity = 25 + cat.wave * 3 + pulse + cat.phase * 5;

    const hex = auraColor;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    ctx.save();
    ctx.shadowColor = auraColor;
    ctx.shadowBlur = auraIntensity;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.35)`;
    ctx.beginPath();
    ctx.arc(cx, cy, TILE * (0.65 + cat.phase * 0.05), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (cat.phaseTransitioning && Math.floor(time / 100) % 2 === 0) return;

    const bossScale = TILE * (1.2 + (cat.phase - 1) * 0.1);
    drawSpriteCanvas(
        cat.mode === 'frightened' ? 'cat-frightened' : cat.spriteName,
        cx, cy, bossScale, 0, flipX
    );

    if (cat.isFinal) {
        ctx.font = `${TILE * 0.5}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👑', cx, cy - TILE * 0.7);
    }

    const barW = TILE * 1.5;
    const barH = 6;
    const barX = cx - barW / 2;
    const barY = cy - TILE * 0.95;

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

    const hpRatio = Math.max(0, cat.hp / cat.maxHp);
    const barColor = hpRatio > 0.66 ? '#06ffa5' :
                     hpRatio > 0.33 ? '#ff9500' : '#ff006e';
    ctx.fillStyle = barColor;
    ctx.shadowColor = barColor;
    ctx.shadowBlur = 8;
    ctx.fillRect(barX, barY, barW * hpRatio, barH);
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(barX + barW * 0.33, barY);
    ctx.lineTo(barX + barW * 0.33, barY + barH);
    ctx.moveTo(barX + barW * 0.66, barY);
    ctx.lineTo(barX + barW * 0.66, barY + barH);
    ctx.stroke();

    ctx.font = `bold ${TILE * 0.28}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    const label = cat.isFinal
        ? `FIN F${cat.phase} ${cat.hp}/${cat.maxHp}`
        : `W${cat.wave} F${cat.phase} ${cat.hp}/${cat.maxHp}`;
    ctx.strokeText(label, cx, barY - TILE * 0.22);
    ctx.fillText(label, cx, barY - TILE * 0.22);
}

function drawSpriteCanvas(name, x, y, size, rotation = 0, flipX = false) {
    const sprite = SpriteFactory.get(name, 64);
    ctx.save();
    ctx.translate(x, y);
    if (rotation) ctx.rotate(rotation);
    if (flipX) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, -size/2, -size/2, size, size);
    ctx.restore();
}

// ================================================================
//  ЦИКЛ
// ================================================================
function loop(now) {
    const realDt = Math.min(now - lastTime, 50);
    lastTime = now;
    animTime += realDt;

    if (!rat || !maze) {
        draw(animTime);
        requestAnimationFrame(loop);
        return;
    }

    if (!paused && !gameOver) {
        if (!awaitingLevelStart && !levelCleared) {
            updateRat(realDt);
            updateCats(realDt);
            checkTrapCollisions();
            checkCollisions();

            // === СПАВН ЗОЛОТОЙ ПШЕНИЦЫ НА БОСС-УРОВНЕ ===
            // Условие: всё, кроме босса, собрано; босс жив; нет активной золотой пшеницы
            if (boss && levelConfig?.hasBoss) {
                // Проверяем, есть ли что-то ещё на карте (кроме пустых клеток)
                let hasItems = false;
                let hasGolden = false;
                for (let y = 0; y < ROWS; y++) {
                    for (let x = 0; x < COLS; x++) {
                        const c = maze[y][x];
                        if (c === 2 || c === 6) { hasItems = true; }
                        if (c === 3) { hasGolden = true; hasItems = true; }
                    }
                }

                // Если нет обычных айтемов, нет золотой пшеницы и босс жив — спавним золотую
                if (!hasItems && !hasGolden && !boss.mode.includes('frightened') && !boss.hitUnderPower) {
                    const timeSinceLast = performance.now() - lastGoldenWheatSpawnTime;
                    if (timeSinceLast > 1000) { // минимум 1 секунда между спавнами
                        if (spawnGoldenWheatForBoss()) {
                            lastGoldenWheatSpawnTime = performance.now();
                        }
                    }
                }
            }

            if (checkWin()) {
                handleLevelComplete();
            }
        }

        updateBonusIndicators();
    }

    draw(animTime);
    requestAnimationFrame(loop);
}

function handleLevelComplete() {
    if (levelCleared) return;
    levelCleared = true;

    audio.levelComplete();
    const bonus = 500;
    score += bonus;
    lives += 1;
    showFloatingText(rat.x, rat.y, `LEVEL CLEAR! +${bonus}`, '#ffea00');
    updateHUD();

    setTimeout(() => {
        if (level >= LEVEL_CONFIG.MAX_LEVELS) { winGame(); return; }
        awaitingLevelStart = true;
        updateMobileControlsVisibility();
        $('level-complete-overlay').classList.remove('hidden');
    }, 500);
}

// ================================================================
//  ЭКРАНЫ
// ================================================================
function winGame() {
    gameOver = true;
    audio.gameWin();
    setTimeout(() => audio.bossFinalDefeat(), 800);
    $('overlay-title').textContent = '👑 VICTORY!';
    $('overlay-text').innerHTML = `
        ALL 100 LEVELS CLEARED!<br>
        <b style="color:#ff006e">FINAL BOSS</b> DEFEATED!<br><br>
        SCORE: <b style="color:#ffea00">${score}</b>
    `;
    $('save-score-block').classList.remove('hidden');
    const nickInput = $('nickname-input');
    const tgName = tg?.initDataUnsafe?.user?.first_name
        || tg?.initDataUnsafe?.user?.username || '';
    nickInput.value = tgName || localStorage.getItem('rat_last_nick') || '';
    $('save-btn').disabled = false;
    $('save-btn').textContent = '💾 SAVE SCORE';
    $('overlay').classList.remove('hidden');
    audio.stopMusic();
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
}

function endGame() {
    gameOver = true;
    audio.death();
    $('overlay-title').textContent = '💀 GAME OVER';
    $('overlay-text').innerHTML = `
        SCORE: <b style="color:#ffea00">${score}</b><br>
        LEVEL REACHED: <b>${level}</b>
    `;
    $('save-score-block').classList.remove('hidden');
    const nickInput = $('nickname-input');
    const tgName = tg?.initDataUnsafe?.user?.first_name
        || tg?.initDataUnsafe?.user?.username || '';
    nickInput.value = tgName || localStorage.getItem('rat_last_nick') || '';
    $('save-btn').disabled = false;
    $('save-btn').textContent = '💾 SAVE SCORE';
    $('overlay').classList.remove('hidden');
    audio.stopMusic();
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
}

// ================================================================
//  БАННЕРЫ
// ================================================================
function showPhaseBanner(phase, isFinal) {
    const el = document.createElement('div');
    el.style.cssText = `
        position: absolute; top: 35%; left: 50%;
        transform: translate(-50%, -50%) scale(0.3);
        background: ${phase === 3 ? 'rgba(255,0,110,0.95)' : phase === 2 ? 'rgba(255,149,0,0.95)' : 'rgba(241,0,255,0.95)'};
        color: #fff; padding: 16px 32px;
        font-family: 'Press Start 2P', monospace;
        font-size: 16px; font-weight: bold;
        text-align: center; z-index: 15;
        border: 4px solid #00f5ff;
        box-shadow: 4px 4px 0 #000, 0 0 30px #00f5ff;
        opacity: 0; transition: transform 0.4s ease-out, opacity 0.4s;
        pointer-events: none; letter-spacing: 2px;
    `;
    const phaseName = phase === 3 ? '💀 PHASE 3 - RAGE' : phase === 2 ? '⚡ PHASE 2' : '🛡 PHASE 1';
    const subtitle = isFinal ? '<br><small style="font-size:10px">FINAL BOSS</small>' : '';
    el.innerHTML = `${phaseName}${subtitle}`;
    $('game-wrapper').appendChild(el);
    requestAnimationFrame(() => {
        el.style.transform = 'translate(-50%, -50%) scale(1)';
        el.style.opacity = '1';
    });
    setTimeout(() => {
        el.style.transform = 'translate(-50%, -50%) scale(1.3)';
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 500);
    }, 1600);
}

function showBossMessage(text, color) {
    const el = document.createElement('div');
    el.style.cssText = `
        position: absolute; bottom: 25%; left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.9); color: ${color};
        padding: 10px 24px;
        font-family: 'Press Start 2P', monospace;
        font-size: 11px; font-weight: bold;
        border: 3px solid ${color}; z-index: 15;
        opacity: 0; transition: opacity 0.3s;
        pointer-events: none; white-space: nowrap;
        box-shadow: 4px 4px 0 #000, 0 0 20px ${color};
        letter-spacing: 1px;
    `;
    el.textContent = text;
    $('game-wrapper').appendChild(el);
    requestAnimationFrame(() => el.style.opacity = '1');
    setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 300);
    }, 1800);
}

function showBossWarning(wave, isFinal = false) {
    const el = document.createElement('div');
    el.style.cssText = `
        position: absolute; top: 30%; left: 50%;
        transform: translate(-50%, -50%) scale(0.3);
        background: ${isFinal ? 'rgba(255,0,110,0.95)' : 'rgba(241,0,255,0.95)'};
        color: #fff; padding: 20px 40px;
        font-family: 'Press Start 2P', monospace;
        font-size: 16px; font-weight: bold;
        text-align: center; z-index: 15;
        border: 4px solid #ffea00;
        box-shadow: 6px 6px 0 #000, 0 0 40px #ffea00;
        opacity: 0; transition: transform 0.5s ease-out, opacity 0.5s;
        pointer-events: none; letter-spacing: 2px;
    `;
    if (isFinal) {
        el.innerHTML = `👑 FINAL BOSS 👑<br><small style="font-size:9px">${wave} WAVES · ${2 + wave} HP · 3 PHASES</small>`;
    } else {
        el.innerHTML = `⚠️ BOSS WAVE ${wave} ⚠️<br><small style="font-size:9px">HP: ${2 + wave}</small>`;
    }
    $('game-wrapper').appendChild(el);
    requestAnimationFrame(() => {
        el.style.transform = 'translate(-50%, -50%) scale(1)';
        el.style.opacity = '1';
    });
    audio.bossAlert();
    setTimeout(() => {
        el.style.transform = 'translate(-50%, -50%) scale(1.2)';
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 600);
    }, 2200);
}

// ================================================================
//  UI
// ================================================================
$('save-btn').addEventListener('click', () => {
    const nick = $('nickname-input').value.trim() || 'GUEST';
    localStorage.setItem('rat_last_nick', nick);
    Leaderboard.add(nick, score, level);
    audio.coin();
    toast(`💾 SAVED!`, `${nick}: ${score}`);
    $('save-btn').disabled = true;
    $('save-btn').textContent = '✅ SAVED';
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
});

function togglePause() {
    if (gameOver) return;
    if (awaitingLevelStart) return;
    paused = !paused;
    if (paused) {
        $('pause-overlay').classList.remove('hidden');
        audio.stopMusic();
        updateTrapButton();
    } else {
        $('pause-overlay').classList.add('hidden');
        lastTime = performance.now();
        playLevelMusic();
        updateTrapButton();
    }
    updateMobileControlsVisibility();
}

function hideOverlays() {
    document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
}

function showMainMenu() {
    hideOverlays();
    $('main-menu').classList.remove('hidden');
    $('mobile-controls')?.classList.add('hidden');
    audio.stopMusic();
}

document.querySelectorAll('#main-menu button').forEach(btn => {
    btn.addEventListener('click', () => {
        audio.init();
        audio.button();
        const action = btn.dataset.action;
        switch (action) {
            case 'play':
                resetGame();
                break;
            case 'leaderboard':
                Leaderboard.show();
                $('leaderboard').classList.remove('hidden');
                break;
            case 'controls':
                toggleControlMode();
                break;
            case 'sound':
                const sfxOn = audio.toggleSfx();
                btn.textContent = sfxOn ? '🔊 SFX: ON' : '🔇 SFX: OFF';
                btn.classList.toggle('off', !sfxOn);
                $('pause-sound-btn').textContent = sfxOn ? '🔊 SFX: ON' : '🔇 SFX: OFF';
                break;
            case 'music':
                const musicOn = audio.toggleMusic();
                btn.textContent = musicOn ? '🎵 MUSIC: ON' : '🎵 MUSIC: OFF';
                btn.classList.toggle('off', !musicOn);
                $('pause-music-btn').textContent = musicOn ? '🎵 MUSIC: ON' : '🎵 MUSIC: OFF';
                if (musicOn && !paused && !gameOver && !awaitingLevelStart) {
                    playLevelMusic();
                }
                break;
        }
    });
});

$('restart-btn').addEventListener('click', () => resetGame());
$('menu-btn').addEventListener('click', () => showMainMenu());
$('resume-btn').addEventListener('click', () => togglePause());
$('pause-to-menu').addEventListener('click', () => {
    paused = false;
    showMainMenu();
});
$('pause-btn').addEventListener('click', () => togglePause());

$('pause-controls-btn').addEventListener('click', () => toggleControlMode());

$('pause-sound-btn').addEventListener('click', () => {
    const on = audio.toggleSfx();
    $('pause-sound-btn').textContent = on ? '🔊 SFX: ON' : '🔇 SFX: OFF';
    $('sound-toggle').textContent = on ? '🔊 SFX: ON' : '🔇 SFX: OFF';
    $('sound-toggle').classList.toggle('off', !on);
    $('pause-sound-btn').classList.toggle('off', !on);
});

$('pause-music-btn').addEventListener('click', () => {
    const on = audio.toggleMusic();
    $('pause-music-btn').textContent = on ? '🎵 MUSIC: ON' : '🎵 MUSIC: OFF';
    $('music-toggle').textContent = on ? '🎵 MUSIC: ON' : '🎵 MUSIC: OFF';
    $('music-toggle').classList.toggle('off', !on);
    $('pause-music-btn').classList.toggle('off', !on);
    if (on && !paused && !gameOver && !awaitingLevelStart) {
        playLevelMusic();
    }
});

$('pause-leaderboard-btn').addEventListener('click', () => {
    Leaderboard.show();
    $('leaderboard').classList.remove('hidden');
});

$('close-leaderboard').addEventListener('click', () => {
    $('leaderboard').classList.add('hidden');
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden && !paused && !gameOver && !awaitingLevelStart) togglePause();
});

// ================================================================
//  ЗАПУСК
// ================================================================
function boot() {
    const name = tg?.initDataUnsafe?.user?.first_name
        || tg?.initDataUnsafe?.user?.username || 'GUEST';
    $('player-name').textContent = name.toUpperCase();

    loadControlMode();
    resize();
    showMainMenu();
    requestAnimationFrame(loop);
}

boot();