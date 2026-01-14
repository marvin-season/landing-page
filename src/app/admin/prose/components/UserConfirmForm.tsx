import type React from "react";
import type { NodeViewProps } from "@/app/admin/prose/components/NodeViewPortal";

// 你的 React 表单组件
const UserConfirmForm: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
}) => {
  console.log("node", node);
  return (
    <div className="flex gap-2 border p-2 rounded-md">
      <label>确认用户: </label>
      <input
        type="text"
        defaultValue={node.attrs.userName}
        onChange={(e) => updateAttributes({ userName: e.target.value })}
      />
      <button onClick={() => updateAttributes({ status: "confirmed" })}>
        {node.attrs.status === "confirmed" ? "已确认" : "确认"}
      </button>
    </div>
  );
};

export default UserConfirmForm;
