const initialJson = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Introduction: ",
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
          type: "text",
          text: "Hello, world! My name is",
        },
        {
          type: "variable-node",
          attrs: {
            label: "userName",
          }
        },
        {
          type: "text",
          text: "I'm a software engineer. I'm from",
        },
        {
          type: "variable-node",
          attrs: {
            label: "city",
          }
        }
      ],
      
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
