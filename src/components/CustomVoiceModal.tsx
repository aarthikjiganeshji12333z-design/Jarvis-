import React, { useState } from 'react';
import {
  Volume2,
  Crown,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Play,
  Square,
  Save,
  CheckCircle2,
  Settings2,
  Sliders,
  Cpu,
  Info,
  Server,
} from 'lucide-react';
import {
  AssistantType,
  CustomVoiceConfig,
  VoiceEngineStatus,
} from '../types/voice';

interface CustomVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  kingVoice: CustomVoiceConfig;
  mayaVoice: CustomVoiceConfig;
  onSaveVoice: (assistant: AssistantType, config: CustomVoiceConfig) => void;
  onPreviewVoice: (
    assistant: AssistantType,
    customConfig?: CustomVoiceConfig,
    testPhrase?: string
  ) => void;
  isPreviewing: boolean;
  previewingAssistant: AssistantType | null;
  onStopPreview: () => void;
  engineStatus: VoiceEngineStatus | null;
}

export function CustomVoiceModal({
  isOpen,
  onClose,
  kingVoice,
  mayaVoice,
  onSaveVoice,
  onPreviewVoice,
  isPreviewing,
  previewingAssistant,
  onStopPreview,
  engineStatus,
}: CustomVoiceModalProps) {
  const [activeTab, setActiveTab] = useState<AssistantType | 'diagnostics'>('king');

  // Local draft states
  const [kingDraft, setKingDraft] = useState<CustomVoiceConfig>(kingVoice);
  const [mayaDraft, setMayaDraft] = useState<CustomVoiceConfig>(mayaVoice);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentDraft = activeTab === 'king' ? kingDraft : mayaDraft;
  const setDraft = (updater: (prev: CustomVoiceConfig) => CustomVoiceConfig) => {
    if (activeTab === 'king') {
      setKingDraft(updater);
    } else if (activeTab === 'maya') {
      setMayaDraft(updater);
    }
  };

  const handleSave = () => {
    if (activeTab === 'king') {
      onSaveVoice('king', kingDraft);
      setSaveSuccessNotice('કિંગનો કસ્ટમ વૉઇસ પ્રોફાઇલ સફળતાપૂર્વક સાચવવામાં આવ્યો!');
    } else if (activeTab === 'maya') {
      onSaveVoice('maya', mayaDraft);
      setSaveSuccessNotice('માયાનો કસ્ટમ વૉઇસ પ્રોફાઇલ સફળતાપૂર્વક સાચવવામાં આવ્યો!');
    }
    setTimeout(() => {
      setSaveSuccessNotice(null);
    }, 2800);
  };

  const handlePreviewCurrent = () => {
    if (isPreviewing) {
      onStopPreview();
    } else if (activeTab === 'king' || activeTab === 'maya') {
      onPreviewVoice(activeTab, activeTab === 'king' ? kingDraft : mayaDraft);
    }
  };

  const isCurrentPreviewing = isPreviewing && previewingAssistant === activeTab;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-gray-950 border border-cyan-500/50 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.4)] flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-cyan-950/70 border-b border-cyan-500/30">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono-hud font-bold tracking-widest text-cyan-300 uppercase">
              કસ્ટમ AI વૉઇસ સેટિંગ્સ (CUSTOM VOICE STUDIO)
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-cyan-400 hover:text-cyan-200 text-sm px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Assistant Tabs */}
        <div className="grid grid-cols-3 bg-slate-950 border-b border-cyan-500/20 text-xs font-mono-hud">
          <button
            type="button"
            onClick={() => setActiveTab('king')}
            className={`py-2.5 px-2 flex items-center justify-center gap-1.5 border-b-2 font-bold transition-all cursor-pointer ${
              activeTab === 'king'
                ? 'border-cyan-400 text-cyan-200 bg-cyan-950/40'
                : 'border-transparent text-cyan-400/60 hover:text-cyan-300'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>કિંગ (King)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('maya')}
            className={`py-2.5 px-2 flex items-center justify-center gap-1.5 border-b-2 font-bold transition-all cursor-pointer ${
              activeTab === 'maya'
                ? 'border-purple-400 text-purple-200 bg-purple-950/40'
                : 'border-transparent text-purple-400/60 hover:text-purple-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>માયા (Maya)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('diagnostics')}
            className={`py-2.5 px-2 flex items-center justify-center gap-1.5 border-b-2 font-bold transition-all cursor-pointer ${
              activeTab === 'diagnostics'
                ? 'border-emerald-400 text-emerald-200 bg-emerald-950/40'
                : 'border-transparent text-emerald-400/60 hover:text-emerald-300'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>ડાયગ્નોસ્ટિક્સ</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 font-mono-hud text-xs text-cyan-100 overflow-y-auto">
          {saveSuccessNotice && (
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-bold">{saveSuccessNotice}</span>
            </div>
          )}

          {activeTab !== 'diagnostics' ? (
            <>
              {/* Enable Custom Voice Switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-cyan-500/30">
                <div>
                  <span className="font-bold text-cyan-200 block">
                    કસ્ટમ AI વૉઇસ સક્રિય કરો (Enable Custom Voice)
                  </span>
                  <span className="text-[10px] text-cyan-400/80">
                    {activeTab === 'king'
                      ? 'કિંગ માટે ડીપ પુરુષ AI કસ્ટમ વૉઇસ જનરેશન'
                      : 'માયા માટે ક્યુટ સ્ત્રી AI કસ્ટમ વૉઇસ જનરેશન'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={currentDraft.enabled}
                  onChange={(e) => setDraft((prev) => ({ ...prev, enabled: e.target.checked }))}
                  className="w-5 h-5 accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Requirement 1: Explicit Voice Owner Consent Verification */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  currentDraft.consentVerified
                    ? 'bg-slate-900/90 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : 'bg-amber-950/40 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <ShieldCheck
                      className={`w-4 h-4 ${
                        currentDraft.consentVerified ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    />
                    <span
                      className={
                        currentDraft.consentVerified ? 'text-emerald-300' : 'text-amber-300'
                      }
                    >
                      અવાજ માલિક સ્પષ્ટ સંમતિ (EXPLICIT OWNER CONSENT)
                    </span>
                  </div>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                      currentDraft.consentVerified
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {currentDraft.consentVerified ? '✓ સંમતિ પ્રમાણિત' : '⚠ સંમતિ જરૂરી'}
                  </span>
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={currentDraft.consentVerified}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, consentVerified: e.target.checked }))
                    }
                    className="w-4 h-4 mt-0.5 accent-emerald-500 shrink-0 cursor-pointer"
                  />
                  <span className="text-[11px] leading-relaxed text-cyan-100 font-sans">
                    હું પ્રમાણિત કરું છું કે આ AI વૉઇસ પ્રોફાઇલ અવાજના મૂળ માલિકની સ્પષ્ટ, સભાન અને
                    લેખિત સંમતિ (Explicit Written Consent) સાથે નૈતિક AI માર્ગદર્શિકા હેઠળ તૈયાર કરવામાં
                    આવેલ છે.
                  </span>
                </label>

                <div className="mt-2.5 pt-2 border-t border-cyan-500/20">
                  <label className="block text-[10px] text-cyan-300/80 mb-1">
                    સંમતિ સંદર્ભ / લાયસન્સ ID (Owner Consent License / Ref):
                  </label>
                  <input
                    type="text"
                    value={currentDraft.consentAttestation}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, consentAttestation: e.target.value }))
                    }
                    placeholder="e.g. Consent Ref #KG-2026-GUJ (Voice Owner Explicit Agreement)"
                    className="w-full bg-slate-950 border border-cyan-500/30 rounded-lg px-2.5 py-1.5 text-xs text-cyan-200 font-mono"
                  />
                </div>
              </div>

              {/* Voice Generation Engine Provider */}
              <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/30 space-y-2">
                <label className="block font-bold text-cyan-300 text-xs">
                  વૉઇસ સિન્થેસિસ એન્જિન (TTS Engine Provider):
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, provider: 'gemini_persona' }))}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      currentDraft.provider === 'gemini_persona'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                        : 'bg-slate-950 border-cyan-500/20 text-cyan-400/70 hover:border-cyan-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span>Gemini Neural Voice Engine (સંમતિ-પ્રમાણિત AI પર્સોના)</span>
                      <span className="text-[10px] text-emerald-400">✓ સક્રિય (Ready)</span>
                    </div>
                    <p className="text-[10px] text-cyan-300/80 font-sans mt-0.5">
                      શ્રેષ્ઠ કુદરતી ગુજરાતી ઉચ્ચાર, પિચ કસ્ટમાઇઝેશન અને વિટી/ફન એક્સપ્રેશન સાથે.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, provider: 'elevenlabs' }))}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      currentDraft.provider === 'elevenlabs'
                        ? 'bg-purple-500/20 border-purple-400 text-purple-200'
                        : 'bg-slate-950 border-cyan-500/20 text-cyan-400/70 hover:border-cyan-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span>External Cloned Voice API (ElevenLabs / Custom Model)</span>
                      <span
                        className={`text-[10px] font-bold ${
                          engineStatus?.elevenlabsClone.available
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {engineStatus?.elevenlabsClone.available ? '✓ કનેક્ટેડ' : 'સર્વર કી જરૂરી'}
                      </span>
                    </div>
                    <p className="text-[10px] text-cyan-300/80 font-sans mt-0.5">
                      સર્વર પર સુરક્ષિત રીતે જોડાયેલ કસ્ટમ ક્લોન કરેલ વૉઇસ ID દ્વારા વૉઇસ જનરેશન.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, provider: 'browser_speech' }))}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      currentDraft.provider === 'browser_speech'
                        ? 'bg-blue-500/20 border-blue-400 text-blue-200'
                        : 'bg-slate-950 border-cyan-500/20 text-cyan-400/70 hover:border-cyan-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span>લોકલ સ્પીચ સિન્થેસિસ (Web Speech API)</span>
                      <span className="text-[10px] text-emerald-400">✓ લોકલ ઉપલબ્ધ</span>
                    </div>
                    <p className="text-[10px] text-cyan-300/80 font-sans mt-0.5">
                      ઇન્ટરનેટ વિના પણ બ્રાઉઝર અને એન્ડ્રોઇડ સિસ્ટમ વૉઇસ સાથે ત્વરિત પ્રતિભાવ.
                    </p>
                  </button>
                </div>
              </div>

              {/* Presets & Persona Style Prompt */}
              <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/30 space-y-2.5">
                <label className="block font-bold text-cyan-300 text-xs">
                  વૉઇસ પર્સોના અને પ્રોફાઇલ (Voice Persona & Preset):
                </label>

                {activeTab === 'king' ? (
                  <div className="space-y-2">
                    {/* Reference Audio Indicator */}
                    <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-cyan-400" />
                        <div>
                          <div className="text-[11px] font-bold text-cyan-200">
                            રેફરન્સ ઓડિયો: Standard recording 4.mp3
                          </div>
                          <div className="text-[9px] text-cyan-400/80 font-sans">
                            કિંગનો અવાજ આ રેકોર્ડિંગની નેચરલ પર્સોના, શાંત ટોન અને કુદરતી કેડન્સ અનુસાર બનાવવામાં આવ્યો છે.
                          </div>
                        </div>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shrink-0">
                        REFERENCE TARGET
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            voicePresetId: 'king-standard-rec4',
                            referenceAudioName: 'Standard recording 4.mp3',
                            voiceName: 'King Natural Baritone (Standard recording 4.mp3 Reference)',
                            prebuiltVoice: 'Charon',
                            personaStyle:
                              'Natural, calm, warm, articulate conversational male baritone matching Standard recording 4 audio profile with smooth cadence, friendly tone and clear Gujarati pronunciation without theatrical gruffness',
                            pitch: 0.98,
                            rate: 1.00,
                          }))
                        }
                        className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                          currentDraft.voicePresetId === 'king-standard-rec4'
                            ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                            : 'bg-slate-950 border-cyan-500/20 text-cyan-400/70'
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>કામ નેચરલ બેરીટોન</span>
                          <span className="text-[9px] text-emerald-400 font-normal">મુખ્ય</span>
                        </div>
                        <div className="text-[10px] text-cyan-300/70">
                          Charon • પિચ 0.98 • Rec 4 Target
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setDraft((prev) => ({
                            ...prev,
                            voicePresetId: 'king-rec4-warm-puck',
                            referenceAudioName: 'Standard recording 4.mp3',
                            voiceName: 'Standard recording 4 (Warm Conversational)',
                            prebuiltVoice: 'Puck',
                            personaStyle:
                              'Warm, approachable, articulate conversational male voice modeled after Standard recording 4 audio dynamics in natural Gujarati',
                            pitch: 1.00,
                            rate: 1.00,
                          }))
                        }
                        className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                          currentDraft.voicePresetId === 'king-rec4-warm-puck'
                            ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                            : 'bg-slate-950 border-cyan-500/20 text-cyan-400/70'
                        }`}
                      >
                        <div className="font-bold">વોર્મ આર્ટિક્યુલેટ</div>
                        <div className="text-[10px] text-cyan-300/70">
                          Puck • પિચ 1.00 • Rec 4 Dynamic
                        </div>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          voicePresetId: 'maya-cute-expressive',
                          voiceName: 'Maya Sweet & Expressive Companion',
                          prebuiltVoice: 'Kore',
                          personaStyle:
                            'Cute, sweet, cheerful, bubbly feminine voice with pleasant laughing cadence in natural Gujarati',
                          pitch: 1.22,
                          rate: 1.04,
                        }))
                      }
                      className={`p-2 rounded-lg border text-left cursor-pointer ${
                        currentDraft.voicePresetId === 'maya-cute-expressive'
                          ? 'bg-purple-500/25 border-purple-400 text-purple-200'
                          : 'bg-slate-950 border-purple-500/20 text-purple-400/70'
                      }`}
                    >
                      <div className="font-bold">ક્યુટ સ્વીટ (Maya Sweet)</div>
                      <div className="text-[10px] text-purple-300/70">Kore • પિચ 1.22</div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          voicePresetId: 'maya-radiant-breeze',
                          voiceName: 'Maya Radiant Melodic',
                          prebuiltVoice: 'Zephyr',
                          personaStyle:
                            'Warm, gentle, articulate, melodic feminine companion voice in natural Gujarati',
                          pitch: 1.15,
                          rate: 1.00,
                        }))
                      }
                      className={`p-2 rounded-lg border text-left cursor-pointer ${
                        currentDraft.voicePresetId === 'maya-radiant-breeze'
                          ? 'bg-purple-500/25 border-purple-400 text-purple-200'
                          : 'bg-slate-950 border-purple-500/20 text-purple-400/70'
                      }`}
                    >
                      <div className="font-bold">રેડિયન્ટ સોફ્ટ (Melodic)</div>
                      <div className="text-[10px] text-purple-300/70">Zephyr • પિચ 1.15</div>
                    </button>
                  </div>
                )}

                {/* External Voice ID if elevenlabs selected */}
                {currentDraft.provider === 'elevenlabs' && (
                  <div className="pt-2">
                    <label className="block text-[10px] text-purple-300 mb-1">
                      કસ્ટમ ક્લોન વૉઇસ ID (ElevenLabs Voice ID):
                    </label>
                    <input
                      type="text"
                      value={currentDraft.customVoiceId || ''}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, customVoiceId: e.target.value }))
                      }
                      placeholder="e.g. 21m00Tcm4TlvDq8ikWAM"
                      className="w-full bg-slate-950 border border-purple-500/40 rounded-lg px-2.5 py-1.5 text-xs text-purple-200 font-mono"
                    />
                  </div>
                )}

                {/* Persona Style Description */}
                <div className="pt-2">
                  <label className="block text-[10px] text-cyan-300 mb-1">
                    વૉઇસ સ્ટાઇલ / પર્સોના પ્રોમ્પ્ટ (Voice Persona Conditioning Prompt):
                  </label>
                  <textarea
                    rows={2}
                    value={currentDraft.personaStyle}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, personaStyle: e.target.value }))
                    }
                    className="w-full bg-slate-950 border border-cyan-500/30 rounded-lg p-2 text-xs text-cyan-200 font-sans"
                  />
                </div>
              </div>

              {/* Pitch & Rate Sliders */}
              <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/30 space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-cyan-300 font-bold">અવાજની પિચ (Pitch Frequency):</span>
                    <span className="text-cyan-200 font-mono">{currentDraft.pitch.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.02"
                    value={currentDraft.pitch}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, pitch: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-cyan-400/60 font-mono">
                    <span>ડીપ બેરીટોન (0.50)</span>
                    <span>સામાન્ય (1.00)</span>
                    <span>ક્યુટ હાઈ-પિચ (1.50)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-cyan-300 font-bold">બોલવાની ગતિ (Speech Cadence):</span>
                    <span className="text-cyan-200 font-mono">{currentDraft.rate.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.02"
                    value={currentDraft.rate}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, rate: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Requirement 3: Voice Preview & Save Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handlePreviewCurrent}
                  className={`flex-1 py-2.5 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 text-xs transition-all cursor-pointer ${
                    isCurrentPreviewing
                      ? 'bg-rose-500/20 border-rose-400 text-rose-200 animate-pulse'
                      : 'bg-cyan-950/80 hover:bg-cyan-900/90 border-cyan-500/50 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  }`}
                >
                  {isCurrentPreviewing ? (
                    <>
                      <Square className="w-4 h-4 fill-current" />
                      <span>અવાજ રોકો (Stop Audio)</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 text-cyan-400" />
                      <span>અવાજ સાંભળો (Preview Voice)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold flex items-center justify-center gap-2 text-xs border border-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>પ્રોફાઇલ સાચવો (Save Voice)</span>
                </button>
              </div>
            </>
          ) : (
            /* Requirement 8: Honest Diagnostics & Setup Panel */
            <div className="space-y-3 font-sans">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-cyan-500/40 space-y-2">
                <div className="font-hud font-bold text-cyan-300 text-sm flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-cyan-400" />
                  <span>વૉઇસ એન્જિન સ્થિતિ (Voice Engine Diagnostics)</span>
                </div>
                <p className="text-[11px] text-cyan-200/90 leading-relaxed font-sans">
                  JARVIS આર્કિટેક્ચરમાં AI વૉઇસ ક્લોનિંગ અને જનરેશન કઈ રીતે કાર્ય કરે છે તેની સચોટ માહિતી:
                </p>

                <div className="space-y-2 pt-1 font-mono-hud text-xs">
                  {/* Gemini TTS Engine */}
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-emerald-500/40 flex items-start justify-between">
                    <div>
                      <div className="text-emerald-300 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Gemini Neural Voice (gemini-3.8-flash-tts)</span>
                      </div>
                      <div className="text-[10px] text-cyan-200/80 font-sans mt-0.5">
                        ગુજરાતી ભાષા, પર્સોના કન્ડીશનીંગ અને હાઇ-ક્વોલિટી ઓડિયો આઉટપુટ સાથે સક્રિય છે.
                      </div>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shrink-0">
                      ACTIVE
                    </span>
                  </div>

                  {/* Browser Synthesis */}
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-cyan-500/40 flex items-start justify-between">
                    <div>
                      <div className="text-cyan-300 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Client SpeechSynthesis (Web Speech API)</span>
                      </div>
                      <div className="text-[10px] text-cyan-200/80 font-sans mt-0.5">
                        કિંગ માટે નેચરલ પુરુષ પિચ (0.98 - Standard recording 4 રેફરન્સ) અને માયા માટે હાઈ સ્ત્રી પિચ (1.22) મોડ્યુલેશન કાર્યરત. (નોંધ: બ્રાઉઝર વૉઇસ ઓડિયો રેકોર્ડિંગ ક્લોન કરી શકતો નથી).
                      </div>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shrink-0">
                      ACTIVE
                    </span>
                  </div>

                  {/* ElevenLabs External Cloning */}
                  <div
                    className={`p-2.5 rounded-lg bg-slate-950 border flex items-start justify-between ${
                      engineStatus?.elevenlabsClone.available
                        ? 'border-emerald-500/40'
                        : 'border-amber-500/40'
                    }`}
                  >
                    <div>
                      <div
                        className={`font-bold flex items-center gap-1.5 ${
                          engineStatus?.elevenlabsClone.available
                            ? 'text-emerald-300'
                            : 'text-amber-300'
                        }`}
                      >
                        {engineStatus?.elevenlabsClone.available ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span>External Voice Replication (ElevenLabs Proxy)</span>
                      </div>
                      <div className="text-[10px] text-cyan-200/80 font-sans mt-0.5">
                        {engineStatus?.elevenlabsClone.available
                          ? 'સર્વર પર ELEVENLABS_API_KEY કન્ફિગર થયેલ છે.'
                          : 'સર્વર પર ELEVENLABS_API_KEY સેટ નથી. સિસ્ટમ આપમેળે Gemini Neural Voice અથવા મોડ્યુલેટેડ સિન્થેસિસ પર સ્વિચ થાય છે.'}
                      </div>
                    </div>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded font-bold shrink-0 ${
                        engineStatus?.elevenlabsClone.available
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {engineStatus?.elevenlabsClone.available ? 'CONFIGURED' : 'NEEDS SERVER KEY'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Requirement 7: Secure Server-Side Key Configuration notice */}
              <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-200">
                <div className="font-hud font-bold text-purple-300 text-xs mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span>સિક્યોરિટી અને સુરક્ષિત કન્ફિગરેશન (Security Notice):</span>
                </div>
                <p className="text-[11px] text-purple-200/90 leading-relaxed font-sans">
                  કોઈપણ કસ્ટમ વૉઇસ API કી (જેમ કે ElevenLabs અથવા ક્લાઉડ TTS API) ક્યારેય ફ્રન્ટએન્ડ કોડમાં
                  દેખાતી નથી. તમામ કૉલ્સ બેકએન્ડ સર્વર (<code className="text-purple-300">server.ts</code>)
                  દ્વારા સુરક્ષિત રીતે પ્રોક્સી થાય છે.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
