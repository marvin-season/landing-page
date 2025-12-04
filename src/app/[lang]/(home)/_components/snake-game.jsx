'use client'

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// --- Types and Constants ---

/**
 * 游戏的点坐标类型
 * @typedef {Object} Point
 * @property {number} x - X轴坐标
 * @property {number} y - Y轴坐标
 */

/**
 * @typedef {'UP' | 'DOWN' | 'LEFT' | 'RIGHT'} Direction
 */

const GRID_SIZE = 18;
const INITIAL_LENGTH = 4;
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

/**
 * @typedef {Object} PathNode
 * @property {Point} head - 当前蛇头位置
 * @property {Point[]} body - 蛇的当前身体状态
 * @property {Direction[]} path - 从起点到当前状态的路径
 */

// --- Utility Functions ---

/**
 * @param {Point[]} occupied
 * @returns {Point[]}
 */
function createInitialSnake() {
  const center = Math.floor(GRID_SIZE / 2);
  return Array.from({ length: INITIAL_LENGTH }, (_, index) => ({
    x: center - index,
    y: center,
  }));
}

/**
 * @param {Point} a
 * @param {Point} b
 */
function samePoint(a, b) {
  return a.x === b.x && a.y === b.y;
}

/**
 * @param {Point} point
 */
function pointKey(point) {
  return `${point.x}-${point.y}`;
}

/**
 * @param {Point} point
 * @param {Direction} direction
 * @returns {Point}
 */
function movePoint(point, direction) {
  const vector = DIRECTION_VECTORS[direction];
  return { x: point.x + vector.x, y: point.y + vector.y };
}

/**
 * @param {Direction} a
 * @param {Direction} b
 * @returns {boolean}
 */
function isOpposite(a, b) {
  return (
    (a === "UP" && b === "DOWN") ||
    (a === "DOWN" && b === "UP") ||
    (a === "LEFT" && b === "RIGHT") ||
    (a === "RIGHT" && b === "LEFT")
  );
}

/**
 * @param {Point} point
 * @returns {boolean}
 */
function isInside(point) {
  return (
    point.x >= 0 && point.x < GRID_SIZE && point.y >= 0 && point.y < GRID_SIZE
  );
}

/**
 * @param {Point} a
 * @param {Point} b
 * @returns {number}
 */
function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * @param {Point[]} body
 * @returns {string}
 */
function serializeBody(body) {
  return body.map(pointKey).join("|");
}

/**
 * @param {Point[]} occupied
 * @returns {Point}
 */
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

// --- AI Logic ---

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

      // 确定需要避开的蛇身部分
      let segmentsToAvoid = current.body;
      if (!grows) {
        // 如果不成长，尾巴会消失，检查身体除尾巴外的部分
        segmentsToAvoid = current.body.slice(0, current.body.length - 1);
      }

      if (segmentsToAvoid.some((segment) => samePoint(segment, nextHead))) {
        continue; // 撞到自己
      }

      // 构建下一个身体状态
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
 * 当找不到通往食物的路径时，选择一个安全的备用方向（尽量靠近食物）
 * @param {Point[]} currentSnake
 * @param {Point} currentFood
 * @param {Direction} currentDir
 * @returns {Direction}
 */
function fallbackDirection(currentSnake, currentFood, currentDir) {
  const head = currentSnake[0];

  // 按照曼哈顿距离从近到远排序候选方向
  const candidates = [...DIRECTION_ORDER].sort((a, b) => {
    return (
      manhattan(movePoint(head, a), currentFood) -
      manhattan(movePoint(head, b), currentFood)
    );
  });

  // 假设不成长，只检查除尾巴外的身体部分
  const nonTailBody = currentSnake.slice(0, currentSnake.length - 1);

  for (const dir of candidates) {
    if (isOpposite(dir, currentDir)) {
      continue;
    }

    const nextHead = movePoint(head, dir);

    // 1. 墙壁检查
    if (!isInside(nextHead)) {
      continue;
    }

    // 2. 身体检查
    if (nonTailBody.some((segment) => samePoint(segment, nextHead))) {
      continue;
    }

    return dir;
  }
  // 如果所有方向都堵死，返回当前方向（下一帧就会 Game Over）
  return currentDir;
}

// --- React Components ---

