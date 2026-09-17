import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  PlusCircle,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  BellRing,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { CategoryBudget, CategoryId, SmartRule, Transaction } from './types';
import { DEFAULT_CATEGORIES } from './data/categories';
import { INITIAL_TRANSACTIONS } from './data/mockBidvData';
import { parseBidvNotificationLocally, formatVND } from './utils/bidvParser';
import { playTransactionChime } from './utils/sound';
import {
  showTransactionNotification,
  requestNotificationPermission,
  getNotificationPermission,
  isNotificationSupported,
  sendTestNotification,
} from './utils/notifications';
import { UnifiedSettingsModal, SettingsTabId } from './components/UnifiedSettingsModal';
import { Navbar } from './components/Navbar';
import { NotificationSimulator } from './components/NotificationSimulator';
import { WebhookIntegrationModal } from './components/WebhookIntegrationModal';
import { CategoryRulesModal } from './components/CategoryRulesModal';
import { BudgetSettingsModal } from './components/BudgetSettingsModal';
import { ManualAddModal } from './components/ManualAddModal';
import { BalanceUpdateModal } from './components/BalanceUpdateModal';
import { MonthlyReportModal } from './components/MonthlyReportModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { ExpenseOverview } from './components/ExpenseOverview';
import { ExpenseCharts } from './components/ExpenseCharts';
import { TransactionList } from './components/TransactionList';

const STORAGE_KEY_TXS = 'bidv_expense_tracker_txs_v1';
const STORAGE_KEY_BUDGETS = 'bidv_expense_tracker_budgets_v1';
const STORAGE_KEY_RULES = 'bidv_expense_tracker_rules_v1';
const STORAGE_KEY_MANUAL_BALANCE = 'bidv_expense_tracker_manual_balance_v1';

