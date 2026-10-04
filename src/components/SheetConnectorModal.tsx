import React, { useState, useEffect } from 'react';
import { SpreadsheetInfo, SheetTabInfo } from '../types';
import { listSpreadsheets, getSpreadsheetTabs, createChurchMinistrySpreadsheet } from '../services/sheets';
import {
  FileSpreadsheet,
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

interface SheetConnectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  currentSpreadsheetId: string | null;
  currentTabName: string | null;
  onSelectSheet: (spreadsheetId: string, sheetTitle: string, tabName: string) => Promise<void>;
  churchName: string;
}

export const SheetConnectorModal: React.FC<SheetConnectorModalProps> = ({
  isOpen,
  onClose,
  accessToken,
  currentSpreadsheetId,
  currentTabName,
  onSelectSheet,
  churchName,
}) => {
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetInfo[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(currentSpreadsheetId);
  const [selectedSheetTitle, setSelectedSheetTitle] = useState<string>('');
  const [tabs, setTabs] = useState<SheetTabInfo[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>(currentTabName || '');
  const [isLoadingTabs, setIsLoadingTabs] = useState(false);
  const [manualSheetId, setManualSheetId] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && accessToken) {
      loadDriveSpreadsheets();
    }
  }, [isOpen, accessToken]);

  const loadDriveSpreadsheets = async () => {
    if (!accessToken) return;
    setIsLoadingList(true);
    setError(null);
    try {
      const list = await listSpreadsheets(accessToken);
      setSpreadsheets(list);
      if (currentSpreadsheetId) {
        const found = list.find(s => s.id === currentSpreadsheetId);
        if (found) setSelectedSheetTitle(found.name);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to list spreadsheets from Google Drive.');
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleSelectSpreadsheet = async (sheet: SpreadsheetInfo) => {
    if (!accessToken) return;
    setSelectedSheetId(sheet.id);
    setSelectedSheetTitle(sheet.name);
    setIsLoadingTabs(true);
    setError(null);
    try {
      const details = await getSpreadsheetTabs(accessToken, sheet.id);
      setTabs(details.tabs);
      if (details.tabs.length > 0) {
        setSelectedTab(details.tabs[0].title);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to read spreadsheet tabs.');
    } finally {
      setIsLoadingTabs(false);
    }
  };

  const handleCreateNewSheet = async () => {
    if (!accessToken) return;
    setIsCreatingNew(true);
    setError(null);
    try {
      const title = `${churchName} - Ministry Registrations & Outreach`;
      const created = await createChurchMinistrySpreadsheet(accessToken, title);
      await loadDriveSpreadsheets();
      await handleSelectSpreadsheet({ id: created.id, name: created.name });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create new spreadsheet in Google Drive.');
    } finally {
      setIsCreatingNew(false);
    }
  };

  const handleManualConnect = async () => {
    if (!accessToken || !manualSheetId.trim()) return;
    // Extract ID if a full Google Sheets URL was pasted
    let id = manualSheetId.trim();
    const urlMatch = id.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch) {
      id = urlMatch[1];
    }

    setIsLoadingTabs(true);
    setError(null);
    try {
      const details = await getSpreadsheetTabs(accessToken, id);
      setSelectedSheetId(id);
      setSelectedSheetTitle(details.title);
      setTabs(details.tabs);
      if (details.tabs.length > 0) {
        setSelectedTab(details.tabs[0].title);
      }
    } catch (err: any) {
      setError(`Cannot access spreadsheet with ID "${id}". Make sure permissions are granted.`);
    } finally {
      setIsLoadingTabs(false);
    }
  };

  const handleConfirmConnection = async () => {
    if (!selectedSheetId || !selectedTab) {
      setError('Please select both a Google Spreadsheet and a tab.');
      return;
    }
    try {
      await onSelectSheet(selectedSheetId, selectedSheetTitle, selectedTab);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to connect sheet.');
    }
  };

  if (!isOpen) return null;

  const filteredSheets = spreadsheets.filter(s =>
    s.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-emerald-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Connect Google Sheet for Ministry</h2>
              <p className="text-xs text-slate-300">
                Designate the spreadsheet where names, phone numbers, and welcome statuses live
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
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Quick Action: Create New Standard Sheet */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 p-4 rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-0.5 text-center sm:text-left">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 justify-center sm:justify-start">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Need a ready-made church registry sheet?
              </span>
              <p className="text-[11px] text-slate-600">
                Click to generate a styled "Ministry Registrations &amp; Outreach" Google Sheet with pre-configured
                columns (Name, Phone, Ministry, Welcome Status, Notes).
              </p>
            </div>
            <button
              onClick={handleCreateNewSheet}
              disabled={isCreatingNew || !accessToken}
              className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50 whitespace-nowrap flex items-center gap-1.5"
            >
              {isCreatingNew ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating in Drive...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Ministry Sheet in Drive</span>
                </>
              )}
            </button>
          </div>

          {/* Search Google Drive Spreadsheets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-indigo-600" />
                Select Spreadsheet from your Google Drive
              </label>
              <button
                onClick={loadDriveSpreadsheets}
                disabled={isLoadingList || !accessToken}
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
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
                placeholder="Filter files by name..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* List of files */}
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto bg-white">
              {isLoadingList ? (
                <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Loading Google Drive spreadsheets...</span>
                </div>
              ) : filteredSheets.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No spreadsheets found matching your search. Or paste the Google Sheet URL below.
                </div>
              ) : (
                filteredSheets.map(s => {
                  const isSelected = selectedSheetId === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSelectSpreadsheet(s)}
                      className={`p-3 flex items-center justify-between text-xs cursor-pointer transition ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-950 font-semibold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <FileSpreadsheet
                          className={`w-4 h-4 flex-shrink-0 ${
                            isSelected ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate">{s.name}</span>
                      </div>
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <span className="text-[10px] text-slate-400">Select</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Or Paste Direct Sheet ID/URL */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Or Paste Google Sheet URL or ID directly:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualSheetId}
                onChange={e => setManualSheetId(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/... or ID"
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleManualConnect}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-medium"
              >
                Load
              </button>
            </div>
          </div>

          {/* Tab Selector if a sheet is selected */}
          {selectedSheetId && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Spreadsheet Tab / Sheet Name:
                </span>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${selectedSheetId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1"
                >
                  <span>Open in Google Sheets</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {isLoadingTabs ? (
                <div className="py-3 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading tabs...</span>
                </div>
              ) : tabs.length === 0 ? (
                <div className="text-xs text-amber-700">No tabs detected.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tabs.map(tab => (
                    <button
                      key={tab.title}
                      type="button"
                      onClick={() => setSelectedTab(tab.title)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        selectedTab === tab.title
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {tab.title} {tab.rowCount ? `(${tab.rowCount} rows)` : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 truncate max-w-xs">
            {selectedSheetTitle && selectedTab ? (
              <span>
                Selected: <strong className="text-slate-800">{selectedSheetTitle}</strong> / {selectedTab}
              </span>
            ) : (
              'Choose a spreadsheet and tab to sync'
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmConnection}
              disabled={!selectedSheetId || !selectedTab}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Connect &amp; Sync Sheet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
