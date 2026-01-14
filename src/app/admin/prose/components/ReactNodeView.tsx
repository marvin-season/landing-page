import type { Node as PMNode } from "prosemirror-model";
import type { EditorView, NodeView } from "prosemirror-view";
import type { NodeViewProps } from "./NodeViewPortal";

export class ReactNodeView implements NodeView {
  dom: HTMLElement;
  node: PMNode;
  view: EditorView;
  getPos: () => number | undefined;
  component: React.ComponentType<NodeViewProps>;
  factory: {
    renderPortal: (
      Component: React.ComponentType<NodeViewProps>,
      props: NodeViewProps,
      container: HTMLElement,
    ) => void;
    removePortal: (container: HTMLElement) => void;
  };

  constructor(
    node: PMNode,
    view: EditorView,
    getPos: () => number | undefined,
    component: React.ComponentType<NodeViewProps>,
    factory: ReactNodeView["factory"],
  ) {
    this.node = node;
    this.view = view;
    this.getPos = getPos;
    this.component = component;
    this.factory = factory;

    // 创建容器
    this.dom = document.createElement("span");
    this.dom.classList.add("react-node-view-container");
    this.dom.setAttribute("data-id", node.attrs.id);
    // 关键样式：确保行内块显示且不换行
    this.dom.style.display = "inline-block";
    this.dom.style.verticalAlign = "middle";
    this.dom.contentEditable = "false";

    this.render();
  }

  render() {
    const props: NodeViewProps = {
      node: this.node,
      view: this.view,
      getPos: this.getPos,
      updateAttributes: (attrs) => {
        const pos = this.getPos();
        if (typeof pos !== "number") return;

        const tr = this.view.state.tr.setNodeMarkup(pos, undefined, {
          ...this.node.attrs,
          ...attrs,
        });
        this.view.dispatch(tr);
      },
    };

    this.factory.renderPortal(this.component, props, this.dom);
  }

  update(node: PMNode) {
    if (node.type !== this.node.type) return false;
    this.node = node;
    this.render();
    return true;
  }

  destroy() {
    this.factory.removePortal(this.dom);
  }

  // 拦截所有表单内部事件，防止 ProseMirror 误处理
  stopEvent() {
    return true;
  }

  ignoreMutation() {
    return true;
  }
}
