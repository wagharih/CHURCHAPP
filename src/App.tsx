/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout as authLogout,
  getAccessToken,
  setAccessTokenInMemory,
} from './services/auth';
import {
  loadSheetMembers,
  appendMemberToSheet,
  updateMemberInSheet,
  updateCellInSheet,
} from './services/sheets';
import {
  replaceMessageVariables,
  getOutreachLogs,
  clearOutreachLogs,
  SmsGatewayConfig,
  getSmsGatewayConfig,
  saveSmsGatewayConfig,
} from './services/communications';
import { getFormResponses, createMinistryGoogleForm } from './services/forms';
import { MemberRecord, ChurchEvent, OutreachLog, GoogleFormInfo, GoogleFormResponse } from './types';
import {
  DEFAULT_CHURCH_NAME,
  DEFAULT_WELCOME_TEMPLATE,
  INITIAL_EVENTS,
  INITIAL_DEMO_MEMBERS,
} from './data/initialData';

import { Header } from './components/Header';
import { MemberList } from './components/MemberList';
import { MemberModal } from './components/MemberModal';
import { WelcomeManager } from './components/WelcomeManager';
import { BroadcastCenter } from './components/BroadcastCenter';
import { SheetConnectorModal } from './components/SheetConnectorModal';
import { CallDispatcherModal } from './components/CallDispatcherModal';
import { BatchBroadcastRunnerModal } from './components/BatchBroadcastRunnerModal';
import { AddEventModal } from './components/AddEventModal';
import { OutreachLogsView } from './components/OutreachLogsView';
import { ConfirmationModal } from './components/ConfirmationModal';
import { FormsHub } from './components/FormsHub';
import { FormSelectorModal } from './components/FormSelectorModal';

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // App Navigation
  const [activeTab, setActiveTab] = useState<'members' | 'forms' | 'welcome' | 'broadcast' | 'logs' | 'sheet'>(
    'members'
  );

  // Church Info & Configuration
  const [churchName, setChurchName] = useState<string>(() => {
    return localStorage.getItem('mp_church_name') || DEFAULT_CHURCH_NAME;
  });
  const [welcomeTemplate, setWelcomeTemplate] = useState<string>(() => {
    return localStorage.getItem('mp_welcome_template') || DEFAULT_WELCOME_TEMPLATE;
  });

  // Sheet configuration
  const [currentSheetId, setCurrentSheetId] = useState<string | null>(() => {
    return localStorage.getItem('mp_sheet_id');
  });
  const [currentSheetTitle, setCurrentSheetTitle] = useState<string | null>(() => {
    return localStorage.getItem('mp_sheet_title');
  });
  const [currentTabName, setCurrentTabName] = useState<string | null>(() => {
    return localStorage.getItem('mp_tab_name');
  });

  // Google Form state
  const [currentForm, setCurrentForm] = useState<GoogleFormInfo | null>(() => {
    const saved = localStorage.getItem('mp_current_form');
    return saved ? JSON.parse(saved) : null;
  });
  const [formResponses, setFormResponses] = useState<GoogleFormResponse[]>(() => {
    const saved = localStorage.getItem('mp_form_responses');
    return saved ? JSON.parse(saved) : [];
  });
  const [isFormSelectorOpen, setIsFormSelectorOpen] = useState(false);
  const [isRefreshingForms, setIsRefreshingForms] = useState(false);
  const [isCreatingForm, setIsCreatingForm] = useState(false);

  // Data
  const [members, setMembers] = useState<MemberRecord[]>(() => {
    const saved = localStorage.getItem('mp_cached_members');
    return saved ? JSON.parse(saved) : INITIAL_DEMO_MEMBERS;
  });
  const [events, setEvents] = useState<ChurchEvent[]>(() => {
    const saved = localStorage.getItem('mp_church_events');
    return saved ? JSON.parse(saved) : INITIAL_EVENTS;
  });
  const [outreachLogs, setOutreachLogs] = useState<OutreachLog[]>(getOutreachLogs);

  // UI state
  const [gatewayConfig, setGatewayConfig] = useState<SmsGatewayConfig>(getSmsGatewayConfig);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<MemberRecord | null>(null);
  const [isSavingMember, setIsSavingMember] = useState(false);

  // Dispatcher Modal
  const [dispatcherMember, setDispatcherMember] = useState<MemberRecord | null>(null);
  const [dispatcherInitialMsg, setDispatcherInitialMsg] = useState('');
  const [dispatcherMode, setDispatcherMode] = useState<'welcome' | 'custom' | 'call'>('welcome');
  const [isDispatcherOpen, setIsDispatcherOpen] = useState(false);

  // Batch Broadcast Runner Modal
  const [batchRunnerOpen, setBatchRunnerOpen] = useState(false);
  const [batchRunnerTitle, setBatchRunnerTitle] = useState('');
  const [batchRecipients, setBatchRecipients] = useState<MemberRecord[]>([]);
  const [batchTemplate, setBatchTemplate] = useState('');
  const [batchEvent, setBatchEvent] = useState<ChurchEvent | undefined>(undefined);
  const [batchMode, setBatchMode] = useState<'welcome' | 'broadcast'>('broadcast');

  // Add Event Modal
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);

  // Confirmation Modal
  const [confirmationData, setConfirmationData] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    affectedCount?: number;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // Initialize Firebase Auth on Mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setAccessTokenInMemory(token);
      },
      () => {
        // Token not currently cached in memory
        setUser(null);
        setAccessToken(null);
        setAccessTokenInMemory(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Save members cache to localStorage
  useEffect(() => {
    localStorage.setItem('mp_cached_members', JSON.stringify(members));
  }, [members]);

  // Save events to localStorage
  useEffect(() => {
    localStorage.setItem('mp_church_events', JSON.stringify(events));
  }, [events]);

  // Sync Sheet Members from Google Sheets
  const syncWithGoogleSheet = useCallback(async () => {
    const token = accessToken || getAccessToken();
    if (!token || !currentSheetId || !currentTabName) {
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    try {
      const result = await loadSheetMembers(token, currentSheetId, currentTabName);
      setMembers(result.members);
    } catch (err: any) {
      console.error('Error syncing Google Sheet:', err);
      setSyncError(err.message || 'Failed to sync with Google Sheet');
    } finally {
      setIsSyncing(false);
    }
  }, [accessToken, currentSheetId, currentTabName]);

  // Auto-sync when sheet or token becomes available
  useEffect(() => {
    if (accessToken && currentSheetId && currentTabName) {
      syncWithGoogleSheet();
    }
  }, [accessToken, currentSheetId, currentTabName, syncWithGoogleSheet]);

  // Sync Form Responses from Google Forms
  const syncFormResponses = useCallback(async () => {
    const token = accessToken || getAccessToken();
    if (!token || !currentForm) return;

    setIsRefreshingForms(true);
    try {
      const responses = await getFormResponses(token, currentForm.formId, currentForm.questions);
      setFormResponses(responses);
      localStorage.setItem('mp_form_responses', JSON.stringify(responses));
    } catch (err: any) {
      console.error('Error fetching form responses:', err);
    } finally {
      setIsRefreshingForms(false);
    }
  }, [accessToken, currentForm]);

  // Auto-sync forms when form or token becomes available
  useEffect(() => {
    if (accessToken && currentForm) {
      syncFormResponses();
    }
  }, [accessToken, currentForm, syncFormResponses]);

  const handleSelectForm = async (form: GoogleFormInfo) => {
    setCurrentForm(form);
    localStorage.setItem('mp_current_form', JSON.stringify(form));
    const token = accessToken || getAccessToken();
    if (token) {
      setIsRefreshingForms(true);
      try {
        const responses = await getFormResponses(token, form.formId, form.questions);
        setFormResponses(responses);
        localStorage.setItem('mp_form_responses', JSON.stringify(responses));
      } catch (err) {
        console.error(err);
      } finally {
        setIsRefreshingForms(false);
      }
    }
  };

  const handleCreateNewForm = async () => {
    const token = accessToken || getAccessToken();
    if (!token) return;
    setIsCreatingForm(true);
    try {
      const created = await createMinistryGoogleForm(
        token,
        `${churchName} - Ministry & Worship Registration`,
        churchName
      );
      // Read details back
      const { getFormDetails } = await import('./services/forms');
      const formInfo = await getFormDetails(token, created.formId);
      await handleSelectForm(formInfo);
    } catch (err: any) {
      console.error('Failed to create form in Drive:', err);
      alert(err.message || 'Failed to create Google Form');
    } finally {
      setIsCreatingForm(false);
    }
  };

  const handleImportResponseToMembers = async (
    resp: GoogleFormResponse,
    autoWelcome: boolean
  ) => {
    await handleSaveMember(
      {
        fullName: resp.extractedName || 'Form Respondent',
        phoneNumber: resp.extractedPhone || '',
        ministry: resp.extractedMinistry || 'General Ministry',
        registeredAt: resp.createTime ? resp.createTime.split('T')[0] : new Date().toISOString().split('T')[0],
        welcomeStatus: 'Pending',
        notes: resp.extractedNotes ? `Form Submission | ${resp.extractedNotes}` : 'Imported from Google Forms',
      },
      { autoWelcome }
    );
  };

  const handleOpenDispatcherForResponse = (resp: GoogleFormResponse) => {
    const tempMember: MemberRecord = {
      id: `temp-${resp.responseId}`,
      rowNumber: 0,
      fullName: resp.extractedName || 'Friend',
      phoneNumber: resp.extractedPhone || '',
      cleanPhone: (resp.extractedPhone || '').replace(/[^\d+]/g, ''),
      ministry: resp.extractedMinistry || 'General Ministry',
      registeredAt: resp.createTime ? resp.createTime.split('T')[0] : new Date().toISOString().split('T')[0],
      welcomeStatus: 'Pending',
      notes: resp.extractedNotes,
    };

    handleOpenDispatcher(tempMember, 'welcome');
  };

  // Sync both Google Sheet and Google Forms
  const handleSyncAll = async () => {
    await Promise.all([syncWithGoogleSheet(), syncFormResponses()]);
  };

  // Sign In Handler
  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        // If no sheet is connected yet, open sheet selector
        if (!currentSheetId) {
          setIsSheetModalOpen(true);
        }
      }
    } catch (err: any) {
      console.error('Sign in failed:', err);
      alert('Sign-in failed. Please ensure third-party popups are enabled and try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    await authLogout();
    setUser(null);
    setAccessToken(null);
  };

  // Sheet selection handler
  const handleSelectSheet = async (sheetId: string, sheetTitle: string, tabName: string) => {
    setCurrentSheetId(sheetId);
    setCurrentSheetTitle(sheetTitle);
    setCurrentTabName(tabName);
    localStorage.setItem('mp_sheet_id', sheetId);
    localStorage.setItem('mp_sheet_title', sheetTitle);
    localStorage.setItem('mp_tab_name', tabName);

    // Initial load
    const token = accessToken || getAccessToken();
    if (token) {
      setIsSyncing(true);
      try {
        const result = await loadSheetMembers(token, sheetId, tabName);
        setMembers(result.members);
      } catch (err: any) {
        console.error('Failed to load members from chosen sheet:', err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // Save new or edited member (with Google Sheets 2-way sync)
  const handleSaveMember = async (
    memberData: {
      fullName: string;
      phoneNumber: string;
      ministry: string;
      registeredAt: string;
      welcomeStatus: string;
      notes: string;
    },
    options: { autoWelcome: boolean }
  ) => {
    setIsSavingMember(true);
    const token = accessToken || getAccessToken();

    try {
      if (memberToEdit) {
        // 1. Updating existing member
        const updatedMember: MemberRecord = {
          ...memberToEdit,
          ...memberData,
          cleanPhone: memberData.phoneNumber.replace(/[^\d+]/g, ''),
        };

        // Update in Google Sheet if connected
        if (token && currentSheetId && currentTabName) {
          await updateMemberInSheet(
            token,
            currentSheetId,
            currentTabName,
            memberToEdit.rowNumber,
            updatedMember,
            memberToEdit.rawValues
          );
        }

        setMembers(prev => prev.map(m => (m.id === memberToEdit.id ? updatedMember : m)));
      } else {
        // 2. Adding brand new member
        let assignedRowNumber = members.length + 2;

        if (token && currentSheetId && currentTabName) {
          const res = await appendMemberToSheet(token, currentSheetId, currentTabName, {
            fullName: memberData.fullName,
            phoneNumber: memberData.phoneNumber,
            ministry: memberData.ministry,
            registeredAt: memberData.registeredAt,
            welcomeStatus: memberData.welcomeStatus,
            notes: memberData.notes,
          });
          assignedRowNumber = res.rowNumber;
        }

        const newRecord: MemberRecord = {
          id: `member-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          rowNumber: assignedRowNumber,
          fullName: memberData.fullName,
          phoneNumber: memberData.phoneNumber,
          cleanPhone: memberData.phoneNumber.replace(/[^\d+]/g, ''),
          ministry: memberData.ministry,
          registeredAt: memberData.registeredAt,
          welcomeStatus: memberData.welcomeStatus,
          notes: memberData.notes,
        };

        setMembers(prev => [newRecord, ...prev]);

        // Automated Welcome Flow if enabled
        if (options.autoWelcome) {
          const personalizedMsg = replaceMessageVariables(welcomeTemplate, newRecord, {
            churchName,
          });
          // Open welcome dispatcher for immediate delivery
          setTimeout(() => {
            setDispatcherMember(newRecord);
            setDispatcherInitialMsg(personalizedMsg);
            setDispatcherMode('welcome');
            setIsDispatcherOpen(true);
          }, 400);
        }
      }
    } catch (err: any) {
      console.error('Save member error:', err);
      throw err;
    } finally {
      setIsSavingMember(false);
    }
  };

  // Open Dispatcher for a single member
  const handleOpenDispatcher = (member: MemberRecord, mode: 'welcome' | 'custom' | 'call') => {
    setDispatcherMember(member);
    setDispatcherMode(mode);

    if (mode === 'welcome') {
      const msg = replaceMessageVariables(welcomeTemplate, member, { churchName });
      setDispatcherInitialMsg(msg);
    } else if (mode === 'call') {
      setDispatcherInitialMsg(`Pastoral check-in call with ${member.fullName}`);
    } else {
      setDispatcherInitialMsg(`Hi ${member.fullName.split(' ')[0]}! Greetings from ${churchName}!`);
    }

    setIsDispatcherOpen(true);
  };

  // Mark a member as Welcomed and update cell in Google Sheet
  const handleMarkWelcomedAndSynced = async (member: MemberRecord, note?: string) => {
    const token = accessToken || getAccessToken();

    // 1. Update in Google Sheet if connected (Col 4 is typically Welcome Status)
    if (token && currentSheetId && currentTabName) {
      try {
        await updateCellInSheet(token, currentSheetId, currentTabName, member.rowNumber, 4, 'Welcomed');
      } catch (err) {
        console.error('Error updating welcome status in sheet:', err);
      }
    }

    // 2. Update local state
    setMembers(prev =>
      prev.map(m =>
        m.id === member.id
          ? {
              ...m,
              welcomeStatus: 'Welcomed',
              notes: note ? `${m.notes ? m.notes + ' | ' : ''}${note}` : m.notes,
            }
          : m
      )
    );
  };

  // Batch Welcome All Pending
  const handleBatchWelcomeAll = (pendingMembers: MemberRecord[]) => {
    setConfirmationData({
      isOpen: true,
      title: 'Batch Welcome Outreach',
      description: `You are about to launch welcome outreach for all ${pendingMembers.length} pending church registrations. This will open the step-through dispatcher and update each member's status in Google Sheets.`,
      affectedCount: pendingMembers.length,
      confirmLabel: 'Proceed with Batch Welcome',
      onConfirm: () => {
        setConfirmationData(prev => ({ ...prev, isOpen: false }));
        setBatchRunnerTitle(`Batch Welcome Outreach (${pendingMembers.length} Members)`);
        setBatchRecipients(pendingMembers);
        setBatchTemplate(welcomeTemplate);
        setBatchEvent(undefined);
        setBatchMode('welcome');
        setBatchRunnerOpen(true);
      },
    });
  };

  // Complete batch in sheet
  const handleCompleteBatchWelcomeInSheet = async (recipients: MemberRecord[]) => {
    const token = accessToken || getAccessToken();
    if (token && currentSheetId && currentTabName) {
      for (const m of recipients) {
        try {
          await updateCellInSheet(token, currentSheetId, currentTabName, m.rowNumber, 4, 'Welcomed');
        } catch (err) {
          console.error(err);
        }
      }
    }

    // Update local state
    const ids = new Set(recipients.map(r => r.id));
    setMembers(prev =>
      prev.map(m => (ids.has(m.id) ? { ...m, welcomeStatus: 'Welcomed' } : m))
    );
  };

  // Launch Weekly Broadcast for selected Church Event
  const handleRunBroadcast = (
    event: ChurchEvent,
    targetMembers: MemberRecord[],
    messageTemplate: string
  ) => {
    setConfirmationData({
      isOpen: true,
      title: `Broadcast: ${event.title}`,
      description: `You are about to launch a broadcast announcement for "${event.title}" to ${targetMembers.length} church members. This operation will update the "Last Broadcast Date" for all recipients in your connected Google Sheet.`,
      affectedCount: targetMembers.length,
      confirmLabel: 'Launch Weekly Broadcast',
      onConfirm: () => {
        setConfirmationData(prev => ({ ...prev, isOpen: false }));
        setBatchRunnerTitle(`Broadcast: ${event.title}`);
        setBatchRecipients(targetMembers);
        setBatchTemplate(messageTemplate);
        setBatchEvent(event);
        setBatchMode('broadcast');
        setBatchRunnerOpen(true);
      },
    });
  };

  // Complete broadcast in sheet
  const handleCompleteBroadcastInSheet = async (recipients: MemberRecord[]) => {
    const token = accessToken || getAccessToken();
    const today = new Date().toISOString().split('T')[0];

    if (token && currentSheetId && currentTabName) {
      for (const m of recipients) {
        try {
          // Col 5 is typically Last Broadcast Date
          await updateCellInSheet(token, currentSheetId, currentTabName, m.rowNumber, 5, today);
        } catch (err) {
          console.error(err);
        }
      }
    }

    // Update local state
    const ids = new Set(recipients.map(r => r.id));
    setMembers(prev =>
      prev.map(m => (ids.has(m.id) ? { ...m, lastBroadcastDate: today } : m))
    );
  };

  // Add new Church Event
  const handleAddEvent = (newEventData: Omit<ChurchEvent, 'id'>) => {
    const newEvent: ChurchEvent = {
      ...newEventData,
      id: `event-${Date.now()}`,
    };
    setEvents(prev => [newEvent, ...prev]);
  };

  const pendingWelcomesCount = members.filter(
    m => m.welcomeStatus.toLowerCase() !== 'welcomed'
  ).length;

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 flex flex-col font-sans">
      {/* App Header */}
      <Header
        user={user}
        hasToken={!!accessToken}
        isLoggingIn={isLoggingIn}
        onLogin={handleGoogleSignIn}
        onLogout={handleLogout}
        currentSheetName={currentSheetTitle}
        currentTabName={currentTabName}
        currentFormTitle={currentForm?.title || null}
        onOpenSheetSelector={() => setIsSheetModalOpen(true)}
        onOpenFormSelector={() => setIsFormSelectorOpen(true)}
        onSync={handleSyncAll}
        isSyncing={isSyncing || isRefreshingForms}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingWelcomesCount={pendingWelcomesCount}
        membersCount={members.length}
        formResponsesCount={formResponses.length}
        churchName={churchName}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Sync Error Alert */}
        {syncError && (
          <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <span>
              <strong>Google Sheets Sync Alert:</strong> {syncError}
            </span>
            <button
              onClick={() => setSyncError(null)}
              className="text-rose-600 hover:text-rose-900 font-bold ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab 1: Contacts & Registrations */}
        {activeTab === 'members' && (
          <MemberList
            members={members}
            onAddMember={() => {
              setMemberToEdit(null);
              setIsMemberModalOpen(true);
            }}
            onEditMember={member => {
              setMemberToEdit(member);
              setIsMemberModalOpen(true);
            }}
            onOpenDispatcher={handleOpenDispatcher}
            onBulkBroadcast={selected => {
              if (events.length > 0) {
                handleRunBroadcast(
                  events[0],
                  selected,
                  `Hi {First_Name}! 🕊️ Join us for "${events[0].title}" this ${events[0].date} at ${events[0].time} (${events[0].location}). - ${churchName}`
                );
              }
            }}
            isSyncing={isSyncing}
            hasGoogleSheet={!!currentSheetId && !!accessToken}
            currentSheetName={currentSheetTitle}
          />
        )}

        {/* Tab: Google Forms Intake */}
        {activeTab === 'forms' && (
          <FormsHub
            currentForm={currentForm}
            formResponses={formResponses}
            onOpenFormSelector={() => setIsFormSelectorOpen(true)}
            onCreateNewForm={handleCreateNewForm}
            onRefreshResponses={syncFormResponses}
            isRefreshing={isRefreshingForms}
            isCreating={isCreatingForm}
            onImportResponseToMembers={handleImportResponseToMembers}
            onOpenDispatcherForResponse={handleOpenDispatcherForResponse}
            churchName={churchName}
            hasGoogleAuth={!!accessToken}
          />
        )}

        {/* Tab 2: Automated Welcome Manager */}
        {activeTab === 'welcome' && (
          <WelcomeManager
            members={members}
            welcomeTemplate={welcomeTemplate}
            onUpdateTemplate={newTpl => {
              setWelcomeTemplate(newTpl);
              localStorage.setItem('mp_welcome_template', newTpl);
            }}
            churchName={churchName}
            onOpenDispatcher={member => handleOpenDispatcher(member, 'welcome')}
            onBatchWelcomeAll={handleBatchWelcomeAll}
            isProcessingBatch={false}
          />
        )}

        {/* Tab 3: Worship Nights & Broadcasts */}
        {activeTab === 'broadcast' && (
          <BroadcastCenter
            events={events}
            members={members}
            onAddEvent={() => setIsAddEventOpen(true)}
            onRunBroadcast={handleRunBroadcast}
            churchName={churchName}
          />
        )}

        {/* Tab 4: Outreach Logs */}
        {activeTab === 'logs' && (
          <OutreachLogsView
            logs={outreachLogs}
            onClearLogs={() => {
              clearOutreachLogs();
              setOutreachLogs([]);
            }}
          />
        )}

        {/* Tab 5: Google Sheets Setup */}
        {activeTab === 'sheet' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900">Google Sheets Integration Settings</h2>
              <p className="text-xs text-slate-500">
                Connect and manage the Google Spreadsheet collecting your church registrations and outreach
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Current Connected Sheet
                  </div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {currentSheetTitle || 'No Sheet Connected (Demo Mode)'}
                  </div>
                  {currentSheetId && (
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      Sheet ID: {currentSheetId} • Tab: {currentTabName}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setIsSheetModalOpen(true)}
                  className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                >
                  {currentSheetId ? 'Change Google Sheet' : 'Connect Google Sheet'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Church / Ministry Brand Name
                </label>
                <input
                  type="text"
                  value={churchName}
                  onChange={e => {
                    setChurchName(e.target.value);
                    localStorage.setItem('mp_church_name', e.target.value);
                  }}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Live Google Connection Status
                </label>
                <div className="px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-700 flex items-center justify-between">
                  <span>{accessToken ? `Connected as ${user?.email}` : 'Signed out'}</span>
                  {!accessToken && (
                    <button
                      onClick={handleGoogleSignIn}
                      className="text-xs text-indigo-600 font-bold hover:underline"
                    >
                      Sign In
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Direct Mass Messaging & Telecom Gateway Settings */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-sm font-bold text-slate-900">
                      ⚡ Direct Mass SMS Dispatch Engine (Zero Google Voice Transfers)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                    Allows church staff to push <strong>"⚡ Send Mass Messages"</strong> or <strong>"⚡ Auto-Send All Welcomes"</strong> and
                    have the system automatically dispatch messages in sequence directly to member numbers without opening external tabs or transferring to Google Voice.
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider flex-shrink-0 self-start">
                  Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Mass Dispatch Delivery Mode
                  </label>
                  <select
                    value={gatewayConfig.provider}
                    onChange={e => {
                      const updated: SmsGatewayConfig = { ...gatewayConfig, provider: e.target.value as any };
                      setGatewayConfig(updated);
                      saveSmsGatewayConfig(updated);
                    }}
                    className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="direct_cloud">⚡ Direct In-App Cloud SMS (Automatic, No Transfers)</option>
                    <option value="twilio">Twilio Carrier Gateway (Custom Church Line)</option>
                    <option value="google_voice_assisted">Google Voice Assisted (Manual External Tabs)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Church Sender Display Title
                  </label>
                  <input
                    type="text"
                    value={gatewayConfig.senderName || ''}
                    onChange={e => {
                      const updated: SmsGatewayConfig = { ...gatewayConfig, senderName: e.target.value };
                      setGatewayConfig(updated);
                      saveSmsGatewayConfig(updated);
                    }}
                    placeholder="e.g. Grace Harvest Pastoral Team"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {gatewayConfig.provider === 'twilio' && (
                <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800">
                    Twilio Church Line Credentials (Optional)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Account SID"
                      value={gatewayConfig.twilioSid || ''}
                      onChange={e => {
                        const updated = { ...gatewayConfig, twilioSid: e.target.value };
                        setGatewayConfig(updated);
                        saveSmsGatewayConfig(updated);
                      }}
                      className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md font-mono"
                    />
                    <input
                      type="password"
                      placeholder="Auth Token"
                      value={gatewayConfig.twilioToken || ''}
                      onChange={e => {
                        const updated = { ...gatewayConfig, twilioToken: e.target.value };
                        setGatewayConfig(updated);
                        saveSmsGatewayConfig(updated);
                      }}
                      className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Church Phone (+1...)"
                      value={gatewayConfig.twilioFromNumber || ''}
                      onChange={e => {
                        const updated = { ...gatewayConfig, twilioFromNumber: e.target.value };
                        setGatewayConfig(updated);
                        saveSmsGatewayConfig(updated);
                      }}
                      className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {/* 1. Add / Edit Member Modal */}
      <MemberModal
        isOpen={isMemberModalOpen}
        onClose={() => {
          setIsMemberModalOpen(false);
          setMemberToEdit(null);
        }}
        onSave={handleSaveMember}
        memberToEdit={memberToEdit}
        isSaving={isSavingMember}
      />

      {/* 2. Google Sheet Connector Modal */}
      <SheetConnectorModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        accessToken={accessToken}
        currentSpreadsheetId={currentSheetId}
        currentTabName={currentTabName}
        onSelectSheet={handleSelectSheet}
        churchName={churchName}
      />

      {/* 3. Call / SMS Dispatcher Modal */}
      <CallDispatcherModal
        isOpen={isDispatcherOpen}
        onClose={() => setIsDispatcherOpen(false)}
        member={dispatcherMember}
        initialMessage={dispatcherInitialMsg}
        mode={dispatcherMode}
        onMarkWelcomedAndSynced={handleMarkWelcomedAndSynced}
        churchName={churchName}
      />

      {/* 4. Batch Broadcast Runner Modal */}
      <BatchBroadcastRunnerModal
        isOpen={batchRunnerOpen}
        onClose={() => setBatchRunnerOpen(false)}
        title={batchRunnerTitle}
        recipients={batchRecipients}
        template={batchTemplate}
        event={batchEvent}
        churchName={churchName}
        mode={batchMode}
        onCompleteBatchInSheet={
          batchMode === 'welcome'
            ? handleCompleteBatchWelcomeInSheet
            : handleCompleteBroadcastInSheet
        }
      />

      {/* 5. Add Church Program / Worship Night Modal */}
      <AddEventModal
        isOpen={isAddEventOpen}
        onClose={() => setIsAddEventOpen(false)}
        onAddEvent={handleAddEvent}
      />

      {/* 6. Workspace Mutation Safety Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationData.isOpen}
        onClose={() => setConfirmationData(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmationData.onConfirm}
        title={confirmationData.title}
        description={confirmationData.description}
        affectedCount={confirmationData.affectedCount}
        confirmLabel={confirmationData.confirmLabel}
        isDestructive={confirmationData.isDestructive}
      />

      {/* 7. Google Form Selector Modal */}
      <FormSelectorModal
        isOpen={isFormSelectorOpen}
        onClose={() => setIsFormSelectorOpen(false)}
        accessToken={accessToken}
        onSelectForm={handleSelectForm}
        churchName={churchName}
      />
    </div>
  );
}
