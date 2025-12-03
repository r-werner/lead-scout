# Module A: Google Search (LinkedIn X-Ray) - Simplified Implementation Plan

## Overview

**Purpose:** Extract LinkedIn profile data for "Agentic AI" professionals using Google Custom Search API
**Language:** TypeScript
**Approach:** Simple script-based execution, minimal dependencies, JSON/CSV output
**Daily Quota:** 100 free queries/day

---

## 1. Google API Setup (One-Time)

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a project" → "New Project"
3. Name: `lead-scout` → Click "Create"
4. Wait for project creation (10-30 seconds)

### Step 2: Enable Custom Search API

1. In Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Custom Search API"
3. Click on "Custom Search API"
4. Click "Enable"

### Step 3: Create API Key

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy the API key (looks like: `AIzaSy...`)
4. **Optional but recommended:** Click "Edit API key" → Under "API restrictions":
   - Select "Restrict key"
   - Choose "Custom Search API" only
   - Click "Save"

### Step 4: Create Programmable Search Engine

1. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/controlpanel/all)
2. Click "Add" (or "New search engine")
3. Configure:
   - **What to search:** Select "Search the entire web"
   - **Search engine name:** `linkedin-xray`
4. Click "Create"
5. Click "Customize" → Copy the "Search engine ID" (looks like: `a1b2c3d4e5f6...`)

### Step 5: Test Your Setup

Run this curl command (replace with your values):

```bash
curl "https://www.googleapis.com/customsearch/v1?key=YOUR_API_KEY&cx=YOUR_CSE_ID&q=site:linkedin.com/in+%22AI+Engineer%22"
```

You should get a JSON response with search results.

---

## 2. Project Structure (Simplified)

```
lead-scout/
├── src/
│   ├── index.ts              # Main entry point - runs the search
│   ├── google-search.ts      # API client + query builder
│   ├── parser.ts             # Parse search results
│   └── types.ts              # TypeScript interfaces
├── data/
│   ├── target-companies.json # Editable company list
│   ├── search-keywords.json  # Editable search terms
│   └── executed-queries.json # Track what's been run (prevents duplicates)
├── output/
│   └── leads.json            # Output file (append mode)
├── .env                      # API credentials (git-ignored)
├── .env.example              # Template for credentials
├── package.json
├── tsconfig.json
└── README.md
```

---

## 3. Dependencies (Minimal)

```json
{
  "name": "lead-scout",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "search": "tsx src/index.ts",
    "export-csv": "tsx src/export-csv.ts"
  },
  "dependencies": {
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "tsx": "^4.7.0",
    "@types/node": "^20.11.0"
  }
}
```

**Note:** No SQLite, no CLI framework, no logging framework. Just the essentials.

---

## 4. Configuration Files

### 4.1 Environment Variables (`.env`)

```bash
GOOGLE_API_KEY=AIzaSy...your-key-here
GOOGLE_CSE_ID=abc123...your-cse-id
```

### 4.2 Target Companies (`data/target-companies.json`)

Editable JSON file - add/remove companies as needed:

