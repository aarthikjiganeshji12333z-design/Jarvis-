import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, RotateCcw, Bell, ExternalLink, Clock } from 'lucide-react';
import { playJarvisBeep, triggerHaptic } from '../utils/audioEffects';

interface HudTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HudTimerModal: React.FC<HudTimerModalProps> = ({ isOpen, onClose }) => {
  const [totalSeconds, setTotalSeconds] = useState(300); // 5 mins default
  const [timeLeft, setTimeLeft] = useState(300);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setIsRunning(false);
            playJarvisBeep('alarm');
            triggerHaptic([100, 50, 100, 50, 200]);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft]);

  const handleStartPause = () => {
    playJarvisBeep('click');
    triggerHaptic(20);
    if (timeLeft === 0) {
      setTimeLeft(totalSeconds);
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    playJarvisBeep('click');
    setIsRunning(false);
    setTimeLeft(totalSeconds);
  };

  const setPreset = (seconds: number) => {
    playJarvisBeep('click');
    setTotalSeconds(seconds);
    setTimeLeft(seconds);
    setIsRunning(false);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-gray-950 border border-cyan-500/50 rounded-2xl overflow-hidden shadow-[0_0_35px_rgba(6,182,212,0.4)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-cyan-950/60 border-b border-cyan-500/30">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400 animate-spin" />
            <span className="text-xs font-mono-hud font-bold tracking-widest text-cyan-300 uppercase">
              HUD CHRONO // TIMER & ALARM
            </span>
          </div>

          <button
            onClick={() => {
              playJarvisBeep('click');
              onClose();
            }}
            type="button"
            className="p-1 rounded-lg text-cyan-400 hover:text-cyan-200 hover:bg-cyan-900/40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timer Digital Display */}
        <div className="p-6 flex flex-col items-center justify-center">
          <div className="relative w-48 h-48 rounded-full border-2 border-cyan-500/30 flex flex-col items-center justify-center shadow-[inset_0_0_20px_rgba(6,182,212,0.2)] bg-gradient-to-b from-slate-900/60 to-gray-950">
            {/* Spinning decorative ticks */}
            <div className="absolute inset-1 rounded-full border border-dashed border-cyan-400/20 pointer-events-none animate-[spin_40s_linear_infinite]" />

            <span className="text-4xl font-mono-hud font-bold text-cyan-300 glow-text-cyan-strong tracking-widest">
              {formatTime(timeLeft)}
            </span>
            <span className="text-[10px] font-mono-hud text-cyan-400/70 uppercase mt-1 tracking-wider">
              {isRunning ? 'COUNTDOWN IN PROGRESS' : timeLeft === 0 ? 'ALERT! TIME EXPIRED' : 'STANDBY'}
            </span>
          </div>

          {/* Preset Buttons */}
          <div className="flex gap-2 mt-5">
            {[60, 180, 300, 600, 900].map((s) => (
              <button
                key={s}
                onClick={() => setPreset(s)}
                type="button"
                className={`px-2.5 py-1 rounded-lg text-xs font-mono-hud border transition-all ${
                  totalSeconds === s && !isRunning
                    ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
                    : 'bg-slate-900 border-cyan-500/20 text-cyan-400/80 hover:text-cyan-200'
                }`}
              >
                {s / 60}m
              </button>
            ))}
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-4 mt-6">
            <button
              onClick={handleReset}
              type="button"
              className="p-3 rounded-full bg-slate-900 border border-cyan-500/30 text-cyan-400 hover:text-cyan-200 active:scale-95 transition-all"
              title="Reset Timer"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={handleStartPause}
              type="button"
              className={`px-6 py-2.5 rounded-full font-mono-hud font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 ${
                isRunning
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_#f59e0b]'
                  : 'bg-cyan-500 text-slate-950 shadow-[0_0_20px_#00f0ff]'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>PAUSE</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>START</span>
                </>
              )}
            </button>
          </div>

          {/* Android Clock App Scheme */}
          <a
            href="intent:#Intent;action=android.intent.action.SHOW_ALARMS;end"
            target="_blank"
            rel="noreferrer"
            className="mt-5 text-[11px] font-mono-hud text-cyan-400/70 hover:text-cyan-200 flex items-center gap-1 underline underline-offset-4"
          >
            <span>Open Android System Clock & Alarms</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
