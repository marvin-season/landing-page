"use client";
import { Trans } from "@lingui/react/macro";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
} from "lucide-react";
import { Press_Start_2P } from "next/font/google";
import { useCallback, useEffect, useRef, useState } from "react";

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
});

// --- Types and Constants ---

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

interface Point {
  x: number;
  y: number;
}

interface PathNode {
  head: Point;
  body: Point[];
  path: Direction[];
}

const GRID_SIZE = 18;
const INITIAL_LENGTH = 4;
const CANVAS_SIZE = 396; // Canvas 尺寸 (对应 CSS 宽度)
const TILE_SIZE = CANVAS_SIZE / GRID_SIZE;
const MOVE_INTERVAL = 1000; // Standard arcade speed
const MAX_EXPLORED_NODES = 6000;

const DIRECTION_VECTORS: { [key in Direction]: Point } = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const KEYBOARD_DIRECTIONS: { [key: string]: Direction } = {
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

const DIRECTION_ORDER: Direction[] = ["UP", "RIGHT", "DOWN", "LEFT"];
const DIRECTION_LABELS: { [key in Direction]: React.ReactNode } = {
  UP: <ArrowUpIcon className="w-4 h-4" />,
  RIGHT: <ArrowRightIcon className="w-4 h-4" />,
  DOWN: <ArrowDownIcon className="w-4 h-4" />,
  LEFT: <ArrowLeftIcon className="w-4 h-4" />,
};

// --- Utility Functions ---

/** @returns {Point[]} */
function createInitialSnake(): Point[] {
  const center = Math.floor(GRID_SIZE / 2);
  return Array.from({ length: INITIAL_LENGTH }, (_, index) => ({
    x: center - index,
    y: center,
  }));
}

/** @param {Point} a @param {Point} b */
function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

/** @param {Point} point */
function pointKey(point: Point): string {
  return `${point.x}-${point.y}`;
}

/** @param {Point} point @param {Direction} direction @returns {Point} */
function movePoint(point: Point, direction: Direction): Point {
  const vector = DIRECTION_VECTORS[direction];
  return { x: point.x + vector.x, y: point.y + vector.y };
}

/** @param {Direction} a @param {Direction} b @returns {boolean} */
function isOpposite(a: Direction, b: Direction): boolean {
  return (
    (a === "UP" && b === "DOWN") ||
    (a === "DOWN" && b === "UP") ||
    (a === "LEFT" && b === "RIGHT") ||
    (a === "RIGHT" && b === "LEFT")
  );
}

/** @param {Point} point @returns {boolean} */
function isInside(point: Point): boolean {
  return (
    point.x >= 0 && point.x < GRID_SIZE && point.y >= 0 && point.y < GRID_SIZE
  );
}

/** @param {Point} a @param {Point} b @returns {number} */
function manhattan(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** @param {Point[]} body @returns {string} */
function serializeBody(body: Point[]): string {
  return body.map(pointKey).join("|");
}

/** @param {Point[]} occupied @returns {Point} */
function randomFood(occupied: Point[]): Point {
  const occupiedKeys = new Set(occupied.map(pointKey));
  const available: Point[] = [];
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const candidate: Point = { x, y };
      if (!occupiedKeys.has(pointKey(candidate))) {
        available.push(candidate);
      }
    }
  }
  if (!available.length) {
    // Should only happen when the grid is full
    return occupied[occupied.length - 1] ?? { x: 0, y: 0 };
  }
  return available[Math.floor(Math.random() * available.length)];
}

// --- AI Logic (BFS) ---

/**
 * 寻找一条安全到达食物的路径 (BFS)
 * @param {Point[]} initialSnake
 * @param {Point} targetFood
 * @returns {Direction[] | null}
 */
