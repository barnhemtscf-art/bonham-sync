import {
  BearAppearanceConfig,
  BearColorTone,
  BearHatStyle,
  BearOutfitStyle,
  BearPropStyle,
} from '../types/barnhem';

export const DEFAULT_BEAR_APPEARANCE: BearAppearanceConfig = {
  glasses: true,
  hat: 'beret_bow',
  outfit: 'cardigan_scarf',
  outfitColor: 'blush',
  hasScarf: true,
  prop: 'laptop',
};

export const BEAR_HAT_OPTIONS: Array<{ id: BearHatStyle; labelTh: string; emoji: string }> = [
  { id: 'beret_bow', labelTh: 'เบเร่ต์ติดโบว์', emoji: '🎀' },
  { id: 'beret', labelTh: 'หมวกเบเร่ต์', emoji: '🥐' },
  { id: 'headband_bow', labelTh: 'ที่คาดผมโบว์', emoji: '🌸' },
  { id: 'cap', labelTh: 'หมวกแก๊ปไอที', emoji: '🧢' },
  { id: 'none', labelTh: 'ไม่ใส่หมวก', emoji: '🐻' },
];

export const BEAR_OUTFIT_OPTIONS: Array<{ id: BearOutfitStyle; labelTh: string; emoji: string }> = [
  { id: 'cardigan_scarf', labelTh: 'คาร์ดิแกนสาวไอที', emoji: '🧥' },
  { id: 'hoodie', labelTh: 'ฮู้ดดี้สายโค้ด', emoji: '👕' },
  { id: 'overall', labelTh: 'เอี๊ยมน่ารัก', emoji: '👖' },
  { id: 'blazer', labelTh: 'เบลเซอร์สมาร์ท', emoji: '💼' },
];

export const BEAR_PROP_OPTIONS: Array<{ id: BearPropStyle; labelTh: string; emoji: string }> = [
  { id: 'laptop', labelTh: 'โน้ตบุ๊กติดดาว', emoji: '💻' },
  { id: 'tablet', labelTh: 'แท็บเล็ตสายไอที', emoji: '📱' },
  { id: 'headphones', labelTh: 'หูฟังไร้สาย', emoji: '🎧' },
  { id: 'none', labelTh: 'ไม่ถืออุปกรณ์', emoji: '🐾' },
];

export const BEAR_COLOR_PALETTE: Record<
  BearColorTone,
  { labelTh: string; main: string; accent: string; dark: string }
> = {
  blush: { labelTh: 'ซากุระ', main: '#F8D8DF', accent: '#F48FB1', dark: '#E295AA' },
  sky: { labelTh: 'โซระฟ้า', main: '#DCEEF8', accent: '#7DBAE3', dark: '#6387AC' },
  mint: { labelTh: 'มัทฉะมิ้นท์', main: '#D4F0F0', accent: '#5EC2B2', dark: '#4B9D90' },
  lavender: { labelTh: 'ลาเวนเดอร์', main: '#EAE4F2', accent: '#B19CD9', dark: '#8C74B8' },
  butter: { labelTh: 'ยูซุครีม', main: '#FFF5BA', accent: '#F5C451', dark: '#D6A43A' },
  mocha: { labelTh: 'มอคค่าลาเต้', main: '#EAD7C5', accent: '#C69C78', dark: '#9B7250' },
};

const VALID_HATS = new Set<BearHatStyle>(['beret_bow', 'beret', 'headband_bow', 'cap', 'none']);
const VALID_OUTFITS = new Set<BearOutfitStyle>(['cardigan_scarf', 'hoodie', 'overall', 'blazer']);
const VALID_PROPS = new Set<BearPropStyle>(['laptop', 'tablet', 'headphones', 'none']);
const VALID_COLORS = new Set<BearColorTone>(['blush', 'sky', 'mint', 'lavender', 'butter', 'mocha']);

export function resolveBearAppearance(
  raw?: Partial<BearAppearanceConfig> | null
): BearAppearanceConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_BEAR_APPEARANCE };
  }
  return {
    glasses: typeof raw.glasses === 'boolean' ? raw.glasses : DEFAULT_BEAR_APPEARANCE.glasses,
    hat: raw.hat && VALID_HATS.has(raw.hat) ? raw.hat : DEFAULT_BEAR_APPEARANCE.hat,
    outfit:
      raw.outfit && VALID_OUTFITS.has(raw.outfit) ? raw.outfit : DEFAULT_BEAR_APPEARANCE.outfit,
    outfitColor:
      raw.outfitColor && VALID_COLORS.has(raw.outfitColor)
        ? raw.outfitColor
        : DEFAULT_BEAR_APPEARANCE.outfitColor,
    hasScarf:
      typeof raw.hasScarf === 'boolean' ? raw.hasScarf : DEFAULT_BEAR_APPEARANCE.hasScarf,
    prop: raw.prop && VALID_PROPS.has(raw.prop) ? raw.prop : DEFAULT_BEAR_APPEARANCE.prop,
  };
}
