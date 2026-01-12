import { Plugin, PluginKey } from "prosemirror-state";
import { logger } from "@/lib/logger";

export const varMenuKey = new PluginKey("variable-menu");

export const variablePlugin = () => {
  return new Plugin({
    key: varMenuKey,
    state: {
      init() {
        logger("init");
        return { active: false, pos: 0 };
      },
      apply(tr, value) {
        logger("apply", tr, value);
        // 【关键修正】只有当文档内容真正变化（非当前插件操作）或选区移动时，才关闭菜单
        const meta = tr.getMeta(varMenuKey);
        if (meta !== undefined) return meta;

        // 如果用户移动了光标或输入了其他字符（且不是通过元数据更新的），则关闭
        if (tr.selectionSet || tr.docChanged) {
          return { active: false, pos: 0 };
        }
        return value;
      },
    },
    props: {
      handleKeyDown(view, event) {
        logger("handleKeyDown", view, event);
        // 检测 { 键
        if (event.key === "{" && !event.shiftKey === false) {
          const { from } = view.state.selection;
          // 立即更新状态，记录位置（此时 { 即将输入到 from 位置）
          // 我们记录 from + 1，因为按下后字符会占 1 个位置
          setTimeout(() => {
            const tr = view.state.tr.setMeta(varMenuKey, {
              active: true,
              pos: from,
            });
            view.dispatch(tr);
          }, 10);
        }
        return false;
      },
    },
  });
};
