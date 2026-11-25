import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, X } from 'lucide-react';
import { Language } from '../types/barnhem';

interface QrBadgeModalProps {
  lang: Language;
  badge: {
    id: string;
    nickname: string;
    fullName: string;
    roleLabel: string;
    emoji?: string;
    payload: string;
  } | null;
  onClose: () => void;
}

export const QrBadgeModal: React.FC<QrBadgeModalProps> = ({ lang, badge, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (!badge) {
      setQrDataUrl('');
      return;
    }
    let active = true;
    QRCode.toDataURL(badge.payload, {
      width: 320,
      margin: 2,
      color: { dark: '#3B2F2A', light: '#FFFFFF' },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [badge]);

  if (!badge) return null;

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `barnhem-qr-${badge.id}.png`;
    a.click();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Member QR Code Badge"
      className="print-only-sheet-wrapper fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div className="print-only-sheet-card pastel-card w-full max-w-sm rounded-[32px] border-2 border-[#EBD8C3] bg-[#FFFDF9] p-6 text-center shadow-2xl">
        <div className="no-print mb-3 flex items-center justify-between">
          <span className="text-xs font-bold text-[#705F56]">Barnhem Care & Kids ID Card</span>
          <button
            type="button"
            aria-label={lang === 'th' ? 'ปิดบัตร QR' : 'Close QR Badge'}
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#EBD8C3] bg-white text-[#3B2F2A]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-[24px] border-2 border-[#EBD8C3] bg-white p-4">
          <div className="text-3xl">{badge.emoji || '🪪'}</div>
          <h3 className="mt-1 text-xl font-bold text-[#3B2F2A]">{badge.nickname}</h3>
          <p className="text-xs text-[#705F56]">{badge.fullName}</p>
          <p className="mt-0.5 text-xs font-semibold text-[#5C4B43]">
            {badge.roleLabel} · ID: {badge.id}
          </p>

          <div className="mt-3 flex justify-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code for ${badge.nickname}`}
                className="h-52 w-52 rounded-2xl border border-[#EBD8C3]"
              />
            ) : (
              <div className="flex h-52 w-52 items-center justify-center rounded-2xl bg-[#FFFDF9] text-sm text-[#705F56]">
                Generating QR...
              </div>
            )}
          </div>
          <p className="mt-2 font-mono text-[11px] text-[#705F56]">{badge.payload}</p>
        </div>

        <div className="no-print mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleDownload}
            className="pastel-btn inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-[16px] bg-[#D4F0F0] px-3 text-xs font-bold text-[#134E4A]"
          >
            <Download className="h-4 w-4" />
            <span>{lang === 'th' ? 'บันทึกรูป QR' : 'Save PNG'}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="pastel-btn inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-[16px] bg-[#3B2F2A] px-3 text-xs font-bold text-white"
          >
            <Printer className="h-4 w-4" />
            <span>{lang === 'th' ? 'พิมพ์บัตร' : 'Print'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
