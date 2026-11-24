/**
 * Bind horizontal drag interaction to a caller-owned handle.
 *
 * This capability reports pointer displacement only. It never reads, stores,
 * calculates, or writes the adjusted object's width, position, or layout.
 * The caller owns all persistent values and applies them in its callbacks.
 */
export function bindDragAdjustment({ handle, onDragStart, onDrag, onDragEnd }) {
  if (!(handle instanceof HTMLElement)) {
    throw new TypeError("An HTMLElement drag handle is required.");
  }
  if (typeof onDrag !== "function") {
    throw new TypeError("onDrag must be a function.");
  }
  if (onDragStart !== undefined && typeof onDragStart !== "function") {
    throw new TypeError("onDragStart must be a function when provided.");
  }
  if (onDragEnd !== undefined && typeof onDragEnd !== "function") {
    throw new TypeError("onDragEnd must be a function when provided.");
  }

  let activePointerId = null;
  let startX = 0;
  let lastX = 0;

  const finish = (event, cancelled) => {
    if (activePointerId === null || event.pointerId !== activePointerId) return;

    const result = {
      pointerId: activePointerId,
      deltaX: event.clientX - startX,
      movementX: event.clientX - lastX,
      clientX: event.clientX,
      cancelled
    };
    activePointerId = null;
    onDragEnd?.(result);
  };

  const handlePointerDown = (event) => {
    if (!event.isPrimary || event.button !== 0 || activePointerId !== null) return;

    activePointerId = event.pointerId;
    startX = event.clientX;
    lastX = event.clientX;
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    onDragStart?.({
      pointerId: event.pointerId,
      startX: event.clientX
    });
  };

  const handlePointerMove = (event) => {
    if (activePointerId === null || event.pointerId !== activePointerId) return;

    const result = {
      pointerId: activePointerId,
      deltaX: event.clientX - startX,
      movementX: event.clientX - lastX,
      clientX: event.clientX
    };
    lastX = event.clientX;
    onDrag(result);
  };

  const handlePointerUp = (event) => finish(event, false);
  const handlePointerCancel = (event) => finish(event, true);
  const handleLostPointerCapture = (event) => finish(event, true);

  handle.addEventListener("pointerdown", handlePointerDown);
  handle.addEventListener("pointermove", handlePointerMove);
  handle.addEventListener("pointerup", handlePointerUp);
  handle.addEventListener("pointercancel", handlePointerCancel);
  handle.addEventListener("lostpointercapture", handleLostPointerCapture);

  return () => {
    handle.removeEventListener("pointerdown", handlePointerDown);
    handle.removeEventListener("pointermove", handlePointerMove);
    handle.removeEventListener("pointerup", handlePointerUp);
    handle.removeEventListener("pointercancel", handlePointerCancel);
    handle.removeEventListener("lostpointercapture", handleLostPointerCapture);
    if (activePointerId !== null) {
      const pointerId = activePointerId;
      activePointerId = null;
      onDragEnd?.({
        pointerId,
        deltaX: 0,
        movementX: 0,
        clientX: startX,
        cancelled: true
      });
    }
  };
}
