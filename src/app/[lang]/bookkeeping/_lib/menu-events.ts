export const MENU_CHANGED_EVENT = "bbq:menu-changed";

export function notifyMenuChanged() {
  window.dispatchEvent(new Event(MENU_CHANGED_EVENT));
}
