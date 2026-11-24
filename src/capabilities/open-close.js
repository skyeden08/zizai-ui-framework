/**
 * Synchronize the accessibility state of a caller-owned native button.
 * The caller remains responsible for the associated content and its state.
 */
export function syncOpenCloseState(trigger, expanded) {
  if (!(trigger instanceof HTMLButtonElement)) {
    throw new TypeError("A native HTMLButtonElement trigger is required.");
  }
  trigger.setAttribute("aria-expanded", String(Boolean(expanded)));
}

/**
 * Bind click interaction to caller-owned state.
 * No open/closed state or controlled content is stored or managed here.
 * Returns a cleanup function so this binding can be independently removed
 * or replaced.
 */
export function bindOpenClose({ trigger, getExpanded, onExpandedChange }) {
  if (!(trigger instanceof HTMLButtonElement)) {
    throw new TypeError("A native HTMLButtonElement trigger is required.");
  }
  if (typeof getExpanded !== "function") {
    throw new TypeError("getExpanded must be a function.");
  }
  if (typeof onExpandedChange !== "function") {
    throw new TypeError("onExpandedChange must be a function.");
  }

  const handleClick = () => {
    const nextExpanded = !Boolean(getExpanded());
    onExpandedChange(nextExpanded);
    syncOpenCloseState(trigger, nextExpanded);
  };

  trigger.addEventListener("click", handleClick);
  syncOpenCloseState(trigger, getExpanded());

  return () => {
    trigger.removeEventListener("click", handleClick);
  };
}
