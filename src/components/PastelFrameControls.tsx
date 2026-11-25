import React from 'react';
import { Language } from '../types/barnhem';
import {
  PASTEL_FRAME_THEMES,
  PastelFrameId,
  PastelFrameTheme,
} from '../utils/pastelFrames';

interface PastelFramePickerProps {
  lang: Language;
  activeTheme: PastelFrameTheme;
  onSelect: (id: PastelFrameId) => void;
}

export const PastelFramePicker: React.FC<PastelFramePickerProps> = ({
  lang,
  activeTheme,
  onSelect,
}) => {
  return (
    <div
      role="group"
      aria-label={lang === 'th' ? 'เลือกสีกรอบหน้าปกโทนพาสเทล' : 'Choose pastel cover frame color'}
      className="flex flex-row items-center justify-center gap-2.5 py-1 sm:flex-col sm:gap-2"
    >
      {PASTEL_FRAME_THEMES.map((theme) => {
        const isActive = theme.id === activeTheme.id;
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => onSelect(theme.id)}
            aria-pressed={isActive}
            aria-label={`${lang === 'th' ? 'เปลี่ยนสีกรอบเป็น' : 'Switch frame to'} ${
              lang === 'th' ? theme.labelTh : theme.labelEn
            }`}
            title={lang === 'th' ? theme.labelTh : theme.labelEn}
            className={`pastel-btn h-8 w-8 rounded-full border-2 focus-visible:outline-2 focus-visible:outline-offset-2 sm:h-9 sm:w-9 ${
              isActive ? 'scale-110 shadow-sm' : 'opacity-85 hover:scale-105 hover:opacity-100'
            }`}
            style={{
              backgroundColor: theme.swatchHex,
              borderColor: isActive ? theme.accentText : '#FFFFFF',
              boxShadow: isActive ? `0 0 0 2px ${theme.frameBg}` : '0 1px 2px rgba(0,0,0,0.08)',
            }}
          />
        );
      })}
    </div>
  );
};

interface JapaneseCornerMotifProps {
  theme: PastelFrameTheme;
}

export const JapaneseCornerMotif: React.FC<JapaneseCornerMotifProps> = ({ theme }) => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      className="pointer-events-none absolute -top-2 right-0 h-16 w-16 opacity-35 sm:h-20 sm:w-20 sm:opacity-45"
      fill="none"
    >
      {theme.motifType === 'sakura' && (
        <g stroke={theme.motifStroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M60 22 C67 34, 67 44, 60 52 C53 44, 53 34, 60 22 Z" />
          <path d="M96 48 C84 55, 74 55, 66 48 C74 41, 84 41, 96 48 Z" />
          <path d="M82 90 C70 84, 64 76, 65 65 C76 68, 82 78, 82 90 Z" />
          <path d="M38 90 C38 78, 44 68, 55 65 C56 76, 50 84, 38 90 Z" />
          <path d="M24 48 C36 41, 46 41, 54 48 C46 55, 36 55, 24 48 Z" />
          <circle cx="60" cy="58" r="4" fill={theme.frameBg} />
        </g>
      )}

      {theme.motifType === 'leaf' && (
        <g stroke={theme.motifStroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M30 92 Q58 58 92 26" />
          <path d="M64 54 C64 38, 76 28, 92 28 C92 44, 80 56, 64 54 Z" />
          <path d="M46 72 C32 68, 24 56, 28 42 C42 46, 50 58, 46 72 Z" />
          <circle cx="88" cy="76" r="6" />
        </g>
      )}

      {theme.motifType === 'cloud' && (
        <g stroke={theme.motifStroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M28 66 H88 C95 66 98 58 92 52 C88 47 80 48 77 52 C75 40 62 34 52 40 C44 45 43 52 43 52 C34 51 24 58 28 66 Z" />
          <path d="M38 82 H78" />
          <circle cx="92" cy="30" r="5" />
        </g>
      )}

      {theme.motifType === 'sun' && (
        <g stroke={theme.motifStroke} strokeWidth="2.2" strokeLinecap="round">
          <circle cx="60" cy="60" r="18" />
          <line x1="60" y1="24" x2="60" y2="34" />
          <line x1="60" y1="86" x2="60" y2="96" />
          <line x1="24" y1="60" x2="34" y2="60" />
          <line x1="86" y1="60" x2="96" y2="60" />
          <line x1="35" y1="35" x2="42" y2="42" />
          <line x1="78" y1="78" x2="85" y2="85" />
          <line x1="85" y1="35" x2="78" y2="42" />
          <line x1="42" y1="78" x2="35" y2="85" />
        </g>
      )}

      {theme.motifType === 'star' && (
        <g stroke={theme.motifStroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M60 22 L68 48 L95 56 L68 64 L60 90 L52 64 L25 56 L52 48 Z" />
          <circle cx="90" cy="28" r="4" />
          <circle cx="30" cy="84" r="3" />
        </g>
      )}

      {theme.motifType === 'wave' && (
        <g stroke={theme.motifStroke} strokeWidth="2.2" strokeLinecap="round">
          <path d="M22 68 Q40 50 58 68 T94 68" />
          <path d="M30 82 Q48 64 66 82 T98 82" />
          <circle cx="78" cy="36" r="10" />
        </g>
      )}
    </svg>
  );
};
