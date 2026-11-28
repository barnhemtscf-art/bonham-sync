import React, { useState } from 'react';
import { Edit3, Plus, RotateCcw, Settings2, Trash2, Users, X } from 'lucide-react';
import {
  AlertModalPayload,
  DoorCommandAuthMode,
  DoorCommandConfig,
  DoorCommandDayKey,
  DoorCommandPenaltyType,
  Language,
  Member,
} from '../types/barnhem';
import {
  ALL_DOOR_COMMAND_DAYS,
  createDefaultDoorCommands,
  DOOR_COMMAND_DAY_OPTIONS,
  formatActiveDaysLabel,
  formatAuthModeLabel,
  formatPenaltyRuleLabel,
} from '../utils/doorCommands';

interface DoorCommandsManagerSectionProps {
  lang: Language;
  kids: Member[];
  doorCommands: DoorCommandConfig[];
  onSaveDoorCommands: (commands: DoorCommandConfig[], actionName: string) => void;
  onShowAlert: (payload: Omit<AlertModalPayload, 'id'>) => void;
}

const PENALTY_OPTIONS: Array<{ value: DoorCommandPenaltyType; labelTh: string; needsValue: boolean; valueLabelTh?: string }> = [
  { value: 'deduct_free_day', labelTh: '🗓️ หักสิทธิ์ Free Day วันศุกร์', needsValue: true, valueLabelTh: 'วัน' },
  { value: 'deduct_stars', labelTh: '⭐ หักดาวสะสม', needsValue: true, valueLabelTh: 'ดวง' },
  { value: 'fixed_fine', labelTh: '🧾 ปรับเงินคงที่', needsValue: true, valueLabelTh: 'บาท' },
  { value: 'fine_per_min', labelTh: '💸 ปรับเงินรายนาที (สูงสุด 50 บาท)', needsValue: true, valueLabelTh: 'บาท/นาที' },
  { value: 'block_phone_today', labelTh: '📵 งดใช้มือถือวันนี้ถึง 18:30 น.', needsValue: false },
  { value: 'block_phone_tomorrow', labelTh: '📵 งดใช้มือถือวันพรุ่งนี้ 1 วัน', needsValue: false },
  { value: 'custom_task', labelTh: '🧹 บันทึกบทลงโทษ / เวรพิเศษ', needsValue: false },
  { value: 'block', labelTh: '🔒 ล็อกปุ่มทันทีเมื่อเกินเส้นตาย (ห้ามกด)', needsValue: false },
  { value: 'none', labelTh: '⭐ ไม่มีค่าปรับ (ไม่ได้ดาวเมื่อเลยเส้นตาย)', needsValue: false },
];

const EMPTY_FORM = (kids: Member[]): DoorCommandConfig => ({
  id: `cmd_${Date.now()}`,
  commandKind: 'routine',
  titleTh: '',
  descriptionTh: '',
  emoji: '✨',
  activeDays: [...ALL_DOOR_COMMAND_DAYS],
  startTime: '07:00',
  endTime: '08:00',
  earlyMinutes: 0,
  deadlineTime: '07:30',
  authMode: 'direct',
  rewardStars: 10,
  penaltyType: 'none',
  penaltyValue: 0,
  penaltyNoteTh: '',
  allowedKidIds: kids.map((k) => k.id),
  enabled: true,
});

const EMPTY_PENALTY_FORM = (kids: Member[]): DoorCommandConfig => ({
  id: `cmd_penalty_${Date.now()}`,
  commandKind: 'penalty',
  titleTh: 'บทลงโทษ',
  descriptionTh: 'บันทึกบทลงโทษประจำวัน (พี่เลี้ยงใส่ PIN ยืนยันเพื่อบันทึกโทษทันที)',
  emoji: '⚖️',
  activeDays: ['mon', 'tue', 'wed', 'thu', 'sat', 'sun', 'holiday'],
  startTime: '00:00',
  endTime: '23:59',
  earlyMinutes: 0,
  deadlineTime: '23:59',
  authMode: 'staff_pin',
  rewardStars: 0,
  penaltyType: 'deduct_free_day',
  penaltyValue: 1,
  penaltyNoteTh: 'หัก Free Day 1 วัน',
  allowedKidIds: kids.map((k) => k.id),
  enabled: true,
});

const CUSTOM_PENALTY_STORAGE_KEY = 'barnhem_custom_penalty_presets_v1';

function loadSavedCustomPenaltyPresets(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_PENALTY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter((s) => s.length > 0)
      .slice(0, 40);
  } catch {
    return [];
  }
}

function saveCustomPenaltyPresets(presets: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CUSTOM_PENALTY_STORAGE_KEY, JSON.stringify(presets.slice(0, 40)));
  } catch {
    // Ignore storage quota errors
  }
}

