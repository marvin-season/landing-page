# Landing Page

## Stack

- ✅ [Next.js](https://nextjs.org/) 16.1 for routing and server-side rendering
- ✅ [Tailwind CSS](https://tailwindcss.com/) 4 for styling
- ✅ [Shadcn UI](https://ui.shadcn.com/) 3 for components
- ✅ [React](https://react.dev/) 19.2 for UI
- ✅ [TypeScript](https://www.typescriptlang.org/) 5 for type safety
- ✅ [Biome](https://biomejs.dev/) for linting and formatting
- ✅ [Lingui](https://lingui.dev/) for i18n and internationalization
- ✅ [TRPC](https://trpc.io/) for API and data fetching
- ✅ [Zustand](https://zustand-demo.pmnd.rs/) for state management
- ✅ [`@antfu/ni@25.0.0`](https://github.com/antfu/ni) & `corepack enable` for package manager

## Example

## i18n 

i18n code example:

```tsx
import { Trans } from "@lingui/react/macro";

<Trans>Hello, world!</Trans>
```
extract i18n messages:

```bash
nr lingui:extract
```
manage i18n messages:
```js
// @src/locales/xx.po
msgid "Hello, world!"
msgstr "你好，世界！"
```

for production, compile i18n messages:
```bash
nr lingui:compile
```