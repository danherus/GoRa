// ================================================================
//  🗺 LEVELS.JS — Генерация без тупиков + проверка на пустой лабиринт
// ================================================================

const LEVEL_CONFIG = {
    MAX_LEVELS: 100,
    MAX_CATS: 6,
    BOSS_INTERVAL: 10,
};

function isBossLevel(levelNum) {
    return levelNum % LEVEL_CONFIG.BOSS_INTERVAL === 0 && levelNum > 0;
}

function getBossWave(levelNum) {
    return Math.floor(levelNum / LEVEL_CONFIG.BOSS_INTERVAL);
}

function countOpenNeighbors(maze, x, y) {
    let count = 0;
    if (maze[y - 1]?.[x] === 0) count++;
    if (maze[y + 1]?.[x] === 0) count++;
    if (maze[y]?.[x - 1] === 0) count++;
    if (maze[y]?.[x + 1] === 0) count++;
    return count;
}

function floodFill(maze, sx, sy, cols, rows) {
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const queue = [[sx, sy]];
    visited[sy][sx] = true;
    const DIRS_4 = [[0, -1], [0, 1], [-1, 0], [1, 0]];

    while (queue.length) {
        const [x, y] = queue.shift();
        for (const [dx, dy] of DIRS_4) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
            if (visited[ny][nx]) continue;
            if (maze[ny][nx] === 1) continue;
            visited[ny][nx] = true;
            queue.push([nx, ny]);
        }
    }
    return visited;
}

function generateMaze(cols, rows, loopFactor = 0.25) {
    if (cols % 2 === 0) cols++;
    if (rows % 2 === 0) rows++;

    const maze = Array.from({ length: rows }, () => Array(cols).fill(1));
    const stack = [[1, 1]];
    maze[1][1] = 0;
    const dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]];

    // 1. DFS
    while (stack.length) {
        const [x, y] = stack[stack.length - 1];
        const neighbors = [];
        for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            if (nx > 0 && nx < cols - 1 && ny > 0 && ny < rows - 1 && maze[ny][nx] === 1) {
                neighbors.push([nx, ny, x + dx / 2, y + dy / 2]);
            }
        }
        if (neighbors.length === 0) {
            stack.pop();
        } else {
            const [nx, ny, wx, wy] = neighbors[Math.floor(Math.random() * neighbors.length)];
            maze[wy][wx] = 0;
            maze[ny][nx] = 0;
            stack.push([nx, ny]);
        }
    }

    // 2. Петли
    for (let y = 1; y < rows - 1; y++) {
        for (let x = 1; x < cols - 1; x++) {
            if (maze[y][x] === 1 && Math.random() < loopFactor) {
                const horiz = maze[y][x - 1] === 0 && maze[y][x + 1] === 0;
                const vert  = maze[y - 1][x] === 0 && maze[y + 1][x] === 0;
                if (horiz !== vert) maze[y][x] = 0;
            }
        }
    }

    // 3. Удаление тупиков
    const DIRS_4 = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (let pass = 0; pass < 50; pass++) {
        let changed = false;
        const deadEnds = [];
        for (let y = 1; y < rows - 1; y++) {
            for (let x = 1; x < cols - 1; x++) {
                if (maze[y][x] !== 0) continue;
                if (countOpenNeighbors(maze, x, y) === 1) deadEnds.push([x, y]);
            }
        }
        if (deadEnds.length === 0) break;

        for (const [x, y] of deadEnds) {
            const candidates = [];
            for (const [dx, dy] of DIRS_4) {
                const wx = x + dx, wy = y + dy;
                if (maze[wy]?.[wx] !== 1) continue;
                if (wx <= 0 || wx >= cols - 1 || wy <= 0 || wy >= rows - 1) continue;
                const fx = wx + dx, fy = wy + dy;
                if (maze[fy]?.[fx] === 0) candidates.push([wx, wy]);
            }
            if (candidates.length > 0) {
                const [wx, wy] = candidates[Math.floor(Math.random() * candidates.length)];
                maze[wy][wx] = 0;
                changed = true;
            } else {
                const openDirs = [];
                for (const [dx, dy] of DIRS_4) {
                    if (maze[y + dy]?.[x + dx] === 0) openDirs.push([dx, dy]);
                }
                if (openDirs.length === 1) {
                    const [dx, dy] = openDirs[0];
                    const nx = x + dx, ny = y + dy;
                    const neighborOpen = countOpenNeighbors(maze, nx, ny);
                    if (neighborOpen > 2) {
                        maze[y][x] = 1;
                        changed = true;
                    }
                }
            }
        }
        if (!changed) break;
    }

    // 4. Удаление 2×2 квадратов — МЯГКО (макс 3 прохода + проверка 40%)
    for (let pass = 0; pass < 3; pass++) {
        let changed = false;

        // Считаем свободные клетки
        let freeCount = 0;
        for (let yy = 0; yy < rows; yy++) {
            for (let xx = 0; xx < cols; xx++) {
                if (maze[yy][xx] === 0) freeCount++;
            }
        }
        const minFree = rows * cols * 0.4;

        for (let y = 1; y < rows - 2; y++) {
            for (let x = 1; x < cols - 2; x++) {
                if (maze[y][x] === 0 && maze[y][x + 1] === 0 &&
                    maze[y + 1][x] === 0 && maze[y + 1][x + 1] === 0) {

                    if (freeCount < minFree) break;

                    const options = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]];
                    options.sort(() => Math.random() - 0.5);

                    for (const [wx, wy] of options) {
                        let safe = true;
                        for (const [dx, dy] of DIRS_4) {
                            const nx = wx + dx, ny = wy + dy;
                            if (maze[ny]?.[nx] !== 0) continue;
                            let nOpen = 0;
                            for (const [dx2, dy2] of DIRS_4) {
                                const fx = nx + dx2, fy = ny + dy2;
                                if (fx === wx && fy === wy) continue;
                                if (maze[fy]?.[fx] === 0) nOpen++;
                            }
                            if (nOpen < 2) { safe = false; break; }
                        }
                        if (safe) {
                            maze[wy][wx] = 1;
                            freeCount--;
                            changed = true;
                            break;
                        }
                    }
                }
            }
        }
        if (!changed) break;
    }

    // 5. Финальная страховка
    for (let safety = 0; safety < 20; safety++) {
        let anyLeft = false;
        for (let y = 1; y < rows - 1; y++) {
            for (let x = 1; x < cols - 1; x++) {
                if (maze[y][x] !== 0) continue;
                if (countOpenNeighbors(maze, x, y) === 1) {
                    anyLeft = true;
                    for (const [dx, dy] of DIRS_4) {
                        const wx = x + dx, wy = y + dy;
                        if (wx > 0 && wx < cols - 1 && wy > 0 && wy < rows - 1) {
                            if (maze[wy][wx] === 1) {
                                maze[wy][wx] = 0;
                                break;
                            }
                        }
                    }
                }
            }
        }
        if (!anyLeft) break;
    }

    return maze;
}

