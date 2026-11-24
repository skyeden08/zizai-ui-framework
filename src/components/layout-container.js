/**
 * Minimal layout host for independently owned UI regions.
 *
 * This stage establishes only the container boundary and a neutral
 * composition surface. Region layout coordination, region-level state,
 * and region-specific connection contracts are intentionally deferred
 * to their separately planned stages.
 *
 * The container does not own slotted content, internal state, or events.
 */
export class LayoutContainer extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;

    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host {
        display: block;
        min-width: 0;
        min-height: 0;
      }
    `;

    const contentSlot = document.createElement("slot");
    root.append(style, contentSlot);
  }
}
