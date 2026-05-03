import { parseCSV, csvResponse } from './_csvParser';

function parseSongName(raw: string): { name: string; extra: string | undefined } {
  const newline = raw.indexOf('\n');
  if (newline === -1) return { name: raw.trim(), extra: undefined };
  const name = raw.substring(0, newline).trim();
  const extra = raw.substring(newline).trim().replace(/^\n+/, '') || undefined;
  return { name, extra };
}

export const onRequestGet: PagesFunction = async (context) => {
  try {
    const url = new URL(context.request.url);
    const csvUrl = `${url.origin}/data/unreleased.csv`;

    const res = await fetch(csvUrl);
    if (!res.ok) return new Response('CSV not found', { status: 404 });

    const text = await res.text();
    const rows = parseCSV(text);

    const NAME_KEY = 'Name\n(Join The Discord!)';
    const eras: Record<string, any> = {};

    // First pass: collect real era names from header rows.
    // Header rows have newlines in the Era field (file counts). Stats rows also have newlines
    // but their Name field starts with a digit — skip those.
    const validEraNames = new Set<string>();
    for (const row of rows) {
      const eraField = row['Era'] ?? '';
      if (!eraField.includes('\n')) continue;
      const { name: eraName } = parseSongName(row[NAME_KEY] ?? '');
      if (eraName && !/^\d/.test(eraName)) validEraNames.add(eraName);
    }

    // Second pass: build eras and songs, ignoring anything outside known eras.
    for (const row of rows) {
      const eraField = row['Era'] ?? '';
      const nameField = row[NAME_KEY] ?? '';

      if (eraField.includes('\n')) {
        // Era header row
        const { name: eraName, extra } = parseSongName(nameField);
        if (!eraName || !validEraNames.has(eraName)) continue;

        eras[eraName] = {
          name: eraName,
          extra: extra ?? undefined,
          timeline: row['Notes']?.trim() || undefined,
          fileInfo: eraField.split('\n').map((l: string) => l.trim()).filter(Boolean),
          data: { 'Unreleased Tracks': [] },
        };
      } else if (eraField && validEraNames.has(eraField.trim())) {
        // Regular song row — only if it belongs to a known era
        const eraName = eraField.trim();
        if (!eras[eraName]) {
          eras[eraName] = { name: eraName, data: { 'Unreleased Tracks': [] } };
        }

        const { name, extra } = parseSongName(nameField);
        const links = (row['Link(s)'] ?? '').split('\n').map((l: string) => l.trim()).filter(Boolean);

        eras[eraName].data['Unreleased Tracks'].push({
          name,
          extra: extra ?? undefined,
          description: row['Notes'] ?? '',
          track_length: row['Track Length'] ?? '',
          file_date: row['File Date'] ?? '',
          leak_date: row['Leak Date'] ?? '',
          available_length: row['Available Length'] ?? '',
          quality: row['Quality'] ?? '',
          url: links[0] ?? '',
          urls: links,
        });
      }
    }

    const ERA_ORDER = [
      'Before The College Dropout',
      'The College Dropout',
      'Late Registration',
      'Graduation',
      '808s & Heartbreak',
      'Good Ass Job',
      'My Beautiful Dark Twisted Fantasy',
      'Watch The Throne',
      'Cruel Summer',
      'Thank God For Drugs',
      'Yeezus',
      'Cruel Winter [V1]',
      'Yeezus 2',
      'So Help Me God',
      'SWISH',
      'The Life Of Pablo',
      'Cruel Winter [V2]',
      'TurboGrafx 16',
      'LOVE EVERYONE',
      'DAYTONA',
      'ye',
      'KIDS SEE GHOSTS',
      'NASIR',
      'K.T.S.E.',
      'Good Ass Job (2018)',
      'Yandhi [V1]',
      'Yandhi [V2]',
      'JESUS IS KING',
      "God's Country",
      'JESUS IS KING: The Dr. Dre Version',
      'DONDA [V1]',
      'Donda [V2]',
      'Donda [V3]',
      'Donda 2',
      'WAR',
      'YEBU',
      'Bad Bitch Playbook',
      'VULTURES 1',
      'VULTURES 2',
      'The Elementary School Dropout',
      'VULTURES 3',
      'BULLY [V1]',
      'CUCK',
      'DONDA 2 (2025)',
      'NEVER STOP',
      'IN A PERFECT WORLD',
      'BULLY [V2]',
      'Ongoing',
    ];

    const orderedEras: Record<string, any> = {};
    for (const name of ERA_ORDER) {
      if (eras[name]) orderedEras[name] = eras[name];
    }
    // Append any eras from the CSV not in the order list
    for (const name of Object.keys(eras)) {
      if (!orderedEras[name]) orderedEras[name] = eras[name];
    }

    const trackerData = {
      name: 'YZY Gold',
      tabs: ['eras'],
      current_tab: 'eras',
      eras: orderedEras,
    };

    return csvResponse(trackerData);
  } catch (err) {
    return new Response('Failed to build tracker data', { status: 500 });
  }
};
