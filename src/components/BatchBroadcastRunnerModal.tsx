import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MemberRecord, ChurchEvent } from '../types';
import {
  replaceMessageVariables,
  formatDisplayPhone,
  getCleanPhone,
  getGoogleVoiceMessageUrl,
  getNativeSmsUrl,
  saveOutreachLog,
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
  ChevronLeft,
  MessageSquare,
  ArrowRight,
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
  autoStart?: boolean;
  onCompleteBatchInSheet: (members: MemberRecord[]) => Promise<void>;
}

interface DispatchItemStatus {
  member: MemberRecord;
  status: 'pending' | 'sent';
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [isUpdatingSheet, setIsUpdatingSheet] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);

  // Safely filter valid recipients
  const validRecipients = useMemo(() => {
    return (recipients || []).filter((m): m is MemberRecord => Boolean(m && typeof m === 'object'));
  }, [recipients]);

  // Track status for each recipient
  const [dispatchStatuses, setDispatchStatuses] = useState<DispatchItemStatus[]>([]);

  // Initialize statuses when recipients change
  useEffect(() => {
    if (isOpen && validRecipients.length > 0) {
      setDispatchStatuses(
        validRecipients.map(m => ({
          member: m,
          status: 'pending',
        }))
      );
      setCurrentIndex(0);
      setCompleted(false);
      setCopied(false);
    }
  }, [isOpen, validRecipients]);

  if (!isOpen) return null;

  // Handle case where recipients list is empty
  if (validRecipients.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No Recipients Selected</h3>
            <p className="text-xs text-slate-600">
              There are currently no members in the selected audience to send this broadcast to.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const safeCurrentIndex = Math.max(0, Math.min(currentIndex, validRecipients.length - 1));
  const currentMember = validRecipients[safeCurrentIndex];
  const currentMsg = replaceMessageVariables(template, currentMember, {
    churchName,
    event,
  });

  const gatewayConfig = getSmsGatewayConfig();
  const gVoiceUrl = currentMember ? getGoogleVoiceMessageUrl(currentMember.phoneNumber) : '';
  const nativeSmsUrl = currentMember ? getNativeSmsUrl(currentMember.phoneNumber, currentMsg) : '';

  // Copy message helper
  const copyCurrentMessage = () => {
    navigator.clipboard.writeText(currentMsg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // SEND CURRENT MEMBER VIA GOOGLE VOICE
  const handleSendViaGoogleVoice = () => {
    if (!currentMember) return;

    // 1. Copy message to clipboard automatically so user just pastes in Google Voice
    copyCurrentMessage();

    // 2. Open Google Voice in a new tab focused on this member's number
    window.open(gVoiceUrl, '_blank', 'noopener,noreferrer');

    // 3. Mark current member as sent
    markMemberAsSent(safeCurrentIndex);

    // 4. Log outreach
    saveOutreachLog({
      type: mode,
      recipientName: currentMember.fullName || 'Church Member',
      phoneNumber: currentMember.phoneNumber,
      messageText: currentMsg,
      channel: 'google_voice',
      status: 'opened',
      eventTitle: event?.title,
    });

    // 5. Auto-advance to next member if enabled
    if (autoAdvance) {
      if (safeCurrentIndex + 1 < validRecipients.length) {
        setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
        }, 500);
      } else {
        handleFinishBatch();
      }
    }
  };

  // SEND VIA PHONE SMS APP (Pre-fills message text automatically)
  const handleSendViaPhoneSms = () => {
    if (!currentMember) return;

    window.open(nativeSmsUrl, '_self');
    markMemberAsSent(safeCurrentIndex);

    saveOutreachLog({
      type: mode,
      recipientName: currentMember.fullName || 'Church Member',
      phoneNumber: currentMember.phoneNumber,
      messageText: currentMsg,
      channel: 'sms',
      status: 'opened',
      eventTitle: event?.title,
    });

    if (autoAdvance) {
      if (safeCurrentIndex + 1 < validRecipients.length) {
        setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
        }, 500);
      } else {
        handleFinishBatch();
      }
    }
  };

  const markMemberAsSent = (idx: number) => {
    setDispatchStatuses(prev => {
      const next = [...prev];
      if (next[idx]) {
        next[idx] = {
          ...next[idx],
          status: 'sent',
          timestamp: new Date().toLocaleTimeString(),
        };
      }
      return next;
    });
  };

  const handleFinishBatch = async () => {
    setIsUpdatingSheet(true);
    try {
      await onCompleteBatchInSheet(validRecipients);
      setCompleted(true);
      try {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      } catch (err) {
        // ignore
      }
    } catch (err) {
      console.error('Error completing batch in sheet:', err);
    } finally {
      setIsUpdatingSheet(false);
    }
  };

  const sentCount = dispatchStatuses.filter(s => s.status === 'sent').length;
  const progressPercent = Math.round((sentCount / validRecipients.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{title}</h2>
              <p className="text-xs text-emerald-200">
                Google Voice Sequential Dispatcher • 1-by-1 Queue • {validRecipients.length} Members
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
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-slate-800">
          {completed ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-slate-900">
                  Google Voice Dispatch Complete!
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  All <strong className="text-slate-900 font-bold">{sentCount}</strong> member messages
                  have been sent through your Google Voice line. Your connected Google Sheet has been updated with
                  completion timestamps automatically!
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* How this routes through Google Voice Banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <span className="text-xs font-bold text-emerald-950">
                      Sending via Your Google Voice Line: One After The Other
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">
                    {gatewayConfig.googleVoiceNumber ? formatDisplayPhone(gatewayConfig.googleVoiceNumber) : 'Church Voice Line'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Click the green button below for each member. It <strong>copies their personalized message</strong> and <strong>opens Google Voice directly to their number</strong>. Just hit Paste (Ctrl+V) and Send, and it steps through one after the other!
                </p>
              </div>

              {/* Progress Bar & Counter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>
                    Queue Progress: <strong className="text-emerald-700">{sentCount}</strong> of{' '}
                    <strong>{validRecipients.length}</strong> sent
                  </span>
                  <span className="font-mono text-emerald-700 font-bold">{progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Active Member Focus Card */}
              {currentMember && (
                <div className="bg-white border-2 border-emerald-500/80 rounded-2xl p-4 shadow-sm space-y-3 relative overflow-hidden">
                  {/* Step Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Member #{safeCurrentIndex + 1} of {validRecipients.length}
                    </span>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoAdvance}
                        onChange={e => setAutoAdvance(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                      />
                      <span>Auto-advance to next after click</span>
                    </label>
                  </div>

                  {/* Recipient Details */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                        {currentMember.fullName}
                      </h3>
                      <p className="text-xs text-indigo-600 font-medium">{currentMember.ministry}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        {formatDisplayPhone(currentMember.phoneNumber)}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Status: {dispatchStatuses[safeCurrentIndex]?.status === 'sent' ? '✅ Sent' : '⏳ Awaiting Send'}
                      </div>
                    </div>
                  </div>

                  {/* Tailored Message Box */}
                  <div className="bg-slate-900 rounded-xl p-3.5 text-white space-y-2 border border-slate-800">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Message for {currentMember.fullName}:</span>
                      <button
                        type="button"
                        onClick={copyCurrentMessage}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied to Clipboard!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Message</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="bg-emerald-600 text-white p-3 rounded-xl rounded-tl-sm text-xs leading-relaxed font-sans shadow-sm">
                      {currentMsg}
                    </div>
                  </div>

                  {/* PRIMARY ACTION BUTTONS */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSendViaGoogleVoice}
                      className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-sm font-extrabold shadow-lg transition flex items-center justify-center gap-2 group cursor-pointer"
                    >
                      <Phone className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform" />
                      <span>
                        📞 OPEN GOOGLE VOICE FOR {currentMember.fullName.toUpperCase()} &amp; COPY
                      </span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleSendViaPhoneSms}
                        className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                        title="Pre-fills message into phone SMS app"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Open in Phone SMS</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          markMemberAsSent(safeCurrentIndex);
                          if (safeCurrentIndex + 1 < validRecipients.length) {
                            setCurrentIndex(prev => prev + 1);
                          } else {
                            handleFinishBatch();
                          }
                        }}
                        className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Mark Sent &amp; Next</span>
                      </button>
                    </div>
                  </div>

                  {/* Navigation Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <button
                      type="button"
                      onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                      disabled={safeCurrentIndex === 0}
                      className="flex items-center gap-1 hover:text-slate-800 disabled:opacity-30 disabled:hover:text-slate-500 font-medium"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous Member</span>
                    </button>

                    <span className="font-mono text-[11px] text-slate-400">
                      {safeCurrentIndex + 1} / {validRecipients.length}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        if (safeCurrentIndex + 1 < validRecipients.length) {
                          setCurrentIndex(prev => prev + 1);
                        } else {
                          handleFinishBatch();
                        }
                      }}
                      className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold"
                    >
                      <span>
                        {safeCurrentIndex + 1 < validRecipients.length ? 'Next Member' : 'Finish Batch'}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Entire Queue Table Preview */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-600" />
                  All Queue Members ({validRecipients.length})
                </span>

                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-40 overflow-y-auto bg-slate-50/50">
                  {validRecipients.map((m, idx) => {
                    const isSelected = idx === safeCurrentIndex;
                    const isSent = dispatchStatuses[idx]?.status === 'sent';

                    return (
                      <div
                        key={m.id || idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`p-2.5 text-xs flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? 'bg-emerald-100/60 font-semibold'
                            : isSent
                            ? 'bg-emerald-50/40 text-slate-500'
                            : 'hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="font-mono text-[10px] text-slate-400 w-5">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-slate-900">{m.fullName}</span>
                          <span className="text-slate-500 font-mono text-[11px]">
                            {formatDisplayPhone(m.phoneNumber)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isSent ? (
                            <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Sent
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Click to select</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Finish Button */}
              <div className="pt-1 flex items-center justify-between border-t border-slate-100">
                <span className="text-xs text-slate-400">
                  Updates Google Sheet with broadcast dates
                </span>
                <button
                  type="button"
                  onClick={handleFinishBatch}
                  disabled={isUpdatingSheet}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  {isUpdatingSheet ? 'Updating Sheet...' : 'Mark All Sent & Update Sheet'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
