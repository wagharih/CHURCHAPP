import React, { useState } from 'react';
import { OutreachLog } from '../types';
import { formatDisplayPhone } from '../services/communications';
import {
  History,
  Trash2,
  Search,
  Calendar,
  Sparkles,
  Phone,
  MessageSquare,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface OutreachLogsViewProps {
  logs: OutreachLog[];
  onClearLogs: () => void;
}

export const OutreachLogsView: React.FC<OutreachLogsViewProps> = ({ logs, onClearLogs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'welcome' | 'broadcast' | 'direct_call'>('all');

  const filtered = logs.filter(log => {
    const matchesSearch =
      log.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.phoneNumber.includes(searchTerm) ||
      log.messageText.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || log.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Outreach Audit Trail &amp; History</h2>
            <p className="text-xs text-slate-500">Record of welcome texts, worship broadcasts, and calls</p>
          </div>
        </div>

        {logs.length > 0 && (
          <button
            onClick={onClearLogs}
            className="text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1.5 self-start sm:self-center"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search logs by name, phone, or message text..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as any)}
          className="text-xs font-medium bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-lg text-slate-700"
        >
          <option value="all">All Outreach Types</option>
          <option value="welcome">Welcome Messages</option>
          <option value="broadcast">Worship Broadcasts</option>
          <option value="direct_call">Google Voice Calls</option>
        </select>
      </div>

      {/* Logs Table / List */}
      <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden max-h-[550px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <History className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No outreach activity logged yet</p>
            <p className="text-xs text-slate-400">
              When you send welcome messages or worship broadcasts, a timestamped record is kept here.
            </p>
          </div>
        ) : (
          filtered.map(log => {
            const isWelcome = log.type === 'welcome';
            const isBroadcast = log.type === 'broadcast';
            const isCall = log.type === 'direct_call';

            return (
              <div key={log.id} className="p-4 hover:bg-slate-50/70 transition space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                        isWelcome
                          ? 'bg-rose-100 text-rose-800'
                          : isBroadcast
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isWelcome && <Sparkles className="w-3 h-3" />}
                      {isBroadcast && <Calendar className="w-3 h-3" />}
                      {isCall && <Phone className="w-3 h-3" />}
                      {log.type.replace('_', ' ')}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">{log.recipientName}</span>
                    <span className="font-mono text-slate-500">{formatDisplayPhone(log.phoneNumber)}</span>
                  </div>

                  <span className="text-[11px] text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-700 font-sans leading-relaxed">
                  {log.messageText}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Channel: <strong className="text-slate-600 capitalize">{log.channel.replace('_', ' ')}</strong></span>
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Status: {log.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
