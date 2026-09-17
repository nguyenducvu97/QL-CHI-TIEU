import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  Smartphone,
  SlidersHorizontal,
  Download,
  PlusCircle,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  BellRing,
  RotateCcw,
  Sparkles,
  Copy,
} from 'lucide-react';
import { CategoryBudget, CategoryId, SmartRule, Transaction } from './types';
import { DEFAULT_CATEGORIES } from './data/categories';
import { INITIAL_TRANSACTIONS, SAMPLE_BIDV_MESSAGES } from './data/mockBidvData';
import { parseBidvNotificationLocally, formatVND } from './utils/bidvParser';
import { playTransactionChime } from './utils/sound';
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
  const handleAddTransaction = useCallback((newTx: Transaction) => {
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
  const [quickPasteText, setQuickPasteText] = useState<string>('');
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

  // Initial fetch of transactions persisted on server
  useEffect(() => {
    const fetchPersistedTransactions = async () => {
      try {
        const res = await fetch('/api/transactions');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.transactions) && data.transactions.length > 0) {
            setTransactions((prev) => {
              const prevIds = new Set(prev.map((t) => t.id));
              const prevRefs = new Set(prev.filter((t) => t.refNumber).map((t) => t.refNumber));
              const toAdd: Transaction[] = [];
              for (const sTx of data.transactions) {
                if (!prevIds.has(sTx.id) && (!sTx.refNumber || !prevRefs.has(sTx.refNumber))) {
                  toAdd.push(sTx);
                }
              }
              return toAdd.length > 0 ? [...toAdd, ...prev] : prev;
            });
          }
        }
      } catch (err) {
        console.warn('[Sync] Could not fetch server transactions:', err);
      }
    };
    fetchPersistedTransactions();
  }, []);

  // 1. Real-time instant push via Server-Sent Events (SSE)
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

  // 2. Periodic background sync fallback (every 3.5s)
  useEffect(() => {
    let isMounted = true;

    const fetchAndProcessEvents = async () => {
      try {
        const res = await fetch('/api/webhook/events');
        if (!res.ok) return;
        const data = await res.json();

        if (typeof data.count === 'number' && isMounted) {
          setServerWebhookCount(data.count);
        }

        if (data.events && Array.isArray(data.events) && data.events.length > 0) {
          // Process from oldest to newest
          const eventsList = [...data.events].reverse();
          for (const evt of eventsList) {
            processIncomingEventItem(evt, false);
          }
        }
      } catch {
        // Silently ignore polling network glitches
      }
    };

    fetchAndProcessEvents();
    const interval = setInterval(fetchAndProcessEvents, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [processIncomingEventItem]);

  // Handle Quick Paste from banner
  const handleQuickPasteSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickPasteText.trim()) return;

    const parsed = parseBidvNotificationLocally(quickPasteText, rules);
    if (parsed.amount > 0) {
      const newTx: Transaction = {
        id: 'tx-quick-' + Date.now(),
        accountNumber: parsed.accountNumber,
        amount: parsed.amount,
        type: parsed.isBidvDebit ? 'debit' : 'credit',
        balance: parsed.balance,
        timestamp: parsed.timestamp,
        rawMessage: quickPasteText,
        description: parsed.description,
        merchant: parsed.merchant,
        categoryId: parsed.suggestedCategoryId,
        categoryReason: parsed.reasoning,
        confidence: parsed.confidence,
        source: 'sms_paste',
        refNumber: parsed.refNumber,
      };
      handleAddTransaction(newTx);
      setQuickPasteText('');
      showToast(`Đã nhận diện: ${parsed.isBidvDebit ? '-' : '+'}${formatVND(parsed.amount)} (${parsed.description})`);
    } else {
      setSimulatorInitialText(quickPasteText);
      setIsSimulatorOpen(true);
      setQuickPasteText('');
    }
  };

  // Instant 1-tap read from system Clipboard
  const handleReadFromClipboard = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        showToast('Trình duyệt chưa cấp quyền clipboard. Bạn có thể bấm dán thủ công.');
        return;
      }
      const clipText = await navigator.clipboard.readText();
      if (!clipText || !clipText.trim()) {
        showToast('Bộ nhớ tạm (Clipboard) của bạn đang trống');
        return;
      }

      const parsed = parseBidvNotificationLocally(clipText, rules);
      if (parsed.amount > 0) {
        const newTx: Transaction = {
          id: 'tx-clip-' + Date.now(),
          accountNumber: parsed.accountNumber,
          amount: parsed.amount,
          type: parsed.isBidvDebit ? 'debit' : 'credit',
          balance: parsed.balance,
          timestamp: parsed.timestamp,
          rawMessage: clipText,
          description: parsed.description,
          merchant: parsed.merchant,
          categoryId: parsed.suggestedCategoryId,
          categoryReason: 'Đọc tự động từ Clipboard: ' + parsed.reasoning,
          confidence: parsed.confidence,
          source: 'sms_paste',
          refNumber: parsed.refNumber,
        };
        handleAddTransaction(newTx);
        playTransactionChime();
        showToast(`⚡ Đã nhận từ Clipboard: ${parsed.isBidvDebit ? '-' : '+'}${formatVND(parsed.amount)} (${parsed.description})`);
      } else {
        setQuickPasteText(clipText);
        showToast('Đã dán văn bản từ Clipboard vào ô nhập');
      }
    } catch (err) {
      console.warn('Clipboard read error:', err);
      showToast('Vui lòng cho phép trình duyệt truy cập Clipboard');
    }
  };

  // Auto-import via URL parameter (?auto_import=... or ?text=...)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const autoText = urlParams.get('auto_import') || urlParams.get('import') || urlParams.get('text');
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
            categoryReason: 'Tự động bóc tách từ thông báo URL: ' + parsed.reasoning,
            confidence: parsed.confidence,
            source: 'webhook',
            refNumber: parsed.refNumber,
          };
          handleAddTransaction(newTx);
          playTransactionChime();
          showToast(`⚡ Tự động thêm từ thông báo: ${parsed.isBidvDebit ? '-' : '+'}${formatVND(parsed.amount)} (${parsed.description})`);
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

  const handleAddUserSample = () => {
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
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onOpenWebhook={() => setIsWebhookOpen(true)}
        onOpenRules={() => setIsRulesOpen(true)}
        onOpenBudget={() => setIsBudgetOpen(true)}
        onOpenManualAdd={() => setIsManualAddOpen(true)}
        onExportData={handleExportData}
        autoProcessCount={transactions.filter((t) => t.source === 'sms_paste' || t.source === 'webhook').length}
        onOpenBalanceModal={() => setIsBalanceModalOpen(true)}
        onOpenMonthlyReport={() => setIsMonthlyReportOpen(true)}
        onOpenPWAInstall={() => setIsPWAInstallOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Quick BIDV Notification Input Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className={`w-2 h-2 rounded-full ${isLiveStreamConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                  <span>{isLiveStreamConnected ? 'Tự Động Bắt Biến Động BIDV: Real-time Kích Hoạt' : 'Tự Động Bắt Biến Động BIDV'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWebhookOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 transition-colors cursor-pointer"
                  title="Bấm để xem nhật ký nhận tin MacroDroid"
                >
                  <Smartphone className="w-3 h-3 text-emerald-400" />
                  <span>Webhook: {serverWebhookCount > 0 ? `Đã nhận ${serverWebhookCount} tin` : 'Đang chờ tin'}</span>
                </button>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                Tự Động Ghi Sổ Chi Tiêu Khi BIDV Báo Biến Động Số Dư
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Mỗi khi điện thoại nhận thông báo trừ tiền/cộng tiền từ BIDV SmartBanking, hệ thống tự động bóc tách số tiền, người nhận, danh mục chi tiêu và thêm vào sổ ngay lập tức kèm chuông thông báo.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                id="hero-btn-open-webhook"
                onClick={() => setIsWebhookOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                Cài Đặt Điện Thoại Đẩy Tin
              </button>

              <button
                id="hero-btn-open-simulator"
                onClick={() => setIsSimulatorOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white/15 text-white rounded-xl border border-white/15 transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4 text-emerald-400" />
                Dán & Thử Nghiệm
              </button>

              <button
                id="hero-btn-open-pwa"
                onClick={() => setIsPWAInstallOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold bg-emerald-950/60 hover:bg-emerald-950 text-emerald-300 rounded-xl border border-emerald-500/30 transition-all cursor-pointer"
                title="Đưa ứng dụng ra màn hình chính điện thoại như App thật"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                Cài App Ra Màn Hình
              </button>
            </div>
          </div>

          {/* Inline Quick Paste input inside hero */}
          <div className="mt-4 pt-3.5 border-t border-white/10">
            <form onSubmit={handleQuickPasteSubmit} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={quickPasteText}
                onChange={(e) => setQuickPasteText(e.target.value)}
                placeholder="Dán nhanh thông báo trừ tiền BIDV vào đây (VD: Thời gian GD... Số tiền GD: -10,000 VND)..."
                className="flex-1 text-xs px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white placeholder-slate-400 outline-hidden focus:border-emerald-400 transition-all"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleReadFromClipboard}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-white/15 hover:bg-white/25 text-white rounded-xl border border-white/20 transition-colors cursor-pointer"
                  title="Tự động đọc tin nhắn vừa sao chép từ điện thoại"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Đọc Clipboard</span>
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Ghi sổ ngay
                </button>
              </div>
            </form>
          </div>

          {/* Quick sample chips */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] text-slate-400 font-medium shrink-0">Thử nhanh mẫu:</span>
            {SAMPLE_BIDV_MESSAGES.slice(0, 4).map((sample, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSimulatorInitialText(sample.text);
                  setIsSimulatorOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[11px] font-medium shrink-0 transition-colors cursor-pointer"
              >
                <span>{sample.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* User BIDV Lunch notification prompt card (11:19 - an com trua) */}
        {!isUserLunchSampleAdded && (
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
            </div>
          </div>
        )}

        {/* User BIDV notification prompt card */}
        {!isUserRealSampleAdded && (
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
            </div>
          </div>
        )}

        {/* Financial Metrics & Category Progress */}
        <ExpenseOverview
          transactions={transactions}
          budgets={budgets}
          latestBalance={latestBalance}
          onOpenBudgetModal={() => setIsBudgetOpen(true)}
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
