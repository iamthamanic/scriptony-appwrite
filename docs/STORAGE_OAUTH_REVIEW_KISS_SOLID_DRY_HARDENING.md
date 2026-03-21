# Review: Storage OAuth & Speicher-UI (KISS, SOLID, DRY, Hardening)

## KISS (Keep It Simple, Stupid)

**Was gut ist:**
- Klare Trennung: authorize → Redirect, callback → Token-Tausch → Redirect mit Hash.
- Frontend: eine Komponente pro „Block“ (Usage, Connection), klare Reihenfolge (Scriptony Cloud → OAuth → comingSoon → Hetzner → Fallback).
- OAuth-Logik in `oauth.ts` gebündelt, UI bleibt dünn.

**Vereinfachungen:**
- **authorize.ts:** Method-Check zweimal (einmal mit `sendMethodNotAllowed`, einmal manuell mit `res.status(405).json`) – einheitlich nur `sendMethodNotAllowed` nutzen.
- **providerIcons:** Fast alle nutzen `<Cloud />`, nur `local` nutzt `<HardDrive />`. Statt 7 Einträge: `providerIcons[provider.id] ?? (provider.id === "local" ? <HardDrive /> : <Cloud />)` oder ein Default.
- **ProviderConnectionBlock:** Die vielen `if (isX)` können so bleiben (lesbar); alternativ kleines „Connection-Render-Map“ pro `provider.id` (nur wenn es weiter wächst).

---

## SOLID

**Single Responsibility (S):**
- **callback.ts** macht drei Dinge: State decodieren, Token tauschen, Redirect bauen. Akzeptabel für einen kleinen Handler; bei Wachstum: `decodeAndValidateState()`, `exchangeCodeForTokens()`, `buildSuccessRedirect()` auslagern.
- **ProviderConnectionBlock** hat eine klare Aufgabe: „Verbindungs-UI für einen Anbieter“.

**Open/Closed (O):**
- Neuer OAuth-Anbieter erfordert heute: PROVIDERS in authorize, neuer case + neue `exchangeXxxCode()` in callback. Besser: **eine Konfiguration** (z. B. `oauthProviders.ts`) mit `authUrl`, `tokenUrl`, `clientIdEnv`, `clientSecretEnv`, `buildTokenRequestBody` – dann bleiben authorize/callback unverändert, nur Config wächst (Open for extension, closed for modification).

**Liskov / Interface Segregation (L, I):**
- Kein relevanter Verstoß; kleine, fokussierte Funktionen.

**Dependency Inversion (D):**
- Backend liest Env direkt (`getOptionalEnv`). Für Tests könnte man Config injizieren; für den jetzigen Umfang ok.

---

## DRY (Don’t Repeat Yourself)

**Backend:**
- **Method-Check:** In authorize und callback gleicher GET-Check – kann in ein kleines `requireGet(req, res)` oder Shared-Middleware (wenn ihr welche habt).
- **Token-Exchange:** Google und Dropbox folgen dem gleichen Muster (fetch → !res.ok → throw, sonst JSON). Eine Hilfsfunktion `exchangeOAuthCode({ url, body, headers })` würde Duplikat reduzieren.

**Frontend:**
- **Connection-Block:** Der Titel „Verbindung“ + Icon und der äußere Container (border, padding) wiederholen sich. Optional: `<ConnectionCard title="…"><p>…</p><Button>…</Button></ConnectionCard>`.
- **OAUTH_PROVIDERS:** Wird in registry (provider list) und oauth.ts (wer hat OAuth-UI) genutzt – bereits eine Konstante, gut.

---

## Hardening (Sicherheit & Robustheit)

### Kritisch – umgesetzt

1. **Redirect-URI-Validierung (offener Redirect)** ✅
   - **Risiko:** Ein Angreifer ruft `/authorize?provider=google_drive&redirect_uri=https://evil.com` auf. Nach OAuth leitet das Backend mit den Tokens im Hash auf `https://evil.com#access_token=...` um → Token-Diebstahl.
   - **Umsetzung:** `functions/_shared/oauth-redirect.ts`: `isRedirectUriAllowed(redirect_uri)` prüft gegen Allowlist aus `scriptony_oauth_allowed_redirect_origins` (kommasepariert) oder einzelne Origin aus `VITE_APP_WEB_URL`. In **authorize** vor dem Redirect 400 bei ungültiger URI; im **callback** redirect_uri aus State erneut gegen Allowlist prüfen (kein Redirect auf fremde Origin).

2. **State-Integrität**
   - **Aktuell:** State ist nur Base64(JSON) – kann gefälscht werden. Im Callback wird redirect_uri aus State **erneut gegen Allowlist geprüft** → gefälschte redirect_uri führt zu 400, kein Token-Leak.
   - **Optional:** State signieren (z. B. HMAC mit Server-Secret) für zusätzliche Integrität.

### Empfohlen – umgesetzt

3. **Länge von redirect_uri begrenzen** ✅ – max. 2048 Zeichen in `oauth-redirect.ts`.
4. **Fallback-Redirect ohne Hardcode** ✅ – `getAppBaseUrl()` nutzt nur `VITE_APP_WEB_URL`; wenn leer, 500 (kein Redirect auf feste Domain).
5. **Provider aus State:** Im Callback nur `provider` aus dem entschlüsselten/validierten State verwenden (bereits so umgesetzt).
6. **Fehlermeldungen** ✅ – Keine Env-Variablennamen mehr nach außen (authorize: „OAuth not configured for this provider“).

### Optional

7. **Rate Limiting** für `/authorize` und `/callback` (z. B. pro IP oder pro User), um Brute-Force/Abuse zu erschweren.
8. **Tokens im Hash:** Kurz in Doku oder Kommentar festhalten, dass Tokens nur im Hash übergeben werden und sofort in sessionStorage landen und der Hash gelöscht wird; Hinweis auf Browser-History (Referrer) für sensible Umgebungen.

---

## Kurz-Checkliste

| Thema | Status | Aktion |
|-------|--------|--------|
| Redirect-URI nur same-origin/allowlist | ✅ | `oauth-redirect.ts` + authorize + callback |
| redirect_uri im Callback erneut prüfen | ✅ | isRedirectUriAllowed(statePayload.redirect_uri) |
| Fallback-Redirect ohne Hardcode | ✅ | getAppBaseUrl(), sonst 500 |
| redirect_uri Längenlimit | ✅ | 2048 Zeichen |
| KISS: einheitlicher Method-Check | ✅ | sendMethodNotAllowed in authorize + callback |
| Fehlermeldungen ohne interne Details | ✅ | authorize angepasst |
| State signieren (HMAC) | Optional | Zusätzliche Absicherung |
| DRY: Token-Exchange-Helper | Optional | Bei drittem Anbieter lohnenswert |
| Rate Limiting | Optional | Auf Infra/Gateway-Ebene |

**Stand:** Kritische Hardening-Punkte (Redirect-URI-Allowlist, Längenlimit, kein Hardcode-Fallback, generische Fehler) sind umgesetzt. Siehe `STORAGE_OAUTH_SETUP.md` für Env-Variablen zur Allowlist.
