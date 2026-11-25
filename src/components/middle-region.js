import { bindOpenClose } from "../capabilities/open-close.js";
import { bindDragAdjustment } from "../capabilities/drag-adjustment.js";

/**
 * 中間區 owns its collapse state, width state, and operation triggers.
 * It reports only region-level requests through its existing one-way interface.
 */
export class MiddleRegion extends HTMLElement {
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
        color: var(--ui-color-muted, #526174);
        background: var(--ui-color-surface, #ffffff);
        font-family: var(--ui-font-family, system-ui, sans-serif);
      }

      .region-toolbar {
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

      .conversation,
      .input-area {
        box-sizing: border-box;
        min-width: 0;
      }

      .input-area {
        margin-block-start: var(--ui-space-small, 0.5rem);
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
        outline: 2px solid var(--ui-color-accent, #2563eb);
        outline-offset: -2px;
      }
    `;

    const frame = document.createElement("section");
    frame.className = "region-frame";
    frame.setAttribute("aria-label", "中間區");

    const toolbar = document.createElement("header");
    toolbar.className = "region-toolbar";

    const label = document.createElement("span");
    label.className = "region-label";
    label.textContent = "中間區";

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
    const conversation = document.createElement("section");
    conversation.className = "conversation";
    conversation.setAttribute("aria-label", "對話呈現區");
    const conversationSlot = document.createElement("slot");
    conversationSlot.name = "conversation";
    const conversationPlaceholder = document.createElement("p");
    conversationPlaceholder.className = "placeholder";
    conversationPlaceholder.textContent = "對話內容尚未建立";
    conversationSlot.append(conversationPlaceholder);
    conversation.append(conversationSlot);

    const inputArea = document.createElement("section");
    inputArea.className = "input-area";
    inputArea.setAttribute("aria-label", "對話輸入區");
    const inputSlot = document.createElement("slot");
    inputSlot.name = "input";
    const inputPlaceholder = document.createElement("p");
    inputPlaceholder.className = "placeholder";
    inputPlaceholder.textContent = "對話輸入操作尚未建立";
    inputSlot.append(inputPlaceholder);
    inputArea.append(inputSlot);

    content.append(conversation, inputArea);

    const resizeHandle = document.createElement("div");
    resizeHandle.className = "resize-handle";
    resizeHandle.dataset.role = "resize-handle";
    resizeHandle.setAttribute("role", "separator");
    resizeHandle.setAttribute("aria-orientation", "vertical");
    resizeHandle.setAttribute("aria-label", "調整中間區寬度");
    resizeHandle.tabIndex = 0;

    frame.append(toolbar, content, resizeHandle);
    root.append(style, frame);
  }

  #bindControls() {
    const toggle = this.shadowRoot.querySelector('[data-role="collapse-toggle"]');
    const content = this.shadowRoot.querySelector("#region-content");
    const resizeHandle = this.shadowRoot.querySelector('[data-role="resize-handle"]');

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

    this.#bindings.push(
      bindDragAdjustment({
        handle: resizeHandle,
        onDragStart: () => {
          this.#dragStartWidth = this.#width ?? this.getBoundingClientRect().width;
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
