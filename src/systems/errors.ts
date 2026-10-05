export type GameError =
  | "INPUT_INVERTED"
  | "GRAVITY_UNSTABLE"
  | "WORLD_SHIFT"
  | "ARENA_COMPRESSED"
  | "ICE_FLOOR";

const ALL_ERRORS: readonly GameError[] = [
  "ARENA_COMPRESSED",
  "ICE_FLOOR",
  "WORLD_SHIFT",
  "INPUT_INVERTED",
  "GRAVITY_UNSTABLE",
];

const ALLOWED_ERROR_PAIRS = new Set([
  "GRAVITY_UNSTABLE+INPUT_INVERTED",
  "INPUT_INVERTED+WORLD_SHIFT",
  "GRAVITY_UNSTABLE+WORLD_SHIFT",
  "ARENA_COMPRESSED+INPUT_INVERTED",
  "ARENA_COMPRESSED+GRAVITY_UNSTABLE",
  "ARENA_COMPRESSED+WORLD_SHIFT",
  "ICE_FLOOR+INPUT_INVERTED",
  "GRAVITY_UNSTABLE+ICE_FLOOR",
  "ICE_FLOOR+WORLD_SHIFT",
  "ARENA_COMPRESSED+ICE_FLOOR",
]);

interface ErrorManagerConfig {
  firstActivationDelayMs: number;
  warningDurationMs: number;
  activeDurationMs: number;
  cooldownMs: number | (() => number);
  overlapAfterSeconds: number;
  overlapDelayMs: number;
  maximumConcurrentErrors: number;
  getElapsedSeconds: () => number;
}

interface ErrorManagerCallbacks {
  onWarning(error: GameError): void;
  onActivate(error: GameError): void;
  onDeactivate(error: GameError): void;
}

export class ErrorManager {
  private readonly activeErrors = new Set<GameError>();
  private readonly errorDeadlines = new Map<GameError, number>();
  private readonly timerIds = new Set<number>();
  private readonly config: ErrorManagerConfig;
  private readonly callbacks: ErrorManagerCallbacks;
  private errorBag: GameError[] = [];
  private lastSelectedError: GameError | null = null;
  private running = false;

  constructor(
    config: ErrorManagerConfig,
    callbacks: ErrorManagerCallbacks,
  ) {
    this.config = config;
    this.callbacks = callbacks;
  }

  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.scheduleActivation(this.config.firstActivationDelayMs);
  }

  reset(): void {
    this.running = false;
    this.activeErrors.clear();
    this.errorDeadlines.clear();
    this.errorBag = [];
    this.lastSelectedError = null;

    for (const timerId of this.timerIds) {
      window.clearTimeout(timerId);
    }

    this.timerIds.clear();
  }

  has(error: GameError): boolean {
    return this.activeErrors.has(error);
  }

  get horizontalInputMultiplier(): 1 | -1 {
    return this.has("INPUT_INVERTED") ? -1 : 1;
  }

  get active(): readonly GameError[] {
    return [...this.activeErrors];
  }

  remainingSeconds(error: GameError): number {
    const deadline = this.errorDeadlines.get(error);
    if (deadline === undefined) {
      return 0;
    }

    return Math.max(0, Math.ceil((deadline - performance.now()) / 1_000));
  }

  private schedule(callback: () => void, delayMs: number): void {
    const timerId = window.setTimeout(() => {
      this.timerIds.delete(timerId);
      callback();
    }, delayMs);

    this.timerIds.add(timerId);
  }

  private scheduleActivation(delayMs: number): void {
    this.schedule(() => {
      if (!this.running) {
        return;
      }

      this.startErrorCycle();
    }, delayMs);
  }

  private startErrorCycle(): void {
    const primaryError = this.selectNextCompatibleError();
    if (!primaryError) {
      this.scheduleActivation(this.resolveCooldownMs());
      return;
    }

    this.warnThenActivate(primaryError, () => {
      const overlapEnabled = this.config.getElapsedSeconds()
        >= this.config.overlapAfterSeconds;
      if (overlapEnabled && this.config.maximumConcurrentErrors > 1) {
        this.schedule(() => {
          const secondaryError = this.selectNextCompatibleError();
          if (secondaryError) {
            this.warnThenActivate(secondaryError);
          }
        }, this.config.overlapDelayMs);
      }
    });

    this.scheduleActivation(
      this.config.warningDurationMs
        + this.config.activeDurationMs
        + this.resolveCooldownMs(),
    );
  }

  private warnThenActivate(
    error: GameError,
    onActivated?: () => void,
  ): void {
    if (!this.running || !this.canActivate(error)) {
      return;
    }

    this.callbacks.onWarning(error);
    this.schedule(() => {
      if (this.activate(error)) {
        onActivated?.();
      }
    }, this.config.warningDurationMs);
  }

  private activate(error: GameError): boolean {
    if (!this.running || !this.canActivate(error)) {
      return false;
    }

    this.activeErrors.add(error);
    this.errorDeadlines.set(
      error,
      performance.now() + this.config.activeDurationMs,
    );
    this.callbacks.onActivate(error);

    this.schedule(() => {
      this.deactivate(error);
    }, this.config.activeDurationMs);

    return true;
  }

  private deactivate(error: GameError): void {
    if (!this.running || !this.activeErrors.delete(error)) {
      return;
    }

    this.errorDeadlines.delete(error);
    this.callbacks.onDeactivate(error);
  }

  private canActivate(error: GameError): boolean {
    if (
      this.activeErrors.has(error)
      || this.activeErrors.size >= this.config.maximumConcurrentErrors
    ) {
      return false;
    }

    return [...this.activeErrors].every((activeError) => {
      const pair = [activeError, error].sort().join("+");
      return ALLOWED_ERROR_PAIRS.has(pair);
    });
  }

  private selectNextCompatibleError(): GameError | null {
    if (this.errorBag.length === 0) {
      this.refillErrorBag();
    }

    const compatibleIndex = this.errorBag.findIndex((error) => (
      this.canActivate(error)
    ));
    if (compatibleIndex === -1) {
      return null;
    }

    const [selected] = this.errorBag.splice(compatibleIndex, 1);
    this.lastSelectedError = selected;
    return selected;
  }

  private refillErrorBag(): void {
    this.errorBag = [...ALL_ERRORS];

    for (let index = this.errorBag.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [this.errorBag[index], this.errorBag[randomIndex]] = [
        this.errorBag[randomIndex],
        this.errorBag[index],
      ];
    }

    const nextIndex = this.errorBag.findIndex((error) => (
      error !== this.lastSelectedError
    ));
    if (
      nextIndex > 0
      && this.errorBag[0] === this.lastSelectedError
    ) {
      [this.errorBag[0], this.errorBag[nextIndex]] = [
        this.errorBag[nextIndex],
        this.errorBag[0],
      ];
    }

  }

  private resolveCooldownMs(): number {
    return typeof this.config.cooldownMs === "function"
      ? this.config.cooldownMs()
      : this.config.cooldownMs;
  }
}
