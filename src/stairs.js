(function () {
  "use strict";

  const config = window.StairGameConfig;
  const { chance, clamp, createSeededRandom } = window.StairGameUtils;

  function createStairs() {
    return {
      steps: [],
      lastTurn: 1,
      runLength: 0,
      generatedRows: 0,
      random: createSeededRandom(config.seedBase),

      reset(startRow, seed) {
        this.steps = [];
        this.lastTurn = 1;
        this.runLength = 0;
        this.generatedRows = 0;
        this.random = createSeededRandom(seed);

        this.steps.push({ row: 0, lane: 0 });
        this.generatedRows = 1;
        this.generateUntil(startRow + config.lookAhead, 0);
      },

      generateUntil(targetRow, score) {
        while (this.generatedRows <= targetRow) {
          const previous = this.steps[this.steps.length - 1];
          const turn = this.pickTurn(score);
          let lane = clamp(previous.lane + turn, config.minLane, config.maxLane);

          if (lane === previous.lane) {
            this.lastTurn *= -1;
            this.runLength = 1;
            lane = previous.lane + this.lastTurn;
          }

          this.steps.push({ row: this.generatedRows, lane });
          this.generatedRows += 1;
        }
      },

      pickTurn(score) {
        const phase = clamp(score / 90, 0, 1);
        const maxRun = score < 12 ? 4 : score < 36 ? 3 : 2;
        const turnChance = 0.22 + phase * 0.24;

        if (this.runLength >= maxRun) {
          this.lastTurn *= -1;
          this.runLength = 1;
          return this.lastTurn;
        }

        if (score < 8 && this.runLength < 2) {
          this.runLength += 1;
          return this.lastTurn;
        }

        if (chance(this.random, turnChance)) {
          this.lastTurn *= -1;
          this.runLength = 1;
        } else {
          this.runLength += 1;
        }

        return this.lastTurn;
      },

      prune(playerRow) {
        this.steps = this.steps.filter(step => step.row >= playerRow - config.keepBehind);
      },

      getStep(row) {
        return this.steps.find(step => step.row === row);
      },

      hasStep(row, lane) {
        const step = this.getStep(row);
        return Boolean(step && step.lane === lane);
      }
    };
  }

  window.StairGameStairs = {
    createStairs
  };
})();
