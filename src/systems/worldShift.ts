export type ShiftDirection = -1 | 0 | 1;

export function shiftLane(
  lane: number,
  direction: ShiftDirection,
  offset: number,
): number {
  return Math.min(1, Math.max(0, lane + direction * Math.max(0, offset)));
}
