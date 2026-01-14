"use client";

// 1. 引入必要的命令和按键绑定
import { Schema } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { ProseMirrorCommands } from "@/app/admin/prose/components/commands/prosemirror-commands";
import {
  myButton,
  myMark,
  userConfirm,
  variableNode,
} from "@/app/admin/prose/components/schema";
import { VariablePicker } from "@/app/admin/prose/components/variable-menu-view";
import { useEditor } from "@/app/admin/prose/hooks/use-editor";

const myNodes = basicSchema.spec.nodes.append({
  "my-button": myButton,
  "user-confirm": userConfirm,
  "variable-node": variableNode,
});
const myMarks = basicSchema.spec.marks.append({
  "my-mark": myMark,
});
const schema = new Schema({
  nodes: myNodes,
  marks: myMarks,
});
export default function ProseMirrorEditor() {
  const { editorRef, view } = useEditor(schema);
  return (
    <div className="p-10 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-4 border-b bg-gray-100 text-sm text-gray-500">
          提示：点击“确认”或“拒绝”会触发 Transaction，支持 Cmd+Z 撤销。
        </div>
        {view && <ProseMirrorCommands view={view} />}
        <div ref={editorRef} className="prose-container" />
        {view && (
          <VariablePicker
            view={view}
            options={["userName", "orderId", "createTime"]}
          />
        )}
      </div>

      <style jsx global>{`
        .ProseMirror {
          min-height: 400px;
          padding: 20px;
          outline: none;
        }
        .variable-tag.ProseMirror-selectednode {
          outline: 2px solid #1890ff; /* 蓝色外轮廓 */
          outline-offset: 1px;
          background: #bae7ff !important; /* 加深背景色 */
          box-shadow: 0 0 8px rgba(24, 144, 255, 0.5); /* 增加发光感 */
        }
      `}</style>
    </div>
  );
}
