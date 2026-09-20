"use client";

import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type {
  SuggestionKeyDownProps,
  SuggestionProps,
} from "@tiptap/suggestion";
import {
  type FormEvent,
  type Ref,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { mentionMenuKey, nextMentionIndex } from "./mention-menu";
import { filterMentionItems } from "./mention-query";
import { MentionSuggestion } from "./mention-suggestion";
import { editorToPlainText, plainTextToContent } from "./plain-text";
import type { AiInputHandle, AiInputSubmitValue, AiMentionItem } from "./types";

const composerKit = StarterKit.configure({
  blockquote: false,
  bold: false,
  bulletList: false,
  code: false,
  codeBlock: false,
  dropcursor: false,
  gapcursor: false,
  heading: false,
  horizontalRule: false,
  italic: false,
  link: false,
  listItem: false,
  listKeymap: false,
  orderedList: false,
  strike: false,
  trailingNode: false,
  underline: false,
});

function isSubmitEnter(event: KeyboardEvent) {
  return (
    event.key === "Enter" &&
    !event.shiftKey &&
    !event.altKey &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.isComposing &&
    event.keyCode !== 229
  );
}

export type UseAiInputProps<T = unknown> = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  mentions?: AiMentionItem<T>[];
  defaultMentions?: AiMentionItem<T>[];
  onMentionsChange?: (mentions: AiMentionItem<T>[]) => void;
  mentionItems?: readonly AiMentionItem<T>[];
  mentionTrigger?: string;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  canSubmit?: boolean;
  maxLength?: number;
  emptyMentionLabel?: string;
  sendLabel?: string;
  stopLabel?: string;
  removeMentionLabel?: string;
  onSubmit?: (value: AiInputSubmitValue<T>) => void;
  onStop?: () => void;
  ref?: Ref<AiInputHandle | null>;
};

