function textLayerFor(node: Node) {
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;
  return element?.closest(".textLayer");
}

export function selectionRects(range: Range, bounds: DOMRect) {
  const nodes: Text[] = [];
  const ancestor = range.commonAncestorContainer;
  if (ancestor.nodeType === Node.TEXT_NODE) {
    nodes.push(ancestor as Text);
  } else {
    const walker = document.createTreeWalker(ancestor, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (textLayerFor(node) && range.intersectsNode(node)) {
        nodes.push(node as Text);
      }
      node = walker.nextNode();
    }
  }

  const rectangles = nodes.flatMap((node) => {
    const textRange = document.createRange();
    textRange.selectNodeContents(node);
    if (node === range.startContainer) {
      textRange.setStart(node, range.startOffset);
    }
    if (node === range.endContainer) {
      textRange.setEnd(node, range.endOffset);
    }
    return Array.from(textRange.getClientRects());
  });

  return rectangles.flatMap((rect) => {
    const left = Math.max(rect.left, bounds.left);
    const top = Math.max(rect.top, bounds.top);
    const right = Math.min(rect.right, bounds.right);
    const bottom = Math.min(rect.bottom, bounds.bottom);
    if (right <= left || bottom <= top) return [];
    return [
      {
        left: left - bounds.left,
        top: top - bounds.top,
        width: right - left,
        height: bottom - top,
      },
    ];
  });
}
