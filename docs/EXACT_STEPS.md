# Exact steps — local development

1. Copy **`.env.local.example`** → **`.env.local`** and fill in:
   - `VITE_APPWRITE_ENDPOINT`, `VITE_APPWRITE_PROJECT_ID`
   - `VITE_APPWRITE_FUNCTIONS_BASE_URL` or `VITE_BACKEND_API_BASE_URL`
   - Redirect URLs pointing at `http://localhost:3000` (this repo’s dev port)
2. In **Appwrite Console**, add the same origins to allowed URLs for web/OAuth as needed.
3. `npm install` (use `npm install --legacy-peer-deps` if the resolver complains about peers).
4. `npm run verify:test-env` — checks Appwrite `/health`, `scriptony-projects/health`, and (if URLs are set) `scriptony-assistant/health` for KI.
5. **KI / LLM (first time or after pulling):** with Appwrite CLI logged in: `npm run appwrite:setup:assistant` — creates `scriptony-assistant` if missing, deploys bundle. Then Console → Functions → Domains for that function, and `npm run appwrite:sync:function-domains` (uses `.env.server.local`) or set `VITE_BACKEND_FUNCTION_DOMAIN_MAP` manually.
6. `npm run dev` → open `http://localhost:3000`.

Deploy **`functions/`** according to your Appwrite Functions or gateway setup; set the functions base URL in Vercel (or host) to match.
