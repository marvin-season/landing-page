import type { EditorView } from "prosemirror-view";
import { useEffect, useState } from "react";
import { variableMenuKey } from "@/app/prose/_lib/plugin/variable-menu";

// 扩展 DirectEditorProps 类型，添加 active 属性
declare module "prosemirror-view" {
  interface DirectEditorProps {
    /**
     * 是否显示变量菜单
     */
    active?: boolean;
  }
}

interface Props {
  view?: EditorView;
  options: string[];
}

interface MenuState {
  left: number;
  top: number;
  active?: boolean;
}

export const VariablePicker = ({ view, options }: Props) => {
  const [state, setState] = useState<MenuState>({
    left: 0,
    top: 0,
    active: false,
  });

  useEffect(() => {
    if (!view) return;

    // 更新菜单状态和位置
    const updateMenu = (active: boolean) => {
      if (!active) {
        setState((prev) => (prev.active ? { ...prev, active: false } : prev));
        return;
      }

      try {
        const { left, bottom } = view.coordsAtPos(view.state.selection.from);
        setState({
          left,
          top: bottom,
          active: true,
        });
      } catch {
        // 如果坐标计算失败，关闭菜单
        setState((prev) => ({ ...prev, active: false }));
      }
    };

    // 初始检查
    updateMenu(view.props.active ?? false);

    // 监听 props 变化：使用 setProps 方式更高效
    // 因为 setProps 只更新 props，不会创建 Transaction 或更新 EditorState
    // 性能优势：
    // 1. 不需要创建 Transaction（避免状态管理开销）
    // 2. 不需要经过 Plugin 的 apply 流程（避免插件处理开销）
    // 3. 不会触发不必要的编辑器重新渲染
    // 4. 直接更新 props，然后通过 update 方法通知，开销最小
    const originalUpdate = view.update;
    view.update = function (props) {
      originalUpdate.call(this, props);
      // 当 props.active 变化时更新菜单
      if (props.active !== undefined) {
        updateMenu(props.active);
      }
    };

    return () => {
      view.update = originalUpdate;
    };
  }, [view]);

  if (!state.active) return null;

  const onSelect = (val: string) => {
    if (!view) return;
    const { tr } = view.state;

    const { $from } = view.state.selection;
    const index = $from.index();
    if (
      !$from.parent.canReplaceWith(
        index,
        index + 1,
        view.state.schema.nodes["variable-node"],
      )
    )
      return;

    // 1. 创建带属性的节点
    const variableNode = view.state.schema.nodes["variable-node"].create({
      label: val,
    });
    const transaction = tr
      .replaceWith($from.pos - 1, $from.pos, variableNode)
      .setMeta(variableMenuKey, { active: false, pos: 0 });

    view.dispatch(transaction);
    view.focus(); // 让编辑器重新获得焦点

    view.setProps({ active: false });
  };

  return (
    <div
      className="fixed z-999 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg py-1 min-w-[120px] max-h-[200px] overflow-y-auto"
      style={{
        left: `${state?.left}px`,
        top: `${state?.top + 5}px`,
      }}
    >
      {options.map((opt) => (
        <div
          key={opt}
          className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-500 hover:text-white cursor-pointer transition-colors duration-150 rounded-sm mx-1"
          onClick={() => onSelect(opt)}
        >
          {opt}
        </div>
      ))}
    </div>
  );
};
