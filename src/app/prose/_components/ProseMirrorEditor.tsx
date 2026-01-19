"use client";

import { useCallback, useMemo } from "react";
import { ProseSettings } from "@/app/prose/_components/ProseSetting";
import { VariablePicker } from "@/app/prose/_components/VariableMenuView";
import { useEditor } from "@/app/prose/_lib/hooks/use-editor";
import { createProseMirrorSchema } from "@/app/prose/_lib/schema/create-schema";
import { useProseSettingsStore } from "../_lib/store/prose-setting";
import { ProseMirrorCommands } from "./ProsemirrorCommands";

export default function ProseMirrorEditor() {
  const schema = useMemo(() => createProseMirrorSchema(), []);
  const isReadonly = useProseSettingsStore((s) =>
    s.isSettingEnabled("readonly-mode"),
  );
  const editable = useCallback(() => {
    return !isReadonly;
  }, [isReadonly]);
  const { editorRef, view, PortalRenderer } = useEditor({ schema, editable });

  return (
    <div className="p-10 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        <PortalRenderer />
        {view && (
          <>
            <ProseMirrorCommands view={view} />
            <ProseSettings />
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
