import React, { useState, useEffect } from 'react';
import { db, type UserProfile } from '../db/db';
import { Save, AlertTriangle, Key, Globe, Eye, EyeOff } from 'lucide-react';
import { translateMessage } from '../services/ai';

interface SettingsProps {
  activeDisaster: string;
  setActiveDisaster: (dis: string) => void;
  accessibilityLargeText: boolean;
  setAccessibilityLargeText: (b: boolean) => void;
  accessibilityHighContrast: boolean;
  setAccessibilityHighContrast: (b: boolean) => void;
}

export function Settings({
  activeDisaster,
  setActiveDisaster,
  accessibilityLargeText,
  setAccessibilityLargeText,
  accessibilityHighContrast,
  setAccessibilityHighContrast,
}: SettingsProps) {
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    phone: '',
    bloodGroup: 'O+',
    medicalConditions: '',
    emergencyContacts: '',
    mobilityNotes: '',
    hasVehicle: false,
    hasPets: false,
    hasChildren: false,
    batterySurvivalMode: false,
    isRegistered: false,
  });

  const [apiKey, setApiKey] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [transInput, setTransInput] = useState<string>('I need immediate rescue, my house is flooding!');
  const [transLang, setTransLang] = useState<string>('Hindi');
  const [transResult, setTransResult] = useState<string>('');
  const [translating, setTranslating] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    // Load profile
    db.profile.toArray().then((arr) => {
      if (arr.length > 0) {
        setProfile(arr[0]);
      }
    });

    // Load API Key
    const key = localStorage.getItem('SENTINEL_GEMINI_KEY') || '';
    setApiKey(key);
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const arr = await db.profile.toArray();

    if (arr.length > 0) {
      await db.profile.update(arr[0].id!, { ...profile, isRegistered: true });
    } else {
      await db.profile.add({ ...profile, isRegistered: true });
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveKey = () => {
    localStorage.setItem('SENTINEL_GEMINI_KEY', apiKey);
    alert('Gemini / Gemma API Key Saved Successfully!');
  };

  const handleTranslateText = async () => {
    if (!transInput.trim()) return;
    setTranslating(true);
    try {
      const res = await translateMessage(transInput, transLang);
      setTransResult(res);
    } catch (e) {
      setTransResult('Translation failed.');
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${accessibilityLargeText ? 'accessibility-large-text' : ''}`}>
      {/* User Context & Profile */}
      <form onSubmit={handleSaveProfile} className="rounded-2xl glass p-5 space-y-4">
        <h3 className="font-bold text-sm text-slate-200 border-b border-slate-900 pb-2">
          Personal Emergency Profile (IndexedDB)
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Full Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="e.g. John Doe"
              className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Phone Number</label>
            <input
              type="text"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="e.g. +1 555 0199"
              className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Blood Group</label>
            <select
              value={profile.bloodGroup}
              onChange={(e) => setProfile({ ...profile, bloodGroup: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-350 outline-none"
            >
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                <option key={bg}>{bg}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Mobility Notes</label>
            <input
              type="text"
              value={profile.mobilityNotes}
              onChange={(e) => setProfile({ ...profile, mobilityNotes: e.target.value })}
              placeholder="e.g. Walking assistance required"
              className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Medical Conditions / Allergies</label>
          <textarea
            value={profile.medicalConditions}
            onChange={(e) => setProfile({ ...profile, medicalConditions: e.target.value })}
            placeholder="e.g. Asthma, Penicillin allergy"
            rows={2}
            className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none resize-none"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Emergency Contacts (Phone Numbers)</label>
          <input
            type="text"
            value={profile.emergencyContacts}
            onChange={(e) => setProfile({ ...profile, emergencyContacts: e.target.value })}
            placeholder="e.g. Spouse: +15550198, Mom: +15550215"
            className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2">
          {[
            { label: 'Has Children', key: 'hasChildren' },
            { label: 'Has Pets', key: 'hasPets' },
            { label: 'Has Vehicle', key: 'hasVehicle' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setProfile({ ...profile, [item.key]: !((profile as any)[item.key]) })}
              className={`py-2 px-3 border rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                (profile as any)[item.key]
                  ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 font-bold'
                  : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-slate-900 pt-4">
          {saveSuccess && <span className="text-xs text-green-400 font-bold">Profile details saved!</span>}
          <button
            type="submit"
            className="ml-auto py-2.5 px-4 bg-orange-650 hover:bg-orange-650/80 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Save className="h-4 w-4" /> Save Profile Details
          </button>
        </div>
      </form>

      {/* Simulator, API Keys & Translations */}
      <div className="space-y-6">
        {/* Disaster Simulator */}
        <div className="rounded-2xl glass p-5 space-y-4">
          <h3 className="font-bold text-sm text-slate-200 border-b border-slate-900 pb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-4.5 w-4.5 text-yellow-500" />
            Hackathon Disaster Simulator
          </h3>

          <div className="grid grid-cols-3 gap-2 text-xs">
            {['None', 'Flood', 'Earthquake', 'Wildfire', 'Tsunami', 'Storm'].map((dis) => (
              <button
                key={dis}
                onClick={() => setActiveDisaster(dis)}
                className={`py-2 rounded-lg font-bold border uppercase tracking-wider text-[10px] ${
                  activeDisaster === dis
                    ? 'bg-red-500/10 border-red-500/30 text-red-400 font-bold'
                    : 'bg-slate-900 border-slate-850 text-slate-400 hover:text-white'
                }`}
              >
                {dis}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-450 italic">
            Simulate a disaster type to trigger danger assessments, map hazard locations, and test Gemma alerts.
          </p>
        </div>



        {/* Accessibility & Translation */}
        <div className="rounded-2xl glass p-5 space-y-4">
          <h3 className="font-bold text-sm text-slate-200 border-b border-slate-900 pb-2 flex items-center gap-1.5">
            <Globe className="h-4.5 w-4.5 text-green-500" /> Accessibility & Multilingual Translator
          </h3>

          {/* Accessibility buttons */}
          <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-900">
            <button
              onClick={() => setAccessibilityLargeText(!accessibilityLargeText)}
              className={`py-2 px-3 border rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                accessibilityLargeText
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white'
              }`}
            >
              Large Text Mode
            </button>
            <button
              onClick={() => setAccessibilityHighContrast(!accessibilityHighContrast)}
              className={`py-2 px-3 border rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                accessibilityHighContrast
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-white'
              }`}
            >
              High Contrast Filter
            </button>
          </div>

          {/* Translation test area */}
          <div className="space-y-3 pt-1">
            <div className="flex gap-2">
              <input
                type="text"
                value={transInput}
                onChange={(e) => setTransInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
              />
              <select
                value={transLang}
                onChange={(e) => setTransLang(e.target.value)}
                className="bg-slate-950 border border-slate-850 rounded-lg text-xs text-slate-400 px-3 outline-none"
              >
                {['Hindi', 'Tamil', 'Malayalam', 'Kannada', 'Telugu', 'Bengali', 'Marathi', 'Urdu'].map((lang) => (
                  <option key={lang}>{lang}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleTranslateText}
              className="w-full py-2 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-350 hover:text-white text-xs font-bold rounded-lg transition-all"
            >
              {translating ? 'Translating via Gemma...' : 'Test Emergency Translation'}
            </button>

            {transResult && (
              <div className="p-3 bg-slate-950 border border-slate-900 text-xs rounded-xl leading-relaxed text-orange-400 font-medium">
                {transResult}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
