/**
 * Minimal one-way request interface from an individual region to its
 * layout container. The payload remains opaque to this boundary; concrete
 * sizing and region-state fields are not defined by this interface item.
 */
export function createRegionContainerInterface(regionId, submitRequest) {
  if (typeof regionId !== "string" || regionId.length === 0) {
    throw new TypeError("A non-empty region identifier is required.");
  }
  if (typeof submitRequest !== "function") {
    throw new TypeError("A container request handler is required.");
  }

  function send(kind, payload) {
    if (
      payload === null ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {
      throw new TypeError("A request payload must be a plain object.");
    }

    const request = Object.freeze({ ...payload });
    return submitRequest(
      Object.freeze({
        regionId,
        kind,
        request
      })
    );
  }

  return Object.freeze({
    requestSpace(spaceRequest) {
      return send("space", spaceRequest);
    },
    requestRegionState(stateRequest) {
      return send("region-state", stateRequest);
    }
  });
}
