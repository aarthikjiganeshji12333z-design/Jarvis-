import React from 'react';
import {
  Phone,
  MessageSquare,
  Youtube,
  MapPin,
  Camera,
  Clock,
  Calculator,
  Mail,
  Calendar,
  Globe,
  Radio,
  ExternalLink,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { playJarvisBeep, triggerHaptic } from '../utils/audioEffects';

export interface AndroidAppItem {
  id: string;
  name: string;
  nameGu: string;
  nameHi: string;
  category: 'communication' | 'media' | 'utility' | 'google';
  icon: React.ReactNode;
  color: string;
  glowColor: string;
  actionType: 'url' | 'tel' | 'sms' | 'mailto' | 'camera_modal' | 'timer_modal' | 'calc_modal';
  url?: string;
  description: string;
}

interface AppLauncherProps {
  onOpenAppAction: (app: AndroidAppItem) => void;
  languageMode: 'auto' | 'gu' | 'hi' | 'en';
}

export const ANDROID_APPS: AndroidAppItem[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    nameGu: 'વોટ્સએપ',
    nameHi: 'व्हाट्सएप',
    category: 'communication',
    icon: <MessageSquare className="w-5 h-5" />,
    color: 'from-emerald-600 to-green-700',
    glowColor: '#10b981',
    actionType: 'url',
    url: 'https://api.whatsapp.com/send',
    description: 'Direct WhatsApp chat launcher',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    nameGu: 'યુટ્યુબ',
    nameHi: 'यूट्यूब',
    category: 'media',
    icon: <Youtube className="w-5 h-5" />,
    color: 'from-red-600 to-rose-700',
    glowColor: '#ef4444',
    actionType: 'url',
    url: 'https://www.youtube.com',
    description: 'Stream videos and music',
  },
  {
    id: 'dialer',
    name: 'Phone / Dialer',
    nameGu: 'ફોન / કૉલ',
    nameHi: 'फ़ोन / डायलर',
    category: 'communication',
    icon: <Phone className="w-5 h-5" />,
    color: 'from-blue-600 to-cyan-700',
    glowColor: '#06b6d4',
    actionType: 'tel',
    url: 'tel:',
    description: 'Open device phone dialer',
  },
  {
    id: 'maps',
    name: 'Google Maps',
    nameGu: 'ગૂગલ મેપ્સ',
    nameHi: 'गूगल मैप्स',
    category: 'google',
    icon: <MapPin className="w-5 h-5" />,
    color: 'from-amber-500 to-orange-600',
    glowColor: '#f59e0b',
    actionType: 'url',
    url: 'https://www.google.com/maps',
    description: 'GPS navigation and places',
  },
  {
    id: 'camera',
    name: 'Camera HUD',
    nameGu: 'કેમેરો',
    nameHi: 'कैमरा',
    category: 'utility',
    icon: <Camera className="w-5 h-5" />,
    color: 'from-cyan-600 to-teal-700',
    glowColor: '#00f0ff',
    actionType: 'camera_modal',
    description: 'HUD vision scanner and camera',
  },
  {
    id: 'sms',
    name: 'SMS / Text',
    nameGu: 'મેસેજ',
    nameHi: 'मैसेज',
    category: 'communication',
    icon: <Radio className="w-5 h-5" />,
    color: 'from-indigo-600 to-blue-700',
    glowColor: '#6366f1',
    actionType: 'sms',
    url: 'sms:',
    description: 'Android Messages SMS app',
  },
  {
    id: 'clock',
    name: 'Clock & Timer',
    nameGu: 'ઘડિયાળ / ટાઈમર',
    nameHi: 'घड़ी / टाइमर',
    category: 'utility',
    icon: <Clock className="w-5 h-5" />,
    color: 'from-purple-600 to-violet-700',
    glowColor: '#a855f7',
    actionType: 'timer_modal',
    description: 'Built-in HUD timer & alarms',
  },
  {
    id: 'calculator',
    name: 'Calculator',
    nameGu: 'કેલ્ક્યુલેટર',
    nameHi: 'कैलकुलेटर',
    category: 'utility',
    icon: <Calculator className="w-5 h-5" />,
    color: 'from-teal-600 to-emerald-700',
    glowColor: '#14b8a6',
    actionType: 'calc_modal',
    description: 'Futuristic HUD math tool',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    nameGu: 'જીમેઇલ',
    nameHi: 'जीमेल',
    category: 'google',
    icon: <Mail className="w-5 h-5" />,
    color: 'from-rose-600 to-red-700',
    glowColor: '#f43f5e',
    actionType: 'mailto',
    url: 'mailto:',
    description: 'Draft or check emails',
  },
  {
    id: 'calendar',
    name: 'Calendar',
    nameGu: 'કેલેન્ડર',
    nameHi: 'कैलेंडर',
    category: 'google',
    icon: <Calendar className="w-5 h-5" />,
    color: 'from-sky-600 to-blue-700',
    glowColor: '#0284c7',
    actionType: 'url',
    url: 'https://calendar.google.com',
    description: 'View schedules and events',
  },
  {
    id: 'google',
    name: 'Google Search',
    nameGu: 'ગૂગલ સર્ચ',
    nameHi: 'गूगल सर्च',
    category: 'google',
    icon: <Globe className="w-5 h-5" />,
    color: 'from-blue-600 to-indigo-700',
    glowColor: '#3b82f6',
    actionType: 'url',
    url: 'https://www.google.com',
    description: 'Web search engine',
  },
];

