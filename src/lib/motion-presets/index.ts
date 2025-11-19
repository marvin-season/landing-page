import { cubicBezier } from "motion";

import type { Phase } from "../../types/chapter";

export const easingCurve = cubicBezier(0.16, 1, 0.3, 1);

export const sceneTransition = {
  duration: 1,
  ease: easingCurve,
};

export const accentTransition = {
  duration: 0.8,
  ease: easingCurve,
};

export const hoverTransition = {
  duration: 0.6,
  ease: easingCurve,
};

export const bookSpringTransition = {
  type: "spring" as const,
  duration: 1.1,
  bounce: 0.2,
};

export const bookVariants: Record<Phase, Record<string, number>> = {
  closed: {
    rotateY: 0,
    rotateX: 12,
    rotateZ: -2,
    x: 0,
    y: 0,
    z: 0,
    scale: 1,
    opacity: 1,
  },
  directory: {
    rotateY: -135,
    rotateX: 10,
    rotateZ: -4,
    x: -10,
    y: -16,
    z: 0,
    scale: 1,
    opacity: 1,
  },
  content: {
    rotateY: -170,
    rotateX: 0,
    rotateZ: -6,
    x: -120,
    y: -40,
    z: 0,
    scale: 0.88,
    opacity: 0,
  },
};
