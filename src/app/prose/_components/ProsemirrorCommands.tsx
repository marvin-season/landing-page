import {
  FileCodeIcon,
  FileJson2Icon,
  PaletteIcon,
  SquarePenIcon,
  TextIcon,
  UserCheckIcon,
  VariableIcon,
} from "lucide-react";
import { DOMSerializer } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";
import { memo, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  insertNode,
  insertText,
  toggleMark,
} from "../_lib/commands/tr-command";
import { ProseSettings } from "./ProseSetting";

const ICON_SIZE = 16;

interface Command {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

export function ProseMirrorCommands({ view }: { view: EditorView }) {
  const commands: Command[] = useMemo(() => {
    // 将文档序列化为 HTML
    const exportToHTML = () => {
      const serializer = DOMSerializer.fromSchema(view.state.schema);
      const fragment = serializer.serializeFragment(view.state.doc.content);
      const html = Array.from(fragment.children)
        .map((node) => (node as HTMLElement).outerHTML)
        .join("");
      return html;
    };

    return [
      {
        label: "Export To HTML",
        icon: <FileCodeIcon size={ICON_SIZE} />,
        onClick: () => {
          const html = exportToHTML();
          console.log("HTML 内容:");
          console.log(html);
          // 同时复制到剪贴板
          navigator.clipboard
            .writeText(html)
            .then(() => {
              console.log("✅ HTML 已复制到剪贴板");
            })
            .catch((err) => {
              console.error("❌ 复制失败:", err);
            });
        },
      },

      {
        label: "Export To JSON",
        icon: <FileJson2Icon size={ICON_SIZE} />,
        onClick: () => {
          const json = view.state.doc.toJSON();
          console.log(JSON.stringify(json, null, 2));
        },
      },
      {
        label: "Insert Text",
        icon: <TextIcon size={ICON_SIZE} />,
        onClick: () => insertText(view, "Hello, world!"),
      },
      {
        label: "Insert Variable",
        icon: <VariableIcon size={ICON_SIZE} />,
        onClick: () =>
          insertNode(
            view,
            view.state.schema.nodes["variable-node"].create({
              label: "userName",
            }),
          ),
      },
      {
        label: "Insert Button",
        icon: <SquarePenIcon size={ICON_SIZE} />,
        onClick: () =>
          insertNode(
            view,
            view.state.schema.nodes["my-button"].create(
              {
                color: "red",
              },
              view.state.schema.text("button"),
            ),
          ),
      },
      {
        label: "Insert User Confirm",
        icon: <UserCheckIcon size={ICON_SIZE} />,
        onClick: () => {
          const id = `confirm-${Date.now()}`;
          insertNode(
            view,
            view.state.schema.nodes["user-confirm"].create({
              id,
              status: "pending",
              userName: "Guest",
            }),
          );
        },
      },
      {
        label: "Mark as Red",
        icon: <PaletteIcon size={ICON_SIZE} />,
        onClick: () => toggleMark(view, "red"),
      },
    ];
  }, [view]);

  return (
    <div className="flex gap-2 p-2 border-b">
      {commands.map((command) => (
        <CommandButton key={command.label} command={command} />
      ))}
      <ProseSettings />
    </div>
  );
}

const CommandButton = memo(
  function CommandButton(props: { command: Command }) {
    const { command } = props;
    return (
      <Button
        key={command.label}
        variant="ghost"
        size="icon"
        onClick={command.onClick}
        title={command.label}
        className="h-8 w-8"
      >
        {command.icon}
      </Button>
    );
  },
  (prev, next) => prev.command === next.command,
);
