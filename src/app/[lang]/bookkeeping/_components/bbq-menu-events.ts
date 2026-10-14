export const BBQ_MENU_CHANGED_EVENT = "bbq:menu-changed";

export function notifyBbqMenuChanged() {
  window.dispatchEvent(new Event(BBQ_MENU_CHANGED_EVENT));
}