```json
{
  "description": "Target companies for LinkedIn X-Ray search",
  "lastUpdated": "2024-01-15",
  "companies": [
    {
      "name": "Microsoft",
      "priority": 1,
      "notes": "Major AI investments, Copilot"
    },
    {
      "name": "Google",
      "priority": 1,
      "notes": "DeepMind, Gemini"
    },
    {
      "name": "Salesforce",
      "priority": 1,
      "notes": "Einstein AI, Agentforce"
    },
    {
      "name": "OpenAI",
      "priority": 1,
      "notes": "GPT, ChatGPT"
    },
    {
      "name": "Anthropic",
      "priority": 1,
      "notes": "Claude"
    },
    {
      "name": "Meta",
      "priority": 2,
      "notes": "LLaMA"
    },
    {
      "name": "Amazon",
      "priority": 2,
      "notes": "AWS AI, Bedrock"
    },
    {
      "name": "Databricks",
      "priority": 2,
      "notes": "Data + AI platform"
    },
    {
      "name": "Snowflake",
      "priority": 2,
      "notes": "Data cloud, Cortex AI"
    },
    {
      "name": "Datadog",
      "priority": 2,
      "notes": "Observability, AI ops"
    },
    {
      "name": "Stripe",
      "priority": 2,
      "notes": "Fintech, AI fraud detection"
    },
    {
      "name": "Docusign",
      "priority": 2,
      "notes": "Hiring for Agentic AI roles"
    },
    {
      "name": "ServiceNow",
      "priority": 2,
      "notes": "Enterprise AI workflows"
    },
    {
      "name": "Workday",
      "priority": 2,
      "notes": "HR AI, enterprise"
    },
    {
      "name": "Adobe",
      "priority": 2,
      "notes": "Firefly, creative AI"
    },
    {
      "name": "Notion",
      "priority": 3,
      "notes": "AI features"
    },
    {
      "name": "Figma",
      "priority": 3,
      "notes": "Design AI"
    },
    {
      "name": "Hugging Face",
      "priority": 3,
      "notes": "Open source AI hub"
    },
    {
      "name": "Scale AI",
      "priority": 3,
      "notes": "Data labeling, enterprise AI"
    },
    {
      "name": "Cohere",
      "priority": 3,
      "notes": "Enterprise LLMs"
    }
  ]
}
```

### 4.3 Search Keywords (`data/search-keywords.json`)

Editable search terms:

```json
{
  "description": "Keywords for X-Ray search queries",
  "roles": [
    "Head",
    "Lead",
    "Principal",
    "Director",
    "VP",
    "Chief",
    "Staff",
    "Senior",
    "Architect",
    "Manager"
  ],
  "topics": [
    "Agentic AI",
    "AI Agents",
    "Autonomous Agents",
    "Multi-Agent",
    "LLM Orchestration",
    "AI Automation",
    "Agent Framework"
  ],
  "exclusions": [
    "-intitle:\"profiles\"",
    "-inurl:\"/dir/\"",
    "-inurl:\"/jobs/\"",
    "-recruiter",
    "-\"hiring for\"",
    "-\"open to work\""
  ]
}
```

---

## 5. Implementation Tasks

### Phase 1: Setup (Tasks 1-5)

| Task | Description | Status |
|------|-------------|--------|
| **T1** | Create project directory and `npm init` | [ ] |
| **T2** | Install dependencies (`npm install`) | [ ] |
| **T3** | Create `tsconfig.json` | [ ] |
| **T4** | Create `.env` and `.env.example` | [ ] |
| **T5** | Create data JSON files (companies, keywords) | [ ] |

### Phase 2: Core Implementation (Tasks 6-10)

| Task | Description | Status |
|------|-------------|--------|
| **T6** | Implement `types.ts` - TypeScript interfaces | [ ] |
| **T7** | Implement `google-search.ts` - API client + query builder | [ ] |
| **T8** | Implement `parser.ts` - Extract name/role/company from results | [ ] |
| **T9** | Implement `index.ts` - Main script that ties it together | [ ] |
| **T10** | Implement `export-csv.ts` - Convert JSON output to CSV | [ ] |

### Phase 3: Testing & Refinement (Tasks 11-13)

| Task | Description | Status |
|------|-------------|--------|
| **T11** | Test with 1-2 queries manually | [ ] |
| **T12** | Run full batch and review output | [ ] |
| **T13** | Adjust parsing logic if needed based on real results | [ ] |

---

## 6. Component Specifications

### 6.1 Types (`src/types.ts`)

```typescript
// Lead extracted from search results
export interface Lead {
  name: string;
  role: string;
  company: string;
  linkedinUrl: string;
  snippet: string;
  confidence: 'high' | 'medium' | 'low';
  queryUsed: string;
  discoveredAt: string;  // ISO date string
}

// Google Custom Search API response
export interface GoogleSearchResponse {
  items?: GoogleSearchItem[];
  searchInformation?: {
    totalResults: string;
  };
}

export interface GoogleSearchItem {
  title: string;
  link: string;
  snippet: string;
}

// Config file types
export interface TargetCompany {
  name: string;
  priority: number;
  notes?: string;
}

export interface SearchConfig {
  roles: string[];
  topics: string[];
  exclusions: string[];
}
```

