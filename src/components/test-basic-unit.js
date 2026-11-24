export class TestBasicUnit extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;

    const root = this.attachShadow({ mode: "open" });
    const surface = document.createElement("section");
    surface.setAttribute("part", "surface");
    surface.dataset.role = "test-basic-unit-content";
    surface.innerHTML = `
      <style>
        :host {
          display: block;
          color: var(--ui-color-text, #182230);
          font-family: var(--ui-font-family, sans-serif);
        }

        section {
          padding: var(--ui-space-medium, 1rem);
          border: 1px solid var(--ui-color-border, #cbd5e1);
          border-radius: var(--ui-radius, 0.75rem);
          background: var(--ui-color-surface, #fff);
        }

        p {
          margin: 0;
          line-height: 1.6;
        }
      </style>
      <section>
        <p>基本單元載入測試：Web Component 已載入並呈現。</p>
      </section>
    `;

    root.append(surface);
  }
}