export default function App() {
  // Load state from localStorage or use initial defaults
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TXS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading transactions:', e);
    }
    return INITIAL_TRANSACTIONS;
  });

  const [budgets, setBudgets] = useState<CategoryBudget[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BUDGETS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading budgets:', e);
    }
    return DEFAULT_CATEGORIES.map((c) => ({
      categoryId: c.id,
      monthlyLimit: c.defaultBudget,
    }));
  });

  const [rules, setRules] = useState<SmartRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RULES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading rules:', e);
    }
    return [
      { id: 'rule-1', keyword: 'highlands', categoryId: 'food', createdAt: new Date().toISOString() },
      { id: 'rule-2', keyword: 'shopee', categoryId: 'shopping', createdAt: new Date().toISOString() },
      { id: 'rule-3', keyword: 'evn', categoryId: 'bills', createdAt: new Date().toISOString() },
      { id: 'rule-4', keyword: 'petrolimex', categoryId: 'transport', createdAt: new Date().toISOString() },
      { id: 'rule-5', keyword: 'pharmacity', categoryId: 'health', createdAt: new Date().toISOString() },
      { id: 'rule-6', keyword: 'thue nha', categoryId: 'housing', createdAt: new Date().toISOString() },
    ];
  });

  // Modal open states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState<SettingsTabId>('budget');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulatorInitialText, setSimulatorInitialText] = useState<string | undefined>(undefined);
  const [isWebhookOpen, setIsWebhookOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isMonthlyReportOpen, setIsMonthlyReportOpen] = useState(false);
  const [isPWAInstallOpen, setIsPWAInstallOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const handleOpenSettings = useCallback((tab: SettingsTabId = 'budget') => {
    setSettingsActiveTab(tab);
    setIsSettingsOpen(true);
  }, []);

  // Manual balance override
  const [manualBalance, setManualBalance] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MANUAL_BALANCE);
      return saved !== null ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Browser Notification API permission state
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    getNotificationPermission()
  );

  const [showNotifBanner, setShowNotifBanner] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const perm = getNotificationPermission();
    try {
      const dismissed = localStorage.getItem('bidv_notif_banner_dismissed');
      return perm === 'default' && !dismissed;
    } catch {
      return perm === 'default';
    }
  });

  const handleEnableNotificationsFromBanner = async () => {
    const granted = await requestNotificationPermission();
    const current = getNotificationPermission();
    setNotifPermission(current);
    if (granted) {
      setShowNotifBanner(false);
      showToast('✓ Đã bật thông báo đẩy trình duyệt thành công!');
      sendTestNotification();
    } else if (current === 'denied') {
      setShowNotifBanner(false);
      showToast('Thông báo đang bị chặn trong cài đặt trình duyệt.');
    }
  };

  const handleDismissNotifBanner = () => {
    setShowNotifBanner(false);
    try {
      localStorage.setItem('bidv_notif_banner_dismissed', 'true');
    } catch {}
  };

  // Auto-clean any bogus 13đ transactions from older parser, re-parse real BIDV amounts, and deduplicate
  useEffect(() => {
    setTransactions((prev) => {
      let modified = false;
      const seen = new Set<string>();
      const result: Transaction[] = [];

      for (const t of prev) {
        let fixedTx = { ...t };
        // If it has raw BIDV notification, re-parse to ensure accurate amount, clean description, and accurate Vietnam time
        if (t.rawMessage) {
          const reParsed = parseBidvNotificationLocally(t.rawMessage, rules);
          if (reParsed.amount > 0) {
            if (reParsed.timestamp && fixedTx.timestamp !== reParsed.timestamp) {
              fixedTx.timestamp = reParsed.timestamp;
              modified = true;
            }
            if (t.amount <= 100 || t.description?.includes('Thông báo BIDV') || t.rawMessage.includes('-65,000')) {
              fixedTx.amount = reParsed.amount;
              fixedTx.description = reParsed.description;
              fixedTx.categoryId = reParsed.suggestedCategoryId;
              fixedTx.balance = reParsed.balance ?? fixedTx.balance;
              fixedTx.accountNumber = reParsed.accountNumber || fixedTx.accountNumber;
              modified = true;
            }
          }
        }

        // Drop bogus 13đ or <= 100đ transactions
        if (fixedTx.amount <= 100) {
          modified = true;
          continue;
        }

        const dedupeKey = `${fixedTx.amount}-${fixedTx.type}-${fixedTx.timestamp?.slice(0, 16)}-${fixedTx.description}`;
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          result.push(fixedTx);
        } else {
          modified = true;
        }
      }

      return modified ? result : prev;
    });
  }, [rules]);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TXS, JSON.stringify(transactions));
    } catch (e) {
      console.error('Error saving transactions:', e);
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(budgets));
    } catch (e) {
      console.error('Error saving budgets:', e);
    }
  }, [budgets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RULES, JSON.stringify(rules));
    } catch (e) {
      console.error('Error saving rules:', e);
    }
  }, [rules]);

  useEffect(() => {
    try {
      if (manualBalance !== null) {
        localStorage.setItem(STORAGE_KEY_MANUAL_BALANCE, JSON.stringify(manualBalance));
      }
    } catch (e) {
      console.error('Error saving manual balance:', e);
    }
  }, [manualBalance]);

  // Derive latest BIDV balance from manual override or most recent transaction
  const latestBalance = React.useMemo(() => {
    if (manualBalance !== null) return manualBalance;
    const txWithBalance = transactions.find((t) => t.balance !== undefined);
    return txWithBalance?.balance;
  }, [transactions, manualBalance]);

  // Current month total spent
  const totalSpentMonth = React.useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return transactions
      .filter((t) => {
        if (t.type !== 'debit') return false;
        const d = new Date(t.timestamp);
        return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Add new transaction handler
  const handleAddTransaction = useCallback((newTx: Transaction, shouldNotify = true) => {
    if (newTx.balance !== undefined) {
      setManualBalance(newTx.balance);
    }
    setTransactions((prev) => {
      if (prev.some((t) => t.id === newTx.id || (newTx.refNumber && t.refNumber === newTx.refNumber))) {
        return prev;
      }
      return [newTx, ...prev];
    });

    // Persist to server API
    fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTx),
    }).catch(() => {});

    const sign = newTx.type === 'credit' ? '+' : '-';
    showToast(`Đã tự động thêm: ${sign}${formatVND(newTx.amount)} (${newTx.description})`);

    // Browser Notification API (displays system push notification even when on another tab / background)
    if (shouldNotify) {
      const cat = DEFAULT_CATEGORIES.find((c) => c.id === newTx.categoryId);
      showTransactionNotification({
        id: newTx.id,
        type: newTx.type === 'credit' ? 'income' : 'expense',
        amount: newTx.amount,
        description: newTx.description,
        categoryName: cat?.name,
        balance: newTx.balance,
      }).catch((err) => {
        console.warn('[Notification API] Failed to push notification:', err);
      });
    }
  }, [showToast]);

  // Save balance handler
  const handleSaveBalance = useCallback(
    (newBalance: number, reason: string, createTx: boolean) => {
      const current = latestBalance || 0;
      const diff = newBalance - current;
      setManualBalance(newBalance);

      if (createTx && diff !== 0) {
        const adjustTx: Transaction = {
          id: 'tx-bal-' + Date.now(),
          accountNumber: '1234567890',
          amount: Math.abs(diff),
          type: diff > 0 ? 'credit' : 'debit',
          balance: newBalance,
          timestamp: new Date().toISOString(),
          rawMessage: `[Điều chỉnh số dư] ${reason} - Số dư mới: ${newBalance.toLocaleString('vi-VN')} VND`,
          description: reason || 'Điều chỉnh số dư BIDV',
          categoryId: 'investment',
          categoryReason: 'Bút toán điều chỉnh / cập nhật số dư',
          confidence: 1.0,
          source: 'manual',
        };
        setTransactions((prev) => [adjustTx, ...prev]);
        fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(adjustTx),
        }).catch(() => {});
      }
      showToast(`Đã cập nhật số dư BIDV: ${formatVND(newBalance)}`);
    },
    [latestBalance, showToast]
  );

  // Update category handler
  const handleUpdateCategory = useCallback((txId: string, newCatId: CategoryId) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === txId ? { ...t, categoryId: newCatId, reviewed: true } : t))
    );
    fetch(`/api/transactions/${encodeURIComponent(txId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: newCatId, reviewed: true }),
    }).catch(() => {});
    showToast('Đã cập nhật danh mục chi tiêu');
  }, [showToast]);

  // Save / Edit complete transaction handler
  const handleSaveTransaction = useCallback((updatedTx: Transaction) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === updatedTx.id ? updatedTx : t))
    );
    fetch(`/api/transactions/${encodeURIComponent(updatedTx.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedTx),
    }).catch(() => {});
    showToast(`Đã lưu thay đổi: ${updatedTx.description}`);
  }, [showToast]);

  // Delete transaction handler
  const handleDeleteTransaction = useCallback((txId: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== txId));
    fetch(`/api/transactions/${encodeURIComponent(txId)}`, {
      method: 'DELETE',
    }).catch(() => {});
    showToast('Đã xóa giao dịch');
  }, [showToast]);

  // Add smart rule handler
  const handleAddRule = useCallback((keyword: string, categoryId: CategoryId) => {
    const newRule: SmartRule = {
      id: 'rule-' + Date.now(),
      keyword: keyword.trim(),
      categoryId,
      createdAt: new Date().toISOString(),
    };
    setRules((prev) => [newRule, ...prev]);
    showToast(`Đã lưu quy tắc: "${keyword}" → danh mục mới`);
  }, [showToast]);

  // Delete rule handler
  const handleDeleteRule = useCallback((ruleId: string) => {
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
  }, []);

  // Save updated budgets handler
  const handleSaveBudgets = useCallback((newBudgets: CategoryBudget[]) => {
    setBudgets(newBudgets);
    try {
      localStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(newBudgets));
    } catch (e) {
      console.error('Error saving budgets to localStorage:', e);
    }
    fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budgets: newBudgets }),
    }).catch((err) => console.warn('Could not save budgets to server:', err));

    showToast('Đã lưu hạn mức ngân sách tháng');
  }, [showToast]);

  // Export to CSV
  const handleExportData = () => {
    try {
      const headers = ['Mã GD', 'Tài khoản', 'Số tiền (VND)', 'Loại', 'Số dư', 'Thời gian', 'Nội dung', 'Đơn vị nhận', 'Danh mục', 'Lý do phân loại', 'Nguồn'];
      const rows = transactions.map((t) => [
        t.refNumber || t.id,
        t.accountNumber,
        t.amount,
        t.type,
        t.balance || '',
        t.timestamp,
        `"${t.description.replace(/"/g, '""')}"`,
        `"${(t.merchant || '').replace(/"/g, '""')}"`,
        t.categoryId,
        `"${(t.categoryReason || '').replace(/"/g, '""')}"`,
        t.source,
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `chi-tieu-bidv-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Đã tải xuống file CSV chi tiêu!');
    } catch (e) {
      console.error('Export error:', e);
      showToast('Lỗi khi xuất file');
    }
  };

  // Reset demo data
  const handleResetDemoData = () => {
    if (confirm('Bạn có chắc muốn đặt lại dữ liệu mẫu BIDV ban đầu?')) {
      setTransactions(INITIAL_TRANSACTIONS);
      showToast('Đã khôi phục dữ liệu mẫu BIDV');
    }
  };

  // State for server webhook connection
  const [serverWebhookCount, setServerWebhookCount] = useState<number>(0);
  const [isLiveStreamConnected, setIsLiveStreamConnected] = useState<boolean>(false);
  const processedEventIdsRef = React.useRef<Set<string>>(new Set());

  // Initialize processed IDs from existing transactions
  useEffect(() => {
    transactions.forEach((t) => {
      processedEventIdsRef.current.add(t.id);
      if (t.refNumber) processedEventIdsRef.current.add(t.refNumber);
    });
  }, []);

  // Helper to ingest and record incoming webhook item
  const processIncomingEventItem = useCallback(
    (evt: { id: string; text: string; source?: string }, isRealtime = false) => {
      const txId = 'tx-' + evt.id;
      if (
        processedEventIdsRef.current.has(txId) ||
        processedEventIdsRef.current.has(evt.id)
      ) {
        return false;
      }

      const parsed = parseBidvNotificationLocally(evt.text, rules);
      if (parsed.amount > 0) {
        if (parsed.refNumber && processedEventIdsRef.current.has(parsed.refNumber)) {
          processedEventIdsRef.current.add(txId);
          processedEventIdsRef.current.add(evt.id);
          return false;
        }

        processedEventIdsRef.current.add(txId);
        processedEventIdsRef.current.add(evt.id);
        if (parsed.refNumber) processedEventIdsRef.current.add(parsed.refNumber);

        const newTx: Transaction = {
          id: txId,
          accountNumber: parsed.accountNumber,
          amount: parsed.amount,
          type: parsed.isBidvDebit ? 'debit' : 'credit',
          balance: parsed.balance,
          timestamp: parsed.timestamp,
          rawMessage: evt.text,
          description: parsed.description,
          merchant: parsed.merchant,
          categoryId: parsed.suggestedCategoryId,
          categoryReason: parsed.isBidvDebit
            ? 'Tự động bắt từ thông báo BIDV: ' + parsed.reasoning
            : 'Tự động bắt từ thông báo BIDV: Tiền vào tài khoản',
          confidence: parsed.confidence,
          source: 'webhook',
          refNumber: parsed.refNumber,
          isAutoRecorded: true,
          reviewed: false,
        };

        handleAddTransaction(newTx);

        if (isRealtime) {
          playTransactionChime();
          showToast(
            `⚡ BIDV Live: Tự động ghi nhận ${parsed.isBidvDebit ? '-' : '+'}${formatVND(parsed.amount)} (${parsed.description || 'Giao dịch'})`
          );
        }

        return true;
      }
      return false;
    },
    [rules, handleAddTransaction, showToast]
  );

  // Stable ref to avoid duplicate clipboard reading
  const lastCheckedClipboardRef = useRef<string>('');

  // Auto-check Clipboard when user opens or returns to app
  const checkClipboardSilently = useCallback(async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) return;

      const clipText = await navigator.clipboard.readText();
      if (!clipText || !clipText.trim()) return;

      const trimmed = clipText.trim();
      if (trimmed === lastCheckedClipboardRef.current) return;

      // Check if text looks like a banking notification or message
      const isBankLike = /\b(?:bidv|smartbanking|giao dịch|giao dich|số dư|so du|số tiền|so tien|tk\s*\d+|vnd)\b/i.test(trimmed);
      if (!isBankLike) return;

      lastCheckedClipboardRef.current = trimmed;
      const parsed = parseBidvNotificationLocally(trimmed, rules);
      if (parsed.amount > 0) {
        setTransactions((prev) => {
          const alreadyExists = prev.some(
            (t) =>
              (parsed.refNumber && t.refNumber === parsed.refNumber) ||
              (t.amount === parsed.amount && t.rawMessage === trimmed)
          );
          if (alreadyExists) return prev;

          const newTx: Transaction = {
            id: 'tx-clip-auto-' + Date.now(),
            accountNumber: parsed.accountNumber,
            amount: parsed.amount,
            type: parsed.isBidvDebit ? 'debit' : 'credit',
            balance: parsed.balance,
            timestamp: parsed.timestamp,
            rawMessage: trimmed,
            description: parsed.description,
            merchant: parsed.merchant,
            categoryId: parsed.suggestedCategoryId,
            categoryReason: 'Tự động phát hiện thông báo khi mở app: ' + parsed.reasoning,
            confidence: parsed.confidence,
            source: 'sms_paste',
            refNumber: parsed.refNumber,
            isAutoRecorded: true,
            reviewed: false,
          };

          if (parsed.balance !== undefined && parsed.balance > 0) {
            setManualBalance(parsed.balance);
          }

          playTransactionChime();
          showToast(`📋 Tự động ghi nhận thông báo BIDV từ điện thoại: ${parsed.isBidvDebit ? '-' : '+'}${formatVND(parsed.amount)} (${parsed.description})`);

          // Push browser notification
          const cat = DEFAULT_CATEGORIES.find((c) => c.id === newTx.categoryId);
          showTransactionNotification({
            id: newTx.id,
            type: newTx.type === 'credit' ? 'income' : 'expense',
            amount: newTx.amount,
            description: newTx.description,
            categoryName: cat?.name,
            balance: newTx.balance,
          }).catch(() => {});

          // Sync to server
          fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTx),
          }).catch(() => {});

          return [newTx, ...prev];
        });
      }
    } catch {
      // Browser permissions or user not focused, silently ignore
    }
  }, [rules, showToast]);

  // Centralized sync function to pull all new transactions and events from server
  const syncServerData = useCallback(async (notifyIfNew = false) => {
    try {
      const [txRes, evtRes, budgetRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/webhook/events'),
        fetch('/api/budgets').catch(() => null),
      ]);

      if (budgetRes && budgetRes.ok) {
        try {
          const bData = await budgetRes.json();
          if (Array.isArray(bData.budgets) && bData.budgets.length > 0) {
            setBudgets((prev) => {
              const prevStr = JSON.stringify(prev);
              const nextStr = JSON.stringify(bData.budgets);
              if (prevStr === nextStr) return prev;
              return bData.budgets;
            });
          }
        } catch {}
      }

      if (txRes.ok) {
        const txData = await txRes.json();
        if (Array.isArray(txData.transactions) && txData.transactions.length > 0) {
          setTransactions((prev) => {
            const prevIds = new Set(prev.map((t) => t.id));
            const prevRefs = new Set(prev.filter((t) => t.refNumber).map((t) => t.refNumber));
            const toAdd: Transaction[] = [];

            for (const sTx of txData.transactions) {
              if (!prevIds.has(sTx.id) && (!sTx.refNumber || !prevRefs.has(sTx.refNumber))) {
                toAdd.push(sTx);
              }
            }

            if (toAdd.length > 0) {
              const newestWithBal = toAdd.find((t) => t.balance !== undefined);
              if (newestWithBal && newestWithBal.balance !== undefined) {
                setManualBalance(newestWithBal.balance);
              }
              if (notifyIfNew) {
                playTransactionChime();
                showToast(`⚡ Đã tự động cập nhật ${toAdd.length} giao dịch BIDV mới vào sổ chi tiêu!`);
                toAdd.slice(0, 3).forEach((tx) => {
                  const cat = DEFAULT_CATEGORIES.find((c) => c.id === tx.categoryId);
                  showTransactionNotification({
                    id: tx.id,
                    type: tx.type === 'credit' ? 'income' : 'expense',
                    amount: tx.amount,
                    description: tx.description,
                    categoryName: cat?.name,
                    balance: tx.balance,
                  }).catch(() => {});
                });
              }
              return [...toAdd, ...prev];
            }
            return prev;
          });
        }
      }

      if (evtRes.ok) {
        const evtData = await evtRes.json();
        if (typeof evtData.count === 'number') {
          setServerWebhookCount(evtData.count);
        }
        if (evtData.events && Array.isArray(evtData.events) && evtData.events.length > 0) {
          const eventsList = [...evtData.events].reverse();
          for (const evt of eventsList) {
            processIncomingEventItem(evt, false);
          }
        }
      }
    } catch (err) {
      console.warn('[Sync] Sync failed:', err);
    }
  }, [processIncomingEventItem, showToast]);

  // 1. Initial fetch & background polling every 3.5s
  useEffect(() => {
    syncServerData(false);

    const interval = setInterval(() => {
      syncServerData(false);
    }, 3500);

    return () => {
      clearInterval(interval);
    };
  }, [syncServerData]);

  // 2. Immediate auto-sync and auto-clipboard check whenever user opens or switches back to app
  useEffect(() => {
    const handleAppActive = () => {
      if (document.visibilityState === 'visible') {
        syncServerData(true);
        checkClipboardSilently();
      }
    };

    const handleFocus = () => {
      syncServerData(true);
      checkClipboardSilently();
    };

    document.addEventListener('visibilitychange', handleAppActive);
    window.addEventListener('focus', handleFocus);

    // Initial check on load
    checkClipboardSilently();

    return () => {
      document.removeEventListener('visibilitychange', handleAppActive);
      window.removeEventListener('focus', handleFocus);
    };
  }, [syncServerData, checkClipboardSilently]);

  // 3. Real-time instant push via Server-Sent Events (SSE)
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/webhook/stream');

      es.onopen = () => {
        setIsLiveStreamConnected(true);
      };

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'connected') {
            setIsLiveStreamConnected(true);
            if (typeof data.count === 'number') {
              setServerWebhookCount(data.count);
            }
          } else if (data.type === 'bidv_event' && data.event) {
            setServerWebhookCount((prev) => prev + 1);
            if (data.event.parsedData?.isTestPing) {
              playTransactionChime();
              showToast('🟢 Tuyệt vời! MacroDroid từ điện thoại vừa kết nối thành công tới phần mềm.');
            } else {
              if (data.transaction) {
                handleAddTransaction(data.transaction);
                playTransactionChime();
                showToast(
                  `⚡ BIDV Live: Tự động ghi nhận ${data.transaction.type === 'debit' ? '-' : '+'}${formatVND(data.transaction.amount)} (${data.transaction.merchant || data.transaction.description || 'Giao dịch'})`
                );
              } else {
                processIncomingEventItem(data.event, true);
              }
            }
          }
        } catch (err) {
          console.error('[SSE] Parse error:', err);
        }
      };

      es.onerror = () => {
        setIsLiveStreamConnected(false);
      };
    } catch {
      setIsLiveStreamConnected(false);
    }

    return () => {
      if (es) {
        es.close();
      }
    };
  }, [processIncomingEventItem]);

  // Auto-import via URL parameter (?auto_import=... or ?text=...)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const autoText =
        urlParams.get('bidv') ||
        urlParams.get('auto_import') ||
        urlParams.get('import') ||
        urlParams.get('text') ||
        urlParams.get('msg') ||
        urlParams.get('body') ||
        urlParams.get('notification') ||
        urlParams.get('not_body');
      if (autoText && autoText.trim()) {
        const decoded = decodeURIComponent(autoText.trim());
        const parsed = parseBidvNotificationLocally(decoded, rules);
        if (parsed.amount > 0) {
          const newTx: Transaction = {
            id: 'tx-url-' + Date.now(),
            accountNumber: parsed.accountNumber,
            amount: parsed.amount,
            type: parsed.isBidvDebit ? 'debit' : 'credit',
            balance: parsed.balance,
            timestamp: parsed.timestamp,
            rawMessage: decoded,
            description: parsed.description,
            merchant: parsed.merchant,
            categoryId: parsed.suggestedCategoryId,
            categoryReason: 'Tự động bóc tách từ thông báo BIDV: ' + parsed.reasoning,
            confidence: parsed.confidence,
            source: 'webhook',
            refNumber: parsed.refNumber,
          };
          handleAddTransaction(newTx);
          if (parsed.balance !== undefined && parsed.balance > 0) {
            setManualBalance(parsed.balance);
          }
          playTransactionChime();
          showToast(`⚡ Đã ghi sổ tự động: ${parsed.isBidvDebit ? '-' : '+'}${formatVND(parsed.amount)} • Số dư: ${formatVND(parsed.balance || 0)}`);
        }
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (e) {
      console.warn('URL auto_import error:', e);
    }
  }, [handleAddTransaction, rules, showToast]);

  // Sample real transactions from user's notifications for instant 1-tap add
  const userRealSampleText = `Thông báo BIDV\nThời gian giao dịch: 10:14 17/09/2026\nTài khoản thanh toán: 8832123271\nSố tiền GD: -10,000 VND\nSố dư cuối: 578,597 VND\nNội dung giao dịch: 8821702530 an uong\nMã giao dịch: 0392TzXK-8CBAkPtKO`;
  const isUserRealSampleAdded = transactions.some(
    (t) => t.refNumber === '0392TzXK-8CBAkPtKO' || (t.amount === 10000 && t.description.includes('an uong'))
  );

  const userLunchSampleText = `Thông báo BIDV\nThời gian giao dịch: 11:19 17/09/2026\nTài khoản thanh toán: 8832123271\nSố tiền GD: -10,000 VND\nSố dư cuối: 538,597 VND\nNội dung giao dịch: 8821702530 an com trua\nMã giao dịch: 039p9Qa-8CBF0805N`;
  const isUserLunchSampleAdded = transactions.some(
    (t) => t.refNumber === '039p9Qa-8CBF0805N' || (t.amount === 10000 && t.description.includes('an com trua'))
  );

  const [dismissedLunchSample, setDismissedLunchSample] = useState<boolean>(() => {
    return localStorage.getItem('bidv_dismiss_lunch_sample') === 'true';
  });
  const [dismissedRealSample, setDismissedRealSample] = useState<boolean>(() => {
    return localStorage.getItem('bidv_dismiss_real_sample') === 'true';
  });

  const handleDismissLunchSample = () => {
    setDismissedLunchSample(true);
    localStorage.setItem('bidv_dismiss_lunch_sample', 'true');
  };

  const handleDismissRealSample = () => {
    setDismissedRealSample(true);
    localStorage.setItem('bidv_dismiss_real_sample', 'true');
  };

  const handleAddUserSample = () => {
    handleDismissRealSample();
    const parsed = parseBidvNotificationLocally(userRealSampleText, rules);
    const newTx: Transaction = {
      id: 'tx-user-sample-' + Date.now(),
      accountNumber: parsed.accountNumber,
      amount: parsed.amount,
      type: 'debit',
      balance: parsed.balance,
      timestamp: parsed.timestamp,
      rawMessage: userRealSampleText,
      description: parsed.description,
      merchant: parsed.merchant,
      categoryId: parsed.suggestedCategoryId,
      categoryReason: 'Bóc tách từ thông báo BIDV: ' + parsed.reasoning,
      confidence: 0.99,
      source: 'webhook',
      refNumber: parsed.refNumber,
    };
    handleAddTransaction(newTx);
    showToast('Đã thêm giao dịch trừ 10.000 đ (an uong) vào danh mục Ăn uống!');
  };

  const handleAddLunchSample = () => {
    handleDismissLunchSample();
    const parsed = parseBidvNotificationLocally(userLunchSampleText, rules);
    const newTx: Transaction = {
      id: 'tx-lunch-sample-' + Date.now(),
      accountNumber: parsed.accountNumber,
      amount: parsed.amount,
      type: 'debit',
      balance: parsed.balance,
      timestamp: parsed.timestamp,
      rawMessage: userLunchSampleText,
      description: parsed.description,
      merchant: parsed.merchant,
      categoryId: parsed.suggestedCategoryId,
      categoryReason: 'Bóc tách từ thông báo BIDV: ' + parsed.reasoning,
      confidence: 0.99,
      source: 'webhook',
      refNumber: parsed.refNumber,
    };
    handleAddTransaction(newTx);
    showToast('Đã thêm giao dịch ăn cơm trưa 10.000 đ vào danh mục Ăn uống! (Số dư: 538.597đ)');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navbar */}
      <Navbar
        latestBalance={latestBalance}
        totalSpentMonth={totalSpentMonth}
        notifPermission={notifPermission}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onOpenSettings={handleOpenSettings}
        onOpenManualAdd={() => setIsManualAddOpen(true)}
        onExportData={handleExportData}
        autoProcessCount={transactions.filter((t) => t.source === 'sms_paste' || t.source === 'webhook').length}
        onOpenBalanceModal={() => setIsBalanceModalOpen(true)}
        onOpenMonthlyReport={() => setIsMonthlyReportOpen(true)}
        onOpenWebhook={() => handleOpenSettings('webhook')}
        onOpenRules={() => handleOpenSettings('rules')}
        onOpenBudget={() => handleOpenSettings('budget')}
        onOpenPWAInstall={() => handleOpenSettings('pwa')}
      />

      {/* Optional Notification Opt-in Bar (Shown if permission is still 'default' and not dismissed) */}
      {showNotifBanner && notifPermission === 'default' && (
        <div className="bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-amber-500/10 border-b border-emerald-200/80 px-3 sm:px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-slate-800 min-w-0">
              <span className="p-1 rounded-md bg-emerald-100 text-emerald-800 shrink-0">
                <BellRing className="w-4 h-4 animate-bounce" />
              </span>
              <span className="truncate sm:whitespace-normal">
                <strong>Bật thông báo đẩy BIDV:</strong> Nhận thông báo tức thì khi có biến động số dư mới ngay cả khi chuyển tab hoặc ẩn ứng dụng.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleEnableNotificationsFromBanner}
                className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                Bật Thông Báo
              </button>
              <button
                type="button"
                onClick={handleDismissNotifBanner}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
                title="Đóng thanh thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* User BIDV Lunch notification prompt card (11:19 - an com trua) */}
        {!isUserLunchSampleAdded && !dismissedLunchSample && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-extrabold flex items-center justify-center shrink-0 text-xs shadow-2xs">
                BIDV
              </div>
              <div className="text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-950 text-sm">
                    Thông báo mới (11:19): -10,000 VND (8821702530 an com trua)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-200 text-emerald-900 uppercase">
                    Ảnh chụp màn hình
                  </span>
                </div>
                <span className="text-slate-600 text-[11px] block mt-0.5">
                  Thời gian: 11:19 17/09/2026 • TK: 8832123271 • Số dư cuối: 538,597 VND • Mã GD: 039p9Qa-8CBF0805N
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                onClick={handleAddLunchSample}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-xl shadow-2xs transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                + Ghi nhận vào sổ ngay (538.597đ)
              </button>
              <button
                type="button"
                onClick={handleDismissLunchSample}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-emerald-100/70 active:bg-emerald-200/70 rounded-xl transition-colors cursor-pointer"
                title="Tắt thông báo này"
                aria-label="Tắt thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* User BIDV notification prompt card */}
        {!isUserRealSampleAdded && !dismissedRealSample && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 border border-amber-200 text-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-extrabold flex items-center justify-center shrink-0 text-xs shadow-2xs">
                BIDV
              </div>
              <div className="text-xs">
                <span className="font-bold text-amber-950 text-sm block">
                  Thông báo biến động BIDV: -10,000 VND (8821702530 an uong)
                </span>
                <span className="text-slate-600 text-[11px]">
                  Thời gian: 10:14 17/09/2026 • TK: 8832123271 • Số dư cuối: 578,597 VND
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                onClick={handleAddUserSample}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 rounded-xl shadow-2xs transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                + Ghi nhận vào sổ ngay
              </button>
              <button
                type="button"
                onClick={handleDismissRealSample}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-amber-100/70 active:bg-amber-200/70 rounded-xl transition-colors cursor-pointer"
                title="Tắt thông báo này"
                aria-label="Tắt thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Financial Metrics & Category Progress */}
        <ExpenseOverview
          transactions={transactions}
          budgets={budgets}
          latestBalance={latestBalance}
          onOpenBudgetModal={() => handleOpenSettings('budget')}
          onOpenBalanceModal={() => setIsBalanceModalOpen(true)}
          onOpenMonthlyReportModal={() => setIsMonthlyReportOpen(true)}
        />

        {/* Charts & Analytics */}
        <ExpenseCharts transactions={transactions} />

        {/* Transaction History & Filterable Ledger */}
        <TransactionList
          transactions={transactions}
          onUpdateCategory={handleUpdateCategory}
          onDeleteTransaction={handleDeleteTransaction}
          onSaveTransaction={handleSaveTransaction}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
          onOpenMonthlyReportModal={() => setIsMonthlyReportOpen(true)}
          onOpenSimulator={() => {
            setSimulatorInitialText(undefined);
            setIsSimulatorOpen(true);
          }}
        />
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Hệ thống quản lý chi tiêu tự động qua thông báo ngân hàng BIDV</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleResetDemoData}
              className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Đặt lại dữ liệu mẫu
            </button>
            <span>•</span>
            <button
              onClick={handleExportData}
              className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Xuất dữ liệu Excel/CSV
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {/* Master Unified Settings Modal */}
      <UnifiedSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsActiveTab}
        budgets={budgets}
        onSaveBudgets={handleSaveBudgets}
        currentSpentMonth={totalSpentMonth}
        onReceiveWebhookTransaction={handleAddTransaction}
        isLiveStreamConnected={isLiveStreamConnected}
        serverWebhookCount={serverWebhookCount}
        rules={rules}
        onAddRule={handleAddRule}
        onDeleteRule={handleDeleteRule}
        latestBalance={latestBalance}
        onUpdateBalance={handleSaveBalance}
        onExportData={handleExportData}
        onResetDemoData={handleResetDemoData}
        onShowToast={showToast}
      />

      <NotificationSimulator
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onAddTransaction={handleAddTransaction}
        userRules={rules}
        initialText={simulatorInitialText}
      />

      <WebhookIntegrationModal
        isOpen={isWebhookOpen}
        onClose={() => setIsWebhookOpen(false)}
        onReceiveWebhookTransaction={handleAddTransaction}
      />

      <CategoryRulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
        rules={rules}
        onAddRule={handleAddRule}
        onDeleteRule={handleDeleteRule}
      />

      <BudgetSettingsModal
        isOpen={isBudgetOpen}
        onClose={() => setIsBudgetOpen(false)}
        budgets={budgets}
        onSaveBudgets={handleSaveBudgets}
        currentSpentMonth={totalSpentMonth}
      />

      <ManualAddModal
        isOpen={isManualAddOpen}
        onClose={() => setIsManualAddOpen(false)}
        onAddTransaction={handleAddTransaction}
      />

      <BalanceUpdateModal
        isOpen={isBalanceModalOpen}
        onClose={() => setIsBalanceModalOpen(false)}
        currentBalance={latestBalance}
        onSaveBalance={handleSaveBalance}
        onOpenSimulator={() => {
          setSimulatorInitialText(undefined);
          setIsSimulatorOpen(true);
        }}
      />

      <MonthlyReportModal
        isOpen={isMonthlyReportOpen}
        onClose={() => setIsMonthlyReportOpen(false)}
        transactions={transactions}
        onSelectMonth={(monthKey) => {
          setSelectedMonth(monthKey);
        }}
      />

      <PWAInstallModal
        isOpen={isPWAInstallOpen}
        onClose={() => setIsPWAInstallOpen(false)}
        onShowToast={showToast}
      />

      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-medium shadow-lg border border-slate-800">
            <BellRing className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
