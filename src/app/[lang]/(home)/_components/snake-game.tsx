"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Point = {
  x: number;
  y: number;
};

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type DirectionState = Record<Direction, boolean>;
type DirectionCounter = Record<Direction, number>;

const GRID_SIZE = 18;
const INITIAL_LENGTH = 4;
const MOVE_INTERVAL = 1000;
const MAX_EXPLORED_NODES = 6000;

const DIRECTION_VECTORS: Record<Direction, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const KEYBOARD_DIRECTIONS: Record<string, Direction> = {
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
const DIRECTION_LABELS: Record<Direction, string> = {
  UP: "↑",
  RIGHT: "→",
  DOWN: "↓",
  LEFT: "←",
};

export function SnakeGame() {
  const initialSnakeRef = useRef<Point[] | null>(null);
  if (!initialSnakeRef.current) {
    initialSnakeRef.current = createInitialSnake();
  }
  const initialFoodRef = useRef<Point | null>(null);
  if (!initialFoodRef.current) {
    initialFoodRef.current = randomFood(initialSnakeRef.current!);
  }

  const [snake, setSnake] = useState<Point[]>(() => [
    ...initialSnakeRef.current!,
  ]);
  const [food, setFood] = useState<Point>(initialFoodRef.current!);
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [status, setStatus] = useState<"running" | "gameover">("running");
  const [countdown, setCountdown] = useState(3);
  const [autopilot, setAutopilot] = useState(true);
  const [score, setScore] = useState(0);
  const [keyHints, setKeyHints] = useState<DirectionState>(() =>
    buildDirectionState(false),
  );

  const foodRef = useRef<Point>(initialFoodRef.current!);
  const directionRef = useRef<Direction>(direction);
  const autopilotRef = useRef(autopilot);
  const keyHoldCounter = useRef<DirectionCounter>(buildDirectionState(0));

  const changeKeyHint = useCallback((dir: Direction, delta: 1 | -1) => {
    keyHoldCounter.current[dir] = Math.max(
      0,
      keyHoldCounter.current[dir] + delta,
    );
    const isActive = keyHoldCounter.current[dir] > 0;
    setKeyHints((prev) => {
      if (prev[dir] === isActive) {
        return prev;
      }
      return { ...prev, [dir]: isActive };
    });
  }, []);

  const resetKeyHints = useCallback(() => {
    keyHoldCounter.current = buildDirectionState(0);
    setKeyHints(buildDirectionState(false));
  }, []);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  useEffect(() => {
    foodRef.current = food;
  }, [food]);

  useEffect(() => {
    autopilotRef.current = autopilot;
  }, [autopilot]);

  const resetGame = useCallback(() => {
    const nextSnake = createInitialSnake();
    const nextFood = randomFood(nextSnake);
    setSnake(nextSnake);
    setFood(nextFood);
    foodRef.current = nextFood;
    setDirection("RIGHT");
    directionRef.current = "RIGHT";
    setAutopilot(true);
    autopilotRef.current = true;
    setScore(0);
    setStatus("running");
    setCountdown(3);
    resetKeyHints();
  }, [resetKeyHints]);

  const handleGameOver = useCallback(() => {
    if (status === "gameover") {
      return;
    }
    setStatus("gameover");
    setCountdown(3);
  }, [status]);

  useEffect(() => {
    if (status !== "running") {
      return;
    }
    const interval = setInterval(() => {
      setSnake((currentSnake) => {
        if (status !== "running") {
          return currentSnake;
        }

        let nextDirection = directionRef.current;

        if (autopilotRef.current) {
          const autoDirection = planAutoMove(
            currentSnake,
            foodRef.current,
            directionRef.current,
          );
          if (autoDirection) {
            nextDirection = autoDirection;
            directionRef.current = autoDirection;
            setDirection(autoDirection);
          }
        }

        const nextHead = movePoint(currentSnake[0], nextDirection);

        if (detectCollision(nextHead, currentSnake)) {
          handleGameOver();
          return currentSnake;
        }

        const shouldGrow = samePoint(nextHead, foodRef.current);
        const nextSnake = [nextHead, ...currentSnake];
        if (!shouldGrow) {
          nextSnake.pop();
        } else {
          const nextFood = randomFood(nextSnake);
          foodRef.current = nextFood;
          setFood(nextFood);
          setScore((prev) => prev + 10);
        }
        return nextSnake;
      });
    }, MOVE_INTERVAL);

    return () => clearInterval(interval);
  }, [handleGameOver, status]);

  useEffect(() => {
    if (status !== "gameover") {
      return;
    }
    const ticker = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(ticker);
          resetGame();
          return 3;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(ticker);
  }, [resetGame, status]);

  const commitDirection = useCallback((next: Direction, manual = false) => {
    if (isOpposite(directionRef.current, next)) {
      return;
    }
    directionRef.current = next;
    setDirection(next);
    if (manual && autopilotRef.current) {
      autopilotRef.current = false;
      setAutopilot(false);
    }
  }, []);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const nextDirection = KEYBOARD_DIRECTIONS[event.key];
      if (!nextDirection) {
        return;
      }
      event.preventDefault();
      if (!event.repeat) {
        changeKeyHint(nextDirection, 1);
      }
      commitDirection(nextDirection, true);
    };
    const handleKeyup = (event: KeyboardEvent) => {
      const nextDirection = KEYBOARD_DIRECTIONS[event.key];
      if (!nextDirection) {
        return;
      }
      event.preventDefault();
      changeKeyHint(nextDirection, -1);
    };
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("keyup", handleKeyup);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("keyup", handleKeyup);
    };
  }, [changeKeyHint, commitDirection]);

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
          cellClass +=
            " bg-fuchsia-400 shadow-[0_0_15px_rgba(232,121,249,0.8)]";
        } else if (isHead) {
          cellClass += " bg-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.9)]";
        } else if (isBody) {
          cellClass += " bg-emerald-500/80";
        }
        cells.push(<div key={key} className={cellClass} />);
      }
    }
    return cells;
  }, [foodKey, headKey, snakeBodyKeys]);

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#04010B]/70 p-5 text-white shadow-[12px_12px_0_rgba(3,0,12,0.7)] backdrop-blur-lg">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
        <span>PIXEL SNAKE</span>
        <span>{autopilot ? "AI MODE" : "MANUAL"}</span>
      </div>
      <div
        className="mt-4 grid gap-[3px] rounded-2xl border border-white/10 bg-linear-to-b from-[#0E041B] to-[#06010D] p-4 shadow-inner shadow-black/50 relative"
        style={{
          gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
        }}
      >
        {gridCells}
        {status === "gameover" && (
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
      <div className="mt-6 grid gap-5 rounded-2xl border border-white/15 bg-[#050818]/80 p-5 text-xs uppercase tracking-[0.3em]">
        <div className="flex items-center justify-between text-sm tracking-normal text-white">
          <span>score</span>
          <span className="font-mono text-2xl text-emerald-300">
            {score.toString().padStart(3, "0")}
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-white/70">
          <span>pace / 1s</span>
          <span>ARROWS · OR · WASD TAKEOVER</span>
        </div>
        <DirectionPad
          hints={keyHints}
          autopilot={autopilot}
          direction={direction}
        />
        <button
          type="button"
          disabled={autopilot}
          onClick={() => {
            setAutopilot(true);
            autopilotRef.current = true;
          }}
          className="rounded-lg border border-white/25 bg-linear-to-r from-[#0C1724] to-[#071426] px-4 py-3 text-[10px] tracking-[0.35em] text-white/80 transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {autopilot ? "AI PILOT ACTIVE" : "RESTORE AUTOPILOT"}
        </button>
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-white/60">
        食物永远只会在网格内的空位生成，吞下即刻刷新。AI 以 1 秒节奏规划安全路径，按下方向键或
        WASD 会点亮指示器并立即接管，再次撞墙或撞到身体就会触发 GAME OVER 并在 3 秒后重启。
      </p>
    </div>
  );
}

