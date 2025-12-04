import { readFileSync, writeFileSync, existsSync } from 'fs';
import { Lead, SearchConfig } from './types.js';

/**
 * Cleanup script: Re-calculate hasTopicMatch flag for all leads
 * Run this to update existing leads with the new flag
 */

const LEADS_FILE = './output/leads.json';
const KEYWORDS_FILE = './data/search-keywords.json';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findMatchedTopics(text: string, topics: string[]): string[] {
  const lowerText = text.toLowerCase();
  return topics.filter((topic) => {
    const lowerTopic = topic.toLowerCase();
    const regex = new RegExp(`\\b${escapeRegex(lowerTopic)}\\b`, 'i');
    return regex.test(lowerText);
  });
}

function main() {
  console.log('Lead Scout - Cleanup Tool');
  console.log('='.repeat(40));
  console.log('');

  if (!existsSync(LEADS_FILE)) {
    console.log('No leads file found. Nothing to clean up.');
    return;
  }

  if (!existsSync(KEYWORDS_FILE)) {
    console.error('Keywords file not found:', KEYWORDS_FILE);
    process.exit(1);
  }

  const leads: Lead[] = JSON.parse(readFileSync(LEADS_FILE, 'utf-8'));
  const keywordsData: SearchConfig = JSON.parse(readFileSync(KEYWORDS_FILE, 'utf-8'));
  const topics = keywordsData.topics;

  console.log(`Loaded ${leads.length} leads`);
  console.log(`Topics to match: ${topics.join(', ')}`);
  console.log('');

  // Re-validate each lead and update flags
  let withMatch = 0;
  let withoutMatch = 0;

  for (const lead of leads) {
    // Re-check topic matches in role + snippet
    const searchText = `${lead.role} ${lead.snippet}`;
    const matchedTopics = findMatchedTopics(searchText, topics);

    // Update the lead
    lead.matchedTopics = matchedTopics;
    lead.hasTopicMatch = matchedTopics.length > 0;

    if (lead.hasTopicMatch) {
      withMatch++;
    } else {
      withoutMatch++;
    }
  }

  console.log(`Leads with topic match: ${withMatch}`);
  console.log(`Leads without topic match: ${withoutMatch}`);
  console.log('');

  // Save updated data
  writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
  console.log(`Updated ${leads.length} leads in ${LEADS_FILE}`);
}

main();
