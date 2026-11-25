import React, { useState } from 'react';
import { Download, FileCode2, Plus, Printer, QrCode, RefreshCw, RotateCcw, Trash2, Upload } from 'lucide-react';
import { UI_TEXT } from '../data/seedData';
import { BOOTSTRAP_ADMIN_EMAIL } from '../firebase';
import {
  APPS_SCRIPT_TWO_WAY_SNIPPET,
  compressImageFileToDataUrl,
  normalizeAllowedEmails,
} from '../services/firestoreSync';
import {
  AlertModalPayload,
  BarnhemState,
  DecorSlot,
  DoorCommandConfig,
  Language,
  Member,
  ShopCategory,
  ShopItem,
} from '../types/barnhem';
import { clearKidPenalties, clearKidStars } from '../utils/staffStars';
import { DoorCommandsManagerSection } from './DoorCommandsManagerSection';
import { buildStandaloneHtmlExport } from '../utils/singleFileExporter';

interface CreatorAdminViewProps {
  lang: Language;
  now: Date;
  isAuthenticated: boolean;
  state: BarnhemState;
  kids: Member[];
  onLogin: (pin: string) => boolean;
  onLogout: () => void;
  onUpdateKid: (updated: Member, actionName: string) => void;
  onDeleteKid: (kidId: string) => void;
  onClearAllKidsStars: () => void;
  onClearAllKidsPenalties: () => void;
  onAddShopItem: (item: ShopItem) => void;
  onDeleteShopItem: (itemId: string) => void;
  onUpdateSettings: (creatorPins: string[], googleSheetsUrl: string, allowedSyncEmails: string[]) => void;
  doorCommands: DoorCommandConfig[];
  onSaveDoorCommands: (commands: DoorCommandConfig[], actionName: string) => void;
  onManualSync: () => void;
  onPullFromSheets: () => void;
  onShowMemberQr: (memberId: string) => void;
  onOpenQrPrintSheet: () => void;
  onShowAlert: (payload: Omit<AlertModalPayload, 'id'>) => void;
}

