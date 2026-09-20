import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";

export const mentionSuggestionPluginKey = new PluginKey("aiInputMention");

export type MentionSuggestionOptions = {
  suggestion: Partial<Omit<SuggestionOptions<unknown, unknown>, "editor">>;
};

export const MentionSuggestion = Extension.create<MentionSuggestionOptions>({
  name: "mentionSuggestion",

  addOptions() {
    return {
      suggestion: {
        char: "@",
        pluginKey: mentionSuggestionPluginKey,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).run();
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
