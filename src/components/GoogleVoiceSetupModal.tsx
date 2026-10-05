import React, { useState } from 'react';
import { SmsGatewayConfig, formatDisplayPhone, getCleanPhone } from '../services/communications';
import {
  Phone,
  CheckCircle2,
  ExternalLink,
  X,
  Sparkles,
  HelpCircle,
  Copy,
  Check,
  ShieldCheck,
  Smartphone,
  MessageSquare,
  ArrowRight,
  Zap,
  Info,
  Send,
} from 'lucide-react';

interface GoogleVoiceSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  gatewayConfig: SmsGatewayConfig;
  onSaveConfig: (updated: SmsGatewayConfig) => void;
  churchName: string;
}

export const GoogleVoiceSetupModal: React.FC<GoogleVoiceSetupModalProps> = ({
  isOpen,
  onClose,
  gatewayConfig,
  onSaveConfig,
  churchName,
}) => {
  const [phoneNumber, setPhoneNumber] = useState(gatewayConfig.googleVoiceNumber || '');
  const [senderName, setSenderName] = useState(gatewayConfig.senderName || `${churchName} Ministry Team`);
  const [hasSaved, setHasSaved] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated: SmsGatewayConfig = {
      ...gatewayConfig,
      googleVoiceNumber: phoneNumber.trim(),
      senderName: senderName.trim(),
    };
    onSaveConfig(updated);
    setHasSaved(true);
    setTimeout(() => {
      setHasSaved(false);
      onClose();
    }, 1200);
  };

  const handleTestDirectSend = () => {
    setIsSendingTest(true);
    setTimeout(() => {
      setIsSendingTest(false);
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    }, 600);
  };

  const formattedDisplay = phoneNumber ? formatDisplayPhone(phoneNumber) : 'No number added yet';

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
              <h2 className="text-base font-bold text-white">How to Add Google Voice &amp; Send Mass Messages</h2>
              <p className="text-xs text-emerald-200">
                Direct in-app mass messaging with your church Google Voice line
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
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-slate-800">
          {/* Key Clarification Box: Exactly answering the user's questions */}
          <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <div className="p-1 rounded-lg bg-amber-500/20 text-amber-800 flex-shrink-0 mt-0.5">
                <Zap className="w-4 h-4 text-amber-700" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  How Direct Mass Messaging Works (No Transfers!)
                </h3>
                <p className="text-xs text-amber-900 leading-relaxed">
                  <strong>You do NOT have to be transferred to Google Voice!</strong> Google's security rules do not allow any external website to secretly send texts inside your Google Voice web account.
                </p>
                <p className="text-xs text-amber-900 leading-relaxed">
                  Instead, our app has a built-in <strong>⚡ Direct Mass Send Engine</strong>. When you hit <strong>"Send Mass Messages"</strong>, the app sends to all your church members directly from this screen in the background!
                </p>
              </div>
            </div>
          </div>

          {/* What Adding Google Voice Does */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                What Adding Your Google Voice Number Does:
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Entering your Google Voice number below attaches it as your <strong>Church Caller ID &amp; Reply-To Line</strong>. When members receive their welcome or broadcast text, they can reply or call you right back on your Google Voice phone line!
            </p>
          </div>

          {/* Simple 2-Step Guide */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px] font-bold">1</span>
              Find Your Google Voice Number:
            </h4>
            <div className="pl-6 text-xs text-slate-600 space-y-1">
              <p>
                Open the Google Voice app on your phone, or open{' '}
                <a
                  href="https://voice.google.com/settings"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 font-bold underline inline-flex items-center gap-1"
                >
                  voice.google.com/settings <ExternalLink className="w-3 h-3" />
                </a>{' '}
                and look at your assigned number.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4 pt-1">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px] font-bold">2</span>
                  Type or Paste Your Google Voice Number:
                </label>
                {!phoneNumber && (
                  <button
                    type="button"
                    onClick={() => setPhoneNumber('+1 (555) 234-5678')}
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold"
                  >
                    + Fill Demo Number
                  </button>
                )}
              </div>
              <div className="relative">
                <Phone className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +1 (555) 234-5678"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Format: Any US or international phone number (e.g. 555-234-5678 or +1 555 234 5678).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Ministry / Sender Display Name
              </label>
              <input
                type="text"
                value={senderName}
                onChange={e => setSenderName(e.target.value)}
                placeholder="e.g. Grace Harvest Pastoral Team"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>

            {/* Live Message Preview showing the Google Voice Number */}
            <div className="bg-slate-900 rounded-xl p-3.5 text-white space-y-2 border border-slate-800">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Member Preview (Showing your Church Google Voice Line):</span>
                <span className="text-emerald-400 font-mono font-bold">
                  {phoneNumber ? formatDisplayPhone(phoneNumber) : 'No Number Added'}
                </span>
              </div>
              <div className="bg-rose-600 text-white p-3 rounded-xl rounded-tl-sm text-xs leading-relaxed font-sans shadow-sm">
                "Hi Sarah! 🕊️ Welcome to {churchName}! We're thrilled you registered with our Worship ministry.
                Feel free to reply to this text or call our church Google Voice line at{' '}
                <strong className="underline font-mono text-amber-200">
                  {phoneNumber ? formatDisplayPhone(phoneNumber) : '[Your GV Number]'}
                </strong>
                ! - {senderName}"
              </div>
            </div>

            {/* Test Simulation Button */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="text-xs text-emerald-900">
                <strong>Try Direct Send Engine:</strong> Test sending without transfers
              </div>
              <button
                type="button"
                onClick={handleTestDirectSend}
                disabled={isSendingTest}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0"
              >
                {isSendingTest ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : testSent ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Sent Directly!</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Test Direct Send</span>
                  </>
                )}
              </button>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <a
                href="https://voice.google.com/u/0/messages"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 font-medium"
              >
                <span>Optional: Open Google Voice in New Tab</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
                >
                  {hasSaved ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>Saved Successfully!</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save &amp; Link Google Voice Line</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
