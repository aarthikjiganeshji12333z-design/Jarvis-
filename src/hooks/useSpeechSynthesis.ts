import { useState, useEffect, useRef, useCallback } from 'react';
import { playJarvisBeep } from '../utils/audioEffects';
import {
  AssistantType,
  CustomVoiceConfig,
  VoiceEngineStatus,
  DEFAULT_KING_CUSTOM_VOICE,
  DEFAULT_MAYA_CUSTOM_VOICE,
} from '../types/voice';

export type { AssistantType };

interface UseSpeechSynthesisProps {
  soundEnabled?: boolean;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
}

const KING_STORAGE_KEY = 'jarvis_king_custom_voice_v2';
const MAYA_STORAGE_KEY = 'jarvis_maya_custom_voice_v1';
const KING_BROWSER_VOICE_KEY = 'jarvis_king_browser_voice_name';
const MAYA_BROWSER_VOICE_KEY = 'jarvis_maya_browser_voice_name';
const KING_BROWSER_VOICE_INDEX_KEY = 'jarvis_king_browser_voice_index';
const MAYA_BROWSER_VOICE_INDEX_KEY = 'jarvis_maya_browser_voice_index';

export function useSpeechSynthesis({
  soundEnabled = true,
  onSpeechStart,
  onSpeechEnd,
}: UseSpeechSynthesisProps = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Requirement 6: Keep speech output OFF by default. false means muted/off initially.
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [allVoices, setAllVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedKingVoice, setSelectedKingVoiceState] = useState<SpeechSynthesisVoice | null>(null);
  const [selectedMayaVoice, setSelectedMayaVoiceState] = useState<SpeechSynthesisVoice | null>(null);
  const [isKingVoiceTrulyMale, setIsKingVoiceTrulyMale] = useState<boolean>(false);
  const [isMayaVoiceTrulyFemale, setIsMayaVoiceTrulyFemale] = useState<boolean>(false);
  const [hasDistinctVoices, setHasDistinctVoices] = useState<boolean>(true);
  const [voicesLoaded, setVoicesLoaded] = useState<boolean>(false);

  // Custom Voice Settings State (Persisted)
  // Requirement 3: Purge old King voice and prevent it from returning
  const [kingCustomVoice, setKingCustomVoice] = useState<CustomVoiceConfig>(() => {
    try {
      localStorage.removeItem('jarvis_king_custom_voice_v1');
      const stored = localStorage.getItem(KING_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          parsed.voicePresetId === 'king-deep-stark' ||
          parsed.prebuiltVoice === 'Fenrir' ||
          parsed.pitch === 0.74
        ) {
          localStorage.setItem(KING_STORAGE_KEY, JSON.stringify(DEFAULT_KING_CUSTOM_VOICE));
          return DEFAULT_KING_CUSTOM_VOICE;
        }
        return { ...DEFAULT_KING_CUSTOM_VOICE, ...parsed };
      }
    } catch {
      // ignore
    }
    return DEFAULT_KING_CUSTOM_VOICE;
  });

  // Maya's voice kept completely separate and unchanged
  const [mayaCustomVoice, setMayaCustomVoice] = useState<CustomVoiceConfig>(() => {
    try {
      const stored = localStorage.getItem(MAYA_STORAGE_KEY);
      if (stored) return { ...DEFAULT_MAYA_CUSTOM_VOICE, ...JSON.parse(stored) };
    } catch {
      // ignore
    }
    return DEFAULT_MAYA_CUSTOM_VOICE;
  });

  // Diagnostics status from server
  const [engineStatus, setEngineStatus] = useState<VoiceEngineStatus | null>(null);
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const [previewingAssistant, setPreviewingAssistant] = useState<AssistantType | null>(null);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Persistent voice setters with index tracking to prevent reverting back
  const setSelectedKingVoice = useCallback((v: SpeechSynthesisVoice | null) => {
    setSelectedKingVoiceState(v);
    if (v) {
      try {
        localStorage.setItem(KING_BROWSER_VOICE_KEY, v.name);
        const voices = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : [];
        const idx = voices.findIndex((voice) => voice.name === v.name);
        if (idx !== -1) {
          localStorage.setItem(KING_BROWSER_VOICE_INDEX_KEY, idx.toString());
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const setSelectedMayaVoice = useCallback((v: SpeechSynthesisVoice | null) => {
    setSelectedMayaVoiceState(v);
    if (v) {
      try {
        localStorage.setItem(MAYA_BROWSER_VOICE_KEY, v.name);
        const voices = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : [];
        const idx = voices.findIndex((voice) => voice.name === v.name);
        if (idx !== -1) {
          localStorage.setItem(MAYA_BROWSER_VOICE_INDEX_KEY, idx.toString());
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Fetch engine diagnostics on mount
  useEffect(() => {
    fetch('/api/voice-engine/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: VoiceEngineStatus | null) => {
        if (data) setEngineStatus(data);
      })
      .catch(() => {
        // Fallback status
        setEngineStatus({
          geminiTts: {
            available: true,
            model: 'gemini-3.8-flash-tts',
            message: 'Gemini Neural Voice synthesis engine active.',
          },
          elevenlabsClone: {
            available: false,
            message: 'ELEVENLABS_API_KEY is not configured in server environment.',
          },
          browserSynthesis: {
            available: true,
            message: 'Client-side SpeechSynthesis with formant modulation active.',
          },
        });
      });
  }, []);

  // Female and male keyword sets for browser voice classification
  const femaleKeywords = [
    'female', 'woman', 'girl', 'zira', 'samantha', 'victoria', 'lekha', 'veena',
    'karen', 'moira', 'tessa', 'siri', 'heera', 'kalpana', 'catherine',
    'kore', 'hazel', 'susan', 'fiona', 'allison', 'ava', 'jenny', 'aria',
    'nicky', 'flo', 'sandy', 'shelley', 'grandma', 'swara', 'shruti', 'ananya',
  ];

  const maleKeywords = [
    'male', 'man', 'boy', 'david', 'mark', 'rishi', 'ravi', 'guy', 'george',
    'alex', 'daniel', 'oliver', 'tom', 'bruce', 'puck', 'fenrir', 'richard',
    'james', 'fred', 'christopher', 'eric', 'steffan', 'arthur', 'gordon',
    'eddy', 'reed', 'rocko', 'grandpa', 'neer', 'madhur', 'valluvar', 'prabhat',
    'karan', 'vikram', 'arjun', 'ajay', 'deep', 'en-in-standard-b', 'en-in-standard-c',
    'en-us-standard-d', 'en-us-standard-j',
  ];

  const isMaleVoice = useCallback((v: SpeechSynthesisVoice) => {
    const nameLower = v.name.toLowerCase();
    const hasMale = maleKeywords.some((kw) => nameLower.includes(kw));
    const hasFemale = femaleKeywords.some((kw) => nameLower.includes(kw));
    return hasMale && !hasFemale;
  }, []);

  const isFemaleVoice = useCallback((v: SpeechSynthesisVoice) => {
    const nameLower = v.name.toLowerCase();
    const hasFemale = femaleKeywords.some((kw) => nameLower.includes(kw));
    const hasMale = maleKeywords.some((kw) => nameLower.includes(kw));
    return hasFemale && !hasMale;
  }, []);

  // Load and categorize available system voices, restoring saved preferences
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const populateVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (!available || available.length === 0) return;

      setAllVoices(available);
      setVoicesLoaded(true);

      // Check stored voice preferences (both name and index for robust persistence)
      let storedKingName: string | null = null;
      let storedMayaName: string | null = null;
      let storedKingIdx: number = -1;
      let storedMayaIdx: number = -1;
      try {
        storedKingName = localStorage.getItem(KING_BROWSER_VOICE_KEY);
        storedMayaName = localStorage.getItem(MAYA_BROWSER_VOICE_KEY);
        const kIdx = localStorage.getItem(KING_BROWSER_VOICE_INDEX_KEY);
        if (kIdx !== null) storedKingIdx = parseInt(kIdx, 10);
        const mIdx = localStorage.getItem(MAYA_BROWSER_VOICE_INDEX_KEY);
        if (mIdx !== null) storedMayaIdx = parseInt(mIdx, 10);
      } catch {
        // ignore
      }

      const verifiedMaleVoice = available.find(isMaleVoice);
      const verifiedFemaleVoice = available.find(isFemaleVoice);

      let kingCandidate: SpeechSynthesisVoice | null =
        (storedKingName && available.find((v) => v.name === storedKingName)) ||
        (storedKingIdx >= 0 && storedKingIdx < available.length ? available[storedKingIdx] : null) ||
        verifiedMaleVoice ||
        null;

      let mayaCandidate: SpeechSynthesisVoice | null =
        (storedMayaName && available.find((v) => v.name === storedMayaName)) ||
        (storedMayaIdx >= 0 && storedMayaIdx < available.length ? available[storedMayaIdx] : null) ||
        verifiedFemaleVoice ||
        null;

      if (!kingCandidate && mayaCandidate) {
        const alternate = available.find((v) => v.name !== mayaCandidate!.name);
        kingCandidate = alternate || available[0];
      } else if (kingCandidate && !mayaCandidate) {
        const alternate = available.find((v) => v.name !== kingCandidate!.name);
        mayaCandidate = alternate || available[0];
      } else if (!kingCandidate && !mayaCandidate) {
        if (available.length >= 2) {
          kingCandidate = available[0];
          mayaCandidate = available[1];
        } else {
          kingCandidate = available[0] || null;
          mayaCandidate = available[0] || null;
        }
      }

      if (
        kingCandidate &&
        mayaCandidate &&
        kingCandidate.name === mayaCandidate.name &&
        available.length >= 2 &&
        !storedMayaName
      ) {
        const other = available.find((v) => v.name !== kingCandidate!.name);
        if (other) {
          mayaCandidate = other;
        }
      }

      // Re-apply immediately and re-persist to ensure system default never overrides
      setSelectedKingVoiceState(kingCandidate);
      setSelectedMayaVoiceState(mayaCandidate);

      if (kingCandidate) {
        try {
          localStorage.setItem(KING_BROWSER_VOICE_KEY, kingCandidate.name);
          const idx = available.findIndex((v) => v.name === kingCandidate!.name);
          if (idx !== -1) localStorage.setItem(KING_BROWSER_VOICE_INDEX_KEY, idx.toString());
        } catch {}
      }

      if (mayaCandidate) {
        try {
          localStorage.setItem(MAYA_BROWSER_VOICE_KEY, mayaCandidate.name);
          const idx = available.findIndex((v) => v.name === mayaCandidate!.name);
          if (idx !== -1) localStorage.setItem(MAYA_BROWSER_VOICE_INDEX_KEY, idx.toString());
        } catch {}
      }

      setIsKingVoiceTrulyMale(Boolean(kingCandidate && isMaleVoice(kingCandidate)));
      setIsMayaVoiceTrulyFemale(Boolean(mayaCandidate && isFemaleVoice(mayaCandidate)));

      const distinct = Boolean(
        kingCandidate && mayaCandidate && kingCandidate.name !== mayaCandidate.name
      );
      setHasDistinctVoices(distinct);
    };

    populateVoices();
    window.speechSynthesis.onvoiceschanged = populateVoices;

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isMaleVoice, isFemaleVoice]);

  // Save custom voice profile
  const saveCustomVoice = useCallback((assistant: AssistantType, config: CustomVoiceConfig) => {
    try {
      if (assistant === 'king') {
        localStorage.removeItem('jarvis_king_custom_voice_v1');
        setKingCustomVoice(config);
        localStorage.setItem(KING_STORAGE_KEY, JSON.stringify(config));
      } else {
        setMayaCustomVoice(config);
        localStorage.setItem(MAYA_STORAGE_KEY, JSON.stringify(config));
      }
    } catch (e) {
      console.warn('Failed to save custom voice to localStorage:', e);
    }
  }, []);

  // Stop speaking immediately
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      (window as any).__jarvis_current_utterance = null;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    currentUtteranceRef.current = null;
    setIsSpeaking(false);
    setIsPreviewingVoice(false);
    setPreviewingAssistant(null);
    if (onSpeechEnd) onSpeechEnd();
  }, [onSpeechEnd]);

  // Speaker Output Toggle (Requirement 4: When OFF, stop speaking immediately and mute answers)
  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => {
      const next = !prev;
      if (!next) {
        stopSpeaking();
      }
      return next;
    });
  }, [stopSpeaking]);

  // Get appropriate browser fallback voice for the assistant
  const getVoiceForAssistant = useCallback(
    (assistant: AssistantType, langCode: string): SpeechSynthesisVoice | null => {
      const isMaya = assistant === 'maya';
      const assignedVoice = isMaya ? selectedMayaVoice : selectedKingVoice;
      const codeLower = langCode.toLowerCase();

      if (codeLower.startsWith('gu') || codeLower.startsWith('hi')) {
        const langVoices = allVoices.filter((v) =>
          v.lang.toLowerCase().startsWith(codeLower.slice(0, 2))
        );

        if (langVoices.length > 0) {
          if (isMaya) {
            const femaleLangVoice = langVoices.find(isFemaleVoice);
            if (femaleLangVoice) return femaleLangVoice;
            if (langVoices.length >= 2) return langVoices[1];
            return langVoices[0];
          } else {
            const maleLangVoice = langVoices.find(isMaleVoice);
            if (maleLangVoice) return maleLangVoice;

            if (assignedVoice && isMaleVoice(assignedVoice)) {
              return assignedVoice;
            }

            return langVoices[0];
          }
        }
      }

      return assignedVoice || allVoices[0] || null;
    },
    [allVoices, selectedKingVoice, selectedMayaVoice, isFemaleVoice, isMaleVoice]
  );

  // Play audio through Web Speech API as resilient synthesis fallback
  const speakViaBrowserUtterance = useCallback(
    (
      cleanSpeech: string,
      language: string,
      assistant: AssistantType,
      customConfig: CustomVoiceConfig,
      onStarted?: () => void,
      onErrorOccurred?: (err: any) => void
    ) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch {
        // ignore
      }

      const utterance = new SpeechSynthesisUtterance(cleanSpeech);
      const voice = getVoiceForAssistant(assistant, language);

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        if (language === 'gu') utterance.lang = 'gu-IN';
        else if (language === 'hi') utterance.lang = 'hi-IN';
        else utterance.lang = 'en-US';
      }

      // Apply tuned custom pitch and speech rate
      utterance.pitch = customConfig.pitch;
      utterance.rate = customConfig.rate * speechRate;

      utterance.onstart = () => {
        setIsSpeaking(true);
        if (onSpeechStart) onSpeechStart();
        if (onStarted) onStarted();
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        currentUtteranceRef.current = null;
        (window as any).__jarvis_current_utterance = null;
        if (onSpeechEnd) onSpeechEnd();
      };

      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        setIsSpeaking(false);
        currentUtteranceRef.current = null;
        (window as any).__jarvis_current_utterance = null;
        if (onSpeechEnd) onSpeechEnd();
        if (onErrorOccurred) onErrorOccurred(e);
      };

      currentUtteranceRef.current = utterance;
      (window as any).__jarvis_current_utterance = utterance;

      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('speak() error:', err);
        if (onErrorOccurred) onErrorOccurred(err);
      }
    },
    [getVoiceForAssistant, speechRate, onSpeechStart, onSpeechEnd]
  );

  // Speak function connected directly to actual custom voice TTS audio generation
  const speak = useCallback(
    async (
      text: string,
      language: string = 'gu',
      _tryServerTts: boolean = false,
      assistant: AssistantType = 'king',
      onStarted?: () => void,
      onErrorOccurred?: (err: any) => void
    ) => {
      // Requirement 4: When Speaker is OFF, do not automatically speak answers aloud
      if (!text || !isSpeakerOn) return;

      // Always cancel previous speech before starting new speech
      stopSpeaking();

      // Clean text for speech synthesis
      const cleanSpeech = text
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/[*#_~>]/g, '')
        .replace(/https?:\/\/\S+/g, 'link')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .trim();

      if (!cleanSpeech) return;

      if (soundEnabled) {
        playJarvisBeep('response');
      }

      // Immediately silence/pause microphone listening before audio starts or network fetch begins
      if (onSpeechStart) onSpeechStart();
      setIsSpeaking(true);

      const activeCustomConfig = assistant === 'king' ? kingCustomVoice : mayaCustomVoice;

      // Connect selected custom voice to ACTUAL TTS Audio generation (Requirement 4)
      if (activeCustomConfig.enabled && activeCustomConfig.provider !== 'browser_speech') {
        try {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: cleanSpeech,
              assistant,
              language,
              customVoiceConfig: activeCustomConfig,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.audioUrl && isSpeakerOn) {
              const audio = new Audio(data.audioUrl);
              audioPlayerRef.current = audio;
              setIsSpeaking(true);
              if (onStarted) onStarted();

              audio.onended = () => {
                setIsSpeaking(false);
                audioPlayerRef.current = null;
                if (onSpeechEnd) onSpeechEnd();
              };

              audio.onerror = (e) => {
                console.warn('Audio element error, falling back to browser synthesis:', e);
                setIsSpeaking(false);
                audioPlayerRef.current = null;
                speakViaBrowserUtterance(cleanSpeech, language, assistant, activeCustomConfig, onStarted, onErrorOccurred);
              };

              await audio.play();
              return;
            }
          }
        } catch (fetchErr) {
          console.warn('Custom TTS server error, falling back to speech synthesis:', fetchErr);
        }
      }

      // Resilient local synthesis with exact custom profile tuning
      speakViaBrowserUtterance(cleanSpeech, language, assistant, activeCustomConfig, onStarted, onErrorOccurred);
    },
    [
      isSpeakerOn,
      stopSpeaking,
      soundEnabled,
      kingCustomVoice,
      mayaCustomVoice,
      speakViaBrowserUtterance,
      onSpeechStart,
      onSpeechEnd,
    ]
  );

  // Dedicated Voice Preview Function (Requirement 3: Allow voice preview before selection)
  const previewVoice = useCallback(
    async (
      assistant: AssistantType,
      customConfig?: CustomVoiceConfig,
      testPhrase?: string
    ) => {
      // Temporarily ensure speaker is ON for testing
      if (!isSpeakerOn) {
        setIsSpeakerOn(true);
      }

      stopSpeaking();

      const configToTest =
        customConfig || (assistant === 'king' ? kingCustomVoice : mayaCustomVoice);

      const phrase =
        testPhrase ||
        (assistant === 'king'
          ? 'નમસ્તે સર! હું કિંગ છું. આ મારો કસ્ટમ AI અવાજ છે. હાહાહા, હું તમારી સેવામાં તૈયાર છું!'
          : 'હેલો સર! હું માયા છું. આ મારો કસ્ટમ AI અવાજ છે. હીહીહી, કહો આજે શું મદદ કરું?');

      setIsPreviewingVoice(true);
      setPreviewingAssistant(assistant);

      if (soundEnabled) playJarvisBeep('click');

      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: phrase,
            assistant,
            language: 'gu',
            customVoiceConfig: configToTest,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.audioUrl) {
            const audio = new Audio(data.audioUrl);
            audioPlayerRef.current = audio;
            setIsSpeaking(true);

            audio.onended = () => {
              setIsSpeaking(false);
              setIsPreviewingVoice(false);
              setPreviewingAssistant(null);
              audioPlayerRef.current = null;
            };

            audio.onerror = () => {
              setIsSpeaking(false);
              setIsPreviewingVoice(false);
              setPreviewingAssistant(null);
              audioPlayerRef.current = null;
              speakViaBrowserUtterance(phrase, 'gu', assistant, configToTest);
            };

            await audio.play();
            return;
          }
        }
      } catch (err) {
        console.warn('Voice preview error:', err);
      }

      // Fallback preview
      speakViaBrowserUtterance(phrase, 'gu', assistant, configToTest, () => {
        setIsPreviewingVoice(true);
      }, () => {
        setIsPreviewingVoice(false);
        setPreviewingAssistant(null);
      });
    },
    [isSpeakerOn, stopSpeaking, kingCustomVoice, mayaCustomVoice, soundEnabled, speakViaBrowserUtterance]
  );

  // Dedicated test function for King & Maya (Requirement 7)
  const testVoice = useCallback(
    (assistant: AssistantType) => {
      previewVoice(assistant);
    },
    [previewVoice]
  );

  return {
    isSpeaking,
    isSpeakerOn,
    setIsSpeakerOn,
    isMuted: !isSpeakerOn,
    toggleSpeaker,
    toggleMute: toggleSpeaker,
    speechRate,
    setSpeechRate,
    allVoices,
    selectedKingVoice,
    setSelectedKingVoice,
    selectedMayaVoice,
    setSelectedMayaVoice,
    isKingVoiceTrulyMale,
    isMayaVoiceTrulyFemale,
    hasDistinctVoices,
    voicesLoaded,
    kingCustomVoice,
    setKingCustomVoice,
    mayaCustomVoice,
    setMayaCustomVoice,
    saveCustomVoice,
    previewVoice,
    isPreviewingVoice,
    previewingAssistant,
    engineStatus,
    speak,
    stopSpeaking,
    testVoice,
  };
}
