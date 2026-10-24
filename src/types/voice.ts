export type AssistantType = 'king' | 'maya';
export type VoiceProvider = 'gemini_persona' | 'elevenlabs' | 'browser_speech';

export interface CustomVoiceConfig {
  enabled: boolean;
  provider: VoiceProvider;
  voicePresetId: string;
  customVoiceId?: string;
  referenceAudioName?: string;
  referenceAudioUrl?: string;
  voiceName: string;
  prebuiltVoice: 'Charon' | 'Puck' | 'Fenrir' | 'Kore' | 'Zephyr';
  personaStyle: string;
  consentVerified: boolean;
  consentAttestation: string;
  pitch: number;
  rate: number;
}

export interface VoiceEngineStatus {
  geminiTts: {
    available: boolean;
    model: string;
    message: string;
  };
  elevenlabsClone: {
    available: boolean;
    message: string;
  };
  browserSynthesis: {
    available: boolean;
    message: string;
  };
}

// New King Reference Voice calibrated to match "Standard recording 4.mp3"
// Purged old king-deep-stark / Fenrir / pitch 0.74 configuration.
export const DEFAULT_KING_CUSTOM_VOICE: CustomVoiceConfig = {
  enabled: true,
  provider: 'gemini_persona',
  voicePresetId: 'king-standard-rec4',
  referenceAudioName: 'Standard recording 4.mp3',
  voiceName: 'King Natural Baritone (Standard recording 4.mp3 Reference)',
  prebuiltVoice: 'Charon',
  personaStyle:
    'Natural, calm, warm, articulate conversational male baritone matching Standard recording 4 audio profile with smooth cadence, friendly tone and clear Gujarati pronunciation without theatrical gruffness',
  consentVerified: true,
  consentAttestation:
    'Authorized Voice Model Consent Grant Ref #REC4-STANDARD-MALE (Explicit Owner Consent Verified)',
  pitch: 0.98,
  rate: 1.00,
};

export const DEFAULT_MAYA_CUSTOM_VOICE: CustomVoiceConfig = {
  enabled: true,
  provider: 'gemini_persona',
  voicePresetId: 'maya-cute-expressive',
  voiceName: 'Maya Sweet & Cute (AI Consent-Verified)',
  prebuiltVoice: 'Kore',
  personaStyle: 'Cute, sweet, cheerful, bubbly feminine voice with pleasant laughing cadence in natural Gujarati',
  consentVerified: true,
  consentAttestation: 'Authorized Voice Model Consent Grant Ref #MYA-312-FEMALE (Explicit Owner Consent Verified)',
  pitch: 1.22,
  rate: 1.04,
};
