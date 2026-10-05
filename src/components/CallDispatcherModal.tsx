import React, { useState } from 'react';
import { MemberRecord } from '../types';
import {
  formatDisplayPhone,
  getCleanPhone,
  getGoogleVoiceMessageUrl,
  getGoogleVoiceCallUrl,
  getNativeSmsUrl,
  getGoogleMessagesWebUrl,
  getWhatsAppUrl,
  saveOutreachLog,
  getSmsGatewayConfig,
} from '../services/communications';
import {
  Phone,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  X,
  Send,
  PhoneCall,
  Smartphone,
  Share2,
  Zap,
} from 'lucide-react';

interface CallDispatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberRecord | null;
  initialMessage: string;
  mode: 'welcome' | 'custom' | 'call';
  onMarkWelcomedAndSynced: (member: MemberRecord, note?: string) => Promise<void>;
  churchName: string;
}

export const CallDispatcherModal: React.FC<CallDispatcherModalProps> = ({
  isOpen,
  onClose,
  member,
  initialMessage,
  mode,
  onMarkWelcomedAndSynced,
  churchName,
}) => {
  const [messageText, setMessageText] = useState(initialMessage);
  const [copied, setCopied] = useState(false);
  const [isUpdatingSheet, setIsUpdatingSheet] = useState(false);
  const [staffNote, setStaffNote] = useState('');
  const [sentNotice, setSentNotice] = useState(false);

  if (!isOpen || !member) return null;

  const cleanPhone = getCleanPhone(member.phoneNumber);
  const googleVoiceMsgUrl = getGoogleVoiceMessageUrl(member.phoneNumber);
  const googleVoiceCallUrl = getGoogleVoiceCallUrl(member.phoneNumber);
  const nativeSmsUrl = getNativeSmsUrl(member.phoneNumber, messageText);
  const gatewayConfig = getSmsGatewayConfig();

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // SEND VIA GOOGLE VOICE
  const handleDispatchGoogleVoice = async () => {
    // 1. Copy message text to clipboard
    navigator.clipboard.writeText(messageText);
    setCopied(true);

    // 2. Open Google Voice directly to this member's chat
    window.open(googleVoiceMsgUrl, '_blank', 'noopener,noreferrer');

    // 3. Mark as welcomed/sent in Google Sheet
    setIsUpdatingSheet(true);
    try {
      await onMarkWelcomedAndSynced(member, staffNote);
      saveOutreachLog({
        type: mode === 'welcome' ? 'welcome' : 'broadcast',
        recipientName: member.fullName,
        phoneNumber: member.phoneNumber,
        messageText,
        channel: 'google_voice',
        status: 'opened',
      });
      setSentNotice(true);
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingSheet(false);
    }
  };

  // SEND VIA PHONE SMS APP (Pre-fills message text)
  const handleDispatchNativeSms = async () => {
    window.open(nativeSmsUrl, '_self');
    setIsUpdatingSheet(true);
    try {
      await onMarkWelcomedAndSynced(member, staffNote);
      saveOutreachLog({
        type: mode === 'welcome' ? 'welcome' : 'broadcast',
        recipientName: member.fullName,
        phoneNumber: member.phoneNumber,
        messageText,
        channel: 'sms',
        status: 'opened',
      });
      setSentNotice(true);
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingSheet(false);
    }
  };

  // PLACE VOICE CALL
  const handleDispatchCall = () => {
    saveOutreachLog({
      type: 'direct_call',
      recipientName: member.fullName,
      phoneNumber: member.phoneNumber,
      messageText: `Pastoral check-in call with ${member.fullName}`,
      channel: 'phone_call',
      status: 'opened',
    });
    window.open(googleVoiceCallUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
              {mode === 'call' ? <PhoneCall className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {mode === 'welcome'
                  ? 'Send Welcome via Google Voice'
                  : mode === 'call'
                  ? 'Pastoral Call via Google Voice'
                  : 'Outreach Dispatcher'}
              </h2>
              <p className="text-xs text-emerald-200">
                Outreach to {member.fullName} ({member.ministry})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Recipient Details */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Recipient Details
              </span>
              <div className="text-sm font-bold text-slate-900 mt-0.5">{member.fullName}</div>
              <div className="text-xs text-indigo-600 font-medium">{member.ministry}</div>
            </div>
            <div className="text-right">
              <span className="font-mono text-sm font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-200 shadow-xs">
                {formatDisplayPhone(member.phoneNumber)}
              </span>
              <div className="text-[10px] text-slate-400 mt-1">
                Status: {member.welcomeStatus || 'Pending'}
              </div>
            </div>
          </div>

          {/* Editable Message text */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                Personalized Message Text
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-xs text-slate-600 hover:text-emerald-700 font-medium flex items-center gap-1"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={4}
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              className="w-full p-3 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition leading-relaxed font-sans"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
              <span>Personalized for {member.fullName}</span>
              <span>{messageText.length} characters</span>
            </div>
          </div>

          {/* PRIMARY GOOGLE VOICE DISPATCH BUTTON */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-emerald-700" />
                Send via Your Church Google Voice Line
              </span>
              <span className="text-[10px] font-semibold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">
                {gatewayConfig.googleVoiceNumber ? formatDisplayPhone(gatewayConfig.googleVoiceNumber) : 'Caller ID Active'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Clicking below copies this message to your clipboard, opens Google Voice directly to {member.fullName}'s number, and marks their status in your Google Sheet!
            </p>

            <button
              onClick={handleDispatchGoogleVoice}
              disabled={isUpdatingSheet || sentNotice}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 group cursor-pointer"
            >
              {sentNotice ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Opened in Google Voice &amp; Sheet Updated!</span>
                </>
              ) : isUpdatingSheet ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Updating Sheet &amp; Opening...</span>
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform" />
                  <span>📞 OPEN IN GOOGLE VOICE &amp; COPY MESSAGE</span>
                </>
              )}
            </button>
          </div>

          {/* Secondary Dispatch Options */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleDispatchNativeSms}
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
              <span>Open in Phone SMS</span>
            </button>

            <button
              onClick={handleDispatchCall}
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <PhoneCall className="w-3.5 h-3.5 text-slate-700" />
              <span>Place Voice Call</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
