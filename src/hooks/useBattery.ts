import { useState, useEffect } from 'react';

export interface BatteryState {
  level: number; // 0 to 1
  charging: boolean;
  supported: boolean;
  estimatedSurvivalHours: number;
}

export function useBattery(survivalModeActive: boolean): BatteryState {
  const [batteryState, setBatteryState] = useState<BatteryState>({
    level: 1,
    charging: false,
    supported: false,
    estimatedSurvivalHours: 24,
  });

  useEffect(() => {
    // Check if the Battery Status API is supported
    const nav = navigator as any;
    if (!nav.getBattery) {
      setBatteryState((prev) => ({
        ...prev,
        supported: false,
        estimatedSurvivalHours: calculateSurvival(1, false, survivalModeActive),
      }));
      return;
    }

    let battery: any = null;

    const updateBatteryInfo = () => {
      if (!battery) return;
      const level = battery.level;
      const charging = battery.charging;
      setBatteryState({
        level,
        charging,
        supported: true,
        estimatedSurvivalHours: calculateSurvival(level, charging, survivalModeActive),
      });
    };

    nav.getBattery().then((bat: any) => {
      battery = bat;
      updateBatteryInfo();

      battery.addEventListener('levelchange', updateBatteryInfo);
      battery.addEventListener('chargingchange', updateBatteryInfo);
    });

    return () => {
      if (battery) {
        battery.removeEventListener('levelchange', updateBatteryInfo);
        battery.removeEventListener('chargingchange', updateBatteryInfo);
      }
    };
  }, [survivalModeActive]);

  return batteryState;
}

function calculateSurvival(level: number, charging: boolean, survivalActive: boolean): number {
  if (charging) return 999; // Essentially infinite while charging

  // Base consumption: 100% battery lasts 16 hours in normal usage
  // In emergency mode, battery lasts 48 hours (low refresh, dark theme, offline AI, compressed mapping)
  const baseHours = survivalActive ? 48 : 16;
  const rawHours = level * baseHours;

  return Math.round(rawHours * 10) / 10;
}
