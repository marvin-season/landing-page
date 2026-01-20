"use client";

import { useCallback, useEffect, useMemo } from "react";
import { mockResponse } from "@/lib/response";
import { SSEMessageGenerator } from "@/lib/stream";
import { focusAtEnd, insertNode } from "./_lib/commands/tr-command";
import { initialJson } from "./_lib/data";
import { useEditor } from "./_lib/hooks/use-editor";
import { createProseMirrorSchema } from "./_lib/schema/create-schema";
import { useProseSettingsStore } from "./_lib/store/prose-setting";
import { ProseMirrorCommands } from "./ProsemirrorCommands";
import { VariablePicker } from "./VariableMenuView";

export default function ProseMirrorEditor() {
  const schema = useMemo(() => createProseMirrorSchema(), []);
  const isReadonly = useProseSettingsStore((s) =>
    s.isSettingEnabled("readonly-mode"),
  );

  const editable = useCallback(() => {
    return !isReadonly;
  }, [isReadonly]);

  const { editorRef, view, PortalRenderer } = useEditor({
    schema,
    editable,
  });

  useEffect(() => {
    if (!view) return;

    const response = mockResponse({
      data: initialJson.content.flatMap((item) => item.content),
      delay: 1000,
    });

    const messages = SSEMessageGenerator(response.body);
    Array.fromAsync(messages, (message) => {
      const data = JSON.parse(message);
      insertNode(view, view.state.schema.nodeFromJSON(data));
      focusAtEnd(view);
    });
  }, [view]);

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
