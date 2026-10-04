import { MemberRecord, SpreadsheetInfo, SheetTabInfo, ColumnMapping } from '../types';

export function colIndexToLetter(index: number): string {
  let temp = index;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

export async function listSpreadsheets(accessToken: string): Promise<SpreadsheetInfo[]> {
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime%20desc&pageSize=30&fields=files(id,name,modifiedTime)`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Drive API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    modifiedTime: f.modifiedTime,
  }));
}

export async function getSpreadsheetTabs(
  accessToken: string,
  spreadsheetId: string
): Promise<{ title: string; tabs: SheetTabInfo[] }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties(sheetId,title,index,gridProperties)`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Sheets API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const tabs: SheetTabInfo[] = (data.sheets || []).map((s: any) => ({
    sheetId: s.properties?.sheetId ?? 0,
    title: s.properties?.title || 'Sheet1',
    index: s.properties?.index ?? 0,
    rowCount: s.properties?.gridProperties?.rowCount,
    columnCount: s.properties?.gridProperties?.columnCount,
  }));

  return {
    title: data.properties?.title || 'Untitled Spreadsheet',
    tabs,
  };
}

export function detectColumnMapping(headers: string[]): ColumnMapping {
  let nameColIndex = 0;
  let phoneColIndex = 1;
  let ministryColIndex = 2;
  let dateColIndex = 3;
  let welcomeStatusColIndex = 4;
  let lastBroadcastColIndex = 5;
  let notesColIndex = 6;

  headers.forEach((header, idx) => {
    const h = header.trim().toLowerCase();
    if (/(name|member|person|attendee|full\s*name|first\s*name)/i.test(h) && nameColIndex === 0) {
      nameColIndex = idx;
    } else if (/(phone|cell|mobile|number|tel|contact)/i.test(h)) {
      phoneColIndex = idx;
    } else if (/(ministry|dept|department|group|interest|unit)/i.test(h)) {
      ministryColIndex = idx;
    } else if (/(date|registered|joined|timestamp|created)/i.test(h)) {
      dateColIndex = idx;
    } else if (/(welcome|greet|status)/i.test(h)) {
      welcomeStatusColIndex = idx;
    } else if (/(broadcast|update|notification)/i.test(h)) {
      lastBroadcastColIndex = idx;
    } else if (/(note|comment|remark|prayer)/i.test(h)) {
      notesColIndex = idx;
    }
  });

  return {
    nameColIndex,
    phoneColIndex,
    ministryColIndex,
    dateColIndex,
    welcomeStatusColIndex,
    lastBroadcastColIndex,
    notesColIndex,
  };
}

export async function loadSheetMembers(
  accessToken: string,
  spreadsheetId: string,
  tabName: string
): Promise<{ members: MemberRecord[]; headers: string[]; mapping: ColumnMapping }> {
  const safeTab = encodeURIComponent(`'${tabName}'`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${safeTab}!A1:Z1000`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Sheets fetch error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const rows: string[][] = data.values || [];

  if (rows.length === 0) {
    const defaultHeaders = [
      'Full Name',
      'Phone Number',
      'Ministry / Department',
      'Registration Date',
      'Welcome Status',
      'Last Broadcast Date',
      'Notes',
    ];
    return {
      members: [],
      headers: defaultHeaders,
      mapping: detectColumnMapping(defaultHeaders),
    };
  }

  const rawHeaders = rows[0].map(h => String(h || ''));
  const mapping = detectColumnMapping(rawHeaders);

  const members: MemberRecord[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const fullName = String(row[mapping.nameColIndex] || '').trim();
    const phoneNumber = String(row[mapping.phoneColIndex] || '').trim();

    // Skip empty placeholder rows
    if (!fullName && !phoneNumber) continue;

    const ministry = String(row[mapping.ministryColIndex] || 'General Ministry').trim();
    const registeredAt = String(row[mapping.dateColIndex] || new Date().toISOString().split('T')[0]).trim();
    const welcomeRaw = String(row[mapping.welcomeStatusColIndex] || 'Pending').trim();
    const welcomeStatus = /welcomed|sent|completed|yes/i.test(welcomeRaw) ? 'Welcomed' : 'Pending';
    const lastBroadcastDate = row[mapping.lastBroadcastColIndex] ? String(row[mapping.lastBroadcastColIndex]).trim() : '';
    const notes = row[mapping.notesColIndex] ? String(row[mapping.notesColIndex]).trim() : '';

    members.push({
      id: `member-${i + 1}-${Date.now()}`,
      rowNumber: i + 1, // 1-indexed row number in the sheet
      fullName: fullName || 'Anonymous Attendee',
      phoneNumber,
      cleanPhone: cleanPhoneNumber(phoneNumber),
      ministry: ministry || 'General Ministry',
      registeredAt,
      welcomeStatus,
      lastBroadcastDate,
      notes,
      rawValues: row,
    });
  }

  return {
    members,
    headers: rawHeaders,
    mapping,
  };
}

export async function appendMemberToSheet(
  accessToken: string,
  spreadsheetId: string,
  tabName: string,
  member: Omit<MemberRecord, 'id' | 'rowNumber' | 'cleanPhone'>,
  headersCount = 7
): Promise<{ rowNumber: number }> {
  const safeTab = encodeURIComponent(`'${tabName}'`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${safeTab}!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const rowValues = new Array(Math.max(headersCount, 7)).fill('');
  rowValues[0] = member.fullName;
  rowValues[1] = member.phoneNumber;
  rowValues[2] = member.ministry;
  rowValues[3] = member.registeredAt || new Date().toISOString().split('T')[0];
  rowValues[4] = member.welcomeStatus || 'Pending';
  rowValues[5] = member.lastBroadcastDate || '';
  rowValues[6] = member.notes || '';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [rowValues],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to append member to sheet (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const updatedRange: string = result.updates?.updatedRange || '';
  const match = updatedRange.match(/!A(\d+)/i) || updatedRange.match(/:[A-Z]+(\d+)/i);
  const rowNumber = match ? parseInt(match[1], 10) : 2;

  return { rowNumber };
}

export async function updateMemberInSheet(
  accessToken: string,
  spreadsheetId: string,
  tabName: string,
  rowNumber: number,
  member: Partial<MemberRecord>,
  existingRowValues?: string[]
): Promise<void> {
  const safeTab = encodeURIComponent(`'${tabName}'`);
  const length = Math.max(existingRowValues?.length || 0, 7);
  const values = existingRowValues ? [...existingRowValues] : new Array(length).fill('');

  while (values.length < length) values.push('');

  if (member.fullName !== undefined) values[0] = member.fullName;
  if (member.phoneNumber !== undefined) values[1] = member.phoneNumber;
  if (member.ministry !== undefined) values[2] = member.ministry;
  if (member.registeredAt !== undefined) values[3] = member.registeredAt;
  if (member.welcomeStatus !== undefined) values[4] = member.welcomeStatus;
  if (member.lastBroadcastDate !== undefined) values[5] = member.lastBroadcastDate;
  if (member.notes !== undefined) values[6] = member.notes;

  const endCol = colIndexToLetter(values.length - 1);
  const range = `${safeTab}!A${rowNumber}:${endCol}${rowNumber}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [values],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update member in sheet (${response.status}): ${errorText}`);
  }
}

export async function updateCellInSheet(
  accessToken: string,
  spreadsheetId: string,
  tabName: string,
  rowNumber: number,
  colIndex: number,
  value: string
): Promise<void> {
  const safeTab = encodeURIComponent(`'${tabName}'`);
  const colLetter = colIndexToLetter(colIndex);
  const range = `${safeTab}!${colLetter}${rowNumber}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [[value]],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update cell in sheet (${response.status}): ${errorText}`);
  }
}

export async function createChurchMinistrySpreadsheet(
  accessToken: string,
  title: string
): Promise<{ id: string; name: string }> {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';

  const initialRows = [
    [
      'Full Name',
      'Phone Number',
      'Ministry / Department',
      'Registration Date',
      'Welcome Status',
      'Last Broadcast Date',
      'Notes',
    ],
    [
      'Sarah Jenkins',
      '+1 (555) 234-5678',
      'Worship & Creative Arts',
      new Date().toISOString().split('T')[0],
      'Pending',
      '',
      'Interested in choir and acoustic guitar team',
    ],
    [
      'David Miller',
      '+1 (555) 345-6789',
      'Youth & Young Adults',
      new Date().toISOString().split('T')[0],
      'Welcomed',
      '',
      'Attended Friday youth night, wants to join prayer group',
    ],
    [
      'Grace Adeleke',
      '+1 (555) 456-7890',
      'Community Outreach',
      new Date().toISOString().split('T')[0],
      'Pending',
      '',
      'First-time visitor on Sunday celebration',
    ],
  ];

  const payload = {
    properties: {
      title: title || 'Church Ministry & Outreach Registrations',
    },
    sheets: [
      {
        properties: {
          title: 'Registrations',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: initialRows.map(row => ({
              values: row.map(cell => ({
                userEnteredValue: { stringValue: cell },
              })),
            })),
          },
        ],
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create spreadsheet in Drive (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return {
    id: result.spreadsheetId,
    name: result.properties?.title || title,
  };
}
