# Repository Guidelines

## Project Structure & Module Organization
- `index.html`: Injects Tailwind via CDN, sets font families/animations, and bootstraps the `#root` mount.
- `index.tsx`: React 19 entry that renders `App`.
- `App.tsx`: Top-level layout, mode switching, and Gemini chat orchestration (function-calling + grounding).
- `components/`: UI modules (`Chat`, `Reader`, `AudioPlayer`, `MuscleViz`, `Icons`), each in its own PascalCase file.
- `constants.ts`: Ebook metadata, chapter text, and mode configurations shared across views.
- `types.ts`: Reusable TypeScript types (`Message`, `Chapter`, `IntelligenceMode`).
- `vite.config.ts`: Vite + React plugin, `@` alias → project root, exposes env vars to `process.env`.

## Build, Test, and Development Commands
- `npm install` – install deps.
- `npm run dev` – Vite dev server on `0.0.0.0:3000`.
- `npm run build` – production bundle in `dist/`; also surfaces TS/type errors.
- `npm run preview` – serve the built app locally.
- Tip: set `GEMINI_API_KEY` before running chat/image flows; without it, Gemini calls fail fast.

## Environment & Configuration
- Create `.env` (or `.env.local`) at repo root with `GEMINI_API_KEY=<your key>`. Vite maps it to both `process.env.GEMINI_API_KEY` and `process.env.API_KEY`.
- The app relies on Google GenAI models (`gemini-2.5-flash`, `gemini-3-pro-preview`, `gemini-3-pro-image-preview`). Keep keys out of source control.
- Tailwind config lives in `index.html` (no PostCSS pipeline). Add utility classes there if you need new tokens/animations.

## Coding Style & Naming Conventions
- Language: TypeScript + React functional components and hooks; keep props typed via `types.ts`.
- Formatting: 2-space indent, single quotes, trailing semicolons; mirror existing JSX ordering (imports → constants → component).
- Components are PascalCase in `components/`; constants uppercase; modules use named exports where practical.
- Styling is utility-first via Tailwind classes defined inline; avoid standalone CSS unless necessary for global tokens.
- UX copy is in Spanish—maintain tone and terminology.

## Testing Guidelines
- No automated tests exist yet; minimum check is `npm run build` before PRs.
- Manual QA: run `npm run dev`, verify chat send/receive across all modes, image generation in Visionary, and responsive layout at mobile + desktop widths.
- If adding tests, prefer Vitest + React Testing Library colocated in `__tests__` or `*.test.tsx`.

## Commit & Pull Request Guidelines
- Use Conventional Commit prefixes seen in history (e.g., `feat: ...`, `chore: ...`); keep subjects short and imperative.
- PRs should include: brief summary, commands run, screenshots/GIFs for UI changes, and notes on new env vars or migration steps.
- Link related issues/tickets when applicable and call out any API or dependency changes explicitly.

## Security & Data Handling
- Never commit secrets; keep keys in `.env` and sanitize logs (avoid dumping Gemini responses that may include user text).
- Dependencies are pinned in `package.json`; add only necessary packages and run a build check after updates.
