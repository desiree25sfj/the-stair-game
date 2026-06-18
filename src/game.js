(function () {
  "use strict";

  const config = window.StairGameConfig;
  const { clamp, lerp } = window.StairGameUtils;
  const { createStairs } = window.StairGameStairs;
  const { createPlayer } = window.StairGamePlayer;

  function createGame(input, ui, renderer) {
    const stairs = createStairs();
    const player = createPlayer();

    let score = 0;
    let highScore = readHighScore();
    let state = "running";
    let speed = config.baseSpeed;
    let cameraX = 0;
    let cameraY = 0;
    let shakeTime = 0;
    let runNumber = 0;

    const camera = {
      worldToScreen(row, lane) {
        const size = renderer.getSize();

        return {
          x: size.width / 2 + lane * config.tileWidth - cameraX,
          y: size.height * 0.66 - row * config.tileHeight + cameraY
        };
      }
    };

    function reset() {
      score = 0;
      state = "running";
      speed = config.baseSpeed;
      shakeTime = 0;
      runNumber += 1;

      stairs.reset(config.startRow, config.seedBase + runNumber * 9973);

      const start = stairs.getStep(config.startRow);
      const next = stairs.getStep(config.startRow + 1);
      player.reset(start.row, start.lane, next.lane - start.lane);

      cameraX = player.lane * config.tileWidth;
      cameraY = player.row * config.tileHeight;
      updateScoreUi();
      hideGameOver();
    }

    function update(dt) {
      const cappedDt = Math.min(dt, 0.035);
      processInput();

      if (state === "running") {
        speed = getSpeed(score);
        player.update(cappedDt, speed, false);

        while (player.hasStepReady() && state === "running") {
          player.completeStep();
          resolveCompletedStep();
        }
      } else {
        player.update(cappedDt, speed, true);
        shakeTime = Math.max(0, shakeTime - cappedDt);
      }

      updateCamera(cappedDt);
    }

    function processInput() {
      if (!input.consumeDirectionToggle()) return;

      if (state === "gameOver") {
        reset();
        return;
      }

      player.queueDirectionToggle();
    }

    function resolveCompletedStep() {
      if (!stairs.hasStep(player.row, player.lane)) {
        endGame();
        return;
      }

      score += 1;
      updateScoreUi();
      stairs.generateUntil(player.row + config.lookAhead, score);
      stairs.prune(player.row);
    }

    function getSpeed(currentScore) {
      const earlyRamp = clamp(currentScore / config.earlySpeedSteps, 0, 1);
      const lateRamp = clamp((currentScore - config.lateSpeedStart) / config.lateSpeedSteps, 0, 1);
      return config.baseSpeed + earlyRamp * config.earlySpeedBonus + lateRamp * config.lateSpeedBonus;
    }

    function updateCamera(dt) {
      const targetX = (player.lane + player.stepDirection * player.progress) * config.tileWidth;
      const targetY = (player.row + player.progress) * config.tileHeight;
      const follow = 1 - Math.pow(config.cameraFollowSharpness, dt);

      cameraX = lerp(cameraX, targetX, follow);
      cameraY = lerp(cameraY, targetY, follow);
    }

    function endGame() {
      state = "gameOver";
      shakeTime = config.shakeDuration;

      if (score > highScore) {
        highScore = score;
        localStorage.setItem(config.highScoreKey, String(highScore));
      }

      showGameOver();
      updateScoreUi();
    }

    function render() {
      renderer.render({
        state,
        score,
        highScore,
        shakeTime,
        cameraY,
        camera,
        stairs: stairs.steps,
        player
      });
    }

    function updateScoreUi() {
      ui.score.textContent = score;
      ui.highScore.textContent = highScore;
      ui.finalScore.textContent = score;
      ui.finalHighScore.textContent = highScore;
    }

    function showGameOver() {
      ui.gameOver.classList.add("visible");
      ui.gameOver.setAttribute("aria-hidden", "false");
    }

    function hideGameOver() {
      ui.gameOver.classList.remove("visible");
      ui.gameOver.setAttribute("aria-hidden", "true");
    }

    function readHighScore() {
      return Number(localStorage.getItem(config.highScoreKey) || 0);
    }

    return {
      reset,
      update,
      render
    };
  }

  window.StairGame = {
    createGame
  };
})();
