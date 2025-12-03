import { readFileSync, writeFileSync, existsSync } from 'fs';
import { Lead, SearchConfig } from './types.js';

/**
 * Cleanup script: Remove leads that don't have topic keyword matches
 * Run this after updating filtering logic to clean up stale data
 */

const LEADS_FILE = './output/leads.json';
const KEYWORDS_FILE = './data/search-keywords.json';

function findMatchedTopics(text: string, topics: string[]): string[] {
  const lowerText = text.toLowerCase();
  return topics.filter((topic) => lowerText.includes(topic.toLowerCase()));
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

  // Re-validate each lead
  const validLeads: Lead[] = [];
  const removedLeads: Lead[] = [];

  for (const lead of leads) {
    // Re-check topic matches in role + snippet (role often contains title keywords)
    const searchText = `${lead.role} ${lead.snippet}`;
    const matchedTopics = findMatchedTopics(searchText, topics);

    if (matchedTopics.length > 0) {
      // Update matchedTopics to ensure it's accurate
      lead.matchedTopics = matchedTopics;
      validLeads.push(lead);
    } else {
      removedLeads.push(lead);
    }
  }

  console.log(`Valid leads (with topic match): ${validLeads.length}`);
  console.log(`Removed leads (no topic match): ${removedLeads.length}`);
  console.log('');

  if (removedLeads.length > 0) {
    console.log('Removed leads:');
    for (const lead of removedLeads.slice(0, 10)) {
      console.log(`  - ${lead.name} @ ${lead.company}`);
      console.log(`    Role: ${lead.role}`);
    }
    if (removedLeads.length > 10) {
      console.log(`  ... and ${removedLeads.length - 10} more`);
    }
    console.log('');
  }

  // Save cleaned data
  writeFileSync(LEADS_FILE, JSON.stringify(validLeads, null, 2));
  console.log(`Saved ${validLeads.length} leads to ${LEADS_FILE}`);

  // Also save removed leads for review
  if (removedLeads.length > 0) {
    const removedFile = './output/removed-leads.json';
    writeFileSync(removedFile, JSON.stringify(removedLeads, null, 2));
    console.log(`Removed leads saved to ${removedFile} for review`);
  }
}

main();
