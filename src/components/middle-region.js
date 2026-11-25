/**
 * Independent middle region for the desktop UI frame.
 *
 * The middle region is the conversation area. It provides separate
 * presentation and input mounting points; conversation content, input
 * interaction, and conversation state remain within this region's boundary.
 * No conversation state or internal operation is delegated to the container.
 *
 * Remaining-space sizing, collapse, width adjustment, and scrolling are
 * intentionally deferred to their separately planned items.
 */
export class MiddleRegion extends HTMLElement {
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
        color: var(--ui-color-text, #182230);
        background: var(--ui-color-surface, #ffffff);
        font-family: var(--ui-font-family, system-ui, sans-serif);
      }

      .conversation,
      .input-area {
        box-sizing: border-box;
        min-width: 0;
      }

      .input-area {
        margin-block-start: var(--ui-space-small, 0.5rem);
      }

      slot {
        display: block;
      }

      .placeholder {
        margin: 0;
        color: var(--ui-color-muted, #526174);
      }
    `;

    const surface = document.createElement("main");
    surface.className = "surface";
    surface.setAttribute("aria-label", "中間區對話方塊");

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

    surface.append(conversation, inputArea);
    root.append(style, surface);
  }
}
