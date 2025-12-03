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
      headless: 'new', // Use new headless mode (less detectable)
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled', // Hide automation
        '--disable-infobars',
        '--lang=en-US,en',
      ],
    });

    const page = await browser.newPage();

    // Set a realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Hide webdriver property
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      // @ts-ignore
      window.navigator.chrome = { runtime: {} };
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });

    // Navigate to Google
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20&hl=en`;
    console.log(`    Navigating to: ${searchUrl.substring(0, 80)}...`);

    await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Handle cookie consent if present (EU requirement)
    try {
      const consentButton = await page.$('button[id*="accept"], button[aria-label*="Accept"], div[role="dialog"] button');
      if (consentButton) {
        console.log('    Accepting cookie consent...');
        await consentButton.click();
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => {});
      }
    } catch (e) {
      // No consent dialog, continue
    }

    // Wait for search results to appear
    await page.waitForSelector('div#search, div#main', { timeout: 10000 }).catch(() => {
      console.log('    Warning: Could not find search results container');
    });

    // Additional wait for dynamic content
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Debug: Check page content
    const pageContent = await page.content();
    const hasResults = pageContent.includes('linkedin.com/in/');
    console.log(`    Page loaded, contains LinkedIn links: ${hasResults}`);

    // Check for CAPTCHA or blocking
    if (pageContent.includes('unusual traffic') || pageContent.includes('CAPTCHA')) {
      throw new Error('Google CAPTCHA detected - try again later or use a VPN');
    }

    // Extract search results
    const items = await page.evaluate((): GoogleSearchItem[] => {
      const results: GoogleSearchItem[] = [];

      // Try multiple selector strategies
      const selectors = [
        'div.g',                           // Standard results
        'div[data-hveid] a[href*="linkedin"]', // Results with hveid
        'a[href*="linkedin.com/in/"]',     // Direct LinkedIn links
      ];

      // Find all LinkedIn links on the page
      const allLinks = document.querySelectorAll('a[href*="linkedin.com/in/"]');

      allLinks.forEach((linkEl) => {
        try {
          const link = (linkEl as HTMLAnchorElement).href;

          // Skip if already processed or not a profile link
          if (!link.includes('linkedin.com/in/') || results.some(r => r.link === link)) return;

          // Find the parent container
          let container = linkEl.closest('div.g') || linkEl.closest('div[data-hveid]') || linkEl.parentElement?.parentElement?.parentElement;

          // Find title - try multiple approaches
          let title = '';
          const h3 = container?.querySelector('h3') || linkEl.querySelector('h3');
          if (h3) {
            title = h3.textContent?.trim() || '';
          } else {
            // Use link text or aria-label
            title = linkEl.textContent?.trim() || (linkEl as HTMLAnchorElement).getAttribute('aria-label') || '';
          }

          // Find snippet
          let snippet = '';
          const snippetEl = container?.querySelector('div[data-sncf], div.VwiC3b, span.aCOpRe, div[style*="-webkit-line-clamp"]');
          if (snippetEl) {
            snippet = snippetEl.textContent?.trim() || '';
          } else {
            // Try to find any text content near the link
            const textEls = container?.querySelectorAll('span, div');
            textEls?.forEach(el => {
              const text = el.textContent?.trim() || '';
              if (text.length > snippet.length && text.length < 500 && !text.includes('http')) {
                snippet = text;
              }
            });
          }

          if (title || snippet) {
            results.push({
              title: title || link,
              link,
              snippet,
              htmlSnippet: snippet,
              displayLink: link,
            });
          }
        } catch (e) {
          // Skip this result
        }
      });

      return results;
    });

    console.log(`    Extracted ${items.length} LinkedIn results`);

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
      console.log(`    Scrape attempt ${attempt} failed: ${error}`);

      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        const waitTime = attempt * 5000;
        console.log(`    Waiting ${waitTime / 1000}s before retry...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError || new Error('Scraping failed after retries');
}
