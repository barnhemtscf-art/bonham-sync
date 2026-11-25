export type PastelFrameId = 'sakura' | 'matcha' | 'sora' | 'yuzu' | 'fuji' | 'momo';

export interface PastelFrameTheme {
  id: PastelFrameId;
  emoji: string;
  labelTh: string;
  labelEn: string;
  swatchHex: string;
  frameBg: string;
  frameBorder: string;
  innerBorder: string;
  softTint: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  motifStroke: string;
  motifType: 'sakura' | 'leaf' | 'cloud' | 'sun' | 'star' | 'wave';
}

export const PASTEL_FRAME_THEMES: PastelFrameTheme[] = [
  {
    id: 'sakura',
    emoji: '🌸',
    labelTh: 'ซากุระ',
    labelEn: 'Sakura Pink',
    swatchHex: '#F9B8C8',
    frameBg: '#FFEBF0',
    frameBorder: '#F29FB4',
    innerBorder: '#FAD2DC',
    softTint: '#FFF6F8',
    accentBg: '#FADADD',
    accentBorder: '#EC8FA7',
    accentText: '#7D1D3B',
    motifStroke: '#F29FB4',
    motifType: 'sakura',
  },
  {
    id: 'matcha',
    emoji: '🍵',
    labelTh: 'มัทฉะมิ้นท์',
    labelEn: 'Matcha Mint',
    swatchHex: '#9AE4D4',
    frameBg: '#E7FAF6',
    frameBorder: '#82D4C4',
    innerBorder: '#BCECE2',
    softTint: '#F4FCFA',
    accentBg: '#CFF3EC',
    accentBorder: '#6EC5B4',
    accentText: '#114B43',
    motifStroke: '#7FD1C0',
    motifType: 'leaf',
  },
  {
    id: 'sora',
    emoji: '☁️',
    labelTh: 'โซระสกาย',
    labelEn: 'Sora Sky',
    swatchHex: '#A6D8FA',
    frameBg: '#EAF5FE',
    frameBorder: '#8CC4EE',
    innerBorder: '#C0E2FA',
    softTint: '#F5FAFF',
    accentBg: '#D4EDFD',
    accentBorder: '#76B8EB',
    accentText: '#174166',
    motifStroke: '#8CC4EE',
    motifType: 'cloud',
  },
  {
    id: 'yuzu',
    emoji: '🍋',
    labelTh: 'ยูซุเลมอน',
    labelEn: 'Yuzu Cream',
    swatchHex: '#FCE38A',
    frameBg: '#FFF8DD',
    frameBorder: '#EECA62',
    innerBorder: '#F9E6A4',
    softTint: '#FFFDF2',
    accentBg: '#FFF0B5',
    accentBorder: '#E2BA4A',
    accentText: '#61450B',
    motifStroke: '#E8C158',
    motifType: 'sun',
  },
  {
    id: 'fuji',
    emoji: '🪻',
    labelTh: 'ลาเวนเดอร์',
    labelEn: 'Fuji Lavender',
    swatchHex: '#D1C0F6',
    frameBg: '#F3EEFD',
    frameBorder: '#BFA7EE',
    innerBorder: '#DDD1F7',
    softTint: '#FAF8FF',
    accentBg: '#E9E0FC',
    accentBorder: '#AC90E6',
    accentText: '#3E2470',
    motifStroke: '#BFA7EE',
    motifType: 'star',
  },
  {
    id: 'momo',
    emoji: '🍑',
    labelTh: 'พีชโมโมะ',
    labelEn: 'Momo Peach',
    swatchHex: '#FDC7AE',
    frameBg: '#FFF0E8',
    frameBorder: '#F3AC8B',
    innerBorder: '#FCD4C1',
    softTint: '#FFF8F4',
    accentBg: '#FDE0D0',
    accentBorder: '#EB9772',
    accentText: '#6E2B14',
    motifStroke: '#F2AA89',
    motifType: 'wave',
  },
];

const STORAGE_KEY_PORTAL = 'barnhem_portal_frame_v1';

export function getPastelFrameTheme(id?: string | null): PastelFrameTheme {
  return PASTEL_FRAME_THEMES.find((t) => t.id === id) || PASTEL_FRAME_THEMES[0];
}

export function loadSavedPortalFrameId(): PastelFrameId {
  if (typeof window === 'undefined') return 'sakura';
  const saved = window.localStorage.getItem(STORAGE_KEY_PORTAL);
  const found = PASTEL_FRAME_THEMES.find((t) => t.id === saved);
  return found ? found.id : 'sakura';
}

export function savePortalFrameId(id: PastelFrameId): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY_PORTAL, id);
}

export function loadSavedKidFrameId(kidId: string): PastelFrameId {
  if (typeof window === 'undefined') return 'sakura';
  const saved = window.localStorage.getItem(`barnhem_kid_frame_${kidId}`);
  const found = PASTEL_FRAME_THEMES.find((t) => t.id === saved);
  return found ? found.id : 'sakura';
}

export function saveKidFrameId(kidId: string, id: PastelFrameId): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`barnhem_kid_frame_${kidId}`, id);
}
