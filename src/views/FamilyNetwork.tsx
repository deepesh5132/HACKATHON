import React, { useState, useEffect } from 'react';
import { db, type FamilyMember } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Users, UserPlus, Heart, Shield, MapPin, Battery, CheckCircle, RefreshCw } from 'lucide-react';

interface FamilyNetworkProps {
  batteryLevel: number;
  location: { lat: number; lng: number } | null;
  accessibilityLargeText: boolean;
}

export function FamilyNetwork({ batteryLevel, location, accessibilityLargeText }: FamilyNetworkProps) {
  const familyMembers = useLiveQuery(() => db.family.toArray()) || [];
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberPhone, setNewMemberPhone] = useState<string>('');
  const [userStatus, setUserStatus] = useState<string>('Safe');

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberPhone.trim()) return;

    // Simulate location close to current location
    const latOffset = (Math.random() - 0.5) * 0.02;
    const lngOffset = (Math.random() - 0.5) * 0.02;
    const baseLat = location?.lat || 12.9716;
    const baseLng = location?.lng || 77.5946;

    const newFam: FamilyMember = {
      id: `fam-${Date.now()}`,
      name: newMemberName,
      phone: newMemberPhone,
      status: 'Unknown',
      lastKnownLocation: { lat: baseLat + latOffset, lng: baseLng + lngOffset },
      batteryLevel: Math.floor(Math.random() * 80) + 20,
      updatedAt: new Date().toISOString(),
    };

    await db.family.add(newFam);
    setNewMemberName('');
    setNewMemberPhone('');
  };

  const updateUserStatus = async (status: 'Safe' | 'Need Help' | 'Trapped' | 'Evacuating') => {
    setUserStatus(status);
    // Simulate updating self record or broadcasting it
    console.log(`Self status updated to: ${status}. Coordinates:`, location);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Safe':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'Evacuating':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'Need Help':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'Trapped':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${accessibilityLargeText ? 'accessibility-large-text' : ''}`}>
      {/* Self Check-in Panel */}
      <div className="space-y-4">
        <div className="rounded-2xl glass p-5 space-y-4">
          <h3 className="font-bold text-sm text-slate-200 flex items-center gap-1.5 border-b border-slate-900 pb-2">
            <CheckCircle className="h-4.5 w-4.5 text-orange-500" /> My Current Status Check-in
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "I'm Safe", value: 'Safe', color: 'bg-green-600 hover:bg-green-500' },
              { label: 'Evacuating', value: 'Evacuating', color: 'bg-yellow-600 hover:bg-yellow-500' },
              { label: 'Need Help', value: 'Need Help', color: 'bg-orange-650 hover:bg-orange-600' },
              { label: 'Trapped', value: 'Trapped', color: 'bg-red-700 hover:bg-red-650' },
            ].map((st) => (
              <button
                key={st.value}
                type="button"
                onClick={() => updateUserStatus(st.value as any)}
                className={`py-3 rounded-xl text-xs font-bold text-white transition-all shadow-sm ${st.color} ${
                  userStatus === st.value ? 'ring-2 ring-white scale-[1.02]' : 'opacity-85'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Broadcasted Telemetry</span>
            <div className="text-[11px] font-semibold text-slate-350 mt-1 flex justify-center items-center gap-2">
              <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3 text-blue-400" /> {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Resolving GPS...'}</span>
              <span className="text-slate-650">|</span>
              <span className="flex items-center gap-0.5"><Battery className="h-3 w-3 text-green-400" /> {Math.round(batteryLevel * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Add Family Member Form */}
        <form onSubmit={handleAddMember} className="rounded-2xl glass p-5 space-y-3.5">
          <h3 className="font-bold text-sm text-slate-200 flex items-center gap-1.5 border-b border-slate-900 pb-2">
            <UserPlus className="h-4.5 w-4.5 text-blue-400" /> Add Member to Group
          </h3>

          <div>
            <label className="text-[9px] uppercase font-semibold text-slate-400 block mb-1">Contact Name</label>
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="e.g. Sarah (Wife)"
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
            />
          </div>

          <div>
            <label className="text-[9px] uppercase font-semibold text-slate-400 block mb-1">Phone Number</label>
            <input
              type="text"
              value={newMemberPhone}
              onChange={(e) => setNewMemberPhone(e.target.value)}
              placeholder="e.g. +1 555 0198"
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all"
          >
            Register Family Member
          </button>
        </form>
      </div>

      {/* Family Safety Grid List */}
      <div className="lg:col-span-2 rounded-2xl glass p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-900 pb-3">
          <div>
            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-1.5">
              <Users className="h-4.5 w-4.5 text-orange-500" /> Family Safety Network Status
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Offline caching syncs automatically</p>
          </div>
          <button className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {familyMembers.map((member) => (
            <div key={member.id} className="p-4 rounded-xl border border-slate-850 bg-slate-900/60 flex flex-col justify-between space-y-3.5 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-xs text-white">{member.name}</h4>
                  <p className="text-[10px] text-slate-550 mt-0.5">{member.phone}</p>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded font-bold border ${getStatusColor(member.status)}`}>
                  {member.status}
                </span>
              </div>

              <div className="space-y-1.5 text-[10px] text-slate-400">
                {member.lastKnownLocation && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-blue-500" />
                    <span>
                      {member.lastKnownLocation.lat.toFixed(4)}, {member.lastKnownLocation.lng.toFixed(4)}
                    </span>
                  </div>
                )}
                {member.batteryLevel !== null && (
                  <div className="flex items-center gap-1">
                    <Battery className={`h-3.5 w-3.5 ${member.batteryLevel < 20 ? 'text-red-500 animate-pulse' : 'text-green-500'}`} />
                    <span className={member.batteryLevel < 20 ? 'text-red-400 font-semibold' : ''}>
                      Battery Level: {member.batteryLevel}% {member.batteryLevel < 20 && '(Low Power!)'}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-[9px] text-slate-500 border-t border-slate-850 pt-2 text-right">
                Updated: {new Date(member.updatedAt).toLocaleTimeString()}
              </div>
            </div>
          ))}
          {familyMembers.length === 0 && (
            <div className="col-span-2 text-center text-xs text-slate-500 py-10">
              No family members registered. Set them up to coordinate evacuation paths.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
