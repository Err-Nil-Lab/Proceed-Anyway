import kaplay from "kaplay";
import { GAME_CONFIG } from "./config";
import { AudioManager } from "./systems/audio";
import { DifficultyManager } from "./systems/difficulty";
import { ErrorManager, type GameError } from "./systems/errors";
import {
  HazardDirector,
  type ProjectileDirection,
} from "./systems/hazardDirector";
import {
  expandRectangle,
  NearMissTracker,
  rectanglesOverlap,
} from "./systems/nearMiss";
import { cutJumpVelocity } from "./systems/movement";
import { formatScore, ScoreManager } from "./systems/scoring";
import { shiftLane, type ShiftDirection } from "./systems/worldShift";
import "./style.css";

type RunState = "MENU" | "PLAYING" | "DYING" | "DEAD";
type CompressionMode = "LEFT" | "RIGHT" | "BOTH" | null;

const root = document.querySelector<HTMLElement>("#game");

if (!root) {
  throw new Error("Game root element was not found.");
}

const {
  arena,
  audio: audioConfig,
  colors,
  difficultyBands,
  difficultyLimits,
  errors: errorConfig,
  fallingBlock: fallingBlockConfig,
  hazardDirector: hazardDirectorConfig,
  horizontalProjectile: projectileConfig,
  juice: juiceConfig,
  movingWall: movingWallConfig,
  player: playerConfig,
  scoring: scoringConfig,
  ui,
} = GAME_CONFIG;

const k = kaplay({
  root,
  width: arena.width,
  height: arena.height,
  stretch: true,
  letterbox: true,
  background: colors.background,
  font: "monospace",
  global: false,
  crisp: true,
  debug: false,
  buttons: {
    moveLeft: {
      keyboard: ["left", "a"],
    },
    moveRight: {
      keyboard: ["right", "d"],
    },
    jump: {
      keyboard: ["space", "up", "w"],
    },
    restart: {
      keyboard: ["enter", "space"],
    },
  },
});

const audio = new AudioManager({
  ...audioConfig,
  bgmPath: `${import.meta.env.BASE_URL}${audioConfig.bgmPath}`,
});

k.setGravity(playerConfig.gravity);

function approach(current: number, target: number, amount: number): number {
  if (current < target) {
    return Math.min(current + amount, target);
  }

  return Math.max(current - amount, target);
}

function addBoundary(x: number, y: number, width: number, height: number) {
  return k.add([
    k.pos(x, y),
    k.rect(width, height),
    k.color(colors.foreground),
    k.area(),
    k.body({ isStatic: true }),
    "boundary",
  ]);
}

function addArena(): void {
  addBoundary(0, 0, arena.width, arena.borderSize);
  addBoundary(0, 0, arena.borderSize, arena.height);
  addBoundary(
    arena.width - arena.borderSize,
    0,
    arena.borderSize,
    arena.height,
  );
  addBoundary(
    0,
    arena.height - arena.floorHeight,
    arena.width,
    arena.floorHeight,
  );
}