export const DoorCommandsManagerSection: React.FC<DoorCommandsManagerSectionProps> = ({
  lang,
  kids,
  doorCommands,
  onSaveDoorCommands,
  onShowAlert,
}) => {
  const [editingCmd, setEditingCmd] = useState<DoorCommandConfig | null>(null);
  const [isNewCmd, setIsNewCmd] = useState(false);
  const [savedCustomPresets, setSavedCustomPresets] = useState<string[]>(loadSavedCustomPenaltyPresets);
  const [showAddCustomPenalty, setShowAddCustomPenalty] = useState(false);
  const [newCustomPenaltyText, setNewCustomPenaltyText] = useState('');

  const allCustomPenaltyPresets = Array.from(
    new Set([
      ...savedCustomPresets,
      ...doorCommands
        .map((c) => c.customPenaltyLabelTh?.trim() || '')
        .filter((s) => s.length > 0),
    ])
  );

  const handleOpenCreate = () => {
    setIsNewCmd(true);
    setShowAddCustomPenalty(false);
    setNewCustomPenaltyText('');
    setEditingCmd(EMPTY_FORM(kids));
  };

  const handleOpenCreatePenalty = () => {
    setIsNewCmd(true);
    setShowAddCustomPenalty(false);
    setNewCustomPenaltyText('');
    setEditingCmd(EMPTY_PENALTY_FORM(kids));
  };

  const handleOpenEdit = (cmd: DoorCommandConfig) => {
    setIsNewCmd(false);
    setShowAddCustomPenalty(false);
    setNewCustomPenaltyText('');
    setEditingCmd({
      ...cmd,
      commandKind: cmd.commandKind === 'penalty' ? 'penalty' : 'routine',
      activeDays:
        Array.isArray(cmd.activeDays) && cmd.activeDays.length > 0
          ? [...cmd.activeDays]
          : [...ALL_DOOR_COMMAND_DAYS],
      allowedKidIds: [...cmd.allowedKidIds],
    });
  };

  const handleToggleEnabled = (cmdId: string) => {
    const updated = doorCommands.map((c) => (c.id === cmdId ? { ...c, enabled: !c.enabled } : c));
    onSaveDoorCommands(updated, `toggle_door_cmd_${cmdId}`);
  };

  const handleDelete = (cmd: DoorCommandConfig) => {
    onShowAlert({
      icon: '🗑️',
      title: `ลบปุ่มคำสั่ง "${cmd.titleTh}"?`,
      message: 'ต้องการลบปุ่มคำสั่งนี้ออกจากหน้าล็อคอินใช่หรือไม่',
      tone: 'pink',
      showCancel: true,
      confirmText: 'ยืนยันลบ',
      onConfirm: () => {
        const updated = doorCommands.filter((c) => c.id !== cmd.id);
        onSaveDoorCommands(updated, `delete_door_cmd_${cmd.id}`);
      },
    });
  };

  const handleResetDefaults = () => {
    onShowAlert({
      icon: '🔄',
      title: 'รีเซ็ตปุ่มคำสั่งหน้าล็อคอินเป็นค่าเริ่มต้น?',
      message: 'ต้องการคืนค่าปุ่มคำสั่งทั้งหมดกลับเป็น 15 ปุ่มมาตรฐานล่าสุดของมูลนิธิ (รวมตารางวันและปุ่มบทลงโทษ) ใช่หรือไม่',
      tone: 'yellow',
      showCancel: true,
      confirmText: 'ยืนยันรีเซ็ต',
      onConfirm: () => {
        onSaveDoorCommands(createDefaultDoorCommands(kids), 'reset_default_door_cmds');
      },
    });
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCmd) return;
    const cleanTitle = editingCmd.titleTh.trim();
    if (!cleanTitle) {
      onShowAlert({
        icon: '⚠️',
        title: 'กรุณากรอกชื่อปุ่มคำสั่ง',
        message: 'เช่น มาขอรับมือถือ, กินข้าวเช้า หรือ บทลงโทษ',
        tone: 'yellow',
      });
      return;
    }

    const isPenalty = editingCmd.commandKind === 'penalty';
    const customLabelClean =
      editingCmd.penaltyType === 'custom_task'
        ? editingCmd.customPenaltyLabelTh?.trim().slice(0, 120) || undefined
        : undefined;
    const normalizedDays =
      Array.isArray(editingCmd.activeDays) && editingCmd.activeDays.length > 0
        ? editingCmd.activeDays
        : [...ALL_DOOR_COMMAND_DAYS];
    const sanitizedMaxThb =
      editingCmd.penaltyType === 'fine_per_min'
        ? Math.max(1, Math.min(5000, Math.round(Number(editingCmd.penaltyMaxThb) || 50)))
        : undefined;
    const sanitized: DoorCommandConfig = {
      ...editingCmd,
      commandKind: isPenalty ? 'penalty' : 'routine',
      titleTh: cleanTitle.slice(0, 60),
      descriptionTh: editingCmd.descriptionTh.trim().slice(0, 160),
      emoji: editingCmd.emoji.trim().slice(0, 8) || (isPenalty ? '⚖️' : '✨'),
      activeDays: normalizedDays,
      earlyMinutes: Math.max(0, Math.min(180, Math.round(Number(editingCmd.earlyMinutes) || 0))),
      rewardStars: isPenalty
        ? 0
        : Math.max(0, Math.min(500, Math.round(Number(editingCmd.rewardStars) || 0))),
      penaltyValue: Math.max(0, Math.min(500, Math.round(Number(editingCmd.penaltyValue) || 0))),
      ...(sanitizedMaxThb ? { penaltyMaxThb: sanitizedMaxThb } : { penaltyMaxThb: undefined }),
      penaltyNoteTh: editingCmd.penaltyNoteTh.trim().slice(0, 160),
      ...(customLabelClean ? { customPenaltyLabelTh: customLabelClean } : { customPenaltyLabelTh: undefined }),
    };

    const nextList = isNewCmd
      ? [...doorCommands, sanitized]
      : doorCommands.map((c) => (c.id === sanitized.id ? sanitized : c));

    onSaveDoorCommands(
      nextList,
      isNewCmd ? `create_door_cmd_${sanitized.id}` : `update_door_cmd_${sanitized.id}`
    );
    setEditingCmd(null);
    onShowAlert({
      icon: sanitized.emoji,
      title: isNewCmd ? `เพิ่มปุ่ม "${sanitized.titleTh}" แล้ว` : `บันทึกปุ่ม "${sanitized.titleTh}" แล้ว`,
      message: `สิทธิ์ผู้กด ${sanitized.allowedKidIds.length}/${kids.length} คน · วัน ${formatActiveDaysLabel(sanitized.activeDays)} · เวลา ${sanitized.startTime}–${sanitized.endTime} น.`,
      tone: 'mint',
    });
  };

  const toggleActiveDay = (dayKey: DoorCommandDayKey) => {
    if (!editingCmd) return;
    const current = editingCmd.activeDays || [];
    const next = current.includes(dayKey)
      ? current.filter((d) => d !== dayKey)
      : [...current, dayKey];
    setEditingCmd({ ...editingCmd, activeDays: next });
  };

  const toggleKidEligibility = (kidId: string) => {
    if (!editingCmd) return;
    const exists = editingCmd.allowedKidIds.includes(kidId);
    setEditingCmd({
      ...editingCmd,
      allowedKidIds: exists
        ? editingCmd.allowedKidIds.filter((id) => id !== kidId)
        : [...editingCmd.allowedKidIds, kidId],
    });
  };

  const applyKidGroupPreset = (preset: 'all' | 'g1' | 'g2' | 'g3' | 'g23' | 'none') => {
    if (!editingCmd) return;
    let nextIds: string[] = [];
    if (preset === 'all') nextIds = kids.map((k) => k.id);
    else if (preset === 'g1') nextIds = kids.filter((k) => k.ageGroup === 1).map((k) => k.id);
    else if (preset === 'g2') nextIds = kids.filter((k) => k.ageGroup === 2).map((k) => k.id);
    else if (preset === 'g3') nextIds = kids.filter((k) => k.ageGroup === 3).map((k) => k.id);
    else if (preset === 'g23') nextIds = kids.filter((k) => k.ageGroup === 2 || k.ageGroup === 3).map((k) => k.id);
    setEditingCmd({ ...editingCmd, allowedKidIds: nextIds });
  };

  const handleAddCustomPenaltyOption = () => {
    if (!editingCmd) return;
    const cleanText = newCustomPenaltyText.trim().slice(0, 100);
    if (!cleanText) {
      onShowAlert({
        icon: '⚠️',
        title: 'กรุณาพิมพ์ข้อความคำสั่งก่อนเพิ่ม',
        message: 'เช่น ล้างห้องน้ำ 1 วัน, คัดศัพท์ 20 คำ หรือ งดดูทีวี 1 วัน',
        tone: 'yellow',
      });
      return;
    }
    const nextPresets = allCustomPenaltyPresets.includes(cleanText)
      ? allCustomPenaltyPresets
      : [...allCustomPenaltyPresets, cleanText];
    setSavedCustomPresets(nextPresets);
    saveCustomPenaltyPresets(nextPresets);
    const isDefaultOrEmptyNote =
      !editingCmd.penaltyNoteTh.trim() ||
      editingCmd.penaltyNoteTh.trim() === 'ทำผิดกติกาบ้าน — หักสิทธิ์ Free Day 1 วัน';
    setEditingCmd({
      ...editingCmd,
      penaltyType: 'custom_task',
      customPenaltyLabelTh: cleanText,
      penaltyNoteTh: isDefaultOrEmptyNote ? cleanText : editingCmd.penaltyNoteTh,
    });
    setNewCustomPenaltyText('');
    setShowAddCustomPenalty(false);
  };

  const handleRemoveCustomPenaltyOption = (label: string) => {
    const nextPresets = savedCustomPresets.filter((item) => item !== label);
    setSavedCustomPresets(nextPresets);
    saveCustomPenaltyPresets(nextPresets);
    if (editingCmd && editingCmd.customPenaltyLabelTh?.trim() === label) {
      setEditingCmd({
        ...editingCmd,
        customPenaltyLabelTh: undefined,
      });
    }
  };

  const selectedPenaltyMeta = PENALTY_OPTIONS.find((p) => p.value === editingCmd?.penaltyType);
  const isEditingPenalty = editingCmd?.commandKind === 'penalty';
  const activeCustomPenaltyLabel =
    editingCmd?.penaltyType === 'custom_task' ? editingCmd.customPenaltyLabelTh?.trim() || '' : '';
  const penaltySelectValue = activeCustomPenaltyLabel
    ? `custom:${activeCustomPenaltyLabel}`
    : editingCmd?.penaltyType || 'none';

  return (
    <section
      data-testid="door-commands-manager"
      className="pastel-card rounded-[28px] border-2 border-[#C4B5DF] bg-white p-5"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#3B2F2A]">
            <Settings2 className="h-5 w-5 text-[#6D28D9]" />
            {lang === 'th'
              ? `ตั้งค่าปุ่มคำสั่งหน้าล็อคอิน (${doorCommands.length} ปุ่ม)`
              : `Login Door Command Buttons (${doorCommands.length})`}
          </h2>
          <p className="text-xs text-[#705F56]">
            กำหนดชื่อปุ่ม · รายละเอียด · เวลาเปิด-ปิด · กดก่อนเวลา · เส้นตาย · บทลงโทษ · และเลือกรายชื่อน้องที่มีสิทธิ์กด
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="pastel-btn inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#EBD8C3] bg-[#FFFDF9] px-3 text-xs font-bold text-[#5C4B43] hover:bg-[#FAF4EC]"
          >
            <RotateCcw className="h-3.5 w-3.5" /> รีเซ็ตปุ่มมาตรฐาน (15 ปุ่ม)
          </button>
          <button
            type="button"
            onClick={handleOpenCreatePenalty}
            data-testid="add-penalty-command-btn"
            className="pastel-btn inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border-2 border-[#F0A8B2] bg-[#FADADD] px-3.5 text-xs font-bold text-[#9F1239] hover:brightness-95"
          >
            <Plus className="h-4 w-4" /> ⚖️ เพิ่มปุ่มบทลงโทษ
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            data-testid="add-door-command-btn"
            className="pastel-btn inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border-2 border-[#8AD3D3] bg-[#D4F0F0] px-4 text-xs font-bold text-[#134E4A] hover:brightness-95"
          >
            <Plus className="h-4 w-4" /> เพิ่มปุ่มคำสั่งใหม่
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {doorCommands.map((cmd) => {
          const isPenalty = cmd.commandKind === 'penalty';
          return (
            <div
              key={cmd.id}
              className={`rounded-[20px] border p-3.5 transition-colors ${
                !cmd.enabled
                  ? 'border-[#E5E7EB] bg-[#F9FAFB] opacity-70'
                  : isPenalty
                    ? 'border-[#F0A8B2] bg-[#FFF5F7]/50'
                    : 'border-[#EBD8C3] bg-[#FFFDF9]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg">{cmd.emoji}</span>
                    <span className="font-bold text-[#3B2F2A]">{cmd.titleTh}</span>
                    {isPenalty && (
                      <span className="inline-flex items-center rounded-md border border-[#F0A8B2] bg-[#FADADD] px-2 py-0.5 text-[11px] font-bold text-[#9F1239]">
                        ⚖️ บทลงโทษ
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[#FFF5BA] px-2 py-0.5 text-[11px] font-bold text-[#713F12]">
                      <Users className="h-3 w-3" /> ({cmd.allowedKidIds.length}/{kids.length})
                    </span>
                  </div>
                  {cmd.descriptionTh && (
                    <p className="mt-1 text-xs text-[#5C4B43]">{cmd.descriptionTh}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-[#705F56]">
                    <span>
                      ⏰ {cmd.startTime}–{cmd.endTime} น.
                    </span>
                    <span>· 📅 {formatActiveDaysLabel(cmd.activeDays)}</span>
                    <span>· ก่อนเวลา {cmd.earlyMinutes} น.</span>
                    <span className="font-semibold text-[#9F1239]">· เส้นตาย {cmd.deadlineTime} น.</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-[#5C4B43]">
                    <span>{formatAuthModeLabel(cmd.authMode)}</span>
                    {!isPenalty && <span>· +{cmd.rewardStars} ⭐</span>}
                    <span className={isPenalty ? 'font-semibold text-[#9F1239]' : ''}>
                      ·{' '}
                      {formatPenaltyRuleLabel(
                        cmd.penaltyType,
                        cmd.penaltyValue,
                        cmd.customPenaltyLabelTh,
                        cmd.penaltyMaxThb
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-[#5C4B43]">
                    <input
                      type="checkbox"
                      checked={cmd.enabled}
                      onChange={() => handleToggleEnabled(cmd.id)}
                      aria-label={`เปิดใช้งานปุ่ม ${cmd.titleTh}`}
                      className="h-4 w-4 accent-[#3B2F2A]"
                    />
                    <span>{cmd.enabled ? 'เปิด' : 'ปิด'}</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cmd)}
                      aria-label={`แก้ไขปุ่ม ${cmd.titleTh}`}
                      className="inline-flex min-h-[34px] items-center gap-1 rounded-xl border border-[#98CBEB] bg-[#DCEEF8] px-2.5 text-xs font-bold text-[#1E4460]"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> แก้ไข
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cmd)}
                      aria-label={`ลบปุ่ม ${cmd.titleTh}`}
                      className="inline-flex min-h-[34px] items-center rounded-xl border border-[#F0A8B2] bg-[#FADADD] px-2 text-xs font-bold text-[#9F1239]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Door Command Modal */}
      {editingCmd && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isNewCmd ? 'เพิ่มปุ่มคำสั่งหน้าล็อคอิน' : `แก้ไขปุ่ม ${editingCmd.titleTh}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
        >
          <form
            onSubmit={handleSaveForm}
            className="pastel-card max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-[30px] border-2 border-[#EBD8C3] bg-[#FFFDF9] p-6"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#EBD8C3] pb-3">
              <h3 className="text-lg font-bold text-[#3B2F2A]">
                {isNewCmd
                  ? isEditingPenalty
                    ? '⚖️ เพิ่มปุ่มคำสั่งบทลงโทษ'
                    : '✨ เพิ่มปุ่มคำสั่งหน้าล็อคอิน'
                  : `✏️ แก้ไขปุ่มคำสั่ง: ${editingCmd.titleTh}`}
              </h3>
              <button
                type="button"
                onClick={() => setEditingCmd(null)}
                aria-label="ปิดหน้าต่าง"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#EBD8C3] bg-white text-[#3B2F2A] hover:bg-[#FADADD]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Command Kind Selector */}
            <div className="rounded-[20px] border border-[#EBD8C3] bg-white p-3.5">
              <label className="mb-1.5 block text-xs font-bold text-[#5C4B43]">ประเภทปุ่มคำสั่ง</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    setEditingCmd({
                      ...editingCmd,
                      commandKind: 'routine',
                    })
                  }
                  className={`min-h-[42px] rounded-xl border-2 px-3 text-left text-xs font-bold transition-colors ${
                    !isEditingPenalty
                      ? 'border-[#74CCB8] bg-[#E7FAF6] text-[#114B43]'
                      : 'border-[#EBD8C3] bg-[#FFFDF9] text-[#5C4B43]'
                  }`}
                >
                  ✅ คำสั่งกิจวัตร (เช็คอิน / รับดาว)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditingCmd({
                      ...editingCmd,
                      commandKind: 'penalty',
                      rewardStars: 0,
                      authMode: editingCmd.authMode === 'direct' ? 'staff_pin' : editingCmd.authMode,
                      penaltyType:
                        editingCmd.penaltyType === 'none' || editingCmd.penaltyType === 'block'
                          ? 'deduct_free_day'
                          : editingCmd.penaltyType,
                      penaltyValue: editingCmd.penaltyValue > 0 ? editingCmd.penaltyValue : 1,
                    })
                  }
                  className={`min-h-[42px] rounded-xl border-2 px-3 text-left text-xs font-bold transition-colors ${
                    isEditingPenalty
                      ? 'border-[#F0A8B2] bg-[#FADADD] text-[#9F1239]'
                      : 'border-[#EBD8C3] bg-[#FFFDF9] text-[#5C4B43]'
                  }`}
                >
                  ⚖️ ปุ่มบทลงโทษ (บันทึกโทษทันทีเมื่อกด)
                </button>
              </div>
            </div>

            {/* Name, Emoji & Description */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-[#5C4B43]">อีโมจิ</label>
                <input
                  type="text"
                  value={editingCmd.emoji}
                  onChange={(e) => setEditingCmd({ ...editingCmd, emoji: e.target.value })}
                  className="min-h-[44px] w-full rounded-xl border-2 border-[#EBD8C3] bg-white px-3 text-center text-lg"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="mb-1 block text-xs font-bold text-[#5C4B43]">ชื่อปุ่มคำสั่ง *</label>
                <input
                  type="text"
                  required
                  value={editingCmd.titleTh}
                  onChange={(e) => setEditingCmd({ ...editingCmd, titleTh: e.target.value })}
                  placeholder={
                    isEditingPenalty
                      ? 'เช่น บทลงโทษ, ลืมเวรทำความสะอาด, ปรับผิดกติกา'
                      : 'เช่น มาขอรับมือถือ, กินข้าวเช้า, ไปโรงเรียน'
                  }
                  className="min-h-[44px] w-full rounded-xl border-2 border-[#EBD8C3] bg-white px-3 text-sm font-semibold"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="mb-1 block text-xs font-bold text-[#5C4B43]">รายละเอียดปุ่ม</label>
                <input
                  type="text"
                  value={editingCmd.descriptionTh}
                  onChange={(e) => setEditingCmd({ ...editingCmd, descriptionTh: e.target.value })}
                  placeholder="อธิบายสั้นๆ ว่าปุ่มนี้ใช้สำหรับทำอะไร"
                  className="min-h-[44px] w-full rounded-xl border-2 border-[#EBD8C3] bg-white px-3 text-sm"
                />
              </div>
            </div>

            {/* Active Days of Week + Public Holiday */}
            <div className="space-y-2 rounded-[20px] border border-[#EBD8C3] bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#3B2F2A]">
                  📅 วันเปิดใช้งานปุ่ม (จ, อ, พ, พฤ, ศ, ส, อา, นักขัตฤกษ์)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingCmd({ ...editingCmd, activeDays: [...ALL_DOOR_COMMAND_DAYS] })
                    }
                    className="min-h-[28px] rounded-lg border border-[#EBD8C3] bg-[#FFFDF9] px-2 text-[11px] font-semibold text-[#3B2F2A] hover:bg-[#FFF5BA]"
                  >
                    ทุกวัน
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingCmd({
                        ...editingCmd,
                        activeDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
                      })
                    }
                    className="min-h-[28px] rounded-lg border border-[#EBD8C3] bg-[#FFFDF9] px-2 text-[11px] font-semibold text-[#3B2F2A] hover:bg-[#FFF5BA]"
                  >
                    จ–ศ
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingCmd({
                        ...editingCmd,
                        activeDays: ['sat', 'sun', 'holiday'],
                      })
                    }
                    className="min-h-[28px] rounded-lg border border-[#EBD8C3] bg-[#FFFDF9] px-2 text-[11px] font-semibold text-[#3B2F2A] hover:bg-[#FFF5BA]"
                  >
                    ส–อา + นักขัตฯ
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DOOR_COMMAND_DAY_OPTIONS.map((opt) => {
                  const selected = (editingCmd.activeDays || []).includes(opt.key);
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleActiveDay(opt.key)}
                      className={`min-h-[34px] rounded-xl border-2 px-3 text-xs font-bold transition-colors ${
                        selected
                          ? 'border-[#3B2F2A] bg-[#E7FAF6] text-[#114B43]'
                          : 'border-[#EBD8C3] bg-[#FFFDF9] text-[#705F56]'
                      }`}
                    >
                      {opt.shortTh}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Schedule & Early & Deadline */}
            <div className="grid grid-cols-2 gap-3 rounded-[20px] border border-[#EBD8C3] bg-white p-4 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-[#5C4B43]">เวลาเริ่มเปิด</label>
                <input
                  type="time"
                  value={editingCmd.startTime}
                  onChange={(e) => setEditingCmd({ ...editingCmd, startTime: e.target.value })}
                  className="min-h-[42px] w-full rounded-xl border-2 border-[#EBD8C3] px-2.5 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#5C4B43]">กดก่อนเวลา (นาที)</label>
                <input
                  type="number"
                  min={0}
                  max={180}
                  value={editingCmd.earlyMinutes}
                  onChange={(e) =>
                    setEditingCmd({ ...editingCmd, earlyMinutes: Number(e.target.value) })
                  }
                  className="min-h-[42px] w-full rounded-xl border-2 border-[#98CBEB] px-2.5 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#9F1239]">เส้นตายห้ามเกินเวลา</label>
                <input
                  type="time"
                  value={editingCmd.deadlineTime}
                  onChange={(e) => setEditingCmd({ ...editingCmd, deadlineTime: e.target.value })}
                  className="min-h-[42px] w-full rounded-xl border-2 border-[#F0A8B2] px-2.5 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#5C4B43]">เวลาปิดปุ่ม</label>
                <input
                  type="time"
                  value={editingCmd.endTime}
                  onChange={(e) => setEditingCmd({ ...editingCmd, endTime: e.target.value })}
                  className="min-h-[42px] w-full rounded-xl border-2 border-[#EBD8C3] px-2.5 text-sm font-semibold"
                />
              </div>
            </div>

            {/* Auth Mode & Reward & Penalty */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-[#5C4B43]">รูปแบบการยืนยันปุ่ม</label>
                <select
                  value={editingCmd.authMode}
                  onChange={(e) =>
                    setEditingCmd({ ...editingCmd, authMode: e.target.value as DoorCommandAuthMode })
                  }
                  className="min-h-[44px] w-full rounded-xl border-2 border-[#EBD8C3] bg-white px-3 text-sm font-semibold"
                >
                  <option value="direct">👆 กดชื่อได้เลย (ไม่ต้องใส่ PIN)</option>
                  <option value="kid_pin">🔑 น้องใส่ PIN 4 หลักที่ช่องยืนยันปุ่มคำสั่ง</option>
                  <option value="staff_pin">🧑‍🏫 พี่เลี้ยงใส่ PIN 4 หลักเพื่อยืนยัน</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#5C4B43]">
                  {isEditingPenalty
                    ? 'รางวัลดาว (ปิดใช้งานสำหรับปุ่มบทลงโทษ)'
                    : 'ดาวรางวัลเมื่อกดตรงเวลา (⭐)'}
                </label>
                {isEditingPenalty ? (
                  <div className="flex min-h-[44px] items-center rounded-xl border-2 border-[#F0A8B2] bg-[#FFF5F7] px-3 text-xs font-semibold text-[#9F1239]">
                    ⚖️ ปุ่มบทลงโทษจะบันทึกโทษทันทีเมื่อยืนยัน (0 ⭐)
                  </div>
                ) : (
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={editingCmd.rewardStars}
                    onChange={(e) =>
                      setEditingCmd({ ...editingCmd, rewardStars: Number(e.target.value) })
                    }
                    className="min-h-[44px] w-full rounded-xl border-2 border-[#E8D575] bg-white px-3 text-sm font-bold"
                  />
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-[20px] border border-[#F0A8B2] bg-[#FFF5F7]/60 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className={selectedPenaltyMeta?.needsValue ? 'sm:col-span-2' : 'sm:col-span-3'}>
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <label
                      htmlFor="door-cmd-penalty-select"
                      className="block text-xs font-bold text-[#9F1239]"
                    >
                      {isEditingPenalty
                        ? 'บทลงโทษที่จะบันทึกทันทีเมื่อกดปุ่มนี้'
                        : 'เงื่อนไขบทลงโทษเมื่อเกินเส้นตาย'}
                    </label>
                    <div className="flex items-center gap-1.5">
                      {activeCustomPenaltyLabel &&
                        savedCustomPresets.includes(activeCustomPenaltyLabel) && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomPenaltyOption(activeCustomPenaltyLabel)}
                            data-testid="remove-custom-penalty-btn"
                            className="inline-flex min-h-[28px] items-center gap-1 rounded-lg border border-[#F0A8B2] bg-white px-2 text-[11px] font-semibold text-[#9F1239] hover:bg-[#FADADD]"
                          >
                            <Trash2 className="h-3 w-3" /> ลบตัวเลือกนี้
                          </button>
                        )}
                      <button
                        type="button"
                        onClick={() => setShowAddCustomPenalty((prev) => !prev)}
                        data-testid="toggle-add-custom-penalty-btn"
                        className="inline-flex min-h-[28px] items-center gap-1 rounded-lg border border-[#F0A8B2] bg-white px-2.5 text-[11px] font-bold text-[#9F1239] hover:bg-[#FADADD]"
                      >
                        <Plus className="h-3 w-3" /> เพิ่มข้อความคำสั่งในช่องนี้
                      </button>
                    </div>
                  </div>
                  <select
                    id="door-cmd-penalty-select"
                    data-testid="door-cmd-penalty-select"
                    value={penaltySelectValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__add_custom__') {
                        setShowAddCustomPenalty(true);
                        return;
                      }
                      if (val.startsWith('custom:')) {
                        const label = val.slice('custom:'.length);
                        const isDefaultOrEmptyNote =
                          !editingCmd.penaltyNoteTh.trim() ||
                          editingCmd.penaltyNoteTh.trim() === 'ทำผิดกติกาบ้าน — หักสิทธิ์ Free Day 1 วัน' ||
                          allCustomPenaltyPresets.includes(editingCmd.penaltyNoteTh.trim());
                        setEditingCmd({
                          ...editingCmd,
                          penaltyType: 'custom_task',
                          customPenaltyLabelTh: label,
                          penaltyNoteTh: isDefaultOrEmptyNote ? label : editingCmd.penaltyNoteTh,
                        });
                        return;
                      }
                      setEditingCmd({
                        ...editingCmd,
                        penaltyType: val as DoorCommandPenaltyType,
                        customPenaltyLabelTh: undefined,
                      });
                    }}
                    className="min-h-[44px] w-full rounded-xl border-2 border-[#F0A8B2] bg-white px-3 text-sm font-semibold"
                  >
                    {PENALTY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.labelTh}
                      </option>
                    ))}
                    {allCustomPenaltyPresets.length > 0 && (
                      <optgroup label="📌 ข้อความคำสั่งที่เพิ่มเอง">
                        {allCustomPenaltyPresets.map((preset) => (
                          <option key={preset} value={`custom:${preset}`}>
                            📌 {preset}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <option value="__add_custom__">➕ เพิ่มข้อความคำสั่งใหม่...</option>
                  </select>
                </div>

                {selectedPenaltyMeta?.needsValue && (
                  <div className={editingCmd.penaltyType === 'fine_per_min' ? 'grid grid-cols-2 gap-2' : ''}>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#9F1239]">
                        จำนวน ({selectedPenaltyMeta.valueLabelTh})
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={editingCmd.penaltyValue}
                        onChange={(e) =>
                          setEditingCmd({ ...editingCmd, penaltyValue: Number(e.target.value) })
                        }
                        className="min-h-[44px] w-full rounded-xl border-2 border-[#F0A8B2] bg-white px-3 text-sm font-bold"
                      />
                    </div>
                    {editingCmd.penaltyType === 'fine_per_min' && (
                      <div>
                        <label className="mb-1 block text-xs font-bold text-[#9F1239]">
                          ปรับสูงสุด (บาท)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={5000}
                          value={editingCmd.penaltyMaxThb ?? 50}
                          onChange={(e) =>
                            setEditingCmd({ ...editingCmd, penaltyMaxThb: Number(e.target.value) })
                          }
                          className="min-h-[44px] w-full rounded-xl border-2 border-[#F0A8B2] bg-white px-3 text-sm font-bold"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {showAddCustomPenalty && (
                <div className="flex flex-col gap-2 rounded-xl border-2 border-[#F0A8B2] bg-white p-3 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={newCustomPenaltyText}
                    onChange={(e) => setNewCustomPenaltyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomPenaltyOption();
                      }
                    }}
                    placeholder="พิมพ์ข้อความคำสั่งใหม่ เช่น 🧹 ล้างห้องน้ำ 1 วัน หรือ 📚 คัดศัพท์ 20 คำ"
                    data-testid="new-custom-penalty-input"
                    className="min-h-[40px] flex-1 rounded-lg border border-[#EBD8C3] px-3 text-sm font-medium focus:border-[#9F1239] focus:outline-none"
                  />
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleAddCustomPenaltyOption}
                      data-testid="confirm-add-custom-penalty-btn"
                      className="min-h-[40px] rounded-lg bg-[#9F1239] px-3.5 text-xs font-bold text-white hover:brightness-95"
                    >
                      เพิ่มเข้าช่องเลือก
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddCustomPenalty(false);
                        setNewCustomPenaltyText('');
                      }}
                      className="min-h-[40px] rounded-lg border border-[#EBD8C3] bg-[#FFFDF9] px-3 text-xs font-semibold text-[#5C4B43]"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-bold text-[#5C4B43]">ข้อความอธิบายบทลงโทษ</label>
                <input
                  type="text"
                  value={editingCmd.penaltyNoteTh}
                  onChange={(e) => setEditingCmd({ ...editingCmd, penaltyNoteTh: e.target.value })}
                  placeholder={
                    isEditingPenalty
                      ? 'เช่น ทำผิดกติกาบ้าน — หักสิทธิ์ Free Day 1 วัน'
                      : 'เช่น คืนเกิน 21:00 น. หัก Free Day วันศุกร์ 1 วัน'
                  }
                  className="min-h-[42px] w-full rounded-xl border border-[#EBD8C3] bg-white px-3 text-sm"
                />
              </div>
            </div>

            {/* Allowed Kids Selection */}
            <div className="space-y-2.5 rounded-[20px] border border-[#EBD8C3] bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#3B2F2A]">
                  👥 เลือกรายชื่อน้องที่มีสิทธิ์กดปุ่มนี้ ({editingCmd.allowedKidIds.length}/{kids.length} คน)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'ทั้งหมด' },
                    { id: 'g1', label: 'กลุ่ม 1' },
                    { id: 'g2', label: 'กลุ่ม 2' },
                    { id: 'g3', label: 'กลุ่ม 3' },
                    { id: 'g23', label: 'กลุ่ม 2+3' },
                    { id: 'none', label: 'ล้าง' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        applyKidGroupPreset(p.id as 'all' | 'g1' | 'g2' | 'g3' | 'g23' | 'none')
                      }
                      className="min-h-[30px] rounded-lg border border-[#EBD8C3] bg-[#FFFDF9] px-2.5 text-[11px] font-semibold text-[#3B2F2A] hover:bg-[#FFF5BA]"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {kids.map((kid) => {
                  const checked = editingCmd.allowedKidIds.includes(kid.id);
                  return (
                    <label
                      key={kid.id}
                      className={`flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        checked
                          ? 'border-[#3B2F2A] bg-[#E7FAF6] text-[#114B43]'
                          : 'border-[#EBD8C3] bg-[#FFFDF9] text-[#5C4B43]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleKidEligibility(kid.id)}
                        className="h-4 w-4 accent-[#3B2F2A]"
                      />
                      <span className="truncate">
                        {kid.emoji} {kid.nickname}
                      </span>
                      <span className="ml-auto text-[10px] text-[#705F56]">ก.{kid.ageGroup}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCmd(null)}
                className="pastel-btn min-h-[46px] rounded-[18px] border-2 border-[#EBD8C3] bg-white px-5 text-sm font-bold text-[#5C4B43]"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="pastel-btn min-h-[46px] rounded-[18px] bg-[#3B2F2A] px-6 text-sm font-bold text-white"
              >
                💾 บันทึกปุ่มคำสั่ง
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};
