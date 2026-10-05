import type { DifficultyBandName } from "./difficulty";

export type HazardType =
  | "fallingBlock"
  | "horizontalProjectile"
  | "movingWall";
export type ProjectileDirection = 1 | -1;

export interface HazardSpawnPlan {
  type: HazardType;
  warningDelayMs: number;
  lane?: number;
  direction?: ProjectileDirection;
  gapLevel?: number;
  speedMultiplier: number;
}

export interface EncounterPlan {
  hazards: HazardSpawnPlan[];
  maximumActiveHazards: number;
}

export type RandomSource = () => number;

export interface HazardDirectorConfig {
  lowIntervalMs: number;
  risingIntervalMs: number;
  criticalIntervalMs: number;
  minimumIntervalMs: number;
  intervalJitterRatio: number;
}

const VERTICAL_LANES = [0.16, 0.5, 0.84] as const;

function clampRandom(value: number): number {
  return Math.min(0.999_999, Math.max(0, value));
}

function randomBetween(
  random: RandomSource,
  minimum: number,
  maximum: number,
): number {
  return minimum + clampRandom(random()) * (maximum - minimum);
}

export class HazardDirector {
  private readonly config: HazardDirectorConfig;
  private isFirstEncounter = true;

  constructor(config: HazardDirectorConfig) {
    this.config = config;
  }

  createEncounter(
    difficulty: DifficultyBandName,
    occupiedSlots: number,
    random: RandomSource,
  ): EncounterPlan {
    const maximumActiveHazards = this.maximumActiveFor(difficulty);
    const availableSlots = Math.max(0, maximumActiveHazards - occupiedSlots);

    if (availableSlots === 0) {
      return { hazards: [], maximumActiveHazards };
    }

    if (this.isFirstEncounter) {
      this.isFirstEncounter = false;
      return {
        hazards: [{
          type: "fallingBlock",
          warningDelayMs: 0,
          lane: 0.5,
          speedMultiplier: 1,
        }],
        maximumActiveHazards,
      };
    }

    const encounterSize = Math.min(
      availableSlots,
      this.selectEncounterSize(difficulty, random()),
    );
    const hazardTypes = this.selectHazardTypes(encounterSize, random);
    const verticalLanePool = this.shuffledLanes(random);
    const horizontalDirections: ProjectileDirection[] = [];
    let verticalLaneIndex = 0;
    let previousPlan: HazardSpawnPlan | null = null;
    const hazards: HazardSpawnPlan[] = [];

    for (const type of hazardTypes) {
      const warningDelayMs = previousPlan
        ? this.nextWarningDelay(previousPlan, type, random)
        : 0;

      if (type === "fallingBlock") {
        const plan: HazardSpawnPlan = {
          type,
          warningDelayMs,
          lane: verticalLanePool[verticalLaneIndex % verticalLanePool.length],
          speedMultiplier: this.speedMultiplier(difficulty, random),
        };
        verticalLaneIndex += 1;
        hazards.push(plan);
        previousPlan = plan;
        continue;
      }

      if (type === "movingWall") {
        const plan: HazardSpawnPlan = {
          type,
          warningDelayMs,
          direction: random() < 0.5 ? 1 : -1,
          gapLevel: clampRandom(random()),
          speedMultiplier: this.speedMultiplier(difficulty, random),
        };
        hazards.push(plan);
        previousPlan = plan;
        continue;
      }

      let direction: ProjectileDirection = random() < 0.5 ? 1 : -1;
      const previousDirection = horizontalDirections.at(-1);
      if (
        previousPlan?.type === "horizontalProjectile"
        && previousDirection
        && warningDelayMs - previousPlan.warningDelayMs < 850
      ) {
        direction = previousDirection;
      }

      horizontalDirections.push(direction);
      const plan: HazardSpawnPlan = {
        type,
        warningDelayMs,
        direction,
        speedMultiplier: this.speedMultiplier(difficulty, random),
      };
      hazards.push(plan);
      previousPlan = plan;
    }

    return { hazards, maximumActiveHazards };
  }

