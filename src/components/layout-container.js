import { createRegionContainerInterface } from "../interfaces/region-container-interface.js";

const REGION_ROLES = new Map([
  ["zizai-left-region", "left-region"],
  ["zizai-middle-region", "middle-region"],
  ["zizai-right-region", "right-region"]
]);

const DEFAULT_COLUMN_TRACKS = new Map([
  ["left-region", "2fr"],
  ["middle-region", "4fr"],
  ["right-region", "4fr"]
]);

const connectedRegionInterfaces = new WeakMap();
const coordinationRecords = new WeakMap();

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
        background: var(--ui-color-border, #cbd5e1);
        column-gap: 1px;
        grid-template-areas:
          "top top top"
          "left middle right";
        grid-template-columns: 2fr 4fr 4fr;
        grid-template-rows: auto minmax(0, 1fr);
      }

      slot {
        display: contents;
      }

      ::slotted(zizai-top-region) {
        grid-area: top;
        min-width: 0;
        min-height: 0;
      }

      ::slotted(zizai-left-region) {
        grid-area: left;
        min-width: 0;
        min-height: 0;
      }

      ::slotted(zizai-middle-region) {
        grid-area: middle;
        min-width: 0;
        min-height: 0;
      }

      ::slotted(zizai-right-region) {
        grid-area: right;
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
    coordinationRecords.get(this).set(region, {
      regionId,
      spaceRequest: null,
      trackWidth: null,
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

  #applyRegionLayout() {
    const interfaces = connectedRegionInterfaces.get(this);
    const records = coordinationRecords.get(this);

    const regionsByRole = new Map(
      Array.from(interfaces.keys(), (region) => [
        REGION_ROLES.get(region.localName),
        region
      ])
    );

    const tracks = ["left-region", "middle-region", "right-region"].map((role) => {
      const region = regionsByRole.get(role);
      if (!region) return DEFAULT_COLUMN_TRACKS.get(role);

      const record = records.get(region);
      if (record.regionStateRequest?.collapsed === true) {
        return "max-content";
      }

      if (Number.isFinite(record.trackWidth)) {
        return `${record.trackWidth}px`;
      }

      return DEFAULT_COLUMN_TRACKS.get(role);
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
    }

    if (
      request.kind === "region-state" &&
      Object.prototype.hasOwnProperty.call(payload, "collapsed") &&
      typeof payload.collapsed !== "boolean"
    ) {
      throw new TypeError("A collapsed state request must contain a boolean.");
    }

    if (request.kind === "space") {
      record.spaceRequest = payload;

      const role = record.regionId;
      const pairRoles = role === "left-region"
        ? ["left-region", "middle-region"]
        : ["middle-region", "right-region"];
      const regionsByRole = new Map(
        Array.from(interfaces.keys(), (item) => [
          REGION_ROLES.get(item.localName),
          item
        ])
      );
      const pairWidth = pairRoles.reduce((total, pairRole) => {
        const pairRegion = regionsByRole.get(pairRole);
        return total + (pairRegion?.getBoundingClientRect().width ?? 0);
      }, 0);
      const requestedWidth = Math.min(payload.width, pairWidth);
      const companionWidth = Math.max(0, pairWidth - requestedWidth);
      const companionRole = pairRoles.find((pairRole) => pairRole !== role);
      const requestedRecord = coordinationRecords.get(this).get(
        regionsByRole.get(role)
      );
      const companionRecord = coordinationRecords.get(this).get(
        regionsByRole.get(companionRole)
      );

      if (requestedRecord) requestedRecord.trackWidth = requestedWidth;
      if (companionRecord) companionRecord.trackWidth = companionWidth;
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