function fillWheat(maze, powerWheatCount = 4) {
    const empty = [];
    for (let y = 0; y < maze.length; y++) {
        for (let x = 0; x < maze[y].length; x++) {
            if (maze[y][x] === 0) empty.push([x, y]);
        }
    }
    for (const [x, y] of empty) maze[y][x] = 2;

    const shuffled = [...empty].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(powerWheatCount, shuffled.length); i++) {
        const [x, y] = shuffled[i];
        maze[y][x] = 3;
    }
}

function getLevelConfig(levelNum) {
    const t = (levelNum - 1) / (LEVEL_CONFIG.MAX_LEVELS - 1);

    const cols = 15 + Math.floor(t * 8);
    const rows = 15 + Math.floor(t * 8);

    let catCount = 1;
    if (levelNum >= 11) catCount = 2;
    if (levelNum >= 20) catCount = 3;
    if (levelNum >= 30) catCount = 4;
    if (levelNum >= 45) catCount = 5;
    if (levelNum >= 60) catCount = 6;

    let bossCount = 0;
    if (isBossLevel(levelNum)) {
        bossCount = 1;
        catCount = Math.max(1, catCount - 1);
    }

    const catSpeed = 0.0018 + t * 0.0028;
    const ratSpeed = 0.011 + t * 0.002;
    const loopFactor = 0.22 + t * 0.13;

    const cheeseCount = 1 + Math.floor(t * 2);
    const milkCount   = 1 + Math.floor(t * 2);
    const trapPickups = levelNum <= 2 ? 4 : 3 + Math.floor(t * 3);

    const wave = getBossWave(levelNum);
    const hasBoss = isBossLevel(levelNum);
    const bossHp = hasBoss ? 2 + wave : 0;
    const bossSpeed = hasBoss ? catSpeed * (1.15 + wave * 0.03) : 0;

    const isFinalBoss = levelNum === LEVEL_CONFIG.MAX_LEVELS;

    return {
        cols, rows, catCount, bossCount, catSpeed, ratSpeed, loopFactor,
        powerWheatCount: 4, cheeseCount, milkCount, trapPickups,
        hasBoss, bossHp, bossSpeed, bossWave: wave, isFinalBoss,
    };
}

