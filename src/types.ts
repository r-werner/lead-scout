// Lead extracted from search results
export interface Lead {
  name: string;
  role: string;
  company: string;
  linkedinUrl: string;
  snippet: string;
  confidence: 'high' | 'medium' | 'low';
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
  link: string;
  snippet: string;
  displayLink?: string;
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
