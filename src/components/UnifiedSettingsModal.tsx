import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Settings,
  Target,
  Smartphone,
  SlidersHorizontal,
  Wallet,
  Download,
  RotateCcw,
  Check,
  Plus,
  Minus,
  Sparkles,
  X,
  Copy,
  Send,
  Trash2,
  Tag,
  AlertTriangle,
  QrCode,
  ExternalLink,
  ShieldCheck,
  Zap,
  Bell,
  BellRing,
  BellOff,
  Volume2,
  Timer,
} from 'lucide-react';
import { CategoryBudget, CategoryId, SmartRule, Transaction } from '../types';
import { DEFAULT_CATEGORIES, getCategoryById } from '../data/categories';
import { formatVND, formatDateTime } from '../utils/bidvParser';
import { CategoryIcon } from './CategoryIcon';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showTransactionNotification,
  sendTestNotification,
  getNotificationConfig,
  saveNotificationConfig,
  NotificationConfig,
} from '../utils/notifications';

export type SettingsTabId = 'budget' | 'webhook' | 'notifications' | 'rules' | 'pwa' | 'data';

interface UnifiedSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTabId;
  // Budget props
  budgets: CategoryBudget[];
  onSaveBudgets: (newBudgets: CategoryBudget[]) => void;
  currentSpentMonth?: number;
  // Webhook props
  onReceiveWebhookTransaction: (tx: Transaction) => void;
  isLiveStreamConnected?: boolean;
  serverWebhookCount?: number;
  // Rules props
  rules: SmartRule[];
  onAddRule: (keyword: string, categoryId: CategoryId) => void;
  onDeleteRule: (ruleId: string) => void;
  // Balance & Data props
  latestBalance?: number;
  onUpdateBalance: (newBalance: number, reason: string, createTx: boolean) => void;
  onExportData: () => void;
  onResetDemoData: () => void;
  onShowToast: (msg: string) => void;
}

const PRESET_TOTALS = [
  { label: '10 Tr', value: 10000000 },
  { label: '15 Tr', value: 15000000 },
  { label: '20 Tr', value: 20000000 },
  { label: '25 Tr', value: 25000000 },
  { label: '30 Tr', value: 30000000 },
  { label: '40 Tr', value: 40000000 },
];

