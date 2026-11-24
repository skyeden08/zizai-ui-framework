/**
 * Synchronize the accessibility state of a caller-owned dropdown trigger.
 * The caller remains responsible for menu content and interaction state.
 */
export function syncDropdownState(trigger, expanded) {
  if (!(trigger instanceof HTMLButtonElement)) {
    throw new TypeError("A native HTMLButtonElement trigger is required.");
  }
  trigger.setAttribute("aria-expanded", String(Boolean(expanded)));
}

/**
 * Bind interaction to one caller-owned dropdown usage position.
 *
 * The caller owns the menu element, option content, open/closed state,
 * selected value, and all resulting content updates.
 * This binding only translates trigger clicks and option clicks
 * into caller callbacks. It stores no dropdown state and registers no
 * usage positions. Returns a cleanup function for independent removal
 * or replacement.
 *
 * Options are caller-authored descendants marked with
 * [data-dropdown-option]. Their data value is passed to onSelect.
 */
export function bindDropdown({
  trigger,
  menu,
  getExpanded,
  onExpandedChange,
  onSelect
}) {
  if (!(trigger instanceof HTMLButtonElement)) {
    throw new TypeError("A native HTMLButtonElement trigger is required.");
  }
  if (!(menu instanceof HTMLElement)) {
    throw new TypeError("A caller-owned menu HTMLElement is required.");
  }
  if (typeof getExpanded !== "function") {
    throw new TypeError("getExpanded must be a function.");
  }
  if (typeof onExpandedChange !== "function") {
    throw new TypeError("onExpandedChange must be a function.");
  }
  if (typeof onSelect !== "function") {
    throw new TypeError("onSelect must be a function.");
  }

  const handleTriggerClick = () => {
    const nextExpanded = !Boolean(getExpanded());
    onExpandedChange(nextExpanded);
    syncDropdownState(trigger, nextExpanded);
  };

  const handleMenuClick = (event) => {
    const target = event.target;
    const option = target instanceof Element
      ? target.closest("[data-dropdown-option]")
      : null;

    if (!option || !menu.contains(option)) return;
    onSelect(option.dataset.dropdownOption, option);
  };

  trigger.addEventListener("click", handleTriggerClick);
  menu.addEventListener("click", handleMenuClick);
  syncDropdownState(trigger, getExpanded());

  return () => {
    trigger.removeEventListener("click", handleTriggerClick);
    menu.removeEventListener("click", handleMenuClick);
  };
}
