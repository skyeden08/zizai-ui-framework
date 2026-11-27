import { bindOpenClose } from "../capabilities/open-close.js";
import { bindDragAdjustment } from "../capabilities/drag-adjustment.js";
import { bindDropdown, syncDropdownState } from "../capabilities/dropdown.js";

/**
 * 中間區 owns its collapse state, width state, and operation triggers.
 * It reports only region-level requests through its existing one-way interface.
 */
export class MiddleRegion extends HTMLElement {
  #expanded = true;
  #width = null;
  #dragStartWidth = null;
  #dropdownExpanded = false;
  #selectedDropdownValue = null;
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

      .dropdown-header {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: var(--ui-space-small, 0.5rem);
        min-width: 0;
        margin-block-start: var(--ui-space-small, 0.5rem);
        padding-block: var(--ui-space-small, 0.25rem);
        border-block: 1px solid var(--ui-color-border, #cbd5e1);
      }

      .dropdown-trigger {
        max-width: 100%;
      }

      .dropdown-menu {
        position: absolute;
        z-index: 1;
        inset-block-start: 100%;
        inset-inline-start: 0;
        min-width: 10rem;
        padding: var(--ui-space-small, 0.5rem);
        background: var(--ui-color-surface, #ffffff);
        border: 1px solid var(--ui-color-border, #cbd5e1);
      }

      .dropdown-menu[hidden] {
        display: none;
      }

      .dropdown-option {
        display: block;
        width: 100%;
        padding: var(--ui-space-small, 0.5rem);
        text-align: start;
        color: inherit;
        background: transparent;
        border: 0;
        cursor: pointer;
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
      .input-area { box-sizing: border-box; min-width: 0; }
      .position-label { margin: 0 0 var(--ui-space-small, 0.5rem); color: var(--ui-color-text, #182230); font-size: 0.875rem; font-weight: 600; }
      .placeholder { margin: 0; color: var(--ui-color-muted, #526174); }

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
    frame.dataset.middleRegionVersion = "basic-presentation-1";
    frame.setAttribute("aria-label", "中間區對話方塊");

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

    const dropdownHeader = document.createElement("header");
    dropdownHeader.className = "dropdown-header";
    dropdownHeader.dataset.role = "dropdown-header";
    dropdownHeader.setAttribute("aria-label", "需求主題");

    const dropdownTrigger = document.createElement("button");
    dropdownTrigger.className = "dropdown-trigger";
    dropdownTrigger.type = "button";
    dropdownTrigger.dataset.role = "dropdown-trigger";
    dropdownTrigger.setAttribute("aria-controls", "middle-region-dropdown-menu");
    dropdownTrigger.textContent = "需求主題：尚未建立";

    const dropdownMenu = document.createElement("div");
    dropdownMenu.className = "dropdown-menu";
    dropdownMenu.id = "middle-region-dropdown-menu";
    dropdownMenu.dataset.role = "dropdown-menu";
    dropdownMenu.setAttribute("role", "menu");
    dropdownMenu.setAttribute("aria-label", "需求主題選項");
    dropdownMenu.hidden = true;

    const uncreatedOption = document.createElement("button");
    uncreatedOption.className = "dropdown-option";
    uncreatedOption.type = "button";
    uncreatedOption.dataset.dropdownOption = "not-created";
    uncreatedOption.setAttribute("role", "menuitem");
    uncreatedOption.textContent = "尚未建立";
    dropdownMenu.append(uncreatedOption);
    dropdownHeader.append(dropdownTrigger, dropdownMenu);

    const content = document.createElement("div");
    content.className = "region-content";
    content.id = "region-content";
    const conversation = document.createElement("section");
    conversation.className = "conversation";
    conversation.dataset.role = "conversation-position";
    conversation.setAttribute("aria-label", "對話呈現位置");
    const conversationLabel = document.createElement("h2");
    conversationLabel.className = "position-label";
    conversationLabel.textContent = "對話呈現位置";
    const conversationSlot = document.createElement("slot");
    conversationSlot.name = "conversation";
    const conversationPlaceholder = document.createElement("p");
    conversationPlaceholder.className = "placeholder";
    conversationPlaceholder.textContent = "尚未建立";
    conversationSlot.append(conversationPlaceholder);
    conversation.append(conversationLabel, conversationSlot);

    const inputArea = document.createElement("section");
    inputArea.className = "input-area";
    inputArea.dataset.role = "input-position";
    inputArea.setAttribute("aria-label", "對話輸入位置");
    const inputLabel = document.createElement("h2");
    inputLabel.className = "position-label";
    inputLabel.textContent = "對話輸入位置";
    const inputSlot = document.createElement("slot");
    inputSlot.name = "input";
    const inputPlaceholder = document.createElement("p");
    inputPlaceholder.className = "placeholder";
    inputPlaceholder.textContent = "尚未建立";
    inputSlot.append(inputPlaceholder);
    inputArea.append(inputLabel, inputSlot);

    content.append(conversation, inputArea);

    const resizeHandle = document.createElement("div");
    resizeHandle.className = "resize-handle";
    resizeHandle.dataset.role = "resize-handle";
    resizeHandle.setAttribute("role", "separator");
    resizeHandle.setAttribute("aria-orientation", "vertical");
    resizeHandle.setAttribute("aria-label", "調整中間區寬度");
    resizeHandle.tabIndex = 0;

    frame.append(toolbar, dropdownHeader, content, resizeHandle);
    root.append(style, frame);
  }

  #bindControls() {
    const toggle = this.shadowRoot.querySelector('[data-role="collapse-toggle"]');
    const content = this.shadowRoot.querySelector("#region-content");
    const resizeHandle = this.shadowRoot.querySelector('[data-role="resize-handle"]');
    const dropdownTrigger = this.shadowRoot.querySelector('[data-role="dropdown-trigger"]');
    const dropdownMenu = this.shadowRoot.querySelector('[data-role="dropdown-menu"]');

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
      bindDropdown({
        trigger: dropdownTrigger,
        menu: dropdownMenu,
        getExpanded: () => this.#dropdownExpanded,
        onExpandedChange: (nextExpanded) => {
          this.#dropdownExpanded = nextExpanded;
          dropdownMenu.hidden = !nextExpanded;
        },
        onSelect: (value, option) => {
          this.#selectedDropdownValue = value;
          dropdownTrigger.dataset.selectedValue = value;
          dropdownTrigger.textContent = `需求主題：${option.textContent.trim()}`;
          this.#dropdownExpanded = false;
          dropdownMenu.hidden = true;
          syncDropdownState(dropdownTrigger, false);
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
