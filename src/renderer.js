(function () {
  "use strict";

  const config = window.StairGameConfig;
  const { clamp, createSeededRandom, randomBetween } = window.StairGameUtils;

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
    const cloudFields = createCloudFields();
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
      renderCloudLayer("midground", atmosphere, snapshot.worldTime);
      renderPlayer(snapshot.player, snapshot.camera, snapshot.state === "gameOver");
      renderCloudLayer("foreground", atmosphere, snapshot.worldTime);
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
      const layer = getCloudLayerState(layerName, atmosphere);
      if (layer.visibility <= 0.01) return;

      const clouds = cloudFields[layerName];
      for (const cloud of clouds) {
        const position = getCloudPosition(cloud, layer, worldTime);
        const alpha = cloud.opacity * layer.visibility * layer.alphaScale;
        if (alpha <= 0.01) continue;

        renderCloud(position.x, position.y, cloud.width * layer.scale, alpha, layer.maxAlpha);
      }
    }

    function getCloudLayerState(layerName, atmosphere) {
      const sky = atmosphere.skyAscent;
      const realm = atmosphere.cloudRealm;
      const peak = atmosphere.cloudPeak;
      const exit = atmosphere.cloudExit;
      const air = (1 - exit) * (1 - atmosphere.space);
      const exitDrop = height * exit * 0.38;

      if (layerName === "background") {
        return {
          visibility: sky * air,
          density: clamp(sky * 0.38 + realm * 0.34 + peak * 0.18 - exit * 0.72, 0, 1) * air,
          alphaScale: 0.55 + realm * 0.24,
          speedScale: 0.85,
          fallScale: 0.82,
          exitDrop,
          scale: 1,
          maxAlpha: config.cloudBackgroundMaxAlpha
        };
      }

      if (layerName === "midground") {
        return {
          visibility: realm * air,
          density: clamp(realm * 0.5 + peak * 0.35 - exit * 0.78, 0, 1) * air,
          alphaScale: 0.66 + peak * 0.24,
          speedScale: 1,
          fallScale: 1,
          exitDrop: exitDrop * 1.15,
          scale: 1.06,
          maxAlpha: config.cloudMidgroundMaxAlpha
        };
      }

      return {
        visibility: peak * air,
        density: clamp(peak * 0.42 - exit * 0.5, 0, 0.42) * air,
        alphaScale: 0.78 + peak * 0.22,
        speedScale: 1.08,
        fallScale: 1.18,
        exitDrop: exitDrop * 1.3,
        scale: 1.18,
        maxAlpha: config.cloudForegroundMaxAlpha
      };
    }

    function getCloudPosition(cloud, layer, worldTime) {
      const cloudWidth = cloud.width * layer.scale;
      const verticalMargin = cloudWidth * 0.35;
      const verticalTravel = height + verticalMargin * 2;
      const verticalDistance = worldTime * cloud.fallSpeed * layer.fallScale;
      const verticalProgress = cloud.streamOffset * verticalTravel + verticalDistance;
      const cycle = Math.floor(verticalProgress / verticalTravel);
      const y = positiveModulo(verticalProgress, verticalTravel) - verticalMargin + layer.exitDrop;

      const spawnTravel = width + cloudWidth;
      const spawnX = positiveModulo(cloud.x * width + cycle * cloud.recycleOffset, spawnTravel) - cloudWidth * 0.5;
      const passTime = positiveModulo(verticalProgress, verticalTravel) / (cloud.fallSpeed * layer.fallScale);
      const horizontalDistance = passTime * cloud.speed * cloud.direction * layer.speedScale;

      return {
        x: spawnX + horizontalDistance,
        y
      };
    }

    function renderCloud(x, y, cloudWidth, alpha, maxAlpha) {
      const cappedAlpha = clamp(alpha, 0, maxAlpha);
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
      const cloudRealm = smoothProgress(score, config.cloudRealmStart, config.cloudPeakStart);
      const cloudPeak = smoothProgress(score, config.cloudPeakStart, config.cloudChaosStart);
      const cloudExit = smoothProgress(score, config.cloudChaosStart, config.spaceStart);
      const space = smoothProgress(score, config.spaceStart, config.spaceFull);

      const undergroundTop = mixColor("#09090c", "#111421", underground);
      const undergroundBottom = mixColor("#050302", "#120c08", underground);
      const skyTop = mixColor(undergroundTop, "#73b7eb", skyAscent);
      const skyBottom = mixColor(undergroundBottom, "#2f6f9f", skyAscent);
      const cloudTop = mixColor(skyTop, "#9ed0f4", cloudRealm);
      const cloudBottom = mixColor(skyBottom, "#5d99bf", cloudRealm);
      const chaosTop = mixColor(cloudTop, "#b9dcf7", cloudPeak * 0.45);
      const chaosBottom = mixColor(cloudBottom, "#73abc9", cloudPeak * 0.35);
      const top = mixColor(chaosTop, "#020717", space);
      const bottom = mixColor(chaosBottom, "#071329", space);

      return {
        underground,
        skyAscent,
        cloudRealm,
        cloudPeak,
        cloudExit,
        space,
        top,
        bottom
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

  function createCloudFields() {
    const random = createSeededRandom(config.seedBase + 404);

    return {
      background: createCloudLayer(random, "background", config.cloudBackgroundCount),
      midground: createCloudLayer(random, "midground", config.cloudMidgroundCount),
      foreground: createCloudLayer(random, "foreground", config.cloudForegroundCount)
    };
  }

  function createCloudLayer(random, layerName, count) {
    const clouds = [];
    const presets = {
      background: {
        wMin: 120,
        wMax: 220,
        speedMin: 1.4,
        speedMax: 3.8,
        fallMin: 12,
        fallMax: 18,
        opacityMin: 0.45,
        opacityMax: 0.9
      },
      midground: {
        wMin: 135,
        wMax: 245,
        speedMin: 2.1,
        speedMax: 5.2,
        fallMin: 16,
        fallMax: 24,
        opacityMin: 0.5,
        opacityMax: 1
      },
      foreground: {
        wMin: 190,
        wMax: 320,
        speedMin: 3,
        speedMax: 6.4,
        fallMin: 20,
        fallMax: 30,
        opacityMin: 0.55,
        opacityMax: 1
      }
    };
    const p = presets[layerName];

    for (let i = 0; i < count; i += 1) {
      const direction = random() < 0.5 ? -1 : 1;
      clouds.push({
        x: (i / count + randomBetween(random, -0.08, 0.08) + 1) % 1,
        width: randomBetween(random, p.wMin, p.wMax),
        speed: randomBetween(random, p.speedMin, p.speedMax),
        fallSpeed: randomBetween(random, p.fallMin, p.fallMax),
        direction,
        opacity: randomBetween(random, p.opacityMin, p.opacityMax),
        streamOffset: (i / count + randomBetween(random, -0.03, 0.03) + 1) % 1,
        recycleOffset: randomBetween(random, 90, 240)
      });
    }

    return clouds;
  }

  function positiveModulo(value, size) {
    return ((value % size) + size) % size;
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

  window.StairGameRenderer = {
    createRenderer
  };
})();
