# Module A: Google Search (LinkedIn X-Ray) - Implementation Plan

## Overview

**Module Name:** LinkedIn X-Ray Search via Google Custom Search API
**Language:** TypeScript
**Purpose:** Extract structured lead data from LinkedIn profiles using Google's index
**Daily Quota:** 100 free queries/day (Google Custom Search API)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Project Setup](#2-project-setup)
3. [Directory Structure](#3-directory-structure)
4. [Implementation Tasks](#4-implementation-tasks)
5. [Component Specifications](#5-component-specifications)
6. [Data Models](#6-data-models)
7. [API Integration](#7-api-integration)
8. [Query Builder](#8-query-builder)
9. [Result Parser](#9-result-parser)
10. [Rate Limiter & Caching](#10-rate-limiter--caching)
11. [Storage Layer](#11-storage-layer)
12. [Error Handling](#12-error-handling)
13. [Testing Strategy](#13-testing-strategy)
14. [Configuration](#14-configuration)
15. [CLI Interface](#15-cli-interface)
16. [Execution Checklist](#16-execution-checklist)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Module A: Google X-Ray Search                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐   │
│  │   CLI/Main   │───▶│ Query Builder│───▶│  Google Custom Search    │   │
│  │   Entry      │    │              │    │  API Client              │   │
│  └──────────────┘    └──────────────┘    └──────────────────────────┘   │
│         │                                           │                    │
│         │                                           ▼                    │
│         │            ┌──────────────┐    ┌──────────────────────────┐   │
│         │            │    Cache     │◀───│    Rate Limiter          │   │
│         │            │   (SQLite)   │    │  (100 queries/day)       │   │
│         │            └──────────────┘    └──────────────────────────┘   │
│         │                   │                       │                    │
│         │                   ▼                       ▼                    │
│         │            ┌──────────────┐    ┌──────────────────────────┐   │
│         └───────────▶│   Result     │◀───│    Response Parser       │   │
│                      │   Storage    │    │  (Regex extraction)      │   │
│                      └──────────────┘    └──────────────────────────┘   │
│                             │                                            │
│                             ▼                                            │
│                      ┌──────────────┐                                   │
│                      │  CSV Export  │                                   │
│                      └──────────────┘                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Core Components

| Component | Responsibility |
|-----------|---------------|
| **Config Manager** | Environment variables, API keys, settings |
| **Query Builder** | Constructs Boolean X-Ray search queries |
| **API Client** | Interfaces with Google Custom Search API |
| **Rate Limiter** | Enforces 100 queries/day limit with delays |
| **Response Parser** | Extracts Name, Role, Company from search results |
| **Cache Layer** | Prevents duplicate queries (SQLite) |
| **Storage** | Persists leads to database |
| **CSV Exporter** | Outputs leads in CRM-compatible format |

---

## 2. Project Setup

### 2.1 Initialize Project

```bash
# Task 2.1.1: Initialize npm project
npm init -y

# Task 2.1.2: Install TypeScript and build tools
npm install -D typescript ts-node @types/node tsx

# Task 2.1.3: Initialize TypeScript config
npx tsc --init
```

### 2.2 Dependencies

```json
{
  "dependencies": {
    "googleapis": "^130.0.0",
    "better-sqlite3": "^9.4.0",
    "dotenv": "^16.4.0",
    "zod": "^3.22.0",
    "csv-writer": "^1.6.0",
    "winston": "^3.11.0",
    "commander": "^12.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "ts-node": "^10.9.0",
    "tsx": "^4.7.0",
    "@types/node": "^20.11.0",
    "@types/better-sqlite3": "^7.6.8",
    "vitest": "^1.2.0",
    "@vitest/coverage-v8": "^1.2.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0",
    "prettier": "^3.2.0"
  }
}
```

### 2.3 TypeScript Configuration

```json
// tsconfig.json
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
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 2.4 Environment Configuration

```bash
# .env.example
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_CSE_ID=your_custom_search_engine_id_here
LOG_LEVEL=info
RATE_LIMIT_DELAY_MS=2000
DAILY_QUERY_LIMIT=100
DATABASE_PATH=./data/leads.db
OUTPUT_DIR=./output
```

---

## 3. Directory Structure

```
lead-scout/
├── src/
│   ├── index.ts                    # CLI entry point
│   ├── config/
│   │   ├── index.ts                # Config loader
│   │   ├── schema.ts               # Zod validation schemas
│   │   └── constants.ts            # Static constants
│   ├── core/
│   │   ├── google-search/
│   │   │   ├── client.ts           # Google API client
│   │   │   ├── query-builder.ts    # Boolean query construction
│   │   │   ├── response-parser.ts  # Parse search results
│   │   │   └── types.ts            # Type definitions
│   │   ├── rate-limiter/
│   │   │   ├── index.ts            # Rate limiter implementation
│   │   │   └── quota-tracker.ts    # Daily quota tracking
│   │   └── cache/
│   │       ├── index.ts            # Cache manager
│   │       └── query-cache.ts      # Query deduplication
│   ├── data/
│   │   ├── target-companies.ts     # Fortune 500 / Famous companies
│   │   ├── role-keywords.ts        # Role search terms
│   │   └── topic-keywords.ts       # Agentic AI keywords
│   ├── storage/
│   │   ├── database.ts             # SQLite connection
│   │   ├── migrations/
│   │   │   └── 001_initial.ts      # Database schema
│   │   ├── repositories/
│   │   │   ├── leads.ts            # Lead CRUD operations
│   │   │   └── queries.ts          # Query history
│   │   └── models.ts               # Database models
│   ├── export/
│   │   ├── csv-exporter.ts         # CSV output
│   │   └── formatters.ts           # Data formatters
│   ├── utils/
│   │   ├── logger.ts               # Winston logger
│   │   ├── retry.ts                # Retry logic
│   │   └── validation.ts           # Input validation
│   └── types/
│       └── index.ts                # Shared type definitions
├── tests/
│   ├── unit/
│   │   ├── query-builder.test.ts
│   │   ├── response-parser.test.ts
│   │   ├── rate-limiter.test.ts
│   │   └── cache.test.ts
│   ├── integration/
│   │   └── google-search.test.ts
│   └── fixtures/
│       ├── search-responses.json
│       └── expected-leads.json
├── data/
│   └── .gitkeep                    # Database directory
├── output/
│   └── .gitkeep                    # CSV output directory
├── docs/
│   └── MODULE_A_IMPLEMENTATION_PLAN.md
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 4. Implementation Tasks

### Phase 1: Project Foundation (Tasks 1-8)

| Task ID | Task Description | Estimated Effort | Dependencies | Acceptance Criteria |
|---------|-----------------|------------------|--------------|---------------------|
| **T1.1** | Initialize npm project with TypeScript | 15 min | None | `npm run build` succeeds |
| **T1.2** | Install all dependencies | 10 min | T1.1 | All packages in package.json |
| **T1.3** | Configure TypeScript (tsconfig.json) | 10 min | T1.1 | Strict mode enabled |
| **T1.4** | Set up ESLint + Prettier | 15 min | T1.3 | Linting passes |
| **T1.5** | Create directory structure | 10 min | T1.1 | All folders created |
| **T1.6** | Set up environment config with Zod | 30 min | T1.3 | Config validates correctly |
| **T1.7** | Implement Winston logger | 20 min | T1.6 | Logs to console and file |
| **T1.8** | Create .gitignore and .env.example | 5 min | T1.5 | Sensitive files excluded |

### Phase 2: Data Layer (Tasks 9-15)

| Task ID | Task Description | Estimated Effort | Dependencies | Acceptance Criteria |
|---------|-----------------|------------------|--------------|---------------------|
| **T2.1** | Define TypeScript interfaces for leads | 20 min | T1.3 | All types exported |
| **T2.2** | Set up SQLite connection | 30 min | T1.6 | Database connects |
| **T2.3** | Create database migration system | 45 min | T2.2 | Migrations run automatically |
| **T2.4** | Implement leads repository | 45 min | T2.3 | CRUD operations work |
| **T2.5** | Implement query history repository | 30 min | T2.3 | Query dedup works |
| **T2.6** | Create target companies data file | 30 min | T1.5 | Fortune 500 list loaded |
| **T2.7** | Create keyword data files | 20 min | T1.5 | Role/topic keywords defined |

### Phase 3: Core Google Search (Tasks 16-25)

| Task ID | Task Description | Estimated Effort | Dependencies | Acceptance Criteria |
|---------|-----------------|------------------|--------------|---------------------|
| **T3.1** | Implement Google API client wrapper | 60 min | T1.6 | API calls succeed |
| **T3.2** | Build query string constructor | 60 min | T2.7 | Boolean queries valid |
| **T3.3** | Implement regex result parser | 90 min | T2.1 | Name/Role/Company extracted |
| **T3.4** | Handle parser edge cases | 60 min | T3.3 | Truncation handled |
| **T3.5** | Add snippet analysis for validation | 45 min | T3.3 | Tech roles validated |
| **T3.6** | Implement rate limiter class | 45 min | T1.7 | 2s delay enforced |
| **T3.7** | Implement daily quota tracker | 45 min | T2.2, T3.6 | 100/day limit enforced |
| **T3.8** | Build query cache layer | 45 min | T2.5 | No duplicate queries |
| **T3.9** | Integrate all components | 60 min | T3.1-T3.8 | End-to-end flow works |
| **T3.10** | Add retry logic with backoff | 30 min | T3.1 | Retries on failure |

### Phase 4: Output & CLI (Tasks 26-32)

| Task ID | Task Description | Estimated Effort | Dependencies | Acceptance Criteria |
|---------|-----------------|------------------|--------------|---------------------|
| **T4.1** | Implement CSV exporter | 45 min | T2.4 | Valid CSV output |
| **T4.2** | Add data formatters | 30 min | T4.1 | Clean data output |
| **T4.3** | Build CLI with Commander.js | 60 min | T3.9 | CLI commands work |
| **T4.4** | Add progress indicators | 30 min | T4.3 | User sees progress |
| **T4.5** | Implement dry-run mode | 30 min | T4.3 | No API calls in dry-run |
| **T4.6** | Add resume capability | 45 min | T2.5, T4.3 | Can resume interrupted runs |
| **T4.7** | Create run summary report | 30 min | T4.3 | Stats displayed |

### Phase 5: Testing & Documentation (Tasks 33-40)

| Task ID | Task Description | Estimated Effort | Dependencies | Acceptance Criteria |
|---------|-----------------|------------------|--------------|---------------------|
| **T5.1** | Set up Vitest | 20 min | T1.1 | Test runner works |
| **T5.2** | Write query builder unit tests | 45 min | T3.2, T5.1 | 100% coverage |
| **T5.3** | Write response parser unit tests | 60 min | T3.3, T5.1 | Edge cases covered |
| **T5.4** | Write rate limiter unit tests | 30 min | T3.6, T5.1 | Timing verified |
| **T5.5** | Write cache unit tests | 30 min | T3.8, T5.1 | Dedup verified |
| **T5.6** | Create integration test suite | 60 min | T3.9, T5.1 | Mock API tested |
| **T5.7** | Write README documentation | 45 min | T4.3 | Setup guide complete |
| **T5.8** | Add inline code documentation | 30 min | All | JSDoc comments |

---

## 5. Component Specifications

### 5.1 Config Manager (`src/config/index.ts`)

```typescript
// Specification
interface ConfigSpec {
  // Input: Environment variables from .env file
  // Output: Validated configuration object
  // Validation: Zod schema ensures all required vars present
  // Throws: ConfigurationError if validation fails
}

// Required environment variables
const requiredEnvVars = [
  'GOOGLE_API_KEY',    // Google API key for Custom Search
  'GOOGLE_CSE_ID',     // Custom Search Engine ID
];

// Optional with defaults
const optionalEnvVars = {
  LOG_LEVEL: 'info',
  RATE_LIMIT_DELAY_MS: 2000,
  DAILY_QUERY_LIMIT: 100,
  DATABASE_PATH: './data/leads.db',
  OUTPUT_DIR: './output',
};
```

### 5.2 Query Builder (`src/core/google-search/query-builder.ts`)

```typescript
// Specification
interface QueryBuilderSpec {
  // Purpose: Construct Google X-Ray search queries for LinkedIn

  // Base operator (always included)
  baseOperator: 'site:linkedin.com/in';

  // Role cluster (senior decision makers)
  roleKeywords: [
    'Head', 'Lead', 'Principal', 'Director',
    'Manager', 'Architect', 'VP', 'Chief', 'Staff'
  ];

  // Topic cluster (agentic AI specific)
  topicKeywords: [
    'Agentic AI', 'AI Agents', 'Autonomous Agents',
    'Multi-Agent Systems', 'Agentic Workflows',
    'Agentic Automation', 'LLM Orchestration'
  ];

  // Exclusion cluster (noise reduction)
  exclusions: [
    '-intitle:"profiles"',
    '-inurl:"/dir/"',
    '-recruiter',
    '-"hiring for"',
    '-"jobs"'
  ];

  // Methods
  buildQuery(options: {
    company?: string;
    roles?: string[];
    topics?: string[];
  }): string;

  buildBatchQueries(companies: string[]): string[];
}
```

**Query Template:**
```
site:linkedin.com/in ("Head" OR "Lead" OR "Architect") ("Agentic AI" OR "AI Agents") ("Microsoft") -intitle:"profiles"
```

### 5.3 Response Parser (`src/core/google-search/response-parser.ts`)

```typescript
// Specification
interface ResponseParserSpec {
  // Input: Google Custom Search API response
  // Output: Array of ParsedLead objects

  // Primary regex pattern for LinkedIn titles
  // Format: "{Name} - {Job Title} - {Company} | LinkedIn"
  titlePattern: /^(?<name>.+?)\s*-\s*(?<role>.+?)\s*-\s*(?<company>.+?)\s*\|\s*LinkedIn$/;

  // Alternative patterns for edge cases
  alternativePatterns: [
    /^(?<name>.+?)\s*[|–-]\s*(?<role>.+?)\s*[|–-]\s*LinkedIn$/,  // Missing company
    /^(?<name>.+?)\s*-\s*(?<role>.+?)\s*\|\s*LinkedIn$/,          // Two-part title
  ];

  // Snippet validation keywords (must contain at least one)
  validationKeywords: [
    'engineer', 'engineering', 'python', 'product',
    'architect', 'developer', 'software', 'machine learning',
    'AI', 'artificial intelligence', 'data', 'technical'
  ];

  // Methods
  parseSearchResults(response: GoogleSearchResponse): ParsedLead[];
  extractFromTitle(title: string): Partial<ParsedLead> | null;
  validateWithSnippet(lead: Partial<ParsedLead>, snippet: string): boolean;
  detectTruncation(title: string): boolean;
}
```

### 5.4 Rate Limiter (`src/core/rate-limiter/index.ts`)

```typescript
// Specification
interface RateLimiterSpec {
  // Constraints
  minDelayBetweenRequests: 2000;  // 2 seconds
  maxDailyQueries: 100;

  // State
  lastRequestTime: number;
  dailyQueryCount: number;
  resetTime: Date;  // Midnight UTC

  // Methods
  async waitForSlot(): Promise<void>;  // Blocks until rate limit allows
  canMakeRequest(): boolean;
  getRemainingQuota(): number;
  recordRequest(): void;
  resetDailyQuota(): void;
}
```

### 5.5 Cache Layer (`src/core/cache/query-cache.ts`)

```typescript
// Specification
interface QueryCacheSpec {
  // Purpose: Prevent re-running identical queries

  // Storage: SQLite table 'query_cache'
  // Key: SHA256 hash of query string
  // Value: timestamp, result count

  // Methods
  hasBeenExecuted(query: string): boolean;
  recordExecution(query: string, resultCount: number): void;
  getQueryHistory(): QueryRecord[];
  clearOlderThan(days: number): void;
}
```

---

## 6. Data Models

### 6.1 Lead Model

```typescript
// src/types/index.ts

export interface LinkedInLead {
  id: string;                    // UUID
  name: string;                  // Full name
  role: string;                  // Job title
  company: string;               // Company name
  linkedinUrl: string;           // Profile URL
  snippet: string;               // Google search snippet
  source: 'google_xray';         // Data source identifier

  // Metadata
  queryUsed: string;             // Query that found this lead
  confidence: 'high' | 'medium' | 'low';  // Parse confidence
  isTruncated: boolean;          // Title was truncated

  // Timestamps
  discoveredAt: Date;
  updatedAt: Date;
}

export interface ParsedLead {
  name: string;
  role: string;
  company: string;
  linkedinUrl: string;
  snippet: string;
  confidence: 'high' | 'medium' | 'low';
  isTruncated: boolean;
}

export interface QueryRecord {
  id: string;
  queryHash: string;
  queryText: string;
  resultCount: number;
  executedAt: Date;
}
```

### 6.2 Database Schema

```sql
-- migrations/001_initial.sql

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  company TEXT NOT NULL,
  linkedin_url TEXT UNIQUE NOT NULL,
  snippet TEXT,
  source TEXT DEFAULT 'google_xray',
  query_used TEXT,
  confidence TEXT CHECK(confidence IN ('high', 'medium', 'low')),
  is_truncated INTEGER DEFAULT 0,
  discovered_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS query_history (
  id TEXT PRIMARY KEY,
  query_hash TEXT UNIQUE NOT NULL,
  query_text TEXT NOT NULL,
  result_count INTEGER DEFAULT 0,
  executed_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quota_tracker (
  date TEXT PRIMARY KEY,
  query_count INTEGER DEFAULT 0,
  last_query_at TEXT
);

CREATE INDEX idx_leads_company ON leads(company);
CREATE INDEX idx_leads_discovered ON leads(discovered_at);
CREATE INDEX idx_query_hash ON query_history(query_hash);
```

---

## 7. API Integration

### 7.1 Google Custom Search API Client

```typescript
// src/core/google-search/client.ts - Specification

interface GoogleSearchClientSpec {
  // Configuration
  apiKey: string;
  cseId: string;
  baseUrl: 'https://www.googleapis.com/customsearch/v1';

  // Rate limiting
  rateLimiter: RateLimiter;

  // Methods
  async search(query: string, options?: SearchOptions): Promise<GoogleSearchResponse>;
  async searchWithPagination(query: string, pages: number): Promise<GoogleSearchResponse[]>;
}

interface SearchOptions {
  start?: number;      // Pagination offset (1-indexed, max 100)
  num?: number;        // Results per page (max 10)
  dateRestrict?: string;  // e.g., 'm6' for last 6 months
}

interface GoogleSearchResponse {
  kind: string;
  queries: {
    request: QueryInfo[];
    nextPage?: QueryInfo[];
  };
  searchInformation: {
    totalResults: string;
    searchTime: number;
  };
  items?: SearchResultItem[];
}

interface SearchResultItem {
  title: string;       // "{Name} - {Role} - {Company} | LinkedIn"
  link: string;        // LinkedIn profile URL
  snippet: string;     // Profile description excerpt
  displayLink: string; // "linkedin.com"
}
```

### 7.2 API Setup Instructions

1. **Create Google Cloud Project:**
   - Go to https://console.cloud.google.com
   - Create new project: "LeadScout"
   - Enable "Custom Search API"

2. **Create API Key:**
   - Go to APIs & Services → Credentials
   - Create API Key
   - Restrict to Custom Search API only

3. **Create Programmable Search Engine:**
   - Go to https://programmablesearchengine.google.com
   - Create new search engine
   - Set to search "The entire web"
   - Copy the Search Engine ID (cx)

4. **Configure Environment:**
   ```bash
   GOOGLE_API_KEY=AIza...
   GOOGLE_CSE_ID=abc123...
   ```

---

## 8. Query Builder

### 8.1 Query Construction Logic

```typescript
// src/core/google-search/query-builder.ts - Implementation Spec

class QueryBuilder {
  private readonly BASE_SITE = 'site:linkedin.com/in';

  private readonly ROLE_KEYWORDS = [
    'Head', 'Lead', 'Principal', 'Director',
    'Manager', 'Architect', 'VP', 'Chief', 'Staff', 'Senior'
  ];

  private readonly TOPIC_KEYWORDS = [
    'Agentic AI',
    'AI Agents',
    'Autonomous Agents',
    'Multi-Agent Systems',
    'Agentic Workflows',
    'LLM Orchestration',
    'AI Automation'
  ];

  private readonly EXCLUSIONS = [
    '-intitle:"profiles"',
    '-inurl:"/dir/"',
    '-inurl:"/jobs/"',
    '-recruiter',
    '-"hiring for"',
    '-"open to work"'
  ];

  /**
   * Build a single search query
   */
  buildQuery(options: QueryOptions): string {
    const parts: string[] = [this.BASE_SITE];

    // Add role filter
    if (options.roles?.length) {
      parts.push(this.buildOrClause(options.roles));
    } else {
      parts.push(this.buildOrClause(this.ROLE_KEYWORDS));
    }

    // Add topic filter
    if (options.topics?.length) {
      parts.push(this.buildOrClause(options.topics));
    } else {
      parts.push(this.buildOrClause(this.TOPIC_KEYWORDS.slice(0, 3)));
    }

    // Add company filter if specified
    if (options.company) {
      parts.push(`"${options.company}"`);
    }

    // Add exclusions
    parts.push(...this.EXCLUSIONS);

    return parts.join(' ');
  }

  /**
   * Generate batch queries for multiple companies
   */
  buildBatchQueries(companies: string[]): QueryBatch[] {
    const batches: QueryBatch[] = [];

    for (const company of companies) {
      // Strategy 1: Company + broad topic
      batches.push({
        query: this.buildQuery({ company, topics: ['Agentic AI', 'AI Agents'] }),
        company,
        strategy: 'broad_topic'
      });

      // Strategy 2: Company + specific role
      batches.push({
        query: this.buildQuery({
          company,
          roles: ['Head', 'Lead', 'Director'],
          topics: ['AI']
        }),
        company,
        strategy: 'senior_roles'
      });
    }

    return batches;
  }

  private buildOrClause(terms: string[]): string {
    const quoted = terms.map(t => `"${t}"`);
    return `(${quoted.join(' OR ')})`;
  }
}

interface QueryOptions {
  company?: string;
  roles?: string[];
  topics?: string[];
}

interface QueryBatch {
  query: string;
  company: string;
  strategy: string;
}
```

### 8.2 Query Rotation Strategy

To maximize the 100 daily queries:

```typescript
// Daily query allocation strategy
const QUERY_STRATEGY = {
  // 50 queries for top-tier companies (5 companies × 10 query variations)
  tier1Companies: ['Microsoft', 'Google', 'Salesforce', 'Meta', 'Amazon'],
  queriesPerTier1: 10,

  // 30 queries for mid-tier companies (10 companies × 3 query variations)
  tier2Companies: ['Docusign', 'Datadog', 'Snowflake', 'Databricks', 'Stripe',
                   'Confluent', 'MongoDB', 'Elastic', 'HashiCorp', 'GitLab'],
  queriesPerTier2: 3,

  // 20 queries for broad searches (topic-focused, no company filter)
  broadSearches: 20
};
```

---

## 9. Result Parser

### 9.1 Parsing Logic

```typescript
// src/core/google-search/response-parser.ts - Implementation Spec

class ResponseParser {
  // Primary pattern: "Name - Role - Company | LinkedIn"
  private readonly PRIMARY_PATTERN =
    /^(?<name>.+?)\s*-\s*(?<role>.+?)\s*-\s*(?<company>.+?)\s*\|\s*LinkedIn$/i;

  // Fallback: "Name - Role | LinkedIn" (company in snippet)
  private readonly FALLBACK_PATTERN =
    /^(?<name>.+?)\s*-\s*(?<role>.+?)\s*\|\s*LinkedIn$/i;

  // Technical validation keywords
  private readonly TECH_KEYWORDS = [
    'engineer', 'engineering', 'developer', 'software',
    'architect', 'technical', 'product', 'AI', 'ML',
    'machine learning', 'data', 'platform', 'infrastructure'
  ];

  /**
   * Parse all search results from API response
   */
  parseSearchResults(response: GoogleSearchResponse): ParsedLead[] {
    if (!response.items?.length) {
      return [];
    }

    const leads: ParsedLead[] = [];

    for (const item of response.items) {
      const lead = this.parseItem(item);
      if (lead && this.isValidLead(lead)) {
        leads.push(lead);
      }
    }

    return leads;
  }

  /**
   * Parse single search result item
   */
  private parseItem(item: SearchResultItem): ParsedLead | null {
    const { title, link, snippet } = item;

    // Try primary pattern first
    let match = title.match(this.PRIMARY_PATTERN);
    let confidence: 'high' | 'medium' | 'low' = 'high';

    if (!match) {
      // Try fallback pattern
      match = title.match(this.FALLBACK_PATTERN);
      confidence = 'medium';
    }

    if (!match?.groups) {
      return null;
    }

    const { name, role, company } = match.groups;

    // Detect truncation (ends with "...")
    const isTruncated = title.includes('...') ||
                        role?.endsWith('...') ||
                        company?.endsWith('...');

    if (isTruncated) {
      confidence = 'low';
    }

    return {
      name: this.cleanText(name),
      role: this.cleanText(role),
      company: company ? this.cleanText(company) : this.extractCompanyFromSnippet(snippet),
      linkedinUrl: link,
      snippet,
      confidence,
      isTruncated
    };
  }

  /**
   * Validate lead has technical relevance
   */
  private isValidLead(lead: ParsedLead): boolean {
    const textToCheck = `${lead.role} ${lead.snippet}`.toLowerCase();

    // Must contain at least one technical keyword
    return this.TECH_KEYWORDS.some(kw => textToCheck.includes(kw));
  }

  /**
   * Extract company from snippet when not in title
   */
  private extractCompanyFromSnippet(snippet: string): string {
    // Common patterns in LinkedIn snippets
    const patterns = [
      /(?:at|@)\s+([A-Z][A-Za-z0-9\s]+?)(?:\s*[·|]|$)/,
      /(?:working at|works at)\s+([A-Z][A-Za-z0-9\s]+?)(?:\s*[·|]|$)/i
    ];

    for (const pattern of patterns) {
      const match = snippet.match(pattern);
      if (match) {
        return this.cleanText(match[1]);
      }
    }

    return 'Unknown';
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-&]/g, '')
      .trim();
  }
}
```

### 9.2 Edge Cases Handling

| Edge Case | Detection | Handling |
|-----------|-----------|----------|
| **Truncated title** | Ends with "..." | Set `isTruncated: true`, `confidence: low` |
| **Missing company** | No third segment | Extract from snippet |
| **Non-person result** | Title doesn't match pattern | Skip (return null) |
| **Generic title** | "AI Agent" without context | Validate with snippet keywords |
| **Non-English** | Contains non-ASCII | Still parse, flag for review |
| **Job posting** | Contains "hiring", "jobs" | Skip (exclusion in query) |

---

## 10. Rate Limiter & Caching

### 10.1 Rate Limiter Implementation

```typescript
// src/core/rate-limiter/index.ts

class RateLimiter {
  private readonly minDelay: number;
  private lastRequestTime: number = 0;

  constructor(minDelayMs: number = 2000) {
    this.minDelay = minDelayMs;
  }

  /**
   * Wait until it's safe to make next request
   */
  async waitForSlot(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minDelay) {
      const waitTime = this.minDelay - timeSinceLastRequest;
      await this.sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 10.2 Daily Quota Tracker

```typescript
// src/core/rate-limiter/quota-tracker.ts

class QuotaTracker {
  private readonly db: Database;
  private readonly dailyLimit: number;

  constructor(db: Database, dailyLimit: number = 100) {
    this.db = db;
    this.dailyLimit = dailyLimit;
  }

  /**
   * Check if we can make another query today
   */
  canMakeRequest(): boolean {
    const today = this.getTodayKey();
    const count = this.getQueryCount(today);
    return count < this.dailyLimit;
  }

  /**
   * Get remaining quota for today
   */
  getRemainingQuota(): number {
    const today = this.getTodayKey();
    const count = this.getQueryCount(today);
    return Math.max(0, this.dailyLimit - count);
  }

  /**
   * Record a query execution
   */
  recordQuery(): void {
    const today = this.getTodayKey();
    const stmt = this.db.prepare(`
      INSERT INTO quota_tracker (date, query_count, last_query_at)
      VALUES (?, 1, datetime('now'))
      ON CONFLICT(date) DO UPDATE SET
        query_count = query_count + 1,
        last_query_at = datetime('now')
    `);
    stmt.run(today);
  }

  private getQueryCount(date: string): number {
    const stmt = this.db.prepare(
      'SELECT query_count FROM quota_tracker WHERE date = ?'
    );
    const row = stmt.get(date) as { query_count: number } | undefined;
    return row?.query_count ?? 0;
  }

  private getTodayKey(): string {
    return new Date().toISOString().split('T')[0];
  }
}
```

### 10.3 Query Cache

```typescript
// src/core/cache/query-cache.ts

import { createHash } from 'crypto';

class QueryCache {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Check if query has been executed before
   */
  hasBeenExecuted(query: string): boolean {
    const hash = this.hashQuery(query);
    const stmt = this.db.prepare(
      'SELECT 1 FROM query_history WHERE query_hash = ?'
    );
    return stmt.get(hash) !== undefined;
  }

  /**
   * Record query execution
   */
  recordExecution(query: string, resultCount: number): void {
    const hash = this.hashQuery(query);
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO query_history
      (id, query_hash, query_text, result_count, executed_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(crypto.randomUUID(), hash, query, resultCount);
  }

  private hashQuery(query: string): string {
    return createHash('sha256').update(query).digest('hex');
  }
}
```

---

## 11. Storage Layer

### 11.1 Database Manager

```typescript
// src/storage/database.ts

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import path from 'path';

class DatabaseManager {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.runMigrations();
  }

  private runMigrations(): void {
    const migration = readFileSync(
      path.join(__dirname, 'migrations/001_initial.sql'),
      'utf-8'
    );
    this.db.exec(migration);
  }

  getConnection(): Database.Database {
    return this.db;
  }

  close(): void {
    this.db.close();
  }
}
```

### 11.2 Leads Repository

```typescript
// src/storage/repositories/leads.ts

class LeadsRepository {
  private readonly db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Insert new lead (skip if URL exists)
   */
  insert(lead: LinkedInLead): boolean {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO leads
        (id, name, role, company, linkedin_url, snippet, source,
         query_used, confidence, is_truncated, discovered_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      stmt.run(
        crypto.randomUUID(),
        lead.name,
        lead.role,
        lead.company,
        lead.linkedinUrl,
        lead.snippet,
        lead.source,
        lead.queryUsed,
        lead.confidence,
        lead.isTruncated ? 1 : 0
      );

      return true;
    } catch (error) {
      // Likely duplicate URL
      return false;
    }
  }

  /**
   * Check if lead already exists by URL
   */
  exists(linkedinUrl: string): boolean {
    const stmt = this.db.prepare(
      'SELECT 1 FROM leads WHERE linkedin_url = ?'
    );
    return stmt.get(linkedinUrl) !== undefined;
  }

  /**
   * Get all leads for export
   */
  getAll(): LinkedInLead[] {
    const stmt = this.db.prepare('SELECT * FROM leads ORDER BY discovered_at DESC');
    return stmt.all() as LinkedInLead[];
  }

  /**
   * Get leads by company
   */
  getByCompany(company: string): LinkedInLead[] {
    const stmt = this.db.prepare(
      'SELECT * FROM leads WHERE company LIKE ? ORDER BY discovered_at DESC'
    );
    return stmt.all(`%${company}%`) as LinkedInLead[];
  }

  /**
   * Get lead count
   */
  count(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM leads');
    const result = stmt.get() as { count: number };
    return result.count;
  }
}
```

---

## 12. Error Handling

### 12.1 Custom Error Classes

```typescript
// src/utils/errors.ts

export class LeadScoutError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'LeadScoutError';
  }
}

export class ConfigurationError extends LeadScoutError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
    this.name = 'ConfigurationError';
  }
}

export class RateLimitError extends LeadScoutError {
  constructor(remaining: number) {
    super(`Daily quota exhausted. Remaining: ${remaining}`, 'RATE_LIMIT');
    this.name = 'RateLimitError';
  }
}

export class GoogleApiError extends LeadScoutError {
  constructor(message: string, public readonly statusCode?: number) {
    super(message, 'GOOGLE_API_ERROR');
    this.name = 'GoogleApiError';
  }
}

export class ParseError extends LeadScoutError {
  constructor(message: string) {
    super(message, 'PARSE_ERROR');
    this.name = 'ParseError';
  }
}
```

### 12.2 Retry Logic

```typescript
// src/utils/retry.ts

interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 10000 }
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on non-retryable errors
      if (error instanceof RateLimitError) {
        throw error;
      }

      if (attempt < options.maxRetries) {
        const delay = Math.min(
          options.baseDelayMs * Math.pow(2, attempt),
          options.maxDelayMs
        );
        await sleep(delay);
      }
    }
  }

  throw lastError;
}
```

---

## 13. Testing Strategy

### 13.1 Test Structure

```
tests/
├── unit/
│   ├── query-builder.test.ts      # Query construction tests
│   ├── response-parser.test.ts    # Parsing logic tests
│   ├── rate-limiter.test.ts       # Rate limiting tests
│   └── cache.test.ts              # Caching tests
├── integration/
│   └── search-flow.test.ts        # End-to-end with mocks
└── fixtures/
    ├── google-responses/
    │   ├── success.json           # Normal response
    │   ├── empty.json             # No results
    │   └── error.json             # API error
    └── expected-leads.json        # Expected parsed output
```

### 13.2 Key Test Cases

```typescript
// tests/unit/query-builder.test.ts

describe('QueryBuilder', () => {
  describe('buildQuery', () => {
    it('should include site:linkedin.com/in operator', () => {
      const query = builder.buildQuery({});
      expect(query).toContain('site:linkedin.com/in');
    });

    it('should add company filter when specified', () => {
      const query = builder.buildQuery({ company: 'Microsoft' });
      expect(query).toContain('"Microsoft"');
    });

    it('should include exclusion operators', () => {
      const query = builder.buildQuery({});
      expect(query).toContain('-intitle:"profiles"');
      expect(query).toContain('-recruiter');
    });

    it('should use OR clause for multiple roles', () => {
      const query = builder.buildQuery({ roles: ['Head', 'Lead'] });
      expect(query).toMatch(/\("Head" OR "Lead"\)/);
    });
  });
});

// tests/unit/response-parser.test.ts

describe('ResponseParser', () => {
  describe('parseSearchResults', () => {
    it('should extract name, role, company from standard title', () => {
      const result = parser.parseItem({
        title: 'John Smith - Head of AI - Microsoft | LinkedIn',
        link: 'https://linkedin.com/in/johnsmith',
        snippet: 'Engineering leader...'
      });

      expect(result).toEqual({
        name: 'John Smith',
        role: 'Head of AI',
        company: 'Microsoft',
        linkedinUrl: 'https://linkedin.com/in/johnsmith',
        snippet: 'Engineering leader...',
        confidence: 'high',
        isTruncated: false
      });
    });

    it('should detect truncated titles', () => {
      const result = parser.parseItem({
        title: 'Jane Doe - Senior Director of Agentic AI Platf... | LinkedIn',
        link: 'https://linkedin.com/in/janedoe',
        snippet: '...'
      });

      expect(result?.isTruncated).toBe(true);
      expect(result?.confidence).toBe('low');
    });

    it('should handle two-part titles', () => {
      const result = parser.parseItem({
        title: 'Bob Wilson - AI Engineer | LinkedIn',
        link: 'https://linkedin.com/in/bobwilson',
        snippet: 'Working at Google on agents...'
      });

      expect(result?.confidence).toBe('medium');
    });

    it('should skip non-matching titles', () => {
      const result = parser.parseItem({
        title: 'LinkedIn: 500+ AI Jobs',
        link: 'https://linkedin.com/jobs/ai',
        snippet: '...'
      });

      expect(result).toBeNull();
    });
  });
});
```

### 13.3 Mock Fixtures

```json
// tests/fixtures/google-responses/success.json
{
  "kind": "customsearch#search",
  "searchInformation": {
    "totalResults": "150",
    "searchTime": 0.35
  },
  "items": [
    {
      "title": "John Smith - Head of Agentic AI - Microsoft | LinkedIn",
      "link": "https://www.linkedin.com/in/johnsmith",
      "displayLink": "www.linkedin.com",
      "snippet": "Head of Agentic AI at Microsoft · Building autonomous agent systems · Previously at Google Brain · Stanford CS PhD"
    },
    {
      "title": "Jane Doe - Principal Engineer, AI Agents - Salesforce | LinkedIn",
      "link": "https://www.linkedin.com/in/janedoe",
      "displayLink": "www.linkedin.com",
      "snippet": "Principal Engineer at Salesforce · Leading multi-agent orchestration · LangChain contributor"
    }
  ]
}
```

---

## 14. Configuration

### 14.1 Environment Schema (Zod)

```typescript
// src/config/schema.ts

import { z } from 'zod';

export const ConfigSchema = z.object({
  // Required
  GOOGLE_API_KEY: z.string().min(1, 'Google API key is required'),
  GOOGLE_CSE_ID: z.string().min(1, 'Custom Search Engine ID is required'),

  // Optional with defaults
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  RATE_LIMIT_DELAY_MS: z.coerce.number().min(1000).default(2000),
  DAILY_QUERY_LIMIT: z.coerce.number().min(1).max(100).default(100),
  DATABASE_PATH: z.string().default('./data/leads.db'),
  OUTPUT_DIR: z.string().default('./output'),
});

export type Config = z.infer<typeof ConfigSchema>;
```

### 14.2 Config Loader

```typescript
// src/config/index.ts

import { config as dotenvConfig } from 'dotenv';
import { ConfigSchema, Config } from './schema';
import { ConfigurationError } from '../utils/errors';

export function loadConfig(): Config {
  dotenvConfig();

  const result = ConfigSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map(i => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new ConfigurationError(`Invalid configuration:\n${errors}`);
  }

  return result.data;
}
```

---

## 15. CLI Interface

### 15.1 Command Structure

```typescript
// src/index.ts

import { Command } from 'commander';

const program = new Command();

program
  .name('lead-scout')
  .description('LinkedIn X-Ray Search Tool for Agentic AI Leads')
  .version('1.0.0');

// Main search command
program
  .command('search')
  .description('Execute LinkedIn X-Ray searches')
  .option('-c, --companies <companies...>', 'Target companies')
  .option('-l, --limit <number>', 'Max queries to execute', '10')
  .option('--dry-run', 'Show queries without executing')
  .action(async (options) => {
    // Implementation
  });

// Export command
program
  .command('export')
  .description('Export leads to CSV')
  .option('-o, --output <path>', 'Output file path')
  .option('--company <name>', 'Filter by company')
  .action(async (options) => {
    // Implementation
  });

// Status command
program
  .command('status')
  .description('Show current status and quota')
  .action(async () => {
    // Show: Total leads, Today's quota, Last run
  });

// Clear cache command
program
  .command('clear-cache')
  .description('Clear query cache')
  .option('--older-than <days>', 'Clear entries older than N days', '30')
  .action(async (options) => {
    // Implementation
  });

program.parse();
```

### 15.2 CLI Output Examples

```
$ npx lead-scout search --companies Microsoft Salesforce --limit 5

🔍 Lead Scout - LinkedIn X-Ray Search
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Daily Quota: 95/100 remaining
🏢 Target Companies: Microsoft, Salesforce
📝 Query Limit: 5

[1/5] Searching: "Agentic AI" at Microsoft...
  ✓ Found 3 leads (2 new, 1 duplicate)

[2/5] Searching: "AI Agents" at Microsoft...
  ✓ Found 5 leads (4 new, 1 duplicate)

[3/5] Searching: "Agentic AI" at Salesforce...
  ✓ Found 2 leads (2 new)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Summary:
   • Queries executed: 5
   • New leads found: 8
   • Duplicates skipped: 2
   • Remaining quota: 90/100

💾 Results saved to: ./data/leads.db
```

---

## 16. Execution Checklist

### Phase 1: Foundation (Day 1)

- [ ] **T1.1** Create project directory and initialize npm
- [ ] **T1.2** Install all dependencies
- [ ] **T1.3** Configure TypeScript
- [ ] **T1.4** Set up ESLint and Prettier
- [ ] **T1.5** Create directory structure
- [ ] **T1.6** Implement config loader with Zod validation
- [ ] **T1.7** Set up Winston logger
- [ ] **T1.8** Create .gitignore and .env.example

### Phase 2: Data Layer (Day 2)

- [ ] **T2.1** Define TypeScript interfaces
- [ ] **T2.2** Set up SQLite connection
- [ ] **T2.3** Create migration system
- [ ] **T2.4** Implement leads repository
- [ ] **T2.5** Implement query history repository
- [ ] **T2.6** Create target companies list (Fortune 500)
- [ ] **T2.7** Create keyword data files

### Phase 3: Core Search (Days 3-4)

- [ ] **T3.1** Implement Google API client
- [ ] **T3.2** Build query string constructor
- [ ] **T3.3** Implement regex result parser
- [ ] **T3.4** Handle parser edge cases
- [ ] **T3.5** Add snippet validation
- [ ] **T3.6** Implement rate limiter
- [ ] **T3.7** Implement daily quota tracker
- [ ] **T3.8** Build query cache layer
- [ ] **T3.9** Integrate all components
- [ ] **T3.10** Add retry logic

### Phase 4: Output & CLI (Day 5)

- [ ] **T4.1** Implement CSV exporter
- [ ] **T4.2** Add data formatters
- [ ] **T4.3** Build CLI with Commander.js
- [ ] **T4.4** Add progress indicators
- [ ] **T4.5** Implement dry-run mode
- [ ] **T4.6** Add resume capability
- [ ] **T4.7** Create run summary report

### Phase 5: Testing & Docs (Day 6)

- [ ] **T5.1** Set up Vitest
- [ ] **T5.2** Write query builder tests
- [ ] **T5.3** Write response parser tests
- [ ] **T5.4** Write rate limiter tests
- [ ] **T5.5** Write cache tests
- [ ] **T5.6** Create integration tests
- [ ] **T5.7** Write README
- [ ] **T5.8** Add JSDoc comments

---

## Appendix A: Target Companies List

```typescript
// src/data/target-companies.ts

export const FORTUNE_500_TECH = [
  'Microsoft', 'Apple', 'Amazon', 'Google', 'Meta',
  'Salesforce', 'Oracle', 'IBM', 'Intel', 'Cisco',
  'Adobe', 'VMware', 'ServiceNow', 'Workday', 'Intuit',
  'Autodesk', 'Synopsys', 'Cadence', 'Fortinet', 'Palo Alto Networks'
];

export const UNICORNS_AI = [
  'OpenAI', 'Anthropic', 'Databricks', 'Stripe', 'Datadog',
  'Snowflake', 'Confluent', 'MongoDB', 'Elastic', 'HashiCorp',
  'GitLab', 'Notion', 'Figma', 'Canva', 'Scale AI',
  'Hugging Face', 'Cohere', 'Weights & Biases', 'Anyscale', 'Modal'
];

export const ENTERPRISE_EARLY_ADOPTERS = [
  'Docusign', 'Twilio', 'Okta', 'Cloudflare', 'CrowdStrike',
  'Zscaler', 'SentinelOne', 'UiPath', 'Automation Anywhere',
  'C3.ai', 'Palantir', 'Alteryx', 'Tableau', 'Looker'
];
```

## Appendix B: Sample Output CSV

```csv
name,role,company,linkedin_url,confidence,signal,discovered_at
John Smith,Head of Agentic AI,Microsoft,https://linkedin.com/in/johnsmith,high,Google X-Ray,2024-01-15T10:30:00Z
Jane Doe,Principal Engineer AI Agents,Salesforce,https://linkedin.com/in/janedoe,high,Google X-Ray,2024-01-15T10:31:00Z
Bob Wilson,Director AI Platform,Databricks,https://linkedin.com/in/bobwilson,medium,Google X-Ray,2024-01-15T10:32:00Z
```

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | Lead Scout Team | Initial plan |

