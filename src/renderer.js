(function () {
  "use strict";

  const config = window.StairGameConfig;
  const { clamp } = window.StairGameUtils;

  const cloudSets = {
    background: [
      { x: 0.08, y: 0.14, width: 130, speed: 5.2, phase: 0.11 },
      { x: 0.68, y: 0.24, width: 170, speed: 4.4, phase: 0.63 },
      { x: 0.35, y: 0.34, width: 116, speed: 4.9, phase: 0.88 },
      { x: 0.9, y: 0.18, width: 145, speed: 3.8, phase: 0.31 },
      { x: 0.52, y: 0.28, width: 190, speed: 3.4, phase: 0.74 }
    ],
    mid: [
      { x: 0.18, y: 0.48, width: 142, speed: 7.1, phase: 0.21 },
      { x: 0.76, y: 0.58, width: 188, speed: 6.4, phase: 0.56 },
      { x: 0.46, y: 0.42, width: 128, speed: 7.8, phase: 0.82 },
      { x: 0.96, y: 0.52, width: 168, speed: 5.9, phase: 0.37 }
    ],
    foreground: [
      { x: 0.08, y: 0.66, width: 210, speed: 8.5, phase: 0.18 },
      { x: 0.72, y: 0.72, width: 250, speed: 7.2, phase: 0.69 },
      { x: 0.4, y: 0.62, width: 190, speed: 9.3, phase: 0.44 }
    ]
  };

  const stars = [
    { x: 0.08, y: 0.12, r: 1.1, phase: 0.1 },
    { x: 0.22, y: 0.28, r: 0.8, phase: 0.7 },
    { x: 0.37, y: 0.16, r: 1.3, phase: 0.4 },
    { x: 0.52, y: 0.34, r: 0.9, phase: 0.9 },
    { x: 0.69, y: 0.09, r: 1.2, phase: 0.2 },
    { x: 0.82, y: 0.26, r: 0.8, phase: 0.6 },
    { x: 0.94, y: 0.18, r: 1.0, phase: 0.35 },
    { x: 0.14, y: 0.44, r: 0.7, phase: 0.8 },
    { x: 0.58, y: 0.5, r: 1.1, phase: 0.15 },
    { x: 0.88, y: 0.46, r: 0.9, phase: 0.5 }
  ];

  const planets = [
    { x: 0.18, y: 0.2, r: 26, color: "rgba(160, 190, 210, 0.22)" },
    { x: 0.78, y: 0.16, r: 38, color: "rgba(210, 186, 150, 0.16)" }
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
      const atmosphere = getAtmosphere(snapshot.score);

      ctx.clearRect(0, 0, width, height);
      renderBackground(atmosphere, snapshot.cameraY);
      renderStars(atmosphere.space, snapshot.worldTime);
      renderPlanets(atmosphere.space);
      renderCloudLayer("background", atmosphere, snapshot.worldTime);

      ctx.save();
      if (snapshot.shakeTime > 0) {
        const amount = snapshot.shakeTime * 42;
        ctx.translate(Math.sin(snapshot.shakeTime * 120) * amount, Math.cos(snapshot.shakeTime * 90) * amount);
      }

      renderGround(snapshot.camera);
      renderStairs(snapshot.stairs, snapshot.camera, snapshot.player.row);
      renderCloudLayer("mid", atmosphere, snapshot.worldTime);
      renderCloudLayer("foreground", atmosphere, snapshot.worldTime);
      renderPlayer(snapshot.player, snapshot.camera, snapshot.state === "gameOver");
      ctx.restore();
    }

    function renderBackground(atmosphere, cameraY) {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, atmosphere.top);
      gradient.addColorStop(1, atmosphere.bottom);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const gridAlpha = 0.04 * (1 - atmosphere.space);
      ctx.fillStyle = `rgba(255, 255, 255, ${gridAlpha})`;
      const offset = (cameraY * 0.22) % 48;
      for (let y = -48 + offset; y < height; y += 48) {
        ctx.fillRect(0, y, width, 1);
      }
    }

    function renderStars(space, worldTime) {
      if (space <= 0.01) return;

      for (const star of stars) {
        const twinkle = 0.6 + Math.sin(worldTime * 1.8 + star.phase * 10) * 0.28;
        ctx.fillStyle = `rgba(230, 240, 255, ${space * twinkle * 0.72})`;
        ctx.beginPath();
        ctx.arc(star.x * width, star.y * height, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function renderPlanets(space) {
      if (space <= 0.08) return;

      for (const planet of planets) {
        ctx.fillStyle = planet.color.replace(/[\d.]+\)$/, `${space * 0.28})`);
        ctx.beginPath();
        ctx.arc(planet.x * width, planet.y * height, planet.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function renderCloudLayer(layerName, atmosphere, worldTime) {
      const layer = getCloudLayerSettings(layerName, atmosphere);
      if (layer.alpha <= 0.01 || layer.count <= 0) return;

      const clouds = cloudSets[layerName];
      for (let i = 0; i < layer.count; i += 1) {
        const cloud = clouds[i % clouds.length];
        const speed = cloud.speed * layer.speedMultiplier;
        const drift = Math.sin(worldTime * 0.45 + cloud.phase * 8) * layer.unpredictability;
        const travel = width + cloud.width * 2;
        const x = ((cloud.x * width + worldTime * speed + cloud.phase * travel) % travel) - cloud.width;
        const y = height * cloud.y + drift;
        const alpha = layer.alpha * (0.82 + (i % 3) * 0.08);
        renderCloud(x, y, cloud.width * layer.scale, alpha);
      }
    }

    function getCloudLayerSettings(layerName, atmosphere) {
      const sky = atmosphere.skyAscent;
      const realm = atmosphere.cloudRealm;
      const chaos = atmosphere.cloudChaos;
      const air = 1 - atmosphere.space;

      if (layerName === "background") {
        return {
          alpha: (sky * 0.1 + realm * 0.14 + chaos * 0.05) * air,
          count: Math.floor(sky * 2 + realm * 3 + chaos * 1),
          speedMultiplier: 1 + chaos * 0.35,
          unpredictability: chaos * 10,
          scale: 1
        };
      }

      if (layerName === "mid") {
        return {
          alpha: (realm * 0.11 + chaos * 0.08) * air,
          count: Math.floor(realm * 2 + chaos * 2),
          speedMultiplier: 1.08 + chaos * 0.4,
          unpredictability: chaos * 14,
          scale: 1.08
        };
      }

      return {
        alpha: (realm * 0.06 + chaos * 0.13) * air,
        count: Math.floor(realm * 1 + chaos * 2),
        speedMultiplier: 1.12 + chaos * 0.55,
        unpredictability: chaos * 18,
        scale: 1.18
      };
    }

    function renderCloud(x, y, cloudWidth, alpha) {
      const cappedAlpha = clamp(alpha, 0, 0.26);
      const h = cloudWidth * 0.22;
      ctx.fillStyle = `rgba(234, 241, 246, ${cappedAlpha})`;
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

    function getAtmosphere(score) {
      const underground = smoothProgress(score, 0, config.undergroundEnd) * 0.12;
      const skyAscent = smoothProgress(score, config.undergroundEnd, config.skyAscentEnd);
      const cloudRealm = smoothProgress(score, config.cloudRealmStart, config.cloudChaosStart);
      const cloudChaos = smoothProgress(score, config.cloudChaosStart, config.spaceStart);
      const space = smoothProgress(score, config.spaceStart, config.spaceFull);

      const undergroundTop = mixColor("#09090c", "#111421", underground);
      const undergroundBottom = mixColor("#050302", "#120c08", underground);
      const skyTop = mixColor(undergroundTop, "#73b7eb", skyAscent);
      const skyBottom = mixColor(undergroundBottom, "#2f6f9f", skyAscent);
      const cloudTop = mixColor(skyTop, "#9ed0f4", cloudRealm);
      const cloudBottom = mixColor(skyBottom, "#5d99bf", cloudRealm);
      const chaosTop = mixColor(cloudTop, "#b9dcf7", cloudChaos * 0.45);
      const chaosBottom = mixColor(cloudBottom, "#73abc9", cloudChaos * 0.35);
      const top = mixColor(chaosTop, "#020717", space);
      const bottom = mixColor(chaosBottom, "#071329", space);

      return {
        underground,
        skyAscent,
        cloudRealm,
        cloudChaos,
        space,
        top,
        bottom
      };
    }

    function smoothProgress(value, start, end) {
      const t = clamp((value - start) / (end - start), 0, 1);
      return t * t * (3 - 2 * t);
    }

    function mixColor(fromColor, toColor, amount) {
      const from = parseColor(fromColor);
      const to = parseColor(toColor);
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
