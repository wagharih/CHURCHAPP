import React, { useState, useEffect } from 'react';
import { listFormsFromDrive, getFormDetails, createMinistryGoogleForm } from '../services/forms';
import { GoogleFormInfo } from '../types';
import {
  FileText,
  Plus,
  RefreshCw,
  X,
  CheckCircle2,
  ExternalLink,
  Search,
  Check,
  FolderOpen,
  Sparkles,
} from 'lucide-react';

interface FormSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  onSelectForm: (form: GoogleFormInfo) => void;
  churchName: string;
}

export const FormSelectorModal: React.FC<FormSelectorModalProps> = ({
  isOpen,
  onClose,
  accessToken,
  onSelectForm,
  churchName,
}) => {
  const [driveForms, setDriveForms] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [manualFormId, setManualFormId] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && accessToken) {
      loadDriveForms();
    }
  }, [isOpen, accessToken]);

  const loadDriveForms = async () => {
    if (!accessToken) return;
    setIsLoadingList(true);
    setError(null);
    try {
      const list = await listFormsFromDrive(accessToken);
      setDriveForms(list);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to list Google Forms from Drive.');
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleSelectDriveForm = async (formId: string) => {
    if (!accessToken) return;
    setIsLoadingList(true);
    setError(null);
    try {
      const details = await getFormDetails(accessToken, formId);
      onSelectForm(details);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to read form details.');
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleManualConnect = async () => {
    if (!accessToken || !manualFormId.trim()) return;
    let id = manualFormId.trim();
    // Support Google Forms URLs like https://docs.google.com/forms/d/e/... or /d/.../edit
    const match = id.match(/\/forms\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      id = match[1];
    }

    setIsLoadingList(true);
    setError(null);
    try {
      const details = await getFormDetails(accessToken, id);
      onSelectForm(details);
      onClose();
    } catch (err: any) {
      setError(`Cannot access Google Form with ID "${id}". Make sure permissions are granted.`);
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleCreateNewForm = async () => {
    if (!accessToken) return;
    setIsCreatingNew(true);
    setError(null);
    try {
      const created = await createMinistryGoogleForm(
        accessToken,
        `${churchName} - Ministry & Worship Registration`,
        churchName
      );
      const details = await getFormDetails(accessToken, created.formId);
      onSelectForm(details);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create Google Form in Drive.');
    } finally {
      setIsCreatingNew(false);
    }
  };

  if (!isOpen) return null;

  const filtered = driveForms.filter(f =>
    f.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-purple-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Select Church Google Form</h2>
              <p className="text-xs text-slate-300">
                Choose the form collecting people's names and phone numbers
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
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Quick Create in Drive */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-xl border border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-left">
              <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Need a pre-built church registration form?
              </span>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Automatically creates questions for Name, Phone, Ministry, and Prayer requests.
              </p>
            </div>
            <button
              onClick={handleCreateNewForm}
              disabled={isCreatingNew || !accessToken}
              className="py-2 px-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50 whitespace-nowrap flex items-center gap-1.5"
            >
              {isCreatingNew ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating in Drive...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Form in Drive</span>
                </>
              )}
            </button>
          </div>

          {/* Drive Search */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-purple-600" />
                Forms in your Google Drive
              </label>
              <button
                onClick={loadDriveForms}
                disabled={isLoadingList}
                className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 font-medium"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingList ? 'animate-spin' : ''}`} />
                <span>Refresh Drive</span>
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Filter forms..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto bg-white">
              {isLoadingList ? (
                <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                  <span>Searching Google Drive...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No Google Forms found in Drive. Or create one above!
                </div>
              ) : (
                filtered.map(f => (
                  <div
                    key={f.id}
                    onClick={() => handleSelectDriveForm(f.id)}
                    className="p-3 flex items-center justify-between text-xs hover:bg-purple-50/60 cursor-pointer transition text-slate-800"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <span className="truncate font-medium">{f.name}</span>
                    </div>
                    <span className="text-[10px] text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded">
                      Select
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Paste Form Link */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Or paste Google Form URL or ID:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualFormId}
                onChange={e => setManualFormId(e.target.value)}
                placeholder="https://docs.google.com/forms/d/... or ID"
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono"
              />
              <button
                type="button"
                onClick={handleManualConnect}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-medium"
              >
                Load Form
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
