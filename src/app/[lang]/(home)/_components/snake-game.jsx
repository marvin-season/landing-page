'use client'
import  {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

// --- Constants ---
const GRID_SIZE = 18;
const INITIAL_LENGTH = 4;
const CANVAS_SIZE = 396; // Canvas 尺寸 (对应 CSS 宽度)
const TILE_SIZE = CANVAS_SIZE / GRID_SIZE;
const MOVE_INTERVAL = 1000; // 1秒移动一次
const MAX_EXPLORED_NODES = 6000;

const DIRECTION_VECTORS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const KEYBOARD_DIRECTIONS = {
  ArrowUp: "UP",
  ArrowDown: "DOWN",
  ArrowLeft: "LEFT",
  ArrowRight: "RIGHT",
  w: "UP",
  s: "DOWN",
  a: "LEFT",
  d: "RIGHT",
  W: "UP",
  S: "DOWN",
  A: "LEFT",
  D: "RIGHT",
};

const DIRECTION_ORDER = ["UP", "RIGHT", "DOWN", "LEFT"];
const DIRECTION_LABELS = { UP: "↑", RIGHT: "→", DOWN: "↓", LEFT: "←" };

// --- Utility Functions ---

/** @typedef {{x: number, y: number}} Point */
/** @typedef {'UP' | 'DOWN' | 'LEFT' | 'RIGHT'} Direction */

/** @returns {Point[]} */
function createInitialSnake() {
  const center = Math.floor(GRID_SIZE / 2);
  return Array.from({ length: INITIAL_LENGTH }, (_, index) => ({
    x: center - index,
    y: center,
  }));
}

/** @param {Point} a @param {Point} b */
function samePoint(a, b) {
  return a.x === b.x && a.y === b.y;
}

/** @param {Point} point */
function pointKey(point) {
  return `${point.x}-${point.y}`;
}

/** @param {Point} point @param {Direction} direction @returns {Point} */
function movePoint(point, direction) {
  const vector = DIRECTION_VECTORS[direction];
  return { x: point.x + vector.x, y: point.y + vector.y };
}

/** @param {Direction} a @param {Direction} b @returns {boolean} */
function isOpposite(a, b) {
  return (
    (a === "UP" && b === "DOWN") ||
    (a === "DOWN" && b === "UP") ||
    (a === "LEFT" && b === "RIGHT") ||
    (a === "RIGHT" && b === "LEFT")
  );
}

/** @param {Point} point @returns {boolean} */
function isInside(point) {
  return (
    point.x >= 0 && point.x < GRID_SIZE && point.y >= 0 && point.y < GRID_SIZE
  );
}

/** @param {Point} a @param {Point} b @returns {number} */
function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** @param {Point[]} body @returns {string} */
function serializeBody(body) {
  return body.map(pointKey).join("|");
}

/** @param {Point[]} occupied @returns {Point} */
function randomFood(occupied) {
  const occupiedKeys = new Set(occupied.map(pointKey));
  const available = [];
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const candidate = { x, y };
      if (!occupiedKeys.has(pointKey(candidate))) {
        available.push(candidate);
      }
    }
  }
  if (!available.length) {
    return occupied[occupied.length - 1] ?? { x: 0, y: 0 };
  }
  return available[Math.floor(Math.random() * available.length)];
}

// --- AI Logic (BFS) ---

/** @typedef {Object} PathNode
 * @property {Point} head - 蛇头位置
 * @property {Point[]} body - 蛇身状态
 * @property {Direction[]} path - 路径
 */

/**
 * 寻找一条安全到达食物的路径 (BFS)
 * @param {Point[]} initialSnake
 * @param {Point} targetFood
 * @returns {Direction[] | null}
 */
