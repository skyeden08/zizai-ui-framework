import { bindOpenClose } from "../capabilities/open-close.js";
import { bindDragAdjustment } from "../capabilities/drag-adjustment.js";

/**
 * The left region owns its presentation and internal operations.
 * It sends only region-level layout requests through its existing interface.
 */
export class LeftRegion extends HTMLElement {
  #expanded = true;
  #width = null;
  #dragStartWidth = null;
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
        color: var(--ui-color-text, #182230);
        background: var(--ui-color-surface, #ffffff);
        font-family: var(--ui-font-family, system-ui, sans-serif);
      }

      .region-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--ui-space-small, 0.5rem);
        min-width: 0;
        padding-block-end: var(--ui-space-small, 0.5rem);
        border-block-end: 1px solid var(--ui-color-border, #cbd5e1);
      }

      .region-label {
        min-width: 0;
        white-space: nowrap;
        font-weight: 600;
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
        color: var(--ui-color-muted, #526174);
      }

      .resize-handle {
        position: absolute;
        inset-block: 0;
        inset-inline-end: 0;
        inline-size: 0.5rem;
        cursor: col-resize;
        touch-action: none;
        user-select: none;
      }

      .resize-handle:focus-visible,
      .collapse-toggle:focus-visible {
        outline: 2px solid var(--ui-color-accent, #2457a6);
        outline-offset: -2px;
      }
    `;

    const frame = document.createElement("section");
    frame.className = "region-frame";
    frame.dataset.leftRegionVersion = "basic-structure-2";
    frame.setAttribute("aria-label", "左側區");

    const toolbar = document.createElement("header");
    toolbar.className = "region-toolbar";

    const label = document.createElement("span");
    label.className = "region-label";
    label.textContent = "左側區";

    const collapseToggle = document.createElement("button");
    collapseToggle.className = "collapse-toggle";
    collapseToggle.type = "button";
    collapseToggle.dataset.role = "collapse-toggle";
    collapseToggle.setAttribute("aria-controls", "left-region-content");
    collapseToggle.textContent = "收合";
    toolbar.append(label, collapseToggle);

    const content = document.createElement("div");
    content.className = "region-content";
    content.id = "left-region-content";

    const contentSlot = document.createElement("slot");
    const placeholder = document.createElement("p");
    placeholder.className = "placeholder";
    placeholder.textContent = "尚未建立";
    contentSlot.append(placeholder);
    content.append(contentSlot);

    const resizeHandle = document.createElement("div");
    resizeHandle.className = "resize-handle";
    resizeHandle.dataset.role = "resize-handle";
    resizeHandle.setAttribute("role", "separator");
    resizeHandle.setAttribute("aria-orientation", "vertical");
    resizeHandle.setAttribute("aria-label", "調整左側區寬度");
    resizeHandle.tabIndex = 0;

    frame.append(toolbar, content, resizeHandle);
    root.append(style, frame);
  }

  #bindControls() {
    const collapseToggle = this.shadowRoot.querySelector(
      '[data-role="collapse-toggle"]'
    );
    const regionContent = this.shadowRoot.querySelector("#left-region-content");
    const resizeHandle = this.shadowRoot.querySelector(
      '[data-role="resize-handle"]'
    );

    if (!collapseToggle || !regionContent || !resizeHandle) {
      throw new Error("左側區基本結構缺少區域級控制或內容容器。");
    }

    this.#bindings.push(
      bindOpenClose({
        trigger: collapseToggle,
        getExpanded: () => this.#expanded,
        onExpandedChange: (nextExpanded) => {
          this.containerInterface?.requestRegionState({
            collapsed: !nextExpanded
          });
          this.#expanded = nextExpanded;
          regionContent.hidden = !nextExpanded;
        }
      })
    );

    this.#bindings.push(
      bindDragAdjustment({
        handle: resizeHandle,
        onDragStart: () => {
          this.#dragStartWidth = this.getBoundingClientRect().width;
        },
        onDrag: ({ deltaX }) => {
          const direction = 1;
          this.#width = this.#dragStartWidth + deltaX * direction;
          this.containerInterface?.requestSpace({ width: this.#width });
        }
      })
    );
  }
}
