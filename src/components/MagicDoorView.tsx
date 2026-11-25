import React, { useState } from 'react';
import {
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Cloud,
  CloudOff,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
  Star,
  Users,
  X,
} from 'lucide-react';
import { DAILY_VOCAB_LIST } from '../data/dailyVocab';
import {
  AlertModalPayload,
  DoorCommandConfig,
  Language,
  Member,
} from '../types/barnhem';
import {
  formatAuthModeLabel,
  formatPenaltyRuleLabel,
  getDoorCommandAvailability,
  isDoorCommandExpired,
} from '../utils/doorCommands';
import { formatDateStr, formatTimeHMS, getLaundryQueue } from '../utils/rules';
import {
  getPastelFrameTheme,
  loadSavedPortalFrameId,
  PastelFrameId,
  savePortalFrameId,
} from '../utils/pastelFrames';
import { PastelFramePicker } from './PastelFrameControls';

export type CloudSyncState = 'local' | 'connecting' | 'synced' | 'unauthorized';

interface MagicDoorViewProps {
  lang: Language;
  now: Date;
  kids: Member[];
  doorCommands: DoorCommandConfig[];
  isHolidayToday?: boolean;
  cloudSyncStatus: CloudSyncState;
  cloudUserEmail?: string | null;
  frameId?: PastelFrameId;
  onChangeFrame?: (id: PastelFrameId) => void;
  onUnifiedLogin: (codeOrPin: string) => void;
  onOpenQrScanner: () => void;
  onExecuteDoorCommand: (params: {
    cmd: DoorCommandConfig;
    kid: Member;
    kidPinInput: string;
    staffPinInput: string;
    penaltyReasonInput?: string;
  }) => { ok: boolean };
  onShowAlert: (payload: Omit<AlertModalPayload, 'id'>) => void;
  onConnectCloud: () => void;
  onDisconnectCloud: () => void;
}

