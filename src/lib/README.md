# `/lib` - Shared Library & Infrastructure

This directory contains shared utilities, configuration, and infrastructure code used across the entire application.

## 📁 Structure

```
lib/
├── index.ts         # Central export file (import everything from here!)
├── api-client.ts    # Centralized HTTP client for backend API
├── env.ts           # Type-safe environment variable validation
├── config.ts        # Application configuration constants
├── types/           # Shared TypeScript type definitions
│   └── index.ts     # Domain types (User, Project, World, etc.)
├── formatters/      # Data formatting utilities
│   ├── date.ts      # Date/time formatting
│   ├── number.ts    # Number/currency/file size formatting
│   └── text.ts      # Text manipulation & formatting
├── validators/      # Input validation utilities
│   └── input.ts     # Form & data validation
├── utils/           # General helper functions
│   └── index.ts     # Array, object, function, promise utilities
└── README.md        # This file
```

## 🔧 Modules

### `api-client.ts` - HTTP Client

**Purpose:** Centralized HTTP client for requests to Scriptony backend functions (via configured base URL).

**Usage:**

```typescript
import {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  isApiError,
} from "./lib/api-client";

// GET request
const result = await apiGet("/projects");

if (isApiError(result)) {
  console.error("Error:", result.error.message);
} else {
  console.log("Projects:", result.data.projects);
}

// POST request
const createResult = await apiPost("/projects", {
  title: "My Script",
  description: "A great story",
});

// Using unwrapApiResult for try/catch style
import { unwrapApiResult } from "./lib/api-client";

try {
  const data = unwrapApiResult(await apiGet("/projects"));
  console.log(data);
} catch (error) {
  console.error("API Error:", error.message);
}
```

**Key Features:**

- ✅ Automatic authentication with the current session JWT (Appwrite)
- ✅ Request/response logging
- ✅ Timeout handling (configurable)
- ✅ Standardized error formatting
- ✅ Type-safe responses with ApiResult<T>
- ✅ Convenience methods (GET, POST, PUT, DELETE)

**Rules:**

- ❌ Don't use `fetch` directly in components
- ✅ Use `apiGet`, `apiPost`, etc. from `api-client.ts`
- ✅ Check `isApiError(result)` before accessing `result.data`
- ✅ Use `unwrapApiResult` for async/await + try/catch patterns

### `env.ts` - Environment Validation

**Purpose:** Centralized, type-safe access to all environment variables with runtime validation.

**Usage:**

```typescript
import { backendConfig, appConfig, getAppwritePublicConfig } from "./lib/env";

console.log(backendConfig.functionsBaseUrl);
console.log(getAppwritePublicConfig()?.endpoint);

if (appConfig.isDevelopment) {
  console.log("Running in development mode");
}
```

**Key Features:**

- ✅ Runtime validation with clear error messages
- ✅ Type-safe access to environment variables
- ✅ Singleton pattern for efficient caching
- ✅ Backend URL and Appwrite public config validation where applicable
- ✅ Development mode detection

**Rules:**

- ✅ Always use `getBackendConfig()` / `getAppwritePublicConfig()` from `lib/env`

### `config.ts` - Application Configuration

**Purpose:** Centralized constants for app-wide configuration.

**Usage:**

```typescript
import {
  API_CONFIG,
  STORAGE_CONFIG,
  STORAGE_KEYS,
  FEATURE_FLAGS,
  USER_ROLES,
} from "./lib/config";

// API configuration
const endpoint = `${API_CONFIG.SERVER_BASE_PATH}/projects`;

// Storage keys
localStorage.setItem(STORAGE_KEYS.THEME, "dark");

// Feature flags
if (FEATURE_FLAGS.AUTO_MIGRATION) {
  runMigration();
}

// User roles
if (user.role === USER_ROLES.SUPERADMIN) {
  showAdminPanel();
}
```

**Categories:**

- **API_CONFIG**: Server paths, timeouts, retry logic
- **STORAGE_CONFIG**: File upload limits, bucket names, image settings
- **STORAGE_KEYS**: LocalStorage key constants
- **FEATURE_FLAGS**: Enable/disable features
- **USER_ROLES**: User role constants
- **PAGINATION**: Default page sizes
- **APP_METADATA**: App name, version, description
- **TEST_USER**: Test credentials (dev only)

**Rules:**

- ❌ Never hardcode configuration values in components
- ✅ Always reference constants from `config.ts`
- ❌ Never commit sensitive data (use env.ts for secrets)

### `types/index.ts` - TypeScript Type Definitions

**Purpose:** Centralized type definitions for all domain models and API responses.

**Usage:**

```typescript
import type { User, Project, World, Character, ApiResult } from "./lib/types";

// Use in components
const [project, setProject] = useState<Project | null>(null);

// Use in API responses
const result: ApiResult<{ projects: Project[] }> = await apiGet("/projects");
```

**Available Types:**

- **Auth**: `User`, `UserRole`, `AuthSession`
- **Projects**: `Project`, `Episode`, `Character`, `Scene`
- **Worldbuilding**: `World`, `WorldCategory`, `WorldItem`
- **Creative Gym**: `Challenge`, `ArtForm`, `Exercise`, `Achievement`
- **API**: `ListResponse<T>`, `SingleResponse<T>`, `ErrorResponse`
- **Stats**: `Stats`, `Analytics`

**Rules:**

- ✅ Always import types with `import type { ... }`
- ✅ Use these types instead of inline types
- ❌ Don't use `any` - find or create a proper type

### `formatters/` - Data Formatting

**Purpose:** Consistent formatting of dates, numbers, and text across the application.

