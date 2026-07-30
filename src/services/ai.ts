import { GoogleGenerativeAI } from '@google/generative-ai';

// Simple check for online status
export function isOnline(): boolean {
  return navigator.onLine;
}

// Interface for structured emergency responses
export interface EmergencyGuidance {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  immediateActions: string[];
  nextSteps: string[];
  thingsNotToDo: string[];
  explanation: string;
}

// Local Expert Rule-based Emergency System (100% Offline fallback)
const offlineExpertDatabase: Record<string, EmergencyGuidance> = {
  flood: {
    riskLevel: 'HIGH',
    immediateActions: [
      'Move to higher ground immediately (uppermost floor or roof if trapped).',
      'Turn off main utilities (electricity, water, gas) if safe to do so.',
      'Do not walk, swim, or drive through floodwaters (just 6 inches can knock you over).',
    ],
    nextSteps: [
      'Monitor official radio stations or emergency apps for updates.',
      'Keep your SOS beacon ready.',
      'Await rescue workers; do not attempt to walk through swift currents.',
    ],
    thingsNotToDo: [
      'Do not go into the basement or low-lying rooms.',
      'Never touch electrical equipment while wet or standing in water.',
      'Do not drive around barricades.',
    ],
    explanation: 'Flooding poses severe risks of drowning, electrical shocks, and building structural failures. Fast-moving water is deceptive and extremely dangerous.',
  },
  fire: {
    riskLevel: 'CRITICAL',
    immediateActions: [
      'Crawl low under smoke to find the nearest exit.',
      'Test doors for heat using the back of your hand before opening.',
      'If your clothes catch fire: Stop, Drop, and Roll.',
    ],
    nextSteps: [
      'Once outside, stay outside. Call emergency services immediately.',
      'Proceed to your family\'s safe meeting point.',
      'If trapped inside, seal doors with wet towels and signal from a window.',
    ],
    thingsNotToDo: [
      'Do not use elevators; use stairwells only.',
      'Do not stop to collect personal belongings.',
      'Never open a door that feels hot to the touch.',
    ],
    explanation: 'Smoke inhalation is the leading cause of fire-related deaths. Heat rises, meaning cleaner air is located close to the floor.',
  },
  gas: {
    riskLevel: 'CRITICAL',
    immediateActions: [
      'Evacuate all residents from the building immediately.',
      'Leave doors and windows open to ventilate if moving past them.',
      'Do not touch any light switches, electrical outlets, or use phones inside.',
    ],
    nextSteps: [
      'Walk far away from the building before making emergency calls.',
      'Contact the gas utility provider and fire services.',
      'Do not re-enter the building until declared safe by authorities.',
    ],
    thingsNotToDo: [
      'Never light matches, candles, or use lighters.',
      'Do not start vehicles parked near the leak.',
      'Do not operate any electrical appliances or switches.',
    ],
    explanation: 'Gas leaks present an extreme risk of explosion. Any spark, even from a static charge or light switch, can ignite the accumulated gas.',
  },
  earthquake: {
    riskLevel: 'HIGH',
    immediateActions: [
      'Drop, Cover, and Hold On. Protect your head and neck.',
      'Get under a sturdy table, desk, or against an interior wall.',
      'If outdoors, move to an open area away from buildings, streetlights, and utility wires.',
    ],
    nextSteps: [
      'Be prepared for aftershocks, which can cause further damage.',
      'Check yourself and family members for injuries.',
      'Listen to emergency announcements and check structural stability before entering structures.',
    ],
    thingsNotToDo: [
      'Do not stand in doorways (modern structures do not make doors safer).',
      'Do not run outside while shaking is occurring.',
      'Never use elevators.',
    ],
    explanation: 'Falling debris and collapsing non-structural elements pose the highest risk of injury during an earthquake shaking phase.',
  },
  medical: {
    riskLevel: 'HIGH',
    immediateActions: [
      'Assess the victim\'s responsiveness and check for breathing.',
      'For severe bleeding, apply firm, direct pressure with a clean cloth.',
      'If not breathing, start CPR immediately: 30 chest compressions to 2 rescue breaths.',
    ],
    nextSteps: [
      'Call emergency services or locate the nearest medical camp on the map.',
      'Keep the victim warm and quiet, monitoring vital signs.',
      'Record details of the injury or condition for arriving rescue personnel.',
    ],
    thingsNotToDo: [
      'Do not move the person if a spinal or neck injury is suspected.',
      'Do not give food or drink to an unconscious or severely injured person.',
      'Do not apply a tourniquet unless trained and direct pressure fails.',
    ],
    explanation: 'Immediate first aid can double or triple survival rates during critical injuries before emergency medical services arrive.',
  },
  choking: {
    riskLevel: 'CRITICAL',
    immediateActions: [
      'Perform abdominal thrusts (Heimlich maneuver) for adults: Stand behind, wrap arms around waist, make a fist, and press inward/upward.',
      'For infants: Give 5 back blows between shoulder blades followed by 5 chest thrusts.',
      'If victim becomes unresponsive, start CPR.',
    ],
    nextSteps: [
      'Call emergency services even if the object is successfully dislodged.',
      'Monitor breathing and consciousness closely.',
    ],
    thingsNotToDo: [
      'Do not perform a blind finger sweep (you might push the object deeper).',
      'Do not give the person water or food.',
    ],
    explanation: 'Airway obstruction prevents oxygenation, leading to brain damage or death within minutes. Rapid action is vital.',
  }
};

