import type { EditorView } from "prosemirror-view";
import { useEffect, useState } from "react";
import { variableMenuKey } from "@/app/admin/prose/components/plugin/variable-menu";

interface Props {
  view?: EditorView;
  options: string[];
}

export const VariablePicker = ({ view, options }: Props) => {
  const [state, setState] = useState<{
    left: number;
    top: number;
    active?: boolean;
  }>({
    left: 0,
    top: 0,
  });
  useEffect(() => {
    if (!view) return;
    const update = () => {
      const state = variableMenuKey.getState(view.state);
      const { left, bottom } = view.coordsAtPos(view.state.selection.from);
      setState((prev) => ({
        ...prev,
        left,
        top: bottom,
        active: state?.active,
      }));
    };

    // 监听 view 的更新
    // 注意：如果你的 EditorView 是在 useEffect 里创建的，可以手动调用 update
    // 或者利用 view 内部的 dispatchTransaction 钩子
    const originalDispatch = view.dispatch;
    view.dispatch = (tr) => {
      originalDispatch.call(view, tr);
      update();
    };

    return () => {
      view.dispatch = originalDispatch;
    };
  }, [view]);

  if (!state.active) return null;

  const onSelect = (val: string) => {
    if (!view) return;
    const { tr } = view.state;

    // 事务操作：
    // 1. 删除输入的 { (位置是 state.pos 到 state.pos + 1)
    // 2. 插入选中的变量文字
    // 3. 关闭菜单（设置元数据）

    // 1. 创建带属性的节点
    const variableNode = view.state.schema.nodes["variable-node"].create({
      label: val,
    });
    const { from } = view.state.selection;
    const spaceNode = view.state.schema.text(" ");
    // 2. 使用 replaceWith 执行：从 pos 开始，到 pos + 2 结束（即删掉 {），替换为新节点
    const transaction = tr
      .replaceWith(from, from + 1, [variableNode, spaceNode])
      // 标记这是插件操作，防止被 apply 误杀
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
