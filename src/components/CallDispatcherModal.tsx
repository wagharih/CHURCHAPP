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

  if (!isOpen || !member) return null;

  const cleanPhone = getCleanPhone(member.phoneNumber);
  const googleVoiceMsgUrl = getGoogleVoiceMessageUrl(member.phoneNumber);
  const googleVoiceCallUrl = getGoogleVoiceCallUrl(member.phoneNumber);
  const nativeSmsUrl = getNativeSmsUrl(member.phoneNumber, messageText);
  const googleMessagesWebUrl = getGoogleMessagesWebUrl(member.phoneNumber);
  const whatsappUrl = getWhatsAppUrl(member.phoneNumber, messageText);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDispatchGoogleVoice = () => {
    handleCopyMessage();
    saveOutreachLog({
      type: mode === 'welcome' ? 'welcome' : 'broadcast',
      recipientName: member.fullName,
      phoneNumber: member.phoneNumber,
      messageText,
      channel: 'google_voice',
      status: 'opened',
    });
    window.open(googleVoiceMsgUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDispatchCall = () => {
    saveOutreachLog({
      type: 'direct_call',
      recipientName: member.fullName,
      phoneNumber: member.phoneNumber,
      messageText: `Pastoral call placed to ${member.fullName}`,
      channel: 'phone_call',
      status: 'opened',
    });
    window.open(googleVoiceCallUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDispatchNativeSms = () => {
    saveOutreachLog({
      type: mode === 'welcome' ? 'welcome' : 'broadcast',
      recipientName: member.fullName,
      phoneNumber: member.phoneNumber,
      messageText,
      channel: 'sms',
      status: 'opened',
    });
    window.open(nativeSmsUrl, '_self');
  };

  const handleMarkAsSentInSheet = async () => {
    setIsUpdatingSheet(true);
    try {
      await onMarkWelcomedAndSynced(member, staffNote);
      saveOutreachLog({
        type: mode === 'welcome' ? 'welcome' : 'broadcast',
        recipientName: member.fullName,
        phoneNumber: member.phoneNumber,
        messageText,
        channel: 'google_voice',
        status: 'sent',
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingSheet(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-rose-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-rose-400">
              {mode === 'call' ? <PhoneCall className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {mode === 'welcome'
                  ? 'Send Welcome Message'
                  : mode === 'call'
                  ? 'Pastoral Call via Google Voice'
                  : 'Outreach Dispatcher'}
              </h2>
              <p className="text-xs text-slate-300">
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
          {/* Member Card */}
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
                <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                Personalized Message Text
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-xs text-slate-600 hover:text-indigo-600 font-medium flex items-center gap-1"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied to Clipboard!</span>
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
              className="w-full p-3 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition leading-relaxed font-sans"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
              <span>Personalized for {member.fullName}</span>
              <span>{messageText.length} characters</span>
            </div>
          </div>

          {/* Outreach Channels Buttons */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Launch Outreach Channel
            </label>

            {/* Google Voice Button */}
            <button
              onClick={handleDispatchGoogleVoice}
              className="w-full p-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-semibold text-xs flex items-center justify-between shadow-md transition group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-sm">Send via Google Voice / Google Call</div>
                  <div className="text-[11px] text-emerald-100 font-normal">
                    Opens voice.google.com with recipient number {cleanPhone}
                  </div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-emerald-200" />
            </button>

            {/* Direct Google Voice Call */}
            <button
              onClick={handleDispatchCall}
              className="w-full p-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs flex items-center justify-between transition"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <PhoneCall className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-xs">Call Member via Google Voice</div>
                  <div className="text-[10px] text-slate-400">Pastoral phone call check-in</div>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Other Mobile / Native SMS options */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleDispatchNativeSms}
                className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                <span>Open in SMS App</span>
              </button>

              <button
                onClick={() => window.open(googleMessagesWebUrl, '_blank')}
                className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>Google Messages Web</span>
              </button>
            </div>
          </div>

          {/* Sync to Sheet Section */}
          <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100 space-y-2">
            <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              Update Google Sheet Status
            </span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Once you have sent the welcome message or placed the call, mark this member as Welcomed. This
              updates row #{member.rowNumber} directly in your connected Google Sheet.
            </p>
            <button
              onClick={handleMarkAsSentInSheet}
              disabled={isUpdatingSheet}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isUpdatingSheet ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Updating Google Sheet Row #{member.rowNumber}...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark as Welcomed &amp; Sync to Sheet</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
