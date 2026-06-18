(function () {
  "use strict";

  window.StairGameConfig = {
    highScoreKey: "stair-game-high-score",
    startRow: 5,
    tileWidth: 78,
    tileHeight: 38,
    lookAhead: 34,
    keepBehind: 8,
    minLane: -5,
    maxLane: 5,
    baseSpeed: 1.62,
    earlySpeedBonus: 0.62,
    lateSpeedBonus: 0.95,
    earlySpeedSteps: 18,
    lateSpeedStart: 20,
    lateSpeedSteps: 85,
    fallSpeed: 650,
    inputDebounceMs: 70,
    cameraFollowSharpness: 0.001,
    shakeDuration: 0.18,
    seedBase: 1299721
  };
})();
