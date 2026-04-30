# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js 16 app using React 19, TypeScript, Tailwind CSS 4, Lingui, tRPC, and Mastra. Main app code lives in `src/`: routes in `src/app`, shared UI in `src/components`, stores in `src/store`, hooks in `src/hooks`, utilities/API helpers in `src/lib`, styles in `src/css`, and translations in `src/locales`. Static assets are in `public/`. Mastra code is in `mastra-server/`; the standalone Python agent service is in `agent-server/`. Database/config assets live in `db/`, and documentation is in `docs/`.

## Build, Test, and Development Commands

Use `ni` from `@antfu/ni` instead of invoking `pnpm` directly. `ni` detects the correct package manager from `packageManager` and lockfiles, then delegates to pnpm for this project. Run `npm list -g --depth=0` when you need to inspect globally installed tooling.

- `ni`: install dependencies, equivalent to `pnpm install` in this project.
- `nci`: perform a frozen clean install, equivalent to `pnpm install --frozen-lockfile`.
- `nr dev`: run the Next.js dev server on `http://localhost:3001`.
- `nr build`: create a production build.
- `nr start`: serve the production build on port `3001`.
- `nr check`: run Biome checks.
- `nr lint`: run `biome check --write` to lint, format, and organize imports.
- `nr format`: format supported files with Biome.
- `nr lingui:extract` / `nr lingui:compile`: update and compile i18n catalogs.
- `ni <pkg>` / `ni -D <pkg>`: add runtime or dev dependencies.
- `nun <pkg>`: remove dependencies.
- `nup`: update dependencies.
- `nlx <pkg>`: download and execute a package, replacing direct `pnpm dlx` usage.

Copy `.env.example` to `.env.local` before running locally.

## Dependency & Lockfile Workflow

Do not read or manually edit generated lockfiles such as `pnpm-lock.yaml`.
When dependencies are missing or need to be refreshed, use `ni` commands so the package manager updates install artifacts and lockfiles automatically. Do not run `pnpm` directly for routine install, script, update, remove, or dlx-style commands; use `ni`, `nr`, `nci`, `nup`, `nun`, or `nlx` instead.

## Coding Style & Naming Conventions

Biome is the source of truth for formatting and linting. It uses 2-space indentation, recommended React/Next rules, and automatic import organization. Prefer TypeScript for app code, `tsx` for React components, and kebab-case file names when matching existing patterns, for example `chat-mode-switcher.tsx`. Keep shared primitives in `src/components/ui`; feature-specific components should stay near their route in `_components`.

## Testing Guidelines

No JavaScript test runner is currently configured in `package.json`. For now, run `nr check` and `nr build` before submitting changes. If adding tests, colocate them near the module or use a clear `*.test.ts` / `*.test.tsx` naming pattern, and add the runner command to `package.json`. For the Python agent service, see `agent-server/README.md` and `agent-server/test.py`.

## Commit & Pull Request Guidelines

Recent commits use Conventional Commit prefixes such as `feat:`, `fix:`, `chore:`, and `refactor:`. Keep subjects short and imperative, for example `feat: add chat transcript export`. Pull requests should include a concise description, linked issue, screenshots or recordings for UI changes, environment notes, and verification commands.

## Architecture & Agent Notes

Read `docs/architecture.md` before changing routing, API, tRPC, Mastra, or stream behavior. See `docs/i18n.md` before editing localized copy. Stream chat, admin, Mastra, and Python agent details are documented in `src/lib/stream/README.md`, `src/app/admin/README.md`, `mastra-server/README.md`, and `agent-server/README.md`.

When asked to record changes, follow `.changelog/README.md`: use `.changelog/YYYYMMDD/index.md` and append a timestamped entry.
