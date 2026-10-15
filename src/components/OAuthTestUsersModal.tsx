import React, { useState } from 'react';
import {
  ShieldAlert,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  X,
  Users,
  Key,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface OAuthTestUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  churchEmail?: string;
  currentEmail?: string;
  onSwitchAccount: (targetEmail?: string) => void;
}

export const OAuthTestUsersModal: React.FC<OAuthTestUsersModalProps> = ({
  isOpen,
  onClose,
  churchEmail,
  currentEmail,
  onSwitchAccount,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const cloudConsoleConsentUrl = 'https://console.cloud.google.com/apis/credentials/consent';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-700 via-amber-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Google Cloud Test Users &amp; Multi-Account Setup</h2>
              <p className="text-xs text-amber-200">
                Grant access to church emails &amp; staff without Google 403 errors
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

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-slate-800 text-xs sm:text-sm">
          {/* Why this occurs explanation */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <div className="flex items-start gap-2.5">
              <div className="p-1 rounded-lg bg-amber-500/20 text-amber-800 flex-shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4 text-amber-700" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  Why Google Shows "Error 403: access_denied / Developer Testing"
                </h3>
                <p className="text-xs text-amber-900 leading-relaxed">
                  While your Google OAuth app is in <strong>"Testing"</strong> mode, Google protects Workspace data by only allowing accounts explicitly registered as <strong>Test Users</strong>.
                </p>
                <p className="text-xs text-amber-900 leading-relaxed">
                  To allow your <strong>church Google account</strong> (or any other staff member) to sign into MinistryPulse, simply add their email to the Google Cloud Console consent screen in 3 quick steps below.
                </p>
              </div>
            </div>
          </div>

          {/* Step 1: Open Google Cloud Console */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[11px] font-bold">1</span>
                Open OAuth Consent Screen in Google Cloud
              </h4>
              <a
                href={cloudConsoleConsentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm transition"
              >
                <span>Open Cloud Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <p className="text-xs text-slate-600 pl-7">
              Visit Google Cloud Console &rarr; <strong>APIs &amp; Services</strong> &rarr; <strong>OAuth consent screen</strong>.
            </p>
          </div>

          {/* Step 2: Add Church Email to Test Users */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[11px] font-bold">2</span>
              Add Account to the "Test users" Table
            </h4>
            <div className="pl-7 space-y-2 text-xs text-slate-600">
              <p>
                Scroll down to the <strong>"Test users"</strong> section and click <strong>"+ ADD USERS"</strong>.
              </p>
              <p>
                Paste your church Google email or personal email address, then click <strong>SAVE</strong>.
              </p>

              {/* Email helper copy cards */}
              <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {churchEmail && (
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-2 shadow-sm">
                    <div className="truncate">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Church Email</div>
                      <div className="font-mono text-xs font-bold text-indigo-700 truncate">{churchEmail}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(churchEmail, 'church')}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center gap-1 flex-shrink-0"
                    >
                      {copiedKey === 'church' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {currentEmail && (
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-2 shadow-sm">
                    <div className="truncate">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Current Email</div>
                      <div className="font-mono text-xs font-bold text-slate-800 truncate">{currentEmail}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(currentEmail, 'current')}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center gap-1 flex-shrink-0"
                    >
                      {copiedKey === 'current' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 3: Switch & Sign In */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-bold">3</span>
              Switch or Sign In with That Google Account
            </h4>
            <p className="text-xs text-slate-600 pl-7">
              Once saved in Google Cloud, click below to open Google's account picker. Select your newly authorized church account and approve the Google Sheets / Forms permissions.
            </p>
          </div>

          {/* Pro-Tip: Decoupled Google Voice */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Good to Know: Google Voice Outreach is Already Decoupled!</span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Even if you remain signed in as the developer/builder for Google Sheets sync, your <strong>Google Voice SMS, Broadcasts, and Calls</strong> are directly routed to your church email using Google's <code className="font-mono font-bold bg-white/70 px-1 py-0.5 rounded text-[11px]">&amp;authuser=church@gmail.com</code> parameter. You don't have to sign out of personal Google to send church texts!
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
          >
            Close Guide
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                onClose();
                onSwitchAccount(churchEmail);
              }}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" />
              <span>Switch / Sign In with Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