// Generic response fallback for other keywords
const genericOfflineGuidance: EmergencyGuidance = {
  riskLevel: 'MEDIUM',
  immediateActions: [
    'Stay calm and evaluate your surroundings.',
    'Check your device battery status and enable Battery Survival Mode.',
    'Formulate an evacuation plan and check on your family group status.',
  ],
  nextSteps: [
    'Open the Map view to find nearby designated safe shelters.',
    'Assemble your emergency supply kit.',
    'Tune into local radio frequencies or emergency broadcasts.',
  ],
  thingsNotToDo: [
    'Do not wander into unknown hazard zones.',
    'Do not spread unverified rumors; rely on official or verified alerts.',
  ],
  explanation: 'During emergencies, situational awareness and conservation of resources (like battery power) are your primary tools for survival.',
};

// System prompt instructing the model to act as Gemma Emergency Rescue AI
const SYSTEM_PROMPT = `
You are Gemma, an offline-first emergency rescue and survival assistant. Your tone must be reassuring, calm, clear, and direct.
You provide life-saving emergency advice based on the details provided.
Provide your response in structured JSON format with this exact TypeScript shape:
{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "immediateActions": string[],
  "nextSteps": string[],
  "thingsNotToDo": string[],
  "explanation": string
}
Keep recommendations short, direct, and actionable. Do not output anything else than JSON.
`;

