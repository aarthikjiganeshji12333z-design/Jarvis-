import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  Settings,
  Trash2,
  ExternalLink,
  Battery,
  Wifi,
  Radio,
  Smartphone,
  Crown,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  Sliders,
} from 'lucide-react';
import { ArcReactorCore } from './components/ArcReactorCore';
import { AppLauncher, AndroidAppItem } from './components/AppLauncher';
import { CameraScannerModal } from './components/CameraScannerModal';
import { HudTimerModal } from './components/HudTimerModal';
import { HudCalculatorModal } from './components/HudCalculatorModal';
import { CustomVoiceModal } from './components/CustomVoiceModal';
import { useSpeechRecognition, LanguageMode } from './hooks/useSpeechRecognition';
import { useSpeechSynthesis, AssistantType } from './hooks/useSpeechSynthesis';
import { playJarvisBeep, triggerHaptic } from './utils/audioEffects';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  assistant?: AssistantType;
  text: string;
  speechText?: string;
  timestamp: string;
  language?: string;
  action?: {
    type: string;
    app: string;
    targetUrl: string;
    label: string;
  } | null;
  suggestions?: string[];
}

export const KING_AVATAR = '/src/assets/images/king_avatar_1792676495636.jpg';
export const MAYA_AVATAR = '/src/assets/images/maya_avatar_1792676510909.jpg';

const ACTIVE_ASSISTANT_KEY = 'jarvis_active_assistant';

