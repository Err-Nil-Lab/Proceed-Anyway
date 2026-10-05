const BEST_SCORE_KEY = "proceed-anyway.best-score";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function getBrowserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readBestScore(storage: StorageLike | null): number {
  if (!storage) {
    return 0;
  }

  try {
    const storedValue = storage.getItem(BEST_SCORE_KEY);
    if (storedValue === null) {
      return 0;
    }

    const parsedValue = Number(storedValue);
    return Number.isFinite(parsedValue) && parsedValue >= 0
      ? Math.floor(parsedValue)
      : 0;
  } catch {
    return 0;
  }
}

export class ScoreManager {
  readonly pointsPerSecond: number;
  private readonly storage: StorageLike | null;
  private accumulatedScore = 0;
  private storedBestScore: number;

  constructor(pointsPerSecond: number, storage = getBrowserStorage()) {
    this.pointsPerSecond = pointsPerSecond;
    this.storage = storage;
    this.storedBestScore = readBestScore(storage);
  }

  get score(): number {
    return Math.floor(this.accumulatedScore);
  }

  get bestScore(): number {
    return this.storedBestScore;
  }

  update(deltaTime: number): void {
    this.accumulatedScore += this.pointsPerSecond * deltaTime;
  }

  add(points: number): void {
    this.accumulatedScore += Math.max(0, points);
  }

  finalize(): number {
    if (this.score <= this.storedBestScore) {
      return this.score;
    }

    this.storedBestScore = this.score;

    try {
      this.storage?.setItem(BEST_SCORE_KEY, String(this.storedBestScore));
    } catch {
      // Storage can be unavailable or full. A run must still remain playable.
    }

    return this.score;
  }
}

export function formatScore(score: number): string {
  return Math.max(0, Math.floor(score)).toString().padStart(6, "0");
}
