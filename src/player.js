(function () {
  "use strict";

  const config = window.StairGameConfig;
  const { easeOutCubic } = window.StairGameUtils;

  function createPlayer() {
    return {
      row: 0,
      lane: 0,
      stepDirection: 1,
      queuedDirection: 1,
      progress: 0,
      fallDistance: 0,
      walkTime: 0,

      reset(row, lane, direction) {
        this.row = row;
        this.lane = lane;
        this.stepDirection = direction;
        this.queuedDirection = direction;
        this.progress = 0;
        this.fallDistance = 0;
        this.walkTime = 0;
      },

      queueDirectionToggle() {
        this.queuedDirection *= -1;
      },

      update(dt, speed, isDead) {
        this.walkTime += dt;

        if (isDead) {
          this.fallDistance += dt * config.fallSpeed;
          return;
        }

        this.progress += dt * speed;
      },

      hasStepReady() {
        return this.progress >= 1;
      },

      completeStep() {
        this.progress -= 1;
        this.row += 1;
        this.lane += this.stepDirection;
        this.stepDirection = this.queuedDirection;
      },

      getVisualPosition(camera) {
        const t = easeOutCubic(this.progress);
        const current = camera.worldToScreen(this.row, this.lane);

        return {
          x: current.x + this.stepDirection * config.tileWidth * t,
          y: current.y - config.tileHeight * t + this.fallDistance
        };
      }
    };
  }

  window.StairGamePlayer = {
    createPlayer
  };
})();
