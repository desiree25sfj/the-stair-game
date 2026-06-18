(function () {
  "use strict";

  const config = window.StairGameConfig;
  const { clamp } = window.StairGameUtils;

  function createRenderer(canvas) {
    const ctx = canvas.getContext("2d");
    let width = 0;
    let height = 0;

    function resize() {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function render(snapshot) {
      ctx.clearRect(0, 0, width, height);
      renderBackground(snapshot.cameraY);

      ctx.save();
      if (snapshot.shakeTime > 0) {
        const amount = snapshot.shakeTime * 42;
        ctx.translate(Math.sin(snapshot.shakeTime * 120) * amount, Math.cos(snapshot.shakeTime * 90) * amount);
      }

      renderStairs(snapshot.stairs, snapshot.camera, snapshot.player.row);
      renderPlayer(snapshot.player, snapshot.camera, snapshot.state === "gameOver");
      renderDirectionHint(snapshot.player.queuedDirection, snapshot.state);
      ctx.restore();
    }

    function renderBackground(cameraY) {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#111821");
      gradient.addColorStop(1, "#07080a");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
      const offset = (cameraY * 0.22) % 48;
      for (let y = -48 + offset; y < height; y += 48) {
        ctx.fillRect(0, y, width, 1);
      }
    }

    function renderStairs(stairs, camera, playerRow) {
      for (const step of stairs) {
        const screen = camera.worldToScreen(step.row, step.lane);
        if (screen.y < -config.tileHeight || screen.y > height + config.tileHeight) continue;

        const age = step.row - playerRow;
        const alpha = clamp(1 - age * 0.016, 0.34, 1);
        const x = screen.x - config.tileWidth / 2;
        const y = screen.y - config.tileHeight / 2;

        ctx.fillStyle = `rgba(238, 241, 242, ${alpha})`;
        ctx.fillRect(x, y, config.tileWidth, config.tileHeight);

        ctx.fillStyle = `rgba(124, 137, 150, ${alpha})`;
        ctx.fillRect(x, y + config.tileHeight - 7, config.tileWidth, 7);

        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.68})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, config.tileWidth - 2, config.tileHeight - 2);
      }
    }

    function renderPlayer(player, camera, isDead) {
      const pos = player.getVisualPosition(camera);
      const bounce = isDead ? 0 : Math.sin(player.walkTime * 16) * 3;
      const x = Math.round(pos.x);
      const y = Math.round(pos.y - 34 + bounce);
      const face = player.queuedDirection;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(face, 1);

      ctx.fillStyle = isDead ? "#ff5364" : "#f7f7f2";
      ctx.fillRect(-8, -22, 16, 18);
      ctx.fillRect(-6, -36, 12, 12);

      ctx.fillStyle = "#222831";
      ctx.fillRect(1, -33, 3, 3);
      ctx.fillRect(-6, -21, 12, 4);

      ctx.fillStyle = isDead ? "#8a2330" : "#4cc9f0";
      ctx.fillRect(-11, -19, 4, 13);
      ctx.fillRect(7, -19, 4, 13);

      ctx.fillStyle = "#f7f7f2";
      const stride = Math.sin(player.walkTime * 18) > 0 ? 1 : -1;
      ctx.fillRect(-7, -4, 5, 13 + stride);
      ctx.fillRect(2, -4, 5, 13 - stride);

      ctx.restore();
    }

    function renderDirectionHint(direction, state) {
      if (state !== "running") return;

      const x = width / 2;
      const y = height * 0.86;
      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      ctx.beginPath();

      if (direction > 0) {
        ctx.moveTo(x + 20, y);
        ctx.lineTo(x - 10, y - 13);
        ctx.lineTo(x - 10, y + 13);
      } else {
        ctx.moveTo(x - 20, y);
        ctx.lineTo(x + 10, y - 13);
        ctx.lineTo(x + 10, y + 13);
      }

      ctx.closePath();
      ctx.fill();
    }

    return {
      resize,
      render,
      getSize() {
        return { width, height };
      }
    };
  }

  window.StairGameRenderer = {
    createRenderer
  };
})();
