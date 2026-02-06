# NGX BONUS Ebook Conversacional

Frontend React + backend Supabase Edge Functions para operar el bonus conversacional con créditos compartidos.

## Arquitectura

- Frontend (`App.tsx`, `components/`) consume solo endpoints propios:
  - `POST /functions/v1/ai-chat`
  - `POST /functions/v1/ai-image`
  - `GET /functions/v1/credits-balance`
- Backend (`supabase/functions/`) controla auth/demo, créditos, límites e invoca Gemini server-side.
- Datos de monetización y metering en Supabase (`supabase/migrations/`).

## Requisitos

- Node.js 20+
- Supabase CLI
- Proyecto Supabase activo

## Variables frontend (`.env.local`)

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

## Secrets backend (Supabase Edge Functions)

Configura secrets en Supabase (no en frontend):

```bash
supabase secrets set GEMINI_API_KEY=<gemini-key>
supabase secrets set GEMINI_TEXT_MODEL_DEFAULT=gemini-2.5-flash
supabase secrets set GEMINI_TEXT_MODEL_DEEP_DIVE=gemini-2.5-pro
supabase secrets set GEMINI_IMAGE_MODEL_STANDARD=gemini-2.0-flash-preview-image-generation
supabase secrets set GEMINI_IMAGE_MODEL_HIGH_QUALITY=gemini-2.0-flash-preview-image-generation
supabase secrets set GEMINI_TTS_MODEL=gemini-2.5-flash-preview-tts
supabase secrets set CORS_ALLOW_ORIGIN=https://tu-dominio.com
```

## Despliegue backend

```bash
supabase db push
supabase functions deploy ai-chat
supabase functions deploy ai-image
supabase functions deploy ai-audio
supabase functions deploy credits-balance
```

## Desarrollo frontend

```bash
npm install
npm run dev
```

## Validación mínima

```bash
npm run build
```

Luego valida:

1. Demo: agotar créditos y confirmar bloqueo.
2. Usuario autenticado: descuento de wallet y saldo en UI.
3. Reintento con mismo `idempotencyKey` (desde cliente/API): sin doble cobro.
4. Exceso de cuota semanal de imágenes: respuesta controlada.
5. `dist` sin `GEMINI_API_KEY`.

## Seguridad

- Nunca expongas `GEMINI_API_KEY` en `VITE_*`.
- Si una key fue compartida por chat o logs, rótala inmediatamente.
