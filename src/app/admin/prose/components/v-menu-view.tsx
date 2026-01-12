import type { EditorView } from "prosemirror-view";
import { useEffect, useState } from "react";
import { varMenuKey } from "@/app/admin/prose/components/plugin/v-menu";

interface Props {
  view: EditorView | null;
  options: string[];
}

export const VariablePicker = ({ view, options }: Props) => {
  const [state, setState] = useState({
    active: false,
    left: 0,
    top: 0,
    pos: 0,
  });

  useEffect(() => {
    if (!view) return;

    // 每一轮 Transaction 完成后，检查插件状态
    const update = () => {
      const pluginState = varMenuKey.getState(view.state);
      if (pluginState?.active) {
        // 【关键】将文档位置转换为屏幕像素坐标
        const coords = view.coordsAtPos(pluginState.pos);
        setState({
          active: true,
          left: coords.left,
          top: coords.bottom,
          pos: pluginState.pos,
        });
      } else {
        setState((s) => (s.active ? { ...s, active: false } : s));
      }
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
    const transaction = tr
      .delete(state.pos, state.pos + 1)
      .insertText(`{{${val}}}`)
      .setMeta(varMenuKey, { active: false, pos: 0 });

    view.dispatch(transaction);
    view.focus(); // 让编辑器重新获得焦点
  };

  return (
    <div
      className="fixed z-999 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg py-1 min-w-[120px] max-h-[200px] overflow-y-auto"
      style={{
        left: `${state.left}px`,
        top: `${state.top + 5}px`,
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
