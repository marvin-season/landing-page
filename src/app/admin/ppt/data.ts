export const SLIDES_DATA = [
    // 第一页：封面与重要性背景
    {
      version: "6.9.1",
      objects: [
        // 背景装饰色块
        {
          type: "Rect",
          left: 0,
          top: 0,
          width: 600,
          height: 60,
          fill: "#065f46", // 深绿色顶部栏
          selectable: false,
        },
        // 主标题
        {
          type: "IText",
          text: "低碳环保：守护我们的共同家园",
          left: 40,
          top: 15,
          fontSize: 28,
          fill: "#ffffff",
          fontWeight: "bold",
          fontFamily: "sans-serif",
        },
        // 核心观点标题
        {
          type: "IText",
          text: "为什么低碳环保迫在眉睫？",
          left: 40,
          top: 80,
          fontSize: 24,
          fill: "#047857",
          fontWeight: "bold",
        },
        // 正文内容 - 点位 1
        {
          type: "IText",
          text: "• 应对全球气候变暖：",
          left: 40,
          top: 130,
          fontSize: 20,
          fill: "#1f2937",
          fontWeight: "bold",
        },
        {
          type: "IText",
          text: "减少温室气体排放是抑制全球升温至 1.5°C 以内的关键，\n能有效减缓冰川融化与海平面上升。",
          left: 60,
          top: 160,
          fontSize: 16,
          fill: "#4b5563",
          lineHeight: 1.4,
        },
        // 正文内容 - 点位 2
        {
          type: "IText",
          text: "• 保护生物多样性：",
          left: 40,
          top: 220,
          fontSize: 20,
          fill: "#1f2937",
          fontWeight: "bold",
        },
        {
          type: "IText",
          text: "环境污染和气候剧变导致物种灭绝加速。低碳生活有助于\n恢复生态平衡，保护动植物栖息地。",
          left: 60,
          top: 250,
          fontSize: 16,
          fill: "#4b5563",
          lineHeight: 1.4,
        },
        // 底部修饰线条
        {
          type: "Rect",
          left: 40,
          top: 320,
          width: 520,
          height: 2,
          fill: "#10b981",
        },
      ],
    },
    // 第二页：核心策略与个人行动
    {
      version: "6.9.1",
      objects: [
        // 背景装饰色块
        {
          type: "Rect",
          left: 0,
          top: 0,
          width: 600,
          height: 60,
          fill: "#059669",
          selectable: false,
        },
        // 标题
        {
          type: "IText",
          text: "践行低碳生活：从意识到行动",
          left: 40,
          top: 15,
          fontSize: 28,
          fill: "#ffffff",
          fontWeight: "bold",
        },
        // 左侧内容栏：核心策略
        {
          type: "Rect",
          left: 40,
          top: 90,
          width: 250,
          height: 230,
          fill: "#f0fdf4",
          rx: 10,
          ry: 10, // 圆角矩形背景
        },
        {
          type: "IText",
          text: "【 核心策略 】",
          left: 60,
          top: 110,
          fontSize: 18,
          fill: "#065f46",
          fontWeight: "bold",
        },
        {
          type: "IText",
          text: "1. 能源转型：使用绿电\n2. 绿色出行：单车与公交\n3. 循环经济：减少浪费\n4. 植树造林：增加碳汇",
          left: 60,
          top: 150,
          fontSize: 16,
          fill: "#374151",
          lineHeight: 1.8,
        },
        // 右侧内容栏：行动倡议
        {
          type: "IText",
          text: "【 个人行动清单 】",
          left: 330,
          top: 110,
          fontSize: 18,
          fill: "#065f46",
          fontWeight: "bold",
        },
        {
          type: "IText",
          text: "• 随手关灯，节约一度电\n• 少用一次性塑料制品\n• 推广无纸化办公\n• 参与垃圾分类投放",
          left: 330,
          top: 150,
          fontSize: 16,
          fill: "#374151",
          lineHeight: 1.8,
        },
        // 底部总结语
        {
          type: "IText",
          text: "“ 我们不只是继承了祖先的地球，更是借用了子孙的地球。”",
          left: 0,
          top: 330,
          width: 600,
          textAlign: "center",
          fontSize: 14,
          fill: "#6b7280",
          fontStyle: "italic",
        },
      ],
    },
  ];