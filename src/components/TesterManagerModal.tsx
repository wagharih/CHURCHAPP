import React, { useState, useEffect } from 'react';
import { TesterContact, MemberRecord } from '../types';
import {
  getTesterContacts,
  saveTesterContact,
  deleteTesterContact,
  formatDisplayPhone,
  getCleanPhone,
  getGoogleVoiceMessageUrl,
  getNativeSmsUrl,
  saveOutreachLog,
  getSmsGatewayConfig,
  dispatchDirectSms,
} from '../services/communications';
import {
  X,
  Plus,
  Trash2,
  Phone,
  Send,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Check,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface TesterManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  churchName: string;
  userEmail?: string;
  userName?: string;
  onSelectTestersForBroadcast?: (testerMembers: MemberRecord[]) => void;
}

export const TesterManagerModal: React.FC<TesterManagerModalProps> = ({
  isOpen,
  onClose,
  churchName,
  userEmail,
  userName,
  onSelectTestersForBroadcast,
}) => {
  const [testers, setTesters] = useState<TesterContact[]>([]);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [roleInput, setRoleInput] = useState('Pastor / Staff');
  const [notesInput, setNotesInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSendingTest, setIsSendingTest] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTesters(getTesterContacts());
      if (userName && !nameInput) {
        setNameInput(userName);
      }
    }
  }, [isOpen, userName]);

  if (!isOpen) return null;

  const handleAddTester = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = getCleanPhone(phoneInput);
    if (!clean || clean.length < 10) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid 10-digit mobile phone number.' });
      return;
    }
    if (!nameInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter the tester name.' });
      return;
    }

    const saved = saveTesterContact({
      name: nameInput.trim(),
      phoneNumber: formatDisplayPhone(phoneInput),
      cleanPhone: clean,
      role: roleInput,
      notes: notesInput.trim(),
    });

    setTesters(getTesterContacts());
    setPhoneInput('');
    setNotesInput('');
    setStatusMessage({
      type: 'success',
      text: `Added ${saved.name} (${formatDisplayPhone(saved.phoneNumber)}) as a verified tester!`,
    });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleDeleteTester = (id: string) => {
    deleteTesterContact(id);
    setTesters(getTesterContacts());
  };

  // Send a live test message to a specific tester
  const handleSendLiveTest = async (tester: TesterContact, mode: 'google_voice' | 'direct_sms') => {
    setIsSendingTest(tester.id);
    const testMsg = `🕊️ [TEST MESSAGE] Hi ${tester.name}! This is a live outreach test from ${churchName}. Your phone is verified and ready to receive mass broadcasts!`;

    if (mode === 'google_voice') {
      navigator.clipboard.writeText(testMsg);
      const url = getGoogleVoiceMessageUrl(tester.phoneNumber);
      window.open(url, '_blank', 'noopener,noreferrer');
      saveOutreachLog({
        type: 'broadcast',
        recipientName: tester.name,
        phoneNumber: tester.phoneNumber,
        messageText: testMsg,
        channel: 'google_voice',
        status: 'opened',
        eventTitle: 'Tester Verification SMS',
      });
      setStatusMessage({
        type: 'success',
        text: `Opened Google Voice for ${tester.name}. Text copied to clipboard—paste & send!`,
      });
      setIsSendingTest(null);
    } else {
      // Direct SMS Dispatch
      try {
        const res = await dispatchDirectSms({
          to: tester.phoneNumber,
          message: testMsg,
          recipientName: tester.name,
        });

        saveOutreachLog({
          type: 'broadcast',
          recipientName: tester.name,
          phoneNumber: tester.phoneNumber,
          messageText: testMsg,
          channel: 'sms',
          status: res.success ? 'sent' : 'logged',
          eventTitle: 'Tester Verification SMS',
        });

        if (res.success) {
          setStatusMessage({
            type: 'success',
            text: `Test SMS dispatched directly to ${tester.name} (${formatDisplayPhone(tester.phoneNumber)})! Check your phone!`,
          });
        } else {
          // Fallback to opening phone SMS
          const nativeUrl = getNativeSmsUrl(tester.phoneNumber, testMsg);
          window.open(nativeUrl, '_self');
          setStatusMessage({
            type: 'success',
            text: `Opening native SMS to send test message to ${tester.name}.`,
          });
        }
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: err.message || 'Error dispatching test message' });
      } finally {
        setIsSendingTest(null);
      }
    }
  };

  const handleLaunchTesterBroadcast = () => {
    if (testers.length === 0) {
      setStatusMessage({ type: 'error', text: 'Add at least one tester phone number first!' });
      return;
    }

    if (onSelectTestersForBroadcast) {
      const testerMembers: MemberRecord[] = testers.map((t, idx) => ({
        id: `tester-${t.id}`,
        rowNumber: 9000 + idx,
        fullName: t.name,
        phoneNumber: t.phoneNumber,
        cleanPhone: t.cleanPhone,
        ministry: t.role || 'Verified Tester',
        registeredAt: t.addedAt,
        welcomeStatus: 'Welcomed',
        isTester: true,
      }));
      onSelectTestersForBroadcast(testerMembers);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Manage Testers &amp; Real Test Numbers</span>
                <span className="text-[10px] bg-indigo-500/40 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30 font-mono">
                  {testers.length} Active
                </span>
              </h2>
              <p className="text-xs text-indigo-200">
                Safely test mass broadcasts to your personal phone before messaging the congregation
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
          {/* Explanation Alert: Why didn't I receive SMS earlier? */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Why you didn't receive earlier broadcasts on your real phone:</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              The initial demo members in the database use fictitious US test exchange numbers like{' '}
              <strong className="font-mono text-amber-950">+1 (555) 234-5678</strong>. Cellular networks do not route
              messages to 555 numbers. To receive live messages on your actual physical phone, add your phone number below as a{' '}
              <strong className="text-amber-950">Verified Tester</strong>!
            </p>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-fade-in ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Add New Tester Form */}
          <form
            onSubmit={handleAddTester}
            className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                Add Your Phone as a Verified Tester
              </span>
              <span className="text-[11px] text-slate-500">Instant Verification</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Name / Owner *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pastor Wesley"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Your Real Mobile Phone *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="(555) 000-0000"
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Role / Description
                </label>
                <select
                  value={roleInput}
                  onChange={e => setRoleInput(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Pastor / Leader">Pastor / Leader</option>
                  <option value="Media & Sound Team">Media & Sound Team</option>
                  <option value="Staff Administrator">Staff Administrator</option>
                  <option value="Personal Test Device">Personal Test Device</option>
                  <option value="Volunteer">Volunteer</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500 italic">
                Only verified testers will receive broadcasts when "Testers Only" audience is selected.
              </span>
              <button
                type="submit"
                className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save Tester Phone</span>
              </button>
            </div>
          </form>

          {/* List of Registered Testers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                Registered Test Devices ({testers.length})
              </h3>
              {testers.length > 0 && onSelectTestersForBroadcast && (
                <button
                  type="button"
                  onClick={handleLaunchTesterBroadcast}
                  className="py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Launch Broadcast to Testers Only</span>
                </button>
              )}
            </div>

            {testers.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-2">
                <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-600 font-medium">
                  No tester phones added yet. Add your personal mobile phone above to test SMS messages safely!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {testers.map(tester => (
                  <div
                    key={tester.id}
                    className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-300 transition"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{tester.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                          {tester.role || 'Tester'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="font-mono font-medium text-slate-700">
                          {formatDisplayPhone(tester.phoneNumber)}
                        </span>
                        <span>• Added {new Date(tester.addedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Quick Live Test Buttons */}
                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleSendLiveTest(tester, 'google_voice')}
                        disabled={isSendingTest === tester.id}
                        className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                        title="Opens Google Voice with personalized test message copied"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Google Voice Test</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendLiveTest(tester, 'direct_sms')}
                        disabled={isSendingTest === tester.id}
                        className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                        title="Sends test message directly to phone"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Send Test SMS</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteTester(tester.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Remove tester"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Messages sent to testers are logged in your Outreach History tab.
          </span>
          <button
            onClick={onClose}
            className="py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
