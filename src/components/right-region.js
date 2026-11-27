import { bindOpenClose } from "../capabilities/open-close.js";
import { bindDropdown, syncDropdownState } from "../capabilities/dropdown.js";

/**
 * 右側區 owns its presentation, dropdown content, toolbar placeholder and interaction state.
 * The container receives only region-level layout and collapse requests.
 */
export class RightRegion extends HTMLElement {
  #expanded = true;
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

      .region-header,
      .dropdown-header {
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
        justify-content: flex-start;
        margin-block-start: var(--ui-space-small, 0.5rem);
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

      .common-toolbar {
        display: flex;
        align-items: center;
        flex: none;
        min-width: 0;
        margin-block-start: var(--ui-space-small, 0.5rem);
        padding: var(--ui-space-small, 0.5rem);
        border: 1px solid var(--ui-color-border, #cbd5e1);
      }

      .common-toolbar-placeholder {
        margin: 0;
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

      .co-view-content {
        box-sizing: border-box;
        min-width: 0;
        min-height: 0;
      }

      .co-view-content-label {
        margin: 0 0 var(--ui-space-small, 0.5rem);
        color: var(--ui-color-text, #182230);
        font-size: 0.875rem;
        font-weight: 600;
      }

      .co-view-content-placeholder {
        margin: 0;
        color: var(--ui-color-muted, #526174);
      }

      .placeholder {
        margin: 0;
      }
    `;

    const frame = document.createElement("section");
    frame.className = "region-frame";
    frame.dataset.rightRegionVersion = "common-toolbar-1";
    frame.setAttribute("aria-label", "右側區（共視區）");

    const regionHeader = document.createElement("header");
    regionHeader.className = "region-header";

    const label = document.createElement("span");
    label.className = "region-label";
    label.textContent = "右側區（共視區）";

    const collapseToggle = document.createElement("button");
    collapseToggle.className = "collapse-toggle";
    collapseToggle.type = "button";
    collapseToggle.dataset.role = "collapse-toggle";
    collapseToggle.setAttribute("aria-controls", "region-content");
    collapseToggle.textContent = "收合";
    regionHeader.append(label, collapseToggle);

    const dropdownHeader = document.createElement("header");
    dropdownHeader.className = "dropdown-header";
    dropdownHeader.dataset.role = "dropdown-header";
    dropdownHeader.setAttribute("aria-label", "下拉選單標頭");

    const dropdownTrigger = document.createElement("button");
    dropdownTrigger.className = "dropdown-trigger";
    dropdownTrigger.type = "button";
    dropdownTrigger.dataset.role = "dropdown-trigger";
    dropdownTrigger.setAttribute("aria-controls", "right-region-dropdown-menu");
    dropdownTrigger.textContent = "尚未建立";

    const dropdownMenu = document.createElement("div");
    dropdownMenu.className = "dropdown-menu";
    dropdownMenu.id = "right-region-dropdown-menu";
    dropdownMenu.dataset.role = "dropdown-menu";
    dropdownMenu.setAttribute("role", "menu");
    dropdownMenu.setAttribute("aria-label", "下拉選單選項（尚未建立）");
    dropdownMenu.hidden = true;

    dropdownHeader.append(dropdownTrigger, dropdownMenu);

    const toolbar = document.createElement("div");
    toolbar.className = "common-toolbar";
    toolbar.dataset.role = "common-toolbar";
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "常用工具列");

    const toolbarPlaceholder = document.createElement("p");
    toolbarPlaceholder.className = "common-toolbar-placeholder";
    toolbarPlaceholder.dataset.role = "common-toolbar-placeholder";
    toolbarPlaceholder.textContent = "尚未建立";
    toolbar.append(toolbarPlaceholder);

    const content = document.createElement("div");
    content.className = "region-content";
    content.id = "region-content";
    content.dataset.role = "region-content";

    const coViewContent = document.createElement("section");
    coViewContent.className = "co-view-content";
    coViewContent.dataset.role = "co-view-content";
    coViewContent.dataset.version = "co-view-content-1";
    coViewContent.setAttribute("role", "region");
    coViewContent.setAttribute("aria-label", "共視內容區");

    const coViewLabel = document.createElement("h2");
    coViewLabel.className = "co-view-content-label";
    coViewLabel.textContent = "共視內容區";

    const coViewSlot = document.createElement("slot");
    coViewSlot.name = "co-view-content";
    const coViewPlaceholder = document.createElement("p");
    coViewPlaceholder.className = "co-view-content-placeholder";
    coViewPlaceholder.dataset.role = "co-view-content-placeholder";
    coViewPlaceholder.textContent = "尚未建立";
    coViewSlot.append(coViewPlaceholder);

    coViewContent.append(coViewLabel, coViewSlot);
    content.append(coViewContent);

    frame.append(regionHeader, dropdownHeader, toolbar, content);
    root.append(style, frame);
  }

  #bindControls() {
    const collapseToggle = this.shadowRoot.querySelector('[data-role="collapse-toggle"]');
    const content = this.shadowRoot.querySelector('[data-role="region-content"]');
    const dropdownTrigger = this.shadowRoot.querySelector('[data-role="dropdown-trigger"]');
    const dropdownMenu = this.shadowRoot.querySelector('[data-role="dropdown-menu"]');

    this.#bindings.push(
      bindOpenClose({
        trigger: collapseToggle,
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
          dropdownTrigger.textContent = option.textContent.trim();
          this.#dropdownExpanded = false;
          dropdownMenu.hidden = true;
          syncDropdownState(dropdownTrigger, false);
        }
      })
    );
  }
}
