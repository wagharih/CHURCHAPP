import { MemberRecord, ChurchEvent, OutreachLog } from '../types';

export function getCleanPhone(phone: string): string {
  // Strip parentheses, spaces, hyphens, keep leading + if present
  let clean = phone.replace(/[^\d+]/g, '');
  // If 10 digits (US standard without country code), prepend +1
  if (/^\d{10}$/.test(clean)) {
    clean = '+1' + clean;
  }
  return clean;
}

export function formatDisplayPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone || 'No phone provided';
}

export function getFirstName(fullName: string): string {
  if (!fullName) return 'Beloved Friend';
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || fullName;
}

export function replaceMessageVariables(
  template: string,
  member: Partial<MemberRecord>,
  options: {
    churchName?: string;
    event?: Partial<ChurchEvent>;
    customScripture?: string;
    staffName?: string;
  } = {}
): string {
  const churchName = options.churchName || 'Grace Fellowship Church';
  const firstName = member.fullName ? getFirstName(member.fullName) : 'Beloved Friend';
  const fullName = member.fullName || 'Beloved Friend';
  const ministry = member.ministry || 'Church Family';
  const scripture = options.customScripture || 'Romans 15:7 - "Accept one another, then, just as Christ accepted you, in order to bring praise to God."';

  let msg = template
    .replace(/{First_Name}/gi, firstName)
    .replace(/{FirstName}/gi, firstName)
    .replace(/{Full_Name}/gi, fullName)
    .replace(/{FullName}/gi, fullName)
    .replace(/{Church_Name}/gi, churchName)
    .replace(/{ChurchName}/gi, churchName)
    .replace(/{Ministry}/gi, ministry)
    .replace(/{Phone_Number}/gi, member.phoneNumber || '')
    .replace(/{Scripture}/gi, scripture);

  if (options.event) {
    msg = msg
      .replace(/{Event_Title}/gi, options.event.title || 'Worship Night')
      .replace(/{Event_Date}/gi, options.event.date || 'This Week')
      .replace(/{Event_Time}/gi, options.event.time || '7:00 PM')
      .replace(/{Location}/gi, options.event.location || 'Main Sanctuary')
      .replace(/{Event_Description}/gi, options.event.description || '');
  }

  return msg.trim();
}

/**
 * Google Voice Web URLs:
 * Messaging: https://voice.google.com/u/0/messages?query=<phone>
 * Calling: https://voice.google.com/calls?number=<phone>
 */
export function getGoogleVoiceMessageUrl(phoneNumber: string): string {
  const clean = getCleanPhone(phoneNumber);
  return `https://voice.google.com/u/0/messages?query=${encodeURIComponent(clean)}`;
}

export function getGoogleVoiceCallUrl(phoneNumber: string): string {
  const clean = getCleanPhone(phoneNumber);
  return `https://voice.google.com/calls?number=${encodeURIComponent(clean)}`;
}

export function getNativeSmsUrl(phoneNumber: string, message: string): string {
  const clean = getCleanPhone(phoneNumber);
  return `sms:${clean}?body=${encodeURIComponent(message)}`;
}

export function getGoogleMessagesWebUrl(phoneNumber: string): string {
  const clean = getCleanPhone(phoneNumber);
  return `https://messages.google.com/web/conversations/new?phone=${encodeURIComponent(clean)}`;
}

export function getWhatsAppUrl(phoneNumber: string, message: string): string {
  const clean = getCleanPhone(phoneNumber).replace('+', '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

// Local outreach history tracking
const LOGS_STORAGE_KEY = 'ministry_pulse_outreach_logs_v1';

export function getOutreachLogs(): OutreachLog[] {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOutreachLog(log: Omit<OutreachLog, 'id' | 'timestamp'>): OutreachLog {
  const logs = getOutreachLogs();
  const newLog: OutreachLog = {
    ...log,
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  logs.unshift(newLog);
  // Keep last 300 logs
  if (logs.length > 300) logs.pop();
  try {
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save log to localStorage:', err);
  }
  return newLog;
}

export function clearOutreachLogs(): void {
  try {
    localStorage.removeItem(LOGS_STORAGE_KEY);
  } catch (err) {
    console.error(err);
  }
}
