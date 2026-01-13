import {
  PaletteIcon,
  SquarePenIcon,
  TextIcon,
  UserCheckIcon,
  VariableIcon,
} from "lucide-react";
import type { EditorView } from "prosemirror-view";
import { insertNode, insertText, toggleMark } from "./tr-command";

export function ProseMirrorCommands({ view }: { view: EditorView }) {
  const commands = [
    {
      label: "Insert Text",
      icon: <TextIcon size={12} />,
      onClick: () => insertText(view, "Hello, world!"),
    },
    {
      label: "Insert Variable",
      icon: <VariableIcon size={12} />,
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
      icon: <SquarePenIcon size={12} />,
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
      icon: <UserCheckIcon size={12} />,
      onClick: () =>
        insertNode(
          view,
          view.state.schema.nodes["user-confirm"].create({
            label: "Click me",
          }),
        ),
    },
    {
      icon: <PaletteIcon size={12} />,
      label: "Mark as Red",
      onClick: () => toggleMark(view, "red"),
    },
  ];
  return (
    <div className="flex gap-2">
      {commands.map((command) => (
        <div key={command.label} onClick={command.onClick}>
          {command.icon}
        </div>
      ))}
    </div>
  );
}
