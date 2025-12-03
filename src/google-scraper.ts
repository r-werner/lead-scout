import puppeteer, { Browser, Page } from 'puppeteer';
import { GoogleSearchItem, GoogleSearchResponse } from './types.js';

/**
 * Scrape Google search results using Puppeteer
 * Returns results in the same format as Google Custom Search API
 */
export async function scrapeGoogleSearch(query: string): Promise<GoogleSearchResponse> {
  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
      ],
    });

    const page = await browser.newPage();

    // Set a realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate to Google
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for results to load
    await page.waitForSelector('div#search', { timeout: 10000 }).catch(() => {
      // Sometimes the selector is different
    });

    // Small delay to let dynamic content load
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Extract search results
    const items = await page.evaluate((): GoogleSearchItem[] => {
      const results: GoogleSearchItem[] = [];

      // Find all search result containers
      // Google's structure varies, try multiple selectors
      const resultElements = document.querySelectorAll('div.g, div[data-hveid]');

      resultElements.forEach((el) => {
        try {
          // Find the link
          const linkEl = el.querySelector('a[href^="http"]') as HTMLAnchorElement;
          if (!linkEl) return;

          const link = linkEl.href;

          // Skip non-LinkedIn links
          if (!link.includes('linkedin.com/in/')) return;

          // Find the title
          const titleEl = el.querySelector('h3');
          const title = titleEl?.textContent?.trim() || '';

          // Find the snippet
          const snippetEl = el.querySelector('div[data-sncf], div.VwiC3b, span.aCOpRe');
          const snippet = snippetEl?.textContent?.trim() || '';

          // Find the displayed URL
          const displayUrl = link;

          if (title && link) {
            results.push({
              title,
              link,
              snippet,
              htmlSnippet: snippet,
              displayLink: displayUrl,
            });
          }
        } catch (e) {
          // Skip this result if there's an error
        }
      });

      return results;
    });

    return {
      items: items.length > 0 ? items : undefined,
      searchInformation: {
        totalResults: String(items.length),
        searchTime: 0,
      },
    };
  } catch (error) {
    throw new Error(`Scraping failed: ${error}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Scrape with retry logic and rate limiting
 */
export async function scrapeWithRetry(
  query: string,
  maxRetries: number = 2
): Promise<GoogleSearchResponse> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await scrapeGoogleSearch(query);
    } catch (error) {
      lastError = error as Error;
      console.log(`  Scrape attempt ${attempt} failed: ${error}`);

      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        const waitTime = attempt * 3000;
        console.log(`  Waiting ${waitTime / 1000}s before retry...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError || new Error('Scraping failed after retries');
}