export const CreatorAdminView: React.FC<CreatorAdminViewProps> = ({
  lang,
  now,
  isAuthenticated,
  state,
  kids,
  onLogin,
  onLogout,
  onUpdateKid,
  onDeleteKid,
  onClearAllKidsStars,
  onClearAllKidsPenalties,
  onAddShopItem,
  onDeleteShopItem,
  onUpdateSettings,
  doorCommands,
  onSaveDoorCommands,
  onManualSync,
  onPullFromSheets,
  onShowMemberQr,
  onOpenQrPrintSheet,
  onShowAlert,
}) => {
  const t = UI_TEXT[lang];
  const [pinInput, setPinInput] = useState('');

  // Shop form
  const [itemName, setItemName] = useState('');
  const [itemNameEn, setItemNameEn] = useState('');
  const [itemPrice, setItemPrice] = useState('35');
  const [itemCategory, setItemCategory] = useState<ShopCategory>('snack');
  const [itemDecorSlot, setItemDecorSlot] = useState<DecorSlot>('accessory');
  const [itemEmoji, setItemEmoji] = useState('🎁');
  const [itemDesc, setItemDesc] = useState('');
  const [itemImageBase64, setItemImageBase64] = useState<string | undefined>(undefined);

  // Settings form
  const [creatorPinsStr, setCreatorPinsStr] = useState(state.settings.creatorPins.join(', '));
  const [sheetsUrl, setSheetsUrl] = useState(state.settings.googleSheetsUrl);
  const [allowedEmailsStr, setAllowedEmailsStr] = useState(
    normalizeAllowedEmails(state.settings.allowedSyncEmails).join(', ')
  );
  const [showAppsScriptHelp, setShowAppsScriptHelp] = useState(false);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onLogin(pinInput.trim());
    if (!ok) {
      onShowAlert({
        icon: '👑',
        title: lang === 'th' ? 'รหัสลับผู้สร้างสูงสุดไม่ถูกต้อง' : 'Invalid Creator PIN',
        message: lang === 'th' ? 'กรุณาใส่รหัสลับ Creator (9292 หรือ 6417)' : 'Enter valid Creator PIN (9292 or 6417).',
        tone: 'pink',
      });
      return;
    }
    setPinInput('');
  };

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-md py-8">
        <form
          onSubmit={handlePinSubmit}
          className="pastel-card space-y-5 rounded-[32px] border-2 border-[#EBD8C3] bg-white p-8 text-center"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#EAE4F2] text-3xl">
            👑
          </div>
          <h1 className="text-2xl font-bold text-[#3B2F2A]">{t.creatorLoginTitle}</h1>
          <p className="text-xs text-[#705F56]">พี่กิ๊ก / Chali · Secret PIN (9292 / 6417)</p>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder={t.enterPin4}
            aria-label={t.enterPin4}
            className="min-h-[52px] w-full rounded-[20px] border-2 border-[#EBD8C3] bg-[#FFFDF9] px-4 text-center text-2xl tracking-[0.4em] focus:border-[#3B2F2A] focus:outline-none"
          />
          <button
            type="submit"
            className="pastel-btn min-h-[50px] w-full rounded-[20px] bg-[#3B2F2A] text-base font-bold text-white"
          >
            {t.loginBtn}
          </button>
        </form>
      </div>
    );
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFileToDataUrl(file, 256);
      setItemImageBase64(compressed);
    } catch {
      onShowAlert({
        icon: '⚠️',
        title: 'อัปโหลดรูปไม่สำเร็จ',
        message: 'กรุณาเลือกไฟล์รูปภาพ (JPG / PNG) ขนาดไม่ใหญ่มาก',
        tone: 'yellow',
      });
    }
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(itemPrice);
    if (!itemName.trim() || Number.isNaN(price) || price <= 0) {
      onShowAlert({
        icon: '⚠️',
        title: 'กรุณากรอกชื่อสินค้าและราคาดาวให้ถูกต้อง',
        message: 'ชื่อสินค้าห้ามว่าง และราคาดาวต้องมากกว่า 0',
        tone: 'yellow',
      });
      return;
    }

    const newItem: ShopItem = {
      id: `custom_${Date.now()}`,
      name: itemName.trim(),
      nameEn: itemNameEn.trim() || itemName.trim(),
      priceStars: price,
      category: itemCategory,
      decorSlot: itemCategory === 'decor' ? itemDecorSlot : undefined,
      emoji: itemEmoji || '🎁',
      imageBase64: itemImageBase64,
      description: itemDesc.trim() || (itemCategory === 'snack' ? 'ขนมกองกลางแสนอร่อย' : 'ไอเทมตกแต่งหน้าปก'),
    };
    onAddShopItem(newItem);
    setItemName('');
    setItemNameEn('');
    setItemPrice('35');
    setItemDesc('');
    setItemImageBase64(undefined);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barnhem-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSingleHtml = () => {
    const html = buildStandaloneHtmlExport(state);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barnhem-super-app-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const pins = creatorPinsStr
      .split(',')
      .map((p) => p.trim())
      .filter((p) => /^\d{4}$/.test(p));
    if (pins.length === 0) {
      onShowAlert({
        icon: '⚠️',
        title: 'รหัส PIN ต้องเป็นตัวเลข 4 หลัก',
        message: 'เช่น 9292, 6417',
        tone: 'yellow',
      });
      return;
    }
    const emails = normalizeAllowedEmails(allowedEmailsStr.split(','));
    setAllowedEmailsStr(emails.join(', '));
    onUpdateSettings(pins, sheetsUrl.trim(), emails);
  };

  const handleClearKidStars = (kid: Member) => {
    onShowAlert({
      icon: '🧹',
      title: `ยืนยันเคลียร์ยอดดาวของ ${kid.nickname}?`,
      message: `ต้องการรีเซ็ตยอดดาวสะสมของ ${kid.nickname} (ปัจจุบัน ${kid.stars.toLocaleString()} ⭐) ให้เป็น 0 ⭐ ใช่หรือไม่?`,
      tone: 'yellow',
      showCancel: true,
      confirmText: 'ยืนยันเคลียร์ดาวเป็น 0',
      onConfirm: () => {
        onUpdateKid(clearKidStars(kid, now), `creator_clear_stars_${kid.id}`);
        onShowAlert({
          icon: '✨',
          title: `เคลียร์ยอดดาวของ ${kid.nickname} แล้ว`,
          message: `ยอดดาวสะสมของ ${kid.nickname} ถูกรีเซ็ตเป็น 0 ⭐ เรียบร้อยค่ะ`,
          tone: 'mint',
        });
      },
    });
  };

  const handleClearKidPenalties = (kid: Member) => {
    onUpdateKid(clearKidPenalties(kid), `creator_clear_penalties_${kid.id}`);
    onShowAlert({
      icon: '🌿',
      title: `เคลียร์โทษ & ค่าปรับ ${kid.nickname} แล้ว`,
      message: 'ค่าปรับสายเป็น 0 บาท, คืนสิทธิ์ Free Day และปลดล็อกสิทธิ์มือถือเรียบร้อย',
      tone: 'mint',
    });
  };

  const handleToggleKitchen = (kid: Member) => {
    onUpdateKid(
      { ...kid, kitchenDutyToday: !kid.kitchenDutyToday },
      `creator_toggle_kitchen_${kid.id}`
    );
  };

  const handleUpdateDriveLinks = (
    kid: Member,
    field: 'personalDriveUrl' | 'restrictedDocsUrl',
    value: string
  ) => {
    onUpdateKid({ ...kid, [field]: value }, `creator_update_${field}_${kid.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pastel-card flex flex-wrap items-center justify-between gap-4 rounded-[28px] border-2 border-[#C4B5DF] bg-[#EAE4F2]/80 p-5">
        <div>
          <h1 className="text-2xl font-bold text-[#3B2F2A]">
            👑 โหมดผู้สร้างสูงสุด (Creator Master Admin · พี่กิ๊ก / Chali)
          </h1>
          <p className="text-sm text-[#5C4B43]">
            ตารางรหัส PIN สมาชิกทั้งหมด {state.members.length} คน · จัดการร้านค้า · สำรองข้อมูล · Google Sheets Sync
          </p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="pastel-btn min-h-[44px] rounded-[18px] border-2 border-[#EBD8C3] bg-white px-4 py-2 text-sm font-bold text-[#3B2F2A]"
        >
          {t.logoutBtn}
        </button>
      </div>

      {/* 1. Master 21-Member PIN Table */}
      <section className="pastel-card rounded-[28px] border-2 border-[#EBD8C3] bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#3B2F2A]">
            🔑 ตารางรหัสระบบและ PIN 4 หลักของสมาชิกทั้ง {state.members.length} คน
          </h2>
          <button
            type="button"
            onClick={onOpenQrPrintSheet}
            className="pastel-btn inline-flex min-h-[42px] items-center gap-2 rounded-[16px] border-2 border-[#8AD3D3] bg-[#D4F0F0] px-4 py-1.5 text-xs font-bold text-[#134E4A] shadow-sm hover:brightness-95 sm:text-sm"
          >
            <Printer className="h-4 w-4" />
            <span>
              {lang === 'th'
                ? 'พิมพ์บัตร QR รวมหน้าเดียว (15 น้อง / ทั้งหมด)'
                : 'Print All QR Badges (1 Page)'}
            </span>
          </button>
        </div>
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="sticky top-0 border-b-2 border-[#EBD8C3] bg-[#FFFDF9] text-[#5C4B43]">
                <th className="py-2.5 px-2">#</th>
                <th className="py-2.5 px-2">ID ระบบ</th>
                <th className="py-2.5 px-2">ตำแหน่ง / กลุ่ม</th>
                <th className="py-2.5 px-2">ชื่อเล่น</th>
                <th className="py-2.5 px-2">ชื่อเต็ม</th>
                <th className="py-2.5 px-2 text-center">เพศ</th>
                <th className="py-2.5 px-2 text-right">PIN 4 หลัก</th>
                <th className="py-2.5 px-2 text-right">บัตร QR</th>
              </tr>
            </thead>
            <tbody>
              {state.members.map((m, idx) => (
                <tr key={m.id} className="border-b border-[#F5ECE2] hover:bg-[#FFFDF9]">
                  <td className="tabular-nums py-2 px-2 text-xs text-[#705F56]">{idx + 1}</td>
                  <td className="py-2 px-2 font-mono text-xs font-bold">{m.id}</td>
                  <td className="py-2 px-2 text-xs">
                    {m.role === 'manager'
                      ? 'ผู้จัดการ'
                      : m.role === 'staff'
                        ? 'พี่เลี้ยง'
                        : `เด็ก กลุ่ม ${m.ageGroup}`}
                  </td>
                  <td className="py-2 px-2 font-bold">
                    {m.emoji} {m.nickname}
                  </td>
                  <td className="py-2 px-2 text-[#5C4B43]">{m.fullName}</td>
                  <td className="py-2 px-2 text-center">{m.gender}</td>
                  <td className="tabular-nums py-2 px-2 text-right font-mono font-bold text-[#7C2D12]">
                    {m.pin}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <button
                      type="button"
                      onClick={() => onShowMemberQr(m.id)}
                      className="inline-flex min-h-[32px] items-center gap-1 rounded-xl bg-[#DCEEF8] px-2.5 text-xs font-bold text-[#1E4460]"
                    >
                      <QrCode className="h-3.5 w-3.5" /> QR
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Door Command Buttons Configurator */}
      <DoorCommandsManagerSection
        lang={lang}
        kids={kids}
        doorCommands={doorCommands}
        onSaveDoorCommands={onSaveDoorCommands}
        onShowAlert={onShowAlert}
      />

      {/* Kids Control Table (Creator Only) */}
      <section
        data-testid="creator-kids-control-table"
        className="pastel-card rounded-[28px] border-2 border-[#C4B5DF] bg-white p-5"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#3B2F2A]">
              📋 ตารางควบคุมสถานะเด็ก ({kids.length} คน)
            </h2>
            <p className="text-xs text-[#705F56]">
              เฉพาะหน้าผู้สร้างสูงสุด · สามารถเคลียร์ยอดดาว, เคลียร์โทษ/ค่าปรับ, จัดการเวรครัว และลิงก์เอกสารของน้องทุกคนได้
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                onShowAlert({
                  icon: '🧹',
                  title: 'ยืนยันเคลียร์ยอดดาวเด็กทุกคนเป็น 0?',
                  message: `ต้องการรีเซ็ตยอดดาวสะสมของน้องทั้ง ${kids.length} คน เป็น 0 ⭐ ทั้งหมดใช่หรือไม่?`,
                  tone: 'yellow',
                  showCancel: true,
                  confirmText: 'ยืนยันเคลียร์ดาวทุกคน',
                  onConfirm: () => {
                    onClearAllKidsStars();
                    onShowAlert({
                      icon: '✨',
                      title: 'เคลียร์ยอดดาวเด็กทุกคนแล้ว',
                      message: 'ยอดดาวสะสมของน้องทุกคนถูกรีเซ็ตเป็น 0 ⭐ เรียบร้อย',
                      tone: 'mint',
                    });
                  },
                })
              }
              className="pastel-btn inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#E8D575] bg-[#FFF5BA] px-3 text-xs font-bold text-[#713F12]"
            >
              <RotateCcw className="h-3.5 w-3.5" /> เคลียร์ดาวทุกคน
            </button>
            <button
              type="button"
              onClick={() =>
                onShowAlert({
                  icon: '🌿',
                  title: 'ยืนยันเคลียร์โทษเด็กทุกคน?',
                  message: `ต้องการล้างค่าปรับ, คืนสิทธิ์ Free Day และปลดล็อกมือถือให้น้องทั้ง ${kids.length} คน ใช่หรือไม่?`,
                  tone: 'mint',
                  showCancel: true,
                  confirmText: 'ยืนยันเคลียร์โทษทุกคน',
                  onConfirm: () => {
                    onClearAllKidsPenalties();
                    onShowAlert({
                      icon: '🌿',
                      title: 'เคลียร์โทษเด็กทุกคนแล้ว',
                      message: 'ค่าปรับและบทลงโทษของน้องทุกคนถูกล้างเรียบร้อย',
                      tone: 'mint',
                    });
                  },
                })
              }
              className="pastel-btn inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#8AD3D3] bg-[#D4F0F0] px-3 text-xs font-bold text-[#134E4A]"
            >
              <RotateCcw className="h-3.5 w-3.5" /> เคลียร์โทษทุกคน
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-[#EBD8C3] bg-[#FFFDF9] text-[#5C4B43]">
                <th className="py-3 px-2">รหัส / น้อง</th>
                <th className="py-3 px-2">กลุ่ม</th>
                <th className="py-3 px-2 text-right">ดาวสะสม</th>
                <th className="py-3 px-2 text-right">ค่าปรับ / โทษ</th>
                <th className="py-3 px-2">สิทธิ์การ์ตูน / มือถือ</th>
                <th className="py-3 px-2 text-center">เวรครัว 15:30</th>
                <th className="py-3 px-2">ลิงก์เอกสาร</th>
                <th className="py-3 px-2 text-right">จัดการ (ผู้สร้าง)</th>
              </tr>
            </thead>
            <tbody>
              {kids.map((kid) => (
                <tr key={kid.id} className="border-b border-[#F5ECE2] hover:bg-[#FFFDF9]">
                  <td className="py-3 px-2 font-bold">
                    {kid.emoji} {kid.nickname}{' '}
                    <span className="text-xs font-normal text-[#705F56]">({kid.id})</span>
                  </td>
                  <td className="py-3 px-2 text-xs">กลุ่ม {kid.ageGroup}</td>
                  <td className="tabular-nums py-3 px-2 text-right font-bold text-[#B45309]">
                    {kid.stars.toLocaleString()} ⭐
                  </td>
                  <td className="tabular-nums py-3 px-2 text-right font-bold text-[#9F1239]">
                    <div>{kid.lateFineThb} ฿</div>
                    {kid.freeDayPenaltyCount > 0 && (
                      <div className="text-[11px] font-semibold text-[#B91C1C]">
                        หัก Free Day {kid.freeDayPenaltyCount} วัน
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-2 text-xs">
                    {kid.phoneBlockedReason ? (
                      <span className="font-semibold text-[#9F1239]">⛔ {kid.phoneBlockedReason}</span>
                    ) : kid.ageGroup === 1 ? (
                      kid.cartoonUnlockedToday ? '📺 ปลดล็อกการ์ตูนแล้ว' : '⏳ รอปลดล็อก 20:00'
                    ) : (
                      '✅ สิทธิ์ปกติ'
                    )}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <input
                      type="checkbox"
                      aria-label={`เวรห้องครัว 15:30 น. ของ ${kid.nickname}`}
                      checked={kid.kitchenDutyToday}
                      onChange={() => handleToggleKitchen(kid)}
                      className="h-5 w-5 cursor-pointer accent-[#3B2F2A]"
                    />
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex flex-col gap-1">
                      <input
                        type="url"
                        value={kid.personalDriveUrl}
                        onChange={(e) => handleUpdateDriveLinks(kid, 'personalDriveUrl', e.target.value)}
                        placeholder="Personal Drive URL"
                        aria-label={`Personal Drive URL ${kid.nickname}`}
                        className="w-36 rounded-lg border border-[#EBD8C3] px-2 py-1 text-[11px]"
                      />
                      <input
                        type="url"
                        value={kid.restrictedDocsUrl}
                        onChange={(e) => handleUpdateDriveLinks(kid, 'restrictedDocsUrl', e.target.value)}
                        placeholder="Restricted Docs URL"
                        aria-label={`Restricted Docs URL ${kid.nickname}`}
                        className="w-36 rounded-lg border border-[#F0A8B2] bg-[#FADADD]/20 px-2 py-1 text-[11px]"
                      />
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onShowMemberQr(kid.id)}
                        title={`ดู QR Code ของ ${kid.nickname}`}
                        aria-label={`ดู QR Code ของ ${kid.nickname}`}
                        className="pastel-btn inline-flex min-h-[36px] items-center gap-1 rounded-xl bg-[#DCEEF8] px-2.5 text-xs font-bold text-[#1E4460]"
                      >
                        <QrCode className="h-3.5 w-3.5" /> QR
                      </button>
                      <button
                        type="button"
                        data-testid={`creator-clear-stars-${kid.id}`}
                        onClick={() => handleClearKidStars(kid)}
                        title={`เคลียร์ยอดดาว ${kid.nickname} เป็น 0`}
                        className="pastel-btn inline-flex min-h-[36px] items-center gap-1 rounded-xl border border-[#E8D575] bg-[#FFF5BA] px-2.5 text-xs font-bold text-[#713F12]"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> เคลียร์ดาว
                      </button>
                      <button
                        type="button"
                        data-testid={`creator-clear-penalties-${kid.id}`}
                        onClick={() => handleClearKidPenalties(kid)}
                        title={`เคลียร์โทษ/ค่าปรับ ${kid.nickname}`}
                        className="pastel-btn inline-flex min-h-[36px] items-center gap-1 rounded-xl bg-[#D4F0F0] px-2.5 text-xs font-bold text-[#134E4A]"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> เคลียร์โทษ
                      </button>
                      <button
                        type="button"
                        aria-label={`ลบ ${kid.nickname}`}
                        onClick={() =>
                          onShowAlert({
                            icon: '🗑️',
                            title: `ยืนยันการลบ ${kid.nickname}?`,
                            message: `ต้องการลบข้อมูลของ ${kid.fullName} ออกจากระบบใช่หรือไม่`,
                            tone: 'pink',
                            showCancel: true,
                            confirmText: 'ยืนยันลบ',
                            onConfirm: () => onDeleteKid(kid.id),
                          })
                        }
                        className="pastel-btn inline-flex min-h-[36px] items-center rounded-xl bg-[#FADADD] px-2.5 text-xs font-bold text-[#9F1239]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Shop Manager with Base64 Upload */}
      <section className="pastel-card rounded-[28px] border-2 border-[#EBD8C3] bg-white p-5">
        <h2 className="mb-4 text-lg font-bold text-[#3B2F2A]">
          🏪 จัดการร้านค้า Barnhem Care & Kids Shop ({state.shopItems.length} รายการ)
        </h2>

        <form onSubmit={handleCreateItem} className="mb-6 grid grid-cols-1 gap-3 rounded-[22px] border border-[#EBD8C3] bg-[#FFFDF9] p-4 sm:grid-cols-2 lg:grid-cols-3">
          <input
            type="text"
            placeholder="ชื่อสินค้า (ภาษาไทย)"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            className="min-h-[42px] rounded-xl border-2 border-[#EBD8C3] bg-white px-3 text-sm"
          />
          <input
            type="text"
            placeholder="Product Name (EN)"
            value={itemNameEn}
            onChange={(e) => setItemNameEn(e.target.value)}
            className="min-h-[42px] rounded-xl border-2 border-[#EBD8C3] bg-white px-3 text-sm"
          />
          <input
            type="number"
            min={1}
            placeholder="ราคาดาว (⭐)"
            value={itemPrice}
            onChange={(e) => setItemPrice(e.target.value)}
            className="min-h-[42px] rounded-xl border-2 border-[#EBD8C3] bg-white px-3 text-sm"
          />
          <select
            value={itemCategory}
            onChange={(e) => setItemCategory(e.target.value as ShopCategory)}
            className="min-h-[42px] rounded-xl border-2 border-[#EBD8C3] bg-white px-3 text-sm"
          >
            <option value="snack">หมวดหมู่: ขนมกองกลาง</option>
            <option value="decor">หมวดหมู่: ไอเทมแต่งปก / ชุด</option>
          </select>

          {itemCategory === 'decor' && (
            <select
              value={itemDecorSlot}
              onChange={(e) => setItemDecorSlot(e.target.value as DecorSlot)}
              className="min-h-[42px] rounded-xl border-2 border-[#EBD8C3] bg-white px-3 text-sm"
            >
              <option value="outfit">ชนิด: เสื้อผ้าแต่งตัว</option>
              <option value="accessory">ชนิด: อาเซซารี่</option>
              <option value="location_item">ชนิด: ไอเทมสถานที่</option>
            </select>
          )}

          <input
            type="text"
            placeholder="อิโมจิ (เช่น 🍩)"
            value={itemEmoji}
            onChange={(e) => setItemEmoji(e.target.value)}
            className="min-h-[42px] rounded-xl border-2 border-[#EBD8C3] bg-white px-3 text-sm"
          />

          <input
            type="text"
            placeholder="คำอธิบายสั้นๆ"
            value={itemDesc}
            onChange={(e) => setItemDesc(e.target.value)}
            className="min-h-[42px] rounded-xl border-2 border-[#EBD8C3] bg-white px-3 text-sm sm:col-span-2"
          />

          <label className="flex min-h-[42px] cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#C4B5DF] bg-white px-3 text-xs font-semibold text-[#3B2F2A]">
            <Upload className="h-4 w-4" />
            <span>{itemImageBase64 ? 'อัปโหลดรูปภาพแล้ว ✓' : 'อัปโหลดรูปสินค้า (Base64)'}</span>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>

          <button
            type="submit"
            className="pastel-btn inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[18px] bg-[#3B2F2A] font-bold text-white sm:col-span-2 lg:col-span-3"
          >
            <Plus className="h-4 w-4" /> เพิ่มสินค้าเข้า Barnhem Shop
          </button>
        </form>

        <div className="grid max-h-72 grid-cols-1 gap-2.5 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          {state.shopItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-[18px] border border-[#EBD8C3] bg-[#FFFDF9] p-3 text-sm"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                {item.imageBase64 ? (
                  <img
                    src={item.imageBase64}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <span className="text-2xl">{item.emoji}</span>
                )}
                <div className="truncate">
                  <div className="truncate font-bold">{item.name}</div>
                  <div className="text-xs text-[#705F56]">
                    {item.category === 'snack' ? 'ขนมกองกลาง' : 'ไอเทมแต่งปก'} · {item.priceStars} ⭐
                  </div>
                </div>
              </div>
              <button
                type="button"
                aria-label={`ลบสินค้า ${item.name}`}
                onClick={() => onDeleteShopItem(item.id)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FADADD] text-[#9F1239]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Settings, Backup JSON, Single-File HTML Export, Google Sheets URL */}
      <section className="pastel-card rounded-[28px] border-2 border-[#EBD8C3] bg-white p-5">
        <h2 className="mb-4 text-lg font-bold text-[#3B2F2A]">
          ⚙️ ตั้งค่ารหัสผ่าน · สำรองข้อมูล (.json) · Google Sheets Web App URL
        </h2>
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold">
                รหัส PIN ผู้สร้างสูงสุด (คั่นด้วยลูกน้ำ)
              </label>
              <input
                type="text"
                value={creatorPinsStr}
                onChange={(e) => setCreatorPinsStr(e.target.value)}
                className="min-h-[44px] w-full rounded-[16px] border-2 border-[#EBD8C3] px-4 font-mono text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">
                Google Sheets Web App URL (POST / GET 2-Way)
              </label>
              <input
                type="url"
                value={sheetsUrl}
                onChange={(e) => setSheetsUrl(e.target.value)}
                className="min-h-[44px] w-full rounded-[16px] border-2 border-[#EBD8C3] px-4 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold">
                อีเมลบัญชี Google ที่อนุญาตซิงก์ Firebase Cloud ข้ามเครื่อง (คั่นด้วยลูกน้ำ · สูงสุด 30 อีเมล)
              </label>
              <input
                type="text"
                value={allowedEmailsStr}
                onChange={(e) => setAllowedEmailsStr(e.target.value)}
                placeholder={`${BOOTSTRAP_ADMIN_EMAIL}, staff@gmail.com`}
                className="min-h-[44px] w-full rounded-[16px] border-2 border-[#98CBEB] px-4 text-sm"
              />
              <p className="mt-1 text-xs text-[#705F56]">
                ระบบล็อกสิทธิ์ให้ {BOOTSTRAP_ADMIN_EMAIL} เสมอ — หากต้องการให้มือถือพี่เลี้ยงหรือเครื่องอื่นซิงก์ Firebase ได้ ให้เพิ่ม Gmail ของเครื่องนั้นที่นี่แล้วกดบันทึก
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="pastel-btn min-h-[46px] rounded-[18px] bg-[#3B2F2A] px-5 text-sm font-bold text-white"
            >
              บันทึกการตั้งค่า ✓
            </button>
            <button
              type="button"
              onClick={onManualSync}
              className="pastel-btn inline-flex min-h-[46px] items-center gap-2 rounded-[18px] border-2 border-[#98CBEB] bg-[#DCEEF8] px-5 text-sm font-bold text-[#1E4460]"
            >
              <RefreshCw className="h-4 w-4" /> ส่งข้อมูลไป Google Sheets (POST)
            </button>
            <button
              type="button"
              onClick={onPullFromSheets}
              className="pastel-btn inline-flex min-h-[46px] items-center gap-2 rounded-[18px] border-2 border-[#C4B5DF] bg-[#EAE4F2] px-5 text-sm font-bold text-[#4C1D95]"
            >
              <Download className="h-4 w-4" /> ดึงข้อมูลจาก Google Sheets (GET)
            </button>
            <button
              type="button"
              onClick={handleDownloadJson}
              className="pastel-btn inline-flex min-h-[46px] items-center gap-2 rounded-[18px] border-2 border-[#8AD3D3] bg-[#D4F0F0] px-5 text-sm font-bold text-[#134E4A]"
            >
              <Download className="h-4 w-4" /> ดาวน์โหลดไฟล์สำรองข้อมูล (.json)
            </button>
            <button
              type="button"
              onClick={handleDownloadSingleHtml}
              className="pastel-btn inline-flex min-h-[46px] items-center gap-2 rounded-[18px] border-2 border-[#E8D575] bg-[#FFF5BA] px-5 text-sm font-bold text-[#3B2F2A]"
            >
              <FileCode2 className="h-4 w-4" /> ส่งออก Single-File HTML (.html)
            </button>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAppsScriptHelp((prev) => !prev)}
              className="text-xs font-bold text-[#1E4460] underline"
            >
              {showAppsScriptHelp
                ? 'ซ่อนโค้ด Google Apps Script 2-Way (doPost + doGet)'
                : 'ดูโค้ด Google Apps Script 2-Way (doPost + doGet) สำหรับ Google Sheets'}
            </button>
            {showAppsScriptHelp && (
              <pre className="mt-2 max-h-48 overflow-auto rounded-2xl border border-[#EBD8C3] bg-[#FFFDF9] p-3 font-mono text-[11px] text-[#3B2F2A]">
                {APPS_SCRIPT_TWO_WAY_SNIPPET}
              </pre>
            )}
          </div>
        </form>
      </section>
    </div>
  );
};
