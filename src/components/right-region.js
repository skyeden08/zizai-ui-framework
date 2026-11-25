/**
 * Independent right region (shared-view region) for the desktop UI frame.
 *
 * This establishes only the region's own presentation boundary and a
 * neutral mounting slot. The region owns its internal presentation and
 * operations; the layout container must not take them over.
 *
 * The dropdown header, common toolbar, shared content area, device
 * adaptation, and cross-region connections are intentionally deferred.
 */
export class RightRegion extends HTMLElement {
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
        border-inline-start: 1px solid var(--ui-color-border, #cbd5e1);
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
    surface.setAttribute("aria-label", "右側區（共視區）");

    const contentSlot = document.createElement("slot");
    const placeholder = document.createElement("p");
    placeholder.className = "placeholder";
    placeholder.textContent = "右側區內容尚未建立";
    contentSlot.append(placeholder);

    surface.append(contentSlot);
    root.append(style, surface);
  }
}
