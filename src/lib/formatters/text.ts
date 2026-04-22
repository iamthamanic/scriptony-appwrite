/**
 * Text Formatting Utilities
 *
 * Functions for text manipulation, truncation, slug generation, etc.
 */

// =============================================================================
// Truncation & Ellipsis
// =============================================================================

/**
 * Truncates text to a maximum length with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length (including ellipsis)
 * @param ellipsis - Ellipsis string (default: '...')
 * @returns Truncated text
 */
export function truncate(
  text: string | null | undefined,
  maxLength: number,
  ellipsis: string = "...",
): string {
  if (!text) return "";

  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Truncates text at word boundary
 */
export function truncateWords(
  text: string | null | undefined,
  maxWords: number,
  ellipsis: string = "...",
): string {
  if (!text) return "";

  const words = text.split(/\s+/);

  if (words.length <= maxWords) {
    return text;
  }

  return words.slice(0, maxWords).join(" ") + ellipsis;
}

// =============================================================================
// Case Conversion
// =============================================================================

/**
 * Converts text to Title Case
 */
export function toTitleCase(text: string | null | undefined): string {
  if (!text) return "";

  return text
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Converts text to camelCase
 */
export function toCamelCase(text: string | null | undefined): string {
  if (!text) return "";

  return text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
}

/**
 * Converts text to kebab-case
 */
export function toKebabCase(text: string | null | undefined): string {
  if (!text) return "";

  return text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Converts text to snake_case
 */
export function toSnakeCase(text: string | null | undefined): string {
  if (!text) return "";

  return text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// =============================================================================
// Slug Generation
// =============================================================================

/**
 * Generates a URL-safe slug from text
 *
 * @param text - Text to slugify
 * @param maxLength - Maximum length of slug
 * @returns URL-safe slug
 */
export function slugify(
  text: string | null | undefined,
  maxLength: number = 60,
): string {
  if (!text) return "";

  let slug = text
    .toLowerCase()
    .normalize("NFD") // Decompose characters
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens

  if (slug.length > maxLength) {
    slug = slug.slice(0, maxLength).replace(/-[^-]*$/, "");
  }

  return slug;
}

// =============================================================================
// String Helpers
// =============================================================================

/**
 * Capitalizes the first letter of a string
 */
export function capitalize(text: string | null | undefined): string {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Removes extra whitespace and trims
 */
export function cleanWhitespace(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Strips HTML tags from text
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "");
}

/**
 * Escapes HTML special characters
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";

  const htmlEscapes: Record<string, string> = {
    "&": "&",
    "<": "<",
    ">": ">",
    '"': "&quot;",
    "'": "&#39;",
  };

  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

/**
 * Pluralizes a word based on count
 */
export function pluralize(
  count: number,
  singular: string,
  plural?: string,
  includeCount: boolean = true,
): string {
  const pluralForm = plural || `${singular}s`;
  const word = count === 1 ? singular : pluralForm;

  return includeCount ? `${count} ${word}` : word;
}

/**
 * Generates initials from a name
 */
export function getInitials(
  name: string | null | undefined,
  maxChars: number = 2,
): string {
  if (!name) return "";

  const words = name.trim().split(/\s+/);

  if (words.length === 1) {
    return words[0].slice(0, maxChars).toUpperCase();
  }

  return words
    .slice(0, maxChars)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/**
 * Highlights a search term in text
 */
export function highlightText(
  text: string | null | undefined,
  searchTerm: string | null | undefined,
  highlightClass: string = "bg-yellow-200 dark:bg-yellow-800",
): string {
  if (!text || !searchTerm) return text || "";

  const regex = new RegExp(`(${searchTerm})`, "gi");
  return text.replace(regex, `<mark class="${highlightClass}">$1</mark>`);
}

/**
 * Formats a list of items into a comma-separated string
 */
export function formatList(
  items: string[],
  locale: "de" | "en" = "de",
): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];

  const lastItem = items[items.length - 1];
  const otherItems = items.slice(0, -1);
  const separator = locale === "de" ? " und " : " and ";

  return `${otherItems.join(", ")}${separator}${lastItem}`;
}

/**
 * Extracts mentions from text (e.g., @username)
 */
export function extractMentions(text: string | null | undefined): string[] {
  if (!text) return [];

  const mentionRegex = /@(\w+)/g;
  const matches = text.matchAll(mentionRegex);

  return Array.from(matches, (match) => match[1]);
}

/**
 * Extracts hashtags from text
 */
export function extractHashtags(text: string | null | undefined): string[] {
  if (!text) return [];

  const hashtagRegex = /#(\w+)/g;
  const matches = text.matchAll(hashtagRegex);

  return Array.from(matches, (match) => match[1]);
}

/**
 * Calculates reading time for text (in minutes)
 */
export function calculateReadingTime(
  text: string | null | undefined,
  wordsPerMinute: number = 200,
): number {
  if (!text) return 0;

  const wordCount = text.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Wraps long words to prevent overflow
 */
export function wrapLongWords(
  text: string | null | undefined,
  maxLength: number = 40,
): string {
  if (!text) return "";

  return text
    .split(/\s+/)
    .map((word) => {
      if (word.length > maxLength) {
        return (
          word.match(new RegExp(`.{1,${maxLength}}`, "g"))?.join("\u200B") ||
          word
        );
      }
      return word;
    })
    .join(" ");
}
