# Deployment notes

## Frontend (e.g. Vercel)

Set build-time environment variables:

| Variable | Purpose |
|----------|---------|
| `VITE_APPWRITE_ENDPOINT` | Appwrite API base (`…/v1`) |
| `VITE_APPWRITE_PROJECT_ID` | Project ID |
| `VITE_APPWRITE_FUNCTIONS_BASE_URL` or `VITE_BACKEND_API_BASE_URL` | Prefix for `scriptony-*` HTTP functions |
| `VITE_APP_WEB_URL` | Public site URL |
| `VITE_AUTH_REDIRECT_URL` | OAuth/email redirect origin |
| `VITE_PASSWORD_RESET_REDIRECT_URL` | Password recovery return URL |
| `VITE_BACKEND_PUBLIC_TOKEN` | Optional; some routes accept an extra public token |

Redeploy after changing `VITE_*`.

## Appwrite

Configure **Authentication → URLs** (or equivalent) so redirects match production and local dev origins.

## Functions

Deploy the contents of **`functions/`** per function to your runtime (Appwrite Functions, Node host, etc.). Each function expects **server-side** `APPWRITE_*` variables and optional bucket/database IDs — see `functions/_shared/env.ts`.

## Security

- Never put Appwrite API keys or function admin secrets in `VITE_*`.
- Rate-limit and authenticate public HTTP entrypoints in production.
