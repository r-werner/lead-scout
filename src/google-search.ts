import { GoogleSearchResponse } from './types.js';

const GOOGLE_API_URL = 'https://www.googleapis.com/customsearch/v1';

/**
 * Execute a Google Custom Search query
 */
export async function search(
  query: string,
  apiKey: string,
  cseId: string
): Promise<GoogleSearchResponse> {
  const url = new URL(GOOGLE_API_URL);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('cx', cseId);
  url.searchParams.set('q', query);

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
 * Build an X-Ray search query for LinkedIn
 */
export function buildQuery(options: {
  company?: string;
  roles?: string[];
  topics?: string[];
  exclusions?: string[];
}): string {
  const parts: string[] = ['site:linkedin.com/in'];

  // Add roles (OR clause)
  if (options.roles?.length) {
    const roleClause = options.roles.map((r) => `"${r}"`).join(' OR ');
    parts.push(`(${roleClause})`);
  }

  // Add topics (OR clause)
  if (options.topics?.length) {
    const topicClause = options.topics.map((t) => `"${t}"`).join(' OR ');
    parts.push(`(${topicClause})`);
  }

  // Add company filter
  if (options.company) {
    parts.push(`"${options.company}"`);
  }

  // Add exclusions
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
