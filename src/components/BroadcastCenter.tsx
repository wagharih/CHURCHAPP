import React, { useState } from 'react';
import { ChurchEvent, MemberRecord } from '../types';
import { replaceMessageVariables, getFirstName } from '../services/communications';
import { generateAiBroadcastMessage } from '../services/gemini';
import {
  Calendar,
  Send,
  Sparkles,
  Users,
  CheckCircle2,
  Clock,
  MapPin,
  BookOpen,
  Filter,
  Plus,
  RefreshCw,
  MessageSquare,
  AlertTriangle,
  Zap,
} from 'lucide-react';

interface BroadcastCenterProps {
  events: ChurchEvent[];
  members: MemberRecord[];
  onAddEvent: () => void;
  onRunBroadcast: (
    event: ChurchEvent,
    targetMembers: MemberRecord[],
    messageTemplate: string
  ) => void;
  churchName: string;
}

export const BroadcastCenter: React.FC<BroadcastCenterProps> = ({
  events,
  members,
  onAddEvent,
  onRunBroadcast,
  churchName,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '');
  const [targetAudience, setTargetAudience] = useState<string>('all');
  const [broadcastTone, setBroadcastTone] = useState<
    'high_energy_worship' | 'urgent_inspiring' | 'reverent_prayer' | 'family_warm'
  >('high_energy_worship');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const selectedEvent = events.find(e => e.id === selectedEventId) || events[0];

  const defaultBroadcastTemplate = selectedEvent
    ? `Hi {First_Name}! 🕊️ Join us for "${selectedEvent.title}" this ${selectedEvent.date} at ${selectedEvent.time} (${selectedEvent.location}). ${selectedEvent.description} Come with an expectant heart! - ${churchName}`
    : `Hi {First_Name}! Join us for our upcoming church worship gathering this week at ${churchName}!`;

  const [messageTemplate, setMessageTemplate] = useState<string>(defaultBroadcastTemplate);

  // Filter recipients based on selection
  const recipientMembers = members.filter(m => {
    if (targetAudience === 'all') return true;
    return m.ministry === targetAudience;
  });

  const sampleMember = recipientMembers[0] || members[0] || {
    id: 'sample',
    rowNumber: 2,
    fullName: 'Sarah Jenkins',
    phoneNumber: '+1 (555) 234-5678',
    cleanPhone: '+15552345678',
    ministry: 'Worship & Creative Arts',
    registeredAt: '2026-10-04',
    welcomeStatus: 'Welcomed',
  };

  const samplePreview = replaceMessageVariables(messageTemplate, sampleMember, {
    churchName,
    event: selectedEvent,
  });

  const handleSelectEvent = (event: ChurchEvent) => {
    setSelectedEventId(event.id);
    const newTemplate = `Hi {First_Name}! 🕊️ Join us for "${event.title}" this ${event.date} at ${event.time} (${event.location}). ${event.description} Come with an expectant heart! - ${churchName}`;
    setMessageTemplate(newTemplate);
  };

  const handleGenerateAiCopy = async () => {
    if (!selectedEvent) return;
    setIsGeneratingAi(true);
    try {
      const generated = await generateAiBroadcastMessage({
        event: selectedEvent,
        churchName,
        targetAudience: targetAudience === 'all' ? 'All Members' : targetAudience,
        tone: broadcastTone,
      });
      setMessageTemplate(generated);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const ministriesList = Array.from(new Set(members.map(m => m.ministry).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-700 via-amber-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-amber-600/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30">
              <Calendar className="w-3.5 h-3.5" />
              Church Programs &amp; Worship Nights Broadcast Hub
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Broadcast Worship Nights &amp; Weekly Updates
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Keep your congregation and ministry teams inspired with personalized SMS broadcasts for upcoming
              worship nights, prayer revivals, and church programs.
            </p>
          </div>

          <button
            onClick={onAddEvent}
            className="py-2.5 px-4 bg-white hover:bg-slate-100 text-amber-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition self-start md:self-center"
          >
            <Plus className="w-4 h-4 text-amber-700" />
            <span>+ Add Church Program</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Events Carousel / Selector */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                Select Upcoming Church Event ({events.length})
              </h3>
              <span className="text-xs text-slate-400">Click to load</span>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {events.map(event => {
                const isSelected = event.id === selectedEventId;
                return (
                  <div
                    key={event.id}
                    onClick={() => handleSelectEvent(event)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-sm text-slate-900 leading-tight">
                        {event.title}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {event.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600 mt-2">
                      <span className="flex items-center gap-1 font-medium text-amber-700">
                        <Clock className="w-3.5 h-3.5" />
                        {event.date} • {event.time}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      {event.location}
                    </p>

                    {event.description && (
                      <p className="text-xs text-slate-600 mt-2 line-clamp-2 italic bg-white/70 p-2 rounded border border-slate-100">
                        "{event.description}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Broadcast Composer & Audience Sender */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Broadcast Announcement Composer</h3>
                  <p className="text-xs text-slate-500">Draft SMS for selected event &amp; target group</p>
                </div>
              </div>
              <div className="text-xs font-mono text-slate-400">
                {messageTemplate.length} chars
              </div>
            </div>

            {/* Audience Segmenter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  Target Audience
                </label>
                <select
                  value={targetAudience}
                  onChange={e => setTargetAudience(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-300 text-slate-800 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">All Registered Members ({members.length})</option>
                  {ministriesList.map(m => {
                    const count = members.filter(mem => mem.ministry === m).length;
                    return (
                      <option key={m} value={m}>
                        {m} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Broadcast Tone
                </label>
                <select
                  value={broadcastTone}
                  onChange={e => setBroadcastTone(e.target.value as any)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-300 text-slate-800 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="high_energy_worship">High Energy &amp; Celebratory</option>
                  <option value="urgent_inspiring">Urgent &amp; Faith-Igniting</option>
                  <option value="reverent_prayer">Reverent &amp; Prayerful</option>
                  <option value="family_warm">Warm &amp; Family-friendly</option>
                </select>
              </div>
            </div>

            {/* AI Assistant button */}
            <div className="bg-gradient-to-r from-amber-50 to-indigo-50 p-3 rounded-xl border border-amber-200/80 flex items-center justify-between gap-3">
              <div className="text-xs text-amber-950 font-medium">
                Want a fresh, inspiring announcement for {selectedEvent?.title}?
              </div>
              <button
                type="button"
                onClick={handleGenerateAiCopy}
                disabled={isGeneratingAi}
                className="py-1.5 px-3 bg-white hover:bg-slate-50 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
              >
                {isGeneratingAi ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Gemini AI Draft</span>
                  </>
                )}
              </button>
            </div>

            {/* Message Template textarea */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Announcement Message (with {'{First_Name}'} tag)
              </label>
              <textarea
                rows={4}
                value={messageTemplate}
                onChange={e => setMessageTemplate(e.target.value)}
                className="w-full p-3 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition leading-relaxed font-sans"
              />
            </div>

            {/* Live Preview Card */}
            <div className="bg-slate-900 rounded-xl p-3.5 text-white space-y-2 border border-slate-800">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Personalized Preview for: <strong className="text-amber-300">{sampleMember.fullName}</strong></span>
                <span className="font-mono text-emerald-400">{sampleMember.phoneNumber}</span>
              </div>
              <div className="bg-amber-600 text-white p-3 rounded-xl rounded-tl-sm text-xs leading-relaxed">
                {samplePreview}
              </div>
            </div>

            {/* Send Broadcast Action */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                Will be sent to <strong className="text-slate-800 font-bold">{recipientMembers.length}</strong> recipient{recipientMembers.length !== 1 ? 's' : ''}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (selectedEvent) {
                    onRunBroadcast(selectedEvent, recipientMembers, messageTemplate);
                  }
                }}
                disabled={recipientMembers.length === 0}
                className="w-full sm:w-auto py-3 px-6 bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-600 hover:from-amber-700 hover:via-rose-700 hover:to-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2 group"
              >
                <Zap className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
                <span>⚡ SEND MASS MESSAGES DIRECTLY ({recipientMembers.length} MEMBERS)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
