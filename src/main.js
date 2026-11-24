import { LayoutContainer } from "./components/layout-container.js";

const mountPoint = document.querySelector("#app");

if (!mountPoint) {
  throw new Error('Required mount point "#app" was not found.');
}

if (!customElements.get("zizai-layout-container")) {
  customElements.define("zizai-layout-container", LayoutContainer);
}

export function mountLayoutContainer(target) {
  if (!(target instanceof HTMLElement)) {
    throw new TypeError("A valid HTMLElement mount target is required.");
  }

  const existingContainer = target.querySelector(
    ":scope > zizai-layout-container"
  );
  if (existingContainer) return existingContainer;

  const container = document.createElement("zizai-layout-container");
  target.append(container);
  return container;
}

mountLayoutContainer(mountPoint);
