export interface MemberRecord {
  id: string;
  rowNumber: number; // 1-indexed row number in Google Sheet
  fullName: string;
  phoneNumber: string;
  cleanPhone: string;
  ministry: string;
  registeredAt: string;
  welcomeStatus: 'Pending' | 'Welcomed' | string;
  lastBroadcastDate?: string;
  notes?: string;
  rawValues?: string[];
}

export interface ChurchEvent {
  id: string;
  title: string;
  subtitle?: string;
  date: string;
  time: string;
  location: string;
  category: 'worship' | 'revival' | 'youth' | 'outreach' | 'sunday' | 'prayer';
  description: string;
  scripture?: string;
  dressCodeOrNote?: string;
}

export interface OutreachLog {
  id: string;
  timestamp: string;
  type: 'welcome' | 'broadcast' | 'direct_call' | 'direct_sms';
  recipientName: string;
  phoneNumber: string;
  messageText: string;
  channel: 'google_voice' | 'sms' | 'phone_call' | 'whatsapp';
  status: 'sent' | 'opened' | 'logged';
  eventTitle?: string;
  staffName?: string;
}

export interface ColumnMapping {
  nameColIndex: number;
  phoneColIndex: number;
  ministryColIndex: number;
  dateColIndex: number;
  welcomeStatusColIndex: number;
  lastBroadcastColIndex: number;
  notesColIndex: number;
}

export interface SpreadsheetInfo {
  id: string;
  name: string;
  modifiedTime?: string;
}

export interface SheetTabInfo {
  sheetId: number;
  title: string;
  index: number;
  rowCount?: number;
  columnCount?: number;
}

export interface GoogleFormQuestion {
  questionId: string;
  title: string;
  type: string;
  required?: boolean;
}

export interface GoogleFormInfo {
  formId: string;
  title: string;
  description?: string;
  responderUri?: string;
  linkedSheetId?: string;
  questions: GoogleFormQuestion[];
}

export interface GoogleFormResponse {
  responseId: string;
  createTime: string;
  lastSubmittedTime?: string;
  answers: Record<string, string[]>;
  extractedName?: string;
  extractedPhone?: string;
  extractedMinistry?: string;
  extractedNotes?: string;
}

