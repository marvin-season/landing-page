'use client';

import {  useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { UnifiedMarkdown } from './index';

const c = `
# About This Project

Welcome to **MyAI Portal** 


\`\`\`javascript
const a = 1;
console.log(a);
\`\`\`

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

export default function Demo() {
  const [content, setContent] = useState<string>('');
  const interval = useRef<any>(null);


  const handleStart = () => {
    let i = 0;
    interval.current = setInterval(() => {
      const char = c.at(i);
      if (char) {
        setContent((prev) => prev + char);
      } else {
        clearInterval(interval.current);
      }
      i += 1;
    }, 40);

  };

  const handleReset = () => {
    clearInterval(interval.current);
      setContent(c);
  };

  return (
    <div className="">
      <div className="flex gap-4">
        <Button onClick={handleStart}>Start</Button>
        <Button onClick={handleReset}>Reset</Button>
      </div>
      <UnifiedMarkdown className="flex-1" content={content} />
    </div>
  );
}
