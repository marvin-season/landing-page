# Landing Page

## Stack

- ✅ [Next.js](https://nextjs.org/) 16.1 for routing and server-side rendering
- ✅ [Tailwind CSS](https://tailwindcss.com/) 4 for styling
- ✅ [Shadcn UI](https://ui.shadcn.com/) 3 for components
- ✅ [React](https://react.dev/) 19.2 for UI
- ✅ [TypeScript](https://www.typescriptlang.org/) 5 for type safety
- ✅ [Biome](https://biomejs.dev/) for linting and formatting
- ✅ [Lingui](https://lingui.dev/) for i18n and internationalization [i18n support](./src/locales/README.md)
- ✅ [TRPC](https://trpc.io/) for API and data fetching
- ✅ [React Query](https://tanstack.com/query/latest) for data fetching
- ✅ [Mastra](https://mastra.ai/) for agent management [./mastra-server/README.md](./mastra-server/README.md)
- ✅ [Agno](https://agno.ai/) for agent management [./agent/README.md](./agent/README.md)
- ✅ [RXJS](https://rxjs.dev/) for reactive programming
- ✅ [Zustand](https://zustand-demo.pmnd.rs/) for state management
- ✅ [`@antfu/ni@25.0.0`](https://github.com/antfu/ni) & `corepack enable` for package manager

## Quick Start
environment variables
```bash
cp .env.example .env.local
```

install dependencies
```bash
nvm use v22.16.0 && corepack enable && npm install -g @antfu/ni@25.0.0 && ni
```

or run directly
```bash
pnpm install && pnpm dev
```

then start the server at [http://localhost:3001](http://localhost:3001)
```bash
nr
```