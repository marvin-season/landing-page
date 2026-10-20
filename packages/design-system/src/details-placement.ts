type VerticalBounds = { top: number; bottom: number };

/** Available space is clamped when the trigger is outside the visible boundary. */
export function getDetailsPlacement(
  trigger: VerticalBounds,
  boundary: VerticalBounds,
  side: "auto" | "top" | "bottom",
) {
  const above = Math.max(
    0,
    Math.min(trigger.top, boundary.bottom) - boundary.top - 8,
  );
  const below = Math.max(
    0,
    boundary.bottom - Math.max(trigger.bottom, boundary.top) - 8,
  );
  const resolvedSide =
    side === "auto" ? (above > below ? "top" : "bottom") : side;
  return {
    side: resolvedSide,
    maxHeight: resolvedSide === "top" ? above : below,
  };
}
