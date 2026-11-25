import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, ImageUp, X } from 'lucide-react';
import { Language } from '../types/barnhem';

interface QrScannerModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (decodedText: string) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  lang,
  isOpen,
  onClose,
  onScanResult,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [cameraStatus, setCameraStatus] = useState<'starting' | 'active' | 'error'>('starting');
  const [errorDetail, setErrorDetail] = useState<string>('');
  const [photoError, setPhotoError] = useState<string>('');

  const onCloseRef = useRef(onClose);
  const onScanResultRef = useRef(onScanResult);
  const langRef = useRef(lang);

  useEffect(() => {
    onCloseRef.current = onClose;
    onScanResultRef.current = onScanResult;
    langRef.current = lang;
  }, [onClose, onScanResult, lang]);

  const stopCamera = () => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    let cancelled = false;
    setCameraStatus('starting');
    setErrorDetail('');
    setPhotoError('');

    const startCamera = async () => {
      const currentLang = langRef.current;
      if (
        typeof window === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        if (!cancelled) {
          setCameraStatus('error');
          setErrorDetail(
            currentLang === 'th'
              ? 'เบราว์เซอร์หรือหน้าเว็บนี้ยังไม่รองรับกล้องสดบนมือถือ กรุณากดปุ่มถ่ายรูป / เลือกรูป QR ด้านล่างแทนได้เลยค่ะ'
              : 'Live camera is unavailable in this browser/iframe. Use the Photo/Upload QR button below.'
          );
        }
        return;
      }

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          // Fallback for mobile devices or webviews that reject ideal resolution/facingMode constraints
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.setAttribute('playsinline', 'true');
          await video.play();
          setCameraStatus('active');

          let lastScanMs = 0;
          const scanLoop = (ts: number) => {
            if (cancelled) return;
            if (ts - lastScanMs >= 140 && video.readyState >= video.HAVE_CURRENT_DATA) {
              lastScanMs = ts;
              const canvas = canvasRef.current;
              if (canvas && video.videoWidth > 0 && video.videoHeight > 0) {
                const maxScanWidth = 720;
                const scale = Math.min(1, maxScanWidth / video.videoWidth);
                canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
                canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (ctx) {
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                  const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: 'attemptBoth',
                  });
                  if (code && code.data) {
                    stopCamera();
                    onScanResultRef.current(code.data);
                    onCloseRef.current();
                    return;
                  }
                }
              }
            }
            rafRef.current = window.requestAnimationFrame(scanLoop);
          };
          rafRef.current = window.requestAnimationFrame(scanLoop);
        }
      } catch (err) {
        if (!cancelled) {
          setCameraStatus('error');
          const msg = err instanceof Error ? err.message : '';
          setErrorDetail(
            langRef.current === 'th'
              ? `ไม่สามารถเปิดกล้องสดได้ (${msg || 'ไม่ได้รับอนุญาตใช้กล้อง'}) — กดปุ่มถ่ายรูป / เลือกรูป QR ด้านล่างแทนได้เลยค่ะ!`
              : `Could not start live camera (${msg || 'permission denied'}). Please use Photo / Image QR below.`
          );
        }
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [isOpen]);

  const handleQrImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError('');

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 1200;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Canvas unavailable');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });
        if (code && code.data) {
          stopCamera();
          onScanResult(code.data);
          onClose();
        } else {
          setPhotoError(
            lang === 'th'
              ? 'ไม่พบ QR Code ในรูปภาพนี้ ลองถ่ายให้อยู่กลางกรอบและคมชัดขึ้นนะ'
              : 'No QR code detected in this image. Please try a clearer photo.'
          );
        }
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setPhotoError(lang === 'th' ? 'ไม่สามารถอ่านไฟล์รูปภาพได้' : 'Could not load image file.');
    };
    img.src = objectUrl;
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'th' ? 'สแกน QR Code' : 'Scan QR Code'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
    >
      <div className="pastel-card w-full max-w-md rounded-[32px] border-2 border-[#EBD8C3] bg-[#FFFDF9] p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#3B2F2A]">
            <Camera className="h-5 w-5" />
            <span>{lang === 'th' ? 'สแกน QR พนักงาน/ผู้ดูแล' : 'Scan Staff/Admin QR'}</span>
          </h2>
          <button
            type="button"
            aria-label={lang === 'th' ? 'ปิดกล้องสแกน' : 'Close QR Scanner'}
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#EBD8C3] bg-white text-[#3B2F2A] hover:bg-[#FADADD]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Live Camera Viewport */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[22px] border-2 border-[#EBD8C3] bg-[#1E1B18]">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`h-full w-full object-cover ${cameraStatus === 'active' ? 'opacity-100' : 'opacity-0'}`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {cameraStatus === 'active' && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-44 w-44 rounded-3xl border-4 border-[#FFF5BA] shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          )}

          {cameraStatus === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-sm text-white">
              <span className="text-3xl mb-2">📷</span>
              <span>{lang === 'th' ? 'กำลังเปิดกล้อง...' : 'Starting camera...'}</span>
            </div>
          )}

          {cameraStatus === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FFFDF9] p-5 text-center">
              <span className="mb-2 text-3xl">📸</span>
              <p className="text-sm font-medium text-[#5C4B43]">{errorDetail}</p>
            </div>
          )}
        </div>

        {/* Photo / Mobile Native Camera & Gallery Fallback */}
        <div className="mt-4 space-y-2.5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="pastel-btn flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-[18px] border-2 border-[#8AD3D3] bg-[#D4F0F0] px-3 py-2 text-xs font-bold text-[#134E4A] hover:brightness-95 sm:text-sm">
              <Camera className="h-4 w-4 shrink-0" />
              <span>
                {lang === 'th' ? 'ถ่ายรูป QR ด้วยกล้อง' : 'Take QR Photo'}
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleQrImageFile}
                className="hidden"
              />
            </label>

            <label className="pastel-btn flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-[18px] border-2 border-[#98CBEB] bg-[#DCEEF8] px-3 py-2 text-xs font-bold text-[#1E4460] hover:brightness-95 sm:text-sm">
              <ImageUp className="h-4 w-4 shrink-0" />
              <span>
                {lang === 'th' ? 'เลือกรูป QR จากเครื่อง' : 'Upload QR Image'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleQrImageFile}
                className="hidden"
              />
            </label>
          </div>

          {photoError && (
            <p className="rounded-xl bg-[#FADADD] px-3 py-2 text-center text-xs font-semibold text-[#9F1239]">
              {photoError}
            </p>
          )}

          <p className="text-center text-xs text-[#705F56]">
            {lang === 'th'
              ? 'หากเปิดกล้องสดผ่านเบราว์เซอร์มือถือไม่ได้ ให้กด "ถ่ายรูป QR ด้วยกล้อง" หรือ "เลือกรูป QR จากเครื่อง" ได้เลยค่ะ'
              : 'If live camera is blocked on mobile, tap "Take QR Photo" or "Upload QR Image" above.'}
          </p>
        </div>
      </div>
    </div>
  );
};
