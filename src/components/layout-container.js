import { createRegionContainerInterface } from "../interfaces/region-container-interface.js";

const REGION_ROLES = new Map([
  ["zizai-top-region", "top-region"],
  ["zizai-left-region", "left-region"],
  ["zizai-middle-region", "middle-region"],
  ["zizai-right-region", "right-region"]
]);

const connectedRegionInterfaces = new WeakMap();
const coordinationRecords = new WeakMap();

/**
 * Composition and coordination boundary for independently owned regions.
 *
 * The container establishes the four-region grid, records each region's
 * latest space and region-level coordination requests, and exposes an
 * immutable container-side snapshot. Request data is not written back to
 * region elements, attributes, styles, shadow trees, or internal operations.
 *
 * Concrete sizing rules and interactive region behavior remain deferred.
 */
export class LayoutContainer extends HTMLElement {
  constructor() {
    super();
    connectedRegionInterfaces.set(this, new Map());
    coordinationRecords.set(this, new Map());
  }

  connectedCallback() {
    if (this.shadowRoot) return;

    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host {
        display: grid;
        min-width: 0;
        min-height: 0;
        grid-template-areas:
          "top top top"
          "left middle right";
        grid-template-columns: auto auto auto;
        grid-template-rows: auto auto;
      }

      ::slotted(zizai-top-region) {
        grid-area: top;
      }

      ::slotted(zizai-left-region) {
        grid-area: left;
      }

      ::slotted(zizai-middle-region) {
        grid-area: middle;
      }

      ::slotted(zizai-right-region) {
        grid-area: right;
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
    coordinationRecords.get(this).set(region, {
      regionId,
      spaceRequest: null,
      regionStateRequest: null,
      lastRequestKind: null,
      requestCount: 0
    });
    return regionInterface;
  }

  /**
   * Read-only container-layer coordination state.
   * It contains only requests received by the container, never region internals.
   */
  getCoordinationSnapshot() {
    const interfaces = connectedRegionInterfaces.get(this);
    const records = coordinationRecords.get(this);

    return Object.freeze(
      Array.from(interfaces.keys(), (region) => {
        const record = records.get(region);
        return Object.freeze({
          regionId: record.regionId,
          spaceRequest: record.spaceRequest,
          regionStateRequest: record.regionStateRequest,
          lastRequestKind: record.lastRequestKind,
          requestCount: record.requestCount
        });
      })
    );
  }

  #receiveRegionRequest(region, request) {
    const interfaces = connectedRegionInterfaces.get(this);
    if (interfaces.get(region) !== region.containerInterface) {
      throw new Error("The request did not arrive through this region's interface.");
    }

    const record = coordinationRecords.get(this).get(region);
    if (request.kind === "space") {
      record.spaceRequest = request.request;
    } else if (request.kind === "region-state") {
      record.regionStateRequest = request.request;
    }
    record.lastRequestKind = request.kind;
    record.requestCount += 1;

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
