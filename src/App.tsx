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
} from 'lucide-react';
import { CategoryBudget, CategoryId, SmartRule, Transaction } from './types';
import { DEFAULT_CATEGORIES } from './data/categories';
import { INITIAL_TRANSACTIONS, SAMPLE_BIDV_MESSAGES } from './data/mockBidvData';
import { parseBidvNotificationLocally, formatVND } from './utils/bidvParser';
import { Navbar } from './components/Navbar';
import { NotificationSimulator } from './components/NotificationSimulator';
import { WebhookIntegrationModal } from './components/WebhookIntegrationModal';
import { CategoryRulesModal } from './components/CategoryRulesModal';
import { BudgetSettingsModal } from './components/BudgetSettingsModal';
import { ManualAddModal } from './components/ManualAddModal';
import { BalanceUpdateModal } from './components/BalanceUpdateModal';
import { MonthlyReportModal } from './components/MonthlyReportModal';
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
    setTransactions((prev) => [newTx, ...prev]);
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
      }
      showToast(`Đã cập nhật số dư BIDV: ${formatVND(newBalance)}`);
    },
    [latestBalance, showToast]
  );

  // Update category handler
  const handleUpdateCategory = useCallback((txId: string, newCatId: CategoryId) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === txId ? { ...t, categoryId: newCatId } : t))
    );
    showToast('Đã cập nhật danh mục chi tiêu');
  }, [showToast]);

  // Delete transaction handler
  const handleDeleteTransaction = useCallback((txId: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== txId));
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

  // Poll for background incoming webhook events from Android
  useEffect(() => {
    let lastSeenId = '';
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/webhook/events');
        if (!res.ok) return;
        const data = await res.json();
        if (data.events && data.events.length > 0) {
          const newest = data.events[0];
          if (newest && newest.id !== lastSeenId) {
            lastSeenId = newest.id;
            // Check if already in transactions
            const exists = transactions.some((t) => t.id === 'tx-' + newest.id);
            if (!exists) {
              const parsed = parseBidvNotificationLocally(newest.text, rules);
              if (parsed.amount > 0) {
                const newTx: Transaction = {
                  id: 'tx-' + newest.id,
                  accountNumber: parsed.accountNumber,
                  amount: parsed.amount,
                  type: parsed.isBidvDebit ? 'debit' : 'credit',
                  balance: parsed.balance,
                  timestamp: parsed.timestamp,
                  rawMessage: newest.text,
                  description: parsed.description,
                  merchant: parsed.merchant,
                  categoryId: parsed.suggestedCategoryId,
                  categoryReason: parsed.isBidvDebit
                    ? 'Tự động bắt qua Webhook: ' + parsed.reasoning
                    : 'Tự động bắt qua Webhook: Giao dịch cộng tiền vào BIDV',
                  confidence: parsed.confidence,
                  source: 'webhook',
                  refNumber: parsed.refNumber,
                };
                handleAddTransaction(newTx);
              }
            }
          }
        }
      } catch (err) {
        // silently ignore polling errors
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [transactions, rules, handleAddTransaction]);

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
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Quick BIDV Notification Input Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                Tự động nhận diện biến động số dư BIDV
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                Có tin nhắn trừ tiền từ BIDV?
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Dán SMS Banking hoặc thông báo SmartBanking để hệ thống tự động bóc tách số tiền, người nhận và gán danh mục ngay lập tức.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                id="hero-btn-open-simulator"
                onClick={() => setIsSimulatorOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                Dán & Phân Tích Thông Báo
              </button>

              <button
                id="hero-btn-open-webhook"
                onClick={() => setIsWebhookOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white/15 text-white rounded-xl border border-white/15 transition-all cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-emerald-400" />
                Kết Nối Webhook Tự Động
              </button>
            </div>
          </div>

          {/* Quick sample chips */}
          <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
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
