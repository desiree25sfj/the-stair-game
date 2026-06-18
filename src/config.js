(function () {
  "use strict";

  window.StairGameConfig = {
    highScoreKey: "stairGameHighScore",
    legacyHighScoreKey: "stair-game-high-score",
    startRow: 0,
    tileWidth: 78,
    tileHeight: 38,
    groundWidthTiles: 7,
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
    skyBaseEnd: 50,
    skyTransitionEnd: 100,
    skyRevealEnd: 150,
    highAltitudeFull: 230,
    cloudStart: 100,
    seedBase: 1299721
  };
})();