### 6.2 Google Search Client (`src/google-search.ts`)

```typescript
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
    const error = await response.text();
    throw new Error(`Google API error (${response.status}): ${error}`);
  }

  return response.json();
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
    const roleClause = options.roles.map(r => `"${r}"`).join(' OR ');
    parts.push(`(${roleClause})`);
  }

  // Add topics (OR clause)
  if (options.topics?.length) {
    const topicClause = options.topics.map(t => `"${t}"`).join(' OR ');
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
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 6.3 Result Parser (`src/parser.ts`)

```typescript
import { GoogleSearchItem, Lead } from './types.js';

// Primary pattern: "Name - Role - Company | LinkedIn"
const PRIMARY_PATTERN = /^(.+?)\s*-\s*(.+?)\s*-\s*(.+?)\s*\|\s*LinkedIn$/i;

// Fallback: "Name - Role | LinkedIn" (no company in title)
const FALLBACK_PATTERN = /^(.+?)\s*-\s*(.+?)\s*\|\s*LinkedIn$/i;

/**
 * Parse a single Google search result into a Lead
 */
export function parseSearchResult(
  item: GoogleSearchItem,
  queryUsed: string
): Lead | null {
  const { title, link, snippet } = item;

  // Skip if not a LinkedIn profile URL
  if (!link.includes('linkedin.com/in/')) {
    return null;
  }

  // Try primary pattern first
  let match = title.match(PRIMARY_PATTERN);
  let confidence: 'high' | 'medium' | 'low' = 'high';

  if (match) {
    const [, name, role, company] = match;
    return {
      name: cleanText(name),
      role: cleanText(role),
      company: cleanText(company.replace(/\s*\|.*$/, '')),
      linkedinUrl: link,
      snippet,
      confidence: detectTruncation(title) ? 'low' : 'high',
      queryUsed,
      discoveredAt: new Date().toISOString(),
    };
  }

  // Try fallback pattern
  match = title.match(FALLBACK_PATTERN);
  if (match) {
    const [, name, role] = match;
    const company = extractCompanyFromSnippet(snippet);
    return {
      name: cleanText(name),
      role: cleanText(role),
      company,
      linkedinUrl: link,
      snippet,
      confidence: 'medium',
      queryUsed,
      discoveredAt: new Date().toISOString(),
    };
  }

  // Could not parse
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
 * Check if title appears truncated
 */
function detectTruncation(title: string): boolean {
  return title.includes('...');
}

/**
 * Try to extract company name from snippet
 */
function extractCompanyFromSnippet(snippet: string): string {
  // Common patterns: "at Company" or "@ Company"
  const patterns = [
    /(?:at|@)\s+([A-Z][A-Za-z0-9\s&]+?)(?:\s*[·•|,]|$)/,
    /(?:works at|working at)\s+([A-Z][A-Za-z0-9\s&]+?)(?:\s*[·•|,]|$)/i,
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
    .replace(/\s+/g, ' ')
    .replace(/\.{2,}/g, '')
    .trim();
}
```

### 6.4 Main Script (`src/index.ts`)

```typescript
import 'dotenv/config';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { search, buildQuery, delay } from './google-search.js';
import { parseSearchResults } from './parser.js';
import { Lead, TargetCompany, SearchConfig } from './types.js';

// Configuration
const DELAY_BETWEEN_QUERIES_MS = 2500;  // 2.5 seconds between API calls
const MAX_QUERIES_PER_RUN = 20;         // Limit per execution (100/day max)

// File paths
const COMPANIES_FILE = './data/target-companies.json';
const KEYWORDS_FILE = './data/search-keywords.json';
const OUTPUT_FILE = './output/leads.json';
const EXECUTED_QUERIES_FILE = './data/executed-queries.json';

async function main() {
  // Check environment variables
  const apiKey = process.env.GOOGLE_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;

  if (!apiKey || !cseId) {
    console.error('ERROR: Missing GOOGLE_API_KEY or GOOGLE_CSE_ID in .env file');
    process.exit(1);
  }

  // Load configuration
  const companiesData = JSON.parse(readFileSync(COMPANIES_FILE, 'utf-8'));
  const keywordsData: SearchConfig = JSON.parse(readFileSync(KEYWORDS_FILE, 'utf-8'));
  const companies: TargetCompany[] = companiesData.companies;

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
  const existingUrls = new Set(existingLeads.map(l => l.linkedinUrl));

  console.log(`Starting search...`);
  console.log(`- Loaded ${companies.length} target companies`);
  console.log(`- ${existingLeads.length} existing leads`);
  console.log(`- ${executedQueries.size} previously executed queries`);
  console.log('');

  // Generate queries
  const queries: { query: string; company: string }[] = [];

  for (const company of companies) {
    // Query variant 1: Company + broad topics
    const q1 = buildQuery({
      company: company.name,
      roles: keywordsData.roles.slice(0, 5),  // Top 5 roles
      topics: keywordsData.topics.slice(0, 2), // Top 2 topics
      exclusions: keywordsData.exclusions,
    });

    if (!executedQueries.has(q1)) {
      queries.push({ query: q1, company: company.name });
    }

    // Query variant 2: Company + different topic combination
    const q2 = buildQuery({
      company: company.name,
      roles: keywordsData.roles.slice(0, 3),
      topics: keywordsData.topics.slice(2, 4),
      exclusions: keywordsData.exclusions,
    });

    if (!executedQueries.has(q2)) {
      queries.push({ query: q2, company: company.name });
    }
  }

  console.log(`Generated ${queries.length} new queries to execute`);
  console.log(`Will execute up to ${MAX_QUERIES_PER_RUN} queries this run`);
  console.log('');

  // Execute queries
  const newLeads: Lead[] = [];
  let queriesExecuted = 0;

  for (const { query, company } of queries.slice(0, MAX_QUERIES_PER_RUN)) {
    queriesExecuted++;
    console.log(`[${queriesExecuted}/${Math.min(queries.length, MAX_QUERIES_PER_RUN)}] Searching: ${company}...`);

    try {
      const response = await search(query, apiKey, cseId);
      const items = response.items || [];

      console.log(`  - Got ${items.length} results`);

      const leads = parseSearchResults(items, query);
      let newCount = 0;

      for (const lead of leads) {
        if (!existingUrls.has(lead.linkedinUrl)) {
          newLeads.push(lead);
          existingUrls.add(lead.linkedinUrl);
          newCount++;
        }
      }

      console.log(`  - Parsed ${leads.length} leads, ${newCount} new`);

      // Mark query as executed
      executedQueries.add(query);

    } catch (error) {
      console.error(`  - ERROR: ${error}`);
    }

    // Rate limiting delay
    if (queriesExecuted < Math.min(queries.length, MAX_QUERIES_PER_RUN)) {
      await delay(DELAY_BETWEEN_QUERIES_MS);
    }
  }

  // Save results
  const allLeads = [...existingLeads, ...newLeads];
  writeFileSync(OUTPUT_FILE, JSON.stringify(allLeads, null, 2));
  writeFileSync(EXECUTED_QUERIES_FILE, JSON.stringify([...executedQueries], null, 2));

  // Summary
  console.log('');
  console.log('=== SUMMARY ===');
  console.log(`Queries executed: ${queriesExecuted}`);
  console.log(`New leads found: ${newLeads.length}`);
  console.log(`Total leads: ${allLeads.length}`);
  console.log(`Output saved to: ${OUTPUT_FILE}`);
}

main().catch(console.error);
```

### 6.5 CSV Export Script (`src/export-csv.ts`)

```typescript
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { Lead } from './types.js';

const INPUT_FILE = './output/leads.json';
const OUTPUT_FILE = './output/leads.csv';

function main() {
  if (!existsSync(INPUT_FILE)) {
    console.error(`No leads file found at ${INPUT_FILE}`);
    process.exit(1);
  }

  const leads: Lead[] = JSON.parse(readFileSync(INPUT_FILE, 'utf-8'));

  // CSV header
  const headers = ['name', 'role', 'company', 'linkedinUrl', 'confidence', 'discoveredAt'];

  // Escape CSV value
  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  // Build CSV
  const rows = [
    headers.join(','),
    ...leads.map(lead =>
      headers.map(h => escapeCSV(String(lead[h as keyof Lead] || ''))).join(',')
    ),
  ];

  writeFileSync(OUTPUT_FILE, rows.join('\n'));

  console.log(`Exported ${leads.length} leads to ${OUTPUT_FILE}`);
}

main();
```

---

## 7. TypeScript Configuration

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 8. Usage

### First-Time Setup

```bash
# 1. Clone/create project
mkdir lead-scout && cd lead-scout

# 2. Initialize and install
npm init -y
npm install dotenv
npm install -D typescript tsx @types/node

# 3. Create .env file with your credentials
cp .env.example .env
# Edit .env with your Google API key and CSE ID

# 4. Create necessary directories
mkdir -p data output

# 5. Create the JSON config files (see Section 4)
```

### Running the Search

```bash
# Run the search script
npm run search

# After searching, export to CSV
npm run export-csv
```

### Adjusting the Search

1. **Add/remove target companies:** Edit `data/target-companies.json`
2. **Change search keywords:** Edit `data/search-keywords.json`
3. **Increase queries per run:** Edit `MAX_QUERIES_PER_RUN` in `src/index.ts`
4. **Reset query history:** Delete `data/executed-queries.json`

---

## 9. Output Format

### JSON Output (`output/leads.json`)

```json
[
  {
    "name": "John Smith",
    "role": "Head of AI Agents",
    "company": "Microsoft",
    "linkedinUrl": "https://www.linkedin.com/in/johnsmith",
    "snippet": "Head of AI Agents at Microsoft. Building autonomous systems...",
    "confidence": "high",
    "queryUsed": "site:linkedin.com/in (\"Head\" OR \"Lead\") (\"Agentic AI\") \"Microsoft\"",
    "discoveredAt": "2024-01-15T10:30:00.000Z"
  }
]
```

### CSV Output (`output/leads.csv`)

```csv
name,role,company,linkedinUrl,confidence,discoveredAt
John Smith,Head of AI Agents,Microsoft,https://www.linkedin.com/in/johnsmith,high,2024-01-15T10:30:00.000Z
```

---

## 10. Execution Checklist

### Setup Phase
- [ ] **T1** Create Google Cloud project and enable Custom Search API
- [ ] **T2** Create API key and Programmable Search Engine
- [ ] **T3** Test API with curl command
- [ ] **T4** Initialize npm project and install dependencies
- [ ] **T5** Create `.env` file with credentials
- [ ] **T6** Create `data/target-companies.json`
- [ ] **T7** Create `data/search-keywords.json`
- [ ] **T8** Create `tsconfig.json`

### Implementation Phase
- [ ] **T9** Implement `src/types.ts`
- [ ] **T10** Implement `src/google-search.ts`
- [ ] **T11** Implement `src/parser.ts`
- [ ] **T12** Implement `src/index.ts`
- [ ] **T13** Implement `src/export-csv.ts`

### Testing Phase
- [ ] **T14** Run with 1-2 queries to verify it works
- [ ] **T15** Review output JSON for quality
- [ ] **T16** Run full batch (20 queries)
- [ ] **T17** Export to CSV and verify format

---

## 11. Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `403 Forbidden` | API key not set up correctly | Verify API key in Google Cloud Console |
| `400 Bad Request` | Invalid CSE ID | Check CSE ID in Programmable Search Engine settings |
| `429 Too Many Requests` | Rate limit exceeded | Wait and increase delay between requests |
| No results | Query too specific | Broaden search terms, remove some filters |
| Wrong profiles | Query too broad | Add more specific keywords/roles |

### Checking API Quota

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to "APIs & Services" → "Custom Search API"
3. Click "Quotas & Limits"
4. View "Queries per day" usage

---

## 12. Notes on Rate Limits

- **Free tier:** 100 queries/day
- **Each query returns:** Up to 10 results
- **Maximum leads per day:** ~1000 (100 queries × 10 results)
- **Recommended delay:** 2-3 seconds between queries
- **If you need more:** Paid tier is $5 per 1000 queries

---

## Document Info

| Field | Value |
|-------|-------|
| Version | 2.0 (Simplified) |
| Last Updated | 2024-01-15 |
| Total Tasks | 17 |

