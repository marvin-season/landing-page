import type React from "react";
import type { NodeViewProps } from "@/app/admin/prose/components/NodeViewPortal";

// 你的 React 表单组件
const UserConfirmForm: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
}) => {
  return (
    <div
      style={{
        border: "1px solid #007bff",
        padding: "2px 8px",
        borderRadius: "4px",
        background: "#f0f7ff",
        display: "flex",
        gap: "8px",
      }}
    >
      <span style={{ fontSize: "12px" }}>确认用户: {node.attrs.name}</span>
      <input
        type="text"
        style={{ width: "80px", border: "1px solid #ccc" }}
        onChange={(e) => updateAttributes({ name: e.target.value })}
      />
      <button onClick={() => alert("提交成功")}>OK</button>
    </div>
  );
};

export default UserConfirmForm;
