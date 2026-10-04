import React, { useState } from 'react';
import { MemberRecord, ChurchEvent } from '../types';
import {
  replaceMessageVariables,
  formatDisplayPhone,
  getCleanPhone,
  getGoogleVoiceMessageUrl,
  getNativeSmsUrl,
  saveOutreachLog,
} from '../services/communications';
import confetti from 'canvas-confetti';
import {
  Send,
  X,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Smartphone,
  Phone,
  Copy,
  Check,
} from 'lucide-react';

interface BatchBroadcastRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  recipients: MemberRecord[];
  template: string;
  event?: ChurchEvent;
  churchName: string;
  mode: 'welcome' | 'broadcast';
  onCompleteBatchInSheet: (members: MemberRecord[]) => Promise<void>;
}

export const BatchBroadcastRunnerModal: React.FC<BatchBroadcastRunnerModalProps> = ({
  isOpen,
  onClose,
  title,
  recipients,
  template,
  event,
  churchName,
  mode,
  onCompleteBatchInSheet,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isUpdatingSheet, setIsUpdatingSheet] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || recipients.length === 0) return null;

  const currentMember = recipients[currentIndex] || recipients[0];
  const currentMsg = replaceMessageVariables(template, currentMember, {
    churchName,
    event,
  });

  const cleanPhone = getCleanPhone(currentMember.phoneNumber);
  const gVoiceUrl = getGoogleVoiceMessageUrl(currentMember.phoneNumber);
  const smsUrl = getNativeSmsUrl(currentMember.phoneNumber, currentMsg);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentMsg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenGoogleVoice = () => {
    handleCopy();
    saveOutreachLog({
      type: mode,
      recipientName: currentMember.fullName,
      phoneNumber: currentMember.phoneNumber,
      messageText: currentMsg,
      channel: 'google_voice',
      status: 'opened',
      eventTitle: event?.title,
    });
    window.open(gVoiceUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenSms = () => {
    saveOutreachLog({
      type: mode,
      recipientName: currentMember.fullName,
      phoneNumber: currentMember.phoneNumber,
      messageText: currentMsg,
      channel: 'sms',
      status: 'opened',
      eventTitle: event?.title,
    });
    window.open(smsUrl, '_self');
  };

  const handleNext = () => {
    if (currentIndex + 1 < recipients.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      handleFinishBatch();
    }
  };

  const handleFinishBatch = async () => {
    setIsUpdatingSheet(true);
    try {
      await onCompleteBatchInSheet(recipients);
      // Log all to outreach logs
      recipients.forEach(m => {
        saveOutreachLog({
          type: mode,
          recipientName: m.fullName,
          phoneNumber: m.phoneNumber,
          messageText: replaceMessageVariables(template, m, { churchName, event }),
          channel: 'google_voice',
          status: 'sent',
          eventTitle: event?.title,
        });
      });
      setCompleted(true);
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch (err) {
        // ignore
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingSheet(false);
    }
  };

  const progressPercent = Math.round(((currentIndex + 1) / recipients.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-700 via-rose-900 to-indigo-950 text-white flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">{title}</h2>
            <p className="text-xs text-amber-200">
              {mode === 'welcome' ? 'Welcoming batch members' : `Broadcasting "${event?.title || 'Program'}"`}
            </p>
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
          {completed ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Batch Outreach Completed!</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                All {recipients.length} church member records have been successfully updated in your connected
                Google Sheet and marked with delivery timestamps.
              </p>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                >
                  Close &amp; Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>
                    Sending {currentIndex + 1} of {recipients.length}
                  </span>
                  <span className="font-mono text-indigo-600">{progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-rose-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Current Recipient Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Current Recipient
                    </span>
                    <div className="text-base font-bold text-slate-900">{currentMember.fullName}</div>
                    <div className="text-xs text-indigo-600 font-medium">{currentMember.ministry}</div>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2 py-1 rounded border border-slate-200">
                    {formatDisplayPhone(currentMember.phoneNumber)}
                  </span>
                </div>

                {/* Personalized Message Preview */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans mt-2">
                  {currentMsg}
                </div>
              </div>

              {/* Quick Launch Buttons for this recipient */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleOpenGoogleVoice}
                    className="p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Open in Google Voice</span>
                  </button>

                  <button
                    onClick={handleOpenSms}
                    className="p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Open in SMS App</span>
                  </button>
                </div>

                <button
                  onClick={handleCopy}
                  className="w-full py-1.5 text-xs text-slate-600 hover:text-slate-800 font-medium flex items-center justify-center gap-1 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied to Clipboard</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Personalized Message</span>
                    </>
                  )}
                </button>
              </div>

              {/* Step & Batch Actions */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 gap-2">
                <button
                  onClick={handleFinishBatch}
                  disabled={isUpdatingSheet}
                  className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 px-3 py-2 rounded-lg hover:bg-indigo-50 transition"
                >
                  {isUpdatingSheet ? 'Updating Google Sheet...' : 'Mark All Sent in Sheet'}
                </button>

                <button
                  onClick={handleNext}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
                >
                  <span>
                    {currentIndex + 1 < recipients.length ? 'Next Member' : 'Finish & Update Sheet'}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
