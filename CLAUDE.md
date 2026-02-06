# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Project Overview

NGX Library - El Músculo is an interactive AI-powered eBook experience with:
- Conversational tutor (LOGOS) in multiple modes.
- Secure server-side AI calls via Supabase Edge Functions.
- Shared credit wallet model (with demo limits and image quotas).
- Reader UI with 3D muscle visualization and narrated audio.

## Stack

- React 19 + TypeScript
- Vite
- Three.js
- Supabase (Postgres + Edge Functions)

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Environment

Frontend (`.env.local`):

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Backend secrets (Supabase):
- `GEMINI_API_KEY`
- model overrides as needed (`GEMINI_TEXT_MODEL_DEFAULT`, etc.)

## Architecture Notes

- Frontend does not call Gemini directly.
- All AI requests are proxied through Supabase functions:
  - `ai-chat`
  - `ai-image`
  - `ai-audio`
  - `credits-balance`
- Credit metering, idempotency, and limits are persisted in Postgres.
- Schema and policies live in `supabase/migrations/`.