export function useAiInput<T = unknown>({
  value: valueProp,
  defaultValue = "",
  onValueChange,
  mentions: mentionsProp,
  defaultMentions,
  onMentionsChange,
  mentionItems,
  mentionTrigger = "@",
  placeholder,
  label,
  disabled = false,
  loading = false,
  canSubmit,
  maxLength = 8000,
  emptyMentionLabel = "No matches",
  sendLabel = "Send message",
  stopLabel = "Stop response",
  removeMentionLabel = "Remove",
  onSubmit,
  onStop,
  ref,
}: UseAiInputProps<T>) {
  const listId = useId();
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const [uncontrolledMentions, setUncontrolledMentions] = useState<
    AiMentionItem<T>[]
  >(() => defaultMentions ?? []);
  const [activeIndex, setActiveIndex] = useState(0);
  const [suggestion, setSuggestion] = useState<SuggestionProps<
    AiMentionItem<T>,
    AiMentionItem<T>
  > | null>(null);

  const value = valueProp ?? uncontrolledValue;
  const mentions = mentionsProp ?? uncontrolledMentions;
  const mentionOpen = suggestion !== null;
  const filteredItems = suggestion?.items ?? [];
  const submitEnabled =
    canSubmit ?? Boolean(value.trim() || mentions.length > 0);

  const valueRef = useRef(value);
  const mentionsRef = useRef(mentions);
  const mentionItemsRef = useRef(mentionItems);
  const selectedIdsRef = useRef(new Set(mentions.map((item) => item.id)));
  const mentionOpenRef = useRef(mentionOpen);
  const filteredItemsRef = useRef(filteredItems);
  const activeIndexRef = useRef(activeIndex);
  const placeholderRef = useRef(placeholder);
  const onValueChangeRef = useRef(onValueChange);
  const onMentionsChangeRef = useRef(onMentionsChange);
  const onSubmitRef = useRef(onSubmit);
  const valuePropRef = useRef(valueProp);
  const mentionsPropRef = useRef(mentionsProp);
  const submitEnabledRef = useRef(submitEnabled);
  const disabledRef = useRef(disabled);
  const loadingRef = useRef(loading);

  valueRef.current = value;
  mentionsRef.current = mentions;
  mentionItemsRef.current = mentionItems;
  selectedIdsRef.current = new Set(mentions.map((item) => item.id));
  mentionOpenRef.current = mentionOpen;
  filteredItemsRef.current = filteredItems;
  activeIndexRef.current = activeIndex;
  placeholderRef.current = placeholder;
  onValueChangeRef.current = onValueChange;
  onMentionsChangeRef.current = onMentionsChange;
  onSubmitRef.current = onSubmit;
  valuePropRef.current = valueProp;
  mentionsPropRef.current = mentionsProp;
  submitEnabledRef.current = submitEnabled;
  disabledRef.current = disabled;
  loadingRef.current = loading;

  const setValue = useCallback((next: string) => {
    if (valuePropRef.current === undefined) setUncontrolledValue(next);
    onValueChangeRef.current?.(next);
  }, []);

  const setMentions = useCallback((next: AiMentionItem<T>[]) => {
    if (mentionsPropRef.current === undefined) setUncontrolledMentions(next);
    onMentionsChangeRef.current?.(next);
  }, []);

  const addMention = useCallback(
    (item: AiMentionItem<T>) => {
      const current = mentionsRef.current;
      if (current.some((mention) => mention.id === item.id)) return;
      setMentions([...current, item]);
    },
    [setMentions],
  );

  const removeMention = useCallback(
    (id: string) => {
      setMentions(mentionsRef.current.filter((item) => item.id !== id));
    },
    [setMentions],
  );

  const suggestionApi = useRef({
    addMention,
    items: (query: string) => {
      const items = mentionItemsRef.current;
      if (!items) return [];
      return filterMentionItems(items, query, selectedIdsRef.current);
    },
    onStart: (props: SuggestionProps<AiMentionItem<T>, AiMentionItem<T>>) => {
      setActiveIndex(0);
      setSuggestion(props);
    },
    onUpdate: (props: SuggestionProps<AiMentionItem<T>, AiMentionItem<T>>) => {
      setSuggestion(props);
      setActiveIndex(0);
    },
    onExit: () => {
      setSuggestion(null);
      setActiveIndex(0);
    },
    onKeyDown: ({ event }: SuggestionKeyDownProps) => {
      if (!mentionOpenRef.current) return false;
      const action = mentionMenuKey(event, filteredItemsRef.current.length);
      if (!action) return false;
      event.preventDefault();
      if (action === "close") {
        setSuggestion(null);
        return event.key !== "Escape";
      }
      if (action === "up" || action === "down") {
        setActiveIndex((current) =>
          nextMentionIndex(current, filteredItemsRef.current.length, action),
        );
        return true;
      }
      const item = filteredItemsRef.current[activeIndexRef.current];
      if (item) suggestionRef.current?.command(item);
      return true;
    },
  });
  suggestionApi.current.addMention = addMention;

  const suggestionRef = useRef(suggestion);
  suggestionRef.current = suggestion;
  const submitRef = useRef<() => void>(() => {});

  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      content: plainTextToContent(value),
      editable: !disabled,
      extensions: [
        composerKit,
        Placeholder.configure({
          placeholder: () => placeholderRef.current ?? "",
        }),
        CharacterCount.configure({
          limit: maxLength,
          mode: "textSize",
        }),
        MentionSuggestion.configure({
          suggestion: {
            char: mentionTrigger,
            allow: () => Boolean(mentionItemsRef.current),
            items: ({ query }) => suggestionApi.current.items(query),
            command: ({ editor: mentionEditor, range, props }) => {
              mentionEditor.chain().focus().deleteRange(range).run();
              suggestionApi.current.addMention(props as AiMentionItem<T>);
            },
            render: () => ({
              onStart: (props) =>
                suggestionApi.current.onStart(
                  props as SuggestionProps<AiMentionItem<T>, AiMentionItem<T>>,
                ),
              onUpdate: (props) =>
                suggestionApi.current.onUpdate(
                  props as SuggestionProps<AiMentionItem<T>, AiMentionItem<T>>,
                ),
              onExit: () => suggestionApi.current.onExit(),
              onKeyDown: (props) => suggestionApi.current.onKeyDown(props),
            }),
          },
        }),
      ],
      editorProps: {
        attributes: {
          role: "combobox",
          "aria-autocomplete": "list",
          "aria-label": label ?? placeholder ?? "Message",
          class: "max-h-40 min-h-20 overflow-y-auto outline-none",
        },
        handleKeyDown: (_view, event) => {
          if (mentionOpenRef.current) return false;
          if (!isSubmitEnter(event)) return false;
          event.preventDefault();
          submitRef.current();
          return true;
        },
      },
      onUpdate: ({ editor: nextEditor }) => {
        setValue(editorToPlainText(nextEditor));
      },
    },
    [],
  );

  const submit = useCallback(() => {
    if (
      disabledRef.current ||
      loadingRef.current ||
      !submitEnabledRef.current
    ) {
      return;
    }
    onSubmitRef.current?.({
      text: valueRef.current.trim(),
      mentions: mentionsRef.current,
    });
    if (valuePropRef.current === undefined) {
      setUncontrolledValue("");
      editor?.commands.setContent(plainTextToContent(""), {
        emitUpdate: false,
      });
    }
    if (mentionsPropRef.current === undefined) setUncontrolledMentions([]);
    setSuggestion(null);
  }, [editor]);

  submitRef.current = submit;

  useImperativeHandle(
    ref,
    () => ({
      focus: (options) => {
        editor?.view.dom.focus(options);
      },
    }),
    [editor],
  );

  useEffect(() => {
    if (!editor) return;
    const current = editorToPlainText(editor);
    if (current === value) return;
    editor.commands.setContent(plainTextToContent(value), {
      emitUpdate: false,
    });
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const accessibleName = label ?? placeholder ?? "Message";
    dom.setAttribute("aria-label", accessibleName);
    dom.setAttribute("aria-expanded", mentionOpen ? "true" : "false");
    if (mentionOpen) {
      dom.setAttribute("aria-controls", listId);
      const active = filteredItems[activeIndex];
      if (active) {
        dom.setAttribute("aria-activedescendant", `${listId}-${active.id}`);
      } else {
        dom.removeAttribute("aria-activedescendant");
      }
      return;
    }
    dom.removeAttribute("aria-controls");
    dom.removeAttribute("aria-activedescendant");
  }, [
    activeIndex,
    editor,
    filteredItems,
    label,
    listId,
    mentionOpen,
    placeholder,
  ]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  function selectMention(item: AiMentionItem<T>) {
    suggestion?.command(item);
  }

  return {
    editor,
    mentions,
    mentionOpen,
    filteredItems,
    activeIndex,
    listId,
    submitEnabled,
    disabled,
    loading,
    emptyMentionLabel,
    sendLabel,
    stopLabel,
    removeMentionLabel,
    formProps: {
      onSubmit: handleSubmit,
    },
    setActiveIndex,
    selectMention,
    removeMention,
    submit,
    onStop,
  };
}
