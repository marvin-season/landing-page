import type { EditorView } from "prosemirror-view";
import { useEffect, useState } from "react";
import { variableMenuKey } from "@/app/prose/plugin/variable-menu";

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

    const update = () => {
      const pluginState = variableMenuKey.getState(view.state);
      if (!pluginState?.active) {
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

    // 初始更新
    update();

    // 使用更高效的方式：通过 Plugin 的 update 钩子来监听状态变化
    // 创建一个自定义的更新机制，在每次事务后检查状态
    let rafId: number | null = null;
    let lastState = view.state;

    const scheduleUpdate = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        if (view.state !== lastState) {
          lastState = view.state;
          update();
        }
        rafId = null;
      });
    };

    // 监听视图更新
    const originalUpdate = view.update;
    view.update = function (state) {
      originalUpdate.call(this, state);
      scheduleUpdate();
    };

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
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