function findPathToFood(initialSnake, targetFood) {
  /** @type {PathNode[]} */
  const queue = [
    {
      head: initialSnake[0],
      body: initialSnake,
      path: [],
    },
  ];
  const visited = new Set([serializeBody(initialSnake)]);
  let explored = 0;

  while (queue.length && explored < MAX_EXPLORED_NODES) {
    explored += 1;
    const current = queue.shift();
    if (samePoint(current.head, targetFood)) {
      return current.path;
    }

    for (const dir of DIRECTION_ORDER) {
      const nextHead = movePoint(current.head, dir);
      if (!isInside(nextHead)) continue;

      const grows = samePoint(nextHead, targetFood);
      let segmentsToAvoid = current.body;
      if (!grows) {
        segmentsToAvoid = current.body.slice(0, current.body.length - 1);
      }

      if (segmentsToAvoid.some((segment) => samePoint(segment, nextHead))) {
        continue;
      }

      const nextBody = [nextHead, ...current.body];
      if (!grows) {
        nextBody.pop();
      }

      const signature = serializeBody(nextBody);
      if (visited.has(signature)) {
        continue;
      }
      visited.add(signature);
      queue.push({
        head: nextHead,
        body: nextBody,
        path: [...current.path, dir],
      });
    }
  }
  return null;
}

/**
 * 备用方向策略 (靠近食物且安全)
 * @param {Point[]} currentSnake
 * @param {Point} currentFood
 * @param {Direction} currentDir
 * @returns {Direction}
 */
function fallbackDirection(currentSnake, currentFood, currentDir) {
  const head = currentSnake[0];
  const candidates = [...DIRECTION_ORDER].sort((a, b) => {
    return (
      manhattan(movePoint(head, a), currentFood) -
      manhattan(movePoint(head, b), currentFood)
    );
  });

  const nonTailBody = currentSnake.slice(0, currentSnake.length - 1);

  for (const dir of candidates) {
    if (isOpposite(dir, currentDir)) continue;

    const nextHead = movePoint(head, dir);

    // 1. 墙壁检查
    if (!isInside(nextHead)) continue;

    // 2. 身体检查
    if (nonTailBody.some((segment) => samePoint(segment, nextHead))) continue;

    return dir;
  }
  return currentDir;
}

// --- Drawing Component ---

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Point} point
 * @param {string} fillStyle
 * @param {string} shadowColor
 * @param {number} shadowBlur
 */
function drawTile(
  ctx,
  point,
  fillStyle,
  shadowColor = "transparent",
  shadowBlur = 0,
) {
  const x = point.x * TILE_SIZE;
  const y = point.y * TILE_SIZE;
  const padding = 1;
  const size = TILE_SIZE - padding * 2;
  const radius = 3;

  ctx.fillStyle = fillStyle;
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = shadowBlur;

  ctx.beginPath();
  ctx.moveTo(x + padding + radius, y + padding);
  ctx.lineTo(x + padding + size - radius, y + padding);
  ctx.arcTo(
    x + padding + size,
    y + padding,
    x + padding + size,
    y + padding + radius,
    radius,
  );
  ctx.lineTo(x + padding + size, y + padding + size - radius);
  ctx.arcTo(
    x + padding + size,
    y + padding + size,
    x + padding + size - radius,
    y + padding + size,
    radius,
  );
  ctx.lineTo(x + padding + radius, y + padding + size);
  ctx.arcTo(
    x + padding,
    y + padding + size,
    x + padding,
    y + padding + size - radius,
    radius,
  );
  ctx.lineTo(x + padding, y + padding + radius);
  ctx.arcTo(
    x + padding,
    y + padding,
    x + padding + radius,
    y + padding,
    radius,
  );
  ctx.closePath();
  ctx.fill();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Point[]} snake
 * @param {Point} food
 */
function drawGame(ctx, snake, food) {
  if (!ctx || !snake || !food) return;

  // 1. Clear canvas
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // 2. Draw Food (Magenta Neon)
  drawTile(ctx, food, "#e879f9", "rgba(232,121,249,0.8)", 15);

  // 3. Draw Snake Body (Emerald Green)
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  for (let i = 1; i < snake.length; i++) {
    drawTile(ctx, snake[i], "rgba(16, 185, 129, 0.8)"); // emerald-500/80
  }

  // 4. Draw Snake Head (Brighter Emerald Neon)
  drawTile(ctx, snake[0], "#6ee7b7", "rgba(16,185,129,0.9)", 12);
}

// --- UI Components ---

