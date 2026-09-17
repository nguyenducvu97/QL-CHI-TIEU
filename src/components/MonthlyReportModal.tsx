import React, { useMemo } from 'react';
import {
  X,
  Calendar,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  PieChart,
  BarChart3,
  Wallet,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { CategoryId, Transaction } from '../types';
import { DEFAULT_CATEGORIES, getCategoryById } from '../data/categories';
import { formatVND } from '../utils/bidvParser';
import { CategoryIcon } from './CategoryIcon';

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onSelectMonth: (monthKey: string) => void;
}

export interface MonthData {
  key: string; // "2026-09"
  label: string; // "Tháng 09/2026"
  year: number;
  month: number; // 0-11
  totalDebit: number;
  totalCredit: number;
  netSaving: number;
  debitCount: number;
  creditCount: number;
  topCategory?: {
    id: CategoryId;
    name: string;
    amount: number;
  };
  categorySpend: { id: CategoryId; amount: number; percent: number }[];
}

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  onSelectMonth,
}) => {
  // Aggregate transactions by month
  const monthlyStats = useMemo(() => {
    const monthMap = new Map<string, {
      key: string;
      year: number;
      month: number;
      totalDebit: number;
      totalCredit: number;
      debitCount: number;
      creditCount: number;
      catMap: Map<CategoryId, number>;
    }>();

    for (const t of transactions) {
      const d = new Date(t.timestamp);
      if (isNaN(d.getTime())) continue;

      const year = d.getFullYear();
      const month = d.getMonth(); // 0-11
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;

      if (!monthMap.has(key)) {
        monthMap.set(key, {
          key,
          year,
          month,
          totalDebit: 0,
          totalCredit: 0,
          debitCount: 0,
          creditCount: 0,
          catMap: new Map<CategoryId, number>(),
        });
      }

      const mData = monthMap.get(key)!;
      if (t.type === 'debit') {
        mData.totalDebit += t.amount;
        mData.debitCount += 1;
        mData.catMap.set(t.categoryId, (mData.catMap.get(t.categoryId) || 0) + t.amount);
      } else {
        mData.totalCredit += t.amount;
        mData.creditCount += 1;
      }
    }

    // Sort descending by year-month
    const sortedKeys = Array.from(monthMap.keys()).sort().reverse();

    const result: MonthData[] = sortedKeys.map((k) => {
      const item = monthMap.get(k)!;
      const monthNum = item.month + 1;
      const label = `Tháng ${String(monthNum).padStart(2, '0')}/${item.year}`;

      // Calculate category spend list
      const catSpendList: { id: CategoryId; amount: number; percent: number }[] = [];
      let topCat: { id: CategoryId; name: string; amount: number } | undefined = undefined;
      let maxCatAmount = 0;

      item.catMap.forEach((amount, catId) => {
        const percent = item.totalDebit > 0 ? Math.round((amount / item.totalDebit) * 100) : 0;
        catSpendList.push({ id: catId, amount, percent });
        if (amount > maxCatAmount) {
          maxCatAmount = amount;
          const catInfo = getCategoryById(catId);
          topCat = { id: catId, name: catInfo.name, amount };
        }
      });

      catSpendList.sort((a, b) => b.amount - a.amount);

      return {
        key: k,
        label,
        year: item.year,
        month: item.month,
        totalDebit: item.totalDebit,
        totalCredit: item.totalCredit,
        netSaving: item.totalCredit - item.totalDebit,
        debitCount: item.debitCount,
        creditCount: item.creditCount,
        topCategory: topCat,
        categorySpend: catSpendList,
      };
    });

    return result;
  }, [transactions]);

  // Overall totals across all recorded months
  const overallTotals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    for (const m of monthlyStats) {
      debit += m.totalDebit;
      credit += m.totalCredit;
    }
    return {
      debit,
      credit,
      net: credit - debit,
      count: monthlyStats.length,
    };
  }, [monthlyStats]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Lịch Sử Chi Tiêu & Tổng Chi Tiêu Theo Tháng
              </h2>
              <p className="text-xs text-slate-500">
                Theo dõi và so sánh chi tiêu (tiền trừ) và thu nhập (tiền cộng) qua từng tháng
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body - Scrollable */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-red-100 bg-red-50/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">
                  Tổng chi tiêu ({overallTotals.count} tháng)
                </span>
                <TrendingDown className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-xl font-bold font-mono text-red-700 mt-2">
                -{formatVND(overallTotals.debit)}
              </p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                  Tổng tiền cộng / thu vào
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl font-bold font-mono text-emerald-700 mt-2">
                +{formatVND(overallTotals.credit)}
              </p>
            </div>

            <div
              className={`p-4 rounded-xl border ${
                overallTotals.net >= 0
                  ? 'border-teal-100 bg-teal-50/40'
                  : 'border-amber-100 bg-amber-50/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Thặng dư ròng toàn bộ
                </span>
                <Wallet className="w-4 h-4 text-slate-600" />
              </div>
              <p
                className={`text-xl font-bold font-mono mt-2 ${
                  overallTotals.net >= 0 ? 'text-teal-700' : 'text-amber-700'
                }`}
              >
                {overallTotals.net >= 0 ? '+' : '-'}
                {formatVND(Math.abs(overallTotals.net))}
              </p>
            </div>
          </div>

          {/* List of Months */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Chi Tiết Từng Tháng Ghi Nhận
              </h3>
              <span className="text-xs text-slate-500">
                {monthlyStats.length} kỳ sao kê tháng
              </span>
            </div>

            {monthlyStats.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
                <p className="text-xs text-slate-500">Chưa có dữ liệu giao dịch tháng nào.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {monthlyStats.map((m) => {
                  const hasIncome = m.totalCredit > 0;
                  const savingRate =
                    hasIncome && m.totalCredit > 0
                      ? Math.round((m.netSaving / m.totalCredit) * 100)
                      : null;

                  return (
                    <div
                      key={m.key}
                      className="p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all bg-white"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base font-bold text-slate-900">
                            {m.label}
                          </span>
                          {m.netSaving >= 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                              Dư +{formatVND(m.netSaving)}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                              Bội chi -{formatVND(Math.abs(m.netSaving))}
                            </span>
                          )}
                          {savingRate !== null && (
                            <span className="text-[11px] text-slate-500 hidden sm:inline">
                              (Dư {savingRate}% thu nhập)
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            onSelectMonth(m.key);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 transition-colors cursor-pointer self-start sm:self-auto"
                        >
                          Xem chi tiết tháng này
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Numbers Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 text-xs">
                        <div>
                          <span className="text-slate-400 block">Tổng chi tiêu:</span>
                          <span className="font-bold text-sm text-red-600 font-mono block mt-0.5">
                            -{formatVND(m.totalDebit)}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {m.debitCount} giao dịch trừ
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block">Tiền vào / Cộng:</span>
                          <span className="font-bold text-sm text-emerald-600 font-mono block mt-0.5">
                            +{formatVND(m.totalCredit)}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {m.creditCount} giao dịch cộng
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block">Chênh lệch (Dư/Thiếu):</span>
                          <span
                            className={`font-bold text-sm font-mono block mt-0.5 ${
                              m.netSaving >= 0 ? 'text-teal-700' : 'text-rose-600'
                            }`}
                          >
                            {m.netSaving >= 0 ? '+' : '-'}
                            {formatVND(Math.abs(m.netSaving))}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {m.netSaving >= 0 ? 'Tiết kiệm dương' : 'Chi vượt thu'}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block">Chi nhiều nhất:</span>
                          {m.topCategory ? (
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span className="font-semibold text-slate-800 truncate">
                                {m.topCategory.name}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                ({formatVND(m.topCategory.amount)})
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 mt-0.5 block">Không có</span>
                          )}
                        </div>
                      </div>

                      {/* Top Category Spending Progress Bar */}
                      {m.categorySpend.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                            <span className="text-[11px] font-medium text-slate-400 shrink-0">
                              Phân bổ:
                            </span>
                            {m.categorySpend.slice(0, 5).map((cs) => {
                              const c = getCategoryById(cs.id);
                              return (
                                <span
                                  key={cs.id}
                                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md shrink-0 border"
                                  style={{
                                    backgroundColor: c.bgColor,
                                    borderColor: c.borderColor,
                                    color: c.color,
                                  }}
                                >
                                  <CategoryIcon categoryId={cs.id} className="w-3 h-3" />
                                  <span className="font-medium">{c.name}</span>
                                  <span className="font-mono font-bold text-[10px]">
                                    {cs.percent}%
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
