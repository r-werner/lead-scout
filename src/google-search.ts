import { GoogleSearchResponse, GoogleSearchItem } from './types.js';

const GOOGLE_API_URL = 'https://www.googleapis.com/customsearch/v1';
const RESULTS_PER_PAGE = 10;
const MAX_PAGES = 5; // Max 5 pages = 50 results per query (costs 5 API calls)
const DELAY_BETWEEN_PAGES_MS = 1000; // 1 second between pagination requests

/**
 * Execute a single Google Custom Search query (one page)
 */
export async function search(
  query: string,
  apiKey: string,
  cseId: string,
  start: number = 1
): Promise<GoogleSearchResponse> {
  const url = new URL(GOOGLE_API_URL);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('cx', cseId);
  url.searchParams.set('q', query);
  url.searchParams.set('num', String(RESULTS_PER_PAGE));
  if (start > 1) {
    url.searchParams.set('start', String(start));
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as GoogleSearchResponse;

  // Check for API-level errors
  if (data.error) {
    throw new Error(`Google API error (${data.error.code}): ${data.error.message}`);
  }

  return data;
}

/**
 * Execute a Google Custom Search query with pagination
 * Fetches multiple pages to get more results (each page costs 1 API call)
 */
export async function searchWithPagination(
  query: string,
  apiKey: string,
  cseId: string,
  maxPages: number = MAX_PAGES
): Promise<{ items: GoogleSearchItem[]; apiCallsUsed: number }> {
  const allItems: GoogleSearchItem[] = [];
  let apiCallsUsed = 0;

  for (let page = 0; page < maxPages; page++) {
    const start = page * RESULTS_PER_PAGE + 1;

    // Google CSE free tier only allows up to start=91
    if (start > 91) break;

    const response = await search(query, apiKey, cseId, start);
    apiCallsUsed++;

    const items = response.items || [];
    allItems.push(...items);

    // Log pagination progress
    if (page > 0) {
      console.log(`    Page ${page + 1}: +${items.length} results`);
    }

    // Stop if we got fewer than 10 results (no more pages)
    if (items.length < RESULTS_PER_PAGE) {
      break;
    }

    // Rate limit between pages (skip after last page)
    if (page < maxPages - 1 && items.length === RESULTS_PER_PAGE) {
      await delay(DELAY_BETWEEN_PAGES_MS);
    }
  }

  return { items: allItems, apiCallsUsed };
}

/**
 * Build an X-Ray search query for LinkedIn
 *
 * Strategy: Topics are PRIMARY (required), company is secondary context.
 * Generic roles like "Lead", "Senior" are too common and add noise.
 */
export function buildQuery(options: {
  company?: string;
  topics?: string[];
  exclusions?: string[];
}): string {
  const parts: string[] = ['site:linkedin.com/in'];

  // Topics are the PRIMARY filter - these are what we're actually searching for
  // Each topic should be quoted to match exact phrases
  if (options.topics?.length) {
    const topicClause = options.topics.map((t) => `"${t}"`).join(' OR ');
    parts.push(`(${topicClause})`);
  }

  // Company as context - helps find people at specific companies
  // But topics take priority
  if (options.company) {
    parts.push(`"${options.company}"`);
  }

  // Add exclusions to filter out noise
  if (options.exclusions?.length) {
    parts.push(...options.exclusions);
  }

  return parts.join(' ');
}

/**
 * Simple delay function for rate limiting
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
