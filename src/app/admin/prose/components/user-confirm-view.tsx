import type {
  EditorView,
  NodeView,
  NodeViewConstructor,
  ViewMutationRecord,
} from "prosemirror-view";

export default class UserConfirmView implements NodeView {
  dom: HTMLElement;
  node: Parameters<NodeViewConstructor>[0];
  view: EditorView;
  getPos: () => number | undefined;

  constructor(...[node, view, getPos]: Parameters<NodeViewConstructor>) {
    this.node = node;
    this.view = view;
    this.getPos = getPos;

    this.dom = document.createElement("div");
    this.updateAttributes(node);
    this.renderContents();

    // 绑定事件
    this.dom.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("btn-confirm"))
        this.updateStatus("confirmed");
      if (target.classList.contains("btn-cancel"))
        this.updateStatus("canceled");
    });
  }
  contentDOM?: HTMLElement | null | undefined;
  multiType?: boolean | undefined;
  selectNode?: (() => void) | undefined;
  deselectNode?: (() => void) | undefined;
  setSelection?:
    | ((anchor: number, head: number, root: Document | ShadowRoot) => void)
    | undefined;
  stopEvent?: ((event: Event) => boolean) | undefined;
  ignoreMutation?: ((mutation: ViewMutationRecord) => boolean) | undefined;
  destroy?: (() => void) | undefined;

  updateAttributes(node: any) {
    this.dom.className = `user-confirm-node status-${node.attrs.status}`;
    this.dom.setAttribute("data-user", node.attrs.userName);
  }

  renderContents() {
    const isPending = this.node.attrs.status === "pending";
    this.dom.innerHTML = `
        <span class="user-label">👤 ${this.node.attrs.userName}</span>
        ${
          isPending
            ? `
          <button class="btn-confirm">确认</button>
          <button class="btn-cancel">拒绝</button>
        `
            : `<span class="status-text">${this.node.attrs.status === "confirmed" ? "✅ 已确认" : "❌ 已拒绝"}</span>`
        }
      `;
  }

  updateStatus(newStatus: string) {
    const { state, dispatch } = this.view;
    const pos = this.getPos();
    if (!pos) {
      return;
    }
    // 使用 Transaction 更新节点属性
    const tr = state.tr.setNodeMarkup(pos, null, {
      ...this.node.attrs,
      status: newStatus,
    });
    dispatch(tr);
  }

  update(node: any) {
    if (node.type !== this.node.type) return false;
    this.node = node;
    this.updateAttributes(node);
    this.renderContents();
    return true;
  }
}
