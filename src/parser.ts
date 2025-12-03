import { GoogleSearchItem, Lead } from './types.js';

// Primary pattern: "Name - Role - Company | LinkedIn"
const PRIMARY_PATTERN = /^(.+?)\s*-\s*(.+?)\s*-\s*(.+?)\s*\|\s*LinkedIn$/i;

// Fallback: "Name - Role | LinkedIn" (no company in title)
const FALLBACK_PATTERN = /^(.+?)\s*-\s*(.+?)\s*\|\s*LinkedIn$/i;

/**
 * Extract profile image URL from Google's pagemap data
 */
function extractImageUrl(item: GoogleSearchItem): string | null {
  // Try cse_thumbnail first (usually has the profile picture)
  if (item.pagemap?.cse_thumbnail?.[0]?.src) {
    return item.pagemap.cse_thumbnail[0].src;
  }

  // Fall back to cse_image
  if (item.pagemap?.cse_image?.[0]?.src) {
    return item.pagemap.cse_image[0].src;
  }

  return null;
}

/**
 * Find which topic keywords appear in the text (case-insensitive)
 * Only matches complete phrases, not partial words
 */
function findMatchedTopics(text: string, topics: string[]): string[] {
  const lowerText = text.toLowerCase();
  return topics.filter((topic) => {
    const lowerTopic = topic.toLowerCase();
    // Use word boundary matching to avoid partial matches
    // e.g., "Agent" shouldn't match inside "reagent"
    const regex = new RegExp(`\\b${escapeRegex(lowerTopic)}\\b`, 'i');
    return regex.test(lowerText);
  });
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract location from LinkedIn snippet
 * Common patterns: "Berlin, Germany · ...", "San Francisco Bay Area · ...", "Location: ..."
 */
function extractLocation(snippet: string): string {
  if (!snippet) return '';

  // Pattern 1: Location at start followed by separator (most common)
  // e.g., "Berlin, Germany · 500+ connections"
  const startPattern = /^([A-Z][A-Za-z\s,]+(?:Area|Region|County)?)\s*[·•|]/;
  let match = snippet.match(startPattern);
  if (match) {
    return cleanText(match[1]);
  }

  // Pattern 2: "Location: City, Country" or "Location · City"
  const locationPattern = /Location[:\s·]+([A-Z][A-Za-z\s,]+?)(?:\s*[·•|]|\s*$)/i;
  match = snippet.match(locationPattern);
  if (match) {
    return cleanText(match[1]);
  }

  // Pattern 3: Look for common location patterns with country names
  const countryPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*(?:Germany|USA|UK|United States|United Kingdom|France|Netherlands|Switzerland|Austria|Spain|Italy|Canada|Australia|India|Singapore|Ireland|Sweden|Denmark|Norway|Finland|Belgium|Poland|Czech Republic|Israel))\b/;
  match = snippet.match(countryPattern);
  if (match) {
    return cleanText(match[1]);
  }

  // Pattern 4: "Greater X Area" or "X Metropolitan Area"
  const areaPattern = /\b((?:Greater\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Area|Metropolitan Area|Region))\b/;
  match = snippet.match(areaPattern);
  if (match) {
    return cleanText(match[1]);
  }

  return '';
}

/**
 * Parse a single Google search result into a Lead
 */
