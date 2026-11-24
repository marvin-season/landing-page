import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  readChapterEditorDraft,
  writeChapterEditorDraft,
} from "./chapter-editor-drafts";

type DraftStatus =
  | "loading"
  | "ready"
  | "saving"
  | "read-error"
  | "write-error";

export function useChapterEditorDraft(
  roomKey: string,
  chapterId: string,
  enabled: boolean,
  text: string | undefined,
  onRestore: (text: string) => void,
) {
  const [status, setStatus] = useState<DraftStatus>(
    enabled ? "loading" : "ready",
  );
  const requested = useRef<string | undefined>(undefined);
  const pending = useRef<Promise<void> | undefined>(undefined);
  const restore = useEffectEvent(onRestore);

  useEffect(() => {
    if (status !== "loading") return;
    let active = true;
    void readChapterEditorDraft(roomKey, chapterId).then(
      (saved) => {
        if (!active) return;
        requested.current = saved;
        if (saved !== undefined) restore(saved);
        setStatus("ready");
      },
      () => {
        if (active) setStatus("read-error");
      },
    );
    return () => {
      active = false;
    };
  }, [chapterId, roomKey, status]);

  useLayoutEffect(() => {
    if (
      !enabled ||
      status === "loading" ||
      status === "read-error" ||
      requested.current === text
    )
      return;
    requested.current = text;
    const write = writeChapterEditorDraft(roomKey, chapterId, text);
    pending.current = write;
    setStatus("saving");
    void write.then(
      () => {
        if (pending.current === write) setStatus("ready");
      },
      () => {
        if (pending.current === write) setStatus("write-error");
      },
    );
  }, [chapterId, enabled, roomKey, status, text]);

  return status;
}
