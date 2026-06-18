(function () {
  "use strict";

  const scripts = [
    "src/config.js",
    "src/utils.js",
    "src/input.js",
    "src/stairs.js",
    "src/player.js",
    "src/renderer.js",
    "src/game.js"
  ];

  loadScripts(scripts).then(start);

  function loadScripts(paths) {
    return paths.reduce((ready, path) => {
      return ready.then(() => loadScript(path));
    }, Promise.resolve());
  }

  function loadScript(path) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = path;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Could not load ${path}`));
      document.body.appendChild(script);
    });
  }

  function start() {
    const canvas = document.getElementById("gameCanvas");
    const shell = document.querySelector(".shell");
    const ui = {
      score: document.getElementById("score"),
      highScore: document.getElementById("highScore"),
      gameOver: document.getElementById("gameOver"),
      finalScore: document.getElementById("finalScore"),
      finalHighScore: document.getElementById("finalHighScore")
    };

    const input = window.StairGameInput.createInput(shell);
    const renderer = window.StairGameRenderer.createRenderer(canvas);
    const game = window.StairGame.createGame(input, ui, renderer);

    let lastTime = performance.now();

    function frame(now) {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      game.update(dt);
      game.render();
      requestAnimationFrame(frame);
    }

    window.addEventListener("resize", renderer.resize);

    renderer.resize();
    game.reset();
    requestAnimationFrame(frame);
  }
})();
