export class ExampleElement extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;

    const shadow = this.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host {
          display: block;
          color: var(--ui-color-text, #182230);
          font-family: var(--ui-font-family, sans-serif);
        }

        article {
          padding: var(--ui-space-medium, 1rem);
          border: 1px solid var(--ui-color-border, #cbd5e1);
          border-radius: var(--ui-radius, 0.75rem);
          background: var(--ui-color-surface, #fff);
        }

        h1 {
          margin: 0 0 var(--ui-space-small, 0.5rem);
          font-size: 1.25rem;
        }

        p {
          margin: 0;
          color: var(--ui-color-muted, #526174);
          line-height: 1.6;
        }

        strong {
          color: var(--ui-color-accent, #2457a6);
        }
      </style>
      <article>
        <h1>ZIZAI UI 基礎載入測試</h1>
        <p>Web Component 已建立並呈現；<strong>CSS Variables</strong> 已由外部樣式提供。</p>
      </article>
    `;
  }
}
