const SHELL_STYLES = `
  :host {
    display: block;
    font-family: var(--zizai-font-sans, sans-serif);
    color: var(--zizai-color-text, #0f172a);
    background-color: var(--zizai-color-bg, #f8fafc);
  }

  .zizai-foundation-shell {
    border: 1px solid var(--zizai-color-border, #cbd5e1);
    background-color: var(--zizai-color-surface, #ffffff);
    border-radius: var(--zizai-radius-sm, 6px);
    padding: var(--zizai-space-md, 16px);
  }

  .zizai-foundation-shell__title {
    margin: 0 0 var(--zizai-space-xs, 4px) 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .zizai-foundation-shell__meta {
    margin: 0;
    font-size: 0.875rem;
    color: var(--zizai-color-muted, #475569);
  }
`;

class NonBrowserElementFallback {
  constructor() {
    this.shadowRoot = null;
    this._markup = "";
  }

  attachShadow() {
    const fallbackShadow = {
      get innerHTML() {
        return this._innerHTML || "";
      },
      set innerHTML(val) {
        this._innerHTML = val;
      },
    };
    this.shadowRoot = fallbackShadow;
    return fallbackShadow;
  }
}

export function createFoundationShellClass(baseClass = globalThis.HTMLElement) {
  const Base = typeof baseClass === "function" ? baseClass : NonBrowserElementFallback;

  return class ZizaiFoundationShell extends Base {
    constructor() {
      super();
      this._phase = "idle";
      if (!this.shadowRoot && typeof this.attachShadow === "function") {
        this.attachShadow({ mode: "open" });
      }
    }

    connectedCallback() {
      this.render();
    }

    setPhaseLabel(phase) {
      this._phase = typeof phase === "string" && phase ? phase : "idle";
      this.render();
    }

    getPhaseLabel() {
      return this._phase;
    }

    render() {
      if (!this.shadowRoot) {
        return;
      }
      const markup = `
        <style>${SHELL_STYLES}</style>
        <section class="zizai-foundation-shell" part="shell" data-phase="${this._phase}">
          <h1 class="zizai-foundation-shell__title">ZIZAI UI Framework</h1>
          <p class="zizai-foundation-shell__meta">Phase 1 Foundation · Status: ${this._phase}</p>
        </section>
      `;
      this.shadowRoot.innerHTML = markup;
      this._markup = markup;
    }
  };
}

/**
 * 第一階段最小基礎 Web Component：
 * 使用 Shadow DOM 隔離自身樣式，透過 CSS Variables 接收共用變數；
 * 僅作為基礎框架最小呈現載體，不包含四區版面或單元掛載/替換邏輯。
 */
export const ZizaiFoundationShell = createFoundationShellClass();

export function registerFoundationShell(
  customElementRegistry = globalThis.customElements,
  baseClass = globalThis.HTMLElement,
) {
  if (!customElementRegistry || typeof customElementRegistry.define !== "function") {
    return false;
  }
  const ElementClass =
    baseClass === globalThis.HTMLElement ? ZizaiFoundationShell : createFoundationShellClass(baseClass);
  if (!customElementRegistry.get("zizai-foundation-shell")) {
    customElementRegistry.define("zizai-foundation-shell", ElementClass);
  }
  return true;
}

