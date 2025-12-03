import { readFileSync, writeFileSync, existsSync } from 'fs';
import { Lead } from './types.js';

const INPUT_FILE = './output/leads.json';
const OUTPUT_FILE = './output/leads.csv';

/**
 * Escape a value for CSV format
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function main() {
  console.log('Lead Scout - CSV Export');
  console.log('');

  if (!existsSync(INPUT_FILE)) {
    console.error(`No leads file found at ${INPUT_FILE}`);
    console.error('Run "npm run search" first to collect leads.');
    process.exit(1);
  }

  const leads: Lead[] = JSON.parse(readFileSync(INPUT_FILE, 'utf-8'));

  if (leads.length === 0) {
    console.log('No leads to export.');
    return;
  }

  // CSV headers
  const headers = [
    'name',
    'role',
    'company',
    'linkedinUrl',
    'confidence',
    'discoveredAt',
    'snippet',
  ];

  // Build CSV rows
  const rows = [
    headers.join(','),
    ...leads.map((lead) =>
      headers
        .map((h) => escapeCSV(String(lead[h as keyof Lead] || '')))
        .join(',')
    ),
  ];

  writeFileSync(OUTPUT_FILE, rows.join('\n'));

  console.log(`Exported ${leads.length} leads to ${OUTPUT_FILE}`);

  // Show summary by company
  const byCompany = new Map<string, number>();
  for (const lead of leads) {
    const count = byCompany.get(lead.company) || 0;
    byCompany.set(lead.company, count + 1);
  }

  console.log('');
  console.log('Leads by company:');
  const sorted = [...byCompany.entries()].sort((a, b) => b[1] - a[1]);
  for (const [company, count] of sorted.slice(0, 10)) {
    console.log(`  ${company}: ${count}`);
  }
  if (sorted.length > 10) {
    console.log(`  ... and ${sorted.length - 10} more companies`);
  }
}

main();
