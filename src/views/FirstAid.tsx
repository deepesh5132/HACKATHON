import React, { useState } from 'react';
import { Heart, Activity, Search, Volume2, ShieldAlert, Sparkles } from 'lucide-react';

interface FirstAidProps {
  accessibilityLargeText: boolean;
}

interface Guide {
  id: string;
  title: string;
  description: string;
  steps: string[];
  warnings: string[];
  frequency?: string; // e.g. CPR rate
}

const guides: Guide[] = [
  {
    id: 'cpr',
    title: 'Cardiopulmonary Resuscitation (CPR)',
    description: 'Emergency procedure for someone whose heart has stopped beating.',
    steps: [
      'Call emergency services immediately before starting.',
      'Place the person on their back on a firm, flat surface.',
      'Place the heel of one hand in the center of their chest, and interlocking fingers of the other hand on top.',
      'Push hard and fast: 100 to 120 compressions per minute (depth of 2 inches). Use body weight.',
      'If trained: Give 2 rescue breaths after every 30 compressions. If untrained, perform hands-only CPR.',
      'Continue compressions until medical personnel arrive or the person starts breathing.'
    ],
    warnings: [
      'Do not stop compressions for more than 10 seconds.',
      'Do not lean on the chest between compressions.'
    ],
    frequency: '100-120 Compressions/Min'
  },
  {
    id: 'bleeding',
    title: 'Severe Bleeding Control',
    description: 'Actions to take when a person is bleeding heavily from an open wound.',
    steps: [
      'Apply direct pressure to the wound using a clean cloth or bandage.',
      'Maintain firm pressure. If the cloth becomes soaked, do not remove it; add more layers on top.',
      'Elevate the injured limb above the level of the heart if possible.',
      'Keep the person lying down and wrap them in a blanket to prevent shock.',
      'If bleeding does not stop after 10-15 minutes, apply a tourniquet 2-3 inches above the wound (never on a joint).'
    ],
    warnings: [
      'Do not wash deep or severely bleeding wounds.',
      'Do not pull out deeply embedded objects.'
    ]
  },
  {
    id: 'choking',
    title: 'Choking First Aid (Heimlich)',
    description: 'Procedure to clear blocked airways for adults and children.',
    steps: [
      'Stand behind the person. Wrap your arms around their waist.',
      'Make a fist with one hand. Place the thumb side against the abdomen, slightly above the navel.',
      'Grasp your fist with your other hand. Press into the abdomen with quick upward thrusts.',
      'Repeat until the object is forced out or the person becomes unconscious.',
      'If they lose consciousness, lower them to the floor and start CPR compressions immediately.'
    ],
    warnings: [
      'Do not give a choking person water or food.',
      'Do not perform blind sweeps if you cannot see the object.'
    ]
  },
  {
    id: 'burns',
    title: 'Thermal & Chemical Burns',
    description: 'First response for first, second, or third-degree burns.',
    steps: [
      'Cool the burn immediately under cool (not cold) running water for 10 to 20 minutes.',
      'Remove jewelry or tight clothing before swelling begins.',
      'Cover the burn loosely with a sterile, non-stick bandage or clean plastic wrap.',
      'Treat for shock if burns are extensive: keep warm and elevate legs if possible.'
    ],
    warnings: [
      'Do not use ice, butter, or ointment on the burn (this traps heat).',
      'Do not break blisters; this increases risk of infection.',
      'Do not peel away charred clothing stuck to the burn.'
    ]
  },
  {
    id: 'bites',
    title: 'Venomous Snake Bites',
    description: 'Emergency actions for pit viper or cobra bites.',
    steps: [
      'Keep the person calm, still, and reassure them. Movement spreads venom.',
      'Locate and wash the bite area gently with soap and water.',
      'Keep the bite site positioned below the level of the heart.',
      'Remove rings, watches, or tight clothing around the bite.',
      'Apply a clean, dry dressing. Note the time of the bite for medical records.'
    ],
    warnings: [
      'Never attempt to suck out the venom.',
      'Do not apply ice or a tourniquet.',
      'Do not cut the wound.'
    ]
  }
];

export function FirstAid({ accessibilityLargeText }: FirstAidProps) {
  const [search, setSearch] = useState<string>('');
  const [selectedGuide, setSelectedGuide] = useState<Guide>(guides[0]);

  const filteredGuides = guides.filter((g) =>
    g.title.toLowerCase().includes(search.toLowerCase()) ||
    g.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleSpeak = (guide: Guide) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const textToSpeak = `${guide.title}. ${guide.description}. Steps are as follows: ${guide.steps.join('. ')}. Warning: ${guide.warnings.join('. ')}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${accessibilityLargeText ? 'accessibility-large-text' : ''}`}>
      {/* Search and Navigation Panel */}
      <div className="space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search first aid guides (e.g. CPR)..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none"
          />
        </div>

        {/* List of Guides */}
        <div className="rounded-2xl glass p-5 space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Emergency Manuals</h3>
          <div className="space-y-2">
            {filteredGuides.map((guide) => (
              <div
                key={guide.id}
                onClick={() => setSelectedGuide(guide)}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  selectedGuide.id === guide.id
                    ? 'bg-orange-500/10 border-orange-500/40 text-orange-400'
                    : 'bg-slate-900/60 border-slate-850 text-slate-350 hover:bg-slate-900'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  {guide.title}
                </div>
                <p className="text-[10px] text-slate-450 mt-1 line-clamp-1">{guide.description}</p>
              </div>
            ))}
            {filteredGuides.length === 0 && (
              <div className="text-center text-xs text-slate-500 py-6">No guides match your search term.</div>
            )}
          </div>
        </div>
      </div>

      {/* Guide Detail View */}
      <div className="lg:col-span-2 rounded-2xl glass p-6 space-y-5 flex flex-col justify-between">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-900 pb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              {selectedGuide.title}
            </h2>
            <p className="text-slate-400 text-xs mt-1">{selectedGuide.description}</p>
          </div>

          <button
            onClick={() => handleSpeak(selectedGuide)}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-bold shrink-0"
            title="Read Guide Out Loud"
          >
            <Volume2 className="h-4 w-4" /> Voice Mode
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-4 my-2">
          {selectedGuide.frequency && (
            <div className="flex items-center gap-2 p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl text-xs font-bold">
              <Sparkles className="h-4.5 w-4.5 animate-pulse" /> Rhythm: {selectedGuide.frequency} (Compression cadence matches "Stayin' Alive" song)
            </div>
          )}

          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Step-by-Step Response</h3>
            {selectedGuide.steps.map((step, index) => (
              <div key={index} className="flex gap-3 text-xs text-slate-300 items-start">
                <span className="h-5 w-5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center font-bold shrink-0 text-[10px] mt-0.5">
                  {index + 1}
                </span>
                <p className="leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Warnings */}
        <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 space-y-2.5">
          <h4 className="font-bold text-xs text-red-450 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4" /> Crucial Warnings (Do NOT do these)
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-350 list-disc ml-4">
            {selectedGuide.warnings.map((warn, index) => (
              <li key={index} className="leading-relaxed">{warn}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