function createInitialSnake(): Point[] {
  const center = Math.floor(GRID_SIZE / 2);
  return Array.from({ length: INITIAL_LENGTH }, (_, index) => ({
    x: center - index,
    y: center,
  }));
}

function samePoint(a: Point, b: Point) {
  return a.x === b.x && a.y === b.y;
}

function pointKey(point: Point) {
  return `${point.x}-${point.y}`;
}

function movePoint(point: Point, direction: Direction): Point {
  const vector = DIRECTION_VECTORS[direction];
  return { x: point.x + vector.x, y: point.y + vector.y };
}

function detectCollision(head: Point, snake: Point[]) {
  if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
    return true;
  }
  return snake.some((segment) => samePoint(segment, head));
}

function randomFood(occupied: Point[]) {
  const occupiedKeys = new Set(occupied.map(pointKey));
  const available: Point[] = [];
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

function isOpposite(a: Direction, b: Direction) {
  return (
    (a === "UP" && b === "DOWN") ||
    (a === "DOWN" && b === "UP") ||
    (a === "LEFT" && b === "RIGHT") ||
    (a === "RIGHT" && b === "LEFT")
  );
}

type PathNode = {
  head: Point;
  body: Point[];
  path: Direction[];
};

function planAutoMove(
  snake: Point[],
  food: Point,
  currentDirection: Direction,
) {
  const path = findPathToFood(snake, food);
  if (path?.length) {
    return path[0];
  }
  return fallbackDirection(snake, food, currentDirection) ?? currentDirection;
}

function findPathToFood(snake: Point[], food: Point) {
  const queue: PathNode[] = [
    {
      head: snake[0],
      body: snake,
      path: [],
    },
  ];
  const visited = new Set<string>([serializeBody(snake)]);
  let explored = 0;

  while (queue.length && explored < MAX_EXPLORED_NODES) {
    explored += 1;
    const current = queue.shift()!;
    if (samePoint(current.head, food)) {
      return current.path;
    }
    for (const direction of DIRECTION_ORDER) {
      const nextHead = movePoint(current.head, direction);
      if (!isInside(nextHead)) {
        continue;
      }
      const grows = samePoint(nextHead, food);
      const nextBody = [nextHead, ...current.body];
      if (!grows) {
        nextBody.pop();
      }
      if (nextBody.slice(1).some((segment) => samePoint(segment, nextHead))) {
        continue;
      }
      const signature = serializeBody(nextBody);
      if (visited.has(signature)) {
        continue;
      }
      visited.add(signature);
      queue.push({
        head: nextHead,
        body: nextBody,
        path: [...current.path, direction],
      });
    }
  }

  return null;
}

function fallbackDirection(
  snake: Point[],
  food: Point,
  currentDirection: Direction,
) {
  const head = snake[0];
  const candidates = [...DIRECTION_ORDER].sort((a, b) => {
    const diff =
      manhattan(movePoint(head, a), food) - manhattan(movePoint(head, b), food);
    return diff;
  });

  for (const direction of candidates) {
    if (isOpposite(direction, currentDirection)) {
      continue;
    }
    const nextHead = movePoint(head, direction);
    if (!detectCollision(nextHead, snake)) {
      return direction;
    }
  }
  return null;
}

function manhattan(a: Point, b: Point) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function isInside(point: Point) {
  return (
    point.x >= 0 && point.x < GRID_SIZE && point.y >= 0 && point.y < GRID_SIZE
  );
}

function serializeBody(body: Point[]) {
  return body.map(pointKey).join("|");
}

type DirectionPadProps = {
  hints: DirectionState;
  autopilot: boolean;
  direction: Direction;
};

function DirectionPad({ hints, autopilot, direction }: DirectionPadProps) {
  return (
    <div className="flex flex-col items-center gap-3 text-[10px]">
      <p className="uppercase tracking-[0.4em] text-white/45">INPUT</p>
      <div className="grid grid-cols-3 gap-2">
        <div />
        <DirectionKey active={hints.UP} label={DIRECTION_LABELS.UP} />
        <div />
        <DirectionKey active={hints.LEFT} label={DIRECTION_LABELS.LEFT} />
        <DirectionCore autopilot={autopilot} direction={direction} />
        <DirectionKey active={hints.RIGHT} label={DIRECTION_LABELS.RIGHT} />
        <div />
        <DirectionKey active={hints.DOWN} label={DIRECTION_LABELS.DOWN} />
        <div />
      </div>
    </div>
  );
}

function DirectionKey({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  return (
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 text-lg font-black transition sm:h-14 sm:w-14 ${
        active
          ? "border-emerald-300 bg-emerald-300/30 text-white shadow-[0_0_15px_rgba(16,185,129,0.6)]"
          : "border-white/20 bg-[#060a1a] text-white/35"
      }`}
    >
      {label}
    </div>
  );
}

function DirectionCore({
  autopilot,
  direction,
}: {
  autopilot: boolean;
  direction: Direction;
}) {
  return (
    <div className="flex h-12 flex-col items-center justify-center rounded-xl border-2 border-white/20 bg-[#060b1d] text-[9px] font-semibold uppercase tracking-[0.35em] text-white/60 sm:h-14">
      <span>{autopilot ? "AI" : "YOU"}</span>
      <span className="text-lg font-black text-white">
        {DIRECTION_LABELS[direction]}
      </span>
    </div>
  );
}

function buildDirectionState<T>(value: T): Record<Direction, T> {
  return {
    UP: value,
    RIGHT: value,
    DOWN: value,
    LEFT: value,
  };
}
