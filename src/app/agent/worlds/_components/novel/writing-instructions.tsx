import { Button, Textarea } from "@landing-page/design-system";
import { cn } from "@landing-page/utils";
import { X } from "lucide-react";
import {
  type ComponentProps,
  type KeyboardEvent,
  type Ref,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { WritingSkillIcon } from "./writing-skill-icons";
import {
  applyWritingSkillSlash,
  filterWritingSkills,
  readSlashSkillQuery,
  selectedWritingSkills,
} from "./writing-skill-slash";
import { normalizeSkillIds } from "./writing-skills";

export function WritingInstructions({
  label,
  plain,
  className,
  skills,
  onSkillsChange,
  value,
  onChange,
  onKeyDown,
  disabled,
  ref,
  ...props
}: Omit<
  ComponentProps<"textarea">,
  "className" | "rows" | "maxLength" | "name" | "value" | "onChange"
> & {
  label: string;
  plain?: boolean;
  className?: string;
  value: string;
  onChange: (event: { target: { value: string } }) => void;
  skills?: string[];
  onSkillsChange?: (skills: string[]) => void;
  ref?: Ref<HTMLTextAreaElement | null>;
}) {
  const listId = useId();
  const localRef = useRef<HTMLTextAreaElement | null>(null);
  const [menuIndex, setMenuIndex] = useState(0);
  const [slash, setSlash] = useState<{ start: number; query: string } | null>(
    null,
  );
  const skillPicker = Boolean(onSkillsChange);
  const selected = selectedWritingSkills(skills);
  const filtered = slash ? filterWritingSkills(slash.query) : [];

  function assignRef(node: HTMLTextAreaElement | null) {
    localRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }

  function syncSlash(nextValue: string, cursor: number) {
    if (!skillPicker || disabled) {
      setSlash(null);
      return;
    }
    const next = readSlashSkillQuery(nextValue, cursor);
    setSlash((current) => {
      if (
        (!current && !next) ||
        (current &&
          next &&
          current.start === next.start &&
          current.query === next.query)
      )
        return current;
      setMenuIndex(0);
      return next;
    });
  }

  useEffect(() => {
    if (!slash) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (localRef.current?.contains(target)) return;
      const menu = document.getElementById(listId);
      if (menu?.contains(target)) return;
      setSlash(null);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [listId, slash]);

  function chooseSkill(skillId: string) {
    if (!onSkillsChange) return;
    // 用菜单打开时记下的 /query 范围删除，避免点选时 textarea 失焦导致光标错位、斜杠残留。
    const next = applyWritingSkillSlash(value, skillId, skills, slash);
    onChange({ target: { value: next.value } });
    onSkillsChange(next.skills);
    setSlash(null);
    requestAnimationFrame(() => {
      const input = localRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(next.cursor, next.cursor);
    });
  }

  function removeSkill(skillId: string) {
    onSkillsChange?.(normalizeSkillIds(skills).filter((id) => id !== skillId));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (slash) {
      if (event.key === "Escape") {
        event.preventDefault();
        setSlash(null);
        return;
      }
      if (filtered.length) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setMenuIndex((index) => (index + 1) % filtered.length);
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setMenuIndex(
            (index) => (index - 1 + filtered.length) % filtered.length,
          );
          return;
        }
        if (
          event.key === "Enter" &&
          !event.shiftKey &&
          !event.nativeEvent.isComposing
        ) {
          event.preventDefault();
          chooseSkill(filtered[Math.min(menuIndex, filtered.length - 1)].id);
          return;
        }
      }
    }
    onKeyDown?.(event);
  }

  return (
    <div className="relative flex flex-col gap-2">
      {skillPicker && selected.length ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((skill) => (
            <span
              key={skill.id}
              className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-muted/70 py-1 pr-1 pl-2.5 text-xs"
            >
              <span className="flex size-3.5 shrink-0 items-center justify-center text-muted-foreground">
                <WritingSkillIcon id={skill.id} />
              </span>
              <span className="truncate">{skill.name}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-5"
                disabled={disabled}
                aria-label={`移除技法 ${skill.name}`}
                onClick={() => removeSkill(skill.id)}
              >
                <X className="size-3" />
              </Button>
            </span>
          ))}
        </div>
      ) : null}
      <label className="block">
        <span className="sr-only">{label}</span>
        <Textarea
          {...props}
          ref={assignRef}
          value={value}
          disabled={disabled}
          variant={plain ? "plain" : undefined}
          name="requirements"
          rows={2}
          maxLength={4000}
          aria-controls={slash ? listId : undefined}
          aria-expanded={slash ? true : undefined}
          aria-autocomplete={skillPicker ? "list" : undefined}
          className={cn("resize-none px-2.5 leading-5", className)}
          onChange={(event) => {
            const next = event.target.value;
            onChange(event);
            syncSlash(next, event.target.selectionStart ?? next.length);
          }}
          onClick={(event) => {
            props.onClick?.(event);
            syncSlash(
              event.currentTarget.value,
              event.currentTarget.selectionStart,
            );
          }}
          onSelect={(event) => {
            props.onSelect?.(event);
            syncSlash(
              event.currentTarget.value,
              event.currentTarget.selectionStart,
            );
          }}
          onKeyUp={(event) => {
            props.onKeyUp?.(event);
            syncSlash(
              event.currentTarget.value,
              event.currentTarget.selectionStart,
            );
          }}
          onKeyDown={handleKeyDown}
        />
      </label>
      {slash ? (
        <div
          id={listId}
          role="listbox"
          className="absolute inset-x-0 bottom-full z-30 mb-1 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md"
        >
          {filtered.length ? (
            filtered.map((skill, index) => {
              const active = index === Math.min(menuIndex, filtered.length - 1);
              const already = selected.some((item) => item.id === skill.id);
              return (
                <button
                  key={skill.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={cn(
                    "flex w-full items-start gap-2.5 px-3 py-2 text-left text-sm",
                    active ? "bg-accent" : "hover:bg-accent/60",
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setMenuIndex(index)}
                  onClick={() => chooseSkill(skill.id)}
                >
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-muted-foreground">
                    <WritingSkillIcon id={skill.id} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      {skill.name}
                      {already ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          已选用
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                      {skill.description}
                    </span>
                  </span>
                </button>
              );
            })
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              没有匹配的写作技法
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