**Date Formatting (`formatters/date.ts`):**

```typescript
import { formatDate } from "./lib";

formatDate(new Date(), "short"); // "11.10.2025"
formatDate(new Date(), "medium"); // "11. Okt 2025"
formatDate(new Date(), "relative"); // "vor 2 Stunden"
formatDate(new Date(), "datetime"); // "11.10.2025 14:30"
```

**Number Formatting (`formatters/number.ts`):**

```typescript
import {
  formatNumber,
  formatFileSize,
  formatDuration,
  formatPercent,
} from "./lib";

formatNumber(1234567); // "1.234.567" (DE) or "1,234,567" (EN)
formatFileSize(1536000); // "1.5 MB"
formatDuration(150); // "2 Std. 30 Min."
formatPercent(75); // "75%"
```

**Text Formatting (`formatters/text.ts`):**

```typescript
import { truncate, slugify, getInitials, pluralize } from "./lib";

truncate("Long text...", 20); // "Long text..."
slugify("Hello World!"); // "hello-world"
getInitials("Max Mustermann"); // "MM"
pluralize(5, "Projekt", "Projekte"); // "5 Projekte"
```

### `validators/` - Input Validation

**Purpose:** Reusable validation functions for form inputs and user data.

**Usage:**

```typescript
import { validateEmail, validatePassword, validateRequired } from "./lib";

const emailResult = validateEmail("user@example.com");
if (!emailResult.valid) {
  console.error(emailResult.error); // "Ungültige E-Mail-Adresse"
}

const passwordStrength = getPasswordStrength("MyPass123!");
console.log(passwordStrength.score); // 0-4
console.log(passwordStrength.feedback); // ["Starkes Passwort"]

// Combine validators
const validator = combineValidators(validateRequired, (value) =>
  validateLength(value, 3, 50, "Projektname"),
);
```

### `utils/` - General Utilities

**Purpose:** Common helper functions for arrays, objects, functions, and more.

**Array Utilities:**

```typescript
import { unique, groupBy, chunk, shuffle } from "./lib";

unique([1, 2, 2, 3]); // [1, 2, 3]
groupBy(users, (u) => u.role); // { admin: [...], user: [...] }
chunk([1, 2, 3, 4, 5], 2); // [[1,2], [3,4], [5]]
shuffle([1, 2, 3]); // [2, 3, 1] (random)
```

**Function Utilities:**

```typescript
import { debounce, throttle, retry, sleep } from "./lib";

const debouncedSearch = debounce(search, 300);
const throttledScroll = throttle(handleScroll, 100);

await retry(fetchData, 3, 1000); // Retry 3 times with 1s delay
await sleep(2000); // Wait 2 seconds
```

**Object Utilities:**

```typescript
import { deepClone, pick, omit, deepMerge } from "./lib";

const copy = deepClone(original);
const subset = pick(user, "id", "name", "email");
const without = omit(user, "password");
const merged = deepMerge(defaults, userConfig);
```

**Browser Utilities:**

```typescript
import { copyToClipboard, downloadFile, getLocalStorage } from "./lib";

await copyToClipboard("Text to copy");
downloadFile("content", "file.txt", "text/plain");

const theme = getLocalStorage("theme", "light");
setLocalStorage("theme", "dark");
```

## 🎯 Best Practices

### 1. Import from `/lib` central export

```typescript
// ✅ Good - Import from central export
import { formatDate, validateEmail, apiGet } from "./lib";

// ❌ Bad - Direct imports
import { formatDate } from "./lib/formatters/date";
import { validateEmail } from "./lib/validators/input";
```

### 2. Use typed validators

```typescript
// ✅ Good - Check validation result
const result = validateEmail(email);
if (!result.valid) {
  setError(result.error);
  return;
}

// ❌ Bad - No validation
if (!email.includes("@")) {
  setError("Invalid email");
}
```

### 3. Consistent formatting

```typescript
// ✅ Good - Use formatters
<span>{formatDate(project.createdAt, 'relative')}</span>
<span>{formatFileSize(upload.size)}</span>

// ❌ Bad - Manual formatting
<span>{new Date(project.createdAt).toLocaleDateString()}</span>
<span>{(upload.size / 1024 / 1024).toFixed(2)} MB</span>
```

## 🎯 Future Extensions

Planned additions:

- **Zod schemas**: Type-safe runtime validation
- **Custom hooks**: useDebounce, useLocalStorage, useMediaQuery
- **Constants**: Shared enums and constant values

## 📖 Best Practices

1. **Import from lib, not ad-hoc env reads:**

   ```typescript
   // ✅ Good
   import { backendConfig, getAppwritePublicConfig } from "./lib/env";
   ```

2. **Use typed constants:**

   ```typescript
   // ❌ Bad
   localStorage.getItem("theme");

   // ✅ Good
   import { STORAGE_KEYS } from "./lib/config";
   localStorage.getItem(STORAGE_KEYS.THEME);
   ```

3. **Leverage type safety:**

   ```typescript
   // ❌ Bad
   if (user.role === "superadmin") {
   }

   // ✅ Good
   import { USER_ROLES } from "./lib/config";
   if (user.role === USER_ROLES.SUPERADMIN) {
   }
   ```

## 🔍 Debugging

Environment validation logs to console in development mode:

```
Environment ready: {
  functionsBaseUrl: "...",
  appwriteEndpoint: "...",
  missingAppwriteConfig: []
}
```

If Appwrite or functions base URL is misconfigured, fix `VITE_*` in `.env.local` (see `docs/DEPLOYMENT.md`).
