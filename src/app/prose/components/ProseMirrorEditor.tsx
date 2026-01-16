"use client";

import { useMemo } from "react";
import { ProseMirrorCommands } from "@/app/prose/commands/prosemirror-commands";
import { VariablePicker } from "@/app/prose/components/VariableMenuView";
import { useEditor } from "@/app/prose/hooks/use-editor";
import { createProseMirrorSchema } from "@/app/prose/schema/create-schema";

export default function ProseMirrorEditor() {
  const schema = useMemo(() => createProseMirrorSchema(), []);
  const { editorRef, view, PortalRenderer } = useEditor({ schema });

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
          outline: 1px solid #1890cc;
          outline-offset: 1px;
        }
      `}</style>
    </div>
  );
}