function findCatHouse(maze, cols, rows) {
    const preferredX = Math.floor(cols / 2);
    const preferredY = 2;

    for (let r = 0; r < 6; r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                const x = preferredX + dx;
                const y = preferredY + dy;
                if (x < 1 || x >= cols - 1 || y < 1 || y >= rows - 1) continue;
                if (maze[y][x] === 0) {
                    let ok = true;
                    for (let yy = y - 1; yy <= y + 1; yy++) {
                        for (let xx = x - 1; xx <= x + 1; xx++) {
                            if (xx < 0 || xx >= cols || yy < 0 || yy >= rows) { ok = false; break; }
                            if (maze[yy][xx] === 1) { ok = false; break; }
                        }
                        if (!ok) break;
                    }
                    if (ok) return [x, y];
                }
            }
        }
    }

    for (let y = 1; y < rows - 1; y++) {
        for (let x = 1; x < cols - 1; x++) {
            if (maze[y][x] === 0) return [x, y];
        }
    }
    return [1, 1];
}

function buildLevel(levelNum) {
    const config = getLevelConfig(levelNum);

    // Генерируем лабиринт — до 10 попыток найти хороший
    let maze = null;
    let realCols, realRows;
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        maze = generateMaze(config.cols, config.rows, config.loopFactor);
        realCols = maze[0].length;
        realRows = maze.length;

        // Считаем свободные клетки
        let freeCount = 0;
        for (let y = 0; y < realRows; y++) {
            for (let x = 0; x < realCols; x++) {
                if (maze[y][x] === 0) freeCount++;
            }
        }

        const totalCells = realCols * realRows;
        const freeRatio = freeCount / totalCells;

        // Должно быть хотя бы 40% свободных клеток
        if (freeRatio < 0.4) continue;

        // Проверяем связность от (1,1)
        const reachable = floodFill(maze, 1, 1, realCols, realRows);
        let reachableCount = 0;
        for (let y = 0; y < realRows; y++) {
            for (let x = 0; x < realCols; x++) {
                if (reachable[y][x]) reachableCount++;
            }
        }

        // Достижимых должно быть не менее 50% от свободных
        if (reachableCount < freeCount * 0.5) continue;

        // Лабиринт хороший — выходим
        break;
    }

    // Находим домик и старт крысы
    const catHouse = findCatHouse(maze, realCols, realRows);
    maze[catHouse[1]][catHouse[0]] = 0;

    const ratStart = findNearestEmpty(maze, Math.floor(realCols / 2), realRows - 3);
    maze[ratStart[1]][ratStart[0]] = 0;

    // Проверяем связность от ratStart
    const reachableFromRat = floodFill(maze, ratStart[0], ratStart[1], realCols, realRows);
    for (let y = 1; y < realRows - 1; y++) {
        for (let x = 1; x < realCols - 1; x++) {
            if (maze[y][x] !== 1 && !reachableFromRat[y][x]) {
                maze[y][x] = 1;
            }
        }
    }

    // Заполняем пшеницей
    fillWheat(maze, config.powerWheatCount);

    const catStarts = [];
    for (let i = 0; i < config.catCount; i++) {
        catStarts.push([catHouse[0], catHouse[1]]);
    }
    maze[catHouse[1]][catHouse[0]] = 0;

    let bossStart = null;
    if (config.bossCount > 0) {
        bossStart = findNearestEmpty(maze, catHouse[0], catHouse[1] + 2);
    }

    placeItems(maze, config);

    return {
        ...config,
        cols: realCols, rows: realRows, maze,
        ratStart, catStarts, bossStart, catHouse,
    };
}

function findNearestEmpty(maze, cx, cy) {
    if (maze[cy]?.[cx] === 0 || maze[cy]?.[cx] === 2 || maze[cy]?.[cx] === 3) {
        return [cx, cy];
    }
    for (let r = 1; r < Math.max(maze.length, maze[0].length); r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                const x = cx + dx, y = cy + dy;
                if (maze[y]?.[x] === 0 || maze[y]?.[x] === 2 || maze[y]?.[x] === 3) {
                    return [x, y];
                }
            }
        }
    }
    return [1, 1];
}

function placeItems(maze, config) {
    const empties = [];
    for (let y = 0; y < maze.length; y++) {
        for (let x = 0; x < maze[y].length; x++) {
            if (maze[y][x] === 2) empties.push([x, y]);
        }
    }
    const shuffled = [...empties].sort(() => Math.random() - 0.5);
    let idx = 0;

    for (let i = 0; i < config.cheeseCount && idx < shuffled.length; i++, idx++) {
        const [x, y] = shuffled[idx];
        maze[y][x] = 4;
    }
    for (let i = 0; i < config.milkCount && idx < shuffled.length; i++, idx++) {
        const [x, y] = shuffled[idx];
        maze[y][x] = 5;
    }
    for (let i = 0; i < config.trapPickups && idx < shuffled.length; i++, idx++) {
        const [x, y] = shuffled[idx];
        maze[y][x] = 6;
    }
}

const CAT_COLORS = ['#ff006e', '#ff9500', '#00f5ff', '#f100ff', '#06ffa5', '#ffea00'];