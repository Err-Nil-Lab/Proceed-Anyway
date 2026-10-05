export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function rectanglesOverlap(a: Rectangle, b: Rectangle): boolean {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

export function expandRectangle(
  rectangle: Rectangle,
  paddingX: number,
  paddingY: number,
): Rectangle {
  return {
    x: rectangle.x - paddingX,
    y: rectangle.y - paddingY,
    width: rectangle.width + paddingX * 2,
    height: rectangle.height + paddingY * 2,
  };
}

export class NearMissTracker {
  private entered = false;
  private resolved = false;

  update(near: boolean, lethal: boolean, alive: boolean): boolean {
    if (this.resolved) {
      return false;
    }

    // A lethal overlap permanently disqualifies this hazard before any reward.
    if (lethal) {
      this.resolved = true;
      return false;
    }

    if (near) {
      this.entered = true;
      return false;
    }

    if (this.entered && alive) {
      this.resolved = true;
      return true;
    }

    return false;
  }
}
