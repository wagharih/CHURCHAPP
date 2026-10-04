import React, { useState } from 'react';
import { GoogleFormInfo, GoogleFormResponse, MemberRecord } from '../types';
import { formatDisplayPhone } from '../services/communications';
import {
  FileText,
  ExternalLink,
  Plus,
  RefreshCw,
  Sparkles,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  QrCode,
  Users,
  Send,
  MessageSquare,
  AlertCircle,
  HelpCircle,
  Share2,
} from 'lucide-react';

interface FormsHubProps {
  currentForm: GoogleFormInfo | null;
  formResponses: GoogleFormResponse[];
  onOpenFormSelector: () => void;
  onCreateNewForm: () => void;
  onRefreshResponses: () => void;
  isRefreshing: boolean;
  isCreating: boolean;
  onImportResponseToMembers: (response: GoogleFormResponse, autoWelcome: boolean) => Promise<void>;
  onOpenDispatcherForResponse: (response: GoogleFormResponse) => void;
  churchName: string;
  hasGoogleAuth: boolean;
}

export const FormsHub: React.FC<FormsHubProps> = ({
  currentForm,
  formResponses,
  onOpenFormSelector,
  onCreateNewForm,
  onRefreshResponses,
  isRefreshing,
  isCreating,
  onImportResponseToMembers,
  onOpenDispatcherForResponse,
  churchName,
  hasGoogleAuth,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [autoWelcomeOnImport, setAutoWelcomeOnImport] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);

  const handleCopyLink = () => {
    if (!currentForm?.responderUri) return;
    navigator.clipboard.writeText(currentForm.responderUri);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const responderUrl = currentForm?.responderUri || '';
  const qrCodeUrl = responderUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(responderUrl)}`
    : '';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-purple-800/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/30">
              <FileText className="w-3.5 h-3.5" />
              Google Forms Ministry Intake Hub
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Collect Registrations Directly from Google Forms
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Attendees fill out your Google Form on their phones via QR code or link. Responses are automatically
              imported, saved to your Google Sheet, and greeted with personalized welcome texts!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            {currentForm ? (
              <button
                onClick={onOpenFormSelector}
                className="py-2 px-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold transition"
              >
                Change Form
              </button>
            ) : null}

            <button
              onClick={onCreateNewForm}
              disabled={isCreating || !hasGoogleAuth}
              className="py-2.5 px-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {isCreating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating in Drive...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Ministry Form in Drive</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Form Status Card & Live Sharing Link */}
      {currentForm ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Form Info */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{currentForm.title}</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Form ID: {currentForm.formId} • {currentForm.questions.length} questions configured
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onRefreshResponses}
                  disabled={isRefreshing}
                  className="py-1.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold border border-purple-200 transition flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Checking...' : 'Check New Responses'}</span>
                </button>

                <a
                  href={`https://docs.google.com/forms/d/${currentForm.formId}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-slate-500 hover:text-purple-600 hover:bg-slate-100 rounded-lg transition"
                  title="Open Form Editor in Google Forms"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Questions detected */}
            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Form Questions Detected:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {currentForm.questions.map((q, i) => (
                  <span
                    key={q.questionId || i}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium"
                  >
                    #{i + 1} {q.title}
                  </span>
                ))}
              </div>
            </div>

            {/* Shareable Link Box */}
            <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-purple-600" />
                  Public Registration Link (for members &amp; visitors)
                </span>
                <span className="text-[11px] text-purple-700 font-medium">Ready to share</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={currentForm.responderUri || 'Loading public link...'}
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-purple-200 rounded-lg font-mono text-slate-800"
                />
                <button
                  onClick={handleCopyLink}
                  className="py-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 flex-shrink-0"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
                <a
                  href={currentForm.responderUri}
                  target="_blank"
                  rel="noreferrer"
                  className="py-1.5 px-3 bg-white hover:bg-slate-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold transition flex items-center gap-1 flex-shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Test Form</span>
                </a>
              </div>
            </div>
          </div>

          {/* QR Code Presentation Box */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col items-center justify-between text-center space-y-3">
            <div>
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <QrCode className="w-4 h-4 text-purple-600" />
                Sunday &amp; Worship QR Code
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Display on church screens or print on bulletins
              </p>
            </div>

            {qrCodeUrl ? (
              <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                <img
                  src={qrCodeUrl}
                  alt="Registration QR Code"
                  className="w-32 h-32 object-contain"
                />
              </div>
            ) : (
              <div className="w-32 h-32 bg-slate-100 rounded-xl flex items-center justify-center text-xs text-slate-400">
                No Link
              </div>
            )}

            <button
              onClick={() => setShowQrModal(true)}
              className="w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition"
            >
              View Fullscreen QR Slide
            </button>
          </div>
        </div>
      ) : (
        /* Empty State: No form connected yet */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 mx-auto flex items-center justify-center shadow-inner">
            <FileText className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No Google Form Connected Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Connect a Google Form collecting names and numbers for your ministry, or generate a brand new
              church registration form with pre-configured questions in your Google Drive.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={onCreateNewForm}
              disabled={isCreating || !hasGoogleAuth}
              className="w-full sm:w-auto py-2.5 px-5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Ministry Form in Drive</span>
            </button>
            <button
              onClick={onOpenFormSelector}
              disabled={!hasGoogleAuth}
              className="w-full sm:w-auto py-2.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>Select from Drive</span>
            </button>
          </div>
        </div>
      )}

      {/* Google Form Submissions List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Incoming Form Submissions ({formResponses.length})
              </h3>
              <p className="text-xs text-slate-500">
                People who submitted their contact info via your Google Form
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={autoWelcomeOnImport}
                onChange={e => setAutoWelcomeOnImport(e.target.checked)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
              />
              <span className="font-semibold text-slate-700">Auto-prompt Welcome on Import</span>
            </label>

            <button
              onClick={onRefreshResponses}
              disabled={isRefreshing || !currentForm}
              className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Sync Responses</span>
            </button>
          </div>
        </div>

        {formResponses.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <Clock className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No Form Responses Yet</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Share your Google Form link or scan the QR code to submit a test entry. New entries will appear
              here for automated welcome outreach!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {formResponses.map(resp => (
              <div
                key={resp.responseId}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition p-2 rounded-xl"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {resp.extractedName || 'Anonymous Attendee'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-800">
                      {resp.extractedMinistry || 'General'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-600 font-mono">
                    <span className="font-bold text-slate-800">
                      {formatDisplayPhone(resp.extractedPhone || 'No Phone')}
                    </span>
                    <span className="text-slate-400 font-sans">
                      Submitted:{' '}
                      {new Date(resp.createTime).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {resp.extractedNotes && (
                    <p className="text-xs text-slate-500 italic bg-white p-2 rounded border border-slate-100 max-w-md">
                      "{resp.extractedNotes}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button
                    onClick={() => onImportResponseToMembers(resp, autoWelcomeOnImport)}
                    className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Import to Sheet</span>
                  </button>

                  <button
                    onClick={() => onOpenDispatcherForResponse(resp)}
                    className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Send Welcome</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-8 text-center space-y-5 border border-slate-200">
            <div className="space-y-1">
              <span className="text-xs font-bold text-purple-700 uppercase tracking-widest">
                {churchName}
              </span>
              <h3 className="text-xl font-extrabold text-slate-900">
                Scan to Register for Ministry &amp; Worship
              </h3>
              <p className="text-xs text-slate-500">
                Point your phone camera to open the Google Form and connect with us!
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-purple-200 inline-block shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                  responderUrl
                )}`}
                alt="Church Form QR Code"
                className="w-56 h-56 mx-auto object-contain"
              />
            </div>

            <p className="text-xs font-mono text-slate-600 break-all bg-slate-100 p-2.5 rounded-xl">
              {responderUrl}
            </p>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
            >
              Close Presentation
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
