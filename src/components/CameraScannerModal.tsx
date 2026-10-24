import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { playJarvisBeep, triggerHaptic } from '../utils/audioEffects';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({ isOpen, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const startCamera = async (mode: 'environment' | 'user') => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError('Camera access not permitted or unavailable on this device.');
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setCapturedImage(null);
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, facingMode]);

  const handleCapture = () => {
    playJarvisBeep('click');
    triggerHaptic(50);
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(dataUrl);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-gray-950 border border-cyan-500/50 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.4)] flex flex-col max-h-[90vh]">
        {/* HUD Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-cyan-950/60 border-b border-cyan-500/30">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-mono-hud font-bold tracking-widest text-cyan-300 uppercase">
              HUD OPTICAL SCANNER // VISION
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

        {/* Video / Snapshot Viewport */}
        <div className="relative aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
          {capturedImage ? (
            <img
              src={capturedImage}
              alt="HUD Capture"
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}

          {/* Futuristic HUD Scanning Reticle */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
            <div className="flex justify-between">
              <div className="w-8 h-8 border-t-2 border-l-2 border-cyan-400" />
              <div className="w-8 h-8 border-t-2 border-r-2 border-cyan-400" />
            </div>

            {/* Target Reticle in Center */}
            <div className="self-center flex flex-col items-center">
              <div className="w-24 h-24 border border-cyan-400/40 rounded-full flex items-center justify-center animate-pulse">
                <div className="w-12 h-12 border border-cyan-300 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                </div>
              </div>
              <span className="text-[10px] font-mono-hud text-cyan-400/80 mt-1 uppercase tracking-widest">
                TARGET LOCKED
              </span>
            </div>

            <div className="flex justify-between">
              <div className="w-8 h-8 border-b-2 border-l-2 border-cyan-400" />
              <div className="w-8 h-8 border-b-2 border-r-2 border-cyan-400" />
            </div>
          </div>

          {/* Camera Error / Native Fallback */}
          {cameraError && (
            <div className="absolute inset-0 bg-gray-950/90 flex flex-col items-center justify-center p-4 text-center">
              <Camera className="w-10 h-10 text-cyan-400 mb-2" />
              <p className="text-xs text-cyan-200 font-mono-hud mb-3">{cameraError}</p>
              <label className="px-4 py-2 rounded-xl bg-cyan-600 text-cyan-50 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-cyan-500 transition-colors">
                Open Native Android Camera
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setCapturedImage(event.target?.result as string);
                        setCameraError(null);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>
          )}
        </div>

        {/* HUD Controls */}
        <div className="p-4 bg-gray-950 flex items-center justify-around border-t border-cyan-500/20">
          {capturedImage ? (
            <>
              <button
                onClick={handleRetake}
                type="button"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-cyan-300 text-xs font-mono-hud border border-cyan-500/30 hover:border-cyan-400"
              >
                <RefreshCw className="w-4 h-4" />
                <span>RETAKE</span>
              </button>
              <button
                onClick={() => {
                  playJarvisBeep('response');
                  onClose();
                }}
                type="button"
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-cyan-600 text-slate-950 font-bold text-xs font-mono-hud shadow-[0_0_15px_#00f0ff]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>SAVE SCAN</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  playJarvisBeep('click');
                  setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
                }}
                type="button"
                className="p-2.5 rounded-full bg-slate-900 border border-cyan-500/30 text-cyan-300 hover:text-white"
                title="Switch Camera Lens"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              <button
                onClick={handleCapture}
                type="button"
                className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 border-4 border-slate-900 shadow-[0_0_20px_#00f0ff] active:scale-95 transition-all flex items-center justify-center text-slate-950"
                title="Capture Scan"
              >
                <Camera className="w-6 h-6" />
              </button>

              <label className="p-2.5 rounded-full bg-slate-900 border border-cyan-500/30 text-cyan-300 hover:text-white cursor-pointer" title="Native Android Camera">
                <Sparkles className="w-5 h-5" />
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setCapturedImage(event.target?.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
