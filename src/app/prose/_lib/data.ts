const initialJson = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Hello, world!",
        },
      ],
    },
    {
      type: "user-confirm",
      attrs: {
        id: "111",
        status: "pending",
        userName: "Lisa",
      },
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Hello, world!",
        },
      ],
    },
    {
      type: "user-confirm",
      attrs: {
        id: "222",
        status: "pending",
        userName: "Lisa",
      },
    },
  ],
};
const initialHtml = `
<p>Hello, world!</p><div class="user-confirm" contenteditable="false" data-user-confirm="true" data-id="" data-status="pending" data-user-name="Guestass"></div><p>Hello, world!</p><div class="user-confirm" contenteditable="false" data-user-confirm="true" data-id="" data-status="pending" data-user-name="Guesta"></div>
`;
export  {
  initialJson,
  initialHtml,
};
