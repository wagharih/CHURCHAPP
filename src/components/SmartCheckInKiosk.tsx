import React, { useState, useEffect, useRef } from 'react';
import { MemberRecord, CheckInRecord, ChurchEvent } from '../types';
import {
  formatDisplayPhone,
  getCleanPhone,
  saveCheckInRecord,
  getCheckInRecords,
  getGoogleVoiceMessageUrl,
  getNativeSmsUrl,
  saveOutreachLog,
} from '../services/communications';
import confetti from 'canvas-confetti';
import {
  QrCode,
  Smartphone,
  CheckCircle2,
  Users,
  Search,
  Sparkles,
  Phone,
  Heart,
  Calendar,
  Clock,
  Printer,
  Maximize2,
  Minimize2,
  AlertCircle,
  HelpCircle,
  UserPlus,
  ArrowRight,
  RefreshCw,
  X,
  MessageSquare,
  BookOpen,
} from 'lucide-react';

interface SmartCheckInKioskProps {
  members: MemberRecord[];
  churchName: string;
  events: ChurchEvent[];
  onRegisterNewMember: (memberData: {
    fullName: string;
    phoneNumber: string;
    ministry: string;
    notes?: string;
  }) => Promise<MemberRecord>;
  onSendDirectWelcome?: (member: MemberRecord) => void;
}

