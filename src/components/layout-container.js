import { createRegionContainerInterface } from "../interfaces/region-container-interface.js";

const REGION_ROLES = new Map([
  ["zizai-top-region", "top-region"],
  ["zizai-left-region", "left-region"],
  ["zizai-middle-region", "middle-region"],
  ["zizai-right-region", "right-region"]
]);

const connectedRegionInterfaces = new WeakMap();

/**
 * Composition boundary for independently owned regions.
 *
 * It injects a narrow request interface into each direct child region.
 * Requests are received at the container boundary and acknowledged; actual
 * layout coordination and region-level state behavior remain separate work.
 * The container never reads or changes a region's shadow tree or inner state.
 */
export class LayoutContainer extends HTMLElement {
  constructor() {
    super();
    connectedRegionInterfaces.set(this, new Map());
  }

  connectedCallback() {
    if (this.shadowRoot) return;

    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host {
        display: block;
        min-width: 0;
        min-height: 0;
      }
    `;

    const contentSlot = document.createElement("slot");
    root.append(style, contentSlot);
  }

  connectRegion(region) {
    if (!(region instanceof HTMLElement) || region.parentElement !== this) {
      throw new TypeError("A direct child region element is required.");
    }

    const regionId = REGION_ROLES.get(region.localName);
    if (!regionId) {
      throw new TypeError("The element is not a supported layout region.");
    }

    const interfaces = connectedRegionInterfaces.get(this);
    const existing = interfaces.get(region);
    if (existing) return existing;

    if (Object.prototype.hasOwnProperty.call(region, "containerInterface")) {
      throw new Error("The region already has a container interface.");
    }

    const regionInterface = createRegionContainerInterface(
      regionId,
      (request) => this.#receiveRegionRequest(region, request)
    );

    Object.defineProperty(region, "containerInterface", {
      configurable: true,
      enumerable: false,
      value: regionInterface,
      writable: false
    });

    interfaces.set(region, regionInterface);
    return regionInterface;
  }

  #receiveRegionRequest(region, request) {
    const interfaces = connectedRegionInterfaces.get(this);
    if (interfaces.get(region) !== region.containerInterface) {
      throw new Error("The request did not arrive through this region's interface.");
    }

    this.dispatchEvent(
      new CustomEvent("zizai:region-request", {
        bubbles: false,
        composed: false,
        detail: request
      })
    );

    return Object.freeze({
      accepted: true,
      regionId: request.regionId,
      kind: request.kind
    });
  }
}
