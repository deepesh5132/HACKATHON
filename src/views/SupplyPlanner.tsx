import React, { useState, useEffect } from 'react';
import { db, type SupplyItem } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Package, Plus, Trash, CheckSquare, Square, ShieldAlert, Sparkles } from 'lucide-react';
import { askGemma } from '../services/ai';

interface SupplyPlannerProps {
  activeDisaster: string;
  accessibilityLargeText: boolean;
}

export function SupplyPlanner({ activeDisaster, accessibilityLargeText }: SupplyPlannerProps) {
  const supplies = useLiveQuery(() => db.supplies.toArray()) || [];
  const [familySize, setFamilySize] = useState<number>(3);
  const [durationDays, setDurationDays] = useState<number>(3);
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemCat, setNewItemCat] = useState<string>('Water & Food');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingAI, setLoadingAI] = useState<boolean>(false);

  // Recalculate water/food totals based on family size and days
  const waterRequired = familySize * durationDays * 1; // 1 gallon per day
  const mealsRequired = familySize * durationDays * 3; // 3 meals per day

  // Generate AI checklist optimization using Gemma
  const getAISuggestions = () => {
    setLoadingAI(true);
    const query = `Generate 4 specific survival supply items for a family of ${familySize} preparing for a ${durationDays}-day ${activeDisaster || 'general emergency'}. Reply with a JSON string of 4 short items in this structure: ["item 1", "item 2", "item 3", "item 4"]`;

    askGemma(query)
      .then((res) => {
        try {
          // Parse explanation or list
          const list = JSON.parse(res.explanation);
          if (Array.isArray(list)) {
            setAiSuggestions(list);
          } else {
            setAiSuggestions(['Dust masks (N95)', 'Heavy work gloves', 'Manual can opener', 'Battery operated radio']);
          }
        } catch (e) {
          // Heuristic fallback
          setAiSuggestions(['Dust masks (N95)', 'Heavy work gloves', 'Manual can opener', 'Battery operated radio']);
        }
      })
      .catch(() => {
        setAiSuggestions(['Dust masks (N95)', 'Heavy work gloves', 'Manual can opener', 'Battery operated radio']);
      })
      .finally(() => {
        setLoadingAI(false);
      });
  };

  useEffect(() => {
    getAISuggestions();
  }, [familySize, durationDays, activeDisaster]);

  const toggleCheckItem = async (item: SupplyItem) => {
    if (item.id === undefined) return;
    await db.supplies.update(item.id, { checked: !item.checked });
  };

  const deleteItem = async (id: number) => {
    await db.supplies.delete(id);
  };

  const addNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const item: Omit<SupplyItem, 'id'> = {
      category: newItemCat,
      item: newItemName,
      quantity: '1 unit',
      checked: false,
    };

    await db.supplies.add(item as SupplyItem);
    setNewItemName('');
  };

  const addAISuggestion = async (name: string) => {
    const item: Omit<SupplyItem, 'id'> = {
      category: 'Tools & Power',
      item: name,
      quantity: '1 unit',
      checked: false,
    };
    await db.supplies.add(item as SupplyItem);
    setAiSuggestions((prev) => prev.filter((s) => s !== name));
  };

  const getCompletedCount = () => supplies.filter((s) => s.checked).length;
  const progressPercent = supplies.length > 0 ? Math.round((getCompletedCount() / supplies.length) * 100) : 0;

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${accessibilityLargeText ? 'accessibility-large-text' : ''}`}>
      {/* Configuration Panel */}
      <div className="space-y-4">
        <div className="rounded-2xl glass p-5 space-y-4">
          <h3 className="font-bold text-sm text-slate-200 flex items-center gap-1.5 border-b border-slate-900 pb-2">
            <Package className="h-4.5 w-4.5 text-orange-500" />
            Supply Calculator Settings
          </h3>

          <div className="space-y-3.5">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Household Members</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={familySize}
                  onChange={(e) => setFamilySize(parseInt(e.target.value))}
                  className="w-full accent-orange-500"
                />
                <span className="text-sm font-bold text-white shrink-0 w-6 text-right">{familySize}</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Evacuation Duration</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="14"
                  value={durationDays}
                  onChange={(e) => setDurationDays(parseInt(e.target.value))}
                  className="w-full accent-orange-500"
                />
                <span className="text-sm font-bold text-white shrink-0 w-12 text-right">{durationDays} days</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-900 text-center">
              <div className="text-slate-400 text-[9px] uppercase font-semibold">Min Clean Water</div>
              <div className="text-lg font-black text-blue-400 mt-0.5">{waterRequired} Gal</div>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-900 text-center">
              <div className="text-slate-400 text-[9px] uppercase font-semibold">Min Meals Needed</div>
              <div className="text-lg font-black text-orange-400 mt-0.5">{mealsRequired} Meals</div>
            </div>
          </div>
        </div>

        {/* AI Recommendations Panel */}
        <div className="rounded-2xl glass p-5 space-y-3">
          <h3 className="font-bold text-sm text-slate-200 flex items-center gap-1.5 border-b border-slate-900 pb-2">
            <Sparkles className="h-4.5 w-4.5 text-blue-400 animate-pulse" />
            Gemma AI Supply Planner Suggestions
          </h3>

          {loadingAI ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping"></span>
              Gemma generating customized kit checklist...
            </div>
          ) : (
            <div className="space-y-2">
              {aiSuggestions.map((sug, idx) => (
                <div
                  key={idx}
                  onClick={() => addAISuggestion(sug)}
                  className="p-2 rounded-lg bg-slate-900/60 border border-slate-850 hover:bg-slate-900 transition-colors flex items-center justify-between text-xs text-slate-350 cursor-pointer"
                >
                  <span>{sug}</span>
                  <Plus className="h-4 w-4 text-blue-500" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Checklist View */}
      <div className="lg:col-span-2 rounded-2xl glass p-5 space-y-4 flex flex-col">
        <div className="flex justify-between items-center border-b border-slate-900 pb-3">
          <div>
            <h3 className="font-bold text-sm text-slate-200">Survival Emergency Checklist</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Completed: {getCompletedCount()} of {supplies.length} items
            </p>
          </div>

          <div className="w-24 bg-slate-950 rounded-full h-3 border border-slate-800 overflow-hidden relative">
            <div
              className="bg-orange-500 h-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Add custom supply form */}
        <form onSubmit={addNewItem} className="flex gap-2 shrink-0">
          <select
            value={newItemCat}
            onChange={(e) => setNewItemCat(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 px-3 outline-none"
          >
            <option>Water & Food</option>
            <option>Medical</option>
            <option>Tools & Power</option>
            <option>Safety & Warmth</option>
            <option>Documents</option>
          </select>
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Add custom item (e.g. Baby formula, pet food)..."
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
          />
          <button
            type="submit"
            className="px-3 bg-orange-650 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </form>

        {/* List items */}
        <div className="flex-1 overflow-y-auto space-y-2 mt-2 max-h-[300px]">
          {supplies.map((item) => (
            <div
              key={item.id}
              className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                item.checked ? 'bg-slate-900/30 border-slate-900/80 opacity-60' : 'bg-slate-900/60 border-slate-850'
              }`}
            >
              <div
                onClick={() => toggleCheckItem(item)}
                className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
              >
                {item.checked ? (
                  <CheckSquare className="h-4.5 w-4.5 text-orange-500 shrink-0" />
                ) : (
                  <Square className="h-4.5 w-4.5 text-slate-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <span className={`text-xs block text-slate-200 truncate ${item.checked ? 'line-through' : ''}`}>
                    {item.item}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
                    {item.category} • {item.quantity}
                  </span>
                </div>
              </div>
              <button
                onClick={() => item.id && deleteItem(item.id)}
                className="p-1 text-slate-500 hover:text-red-500 transition-colors"
              >
                <Trash className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
