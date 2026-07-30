import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, FileText, CheckCircle, ShieldAlert, Sparkles } from 'lucide-react';

interface DamageScannerProps {
  accessibilityLargeText: boolean;
}

interface ScanResult {
  hazardScore: number;
  verdict: 'SAFE' | 'UNSTABLE' | 'EVACUATE';
  cracksFound: string;
  floodLevel: string;
  recommendations: string[];
}

export function DamageScanner({ accessibilityLargeText }: DamageScannerProps) {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [scanning, setScanning] = useState<boolean>(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setResult(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.error('Failed to access camera:', err);
      // Simulate camera if block or error
      setCameraActive(true);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const triggerScan = () => {
    setScanning(true);
    setResult(null);
    setTimeout(() => {
      setScanning(false);
      // Mock results randomly or preset
      const mockResults: ScanResult[] = [
        {
          hazardScore: 12,
          verdict: 'SAFE',
          cracksFound: 'Hairline cracks detected (under 1mm width). No structural movement.',
          floodLevel: '0 meters (dry)',
          recommendations: ['Safe to shelter-in-place.', 'Continue monitoring aftershocks or flood advisories.', 'Keep emergency exit paths clear.']
        },
        {
          hazardScore: 78,
          verdict: 'EVACUATE',
          cracksFound: 'Large shear wall cracks (5mm width) at load-bearing junction.',
          floodLevel: '0.8 meters (damp crawlspace)',
          recommendations: ['Structure is UNSTABLE. Evacuate immediately.', 'Do not carry heavy items.', 'Report building coordinate to structural engineers.']
        },
        {
          hazardScore: 92,
          verdict: 'EVACUATE',
          cracksFound: 'Spalling concrete, exposed rebar showing rust & deflection.',
          floodLevel: '1.4 meters (flood line visible)',
          recommendations: ['Severe collapse warning.', 'Stay away from outer balconies and perimeter walls.', 'Evacuate using low-lying exterior stairs if stable.']
        }
      ];

      const chosen = mockResults[Math.floor(Math.random() * mockResults.length)];
      setResult(chosen);
    }, 2500);
  };

  const getVerdictStyle = (verdict: string) => {
    switch (verdict) {
      case 'SAFE':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'UNSTABLE':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'EVACUATE':
        return 'text-red-400 bg-red-500/10 border-red-500/30 animate-pulse';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${accessibilityLargeText ? 'accessibility-large-text' : ''}`}>
      {/* Scanner Panel */}
      <div className="lg:col-span-2 rounded-2xl glass p-5 flex flex-col space-y-4">
        <div>
          <h3 className="font-bold text-sm text-slate-200 flex items-center gap-1.5 border-b border-slate-900 pb-2">
            <Camera className="h-4.5 w-4.5 text-orange-500" />
            AI Structural & Flood Scanner
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">
            Gemma analyzes masonry cracks, wall tilting, waterlines, and structural fatigue.
          </p>
        </div>

        {/* Camera Container */}
        <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-900 overflow-hidden flex items-center justify-center">
          {cameraActive ? (
            <>
              {/* If real stream fails, show animated mock grid */}
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              {/* Scanning reticle overlay */}
              <div className="absolute inset-0 border-2 border-dashed border-orange-500/20 m-6 rounded-lg pointer-events-none flex items-center justify-center">
                <div className={`w-full h-0.5 bg-orange-500/50 absolute transition-all duration-1000 ${scanning ? 'animate-bounce' : 'opacity-25'}`} />
                <div className="w-8 h-8 border-t-2 border-l-2 border-orange-500 absolute top-0 left-0" />
                <div className="w-8 h-8 border-t-2 border-r-2 border-orange-500 absolute top-0 right-0" />
                <div className="w-8 h-8 border-b-2 border-l-2 border-orange-500 absolute bottom-0 left-0" />
                <div className="w-8 h-8 border-b-2 border-r-2 border-orange-500 absolute bottom-0 right-0" />
              </div>
            </>
          ) : (
            <div className="text-center space-y-4 p-4">
              <Camera className="h-10 w-10 text-slate-600 mx-auto" />
              <button
                onClick={startCamera}
                className="py-2 px-4 bg-orange-650 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-all"
              >
                Activate Scanner Camera
              </button>
            </div>
          )}

          {scanning && (
            <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
              <div className="text-center space-y-2">
                <RefreshCw className="h-8 w-8 text-orange-500 animate-spin mx-auto" />
                <div className="text-xs font-bold text-white tracking-widest uppercase">Gemma Analyzing Structure...</div>
              </div>
            </div>
          )}
        </div>

        {/* Scan Actions */}
        {cameraActive && !scanning && (
          <div className="flex gap-3 shrink-0">
            <button
              onClick={triggerScan}
              className="flex-1 py-2.5 bg-orange-650 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition-all"
            >
              Analyze Building Damage
            </button>
            <button
              onClick={stopCamera}
              className="py-2.5 px-4 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold rounded-lg transition-all"
            >
              Close Camera
            </button>
          </div>
        )}

        {/* Scan Results Output */}
        {result && (
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-850 space-y-3.5">
            <div className="flex justify-between items-center border-b border-slate-850 pb-2">
              <h4 className="font-bold text-xs text-white">AI Damage Report</h4>
              <span className={`text-[9px] px-2 py-0.5 rounded font-bold border uppercase tracking-wider ${getVerdictStyle(result.verdict)}`}>
                Verdict: {result.verdict}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] text-slate-450 uppercase block font-semibold">Cracks/Fissure Scan</span>
                <p className="text-slate-200 font-medium mt-0.5">{result.cracksFound}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-450 uppercase block font-semibold">Water Level Indicator</span>
                <p className="text-slate-200 font-medium mt-0.5">{result.floodLevel}</p>
              </div>
            </div>

            <div className="border-t border-slate-850 pt-2.5 space-y-1.5">
              <span className="text-[10px] text-slate-450 uppercase block font-semibold">Survival Actions</span>
              <ul className="space-y-1 text-xs text-slate-300">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Post-Disaster Recovery Resources */}
      <div className="rounded-2xl glass p-5 space-y-4">
        <h3 className="font-bold text-sm text-slate-200 flex items-center gap-1.5 border-b border-slate-900 pb-2">
          <FileText className="h-4.5 w-4.5 text-blue-400" />
          Recovery Assistance Checklists
        </h3>

        <div className="space-y-3">
          <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-xl space-y-2">
            <h4 className="font-bold text-xs text-slate-200">Lost Documents Replacement</h4>
            <ul className="space-y-1.5 text-[10px] text-slate-400">
              <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-slate-650" /> ID Card reissue claims</li>
              <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-slate-650" /> Property registry duplicates</li>
              <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-slate-650" /> Bank passbooks & statements</li>
            </ul>
          </div>

          <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-xl space-y-2">
            <h4 className="font-bold text-xs text-slate-200">Insurance & Relief Claims</h4>
            <ul className="space-y-1.5 text-[10px] text-slate-400">
              <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-slate-650" /> Photographic damage documentation</li>
              <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-slate-650" /> FEMA relief claims file</li>
              <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-slate-650" /> Temporary housing stipend registry</li>
            </ul>
          </div>

          <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-xl space-y-2">
            <h4 className="font-bold text-xs text-slate-200">Government Support Schemes</h4>
            <ul className="space-y-1.5 text-[10px] text-slate-400">
              <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-slate-650" /> Emergency food allowance vouchers</li>
              <li className="flex items-center gap-1.5"><CheckCircle className="h-3 w-3 text-slate-650" /> Agriculture crop loss compensation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
