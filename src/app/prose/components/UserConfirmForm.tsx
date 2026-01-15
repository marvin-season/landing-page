import type React from "react";
import type { NodeViewProps } from "@/app/prose/components/NodeViewPortal";

// 你的 React 表单组件
const UserConfirmForm: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
}) => {
  return (
    <div className="flex flex-col gap-2 border p-2 rounded-md ">
      <label htmlFor="userName" className="text-sm">
        确认用户: <span className="text-gray-500">{node.attrs.status}</span>
      </label>
      <input
        id="userName"
        type="text"
        defaultValue={node.attrs.userName}
        onBlur={(e) => updateAttributes({ userName: e.target.value })}
      />
    </div>
  );
};

export default UserConfirmForm;
