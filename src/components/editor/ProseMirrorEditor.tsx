"use client";

import { useCallback, useEffect, useMemo } from "react";
import { SSEMessageGenerator } from "@/lib/stream";
import { focusAtEnd, insertNode } from "./_lib/commands/tr-command";
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

    const formData = new FormData();
    formData.append("message", "hello");
    formData.append("stream", "true");
    formData.append("session_id", "82e5f822-667c-4e18-b637-417b46eab243");
    fetch("/api-agent/agents/prosemirror-agent/runs", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.body)
      .then((body) => {
        const messages = SSEMessageGenerator(body);
        Array.fromAsync(messages, (message) => {
          const data = JSON.parse(message);
          console.log(data);
          insertNode(view, view.state.schema.nodeFromJSON(data));
          focusAtEnd(view);
        });
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