export const UnifiedSettingsModal: React.FC<UnifiedSettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'budget',
  budgets,
  onSaveBudgets,
  currentSpentMonth = 0,
  onReceiveWebhookTransaction,
  isLiveStreamConnected = false,
  serverWebhookCount = 0,
  rules,
  onAddRule,
  onDeleteRule,
  latestBalance,
  onUpdateBalance,
  onExportData,
  onResetDemoData,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);

  // Sync initial tab when opening
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // --- Budget Tab State ---
  const wasOpenRef = useRef(false);
  const [localBudgets, setLocalBudgets] = useState<Record<CategoryId, number>>(() => {
    const record: Partial<Record<CategoryId, number>> = {};
    for (const b of budgets) {
      record[b.categoryId] = b.monthlyLimit;
    }
    for (const cat of DEFAULT_CATEGORIES) {
      if (record[cat.id] === undefined) {
        record[cat.id] = cat.defaultBudget;
      }
    }
    return record as Record<CategoryId, number>;
  });
  const [budgetInputValues, setBudgetInputValues] = useState<Record<CategoryId, string>>({});
  const [customTotalInput, setCustomTotalInput] = useState<string>('');
  const [isBudgetDirty, setIsBudgetDirty] = useState<boolean>(false);

  // Initialize only when modal opens (wasOpen false -> true) or tab switches to budget
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const record: Partial<Record<CategoryId, number>> = {};
      const inputs: Partial<Record<CategoryId, string>> = {};
      for (const b of budgets) {
        record[b.categoryId] = b.monthlyLimit;
      }
      for (const cat of DEFAULT_CATEGORIES) {
        if (record[cat.id] === undefined) {
          record[cat.id] = cat.defaultBudget;
        }
        const val = record[cat.id] ?? cat.defaultBudget;
        inputs[cat.id] = val > 0 ? val.toLocaleString('vi-VN') : '0';
      }
      setLocalBudgets(record as Record<CategoryId, number>);
      setBudgetInputValues(inputs as Record<CategoryId, string>);
      setIsBudgetDirty(false);

      const total = (Object.values(record as Record<CategoryId, number>) as number[]).reduce(
        (acc: number, val: number) => acc + (val || 0),
        0
      );
      setCustomTotalInput(total ? total.toLocaleString('vi-VN') : '');
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, budgets]);

  const totalMonthlyBudget: number = (Object.values(localBudgets) as number[]).reduce(
    (sum: number, v: number) => sum + (v || 0),
    0
  );

  const handleChangeLimit = (catId: CategoryId, valueStr: string) => {
    const clean = valueStr.replace(/[^\d]/g, '');
    const num = clean ? parseInt(clean, 10) : 0;
    setBudgetInputValues((prev) => ({
      ...prev,
      [catId]: clean ? num.toLocaleString('vi-VN') : '',
    }));
    setLocalBudgets((prev) => ({ ...prev, [catId]: num }));
    setIsBudgetDirty(true);
  };

  const handleBlurLimit = (catId: CategoryId) => {
    const num = localBudgets[catId] ?? 0;
    setBudgetInputValues((prev) => ({
      ...prev,
      [catId]: num > 0 ? num.toLocaleString('vi-VN') : '0',
    }));
  };

  const handleAdjustStep = (catId: CategoryId, delta: number) => {
    setLocalBudgets((prev) => {
      const current = prev[catId] ?? 0;
      const nextVal = Math.max(0, current + delta);
      setBudgetInputValues((inp) => ({
        ...inp,
        [catId]: nextVal > 0 ? nextVal.toLocaleString('vi-VN') : '0',
      }));
      return { ...prev, [catId]: nextVal };
    });
    setIsBudgetDirty(true);
  };

  const handleResetDefaults = () => {
    const record: Partial<Record<CategoryId, number>> = {};
    const inputs: Partial<Record<CategoryId, string>> = {};
    for (const cat of DEFAULT_CATEGORIES) {
      record[cat.id] = cat.defaultBudget;
      inputs[cat.id] = cat.defaultBudget.toLocaleString('vi-VN');
    }
    setLocalBudgets(record as Record<CategoryId, number>);
    setBudgetInputValues(inputs as Record<CategoryId, string>);
    const total = DEFAULT_CATEGORIES.reduce((s, c) => s + c.defaultBudget, 0);
    setCustomTotalInput(total.toLocaleString('vi-VN'));
    setIsBudgetDirty(true);
  };

  const handleApplyProportionalTotal = (targetTotal: number) => {
    if (targetTotal <= 0) return;
    const defaultTotal = DEFAULT_CATEGORIES.reduce((sum, c) => sum + c.defaultBudget, 0);
    const newRecord: Partial<Record<CategoryId, number>> = {};
    const newInputs: Partial<Record<CategoryId, string>> = {};
    let allocated = 0;
    DEFAULT_CATEGORIES.forEach((cat, index) => {
      if (index === DEFAULT_CATEGORIES.length - 1) {
        const remaining = Math.max(0, targetTotal - allocated);
        newRecord[cat.id] = remaining;
        newInputs[cat.id] = remaining > 0 ? remaining.toLocaleString('vi-VN') : '0';
      } else {
        const ratio = cat.defaultBudget / defaultTotal;
        const rounded = Math.round((targetTotal * ratio) / 50000) * 50000;
        newRecord[cat.id] = rounded;
        newInputs[cat.id] = rounded > 0 ? rounded.toLocaleString('vi-VN') : '0';
        allocated += rounded;
      }
    });
    setLocalBudgets(newRecord as Record<CategoryId, number>);
    setBudgetInputValues(newInputs as Record<CategoryId, string>);
    setCustomTotalInput(targetTotal.toLocaleString('vi-VN'));
    setIsBudgetDirty(true);
  };

  const handleDistributeEqually = () => {
    const targetTotal = parseInt(customTotalInput.replace(/[^\d]/g, ''), 10) || totalMonthlyBudget;
    if (targetTotal <= 0) return;
    const count = DEFAULT_CATEGORIES.length;
    const eachAmount = Math.round(targetTotal / count / 50000) * 50000;
    const newRecord: Partial<Record<CategoryId, number>> = {};
    const newInputs: Partial<Record<CategoryId, string>> = {};
    DEFAULT_CATEGORIES.forEach((cat) => {
      newRecord[cat.id] = eachAmount;
      newInputs[cat.id] = eachAmount > 0 ? eachAmount.toLocaleString('vi-VN') : '0';
    });
    setLocalBudgets(newRecord as Record<CategoryId, number>);
    setBudgetInputValues(newInputs as Record<CategoryId, string>);
    setIsBudgetDirty(true);
  };

  const handleSaveBudgetsClick = (shouldClose: boolean = true) => {
    const updated: CategoryBudget[] = DEFAULT_CATEGORIES.map((cat) => ({
      categoryId: cat.id,
      monthlyLimit: localBudgets[cat.id] ?? cat.defaultBudget,
    }));
    onSaveBudgets(updated);
    setIsBudgetDirty(false);
    onShowToast(`Đã lưu hạn mức ngân sách: ${formatVND(totalMonthlyBudget)}`);
    if (shouldClose) {
      onClose();
    }
  };

  // --- Webhook Tab State ---
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showQr, setShowQr] = useState<boolean>(false);

  const getWebhookUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/webhook/bidv`;
    }
    return 'https://ais-dev-iw4j4zed4oyqef6o3t72os-541670080988.asia-east1.run.app/api/webhook/bidv';
  };

  const webhookUrl = getWebhookUrl();

  useEffect(() => {
    QRCode.toDataURL(webhookUrl, {
      width: 240,
      margin: 2,
      color: { dark: '#047857', light: '#ffffff' },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR code generation error:', err));
  }, [webhookUrl]);

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    onShowToast('Đã sao chép link Webhook vào clipboard!');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleSendTestWebhook = async () => {
    setIsSendingTest(true);
    setTestStatus('Đang gửi tin thử nghiệm tới máy chủ...');
    try {
      const sampleText = `BIDV: 17/09/2026 11:30 | So du TK 1234567890 thay doi -45,000 VND. So du: 4,850,000 VND. ND: Caphe Highland Coffee qua POS BIDV`;
      const res = await fetch('/api/webhook/bidv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sampleText,
          source: 'macrodroid_test',
        }),
      });

      if (res.ok) {
        setTestStatus('Thành công! Máy chủ đã nhận diện và tự động thêm giao dịch.');
        onShowToast('Đã gửi tin thử nghiệm thành công!');
      } else {
        setTestStatus('Có lỗi xảy ra khi gửi tin.');
      }
    } catch (e: any) {
      setTestStatus(`Lỗi: ${e.message}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  // --- Notifications Tab State ---
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    getNotificationPermission()
  );
  const [notifConfig, setNotifConfig] = useState<NotificationConfig>(() => getNotificationConfig());
  const [notifCountdown, setNotifCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNotifPermission(getNotificationPermission());
      setNotifConfig(getNotificationConfig());
    }
  }, [isOpen]);

  const handleRequestNotifPermission = async () => {
    const granted = await requestNotificationPermission();
    const current = getNotificationPermission();
    setNotifPermission(current);
    if (granted) {
      onShowToast('✓ Đã cấp quyền thông báo trình duyệt thành công!');
      sendTestNotification();
    } else if (current === 'denied') {
      onShowToast('Thông báo đang bị chặn trong cài đặt trình duyệt.');
    }
  };

  const handleToggleNotifOption = (key: keyof NotificationConfig) => {
    setNotifConfig((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveNotificationConfig(next);
      return next;
    });
  };

  const handleSendInstantTest = async () => {
    if (notifPermission !== 'granted') {
      const ok = await requestNotificationPermission();
      setNotifPermission(getNotificationPermission());
      if (!ok) {
        onShowToast('Vui lòng cho phép quyền thông báo trước.');
        return;
      }
    }
    const success = await sendTestNotification();
    if (success) {
      onShowToast('Đã gửi thông báo đẩy thử nghiệm!');
    } else {
      onShowToast('Không thể hiển thị thông báo. Hãy kiểm tra cài đặt trình duyệt.');
    }
  };

  const handleStartCountdownTest = async () => {
    if (notifPermission !== 'granted') {
      const ok = await requestNotificationPermission();
      setNotifPermission(getNotificationPermission());
      if (!ok) {
        onShowToast('Vui lòng cho phép quyền thông báo trước.');
        return;
      }
    }

    setNotifCountdown(5);
    onShowToast('Bắt đầu đếm ngược 5 giây! Hãy chuyển sang tab khác ngay bây giờ.');

    let count = 5;
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setNotifCountdown(count);
      } else {
        clearInterval(interval);
        setNotifCountdown(null);
        showTransactionNotification({
          type: 'expense',
          amount: 85000,
          description: 'Cơm trưa văn phòng & Nước ép - Giao dịch BIDV nhận diện nền',
          categoryName: 'Ăn uống & Cà phê',
          balance: 14850000,
        });
      }
    }, 1000);
  };

  // --- Rules Tab State ---
  const [newKeyword, setNewKeyword] = useState('');
  const [targetCategory, setTargetCategory] = useState<CategoryId>('food');
  const [selectedViewCategory, setSelectedViewCategory] = useState<CategoryId>('food');

  const handleAddKeywordRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    onAddRule(newKeyword.trim(), targetCategory);
    setNewKeyword('');
    onShowToast(`Đã thêm từ khóa cho ${getCategoryById(targetCategory).name}`);
  };

  // --- PWA Tab State ---
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [pwaPlatform, setPwaPlatform] = useState<'android' | 'ios'>(
    isIOS ? 'ios' : 'android'
  );
  const [copiedLink, setCopiedLink] = useState(false);

  const handleNativeInstall = async () => {
    const res = await install();
    if (res === 'accepted') {
      onShowToast('Đang cài đặt ứng dụng vào màn hình chính...');
      onClose();
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      onShowToast('Đã sao chép link ứng dụng!');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // --- Balance & Data Tab State ---
  const [balanceInput, setBalanceInput] = useState<string>(
    latestBalance !== undefined ? latestBalance.toLocaleString('vi-VN') : ''
  );

  const handleSaveBalanceClick = () => {
    const clean = balanceInput.replace(/[^\d]/g, '');
    const num = clean ? parseInt(clean, 10) : 0;
    onUpdateBalance(num, 'Cập nhật từ cài đặt', false);
    onShowToast(`Đã lưu số dư BIDV: ${formatVND(num)}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Bảng Cài Đặt & Cấu Hình
                </h2>
                {isLiveStreamConnected && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Sync
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Tất cả thiết lập ngân sách, tự động bắt tin, phân loại và ứng dụng trong một nơi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            title="Đóng bảng cài đặt"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector Bar (6 Tabs: 2 rows of 3 on mobile, 6 cols on desktop) */}
        <div className="border-b border-slate-200 bg-slate-100/70 p-1.5 sm:px-6 shrink-0">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 text-center">
            <button
              type="button"
              onClick={() => setActiveTab('budget')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'budget'
                  ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Target className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">Ngân Sách</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('webhook')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'webhook'
                  ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Smartphone className="w-4 h-4 text-teal-600 shrink-0" />
              <span className="truncate">Webhook</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              className={`relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'notifications'
                  ? 'bg-white text-amber-700 shadow-xs border border-amber-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Bell className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="truncate">Thông Báo</span>
              {notifPermission === 'default' && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rules')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'rules'
                  ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="truncate">Phân Loại</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pwa')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'pwa'
                  ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Download className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">Cài App</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('data')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'data'
                  ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Wallet className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate">Số Dư</span>
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: BUDGET SETTINGS */}
          {activeTab === 'budget' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {/* Total Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-slate-50 border border-emerald-100/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                      Tổng ngân sách chi tiêu tháng
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                        {formatVND(totalMonthlyBudget)}
                      </span>
                      {currentSpentMonth > 0 && (
                        <span className="text-xs text-slate-500 font-medium">
                          (Đã chi:{' '}
                          <strong className="text-slate-800 font-mono">
                            {formatVND(currentSpentMonth)}
                          </strong>
                          )
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={handleResetDefaults}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                      title="Đặt lại mức ngân sách chuẩn BIDV"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      Mặc định BIDV
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveBudgetsClick(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Lưu Hạn Mức
                    </button>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="pt-2 border-t border-emerald-100/60">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      Chọn nhanh mức tổng chi tiêu:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_TOTALS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handleApplyProportionalTotal(preset.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                          totalMonthlyBudget === preset.value
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Total Input */}
                <div className="pt-2 border-t border-emerald-100/60 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-xs text-slate-600 shrink-0">Hoặc nhập tổng tiền:</span>
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={customTotalInput}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/[^\d]/g, '');
                          const num = clean ? parseInt(clean, 10) : 0;
                          setCustomTotalInput(num ? num.toLocaleString('vi-VN') : '');
                        }}
                        placeholder="VD: 18.000.000"
                        className="w-full text-xs font-mono font-bold text-slate-900 border border-slate-200 rounded-lg py-1.5 px-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                      />
                      <span className="absolute right-2 top-1.5 text-xs text-slate-400 font-bold">
                        ₫
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const clean = customTotalInput.replace(/[^\d]/g, '');
                        const num = parseInt(clean, 10) || 0;
                        if (num > 0) handleApplyProportionalTotal(num);
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100/80 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Chia theo tỷ lệ
                    </button>
                    <button
                      type="button"
                      onClick={handleDistributeEqually}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Chia đều
                    </button>
                  </div>
                </div>
              </div>

              {/* Category-by-Category Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Hạn mức chi tiết theo từng danh mục
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Nhập trực tiếp hoặc bấm +/- để tăng giảm
                  </span>
                </div>

                <div className="space-y-2">
                  {DEFAULT_CATEGORIES.map((cat) => {
                    const currentVal = localBudgets[cat.id] ?? cat.defaultBudget;
                    const ratioOfTotal =
                      totalMonthlyBudget > 0
                        ? Math.round((currentVal / totalMonthlyBudget) * 100)
                        : 0;

                    return (
                      <div
                        key={cat.id}
                        className="p-2.5 sm:p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: cat.bgColor, borderColor: cat.borderColor }}
                          >
                            <CategoryIcon
                              categoryId={cat.id}
                              className="w-4 h-4 shrink-0"
                              style={{ color: cat.color }}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {cat.name}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-mono">
                                {ratioOfTotal}%
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 block truncate">
                              Mặc định: {formatVND(cat.defaultBudget)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleAdjustStep(cat.id, -500000)}
                            className="w-7 h-7 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                            title="Giảm 500k"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <div className="relative">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={budgetInputValues[cat.id] !== undefined ? budgetInputValues[cat.id] : (currentVal > 0 ? currentVal.toLocaleString('vi-VN') : '0')}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => handleChangeLimit(cat.id, e.target.value)}
                              onBlur={() => handleBlurLimit(cat.id)}
                              placeholder="0"
                              className="w-28 sm:w-32 text-right font-mono text-xs font-bold text-slate-900 border border-slate-200 rounded-lg py-1.5 pr-5 pl-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                            />
                            <span className="absolute right-2 top-1.5 text-[11px] text-slate-400 font-bold">
                              ₫
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAdjustStep(cat.id, 500000)}
                            className="w-7 h-7 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                            title="Tăng 500k"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAdjustStep(cat.id, 1000000)}
                            className="px-1.5 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                            title="Tăng nhanh 1 Triệu"
                          >
                            +1Tr
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WEBHOOK AUTOMATION */}
          {activeTab === 'webhook' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {/* Webhook Status Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-slate-50 border border-teal-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isLiveStreamConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                      }`}
                    />
                    <span className="text-xs font-bold text-slate-900">
                      {isLiveStreamConnected
                        ? 'Máy Chủ Sẵn Sàng Bắt Tin Real-Time'
                        : 'Đang Lắng Nghe Webhook'}
                    </span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-medium">
                    Đã nhận {serverWebhookCount} tin
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-700 block">
                    Đường dẫn Webhook nhận biến động số dư:
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={webhookUrl}
                      className="flex-1 text-xs font-mono bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyWebhookUrl}
                      className={`px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                        copiedUrl
                          ? 'bg-emerald-600 text-white'
                          : 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
                      }`}
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUrl ? 'Đã sao chép' : 'Sao chép URL'}</span>
                    </button>
                    {qrDataUrl && (
                      <button
                        type="button"
                        onClick={() => setShowQr(!showQr)}
                        className="p-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 rounded-xl transition-colors cursor-pointer"
                        title="Xem mã QR để quét nhanh"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {showQr && qrDataUrl && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col items-center gap-2 animate-in fade-in">
                    <img src={qrDataUrl} alt="Webhook QR" className="w-36 h-36 rounded-lg" />
                    <span className="text-[11px] text-slate-500">
                      Mở camera điện thoại quét để lấy link Webhook dán vào MacroDroid
                    </span>
                  </div>
                )}
              </div>

              {/* 3 Step Setup Guide */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  3 Bước Cài Đặt Trên Điện Thoại Android (MacroDroid)
                </span>

                <div className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <div>
                      <strong className="text-slate-800">Tải app MacroDroid</strong> từ Google Play Store (miễn phí) và cấp quyền đọc thông báo cho ứng dụng.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <div>
                      <strong className="text-slate-800">Tạo Trigger (Kích hoạt):</strong> Chọn{' '}
                      <em>Thông báo (Notification Received)</em> &rarr; Chọn ứng dụng{' '}
                      <em>BIDV SmartBanking</em>.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <div>
                      <strong className="text-slate-800">Tạo Action (Hành động):</strong> Chọn{' '}
                      <em>Mở Web / HTTP Request</em> &rarr; Phương thức <strong>POST</strong> &rarr; Dán link Webhook ở trên vào &rarr; Nội dung gửi:{' '}
                      <code className="bg-slate-100 text-emerald-800 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold">
                        {`{"text": "{notification_text}"}`}
                      </code>
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Webhook Action */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Thử nghiệm gửi tin nhắn BIDV mẫu
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Bắn thử 1 biến động số dư giả lập -45.000đ Highlands Coffee tới webhook
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSendTestWebhook}
                  disabled={isSendingTest}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl shadow-2xs transition-all disabled:opacity-50 cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingTest ? 'Đang gửi...' : 'Gửi Thử Nghiệm'}</span>
                </button>
              </div>
              {testStatus && (
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{testStatus}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB: NOTIFICATION SETTINGS */}
          {activeTab === 'notifications' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {/* Permission Status Hero Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-emerald-500/5 to-slate-50 border border-amber-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      {notifPermission === 'granted' ? (
                        <BellRing className="w-5 h-5" />
                      ) : notifPermission === 'denied' ? (
                        <BellOff className="w-5 h-5" />
                      ) : (
                        <Bell className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">
                          Thông Báo Đẩy Biến Động Số Dư BIDV
                        </h3>
                        {notifPermission === 'granted' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Đang Hoạt Động
                          </span>
                        )}
                        {notifPermission === 'default' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Chưa Cấp Quyền
                          </span>
                        )}
                        {notifPermission === 'denied' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                            Bị Chặn Bởi Trình Duyệt
                          </span>
                        )}
                        {notifPermission === 'unsupported' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            Không Hỗ Trợ
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Sử dụng Notification API kết hợp Service Worker để đẩy thông báo hệ thống lên máy tính & điện thoại ngay khi nhận diện giao dịch BIDV mới —{' '}
                        <strong className="text-slate-900 font-semibold">kể cả khi bạn đang chuyển sang tab khác hoặc thu nhỏ trình duyệt</strong>.
                      </p>
                    </div>
                  </div>

                  {notifPermission !== 'granted' && notifPermission !== 'unsupported' && (
                    <button
                      type="button"
                      onClick={handleRequestNotifPermission}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl shadow-xs hover:shadow transition-all cursor-pointer shrink-0"
                    >
                      <BellRing className="w-4 h-4" />
                      <span>Bật Thông Báo Ngay</span>
                    </button>
                  )}
                </div>

                {notifPermission === 'denied' && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Trình duyệt đang chặn thông báo từ trang web này:</span>
                      <span>
                        Để bật lại, vui lòng nhấn vào biểu tượng <strong>Cài đặt trang / Ổ khóa</strong> ở đầu thanh địa chỉ URL, tìm mục <strong>Thông báo</strong> và chọn <strong>Cho phép</strong>, sau đó tải lại trang.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Interactive Notification Tests */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Thử Nghiệm Nhận Thông Báo
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Kiểm tra hiển thị popup ngoài ứng dụng
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Test 1: Immediate */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between gap-2.5">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Gửi thử thông báo tức thì
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Bắn ngay 1 thông báo BIDV giả lập để kiểm tra âm thanh, biểu tượng và nội dung.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSendInstantTest}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 text-slate-600" />
                      <span>Gửi Thử Ngay Lập Tức</span>
                    </button>
                  </div>

                  {/* Test 2: Countdown for background tab test */}
                  <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 flex flex-col justify-between gap-2.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Timer className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-xs font-bold text-amber-900">
                          Thử nghiệm khi không ở tab (Sau 5 giây)
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800/80 mt-0.5">
                        Bấm nút này rồi <strong className="font-bold text-amber-950">chuyển ngay sang tab khác</strong> để thấy thông báo đẩy xuất hiện!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartCountdownTest}
                      disabled={notifCountdown !== null}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:bg-amber-400 rounded-lg shadow-2xs transition-all cursor-pointer"
                    >
                      {notifCountdown !== null ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                          <span>Đếm ngược: {notifCountdown}s... Hãy chuyển Tab!</span>
                        </>
                      ) : (
                        <>
                          <Timer className="w-3.5 h-3.5" />
                          <span>Bắt Đầu Đếm Ngược 5 Giây</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {notifCountdown !== null && (
                  <div className="p-3 rounded-xl bg-amber-100 border border-amber-300 text-xs text-amber-900 flex items-center justify-between animate-pulse">
                    <span className="font-semibold">
                      ⚡ Đang chờ đếm ngược {notifCountdown}s: Hãy bấm chuyển sang một tab khác hoặc thu nhỏ cửa sổ ngay!
                    </span>
                    <span className="font-mono text-sm font-bold bg-amber-200 px-2 py-0.5 rounded-md">
                      {notifCountdown}s
                    </span>
                  </div>
                )}
              </div>

              {/* Notification Preferences */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  Tùy Chọn Thông Báo
                </span>

                <div className="divide-y divide-slate-100 text-xs">
                  <div className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-semibold text-slate-800 block">Thông báo khi chi tiêu (Trừ tiền)</span>
                      <span className="text-[11px] text-slate-500">Hiển thị khi tài khoản phát sinh giao dịch trừ tiền (Debit)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleNotifOption('notifyExpense')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        notifConfig.notifyExpense ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                          notifConfig.notifyExpense ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-semibold text-slate-800 block">Thông báo khi nhận tiền (Cộng tiền)</span>
                      <span className="text-[11px] text-slate-500">Hiển thị khi tài khoản nhận tiền chuyển khoản đến (Credit)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleNotifOption('notifyIncome')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        notifConfig.notifyIncome ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                          notifConfig.notifyIncome ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-semibold text-slate-800 block">Kèm số dư khả dụng sau giao dịch</span>
                      <span className="text-[11px] text-slate-500">Ghi kèm số dư còn lại trong tài khoản BIDV trên nội dung thông báo</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleNotifOption('showBalance')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        notifConfig.showBalance ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                          notifConfig.showBalance ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-semibold text-slate-800 block">Âm thanh & Rung thiết bị</span>
                      <span className="text-[11px] text-slate-500">Phát âm báo hoặc rung điện thoại khi có thông báo mới</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleNotifOption('enableSound')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        notifConfig.enableSound ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                          notifConfig.enableSound ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* How it works info card */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <span className="font-bold text-slate-800 block flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Cơ chế hoạt động khi không ở tab ứng dụng:
                </span>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 pl-1">
                  <li>
                    MacroDroid từ điện thoại gửi SMS biến động số dư BIDV đến Webhook máy chủ.
                  </li>
                  <li>
                    Hệ thống tự động phân loại danh mục thông minh và lưu trữ giao dịch.
                  </li>
                  <li>
                    Service Worker kích hoạt <strong className="text-slate-800 font-semibold">Notification API</strong> đẩy thông báo tức thì lên màn hình máy tính hoặc thanh thông báo Android, kể cả khi ứng dụng đang đóng hoặc ẩn tab.
                  </li>
                  <li>
                    Nhấn vào thông báo sẽ ngay lập tức mở hoặc chuyển tiêu điểm vào phần mềm BIDV Tracker.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 4: SMART CATEGORY RULES */}
          {activeTab === 'rules' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Thêm từ khóa phân loại tự động
                </span>
                <form onSubmit={handleAddKeywordRule} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="VD: circle k, gs25, tiền điện, grap, shopee..."
                    className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                  <select
                    value={targetCategory}
                    onChange={(e) => setTargetCategory(e.target.value as CategoryId)}
                    className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  >
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1 px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm Từ Khóa</span>
                  </button>
                </form>
              </div>

              {/* View Rules by Category */}
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2 px-1">
                  Danh sách từ khóa hiện tại theo danh mục
                </span>
                <div className="flex flex-wrap gap-1 mb-3">
                  {DEFAULT_CATEGORIES.map((cat) => {
                    const count = rules.filter((r) => r.categoryId === cat.id).length;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedViewCategory(cat.id)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          selectedViewCategory === cat.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {cat.name} ({count})
                      </button>
                    );
                  })}
                </div>

                <div className="p-3 bg-white rounded-2xl border border-slate-200 min-h-[140px]">
                  <div className="flex flex-wrap gap-1.5">
                    {rules
                      .filter((r) => r.categoryId === selectedViewCategory)
                      .map((r) => (
                        <span
                          key={r.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-medium"
                        >
                          <Tag className="w-3 h-3 text-indigo-500" />
                          <span>{r.keyword}</span>
                          <button
                            type="button"
                            onClick={() => onDeleteRule(r.id)}
                            className="text-indigo-400 hover:text-red-600 p-0.5 transition-colors cursor-pointer"
                            title="Xóa từ khóa"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    {rules.filter((r) => r.categoryId === selectedViewCategory).length === 0 && (
                      <span className="text-xs text-slate-400 italic">
                        Chưa có từ khóa tùy chỉnh cho danh mục này. Hãy nhập từ khóa ở trên để thêm.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PWA INSTALL */}
          {activeTab === 'pwa' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center font-black text-sm">
                    BIDV
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Cài Ứng Dụng Ra Màn Hình Chính</h3>
                    <p className="text-xs text-emerald-100">
                      Mở nhanh toàn màn hình như ứng dụng thật không cần mở trình duyệt
                    </p>
                  </div>
                </div>

                {isInstallable && (
                  <button
                    type="button"
                    onClick={handleNativeInstall}
                    className="w-full py-2.5 px-4 bg-white text-emerald-900 font-bold rounded-xl text-xs hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Cài Đặt Ứng Dụng Ngay (1-Click)
                  </button>
                )}
              </div>

              {/* Instructions per OS */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPwaPlatform('android')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    pwaPlatform === 'android'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  Dành Cho Android (Chrome)
                </button>
                <button
                  type="button"
                  onClick={() => setPwaPlatform('ios')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    pwaPlatform === 'ios'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  Dành Cho iPhone (Safari)
                </button>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2">
                {pwaPlatform === 'android' ? (
                  <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                    <li>
                      Bấm vào biểu tượng <strong>dấu 3 chấm (⋮)</strong> ở góc trên bên phải trình duyệt Chrome.
                    </li>
                    <li>
                      Chọn <strong>"Cài đặt ứng dụng"</strong> hoặc <strong>"Thêm vào màn hình chính" (Add to Home screen)</strong>.
                    </li>
                    <li>Bấm <strong>Cài đặt</strong> để xác nhận. Icon BIDV sẽ xuất hiện ngay trên màn hình điện thoại!</li>
                  </ol>
                ) : (
                  <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                    <li>
                      Bấm vào nút <strong>Chia sẻ (biểu tượng ô vuông mũi tên lên)</strong> ở thanh dưới của Safari.
                    </li>
                    <li>
                      Cuộn xuống chọn <strong>"Thêm vào MH chính" (Add to Home Screen)</strong>.
                    </li>
                    <li>Bấm <strong>Thêm</strong> ở góc trên cùng bên phải.</li>
                  </ol>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-600">Hoặc sao chép đường link web:</span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedLink ? 'Đã sao chép' : 'Sao chép link'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: BALANCE & BACKUP */}
          {activeTab === 'data' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {/* Balance Adjust */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Cập nhật số dư tài khoản BIDV hiện tại
                </span>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={balanceInput}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/[^\d]/g, '');
                        const num = clean ? parseInt(clean, 10) : 0;
                        setBalanceInput(num ? num.toLocaleString('vi-VN') : '');
                      }}
                      placeholder="VD: 5.000.000"
                      className="w-full text-sm font-mono font-bold text-slate-900 border border-slate-200 rounded-xl py-2 px-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">
                      ₫
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveBalanceClick}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Lưu Số Dư
                  </button>
                </div>
              </div>

              {/* Data Export & Reset */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Dữ liệu & Sao lưu
                </span>
                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onExportData}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shadow-2xs"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    Xuất File Báo Cáo Excel / CSV
                  </button>
                  <button
                    type="button"
                    onClick={onResetDemoData}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Khôi phục dữ liệu mẫu BIDV
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600 min-w-0">
            {activeTab === 'budget' && (
              <div className="flex items-center gap-2 flex-wrap">
                <span>
                  Tổng: <strong className="text-emerald-700 font-mono font-bold">{formatVND(totalMonthlyBudget)}</strong>
                </span>
                {isBudgetDirty && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    ● Đang có thay đổi
                  </span>
                )}
              </div>
            )}
            {activeTab === 'webhook' && `Đã nhận: ${serverWebhookCount} tin từ BIDV`}
            {activeTab === 'notifications' && (notifPermission === 'granted' ? '✓ Đang kích hoạt thông báo đẩy BIDV' : 'Chưa cấp quyền thông báo')}
            {activeTab === 'rules' && `Tổng ${rules.length} từ khóa tự động`}
            {activeTab === 'pwa' && `Ứng dụng BIDV PWA`}
            {activeTab === 'data' && `Số dư: ${formatVND(latestBalance || 0)}`}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 sm:px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
            >
              {activeTab === 'budget' && isBudgetDirty ? 'Hủy' : 'Đóng'}
            </button>

            {activeTab === 'budget' && (
              <button
                type="button"
                id="btn-save-budget-footer"
                onClick={() => handleSaveBudgetsClick(true)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Lưu & Áp Dụng</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
