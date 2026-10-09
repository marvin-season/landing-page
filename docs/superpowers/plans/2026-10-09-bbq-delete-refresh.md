# BBQ Dish Delete and Menu Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Delete individual dishes safely and refresh cached order pages after menu changes.

**Architecture:** Add `deleteDish` through the pure document/store/IndexedDB layers while leaving order snapshots untouched. Use a route-local browser event to notify cached order editors to reload categories and dishes after menu saves or deletes.

**Tech Stack:** TypeScript, React 19, Next.js 16, Dexie, node:test.

## Constraints

- Do not delete categories or historical order lines.
- Confirm dish deletion with `删除这个菜品？`.
- Do not commit, build, or modify unrelated files.

### Task 1: Domain deletion

- [ ] Add failing tests proving deletion removes the dish, preserves historical lines, rejects future ordering, and rejects unknown IDs.
- [ ] Add `deleteDish(document, id)` and `BbqStore.deleteDish(id)`.
- [ ] Add Dexie deletion after pure validation.
- [ ] Run `node --import tsx --test src/lib/bbq/document.test.ts`.

### Task 2: Menu event and delete UI

- [ ] Add a shared route-local event name/helper.
- [ ] Dispatch the event after category/dish saves and dish deletion.
- [ ] Add an existing-row delete button and confirmation; blank rows have no delete action.
- [ ] Make `OrderEditor` reload categories/dishes when the event fires.

### Task 3: Verification

- [ ] Run `node --import tsx --test src/lib/bbq/*.test.ts`.
- [ ] Run `nr check`.
- [ ] Run `./node_modules/.bin/tsc --noEmit`.
- [ ] Check IDE diagnostics for edited files.
