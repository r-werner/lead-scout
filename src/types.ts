// Lead extracted from search results
export interface Lead {
  name: string;
  role: string;
  company: string;
  location: string; // Extracted from snippet (e.g. "Berlin, Germany")
  linkedinUrl: string;
  snippet: string;
  htmlSnippet: string; // Snippet with <b> highlighted keywords
  imageUrl: string | null; // Profile picture URL from Google
  confidence: 'high' | 'medium' | 'low';
  matchedTopics: string[]; // Which topic keywords were found in snippet/title
  queryUsed: string;
  discoveredAt: string; // ISO date string
}

// Google Custom Search API response
export interface GoogleSearchResponse {
  kind?: string;
  items?: GoogleSearchItem[];
  searchInformation?: {
    totalResults: string;
    searchTime: number;
  };
  error?: {
    code: number;
    message: string;
  };
}

export interface GoogleSearchItem {
  title: string;
  htmlTitle?: string; // Title with <b> highlighted keywords
  link: string;
  snippet: string;
  htmlSnippet?: string; // Snippet with <b> highlighted keywords
  displayLink?: string;
  pagemap?: {
    cse_thumbnail?: Array<{
      src: string;
      width: string;
      height: string;
    }>;
    cse_image?: Array<{
      src: string;
    }>;
    metatags?: Array<Record<string, string>>;
  };
}

// Config file types
export interface TargetCompany {
  name: string;
  priority: number;
  notes?: string;
}

export interface CompaniesConfig {
  description: string;
  lastUpdated: string;
  companies: TargetCompany[];
}

export interface SearchConfig {
  description?: string;
  roles: string[];
  topics: string[];
  exclusions: string[];
}

// Query tracking
export interface QueryBatch {
  query: string;
  company: string;
}
