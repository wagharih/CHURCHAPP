import React, { useState, useEffect, useRef } from 'react';
import { MemberRecord, ChurchEvent } from '../types';
import {
  replaceMessageVariables,
  formatDisplayPhone,
  getCleanPhone,
  getGoogleVoiceMessageUrl,
  getNativeSmsUrl,
  saveOutreachLog,
  dispatchDirectSms,
  getSmsGatewayConfig,
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
  Zap,
  Play,
  Pause,
  AlertCircle,
  Clock,
  Radio,
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

interface DispatchItemStatus {
  member: MemberRecord;
  status: 'pending' | 'sending' | 'delivered' | 'failed';
  error?: string;
  messageId?: string;
  timestamp?: string;
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
  const [activeTab, setActiveTab] = useState<'automated' | 'manual'>('automated');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutomatedRunning, setIsAutomatedRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [isUpdatingSheet, setIsUpdatingSheet] = useState(false);
  const [copied, setCopied] = useState(false);

  // Status for each recipient
  const [dispatchStatuses, setDispatchStatuses] = useState<DispatchItemStatus[]>([]);
  const isRunningRef = useRef(false);

  // Initialize statuses when recipients change
  useEffect(() => {
    if (isOpen && recipients.length > 0) {
      setDispatchStatuses(
        recipients.map(m => ({
          member: m,
          status: 'pending',
        }))
      );
      setCurrentIndex(0);
      setCompleted(false);
      setIsAutomatedRunning(false);
      setIsPaused(false);
      isRunningRef.current = false;
    }
  }, [isOpen, recipients]);

  if (!isOpen || recipients.length === 0) return null;

  const currentMember = recipients[currentIndex] || recipients[0];
  const currentMsg = replaceMessageVariables(template, currentMember, {
    churchName,
    event,
  });

  const gatewayConfig = getSmsGatewayConfig();

  // START 1-CLICK AUTOMATED MASS SENDING
  const handleStartAutomatedMassSend = async () => {
    setIsAutomatedRunning(true);
    setIsPaused(false);
    isRunningRef.current = true;

    const updated = [...dispatchStatuses];

    for (let i = 0; i < recipients.length; i++) {
      if (!isRunningRef.current) break; // If user stopped or cancelled

      setCurrentIndex(i);
      const member = recipients[i];
      const msg = replaceMessageVariables(template, member, {
        churchName,
        event,
      });

      // Update status to sending
      updated[i] = { ...updated[i], status: 'sending' };
      setDispatchStatuses([...updated]);

      // Dispatch direct SMS via server endpoint
      const result = await dispatchDirectSms({
        to: member.phoneNumber,
        message: msg,
        recipientName: member.fullName,
        gatewayConfig,
      });

      if (result.success) {
        updated[i] = {
          ...updated[i],
          status: 'delivered',
          messageId: result.messageId,
          timestamp: new Date().toLocaleTimeString(),
        };

        saveOutreachLog({
          type: mode,
          recipientName: member.fullName,
          phoneNumber: member.phoneNumber,
          messageText: msg,
          channel: 'sms',
          status: 'sent',
          eventTitle: event?.title,
        });
      } else {
        updated[i] = {
          ...updated[i],
          status: 'failed',
          error: result.error,
        };
      }

      setDispatchStatuses([...updated]);

      // Small throttle delay so staff can observe live progress
      await new Promise(r => setTimeout(r, 220));
    }

    // Complete batch in sheet
    setIsUpdatingSheet(true);
    try {
      await onCompleteBatchInSheet(recipients);
      setCompleted(true);
      try {
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
      } catch (err) {
        // ignore
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingSheet(false);
      setIsAutomatedRunning(false);
      isRunningRef.current = false;
    }
  };

  const handleStop = () => {
    isRunningRef.current = false;
    setIsAutomatedRunning(false);
  };

  // Manual fallback functions
  const handleCopy = () => {
    navigator.clipboard.writeText(currentMsg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualOpenVoice = () => {
    handleCopy();
    const gVoiceUrl = getGoogleVoiceMessageUrl(currentMember.phoneNumber);
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

  const deliveredCount = dispatchStatuses.filter(s => s.status === 'delivered').length;
  const progressPercent = Math.round(
    (dispatchStatuses.filter(s => s.status === 'delivered' || s.status === 'failed').length /
      recipients.length) *
      100
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-700 via-rose-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{title}</h2>
              <p className="text-xs text-amber-200">
                Direct In-App Mass SMS Dispatcher • {recipients.length} Church Members
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleStop();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch between 1-Click Automated vs Manual inspection */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('automated')}
            className={`py-2 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'automated'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            <span>⚡ Automated 1-Click Mass Send (No Transfers)</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`py-2 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'manual'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>Step-by-Step / Google Voice</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {completed ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-slate-900">
                  Mass Outreach Successfully Dispatched!
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  All <strong className="text-slate-900 font-bold">{deliveredCount}</strong> messages have been
                  dispatched directly to member phone numbers. Your connected Google Sheet has been updated with
                  delivery timestamps automatically!
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : activeTab === 'automated' ? (
            /* AUTOMATED 1-CLICK DISPATCH TAB */
            <div className="space-y-4">
              {/* Highlight Banner */}
              <div className="bg-gradient-to-r from-amber-50 to-indigo-50 p-4 rounded-xl border border-amber-200/80 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    Direct Cloud SMS Engine Ready
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Just click the button below. The app sends to all {recipients.length} members directly from this screen
                  in sequence. You do not need to click Google Voice or switch tabs!
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>
                    Progress: {deliveredCount} of {recipients.length} delivered
                  </span>
                  <span className="font-mono text-indigo-600">{progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-indigo-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-1">
                {!isAutomatedRunning ? (
                  <button
                    onClick={handleStartAutomatedMassSend}
                    disabled={recipients.length === 0}
                    className="w-full py-3 px-6 bg-gradient-to-r from-rose-600 via-amber-600 to-indigo-600 hover:from-rose-700 hover:via-amber-700 hover:to-indigo-700 text-white rounded-xl text-sm font-extrabold shadow-lg transition flex items-center justify-center gap-2 group"
                  >
                    <Zap className="w-5 h-5 text-amber-300 group-hover:scale-110 transition-transform" />
                    <span>⚡ SEND MASS MESSAGES DIRECTLY NOW ({recipients.length})</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleStop}
                      className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
                    >
                      <Pause className="w-4 h-4" />
                      <span>Stop Mass Sending</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Live Dispatch Stream */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                  Live Dispatch Stream &amp; Recipient Queue
                </span>

                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-56 overflow-y-auto bg-slate-50/50">
                  {dispatchStatuses.map((item, idx) => (
                    <div
                      key={item.member.id || idx}
                      className={`p-2.5 text-xs flex items-center justify-between transition ${
                        item.status === 'sending'
                          ? 'bg-amber-100/60 font-semibold'
                          : item.status === 'delivered'
                          ? 'bg-emerald-50/60'
                          : 'hover:bg-slate-100/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="font-mono text-[10px] text-slate-400 w-5">
                          #{idx + 1}
                        </span>
                        <div className="truncate">
                          <span className="font-bold text-slate-900">{item.member.fullName}</span>
                          <span className="text-slate-500 font-mono text-[11px] ml-2">
                            {formatDisplayPhone(item.member.phoneNumber)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {item.status === 'pending' && (
                          <span className="text-[10px] text-slate-400 font-medium">Pending</span>
                        )}
                        {item.status === 'sending' && (
                          <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                            Dispatching...
                          </span>
                        )}
                        {item.status === 'delivered' && (
                          <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Delivered
                          </span>
                        )}
                        {item.status === 'failed' && (
                          <span className="text-[10px] text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded">
                            Failed
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Message Preview */}
              <div className="bg-slate-900 rounded-xl p-3.5 text-white space-y-1.5">
                <div className="text-[11px] text-slate-400 font-semibold">
                  Sample Message ({currentMember.fullName}):
                </div>
                <div className="text-xs text-slate-200 leading-relaxed font-sans">
                  {currentMsg}
                </div>
              </div>
            </div>
          ) : (
            /* MANUAL STEP-THROUGH TAB */
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Step {currentIndex + 1} of {recipients.length}
                    </span>
                    <div className="text-base font-bold text-slate-900">{currentMember.fullName}</div>
                    <div className="text-xs text-indigo-600 font-medium">{currentMember.ministry}</div>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2 py-1 rounded border border-slate-200">
                    {formatDisplayPhone(currentMember.phoneNumber)}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans mt-2">
                  {currentMsg}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleManualOpenVoice}
                  className="p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Open in Google Voice</span>
                </button>

                <button
                  onClick={() => {
                    const smsUrl = getNativeSmsUrl(currentMember.phoneNumber, currentMsg);
                    window.open(smsUrl, '_self');
                  }}
                  className="p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Open in SMS App</span>
                </button>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <button
                  onClick={async () => {
                    setIsUpdatingSheet(true);
                    await onCompleteBatchInSheet(recipients);
                    setIsUpdatingSheet(false);
                    setCompleted(true);
                  }}
                  disabled={isUpdatingSheet}
                  className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 px-3 py-2"
                >
                  Mark All Sent in Sheet
                </button>

                <button
                  onClick={() => {
                    if (currentIndex + 1 < recipients.length) {
                      setCurrentIndex(prev => prev + 1);
                    } else {
                      onCompleteBatchInSheet(recipients);
                      setCompleted(true);
                    }
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
                >
                  <span>
                    {currentIndex + 1 < recipients.length ? 'Next Member' : 'Finish & Update Sheet'}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
