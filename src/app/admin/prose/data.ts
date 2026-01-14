const initialJson = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [
        {
          type: "text",
          text: "Hello, world ",
        },
        {
          type: "my-button",
          content: [
            {
              type: "text",
              text: "Click me",
            },
          ],
        },
        {
          type: "text",
          text: "(From JSON)!",
          marks: [
            {
              type: "my-mark",
              attrs: {
                color: "blue",
              },
            },
          ],
        },
      ],
    },

    {
      type: "user-confirm",
      attrs: {
        userName: "张三",
        status: "pending",
      },
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "这段文字带有 ",
        },
        {
          type: "text",
          marks: [
            {
              type: "my-mark",
              attrs: {
                color: "blue",
              },
            },
          ],
          text: "自定义标记",
        },
        {
          type: "text",
          text: "hi",
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "variable-node",
          attrs: {
            label: "userName",
          },
        },
        {
          type: "text",
          text: " ",
        },
      ],
    },
  ],
};

export default initialJson;
