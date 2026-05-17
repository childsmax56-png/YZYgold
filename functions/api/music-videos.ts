import { parseCSV, csvResponse } from './_csvParser';

// Remap Kendrick MV CSV columns (multiline headers, different field names) to VideoRawEntry
function remapRow(row: Record<string, string>): Record<string, string> {
  const nameKey = Object.keys(row).find(k => k.startsWith('Name')) || 'Name';
  const notesKey = Object.keys(row).find(k => k.startsWith('Notes')) || 'Notes';
  const lengthKey = Object.keys(row).find(k => k.toLowerCase().includes('length')) || 'Length';
  const dateKey = Object.keys(row).find(k => k.toLowerCase().includes('date')) || 'Date Made';
  // Kendrick CSV uses "Streaming" (Yes/No) instead of "Available Length"
  const availKey = Object.keys(row).find(k => k.includes('Available')) || '';

  return {
    Era: row.Era || '',
    Name: row[nameKey] || '',
    Notes: row[notesKey] || '',
    Length: row[lengthKey] || '',
    'Date Made': row[dateKey] || '',
    Type: row.Type || '',
    'Available Length': availKey ? (row[availKey] || '') : (row.Streaming || ''),
    Quality: row.Quality || '',
    'Link(s)': row['Link(s)'] || '',
  };
}

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const csvUrl = `${url.origin}/data/music-videos.csv`;

  const res = await fetch(csvUrl);
  if (!res.ok) return new Response('CSV not found', { status: 404 });

  const text = await res.text();
  const rows = parseCSV(text);
  const remapped = rows.map(remapRow);

  return csvResponse(remapped);
};
