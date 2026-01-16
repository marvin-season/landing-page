import type { NodeViewConstructor } from "prosemirror-view";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type NodeViewConstructorParams = Parameters<NodeViewConstructor>;

// 定义传递给 React 组件的 Props 接口
export interface NodeViewProps {
  node: NodeViewConstructorParams[0];
  view: NodeViewConstructorParams[1];
  getPos: NodeViewConstructorParams[2];
  updateAttributes: (attrs: Record<string, any>) => void;
}

// Portal 管理器的工厂函数返回类型
export interface IPMPortalProvider {
  addPortal: (
    Component: React.ComponentType<NodeViewProps>,
    props: NodeViewProps,
    container: HTMLElement,
  ) => void;
  removePortal: (container: HTMLElement) => void;
  PortalRenderer: React.ComponentType;
}

export const useNodeViewFactory = (): IPMPortalProvider => {
  const [portals, setPortals] = useState<
    Map<
      HTMLElement,
      { Component: React.ComponentType<NodeViewProps>; props: NodeViewProps }
    >
  >(new Map());

  const removePortal = useCallback((container: HTMLElement) => {
    setPortals((prev) => {
      const next = new Map(prev);
      next.delete(container);
      return next;
    });
  }, []);

  const addPortal = useCallback(
    (
      Component: React.ComponentType<NodeViewProps>,
      props: NodeViewProps,
      container: HTMLElement,
    ) => {
      setPortals((prev) => {
        const next = new Map(prev);
        next.set(container, { Component, props });
        return next;
      });
    },
    [],
  );

  const PortalRenderer = useMemo(() => {
    return () => (
      <>
        {[...portals.entries()].map(([container, { Component, props }]) => {
          const id = container.getAttribute("data-id") || container.outerHTML;
          return createPortal(<Component key={id} {...props} />, container);
        })}
      </>
    );
  }, [portals]);

  return { addPortal, removePortal, PortalRenderer };
};
