import React, { useState } from 'react';
import { X, Delete, Equal } from 'lucide-react';
import { playJarvisBeep, triggerHaptic } from '../utils/audioEffects';

interface HudCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HudCalculatorModal: React.FC<HudCalculatorModalProps> = ({ isOpen, onClose }) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  const handleDigit = (digit: string) => {
    playJarvisBeep('click');
    triggerHaptic(15);
    setDisplay((prev) => (prev === '0' ? digit : prev + digit));
  };

  const handleOperator = (op: string) => {
    playJarvisBeep('click');
    triggerHaptic(20);
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const handleClear = () => {
    playJarvisBeep('click');
    setDisplay('0');
    setEquation('');
  };

  const handleBackspace = () => {
    playJarvisBeep('click');
    triggerHaptic(15);
    setDisplay((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
  };

  const handleCalculate = () => {
    playJarvisBeep('response');
    triggerHaptic(30);
    try {
      const fullExpr = (equation + display).replace(/×/g, '*').replace(/÷/g, '/');
      // Simple safe evaluation of standard math characters
      if (!/^[0-9+\-*/. ()]+$/.test(fullExpr)) {
        setDisplay('Error');
        return;
      }
      // eslint-disable-next-line no-eval
      const result = Function(`'use strict'; return (${fullExpr})`)();
      setDisplay(String(Number(result.toFixed(6))));
      setEquation('');
    } catch {
      setDisplay('Error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xs bg-gray-950 border border-cyan-500/50 rounded-2xl overflow-hidden shadow-[0_0_35px_rgba(6,182,212,0.4)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-cyan-950/60 border-b border-cyan-500/30">
          <span className="text-xs font-mono-hud font-bold tracking-widest text-cyan-300 uppercase">
            HUD CALCULATOR // ARITHMETIC
          </span>
          <button
            onClick={() => {
              playJarvisBeep('click');
              onClose();
            }}
            type="button"
            className="p-1 rounded-lg text-cyan-400 hover:text-cyan-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Display Screen */}
        <div className="p-4 bg-slate-950 border-b border-cyan-500/20 text-right">
          <div className="text-xs font-mono-hud text-cyan-500/70 h-4">{equation}</div>
          <div className="text-3xl font-mono-hud font-bold text-cyan-300 glow-text-cyan truncate">
            {display}
          </div>
        </div>

        {/* Keypad */}
        <div className="p-3 grid grid-cols-4 gap-2 bg-gray-950 font-mono-hud">
          <button
            onClick={handleClear}
            type="button"
            className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 font-bold active:scale-95"
          >
            AC
          </button>
          <button
            onClick={handleBackspace}
            type="button"
            className="p-3 rounded-xl bg-slate-900 border border-cyan-500/30 text-cyan-400 active:scale-95 flex items-center justify-center"
          >
            <Delete className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOperator('%')}
            type="button"
            className="p-3 rounded-xl bg-slate-900 border border-cyan-500/30 text-cyan-300 font-bold active:scale-95"
          >
            %
          </button>
          <button
            onClick={() => handleOperator('÷')}
            type="button"
            className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-400/40 text-cyan-300 font-bold active:scale-95 text-lg"
          >
            ÷
          </button>

          {['7', '8', '9'].map((n) => (
            <button
              key={n}
              onClick={() => handleDigit(n)}
              type="button"
              className="p-3 rounded-xl bg-slate-900/80 border border-cyan-500/20 text-cyan-100 font-bold text-lg active:scale-95 hover:border-cyan-400"
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => handleOperator('×')}
            type="button"
            className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-400/40 text-cyan-300 font-bold active:scale-95 text-lg"
          >
            ×
          </button>

          {['4', '5', '6'].map((n) => (
            <button
              key={n}
              onClick={() => handleDigit(n)}
              type="button"
              className="p-3 rounded-xl bg-slate-900/80 border border-cyan-500/20 text-cyan-100 font-bold text-lg active:scale-95 hover:border-cyan-400"
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => handleOperator('-')}
            type="button"
            className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-400/40 text-cyan-300 font-bold active:scale-95 text-lg"
          >
            -
          </button>

          {['1', '2', '3'].map((n) => (
            <button
              key={n}
              onClick={() => handleDigit(n)}
              type="button"
              className="p-3 rounded-xl bg-slate-900/80 border border-cyan-500/20 text-cyan-100 font-bold text-lg active:scale-95 hover:border-cyan-400"
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => handleOperator('+')}
            type="button"
            className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-400/40 text-cyan-300 font-bold active:scale-95 text-lg"
          >
            +
          </button>

          <button
            onClick={() => handleDigit('0')}
            type="button"
            className="col-span-2 p-3 rounded-xl bg-slate-900/80 border border-cyan-500/20 text-cyan-100 font-bold text-lg active:scale-95 hover:border-cyan-400"
          >
            0
          </button>
          <button
            onClick={() => handleDigit('.')}
            type="button"
            className="p-3 rounded-xl bg-slate-900/80 border border-cyan-500/20 text-cyan-100 font-bold active:scale-95 hover:border-cyan-400 text-lg"
          >
            .
          </button>
          <button
            onClick={handleCalculate}
            type="button"
            className="p-3 rounded-xl bg-cyan-500 text-slate-950 font-bold text-lg active:scale-95 shadow-[0_0_15px_#00f0ff] flex items-center justify-center"
          >
            <Equal className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
