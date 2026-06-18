(function () {
  "use strict";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(start, end, amount) {
    return start + (end - start) * amount;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  }

  function createSeededRandom(seed) {
    let state = seed >>> 0;

    return function nextRandom() {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomBetween(random, min, max) {
    return min + random() * (max - min);
  }

  function chance(random, probability) {
    return random() < probability;
  }

  window.StairGameUtils = {
    clamp,
    lerp,
    easeOutCubic,
    createSeededRandom,
    randomBetween,
    chance
  };
})();