export const AppLauncher: React.FC<AppLauncherProps> = ({ onOpenAppAction, languageMode }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const getAppName = (app: AndroidAppItem) => {
    if (languageMode === 'gu') return app.nameGu;
    if (languageMode === 'hi') return app.nameHi;
    return app.name;
  };

  const handleAppClick = (app: AndroidAppItem) => {
    playJarvisBeep('click');
    triggerHaptic(30);
    onOpenAppAction(app);
  };

  // Top 5 primary apps for the quick bar
  const quickApps = ANDROID_APPS.slice(0, 5);

  return (
    <div className="w-full">
      {/* Quick Launch Android Bar */}
      <div className="px-3 py-2 bg-gradient-to-r from-gray-950/90 via-cyan-950/40 to-gray-950/90 border-t border-b border-cyan-500/20 backdrop-blur-md">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[11px] font-mono-hud font-semibold tracking-wider text-cyan-300 uppercase">
              {languageMode === 'gu'
                ? 'એન્ડ્રોઇડ એપ શોર્ટકટ્સ'
                : languageMode === 'hi'
                ? 'एंड्रॉयड ऐप शॉर्टकट्स'
                : 'ANDROID APP SHORTCUTS'}
            </span>
          </div>

          <button
            onClick={() => {
              setIsExpanded(!isExpanded);
              playJarvisBeep('click');
            }}
            type="button"
            className="flex items-center gap-1 text-[11px] font-mono-hud text-cyan-400 hover:text-cyan-200 transition-colors px-2 py-0.5 rounded bg-cyan-950/50 border border-cyan-500/30"
          >
            <span>{isExpanded ? 'Less' : 'All 11 Apps'}</span>
            <ChevronUp
              className={`w-3.5 h-3.5 transition-transform duration-300 ${
                isExpanded ? 'rotate-180' : 'rotate-0'
              }`}
            />
          </button>
        </div>

        {/* 5 Quick Android Icon Buttons */}
        <div className="grid grid-cols-5 gap-2">
          {quickApps.map((app) => (
            <button
              key={app.id}
              onClick={() => handleAppClick(app)}
              type="button"
              className="group flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900/70 border border-cyan-500/20 hover:border-cyan-400/60 active:scale-95 transition-all shadow-sm hover:shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer"
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${app.color} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform`}
                style={{
                  boxShadow: `0 0 10px ${app.glowColor}55`,
                }}
              >
                {app.icon}
              </div>
              <span className="text-[11px] font-medium text-cyan-200/90 mt-1 truncate max-w-[58px] text-center">
                {getAppName(app)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Expanded Grid for All Android Apps */}
      {isExpanded && (
        <div className="px-3 py-3 bg-gray-950/95 border-b border-cyan-500/30 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="text-[10px] font-mono-hud text-cyan-400/70 mb-2 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Permitted Android Applications & Native Services</span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
            {ANDROID_APPS.map((app) => (
              <button
                key={app.id}
                onClick={() => handleAppClick(app)}
                type="button"
                className="group flex flex-col items-center p-2 rounded-xl bg-slate-900/80 border border-cyan-500/25 hover:border-cyan-400 active:scale-95 transition-all cursor-pointer hover:bg-slate-800/80"
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${app.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}
                  style={{
                    boxShadow: `0 0 12px ${app.glowColor}66`,
                  }}
                >
                  {app.icon}
                </div>
                <span className="text-[11px] font-semibold text-cyan-100 mt-1.5 truncate max-w-[70px] text-center">
                  {getAppName(app)}
                </span>
                <span className="text-[9px] text-cyan-400/60 font-mono-hud truncate max-w-[70px]">
                  {app.category}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
