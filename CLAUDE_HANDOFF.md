# Claude Handoff (Current Project State)

Last updated: 2026-05-06
Project: RepurposePro (`/app`)

## Purpose
- This file is a compact context handoff so an AI assistant can understand what is already built without scanning the whole repo.

## Stack
- Frontend: React + Vite + React Router + GSAP.
- Backend: Express (ESM), Supabase (auth + DB), Anthropic/OpenAI providers, Paddle billing.

## What Is Implemented
- Google OAuth auth flow with Supabase on frontend and bearer token auth on backend.
- Content generation endpoint with:
  - Input validation (text or supported social links).
  - Per-user in-memory rate limiting (1 request / 8s).
  - Free tier limit enforcement (`FREE_LIMIT = 2`).
  - AI timeout protection (`GENERATION_TIMEOUT_MS`, default 75s).
  - Generation persistence to `generations` table.
  - Usage count increment after successful generation.
- AI generation library supports:
  - Provider switch via `AI_PROVIDER` (`anthropic` default, `openai` optional).
  - Strong prompt constraints for TikTok/thread/LinkedIn structured JSON output.
  - JSON extraction from noisy model responses.
  - Output normalization and fallback values.
  - Quality checks (template leakage, filler phrases, weak hooks, duplicate lines, too-short scripts).
  - Auto-retry on low-quality output (`AI_RETRY_ON_LOW_QUALITY`, default enabled).
  - Mock output fallback when provider API key is missing.
- History feature:
  - Get recent generations (latest 10).
  - Delete a generation owned by current user.
- Saved items feature:
  - Save output items (`saved_items` table).
  - List saved items.
  - Unsave item.
- Billing (Paddle):
  - Create checkout transaction.
  - Webhook signature validation (when secret configured).
  - Plan upgrades/downgrades based on subscription events.
  - User resolution fallback by `custom_data.user_id`, transaction custom data, then email lookup.
- Account management:
  - Account deletion endpoint using Supabase admin API.

## Backend API Routes (Mounted)
- `GET /health`
- `POST /generate`
- `GET /usage`
- `POST /paddle/checkout`
- `POST /paddle/webhook`
- `GET /history`
- `DELETE /history/:id`
- `DELETE /account`
- `GET /saved`
- `POST /saved`
- `DELETE /saved/:id`

## Frontend Behavior
- Views: create (`/`), results (`/results`), profile (`/profile`), saved (`/saved`).
- Unknown route redirects to `/`.
- Guard: if user opens `/results` without current output, app redirects to `/`.
- On sign-in:
  - Fetches usage.
  - Detects `?paddle_success=1`, shows success banner, refetches usage (delayed retries).
- Loading state uses GSAP animated `LoadingScreen`.
- Main screen transitions use GSAP fade/slide.
- History panel fetches on open and can load a past generation into results.
- Results can be deleted (also removes from history state).
- Saved view displays saved items and supports unsave.

## Important Files
- Backend
  - `backend/src/index.js`
  - `backend/src/lib/ai.js`
  - `backend/src/lib/socialResolve.js`
  - `backend/src/routes/generate.js`
  - `backend/src/routes/usage.js`
  - `backend/src/routes/history.js`
  - `backend/src/routes/saved.js`
  - `backend/src/routes/paddle.js`
  - `backend/src/routes/account.js`
- Frontend
  - `frontend/src/App.jsx`
  - `frontend/src/lib/api.js`
  - `frontend/src/context/AuthContext.jsx`
  - `frontend/src/components/LoadingScreen.jsx`

## Env/Config Expectations (No Secrets Here)
- Backend likely requires:
  - Supabase URL/key and JWT verify settings used by auth middleware.
  - `AI_PROVIDER`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, model vars.
  - `GENERATION_TIMEOUT_MS`, `AI_RETRY_ON_LOW_QUALITY`.
  - Paddle vars (`PADDLE_API_KEY`, `PADDLE_PRICE_ID`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_ENV`).
  - `FRONTEND_URL`.
- Frontend expects Supabase client env vars in its own config.

## Known Notes / Potential Follow-ups
- `backend/src/routes/last-generation.js` exists but is not mounted in `backend/src/index.js` and not used by frontend API client.
- Rate limiter is in-memory (resets on restart, not distributed-safe).
- No test suite observed in this pass.
- This is not currently a git repo in this workspace context, so no commit history is available here.

## Suggested Next Work (Priority Order)
1. Add automated tests for `generate`, `paddle/webhook`, and saved/history ownership checks.
2. Move rate limiting to durable storage (Redis or DB-backed).
3. Add request logging/error IDs for easier production debugging.
4. Validate Supabase RLS policies for `generations` and `saved_items`.
5. Decide whether `last-generation` route should be wired or removed.

## TL;DR
- Core product loop is live: auth -> generate -> view/edit history -> save outputs -> upgrade plan.
- AI pipeline has strong post-processing and retry safeguards.
- Main gaps are test coverage, production hardening, and small route cleanup.