function DirectionKey({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 text-lg font-black transition sm:h-14 sm:w-14 cursor-pointer select-none
        border-white/20 bg-[#060a1a] text-white/35 hover:border-white/30 active:border-emerald-300 active:bg-emerald-300/30 active:text-white active:shadow-[0_0_15px_rgba(16,185,129,0.6)]
        `}
    >
      {label}
    </button>
  );
}

function DirectionCore({ autopilot, direction }) {
  return (
    <div className="flex h-12 flex-col items-center justify-center rounded-xl border-2 border-white/20 bg-[#060b1d] text-[9px] font-semibold uppercase tracking-[0.35em] text-white/60 sm:h-14">
      <span>{autopilot ? "AI" : "YOU"}</span>
      <span className="text-lg font-black text-white">
        {DIRECTION_LABELS[direction]}
      </span>
    </div>
  );
}

// --- Main App Component ---

export default function SnakeGameCanvas() {
  // Game State
  const [snake, setSnake] = useState(createInitialSnake());
  const [food, setFood] = useState(() => randomFood(createInitialSnake()));
  const [direction, setDirection] = useState("RIGHT");
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [autopilot, setAutopilot] = useState(true);
  const [countdown, setCountdown] = useState(3);

  // Refs for Canvas and mutable state access in setInterval
  const canvasRef = useRef(null);
  const stateRef = useRef({ snake, food, direction, autopilot, gameOver });

  // Update ref whenever state changes
  useEffect(() => {
    stateRef.current = { snake, food, direction, autopilot, gameOver };
    // Redraw game whenever snake/food state changes
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      drawGame(ctx, snake, food);
    }
  }, [snake, food, direction, autopilot, gameOver]);

  // --- Game Control ---

  const resetGame = useCallback(() => {
    const initialSnake = createInitialSnake();
    setSnake(initialSnake);
    setFood(randomFood(initialSnake));
    setDirection("RIGHT");
    setScore(0);
    setGameOver(false);
    setAutopilot(true);
    setCountdown(3);
  }, []);

  const handleGameOver = useCallback(() => {
    if (stateRef.current.gameOver) return;
    setGameOver(true);

    // Start countdown for reset
    let count = 3;
    setCountdown(count);
    const ticker = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(ticker);
        resetGame();
      }
    }, 1000);

    return () => clearInterval(ticker);
  }, [resetGame]);

  const commitDirection = useCallback((newDir, manual = false) => {
    // 检查方向是否相反
    if (isOpposite(stateRef.current.direction, newDir)) {
      return;
    }
    setDirection(newDir);

    // 如果是手动输入，则禁用自动驾驶
    if (manual && stateRef.current.autopilot) {
      setAutopilot(false);
    }
  }, []);

  // --- Game Loop Logic ---

  const gameTick = useCallback(() => {
    if (stateRef.current.gameOver) return;

    const { snake, food, direction, autopilot } = stateRef.current;

    // 1. Determine next move (AI or Manual)
    let finalDirection = direction;
    if (autopilot) {
      const path = findPathToFood(snake, food);
      if (path && path.length > 0) {
        finalDirection = path[0];
      } else {
        finalDirection = fallbackDirection(snake, food, direction);
      }
      // Update direction state if AI chose a different path
      if (finalDirection !== direction) {
        setDirection(finalDirection);
      }
    } else {
      finalDirection = direction;
    }

    const nextHead = movePoint(snake[0], finalDirection);
    const shouldGrow = samePoint(nextHead, food);

    // 2. Collision Check
    let isCollision = false;

    // A. Wall Collision
    if (!isInside(nextHead)) {
      isCollision = true;
    }

    // B. Body Collision
    const bodyToCheck = shouldGrow ? snake : snake.slice(0, snake.length - 1);

    if (bodyToCheck.some((segment) => samePoint(segment, nextHead))) {
      isCollision = true;
    }

    if (isCollision) {
      handleGameOver();
      return;
    }

    // 3. Update Snake State
    setSnake((prevSnake) => {
      const nextSnake = [nextHead, ...prevSnake];
      if (!shouldGrow) {
        nextSnake.pop();
      }
      return nextSnake;
    });

    // 4. Update Food/Score
    if (shouldGrow) {
      setScore((prev) => prev + 10);
      setFood(randomFood([nextHead, ...snake])); // Use current snapshot of snake for new food position calculation
    }
  }, [handleGameOver]);

  // --- Game Loop (useEffect) ---
  useEffect(() => {
    if (gameOver) return;

    // Use a reference to the gameTick function to avoid recreating the interval
    const intervalId = setInterval(gameTick, MOVE_INTERVAL);

    return () => clearInterval(intervalId);
  }, [gameOver, gameTick]); // Only depend on gameOver and the stable gameTick function

  // --- Keyboard Input ---
  useEffect(() => {
    if (gameOver) return;

    const handleKeydown = (event) => {
      const newDir = KEYBOARD_DIRECTIONS[event.key];
      if (newDir) {
        event.preventDefault();
        commitDirection(newDir, true);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [gameOver, commitDirection]);

  return (
    // 使用 Tailwind CSS 模仿科技感深色 UI
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d001a] p-4 font-['Inter']">
      <div className="rounded-[24px] border border-white/10 bg-[#04010B]/70 p-5 text-white shadow-[12px_12px_0_rgba(3,0,12,0.7)] backdrop-blur-lg w-full max-w-sm">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
          <span>PIXEL SNAKE (CANVAS)</span>
          <span>{autopilot ? "AI MODE" : "MANUAL"}</span>
        </div>

        {/* Canvas 游戏区域 */}
        <div className="mt-4 flex justify-center items-center relative">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="rounded-2xl border border-white/10 shadow-inner shadow-black/50"
            style={{
              background: "linear-gradient(180deg, #0E041B 0%, #06010D 100%)",
            }}
          />

          {/* Game Over 消息框 */}
          {gameOver && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-black/80 text-center">
              <p className="text-2xl font-black tracking-[0.5em] text-red-400">
                GAME OVER
              </p>
              <p className="mt-2 text-xs tracking-[0.3em] text-white/70">
                REBOOT IN {countdown}
              </p>
            </div>
          )}
        </div>

        {/* 控制区和得分显示 */}
        <div className="mt-6 grid gap-5 rounded-2xl border border-white/15 bg-[#050818]/80 p-5 text-xs uppercase tracking-[0.3em]">
          <div className="flex items-center justify-between text-sm tracking-normal text-white">
            <span>SCORE</span>
            <span className="font-mono text-2xl text-emerald-300">
              {score.toString().padStart(3, "0")}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-white/70">
            <span>PACE / 1.0S</span>
            <span>ARROWS · OR · WASD TAKEOVER</span>
          </div>

          {/* 方向键控制 */}
          <div className="flex flex-col items-center gap-3 text-[10px]">
            <p className="uppercase tracking-[0.4em] text-white/45">INPUT</p>
            <div className="grid grid-cols-3 gap-2">
              <div />
              <DirectionKey
                label={DIRECTION_LABELS.UP}
                onClick={() => commitDirection("UP", true)}
              />
              <div />
              <DirectionKey
                label={DIRECTION_LABELS.LEFT}
                onClick={() => commitDirection("LEFT", true)}
              />
              <DirectionCore autopilot={autopilot} direction={direction} />
              <DirectionKey
                label={DIRECTION_LABELS.RIGHT}
                onClick={() => commitDirection("RIGHT", true)}
              />
              <div />
              <DirectionKey
                label={DIRECTION_LABELS.DOWN}
                onClick={() => commitDirection("DOWN", true)}
              />
              <div />
            </div>
          </div>

          {/* 自动驾驶按钮 */}
          <button
            type="button"
            disabled={autopilot || gameOver}
            onClick={() => {
              if (!gameOver) setAutopilot(true);
            }}
            className="rounded-lg border border-white/25 bg-gradient-to-r from-[#0C1724] to-[#071426] px-4 py-3 text-[10px] tracking-[0.35em] text-white/80 transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {autopilot ? "AI PILOT ACTIVE" : "RESTORE AUTOPILOT"}
          </button>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-white/60">
          AI 自动驾驶通过 BFS 算法找到前往食物的最短安全路径。按下方向键或 WASD
          即可接管控制权。
        </p>
      </div>
    </div>
  );
}
