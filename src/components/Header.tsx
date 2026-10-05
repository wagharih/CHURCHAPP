import React from 'react';
import { User } from 'firebase/auth';
import {
  Church,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  LogOut,
  Sparkles,
  Users,
  Send,
  Calendar,
  History,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Phone,
} from 'lucide-react';
import { formatDisplayPhone } from '../services/communications';

interface HeaderProps {
  user: User | null;
  hasToken: boolean;
  isLoggingIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  currentSheetName: string | null;
  currentTabName: string | null;
  currentFormTitle: string | null;
  googleVoiceNumber: string | null;
  onOpenSheetSelector: () => void;
  onOpenFormSelector: () => void;
  onOpenGoogleVoiceSetup: () => void;
  onSync: () => void;
  isSyncing: boolean;
  activeTab: 'members' | 'forms' | 'welcome' | 'broadcast' | 'logs' | 'sheet';
  setActiveTab: (tab: 'members' | 'forms' | 'welcome' | 'broadcast' | 'logs' | 'sheet') => void;
  pendingWelcomesCount: number;
  membersCount: number;
  formResponsesCount: number;
  churchName: string;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  hasToken,
  isLoggingIn,
  onLogin,
  onLogout,
  currentSheetName,
  currentTabName,
  currentFormTitle,
  googleVoiceNumber,
  onOpenSheetSelector,
  onOpenFormSelector,
  onOpenGoogleVoiceSetup,
  onSync,
  isSyncing,
  activeTab,
  setActiveTab,
  pendingWelcomesCount,
  membersCount,
  formResponsesCount,
  churchName,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      {/* Top Banner / Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Church Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-rose-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-900/30 ring-1 ring-white/20">
              <Church className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                  MinistryPulse
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 hidden sm:inline">
                    Church Outreach
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-none">
                {churchName} • Forms, Registrations &amp; Broadcast Hub
              </p>
            </div>
          </div>

          {/* Right Side: Google Voice, Form & Sheet Status & Google Sign In Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Google Voice Line Badge */}
            <button
              onClick={onOpenGoogleVoiceSetup}
              className={`flex items-center gap-1.5 text-xs py-1.5 px-2.5 rounded-lg border transition cursor-pointer ${
                googleVoiceNumber
                  ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 font-semibold'
              }`}
              title="Add or configure church Google Voice number for Caller ID & replies"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <div className="text-left hidden lg:block">
                <div className="text-[10px] uppercase font-semibold text-slate-400 leading-none">
                  Google Voice Line
                </div>
                <div className="font-medium text-emerald-300 font-mono truncate max-w-[140px]">
                  {googleVoiceNumber ? formatDisplayPhone(googleVoiceNumber) : '+ Add Google Voice'}
                </div>
              </div>
              <span className="lg:hidden text-xs font-semibold text-emerald-300">
                {googleVoiceNumber ? 'GV Line' : '+ Add Voice'}
              </span>
            </button>

            {/* Form Connection Status Badge */}
            {hasToken && (
              <button
                onClick={onOpenFormSelector}
                className="flex items-center gap-2 text-xs py-1.5 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 transition group"
                title="Manage connected Google Form"
              >
                <FileText className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                <div className="text-left hidden xl:block">
                  <div className="text-[10px] uppercase font-semibold text-slate-400 leading-none">
                    Google Form
                  </div>
                  <div className="font-medium text-purple-300 truncate max-w-[120px]">
                    {currentFormTitle || 'Connect Form'}
                  </div>
                </div>
              </button>
            )}

            {/* Sheet Connection Status Badge */}
            {hasToken ? (
              <button
                onClick={onOpenSheetSelector}
                className="flex items-center gap-2 text-xs py-1.5 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 transition group"
                title="Manage connected Google Sheet"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <div className="text-left hidden md:block">
                  <div className="text-[10px] uppercase font-semibold text-slate-400 leading-none">
                    Google Sheet
                  </div>
                  <div className="font-medium text-emerald-300 truncate max-w-[130px]">
                    {currentSheetName ? `${currentSheetName}` : 'Select Sheet'}
                  </div>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-950 animate-pulse md:hidden" />
              </button>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-300/90 bg-amber-950/40 border border-amber-800/60 px-2.5 py-1 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Demo Mode (Sign in to connect Google Forms &amp; Sheets)</span>
              </div>
            )}

            {/* Sync Now Button */}
            {hasToken && (
              <button
                onClick={onSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 text-xs font-medium py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50"
                title="Sync from Google Sheets & Forms"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
              </button>
            )}

            {/* Google Account Profile or Sign In Button */}
            {user && hasToken ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Staff'}
                    className="w-8 h-8 rounded-full border border-slate-700 ring-1 ring-emerald-500/50"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    {(user.displayName || user.email || 'S')[0].toUpperCase()}
                  </div>
                )}
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-semibold text-slate-200 truncate max-w-[110px]">
                    {user.displayName || 'Church Staff'}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[110px]">
                    {user.email}
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Official Google Sign-in Styled Button */
              <button
                onClick={onLogin}
                disabled={isLoggingIn}
                className="gsi-material-button relative inline-flex items-center justify-center px-3 py-1.5 border border-slate-600 rounded-lg bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    className="w-4 h-4"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="bg-slate-950/60 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto py-2 scrollbar-none">
          {/* Contacts */}
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'members'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Contacts &amp; Registrations</span>
            <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
              {membersCount}
            </span>
          </button>

          {/* Google Forms Hub */}
          <button
            onClick={() => setActiveTab('forms')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'forms'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Google Forms Intake</span>
            {formResponsesCount > 0 && (
              <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded-full bg-purple-400 text-slate-950 font-bold">
                {formResponsesCount}
              </span>
            )}
          </button>

          {/* Automated Welcome */}
          <button
            onClick={() => setActiveTab('welcome')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'welcome'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Automated Welcome</span>
            {pendingWelcomesCount > 0 ? (
              <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 font-bold animate-pulse">
                {pendingWelcomesCount} new
              </span>
            ) : (
              <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300">
                all welcomed
              </span>
            )}
          </button>

          {/* Worship Nights & Broadcasts */}
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'broadcast'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Worship Nights &amp; Broadcasts</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
              ⚡ Mass Send
            </span>
          </button>

          {/* Outreach History */}
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'logs'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Outreach History</span>
          </button>

          {/* Google Sheets Setup */}
          <button
            onClick={() => setActiveTab('sheet')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'sheet'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Google Sheets Setup</span>
          </button>
        </nav>
      </div>
    </header>
  );
};

