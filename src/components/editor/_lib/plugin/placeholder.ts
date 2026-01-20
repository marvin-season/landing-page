"use client";

import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

const placeholderPlugin = (text: string) => {
  return new Plugin({
    props: {
      decorations(state) {
        const { doc, selection } = state;

        // 1. 获取光标位置的“解析”对象 ($from)
        // $from 包含了光标所在位置的深度、父节点、偏移量等丰富信息
        const { $from } = selection;

        // 2. 只有当选区是“光标”（即没有选中一段文字，只是闪烁的竖线）时才处理
        if (!selection.empty) return DecorationSet.empty;

        // 3. 获取光标所在的当前块节点 (通常是 paragraph)
        const parent = $from.parent;

        // 4. 条件判断：
        // - 是文本块 (Textblock)
        // - 内容为空 (content.size === 0)
        // - 必须是顶层或你指定的块类型
        if (parent.isTextblock && parent.content.size === 0) {
          // 计算当前块的起始位置
          // $from.before() 返回当前块节点之前的坐标
          const pos = $from.before();

          const span = document.createElement("span");
          span.innerText = text;
          span.className = "placeholder";
          span.style.pointerEvents = "none";

          return DecorationSet.create(doc, [Decoration.widget(pos + 1, span)]);
        }

        return DecorationSet.empty;
      },
    },
  });
};

export default placeholderPlugin;
