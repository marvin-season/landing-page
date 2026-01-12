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
            type: "text",
            text: "(From JSON)!",
            marks: [
              {
                type: "my-mark",
                attrs: {
                  color: "red",
                },
              },
            ],
          },
        ],
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
            text: "。",
          },
        ],
      },
    ],
  };

  export default initialJson