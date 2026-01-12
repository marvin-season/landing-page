import type { EditorView } from "prosemirror-view";

export function insertIntoCursor(view: EditorView, value: string) {
  const { state, dispatch } = view;
  const { tr, selection } = state;

  const insertTr = tr.insertText(value, selection.from);

  dispatch(insertTr);

  view.focus();
}

export function toggleRedMark(view: EditorView) {
  const { state, dispatch } = view;
  const { tr, selection, schema } = state;

  // 如果没有选中文字，就不操作
  if (selection.empty) return;

  // addMark 需要：开始位置, 结束位置, Mark类型
  const newTr = tr.addMark(
    selection.from,
    selection.to,
    schema.marks["my-mark"].create({ color: "red" }),
  );

  dispatch(newTr);
}
