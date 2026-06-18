(function () {
  "use strict";

  const config = window.StairGameConfig;
  const { clamp } = window.StairGameUtils;

  const clouds = [
    { x: 0.12, y: 0.16, width: 118, speed: 9, phase: 0.15 },
    { x: 0.72, y: 0.22, width: 150, speed: 6, phase: 0.62 },
    { x: 0.38, y: 0.34, width: 98, speed: 7.5, phase: 0.88 },
    { x: 0.9, y: 0.12, width: 132, speed: 5.5, phase: 0.34 },
    { x: 0.54, y: 0.28, width: 176, speed: 4.5, phase: 0.74 }
  ];

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
      renderBackground(snapshot.score, snapshot.cameraY);
      renderClouds(snapshot.score, snapshot.worldTime);

      ctx.save();
      if (snapshot.shakeTime > 0) {
        const amount = snapshot.shakeTime * 42;
        ctx.translate(Math.sin(snapshot.shakeTime * 120) * amount, Math.cos(snapshot.shakeTime * 90) * amount);
      }

      renderGround(snapshot.camera);
      renderStairs(snapshot.stairs, snapshot.camera, snapshot.player.row);
      renderPlayer(snapshot.player, snapshot.camera, snapshot.state === "gameOver");
      renderDirectionHint(snapshot.player.queuedDirection, snapshot.state);
      ctx.restore();
    }

    function renderBackground(score, cameraY) {
      const sky = getSkyColors(score);
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, sky.top);
      gradient.addColorStop(1, sky.bottom);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
      const offset = (cameraY * 0.22) % 48;
      for (let y = -48 + offset; y < height; y += 48) {
        ctx.fillRect(0, y, width, 1);
      }
    }

    function renderClouds(score, worldTime) {
      if (score < config.cloudStart) return;

      const reveal = smoothProgress(score, config.cloudStart, config.skyRevealEnd);
      const high = smoothProgress(score, config.skyRevealEnd, config.highAltitudeFull);
      const cloudAlpha = 0.03 + reveal * 0.15 + high * 0.08;
      const visibleClouds = 2 + Math.floor(reveal * 1.5) + Math.floor(high * 2);

      for (let i = 0; i < visibleClouds; i += 1) {
        const cloud = clouds[i];
        const travel = width + cloud.width * 2;
        const x = ((cloud.x * width + worldTime * cloud.speed + cloud.phase * travel) % travel) - cloud.width;
        const y = height * cloud.y;
        renderCloud(x, y, cloud.width, cloudAlpha * (0.7 + i * 0.08));
      }
    }

    function renderCloud(x, y, cloudWidth, alpha) {
      const h = cloudWidth * 0.22;
      ctx.fillStyle = `rgba(218, 230, 238, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(x, y, cloudWidth * 0.28, h * 0.55, 0, 0, Math.PI * 2);
      ctx.ellipse(x + cloudWidth * 0.22, y - h * 0.12, cloudWidth * 0.34, h * 0.72, 0, 0, Math.PI * 2);
      ctx.ellipse(x + cloudWidth * 0.5, y, cloudWidth * 0.3, h * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    function renderGround(camera) {
      const ground = camera.worldToScreen(config.startRow, 0);
      const groundWidth = config.groundWidthTiles * config.tileWidth;
      const x = ground.x - groundWidth / 2;
      const y = ground.y - config.tileHeight / 2;

      ctx.fillStyle = "rgba(232, 235, 232, 0.96)";
      ctx.fillRect(x, y, groundWidth, config.tileHeight);

      ctx.fillStyle = "rgba(99, 113, 112, 0.96)";
      ctx.fillRect(x, y + config.tileHeight - 8, groundWidth, 8);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, groundWidth - 2, config.tileHeight - 2);
    }

    function renderStairs(stairs, camera, playerRow) {
      for (const step of stairs) {
        if (step.ground) continue;

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

    function getSkyColors(score) {
      const base = smoothProgress(score, 0, config.skyBaseEnd) * 0.14;
      const transition = smoothProgress(score, config.skyBaseEnd, config.skyTransitionEnd);
      const reveal = smoothProgress(score, config.skyTransitionEnd, config.skyRevealEnd);
      const high = smoothProgress(score, config.skyRevealEnd, config.highAltitudeFull);

      const stage1Top = mixColor("#080b11", "#101a28", base);
      const stage1Bottom = mixColor("#030406", "#07101a", base);
      const stage2Top = mixColor(stage1Top, "#275986", transition);
      const stage2Bottom = mixColor(stage1Bottom, "#102945", transition);
      const stage3Top = mixColor(stage2Top, "#6aa8da", reveal);
      const stage3Bottom = mixColor(stage2Bottom, "#255d8b", reveal);
      const top = mixColor(stage3Top, "#9ccaf0", high);
      const bottom = mixColor(stage3Bottom, "#3f7da8", high);

      return { top, bottom };
    }

    function smoothProgress(value, start, end) {
      const t = clamp((value - start) / (end - start), 0, 1);
      return t * t * (3 - 2 * t);
    }

    function mixColor(fromHex, toHex, amount) {
      const from = parseColor(fromHex);
      const to = parseColor(toHex);
      const r = Math.round(from.r + (to.r - from.r) * amount);
      const g = Math.round(from.g + (to.g - from.g) * amount);
      const b = Math.round(from.b + (to.b - from.b) * amount);
      return `rgb(${r}, ${g}, ${b})`;
    }

    function parseColor(color) {
      if (color.startsWith("#")) return hexToRgb(color);

      const channels = color.match(/\d+/g).map(Number);
      return {
        r: channels[0],
        g: channels[1],
        b: channels[2]
      };
    }

    function hexToRgb(hex) {
      const value = Number.parseInt(hex.slice(1), 16);
      return {
        r: (value >> 16) & 255,
        g: (value >> 8) & 255,
        b: value & 255
      };
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
