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
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [gvStep, setGvStep] = useState<'idle' | 'phone_copied_open' | 'message_copied' | 'completed'>('idle');
  const [isUpdatingSheet, setIsUpdatingSheet] = useState(false);
  const [staffNote, setStaffNote] = useState('');
  const [sentNotice, setSentNotice] = useState(false);

  if (!isOpen || !member) return null;

  const gatewayConfig = getSmsGatewayConfig();
  const cleanPhone = getCleanPhone(member.phoneNumber);
  const googleVoiceMsgUrl = getGoogleVoiceMessageUrl(member.phoneNumber, gatewayConfig);
  const googleVoiceCallUrl = getGoogleVoiceCallUrl(member.phoneNumber, gatewayConfig);
  const nativeSmsUrl = getNativeSmsUrl(member.phoneNumber, messageText);

  // 1. Copy phone number to clipboard
  const handleCopyPhone = () => {
    navigator.clipboard.writeText(cleanPhone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2500);
  };

  // 2. Copy message text to clipboard
  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageText);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  // Open Google Voice & copy phone number first (Step 1)
  const handleDispatchGoogleVoice = () => {
    // 1. Copy phone number to clipboard so user can immediately paste it into 'To' in Google Voice
    navigator.clipboard.writeText(cleanPhone);
    setCopiedPhone(true);
    setGvStep('phone_copied_open');

    // 2. Open Google Voice in a new tab
    window.open(googleVoiceMsgUrl, '_blank', 'noopener,noreferrer');
  };

  // Copy message text in Step 2
  const handleStep2CopyMessage = () => {
    navigator.clipboard.writeText(messageText);
    setCopiedMessage(true);
    setGvStep('message_copied');
  };

  // Confirm sent in Google Sheet & close
  const handleConfirmSentInSheet = async () => {
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
      }, 1000);
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
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="text-xs px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium flex items-center gap-1 transition"
                  title="Copy recipient phone number"
                >
                  {copiedPhone ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Phone Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-500" />
                      <span>Copy Phone</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="text-xs px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium flex items-center gap-1 transition"
                  title="Copy message body"
                >
                  {copiedMessage ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Text Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-500" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>
              </div>
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

          {/* PRIMARY GOOGLE VOICE DISPATCH & 2-STEP PASTE ASSISTANT */}
          <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-emerald-700" />
                Church Google Voice Dispatcher
              </span>
              <span className="text-[10px] font-semibold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">
                {gatewayConfig.googleVoiceNumber ? formatDisplayPhone(gatewayConfig.googleVoiceNumber) : 'Caller ID Active'}
              </span>
            </div>

            {/* Account Indicator */}
            <div className="flex items-center justify-between px-2.5 py-1.5 text-[11px] text-slate-600 bg-white/80 rounded-lg border border-emerald-100">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Google Profile:</span>
                <strong className="font-mono text-indigo-700 font-bold">
                  {gatewayConfig.googleVoiceEmail ? gatewayConfig.googleVoiceEmail : `Account Slot /u/${gatewayConfig.googleVoiceSlot || 0}`}
                </strong>
              </span>
              {gatewayConfig.googleVoiceEmail && (
                <span className="text-[10px] text-emerald-700 font-medium bg-emerald-100 px-1.5 py-0.2 rounded">
                  Direct authuser
                </span>
              )}
            </div>

            {/* Why Google Voice cannot auto-type note */}
            <div className="text-[11px] text-slate-600 bg-white/60 p-2.5 rounded-lg border border-slate-200/80 leading-relaxed space-y-1">
              <div className="font-bold text-slate-800 flex items-center gap-1">
                <span>💡 Why Google Voice requires 2-step copy &amp; paste:</span>
              </div>
              <p className="text-[10.5px] text-slate-500">
                Google's strict security forbids any third-party app from automatically typing into voice.google.com.
                Our 2-step assistant copies the <strong>Phone Number</strong> first so you can paste it into 'To', then gives you 1-click copy for the <strong>Message</strong>!
              </p>
            </div>

            {/* Interactive 2-Step Flow */}
            {gvStep === 'idle' ? (
              <button
                type="button"
                onClick={handleDispatchGoogleVoice}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-md transition flex items-center justify-center gap-2 group cursor-pointer"
              >
                <Phone className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform" />
                <span>1. COPY PHONE NUMBER &amp; OPEN GOOGLE VOICE</span>
              </button>
            ) : (
              <div className="space-y-2.5 pt-1 animate-fade-in">
                {/* Step 1 Status */}
                <div className="flex items-center justify-between bg-emerald-100/80 border border-emerald-300 p-2 rounded-xl text-xs text-emerald-900">
                  <span className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Step 1: Phone {cleanPhone} copied!</span>
                  </span>
                  <span className="text-[11px] text-emerald-800">Paste (Ctrl+V) into Google Voice 'To' box</span>
                </div>

                {/* Step 2: Copy Message */}
                <button
                  type="button"
                  onClick={handleStep2CopyMessage}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 shadow-sm ${
                    gvStep === 'message_copied'
                      ? 'bg-teal-700 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md animate-pulse'
                  }`}
                >
                  <Copy className="w-4 h-4" />
                  <span>
                    {gvStep === 'message_copied'
                      ? '✓ STEP 2: MESSAGE COPIED! (PASTE INTO GOOGLE VOICE BOX)'
                      : '📋 STEP 2: CLICK TO COPY MESSAGE TEXT FOR GOOGLE VOICE'}
                  </span>
                </button>

                {/* Step 3: Confirm Sent in Sheet */}
                <button
                  type="button"
                  onClick={handleConfirmSentInSheet}
                  disabled={isUpdatingSheet || sentNotice}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isUpdatingSheet ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Updating Google Sheet...</span>
                    </>
                  ) : sentNotice ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Marked Welcomed in Sheet!</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>✓ Step 3: Message Sent! Mark Welcomed in Google Sheet &amp; Done</span>
                    </>
                  )}
                </button>

                {/* Re-open Google Voice button */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => window.open(googleVoiceMsgUrl, '_blank', 'noopener,noreferrer')}
                    className="text-[11px] text-emerald-700 hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Re-open Google Voice tab</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Secondary Dispatch Options */}
          <div className="space-y-2 pt-1">
            <button
              onClick={handleDispatchNativeSms}
              className="w-full p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/80 text-indigo-950 text-xs font-bold flex items-center justify-between transition"
              title="Pre-fills both phone number and message into phone or computer SMS app"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                <span>Open in Device SMS App (iMessage / Android / Windows Phone Link)</span>
              </div>
              <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-semibold">
                ⚡ Auto-Fills Both!
              </span>
            </button>

            <div className="flex items-center justify-end">
              <button
                onClick={handleDispatchCall}
                className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <PhoneCall className="w-3.5 h-3.5 text-slate-600" />
                <span>Place Voice Call with Google Voice</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
