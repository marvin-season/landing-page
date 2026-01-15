import {
  FileJson2Icon,
  PaletteIcon,
  SquarePenIcon,
  TextIcon,
  UserCheckIcon,
  VariableIcon,
} from "lucide-react";
import type { EditorView } from "prosemirror-view";
import { insertNode, insertText, toggleMark } from "./tr-command";

const size = 14;

export function ProseMirrorCommands({ view }: { view: EditorView }) {
  const commands = [
    {
      label: "Export To JSON",
      icon: <FileJson2Icon size={size} />,
      onClick: () => {
        const json = view.state.doc.toJSON();
        console.log(json);
      },
    },
    {
      label: "Insert Text",
      icon: <TextIcon size={size} />,
      onClick: () => insertText(view, "Hello, world!"),
    },
    {
      label: "Insert Variable",
      icon: <VariableIcon size={size} />,
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
      icon: <SquarePenIcon size={size} />,
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
      icon: <UserCheckIcon size={size} />,
      onClick: () => {
        insertNode(
          view,
          view.state.schema.nodes["user-confirm"].create({
            label: "Click me",
            id: "111",
          }),
        );
      },
    },
    {
      icon: <PaletteIcon size={size} />,
      label: "Mark as Red",
      onClick: () => toggleMark(view, "red"),
    },
  ];
  return (
    <div className="flex gap-2">
      {commands.map((command) => (
        <div
          key={command.label}
          onClick={command.onClick}
          className="cursor-pointer p-2 hover:text-blue-500"
        >
          {command.icon}
        </div>
      ))}
    </div>
  );
}
