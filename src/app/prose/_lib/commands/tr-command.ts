import type { Node } from "prosemirror-model";
import { Selection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

/**
 * 在编辑器的当前选区位置插入一个节点
 * @param view - ProseMirror 编辑器视图
 * @param node - 要插入的节点
 */
export function insertNode(view: EditorView, node: Node) {
  const { state, dispatch } = view;
  const { tr, selection } = state;
  const { from, to } = selection;
  const insertTr = tr.replaceWith(from, to, node);
  dispatch(insertTr);
  view.focus();
}

/**
 * 在编辑器的当前选区位置插入文本
 * @param view - ProseMirror 编辑器视图
 * @param value - 要插入的文本内容
 */
export function insertText(view: EditorView, value: string) {
  insertNode(view, view.state.schema.text(value));
}

/**
 * 切换选中文本的标记（Mark）
 * 如果已存在该标记则移除，否则添加
 * @param view - ProseMirror 编辑器视图
 * @param color - 标记的颜色
 */
export function toggleMark(view: EditorView, color: string) {
  const { state, dispatch } = view;
  const { tr, selection, schema } = state;
  const { from, to, empty } = selection;

  // 如果没有选中文字，通常不进行 toggle 操作
  if (empty) return;

  const markType = schema.marks["my-mark"];
  if (!markType) {
    console.warn("Mark type 'my-mark' not found in schema");
    return;
  }

  // 检测选区范围内是否已经存在这个类型的 Mark
  const hasMark = state.doc.rangeHasMark(from, to, markType);

  if (hasMark) {
    // 如果已经有了，就移除它
    dispatch(tr.removeMark(from, to, markType));
  } else {
    // 如果没有，就添加它
    const newMark = markType.create({ color });
    dispatch(tr.addMark(from, to, newMark));
  }

  // 操作完成后让编辑器聚焦
  view.focus();
}

/**
 * 将光标移动到文档末尾并聚焦编辑器
 * @param view - ProseMirror 编辑器视图
 */
export function focusAtEnd(view: EditorView) {
  const tr = view.state.tr.setSelection(Selection.atEnd(view.state.doc));
  view.dispatch(tr.scrollIntoView()); // scrollIntoView 确保视图滚动到最下方
  view.focus();
}
