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
  dispatchDirectSms,
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
  const [isSendingDirect, setIsSendingDirect] = useState(false);
  const [directSentSuccess, setDirectSentSuccess] = useState(false);
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

  // DIRECT IN-APP 1-CLICK DISPATCH
  const handleDirectSendNow = async () => {
    setIsSendingDirect(true);
    try {
      const cfg = getSmsGatewayConfig();
      const res = await dispatchDirectSms({
        to: member.phoneNumber,
        message: messageText,
        recipientName: member.fullName,
        gatewayConfig: cfg,
      });

      if (res.success) {
        setDirectSentSuccess(true);
        saveOutreachLog({
          type: mode === 'welcome' ? 'welcome' : 'broadcast',
          recipientName: member.fullName,
          phoneNumber: member.phoneNumber,
          messageText,
          channel: 'sms',
          status: 'sent',
        });

        // Automatically update Google Sheet row!
        await onMarkWelcomedAndSynced(member, staffNote);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        alert(res.error || 'Failed to dispatch direct message');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error sending direct SMS');
    } finally {
      setIsSendingDirect(false);
    }
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

          {/* PRIMARY 1-CLICK DIRECT SEND BUTTON */}
          <div className="bg-gradient-to-r from-rose-50 to-indigo-50 p-4 rounded-xl border border-rose-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-600" />
                Direct 1-Click Send (No External Transfers)
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                Instant Delivery
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Dispatches directly to {formatDisplayPhone(member.phoneNumber)} without opening Google Voice or leaving the app,
              and automatically updates Google Sheet status to Welcomed.
            </p>

            <button
              onClick={handleDirectSendNow}
              disabled={isSendingDirect || directSentSuccess}
              className="w-full py-3 px-4 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 group"
            >
              {isSendingDirect ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Dispatching Message Directly...</span>
                </>
              ) : directSentSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Message Sent &amp; Google Sheet Updated!</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
                  <span>⚡ SEND WELCOME DIRECTLY NOW (NO TRANSFER)</span>
                </>
              )}
            </button>
          </div>

          {/* Secondary Options */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Or Open in External Tools
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleDispatchGoogleVoice}
                className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Google Voice Web</span>
              </button>

              <button
                onClick={handleDispatchCall}
                className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <PhoneCall className="w-3.5 h-3.5 text-slate-700" />
                <span>Place Voice Call</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