k.scene("game", (options?: { autoStart?: boolean }) => {
  k.debug.timeScale = 1;
  let runState: RunState = "MENU";
  let horizontalSpeed = 0;
  let hasReceivedInput = false;
  let activeHazardCount = 0;
  let reservedHazardCount = 0;
  let closeCallCount = 0;
  let worldShiftDirection: ShiftDirection = 0;
  let compressionMode: CompressionMode = null;
  let compressionTargetLeft = 0;
  let compressionTargetRight = 0;
  let compressionCurrentLeft = 0;
  let compressionCurrentRight = 0;
  let slowMotionTimerId: number | null = null;
  let announcementVersion = 0;

  function restoreTimeScale(): void {
    if (slowMotionTimerId !== null) {
      window.clearTimeout(slowMotionTimerId);
      slowMotionTimerId = null;
    }
    k.debug.timeScale = 1;
  }

  function applySlowMotion(scale: number, durationMs: number): void {
    restoreTimeScale();
    k.debug.timeScale = Math.min(1, Math.max(0.05, scale));
    slowMotionTimerId = window.setTimeout(() => {
      k.debug.timeScale = 1;
      slowMotionTimerId = null;
    }, Math.max(0, durationMs));
  }

  addArena();

  const scoreManager = new ScoreManager(scoringConfig.pointsPerSecond);
  const difficultyManager = new DifficultyManager(difficultyBands);
  const hazardDirector = new HazardDirector(hazardDirectorConfig);
  let finalScore = 0;

  const scoreLabel = k.add([
    k.text(`SCORE ${formatScore(scoreManager.score)}`, { size: 21 }),
    k.pos(24, 22),
    k.color(colors.foreground),
    k.z(30),
    "runUi",
  ]);

  k.add([
    k.text(`BEST ${formatScore(scoreManager.bestScore)}`, { size: 21 }),
    k.pos(arena.width - 24, 22),
    k.anchor("topright"),
    k.color(colors.foreground),
    k.z(30),
    "runUi",
  ]);

  const activeErrorLabel = k.add([
    k.text("ERR: --", { size: 18 }),
    k.pos(24, 58),
    k.color(colors.muted),
    k.opacity(1),
    k.z(30),
    "runUi",
  ]);

  const loadLabel = k.add([
    k.text("LOAD: LOW", { size: 18 }),
    k.pos(arena.width - 24, 58),
    k.anchor("topright"),
    k.color(colors.muted),
    k.z(30),
    "runUi",
  ]);

  k.add([
    k.text("ERR NIL // 001", { size: 16 }),
    k.pos(24, arena.height - 25),
    k.anchor("botleft"),
    k.color(colors.muted),
    k.z(30),
    "runUi",
  ]);

  function destroyTaggedObjects(
    tag:
      | "fallingBlock"
      | "hazardWarning"
      | "horizontalProjectile"
      | "projectileWarning"
      | "movingWall"
      | "movingWallWarning"
      | "menuUi"
      | "playerVisual"
      | "errorTelegraph"
      | "systemAnnouncement"
      | "runFeedback",
  ): void {
    for (const gameObject of k.get(tag)) {
      k.destroy(gameObject);
    }
  }

  function showSystemAnnouncement(title: string, detail: string): void {
    destroyTaggedObjects("systemAnnouncement");
    announcementVersion += 1;
    const version = announcementVersion;

    k.add([
      k.pos(arena.width / 2, arena.height / 2),
      k.rect(520, 170),
      k.anchor("center"),
      k.color(colors.background),
      k.opacity(0.88),
      k.z(60),
      "systemAnnouncement",
    ]);

    k.add([
      k.text(title, {
        size: 30,
        align: "center",
      }),
      k.pos(arena.width / 2, arena.height / 2 - 28),
      k.anchor("center"),
      k.color(title.includes("ERROR") ? colors.error : colors.foreground),
      k.z(61),
      "systemAnnouncement",
    ]);

    k.add([
      k.text(detail, { size: 25, align: "center" }),
      k.pos(arena.width / 2, arena.height / 2 + 30),
      k.anchor("center"),
      k.color(colors.foreground),
      k.z(61),
      "systemAnnouncement",
    ]);

    k.wait(errorConfig.announcementDurationMs / 1_000, () => {
      if (version === announcementVersion) {
        destroyTaggedObjects("systemAnnouncement");
      }
    });
  }

  function showErrorTelegraph(error: GameError): void {
    destroyTaggedObjects("errorTelegraph");

    const cue = error === "INPUT_INVERTED"
      ? "<  INPUT  >"
      : error === "GRAVITY_UNSTABLE"
        ? "GRAVITY  ^"
        : error === "WORLD_SHIFT"
          ? "<  LANES  >"
          : error === "ARENA_COMPRESSED"
            ? ">  ARENA  <"
            : "_  TRACTION  _";

    k.add([
      k.text(`INCOMING ERROR\n${cue}`, {
        size: 22,
        align: "center",
        lineSpacing: 6,
      }),
      k.pos(arena.width / 2, arena.height / 2 - 90),
      k.anchor("center"),
      k.color(colors.error),
      k.opacity(0.82),
      k.z(55),
      "errorTelegraph",
    ]);

    if (error === "ICE_FLOOR") {
      k.add([
        k.pos(arena.borderSize, arena.height - arena.floorHeight - 5),
        k.rect(arena.width - arena.borderSize * 2, 5),
        k.color(colors.error),
        k.opacity(0.75),
        k.z(6),
        "errorTelegraph",
      ]);
    } else if (error === "ARENA_COMPRESSED") {
      for (const x of [arena.borderSize, arena.width - arena.borderSize - 10]) {
        k.add([
          k.pos(x, arena.borderSize),
          k.rect(10, arena.height - arena.floorHeight - arena.borderSize),
          k.color(colors.error),
          k.opacity(0.72),
          k.z(6),
          "errorTelegraph",
        ]);
      }
    }
  }

  function warnError(error: GameError): void {
    if (runState === "PLAYING") {
      showErrorTelegraph(error);
    }
  }

  function updateActiveErrorLabel(): void {
    const activeErrors = errorManager.active;
    if (activeErrors.length === 0) {
      activeErrorLabel.text = "ERR: --";
      activeErrorLabel.color = k.Color.fromHex(colors.muted);
      activeErrorLabel.opacity = 1;
      return;
    }

    activeErrorLabel.text = `ERR: ${activeErrors.map((error) => (
      `${error} (${errorManager.remainingSeconds(error)}s)`
    )).join("\n     + ")}`;
    activeErrorLabel.color = k.Color.fromHex(colors.error);
    const expiring = activeErrors.some((error) => (
      errorManager.remainingSeconds(error) <= 2
    ));
    activeErrorLabel.opacity = expiring
      ? 0.62 + Math.sin(k.time() * 12) * 0.38
      : 1;
  }

  function activateError(error: GameError): void {
    destroyTaggedObjects("errorTelegraph");
    if (error === "GRAVITY_UNSTABLE") {
      player.gravityScale = errorConfig.unstableGravityMultiplier;
    }

    if (error === "WORLD_SHIFT") {
      worldShiftDirection = k.chance(0.5) ? -1 : 1;
    }

    if (error === "ARENA_COMPRESSED") {
      const roll = Math.random();
      compressionMode = roll < 1 / 3
        ? "LEFT"
        : roll < 2 / 3 ? "RIGHT" : "BOTH";
      compressionTargetLeft = compressionMode === "LEFT"
        ? errorConfig.compressionSingleSideWidth
        : compressionMode === "BOTH"
          ? errorConfig.compressionBothSidesWidth
          : 0;
      compressionTargetRight = compressionMode === "RIGHT"
        ? errorConfig.compressionSingleSideWidth
        : compressionMode === "BOTH"
          ? errorConfig.compressionBothSidesWidth
          : 0;
    }

    const detail = error === "WORLD_SHIFT"
      ? `${error} // LANES ${worldShiftDirection === -1 ? "LEFT" : "RIGHT"}`
      : error === "ARENA_COMPRESSED"
        ? `${error} // ${compressionMode}`
        : error === "ICE_FLOOR"
          ? `${error} // TRACTION LOST`
          : error;
    updateActiveErrorLabel();
    audio.error();
    k.shake(1.5);
    applySlowMotion(
      juiceConfig.errorSlowScale,
      juiceConfig.errorSlowDurationMs,
    );
    const isStacked = errorManager.active.length > 1;
    showSystemAnnouncement(
      isStacked ? "ERROR STACKED" : "SYSTEM ERROR",
      isStacked ? errorManager.active.join(" + ") : detail,
    );
  }

  function deactivateError(error: GameError): void {
    if (error === "GRAVITY_UNSTABLE") {
      player.gravityScale = 1;
    }

    if (error === "WORLD_SHIFT") {
      worldShiftDirection = 0;
    }
    if (error === "ARENA_COMPRESSED") {
      compressionMode = null;
      compressionTargetLeft = 0;
      compressionTargetRight = 0;
    }

    const remainingErrors = errorManager.active;
    updateActiveErrorLabel();
    audio.restored();
    showSystemAnnouncement(
      remainingErrors.length > 0 ? "SYSTEM UPDATE" : "SYSTEM RESTORED",
      `${error} CLEARED`,
    );
  }

  const errorManager = new ErrorManager({
    ...errorConfig,
    cooldownMs: () => difficultyManager.current.errorCooldownMs,
    getElapsedSeconds: () => difficultyManager.elapsed,
  }, {
    onWarning: warnError,
    onActivate: activateError,
    onDeactivate: deactivateError,
  });

  const spawnX = arena.width / 2 - playerConfig.size / 2;
  const spawnY = arena.height
    - arena.floorHeight
    - playerConfig.size
    - 4;

  const player = k.add([
    k.pos(spawnX, spawnY),
    k.rect(playerConfig.size, playerConfig.size),
    k.opacity(0),
    k.area(),
    k.body({ maxVelocity: playerConfig.maxFallSpeed }),
    "player",
  ]);

  const playerVisual = k.add([
    k.pos(
      spawnX + playerConfig.size / 2,
      spawnY + playerConfig.size / 2,
    ),
    k.rect(playerConfig.size, playerConfig.size, { fill: false }),
    k.outline(4, k.Color.fromHex(colors.foreground)),
    k.anchor("center"),
    k.rotate(0),
    k.scale(1),
    k.z(8),
    "playerVisual",
  ]);
  const compressionWallHeight = arena.height
    - arena.floorHeight
    - arena.borderSize;
  const leftCompressionWall = k.add([
    k.pos(arena.borderSize, arena.borderSize),
    k.rect(1, compressionWallHeight),
    k.color(colors.foreground),
    k.opacity(0),
    k.z(3),
    "arenaCompression",
  ]);
  const rightCompressionWall = k.add([
    k.pos(arena.width - arena.borderSize, arena.borderSize),
    k.rect(1, compressionWallHeight),
    k.color(colors.foreground),
    k.opacity(0),
    k.z(3),
    "arenaCompression",
  ]);
  let wasAirborne = false;
  let landingSquashRemaining = 0;
  let jumpSpinDirection: -1 | 1 = 1;
  let deathVelocityY = 0;
  let deathSpinDirection: -1 | 1 = 1;

  playerVisual.onUpdate(() => {
    if (runState === "DYING") {
      deathVelocityY += juiceConfig.deathGravity * k.dt();
      playerVisual.pos.y += deathVelocityY * k.dt();
      playerVisual.angle += deathSpinDirection
        * juiceConfig.deathRotationSpeed
        * k.dt();
      playerVisual.scale.x = approach(playerVisual.scale.x, 0.82, k.dt() * 0.7);
      playerVisual.scale.y = approach(playerVisual.scale.y, 0.82, k.dt() * 0.7);
      return;
    }

    if (runState !== "PLAYING") {
      return;
    }

    playerVisual.pos.x = player.pos.x + playerConfig.size / 2;
    playerVisual.pos.y = player.pos.y + playerConfig.size / 2;
    const grounded = player.isGrounded();

    if (!grounded) {
      wasAirborne = true;
      playerVisual.angle += jumpSpinDirection
        * juiceConfig.playerAirRotationSpeed
        * k.dt();
      playerVisual.scale.x = 0.94;
      playerVisual.scale.y = 1.06;
      return;
    }

    if (wasAirborne) {
      wasAirborne = false;
      landingSquashRemaining = juiceConfig.playerLandingSquashDurationMs
        / 1_000;
    }

    const restingAngle = Math.round(playerVisual.angle / 90) * 90;
    playerVisual.angle = approach(
      playerVisual.angle,
      restingAngle + horizontalSpeed / playerConfig.moveSpeed
        * juiceConfig.playerGroundLeanDegrees,
      240 * k.dt(),
    );

    if (landingSquashRemaining > 0) {
      landingSquashRemaining = Math.max(
        0,
        landingSquashRemaining - k.dt(),
      );
      const progress = landingSquashRemaining
        / (juiceConfig.playerLandingSquashDurationMs / 1_000);
      playerVisual.scale.x = 1 + progress * 0.14;
      playerVisual.scale.y = 1 - progress * 0.18;
    } else {
      const idlePulse = Math.sin(k.time() * 4)
        * juiceConfig.playerIdlePulse;
      playerVisual.scale.x = 1 + idlePulse;
      playerVisual.scale.y = 1 - idlePulse;
    }
  });

  const controlHint = k.add([
    k.text(ui.controlHint, {
      size: ui.hintSize,
      align: "center",
    }),
    k.pos(arena.width / 2, 66),
    k.anchor("top"),
    k.color(colors.muted),
    k.opacity(1),
    k.z(10),
    "runUi",
  ]);

  function startGame(): void {
    if (runState !== "MENU") {
      return;
    }

    runState = "PLAYING";
    audio.unlock();
    destroyTaggedObjects("menuUi");
    errorManager.start();
    scheduleNextEncounter(fallingBlockConfig.firstSpawnDelayMs);
  }

  k.add([
    k.pos(0, 0),
    k.rect(arena.width, arena.height),
    k.color(colors.background),
    k.opacity(0.82),
    k.z(190),
    "menuUi",
  ]);

  k.add([
    k.text("ERR NIL // 001", { size: 18, align: "center" }),
    k.pos(arena.width / 2, arena.height / 2 - 146),
    k.anchor("center"),
    k.color(colors.muted),
    k.z(200),
    "menuUi",
  ]);

  k.add([
    k.text("PROCEED ANYWAY", {
      size: 52,
      align: "center",
    }),
    k.pos(arena.width / 2, arena.height / 2 - 72),
    k.anchor("center"),
    k.color(colors.foreground),
    k.z(200),
    "menuUi",
  ]);

  const menuButton = k.add([
    k.pos(arena.width / 2, arena.height / 2 + 74),
    k.rect(380, 76, { fill: false }),
    k.anchor("center"),
    k.area(),
    k.z(200),
    "menuUi",
  ]);

  k.add([
    k.text("> PROCEED ANYWAY", { size: 24, align: "center" }),
    k.pos(arena.width / 2, arena.height / 2 + 74),
    k.anchor("center"),
    k.color(colors.foreground),
    k.z(201),
    "menuUi",
  ]);

  k.add([
    k.text("CLICK  /  ENTER  /  SPACE", { size: 16, align: "center" }),
    k.pos(arena.width / 2, arena.height / 2 + 124),
    k.anchor("center"),
    k.color(colors.muted),
    k.z(200),
    "menuUi",
  ]);

  menuButton.onClick(startGame);

  function registerInput(): void {
    audio.unlock();

    if (hasReceivedInput || runState !== "PLAYING") {
      return;
    }

    hasReceivedInput = true;
    k.tween(
      controlHint.opacity,
      0,
      0.25,
      (value) => {
        controlHint.opacity = value;
      },
      k.easings.easeOutQuad,
    ).then(() => k.destroy(controlHint));
  }

  function showJumpFeedback(): void {
    const jumpMark = k.add([
      k.pos(player.pos.x + playerConfig.size / 2, player.pos.y + playerConfig.size),
      k.rect(24, 3),
      k.anchor("center"),
      k.color(colors.foreground),
      k.opacity(0.7),
      k.z(4),
      "runFeedback",
    ]);

    k.tween(jumpMark.opacity, 0, 0.18, (value) => {
      jumpMark.opacity = value;
    }, k.easings.easeOutQuad).then(() => k.destroy(jumpMark));
  }

  function showCloseCallFeedback(): void {
    const feedback = k.add([
      k.text(`CLOSE CALL +${scoringConfig.nearMissBonus}`, { size: 20 }),
      k.pos(player.pos.x + playerConfig.size / 2, player.pos.y - 16),
      k.anchor("center"),
      k.color(colors.foreground),
      k.opacity(1),
      k.z(40),
      "runFeedback",
    ]);

    const startingY = feedback.pos.y;
    k.shake(2);
    k.tween(0, 1, 0.6, (progress) => {
      feedback.pos.y = startingY - progress * 28;
      feedback.opacity = 1 - progress;
    }, k.easings.easeOutQuad).then(() => k.destroy(feedback));
  }

  function awardCloseCall(): void {
    closeCallCount += 1;
    scoreManager.add(scoringConfig.nearMissBonus);
    audio.nearMiss();
    showCloseCallFeedback();
  }

  function showGameOver(): void {
    if (runState !== "DEAD") {
      return;
    }

    k.add([
      k.pos(0, 0),
      k.rect(arena.width, arena.height),
      k.color(colors.background),
      k.opacity(0.82),
      k.z(90),
      "gameOverUi",
    ]);

    k.add([
      k.text(ui.gameOverTitle, {
        size: 52,
        align: "center",
      }),
      k.pos(arena.width / 2, arena.height / 2 - 104),
      k.anchor("center"),
      k.color(colors.foreground),
      k.z(100),
      "gameOverUi",
    ]);

    k.add([
      k.text(
        `SCORE       ${formatScore(finalScore)}\nBEST        ${formatScore(scoreManager.bestScore)}\nCLOSE CALLS ${String(closeCallCount).padStart(6, "0")}`,
        {
          size: 24,
          align: "center",
          lineSpacing: 10,
        },
      ),
      k.pos(arena.width / 2, arena.height / 2 - 8),
      k.anchor("center"),
      k.color(colors.foreground),
      k.z(100),
      "gameOverUi",
    ]);

    k.add([
      k.text(ui.restartPrompt, {
        size: 26,
        align: "center",
      }),
      k.pos(arena.width / 2, arena.height / 2 + 100),
      k.anchor("center"),
      k.color(colors.foreground),
      k.z(100),
      "gameOverUi",
    ]);

    k.add([
      k.text("ENTER / SPACE / CLICK", {
        size: 17,
        align: "center",
      }),
      k.pos(arena.width / 2, arena.height / 2 + 146),
      k.anchor("center"),
      k.color(colors.muted),
      k.z(100),
      "gameOverUi",
    ]);
  }

  function die(): void {
    if (runState !== "PLAYING") {
      return;
    }

    runState = "DYING";
    deathSpinDirection = horizontalSpeed < 0 ? -1 : 1;
    horizontalSpeed = 0;
    finalScore = scoreManager.finalize();
    errorManager.reset();
    player.gravityScale = 1;
    worldShiftDirection = 0;
    compressionMode = null;
    compressionTargetLeft = 0;
    compressionTargetRight = 0;
    compressionCurrentLeft = 0;
    compressionCurrentRight = 0;
    leftCompressionWall.width = 1;
    leftCompressionWall.opacity = 0;
    rightCompressionWall.width = 1;
    rightCompressionWall.pos.x = arena.width - arena.borderSize;
    rightCompressionWall.opacity = 0;
    audio.death();
    audio.stopBgm();
    deathVelocityY = -juiceConfig.deathLaunchSpeed;
    applySlowMotion(
      juiceConfig.deathSlowScale,
      juiceConfig.deathSlowDurationMs,
    );
    activeErrorLabel.text = "ERR: --";
    activeErrorLabel.color = k.Color.fromHex(colors.muted);
    destroyTaggedObjects("fallingBlock");
    destroyTaggedObjects("hazardWarning");
    destroyTaggedObjects("horizontalProjectile");
    destroyTaggedObjects("projectileWarning");
    destroyTaggedObjects("movingWall");
    destroyTaggedObjects("movingWallWarning");
    destroyTaggedObjects("systemAnnouncement");
    destroyTaggedObjects("runFeedback");
    k.destroy(player);
    k.shake(5);

    const deathFlash = k.add([
      k.pos(0, 0),
      k.rect(arena.width, arena.height),
      k.color(colors.foreground),
      k.opacity(0.32),
      k.z(110),
      "gameOverUi",
    ]);

    k.tween(
      deathFlash.opacity,
      0,
      0.1,
      (value) => {
        deathFlash.opacity = value;
      },
      k.easings.easeOutQuad,
    ).then(() => k.destroy(deathFlash));

    window.setTimeout(() => {
      if (runState !== "DYING") {
        return;
      }

      restoreTimeScale();
      runState = "DEAD";
    destroyTaggedObjects("playerVisual");
    destroyTaggedObjects("errorTelegraph");
      showGameOver();
    }, juiceConfig.deathAnimationDurationMs);
  }

  function spawnFallingBlock(x: number, speedMultiplier: number): void {
    if (runState !== "PLAYING") {
      return;
    }

    const nearMissTracker = new NearMissTracker();
    activeHazardCount += 1;
    const speed = Math.min(
      difficultyManager.current.fallingBlockSpeed * speedMultiplier,
      difficultyLimits.maximumFallingBlockSpeed,
    );
    const block = k.add([
      k.pos(x, arena.borderSize),
      k.rect(fallingBlockConfig.size, fallingBlockConfig.size),
      k.color(colors.foreground),
      k.area(),
      k.z(5),
      "fallingBlock",
    ]);

    block.onUpdate(() => {
      if (runState !== "PLAYING") {
        return;
      }

      block.move(0, speed);

      const playerRectangle = {
        x: player.pos.x,
        y: player.pos.y,
        width: playerConfig.size,
        height: playerConfig.size,
      };
      const blockRectangle = {
        x: block.pos.x,
        y: block.pos.y,
        width: fallingBlockConfig.size,
        height: fallingBlockConfig.size,
      };
      const nearRectangle = expandRectangle(
        blockRectangle,
        fallingBlockConfig.nearMissPaddingX,
        fallingBlockConfig.nearMissPaddingY,
      );
      const lethal = rectanglesOverlap(playerRectangle, blockRectangle);
      const near = rectanglesOverlap(playerRectangle, nearRectangle);

      if (lethal) {
        nearMissTracker.update(near, true, true);
        die();
        return;
      }

      if (nearMissTracker.update(near, false, true)) {
        awardCloseCall();
      }

      const floorTop = arena.height - arena.floorHeight;
      if (block.pos.y + fallingBlockConfig.size >= floorTop) {
        if (nearMissTracker.update(false, false, true)) {
          awardCloseCall();
        }
        activeHazardCount = Math.max(0, activeHazardCount - 1);
        k.destroy(block);
      }
    });

    block.onCollide("player", die);
  }

  function beginFallingBlockSequence(
    lane: number,
    speedMultiplier: number,
  ): void {
    audio.warning("falling");
    const reservedLeftInset = Math.max(
      compressionCurrentLeft,
      compressionTargetLeft,
    );
    const reservedRightInset = Math.max(
      compressionCurrentRight,
      compressionTargetRight,
    );
    const minimumX = arena.borderSize
      + reservedLeftInset
      + fallingBlockConfig.horizontalPadding;
    const maximumX = arena.width
      - arena.borderSize
      - reservedRightInset
      - fallingBlockConfig.horizontalPadding
      - fallingBlockConfig.size;
    const shiftedLane = shiftLane(
      lane,
      worldShiftDirection,
      errorConfig.worldShiftLaneOffset,
    );
    const spawnPositionX = minimumX
      + shiftedLane * (maximumX - minimumX);

    const warning = k.add([
      k.text("▼", { size: 30 }),
      k.pos(
        spawnPositionX + fallingBlockConfig.size / 2,
        arena.borderSize + 84,
      ),
      k.anchor("top"),
      k.color(colors.foreground),
      k.opacity(1),
      k.z(20),
      "hazardWarning",
    ]);

    k.tween(
      warning.opacity,
      0.25,
      fallingBlockConfig.warningDurationMs / 2_000,
      (value) => {
        warning.opacity = value;
      },
      k.easings.easeInOutSine,
    );

    k.wait(fallingBlockConfig.warningDurationMs / 1_000, () => {
      k.destroy(warning);
      reservedHazardCount = Math.max(0, reservedHazardCount - 1);

      if (runState === "PLAYING") {
        spawnFallingBlock(spawnPositionX, speedMultiplier);
      }
    });
  }

  function spawnHorizontalProjectile(
    direction: ProjectileDirection,
    speedMultiplier: number,
  ): void {
    if (runState !== "PLAYING") {
      return;
    }

    const floorTop = arena.height - arena.floorHeight;
    const playableLeft = arena.borderSize + compressionCurrentLeft;
    const playableRight = arena.width
      - arena.borderSize
      - compressionCurrentRight;
    const spawnPositionX = direction === 1
      ? playableLeft - projectileConfig.width
      : playableRight;
    const spawnPositionY = floorTop
      - projectileConfig.height
      - projectileConfig.floorOffset;

    const nearMissTracker = new NearMissTracker();
    activeHazardCount += 1;
    const speed = Math.min(
      difficultyManager.current.projectileSpeed * speedMultiplier,
      difficultyLimits.maximumProjectileSpeed,
    );
    const projectile = k.add([
      k.pos(spawnPositionX, spawnPositionY),
      k.rect(projectileConfig.width, projectileConfig.height),
      k.color(colors.foreground),
      k.area(),
      k.z(6),
      "horizontalProjectile",
    ]);

    projectile.onUpdate(() => {
      if (runState !== "PLAYING") {
        return;
      }

      projectile.move(direction * speed, 0);

      const playerRectangle = {
        x: player.pos.x,
        y: player.pos.y,
        width: playerConfig.size,
        height: playerConfig.size,
      };
      const projectileRectangle = {
        x: projectile.pos.x,
        y: projectile.pos.y,
        width: projectileConfig.width,
        height: projectileConfig.height,
      };
      const nearRectangle = expandRectangle(
        projectileRectangle,
        projectileConfig.nearMissPaddingX,
        projectileConfig.nearMissPaddingY,
      );
      const lethal = rectanglesOverlap(playerRectangle, projectileRectangle);
      const near = rectanglesOverlap(playerRectangle, nearRectangle);

      if (lethal) {
        nearMissTracker.update(near, true, true);
        die();
        return;
      }

      if (nearMissTracker.update(near, false, true)) {
        awardCloseCall();
      }

      const exitedRight = projectile.pos.x > arena.width;
      const exitedLeft = projectile.pos.x + projectileConfig.width < 0;
      if (exitedRight || exitedLeft) {
        activeHazardCount = Math.max(0, activeHazardCount - 1);
        k.destroy(projectile);
      }
    });

    projectile.onCollide("player", die);
  }

  function beginHorizontalProjectileSequence(
    direction: ProjectileDirection,
    speedMultiplier: number,
  ): void {
    audio.warning("projectile");
    const warningCharacter = direction === 1 ? "▶" : "◀";
    const reservedLeftInset = Math.max(
      compressionCurrentLeft,
      compressionTargetLeft,
    );
    const reservedRightInset = Math.max(
      compressionCurrentRight,
      compressionTargetRight,
    );
    const warningPositionX = direction === 1
      ? arena.borderSize + reservedLeftInset + 18
      : arena.width - arena.borderSize - reservedRightInset - 18;
    const floorTop = arena.height - arena.floorHeight;
    const warningPositionY = floorTop
      - projectileConfig.height
      - projectileConfig.floorOffset;

    const warning = k.add([
      k.text(warningCharacter, { size: 34 }),
      k.pos(warningPositionX, warningPositionY),
      k.anchor(direction === 1 ? "left" : "right"),
      k.color(colors.foreground),
      k.opacity(1),
      k.z(20),
      "projectileWarning",
    ]);

    k.tween(
      warning.opacity,
      0.25,
      projectileConfig.warningDurationMs / 2_000,
      (value) => {
        warning.opacity = value;
      },
      k.easings.easeInOutSine,
    );

    k.wait(projectileConfig.warningDurationMs / 1_000, () => {
      k.destroy(warning);
      reservedHazardCount = Math.max(0, reservedHazardCount - 1);

      if (runState === "PLAYING") {
        spawnHorizontalProjectile(direction, speedMultiplier);
      }
    });
  }

  function spawnMovingWall(
    direction: ProjectileDirection,
    gapLevel: number,
    speedMultiplier: number,
  ): void {
    if (runState !== "PLAYING") {
      return;
    }

    const floorTop = arena.height - arena.floorHeight;
    const clampedGapLevel = Math.min(1, Math.max(0, gapLevel));
    const gapTop = movingWallConfig.minimumGapTop
      + clampedGapLevel
      * (movingWallConfig.maximumGapTop - movingWallConfig.minimumGapTop);
    const gapBottom = gapTop + movingWallConfig.gapHeight;
    const upperHeight = gapTop - arena.borderSize;
    const lowerHeight = Math.max(0, floorTop - gapBottom);
    const playableLeft = arena.borderSize + compressionCurrentLeft;
    const playableRight = arena.width
      - arena.borderSize
      - compressionCurrentRight;
    const spawnX = direction === 1
      ? playableLeft - movingWallConfig.thickness
      : playableRight;
    const speed = Math.min(
      difficultyManager.current.movingWallSpeed * speedMultiplier,
      difficultyLimits.maximumMovingWallSpeed,
    );
    const nearMissTracker = new NearMissTracker();

    activeHazardCount += 1;

    const upperWall = k.add([
      k.pos(spawnX, arena.borderSize),
      k.rect(movingWallConfig.thickness, upperHeight),
      k.color(colors.foreground),
      k.area(),
      k.z(7),
      "movingWall",
    ]);
    const wallSegments = [upperWall];

    if (lowerHeight > 0) {
      wallSegments.push(k.add([
        k.pos(spawnX, gapBottom),
        k.rect(movingWallConfig.thickness, lowerHeight),
        k.color(colors.foreground),
        k.area(),
        k.z(7),
        "movingWall",
      ]));
    }

    for (const segment of wallSegments) {
      segment.onCollide("player", die);
    }

    upperWall.onUpdate(() => {
      if (runState !== "PLAYING") {
        return;
      }

      for (const segment of wallSegments) {
        segment.move(direction * speed, 0);
      }

      const playerRectangle = {
        x: player.pos.x,
        y: player.pos.y,
        width: playerConfig.size,
        height: playerConfig.size,
      };
      const segmentRectangles = wallSegments.map((segment) => ({
        x: segment.pos.x,
        y: segment.pos.y,
        width: movingWallConfig.thickness,
        height: segment === upperWall ? upperHeight : lowerHeight,
      }));
      const lethal = segmentRectangles.some((rectangle) => (
        rectanglesOverlap(playerRectangle, rectangle)
      ));
      const near = segmentRectangles.some((rectangle) => (
        rectanglesOverlap(
          playerRectangle,
          expandRectangle(
            rectangle,
            movingWallConfig.nearMissPaddingX,
            movingWallConfig.nearMissPaddingY,
          ),
        )
      ));

      if (lethal) {
        nearMissTracker.update(near, true, true);
        die();
        return;
      }

      if (nearMissTracker.update(near, false, true)) {
        awardCloseCall();
      }

      const exitedRight = upperWall.pos.x > arena.width;
      const exitedLeft = upperWall.pos.x + movingWallConfig.thickness < 0;
      if (exitedRight || exitedLeft) {
        if (nearMissTracker.update(false, false, true)) {
          awardCloseCall();
        }
        activeHazardCount = Math.max(0, activeHazardCount - 1);
        for (const segment of wallSegments) {
          k.destroy(segment);
        }
      }
    });
  }

  function beginMovingWallSequence(
    direction: ProjectileDirection,
    gapLevel: number,
    speedMultiplier: number,
  ): void {
    audio.warning("wall");
    const floorTop = arena.height - arena.floorHeight;
    const clampedGapLevel = Math.min(1, Math.max(0, gapLevel));
    const gapTop = movingWallConfig.minimumGapTop
      + clampedGapLevel
      * (movingWallConfig.maximumGapTop - movingWallConfig.minimumGapTop);
    const gapBottom = gapTop + movingWallConfig.gapHeight;
    const reservedLeftInset = Math.max(
      compressionCurrentLeft,
      compressionTargetLeft,
    );
    const reservedRightInset = Math.max(
      compressionCurrentRight,
      compressionTargetRight,
    );
    const warningX = direction === 1
      ? arena.borderSize + reservedLeftInset + 18
      : arena.width - arena.borderSize - reservedRightInset - 18;
    const upperWarning = k.add([
      k.pos(warningX, arena.borderSize),
      k.rect(8, gapTop - arena.borderSize),
      k.anchor(direction === 1 ? "left" : "right"),
      k.color(colors.foreground),
      k.opacity(1),
      k.z(20),
      "movingWallWarning",
    ]);
    const warnings = [upperWarning];
    const lowerHeight = Math.max(0, floorTop - gapBottom);

    if (lowerHeight > 0) {
      warnings.push(k.add([
        k.pos(warningX, gapBottom),
        k.rect(8, lowerHeight),
        k.anchor(direction === 1 ? "left" : "right"),
        k.color(colors.foreground),
        k.opacity(1),
        k.z(20),
        "movingWallWarning",
      ]));
    }

    for (const warning of warnings) {
      k.tween(
        warning.opacity,
        0.25,
        movingWallConfig.warningDurationMs / 2_000,
        (value) => {
          warning.opacity = value;
        },
        k.easings.easeInOutSine,
      );
    }

    k.wait(movingWallConfig.warningDurationMs / 1_000, () => {
      for (const warning of warnings) {
        k.destroy(warning);
      }
      reservedHazardCount = Math.max(0, reservedHazardCount - 1);

      if (runState === "PLAYING") {
        spawnMovingWall(direction, clampedGapLevel, speedMultiplier);
      }
    });
  }

  function scheduleNextEncounter(delayMs: number): void {
    k.wait(delayMs / 1_000, () => {
      if (runState !== "PLAYING") {
        return;
      }

      const encounter = hazardDirector.createEncounter(
        difficultyManager.current.name,
        activeHazardCount + reservedHazardCount,
        Math.random,
      );

      if (encounter.hazards.length === 0) {
        scheduleNextEncounter(hazardDirectorConfig.occupiedRetryDelayMs);
        return;
      }

      reservedHazardCount += encounter.hazards.length;

      for (const hazard of encounter.hazards) {
        k.wait(hazard.warningDelayMs / 1_000, () => {
          if (runState !== "PLAYING") {
            return;
          }

          if (hazard.type === "fallingBlock") {
            beginFallingBlockSequence(
              hazard.lane ?? 0.5,
              hazard.speedMultiplier,
            );
          } else if (hazard.type === "horizontalProjectile") {
            beginHorizontalProjectileSequence(
              hazard.direction ?? 1,
              hazard.speedMultiplier,
            );
          } else {
            beginMovingWallSequence(
              hazard.direction ?? 1,
              hazard.gapLevel ?? 0.5,
              hazard.speedMultiplier,
            );
          }
        });
      }

      scheduleNextEncounter(hazardDirector.encounterDelayMs(
        difficultyManager.current.name,
        Math.random(),
      ));
    });
  }

  function restart(): void {
    if (runState === "MENU") {
      startGame();
    } else if (runState === "DEAD") {
      restoreTimeScale();
      k.go("game", { autoStart: true });
    }
  }

  k.onButtonPress("moveLeft", registerInput);
  k.onButtonPress("moveRight", registerInput);

  k.onUpdate(() => {
    if (runState !== "PLAYING") {
      return;
    }

    scoreManager.update(k.dt());
    difficultyManager.update(k.dt());
    scoreLabel.text = `SCORE ${formatScore(scoreManager.score)}`;
    loadLabel.text = `LOAD: ${difficultyManager.current.name}`;
    updateActiveErrorLabel();

    const leftHeld = k.isButtonDown("moveLeft");
    const rightHeld = k.isButtonDown("moveRight");
    const rawInputDirection = Number(rightHeld) - Number(leftHeld);
    const effectiveInputDirection = rawInputDirection
      * errorManager.horizontalInputMultiplier;
    const targetSpeed = effectiveInputDirection * playerConfig.moveSpeed;
    const iceActive = errorManager.has("ICE_FLOOR");
    const rate = rawInputDirection === 0
      ? iceActive ? errorConfig.iceDeceleration : playerConfig.deceleration
      : iceActive ? errorConfig.iceAcceleration : playerConfig.acceleration;

    horizontalSpeed = approach(horizontalSpeed, targetSpeed, rate * k.dt());
    player.move(horizontalSpeed, 0);

    compressionCurrentLeft = approach(
      compressionCurrentLeft,
      compressionTargetLeft,
      errorConfig.compressionSpeed * k.dt(),
    );
    compressionCurrentRight = approach(
      compressionCurrentRight,
      compressionTargetRight,
      errorConfig.compressionSpeed * k.dt(),
    );
    leftCompressionWall.width = Math.max(1, compressionCurrentLeft);
    leftCompressionWall.opacity = compressionCurrentLeft > 0.5 ? 1 : 0;
    rightCompressionWall.width = Math.max(1, compressionCurrentRight);
    rightCompressionWall.pos.x = arena.width
      - arena.borderSize
      - compressionCurrentRight;
    rightCompressionWall.opacity = compressionCurrentRight > 0.5 ? 1 : 0;

    const playableMinimumX = arena.borderSize + compressionCurrentLeft;
    const playableMaximumX = arena.width
      - arena.borderSize
      - compressionCurrentRight
      - playerConfig.size;
    player.pos.x = Math.min(
      playableMaximumX,
      Math.max(playableMinimumX, player.pos.x),
    );

    if (rawInputDirection !== 0) {
      registerInput();
    }
  });

  k.onButtonPress("jump", () => {
    if (runState === "MENU") {
      return;
    }

    registerInput();

    if (runState === "PLAYING" && player.isGrounded()) {
      jumpSpinDirection = Math.abs(horizontalSpeed) > 20
        ? horizontalSpeed < 0 ? -1 : 1
        : jumpSpinDirection === 1 ? -1 : 1;
      player.jump(playerConfig.jumpForce);
      audio.jump();
      showJumpFeedback();
    }
  });

  k.onButtonRelease("jump", () => {
    if (runState === "PLAYING") {
      player.vel.y = cutJumpVelocity(
        player.vel.y,
        playerConfig.jumpCutMultiplier,
      );
    }
  });

  k.onButtonPress("restart", restart);
  k.onMousePress(restart);

  if (options?.autoStart) {
    startGame();
  }

});

k.go("game");