function findPathToFood(
  initialSnake: Point[],
  targetFood: Point,
): Direction[] | null {
  /** @type {PathNode[]} */
  const queue: PathNode[] = [
    {
      head: initialSnake[0],
      body: initialSnake,
      path: [],
    },
  ];
  const visited = new Set<string>([serializeBody(initialSnake)]);
  let explored = 0;

  while (queue.length && explored < MAX_EXPLORED_NODES) {
    explored += 1;
    const current = queue.shift()!;
    if (samePoint(current.head, targetFood)) {
      return current.path;
    }

    for (const dir of DIRECTION_ORDER) {
      const nextHead = movePoint(current.head, dir);
      if (!isInside(nextHead)) continue;

      const grows = samePoint(nextHead, targetFood);
      let segmentsToAvoid: Point[] = current.body;
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
function fallbackDirection(
  currentSnake: Point[],
  currentFood: Point,
  currentDir: Direction,
): Direction {
  const head = currentSnake[0];
  const candidates: Direction[] = [...DIRECTION_ORDER].sort((a, b) => {
    return (
      manhattan(movePoint(head, a), currentFood) -
      manhattan(movePoint(head, b), currentFood)
    );
  });

  const nonTailBody = currentSnake.slice(0, currentSnake.length - 1);

  for (const dir of candidates) {
    if (isOpposite(dir, currentDir)) continue;

    const nextHead = movePoint(head, dir);

    // 1. Wall Collision Check
    if (!isInside(nextHead)) continue;

    // 2. Body Collision Check (assuming no growth)
    if (nonTailBody.some((segment) => samePoint(segment, nextHead))) continue;

    return dir;
  }
  return currentDir;
}

// --- Drawing Logic ---

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Point} point
 * @param {string} fillStyle
 */
function drawTile(
  ctx: CanvasRenderingContext2D,
  point: Point,
  fillStyle: string,
): void {
  const x = point.x * TILE_SIZE;
  const y = point.y * TILE_SIZE;
  const padding = 1; // Sharper pixels
  const size = TILE_SIZE - padding * 2;

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;

  // 1. Main Block
  ctx.fillStyle = fillStyle;
  ctx.fillRect(x + padding, y + padding, size, size);

  // 2. Simple shine
  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.fillRect(x + padding, y + padding, size, size / 2);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Point[]} snake
 * @param {Point} food
 */
function drawGame(
  ctx: CanvasRenderingContext2D,
  snake: Point[],
  food: Point,
): void {
  if (!ctx || !snake || !food) return;

  // 1. Clear canvas - Keep strict black for retro screen feel
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // Grid (Scanlines)
  ctx.fillStyle = "rgba(0, 255, 0, 0.03)";
  for (let i = 0; i < CANVAS_SIZE; i += 2) {
    ctx.fillRect(0, i, CANVAS_SIZE, 1);
  }

  // 2. Draw Food (Retro Red)
  drawTile(ctx, food, "#ef4444");

  // 3. Draw Snake Body (Retro Green)
  for (let i = 1; i < snake.length; i++) {
    drawTile(ctx, snake[i], "#22c55e");
  }

  // 4. Draw Snake Head (Brighter Green)
  drawTile(ctx, snake[0], "#86efac");
}

// --- UI Components ---

interface DirectionKeyProps {
  label: React.ReactNode;
  onClick: () => void;
}

const DirectionKey: React.FC<DirectionKeyProps> = ({ label, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 w-12 items-center justify-center border-2 border-b-4 border-border bg-secondary text-sm transition active:border-b-2 active:translate-y-0.5 hover:bg-secondary/80 cursor-pointer select-none text-foreground font-bold`}
    >
      {label}
    </button>
  );
};

interface DirectionCoreProps {
  autopilot: boolean;
  direction: Direction;
}

const DirectionCore: React.FC<DirectionCoreProps> = ({
  direction,
}) => {
  return (
    <div className="flex h-12 flex-col items-center justify-center border-2 border-border bg-black text-[8px] uppercase tracking-widest text-white/60">
      <span className="text-xs text-primary mt-1">
        {DIRECTION_LABELS[direction]}
      </span>
    </div>
  );
};

// --- Main App Component ---

interface GameStateRef {
  snake: Point[];
  food: Point;
  direction: Direction;
  autopilot: boolean;
  gameOver: boolean;
}

export default function SnakeGameCanvas(): React.JSX.Element {
  // Game State
  const [snake, setSnake] = useState<Point[]>(createInitialSnake());
  const [food, setFood] = useState<Point>(() =>
    randomFood(createInitialSnake()),
  );
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [score, setScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [autopilot, setAutopilot] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(3);

  // Refs for Canvas and mutable state access in setInterval
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GameStateRef>({
    snake,
    food,
    direction,
    autopilot,
    gameOver,
  });

  // Update ref whenever state changes and trigger canvas redraw
  useEffect(() => {
    stateRef.current = { snake, food, direction, autopilot, gameOver };

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        drawGame(ctx, snake, food);
      }
    }
  }, [snake, food, direction, autopilot, gameOver]);

  // --- Game Control ---

  const resetGame = useCallback((): void => {
    const initialSnake = createInitialSnake();
    setSnake(initialSnake);
    setFood(randomFood(initialSnake));
    setDirection("RIGHT");
    setScore(0);
    setGameOver(false);
    setAutopilot(true);
    setCountdown(3);
  }, []);

  const handleGameOver = useCallback((): (() => void) | undefined => {
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

  const commitDirection = useCallback(
    (newDir: Direction, manual: boolean = false): void => {
      // 检查方向是否相反
      if (isOpposite(stateRef.current.direction, newDir)) {
        return;
      }
      setDirection(newDir);

      // 如果是手动输入，则禁用自动驾驶
      if (manual && stateRef.current.autopilot) {
        setAutopilot(false);
      }
    },
    [],
  );

  // --- Game Loop Logic ---

  const gameTick = useCallback((): void => {
    if (stateRef.current.gameOver) return;

    const { snake, food, direction, autopilot } = stateRef.current;

    // 1. Determine next move (AI or Manual)
    let finalDirection: Direction = direction;
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
  }, [gameOver, gameTick]);

  // --- Keyboard Input ---
  useEffect(() => {
    if (gameOver) return;

    const handleKeydown = (event: KeyboardEvent): void => {
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
    <div
      className={`flex flex-col items-center justify-center min-h-full bg-transparent p-4 ${pressStart.className} text-foreground`}
    >
      <div className="relative w-full max-w-sm border-4 border-border bg-card p-1 shadow-[8px_8px_0_var(--color-border)]">
        {/* Decorative corners */}
        <div className="absolute -left-1 -top-1 h-2 w-2 bg-border" />
        <div className="absolute -right-1 -top-1 h-2 w-2 bg-border" />
        <div className="absolute -bottom-1 -left-1 h-2 w-2 bg-border" />
        <div className="absolute -bottom-1 -right-1 h-2 w-2 bg-border" />

        <div className="border-2 border-border bg-muted/20 p-4">
          <div className="mb-4 flex items-center justify-between text-[10px] uppercase tracking-widest text-primary font-bold">
            <span><Trans>Retro Snake</Trans></span>
            <span className={autopilot ? "animate-pulse" : ""}>
              {autopilot ? <Trans>AI auto</Trans> : <Trans>Manual</Trans>}
            </span>
          </div>

          {/* Canvas 游戏区域 */}
          <div className="relative flex items-center justify-center border-4 border-border bg-black">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              style={{
                imageRendering: "pixelated",
                width: "100%",
                height: "auto",
              }}
            />

            {/* Game Over 消息框 */}
            {gameOver && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/85 text-center">
                <p className="mb-4 text-xl text-destructive shadow-[2px_2px_0_#000] uppercase">
                  <Trans>Game over</Trans>
                </p>
                <p className="blink text-[10px] text-white/70 uppercase">
                  <Trans>Reset in {countdown}</Trans>
                </p>
              </div>
            )}
          </div>

          {/* 控制区和得分显示 */}
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between border-b-2 border-border pb-2">
              <span className="text-[10px] text-muted-foreground uppercase"><Trans>Score</Trans></span>
              <span className="text-xl text-primary">
                {score.toString().padStart(4, "0")}
              </span>
            </div>

            {/* 方向键控制 */}
            <div className="flex flex-col items-center gap-2">
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
              className={`w-full border-2 py-3 text-[10px] tracking-widest transition font-bold uppercase
                    ${
                      autopilot
                        ? "cursor-not-allowed border-primary/30 bg-primary/10 text-primary/50"
                        : "border-border text-foreground hover:bg-secondary active:translate-y-1"
                    }`}
            >
              {autopilot ? <Trans>AI active</Trans> : <Trans>Enable AI</Trans>}
            </button>
          </div>

          <div className="mt-6 border-t border-border pt-4 text-center text-[8px] text-muted-foreground uppercase">
            <Trans>WASD / ARROW keys to override</Trans>
          </div>
        </div>
      </div>
    </div>
  );
}
