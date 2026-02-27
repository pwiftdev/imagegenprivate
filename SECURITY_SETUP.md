# Backend Proxy Setup (Secure API Keys)

The LaoZhang API key is now kept on the server. The frontend calls `/api/generate` instead of LaoZhang directly.

## Vercel Deployment

1. In **Vercel Dashboard** → your project → **Settings** → **Environment Variables**
2. Add:
   - `LAOZHANG_API_KEY` = your LaoZhang API key
   - `LAOZHANG_API_URL` = `https://api.laozhang.ai` (optional, this is the default)
3. Remove from Vercel (if present):
   - `VITE_LAOZHANG_API_KEY`
   - `VITE_LAOZHANG_API_URL`
4. Redeploy

## Local Development

For local dev with the API proxy:

1. Install Vercel CLI: `npm i -g vercel` (or use `npx`)
2. Create `.env.local` with:
   ```
   LAOZHANG_API_KEY=sk-your-key
   LAOZHANG_API_URL=https://api.laozhang.ai
   ```
3. Run: `npm run dev:full` or `npx vercel dev`
4. This serves both the app and the API

**Note:** `npm run dev` (Vite only) will not run the API. Use `vercel dev` for full local testing.

## Remove Old Env Vars

Remove these from `.env` (they are no longer used by the frontend):

- `VITE_LAOZHANG_API_KEY`
- `VITE_LAOZHANG_API_URL`

Keep:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
