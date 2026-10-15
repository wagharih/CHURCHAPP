import { MemberRecord, ChurchEvent, OutreachLog, CheckInRecord, TesterContact } from '../types';

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
  member?: Partial<MemberRecord> | null,
  options: {
    churchName?: string;
    event?: Partial<ChurchEvent>;
    customScripture?: string;
    staffName?: string;
    googleVoiceNumber?: string;
  } = {}
): string {
  const safeMember = member || {};
  const churchName = options?.churchName || 'Grace Fellowship Church';
  const firstName = safeMember.fullName ? getFirstName(safeMember.fullName) : 'Beloved Friend';
  const fullName = safeMember.fullName || 'Beloved Friend';
  const ministry = safeMember.ministry || 'Church Family';
  const scripture = options?.customScripture || 'Romans 15:7 - "Accept one another, then, just as Christ accepted you, in order to bring praise to God."';
  const gvNumber = options?.googleVoiceNumber || getSmsGatewayConfig().googleVoiceNumber || '';

  let msg = (template || '')
    .replace(/{First_Name}/gi, firstName)
    .replace(/{FirstName}/gi, firstName)
    .replace(/{Full_Name}/gi, fullName)
    .replace(/{FullName}/gi, fullName)
    .replace(/{Church_Name}/gi, churchName)
    .replace(/{ChurchName}/gi, churchName)
    .replace(/{Ministry}/gi, ministry)
    .replace(/{Phone_Number}/gi, safeMember.phoneNumber || '')
    .replace(/{Scripture}/gi, scripture)
    .replace(/{Church_Phone_Number}/gi, gvNumber || 'our church line')
    .replace(/{Church_Phone}/gi, gvNumber || 'our church line')
    .replace(/{Google_Voice_Number}/gi, gvNumber || 'our Google Voice line')
    .replace(/{GoogleVoiceNumber}/gi, gvNumber || 'our Google Voice line');

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

export interface SmsGatewayConfig {
  provider: 'direct_cloud' | 'twilio' | 'google_voice_assisted';
  googleVoiceNumber?: string;
  googleVoiceEmail?: string;
  googleVoiceSlot?: number;
  googleVoiceRoutingMode?: 'email' | 'slot';
  twilioSid?: string;
  twilioToken?: string;
  twilioFromNumber?: string;
  senderName?: string;
  directAutoSendEnabled: boolean;
}

export const DEFAULT_SMS_GATEWAY_CONFIG: SmsGatewayConfig = {
  provider: 'direct_cloud',
  googleVoiceNumber: '',
  googleVoiceEmail: '',
  googleVoiceSlot: 0,
  googleVoiceRoutingMode: 'email',
  senderName: 'Church Outreach Ministry',
  directAutoSendEnabled: true,
};

export function getSmsGatewayConfig(): SmsGatewayConfig {
  try {
    const raw = localStorage.getItem('mp_sms_gateway_config');
    return raw ? { ...DEFAULT_SMS_GATEWAY_CONFIG, ...JSON.parse(raw) } : DEFAULT_SMS_GATEWAY_CONFIG;
  } catch {
    return DEFAULT_SMS_GATEWAY_CONFIG;
  }
}

/**
 * Google Voice Web URLs:
 * Direct routing supports either:
 * 1) authuser=<churchEmail> (routes directly to the matching church Google session)
 * 2) slot /u/<index>/ (fallback for account slot order)
 */
export function getGoogleVoiceMessageUrl(phoneNumber: string, config?: SmsGatewayConfig): string {
  const clean = getCleanPhone(phoneNumber);
  const cfg = config || getSmsGatewayConfig();
  const cleanParam = encodeURIComponent(clean);
  const slot = typeof cfg.googleVoiceSlot === 'number' && !isNaN(cfg.googleVoiceSlot) ? cfg.googleVoiceSlot : 0;
  const churchEmail = (cfg.googleVoiceEmail || '').trim();

  // If church email is provided and routing mode is 'email' (or default), use authuser for exact profile matching
  if (churchEmail && cfg.googleVoiceRoutingMode !== 'slot') {
    return `https://voice.google.com/u/${slot}/messages?query=${cleanParam}&authuser=${encodeURIComponent(churchEmail)}`;
  }

  return `https://voice.google.com/u/${slot}/messages?query=${cleanParam}`;
}

export function getGoogleVoiceCallUrl(phoneNumber: string, config?: SmsGatewayConfig): string {
  const clean = getCleanPhone(phoneNumber);
  const cfg = config || getSmsGatewayConfig();
  const cleanParam = encodeURIComponent(clean);
  const slot = typeof cfg.googleVoiceSlot === 'number' && !isNaN(cfg.googleVoiceSlot) ? cfg.googleVoiceSlot : 0;
  const churchEmail = (cfg.googleVoiceEmail || '').trim();

  if (churchEmail && cfg.googleVoiceRoutingMode !== 'slot') {
    return `https://voice.google.com/u/${slot}/calls?number=${cleanParam}&authuser=${encodeURIComponent(churchEmail)}`;
  }

  return `https://voice.google.com/u/${slot}/calls?number=${cleanParam}`;
}

export function getNativeSmsUrl(phoneNumber: string, message: string): string {
  const clean = getCleanPhone(phoneNumber);
  return `sms:${clean}?body=${encodeURIComponent(message)}`;
}

/**
 * Returns direct URL for Attendee Mobile Self-Service Check-In Kiosk
 */
export function getKioskUrl(): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}?mode=kiosk`;
}


export function getGoogleMessagesWebUrl(phoneNumber: string): string {
  const clean = getCleanPhone(phoneNumber);
  return `https://messages.google.com/web/conversations/new?phone=${encodeURIComponent(clean)}`;
}

