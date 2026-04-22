/**
 * Input Validation Utilities
 *
 * Common validation functions for form inputs and user data.
 */

// =============================================================================
// Types
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// =============================================================================
// Email Validation
// =============================================================================

/**
 * Validates an email address
 */
export function validateEmail(
  email: string | null | undefined,
): ValidationResult {
  if (!email) {
    return { valid: false, error: "E-Mail-Adresse ist erforderlich" };
  }

  const trimmed = email.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "E-Mail-Adresse ist erforderlich" };
  }

  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: "Ungültige E-Mail-Adresse" };
  }

  return { valid: true };
}

// =============================================================================
// Password Validation
// =============================================================================

export interface PasswordStrength {
  score: number; // 0-4 (weak to strong)
  feedback: string[];
  valid: boolean;
}

/**
 * Validates password strength
 *
 * Requirements:
 * - Minimum 6 characters (for dev, should be 8+ in production)
 * - Recommended: uppercase, lowercase, number, special char
 */
export function validatePassword(
  password: string | null | undefined,
): ValidationResult {
  if (!password) {
    return { valid: false, error: "Passwort ist erforderlich" };
  }

  if (password.length < 6) {
    return {
      valid: false,
      error: "Passwort muss mindestens 6 Zeichen lang sein",
    };
  }

  return { valid: true };
}

/**
 * Calculates password strength with detailed feedback
 */
export function getPasswordStrength(
  password: string | null | undefined,
): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      feedback: ["Passwort ist erforderlich"],
      valid: false,
    };
  }

  let score = 0;
  const feedback: string[] = [];

  // Length check
  if (password.length >= 8) {
    score++;
  } else if (password.length >= 6) {
    feedback.push("Passwort sollte mindestens 8 Zeichen lang sein");
  } else {
    feedback.push("Passwort zu kurz (min. 6 Zeichen)");
    return { score: 0, feedback, valid: false };
  }

  // Lowercase letters
  if (/[a-z]/.test(password)) {
    score++;
  } else {
    feedback.push("Kleinbuchstaben hinzufügen");
  }

  // Uppercase letters
  if (/[A-Z]/.test(password)) {
    score++;
  } else {
    feedback.push("Großbuchstaben hinzufügen");
  }

  // Numbers
  if (/[0-9]/.test(password)) {
    score++;
  } else {
    feedback.push("Zahlen hinzufügen");
  }

  // Special characters
  if (/[^a-zA-Z0-9]/.test(password)) {
    score++;
  } else {
    feedback.push("Sonderzeichen hinzufügen");
  }

  // Length bonus
  if (password.length >= 12) {
    score++;
  }

  // Cap score at 4
  score = Math.min(score, 4);

  if (feedback.length === 0) {
    feedback.push("Starkes Passwort");
  }

  return {
    score,
    feedback,
    valid: score >= 1, // Minimum requirement
  };
}

/**
 * Validates password confirmation
 */
export function validatePasswordMatch(
  password: string | null | undefined,
  confirmation: string | null | undefined,
): ValidationResult {
  if (!confirmation) {
    return { valid: false, error: "Passwortbestätigung ist erforderlich" };
  }

  if (password !== confirmation) {
    return { valid: false, error: "Passwörter stimmen nicht überein" };
  }

  return { valid: true };
}

// =============================================================================
// Text Validation
// =============================================================================

/**
 * Validates required text field
 */
export function validateRequired(
  value: string | null | undefined,
  fieldName: string = "Dieses Feld",
): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, error: `${fieldName} ist erforderlich` };
  }

  return { valid: true };
}

/**
 * Validates text length
 */
export function validateLength(
  value: string | null | undefined,
  min: number,
  max: number,
  fieldName: string = "Dieses Feld",
): ValidationResult {
  if (!value) {
    return { valid: false, error: `${fieldName} ist erforderlich` };
  }

  const length = value.trim().length;

  if (length < min) {
    return {
      valid: false,
      error: `${fieldName} muss mindestens ${min} Zeichen lang sein`,
    };
  }

  if (length > max) {
    return {
      valid: false,
      error: `${fieldName} darf maximal ${max} Zeichen lang sein`,
    };
  }

  return { valid: true };
}

/**
 * Validates alphanumeric text (letters and numbers only)
 */
export function validateAlphanumeric(
  value: string | null | undefined,
  fieldName: string = "Dieses Feld",
): ValidationResult {
  if (!value) {
    return { valid: false, error: `${fieldName} ist erforderlich` };
  }

  if (!/^[a-zA-Z0-9]+$/.test(value)) {
    return {
      valid: false,
      error: `${fieldName} darf nur Buchstaben und Zahlen enthalten`,
    };
  }

  return { valid: true };
}

