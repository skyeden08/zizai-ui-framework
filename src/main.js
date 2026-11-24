import { createUiFoundation } from "./core/ui-foundation.js";
import { registerFoundationShell } from "./components/zizai-foundation-shell.js";

export function bootstrapPhase1(options = {}) {
  const doc = options.document ?? globalThis.document;
  const registry = options.customElements ?? globalThis.customElements;
  const rootSelector = options.rootSelector ?? "#zizai-ui-root";

  const shellRegistered = registerFoundationShell(registry);
  const foundation = createUiFoundation(options.foundationConfig);

  let shellElement = null;
  if (doc && typeof doc.querySelector === "function" && typeof doc.createElement === "function") {
    const host = doc.querySelector(rootSelector);
    if (host && shellRegistered) {
      shellElement = doc.createElement("zizai-foundation-shell");
      host.replaceChildren(shellElement);
      foundation.onPhaseChange(({ nextPhase }) => {
        if (typeof shellElement.setPhaseLabel === "function") {
          shellElement.setPhaseLabel(nextPhase);
        }
      });
    }
  }

  foundation.start(shellElement);

  return {
    foundation,
    shellElement,
    shellRegistered,
  };
}

if (typeof globalThis.document !== "undefined") {
  globalThis.document.addEventListener("DOMContentLoaded", () => {
    bootstrapPhase1();
  });
}

