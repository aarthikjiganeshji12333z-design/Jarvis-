import { useState, useEffect, useRef, useCallback } from 'react';
import { playJarvisBeep, triggerHaptic } from '../utils/audioEffects';

export type LanguageMode = 'auto' | 'gu' | 'hi' | 'en';
export type MicPermissionState = 'granted' | 'prompt' | 'denied' | 'unsupported';
export type ListeningStatus = 'idle' | 'listening' | 'paused_for_speech' | 'permission_denied';

interface UseSpeechRecognitionProps {
  languageMode?: LanguageMode;
  activeAssistant: 'king' | 'maya';
  onCommandRecognized: (command: string, viaWakeWord: boolean) => void;
  onSwitchAssistantCommand: (target?: 'king' | 'maya') => void;
  onWakeGreeting: (assistant: 'king' | 'maya') => void;
  soundEnabled?: boolean;
}

export function useSpeechRecognition({
  languageMode = 'gu',
  activeAssistant,
  onCommandRecognized,
  onSwitchAssistantCommand,
  onWakeGreeting,
  soundEnabled = true,
}: UseSpeechRecognitionProps) {
  // Automatic listening enabled by default as requested in Requirement 6
  const [isHandsFree, setIsHandsFree] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isPausedForSpeech, setIsPausedForSpeech] = useState(false);
  const [listeningStatus, setListeningStatus] = useState<ListeningStatus>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recentRecognizedText, setRecentRecognizedText] = useState('');
  const [wakeWordDetected, setWakeWordDetected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [micPermissionState, setMicPermissionState] = useState<MicPermissionState>('prompt');
  const [audioLevel, setAudioLevel] = useState(0);

  // References to keep callbacks current without re-triggering effects
  const callbacksRef = useRef({ onCommandRecognized, onSwitchAssistantCommand, onWakeGreeting });
  useEffect(() => {
    callbacksRef.current = { onCommandRecognized, onSwitchAssistantCommand, onWakeGreeting };
  });

  const activeAssistantRef = useRef(activeAssistant);
  useEffect(() => {
    activeAssistantRef.current = activeAssistant;
  }, [activeAssistant]);

  const languageModeRef = useRef(languageMode);
  useEffect(() => {
    languageModeRef.current = languageMode;
  }, [languageMode]);

  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const isHandsFreeRef = useRef(isHandsFree);
  useEffect(() => {
    isHandsFreeRef.current = isHandsFree;
  }, [isHandsFree]);

  const recognitionRef = useRef<any>(null);
  const isRunningRef = useRef(false);
  const isStartingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isExplicitlyStoppedRef = useRef(false);
  const retryTimerRef = useRef<any>(null);
  const waveTimerRef = useRef<any>(null);
  const errorCountRef = useRef(0);
  const wakeWordArmedUntilRef = useRef<number>(0);
  const lastWakeGreetingRef = useRef<number>(0);

  // Requirement 8: Gujarati only as default recognition language tag
  const getLanguageTag = (): string => {
    return 'gu-IN';
  };

  // Check initial support & permissions once
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setMicPermissionState('unsupported');
      setListeningStatus('permission_denied');
      setErrorMessage(
        'આ બ્રાઉઝરમાં વેબ સ્પીચ સપોર્ટેડ નથી. કૃપા કરીને Google Chrome નો ઉપયોગ કરો.'
      );
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'microphone' as any })
        .then((perm) => {
          setMicPermissionState(perm.state as MicPermissionState);
          perm.onchange = () => {
            setMicPermissionState(perm.state as MicPermissionState);
          };
        })
        .catch(() => {});
    }

    return () => {
      clearTimeout(retryTimerRef.current);
      clearInterval(waveTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const startAudioWaveAnimation = () => {
    clearInterval(waveTimerRef.current);
    waveTimerRef.current = setInterval(() => {
      const level = 0.35 + Math.random() * 0.45;
      setAudioLevel(level);
    }, 120);
  };

  const stopAudioWaveAnimation = () => {
    clearInterval(waveTimerRef.current);
    setAudioLevel(0);
  };

  // Safe internal start function: ensures only 1 recognition runs at a time
  const internalStart = useCallback(() => {
    if (isRunningRef.current || isStartingRef.current || isSpeakingRef.current || isExplicitlyStoppedRef.current) {
      return;
    }
    isStartingRef.current = true;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      isStartingRef.current = false;
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Never use unbounded continuous loop
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = getLanguageTag();

      recognition.onstart = () => {
        isStartingRef.current = false;
        isRunningRef.current = true;
        setIsListening(true);
        setListeningStatus('listening');
        setErrorMessage(null);
        setMicPermissionState('granted');
        startAudioWaveAnimation();
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        let hasFinal = false;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const text = item[0].transcript;
          if (item.isFinal) {
            final += text;
            hasFinal = true;
          } else {
            interim += text;
          }
        }

        const currentText = (final || interim).trim();
        if (currentText) {
          setInterimTranscript(currentText);
          setAudioLevel(0.85);

          const lower = currentText.toLowerCase();

          // 1. Check for Switch Assistant command in Gujarati & English
          const isSwitchToMaya =
            lower.includes('switch to maya') ||
            currentText.includes('માયા સાથે સ્વિચ') ||
            currentText.includes('માયાને ચાલુ કર') ||
            currentText.includes('માયા ચાલુ કર') ||
            currentText.includes('માયા પર સ્વિચ') ||
            currentText.includes('માયાને બોલાવો');

          const isSwitchToKing =
            lower.includes('switch to king') ||
            currentText.includes('કિંગ સાથે સ્વિચ') ||
            currentText.includes('કિંગને ચાલુ કર') ||
            currentText.includes('કિંગ ચાલુ કર') ||
            currentText.includes('કિંગ પર સ્વિચ') ||
            currentText.includes('કિંગને બોલાવો');

          const isGeneralSwitch =
            lower.includes('switch assistant') ||
            lower.includes('change assistant') ||
            currentText.includes('અસિસ્ટન્ટ બદલો') ||
            currentText.includes('આસિસ્ટન્ટ બદલો') ||
            currentText.includes('સહાયક બદલો') ||
            currentText.includes('સ્વિચ અસિસ્ટન્ટ');

          if (isSwitchToMaya) {
            setRecentRecognizedText(currentText);
            setInterimTranscript('');
            try {
              recognitionRef.current?.stop();
            } catch {
              // ignore
            }
            callbacksRef.current.onSwitchAssistantCommand('maya');
            return;
          }

          if (isSwitchToKing) {
            setRecentRecognizedText(currentText);
            setInterimTranscript('');
            try {
              recognitionRef.current?.stop();
            } catch {
              // ignore
            }
            callbacksRef.current.onSwitchAssistantCommand('king');
            return;
          }

          if (isGeneralSwitch) {
            setRecentRecognizedText(currentText);
            setInterimTranscript('');
            try {
              recognitionRef.current?.stop();
            } catch {
              // ignore
            }
            callbacksRef.current.onSwitchAssistantCommand();
            return;
          }

          // 2. Check for "King" / "Maya" wake words (with strict anti-repeat cooldown)
          const isPureKingGreeting =
            lower === 'king' ||
            lower === 'hey king' ||
            lower === 'hello king' ||
            lower === 'ok king' ||
            currentText === 'કિંગ' ||
            currentText === 'હેલો કિંગ' ||
            currentText === 'હેલોકિંગ' ||
            currentText === 'કિંગ બોલો';

          const isKingWithCommand =
            (lower.startsWith('king ') ||
             lower.startsWith('hey king ') ||
             lower.startsWith('hello king ') ||
             currentText.startsWith('કિંગ ') ||
             currentText.startsWith('હેલો કિંગ ') ||
             currentText.startsWith('હેલોકિંગ ')) &&
            currentText.length > 6;

          const isPureMayaGreeting =
            lower === 'maya' ||
            lower === 'hey maya' ||
            lower === 'hello maya' ||
            lower === 'ok maya' ||
            currentText === 'માયા' ||
            currentText === 'હેલો માયા' ||
            currentText === 'હેલોમાયા' ||
            currentText === 'માયા બોલો';

          const isMayaWithCommand =
            (lower.startsWith('maya ') ||
             lower.startsWith('hey maya ') ||
             lower.startsWith('hello maya ') ||
             currentText.startsWith('માયા ') ||
             currentText.startsWith('હેલો માયા ') ||
             currentText.startsWith('હેલોમાયા ')) &&
            currentText.length > 6;

          // King wake action
          if (isKingWithCommand && hasFinal) {
            const cleaned = currentText
              .replace(/^(hey|ok|hello)?\s*(king|કિંગ|હેલો કિંગ|હેલોકિંગ)\s*[,:]?\s*/i, '')
              .trim();
            if (cleaned.length > 1) {
              setRecentRecognizedText(currentText);
              setInterimTranscript('');
              setWakeWordDetected(false);
              callbacksRef.current.onCommandRecognized(cleaned, true);
              return;
            }
          }

          if (isPureKingGreeting) {
            const now = Date.now();
            if (now - lastWakeGreetingRef.current > 4500) {
              lastWakeGreetingRef.current = now;
              setWakeWordDetected(true);
              wakeWordArmedUntilRef.current = now + 8000;
              if (soundEnabledRef.current) playJarvisBeep('activate');
              triggerHaptic([30, 40]);
              setRecentRecognizedText(currentText);
              setInterimTranscript('');
              try {
                recognitionRef.current?.stop();
              } catch {
                // ignore
              }
              callbacksRef.current.onWakeGreeting('king');
            }
            return;
          }

          // Maya wake action
          if (isMayaWithCommand && hasFinal) {
            const cleaned = currentText
              .replace(/^(hey|ok|hello)?\s*(maya|માયા|હેલો માયા|હેલોમાયા)\s*[,:]?\s*/i, '')
              .trim();
            if (cleaned.length > 1) {
              setRecentRecognizedText(currentText);
              setInterimTranscript('');
              setWakeWordDetected(false);
              callbacksRef.current.onCommandRecognized(cleaned, true);
              return;
            }
          }

          if (isPureMayaGreeting) {
            const now = Date.now();
            if (now - lastWakeGreetingRef.current > 4500) {
              lastWakeGreetingRef.current = now;
              setWakeWordDetected(true);
              wakeWordArmedUntilRef.current = now + 8000;
              if (soundEnabledRef.current) playJarvisBeep('activate');
              triggerHaptic([30, 40]);
              setRecentRecognizedText(currentText);
              setInterimTranscript('');
              try {
                recognitionRef.current?.stop();
              } catch {
                // ignore
              }
              callbacksRef.current.onWakeGreeting('maya');
            }
            return;
          }

          // 3. Normal command processing
          if (hasFinal) {
            const isArmed = Date.now() < wakeWordArmedUntilRef.current;
            if (isArmed || isHandsFreeRef.current) {
              setRecentRecognizedText(currentText);
              setInterimTranscript('');
              setWakeWordDetected(false);
              wakeWordArmedUntilRef.current = 0;
              callbacksRef.current.onCommandRecognized(currentText, isArmed);
            } else {
              setRecentRecognizedText(currentText);
            }
          }
        }
      };

      recognition.onerror = (event: any) => {
        errorCountRef.current += 1;
        console.warn('SpeechRecognition error:', event.error);

        if (event.error === 'not-allowed') {
          setMicPermissionState('denied');
          setListeningStatus('permission_denied');
          setErrorMessage(
            'માઇક્રોફોનની પરવાનગી નકારી દેવામાં આવી છે. કૃપા કરીને બ્રાઉઝર સેટિંગ્સમાં માઇક્રોફોનની મંજૂરી આપો.'
          );
          isExplicitlyStoppedRef.current = true;
          setIsHandsFree(false);
        } else if (event.error === 'no-speech') {
          // Normal silence when nobody is speaking; do not display error
        } else if (event.error === 'network') {
          setErrorMessage('સ્પીચ રેકગ્નિશન નેટવર્ક એરર આવી. કૃપા કરીને ઇન્ટરનેટ કનેક્શન તપાસો.');
        } else if (event.error !== 'aborted') {
          setErrorMessage(`માઇક્રોફોન એરર: ${event.error}`);
        }

        isStartingRef.current = false;
        isRunningRef.current = false;
        setIsListening(false);
        stopAudioWaveAnimation();
      };

      recognition.onend = () => {
        isStartingRef.current = false;
        isRunningRef.current = false;
        setIsListening(false);
        stopAudioWaveAnimation();

        // Safe restart for Hands-Free mode when not speaking and not explicitly stopped
        if (
          isHandsFreeRef.current &&
          !isExplicitlyStoppedRef.current &&
          !isSpeakingRef.current &&
          errorCountRef.current < 3
        ) {
          setListeningStatus('idle');
          clearTimeout(retryTimerRef.current);
          // Safe 1.2s delay between listening cycles to avoid rapid toggling
          retryTimerRef.current = setTimeout(() => {
            if (!isExplicitlyStoppedRef.current && !isSpeakingRef.current) {
              internalStart();
            }
          }, 1200);
        } else {
          setListeningStatus(isSpeakingRef.current ? 'paused_for_speech' : 'idle');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Speech start caught exception:', err);
      isStartingRef.current = false;
      isRunningRef.current = false;
      setIsListening(false);
      stopAudioWaveAnimation();
    }
  }, []);

  // Requirement 6: Automatically start listening on mount when supported
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isExplicitlyStoppedRef.current && !isRunningRef.current) {
        internalStart();
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [internalStart]);

  // Public Start Listening control (Requirement 4)
  const startListening = useCallback(() => {
    isExplicitlyStoppedRef.current = false;
    errorCountRef.current = 0;
    setErrorMessage(null);
    setInterimTranscript('');
    clearTimeout(retryTimerRef.current);

    if (soundEnabledRef.current) playJarvisBeep('activate');
    triggerHaptic(30);

    internalStart();
  }, [internalStart]);

  // Public Stop Listening control (Requirement 4)
  const stopListening = useCallback(() => {
    isExplicitlyStoppedRef.current = true;
    clearTimeout(retryTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    isRunningRef.current = false;
    isStartingRef.current = false;
    setIsListening(false);
    setListeningStatus('idle');
    stopAudioWaveAnimation();

    if (soundEnabledRef.current) playJarvisBeep('deactivate');
    triggerHaptic(20);
  }, []);

  // Toggle Listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Pause listening when TTS is speaking (Requirement 9)
  const pauseListeningForSpeech = useCallback(() => {
    isSpeakingRef.current = true;
    isStartingRef.current = false;
    setIsPausedForSpeech(true);
    setListeningStatus('paused_for_speech');
    clearTimeout(retryTimerRef.current);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
    }
    isRunningRef.current = false;
    setIsListening(false);
    stopAudioWaveAnimation();
  }, []);

  // Resume listening after TTS ends with a safe delay (Requirement 9)
  const resumeListeningAfterSpeech = useCallback(() => {
    isSpeakingRef.current = false;
    setIsPausedForSpeech(false);
    setListeningStatus('idle');

    // Only auto-resume if Hands-Free was explicitly enabled by user
    if (isHandsFreeRef.current && !isExplicitlyStoppedRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        if (!isExplicitlyStoppedRef.current && !isSpeakingRef.current) {
          internalStart();
        }
      }, 800); // Safe 800ms delay after TTS ends before mic reopens
    }
  }, [internalStart]);

  // Toggle Hands-Free Mode
  const toggleHandsFree = useCallback(() => {
    setIsHandsFree((prev) => {
      const next = !prev;
      if (soundEnabledRef.current) playJarvisBeep('click');
      triggerHaptic(20);

      if (next) {
        isExplicitlyStoppedRef.current = false;
        errorCountRef.current = 0;
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(internalStart, 300);
      } else {
        isExplicitlyStoppedRef.current = true;
        clearTimeout(retryTimerRef.current);
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch {
            // ignore
          }
        }
        isRunningRef.current = false;
        setIsListening(false);
        setListeningStatus('idle');
        stopAudioWaveAnimation();
      }

      return next;
    });
  }, [internalStart]);

  return {
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
  };
}