/**
 * Validates username format
 */
export function validateUsername(
  username: string | null | undefined,
): ValidationResult {
  if (!username) {
    return { valid: false, error: "Benutzername ist erforderlich" };
  }

  const trimmed = username.trim();

  if (trimmed.length < 3) {
    return {
      valid: false,
      error: "Benutzername muss mindestens 3 Zeichen lang sein",
    };
  }

  if (trimmed.length > 20) {
    return {
      valid: false,
      error: "Benutzername darf maximal 20 Zeichen lang sein",
    };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return {
      valid: false,
      error: "Benutzername darf nur Buchstaben, Zahlen, _ und - enthalten",
    };
  }

  return { valid: true };
}

// =============================================================================
// Number Validation
// =============================================================================

/**
 * Validates that a value is a number
 */
export function validateNumber(
  value: any,
  fieldName: string = "Dieses Feld",
): ValidationResult {
  if (value === null || value === undefined || value === "") {
    return { valid: false, error: `${fieldName} ist erforderlich` };
  }

  const num = Number(value);

  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} muss eine Zahl sein` };
  }

  return { valid: true };
}

/**
 * Validates number is within range
 */
export function validateRange(
  value: number | null | undefined,
  min: number,
  max: number,
  fieldName: string = "Dieses Feld",
): ValidationResult {
  if (value === null || value === undefined) {
    return { valid: false, error: `${fieldName} ist erforderlich` };
  }

  if (value < min || value > max) {
    return {
      valid: false,
      error: `${fieldName} muss zwischen ${min} und ${max} liegen`,
    };
  }

  return { valid: true };
}

/**
 * Validates positive number
 */
export function validatePositive(
  value: number | null | undefined,
  fieldName: string = "Dieses Feld",
): ValidationResult {
  if (value === null || value === undefined) {
    return { valid: false, error: `${fieldName} ist erforderlich` };
  }

  if (value <= 0) {
    return { valid: false, error: `${fieldName} muss größer als 0 sein` };
  }

  return { valid: true };
}

// =============================================================================
// File Validation
// =============================================================================

/**
 * Validates file size
 */
export function validateFileSize(
  file: File | null | undefined,
  maxSizeBytes: number,
): ValidationResult {
  if (!file) {
    return { valid: false, error: "Datei ist erforderlich" };
  }

  if (file.size > maxSizeBytes) {
    const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Datei ist zu groß (max. ${maxSizeMB} MB)`,
    };
  }

  return { valid: true };
}

/**
 * Validates file type
 */
export function validateFileType(
  file: File | null | undefined,
  allowedTypes: string[],
): ValidationResult {
  if (!file) {
    return { valid: false, error: "Datei ist erforderlich" };
  }

  if (!allowedTypes.includes(file.type)) {
    const typesList = allowedTypes.join(", ");
    return {
      valid: false,
      error: `Ungültiger Dateityp. Erlaubt: ${typesList}`,
    };
  }

  return { valid: true };
}

// =============================================================================
// URL Validation
// =============================================================================

/**
 * Validates URL format
 */
export function validateUrl(url: string | null | undefined): ValidationResult {
  if (!url) {
    return { valid: false, error: "URL ist erforderlich" };
  }

  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, error: "Ungültige URL" };
  }
}

// =============================================================================
// Date Validation
// =============================================================================

/**
 * Validates that a date is not in the past
 */
export function validateFutureDate(
  date: string | Date | null | undefined,
  fieldName: string = "Datum",
): ValidationResult {
  if (!date) {
    return { valid: false, error: `${fieldName} ist erforderlich` };
  }

  const parsedDate = new Date(date);

  if (isNaN(parsedDate.getTime())) {
    return { valid: false, error: `Ungültiges ${fieldName}` };
  }

  if (parsedDate < new Date()) {
    return {
      valid: false,
      error: `${fieldName} darf nicht in der Vergangenheit liegen`,
    };
  }

  return { valid: true };
}

// =============================================================================
// Custom Validators
// =============================================================================

/**
 * Generic validator function type
 */
export type Validator<T = any> = (value: T) => ValidationResult;

/**
 * Combines multiple validators
 */
export function combineValidators<T = any>(
  ...validators: Validator<T>[]
): Validator<T> {
  return (value: T): ValidationResult => {
    for (const validator of validators) {
      const result = validator(value);
      if (!result.valid) {
        return result;
      }
    }
    return { valid: true };
  };
}