export async function askGemma(query: string, locationContext?: string): Promise<EmergencyGuidance> {
  const lowercaseQuery = query.toLowerCase();

  // 1. Check offline mode or missing API key
  const apiKey = localStorage.getItem('SENTINEL_GEMINI_KEY') || import.meta.env.VITE_GEMINI_KEY;

  if (!isOnline() || !apiKey) {
    // Return offline rule-based recommendations matching keywords
    let match: EmergencyGuidance | undefined;
    for (const key in offlineExpertDatabase) {
      if (lowercaseQuery.includes(key)) {
        match = offlineExpertDatabase[key];
        break;
      }
    }

    if (match) {
      return {
        ...match,
        explanation: `[OFFLINE MODE] ${match.explanation}`,
      };
    }

    // Attempt broad mapping
    if (lowercaseQuery.includes('cpr') || lowercaseQuery.includes('bleed') || lowercaseQuery.includes('burn') || lowercaseQuery.includes('snake')) {
      return {
        ...offlineExpertDatabase.medical,
        explanation: `[OFFLINE MODE] ${offlineExpertDatabase.medical.explanation}`,
      };
    }

    return {
      ...genericOfflineGuidance,
      explanation: `[OFFLINE MODE] Could not connect to remote AI. Showing general emergency instructions. ${genericOfflineGuidance.explanation}`,
    };
  }

  // 2. Online Mode - Call Google AI SDK
  try {
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `
Context: User is asking an emergency question. LocationContext: ${locationContext || 'Unknown'}.
Query: "${query}"
Generate disaster risk assessment and actionable guide. Remember, you are acting as Gemma.
`;

    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }, { text: prompt }] }
      ]
    });

    const text = result.response.text();
    return JSON.parse(text) as EmergencyGuidance;
  } catch (error) {
    console.error('Error calling Google AI SDK:', error);
    // Fall back to offline rule-based system
    return {
      ...genericOfflineGuidance,
      explanation: `[OFFLINE FALLBACK] Connected but API failed. ${genericOfflineGuidance.explanation}`,
    };
  }
}

// Emergency message translator
export async function translateMessage(message: string, targetLanguage: string): Promise<string> {
  const apiKey = localStorage.getItem('SENTINEL_GEMINI_KEY') || import.meta.env.VITE_GEMINI_KEY;

  if (!isOnline() || !apiKey) {
    // Simple offline dictionary for common phrases in common languages
    const phraseBook: Record<string, Record<string, string>> = {
      'i need help': {
        Hindi: 'मुझे मदद चाहिए (Mujhe madad chahiye)',
        Tamil: 'எனக்கு உதவி தேவை (Enakku udhavi thevai)',
        Malayalam: 'എനിക്ക് സഹായം വേണം (Enikku sahaayam venam)',
        Telugu: 'నాకు సహాయం కావాలి (Naaku sahaayam kaavaali)',
        Kannada: 'ನನಗೆ ಸಹಾಯ ಬೇಕು (Nanage sahaaya beku)',
      },
      'im trapped': {
        Hindi: 'मैं फंस गया हूँ (Main phans gaya hoon)',
        Tamil: 'நான் மாட்டிக்கொண்டேன் (Naan maattikkonden)',
        Malayalam: 'ഞാൻ കുടുങ്ങിപ്പോയി (Njan kudungippoyi)',
        Telugu: 'నేను ఇరుక్కుపోయాను (Nenu irukkupoyaanu)',
        Kannada: 'ನಾನು ಸಿಲುಕಿಕೊಂಡಿದ್ದೇನೆ (Naanu silukikondu iddene)',
      },
      'medical emergency': {
        Hindi: 'चिकित्सा आपातकाल (Chikitsa aapaatkaal)',
        Tamil: 'மருத்துவ அவசரநிலை (Maruthuva avasaranilai)',
        Malayalam: 'മെഡിക്കൽ എമർജൻസി (Medical Emergency)',
        Telugu: 'వైద్య అత్యవసర పరిస్థితి (Vaidya atyavasara paristhiti)',
        Kannada: 'ವೈದ್ಯಕೀಯ ತುರ್ತುಸ್ಥಿತಿ (Vaidyakeeya thurthusthithi)',
      }
    };

    const cleanMsg = message.toLowerCase().trim();
    for (const key in phraseBook) {
      if (cleanMsg.includes(key)) {
        return phraseBook[key][targetLanguage] || `[Offline] Translation not available for ${targetLanguage}`;
      }
    }

    return `[Offline] "${message}" (Connect to internet for full translations)`;
  }

  try {
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Translate the following emergency message into ${targetLanguage}. Output ONLY the translated text, preserving urgent tone: "${message}"`;
    const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
    return result.response.text().trim();
  } catch (error) {
    return `[Fallback] "${message}"`;
  }
}
