import React, { useState, useMemo } from 'react';
import { MemberRecord } from '../types';
import { formatDisplayPhone, getFirstName } from '../services/communications';
import {
  Search,
  UserPlus,
  Phone,
  MessageSquare,
  Sparkles,
  Edit2,
  CheckCircle2,
  Clock,
  Filter,
  ArrowUpDown,
  Download,
  Share2,
  Calendar,
  AlertCircle,
} from 'lucide-react';

interface MemberListProps {
  members: MemberRecord[];
  onAddMember: () => void;
  onEditMember: (member: MemberRecord) => void;
  onOpenDispatcher: (member: MemberRecord, mode: 'welcome' | 'custom' | 'call') => void;
  onBulkBroadcast: (selectedMembers: MemberRecord[]) => void;
  isSyncing: boolean;
  hasGoogleSheet: boolean;
  currentSheetName: string | null;
}

export const MemberList: React.FC<MemberListProps> = ({
  members,
  onAddMember,
  onEditMember,
  onOpenDispatcher,
  onBulkBroadcast,
  isSyncing,
  hasGoogleSheet,
  currentSheetName,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'welcomed'>('all');
  const [ministryFilter, setMinistryFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Unique ministries for filter dropdown
  const ministries = useMemo(() => {
    const set = new Set<string>();
    members.forEach(m => {
      if (m.ministry) set.add(m.ministry);
    });
    return Array.from(set).sort();
  }, [members]);

  // Filtered members
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchesSearch =
        m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.phoneNumber.includes(searchTerm) ||
        m.cleanPhone.includes(searchTerm) ||
        (m.notes && m.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        m.ministry.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'pending'
          ? m.welcomeStatus.toLowerCase() !== 'welcomed'
          : m.welcomeStatus.toLowerCase() === 'welcomed';

      const matchesMinistry = ministryFilter === 'all' || m.ministry === ministryFilter;

      return matchesSearch && matchesStatus && matchesMinistry;
    });
  }, [members, searchTerm, statusFilter, ministryFilter]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredMembers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMembers.map(m => m.id)));
    }
  };

  const toggleSelectMember = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectedMemberList = useMemo(() => {
    return members.filter(m => selectedIds.has(m.id));
  }, [members, selectedIds]);

  const pendingCount = members.filter(m => m.welcomeStatus.toLowerCase() !== 'welcomed').length;

  return (
    <div className="space-y-4">
      {/* Top Banner & Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Contacts</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{members.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Synced from {currentSheetName || 'Demo Sheet'}</p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <UserPlus className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending Welcome</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
            <p className="text-xs text-slate-400 mt-0.5">Awaiting welcome text</p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Welcomed Members</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {members.length - pendingCount}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Connected &amp; Greeted</p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-800 p-4 rounded-xl border border-indigo-800/40 shadow-sm text-white flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Outreach Quick Action</span>
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin-slow" />
          </div>
          <button
            onClick={onAddMember}
            className="w-full mt-2 py-2 px-3 bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add New Member</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Search, Filters, Add Member */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search members by name, phone (+1...), ministry, or notes..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Welcome Status</option>
              <option value="pending">Pending Welcome ({pendingCount})</option>
              <option value="welcomed">Welcomed ({members.length - pendingCount})</option>
            </select>

            {/* Ministry Filter */}
            <select
              value={ministryFilter}
              onChange={e => setMinistryFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[160px]"
            >
              <option value="all">All Ministries</option>
              {ministries.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {/* Primary Add Button */}
            <button
              onClick={onAddMember}
              className="flex items-center gap-1.5 py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
          </div>
        </div>

        {/* Selected Items Batch Bar */}
        {selectedIds.size > 0 && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 transition">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              <span className="text-xs font-semibold text-indigo-900">
                {selectedIds.size} of {filteredMembers.length} member{selectedIds.size > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onBulkBroadcast(selectedMemberList)}
                className="py-1 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-md shadow-sm flex items-center gap-1.5 transition"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Broadcast to Selected ({selectedIds.size})</span>
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-indigo-700 hover:text-indigo-900 font-medium px-2 py-1"
              >
                Deselect All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredMembers.length > 0 && selectedIds.size === filteredMembers.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4">Ministry / Dept</th>
                <th className="py-3 px-4">Welcome Status</th>
                <th className="py-3 px-4">Last Broadcast</th>
                <th className="py-3 px-4 text-right">Outreach Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                        <Search className="w-6 h-6" />
                      </div>
                      <p className="font-medium text-slate-700">No church members found</p>
                      <p className="text-xs text-slate-400">
                        {searchTerm || statusFilter !== 'all' || ministryFilter !== 'all'
                          ? 'Try adjusting your search criteria or filters.'
                          : 'Your member registry is currently empty. Click "Add Member" or connect your Google Sheet.'}
                      </p>
                      <button
                        onClick={onAddMember}
                        className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add First Member</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMembers.map(member => {
                  const isSelected = selectedIds.has(member.id);
                  const isWelcomed = member.welcomeStatus.toLowerCase() === 'welcomed';

                  return (
                    <tr
                      key={member.id}
                      className={`hover:bg-slate-50/70 transition ${
                        isSelected ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectMember(member.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        />
                      </td>

                      {/* Name & Notes */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          <span>{member.fullName}</span>
                          {member.rowNumber && (
                            <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                              Row #{member.rowNumber}
                            </span>
                          )}
                        </div>
                        {member.notes && (
                          <p className="text-xs text-slate-500 line-clamp-1 max-w-xs mt-0.5">
                            {member.notes}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Registered: {member.registeredAt || 'Recent'}
                        </p>
                      </td>

                      {/* Phone Number */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-medium text-slate-800 bg-slate-100 px-2 py-1 rounded">
                          {formatDisplayPhone(member.phoneNumber)}
                        </span>
                      </td>

                      {/* Ministry */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {member.ministry || 'General'}
                        </span>
                      </td>

                      {/* Welcome Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isWelcomed ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Welcomed
                          </span>
                        ) : (
                          <button
                            onClick={() => onOpenDispatcher(member, 'welcome')}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition group"
                            title="Click to send welcome message now"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
                            Pending • Send Welcome
                          </button>
                        )}
                      </td>

                      {/* Last Broadcast */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500">
                        {member.lastBroadcastDate ? (
                          <span className="inline-flex items-center gap-1 text-slate-600">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {member.lastBroadcastDate}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None sent</span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Welcome Button if pending */}
                          {!isWelcomed && (
                            <button
                              onClick={() => onOpenDispatcher(member, 'welcome')}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title={`Send personalized welcome text to ${member.fullName}`}
                            >
                              <Sparkles className="w-4 h-4" />
                            </button>
                          )}

                          {/* Quick Message / Google Voice button */}
                          <button
                            onClick={() => onOpenDispatcher(member, 'custom')}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title={`Send message via Google Voice or SMS to ${member.fullName}`}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          {/* Google Call button */}
                          <button
                            onClick={() => onOpenDispatcher(member, 'call')}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title={`Call ${member.fullName} using Google Voice / phone`}
                          >
                            <Phone className="w-4 h-4" />
                          </button>

                          {/* Edit member details */}
                          <button
                            onClick={() => onEditMember(member)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            title="Edit member details (syncs to Google Sheet)"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-700">{filteredMembers.length}</span> of{' '}
            <span className="font-semibold text-slate-700">{members.length}</span> members
          </div>
          <div className="flex items-center gap-2">
            {hasGoogleSheet ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Sheet Sync Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-700">
                <AlertCircle className="w-3.5 h-3.5" />
                Local Mode (Connect Google Sheet to persist)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
