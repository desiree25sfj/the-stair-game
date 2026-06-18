(function () {
  "use strict";

  const config = window.StairGameConfig;

  function createInput(target) {
    let lastActionAt = -Infinity;
    let directionToggleQueued = false;

    function queueToggle(event) {
      const now = performance.now();
      if (now - lastActionAt < config.inputDebounceMs) return;

      lastActionAt = now;
      directionToggleQueued = true;
      event.preventDefault();
    }

    function handleKeydown(event) {
      if (event.code === "Space" || event.code === "Enter") {
        queueToggle(event);
      }
    }

    target.addEventListener("pointerdown", queueToggle);
    window.addEventListener("keydown", handleKeydown);

    return {
      consumeDirectionToggle() {
        const wasQueued = directionToggleQueued;
        directionToggleQueued = false;
        return wasQueued;
      },

      destroy() {
        target.removeEventListener("pointerdown", queueToggle);
        window.removeEventListener("keydown", handleKeydown);
      }
    };
  }

  window.StairGameInput = {
    createInput
  };
})();