export function parseSearchResult(
  item: GoogleSearchItem,
  queryUsed: string,
  topics: string[] = []
): Lead | null {
  const { title, link, snippet, htmlSnippet } = item;

  // Skip if not a LinkedIn profile URL
  if (!link.includes('linkedin.com/in/')) {
    return null;
  }

  // Extract image URL from pagemap
  const imageUrl = extractImageUrl(item);

  // Find which topics match in TITLE + SNIPPET (combined)
  // Title often contains relevant keywords that aren't in the snippet
  const searchText = `${title} ${snippet || ''}`;
  const matchedTopics = findMatchedTopics(searchText, topics);

  // Extract location from snippet
  const location = extractLocation(snippet || '');

  // Try primary pattern first: "Name - Role - Company | LinkedIn"
  let match = title.match(PRIMARY_PATTERN);

  if (match) {
    const [, name, role, companyPart] = match;
    // Clean up company (remove any trailing " | LinkedIn" remnants)
    const company = companyPart.replace(/\s*\|.*$/, '').trim();

    return {
      name: cleanText(name),
      role: cleanText(role),
      company: cleanText(company),
      location,
      linkedinUrl: link,
      snippet: snippet || '',
      htmlSnippet: htmlSnippet || snippet || '',
      imageUrl,
      confidence: detectTruncation(title) ? 'low' : 'high',
      matchedTopics,
      queryUsed,
      discoveredAt: new Date().toISOString(),
    };
  }

  // Try fallback pattern: "Name - Role | LinkedIn"
  match = title.match(FALLBACK_PATTERN);
  if (match) {
    const [, name, role] = match;
    const company = extractCompanyFromSnippet(snippet);

    return {
      name: cleanText(name),
      role: cleanText(role),
      company,
      location,
      linkedinUrl: link,
      snippet: snippet || '',
      htmlSnippet: htmlSnippet || snippet || '',
      imageUrl,
      confidence: 'medium',
      matchedTopics,
      queryUsed,
      discoveredAt: new Date().toISOString(),
    };
  }

  // Could not parse - title doesn't match expected LinkedIn format
  return null;
}

/**
 * Options for parsing search results
 */
export interface ParseOptions {
  queryUsed: string;
  topics?: string[]; // Topic keywords for filtering
  requireTopicMatch?: boolean; // If true, only return leads with at least one topic match
}

/**
 * Parse all results from a Google search response
 * With optional post-filtering to require topic keyword matches
 */
export function parseSearchResults(
  items: GoogleSearchItem[],
  options: ParseOptions
): Lead[] {
  const { queryUsed, topics = [], requireTopicMatch = false } = options;
  const leads: Lead[] = [];
  const filtered: string[] = [];

  for (const item of items) {
    const lead = parseSearchResult(item, queryUsed, topics);
    if (lead) {
      // If filtering is enabled, only include leads that match at least one topic
      if (requireTopicMatch && lead.matchedTopics.length === 0) {
        filtered.push(`${lead.name} @ ${lead.company}`);
        continue; // Skip - no topic keywords found
      }
      leads.push(lead);
    }
  }

  // Log filtered results for debugging
  if (filtered.length > 0) {
    console.log(`    Filtered out (no topic match): ${filtered.join(', ')}`);
  }

  return leads;
}

/**
 * Check if title appears truncated (contains "...")
 */
function detectTruncation(title: string): boolean {
  return title.includes('...');
}

/**
 * Try to extract company name from snippet when not in title
 */
function extractCompanyFromSnippet(snippet: string): string {
  if (!snippet) {
    return 'Unknown';
  }

  // Common patterns in LinkedIn snippets: "at Company" or "@ Company"
  const patterns = [
    /(?:^|\s)at\s+([A-Z][A-Za-z0-9\s&.]+?)(?:\s*[·•|,.]|\s+[-–]|\s*$)/,
    /(?:^|\s)@\s*([A-Z][A-Za-z0-9\s&.]+?)(?:\s*[·•|,.]|\s+[-–]|\s*$)/,
    /(?:works at|working at)\s+([A-Z][A-Za-z0-9\s&.]+?)(?:\s*[·•|,.]|\s+[-–]|\s*$)/i,
  ];

  for (const pattern of patterns) {
    const match = snippet.match(pattern);
    if (match) {
      return cleanText(match[1]);
    }
  }

  return 'Unknown';
}

/**
 * Clean up extracted text
 */
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\.{2,}/g, '') // Remove ellipsis
    .replace(/^\s+|\s+$/g, '') // Trim
    .trim();
}
