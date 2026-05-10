/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, RefreshCcw } from 'lucide-react';

export default function QRScanner({ onClose, onScan }: { onClose: () => void, onScan: (data: string) => void }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    
    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;
        
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          const backCamera = cameras.find(c => c.label.toLowerCase().includes('back')) || cameras[0];
          await html5QrCode.start(
            backCamera.id,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (qrCodeMessage) => {
              onScan(qrCodeMessage);
            },
            () => {
              // Failure frequent while scanning
            }
          );
          setIsReady(true);
        } else {
          setError("No cameras detected. Switch to manual entry.");
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setError("Camera permission denied. Use manual entry if granted.");
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(startScanner, 100);

    return () => {
      clearTimeout(timer);
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(e => console.error("Stop error", e));
      }
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-white w-full max-w-sm rounded-xl overflow-hidden shadow-2xl border border-slate-200"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-display">Auth Interface</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-md transition-colors text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-6">
          {!showManual ? (
            <>
              <div className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-900 flex items-center justify-center">
                <div id="qr-reader" className="w-full h-full"></div>
                
                {!isReady && !error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white">
                    <RefreshCcw className="w-8 h-8 animate-spin text-slate-600" />
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Optical Initialization...</p>
                  </div>
                )}

                {error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-900/90 backdrop-blur-md">
                    <p className="text-xs font-bold text-white mb-4">{error}</p>
                    <button 
                      onClick={() => setShowManual(true)}
                      className="px-4 py-2 bg-blue-600 text-white text-[10px] font-bold rounded uppercase tracking-widest shadow-lg shadow-blue-500/20"
                    >
                      Use Manual Code
                    </button>
                  </div>
                )}

                {isReady && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 border-[40px] border-black/40"></div>
                    <div className="absolute top-[40px] left-[40px] right-[40px] bottom-[40px] border border-blue-400/50">
                      <div className="absolute h-0.5 w-full bg-blue-400 top-0 left-0 animate-[scan_3s_linear_infinite]"></div>
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-400"></div>
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-400"></div>
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-400"></div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-400"></div>
                    </div>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setShowManual(true)}
                className="mt-4 w-full py-2 text-[10px] font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest"
              >
                Having trouble? Enter code manually
              </button>
            </>
          ) : (
            <motion.form 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleManualSubmit}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Master Auth Code</label>
                <input 
                  type="text"
                  required
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter 12-digit security code..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm font-mono tracking-widest text-center"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-3 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm"
              >
                Authorize Manual Sign-in
              </button>
              <button 
                type="button"
                onClick={() => setShowManual(false)}
                className="w-full py-2 text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest"
              >
                Back to Scanner
              </button>
            </motion.form>
          )}

          <div className="mt-6 flex flex-col items-center gap-2 text-center p-4 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-tight italic">Secure Node Connection</p>
            <p className="text-[10px] text-slate-400 font-medium">Authentication is cryptographic. Each session is unique to your current identity profile.</p>
          </div>
        </div>
      </motion.div>
      
      <style>{`
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
