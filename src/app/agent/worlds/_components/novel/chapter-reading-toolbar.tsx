import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import { Combine, Ellipsis, PenLine, Square, Trash2 } from "lucide-react";
import { type RefObject, useRef } from "react";
import { ChapterIndex, type ChapterIndexEntry } from "./chapter-index";
import {
  type Chapter,
  chapterLengthShortfall,
  formatChapterLength,
} from "./model";
import {
  localActionHint,
  NovelActionButton,
  stopGenerationHint,
} from "./novel-action-tooltip";

export function ChapterReadingToolbar({
  chapter,
  chapterEntries,
  chapterId,
  thinking,
  showingNewDraft,
  hasDraft,
  switchLocked,
  actionsLocked,
  plotLocked,
  deleteLocked,
  menuTrigger,
  onSelectChapter,
  onStop,
  onEditChapter,
  onOpenPlot,
  onDeleteChapter,
}: {
  chapter: Chapter | undefined;
  chapterEntries: ChapterIndexEntry[];
  chapterId: string;
  thinking: boolean;
  showingNewDraft: boolean;
  hasDraft: boolean;
  switchLocked: boolean;
  actionsLocked: boolean;
  plotLocked: boolean;
  deleteLocked: boolean;
  menuTrigger: RefObject<HTMLButtonElement | null>;
  onSelectChapter: (id: string) => void;
  onStop: () => void;
  onEditChapter: (chapter: Chapter) => void;
  onOpenPlot: () => void;
  onDeleteChapter: () => void;
}) {
  const openPlotAfterMenuClose = useRef(false);
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-x-3 gap-y-2 p-2 -mx-2 backdrop-blur-xs">
      <ChapterIndex
        chapters={chapterEntries}
        value={chapterId}
        disabled={switchLocked}
        onSelect={onSelectChapter}
      />
      {chapter && !thinking && !showingNewDraft ? (
        <p
          className={cn(
            "shrink-0 whitespace-nowrap text-xs tabular-nums",
            chapterLengthShortfall(
              chapter.text.length,
              chapter.targetWords ?? "",
            )
              ? "text-amber-700 dark:text-amber-400"
              : "text-muted-foreground",
          )}
        >
          {formatChapterLength(chapter.text.length, chapter.targetWords ?? "")}
          {hasDraft ? (
            <span className="ml-2 font-medium text-destructive">
              草稿未同步，点击「编辑本章」进入
            </span>
          ) : null}
        </p>
      ) : null}
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {thinking ? (
          <NovelActionButton
            hint={stopGenerationHint}
            size="sm"
            variant="outline"
            className="h-9"
            onClick={onStop}
          >
            <Square data-icon="inline-start" />
            停止生成
          </NovelActionButton>
        ) : chapter && !showingNewDraft ? (
          <>
            <NovelActionButton
              hint={localActionHint("打开本章编辑器，并恢复已有的本机草稿。")}
              size="sm"
              variant="outline"
              className="h-9"
              disabled={actionsLocked}
              onClick={() => onEditChapter(chapter)}
            >
              <PenLine data-icon="inline-start" />
              编辑本章
            </NovelActionButton>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  ref={menuTrigger}
                  size="sm"
                  variant="outline"
                  className="h-9"
                  disabled={actionsLocked}
                >
                  <Ellipsis data-icon="inline-start" />
                  章节操作
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-44"
                onCloseAutoFocus={(event) => {
                  if (!openPlotAfterMenuClose.current) return;
                  openPlotAfterMenuClose.current = false;
                  event.preventDefault();
                  onOpenPlot();
                }}
              >
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    disabled={plotLocked}
                    onSelect={() => {
                      openPlotAfterMenuClose.current = true;
                    }}
                  >
                    <Combine />
                    剧情整理
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={deleteLocked}
                    onSelect={onDeleteChapter}
                  >
                    <Trash2 />
                    删除本章
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : null}
      </div>
    </div>
  );
}