export function getWhatsAppUrl(phoneNumber: string, message: string): string {
  const clean = getCleanPhone(phoneNumber).replace('+', '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export function saveSmsGatewayConfig(cfg: SmsGatewayConfig): void {
  try {
    localStorage.setItem('mp_sms_gateway_config', JSON.stringify(cfg));
  } catch (err) {
    console.error(err);
  }
}

export async function dispatchDirectSms(params: {
  to: string;
  message: string;
  recipientName: string;
  gatewayConfig?: SmsGatewayConfig;
}): Promise<{ success: boolean; messageId?: string; status: string; error?: string; provider: string }> {
  const cfg = params.gatewayConfig || getSmsGatewayConfig();
  const cleanTo = getCleanPhone(params.to);

  try {
    const res = await fetch('/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: cleanTo,
        message: params.message,
        recipientName: params.recipientName,
        gatewayConfig: cfg,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to dispatch SMS');
    }

    return {
      success: true,
      messageId: data.messageId,
      status: data.status || 'delivered',
      provider: data.provider || cfg.provider,
    };
  } catch (err: any) {
    console.error('Direct SMS dispatch failed:', err);
    return {
      success: false,
      status: 'failed',
      error: err.message || 'Network or carrier dispatch error',
      provider: cfg.provider,
    };
  }
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

// ----------------- TESTERS MANAGEMENT -----------------
const TESTERS_STORAGE_KEY = 'ministry_pulse_testers_v1';

export function getTesterContacts(): TesterContact[] {
  try {
    const raw = localStorage.getItem(TESTERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTesterContact(tester: Omit<TesterContact, 'id' | 'addedAt'>): TesterContact {
  const testers = getTesterContacts();
  const clean = getCleanPhone(tester.phoneNumber);
  
  // Update if phone already exists
  const existingIdx = testers.findIndex(t => t.cleanPhone === clean);
  const newTester: TesterContact = {
    ...tester,
    id: existingIdx >= 0 ? testers[existingIdx].id : `tester-${Date.now()}`,
    cleanPhone: clean,
    addedAt: existingIdx >= 0 ? testers[existingIdx].addedAt : new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    testers[existingIdx] = newTester;
  } else {
    testers.push(newTester);
  }

  try {
    localStorage.setItem(TESTERS_STORAGE_KEY, JSON.stringify(testers));
  } catch (err) {
    console.error('Failed to save tester:', err);
  }
  return newTester;
}

export function deleteTesterContact(id: string): void {
  const testers = getTesterContacts().filter(t => t.id !== id);
  try {
    localStorage.setItem(TESTERS_STORAGE_KEY, JSON.stringify(testers));
  } catch (err) {
    console.error(err);
  }
}

// ----------------- SUNDAY CHECK-INS / ATTENDANCE -----------------
const CHECKINS_STORAGE_KEY = 'ministry_pulse_checkins_v1';

export function getCheckInRecords(): CheckInRecord[] {
  try {
    const raw = localStorage.getItem(CHECKINS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCheckInRecord(record: Omit<CheckInRecord, 'id' | 'timestamp' | 'date'>): CheckInRecord {
  const all = getCheckInRecords();
  const today = new Date().toISOString().split('T')[0];
  const newCheckIn: CheckInRecord = {
    ...record,
    id: `chk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    date: today,
  };
  all.unshift(newCheckIn);
  try {
    localStorage.setItem(CHECKINS_STORAGE_KEY, JSON.stringify(all));
  } catch (err) {
    console.error('Failed to save check-in record:', err);
  }
  return newCheckIn;
}