export default function App() {
  const [activeAssistant, setActiveAssistantState] = useState<AssistantType>(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_ASSISTANT_KEY);
      if (stored === 'king' || stored === 'maya') return stored;
    } catch {
      // ignore
    }
    return 'king';
  });

  const setActiveAssistant = useCallback((assistant: AssistantType) => {
    setActiveAssistantState(assistant);
    try {
      localStorage.setItem(ACTIVE_ASSISTANT_KEY, assistant);
    } catch {
      // ignore
    }
  }, []);

  // Strict Gujarati language only
  const [languageMode] = useState<LanguageMode>('gu');

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-init',
      sender: 'assistant',
      assistant: 'king',
      text: 'નમસ્તે બોસ, કેમ છો?\n\nહું કિંગ (King) છું, તમારો મુખ્ય AI વૉઇસ સહાયક. માયા (Maya) પણ હાજર છે.\n\n• "કિંગ" અથવા "માયા" બોલીને વેક કરો\n• સહાયક બદલવા "માયાને ચાલુ કર" અથવા "અસિસ્ટન્ટ બદલો" કહો\n• ફોન કંટ્રોલ આદેશો: "એપ ખોલો", "સેટિંગ્સ ખોલ", "સ્ક્રીન ચાલુ કર", "મને સમય જણાવ".',
      speechText: 'નમસ્તે સર, હું કિંગ છું! તમારો સહાયક તૈયાર છે. બોલો શું મદદ કરું?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      language: 'gu',
      suggestions: [
        'મને સમય જણાવ',
        'મને એક જોક કહો',
        'YouTube ખોલો',
        'માયાને ચાલુ કર',
        'સ્ક્રીન ચાલુ કર',
        'ફોનની સેટિંગ્સ ખોલ',
      ],
    },
  ]);

  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [useNeuralTts, setUseNeuralTts] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [batteryLevel, setBatteryLevel] = useState<number>(98);

  // Modals
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPlatformInfoOpen, setIsPlatformInfoOpen] = useState(false);
  const [isCustomVoiceModalOpen, setIsCustomVoiceModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const hasPlayedWelcomeRef = useRef(false);
  const isSwitchingRef = useRef(false);
  const lastWakeSpokenRef = useRef(0);

  // References to hook callbacks to avoid circular dependencies
  const pauseListeningRef = useRef<() => void>(() => {});
  const resumeListeningRef = useRef<() => void>(() => {});

  // Speech Synthesis Hook (Gender & Assistant aware + Custom AI Voices)
  const {
    isSpeaking,
    isSpeakerOn,
    setIsSpeakerOn,
    toggleSpeaker,
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
  } = useSpeechSynthesis({
    soundEnabled,
    onSpeechStart: () => {
      pauseListeningRef.current();
    },
    onSpeechEnd: () => {
      resumeListeningRef.current();
    },
  });

  // Live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Battery status if supported
  useEffect(() => {
    if (typeof navigator !== 'undefined' && (navigator as any).getBattery) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      }).catch(() => {});
    }
  }, []);

  // On opening app, say welcome ONCE ONLY (strictly guarded against repeated playback)
  const triggerWelcomeGreeting = useCallback(() => {
    try {
      if (sessionStorage.getItem('jarvis_app_welcome_played_v2')) return;
    } catch {
      // ignore
    }
    if (hasPlayedWelcomeRef.current) return;
    hasPlayedWelcomeRef.current = true;
    try {
      sessionStorage.setItem('jarvis_app_welcome_played_v2', 'true');
    } catch {
      // ignore
    }

    speak(
      'નમસ્તે સર, હું કિંગ છું! તમારો સહાયક તૈયાર છે. બોલો શું મદદ કરું?',
      'gu',
      false,
      'king',
      () => {},
      (err) => {
        if (err?.error === 'not-allowed') {
          hasPlayedWelcomeRef.current = false;
          try {
            sessionStorage.removeItem('jarvis_app_welcome_played_v2');
          } catch {
            // ignore
          }
        }
      }
    );
  }, [speak]);

  useEffect(() => {
    const timer = setTimeout(() => {
      triggerWelcomeGreeting();
    }, 700);
    return () => clearTimeout(timer);
  }, [triggerWelcomeGreeting]);

  const handleUserInteraction = () => {
    if (!hasPlayedWelcomeRef.current) {
      triggerWelcomeGreeting();
    }
  };

  // Wake Word responses: King -> "બોલો બોસ!", Maya -> "બોલો જી!"
  const handleWakeGreeting = useCallback(
    (greetedAssistant: AssistantType) => {
      const now = Date.now();
      if (now - lastWakeSpokenRef.current < 4000) return;
      lastWakeSpokenRef.current = now;

      // Cancel previous speech immediately
      stopSpeaking();

      // If user addressed the other assistant, switch cleanly
      if (greetedAssistant !== activeAssistant) {
        setActiveAssistant(greetedAssistant);
      }

      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const greetingReply = greetedAssistant === 'king' ? 'બોલો બોસ!' : 'બોલો જી!';

      const newMsg: ChatMessage = {
        id: 'greet-' + Date.now(),
        sender: 'assistant',
        assistant: greetedAssistant,
        text: greetingReply,
        speechText: greetingReply,
        timestamp,
        language: 'gu',
        suggestions: [
          'મને સમય જણાવ',
          'મને એક જોક કહો',
          'YouTube ખોલો',
          'સ્ક્રીન ચાલુ કર',
          'અસિસ્ટન્ટ બદલો',
        ],
      };

      setMessages((prev) => [...prev, newMsg]);

      // Speak aloud only if speaker output is ON
      if (isSpeakerOn) {
        speak(greetingReply, 'gu', false, greetedAssistant);
      }
    },
    [activeAssistant, isSpeakerOn, speak, stopSpeaking, setActiveAssistant]
  );

  // Switch between King and Maya assistants
  const handleSwitchAssistant = useCallback(
    (targetAssistant?: AssistantType) => {
      if (isSwitchingRef.current) return;
      isSwitchingRef.current = true;

      // Immediately cancel any previous speech
      stopSpeaking();

      playJarvisBeep('response');
      triggerHaptic([40, 20, 40]);

      const nextAssistant: AssistantType =
        targetAssistant || (activeAssistant === 'king' ? 'maya' : 'king');

      setActiveAssistant(nextAssistant);

      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Spoken confirmation in authentic Gujarati:
      // King: "જી બોસ, કિંગ હાજર છે!"
      // Maya: "નમસ્તે સર! માયા તમારી સેવામાં હાજર છે."
      const vocalAnnouncement =
        nextAssistant === 'king'
          ? 'જી બોસ, કિંગ હાજર છે!'
          : 'નમસ્તે સર! માયા તમારી સેવામાં હાજર છે.';

      const switchNotice: ChatMessage = {
        id: 'switch-' + Date.now(),
        sender: 'assistant',
        assistant: nextAssistant,
        text: vocalAnnouncement,
        speechText: vocalAnnouncement,
        timestamp,
        language: 'gu',
        suggestions: [
          'મને એક જોક કહો',
          'મને સમય જણાવ',
          'YouTube ખોલો',
          'સ્ક્રીન ચાલુ કર',
          'અસિસ્ટન્ટ બદલો',
        ],
      };

      setMessages((prev) => [...prev, switchNotice]);

      // Announce newly selected assistant ONLY if speaker output is ON
      if (isSpeakerOn) {
        speak(vocalAnnouncement, 'gu', useNeuralTts, nextAssistant);
      }

      setTimeout(() => {
        isSwitchingRef.current = false;
      }, 1000);
    },
    [activeAssistant, isSpeakerOn, speak, stopSpeaking, useNeuralTts, setActiveAssistant]
  );

  // Send prompt to JARVIS Core with Gujarati Phone Voice Control interceptor
  const handleSendPrompt = useCallback(
    async (promptText: string, _viaWakeWord: boolean = false) => {
      const trimmed = promptText.trim();
      if (!trimmed || isProcessing) return;

      handleUserInteraction();
      stopSpeaking();

      const lower = trimmed.toLowerCase();
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // 1. Assistant Switching Commands
      const isSwitchToMaya =
        lower.includes('switch to maya') ||
        trimmed.includes('માયા સાથે સ્વિચ') ||
        trimmed.includes('માયાને ચાલુ કર') ||
        trimmed.includes('માયા ચાલુ કર') ||
        trimmed.includes('માયા પર સ્વિચ') ||
        trimmed.includes('માયાને બોલાવો');

      const isSwitchToKing =
        lower.includes('switch to king') ||
        trimmed.includes('કિંગ સાથે સ્વિચ') ||
        trimmed.includes('કિંગને ચાલુ કર') ||
        trimmed.includes('કિંગ ચાલુ કર') ||
        trimmed.includes('કિંગ પર સ્વિચ') ||
        trimmed.includes('કિંગને બોલાવો');

      const isGeneralSwitch =
        lower.includes('switch assistant') ||
        lower.includes('change assistant') ||
        trimmed.includes('અસિસ્ટન્ટ બદલો') ||
        trimmed.includes('આસિસ્ટન્ટ બદલો') ||
        trimmed.includes('સહાયક બદલો') ||
        trimmed.includes('સ્વિચ અસિસ્ટન્ટ');

      if (isSwitchToMaya) {
        handleSwitchAssistant('maya');
        setTextInput('');
        return;
      }
      if (isSwitchToKing) {
        handleSwitchAssistant('king');
        setTextInput('');
        return;
      }
      if (isGeneralSwitch) {
        handleSwitchAssistant();
        setTextInput('');
        return;
      }

      // 2. Phone Voice Control: "પાછા જા" / "બેક" (Close open modals)
      if (
        trimmed.includes('પાછા જા') ||
        trimmed.includes('પાછળ જાઓ') ||
        trimmed.includes('પાછા જાવ') ||
        trimmed.includes('બેક જા') ||
        lower === 'back' ||
        trimmed.includes('મોડલ બંધ કર') ||
        trimmed === 'બંધ કર'
      ) {
        setIsCameraOpen(false);
        setIsTimerOpen(false);
        setIsCalculatorOpen(false);
        setIsSettingsOpen(false);
        setIsPlatformInfoOpen(false);
        setIsCustomVoiceModalOpen(false);

        const reply = 'પાછા આવી ગયા છીએ.';
        const backMsg: ChatMessage = {
          id: 'back-' + Date.now(),
          sender: 'assistant',
          assistant: activeAssistant,
          text: reply,
          speechText: reply,
          timestamp,
          language: 'gu',
        };
        setMessages((prev) => [...prev, backMsg]);
        if (isSpeakerOn) speak(reply, 'gu', false, activeAssistant);
        setTextInput('');
        return;
      }

      // 3. Phone Voice Control: "ફોનની સેટિંગ્સ ખોલ" / "સેટિંગ ખોલ"
      if (
        trimmed.includes('સેટિંગ્સ ખોલ') ||
        trimmed.includes('સેટિંગ્સ ખોલો') ||
        trimmed.includes('સેટિંગ ખોલ') ||
        trimmed.includes('સેટિંગ ખોલો') ||
        trimmed === 'સેટિંગ્સ' ||
        lower.includes('open settings')
      ) {
        setIsSettingsOpen(true);
        const reply =
          activeAssistant === 'king'
            ? 'જી બોસ, સેટિંગ્સ ખોલી રહ્યો છું.'
            : 'જી સર, સેટિંગ્સ ખોલી રહી છું.';
        const settingMsg: ChatMessage = {
          id: 'set-' + Date.now(),
          sender: 'assistant',
          assistant: activeAssistant,
          text: reply,
          speechText: reply,
          timestamp,
          language: 'gu',
        };
        setMessages((prev) => [...prev, settingMsg]);
        if (isSpeakerOn) speak(reply, 'gu', false, activeAssistant);
        setTextInput('');
        return;
      }

      // 4. Phone Voice Control: "સ્ક્રીન ચાલુ કર" / "સ્ક્રીન ઓન રાખ" (Wake Lock API)
      if (
        trimmed.includes('સ્ક્રીન ચાલુ કર') ||
        trimmed.includes('સ્ક્રીન ચાલુ રાખ') ||
        trimmed.includes('સ્ક્રીન ઓન રાખ') ||
        lower.includes('screen wake') ||
        lower.includes('keep screen on')
      ) {
        let reply = '';
        if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
          try {
            await (navigator as any).wakeLock.request('screen');
            reply = 'સ્ક્રીન વેક લોક સક્રિય કર્યું છે. સ્ક્રીન સતત ચાલુ રહેશે.';
          } catch {
            reply = 'સ્ક્રીન વેક લોક શરૂ કરી શકાયું નથી.';
          }
        } else {
          reply = 'તમારા બ્રાઉઝરમાં સ્ક્રીન વેક લોક સપોર્ટેડ નથી.';
        }

        const wakeMsg: ChatMessage = {
          id: 'wake-' + Date.now(),
          sender: 'assistant',
          assistant: activeAssistant,
          text: reply,
          speechText: reply,
          timestamp,
          language: 'gu',
        };
        setMessages((prev) => [...prev, wakeMsg]);
        if (isSpeakerOn) speak(reply, 'gu', false, activeAssistant);
        setTextInput('');
        return;
      }

      // 5. Phone Voice Control: "મને સમય જણાવ" / "સમય શું થયો" / "કેટલા વાગ્યા"
      if (
        trimmed.includes('સમય જણાવ') ||
        trimmed.includes('સમય શું થયો') ||
        trimmed.includes('કેટલા વાગ્યા') ||
        trimmed.includes('સમય બતાવ') ||
        trimmed.includes('ટાઇમ શું થયો') ||
        lower.includes('what time')
      ) {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const part =
          hours >= 12
            ? hours >= 17
              ? 'સાંજના'
              : 'બપોરના'
            : hours >= 4
            ? 'સવારના'
            : 'રાતના';
        const displayH = hours % 12 || 12;
        const timeReply = `અત્યારે ${part} ${displayH} વાગીને ${minutes} મિનિટ થઈ છે.`;

        const timeMsg: ChatMessage = {
          id: 'time-' + Date.now(),
          sender: 'assistant',
          assistant: activeAssistant,
          text: timeReply,
          speechText: timeReply,
          timestamp,
          language: 'gu',
          suggestions: ['YouTube ખોલો', 'મને એક જોક કહો', 'આજનું હવામાન કેવું છે?'],
        };
        setMessages((prev) => [...prev, timeMsg]);
        if (isSpeakerOn) speak(timeReply, 'gu', false, activeAssistant);
        setTextInput('');
        return;
      }

      // 6. Phone Voice Control: "મારો પ્રશ્ન સાંભળ" / "સાંભળ"
      if (
        trimmed === 'મારો પ્રશ્ન સાંભળ' ||
        trimmed === 'સાંભળ' ||
        trimmed === 'મારી વાત સાંભળ' ||
        trimmed === 'સાંભળો' ||
        lower === 'listen to me'
      ) {
        const listenReply =
          activeAssistant === 'king'
            ? 'જી બોસ, હું સાંભળી રહ્યો છું. બોલો!'
            : 'જી સર, હું સાંભળી રહી છું. બોલો!';

        const listenMsg: ChatMessage = {
          id: 'listen-' + Date.now(),
          sender: 'assistant',
          assistant: activeAssistant,
          text: listenReply,
          speechText: listenReply,
          timestamp,
          language: 'gu',
        };
        setMessages((prev) => [...prev, listenMsg]);
        if (isSpeakerOn) speak(listenReply, 'gu', false, activeAssistant);
        setTextInput('');
        return;
      }

      const newUserMsg: ChatMessage = {
        id: 'user-' + Date.now(),
        sender: 'user',
        text: trimmed,
        timestamp,
        language: languageMode,
      };

      setMessages((prev) => [...prev, newUserMsg]);
      setTextInput('');
      setIsProcessing(true);
      if (soundEnabled) playJarvisBeep('process');

      try {
        const historyPayload = messages.slice(-5).map((m) => ({
          role: m.sender === 'user' ? ('user' as const) : ('model' as const),
          parts: [{ text: m.text }],
        }));

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: trimmed,
            history: historyPayload,
            languageMode,
            activeAssistant,
          }),
        });

        if (!res.ok) {
          throw new Error(`Server returned status ${res.status}`);
        }

        const data = await res.json();

        // Check if backend instructed switch
        if (
          data.switchAssistant &&
          (data.switchAssistant === 'king' || data.switchAssistant === 'maya')
        ) {
          setActiveAssistant(data.switchAssistant);
        }

        const currentSpeaker = data.switchAssistant || activeAssistant;

        const assistantMsg: ChatMessage = {
          id: 'jarvis-' + Date.now(),
          sender: 'assistant',
          assistant: currentSpeaker,
          text: data.reply || 'Acknowledged, Sir.',
          speechText: data.speechText || data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          language: data.detectedLanguage || 'en',
          action: data.action || null,
          suggestions: data.suggestions || ['Switch Assistant', 'Open YouTube'],
        };

        setMessages((prev) => [...prev, assistantMsg]);

        // Speak aloud ONLY after AI finishes generating the full response and speaker is ON (Requirement 4)
        if (isSpeakerOn && assistantMsg.speechText) {
          speak(assistantMsg.speechText, assistantMsg.language || 'gu', useNeuralTts, currentSpeaker);
        }

        if (data.action) {
          handleActionExecution(data.action, false);
        }
      } catch (err: any) {
        console.error('JARVIS Error:', err);
        const fallbackMsg: ChatMessage = {
          id: 'err-' + Date.now(),
          sender: 'assistant',
          assistant: activeAssistant,
          text: `આદેશ સ્વીકાર્યો: "${trimmed}". સિસ્ટમ સક્રિય છે.`,
          speechText: `આદેશ સ્વીકાર્યો સર, સિસ્ટમ સક્રિય છે.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          language: 'gu',
        };
        setMessages((prev) => [...prev, fallbackMsg]);
        if (isSpeakerOn) {
          speak(fallbackMsg.speechText!, 'gu', false, activeAssistant);
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [
      isProcessing,
      handleSwitchAssistant,
      languageMode,
      soundEnabled,
      messages,
      activeAssistant,
      isSpeakerOn,
      speak,
      useNeuralTts,
    ]
  );

  // Controlled Speech Recognition Hook (No rapid restart loops)
  const {
    isHandsFree,
    isListening,
    isPausedForSpeech,
    listeningStatus,
    interimTranscript,
    recentRecognizedText,
    wakeWordDetected,
    errorMessage,
    setErrorMessage,
    isSupported,
    micPermissionState,
    audioLevel,
    startListening,
    stopListening,
    toggleListening,
    toggleHandsFree,
    pauseListeningForSpeech,
    resumeListeningAfterSpeech,
  } = useSpeechRecognition({
    languageMode,
    activeAssistant,
    onCommandRecognized: (cmd, viaWake) => {
      handleSendPrompt(cmd, viaWake);
    },
    onSwitchAssistantCommand: (target) => {
      handleSwitchAssistant(target);
    },
    onWakeGreeting: (assistant) => {
      handleWakeGreeting(assistant);
    },
    soundEnabled,
  });

  // Assign refs for speech synthesis lifecycle (prevents restarts while TTS is speaking)
  pauseListeningRef.current = pauseListeningForSpeech;
  resumeListeningRef.current = resumeListeningAfterSpeech;

  const handleActionExecution = (
    action: { type: string; app: string; targetUrl: string; label: string },
    userInitiated: boolean = true
  ) => {
    if (!action) return;
    if (action.app === 'camera' || action.targetUrl === 'camera') {
      setIsCameraOpen(true);
    } else if (action.app === 'clock' || action.targetUrl === 'clock') {
      setIsTimerOpen(true);
    } else if (action.app === 'calculator' || action.targetUrl === 'calculator') {
      setIsCalculatorOpen(true);
    } else if (action.targetUrl && userInitiated) {
      window.open(action.targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleOpenAppItem = (app: AndroidAppItem) => {
    if (app.actionType === 'camera_modal') {
      setIsCameraOpen(true);
    } else if (app.actionType === 'timer_modal') {
      setIsTimerOpen(true);
    } else if (app.actionType === 'calc_modal') {
      setIsCalculatorOpen(true);
    } else if (app.actionType === 'tel') {
      window.location.href = app.url || 'tel:';
    } else if (app.actionType === 'sms') {
      window.location.href = app.url || 'sms:';
    } else if (app.actionType === 'mailto') {
      window.location.href = app.url || 'mailto:';
    } else if (app.url) {
      window.open(app.url, '_blank', 'noopener,noreferrer');
    }
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimTranscript]);

  const clearHistory = () => {
    playJarvisBeep('click');
    const resetText =
      activeAssistant === 'maya'
        ? 'કમાન્ડ લૉગ સાફ કર્યો છે. માયા તમારી સેવામાં હાજર છે!'
        : 'કમાન્ડ લૉગ સાફ કર્યો છે બોસ. કિંગ તૈયાર છે!';
    setMessages([
      {
        id: 'cleared-init',
        sender: 'assistant',
        assistant: activeAssistant,
        text: resetText,
        speechText: resetText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: 'gu',
        suggestions: ['મને સમય જણાવ', 'મને એક જોક કહો', 'YouTube ખોલો', 'અસિસ્ટન્ટ બદલો'],
      },
    ]);
  };

  const isMaya = activeAssistant === 'maya';

  return (
    <div
      onClick={handleUserInteraction}
      className={`flex flex-col h-screen max-h-screen text-cyan-50 overflow-hidden font-sans relative scanlines transition-colors duration-700 ease-in-out ${
        isMaya
          ? 'bg-[#090314] selection:bg-pink-500 selection:text-black'
          : 'bg-[#020813] selection:bg-cyan-500 selection:text-black'
      }`}
    >
      {/* King Mode Ambient Radial Glow with Smooth CSS Fade */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ease-in-out ${
          isMaya ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          background:
            'radial-gradient(ellipse 90% 60% at 50% 12%, rgba(6, 182, 212, 0.16), transparent 72%), linear-gradient(180deg, rgba(3, 18, 36, 0.6) 0%, transparent 100%)',
        }}
      />

      {/* Maya Mode Ambient Radial Glow with Smooth CSS Fade */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ease-in-out ${
          isMaya ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background:
            'radial-gradient(ellipse 90% 60% at 50% 12%, rgba(168, 85, 247, 0.18), transparent 72%), linear-gradient(180deg, rgba(28, 8, 48, 0.6) 0%, transparent 100%)',
        }}
      />

      {/* Background Futuristic HUD Grid with Smooth Color Transition */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 transition-all duration-700 ease-in-out"
        style={{
          backgroundImage: `
            linear-gradient(to right, ${isMaya ? 'rgba(192, 132, 252, 0.15)' : 'rgba(6, 182, 212, 0.12)'} 1px, transparent 1px),
            linear-gradient(to bottom, ${isMaya ? 'rgba(192, 132, 252, 0.15)' : 'rgba(6, 182, 212, 0.12)'} 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Android Top Status Bar */}
      <header className={`relative z-20 flex-shrink-0 px-3 sm:px-4 py-2 backdrop-blur-md flex items-center justify-between border-b transition-colors duration-700 ease-in-out ${
        isMaya ? 'bg-purple-950/40 border-purple-500/40' : 'bg-gray-950/95 border-cyan-500/30'
      }`}>
        {/* Left: Branding & Current Persona Avatar (Requirements 1 & 2) */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-full overflow-hidden border border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.4)] flex-shrink-0">
            <img
              src={isMaya ? MAYA_AVATAR : KING_AVATAR}
              alt={isMaya ? 'Maya Female Avatar' : 'King Male Avatar'}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-black ${
                isMaya ? 'bg-purple-400' : 'bg-cyan-400'
              } animate-pulse`}
            />
          </div>
          <div>
            <h1 className="text-sm font-hud font-bold tracking-widest text-cyan-300 flex items-center gap-1.5 glow-text-cyan">
              <span>JARVIS</span>
              <span
                className={`text-[10px] font-mono-hud px-1.5 py-0.2 rounded border font-semibold uppercase ${
                  isMaya
                    ? 'bg-purple-950 border-purple-500/50 text-purple-200'
                    : 'bg-cyan-950 border-cyan-500/50 text-cyan-200'
                }`}
              >
                {isMaya ? 'માયા (MAYA)' : 'કિંગ (KING)'}
              </span>
            </h1>
            <div className="text-[9px] font-mono-hud text-cyan-400/80 uppercase tracking-wider font-semibold">
              {isMaya ? 'ગર્લ અવતાર // સ્ત્રી વૉઇસ' : 'બોય અવતાર // પુરુષ વૉઇસ'}
            </div>
          </div>
        </div>

        {/* Center: Dual Assistant Switcher Toggle (Requirements 1, 2, 7) */}
        <div className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-cyan-500/40 shadow-inner">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSwitchAssistant('king');
            }}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-hud font-semibold rounded-lg transition-all cursor-pointer ${
              !isMaya
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_#00f0ff] font-bold'
                : 'text-cyan-300/70 hover:text-cyan-100'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>કિંગ (બોય)</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSwitchAssistant('maya');
            }}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-hud font-semibold rounded-lg transition-all cursor-pointer ${
              isMaya
                ? 'bg-purple-500 text-slate-950 shadow-[0_0_12px_#c084fc] font-bold'
                : 'text-purple-300/70 hover:text-purple-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>માયા (ગર્લ)</span>
          </button>
        </div>

        {/* Right: Gujarati Status Badge, Mute, Info & Settings (Requirement 8) */}
        <div className="flex items-center gap-1.5">
          {/* Requirement 8: Gujarati Only Badge */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-cyan-500/40 text-[11px] font-mono-hud text-cyan-200 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold tracking-wide">ગુજરાતી (GU)</span>
          </div>

          {/* Requirement 4: Explicit Speaker Audio Output Toggle (ON / OFF) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              playJarvisBeep('click');
              toggleSpeaker();
            }}
            type="button"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono-hud font-bold transition-all shadow-sm cursor-pointer ${
              isSpeakerOn
                ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.3)] hover:bg-cyan-900/80'
                : 'bg-rose-950/90 border-rose-500/80 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.3)] hover:bg-rose-900/80'
            }`}
            title={
              isSpeakerOn
                ? 'સ્પીકર આઉટપુટ: ચાલુ (જવાબ મોટેથી બોલાશે)'
                : 'સ્પીકર આઉટપુટ: બંધ (જવાબ સંભળાશે નહીં, માત્ર લખાણ દેખાશે)'
            }
          >
            {isSpeakerOn ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] tracking-wide">સ્પીકર ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-[10px] tracking-wide">સ્પીકર OFF</span>
              </>
            )}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              playJarvisBeep('click');
              setIsCustomVoiceModalOpen(true);
            }}
            type="button"
            className={`p-1.5 px-2 rounded-lg border text-xs font-mono-hud font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
              isMaya
                ? 'bg-purple-950/80 border-purple-400 text-purple-200 hover:bg-purple-900/90 shadow-[0_0_12px_rgba(192,132,252,0.3)]'
                : 'bg-cyan-950/80 border-cyan-400 text-cyan-200 hover:bg-cyan-900/90 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
            }`}
            title="કસ્ટમ AI વૉઇસ સેટિંગ્સ (Custom Voice Settings)"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[10px] uppercase tracking-wider">કસ્ટમ વૉઇસ</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              playJarvisBeep('click');
              setIsPlatformInfoOpen(true);
            }}
            type="button"
            className="p-1.5 rounded-lg bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 hover:text-cyan-100 transition-colors"
            title="Browser Preview Diagnostics & Info"
          >
            <Info className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              playJarvisBeep('click');
              setIsSettingsOpen(true);
            }}
            type="button"
            className="p-1.5 rounded-lg bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 hover:text-cyan-100 transition-colors"
            title="System Settings & Voice Configuration"
          >
            <Settings className="w-4 h-4" />
          </button>

          <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-cyan-500/20 text-xs font-mono-hud text-cyan-400/80">
            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
            <div className="flex items-center gap-1">
              <Battery className="w-3.5 h-3.5 text-cyan-400" />
              <span>{batteryLevel}%</span>
            </div>
            <span className="text-cyan-200 font-semibold">{currentTime}</span>
          </div>
        </div>
      </header>

      {/* Honest Voice Distinctiveness Banner (Requirement 7) */}
      {voicesLoaded && !hasDistinctVoices && (
        <div className="bg-amber-950/80 border-b border-amber-500/40 px-3 py-1 flex items-center justify-between text-[11px] font-mono-hud text-amber-200 z-30">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>
              Device Note: Your browser provides 1 synthesis voice ({selectedKingVoice?.name || 'Default'}). Acoustic pitch modulation (King 0.90 / Maya 1.18) differentiates them.
            </span>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="text-amber-300 underline font-bold ml-2 text-[10px]"
          >
            View Voices
          </button>
        </div>
      )}

      {/* Main Interactive Viewport */}
      <div className="flex-1 flex flex-col min-h-0 relative z-10 overflow-hidden">
        {/* Top Half: Central Holographic Core */}
        <div className="flex-shrink-0 bg-gradient-to-b from-gray-950 via-slate-950 to-gray-950 border-b border-cyan-500/20">
          <ArcReactorCore
            isListening={isListening}
            isProcessing={isProcessing}
            isSpeaking={isSpeaking}
            isHandsFree={isHandsFree}
            isPausedForSpeech={isPausedForSpeech}
            wakeWordDetected={wakeWordDetected}
            audioLevel={audioLevel}
            activeAssistant={activeAssistant}
            onToggleMic={toggleListening}
            onSwitchAssistant={() => handleSwitchAssistant()}
            detectedLang={languageMode}
            statusText={
              interimTranscript
                ? `Hearing: "${interimTranscript}"`
                : undefined
            }
          />

          {/* Explicit Manual Start/Stop Listening Controls & Truthful Status Bar (Requirements 3 & 4) */}
          <div className="px-4 pb-2 -mt-1 flex flex-col items-center gap-2">
            {/* Real-time Recognized Speech Display Box */}
            <div
              className={`max-w-lg w-full px-4 py-2 rounded-xl border backdrop-blur-md transition-all text-center ${
                isListening
                  ? isMaya
                    ? 'bg-purple-950/80 border-purple-400/70 shadow-[0_0_15px_rgba(192,132,252,0.3)]'
                    : 'bg-cyan-950/80 border-cyan-400/70 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  : 'bg-slate-900/70 border-cyan-500/20'
              }`}
            >
              {/* Clear Listening / Not Listening Indicator in Gujarati (Requirement 6) */}
              <div className="flex items-center justify-between text-[10px] font-mono-hud uppercase tracking-wider mb-1">
                <span className="flex items-center gap-1.5 font-bold">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isSpeaking
                        ? 'bg-purple-400 animate-pulse'
                        : isListening
                        ? 'bg-emerald-400 animate-ping'
                        : 'bg-rose-500'
                    }`}
                  />
                  <span
                    className={
                      isSpeaking
                        ? 'text-purple-300'
                        : isListening
                        ? 'text-emerald-300'
                        : 'text-slate-400'
                    }
                  >
                    {isSpeaking
                      ? 'સહાયક બોલી રહ્યા છે (માઇક થોભાવ્યું છે)'
                      : isListening
                      ? 'માઇક ચાલુ છે: સાંભળી રહ્યું છે...'
                      : 'માઇક્રોફોન બંધ છે'}
                  </span>
                </span>

                <span className="text-cyan-400/80 font-bold">
                  ગુજરાતી (GU-IN)
                </span>
              </div>

              {/* Transcript Display (Requirement 9) */}
              <p className="text-sm font-semibold text-white min-h-[22px] flex items-center justify-center italic">
                {interimTranscript ? (
                  <span>"{interimTranscript}"</span>
                ) : recentRecognizedText ? (
                  <span className="text-cyan-200/90 font-normal">છેલ્લે સાંભળ્યું: "{recentRecognizedText}"</span>
                ) : isListening ? (
                  <span className="text-emerald-300/85 font-normal">
                    સાંભળે છે... "હેલો કિંગ", "હેલો માયા", "YouTube ખોલો" અથવા તમારો આદેશ બોલો
                  </span>
                ) : (
                  <span className="text-cyan-400/50 font-normal">
                    માઇક્રોફોન બંધ છે. બોલવા માટે નીચે "વાત શરૂ કરો" બટન દબાવો.
                  </span>
                )}
              </p>
            </div>

            {/* Prominent Manual Controls in Gujarati (Requirements 6 & 9) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleListening}
                className={`px-4 py-1.5 rounded-xl font-mono-hud text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md ${
                  isListening
                    ? 'bg-rose-600 hover:bg-rose-500 text-white border border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                    : isMaya
                    ? 'bg-purple-500 hover:bg-purple-400 text-slate-950 shadow-[0_0_15px_#c084fc]'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_15px_#00f0ff]'
                }`}
              >
                {isListening ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>વાત બંધ કરો</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>વાત શરૂ કરો</span>
                  </>
                )}
              </button>

              {/* Hands-Free Auto Loop Toggle */}
              <button
                type="button"
                onClick={toggleHandsFree}
                className={`px-3 py-1.5 rounded-xl font-mono-hud text-xs border transition-all cursor-pointer ${
                  isHandsFree
                    ? 'bg-emerald-950/60 border-emerald-400 text-emerald-300 font-bold'
                    : 'bg-slate-900 border-cyan-500/30 text-cyan-400/70'
                }`}
                title="ઓટો-લિસનિંગ સતત વાતચીત માટે તૈયાર રહે છે"
              >
                ઓટો-લિસનિંગ: {isHandsFree ? 'ચાલુ' : 'બંધ'}
              </button>
            </div>

            {/* Requirement 7: Dedicated Voice Test Bar & Active Voice Names Display */}
            {/* Requirement 7 & Custom Voice Feature: Dedicated Voice Test Bar & Active Custom Voices */}
            <div className="w-full max-w-lg mt-1 grid grid-cols-2 gap-2 text-xs font-mono-hud">
              {/* King Voice Test Card */}
              <div className="p-2 rounded-xl bg-slate-900/90 border border-cyan-500/40 flex flex-col justify-between shadow-[0_0_12px_rgba(6,182,212,0.15)]">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-cyan-300 font-bold mb-0.5">
                    <span className="flex items-center gap-1">
                      <Crown className="w-3 h-3 text-cyan-400" />
                      <span>કિંગ (પુરુષ વૉઇસ)</span>
                    </span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                      {kingCustomVoice.enabled ? '✓ AI કસ્ટમ' : isKingVoiceTrulyMale ? 'પુરુષ વૉઇસ' : 'ડીપ પિચ 0.74'}
                    </span>
                  </div>
                  <div className="text-[10px] text-cyan-100/90 truncate font-sans font-medium" title={kingCustomVoice.enabled ? kingCustomVoice.voiceName : selectedKingVoice?.name || 'Default'}>
                    {kingCustomVoice.enabled ? kingCustomVoice.voiceName : selectedKingVoice?.name || 'Default'}
                  </div>
                </div>

                <div className="mt-1.5 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playJarvisBeep('click');
                      testVoice('king');
                    }}
                    className="flex-1 py-1 px-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/50 text-cyan-200 text-[10px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm"
                    title="કિંગનો ડીપ પુરુષ અવાજ ટેસ્ટ કરો"
                  >
                    <Volume2 className="w-3 h-3 text-cyan-400" />
                    <span>ટેસ્ટ અવાજ</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playJarvisBeep('click');
                      setIsCustomVoiceModalOpen(true);
                    }}
                    className="py-1 px-1.5 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-300 hover:text-cyan-100 text-[10px] font-bold transition-all"
                    title="કિંગ કસ્ટમ વૉઇસ સેટિંગ્સ"
                  >
                    <Sliders className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Maya Voice Test Card */}
              <div className="p-2 rounded-xl bg-slate-900/90 border border-purple-500/40 flex flex-col justify-between shadow-[0_0_12px_rgba(168,85,247,0.15)]">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-purple-300 font-bold mb-0.5">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <span>માયા (સ્ત્રી વૉઇસ)</span>
                    </span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-500/40">
                      {mayaCustomVoice.enabled ? '✓ AI કસ્ટમ' : isMayaVoiceTrulyFemale ? 'સ્ત્રી વૉઇસ' : 'ક્યુટ પિચ 1.22'}
                    </span>
                  </div>
                  <div className="text-[10px] text-purple-100/90 truncate font-sans font-medium" title={mayaCustomVoice.enabled ? mayaCustomVoice.voiceName : selectedMayaVoice?.name || 'Default'}>
                    {mayaCustomVoice.enabled ? mayaCustomVoice.voiceName : selectedMayaVoice?.name || 'Default'}
                  </div>
                </div>

                <div className="mt-1.5 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playJarvisBeep('click');
                      testVoice('maya');
                    }}
                    className="flex-1 py-1 px-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/35 border border-purple-400/50 text-purple-200 text-[10px] font-bold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm"
                    title="માયાનો ક્યુટ સ્ત્રી અવાજ ટેસ્ટ કરો"
                  >
                    <Volume2 className="w-3 h-3 text-purple-400" />
                    <span>ટેસ્ટ અવાજ</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playJarvisBeep('click');
                      setIsCustomVoiceModalOpen(true);
                    }}
                    className="py-1 px-1.5 rounded-lg bg-purple-950 border border-purple-500/40 text-purple-300 hover:text-purple-100 text-[10px] font-bold transition-all"
                    title="માયા કસ્ટમ વૉઇસ સેટિંગ્સ"
                  >
                    <Sliders className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Microhone Error Notice (Requirement 6) */}
          {errorMessage && (
            <div className="mx-4 mb-2 p-2 rounded-xl bg-rose-950/80 border border-rose-500/50 flex items-center justify-between text-xs text-rose-200">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{errorMessage}</span>
              </span>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 font-bold ml-2 underline text-[11px]"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Android App Shortcuts Dock */}
          <AppLauncher
            onOpenAppAction={handleOpenAppItem}
            languageMode={languageMode}
          />
        </div>

        {/* Bottom Half: Conversation Transcript & Intelligence Feed */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between text-[11px] font-mono-hud text-cyan-400/70 border-b border-cyan-500/15 pb-1 mb-2">
            <span className="flex items-center gap-1.5 uppercase tracking-wider font-semibold">
              <Radio className="w-3 h-3 text-cyan-400" />
              <span>
                VOICE TELEMETRY // ACTIVE ASSISTANT: {activeAssistant.toUpperCase()}
              </span>
            </span>
            <button
              onClick={clearHistory}
              type="button"
              className="flex items-center gap-1 text-[10px] text-cyan-400/60 hover:text-cyan-200 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Log</span>
            </button>
          </div>

          {/* Message Stream */}
          {messages.map((msg) => {
            const isMsgMaya = msg.assistant === 'maya';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[90%] sm:max-w-md rounded-2xl p-3.5 transition-all ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-cyan-900/60 to-blue-900/70 border border-cyan-400/40 text-cyan-100 rounded-br-xs shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                      : isMsgMaya
                      ? 'bg-slate-900/90 border border-purple-500/40 text-purple-50 rounded-bl-xs shadow-[0_0_20px_rgba(168,85,247,0.25)] backdrop-blur-md'
                      : 'bg-slate-900/90 border border-cyan-500/40 text-cyan-50 rounded-bl-xs shadow-[0_0_20px_rgba(6,182,212,0.25)] backdrop-blur-md'
                  }`}
                >
                  {/* Sender Header with Avatar (Requirements 1 & 2) */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className={`text-[10px] font-mono-hud font-bold tracking-widest uppercase flex items-center gap-1.5 ${
                        msg.sender === 'user'
                          ? 'text-cyan-300'
                          : isMsgMaya
                          ? 'text-purple-300'
                          : 'text-cyan-300'
                      }`}
                    >
                      {msg.sender === 'user' ? (
                        'યુઝર // વૉઇસ કમાન્ડ'
                      ) : (
                        <>
                          <div className="relative w-5 h-5 rounded-full overflow-hidden border border-cyan-400/60 shadow-[0_0_6px_rgba(6,182,212,0.4)] flex-shrink-0">
                            <img
                              src={isMsgMaya ? MAYA_AVATAR : KING_AVATAR}
                              alt={isMsgMaya ? 'Maya Female Avatar' : 'King Male Avatar'}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span>
                            {isMsgMaya
                              ? 'માયા // ગર્લ અવતાર (MAYA)'
                              : 'કિંગ // બોય અવતાર (KING)'}
                          </span>
                        </>
                      )}
                    </span>
                    <span className="text-[9px] font-mono-hud text-cyan-400/50">
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Body Text */}
                  <div className="text-sm font-sans whitespace-pre-wrap leading-relaxed text-cyan-50 selection:bg-cyan-500 selection:text-black">
                    {msg.text}
                  </div>

                  {/* Replay Speech Button (Requirements 3 & 8) */}
                  {msg.sender === 'assistant' && (
                    <div className="mt-2.5 pt-2 border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          if (!isSpeakerOn) setIsSpeakerOn(true);
                          playJarvisBeep('click');
                          speak(
                            msg.speechText || msg.text,
                            msg.language || 'gu',
                            useNeuralTts,
                            msg.assistant || 'king'
                          );
                        }}
                        type="button"
                        className={`inline-flex items-center gap-1 text-[11px] font-mono-hud px-2 py-0.5 rounded border transition-all ${
                          isMsgMaya
                            ? 'bg-purple-950/60 border-purple-400/40 text-purple-200 hover:border-purple-300'
                            : 'bg-cyan-950/60 border-cyan-400/40 text-cyan-200 hover:border-cyan-300'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>સંભળાવો ({isMsgMaya ? 'માયા' : 'કિંગ'})</span>
                      </button>

                      <span className="text-[9px] font-mono-hud text-cyan-400/70 uppercase font-semibold">
                        ગુજરાતી વૉઇસ
                      </span>
                    </div>
                  )}

                  {/* Action Card for Android Apps */}
                  {msg.action && (
                    <div className="mt-3 p-2.5 rounded-xl bg-cyan-950/70 border border-cyan-400/50 flex items-center justify-between gap-3 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center flex-shrink-0 text-cyan-300">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <div className="text-[10px] font-mono-hud text-cyan-400 uppercase font-semibold">
                            એન્ડ્રોઇડ એપ લોન્ચર
                          </div>
                          <div className="text-xs font-bold text-cyan-100 truncate">
                            {msg.action.label || `Open ${msg.action.app}`}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleActionExecution(msg.action!, true)}
                        type="button"
                        className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold font-mono-hud flex items-center gap-1 shadow-[0_0_10px_#00f0ff] active:scale-95 transition-all"
                      >
                        <span>ખોલો</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Contextual Suggestions Chips in Gujarati */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 max-w-md">
                    {msg.suggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          playJarvisBeep('click');
                          handleSendPrompt(sug);
                        }}
                        type="button"
                        className={`px-2.5 py-1 rounded-full text-xs border text-left transition-all active:scale-95 shadow-sm ${
                          sug.toLowerCase().includes('switch') || sug.includes('બદલો') || sug.includes('કિંગ') || sug.includes('માયા')
                            ? 'bg-purple-950/80 border-purple-400/60 text-purple-200 hover:border-purple-300 font-bold'
                            : 'bg-slate-900/90 hover:bg-cyan-950 border-cyan-500/30 hover:border-cyan-400 text-cyan-200'
                        }`}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* AI Computing Indicator in Gujarati */}
          {isProcessing && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-900/70 border border-cyan-500/30 max-w-xs animate-pulse">
              <div
                className={`w-2 h-2 rounded-full animate-ping ${
                  isMaya ? 'bg-purple-400' : 'bg-cyan-400'
                }`}
              />
              <span className="text-xs font-mono-hud text-cyan-300">
                {isMaya ? 'માયા' : 'કિંગ'} તમારો આદેશ પ્રોસેસ કરી રહ્યા છે...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Voice Command Chips Bar in Gujarati (Requirements 4, 5, 8) */}
        <div className="flex-shrink-0 px-3 py-1.5 bg-gray-950 border-t border-cyan-500/20 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-1.5">
          <button
            onClick={() => handleSwitchAssistant()}
            type="button"
            className="px-2.5 py-1 rounded-lg text-xs bg-purple-950/60 hover:bg-purple-900/70 border border-purple-400/50 hover:border-purple-300 text-purple-200 font-bold transition-all flex items-center gap-1 active:scale-95 shadow-[0_0_10px_rgba(168,85,247,0.3)] flex-shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3 text-purple-300" />
            <span>સ્વિચ કરો: {isMaya ? 'કિંગ (પુરુષ)' : 'માયા (સ્ત્રી)'}</span>
          </button>

          {[
            'હેલો કિંગ',
            'હેલો માયા',
            'અસિસ્ટન્ટ બદલો',
            'Hello Sir, કેમ છો?',
            'YouTube ખોલો',
            'આજનું હવામાન કેવું છે?',
            'મને એક મજાક કહો',
            'વોટ્સએપ ખોલો',
            'કેમેરો ખોલો',
            '5 મિનિટનો ટાઈમર લગાવો',
          ].map((cmd, i) => (
            <button
              key={i}
              onClick={() => {
                playJarvisBeep('click');
                handleSendPrompt(cmd);
              }}
              type="button"
              className="px-2.5 py-1 rounded-lg text-xs bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/25 hover:border-cyan-400 text-cyan-200/90 transition-all flex items-center gap-1 active:scale-95 flex-shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>{cmd}</span>
            </button>
          ))}
        </div>

        {/* Bottom Text Input & Manual Mic Control Bar (Requirement 9) */}
        <div className={`flex-shrink-0 p-3 border-t backdrop-blur-xl transition-all duration-700 ease-in-out ${
          isMaya ? 'bg-[#0b0417]/95 border-purple-500/40' : 'bg-gray-950/95 border-cyan-500/30'
        }`}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPrompt(textInput);
            }}
            className="flex items-center gap-2 max-w-4xl mx-auto"
          >
            {/* Manual Mic Button as Backup */}
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2.5 rounded-xl border transition-all active:scale-95 flex-shrink-0 cursor-pointer ${
                isListening
                  ? 'bg-rose-600 text-white border-rose-400 shadow-[0_0_18px_#f43f5e]'
                  : 'bg-slate-900 border-cyan-500/30 text-cyan-300 hover:border-cyan-400'
              }`}
              title={isListening ? 'વાત બંધ કરો' : 'વાત શરૂ કરો (મેન્યુઅલ માઇક)'}
            >
              {isListening ? (
                <MicOff className="w-5 h-5 animate-pulse" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>

            {/* Input field */}
            <div className="relative flex-1">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={`${isMaya ? 'માયા (Maya)' : 'કિંગ (King)'} ને ગુજરાતીમાં આદેશ આપો અથવા લખો...`}
                className="w-full bg-slate-900/90 border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-cyan-50 placeholder-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-400 font-sans"
              />
            </div>

            {/* Send button */}
            <button
              type="submit"
              disabled={!textInput.trim() || isProcessing}
              className={`p-2.5 rounded-xl font-bold transition-all active:scale-95 flex-shrink-0 ${
                isMaya
                  ? 'bg-purple-500 hover:bg-purple-400 text-slate-950 shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
              } disabled:opacity-40 cursor-pointer`}
              title="આદેશ મોકલો (Send Directive)"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Built-in Android Modals */}
      <CameraScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
      />

      <HudTimerModal
        isOpen={isTimerOpen}
        onClose={() => setIsTimerOpen(false)}
      />

      <HudCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />

      {/* Custom AI Voice Settings Modal (Requirements 1, 2, 3, 5, 8) */}
      <CustomVoiceModal
        isOpen={isCustomVoiceModalOpen}
        onClose={() => setIsCustomVoiceModalOpen(false)}
        kingVoice={kingCustomVoice}
        mayaVoice={mayaCustomVoice}
        onSaveVoice={saveCustomVoice}
        onPreviewVoice={previewVoice}
        isPreviewing={isPreviewingVoice}
        previewingAssistant={previewingAssistant}
        onStopPreview={stopSpeaking}
        engineStatus={engineStatus}
      />

      {/* Platform & Capability Information Modal (Requirements 8 & 10) */}
      {isPlatformInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-gray-950 border border-cyan-500/50 rounded-2xl overflow-hidden shadow-[0_0_35px_rgba(6,182,212,0.4)] flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 py-3 bg-cyan-950/60 border-b border-cyan-500/30">
              <span className="text-xs font-mono-hud font-bold tracking-widest text-cyan-300 uppercase">
                પ્લેટફોર્મ ડાયગ્નોસ્ટિક્સ & માહિતી (DIAGNOSTICS)
              </span>
              <button
                onClick={() => setIsPlatformInfoOpen(false)}
                className="text-cyan-400 hover:text-cyan-200 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 font-sans text-xs text-cyan-100 overflow-y-auto">
              <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/30">
                <div className="font-hud font-bold text-cyan-300 text-sm mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Google AI Studio બ્રાઉઝર પ્રીવ્યૂમાં શું કાર્ય કરે છે:</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-cyan-200/90 text-[11px] leading-relaxed">
                  <li><strong>વાસ્તવિક ગુજરાતી સ્પીચ રેકગ્નિશન:</strong> 'gu-IN' ભાષા મોડ સાથે અવાજ સમજે છે.</li>
                  <li><strong>હેન્ડ્સ-ફ્રી વેક-વર્ડ્સ:</strong> "Hello King" અને "Hello Maya" સાંભળી આપોઆપ જવાબ આપે છે.</li>
                  <li><strong>અસિસ્ટન્ટ સ્વિચિંગ:</strong> "Switch Assistant" અથવા "અસિસ્ટન્ટ બદલો" કહેતાં કિંગ (બોય) અને માયા (ગર્લ) બદલાય છે.</li>
                  <li><strong>બે અલગ વૉઇસ:</strong> કિંગ માટે પુરુષ અવાજ અને માયા માટે સ્ત્રી અવાજ પિચ મોડ્યુલેશન સાથે.</li>
                  <li><strong>એન્ડ્રોઇડ શોર્ટકટ્સ:</strong> YouTube, WhatsApp, Maps, Dialer, Camera, SMS ડાયરેક્ટ ખોલે છે.</li>
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-purple-500/30">
                <div className="font-hud font-bold text-purple-300 text-sm mb-1 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-purple-400" />
                  <span>નેટિવ એન્ડ્રોઇડ એપ (APK) ની જરૂર ક્યારે પડે:</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-purple-200/90 text-[11px] leading-relaxed">
                  <li><strong>24/7 સ્ક્રીન બંધ હોવા છતાં લિસનિંગ:</strong> જ્યારે ફોન લોક હોય કે સ્ક્રીન બંધ હોય ત્યારે સાંભળવા માટે એન્ડ્રોઇડ Foreground Service વાળી નેટિવ APK જરૂરી છે.</li>
                  <li><strong>ઓફલાઇન વૉઇસ રેકગ્નિશન:</strong> ઇન્ટરનેટ વિના ગુજરાતી અવાજ પ્રોસેસ કરવા Google Offline Speech Data જરૂરી છે.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings & Voice Configuration Modal (Requirements 3 & 7) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-gray-950 border border-cyan-500/50 rounded-2xl overflow-hidden shadow-[0_0_35px_rgba(6,182,212,0.4)] flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 py-3 bg-cyan-950/60 border-b border-cyan-500/30">
              <span className="text-xs font-mono-hud font-bold tracking-widest text-cyan-300 uppercase">
                JARVIS સેટિંગ્સ & વૉઇસ કન્ફિગરેશન
              </span>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-cyan-400 hover:text-cyan-200 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4 font-mono-hud text-xs text-cyan-200 overflow-y-auto">
              {/* Active Assistant selection */}
              <div>
                <label className="block mb-1.5 font-semibold text-cyan-300">
                  સક્રિય સહાયક (Active Assistant):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSwitchAssistant('king')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold flex items-center justify-center gap-1.5 ${
                      !isMaya
                        ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
                        : 'bg-slate-900 border-cyan-500/20 text-cyan-400/60'
                    }`}
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>કિંગ (બોય અવતાર)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchAssistant('maya')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold flex items-center justify-center gap-1.5 ${
                      isMaya
                        ? 'bg-purple-500/30 border-purple-400 text-purple-200'
                        : 'bg-slate-900 border-cyan-500/20 text-cyan-400/60'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>માયા (ગર્લ અવતાર)</span>
                  </button>
                </div>
              </div>

              {/* Custom AI Voice Studio Shortcut Card */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-950/80 via-slate-900 to-purple-950/80 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-bold text-cyan-200 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span>કસ્ટમ AI વૉઇસ સ્ટુડિયો (Custom Voice)</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    સંમતિ પ્રમાણિત
                  </span>
                </div>
                <p className="text-[10px] text-cyan-300/80 mb-2 font-sans">
                  કિંગ અને માયા માટે અલગ કસ્ટમ AI અવાજ, વૉઇસ ઓનર સ્પષ્ટ સંમતિ વેરિફિકેશન અને લાઈવ પ્રીવ્યૂ સેટ કરો.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    setIsCustomVoiceModalOpen(true);
                  }}
                  className="w-full py-1.5 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_0_10px_#00f0ff] cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>કસ્ટમ વૉઇસ સેટિંગ્સ ખોલો (Open Studio)</span>
                </button>
              </div>

              {/* Requirement 3: How to enable suitable Gujarati voices on Android */}
              <div className="p-3 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-100">
                <span className="font-bold text-cyan-300 text-xs block mb-1">
                  📱 એન્ડ્રોઇડ પર ગુજરાતી અવાજ સેટ કરવાની રીત (Android Voice Guide):
                </span>
                <ol className="list-decimal pl-4 space-y-1 text-[11px] text-cyan-200/90 font-sans leading-relaxed">
                  <li>મોબાઇલના <strong>Settings</strong> (સેટિંગ્સ) ખોલો.</li>
                  <li><strong>Accessibility</strong> અથવા <strong>System &gt; Languages</strong> માં જાઓ.</li>
                  <li><strong>Text-to-speech output</strong> પસંદ કરો.</li>
                  <li>Preferred engine તરીકે <strong>Speech Services by Google</strong> પસંદ કરો.</li>
                  <li>સેટિંગ્સ ગિયર ⚙️ &gt; <strong>Install voice data</strong> &gt; <strong>Gujarati</strong> ડાઉનલોડ કરો.</li>
                </ol>
              </div>

              {/* Requirement 7: Distinct Voice Check Status */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-cyan-500/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-cyan-300">ઉપલબ્ધ સિસ્ટમ અવાજો:</span>
                  <span className="text-cyan-200 font-bold">{allVoices.length} અવાજ</span>
                </div>
                {!hasDistinctVoices ? (
                  <p className="text-[10px] text-amber-300/90 leading-tight mt-1">
                    તમારા બ્રાઉઝરમાં 1 સિસ્ટમ અવાજ છે. કિંગ માટે ડીપ પિચ (0.74) અને માયા માટે હાઈ પિચ (1.22) લાગુ છે. એન્ડ્રોઇડ પર Google Speech Services માંથી પુરુષ અવાજ ઉમેરી શકાય છે.
                  </p>
                ) : (
                  <p className="text-[10px] text-emerald-300/90 leading-tight mt-1">
                    ✓ કિંગ અને માયા બંને માટે અલગ અલગ સિસ્ટમ અવાજ સફળતાપૂર્વક સેટ છે.
                  </p>
                )}
              </div>

              {/* King's Voice Selection & Testing (Requirement 1, 3 & 7) */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-cyan-500/30">
                <label className="block mb-1 font-bold text-cyan-300 flex items-center justify-between">
                  <span>કિંગ અવાજ (ડીપ પુરુષ - પિચ 0.74):</span>
                  <span className="text-[10px] text-cyan-400/90 font-normal">
                    {isKingVoiceTrulyMale ? '✓ Male Voice' : 'Modulated'}
                  </span>
                </label>
                <select
                  value={selectedKingVoice?.name || ''}
                  onChange={(e) => {
                    const found = allVoices.find((v) => v.name === e.target.value);
                    if (found) setSelectedKingVoice(found);
                  }}
                  className="w-full bg-slate-950 border border-cyan-500/40 rounded-lg p-1.5 text-xs text-cyan-100"
                >
                  {allVoices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => testVoice('king')}
                  className="mt-2 text-[10px] text-cyan-300 underline flex items-center gap-1 cursor-pointer font-bold"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>કિંગનો ડીપ અવાજ ટેસ્ટ કરો ("Hello King" જવાબ)</span>
                </button>
              </div>

              {/* Maya's Voice Selection & Testing (Requirement 2, 3 & 7) */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-purple-500/30">
                <label className="block mb-1 font-bold text-purple-300 flex items-center justify-between">
                  <span>માયા અવાજ (ક્યુટ સ્ત્રી - પિચ 1.22):</span>
                  <span className="text-[10px] text-purple-400/90 font-normal">
                    {isMayaVoiceTrulyFemale ? '✓ Female Voice' : 'Modulated'}
                  </span>
                </label>
                <select
                  value={selectedMayaVoice?.name || ''}
                  onChange={(e) => {
                    const found = allVoices.find((v) => v.name === e.target.value);
                    if (found) setSelectedMayaVoice(found);
                  }}
                  className="w-full bg-slate-950 border border-purple-500/40 rounded-lg p-1.5 text-xs text-purple-100"
                >
                  {allVoices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => testVoice('maya')}
                  className="mt-2 text-[10px] text-purple-300 underline flex items-center gap-1 cursor-pointer font-bold"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>માયાનો ક્યુટ અવાજ ટેસ્ટ કરો ("Hello Maya" જવાબ)</span>
                </button>
              </div>

              {/* Speech Rate */}
              <div>
                <label className="block mb-1 font-semibold text-cyan-300">
                  બોલવાની ઝડપ: {speechRate.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.8"
                  max="1.4"
                  step="0.1"
                  value={speechRate}
                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* Speaker Audio Output Toggle */}
              <div className="flex items-center justify-between py-2 border-t border-cyan-500/20">
                <span>સ્પીકર આઉટપુટ (Speaker Audio Output)</span>
                <button
                  type="button"
                  onClick={toggleSpeaker}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                    isSpeakerOn
                      ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
                      : 'bg-rose-950/60 border-rose-500 text-rose-300'
                  }`}
                >
                  {isSpeakerOn ? 'ચાલુ (ON)' : 'બંધ (OFF)'}
                </button>
              </div>

              {/* Sound Effects */}
              <div className="flex items-center justify-between py-2 border-t border-cyan-500/20">
                <span>HUD સાઉન્ડ ઇફેક્ટ્સ (Sound FX)</span>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="w-4 h-4 accent-cyan-400"
                />
              </div>

              {/* Reset History */}
              <div className="pt-2 border-t border-cyan-500/20">
                <button
                  onClick={() => {
                    clearHistory();
                    setIsSettingsOpen(false);
                  }}
                  type="button"
                  className="w-full py-2 rounded-xl bg-red-950/50 hover:bg-red-900/60 border border-red-500/30 text-red-300 font-bold transition-colors cursor-pointer"
                >
                  લોગ સાફ કરો (Clear Log)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
