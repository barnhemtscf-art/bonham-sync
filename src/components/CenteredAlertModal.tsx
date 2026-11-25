import React from 'react';
import { AlertModalPayload, Language } from '../types/barnhem';

interface CenteredAlertModalProps {
  alert: AlertModalPayload | null;
  lang: Language;
  onClose: () => void;
}

const TONE_MAP: Record<NonNullable<AlertModalPayload['tone']>, string> = {
  mint: 'bg-[#D4F0F0] border-[#8AD3D3]',
  pink: 'bg-[#FADADD] border-[#F0A8B2]',
  yellow: 'bg-[#FFF5BA] border-[#E8D575]',
  blue: 'bg-[#DCEEF8] border-[#98CBEB]',
  peach: 'bg-[#FDE2D2] border-[#F2B593]',
  lavender: 'bg-[#EAE4F2] border-[#C4B5DF]',
};

export const CenteredAlertModal: React.FC<CenteredAlertModalProps> = ({ alert, lang, onClose }) => {
  if (!alert) return null;
  const toneClass = TONE_MAP[alert.tone || 'mint'];

  const handleConfirm = () => {
    const confirmCb = alert.onConfirm;
    onClose();
    if (confirmCb) {
      confirmCb();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="centered-alert-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
    >
      <div
        className="pastel-card w-full max-w-md rounded-[32px] border-2 border-[#EBD8C3] bg-[#FFFDF9] p-6 text-center shadow-2xl transition-transform"
        data-testid="centered-alert-modal"
      >
        <div
          className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[24px] border-2 text-4xl ${toneClass}`}
        >
          <span aria-hidden="true">{alert.icon}</span>
        </div>

        <h3 id="centered-alert-title" className="text-xl font-bold text-[#3B2F2A]">
          {alert.title}
        </h3>
        <p className="mt-2 whitespace-pre-line text-base leading-relaxed text-[#5C4B43]">
          {alert.message}
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {alert.showCancel && (
            <button
              type="button"
              onClick={onClose}
              className="pastel-btn min-h-[48px] rounded-[20px] border-2 border-[#EBD8C3] bg-white px-6 py-3 text-base font-semibold text-[#5C4B43] hover:bg-[#FAF4EC]"
            >
              {alert.cancelText || (lang === 'th' ? 'ยกเลิก' : 'Cancel')}
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            autoFocus
            className="pastel-btn min-h-[52px] min-w-[180px] rounded-[20px] bg-[#3B2F2A] px-8 py-3 text-lg font-bold text-[#FFFDF9] shadow-md hover:bg-[#52423B]"
          >
            {alert.confirmText || (lang === 'th' ? 'ตกลง (OK) ✓' : 'OK ✓')}
          </button>
        </div>
      </div>
    </div>
  );
};
