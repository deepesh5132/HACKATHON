import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Compass,
  AlertOctagon,
  Users,
  CheckCircle,
  Activity,
  Camera,
  Settings as SettingsIcon,
  HelpCircle,
  Menu,
  X,
  Battery,
  FlameKindling
} from 'lucide-react';

// Custom Hooks & Services
import { useBattery } from './hooks/useBattery';
import { useGeolocation } from './hooks/useGeolocation';
import { isOnline } from './services/ai';

// View Components
import { Dashboard } from './views/Dashboard';
import { AIChat } from './views/AIChat';
import { EscapeMap } from './views/EscapeMap';
import { SOSBeacon } from './views/SOSBeacon';
import { SupplyPlanner } from './views/SupplyPlanner';
import { FirstAid } from './views/FirstAid';
import { FamilyNetwork } from './views/FamilyNetwork';
import { DamageScanner } from './views/DamageScanner';
import { Settings } from './views/Settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [onlineStatus, setOnlineStatus] = useState<boolean>(isOnline());

  // Global State Configurable in Settings
  const [activeDisaster, setActiveDisaster] = useState<string>('Flood');
  const [batterySurvivalActive, setBatterySurvivalActive] = useState<boolean>(false);
  const [accessibilityLargeText, setAccessibilityLargeText] = useState<boolean>(false);
  const [accessibilityHighContrast, setAccessibilityHighContrast] = useState<boolean>(false);

  // Custom Hooks integration
  const location = useGeolocation(activeTab === 'map' || activeTab === 'sos');
  const battery = useBattery(batterySurvivalActive);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getBatteryModeClass = () => {
    return batterySurvivalActive ? 'bg-slate-950 text-slate-200' : 'bg-slate-950 text-slate-100';
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: ShieldAlert },
    { id: 'chat', label: 'AI Chat', icon: HelpCircle },
    { id: 'map', label: 'Safe Map', icon: Compass },
    { id: 'sos', label: 'Distress SOS', icon: AlertOctagon },
    { id: 'supplies', label: 'Supply Planner', icon: CheckCircle },
    { id: 'first-aid', label: 'First Aid', icon: Activity },
    { id: 'family', label: 'Family Network', icon: Users },
    { id: 'damage', label: 'Damage Scanner', icon: Camera },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div
      className={`min-h-screen flex flex-col transition-all duration-300 ${getBatteryModeClass()} ${
        accessibilityHighContrast ? 'accessibility-high-contrast' : ''
      }`}
    >
      {/* Top Header Navigation */}
      <header className="glass sticky top-0 z-50 px-4 md:px-8 py-4 flex items-center justify-between border-b border-slate-900 shadow-md">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-orange-600/10 border border-orange-500/25 flex items-center justify-center text-orange-500">
            <FlameKindling className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-black tracking-wide text-white uppercase font-title flex items-center gap-1.5">
              SAFE-ZONE
            </h1>
            <p className="text-[9px] font-semibold text-slate-450 tracking-wider uppercase">Offline Rescue Companion</p>
          </div>
        </div>

        {/* Global HUD Stats */}
        <div className="hidden md:flex items-center gap-4 text-xs font-semibold text-slate-400">
          <div className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-850">
            <span className={`h-2 w-2 rounded-full ${onlineStatus ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
            <span>{onlineStatus ? 'Online AI' : 'Offline Mode'}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-850">
            <Battery className="h-4 w-4 text-yellow-400" />
            <span>{Math.round(battery.level * 100)}% ({battery.estimatedSurvivalHours}h left)</span>
          </div>

          {activeDisaster !== 'None' && (
            <div className="flex items-center gap-1.5 bg-red-950/20 px-3 py-1.5 rounded-lg border border-red-900/30 text-red-400">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
              <span>Simulated: {activeDisaster}</span>
            </div>
          )}
        </div>

        {/* Hamburger Mobile Toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-350 hover:text-white"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Main Grid Wrapper */}
      <div className="flex-1 flex flex-col md:flex-row relative">
        {/* Navigation Sidebar */}
        <aside
          className={`md:w-60 shrink-0 glass border-r border-slate-900 md:block ${
            menuOpen ? 'block absolute inset-y-0 left-0 w-64 z-40 bg-slate-950/98 shadow-2xl' : 'hidden'
          }`}
        >
          <nav className="p-4 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block px-3 py-1 mb-2">
              Menu Navigation
            </span>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                    active
                      ? 'bg-orange-600/10 border border-orange-500/30 text-orange-400 font-bold'
                      : 'text-slate-400 border border-transparent hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 shrink-0 ${active ? 'text-orange-500' : 'text-slate-550'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Panel */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-h-[calc(100vh-5rem)]">
          {activeTab === 'dashboard' && (
            <Dashboard
              batteryLevel={battery.level}
              batterySurvivalActive={batterySurvivalActive}
              location={location.coordinates}
              activeDisaster={activeDisaster}
              onNavigateTo={(tab) => setActiveTab(tab)}
              accessibilityLargeText={accessibilityLargeText}
            />
          )}

          {activeTab === 'chat' && (
            <AIChat
              locationContext={location.coordinates ? `${location.coordinates.lat}, ${location.coordinates.lng}` : ''}
              accessibilityLargeText={accessibilityLargeText}
            />
          )}

          {activeTab === 'map' && (
            <EscapeMap
              location={location.coordinates}
              activeDisaster={activeDisaster}
              accessibilityLargeText={accessibilityLargeText}
            />
          )}

          {activeTab === 'sos' && (
            <SOSBeacon
              batteryLevel={battery.level}
              location={location.coordinates}
              accessibilityLargeText={accessibilityLargeText}
            />
          )}

          {activeTab === 'supplies' && (
            <SupplyPlanner activeDisaster={activeDisaster} accessibilityLargeText={accessibilityLargeText} />
          )}

          {activeTab === 'first-aid' && <FirstAid accessibilityLargeText={accessibilityLargeText} />}

          {activeTab === 'family' && (
            <FamilyNetwork
              batteryLevel={battery.level}
              location={location.coordinates}
              accessibilityLargeText={accessibilityLargeText}
            />
          )}

          {activeTab === 'damage' && <DamageScanner accessibilityLargeText={accessibilityLargeText} />}

          {activeTab === 'settings' && (
            <Settings
              activeDisaster={activeDisaster}
              setActiveDisaster={setActiveDisaster}
              accessibilityLargeText={accessibilityLargeText}
              setAccessibilityLargeText={setAccessibilityLargeText}
              accessibilityHighContrast={accessibilityHighContrast}
              setAccessibilityHighContrast={setAccessibilityHighContrast}
            />
          )}
        </main>
      </div>
    </div>
  );
}
