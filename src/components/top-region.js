/**
 * Independent upper region for the desktop UI frame.
 *
 * The region owns its presentation boundary and any future internal
 * interactions. Its concrete banner content is intentionally not defined
 * yet; the slot remains available for region-owned content.
 */
export class TopRegion extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;

    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host {
        position: sticky;
        inset-block-start: 0;
        display: block;
        box-sizing: border-box;
        min-width: 0;
        z-index: 1;
      }

      .surface {
        box-sizing: border-box;
        min-width: 0;
        padding: var(--ui-space-small, 0.5rem) var(--ui-space-medium, 1rem);
        color: var(--ui-color-muted, #526174);
        background: var(--ui-color-surface, #ffffff);
        border-block-end: 1px solid var(--ui-color-border, #cbd5e1);
        font-family: var(--ui-font-family, system-ui, sans-serif);
      }

      slot {
        display: block;
      }

      .placeholder {
        margin: 0;
      }
    `;

    const surface = document.createElement("section");
    surface.className = "surface";
    surface.setAttribute("role", "banner");
    surface.setAttribute("aria-label", "上方區");

    const contentSlot = document.createElement("slot");
    const placeholder = document.createElement("p");
    placeholder.className = "placeholder";
    placeholder.textContent = "上方區內容尚未建立";
    contentSlot.append(placeholder);

    surface.append(contentSlot);
    root.append(style, surface);
  }
}
