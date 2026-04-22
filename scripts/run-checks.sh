#!/usr/bin/env bash
# Shared checks for pre-push (GitHub) and supabase-checked (Supabase deploy).
# Usage: run-checks.sh [--frontend] [--backend] [--refactor|--until-95] [--no-frontend] [--no-backend] [--no-ai-review] [--no-explanation-check] ...
#   With no args: run frontend and backend checks (same as --frontend --backend). CHECK_MODE defaults to full (whole-codebase AI review).
#   --refactor / --until-95: force CHECK_MODE=full (chunked full scan). Use for refactor loops until all chunks >=95%.
#   Pre-push should set CHECK_MODE=snippet so AI review only runs on pushed changes; run-checks.sh does not override CHECK_MODE if already set.
#   AI review runs by default; use --no-ai-review to disable (or SKIP_AI_REVIEW=1).
#   Provider: SHIM_AI_REVIEW_PROVIDER=auto|codex|api (auto prefers Codex, else API-key review).
#   Full Explanation check runs by default after AI review; use --no-explanation-check to disable (or SKIP_EXPLANATION_CHECK=1).
# Includes security: npm audit (frontend), deno audit (backend). Optional: Snyk (frontend, skip with SKIP_SNYK=1).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Load .shimwrappercheckrc so CHECK_MODE, SHIM_AI_*, SHIM_RUN_* etc. are set (e.g. when dashboard runs this script)
if [[ -f "$ROOT_DIR/.shimwrappercheckrc" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ROOT_DIR/.shimwrappercheckrc" 2>/dev/null || true
  set +a
fi

# Alias for agent/refactor workflows: if only REFACTOR_REPORT_FILE is set, map it to SHIM_REPORT_FILE.
if [[ -z "${SHIM_REPORT_FILE:-}" ]] && [[ -n "${REFACTOR_REPORT_FILE:-}" ]]; then
  export SHIM_REPORT_FILE="$REFACTOR_REPORT_FILE"
fi

# Project root for .shimwrapper/checktools (consumer project when script runs from node_modules)
PROJECT_ROOT="${SHIM_PROJECT_ROOT:-$ROOT_DIR}"
CHECKTOOLS_BIN=""
if [[ -d "$PROJECT_ROOT/.shimwrapper/checktools/node_modules/.bin" ]]; then
  CHECKTOOLS_BIN="$PROJECT_ROOT/.shimwrapper/checktools/node_modules/.bin"
fi

BACKEND_PATH_PATTERNS="${SHIM_BACKEND_PATH_PATTERNS:-supabase/functions,src/supabase/functions}"

trim() {
  local s="$1"
  # shellcheck disable=SC2001
  s="$(echo "$s" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  echo "$s"
}

to_abs_path() {
  local p="$1"
  if [[ "$p" = /* ]]; then
    echo "$p"
  else
    echo "$ROOT_DIR/$p"
  fi
}

resolve_backend_dir() {
  local patterns="$1"
  local candidate=""
  IFS=',' read -r -a items <<< "$patterns"
  for raw in "${items[@]}"; do
    candidate="$(trim "$raw")"
    candidate="${candidate#/}"
    candidate="${candidate%/}"
    [[ -z "$candidate" ]] && continue
    if [[ -d "$ROOT_DIR/$candidate" ]]; then
      echo "$ROOT_DIR/$candidate"
      return
    fi
  done
  echo ""
}

normalize_ai_review_provider() {
  local provider_raw="$1"
  local provider
  provider="$(echo "$provider_raw" | tr '[:upper:]' '[:lower:]')"
  case "$provider" in
    codex) echo "codex" ;;
    api|api-key|apikey|openai|anthropic) echo "api" ;;
    auto|"") echo "auto" ;;
    *)
      echo "auto"
      ;;
  esac
}

resolve_ai_review_provider() {
  local configured="${SHIM_AI_REVIEW_PROVIDER:-auto}"
  local normalized
  normalized="$(normalize_ai_review_provider "$configured")"
  if [[ "$normalized" == "auto" ]]; then
    if command -v codex >/dev/null 2>&1; then
      echo "codex"
    else
      echo "api"
    fi
    return
  fi
  echo "$normalized"
}

run_ai_review_api() {
  if [[ -f "$ROOT_DIR/scripts/ai-deductive-review.js" ]]; then
    node "$ROOT_DIR/scripts/ai-deductive-review.js"
  elif [[ -f "$PROJECT_ROOT/node_modules/shimwrappercheck/scripts/ai-deductive-review.js" ]]; then
    node "$PROJECT_ROOT/node_modules/shimwrappercheck/scripts/ai-deductive-review.js"
  else
    echo "Skipping AI review: ai-deductive-review.js not found for API mode." >&2
  fi
}

run_ai_review_codex() {
  if [[ -f "$ROOT_DIR/scripts/ai-code-review.sh" ]]; then
    bash "$ROOT_DIR/scripts/ai-code-review.sh"
  elif [[ -f "$PROJECT_ROOT/scripts/ai-code-review.sh" ]]; then
    bash "$PROJECT_ROOT/scripts/ai-code-review.sh"
  elif [[ -f "$PROJECT_ROOT/node_modules/shimwrappercheck/scripts/ai-code-review.sh" ]]; then
    bash "$PROJECT_ROOT/node_modules/shimwrappercheck/scripts/ai-code-review.sh"
  else
    echo "Skipping AI review: ai-code-review.sh not found for Codex mode." >&2
  fi
}

BACKEND_DIR="$(resolve_backend_dir "$BACKEND_PATH_PATTERNS")"

refactor_mode="$(echo "${SHIM_REFACTOR_MODE:-off}" | tr '[:upper:]' '[:lower:]')"
case "$refactor_mode" in
  interactive|agent|off) ;;
  *) refactor_mode="off" ;;
esac

REFACTOR_DIR="$(to_abs_path "${SHIM_REFACTOR_DIR:-.shimwrapper/refactor}")"
REFACTOR_TODO_FILE="$(to_abs_path "${SHIM_REFACTOR_TODO_FILE:-$REFACTOR_DIR/refactor-todo.json}")"
REFACTOR_STATE_FILE="$(to_abs_path "${SHIM_REFACTOR_STATE_FILE:-$REFACTOR_DIR/refactor-state.json}")"
REFACTOR_CURRENT_ITEM_FILE="$(to_abs_path "${SHIM_REFACTOR_CURRENT_ITEM_FILE:-$REFACTOR_DIR/refactor-current-item.json}")"
REVIEWS_DIR="$(to_abs_path "${SHIM_AI_REVIEW_DIR:-.shimwrapper/reviews}")"

run_frontend=false
run_backend=false
run_ai_review=true
run_explanation_check=true
run_i18n_check=true
run_sast=true
run_gitleaks=true
run_license_checker=true
run_architecture=true
run_complexity=true
run_mutation=true
run_e2e=true
run_ruff=true
run_shellcheck=true
run_refactor=false

continue_on_error="${SHIM_CONTINUE_ON_ERROR:-0}"
if [[ "$continue_on_error" != "1" ]]; then
  continue_on_error="0"
fi

if [[ $# -eq 0 ]]; then
  run_frontend=true
  run_backend=true
else
  for arg in "$@"; do
    case "$arg" in
      --frontend) run_frontend=true ;;
      --backend) run_backend=true ;;
      --refactor|--until-95) run_refactor=true ;;
      --no-frontend) run_frontend=false ;;
      --no-backend) run_backend=false ;;
      --no-ai-review) run_ai_review=false ;;
      --no-explanation-check) run_explanation_check=false ;;
      --no-i18n-check) run_i18n_check=false ;;
      --no-sast) run_sast=false ;;
      --no-gitleaks) run_gitleaks=false ;;
      --no-license-checker) run_license_checker=false ;;
      --no-architecture) run_architecture=false ;;
      --no-complexity) run_complexity=false ;;
      --no-mutation) run_mutation=false ;;
      --no-e2e) run_e2e=false ;;
      --no-ruff) run_ruff=false ;;
      --no-shellcheck) run_shellcheck=false ;;
      *) echo "Unknown option: $arg. Use --frontend, --backend, --refactor, --until-95, --no-frontend, --no-backend, --no-ai-review, --no-explanation-check, --no-i18n-check, --no-sast, --no-gitleaks, --no-license-checker, --no-architecture, --no-complexity, --no-mutation, --no-e2e, --no-ruff, --no-shellcheck." >&2; exit 1 ;;
    esac
  done
fi

# CHECK_MODE: only set if not already set (e.g. pre-push sets CHECK_MODE=snippet). Default full for manual/refactor runs.
[[ "$run_refactor" = true ]] && CHECK_MODE=full
export CHECK_MODE="${CHECK_MODE:-full}"
[[ "$CHECK_MODE" == "mix" ]] && CHECK_MODE=full
[[ "$CHECK_MODE" == "diff" ]] && CHECK_MODE=snippet

# Opt-out via env: SKIP_AI_REVIEW=1 disables AI review; SKIP_EXPLANATION_CHECK=1 disables Full Explanation check
[[ -n "${SKIP_AI_REVIEW:-}" ]] && run_ai_review=false
[[ -n "${SKIP_EXPLANATION_CHECK:-}" ]] && run_explanation_check=false
[[ -n "${SKIP_I18N_CHECK:-}" ]] && run_i18n_check=false

# Granular toggles from .shimwrappercheckrc (SHIM_RUN_*=1|0). Default 1 when run_frontend/run_backend is true.
run_prettier="${SHIM_RUN_PRETTIER:-1}"
run_lint="${SHIM_RUN_LINT:-1}"
run_typecheck="${SHIM_RUN_TYPECHECK:-1}"
run_project_rules="${SHIM_RUN_PROJECT_RULES:-1}"
run_check_mock_data="${SHIM_RUN_CHECK_MOCK_DATA:-1}"
run_test_run="${SHIM_RUN_TEST_RUN:-1}"
run_vite_build="${SHIM_RUN_VITE_BUILD:-1}"
run_npm_audit="${SHIM_RUN_NPM_AUDIT:-1}"
run_snyk="${SHIM_RUN_SNYK:-1}"
run_deno_fmt="${SHIM_RUN_DENO_FMT:-1}"
run_deno_lint="${SHIM_RUN_DENO_LINT:-1}"
run_deno_audit="${SHIM_RUN_DENO_AUDIT:-1}"
run_update_readme="${SHIM_RUN_UPDATE_README:-1}"
run_ai_review_rc="${SHIM_RUN_AI_REVIEW:-1}"
run_explanation_check_rc="${SHIM_RUN_EXPLANATION_CHECK:-1}"
run_i18n_check_rc="${SHIM_RUN_I18N_CHECK:-1}"
run_sast_rc="${SHIM_RUN_SAST:-0}"
run_gitleaks_rc="${SHIM_RUN_GITLEAKS:-0}"
run_license_checker_rc="${SHIM_RUN_LICENSE_CHECKER:-0}"
run_architecture_rc="${SHIM_RUN_ARCHITECTURE:-0}"
run_complexity_rc="${SHIM_RUN_COMPLEXITY:-0}"
run_mutation_rc="${SHIM_RUN_MUTATION:-0}"
run_e2e_rc="${SHIM_RUN_E2E:-0}"
run_ruff_rc="${SHIM_RUN_RUFF:-0}"
run_shellcheck_rc="${SHIM_RUN_SHELLCHECK:-0}"

is_frontend_check() {
  case "$1" in
    updateReadme|prettier|lint|typecheck|projectRules|i18nCheck|checkMockData|viteBuild|testRun|npmAudit|snyk) return 0 ;;
  esac
  return 1
}

is_backend_check() {
  case "$1" in
    denoFmt|denoLint|denoAudit) return 0 ;;
  esac
  return 1
}

should_run_check() {
  local id="$1"
  if is_frontend_check "$id" && [[ "$run_frontend" != true ]]; then
    return 1
  fi
  if is_backend_check "$id" && [[ "$run_backend" != true ]]; then
    return 1
  fi
  return 0
}

has_npm_script() {
  local script_name="$1"
  node -e "try{const p=require('./package.json');process.exit(p&&p.scripts&&p.scripts['$script_name']?0:1)}catch(e){process.exit(1)}" >/dev/null 2>&1
}

is_transient_network_or_tls_error() {
  local output="$1"
  if [[ -z "$output" ]]; then
    return 1
  fi

  echo "$output" | grep -qiE 'ENOTFOUND|EAI_AGAIN|ECONNRESET|ECONNREFUSED|ETIMEDOUT|getaddrinfo|network error|unable to get local issuer certificate|CERTIFICATE_VERIFY_FAILED|x509|ca-certs: empty trust anchors|TLS'
}

should_fail_on_infra_error() {
  [[ "${SHIM_STRICT_NETWORK_CHECKS:-0}" == "1" ]]
}

run_npm_audit_with_infra_handling() {
  local output=""
  output="$(npm audit --audit-level="${SHIM_AUDIT_LEVEL:-high}" 2>&1)"
  local audit_rc=$?

  [[ -n "$output" ]] && echo "$output"

  if [[ $audit_rc -eq 0 ]]; then
    return 0
  fi

  if is_transient_network_or_tls_error "$output"; then
    if should_fail_on_infra_error; then
      echo "npm audit infrastructure issue detected; failing because SHIM_STRICT_NETWORK_CHECKS=1." >&2
      return "$audit_rc"
    fi
    echo "npm audit infrastructure issue detected (network/DNS/TLS); treating as warning. Set SHIM_STRICT_NETWORK_CHECKS=1 to fail hard." >&2
    return 0
  fi

  return "$audit_rc"
}

run_semgrep_with_infra_handling() {
  local output=""
  local semgrep_rc=0

  if command -v semgrep >/dev/null 2>&1; then
    output="$(semgrep scan --config auto . --error --no-git-ignore 2>&1)"
    semgrep_rc=$?
  elif npm exec --yes semgrep -- --version >/dev/null 2>&1; then
    output="$(npx semgrep scan --config auto . --error --no-git-ignore 2>&1)"
    semgrep_rc=$?
  else
    echo "Skipping Semgrep: not installed (pip install semgrep or npx semgrep)." >&2
    return 0
  fi

  [[ -n "$output" ]] && echo "$output"

  if [[ $semgrep_rc -eq 0 ]]; then
    return 0
  fi

  if is_transient_network_or_tls_error "$output"; then
    if should_fail_on_infra_error; then
      echo "Semgrep infrastructure issue detected; failing because SHIM_STRICT_NETWORK_CHECKS=1." >&2
      return "$semgrep_rc"
    fi
    echo "Semgrep infrastructure issue detected (network/TLS/CA); treating as warning. Set SHIM_STRICT_NETWORK_CHECKS=1 to fail hard." >&2
    return 0
  fi

  return "$semgrep_rc"
}

resolve_extract_refactor_script() {
  local candidates=(
    "$ROOT_DIR/scripts/extract-refactor-todo.sh"
    "$ROOT_DIR/node_modules/shimwrappercheck/scripts/extract-refactor-todo.sh"
  )
  local candidate=""
  for candidate in "${candidates[@]}"; do
    if [[ -f "$candidate" ]]; then
      echo "$candidate"
      return
    fi
  done
  echo ""
}

run_refactor_orchestration() {
  if [[ "$run_refactor" != true ]]; then
    return 0
  fi
  if [[ "$refactor_mode" == "off" ]]; then
    return 0
  fi

  local extract_script=""
  extract_script="$(resolve_extract_refactor_script)"
  if [[ -z "$extract_script" ]]; then
    echo "Refactor orchestration: extract-refactor-todo.sh not found; skipping TODO/current-item generation." >&2
    return 0
  fi

  mkdir -p "$REFACTOR_DIR"
  local latest_review=""
  latest_review="$(find "$REVIEWS_DIR" -maxdepth 1 -name 'review-full-*.md' -not -type d 2>/dev/null | sort -r | head -1 || true)"
  if [[ -z "$latest_review" ]]; then
    latest_review="$(find "$REVIEWS_DIR" -maxdepth 1 -name 'review-*.md' -not -type d 2>/dev/null | sort -r | head -1 || true)"
  fi
  if [[ -z "$latest_review" ]]; then
    echo "Refactor orchestration: no review file found under $REVIEWS_DIR; skipping." >&2
    return 0
  fi

  if ! bash "$extract_script" "$latest_review" "$REFACTOR_TODO_FILE"; then
    echo "Refactor orchestration: failed to extract TODO from $latest_review." >&2
    return 0
  fi

  if ! command -v node >/dev/null 2>&1; then
    echo "Refactor orchestration: node not available; skipping current-item handoff." >&2
    return 0
  fi

  local handoff_message=""
  handoff_message="$(
    node - "$REFACTOR_TODO_FILE" "$REFACTOR_STATE_FILE" "$REFACTOR_CURRENT_ITEM_FILE" "$latest_review" "$refactor_mode" "${SHIM_REFACTOR_ITEM_INDEX:-}" "${SHIM_REFACTOR_ADVANCE:-0}" <<'NODE'
const fs = require("fs");
const path = require("path");

const [
  todoPath,
  statePath,
  currentItemPath,
  sourceReviewPath,
  mode,
  overrideIndexRaw,
  advanceRaw,
] = process.argv.slice(2);

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

const todoDoc = readJson(todoPath, { items: [] });
const allItems = Array.isArray(todoDoc.items) ? todoDoc.items : [];
const openItems = allItems.filter((item) => item && item.status !== "done" && item.status !== "resolved");
const stateDoc = readJson(statePath, {});

let currentIndex = 0;
if (/^\d+$/.test(String(overrideIndexRaw || ""))) {
  currentIndex = Number(overrideIndexRaw);
} else if (Number.isInteger(stateDoc.currentIndex)) {
  currentIndex = stateDoc.currentIndex;
}
if (String(advanceRaw) === "1") {
  currentIndex += 1;
}
if (currentIndex < 0) {
  currentIndex = 0;
}
if (openItems.length > 0 && currentIndex >= openItems.length) {
  currentIndex = openItems.length - 1;
}

const currentItem = openItems[currentIndex] ?? null;
const timestamp = new Date().toISOString();
const phase = currentItem ? "item" : "verify";

const statePayload = {
  mode,
  phase,
  workflowPhases: ["scan", "item", "verify"],
  sourceReview: sourceReviewPath,
  currentIndex: currentItem ? currentIndex : 0,
  totalItems: openItems.length,
  updatedAt: timestamp,
};

fs.mkdirSync(path.dirname(statePath), { recursive: true });
fs.writeFileSync(statePath, `${JSON.stringify(statePayload, null, 2)}\n`, "utf8");

const currentItemPayload = {
  mode,
  phase,
  workflowPhases: ["scan", "item", "verify"],
  sourceReview: sourceReviewPath,
  itemIndex: currentItem ? currentIndex : 0,
  totalItems: openItems.length,
  remainingItems: currentItem ? openItems.length - currentIndex : 0,
  generatedAt: timestamp,
  resume: {
    advanceEnv: "SHIM_REFACTOR_ADVANCE=1",
    selectIndexEnv: "SHIM_REFACTOR_ITEM_INDEX=<n>",
    rerunCommand: "./scripts/run-checks.sh --refactor",
  },
  item: currentItem,
};

fs.mkdirSync(path.dirname(currentItemPath), { recursive: true });
fs.writeFileSync(currentItemPath, `${JSON.stringify(currentItemPayload, null, 2)}\n`, "utf8");

if (!currentItem) {
  console.log("Refactor backlog clean: no open TODO items found.");
} else {
  const label = currentItem.title || currentItem.point || currentItem.id || `item-${currentIndex + 1}`;
  console.log(`Refactor current item ${currentIndex + 1}/${openItems.length}: ${label}`);
}
NODE
  )" || true

  [[ -n "$handoff_message" ]] && echo "$handoff_message"
  echo "Refactor TODO: $REFACTOR_TODO_FILE"
  echo "Refactor current item: $REFACTOR_CURRENT_ITEM_FILE"
  echo "Refactor state: $REFACTOR_STATE_FILE"
  if [[ "$refactor_mode" == "interactive" ]]; then
    echo "Interactive resume: fix the current item, then run SHIM_REFACTOR_ADVANCE=1 ./scripts/run-checks.sh --refactor"
  fi
}

# If SHIM_CHECK_ORDER is set: run checks in this exact order (like My Checks).
run_one() {
  local id="$1"
  local rc=0
  local has_py=""
  local shfiles=""
  case "$id" in
    prettier)
      if [[ "$run_prettier" = "1" ]]; then
        echo "Prettier..."
        if [[ -n "$CHECKTOOLS_BIN" ]] && [[ -x "$CHECKTOOLS_BIN/prettier" ]]; then
          "$CHECKTOOLS_BIN/prettier" --check .
          rc=$?
        else
          (npm run format:check 2>/dev/null) || npx prettier --check .
          rc=$?
        fi
      fi
      ;;
    lint)
      if [[ "$run_lint" = "1" ]]; then
        echo "Lint..."
        if has_npm_script "lint"; then
          npm run lint
          rc=$?
        elif [[ -n "$CHECKTOOLS_BIN" ]] && [[ -x "$CHECKTOOLS_BIN/eslint" ]]; then
          ESLINT_USE_FLAT_CONFIG=false "$CHECKTOOLS_BIN/eslint" .
          rc=$?
        else
          ESLINT_USE_FLAT_CONFIG=false npx eslint .
          rc=$?
        fi
      fi
      ;;
    typecheck)
      if [[ "$run_typecheck" = "1" ]]; then
        echo "TypeScript check..."
        if [[ -n "$CHECKTOOLS_BIN" ]] && [[ -x "$CHECKTOOLS_BIN/tsc" ]]; then
          "$CHECKTOOLS_BIN/tsc" --noEmit
          rc=$?
        else
          (npm run typecheck 2>/dev/null) || npx tsc --noEmit
          rc=$?
        fi
      fi
      ;;
    projectRules)
      if [[ "$run_project_rules" = "1" ]]; then
        echo "Projektregeln..."
        if [[ -f "$ROOT_DIR/scripts/checks/project-rules.sh" ]]; then
          bash "$ROOT_DIR/scripts/checks/project-rules.sh"
          rc=$?
        else
          echo "Skipping Projektregeln: scripts/checks/project-rules.sh not found." >&2
        fi
      fi
      ;;
    checkMockData)
      if [[ "$run_check_mock_data" = "1" ]]; then
        echo "Check mock data..."
        npm run check:mock-data
        rc=$?
      fi
      ;;
    testRun)
      if [[ "$run_test_run" = "1" ]]; then
        echo "Test run..."
        if [[ -n "$CHECKTOOLS_BIN" ]] && [[ -x "$CHECKTOOLS_BIN/vite" ]] && [[ -x "$CHECKTOOLS_BIN/vitest" ]]; then
          "$CHECKTOOLS_BIN/vite" build
          rc=$?
          if [[ $rc -eq 0 ]]; then
            "$CHECKTOOLS_BIN/vitest" run
            rc=$?
          fi
        else
          npm run build
          rc=$?
          if [[ $rc -eq 0 ]]; then
            npm run test:run
            rc=$?
          fi
        fi
      fi
      ;;
    viteBuild)
      if [[ "$run_vite_build" = "1" ]]; then
        echo "Vite build..."
        if [[ -n "$CHECKTOOLS_BIN" ]] && [[ -x "$CHECKTOOLS_BIN/vite" ]]; then
          "$CHECKTOOLS_BIN/vite" build
          rc=$?
        else
          npm run build
          rc=$?
        fi
      fi
      ;;
    npmAudit)
      if [[ "$run_npm_audit" = "1" ]]; then
        echo "npm audit..."
        run_npm_audit_with_infra_handling
        rc=$?
      fi
      ;;
    snyk)
      if [[ "$run_snyk" = "1" ]] && [[ -z "${SKIP_SNYK:-}" ]]; then
        if command -v snyk >/dev/null 2>&1; then
          echo "Snyk..."
          snyk test
          rc=$?
        elif npm exec --yes snyk -- --version >/dev/null 2>&1; then
          echo "Snyk..."
          npx snyk test
          rc=$?
        else
          echo "Skipping Snyk: not installed." >&2
        fi
      fi
      ;;
    denoFmt)
      if [[ "$run_deno_fmt" = "1" ]]; then
        if [[ -n "$BACKEND_DIR" ]] && [[ -d "$BACKEND_DIR" ]]; then
          echo "Deno fmt..."
          deno fmt -c "$ROOT_DIR/deno.json" --check "$BACKEND_DIR"
          rc=$?
        else
          echo "Skipping Deno fmt: no backend path found in SHIM_BACKEND_PATH_PATTERNS=$BACKEND_PATH_PATTERNS" >&2
        fi
      fi
      ;;
    denoLint)
      if [[ "$run_deno_lint" = "1" ]]; then
        if [[ -n "$BACKEND_DIR" ]] && [[ -d "$BACKEND_DIR" ]]; then
          echo "Deno lint..."
          deno lint -c "$ROOT_DIR/deno.json" "$BACKEND_DIR"
          rc=$?
        else
          echo "Skipping Deno lint: no backend path found in SHIM_BACKEND_PATH_PATTERNS=$BACKEND_PATH_PATTERNS" >&2
        fi
      fi
      ;;
    denoAudit)
      if [[ "$run_deno_audit" = "1" ]]; then
        if [[ -n "$BACKEND_DIR" ]] && [[ -d "$BACKEND_DIR/server" ]]; then
          echo "Deno audit..."
          (cd "$BACKEND_DIR/server" && deno audit)
          rc=$?
        else
          echo "Skipping Deno audit: backend server dir not found under detected backend path." >&2
        fi
      fi
      ;;
    aiReview)
      if [[ "$run_ai_review_rc" = "1" ]] && [[ "$run_ai_review" = true ]]; then
        echo "AI Review..."
        ai_provider="$(resolve_ai_review_provider)"
        if [[ "$ai_provider" == "api" ]]; then
          echo "AI Review provider: api-key"
          run_ai_review_api
          rc=$?
        else
          echo "AI Review provider: codex"
          run_ai_review_codex
          rc=$?
        fi
      fi
      ;;
    explanationCheck)
      if [[ "$run_explanation_check_rc" = "1" ]] && [[ "$run_explanation_check" = true ]]; then
        echo "Full Explanation check..."
        bash "$ROOT_DIR/scripts/ai-explanation-check.sh"
        rc=$?
      fi
      ;;
    i18nCheck)
      if [[ "$run_i18n_check_rc" = "1" ]] && [[ "$run_i18n_check" = true ]]; then
        echo "i18n check..."
        node "$ROOT_DIR/scripts/i18n-check.js"
        rc=$?
      fi
      ;;
    updateReadme)
      if [[ "$run_update_readme" = "1" ]]; then
        echo "Update README..."
        if [[ -f "$ROOT_DIR/node_modules/shimwrappercheck/scripts/update-readme.js" ]]; then
          node "$ROOT_DIR/node_modules/shimwrappercheck/scripts/update-readme.js"
          rc=$?
        elif [[ -f "$ROOT_DIR/scripts/update-readme.js" ]]; then
          node "$ROOT_DIR/scripts/update-readme.js"
          rc=$?
        else
          echo "Skipping Update README: no scripts/update-readme.js (use shimwrappercheck script or add own)." >&2
        fi
      fi
      ;;
    sast)
      if [[ "$run_sast_rc" = "1" ]] && [[ "$run_sast" = true ]]; then
        echo "Semgrep..."
        run_semgrep_with_infra_handling
        rc=$?
      fi
      ;;
    gitleaks)
      if [[ "$run_gitleaks_rc" = "1" ]] && [[ "$run_gitleaks" = true ]]; then
        echo "Gitleaks..."
        if command -v gitleaks >/dev/null 2>&1; then
          gitleaks_opts="detect --no-git --source . --verbose"
          [[ -f "$ROOT_DIR/.gitleaks.toml" ]] && gitleaks_opts="detect --config $ROOT_DIR/.gitleaks.toml --no-git --source . --verbose"
          # shellcheck disable=SC2086
          gitleaks $gitleaks_opts
          rc=$?
        else
          echo "Skipping Gitleaks: not installed (e.g. brew install gitleaks)." >&2
        fi
      fi
      ;;
    licenseChecker)
      if [[ "$run_license_checker_rc" = "1" ]] && [[ "$run_license_checker" = true ]]; then
        echo "license-checker..."
        npx license-checker --summary 2>/dev/null || true
        rc=0
      fi
      ;;
    architecture)
      if [[ "$run_architecture_rc" = "1" ]] && [[ "$run_architecture" = true ]]; then
        if [[ -f "$ROOT_DIR/.dependency-cruiser.json" ]]; then
          echo "Architecture (dependency-cruiser)..."
          depcruise_entry="src"
          [[ -d "$ROOT_DIR/dashboard" ]] && [[ ! -d "$ROOT_DIR/src" ]] && depcruise_entry="dashboard"
          npx depcruise "$depcruise_entry" --output-type err
          rc=$?
        else
          echo "Skipping Architecture: .dependency-cruiser.json not found." >&2
        fi
      fi
      ;;
    complexity)
      if [[ "$run_complexity_rc" = "1" ]] && [[ "$run_complexity" = true ]]; then
        echo "Complexity (eslint-plugin-complexity)..."
        if [[ -f "$ROOT_DIR/eslint.complexity.json" ]]; then
          if [[ -n "$CHECKTOOLS_BIN" ]] && [[ -x "$CHECKTOOLS_BIN/eslint" ]]; then
            ESLINT_USE_FLAT_CONFIG=false "$CHECKTOOLS_BIN/eslint" . -c "$ROOT_DIR/eslint.complexity.json"
          else
            ESLINT_USE_FLAT_CONFIG=false npx eslint . -c "$ROOT_DIR/eslint.complexity.json"
          fi
          rc=$?
        elif [[ -f "$ROOT_DIR/node_modules/shimwrappercheck/templates/eslint.complexity.json" ]]; then
          if [[ -n "$CHECKTOOLS_BIN" ]] && [[ -x "$CHECKTOOLS_BIN/eslint" ]]; then
            ESLINT_USE_FLAT_CONFIG=false "$CHECKTOOLS_BIN/eslint" . -c "$ROOT_DIR/node_modules/shimwrappercheck/templates/eslint.complexity.json"
          else
            ESLINT_USE_FLAT_CONFIG=false npx eslint . -c "$ROOT_DIR/node_modules/shimwrappercheck/templates/eslint.complexity.json"
          fi
          rc=$?
        else
          echo "Skipping Complexity: add eslint.complexity.json or install shimwrappercheck and eslint-plugin-complexity." >&2
        fi
      fi
      ;;
    mutation)
      if [[ "$run_mutation_rc" = "1" ]] && [[ "$run_mutation" = true ]]; then
        if [[ -f "$ROOT_DIR/stryker.config.json" ]]; then
          echo "Mutation (Stryker)..."
          npx stryker run
          rc=$?
        else
          echo "Skipping Mutation: stryker.config.json not found." >&2
        fi
      fi
      ;;
    e2e)
      if [[ "$run_e2e_rc" = "1" ]] && [[ "$run_e2e" = true ]]; then
        if [[ -f "$ROOT_DIR/playwright.config.ts" ]] || [[ -f "$ROOT_DIR/playwright.config.js" ]]; then
          echo "E2E (Playwright)..."
          npx playwright test
          rc=$?
        else
          echo "Skipping E2E: no Playwright config found." >&2
        fi
      fi
      ;;
    ruff)
      if [[ "$run_ruff_rc" = "1" ]] && [[ "$run_ruff" = true ]]; then
        if command -v ruff >/dev/null 2>&1; then
          has_py="$(find . \( -path './node_modules' -o -path './.git' -o -path './.next' -o -path './dist' -o -path './build' -o -path './.shim' -o -path './.shimwrapper' -o -path './.stryker-tmp' -o -path './.codex-home' \) -prune -o -type f \( -name '*.py' -o -name 'pyproject.toml' -o -name 'requirements.txt' \) -print -quit 2>/dev/null)"
          if [[ -n "$has_py" ]]; then
            echo "Ruff (Python)..."
            ruff check . --force-exclude --exclude node_modules,.git,.next,dist,build,.shim,.shimwrapper,.stryker-tmp,.codex-home
            rc=$?
            if [[ $rc -eq 0 ]]; then
              ruff format --check . --force-exclude --exclude node_modules,.git,.next,dist,build,.shim,.shimwrapper,.stryker-tmp,.codex-home
              rc=$?
            fi
          else
            echo "Skipping Ruff: no Python files, pyproject.toml or requirements.txt found." >&2
          fi
        else
          echo "Skipping Ruff: not installed (e.g. pip install ruff, brew install ruff)." >&2
        fi
      fi
      ;;
    shellcheck)
      if [[ "$run_shellcheck_rc" = "1" ]] && [[ "$run_shellcheck" = true ]]; then
        if command -v shellcheck >/dev/null 2>&1; then
          shfiles="$(find . -name '*.sh' ! -path './node_modules/*' ! -path './.git/*' ! -path './.next/*' ! -path './dist/*' ! -path './build/*' ! -path './.shim/*' ! -path './.shimwrapper/*' ! -path './.stryker-tmp/*' ! -path './.codex-home/*' ! -path './.rag/*' 2>/dev/null)"
          if [[ -n "$shfiles" ]]; then
            echo "Shellcheck..."
            echo "$shfiles" | xargs shellcheck
            rc=$?
          else
            echo "Skipping Shellcheck: no .sh files found." >&2
          fi
        else
          echo "Skipping Shellcheck: not installed (e.g. brew install shellcheck)." >&2
        fi
      fi
      ;;
    *)
      echo "Unknown check id: $id" >&2
      return 1
      ;;
  esac
  return "$rc"
}

FAILED_CHECKS=()
OVERALL_RC=0

run_step() {
  local id="$1"
  should_run_check "$id" || return 0

  set +e
  run_one "$id"
  local rc=$?
  set -e

  if [[ $rc -ne 0 ]]; then
    FAILED_CHECKS+=("$id")
    if [[ "$continue_on_error" == "1" ]]; then
      echo "Check failed (continuing): $id" >&2
      return 0
    fi
    return "$rc"
  fi

  return 0
}

run_sequence() {
  local ids=("$@")
  local id=""
  for id in "${ids[@]}"; do
    if ! run_step "$id"; then
      return 1
    fi
  done
  return 0
}

if [[ -n "${SHIM_CHECK_ORDER:-}" ]]; then
  echo "Running checks in My Checks order..."
  ORDER=()
  for id in $(echo "$SHIM_CHECK_ORDER" | tr ',' ' '); do
    ORDER+=("$id")
  done
  set +e
  run_sequence "${ORDER[@]}"
  seq_rc=$?
  set -e
  [[ $seq_rc -ne 0 ]] && OVERALL_RC=$seq_rc
else
  DEFAULT_ORDER=()

  if [[ "$run_frontend" = true ]]; then
    echo "Running frontend checks..."
    DEFAULT_ORDER+=(updateReadme prettier lint typecheck projectRules i18nCheck checkMockData viteBuild testRun npmAudit snyk)
  fi

  if [[ "$run_backend" = true ]]; then
    echo "Running backend checks..."
    DEFAULT_ORDER+=(denoFmt denoLint denoAudit)
  fi

  DEFAULT_ORDER+=(ruff shellcheck sast gitleaks licenseChecker architecture complexity mutation e2e)

  if [[ "$run_ai_review_rc" = "1" ]] && [[ "$run_ai_review" = true ]] && { [[ "$run_frontend" = true ]] || [[ "$run_backend" = true ]]; }; then
    DEFAULT_ORDER+=(aiReview)
  fi

  if [[ "$run_explanation_check" = true ]] && [[ "$run_explanation_check_rc" = "1" ]] && { [[ "$run_frontend" = true ]] || [[ "$run_backend" = true ]]; }; then
    DEFAULT_ORDER+=(explanationCheck)
  fi

  set +e
  run_sequence "${DEFAULT_ORDER[@]}"
  seq_rc=$?
  set -e
  [[ $seq_rc -ne 0 ]] && OVERALL_RC=$seq_rc
fi

run_refactor_orchestration

if [[ "${#FAILED_CHECKS[@]}" -gt 0 ]]; then
  failed_csv="$(IFS=','; echo "${FAILED_CHECKS[*]}")"
  echo "Failed checks: $failed_csv" >&2
  OVERALL_RC=1
fi

if [[ $OVERALL_RC -ne 0 ]]; then
  exit "$OVERALL_RC"
fi

exit 0
