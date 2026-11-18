import { Button } from "@landing-page/design-system";
import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { maxPriorContextLength } from "@/lib/group-chat/model";
import { TextField } from "./fields";
import { maxBackgroundFileBytes, parseBackgroundFile } from "./novel/model";

export function PriorContextField({
  value,
  onChange,
  onImportingChange,
}: {
  value: string;
  onChange: (value: string) => void;
  onImportingChange: (importing: boolean) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  return (
    <div className="flex flex-col gap-2">
      <TextField
        label="前置剧情"
        value={value}
        onChange={onChange}
        multiline
        maxLength={maxPriorContextLength}
        hint="已发生的剧情、人物状态或上一段正文，最多 8000 字。"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="self-start"
        onClick={() => fileInput.current?.click()}
      >
        <Upload data-icon="inline-start" />
        导入前文
      </Button>
      <input
        ref={fileInput}
        type="file"
        accept=".txt,.md,text/plain,text/markdown"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          onImportingChange(true);
          setError("");
          try {
            if (file.size > maxBackgroundFileBytes)
              throw new Error("前文文件不能超过 2 MB");
            const source = (await file.text()).replaceAll("\r\n", "\n").trim();
            const text = source.includes("\n\n<!-- novel-background\n")
              ? parseBackgroundFile(source).summary
              : source;
            const next = [value.trim(), text].filter(Boolean).join("\n\n");
            if (!text) throw new Error("前文文件为空");
            if (next.length > maxPriorContextLength)
              throw new Error("合并后的前置剧情超过 8000 字，请缩减内容。");
            onChange(next);
          } catch (error) {
            setError(error instanceof Error ? error.message : "前文导入失败");
          } finally {
            onImportingChange(false);
          }
        }}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
