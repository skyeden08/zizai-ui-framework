/**
 * Independent left region for the desktop UI frame.
 *
 * This is a presentation boundary only. Its content and future internal
 * interactions belong to the region; no region content or operation state
 * is delegated to the layout container.
 *
 * Collapse, width adjustment, and vertical scrolling behavior are deferred
 * to their separately planned items.
 */
export class LeftRegion extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;

    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host {
        display: block;
        box-sizing: border-box;
        min-width: 0;
        min-height: 0;
      }

      .surface {
        box-sizing: border-box;
        min-width: 0;
        min-height: 0;
        padding: var(--ui-space-small, 0.5rem);
        color: var(--ui-color-muted, #526174);
        background: var(--ui-color-surface, #ffffff);
        border-inline-end: 1px solid var(--ui-color-border, #cbd5e1);
        font-family: var(--ui-font-family, system-ui, sans-serif);
      }

      slot {
        display: block;
      }

      .placeholder {
        margin: 0;
      }
    `;

    const surface = document.createElement("aside");
    surface.className = "surface";
    surface.setAttribute("aria-label", "左側區");

    const contentSlot = document.createElement("slot");
    const placeholder = document.createElement("p");
    placeholder.className = "placeholder";
    placeholder.textContent = "左側區內容尚未建立";
    contentSlot.append(placeholder);

    surface.append(contentSlot);
    root.append(style, surface);
  }
}
