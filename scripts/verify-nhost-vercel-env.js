#!/usr/bin/env node
/**
 * Verifiziert Nhost- und Vercel-relevante Umgebungsvariablen.
 * Aufruf: node scripts/verify-nhost-vercel-env.js
 * Optional: .env.local wird nicht geladen (Vite macht das beim Build).
 * Für lokalen Check: VITE_NHOST_SUBDOMAIN=xxx VITE_NHOST_REGION=eu-central-1 node scripts/verify-nhost-vercel-env.js
 */

const subdomain = process.env.VITE_NHOST_SUBDOMAIN?.trim();
const region = (process.env.VITE_NHOST_REGION?.trim()) || 'eu-central-1';
const functionsUrl = process.env.VITE_NHOST_FUNCTIONS_URL?.trim()
  || process.env.VITE_BACKEND_API_BASE_URL?.trim();
const authUrl = process.env.VITE_NHOST_AUTH_URL?.trim();
const appWebUrl = process.env.VITE_APP_WEB_URL?.trim();
const authRedirectUrl = process.env.VITE_AUTH_REDIRECT_URL?.trim();

const expectedFunctionsUrl = subdomain && region
  ? `https://${subdomain}.functions.${region}.nhost.run/v1`
  : '';

function ok(msg) {
  console.log('  ✅', msg);
}
function fail(msg) {
  console.log('  ❌', msg);
}

console.log('\n--- Nhost / Vercel Env-Check ---\n');

let hasError = false;

if (!subdomain) {
  fail('VITE_NHOST_SUBDOMAIN fehlt (z.B. mthatsgmfklegprnulnn)');
  hasError = true;
} else {
  ok(`VITE_NHOST_SUBDOMAIN = ${subdomain}`);
}

if (!region) {
  fail('VITE_NHOST_REGION fehlt');
  hasError = true;
} else {
  ok(`VITE_NHOST_REGION = ${region}`);
}

const effectiveFunctionsUrl = functionsUrl || expectedFunctionsUrl;
if (!effectiveFunctionsUrl) {
  fail('Weder VITE_NHOST_FUNCTIONS_URL / VITE_BACKEND_API_BASE_URL noch Subdomain+Region gesetzt');
  hasError = true;
} else {
  ok(`Functions Base URL = ${effectiveFunctionsUrl}`);
}

if (!authUrl && !subdomain) {
  fail('VITE_NHOST_AUTH_URL oder VITE_NHOST_SUBDOMAIN nötig');
  hasError = true;
} else if (authUrl) {
  ok(`VITE_NHOST_AUTH_URL = ${authUrl}`);
} else {
  ok(`Auth URL (aus Subdomain) = https://${subdomain}.auth.${region}.nhost.run/v1`);
}

if (!appWebUrl) {
  fail('VITE_APP_WEB_URL fehlt (z.B. https://scriptony.raccoova.com)');
  hasError = true;
} else {
  ok(`VITE_APP_WEB_URL = ${appWebUrl}`);
}

if (!authRedirectUrl) {
  fail('VITE_AUTH_REDIRECT_URL fehlt');
  hasError = true;
} else {
  ok(`VITE_AUTH_REDIRECT_URL = ${authRedirectUrl}`);
}

console.log('');
if (hasError) {
  console.log('→ Bitte fehlende Variablen in Vercel setzen und Redeploy ausführen.\n');
  process.exit(1);
}

console.log('→ Alle erwarteten Variablen sind gesetzt.');
console.log('→ Nach Redeploy: ' + appWebUrl + ' testen (Login, Projekt erstellen).\n');
process.exit(0);
