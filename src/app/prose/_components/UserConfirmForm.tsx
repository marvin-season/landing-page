import { useEffect, useState } from "react";
import type { NodeViewProps } from "@/app/prose/_components/NodeViewPortal";

/**
 * 用户确认表单组件
 * 用于在编辑器中显示和编辑用户确认信息
 */
const UserConfirmForm: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
}) => {
  const [userName, setUserName] = useState(node.attrs.userName || "");

  // 当节点属性更新时同步状态
  useEffect(() => {
    setUserName(node.attrs.userName || "");
  }, [node.attrs.userName]);

  const handleUserNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserName(value);
    updateAttributes({ userName: value });
  };

  return (
    <div className="flex flex-col gap-2 border p-2 rounded-md">
      <label htmlFor={`userName-${node.attrs.id}`} className="text-sm">
        确认用户: <span className="text-gray-500">{node.attrs.status}</span>
      </label>
      <input
        id={`userName-${node.attrs.id}`}
        type="text"
        value={userName}
        onChange={handleUserNameChange}
        className="px-2 py-1 border rounded"
        placeholder="请输入用户名"
      />
    </div>
  );
};

export default UserConfirmForm;
