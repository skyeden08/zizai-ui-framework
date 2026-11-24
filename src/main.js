import { LayoutContainer } from "./components/layout-container.js";
import { TopRegion } from "./components/top-region.js";

const mountPoint = document.querySelector("#app");

if (!mountPoint) {
  throw new Error('Required mount point "#app" was not found.');
}

if (!customElements.get("zizai-layout-container")) {
  customElements.define("zizai-layout-container", LayoutContainer);
}
if (!customElements.get("zizai-top-region")) {
  customElements.define("zizai-top-region", TopRegion);
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

export function mountTopRegion(container) {
  if (
    !(container instanceof HTMLElement) ||
    !container.matches("zizai-layout-container")
  ) {
    throw new TypeError("A valid layout container is required.");
  }

  const existingRegion = container.querySelector(":scope > zizai-top-region");
  if (existingRegion) return existingRegion;

  const region = document.createElement("zizai-top-region");
  container.append(region);
  return region;
}

const container = mountLayoutContainer(mountPoint);
mountTopRegion(container);
