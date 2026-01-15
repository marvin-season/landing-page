"use client";

// 1. 引入必要的命令和按键绑定
import { Schema } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { ProseMirrorCommands } from "@/app/prose/commands/prosemirror-commands";
import { VariablePicker } from "@/app/prose/components/variable-menu-view";
import { useEditor } from "@/app/prose/hooks/use-editor";
import {
  myButton,
  myMark,
  userConfirm,
  variableNode,
} from "@/app/prose/schema/schema";

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
  const { editorRef, view, PortalRenderer } = useEditor(schema);
  return (
    <div className="p-10 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        <PortalRenderer />
        {view && (
          <>
            <ProseMirrorCommands view={view} />
            <VariablePicker
              view={view}
              options={["userName", "orderId", "createTime"]}
            />
          </>
        )}
        <div ref={editorRef} className="prose-container" />
      </div>

      <style jsx global>{`
        .ProseMirror {
          min-height: 400px;
          padding: 20px;
          outline: none;
        }
        .ProseMirror-separator {
          display: inline-block;
        }
        .ProseMirror-selectednode {
          outline: 1px solid #1890cc; /* 蓝色外轮廓 */
          outline-offset: 1px;
        }
      `}</style>
    </div>
  );
}
