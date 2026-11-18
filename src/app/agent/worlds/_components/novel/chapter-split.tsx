"use client";

import {
  Button,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@landing-page/design-system";
import { Scissors } from "lucide-react";
import { useId, useState } from "react";
import { FieldGroup } from "../fields";
import type { Chapter } from "./model";

export function ChapterSplit({
  chapter,
  disabled,
  onSplit,
}: {
  chapter: Chapter;
  disabled: boolean;
  onSplit: (caret: number) => boolean;
}) {
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [caret, setCaret] = useState<number | null>(null);
  const text = chapter.text.replace(/\r\n?/g, "\n");
  const before = caret === null ? "" : text.slice(0, caret).trim();
  const after = caret === null ? "" : text.slice(caret).trim();
  const canSplit = Boolean(before && after);

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setCaret(null);
        setOpen(nextOpen);
      }}
    >
      <SheetTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled || !/\S\s*\S/u.test(text)}
        >
          <Scissors data-icon="inline-start" />
          拆分本章
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader className="pr-12">
          <SheetTitle>拆分本章</SheetTitle>
          <SheetDescription className="wrap-break-word">
            {chapter.title}
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          <FieldGroup>
            <div className="flex flex-col gap-2">
              <label htmlFor={fieldId} className="text-sm font-medium">
                拆分位置（光标或选区起点）
              </label>
              <textarea
                id={fieldId}
                readOnly
                value={text}
                onSelect={({ currentTarget }) => {
                  setCaret(currentTarget.selectionStart);
                }}
                className="h-[45dvh] min-h-24 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {canSplit ? (
              <dl className="grid gap-3 pb-2 text-sm sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="font-medium">原章结尾</dt>
                  <dd className="wrap-break-word whitespace-pre-wrap text-muted-foreground">
                    {before.length > 80 ? "…" : ""}
                    {before.slice(-80)}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="font-medium">新章开头</dt>
                  <dd className="wrap-break-word whitespace-pre-wrap text-muted-foreground">
                    {after.slice(0, 80)}
                    {after.length > 80 ? "…" : ""}
                  </dd>
                </div>
              </dl>
            ) : null}
          </FieldGroup>
        </div>
        <SheetFooter className="flex-row justify-end">
          <SheetClose asChild>
            <Button variant="outline">取消</Button>
          </SheetClose>
          <Button
            disabled={disabled || !canSplit}
            onClick={() => {
              if (caret !== null && onSplit(caret)) setOpen(false);
            }}
          >
            确认拆分
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
