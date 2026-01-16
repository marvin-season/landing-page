import { Schema } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { myButton, myMark, userConfirm, variableNode } from "./schema";

/**
 * 创建自定义的 ProseMirror Schema
 * 扩展了基础 schema，添加了自定义节点和标记
 */
export function createProseMirrorSchema(): Schema {
  const myNodes = basicSchema.spec.nodes.append({
    "my-button": myButton,
    "user-confirm": userConfirm,
    "variable-node": variableNode,
  });

  const myMarks = basicSchema.spec.marks.append({
    "my-mark": myMark,
  });

  return new Schema({
    nodes: myNodes,
    marks: myMarks,
  });
}