export const MagicDoorView: React.FC<MagicDoorViewProps> = ({
  lang,
  now,
  kids,
  doorCommands,
  isHolidayToday = false,
  cloudSyncStatus,
  cloudUserEmail,
  frameId: controlledFrameId,
  onChangeFrame,
  onUnifiedLogin,
  onOpenQrScanner,
  onExecuteDoorCommand,
  onShowAlert,
  onConnectCloud,
  onDisconnectCloud,
}) => {
  const [loginInput, setLoginInput] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [vocabOffset, setVocabOffset] = useState(0);
  const [showCloudDrawer, setShowCloudDrawer] = useState(false);
  const [internalFrameId, setInternalFrameId] = useState<PastelFrameId>(() =>
    loadSavedPortalFrameId()
  );

  // Active Door Command Modal state
  const [activeCommand, setActiveCommand] = useState<DoorCommandConfig | null>(null);
  const [selectedKidId, setSelectedKidId] = useState<string>('');
  const [cmdKidPin, setCmdKidPin] = useState('');
  const [cmdStaffPin, setCmdStaffPin] = useState('');
  const [cmdPenaltyReason, setCmdPenaltyReason] = useState('');

  // Bear Star Balance Check Modal state
  const [isBearStarModalOpen, setIsBearStarModalOpen] = useState(false);
  const [bearPinInput, setBearPinInput] = useState('');
  const [showBearPin, setShowBearPin] = useState(false);
  const [bearPinError, setBearPinError] = useState('');
  const [checkedKidId, setCheckedKidId] = useState<string | null>(null);

  const activeFrameId = controlledFrameId ?? internalFrameId;
  const theme = getPastelFrameTheme(activeFrameId);

  const handleSelectFrame = (nextId: PastelFrameId) => {
    setInternalFrameId(nextId);
    savePortalFrameId(nextId);
    onChangeFrame?.(nextId);
  };

  const todayStr = formatDateStr(now);
  const laundry = getLaundryQueue(now);
  const vocabIndex =
    (((now.getDate() - 1 + vocabOffset) % DAILY_VOCAB_LIST.length) + DAILY_VOCAB_LIST.length) %
    DAILY_VOCAB_LIST.length;
  const dailyWord = DAILY_VOCAB_LIST[vocabIndex];

  const dateFormatted = now.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput.trim()) return;
    onUnifiedLogin(loginInput.trim());
    setLoginInput('');
  };

  const enabledCommands = doorCommands.filter((c) => c.enabled);
  const visibleCommandEntries = enabledCommands
    .map((cmd) => ({
      cmd,
      availability: getDoorCommandAvailability(cmd, now, isHolidayToday),
    }))
    .filter(({ availability }) => !isDoorCommandExpired(availability));
  const hiddenExpiredCount = enabledCommands.length - visibleCommandEntries.length;

  const handleCommandCardClick = (cmd: DoorCommandConfig) => {
    const availability = getDoorCommandAvailability(cmd, now, isHolidayToday);
    if (!availability.canOpen) {
      onShowAlert({
        icon: '🔒',
        title:
          availability.status === 'locked_after_deadline'
            ? `${cmd.titleTh} · เลยเส้นตาย ${cmd.deadlineTime} น.`
            : `${cmd.titleTh} · ${availability.badgeLabelTh}`,
        message:
          availability.status === 'before_window'
            ? `เปิดให้กดเวลา ${cmd.startTime}–${cmd.endTime} น. (กดก่อนเวลาได้ ${cmd.earlyMinutes} นาที · อีก ${availability.minutesUntilOpen} นาทีจะเปิด)`
            : availability.status === 'locked_after_deadline'
              ? `ปุ่มนี้กำหนดเส้นตายไม่เกิน ${cmd.deadlineTime} น. (${cmd.penaltyNoteTh || formatPenaltyRuleLabel(cmd.penaltyType, cmd.penaltyValue, cmd.customPenaltyLabelTh)})`
              : `หมดเวลาสำหรับปุ่มนี้แล้ว (${cmd.startTime}–${cmd.endTime} น.)`,
        tone: 'yellow',
      });
      return;
    }

    setActiveCommand(cmd);
    setSelectedKidId('');
    setCmdKidPin('');
    setCmdStaffPin('');
    setCmdPenaltyReason('');
  };

  const selectedKid = kids.find((k) => k.id === selectedKidId) || null;
  const eligibleKids = activeCommand
    ? kids.filter((k) => activeCommand.allowedKidIds.includes(k.id))
    : [];

  const handleConfirmCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCommand || !selectedKid) return;
    const res = onExecuteDoorCommand({
      cmd: activeCommand,
      kid: selectedKid,
      kidPinInput: cmdKidPin,
      staffPinInput: cmdStaffPin,
      penaltyReasonInput: cmdPenaltyReason,
    });
    if (res.ok) {
      setActiveCommand(null);
      setSelectedKidId('');
      setCmdKidPin('');
      setCmdStaffPin('');
      setCmdPenaltyReason('');
    }
  };

  const checkedKid = checkedKidId ? kids.find((k) => k.id === checkedKidId) || null : null;

  const handleOpenBearStarModal = () => {
    setIsBearStarModalOpen(true);
    setBearPinInput('');
    setShowBearPin(false);
    setBearPinError('');
    setCheckedKidId(null);
  };

  const handleCloseBearStarModal = () => {
    setIsBearStarModalOpen(false);
    setBearPinInput('');
    setShowBearPin(false);
    setBearPinError('');
    setCheckedKidId(null);
  };

  const handleVerifyBearPin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = bearPinInput.trim();
    if (!/^\d{4}$/.test(cleaned)) {
      setBearPinError(
        lang === 'th'
          ? 'กรุณากรอกรหัส PIN ตัวเลข 4 หลักของน้อง'
          : 'Please enter your 4-digit numeric PIN.'
      );
      return;
    }
    const matched = kids.find((k) => k.pin === cleaned);
    if (!matched) {
      setBearPinError(
        lang === 'th'
          ? 'ไม่พบรหัส PIN นี้ ลองตรวจสอบเลข 4 หลักของตัวเองอีกครั้งนะ'
          : 'PIN not found. Please check your 4-digit PIN.'
      );
      return;
    }
    setBearPinError('');
    setBearPinInput('');
    setCheckedKidId(matched.id);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-2 md:py-5">
      {/* Japanese Minimal Pastel Framed Cover Card */}
      <section
        className="pastel-card rounded-[36px] border-2 p-2.5 transition-colors duration-200 sm:p-4"
        style={{
          backgroundColor: theme.frameBg,
          borderColor: theme.frameBorder,
        }}
      >
        <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:gap-3.5">
          {/* Crisp Washi Paper Minimal Inner Sheet */}
          <div
            className="relative min-w-0 flex-1 overflow-hidden rounded-[26px] border bg-white/95 p-5 transition-colors duration-200 sm:p-8"
            style={{ borderColor: theme.innerBorder }}
          >
            <div className="relative z-10 grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
              {/* Left: Staff/Admin 4-Digit PIN Login Gate & QR Scanner */}
              <div className="space-y-4 lg:col-span-7">
                <div className="flex flex-wrap items-center gap-2 text-xs font-normal text-[#6B5D55] sm:text-sm">
                  <ShieldCheck className="h-4 w-4 shrink-0" style={{ color: theme.accentText }} />
                  <span>{dateFormatted}</span>
                </div>

                <div>
                  <h1 className="text-base font-semibold tracking-tight text-[#3D3532] sm:text-lg">
                    Barnhem Care &amp; Kids
                  </h1>
                  <p className="mt-0.5 text-xs text-[#70645D]">
                    {lang === 'th'
                      ? 'สงวนสิทธิ์เข้าสู่ระบบหลังบ้านสำหรับพนักงาน/ผู้ดูแลเท่านั้น · น้องๆ กดใช้งานผ่านปุ่มคำสั่งด้านล่าง'
                      : 'Back-office sign-in is reserved for Staff & Admins only · Kids use Command Buttons below'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3 pt-1">
                  <div className="relative">
                    <KeyRound
                      className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"
                      style={{ color: theme.accentText }}
                    />
                    <input
                      type={showSecret ? 'text' : 'password'}
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      value={loginInput}
                      onChange={(e) => setLoginInput(e.target.value)}
                      placeholder={
                        lang === 'th'
                          ? 'กรอก PIN พนักงาน/ผู้ดูแล 4 หลัก หรือสแกน QR พนักงาน'
                          : 'Enter Staff/Admin 4-digit PIN or scan Staff QR'
                      }
                      aria-label={
                        lang === 'th'
                          ? 'กรอกรหัส PIN พนักงาน 4 หลัก หรือสแกน QR พนักงาน'
                          : 'Enter Staff 4-digit PIN or Staff QR code'
                      }
                      className="min-h-[54px] w-full rounded-[18px] border-2 bg-[#FFFDFC] pl-12 pr-12 text-base font-medium text-[#2F2A28] placeholder-[#A1948D] transition-colors focus:outline-none"
                      style={{ borderColor: theme.innerBorder }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret((prev) => !prev)}
                      aria-label={
                        showSecret
                          ? lang === 'th'
                            ? 'ซ่อนรหัสผ่าน'
                            : 'Hide input'
                          : lang === 'th'
                            ? 'แสดงรหัสผ่าน'
                            : 'Show input'
                      }
                      className="absolute right-2.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[#6B5D55] transition-colors hover:bg-[#FAF6F2]"
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <button
                      type="submit"
                      className="pastel-btn min-h-[50px] whitespace-nowrap rounded-[18px] border-2 px-5 py-3 text-base font-semibold shadow-xs hover:brightness-[0.97]"
                      style={{
                        backgroundColor: theme.accentBg,
                        borderColor: theme.accentBorder,
                        color: theme.accentText,
                      }}
                    >
                      {lang === 'th' ? 'เข้าสู่ระบบพนักงาน ✨' : 'Staff Sign In ✨'}
                    </button>

                    <button
                      type="button"
                      onClick={onOpenQrScanner}
                      className="pastel-btn inline-flex min-h-[50px] items-center justify-center gap-2 whitespace-nowrap rounded-[18px] border-2 bg-white px-5 py-3 text-base font-medium text-[#3D3532] hover:brightness-[0.98]"
                      style={{ borderColor: theme.innerBorder }}
                    >
                      <Camera className="h-5 w-5 shrink-0" style={{ color: theme.accentText }} />
                      <span>{lang === 'th' ? 'สแกน QR Code' : 'Scan QR Code'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Right: Japanese Minimal Desk Clock & Daily Laundry Card */}
              <div
                className="flex flex-col items-center justify-center rounded-[24px] border p-6 text-center transition-colors duration-200 lg:col-span-5"
                style={{
                  backgroundColor: theme.softTint,
                  borderColor: theme.innerBorder,
                }}
              >
                <div className="text-xs font-medium tracking-wide text-[#70645D]">
                  {lang === 'th' ? 'เวลาจริงปัจจุบัน' : 'LIVE LOCAL TIME'}
                </div>

                <div
                  className="tabular-nums mt-1.5 text-4xl font-semibold tracking-wider text-[#3D3532] sm:text-5xl"
                  data-testid="live-digital-clock"
                >
                  {formatTimeHMS(now)}
                </div>

                <div
                  className="mt-4 w-full rounded-[16px] border bg-white/90 px-4 py-3 text-sm font-semibold"
                  style={{
                    borderColor: theme.innerBorder,
                    color: theme.accentText,
                  }}
                >
                  🧺 {lang === 'th' ? laundry.labelTh : laundry.labelEn}
                </div>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-center">
            <PastelFramePicker lang={lang} activeTheme={theme} onSelect={handleSelectFrame} />
          </div>
        </div>
      </section>

      {/* Door Command Buttons Section with Peeking Bear Star-Check Mascot */}
      <div className="relative pt-[140px] sm:pt-[156px]">
        <button
          type="button"
          onClick={handleOpenBearStarModal}
          data-testid="bear-star-check-trigger"
          aria-label={
            lang === 'th'
              ? 'รูปหัวน้องหมีเพื่อเช็คยอดสะสมดาว'
              : 'Tap bear head to check accumulated stars'
          }
          className="group absolute left-1/2 top-0 z-20 flex -translate-x-1/2 cursor-pointer flex-col items-center focus-visible:outline-none"
        >
          {/* Speech label right above the bear's head */}
          <span
            className="relative whitespace-nowrap rounded-2xl border-2 bg-white px-3 py-1.5 text-center text-[11px] font-bold shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-[#3B2F2A] sm:px-3.5 sm:text-xs"
            style={{
              borderColor: theme.accentBorder,
              color: theme.accentText,
            }}
          >
            {lang === 'th'
              ? 'รูปหัวน้องหมีเพื่อเช็คยอดสะสมดาว'
              : 'Tap bear head to check your stars'}
            <span
              aria-hidden="true"
              className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 bg-white"
              style={{ borderColor: theme.accentBorder }}
            />
          </span>

          {/* Stylish IT girl bear (right-side bear style: beret, yellow scarf, eyelashes, glasses & laptop) */}
          <svg
            aria-hidden="true"
            viewBox="0 0 176 134"
            className="mt-1 h-[118px] w-[154px] drop-shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5 group-active:scale-[0.98] sm:h-[134px] sm:w-[176px]"
          >
            {/* Left & Right round ears */}
            <circle cx="48" cy="30" r="14.5" fill="#E6BE9A" stroke="#5B4031" strokeWidth="2.6" />
            <circle cx="48" cy="30" r="8" fill="#F9DEC9" />
            <circle cx="128" cy="30" r="14.5" fill="#E6BE9A" stroke="#5B4031" strokeWidth="2.6" />
            <circle cx="128" cy="30" r="8" fill="#F9DEC9" />

            {/* Bear upper body & stylish pastel cardigan */}
            <path
              d="M42 121 C42 90, 58 78, 88 78 C118 78, 134 90, 134 121 Z"
              fill="#F8D8DF"
              stroke="#5B4031"
              strokeWidth="2.6"
              strokeLinejoin="round"
            />
            {/* Cream inner blouse */}
            <path
              d="M72 80 L88 98 L104 80 Z"
              fill="#FFF9F2"
              stroke="#5B4031"
              strokeWidth="2"
              strokeLinejoin="round"
            />

            {/* Fashionable yellow neckerchief / scarf (matching right-side bear) */}
            <path
              d="M57 78 Q88 92 119 78 Q121 87 112 91 Q88 100 64 91 Q55 87 57 78 Z"
              fill="#FCE08B"
              stroke="#5B4031"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            {/* Scarf knot & ribbon tail on the left shoulder */}
            <path
              d="M64 87 L56 101 L68 103 L73 91 Z"
              fill="#F7D06B"
              stroke="#5B4031"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <circle cx="67" cy="88" r="5" fill="#FCE08B" stroke="#5B4031" strokeWidth="2.2" />

            {/* Bear chubby head (creamy beige fur) */}
            <ellipse cx="88" cy="54" rx="43" ry="33" fill="#E6BE9A" stroke="#5B4031" strokeWidth="2.6" />

            {/* Stylish beret hat tilted on top (matching right-side bear) + cute pink bow pin */}
            <path
              d="M84 9 C86 4, 91 4, 93 9"
              fill="none"
              stroke="#5B4031"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M55 28 C53 15, 72 8, 92 9 C112 10, 125 18, 121 29 C106 23, 71 23, 55 28 Z"
              fill="#F6E2CC"
              stroke="#5B4031"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Beret brim band */}
            <path
              d="M57 28 Q88 21 119 28"
              fill="none"
              stroke="#5B4031"
              strokeWidth="2.3"
              strokeLinecap="round"
            />
            {/* Cute coral-pink bow accent on the beret */}
            <path
              d="M111 19 L103 14 L105 22 Z M111 19 L120 15 L117 23 Z"
              fill="#F48FB1"
              stroke="#5B4031"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <circle cx="111" cy="19" r="2.6" fill="#F9A8C2" stroke="#5B4031" strokeWidth="1.6" />

            {/* Rosy cheeks */}
            <ellipse cx="59" cy="63" rx="7" ry="4.2" fill="#F4A4B8" opacity="0.9" />
            <ellipse cx="117" cy="63" rx="7" ry="4.2" fill="#F4A4B8" opacity="0.9" />

            {/* Cute feminine eyes with subtle lashes */}
            <path d="M62 50 L59 47.5 M63 53 L59.5 52" stroke="#3D2A20" strokeWidth="1.7" strokeLinecap="round" />
            <path d="M114 50 L117 47.5 M113 53 L116.5 52" stroke="#3D2A20" strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="71" cy="54" r="3.9" fill="#3D2A20" />
            <circle cx="72.4" cy="52.5" r="1.4" fill="#FFFFFF" />
            <circle cx="105" cy="54" r="3.9" fill="#3D2A20" />
            <circle cx="106.4" cy="52.5" r="1.4" fill="#FFFFFF" />

            {/* Cream muzzle, button nose & kawaii 'w' smile */}
            <ellipse cx="88" cy="63" rx="12.5" ry="9" fill="#FDF5EC" />
            <ellipse cx="88" cy="59.5" rx="4" ry="2.8" fill="#4A3224" />
            <path
              d="M88 62.3 L88 64.5 M82.8 65 Q85.4 68.2 88 64.8 Q90.6 68.2 93.2 65"
              fill="none"
              stroke="#4A3224"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Chic round rose-bronze glasses */}
            <circle cx="70.5" cy="54" r="11.5" fill="#FFFFFF" fillOpacity="0.28" stroke="#6D4438" strokeWidth="2.4" />
            <circle cx="105.5" cy="54" r="11.5" fill="#FFFFFF" fillOpacity="0.28" stroke="#6D4438" strokeWidth="2.4" />
            <path d="M82 53.5 Q88 51 94 53.5" fill="none" stroke="#6D4438" strokeWidth="2.3" strokeLinecap="round" />
            <line x1="46" y1="51" x2="59" y2="53.5" stroke="#6D4438" strokeWidth="2.3" strokeLinecap="round" />
            <line x1="117" y1="53.5" x2="130" y2="51" stroke="#6D4438" strokeWidth="2.3" strokeLinecap="round" />
            <path d="M64 48.5 L67.5 45.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
            <path d="M99 48.5 L102.5 45.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />

            {/* Left & Right arms reaching to the sleek IT laptop */}
            <ellipse cx="44" cy="107" rx="11" ry="8" transform="rotate(-18 44 107)" fill="#E6BE9A" stroke="#5B4031" strokeWidth="2.5" />
            <ellipse cx="132" cy="107" rx="11" ry="8" transform="rotate(18 132 107)" fill="#E6BE9A" stroke="#5B4031" strokeWidth="2.5" />

            {/* Stylish pastel IT laptop in front of the bear */}
            <rect
              x="51"
              y="83"
              width="74"
              height="38"
              rx="7.5"
              fill="#F5F7FB"
              stroke="#5B4031"
              strokeWidth="2.6"
            />
            <rect
              x="56"
              y="88"
              width="64"
              height="28"
              rx="4.5"
              fill="#E3ECF7"
            />
            {/* Gold star emblem on laptop lid */}
            <path
              d="M88 93.5 L90.6 98.8 L96.4 99.6 L92.2 103.7 L93.2 109.5 L88 106.7 L82.8 109.5 L83.8 103.7 L79.6 99.6 L85.4 98.8 Z"
              fill="#FACC15"
              stroke="#B45309"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            {/* Tiny pink heart tech sticker on corner of laptop */}
            <path
              d="M111 94 C111 92.5, 113 92, 114 93.2 C115 92, 117 92.5, 117 94 C117 96, 114 98, 114 98 C114 98, 111 96, 111 94 Z"
              fill="#F48FB1"
            />
            {/* Laptop base resting on the card border */}
            <rect
              x="44"
              y="118"
              width="88"
              height="9"
              rx="4.5"
              fill="#D4DFEE"
              stroke="#5B4031"
              strokeWidth="2.5"
            />
            <line x1="79" y1="122.5" x2="97" y2="122.5" stroke="#7A8A9E" strokeWidth="2" strokeLinecap="round" />

            {/* Cute paws gripping the sides/border */}
            <ellipse cx="42" cy="119" rx="10" ry="7.2" fill="#E6BE9A" stroke="#5B4031" strokeWidth="2.5" />
            <ellipse cx="42" cy="120.2" rx="4.8" ry="3" fill="#F9DEC9" />
            <ellipse cx="134" cy="119" rx="10" ry="7.2" fill="#E6BE9A" stroke="#5B4031" strokeWidth="2.5" />
            <ellipse cx="134" cy="120.2" rx="4.8" ry="3" fill="#F9DEC9" />
          </svg>
        </button>

        <section
          aria-label={lang === 'th' ? 'ปุ่มคำสั่งประจำวันหน้าประตู' : 'Daily Door Command Buttons'}
          data-testid="door-commands-section"
          className="pastel-card rounded-[28px] border-2 bg-white/95 px-4 pb-4 pt-8 transition-colors duration-200 sm:px-5 sm:pb-5 sm:pt-9"
          style={{ borderColor: theme.innerBorder }}
        >
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-[#3D3532] sm:text-lg">
              <Clock className="h-4 w-4 shrink-0" style={{ color: theme.accentText }} />
              <span>{lang === 'th' ? 'ปุ่มคำสั่งประจำวันหน้าประตู' : 'Daily Door Commands'}</span>
            </h2>
            <p className="text-xs text-[#70645D]">
              {lang === 'th'
                ? 'พื้นที่การมีส่วนร่วมของน้องๆ · แสดงเฉพาะปุ่มที่กำลังเปิดหรือรอเปิดในวันนี้'
                : 'Kids daily participation · Showing active and upcoming commands for today'}
              {hiddenExpiredCount > 0 && (
                <span>
                  {lang === 'th'
                    ? ` · ซ่อนปุ่มที่เลยเวลาแล้ว ${hiddenExpiredCount} ปุ่ม`
                    : ` · ${hiddenExpiredCount} expired hidden`}
                </span>
              )}
            </p>
          </div>
          {isHolidayToday && (
            <span className="rounded-xl border border-[#74CCB8] bg-[#E7FAF6] px-3 py-1 text-xs font-bold text-[#114B43]">
              🏖️ โหมดวันหยุด (ยกเว้นสาย)
            </span>
          )}
        </div>

        {visibleCommandEntries.length === 0 ? (
          <div
            data-testid="door-commands-empty"
            className="rounded-[22px] border border-[#EBD8C3] bg-[#FFFDF9] px-5 py-7 text-center"
          >
            <div className="text-2xl">🌙</div>
            <p className="mt-1.5 text-sm font-semibold text-[#3D3532]">
              {lang === 'th'
                ? 'เลยเวลาของปุ่มคำสั่งทั้งหมดสำหรับวันนี้แล้วค่ะ'
                : 'All daily command windows for today have closed.'}
            </p>
            <p className="mt-0.5 text-xs text-[#70645D]">
              {lang === 'th'
                ? 'ระบบจะเปิดแสดงปุ่มคำสั่งรอบใหม่อัตโนมัติในวันพรุ่งนี้เช้า'
                : 'Command buttons will automatically appear again tomorrow morning.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {visibleCommandEntries.map(({ cmd, availability }) => {
              const eligibleCount = kids.filter((k) => cmd.allowedKidIds.includes(k.id)).length;
              const isOpen = availability.canOpen;
              const isPenalty = cmd.commandKind === 'penalty';

              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={() => handleCommandCardClick(cmd)}
                  data-testid={`door-cmd-btn-${cmd.id}`}
                  className={`pastel-btn flex w-full flex-col justify-between gap-3 rounded-[22px] border-2 px-4 py-3.5 text-left transition-all sm:flex-row sm:items-center ${
                    !isOpen
                      ? 'bg-[#FBF9F6] opacity-90 hover:bg-[#F7F3ED]'
                      : isPenalty
                        ? 'bg-[#FFF5F7]/75 hover:brightness-[0.98]'
                        : 'bg-white hover:brightness-[0.98]'
                  }`}
                  style={{
                    borderColor: isOpen
                      ? isPenalty
                        ? '#F0A8B2'
                        : theme.accentBorder
                      : theme.innerBorder,
                  }}
                >
                  <div className="flex min-w-0 items-start gap-3 sm:items-center">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-xl"
                      style={{
                        backgroundColor: !isOpen
                          ? '#FFF5E6'
                          : isPenalty
                            ? '#FADADD'
                            : theme.softTint,
                        borderColor: isOpen && isPenalty ? '#F0A8B2' : theme.innerBorder,
                      }}
                    >
                      {isOpen ? cmd.emoji : <Lock className="h-5 w-5 text-[#D97706]" />}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-[#3D3532] sm:text-base">
                          {cmd.titleTh}
                        </span>
                        {isPenalty && (
                          <span className="inline-flex items-center rounded-md border border-[#F0A8B2] bg-[#FADADD] px-2 py-0.5 text-[11px] font-bold text-[#9F1239]">
                            ⚖️ บทลงโทษ
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-md border border-[#E8D575] bg-[#FFF5BA] px-2 py-0.5 text-[11px] font-bold text-[#713F12]">
                          <Users className="h-3 w-3" /> เลือกรายชื่อ ({eligibleCount}/{kids.length})
                        </span>
                      </div>

                      {cmd.descriptionTh && (
                        <div className="truncate text-xs text-[#6B5D55]">{cmd.descriptionTh}</div>
                      )}

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#70645D]">
                        <span className="tabular-nums">
                          ⏰ {cmd.startTime}–{cmd.endTime} น. (เส้นตาย {cmd.deadlineTime}
                          {cmd.earlyMinutes > 0 ? ` · ก่อนเวลา ${cmd.earlyMinutes} น.` : ''})
                        </span>
                        <span>·</span>
                        <span>{formatAuthModeLabel(cmd.authMode)}</span>
                        {isPenalty ? (
                          <>
                            <span>·</span>
                            <span className="font-semibold text-[#9F1239]">
                              {formatPenaltyRuleLabel(cmd.penaltyType, cmd.penaltyValue, cmd.customPenaltyLabelTh)}
                            </span>
                          </>
                        ) : (
                          cmd.rewardStars > 0 && (
                            <>
                              <span>·</span>
                              <span className="font-semibold text-[#B45309]">+{cmd.rewardStars} ⭐</span>
                            </>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-end">
                    <span
                      className={`inline-flex min-h-[38px] min-w-[116px] items-center justify-center rounded-xl border px-3.5 text-xs font-bold ${
                        isOpen && isPenalty
                          ? 'border-[#F0A8B2] bg-[#FADADD] text-[#9F1239]'
                          : availability.status === 'open_ontime'
                            ? 'border-[#74CCB8] bg-[#E7FAF6] text-[#114B43]'
                            : availability.status === 'early_window'
                              ? 'border-[#98CBEB] bg-[#DCEEF8] text-[#1E4460]'
                              : availability.status === 'open_late'
                                ? 'border-[#F0A8B2] bg-[#FADADD] text-[#9F1239]'
                                : 'border-[#EBD8C3] bg-white text-[#70645D]'
                      }`}
                    >
                      {isOpen && isPenalty ? '⚖️ บันทึกโทษ' : availability.badgeLabelTh}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        </section>
      </div>

      {/* 4-Language Daily Vocabulary Strip (JP / ZH / EN / TH) */}
      <section
        aria-label={lang === 'th' ? 'คำศัพท์ประจำวัน 4 ภาษา' : 'Daily 4-Language Word'}
        className="pastel-card rounded-[26px] border-2 bg-white/95 p-5 transition-colors duration-200"
        style={{ borderColor: theme.innerBorder }}
      >
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-medium text-[#6B5D55] sm:text-sm">
            <BookOpen className="h-4 w-4 shrink-0" style={{ color: theme.accentText }} />
            <span>
              {lang === 'th' ? 'คำศัพท์ประจำวัน 4 ภาษา' : 'Daily Word · 4 Languages'}
            </span>
            <span aria-hidden="true" className="text-[#C4B8B0]">
              ·
            </span>
            <span className="tabular-nums text-xs text-[#8A7D75]">
              {vocabIndex + 1}/{DAILY_VOCAB_LIST.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setVocabOffset((prev) => prev - 1)}
              aria-label={lang === 'th' ? 'คำศัพท์ก่อนหน้า' : 'Previous word'}
              className="pastel-btn flex h-9 w-9 items-center justify-center rounded-full border bg-white text-[#5F544E] hover:bg-[#FAF6F2]"
              style={{ borderColor: theme.innerBorder }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setVocabOffset((prev) => prev + 1)}
              aria-label={lang === 'th' ? 'คำศัพท์ถัดไป' : 'Next word'}
              className="pastel-btn flex h-9 w-9 items-center justify-center rounded-full border bg-white text-[#5F544E] hover:bg-[#FAF6F2]"
              style={{ borderColor: theme.innerBorder }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div
            className="rounded-[18px] border p-3.5 transition-colors duration-200"
            style={{ backgroundColor: theme.softTint, borderColor: theme.innerBorder }}
          >
            <div className="text-[11px] font-medium text-[#70645D]">日本語 · ญี่ปุ่น</div>
            <div className="mt-1 text-lg font-semibold text-[#3D3532]">{dailyWord.jp}</div>
            <div className="mt-0.5 text-xs text-[#70645D]">{dailyWord.jpReading}</div>
          </div>

          <div
            className="rounded-[18px] border p-3.5 transition-colors duration-200"
            style={{ backgroundColor: theme.softTint, borderColor: theme.innerBorder }}
          >
            <div className="text-[11px] font-medium text-[#70645D]">中文 · จีน</div>
            <div className="mt-1 text-lg font-semibold text-[#3D3532]">{dailyWord.zh}</div>
            <div className="mt-0.5 text-xs text-[#70645D]">{dailyWord.zhReading}</div>
          </div>

          <div
            className="rounded-[18px] border p-3.5 transition-colors duration-200"
            style={{ backgroundColor: theme.softTint, borderColor: theme.innerBorder }}
          >
            <div className="text-[11px] font-medium text-[#70645D]">English · อังกฤษ</div>
            <div className="mt-1 text-lg font-semibold text-[#3D3532]">{dailyWord.en}</div>
          </div>

          <div
            className="rounded-[18px] border p-3.5 transition-colors duration-200"
            style={{ backgroundColor: theme.softTint, borderColor: theme.innerBorder }}
          >
            <div className="text-[11px] font-medium text-[#70645D]">ภาษาไทย · Thai</div>
            <div className="mt-1 text-lg font-semibold" style={{ color: theme.accentText }}>
              {dailyWord.th}
            </div>
          </div>
        </div>
      </section>

      {/* Minimal Collapsible Cloud Sync Toggle */}
      <div className="pt-1 text-center">
        <button
          type="button"
          onClick={() => setShowCloudDrawer((prev) => !prev)}
          aria-expanded={showCloudDrawer || cloudSyncStatus === 'unauthorized'}
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-medium text-[#8A7D75] transition-colors hover:bg-white/80 hover:text-[#3D3532]"
        >
          {cloudSyncStatus === 'synced' ? (
            <Cloud className="h-3.5 w-3.5 text-[#0F766E]" />
          ) : (
            <CloudOff className="h-3.5 w-3.5" />
          )}
          <span>
            {cloudSyncStatus === 'synced'
              ? lang === 'th'
                ? 'Firebase Cloud Sync เชื่อมต่อแล้ว'
                : 'Firebase Cloud Sync Connected'
              : lang === 'th'
                ? 'ตั้งค่าซิงก์ข้อมูล (Cloud Sync)'
                : 'Cloud Sync Settings'}
          </span>
          {showCloudDrawer || cloudSyncStatus === 'unauthorized' ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>

        {(showCloudDrawer || cloudSyncStatus === 'unauthorized') && (
          <section
            className="mx-auto mt-2.5 flex max-w-2xl flex-col items-center justify-between gap-3 rounded-[20px] border bg-white/95 px-4 py-3 text-left sm:flex-row"
            style={{ borderColor: theme.innerBorder }}
          >
            <div className="min-w-0 text-xs text-[#5F544E]">
              <div className="font-semibold text-[#3D3532]">
                {cloudSyncStatus === 'synced'
                  ? lang === 'th'
                    ? `ซิงก์ Real-time แล้ว (${cloudUserEmail})`
                    : `Synced live (${cloudUserEmail})`
                  : cloudSyncStatus === 'connecting'
                    ? lang === 'th'
                      ? 'กำลังเชื่อมต่อฐานข้อมูลกลาง...'
                      : 'Connecting to cloud database...'
                    : cloudSyncStatus === 'unauthorized'
                      ? lang === 'th'
                        ? `อีเมล ${cloudUserEmail} ยังไม่ได้รับอนุญาตใน Creator`
                        : `${cloudUserEmail} not yet invited by Creator`
                      : lang === 'th'
                        ? 'ซิงก์ข้อมูลข้ามเครื่องฟรีด้วยบัญชี Google มูลนิธิ (รายชื่อน้องถูกซ่อนเป็นส่วนตัว)'
                        : 'Sync across devices with foundation Google account (names stay private)'}
              </div>
            </div>

            {cloudSyncStatus === 'synced' || cloudSyncStatus === 'unauthorized' ? (
              <button
                type="button"
                onClick={onDisconnectCloud}
                className="pastel-btn min-h-[38px] shrink-0 whitespace-nowrap rounded-[14px] border bg-[#FFFDFC] px-3.5 text-xs font-semibold text-[#5F544E] hover:bg-[#FAF6F2]"
                style={{ borderColor: theme.innerBorder }}
              >
                {lang === 'th' ? 'สลับ / ออกจากบัญชี Cloud' : 'Switch / Sign Out'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onConnectCloud}
                disabled={cloudSyncStatus === 'connecting'}
                className="pastel-btn inline-flex min-h-[38px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] border px-3.5 text-xs font-semibold hover:brightness-[0.97] disabled:opacity-60"
                style={{
                  backgroundColor: theme.softTint,
                  borderColor: theme.frameBorder,
                  color: theme.accentText,
                }}
              >
                <Cloud className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {lang === 'th' ? 'เชื่อมต่อ Google Cloud Sync' : 'Connect Google Cloud Sync'}
                </span>
              </button>
            )}
          </section>
        )}
      </div>

      {/* Door Command Confirmation Modal */}
      {activeCommand && (() => {
        const isPenaltyCmd = activeCommand.commandKind === 'penalty';
        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`ยืนยันปุ่มคำสั่ง ${activeCommand.titleTh}`}
            data-testid="door-command-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          >
            <form
              onSubmit={handleConfirmCommand}
              className="pastel-card max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-[30px] border-2 border-[#EBD8C3] bg-[#FFFDF9] p-6"
            >
              <div className="flex items-start justify-between gap-3 border-b border-[#EBD8C3] pb-3">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-[#3B2F2A]">
                    <span>{activeCommand.emoji}</span>
                    <span>{activeCommand.titleTh}</span>
                  </h3>
                  {activeCommand.descriptionTh && (
                    <p className="mt-0.5 text-xs text-[#5C4B43]">{activeCommand.descriptionTh}</p>
                  )}
                  <p className="mt-1 text-[11px] font-semibold text-[#705F56]">
                    ⏰ {activeCommand.startTime}–{activeCommand.endTime} น. · เส้นตาย{' '}
                    {activeCommand.deadlineTime} น. · {formatAuthModeLabel(activeCommand.authMode)}
                  </p>
                  <p className="text-[11px] text-[#9F1239]">
                    ⚖️ {activeCommand.penaltyNoteTh || formatPenaltyRuleLabel(activeCommand.penaltyType, activeCommand.penaltyValue, activeCommand.customPenaltyLabelTh)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveCommand(null)}
                  aria-label="ปิดหน้าต่างคำสั่ง"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#EBD8C3] bg-white text-[#3B2F2A] hover:bg-[#FADADD]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <div className="mb-2 text-xs font-bold text-[#3B2F2A]">
                  1. เลือกรายชื่อน้องผู้มีสิทธิ์ ({eligibleKids.length} คน)
                </div>
                {eligibleKids.length === 0 ? (
                  <p className="rounded-xl border border-[#EBD8C3] bg-white p-4 text-xs text-[#705F56]">
                    ยังไม่ได้เลือกรายชื่อผู้มีสิทธิ์สำหรับปุ่มนี้ กรุณาตั้งค่าในหน้าพี่เลี้ยงหรือ Creator
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {eligibleKids.map((kid) => {
                      const dp =
                        kid.dailyProgress.dateStr === todayStr
                          ? kid.dailyProgress
                          : { dateStr: todayStr };
                      const cmdCountToday = (dp.completedCommandIds || []).filter(
                        (id) => id === activeCommand.id
                      ).length;
                      const doneToday = cmdCountToday > 0;
                      const isSelected = selectedKidId === kid.id;
                      return (
                        <button
                          key={kid.id}
                          type="button"
                          disabled={!isPenaltyCmd && doneToday}
                          onClick={() => {
                            setSelectedKidId(kid.id);
                            setCmdKidPin('');
                          }}
                          data-testid={`door-cmd-kid-${kid.id}`}
                          className={`pastel-btn flex min-h-[46px] items-center justify-between gap-1.5 rounded-xl border-2 px-3 py-2 text-left text-xs font-bold transition-colors ${
                            !isPenaltyCmd && doneToday
                              ? 'cursor-not-allowed border-[#74CCB8] bg-[#E7FAF6] text-[#114B43] opacity-75'
                              : isSelected
                                ? isPenaltyCmd
                                  ? 'border-[#9F1239] bg-[#FADADD] text-[#9F1239]'
                                  : 'border-[#3B2F2A] bg-[#FFF5BA] text-[#3B2F2A]'
                                : 'border-[#EBD8C3] bg-white text-[#3B2F2A] hover:bg-[#FAF4EC]'
                          }`}
                        >
                          <span className="truncate">
                            {kid.emoji} {kid.nickname}
                          </span>
                          {doneToday && (
                            <span className="shrink-0 text-[10px]">
                              {isPenaltyCmd ? `${cmdCountToday} ครั้ง` : '✓ แล้ว'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedKid && isPenaltyCmd && (
                <div className="space-y-2 rounded-[20px] border-2 border-[#F0A8B2] bg-[#FFF5F7] p-4">
                  <label
                    htmlFor="door-cmd-penalty-reason"
                    className="block text-xs font-bold text-[#9F1239]"
                  >
                    📝 เหตุผล / สาเหตุบทลงโทษสำหรับ {selectedKid.nickname} (ไม่บังคับ)
                  </label>
                  <input
                    id="door-cmd-penalty-reason"
                    type="text"
                    value={cmdPenaltyReason}
                    onChange={(e) => setCmdPenaltyReason(e.target.value)}
                    placeholder="เช่น ไม่เก็บจาน, เล่นมือถือนอกเวลา, พูดไม่สุภาพ"
                    data-testid="door-cmd-penalty-reason-input"
                    className="min-h-[44px] w-full rounded-xl border-2 border-[#F0A8B2] bg-white px-3 text-sm font-medium text-[#3B2F2A] focus:border-[#9F1239] focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'ไม่เก็บจาน / ลืมเวร',
                      'ทะเลาะกัน / พูดไม่สุภาพ',
                      'เล่นมือถือนอกเวลา',
                      'ไม่ทำการบ้าน / ไม่เก็บของ',
                    ].map((presetReason) => (
                      <button
                        key={presetReason}
                        type="button"
                        onClick={() => setCmdPenaltyReason(presetReason)}
                        className="rounded-lg border border-[#F0A8B2] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#9F1239] hover:bg-[#FADADD]"
                      >
                        {presetReason}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedKid && activeCommand.authMode === 'kid_pin' && (
                <div className="space-y-2 rounded-[20px] border-2 border-[#E8D575] bg-[#FFFBEB] p-4">
                  <label
                    htmlFor="door-cmd-kid-pin"
                    className="block text-xs font-bold text-[#713F12]"
                  >
                    2. 🔑 ช่องยืนยันปุ่มคำสั่ง: กรอกรหัส PIN 4 หลักของ {selectedKid.nickname}
                  </label>
                  <input
                    id="door-cmd-kid-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={cmdKidPin}
                    onChange={(e) => setCmdKidPin(e.target.value)}
                    placeholder="PIN น้อง 4 หลัก"
                    data-testid="door-cmd-kid-pin-input"
                    className="min-h-[48px] w-full rounded-xl border-2 border-[#EBD8C3] bg-white px-4 text-center text-xl font-bold tracking-[0.35em] focus:border-[#3B2F2A] focus:outline-none"
                  />
                </div>
              )}

              {selectedKid && activeCommand.authMode === 'staff_pin' && (
                <div className="space-y-2 rounded-[20px] border-2 border-[#98CBEB] bg-[#DCEEF8]/50 p-4">
                  <label
                    htmlFor="door-cmd-staff-pin"
                    className="block text-xs font-bold text-[#1E4460]"
                  >
                    2. 🧑‍🏫 พี่เลี้ยงใส่ PIN 4 หลักเพื่อยืนยันให้ {selectedKid.nickname}
                  </label>
                  <input
                    id="door-cmd-staff-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={cmdStaffPin}
                    onChange={(e) => setCmdStaffPin(e.target.value)}
                    placeholder="PIN พี่เลี้ยง 4 หลัก"
                    data-testid="door-cmd-staff-pin-input"
                    className="min-h-[48px] w-full rounded-xl border-2 border-[#98CBEB] bg-white px-4 text-center text-xl font-bold tracking-[0.35em] focus:border-[#3B2F2A] focus:outline-none"
                  />
                </div>
              )}

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveCommand(null)}
                  className="pastel-btn min-h-[46px] flex-1 rounded-[18px] border-2 border-[#EBD8C3] bg-white px-4 text-sm font-bold text-[#5C4B43]"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!selectedKid}
                  data-testid="door-cmd-confirm-btn"
                  className={`pastel-btn inline-flex min-h-[46px] flex-1 items-center justify-center gap-1.5 rounded-[18px] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45 ${
                    isPenaltyCmd ? 'bg-[#9F1239]' : 'bg-[#3B2F2A]'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isPenaltyCmd ? 'บันทึกบทลงโทษ ⚖️' : 'ยืนยันปุ่มคำสั่ง'}</span>
                </button>
              </div>
            </form>
          </div>
        );
      })()}
      {/* Bear Star Balance Check Modal (Kid enters own 4-digit PIN) */}
      {isBearStarModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lang === 'th' ? 'เช็คยอดดาวสะสมของน้อง' : 'Check Child Star Balance'}
          data-testid="bear-star-check-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
        >
          <div className="pastel-card max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-[30px] border-2 border-[#EBD8C3] bg-[#FFFDF9] p-6">
            <div className="flex items-start justify-between gap-3 border-b border-[#EBD8C3] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#E8D575] bg-[#FFF5BA] text-2xl">
                  🐻
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#3B2F2A]">
                    {lang === 'th' ? 'เช็คยอดสะสมดาว' : 'Check Accumulated Stars'}
                  </h3>
                  <p className="text-xs text-[#705F56]">
                    {checkedKid
                      ? lang === 'th'
                        ? `ข้อมูลยอดดาวสะสมของน้อง${checkedKid.nickname}`
                        : `Star balance for ${checkedKid.nickname}`
                      : lang === 'th'
                        ? 'ใส่วันนี้ได้เลย · กรอกรหัส PIN 4 หลักของตัวเอง'
                        : 'Enter your personal 4-digit PIN'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseBearStarModal}
                aria-label="ปิดหน้าต่างเช็คยอดดาว"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#EBD8C3] bg-white text-[#3B2F2A] hover:bg-[#FADADD]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!checkedKid ? (
              <form onSubmit={handleVerifyBearPin} className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="bear-star-pin-input"
                    className="block text-xs font-bold text-[#5C4B43]"
                  >
                    🔑 {lang === 'th' ? 'กรอกรหัส PIN 4 หลักของน้อง' : 'Enter your 4-digit PIN'}
                  </label>
                  <div className="relative">
                    <input
                      id="bear-star-pin-input"
                      data-testid="bear-star-pin-input"
                      type={showBearPin ? 'text' : 'password'}
                      inputMode="numeric"
                      maxLength={4}
                      autoFocus
                      autoComplete="off"
                      value={bearPinInput}
                      onChange={(e) => {
                        setBearPinInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                        if (bearPinError) setBearPinError('');
                      }}
                      placeholder="••••"
                      className="min-h-[54px] w-full rounded-[18px] border-2 border-[#EBD8C3] bg-white px-12 text-center text-2xl font-bold tracking-[0.45em] text-[#3B2F2A] focus:border-[#3B2F2A] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBearPin((prev) => !prev)}
                      aria-label={showBearPin ? 'ซ่อนรหัส PIN' : 'แสดงรหัส PIN'}
                      className="absolute right-2.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[#6B5D55] hover:bg-[#FAF6F2]"
                    >
                      {showBearPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {bearPinError && (
                    <p
                      data-testid="bear-star-pin-error"
                      className="rounded-xl border border-[#F0A8B2] bg-[#FADADD]/50 px-3 py-2 text-xs font-bold text-[#9F1239]"
                    >
                      ⚠️ {bearPinError}
                    </p>
                  )}
                </div>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={handleCloseBearStarModal}
                    className="pastel-btn min-h-[46px] flex-1 rounded-[18px] border-2 border-[#EBD8C3] bg-white text-sm font-bold text-[#5C4B43]"
                  >
                    {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    data-testid="bear-star-submit-btn"
                    className="pastel-btn inline-flex min-h-[46px] flex-1 items-center justify-center gap-1.5 rounded-[18px] bg-[#3B2F2A] text-sm font-bold text-white"
                  >
                    <Star className="h-4 w-4 text-[#FACC15]" />
                    <span>{lang === 'th' ? 'เช็คยอดดาวสะสม' : 'Check Stars'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div data-testid="bear-star-result" className="space-y-4">
                <div className="rounded-[24px] border-2 border-[#E8D575] bg-[#FFFBEB] p-5 text-center">
                  <div className="text-3xl">{checkedKid.emoji || '🌟'}</div>
                  <div className="mt-1 text-base font-bold text-[#3B2F2A]">
                    น้อง{checkedKid.nickname} · กลุ่ม {checkedKid.ageGroup}
                  </div>
                  <div className="mt-2 text-xs font-semibold text-[#705F56]">
                    {lang === 'th' ? 'ยอดดาวสะสมปัจจุบัน' : 'Current Star Balance'}
                  </div>
                  <div
                    data-testid="bear-star-balance-value"
                    className="tabular-nums mt-1 text-4xl font-bold text-[#B45309]"
                  >
                    {checkedKid.stars.toLocaleString()} ⭐
                  </div>
                  {(checkedKid.piggyBank?.savedStars ?? 0) > 0 && (
                    <div className="mt-2 text-xs font-semibold text-[#705F56]">
                      🐷 ในกระปุกออมสินส่วนตัว: {(checkedKid.piggyBank?.savedStars ?? 0).toLocaleString()} ⭐
                    </div>
                  )}
                </div>

                {checkedKid.starHistory.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-[#5C4B43]">
                      {lang === 'th' ? 'รายการดาวล่าสุด' : 'Recent Star Activity'}
                    </div>
                    <div className="divide-y divide-[#F3E9DD] rounded-[18px] border border-[#EBD8C3] bg-white px-3.5">
                      {checkedKid.starHistory.slice(0, 3).map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between gap-2 py-2.5 text-xs"
                        >
                          <div className="min-w-0 truncate text-[#3B2F2A]">
                            {tx.label}
                          </div>
                          <div
                            className={`tabular-nums shrink-0 font-bold ${
                              tx.amount >= 0 ? 'text-[#0F766E]' : 'text-[#9F1239]'
                            }`}
                          >
                            {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} ⭐
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCheckedKidId(null);
                      setBearPinInput('');
                      setBearPinError('');
                    }}
                    className="pastel-btn min-h-[46px] flex-1 rounded-[18px] border-2 border-[#EBD8C3] bg-white text-sm font-bold text-[#5C4B43]"
                  >
                    {lang === 'th' ? 'ใส่ PIN ใหม่' : 'Check Another'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseBearStarModal}
                    className="pastel-btn min-h-[46px] flex-1 rounded-[18px] bg-[#3B2F2A] text-sm font-bold text-white"
                  >
                    {lang === 'th' ? 'เรียบร้อย' : 'Done'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
