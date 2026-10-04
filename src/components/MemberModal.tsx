import React, { useState, useEffect } from 'react';
import { MemberRecord } from '../types';
import { INITIAL_MINISTRIES } from '../data/initialData';
import { UserPlus, Edit3, X, Sparkles, Phone, User, Tag, FileText, CheckCircle2 } from 'lucide-react';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    memberData: {
      fullName: string;
      phoneNumber: string;
      ministry: string;
      registeredAt: string;
      welcomeStatus: string;
      notes: string;
    },
    options: { autoWelcome: boolean }
  ) => Promise<void>;
  memberToEdit: MemberRecord | null;
  isSaving: boolean;
}

export const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  onClose,
  onSave,
  memberToEdit,
  isSaving,
}) => {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [ministry, setMinistry] = useState(INITIAL_MINISTRIES[0]);
  const [customMinistry, setCustomMinistry] = useState('');
  const [registeredAt, setRegisteredAt] = useState('');
  const [welcomeStatus, setWelcomeStatus] = useState('Pending');
  const [notes, setNotes] = useState('');
  const [autoWelcome, setAutoWelcome] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (memberToEdit) {
      setFullName(memberToEdit.fullName || '');
      setPhoneNumber(memberToEdit.phoneNumber || '');
      if (INITIAL_MINISTRIES.includes(memberToEdit.ministry)) {
        setMinistry(memberToEdit.ministry);
        setCustomMinistry('');
      } else {
        setMinistry('Custom');
        setCustomMinistry(memberToEdit.ministry || '');
      }
      setRegisteredAt(memberToEdit.registeredAt || new Date().toISOString().split('T')[0]);
      setWelcomeStatus(memberToEdit.welcomeStatus || 'Pending');
      setNotes(memberToEdit.notes || '');
      setAutoWelcome(false); // Usually don't auto-send welcome if editing an existing contact
    } else {
      // New member defaults
      setFullName('');
      setPhoneNumber('');
      setMinistry(INITIAL_MINISTRIES[0]);
      setCustomMinistry('');
      setRegisteredAt(new Date().toISOString().split('T')[0]);
      setWelcomeStatus('Pending');
      setNotes('');
      setAutoWelcome(true); // Default to true when adding a new contact!
    }
    setError(null);
  }, [memberToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Please provide the member or visitor full name.');
      return;
    }

    if (!phoneNumber.trim()) {
      setError('Please provide a valid phone number for SMS & call outreach.');
      return;
    }

    const finalMinistry = ministry === 'Custom' ? customMinistry.trim() || 'General Ministry' : ministry;

    try {
      await onSave(
        {
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
          ministry: finalMinistry,
          registeredAt,
          welcomeStatus,
          notes: notes.trim(),
        },
        { autoWelcome: !memberToEdit && autoWelcome }
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save member details');
    }
  };

  const isEditing = !!memberToEdit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-400">
              {isEditing ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isEditing ? 'Edit Church Member Details' : 'Register New Church Member'}
              </h2>
              <p className="text-xs text-slate-300">
                {isEditing
                  ? `Updating row #${memberToEdit.rowNumber} in Google Sheet`
                  : 'Saves directly to your connected Google Sheet'}
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. Bro. David Miller or Sis. Sarah Jenkins"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              Phone Number * (for Google Call &amp; Welcome SMS)
            </label>
            <input
              type="tel"
              required
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              placeholder="e.g. +1 (555) 234-5678 or 555-234-5678"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Supports any standard country code or 10-digit mobile number.
            </p>
          </div>

          {/* Ministry / Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                Ministry / Department
              </label>
              <select
                value={ministry}
                onChange={e => setMinistry(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {INITIAL_MINISTRIES.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                <option value="Custom">+ Other Ministry / Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Registration Date
              </label>
              <input
                type="date"
                value={registeredAt}
                onChange={e => setRegisteredAt(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {ministry === 'Custom' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Custom Ministry / Group Name
              </label>
              <input
                type="text"
                value={customMinistry}
                onChange={e => setCustomMinistry(e.target.value)}
                placeholder="e.g. Media &amp; Audio Broadcast, Young Couples"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Welcome Status (if editing) */}
          {isEditing && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Welcome Status
              </label>
              <select
                value={welcomeStatus}
                onChange={e => setWelcomeStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Pending">Pending (Not yet welcomed)</option>
                <option value="Welcomed">Welcomed (Message already sent)</option>
              </select>
            </div>
          )}

          {/* Notes & Prayer Requests */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Notes / Interests / Prayer Requests
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Interested in youth choir, first-time visitor, requested prayer for family..."
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>

          {/* Automated Welcome Feature Checkbox for New Contacts */}
          {!isEditing && (
            <div className="bg-gradient-to-r from-rose-50 to-indigo-50 p-4 rounded-xl border border-rose-200/80">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoWelcome}
                  onChange={e => setAutoWelcome(e.target.checked)}
                  className="mt-0.5 rounded border-rose-300 text-rose-600 focus:ring-rose-500 h-4 w-4 cursor-pointer"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-950">
                    <Sparkles className="w-4 h-4 text-rose-600" />
                    <span>Automatically trigger welcome outreach on save</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    Immediately opens the personalized welcome message assistant so church staff can dispatch
                    via Google Voice or SMS with 1 click and automatically mark the Google Sheet row as Welcomed.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Syncing to Google Sheet...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEditing ? 'Save & Update Sheet' : 'Save & Register Member'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
