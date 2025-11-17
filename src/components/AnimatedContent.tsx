import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type React from "react";
import { type ReactNode, useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

interface AnimatedContentProps {
  children: ReactNode;
  distance?: number;
  direction?: "vertical" | "horizontal";
  reverse?: boolean;
  duration?: number;
  ease?: string | ((progress: number) => number);
  initialOpacity?: number;
  animateOpacity?: boolean;
  scale?: number;
  threshold?: number;
  delay?: number;
  onComplete?: () => void;
}

const AnimatedContent: React.FC<AnimatedContentProps> = ({
  children,
  distance = 100,
  direction = "vertical",
  reverse = false,
  duration = 0.8,
  ease = "power3.out",
  initialOpacity = 0,
  animateOpacity = true,
  scale = 1,
  threshold = 0.1,
  delay = 0,
  onComplete,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const axis = direction === "horizontal" ? "x" : "y";
    const offset = reverse ? -distance : distance;
    const startPct = (1 - threshold) * 100;

    gsap.set(el, {
      [axis]: offset,
      scale,
      opacity: animateOpacity ? initialOpacity : 1,
    });

    const viewportHeight =
      typeof window !== "undefined"
        ? window.innerHeight || document.documentElement.clientHeight
        : 0;
    const rect = el.getBoundingClientRect();
    const triggerPoint = (startPct / 100) * viewportHeight;
    const shouldPlayImmediately =
      viewportHeight === 0 || rect.top <= triggerPoint;

    let tween: gsap.core.Tween | null = null;

    const tweenConfig = {
      [axis]: 0,
      scale: 1,
      opacity: 1,
      duration,
      ease,
      delay,
      onComplete,
    };

    if (shouldPlayImmediately) {
      tween = gsap.to(el, tweenConfig);
    } else {
      tween = gsap.to(el, {
        ...tweenConfig,
        scrollTrigger: {
          trigger: el,
          start: `top ${startPct}%`,
          toggleActions: "play none none none",
          once: true,
        },
      });
    }

    return () => {
      tween?.scrollTrigger?.kill();
      tween?.kill();
    };
  }, [
    distance,
    direction,
    reverse,
    duration,
    ease,
    initialOpacity,
    animateOpacity,
    scale,
    threshold,
    delay,
    onComplete,
  ]);

  return <div ref={ref}>{children}</div>;
};

export default AnimatedContent;
