import { parseCSV, csvResponse } from './_csvParser';

// Remap Kendrick stems CSV columns to the names StemsView expects
function remapRow(row: Record<string, string>): Record<string, string> {
  // The Kendrick CSV has headers with actual newline chars and different note text
  const nameKey = Object.keys(row).find(k => k.startsWith('Name')) || 'Name';
  const notesKey = Object.keys(row).find(k => k.startsWith('Notes')) || 'Notes';
  const fullLengthKey = Object.keys(row).find(k => k.includes('Length') && !k.includes('Available')) || 'Full Length';
  const fileDateKey = Object.keys(row).find(k => k.includes('File') && k.includes('Date')) || 'File\nDate';
  const leakDateKey = Object.keys(row).find(k => k.includes('Leak') && k.includes('Date')) || 'Leak Date';
  const availLengthKey = Object.keys(row).find(k => k.includes('Available')) || 'Available Length';

  return {
    Era: row.Era || '',
    Name: row[nameKey] || '',
    // Map to the exact key parseStemsToEras uses
    "Notes\n(Join the Discord to help fix any issues + help with dead links)": row[notesKey] || '',
    "Full Length": row[fullLengthKey] || '',
    "File\nDate": row[fileDateKey] || '',
    "Leak Date": row[leakDateKey] || '',
    BPM: row.BPM || '',
    Key: row.Key || '',
    "Available Length": row[availLengthKey] || '',
    Quality: row.Quality || '',
    "Link(s)": row['Link(s)'] || '',
  };
}

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const csvUrl = `${url.origin}/data/stems.csv`;

  const res = await fetch(csvUrl);
  if (!res.ok) return new Response('CSV not found', { status: 404 });

  const text = await res.text();
  const rows = parseCSV(text);
  const remapped = rows.map(remapRow);

  return csvResponse(remapped);
};
