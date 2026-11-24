import { TestBasicUnit } from "./components/test-basic-unit.js";

const mountPoint = document.querySelector("#app");

if (!mountPoint) {
  throw new Error('Required mount point "#app" was not found.');
}

if (!customElements.get("zizai-test-basic-unit")) {
  customElements.define("zizai-test-basic-unit", TestBasicUnit);
}

export function mountBasicTestUnit(target) {
  if (!(target instanceof HTMLElement)) {
    throw new TypeError("A valid HTMLElement mount target is required.");
  }

  const existingUnit = target.querySelector(":scope > zizai-test-basic-unit");
  if (existingUnit) return existingUnit;

  const unit = document.createElement("zizai-test-basic-unit");
  target.append(unit);
  return unit;
}

mountBasicTestUnit(mountPoint);
