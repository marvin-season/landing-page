"use client";

import { Plugin, PluginKey } from "prosemirror-state";
import { logger } from "@/lib/logger";

export const variableMenuKey = new PluginKey("variable-menu");

export const variablePlugin = () => {
  return new Plugin({
    key: variableMenuKey,
    // state: {
    //   init() {
    //     logger("init");
    //     return { active: false };
    //   },
    //   apply(tr, value) {
    //     logger("apply");
    //     // 【关键修正】只有当文档内容真正变化（非当前插件操作）或选区移动时，才关闭菜单
    //     const meta = tr.getMeta(variableMenuKey);
    //     if (meta !== undefined) return meta;

    //     // 如果用户移动了光标或输入了其他字符（且不是通过元数据更新的），则关闭
    //     if (tr.selectionSet || tr.docChanged) {
    //       return { active: false };
    //     }
    //     return value;
    //   },
    // },
    props: {
      handleKeyDown(view, event) {
        logger("handleKeyDown");

        // 检测 { 键（Shift + [ 或直接输入 {）
        if (event.key === "{" || (event.key === "[" && event.shiftKey)) {
          // const tr = view.state.tr.setMeta(variableMenuKey, {
          //   active: true,
          // });
          // view.dispatch(tr);
          // 使用 setProps 方式更高效：
          // 1. 不需要创建 Transaction，避免状态管理开销
          // 2. 不需要经过 Plugin 的 apply 流程，避免插件处理开销
          // 3. 不会触发不必要的编辑器重新渲染
          // 4. 直接更新 props，性能最优
          setTimeout(() => {
            view.setProps({
              active: true,
            });
          }, 10);
        }
        return false;
      },
    },
  });
};
