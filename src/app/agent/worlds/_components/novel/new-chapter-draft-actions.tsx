import { PenLine, Trash2 } from "lucide-react";
import { localActionHint, NovelActionButton } from "./novel-action-tooltip";

export function NewChapterDraftActions({
  title,
  disabled,
  backupFailed,
  onEdit,
  onDiscard,
}: {
  title: string;
  disabled: boolean;
  backupFailed: boolean;
  onEdit: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3 py-5">
      <h3 className="font-serif text-xl">{title}</h3>
      <p className="text-sm font-medium text-destructive">请先保存草稿</p>
      <div className="flex flex-wrap items-center gap-2">
        <NovelActionButton
          hint={localActionHint("继续编辑本机保存的新章草稿。")}
          size="sm"
          disabled={disabled}
          onClick={onEdit}
        >
          <PenLine data-icon="inline-start" />
          编辑草稿
        </NovelActionButton>
        <NovelActionButton
          hint={localActionHint("删除本机的新章草稿，保留已保存的章节。")}
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={onDiscard}
        >
          <Trash2 data-icon="inline-start" />
          丢弃草稿
        </NovelActionButton>
      </div>
      {backupFailed ? (
        <p role="alert" className="text-xs text-destructive">
          未能更新本机草稿，请重试。
        </p>
      ) : null}
    </div>
  );
}