function DirectionKey({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 text-lg font-black transition sm:h-14 sm:w-14 cursor-pointer select-none
        ${
          active
            ? "border-emerald-300 bg-emerald-300/30 text-white shadow-[0_0_15px_rgba(16,185,129,0.6)]"
            : "border-white/20 bg-[#060a1a] text-white/35 hover:border-white/30"
        }`}
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

export  function SnakeGame() {
  const [snake, setSnake] = useState(createInitialSnake());
  const [food, setFood] = useState(() => randomFood(createInitialSnake()));
  const [direction, setDirection] = useState("RIGHT");
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [autopilot, setAutopilot] = useState(true);
  const [countdown, setCountdown] = useState(3);

  // Ref for mutable, up-to-date state in setInterval
  const stateRef = useRef({ snake, food, direction, autopilot, gameOver });

  // Update ref whenever state changes
  useEffect(() => {
    stateRef.current = { snake, food, direction, autopilot, gameOver };
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
    // Only allow direction change if it's not the opposite
    if (isOpposite(stateRef.current.direction, newDir)) {
      return;
    }
    setDirection(newDir);

    // If manual input, disable autopilot
    if (manual && stateRef.current.autopilot) {
      setAutopilot(false);
    }
  }, []);

  // --- Game Loop (useEffect) ---

  useEffect(() => {
    if (gameOver) return;

    const gameTick = () => {
      const currentDirection = stateRef.current.direction;
      const currentSnake = stateRef.current.snake;
      const currentFood = stateRef.current.food;
      const currentAutopilot = stateRef.current.autopilot;

      // 1. Determine next move (AI or Manual)
      let finalDirection = currentDirection;
      if (currentAutopilot) {
        const path = findPathToFood(currentSnake, currentFood);
        if (path && path.length > 0) {
          finalDirection = path[0];
        } else {
          finalDirection = fallbackDirection(
            currentSnake,
            currentFood,
            currentDirection,
          );
        }
        // Update state if AI chose a different path
        if (finalDirection !== currentDirection) {
          setDirection(finalDirection);
        }
      } else {
        finalDirection = currentDirection;
      }

      const nextHead = movePoint(currentSnake[0], finalDirection);
      const shouldGrow = samePoint(nextHead, currentFood);

      // 2. Collision Check
      let isCollision = false;

      // A. Wall Collision
      if (!isInside(nextHead)) {
        isCollision = true;
      }

      // B. Body Collision
      const bodyToCheck = shouldGrow
        ? currentSnake
        : currentSnake.slice(0, currentSnake.length - 1);

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
        setFood((prevSnake) => randomFood([nextHead, ...currentSnake]));
      }
    };

    const intervalId = setInterval(gameTick, MOVE_INTERVAL);

    return () => clearInterval(intervalId);
  }, [gameOver, handleGameOver]); // Re-run effect only when game over status changes

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

  // --- Memoized Values for Rendering ---
  const snakeBodyKeys = useMemo(() => new Set(snake.map(pointKey)), [snake]);
  const headKey = pointKey(snake[0]);
  const foodKey = pointKey(food);

  const gridCells = useMemo(() => {
    const cells = [];
    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        const key = pointKey({ x, y });
        const isHead = key === headKey;
        const isBody = snakeBodyKeys.has(key);
        const isFood = key === foodKey;

        let cellClass =
          "aspect-square rounded-sm border border-[#140836] bg-[#06030E] shadow-[inset_-2px_-2px_0_rgba(0,0,0,0.55)] transition-colors duration-150";

        if (isFood) {
          cellClass =
            "bg-fuchsia-400 shadow-[0_0_15px_rgba(232,121,249,0.8)] rounded-sm transition-colors duration-150";
        } else if (isHead) {
          cellClass =
            "bg-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.9)] rounded-sm transition-colors duration-150";
        } else if (isBody) {
          cellClass =
            "bg-emerald-500/80 rounded-sm transition-colors duration-150";
        }

        cells.push(<div key={key} className={cellClass} />);
      }
    }
    return cells;
  }, [foodKey, headKey, snakeBodyKeys]);

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#04010B]/70 p-5 text-white shadow-[12px_12px_0_rgba(3,0,12,0.7)] backdrop-blur-lg w-full max-w-sm mx-auto my-8">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
        <span>PIXEL SNAKE (REACT)</span>
        <span>{autopilot ? "AI MODE" : "MANUAL"}</span>
      </div>

      {/* Game Grid */}
      <div
        className="mt-4 grid gap-[3px] rounded-2xl border border-white/10 bg-gradient-to-b from-[#0E041B] to-[#06010D] p-4 shadow-inner shadow-black/50 relative"
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
        }}
      >
        {gridCells}
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

      {/* Controls and Score */}
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

        {/* Direction Pad */}
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

        {/* Autopilot Button */}
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
        AI 以 1.0 秒节奏规划安全路径，点击方向键或键盘输入会立即切换到手动模式。
      </p>
    </div>
  );
}
