export function cutJumpVelocity(
  verticalVelocity: number,
  multiplier: number,
): number {
  if (verticalVelocity >= 0) {
    return verticalVelocity;
  }

  return verticalVelocity * Math.min(1, Math.max(0, multiplier));
}
