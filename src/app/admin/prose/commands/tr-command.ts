import type { Node } from "prosemirror-model";
import { Selection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

export function insertNode(view: EditorView, node: Node) {
  const { state, dispatch } = view;
  const { tr, selection } = state;
  const { from, to } = selection;
  const insertTr = tr.replaceWith(from, to, node);
  dispatch(insertTr);
  view.focus();
}

export function insertText(view: EditorView, value: string) {
  insertNode(view, view.state.schema.text(value));
}

export function toggleMark(view: EditorView, color: string) {
  const { state, dispatch } = view;
  const { tr, selection, schema } = state;
  const { from, to, empty } = selection;

  // 1. 如果没有选中文字，通常不进行 toggle 操作
  if (empty) return;

  const markType = schema.marks["my-mark"];

  // 2. 检测选区范围内是否已经存在这个类型的 Mark
  // rangeHasMark(from, to, type) 返回布尔值
  const hasMark = state.doc.rangeHasMark(from, to, markType);

  if (hasMark) {
    // 3. 如果已经有了，就移除它
    dispatch(tr.removeMark(from, to, markType));
  } else {
    // 4. 如果没有，就添加它
    const newMark = markType.create({ color });
    dispatch(tr.addMark(from, to, newMark));
  }

  // 操作完成后让编辑器聚焦
  view.focus();
}

export function focusAtEnd(view: EditorView) {
  const tr = view.state.tr.setSelection(Selection.atEnd(view.state.doc));
  view.dispatch(tr.scrollIntoView()); // scrollIntoView 确保视图滚动到最下方
  view.focus();
}
