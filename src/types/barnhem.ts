export type Language = 'th' | 'en';

export type AppMode = 'magic_door' | 'staff' | 'manager' | 'creator';

export type MemberRole = 'manager' | 'staff' | 'kid';

export type Gender = 'M' | 'F';

export type AgeGroup = 1 | 2 | 3;

export type ShopCategory = 'snack' | 'decor';

export type DecorSlot = 'outfit' | 'accessory' | 'location_item';

export interface MySpaceProfile {
  favoriteColor: string;
  favoriteFood: string;
  favoritePet: string;
  futureDream: string;
}

export interface PenaltyRecord {
  id: string;
  dateStr: string;
  reason: string;
  fineThb: number;
  phoneRestrictedUntil?: string; // e.g., "18:30", "พรุ่งนี้ 18:30 น.", "หัก Free Day วันศุกร์ 1 วัน"
  freeDayDeducted?: number;
  resolved: boolean;
}

export interface StarTransaction {
  id: string;
  timestamp: string;
  dateStr: string;
  amount: number; // positive = earned, negative = spent
  label: string;
  type: 'earn' | 'spend' | 'staff';
}

export interface DailyProgress {
  dateStr: string;
  breakfastDone?: boolean;
  vanDone?: boolean;
  morningPhoneCheckedOut?: boolean;
  homeCheckInDone?: boolean;
  speedyNinjaStartMs?: number; // epoch ms when 20-min timer started
  extraStudyDone?: boolean;
  houseworkDone?: boolean;
  bossStageDone?: boolean;
  eveningChecklistDone?: boolean;
  eveningPhoneUnlocked?: boolean;
  homeworkRegisteredSubject?: string;
  phoneReturnedDone?: boolean;
  completedCommandIds?: string[];
  isSickToday?: boolean;
  phoneBlockedUntilDate?: string; // YYYY-MM-DD when a 1-day phone block auto-expires
  staffStarsGivenToday?: number; // total bonus stars granted by a staff member today (max 20/day)
  kudosNote?: {
    message: string;
    amount: number;
    fromStaff: string;
    time: string;
  };
}

export interface PiggyBankTransaction {
  id: string;
  dateStr: string;
  timestamp: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  note: string;
}

export interface PiggyBankState {
  savedStars: number;
  goalStars: number;
  goalLabel: string;
  isHidden: boolean;
  streakDays: number;
  lastDepositDateStr?: string;
  transactions: PiggyBankTransaction[];
}

export interface Member {
  id: string;
  role: MemberRole;
  nickname: string;
  fullName: string;
  gender: Gender;
  pin: string;
  emoji?: string;
  ageGroup?: AgeGroup;
  stars: number;
  lateFineThb: number;
  freeDayPenaltyCount: number;
  phoneBlockedReason?: string;
  cartoonUnlockedToday?: boolean;
  kitchenDutyToday: boolean;
  personalDriveUrl: string;
  restrictedDocsUrl: string;
  mySpace: MySpaceProfile;
  selectedCoverIndex: number; // 0..6 (7 locations)
  unlockedCovers: number[]; // indices 0..6
  customCoverImageBase64?: string;
  ownedShopItemIds: string[];
  equippedOutfitId?: string;
  equippedAccessoryIds: string[];
  collectedLocationItemIds: string[];
  dailyProgress: DailyProgress;
  penalties: PenaltyRecord[];
  starHistory: StarTransaction[];
  piggyBank?: PiggyBankState;
}

export interface SickReport {
  id: string;
  kidId: string;
  kidNickname: string;
  symptom: string;
  details: string;
  reportedAt: string;
  dateStr: string;
  resolved: boolean;
}

export interface SnackBill {
  id: string;
  kidId: string;
  kidNickname: string;
  itemId: string;
  itemName: string;
  category: ShopCategory;
  priceStars: number;
  createdAt: string;
  dateStr: string;
  fulfilled: boolean;
}

export interface ShopItem {
  id: string;
  name: string;
  nameEn: string;
  priceStars: number;
  category: ShopCategory;
  decorSlot?: DecorSlot;
  locationIndex?: number; // 0..6 if location_item
  emoji: string;
  imageBase64?: string;
  description: string;
  colorHex?: string;
}

export interface CoverLocation {
  index: number;
  nameTh: string;
  nameEn: string;
  minStars: number;
  badgeEmoji: string;
  skyTop: string;
  skyBottom: string;
  accentColor: string;
  requiredItemIds: string[]; // 7 location items / accessories needed to clear stage
}

export type DoorCommandKind = 'routine' | 'penalty';

export type DoorCommandAuthMode = 'direct' | 'kid_pin' | 'staff_pin';

export type DoorCommandDayKey =
  | 'mon'
  | 'tue'
  | 'wed'
  | 'thu'
  | 'fri'
  | 'sat'
  | 'sun'
  | 'holiday';

export type DoorCommandPenaltyType =
  | 'block'
  | 'fine_per_min'
  | 'fixed_fine'
  | 'deduct_free_day'
  | 'deduct_stars'
  | 'block_phone_today'
  | 'block_phone_tomorrow'
  | 'custom_task'
  | 'none';

export interface DoorCommandConfig {
  id: string;
  commandKind?: DoorCommandKind;
  titleTh: string;
  descriptionTh: string;
  emoji: string;
  activeDays?: DoorCommandDayKey[];
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  earlyMinutes: number; // allowed minutes before startTime
  deadlineTime: string; // HH:MM
  authMode: DoorCommandAuthMode;
  rewardStars: number;
  penaltyType: DoorCommandPenaltyType;
  penaltyValue: number;
  penaltyMaxThb?: number;
  penaltyNoteTh: string;
  customPenaltyLabelTh?: string;
  allowedKidIds: string[];
  enabled: boolean;
}

export type BearHatStyle = 'beret_bow' | 'beret' | 'headband_bow' | 'cap' | 'none';
export type BearOutfitStyle = 'cardigan_scarf' | 'hoodie' | 'overall' | 'blazer';
export type BearPropStyle = 'laptop' | 'tablet' | 'headphones' | 'none';
export type BearColorTone = 'blush' | 'sky' | 'mint' | 'lavender' | 'butter' | 'mocha';

export interface BearAppearanceConfig {
  glasses: boolean;
  hat: BearHatStyle;
  outfit: BearOutfitStyle;
  outfitColor: BearColorTone;
  hasScarf: boolean;
  prop: BearPropStyle;
}

export interface AppSettings {
  creatorPins: string[];
  googleSheetsUrl: string;
  allowedSyncEmails?: string[];
  holidayDate?: string; // YYYY-MM-DD when holiday/school-break mode is active
  doorCommands?: DoorCommandConfig[];
  bearStyle?: BearAppearanceConfig;
}

export interface BarnhemState {
  members: Member[];
  sickReports: SickReport[];
  snackBills: SnackBill[];
  shopItems: ShopItem[];
  settings: AppSettings;
  lastSyncedAt?: string;
}

export interface AlertModalPayload {
  id: string;
  icon: string;
  title: string;
  message: string;
  tone?: 'mint' | 'pink' | 'yellow' | 'blue' | 'peach' | 'lavender';
  confirmText?: string;
  onConfirm?: () => void;
  showCancel?: boolean;
  cancelText?: string;
}
