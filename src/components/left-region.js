import { bindOpenClose } from "../capabilities/open-close.js";
import { bindDragAdjustment } from "../capabilities/drag-adjustment.js";

const LEFT_CONTENT_ITEMS = [
  { key: "connection-status", label: "連線狀態" },
  { key: "account", label: "登入／帳號" },
  { key: "tasks", label: "任務清單／任務切換" },
  { key: "cognition", label: "認知現況" },
  { key: "navigation-help", label: "導覽／說明入口" }
];

/**
 * The left region owns its presentation, item states, and operation triggers.
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

      .region-content[hidden],
      .item-content[hidden] {
        display: none;
      }

      .content-item {
        min-width: 0;
        border-block-end: 1px solid var(--ui-color-border, #cbd5e1);
      }

      .item-toggle {
        display: block;
        box-sizing: border-box;
        width: 100%;
        padding: var(--ui-space-small, 0.5rem);
        border: 0;
        color: inherit;
        background: transparent;
        font: inherit;
        text-align: start;
        cursor: pointer;
      }

      .item-toggle:focus-visible,
      .collapse-toggle:focus-visible,
      .resize-handle:focus-visible {
        outline: 2px solid var(--ui-color-accent, #2457a6);
        outline-offset: -2px;
      }

      .item-content {
        box-sizing: border-box;
        min-width: 0;
        padding: 0 var(--ui-space-small, 0.5rem) var(--ui-space-small, 0.5rem);
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

      .resize-handle:focus-visible {
        outline-offset: -2px;
      }
    `;

    const frame = document.createElement("section");
    frame.className = "region-frame";
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

    for (const item of LEFT_CONTENT_ITEMS) {
      const itemSection = document.createElement("section");
      itemSection.className = "content-item";
      itemSection.dataset.role = "content-item";
      itemSection.dataset.item = item.key;
      itemSection.setAttribute("aria-label", item.label);

      const toggle = document.createElement("button");
      toggle.className = "item-toggle";
      toggle.type = "button";
      toggle.dataset.role = "item-toggle";
      toggle.dataset.item = item.key;
      toggle.setAttribute("aria-controls", `left-item-${item.key}`);
      toggle.textContent = item.label;

      const itemContent = document.createElement("div");
      itemContent.className = "item-content";
      itemContent.id = `left-item-${item.key}`;

      const slot = document.createElement("slot");
      slot.name = item.key;
      const placeholder = document.createElement("p");
      placeholder.className = "placeholder";
      placeholder.textContent = "尚未建立";
      slot.append(placeholder);
      itemContent.append(slot);
      itemSection.append(toggle, itemContent);
      content.append(itemSection);
    }

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

    for (const itemSection of this.shadowRoot.querySelectorAll(
      '[data-role="content-item"]'
    )) {
      const toggle = itemSection.querySelector('[data-role="item-toggle"]');
      const itemContent = itemSection.querySelector(".item-content");
      let expanded = true;

      this.#bindings.push(
        bindOpenClose({
          trigger: toggle,
          getExpanded: () => expanded,
          onExpandedChange: (nextExpanded) => {
            expanded = nextExpanded;
            itemContent.hidden = !nextExpanded;
          }
        })
      );
    }

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
