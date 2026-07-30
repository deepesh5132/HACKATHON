import React, { useState, useEffect } from 'react';
import { AlertTriangle, Battery, ShieldAlert, Navigation, Sun, Droplets, Users, CheckCircle, Zap } from 'lucide-react';
import { db, type UserProfile } from '../db/db';
import { askGemma, isOnline } from '../services/ai';

interface DashboardProps {
  batteryLevel: number;
  batterySurvivalActive: boolean;
  location: { lat: number; lng: number } | null;
  activeDisaster: string;
  onNavigateTo: (tab: string) => void;
  accessibilityLargeText: boolean;
}

export function Dashboard({
  batteryLevel,
  batterySurvivalActive,
  location,
  activeDisaster,
  onNavigateTo,
  accessibilityLargeText,
}: DashboardProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dangerScore, setDangerScore] = useState<number>(10);
  const [dangerLabel, setDangerLabel] = useState<string>('Minimal Risk');
  const [aiAnalysis, setAiAnalysis] = useState<string>('Generating personalized survival analysis...');
  const [loadingAI, setLoadingAI] = useState<boolean>(false);

  useEffect(() => {
    // Fetch profile
    db.profile.toArray().then((arr) => {
      if (arr.length > 0) {
        setProfile(arr[0]);
      }
    });
  }, []);

  // Compute local heuristic danger score & request AI assessment
  useEffect(() => {
    let score = 15; // Base risk

    if (activeDisaster !== 'None') {
      score += 45; // Disaster active increases threat substantially
    }
    if (batteryLevel < 0.25) {
      score += 15; // Low power increases vulnerability
    }
    if (profile) {
      if (profile.hasChildren) score += 5;
      if (profile.hasPets) score += 3;
      if (!profile.hasVehicle) score += 10; // No car makes evacuation harder
      if (profile.medicalConditions.trim().length > 0) score += 7;
    }
    if (!navigator.onLine) {
      score += 10; // Offline limits information flow
    }

    score = Math.min(score, 100);
    setDangerScore(score);

    if (score < 30) {
      setDangerLabel('Low Risk');
    } else if (score < 60) {
      setDangerLabel('Medium Risk');
    } else if (score < 85) {
      setDangerLabel('High Risk');
    } else {
      setDangerLabel('Critical Danger');
    }

    // Trigger Gemma risk analysis
    setLoadingAI(true);
    const profileSummary = profile
      ? `Family context: ${profile.hasChildren ? 'children present' : 'no children'}, ${profile.hasPets ? 'has pets' : 'no pets'}, vehicle: ${profile.hasVehicle ? 'available' : 'none'}, medical: ${profile.medicalConditions || 'none'}.`
      : 'No profile set.';
    const query = `Evaluate risk and give survival sentence. Active disaster: ${activeDisaster}. Battery: ${Math.round(batteryLevel * 100)}%. Network: ${isOnline() ? 'online' : 'offline'}. ${profileSummary}`;

    askGemma(query, location ? `${location.lat}, ${location.lng}` : 'Unknown location')
      .then((res) => {
        setAiAnalysis(res.explanation);
      })
      .catch(() => {
        setAiAnalysis('Keep safe, monitor local maps and avoid hazard zones.');
      })
      .finally(() => {
        setLoadingAI(false);
      });
  }, [activeDisaster, batteryLevel, profile, location]);

  const getScoreColor = () => {
    if (dangerScore < 30) return 'text-green-400 border-green-500/30 bg-green-500/10';
    if (dangerScore < 60) return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    if (dangerScore < 85) return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
    return 'text-red-400 border-red-500/30 bg-red-500/10';
  };

  const getScoreBarColor = () => {
    if (dangerScore < 30) return 'bg-green-500';
    if (dangerScore < 60) return 'bg-yellow-500';
    if (dangerScore < 85) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className={`space-y-6 ${accessibilityLargeText ? 'accessibility-large-text' : ''}`}>
      {/* Alert Header Banner */}
      {activeDisaster !== 'None' && (
        <div className="flex items-center gap-3 p-4 rounded-xl border animate-pulse-ring glass-alert text-red-100">
          <AlertTriangle className="h-6 w-6 text-red-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm uppercase tracking-wider text-red-400">Critical Alert Active</h3>
            <p className="text-sm font-medium">
              Severe {activeDisaster} threat detected near your coordinates. Prepare for immediate safe action.
            </p>
          </div>
          <button
            onClick={() => onNavigateTo('map')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold transition-all shrink-0"
          >
            <Navigation className="h-3 w-3" /> Map Route
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Assessment Card */}
        <div className="lg:col-span-2 rounded-2xl glass p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-orange-500" />
                AI Risk Assessment
              </h2>
              <p className="text-slate-400 text-xs mt-1">Dynamic calculations powered by Google Gemma model</p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${getScoreColor()}`}>
              {dangerLabel}
            </span>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6 my-2">
            {/* Danger Score Circle */}
            <div className="relative flex items-center justify-center shrink-0 w-32 h-32 rounded-full border-4 border-slate-800 bg-slate-900/60 shadow-xl">
              <div className="text-center">
                <span className="text-4xl font-extrabold text-white">{dangerScore}</span>
                <span className="text-xs block text-slate-400 font-bold uppercase tracking-widest mt-0.5">Index</span>
              </div>
              <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  stroke="rgba(255,255,255,0.03)"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  className={getScoreBarColor()}
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray="289"
                  strokeDashoffset={289 - (289 * dangerScore) / 100}
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>
            </div>

            <div className="flex-1 space-y-3">
              <div className="text-sm font-semibold text-slate-200">Personalized Gemma Analysis:</div>
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs leading-relaxed text-slate-300 min-h-[70px]">
                {loadingAI ? (
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-orange-500 animate-ping"></span>
                    Gemma evaluating local parameters...
                  </div>
                ) : (
                  aiAnalysis
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-900 pt-4 flex flex-wrap justify-between items-center gap-3">
            <div className="flex gap-2">
              <span className="text-xs px-2 py-1 rounded bg-slate-900 text-slate-400">
                Kids: {profile?.hasChildren ? 'Yes' : 'No'}
              </span>
              <span className="text-xs px-2 py-1 rounded bg-slate-900 text-slate-400">
                Pets: {profile?.hasPets ? 'Yes' : 'No'}
              </span>
              <span className="text-xs px-2 py-1 rounded bg-slate-900 text-slate-400">
                Car: {profile?.hasVehicle ? 'Available' : 'None'}
              </span>
            </div>
            <button
              onClick={() => onNavigateTo('settings')}
              className="text-xs text-orange-400 hover:text-orange-300 font-semibold underline"
            >
              Update Family Context
            </button>
          </div>
        </div>

        {/* Battery & Network Status Card */}
        <div className="rounded-2xl glass p-6 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              Device Status
            </h2>
            <p className="text-slate-400 text-xs mt-1">Resource planning & optimization</p>
          </div>

          <div className="space-y-4">
            {/* Battery Widget */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800">
              <div className="flex items-center gap-3">
                <Battery className={`h-8 w-8 ${batteryLevel < 0.25 ? 'text-red-500 animate-pulse' : 'text-green-500'}`} />
                <div>
                  <div className="text-xs text-slate-400 font-semibold">Device Battery</div>
                  <div className="text-lg font-extrabold text-white">{Math.round(batteryLevel * 100)}%</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Estimated Survival</div>
                <div className="text-sm font-bold text-orange-400">
                  {batteryLevel < 0.05 ? 'Shutting down soon' : `${batterySurvivalActive ? '48' : '16'}h Mode`}
                </div>
              </div>
            </div>

            {/* Network Indicator */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${isOnline() ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                <div>
                  <div className="text-xs text-slate-400 font-semibold">Connectivity</div>
                  <div className="text-sm font-bold text-white">{isOnline() ? 'Connected Online' : 'OFFLINE MODE'}</div>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold text-slate-500">
                {isOnline() ? 'Cloud AI Active' : 'Offline Expert Active'}
              </span>
            </div>
          </div>

          <button
            onClick={() => onNavigateTo('settings')}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all border ${
              batterySurvivalActive
                ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {batterySurvivalActive ? 'Deactivate Battery Saver' : 'Enable Battery Survival Mode'}
          </button>
        </div>
      </div>

      {/* Info Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step-by-Step Evacuation Checklist */}
        <div className="rounded-2xl glass p-5 space-y-3">
          <h3 className="font-bold text-sm uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4" /> Preparedness Tasks
          </h3>
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 mt-1.5"></span>
              Charge power banks to 100% immediately.
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 mt-1.5"></span>
              Locate physical IDs and place them in waterproof zip locks.
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 mt-1.5"></span>
              Establish a family safety channel and test check-ins.
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 mt-1.5"></span>
              Cache local offline maps for 15-mile radius.
            </li>
          </ul>
          <button
            onClick={() => onNavigateTo('supplies')}
            className="w-full text-center text-xs font-semibold text-slate-400 hover:text-white pt-2 block"
          >
            View Checklist &rarr;
          </button>
        </div>

        {/* Live Weather Indicator */}
        <div className="rounded-2xl glass p-5 space-y-3">
          <h3 className="font-bold text-sm uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
            <Sun className="h-4 w-4" /> Weather Conditions
          </h3>
          <div className="flex items-center gap-4">
            <span className="text-3xl font-extrabold text-white">29°C</span>
            <div>
              <div className="text-xs font-semibold text-slate-200">Thunderstorm Watch</div>
              <div className="text-[10px] text-slate-400">Precipitation: 84% | Humidity: 90%</div>
            </div>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            Severe storms moving Northeast. Strong winds up to 35 knots may cause immediate power grid failure.
          </p>
        </div>

        {/* Local Emergency Radio & Help Frequencies */}
        <div className="rounded-2xl glass p-5 space-y-3">
          <h3 className="font-bold text-sm uppercase tracking-wider text-green-400 flex items-center gap-1.5">
            <Droplets className="h-4 w-4" /> Emergency Channels
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between border-b border-slate-900 pb-1">
              <span className="text-slate-400">Disaster Broadcast</span>
              <span className="font-bold text-white">162.400 MHz</span>
            </div>
            <div className="flex justify-between border-b border-slate-900 pb-1">
              <span className="text-slate-400">Ham Radio Coordination</span>
              <span className="font-bold text-white">146.520 MHz</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Emergency Distress</span>
              <span className="font-bold text-white">121.500 MHz</span>
            </div>
          </div>
          <p className="text-slate-400 text-[10px] italic">
            Keep an analog battery-powered AM/FM radio tuned to local emergency frequencies.
          </p>
        </div>
      </div>
    </div>
  );
}