export const SmartCheckInKiosk: React.FC<SmartCheckInKioskProps> = ({
  members,
  churchName,
  events,
  onRegisterNewMember,
  onSendDirectWelcome,
}) => {
  const [phoneInput, setPhoneInput] = useState('');
  const [checkInState, setCheckInState] = useState<
    'idle' | 'welcome_back' | 'register_new' | 'success_new'
  >('idle');
  const [matchedMember, setMatchedMember] = useState<MemberRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(6);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // New member form fields
  const [newFullName, setNewFullName] = useState('');
  const [newMinistry, setNewMinistry] = useState('First-Time Visitors');
  const [visitorType, setVisitorType] = useState('First-Time Visitor');
  const [newEmail, setNewEmail] = useState('');
  const [newPrayerRequest, setNewPrayerRequest] = useState('');

  // Kiosk & Flyer Modes
  const [isKioskFullscreen, setIsKioskFullscreen] = useState(false);
  const [showPrintFlyerModal, setShowPrintFlyerModal] = useState(false);
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>(getCheckInRecords);
  const [showGoogleFormsNotice, setShowGoogleFormsNotice] = useState(true);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const todayCheckIns = checkIns.filter(c => c.date === todayStr);
  const firstTimersToday = todayCheckIns.filter(c => c.isFirstTimer).length;
  const returningToday = todayCheckIns.length - firstTimersToday;

  // Next upcoming or current event
  const currentEvent = events[0];

  // Refresh checkins list
  const refreshCheckIns = () => {
    setCheckIns(getCheckInRecords());
  };

  // Format phone display as typing
  const handlePhoneChange = (val: string) => {
    // Keep numbers and +
    const cleaned = val.replace(/[^\d+]/g, '');
    setPhoneInput(cleaned);
  };

  // Numpad key click handler for tablet kiosk mode
  const handleKeypadPress = (key: string) => {
    if (key === 'clear') {
      setPhoneInput('');
    } else if (key === 'back') {
      setPhoneInput(prev => prev.slice(0, -1));
    } else {
      if (phoneInput.length < 15) {
        setPhoneInput(prev => prev + key);
      }
    }
  };

  // Check In / Database Lookup Action
  const handleLookupAndCheckIn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = getCleanPhone(phoneInput);
    if (!clean || clean.length < 10) {
      alert('Please enter a valid 10-digit phone number.');
      return;
    }

    // Search members database
    const found = members.find(m => {
      const memberClean = getCleanPhone(m.phoneNumber || m.cleanPhone);
      return memberClean === clean || memberClean.endsWith(clean.slice(-10));
    });

    if (found) {
      // PREVIOUSLY REGISTERED MEMBER!
      setMatchedMember(found);
      setCheckInState('welcome_back');

      // Save check-in record
      saveCheckInRecord({
        memberId: found.id,
        fullName: found.fullName,
        phoneNumber: found.phoneNumber,
        cleanPhone: found.cleanPhone,
        ministry: found.ministry,
        isFirstTimer: false,
        eventName: currentEvent?.title || 'Sunday Worship Service',
        notes: found.notes,
      });
      refreshCheckIns();

      // Confetti celebration
      try {
        confetti({ particleCount: 75, spread: 60, origin: { y: 0.5 } });
      } catch (err) {
        // ignore
      }

      startAutoResetTimer();
    } else {
      // NOT IN DATABASE -> PROCEED TO FIRST-TIME REGISTRATION
      setMatchedMember(null);
      setNewFullName('');
      setNewPrayerRequest('');
      setCheckInState('register_new');
    }
  };

  // Register New Member Action
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim()) {
      alert('Please enter your full name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const clean = getCleanPhone(phoneInput);
      const formattedPhone = formatDisplayPhone(phoneInput);

      const noteText = [
        `Check-in status: ${visitorType}`,
        newEmail ? `Email: ${newEmail}` : null,
        newPrayerRequest ? `Prayer Request: ${newPrayerRequest}` : null,
      ]
        .filter(Boolean)
        .join(' | ');

      const newMember = await onRegisterNewMember({
        fullName: newFullName.trim(),
        phoneNumber: formattedPhone,
        ministry: newMinistry,
        notes: noteText,
      });

      // Save check-in
      saveCheckInRecord({
        memberId: newMember.id,
        fullName: newMember.fullName,
        phoneNumber: formattedPhone,
        cleanPhone: clean,
        ministry: newMinistry,
        isFirstTimer: true,
        eventName: currentEvent?.title || 'Sunday Worship Service',
        notes: noteText,
      });
      refreshCheckIns();

      setMatchedMember(newMember);
      setCheckInState('success_new');

      try {
        confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
      } catch (err) {
        // ignore
      }

      startAutoResetTimer();
    } catch (err: any) {
      alert('Error registering: ' + (err.message || 'Please try again'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const startAutoResetTimer = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setCountdown(6);
    countdownTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current!);
          resetToIdle();
          return 6;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetToIdle = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setCheckInState('idle');
    setPhoneInput('');
    setMatchedMember(null);
    setNewFullName('');
    setNewPrayerRequest('');
  };

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  // Web check-in URL for QR code
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const qrCheckInUrl = currentUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(currentUrl)}`
    : '';

  return (
    <div className={`space-y-6 ${isKioskFullscreen ? 'fixed inset-0 z-50 bg-slate-900 text-white overflow-y-auto p-4 sm:p-8' : ''}`}>
      {/* Top Banner & Technical Clarification Box */}
      {!isKioskFullscreen && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-emerald-600/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                  <QrCode className="w-3.5 h-3.5" />
                  Sunday Smart QR Check-In &amp; Self-Service Kiosk
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Instant Phone Lookup: "Welcome Back" or Register New
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
                  When attendees scan your QR code or type their phone number, the system instantly searches your church database.
                  Existing members are greeted with a warm <strong>"Welcome Back!"</strong> and signed in for today.
                  New visitors are smoothly prompted to register!
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                <button
                  onClick={() => setShowPrintFlyerModal(true)}
                  className="py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4 text-emerald-300" />
                  <span>Print Desk QR Flyer</span>
                </button>

                <button
                  onClick={() => setIsKioskFullscreen(true)}
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-lg"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span>Launch Tablet Kiosk Mode</span>
                </button>
              </div>
            </div>
          </div>

          {/* Explanation Banner answering: "Can I program Google Forms to do this?" */}
          {showGoogleFormsNotice && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start justify-between gap-3 text-xs text-amber-900">
              <div className="flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">
                    Can Google Forms be programmed to check the database when someone types their phone number?
                  </div>
                  <p className="text-amber-800 leading-relaxed">
                    <strong>Standard Google Forms cannot do live database lookups.</strong> Google Forms runs purely on Google's closed server without client-side API scripting, so it cannot query a spreadsheet mid-survey or dynamically say "Welcome back" to skip questions.
                    <br />
                    <strong>That is why this Sunday Smart QR Check-In portal was built!</strong> It gives your congregation the exact live database lookup experience you requested. Simply project this QR code or place it on your church welcome desk!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGoogleFormsNotice(false)}
                className="text-amber-500 hover:text-amber-800 p-1 rounded-md"
                title="Dismiss note"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Kiosk Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Check-In Screen / Tablet Interface */}
        <div className={`lg:col-span-7 ${isKioskFullscreen ? 'max-w-xl mx-auto w-full' : ''}`}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden text-slate-800">
            {/* Kiosk Screen Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">
                  {churchName} • Check-In Portal
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  {currentEvent?.title || 'Sunday Worship Gathering'}
                </h3>
                <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{todayFormatted}</span>
                </p>
              </div>

              {isKioskFullscreen && (
                <button
                  onClick={() => setIsKioskFullscreen(false)}
                  className="p-2 text-slate-400 hover:text-white bg-white/10 rounded-xl transition flex items-center gap-1 text-xs"
                >
                  <Minimize2 className="w-4 h-4" />
                  <span>Exit Kiosk</span>
                </button>
              )}
            </div>

            {/* SCREEN STATE 1: IDLE / ENTER PHONE NUMBER */}
            {checkInState === 'idle' && (
              <div className="p-6 sm:p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center border border-emerald-100 shadow-sm">
                    <Smartphone className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    Welcome to Church! Please Check In
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                    Enter your mobile phone number. If you have registered with us before, you'll be signed in automatically!
                  </p>
                </div>

                {/* Phone Input Box */}
                <form onSubmit={handleLookupAndCheckIn} className="space-y-4 max-w-md mx-auto">
                  <div className="relative">
                    <input
                      type="tel"
                      autoFocus
                      required
                      placeholder="(555) 000-0000"
                      value={formatDisplayPhone(phoneInput)}
                      onChange={e => handlePhoneChange(e.target.value)}
                      className="w-full text-center text-2xl sm:text-3xl font-mono font-bold tracking-wider py-3.5 px-4 bg-slate-50 border-2 border-emerald-500 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:bg-white text-slate-900 shadow-inner"
                    />
                    {phoneInput && (
                      <button
                        type="button"
                        onClick={() => setPhoneInput('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 bg-slate-200 rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Tablet Numpad */}
                  <div className="grid grid-cols-3 gap-2 pt-1 max-w-xs mx-auto">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'].map(k => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => handleKeypadPress(k)}
                        className={`py-3 rounded-xl font-bold text-sm transition shadow-sm select-none ${
                          k === 'clear'
                            ? 'bg-slate-100 hover:bg-slate-200 text-rose-600 text-xs uppercase'
                            : k === 'back'
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs uppercase'
                            : 'bg-slate-100 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 border border-slate-200 text-slate-800 text-lg'
                        }`}
                      >
                        {k === 'clear' ? 'Clear' : k === 'back' ? '⌫' : k}
                      </button>
                    ))}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl text-base font-extrabold shadow-lg transition flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <span>CHECK IN NOW</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </form>
              </div>
            )}

            {/* SCREEN STATE 2: PREVIOUSLY REGISTERED -> "WELCOME BACK, [NAME]!" */}
            {checkInState === 'welcome_back' && matchedMember && (
              <div className="p-6 sm:p-8 space-y-6 text-center animate-fade-in">
                <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner ring-4 ring-emerald-50">
                  <CheckCircle2 className="w-12 h-12" />
                </div>

                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    Recognized Member
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                    Welcome Back, {matchedMember.fullName}!
                  </h2>
                  <p className="text-xs sm:text-sm text-emerald-700 font-semibold">
                    You are signed in for today ({todayFormatted})!
                  </p>
                </div>

                {/* Member Profile Badge */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl max-w-md mx-auto space-y-2 text-left">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                    <span className="text-slate-500 font-medium">Ministry Group:</span>
                    <span className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                      {matchedMember.ministry}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                    <span className="text-slate-500 font-medium">Mobile Number:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {formatDisplayPhone(matchedMember.phoneNumber)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Member Since:</span>
                    <span className="text-slate-700 font-medium">
                      {matchedMember.registeredAt || 'Active Family'}
                    </span>
                  </div>
                </div>

                {/* Scripture blessing */}
                <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 max-w-md mx-auto italic">
                  "I was glad when they said to me, 'Let us go into the house of the LORD.' - Psalm 122:1"
                </div>

                {/* Auto reset footer */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={resetToIdle}
                    className="w-full sm:w-auto py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <span>Sign In Another Person</span>
                    <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                      {countdown}s
                    </span>
                  </button>

                  {onSendDirectWelcome && (
                    <button
                      type="button"
                      onClick={() => onSendDirectWelcome(matchedMember)}
                      className="w-full sm:w-auto py-2.5 px-4 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Send Welcome SMS</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* SCREEN STATE 3: NOT FOUND IN DATABASE -> REGISTRATION FORM */}
            {checkInState === 'register_new' && (
              <div className="p-6 sm:p-8 space-y-6 animate-fade-in">
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold uppercase tracking-wider">
                    <UserPlus className="w-3.5 h-3.5" />
                    First-Time Visitor Intake
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    Welcome to {churchName}!
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                    We didn't find this phone number in our system yet. Please take 30 seconds to tell us your name so we can welcome you and sign you in!
                  </p>
                </div>

                {/* Pre-filled Phone badge */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs max-w-lg mx-auto">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    Phone Number:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">
                      {formatDisplayPhone(phoneInput)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCheckInState('idle')}
                      className="text-indigo-600 hover:underline text-[11px]"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                {/* Registration Form */}
                <form onSubmit={handleCompleteRegistration} className="space-y-4 max-w-lg mx-auto">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe or Sister Mary"
                      value={newFullName}
                      onChange={e => setNewFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Attendance Status
                      </label>
                      <select
                        value={visitorType}
                        onChange={e => setVisitorType(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="First-Time Visitor">First-Time Visitor</option>
                        <option value="Returning Guest">Returning Guest</option>
                        <option value="Regular Attendee">Regular Attendee</option>
                        <option value="Visiting from Out of Town">Visiting from Out of Town</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Ministry Interest
                      </label>
                      <select
                        value={newMinistry}
                        onChange={e => setNewMinistry(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="First-Time Visitors">First-Time Visitors</option>
                        <option value="Worship & Creative Arts">Worship &amp; Creative Arts</option>
                        <option value="Youth & Young Adults">Youth &amp; Young Adults</option>
                        <option value="Children of Grace (Kids)">Children of Grace (Kids)</option>
                        <option value="Intercessory Prayer Team">Intercessory Prayer Team</option>
                        <option value="Community Outreach & Compassion">Community Outreach</option>
                        <option value="Hospitality & Ushers">Hospitality &amp; Ushers</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Prayer Request or Note for Pastoral Team (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="How can we pray for you or support your family today?"
                      value={newPrayerRequest}
                      onChange={e => setNewPrayerRequest(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setCheckInState('idle')}
                      className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                    >
                      Back
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-3 px-6 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-extrabold shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Registering &amp; Signing In...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>COMPLETE REGISTRATION &amp; SIGN IN</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SCREEN STATE 4: SUCCESS REGISTRATION */}
            {checkInState === 'success_new' && matchedMember && (
              <div className="p-6 sm:p-8 space-y-6 text-center animate-fade-in">
                <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner ring-4 ring-emerald-50">
                  <Sparkles className="w-12 h-12 text-emerald-600" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                    Welcome to the Family, {matchedMember.fullName}!
                  </h2>
                  <p className="text-xs sm:text-sm text-emerald-700 font-semibold">
                    You are registered and checked in for today's service!
                  </p>
                </div>

                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  We are blessed to worship with you today. A personalized welcome message will be sent to{' '}
                  <strong className="font-mono text-slate-900">{formatDisplayPhone(matchedMember.phoneNumber)}</strong>.
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={resetToIdle}
                    className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <span>Sign In Next Person</span>
                    <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                      {countdown}s
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live QR Code Card & Today's Attendance Roster */}
        <div className={`lg:col-span-5 space-y-5 ${isKioskFullscreen ? 'hidden' : ''}`}>
          {/* Sunday Check-In QR Code Presenter */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 text-center">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="text-left">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  Attendee Camera QR Code
                </h3>
                <p className="text-[11px] text-slate-500">Scan with iPhone or Android camera</p>
              </div>
              <button
                onClick={() => setShowPrintFlyerModal(true)}
                className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>

            {qrCheckInUrl ? (
              <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm inline-block mx-auto">
                <img
                  src={qrCheckInUrl}
                  alt="Sunday Check-In QR Code"
                  className="w-44 h-44 object-contain mx-auto"
                />
                <span className="block text-[11px] font-mono text-slate-500 mt-1">
                  Point camera to check in
                </span>
              </div>
            ) : null}

            <div className="bg-emerald-50 rounded-xl p-3 text-xs text-emerald-900 text-left space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                How It Works for Members:
              </div>
              <p className="text-[11px] text-emerald-800 leading-snug">
                1. Member scans code on bulletin or projector.<br />
                2. Types their phone number on their phone.<br />
                3. If recognized: "Welcome Back [Name]!" &amp; signed in instantly.<br />
                4. If new: Simple 30-second registration form appears.
              </p>
            </div>
          </div>

          {/* Today's Attendance Counter & Sign-in Log */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Today's Check-Ins</h3>
                  <p className="text-[11px] text-slate-500">{todayFormatted}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  {todayCheckIns.length} Total
                </span>
              </div>
            </div>

            {/* Quick Stats Pill */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 text-base">{returningToday}</div>
                <div className="text-[10px] text-slate-500">Returning Members</div>
              </div>
              <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-950">
                <div className="font-bold text-indigo-700 text-base">{firstTimersToday}</div>
                <div className="text-[10px] text-indigo-600">First-Time Visitors</div>
              </div>
            </div>

            {/* Roster of Today's Attendees */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {todayCheckIns.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No one has checked in yet today. Ready for Sunday service!
                </div>
              ) : (
                todayCheckIns.map(item => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-2 transition"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <span>{item.fullName}</span>
                        {item.isFirstTimer && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">
                            NEW
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {formatDisplayPhone(item.phoneNumber)} • {item.ministry || 'General'}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PRINT FLYER MODAL */}
      {showPrintFlyerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4 text-center">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Sunday Welcome Desk Flyer
              </span>
              <button
                onClick={() => setShowPrintFlyerModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Flyer Preview Card */}
            <div className="border-4 border-slate-900 p-6 rounded-2xl space-y-3 bg-gradient-to-b from-white to-slate-50">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-700">
                  {churchName}
                </span>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Scan to Check In &amp; Connect!
                </h2>
                <p className="text-[11px] text-slate-600">
                  Open your phone camera to check in for today's service
                </p>
              </div>

              {qrCheckInUrl && (
                <div className="p-2 bg-white rounded-xl border border-slate-300 inline-block shadow-sm">
                  <img
                    src={qrCheckInUrl}
                    alt="Sunday Check In QR"
                    className="w-48 h-48 object-contain mx-auto"
                  />
                </div>
              )}

              <div className="space-y-1 text-left bg-slate-100 p-3 rounded-xl text-[11px] text-slate-700">
                <div className="font-bold text-slate-900">Quick Steps:</div>
                <div>1. Scan QR code with your camera</div>
                <div>2. Enter your phone number</div>
                <div>3. Returning members sign in with 1 tap!</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setShowPrintFlyerModal(false)}
                className="py-2 px-4 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print This Sign</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
