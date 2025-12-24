"use client";

import { useEffect, useState } from "react";
import { UnifiedMarkdown } from "@/components/ui";
import Markdown from "@/components/ui/markdown";

const c = `
# About This Project

Welcome to **MyAI Portal** 

---

## 🚀 Features

- **Markdown Rendering** with support for tables, math formulas, and syntax highlighting.
- **Next.js 14** + **React 19** + **TypeScript** for modern web development.
- **Tailwind CSS** & **shadcn/ui** for elegant interfaces.
- **Internationalization**: Easily switch languages.

---

> “The best software is built by a community.”

Check out the [GitHub repo](https://github.com/myaiportal/myai) and join us!

- [x] Markdown parsing
- [ ] AI-powered chat
---

## 📚 Example Table

| Name         | Role          | Active |
| ------------ | ------------- | ------ |
| Alice        | Frontend      | ✅     |
| Bob          | Backend       | ✅     |
| Charlie      | DevOps        | ❌     |

---

## 🧮 Math Support

Inline math like $E=mc^2$ and block math:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$



`;

export function About() {
  const [content, setContent] = useState<string>("");
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      const char = c.at(i);
      if (char) {
        setContent((prev) => prev + char);
      } else {
        clearInterval(interval);
      }
      i += 1;
    }, 40);
    return () => {
      clearInterval(interval);
      setContent(c);
    };
  }, []);
  return (
    <div className="flex gap-4">
      <UnifiedMarkdown className="flex-1" content={content} />
      <Markdown className="flex-1" content={content} />
    </div>
  );
}
