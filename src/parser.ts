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
 * Parse a single Google search result into a Lead
 */
export function parseSearchResult(
  item: GoogleSearchItem,
  queryUsed: string
): Lead | null {
  const { title, link, snippet, htmlSnippet } = item;

  // Skip if not a LinkedIn profile URL
  if (!link.includes('linkedin.com/in/')) {
    return null;
  }

  // Extract image URL from pagemap
  const imageUrl = extractImageUrl(item);

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
      linkedinUrl: link,
      snippet: snippet || '',
      htmlSnippet: htmlSnippet || snippet || '',
      imageUrl,
      confidence: detectTruncation(title) ? 'low' : 'high',
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
      linkedinUrl: link,
      snippet: snippet || '',
      htmlSnippet: htmlSnippet || snippet || '',
      imageUrl,
      confidence: 'medium',
      queryUsed,
      discoveredAt: new Date().toISOString(),
    };
  }

  // Could not parse - title doesn't match expected LinkedIn format
  return null;
}

/**
 * Parse all results from a Google search response
 */
export function parseSearchResults(
  items: GoogleSearchItem[],
  queryUsed: string
): Lead[] {
  const leads: Lead[] = [];

  for (const item of items) {
    const lead = parseSearchResult(item, queryUsed);
    if (lead) {
      leads.push(lead);
    }
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
