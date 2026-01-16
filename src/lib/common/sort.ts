interface Model {
    name: string;
  }
  
  const models: Model[] = [
    { name: "deepseek-chat" },
    { name: "deepseek-reasoner" },
    { name: "deepseek-r1" },
    { name: "deepseek-r1-distill-qwen-32b" },
    { name: "deepseek-r1-distill-qwen-14b" }
  ];
  
  // 定义你想要的顺序
  const myOrder: string[] = [
    "deepseek-r1-distill-qwen-14b",
    "deepseek-r1-distill-qwen-32b",
    "deepseek-reasoner",
  ];
  /**
 * 创建一个自定义排序器
 * @param preferredOrder 期望的顺序数组
 * @param key 要排序的对象属性名
 */
function createCustomSorter<T, K extends keyof T>(
    preferredOrder: T[K][],
    key: K
  ) {
    // 建立映射表提升性能
    const orderMap = new Map<T[K], number>();
    preferredOrder.forEach((value, index) => {
      orderMap.set(value, index);
    });
  
    // 返回符合 Array.sort 规范的比较函数
    return (a: T, b: T): number => {
      const valA = a[key];
      const valB = b[key];
  
      // 如果不在定义列表中，权重设为无穷大（排在最后）
      const orderA = orderMap.has(valA) ? orderMap.get(valA)! : Number.POSITIVE_INFINITY;
      const orderB = orderMap.has(valB) ? orderMap.get(valB)! : Number.POSITIVE_INFINITY;
  
      if (orderA !== orderB) {
        return orderA - orderB;
      }
  
      // 如果权重相同（或都不在列表中），则按原值字母顺序排序
      return String(valA).localeCompare(String(valB));
    };
  }
  // 使用泛型工具进行排序
  const sorter = createCustomSorter<Model, "name">(myOrder, "name");
  const result = [...models].toSorted(sorter);
  
  console.log("排序结果：", result);