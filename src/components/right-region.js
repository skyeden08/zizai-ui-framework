import { bindOpenClose } from "../capabilities/open-close.js";

/**
 * 右側區（共視區） owns its presentation, collapse state, and internal operations.
 * Its width is adjusted through the existing middle/right divider coordination.
 */
export class RightRegion extends HTMLElement {
  #expanded = true;
  #bindings = [];

  connectedCallback() {
    if (!this.shadowRoot) this.#build();
    if (this.#bindings.length === 0) this.#bindControls();
  }

  disconnectedCallback() {
    for (const cleanup of this.#bindings) cleanup();
    this.#bindings = [];
  }

  #build() {
    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host {
        display: block;
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        min-width: 0;
        min-height: 0;
      }

      .region-frame {
        position: relative;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        min-width: 0;
        min-height: 0;
        padding: var(--ui-space-small, 0.5rem);
        color: var(--ui-color-muted, #526174);
        background: var(--ui-color-surface, #ffffff);
        font-family: var(--ui-font-family, system-ui, sans-serif);
      }

      .region-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--ui-space-small, 0.5rem);
        min-width: 0;
      }

      .region-label {
        min-width: 0;
        white-space: nowrap;
      }

      .collapse-toggle {
        flex: none;
      }

      .region-content {
        box-sizing: border-box;
        flex: 1 1 auto;
        min-width: 0;
        min-height: 0;
        overflow-y: auto;
        margin-block-start: var(--ui-space-small, 0.5rem);
      }

      .region-content[hidden] {
        display: none;
      }

      .placeholder {
        margin: 0;
      }
    `;

    const frame = document.createElement("section");
    frame.className = "region-frame";
    frame.dataset.rightRegionVersion = "basic-presentation-1";
    frame.setAttribute("aria-label", "右側區（共視區）");

    const toolbar = document.createElement("header");
    toolbar.className = "region-header";

    const label = document.createElement("span");
    label.className = "region-label";
    label.textContent = "右側區（共視區）";

    const toggle = document.createElement("button");
    toggle.className = "collapse-toggle";
    toggle.type = "button";
    toggle.dataset.role = "collapse-toggle";
    toggle.setAttribute("aria-controls", "region-content");
    toggle.textContent = "收合";

    toolbar.append(label, toggle);

    const content = document.createElement("div");
    content.className = "region-content";
    content.id = "region-content";
    content.dataset.role = "region-content";

    const slot = document.createElement("slot");
    const placeholder = document.createElement("p");
    placeholder.className = "placeholder";
    placeholder.dataset.role = "basic-placeholder";
    placeholder.textContent = "尚未建立";
    slot.append(placeholder);
    content.append(slot);

    frame.append(toolbar, content);
    root.append(style, frame);
  }

  #bindControls() {
    const toggle = this.shadowRoot.querySelector('[data-role="collapse-toggle"]');
    const content = this.shadowRoot.querySelector("#region-content");
    this.#bindings.push(
      bindOpenClose({
        trigger: toggle,
        getExpanded: () => this.#expanded,
        onExpandedChange: (nextExpanded) => {
          this.containerInterface?.requestRegionState({
            collapsed: !nextExpanded
          });
          this.#expanded = nextExpanded;
          content.hidden = !nextExpanded;
        }
      })
    );
  }
}
