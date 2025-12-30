'use client';

import {  useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { UnifiedMarkdown } from './index';

const longContent = `
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



😊
`;

const shortContent = `
Welcome to 😊 **MyAI Portal** 

I'm a chatbot that can answer your questions and help you with your tasks. 😊
`;

export default function Demo() {
  const [content, setContent] = useState<string>('');
  const interval = useRef<any>(null);
  const [hasNextChunk, setHasNextChunk] = useState(false);
  const [useLongContent, setUseLongContent] = useState(false);

  const handleStart = () => {
    let i = 0;
    setHasNextChunk(true);
    const c = useLongContent ? longContent : shortContent;
    interval.current = setInterval(() => {
      if(i >= c.length) {
        setHasNextChunk(false);
        clearInterval(interval.current);
        return;
      }
      const char = c.at(i);
      setContent((prev) => prev + char);
      i += 1;
    }, 40);

  };

  const handleReset = () => {
    clearInterval(interval.current);
    setContent("");
  };

  return (
    <div className="">
      <div className="flex gap-4">
        <Button onClick={handleStart}>Start</Button>
        <Button onClick={handleReset}>Reset</Button>
        <Button variant={'secondary'} onClick={() => setUseLongContent(!useLongContent)}>Switch {useLongContent ? 'short' : 'long'}</Button>
      </div>
      <UnifiedMarkdown className="flex-1" content={content} hasNextChunk={hasNextChunk}/>
    </div>
  );
}
