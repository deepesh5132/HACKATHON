import Dexie, { type Table } from 'dexie';

export interface UserProfile {
  id?: string;
  name: string;
  phone: string;
  bloodGroup: string;
  medicalConditions: string;
  emergencyContacts: string; // JSON string or text
  mobilityNotes: string;
  hasVehicle: boolean;
  hasPets: boolean;
  hasChildren: boolean;
  batterySurvivalMode: boolean;
  isRegistered: boolean;
}

export interface FamilyMember {
  id: string;
  name: string;
  phone: string;
  status: 'Safe' | 'Need Help' | 'Trapped' | 'Evacuating' | 'Unknown';
  lastKnownLocation: { lat: number; lng: number } | null;
  batteryLevel: number | null;
  updatedAt: string;
}

export interface SupplyItem {
  id?: number;
  category: string;
  item: string;
  quantity: string;
  checked: boolean;
  expiryDate?: string;
}

export interface HazardReport {
  id?: number;
  type: 'flood' | 'roadblock' | 'fire' | 'collapse' | 'outage' | 'other';
  description: string;
  location: { lat: number; lng: number };
  timestamp: string;
  status: 'pending' | 'verified' | 'synced';
}

export interface ChatMessage {
  id?: number;
  sender: 'user' | 'gemma';
  text: string;
  timestamp: string;
  isOffline: boolean;
}

export class SentinelDB extends Dexie {
  profile!: Table<UserProfile>;
  family!: Table<FamilyMember>;
  supplies!: Table<SupplyItem>;
  reports!: Table<HazardReport>;
  chat!: Table<ChatMessage>;

  constructor() {
    super('SentinelDB');
    this.version(1).stores({
      profile: '++id, name',
      family: 'id, name, status',
      supplies: '++id, category, checked',
      reports: '++id, type, status',
      chat: '++id, timestamp',
    });
  }
}

export const db = new SentinelDB();

// Initialize default checklist items if empty
export async function seedDefaultSupplies() {
  const count = await db.supplies.count();
  if (count === 0) {
    const defaults: Omit<SupplyItem, 'id'>[] = [
      { category: 'Water & Food', item: 'Water (1 gallon per person per day)', quantity: '3 days', checked: false },
      { category: 'Water & Food', item: 'Non-perishable canned/dry food', quantity: '3 days', checked: false },
      { category: 'Medical', item: 'First aid kit (bandages, antiseptics)', quantity: '1 set', checked: false },
      { category: 'Medical', item: 'Personal prescription medications', quantity: '7 days', checked: false },
      { category: 'Tools & Power', item: 'Flashlight (manual crank or extra batteries)', quantity: '2 pcs', checked: false },
      { category: 'Tools & Power', item: 'Power bank & charging cables', quantity: '2 pcs', checked: false },
      { category: 'Tools & Power', item: 'Multi-tool or swiss pocket knife', quantity: '1 pc', checked: false },
      { category: 'Safety & Warmth', item: 'Emergency thermal blanket', quantity: '1 per person', checked: false },
      { category: 'Safety & Warmth', item: 'Whistle to signal for help', quantity: '1 pc', checked: false },
      { category: 'Documents', item: 'Copies of ID, insurance, & medical records', quantity: '1 pack', checked: false },
    ];
    await db.supplies.bulkAdd(defaults as SupplyItem[]);
  }
}

// Seed default family members for simulation
export async function seedDefaultFamily() {
  const count = await db.family.count();
  if (count === 0) {
    const defaults: FamilyMember[] = [
      { id: 'fam-1', name: 'Sarah (Wife)', phone: '+15550198', status: 'Safe', lastKnownLocation: { lat: 12.9716, lng: 77.5946 }, batteryLevel: 85, updatedAt: new Date().toISOString() },
      { id: 'fam-2', name: 'Arthur (Grandfather)', phone: '+15550214', status: 'Unknown', lastKnownLocation: { lat: 12.9800, lng: 77.6010 }, batteryLevel: 14, updatedAt: new Date().toISOString() },
      { id: 'fam-3', name: 'Emily (Daughter)', phone: '+15550302', status: 'Safe', lastKnownLocation: { lat: 12.9650, lng: 77.5890 }, batteryLevel: 92, updatedAt: new Date().toISOString() },
    ];
    await db.family.bulkAdd(defaults);
  }
}