  encounterDelayMs(
    difficulty: DifficultyBandName,
    randomValue: number,
  ): number {
    const baseDelay = difficulty === "LOW"
      ? this.config.lowIntervalMs
      : difficulty === "RISING"
        ? this.config.risingIntervalMs
        : this.config.criticalIntervalMs;
    const jitter = Math.min(1, Math.max(0, this.config.intervalJitterRatio));
    const multiplier = 1 + (clampRandom(randomValue) * 2 - 1) * jitter;
    return Math.max(
      this.config.minimumIntervalMs,
      Math.round(baseDelay * multiplier),
    );
  }

  maximumActiveFor(difficulty: DifficultyBandName): number {
    if (difficulty === "LOW") {
      return 1;
    }

    return difficulty === "RISING" ? 2 : 3;
  }

  private selectEncounterSize(
    difficulty: DifficultyBandName,
    randomValue: number,
  ): number {
    const roll = clampRandom(randomValue);
    if (difficulty === "LOW") {
      return 1;
    }

    if (difficulty === "RISING") {
      return roll < 0.55 ? 1 : 2;
    }

    if (roll < 0.25) {
      return 1;
    }

    return roll < 0.78 ? 2 : 3;
  }

  private speedMultiplier(
    difficulty: DifficultyBandName,
    random: RandomSource,
  ): number {
    const [minimum, maximum] = difficulty === "LOW"
      ? [0.95, 1.05]
      : difficulty === "RISING"
        ? [0.9, 1.12]
        : [0.88, 1.18];
    return randomBetween(random, minimum, maximum);
  }

  private selectHazardTypes(
    encounterSize: number,
    random: RandomSource,
  ): HazardType[] {
    const types: HazardType[] = [];

    for (let index = 0; index < encounterSize; index += 1) {
      const roll = clampRandom(random());
      const candidate: HazardType = roll < 0.38
        ? "fallingBlock"
        : roll < 0.76
          ? "horizontalProjectile"
          : "movingWall";

      if (candidate === "movingWall") {
        const alreadyHasWall = types.includes("movingWall");
        const wouldCreateTriple = encounterSize === 3;
        if (alreadyHasWall || wouldCreateTriple) {
          types.push("fallingBlock");
          continue;
        }

        // A wall combines with falling pressure, never a low projectile.
        for (let typeIndex = 0; typeIndex < types.length; typeIndex += 1) {
          if (types[typeIndex] === "horizontalProjectile") {
            types[typeIndex] = "fallingBlock";
          }
        }
        types.push(candidate);
        continue;
      }

      if (
        candidate === "horizontalProjectile"
        && types.includes("movingWall")
      ) {
        types.push("fallingBlock");
      } else {
        types.push(candidate);
      }
    }

    return types;
  }

  private nextWarningDelay(
    previousPlan: HazardSpawnPlan,
    nextType: HazardType,
    random: RandomSource,
  ): number {
    if (
      previousPlan.type === "fallingBlock"
      && nextType === "fallingBlock"
    ) {
      return previousPlan.warningDelayMs + (random() < 0.45
        ? 0
        : Math.round(randomBetween(random, 180, 380)));
    }

    if (
      previousPlan.type === "movingWall"
      || nextType === "movingWall"
    ) {
      return previousPlan.warningDelayMs
        + Math.round(randomBetween(random, 480, 760));
    }

    if (
      previousPlan.type === "horizontalProjectile"
      && nextType === "horizontalProjectile"
    ) {
      return previousPlan.warningDelayMs
        + Math.round(randomBetween(random, 650, 950));
    }

    return previousPlan.warningDelayMs + (random() < 0.3
      ? 0
      : Math.round(randomBetween(random, 320, 620)));
  }

  private shuffledLanes(random: RandomSource): number[] {
    const lanes = [...VERTICAL_LANES];
    for (let index = lanes.length - 1; index > 0; index -= 1) {
      const target = Math.floor(clampRandom(random()) * (index + 1));
      [lanes[index], lanes[target]] = [lanes[target], lanes[index]];
    }
    return lanes;
  }
}
