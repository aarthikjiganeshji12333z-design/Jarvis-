import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Loader2, Sparkles, RefreshCw, Radio } from 'lucide-react';
import { AssistantType } from '../hooks/useSpeechSynthesis';

interface ArcReactorCoreProps {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  isHandsFree?: boolean;
  isPausedForSpeech?: boolean;
  wakeWordDetected?: boolean;
  audioLevel: number;
  activeAssistant: AssistantType;
  onToggleMic: () => void;
  onSwitchAssistant: () => void;
  statusText?: string;
  detectedLang?: string;
}

export const ArcReactorCore: React.FC<ArcReactorCoreProps> = ({
  isListening,
  isProcessing,
  isSpeaking,
  isHandsFree = true,
  isPausedForSpeech = false,
  wakeWordDetected = false,
  audioLevel,
  activeAssistant,
  onToggleMic,
  onSwitchAssistant,
  statusText,
  detectedLang,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animIdRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  const isMaya = activeAssistant === 'maya';

  // Render dynamic HUD audio circular waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = 320);
    let height = (canvas.height = 320);
    const centerX = width / 2;
    const centerY = height / 2;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      phaseRef.current += 0.035;

      const baseRadius = 88;
      const numBars = 48;
      const angleStep = (Math.PI * 2) / numBars;

      // Draw subtle circular radar ticks
      ctx.save();
      ctx.strokeStyle = isMaya
        ? 'rgba(192, 132, 252, 0.2)'
        : 'rgba(6, 182, 212, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius - 18, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius + 32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Draw reactive wave bars around the core
      for (let i = 0; i < numBars; i++) {
        const angle = i * angleStep;
        let barHeight = 4;

        if (wakeWordDetected) {
          const noise = Math.sin(phaseRef.current * 7 + i * 0.5) * 0.5 + 0.5;
          barHeight = 10 + noise * 24;
        } else if (isListening) {
          const noise = Math.sin(phaseRef.current * 4 + i * 0.4) * 0.5 + 0.5;
          barHeight = 7 + (audioLevel * 36 + noise * 14);
        } else if (isSpeaking) {
          const wave = Math.sin(phaseRef.current * 3.5 + i * 0.35) * 0.6 + 0.4;
          barHeight = 6 + wave * 24;
        } else if (isProcessing) {
          const scan = Math.sin(phaseRef.current * 6 - i * 0.2);
          barHeight = 5 + Math.max(0, scan * 18);
        } else {
          const idleWave = Math.sin(phaseRef.current * 1.5 + i * 0.15);
          barHeight = 3.5 + idleWave * 3.5;
        }

        const x1 = centerX + Math.cos(angle) * baseRadius;
        const y1 = centerY + Math.sin(angle) * baseRadius;
        const x2 = centerX + Math.cos(angle) * (baseRadius + barHeight);
        const y2 = centerY + Math.sin(angle) * (baseRadius + barHeight);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);

        if (wakeWordDetected) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.8;
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 10;
        } else if (isListening) {
          ctx.strokeStyle = isMaya ? '#f472b6' : '#22d3ee';
          ctx.lineWidth = 2.6;
          ctx.shadowColor = isMaya ? '#ec4899' : '#00f0ff';
          ctx.shadowBlur = 9;
        } else if (isSpeaking) {
          ctx.strokeStyle = isMaya ? '#c084fc' : '#38bdf8';
          ctx.lineWidth = 2.4;
          ctx.shadowColor = isMaya ? '#a855f7' : '#38bdf8';
          ctx.shadowBlur = 7;
        } else if (isProcessing) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 5;
        } else {
          ctx.strokeStyle = isMaya
            ? 'rgba(192, 132, 252, 0.45)'
            : 'rgba(6, 182, 212, 0.45)';
          ctx.lineWidth = 1.8;
          ctx.shadowBlur = 0;
        }

        ctx.stroke();
      }

      animIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animIdRef.current) {
        cancelAnimationFrame(animIdRef.current);
      }
    };
  }, [isListening, isSpeaking, isProcessing, audioLevel, isMaya, wakeWordDetected]);

  // Determine current active status label in Gujarati
  const getStatusInfo = () => {
    const assistantLabel = isMaya ? 'માયા (MAYA)' : 'કિંગ (KING)';

    if (wakeWordDetected) {
      return {
        label: `વેક-વર્ડ ડિટેક્ટ થયો • ${assistantLabel} સાંભળે છે`,
        color: 'text-amber-300 font-bold',
        dot: 'bg-amber-400 animate-ping',
        sub: 'તમારો આદેશ બોલો (જેમ કે: "YouTube ખોલો")...',
      };
    }

    if (isProcessing) {
      return {
        label: `${assistantLabel} પ્રોસેસ કરી રહ્યા છે...`,
        color: 'text-cyan-400',
        dot: 'bg-cyan-400 animate-spin',
        sub: 'AI આદેશ તૈયાર કરી રહ્યું છે...',
      };
    }

    if (isSpeaking) {
      return {
        label: `${assistantLabel} જવાબ આપી રહ્યા છે...`,
        color: isMaya ? 'text-purple-300' : 'text-sky-300',
        dot: isMaya ? 'bg-purple-400 animate-pulse' : 'bg-sky-400 animate-pulse',
        sub: 'અવાજ ચાલે છે (માઇક થોભાવ્યું છે)',
      };
    }

    if (isPausedForSpeech) {
      return {
        label: `માઇક થોભાવ્યું છે • ${assistantLabel} બોલે છે`,
        color: 'text-sky-300',
        dot: 'bg-sky-400 animate-pulse',
        sub: 'ઓડિયો પૂર્ણ થતાં માઇક આપોઆપ શરૂ થશે',
      };
    }

    if (isListening) {
      return {
        label: isHandsFree
          ? `${assistantLabel} હેન્ડ્સ-ફ્રી ચાલુ ("${isMaya ? 'Hello Maya' : 'Hello King'}" કહો)`
          : `${assistantLabel} સાંભળી રહ્યા છે...`,
        color: isMaya ? 'text-pink-300' : 'text-cyan-300',
        dot: 'bg-emerald-400 animate-ping',
        sub: 'ગુજરાતીમાં બોલો (જેમ કે: "YouTube ખોલો")',
      };
    }

    return {
      label: `${assistantLabel} સ્ટેન્ડબાય • માઇક તૈયાર`,
      color: isMaya ? 'text-purple-300' : 'text-cyan-400',
      dot: isMaya ? 'bg-purple-400' : 'bg-emerald-400',
      sub: isHandsFree ? 'ઓટો-લિસનિંગ સક્રિય છે' : 'બોલવા માટે માઇક પર ટેપ કરો',
    };
  };

  const statusInfo = getStatusInfo();
  const avatarSrc = isMaya
    ? '/src/assets/images/maya_avatar_1792676510909.jpg'
    : '/src/assets/images/king_avatar_1792676495636.jpg';

  return (
    <div className="relative flex flex-col items-center justify-center py-2 select-none">
      {/* Outer ambient glow */}
      <div
        className={`absolute w-72 h-72 rounded-full transition-all duration-700 pointer-events-none blur-3xl opacity-30 ${
          wakeWordDetected
            ? 'bg-amber-400 opacity-60 scale-110'
            : isListening
            ? isMaya
              ? 'bg-pink-500 opacity-60 scale-110'
              : 'bg-cyan-400 opacity-60 scale-110'
            : isSpeaking
            ? isMaya
              ? 'bg-purple-500 opacity-55 scale-105'
              : 'bg-sky-500 opacity-50 scale-105'
            : isProcessing
            ? 'bg-teal-400 opacity-40 scale-100 animate-pulse'
            : isMaya
            ? 'bg-purple-600 opacity-30'
            : 'bg-cyan-600 opacity-25'
        }`}
      />

      {/* Main Arc Reactor Assembly */}
      <div className="relative w-76 h-76 sm:w-80 sm:h-80 flex items-center justify-center">
        {/* Outer Rotating HUD Ring 1 */}
        <div
          className={`absolute inset-0 rounded-full border border-dashed pointer-events-none ${
            isMaya ? 'border-purple-500/25' : 'border-cyan-500/20'
          } ${
            isListening || isSpeaking
              ? 'animate-[spin_10s_linear_infinite]'
              : 'animate-[spin_24s_linear_infinite]'
          }`}
          style={{ borderWidth: '1.5px' }}
        />

        {/* Outer Rotating HUD Ring 2 (Counter-clockwise) */}
        <div
          className={`absolute inset-4 rounded-full border pointer-events-none animate-[spin_18s_linear_infinite_reverse] ${
            isMaya ? 'border-purple-400/30' : 'border-cyan-400/25'
          }`}
          style={{
            borderTopColor: isMaya ? '#c084fc' : '#00f0ff',
            borderRightColor: 'transparent',
          }}
        />

        {/* Outer Rotating Segmented Brackets */}
        <div className="absolute inset-8 rounded-full border border-cyan-500/15 pointer-events-none flex items-center justify-between px-1">
          <div
            className={`w-2 h-2 rounded-full ${
              isMaya
                ? 'bg-purple-400 shadow-[0_0_8px_#c084fc]'
                : 'bg-cyan-400 shadow-[0_0_8px_#00f0ff]'
            }`}
          />
          <div
            className={`w-2 h-2 rounded-full ${
              isMaya
                ? 'bg-purple-400 shadow-[0_0_8px_#c084fc]'
                : 'bg-cyan-400 shadow-[0_0_8px_#00f0ff]'
            }`}
          />
        </div>

        {/* Live Audio Visualizer Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />

        {/* Central Core Button with Distinct Avatar */}
        <button
          onClick={onToggleMic}
          disabled={isProcessing}
          type="button"
          aria-label={isListening ? 'Stop listening' : `Speak to ${isMaya ? 'Maya' : 'King'}`}
          className={`relative z-20 w-40 h-40 rounded-full flex flex-col items-center justify-center transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-cyan-400/50 cursor-pointer active:scale-95 group overflow-hidden ${
            wakeWordDetected
              ? 'border-2 border-amber-300 shadow-[0_0_35px_#f59e0b] ring-4 ring-amber-400/40'
              : isListening
              ? isMaya
                ? 'border-2 border-pink-300 shadow-[0_0_35px_#ec4899] ring-4 ring-pink-400/30'
                : 'border-2 border-cyan-300 shadow-[0_0_35px_#00f0ff] ring-4 ring-cyan-400/30'
              : isSpeaking
              ? isMaya
                ? 'border-2 border-purple-400 shadow-[0_0_25px_#c084fc]'
                : 'border-2 border-sky-400 shadow-[0_0_25px_#38bdf8]'
              : isProcessing
              ? 'border-2 border-cyan-500/50 shadow-[0_0_15px_#06b6d4]'
              : isMaya
              ? 'border-2 border-purple-500/50 hover:border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
              : 'border-2 border-cyan-500/50 hover:border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
          }`}
        >
          {/* Circular Assistant Avatar Image */}
          <div className="absolute inset-0 w-full h-full">
            <img
              src={avatarSrc}
              alt={isMaya ? 'Maya Female Assistant Avatar' : 'King Male Assistant Avatar'}
              referrerPolicy="no-referrer"
              className={`w-full h-full object-cover transition-transform duration-700 ${
                isListening || isSpeaking ? 'scale-110 brightness-110' : 'scale-100 group-hover:scale-105'
              }`}
            />
            {/* Holographic dark tint overlay */}
            <div
              className={`absolute inset-0 bg-gradient-to-t ${
                isMaya
                  ? 'from-purple-950/85 via-purple-950/20 to-black/30'
                  : 'from-cyan-950/85 via-cyan-950/20 to-black/30'
              } pointer-events-none`}
            />
          </div>

          {/* Central Floating Audio / Status Badge */}
          <div className="relative z-10 flex flex-col items-center justify-end h-full pb-2.5">
            {/* Floating Status Icon Badge */}
            <div
              className={`mb-1 p-1.5 rounded-full backdrop-blur-md border ${
                isProcessing
                  ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300'
                  : isSpeaking
                  ? isMaya
                    ? 'bg-purple-950/80 border-purple-400 text-purple-200'
                    : 'bg-cyan-950/80 border-cyan-400 text-cyan-200'
                  : isListening
                  ? 'bg-rose-950/85 border-rose-400 text-rose-200 animate-pulse'
                  : 'bg-slate-900/80 border-cyan-500/40 text-cyan-300'
              }`}
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isSpeaking ? (
                <Volume2 className="w-5 h-5 animate-pulse" />
              ) : isListening ? (
                <Mic className="w-5 h-5 animate-bounce" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </div>

            {/* Assistant Name Label */}
            <div className="flex flex-col items-center">
              <span
                className={`text-[11px] tracking-wider font-hud font-extrabold uppercase px-2 py-0.5 rounded-md backdrop-blur-md ${
                  wakeWordDetected
                    ? 'bg-amber-950/90 text-amber-200 border border-amber-400/60'
                    : isMaya
                    ? 'bg-purple-950/80 text-purple-200 border border-purple-400/60'
                    : 'bg-cyan-950/80 text-cyan-200 border border-cyan-400/60'
                }`}
              >
                {isMaya ? 'MAYA (સ્ત્રી)' : 'KING (પુરુષ)'}
              </span>
              <span className="text-[9px] tracking-widest font-mono-hud text-cyan-200/90 font-semibold drop-shadow-md uppercase mt-0.5">
                {wakeWordDetected
                  ? 'બોલો...'
                  : isListening
                  ? 'સાંભળે છે'
                  : isSpeaking
                  ? 'બોલે છે'
                  : isProcessing
                  ? 'પ્રોસેસિંગ'
                  : 'માઇક ટેપ કરો'}
              </span>
            </div>
          </div>
        </button>

        {/* Orbiting Avatar Badge Info */}
        <div className="absolute top-2 left-6 text-[9px] font-mono-hud text-cyan-400/80 pointer-events-none font-bold uppercase">
          {isMaya ? 'માયા // ગર્લ અવતાર (FEMALE)' : 'કિંગ // બોય અવતાર (MALE)'}
        </div>

        {/* Quick Switch Assistant Pill */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSwitchAssistant();
          }}
          type="button"
          title="Switch Assistant between King and Maya"
          className="absolute bottom-2 right-3 text-[10px] font-mono-hud px-2.5 py-1.5 rounded-xl bg-slate-900/95 border border-cyan-500/50 text-cyan-200 hover:text-white hover:border-cyan-300 flex items-center gap-1.5 active:scale-95 transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] z-30 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3 text-cyan-400" />
          <span>{isMaya ? 'કિંગ પર સ્વિચ કરો' : 'માયા પર સ્વિચ કરો'}</span>
        </button>
      </div>

      {/* Dynamic Status HUD Display in Gujarati */}
      <div className="mt-2 text-center max-w-sm px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-500/30 backdrop-blur-md">
          <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
          <span className={`text-xs font-mono-hud tracking-wider ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-900/60 text-cyan-200 border border-cyan-400/40 font-mono-hud uppercase font-bold">
            ગુજરાતી (GU)
          </span>
        </div>
        <p className="text-xs text-cyan-300/80 mt-1 font-mono-hud truncate">
          {statusText || statusInfo.sub}
        </p>
      </div>
    </div>
  );
};
