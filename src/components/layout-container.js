import { createRegionContainerInterface } from "../interfaces/region-container-interface.js";

const REGION_ROLES = new Map([
  ["zizai-top-region", "top-region"],
  ["zizai-left-region", "left-region"],
  ["zizai-middle-region", "middle-region"],
  ["zizai-right-region", "right-region"]
]);

const connectedRegionInterfaces = new WeakMap();
const coordinationRecords = new WeakMap();
const initialLayoutWidths = new WeakMap();

/**
 * Composition and coordination boundary for independently owned regions.
 * The container changes only its own grid tracks in response to region requests.
 * It never changes a region's internal state, content, or controls.
 */
export class LayoutContainer extends HTMLElement {
  constructor() {
    super();
    connectedRegionInterfaces.set(this, new Map());
    coordinationRecords.set(this, new Map());
    initialLayoutWidths.set(this, null);
  }

  connectedCallback() {
    if (this.shadowRoot) return;

    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host {
        display: grid;
        width: 100%;
        height: 100vh;
        min-width: 0;
        min-height: 0;
        grid-template-areas:
          "top top top"
          "left middle right";
        grid-template-columns: auto minmax(0, 1fr) auto;
        grid-template-rows: auto minmax(0, 1fr);
      }

      slot {
        display: contents;
      }

      ::slotted(zizai-top-region) {
        grid-area: top;
        min-height: 0;
      }

      ::slotted(zizai-left-region) {
        grid-area: left;
        min-height: 0;
      }

      ::slotted(zizai-middle-region) {
        grid-area: middle;
        min-height: 0;
      }

      ::slotted(zizai-right-region) {
        grid-area: right;
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
    coordinationRecords.get(this).set(region, {
      regionId,
      spaceRequest: null,
      regionStateRequest: null,
      lastRequestKind: null,
      requestCount: 0
    });
    return regionInterface;
  }

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

  #captureInitialLayoutWidths() {
    const interfaces = connectedRegionInterfaces.get(this);
    const widths = new Map();

    for (const region of interfaces.keys()) {
      widths.set(region, region.getBoundingClientRect().width);
    }

    initialLayoutWidths.set(this, widths);
  }

  #applyRegionLayout() {
    const interfaces = connectedRegionInterfaces.get(this);
    const records = coordinationRecords.get(this);
    const widths = initialLayoutWidths.get(this);
    if (!widths) return;

    const regionsByRole = new Map(
      Array.from(interfaces.keys(), (region) => [
        REGION_ROLES.get(region.localName),
        region
      ])
    );

    const tracks = ["left-region", "middle-region", "right-region"].map((role) => {
      const region = regionsByRole.get(role);
      if (!region) return "auto";

      const record = records.get(region);
      if (record.regionStateRequest?.collapsed === true) {
        return "max-content";
      }

      // The middle track is always the flexible remainder while expanded.
      // The browser allocates the space left by the independent side tracks.
      if (role === "middle-region") {
        return "minmax(0, 1fr)";
      }

      const requestedWidth = record.spaceRequest?.width;
      const width = Number.isFinite(requestedWidth)
        ? requestedWidth
        : widths.get(region);

      return Number.isFinite(width) ? `${width}px` : "auto";
    });

    const style = this.shadowRoot.querySelector("style");
    const hostRule = Array.from(style.sheet.cssRules).find(
      (rule) => rule.selectorText === ":host"
    );
    hostRule?.style.setProperty("grid-template-columns", tracks.join(" "));
  }

  #receiveRegionRequest(region, request) {
    const interfaces = connectedRegionInterfaces.get(this);
    if (interfaces.get(region) !== region.containerInterface) {
      throw new Error("The request did not arrive through this region's interface.");
    }

    const record = coordinationRecords.get(this).get(region);
    const payload = request.request;

    if (request.kind === "space" && Object.prototype.hasOwnProperty.call(payload, "width")) {
      if (typeof payload.width !== "number" || !Number.isFinite(payload.width) || payload.width < 0) {
        throw new TypeError("A width request must contain a finite non-negative number.");
      }
      if (!initialLayoutWidths.get(this)) this.#captureInitialLayoutWidths();
    }

    if (
      request.kind === "region-state" &&
      typeof payload.collapsed === "boolean" &&
      !initialLayoutWidths.get(this)
    ) {
      // The region sends this request before changing its own collapsed presentation.
      this.#captureInitialLayoutWidths();
    }

    if (request.kind === "space") {
      record.spaceRequest = payload;
    } else if (request.kind === "region-state") {
      record.regionStateRequest = payload;
    }
    record.lastRequestKind = request.kind;
    record.requestCount += 1;

    if (
      (request.kind === "space" && Object.prototype.hasOwnProperty.call(payload, "width")) ||
      (request.kind === "region-state" && typeof payload.collapsed === "boolean")
    ) {
      this.#applyRegionLayout();
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
