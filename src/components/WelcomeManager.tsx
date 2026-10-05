import React, { useState } from 'react';
import { MemberRecord } from '../types';
import { replaceMessageVariables, getFirstName, formatDisplayPhone } from '../services/communications';
import { generateAiWelcomeMessage } from '../services/gemini';
import {
  Sparkles,
  MessageSquare,
  Settings,
  Send,
  Users,
  CheckCircle2,
  Clock,
  RefreshCw,
  Phone,
  Copy,
  Check,
  AlertCircle,
  HelpCircle,
  Wand2,
  Zap,
} from 'lucide-react';

interface WelcomeManagerProps {
  members: MemberRecord[];
  welcomeTemplate: string;
  onUpdateTemplate: (newTemplate: string) => void;
  churchName: string;
  onOpenDispatcher: (member: MemberRecord, mode: 'welcome') => void;
  onBatchWelcomeAll: (pendingMembers: MemberRecord[]) => void;
  isProcessingBatch: boolean;
}

export const WelcomeManager: React.FC<WelcomeManagerProps> = ({
  members,
  welcomeTemplate,
  onUpdateTemplate,
  churchName,
  onOpenDispatcher,
  onBatchWelcomeAll,
  isProcessingBatch,
}) => {
  const [templateInput, setTemplateInput] = useState(welcomeTemplate);
  const [hasSavedTemplate, setHasSavedTemplate] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiTone, setAiTone] = useState<'warm_pastoral' | 'vibrant_youth' | 'gentle_encouraging' | 'reverent_faith'>('warm_pastoral');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const pendingMembers = members.filter(m => m.welcomeStatus.toLowerCase() !== 'welcomed');
  const welcomedMembers = members.filter(m => m.welcomeStatus.toLowerCase() === 'welcomed');

  const sampleMember: MemberRecord = pendingMembers[0] ||
    members[0] || {
      id: 'preview',
      rowNumber: 2,
      fullName: 'Sarah Jenkins',
      phoneNumber: '+1 (555) 234-5678',
      cleanPhone: '+15552345678',
      ministry: 'Worship & Creative Arts',
      registeredAt: '2026-10-04',
      welcomeStatus: 'Pending',
      notes: 'Interested in vocal choir',
    };

  const previewText = replaceMessageVariables(templateInput, sampleMember, {
    churchName,
  });

  const handleSaveTemplate = () => {
    onUpdateTemplate(templateInput);
    setHasSavedTemplate(true);
    setTimeout(() => setHasSavedTemplate(false), 2500);
  };

  const handleInsertVariable = (variable: string) => {
    setTemplateInput(prev => prev + ` ${variable} `);
  };

  const handleGenerateAiVariation = async () => {
    setIsGeneratingAi(true);
    try {
      const generated = await generateAiWelcomeMessage({
        memberName: sampleMember.fullName,
        churchName,
        ministry: sampleMember.ministry,
        notes: sampleMember.notes,
        tone: aiTone,
      });

      // Replace actual name back with variable for template use
      const genericTemplate = generated
        .replace(new RegExp(getFirstName(sampleMember.fullName), 'gi'), '{First_Name}')
        .replace(new RegExp(churchName, 'gi'), '{Church_Name}')
        .replace(new RegExp(sampleMember.ministry, 'gi'), '{Ministry}');

      setTemplateInput(genericTemplate);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-rose-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-rose-800/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              Automated Member Welcoming System
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Personalized Welcome Messages for Ministry Registrations
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Every time someone registers for church ministry, outreach, or worship, send them a warm pastoral
              welcome text to their phone number via Google Voice or SMS, and sync the status back to Google Sheets.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 text-center">
              <div className="text-2xl font-bold text-amber-400">{pendingMembers.length}</div>
              <div className="text-[11px] text-slate-300 font-medium">Awaiting Welcome</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 text-center">
              <div className="text-2xl font-bold text-emerald-400">{welcomedMembers.length}</div>
              <div className="text-[11px] text-slate-300 font-medium">Welcomed</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Admin Message Template Configuration */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Admin Welcome Template Configuration</h3>
                  <p className="text-xs text-slate-500">Customize the automatic greeting text</p>
                </div>
              </div>
              <div className="text-xs font-mono text-slate-400">
                {templateInput.length} chars
              </div>
            </div>

            {/* Variable insertion buttons */}
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                Insert Personalization Tags:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { tag: '{First_Name}', desc: 'First Name' },
                  { tag: '{Church_Name}', desc: 'Church Name' },
                  { tag: '{Ministry}', desc: 'Ministry' },
                  { tag: '{Scripture}', desc: 'Bible Verse' },
                  { tag: '{Full_Name}', desc: 'Full Name' },
                ].map(item => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => handleInsertVariable(item.tag)}
                    className="text-[11px] font-mono font-medium px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200 rounded-md transition text-slate-700"
                  >
                    + {item.tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Textarea */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Welcome Message Content
              </label>
              <textarea
                rows={5}
                value={templateInput}
                onChange={e => setTemplateInput(e.target.value)}
                placeholder="Enter welcome message with variables like {First_Name} and {Church_Name}..."
                className="w-full p-3 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition leading-relaxed"
              />
            </div>

            {/* Gemini AI Assist for Pastoral Tone */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-indigo-600" />
                  Gemini AI Pastoral Tone Tuning
                </span>
                <select
                  value={aiTone}
                  onChange={e => setAiTone(e.target.value as any)}
                  className="text-[11px] bg-white border border-slate-300 py-1 px-2 rounded-lg font-medium text-slate-700"
                >
                  <option value="warm_pastoral">Warm &amp; Pastoral</option>
                  <option value="vibrant_youth">Vibrant &amp; Youth</option>
                  <option value="gentle_encouraging">Gentle &amp; Encouraging</option>
                  <option value="reverent_faith">Reverent &amp; Biblical</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleGenerateAiVariation}
                disabled={isGeneratingAi}
                className="w-full py-1.5 px-3 bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                {isGeneratingAi ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Gemini is generating pastoral greeting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Generate AI Pastoral Variation</span>
                  </>
                )}
              </button>
            </div>

            {/* Save Template Button */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveTemplate}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
              >
                {hasSavedTemplate ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Template Saved!</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Template</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Smartphone Live Preview */}
          <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-md border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3 px-1">
              <span className="font-semibold text-slate-300">Live SMS Preview (as seen by member)</span>
              <span>Recipient: {sampleMember.fullName}</span>
            </div>

            {/* SMS Mock Bubble */}
            <div className="bg-slate-800/90 rounded-xl p-3.5 border border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono text-emerald-400">{sampleMember.phoneNumber}</span>
                <span>Just now</span>
              </div>
              <div className="bg-rose-600 text-white p-3 rounded-2xl rounded-tl-sm text-xs sm:text-sm leading-relaxed shadow-sm font-sans">
                {previewText}
              </div>
              <div className="text-[10px] text-slate-400 text-right flex items-center justify-end gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Delivered via Google Voice / SMS
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pending Welcome Queue */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Awaiting Welcome Queue ({pendingMembers.length})
                  </h3>
                  <p className="text-xs text-slate-500">Newly registered attendees ready to be welcomed</p>
                </div>
              </div>

              {pendingMembers.length > 0 && (
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={() => onBatchWelcomeAll(pendingMembers)}
                    disabled={isProcessingBatch}
                    className="py-2.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-700 to-indigo-800 hover:from-emerald-700 hover:via-teal-800 hover:to-indigo-900 text-white rounded-xl text-xs font-extrabold shadow-md transition disabled:opacity-50 flex items-center gap-1.5 group cursor-pointer"
                  >
                    <Phone className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform" />
                    <span>📞 SEND WELCOMES VIA GOOGLE VOICE ({pendingMembers.length})</span>
                  </button>
                  <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Routes through Google Voice, one after the other
                  </span>
                </div>
              )}
            </div>

            {pendingMembers.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="font-semibold text-slate-800 text-sm">All Registered Members Have Been Welcomed!</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  When new people are recorded into your Google Sheet or manually added, they will appear here
                  for instant welcome dispatch.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                {pendingMembers.map(member => {
                  const personalizedMsg = replaceMessageVariables(templateInput, member, { churchName });
                  const isCopied = copiedId === member.id;

                  return (
                    <div
                      key={member.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{member.fullName}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {member.ministry}
                            </span>
                          </div>
                          <p className="font-mono text-xs text-slate-600 mt-0.5">
                            {formatDisplayPhone(member.phoneNumber)}
                          </p>
                        </div>
                        <span className="text-[11px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Pending
                        </span>
                      </div>

                      {/* Tailored preview */}
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed font-sans">
                        {personalizedMsg}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(personalizedMsg, member.id)}
                          className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Text</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenDispatcher(member, 'welcome')}
                            className="py-1 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                          >
                            <Send className="w-3 h-3" />
                            <span>Dispatch Welcome</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
