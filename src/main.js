import { ExampleElement } from "./components/example-element.js";

const elementName = "zizai-foundation-example";

if (!customElements.get(elementName)) {
  customElements.define(elementName, ExampleElement);
}

const app = document.querySelector("#app");

if (!app) {
  throw new Error('Required mount point "#app" was not found.');
}

app.replaceChildren(document.createElement(elementName));
