export type DifficultyBandName = "LOW" | "RISING" | "CRITICAL";

export interface DifficultyBand {
  name: DifficultyBandName;
  startsAtSeconds: number;
  fallingBlockSpeed: number;
  projectileSpeed: number;
  movingWallSpeed: number;
  errorCooldownMs: number;
}

export class DifficultyManager {
  private readonly bands: readonly DifficultyBand[];
  private elapsedSeconds = 0;

  constructor(bands: readonly DifficultyBand[]) {
    if (bands.length === 0) {
      throw new Error("At least one difficulty band is required.");
    }

    this.bands = bands;
  }

  get elapsed(): number {
    return this.elapsedSeconds;
  }

  get current(): DifficultyBand {
    let selectedBand = this.bands[0];

    for (const band of this.bands) {
      if (this.elapsedSeconds < band.startsAtSeconds) {
        break;
      }

      selectedBand = band;
    }

    return selectedBand;
  }

  update(deltaTime: number): void {
    this.elapsedSeconds += Math.max(0, deltaTime);
  }
}
