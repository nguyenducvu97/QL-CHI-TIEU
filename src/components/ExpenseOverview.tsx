import React from 'react';
import {
  TrendingDown,
  Wallet,
  Target,
  Sparkles,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { CategoryBudget, CategoryId, Transaction } from '../types';
import { DEFAULT_CATEGORIES, getCategoryById } from '../data/categories';
import { formatVND } from '../utils/bidvParser';
import { CategoryIcon } from './CategoryIcon';

interface ExpenseOverviewProps {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  latestBalance?: number;
  onOpenBudgetModal: () => void;
  onOpenBalanceModal: () => void;
  onOpenMonthlyReportModal?: () => void;
}

export const ExpenseOverview: React.FC<ExpenseOverviewProps> = ({
  transactions,
  budgets,
  latestBalance,
  onOpenBudgetModal,
  onOpenBalanceModal,
  onOpenMonthlyReportModal,
}) => {
  // Only calculate expenses and income for current month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const currentMonthDebitTxs = transactions.filter((t) => {
    if (t.type !== 'debit') return false;
    const d = new Date(t.timestamp);
    return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const currentMonthCreditTxs = transactions.filter((t) => {
    if (t.type !== 'credit') return false;
    const d = new Date(t.timestamp);
    return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalSpent = currentMonthDebitTxs.reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = currentMonthCreditTxs.reduce((sum, t) => sum + t.amount, 0);

  // Group by category
  const categorySpentMap = new Map<CategoryId, number>();
  for (const t of currentMonthDebitTxs) {
    categorySpentMap.set(t.categoryId, (categorySpentMap.get(t.categoryId) || 0) + t.amount);
  }

  // Calculate total monthly budget
  const totalBudget = budgets.reduce((sum, b) => sum + b.monthlyLimit, 0);
  const budgetPercent = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

  // Find top categories nearing or exceeding budget
  const budgetAlerts = budgets
    .map((b) => {
      const spent = categorySpentMap.get(b.categoryId) || 0;
      const ratio = b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0;
      const cat = getCategoryById(b.categoryId);
      return {
        category: cat,
        spent,
        limit: b.monthlyLimit,
        ratio,
        isOver: ratio >= 100,
        isWarning: ratio >= 80 && ratio < 100,
      };
    })
    .filter((item) => item.spent > 0)
    .sort((a, b) => b.ratio - a.ratio);

  const autoCount = transactions.filter((t) => t.source === 'sms_paste' || t.source === 'webhook').length;

  return (
    <div className="space-y-4">
      {/* 4 Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Spent */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Chi tiêu T{currentMonth + 1}/{currentYear}
            </span>
            {onOpenMonthlyReportModal ? (
              <button
                onClick={onOpenMonthlyReportModal}
                className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Xem lịch sử chi tiêu theo tháng"
              >
                <TrendingDown className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            )}
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
              {formatVND(totalSpent)}
            </span>
            {onOpenMonthlyReportModal && (
              <button
                onClick={onOpenMonthlyReportModal}
                className="text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
              >
                Xem các tháng
              </button>
            )}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>{currentMonthDebitTxs.length} giao dịch trừ</span>
            {totalIncome > 0 && (
              <span className="text-emerald-600 font-medium font-mono">
                Thu: +{formatVND(totalIncome)}
              </span>
            )}
          </div>
        </div>

        {/* BIDV Available Balance */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs group relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Số dư tài khoản BIDV
            </span>
            <button
              onClick={onOpenBalanceModal}
              className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Nhấn để cập nhật / điều chỉnh số dư"
            >
              <Wallet className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-800 font-mono tracking-tight">
              {latestBalance !== undefined ? formatVND(latestBalance) : '--- ₫'}
            </span>
            <button
              onClick={onOpenBalanceModal}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
            >
              Cập nhật
            </button>
          </div>
          <div className="mt-1 flex items-center text-xs text-emerald-600 font-medium">
            <CheckCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
            <span>Tự động theo SMS / Điều chỉnh thủ công</span>
          </div>
        </div>

        {/* Total Budget Target */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Ngân sách tháng
            </span>
            <button
              onClick={onOpenBudgetModal}
              className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg font-medium transition-colors cursor-pointer"
              title="Bấm để cấu hình và cài đặt hạn mức chi tiêu"
            >
              <Target className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cài đặt</span>
            </button>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
              {budgetPercent}%
            </span>
            <span className="text-xs text-slate-500 font-mono">
              / {formatVND(totalBudget)}
            </span>
          </div>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                budgetPercent >= 100
                  ? 'bg-red-500'
                  : budgetPercent >= 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, budgetPercent)}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              {totalBudget >= totalSpent ? (
                <>Còn lại: <strong className="text-emerald-700 font-mono font-semibold">{formatVND(totalBudget - totalSpent)}</strong></>
              ) : (
                <>Đã vượt: <strong className="text-red-600 font-mono font-semibold">{formatVND(totalSpent - totalBudget)}</strong></>
              )}
            </span>
            <button
              onClick={onOpenBudgetModal}
              className="text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
            >
              Điều chỉnh ✎
            </button>
          </div>
        </div>

        {/* Auto Sync Count */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tự động hóa BIDV
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
              {autoCount}
            </span>
          </div>
          <div className="mt-1 flex items-center text-xs text-teal-700">
            <span>Đã tự động phân loại danh mục</span>
          </div>
        </div>
      </div>

      {/* Category Budget Progress Mini Bars */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Theo dõi hạn mức theo danh mục (T9/2026)
            </h3>
          </div>
          <button
            onClick={onOpenBudgetModal}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
          >
            Điều chỉnh hạn mức
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {budgetAlerts.slice(0, 6).map((item) => {
            const pct = Math.round(item.ratio);
            return (
              <div
                key={item.category.id}
                className={`p-3 rounded-xl border transition-all ${
                  item.isOver
                    ? 'bg-red-50/40 border-red-200'
                    : item.isWarning
                    ? 'bg-amber-50/40 border-amber-200'
                    : 'bg-slate-50/60 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <CategoryIcon
                      categoryId={item.category.id}
                      className="w-3.5 h-3.5"
                      style={{ color: item.category.color }}
                    />
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {item.category.name}
                    </span>
                  </div>
                  {item.isOver && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      Vượt hạn mức
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between text-xs mb-1">
                  <span className="font-bold text-slate-900 font-mono">
                    {formatVND(item.spent)}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    / {formatVND(item.limit)} ({pct}%)
                  </span>
                </div>

                <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      item.isOver
                        ? 'bg-red-500'
                        : item.isWarning
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
