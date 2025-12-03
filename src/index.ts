import 'dotenv/config';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { search, buildQuery, delay } from './google-search.js';
import { scrapeWithRetry } from './google-scraper.js';
import { parseSearchResults, ParseOptions } from './parser.js';
import { Lead, CompaniesConfig, SearchConfig, QueryBatch, GoogleSearchResponse } from './types.js';

// Configuration
const DELAY_BETWEEN_QUERIES_MS = 4000; // 4 seconds between queries (be nice to Google)
const MAX_QUERIES_PER_RUN = 20; // Limit per execution

// File paths
const COMPANIES_FILE = './data/target-companies.json';
const KEYWORDS_FILE = './data/search-keywords.json';
const OUTPUT_FILE = './output/leads.json';
const EXECUTED_QUERIES_FILE = './output/executed-queries.json';

// Search provider type
type SearchProvider = 'scraper' | 'google-cse';

async function executeSearch(
  query: string,
  provider: SearchProvider,
  apiKey?: string,
  cseId?: string
): Promise<GoogleSearchResponse> {
  if (provider === 'scraper') {
    return scrapeWithRetry(query);
  } else {
    if (!apiKey || !cseId) {
      throw new Error('Google CSE requires GOOGLE_API_KEY and GOOGLE_CSE_ID');
    }
    return search(query, apiKey, cseId);
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('Lead Scout - LinkedIn X-Ray Search');
  console.log('='.repeat(50));
  console.log('');

  // Determine search provider
  const provider: SearchProvider = (process.env.SEARCH_PROVIDER as SearchProvider) || 'google-cse';
  const apiKey = process.env.GOOGLE_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;

  console.log(`Search provider: ${provider}`);

  if (provider === 'google-cse') {
    if (!apiKey || !cseId) {
      console.error('ERROR: Missing GOOGLE_API_KEY or GOOGLE_CSE_ID');
      console.error('');
      console.error('Please create a .env file with:');
      console.error('  GOOGLE_API_KEY=your_api_key_here');
      console.error('  GOOGLE_CSE_ID=your_search_engine_id_here');
      console.error('');
      console.error('Or use SEARCH_PROVIDER=scraper to scrape Google directly.');
      process.exit(1);
    }
  } else {
    console.log('Using Puppeteer to scrape Google (same results as browser)');
  }
  console.log('');

  // Ensure output directory exists
  if (!existsSync('./output')) {
    mkdirSync('./output', { recursive: true });
  }

  // Load configuration
  if (!existsSync(COMPANIES_FILE)) {
    console.error(`ERROR: Companies file not found: ${COMPANIES_FILE}`);
    process.exit(1);
  }
  if (!existsSync(KEYWORDS_FILE)) {
    console.error(`ERROR: Keywords file not found: ${KEYWORDS_FILE}`);
    process.exit(1);
  }

  const companiesData: CompaniesConfig = JSON.parse(
    readFileSync(COMPANIES_FILE, 'utf-8')
  );
  const keywordsData: SearchConfig = JSON.parse(
    readFileSync(KEYWORDS_FILE, 'utf-8')
  );
  const companies = companiesData.companies;

  // Load existing data
  const existingLeads: Lead[] = existsSync(OUTPUT_FILE)
    ? JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'))
    : [];

  const executedQueries: Set<string> = new Set(
    existsSync(EXECUTED_QUERIES_FILE)
      ? JSON.parse(readFileSync(EXECUTED_QUERIES_FILE, 'utf-8'))
      : []
  );

  // Track existing LinkedIn URLs to avoid duplicates
  const existingUrls = new Set(existingLeads.map((l) => l.linkedinUrl));

  console.log(`Loaded ${companies.length} target companies`);
  console.log(`${existingLeads.length} existing leads in database`);
  console.log(`${executedQueries.size} previously executed queries`);
  console.log('');

  // Generate queries for each company
  // Strategy: Focus on topic keywords, not generic roles
  const queries: QueryBatch[] = [];
  const allTopics = keywordsData.topics;

  for (const company of companies) {
    // Query variant 1: Company + core agentic topics
    const q1 = buildQuery({
      company: company.name,
      topics: allTopics.slice(0, 3), // Agentic AI, AI Agents, Autonomous Agents
      exclusions: keywordsData.exclusions,
    });

    if (!executedQueries.has(q1)) {
      queries.push({ query: q1, company: company.name });
    }

    // Query variant 2: Company + additional topics
    const q2 = buildQuery({
      company: company.name,
      topics: allTopics.slice(3), // Multi-Agent, LLM Orchestration, AI Automation, Agent Framework
      exclusions: keywordsData.exclusions,
    });

    if (!executedQueries.has(q2)) {
      queries.push({ query: q2, company: company.name });
    }
  }

  const queriesToRun = queries.slice(0, MAX_QUERIES_PER_RUN);

  console.log(`Generated ${queries.length} new queries (not yet executed)`);
  console.log(`Will execute ${queriesToRun.length} queries this run`);
  console.log('');

  if (queriesToRun.length === 0) {
    console.log('No new queries to execute. All company/keyword combinations have been searched.');
    console.log('To re-run searches, delete output/executed-queries.json');
    return;
  }

  // Execute queries
  const newLeads: Lead[] = [];
  let queriesExecuted = 0;
  let totalResultsFound = 0;

  for (const { query, company } of queriesToRun) {
    queriesExecuted++;
    const progress = `[${queriesExecuted}/${queriesToRun.length}]`;
    console.log(`${progress} Searching: ${company}...`);

    try {
      const response = await executeSearch(query, provider, apiKey, cseId);
      const items = response.items || [];
      totalResultsFound += items.length;

      console.log(`  - Got ${items.length} results from Google`);

      // Parse with post-filtering: require at least one topic keyword match
      const parseOptions: ParseOptions = {
        queryUsed: query,
        topics: allTopics,
        requireTopicMatch: true, // Only keep leads that mention Agentic AI topics
      };
      const leads = parseSearchResults(items, parseOptions);
      let newCount = 0;
      let duplicateCount = 0;
      let filteredCount = items.length - leads.length;

      for (const lead of leads) {
        if (!existingUrls.has(lead.linkedinUrl)) {
          newLeads.push(lead);
          existingUrls.add(lead.linkedinUrl);
          newCount++;
        } else {
          duplicateCount++;
        }
      }

      console.log(
        `  - Parsed ${leads.length} leads (${filteredCount} filtered out): ${newCount} new, ${duplicateCount} duplicates`
      );

      // Mark query as executed (even if no results)
      executedQueries.add(query);
    } catch (error) {
      console.error(`  - ERROR: ${error}`);

      // Check if it's a quota error (for CSE) or block (for scraper)
      const errorMsg = String(error);
      if (errorMsg.includes('429') || errorMsg.includes('quota')) {
        console.error('');
        console.error('Daily quota exceeded. Try again tomorrow.');
        break;
      }
      if (errorMsg.includes('CAPTCHA') || errorMsg.includes('blocked')) {
        console.error('');
        console.error('Google may have blocked scraping. Try again later or use a VPN.');
        break;
      }
    }

    // Rate limiting delay (skip after last query)
    if (queriesExecuted < queriesToRun.length) {
      await delay(DELAY_BETWEEN_QUERIES_MS);
    }
  }

  // Save results
  const allLeads = [...existingLeads, ...newLeads];
  writeFileSync(OUTPUT_FILE, JSON.stringify(allLeads, null, 2));
  writeFileSync(
    EXECUTED_QUERIES_FILE,
    JSON.stringify([...executedQueries], null, 2)
  );

  // Summary
  console.log('');
  console.log('='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  console.log(`Queries executed:    ${queriesExecuted}`);
  console.log(`Google results:      ${totalResultsFound}`);
  console.log(`New leads found:     ${newLeads.length}`);
  console.log(`Total leads in DB:   ${allLeads.length}`);
  console.log('');
  console.log(`Output saved to:     ${OUTPUT_FILE}`);
  console.log('');
  console.log('To export to CSV, run: npm run export-csv');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
