import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Trash2,
  Eye,
  ArrowDownRight,
  ArrowUpRight,
  Smartphone,
  Zap,
  Tag,
  Check,
  Calendar,
  Wallet,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  TrendingDown,
  TrendingUp,
  SlidersHorizontal,
  Edit3,
  Clock,
  FileText,
  Hash,
} from 'lucide-react';
import { CategoryId, Transaction } from '../types';
import { DEFAULT_CATEGORIES, getCategoryById } from '../data/categories';
import { formatVND, formatDateTime } from '../utils/bidvParser';
import { CategoryIcon } from './CategoryIcon';
import { EditTransactionModal } from './EditTransactionModal';

interface TransactionListProps {
  transactions: Transaction[];
  onUpdateCategory: (txId: string, newCatId: CategoryId) => void;
  onDeleteTransaction: (txId: string) => void;
  onSaveTransaction?: (updatedTx: Transaction) => void;
  onOpenSimulator: () => void;
  selectedMonth: string; // 'all' or 'YYYY-MM'
  onSelectMonth: (monthKey: string) => void;
  onOpenMonthlyReportModal: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onUpdateCategory,
  onDeleteTransaction,
  onSaveTransaction,
  onOpenSimulator,
  selectedMonth,
  onSelectMonth,
  onOpenMonthlyReportModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<CategoryId | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'webhook' | 'sms_paste' | 'manual'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'debit' | 'credit'>('all');
  const [inspectTx, setInspectTx] = useState<Transaction | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

  // Extract all unique months available in transactions
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      const d = new Date(t.timestamp);
      if (!isNaN(d.getTime())) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        set.add(key);
      }
    }
    const sorted = Array.from(set).sort().reverse();
    return sorted.map((key) => {
      const [y, m] = key.split('-');
      return {
        key,
        label: `Tháng ${m}/${y}`,
        shortLabel: `T${parseInt(m, 10)}/${y}`,
      };
    });
  }, [transactions]);

  // Navigate to previous or next month
  const handleStepMonth = (direction: 'prev' | 'next') => {
    if (availableMonths.length === 0) return;
    if (selectedMonth === 'all') {
      if (direction === 'prev' && availableMonths.length > 0) {
        onSelectMonth(availableMonths[0].key);
      }
      return;
    }
    const idx = availableMonths.findIndex((m) => m.key === selectedMonth);
    if (idx === -1) {
      onSelectMonth(availableMonths[0].key);
      return;
    }
    if (direction === 'next' && idx > 0) {
      onSelectMonth(availableMonths[idx - 1].key);
    } else if (direction === 'prev' && idx < availableMonths.length - 1) {
      onSelectMonth(availableMonths[idx + 1].key);
    }
  };

  // Month-level totals (for the selected month or all)
  const monthStats = useMemo(() => {
    const monthTxs = transactions.filter((t) => {
      if (selectedMonth === 'all') return true;
      const d = new Date(t.timestamp);
      if (isNaN(d.getTime())) return false;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return key === selectedMonth;
    });

    let totalDebit = 0;
    let totalCredit = 0;
    let debitCount = 0;
    let creditCount = 0;

    for (const t of monthTxs) {
      if (t.type === 'debit') {
        totalDebit += t.amount;
        debitCount += 1;
      } else {
        totalCredit += t.amount;
        creditCount += 1;
      }
    }

    return {
      totalDebit,
      totalCredit,
      net: totalCredit - totalDebit,
      debitCount,
      creditCount,
      totalCount: monthTxs.length,
    };
  }, [transactions, selectedMonth]);

  const autoRecordedCount = useMemo(() => {
    return transactions.filter((t) => t.source === 'webhook' || t.isAutoRecorded).length;
  }, [transactions]);

  // Filtered transactions considering all search, month, type, category, and source filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Month filter
      if (selectedMonth !== 'all') {
        const d = new Date(t.timestamp);
        if (isNaN(d.getTime())) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key !== selectedMonth) return false;
      }

      // Type filter (debit vs credit)
      if (typeFilter !== 'all' && t.type !== typeFilter) {
        return false;
      }

      // Category filter
      if (selectedCategoryFilter !== 'all' && t.categoryId !== selectedCategoryFilter) {
        return false;
      }

      // Source filter
      if (sourceFilter !== 'all') {
        if (sourceFilter === 'webhook') {
          if (t.source !== 'webhook' && !t.isAutoRecorded) return false;
        } else if (t.source !== sourceFilter) {
          return false;
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchDesc = t.description.toLowerCase().includes(query);
        const matchMerchant = t.merchant?.toLowerCase().includes(query);
        const matchRef = t.refNumber?.toLowerCase().includes(query);
        const matchRaw = t.rawMessage.toLowerCase().includes(query);
        const matchAmount = t.amount.toString().includes(query);
        if (!matchDesc && !matchMerchant && !matchRef && !matchRaw && !matchAmount) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, selectedMonth, typeFilter, selectedCategoryFilter, sourceFilter, searchTerm]);

  // Active month label
  const activeMonthLabel = useMemo(() => {
    if (selectedMonth === 'all') return 'Tất cả các tháng';
    const found = availableMonths.find((m) => m.key === selectedMonth);
    return found ? found.label : selectedMonth;
  }, [selectedMonth, availableMonths]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Month Selector & Controls Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Sổ Chi Tiêu Tự Động Từ BIDV</span>
            </h2>
            <p className="text-xs text-slate-500">
              Ghi nhận đầy đủ biến động trừ tiền (chi tiêu) & cộng tiền (thu nhập)
            </p>
          </div>

          {/* Month Selector Bar + Monthly Summary Button */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Month Pager */}
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50/80 p-0.5 shadow-2xs">
              <button
                onClick={() => handleStepMonth('prev')}
                title="Tháng trước"
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={selectedMonth}
                onChange={(e) => onSelectMonth(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent px-2 py-1 outline-hidden cursor-pointer border-none"
              >
                <option value="all">📅 Tất cả các tháng</option>
                {availableMonths.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => handleStepMonth('next')}
                title="Tháng sau"
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* View Monthly Report Modal Button */}
            <button
              onClick={onOpenMonthlyReportModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl transition-colors shadow-2xs cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
              Báo Cáo Từng Tháng
            </button>
          </div>
        </div>

        {/* Monthly Summary Statistics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
          <div>
            <div className="flex items-center gap-1 text-slate-500 text-[11px]">
              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              <span>Tổng chi ({activeMonthLabel}):</span>
            </div>
            <span className="text-sm sm:text-base font-bold font-mono text-red-600 block mt-0.5">
              -{formatVND(monthStats.totalDebit)}
            </span>
            <span className="text-[10px] text-slate-400 block">
              {monthStats.debitCount} giao dịch trừ
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1 text-slate-500 text-[11px]">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tổng cộng tiền vào:</span>
            </div>
            <span className="text-sm sm:text-base font-bold font-mono text-emerald-600 block mt-0.5">
              +{formatVND(monthStats.totalCredit)}
            </span>
            <span className="text-[10px] text-slate-400 block">
              {monthStats.creditCount} giao dịch cộng
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1 text-slate-500 text-[11px]">
              <Wallet className="w-3.5 h-3.5 text-slate-600" />
              <span>Chênh lệch thu - chi:</span>
            </div>
            <span
              className={`text-sm sm:text-base font-bold font-mono block mt-0.5 ${
                monthStats.net >= 0 ? 'text-teal-700' : 'text-rose-600'
              }`}
            >
              {monthStats.net >= 0 ? '+' : '-'}
              {formatVND(Math.abs(monthStats.net))}
            </span>
            <span className="text-[10px] text-slate-400 block">
              {monthStats.net >= 0 ? 'Tiết kiệm dương' : 'Bội chi tháng'}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1 text-slate-500 text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-slate-600" />
              <span>Kỳ sao kê:</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800 block mt-0.5 truncate">
              {activeMonthLabel}
            </span>
            <span className="text-[10px] text-slate-400 block">
              {monthStats.totalCount} biến động ghi nhận
            </span>
          </div>
        </div>

        {/* 100% Automated BIDV Ingestion Banner */}
        <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-cyan-500/10 border border-teal-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 sm:mt-0">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  ⚡ Tự động ghi sổ 100% từ thông báo BIDV
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Đang hoạt động tự động
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5">
                Mỗi khi điện thoại nhận biến động số dư BIDV SmartBanking, hệ thống tự động bóc tách số tiền và ghi vào thu/chi ngay lập tức. Bạn chỉ việc vào kiểm tra lại và chỉnh sửa danh mục khi cần!
              </p>
            </div>
          </div>
          {autoRecordedCount > 0 && (
            <button
              type="button"
              onClick={() => {
                if (sourceFilter === 'webhook') {
                  setSourceFilter('all');
                } else {
                  setSourceFilter('webhook');
                  setTypeFilter('all');
                }
              }}
              className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                sourceFilter === 'webhook'
                  ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                  : 'bg-white text-teal-700 hover:bg-teal-50 border-teal-200'
              }`}
            >
              ⚡ Lọc {autoRecordedCount} GD tự động
            </button>
          )}
        </div>

        {/* Filter Controls: Search, Debit/Credit Type Tabs, Source */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Type Tabs (Tất cả / Chi tiêu - / Cộng tiền + / Tự động) */}
          <div className="grid grid-cols-2 sm:flex items-center p-1 rounded-xl bg-slate-100 text-xs font-semibold shrink-0 w-full sm:w-auto gap-1 sm:gap-0">
            <button
              onClick={() => {
                setTypeFilter('all');
                setSourceFilter('all');
              }}
              className={`px-2 sm:px-3 py-1.5 sm:py-1 rounded-lg transition-all cursor-pointer text-center truncate ${
                typeFilter === 'all' && sourceFilter !== 'webhook'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({monthStats.totalCount})
            </button>
            <button
              onClick={() => {
                setTypeFilter('debit');
                setSourceFilter('all');
              }}
              className={`inline-flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-1 rounded-lg transition-all cursor-pointer text-center truncate ${
                typeFilter === 'debit' && sourceFilter !== 'webhook'
                  ? 'bg-red-500 text-white shadow-2xs'
                  : 'text-red-700 hover:bg-red-50'
              }`}
            >
              <TrendingDown className="w-3 h-3 shrink-0" />
              <span className="truncate">Chi (-{monthStats.debitCount})</span>
            </button>
            <button
              onClick={() => {
                setTypeFilter('credit');
                setSourceFilter('all');
              }}
              className={`inline-flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-1 rounded-lg transition-all cursor-pointer text-center truncate ${
                typeFilter === 'credit' && sourceFilter !== 'webhook'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <TrendingUp className="w-3 h-3 shrink-0" />
              <span className="truncate">Thu (+{monthStats.creditCount})</span>
            </button>
            <button
              onClick={() => {
                if (sourceFilter === 'webhook') {
                  setSourceFilter('all');
                } else {
                  setSourceFilter('webhook');
                  setTypeFilter('all');
                }
              }}
              className={`inline-flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-1 rounded-lg transition-all cursor-pointer text-center truncate ${
                sourceFilter === 'webhook'
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'text-teal-700 hover:bg-teal-50'
              }`}
            >
              <Zap className="w-3 h-3 shrink-0 text-amber-400" />
              <span className="truncate">⚡ Tự động ({autoRecordedCount})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search-transactions"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm nội dung, merchant, tiền..."
              className="w-full text-xs rounded-xl border border-slate-200 pl-9 pr-3 py-1.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden bg-slate-50/50"
            />
          </div>
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategoryFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              selectedCategoryFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả danh mục
          </button>
          {DEFAULT_CATEGORIES.map((cat) => {
            const isSelected = selectedCategoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryFilter(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'text-white shadow-2xs'
                    : 'bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100'
                }`}
                style={{
                  backgroundColor: isSelected ? cat.color : undefined,
                }}
              >
                <CategoryIcon
                  categoryId={cat.id}
                  className="w-3 h-3"
                  style={{ color: isSelected ? '#ffffff' : cat.color }}
                />
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transactions Table / List */}
      <div className="divide-y divide-slate-100">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((tx) => {
            const cat = getCategoryById(tx.categoryId);
            const isCredit = tx.type === 'credit';

            return (
              <div
                key={tx.id}
                className="p-3.5 sm:p-4 hover:bg-slate-50/70 transition-colors flex flex-col gap-2.5"
              >
                {/* Top Row: Left (Icon + Merchant + Badges) | Right (Amount + Balance) */}
                <div className="flex items-start justify-between gap-2.5">
                  {/* Left: Icon & Merchant */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs"
                      style={{
                        backgroundColor: isCredit ? '#ecfdf5' : cat.bgColor,
                        borderColor: isCredit ? '#a7f3d0' : cat.borderColor,
                        color: isCredit ? '#059669' : cat.color,
                      }}
                    >
                      {isCredit ? (
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <CategoryIcon categoryId={tx.categoryId} className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 truncate max-w-[150px] sm:max-w-xs">
                          {tx.merchant || tx.description}
                        </span>

                        {/* Credit vs Debit Badge */}
                        {isCredit ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                            <ArrowUpRight className="w-2.5 h-2.5" />
                            + CỘNG TIỀN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                            <ArrowDownRight className="w-2.5 h-2.5 text-red-500" />
                            Chi tiêu
                          </span>
                        )}

                        {/* Source & Automation badge */}
                        {(tx.source === 'webhook' || tx.isAutoRecorded) ? (
                          <>
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded border border-teal-200 shrink-0">
                              <Zap className="w-2.5 h-2.5 text-amber-500 fill-amber-400" />
                              Tự động BIDV
                            </span>
                            {tx.reviewed ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                                Đã kiểm tra
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSaveTransaction?.({ ...tx, reviewed: true });
                                }}
                                className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 shrink-0 transition-colors cursor-pointer"
                                title="Bấm để xác nhận đã kiểm tra giao dịch này"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                Chưa kiểm tra
                              </button>
                            )}
                          </>
                        ) : tx.source === 'sms_paste' ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                            <Zap className="w-2.5 h-2.5" />
                            BIDV SMS
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount (Always prominent in top corner) */}
                  <div className="text-right shrink-0">
                    <span
                      className={`font-extrabold text-base sm:text-lg font-mono block tracking-tight ${
                        isCredit ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {isCredit ? '+' : '-'}
                      {formatVND(tx.amount)}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      {isCredit ? 'Tiền vào' : 'Số tiền GD'}
                    </span>
                  </div>
                </div>

                {/* Middle Box: Prominently displaying Nội dung, Thời gian, Số tiền thừa/Số dư cuối, Mã GD */}
                <div className="sm:ml-12.5 rounded-xl bg-slate-50/80 border border-slate-200/70 p-2.5 sm:p-3 space-y-2">
                  {/* 1. Nội dung giao dịch */}
                  <div className="flex items-start gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Nội dung giao dịch
                      </span>
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 break-words">
                        {tx.description}
                      </p>
                    </div>
                  </div>

                  {/* 2. Key Data Badges: Thời gian, Số dư cuối (Số tiền thừa), Mã GD, TK */}
                  <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-200/50 text-[11px]">
                    {/* Thời gian giao dịch */}
                    <span className="inline-flex items-center gap-1 font-medium text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{formatDateTime(tx.timestamp)}</span>
                    </span>

                    {/* Số dư cuối / Số tiền thừa */}
                    {tx.balance !== undefined && (
                      <span className="inline-flex items-center gap-1 font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/80 shadow-2xs">
                        <Wallet className="w-3 h-3 text-teal-600 shrink-0" />
                        <span>Số dư cuối (tiền thừa): <strong className="font-mono text-teal-950">{formatVND(tx.balance)}</strong></span>
                      </span>
                    )}

                    {/* Tài khoản BIDV */}
                    <span className="inline-flex items-center gap-1 text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                      <span>TK:</span>
                      <strong className="font-mono text-slate-700">{tx.accountNumber}</strong>
                    </span>

                    {/* Mã giao dịch */}
                    {tx.refNumber && (
                      <span className="inline-flex items-center gap-1 text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                        <Hash className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>Mã GD:</span>
                        <strong className="font-mono text-slate-700">{tx.refNumber}</strong>
                      </span>
                    )}

                    {/* Phân loại tự động */}
                    {tx.categoryReason && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        • {tx.categoryReason}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Category Selector & Full Touch Action Buttons */}
                <div className="sm:pl-12.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  {/* Category Dropdown Selector */}
                  <div className="relative flex-1 min-w-[130px] max-w-full sm:max-w-xs">
                    <select
                      value={tx.categoryId}
                      onChange={(e) => onUpdateCategory(tx.id, e.target.value as CategoryId)}
                      className="w-full text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-hidden cursor-pointer truncate"
                      title="Nhấn để đổi danh mục"
                    >
                      {DEFAULT_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quick Action Buttons (Edit, Eye & Trash) */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    <button
                      type="button"
                      onClick={() => setEditingTx(tx)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 active:bg-teal-200 border border-teal-200 rounded-lg transition-all cursor-pointer shadow-2xs"
                      title="Kiểm tra và sửa đổi chi tiết giao dịch"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>Sửa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectTx(tx)}
                      className="inline-flex items-center justify-center p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg transition-colors cursor-pointer"
                      title="Xem tin nhắn BIDV gốc"
                      aria-label="Xem tin nhắn gốc"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTxToDelete(tx);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 active:bg-red-200 border border-red-200 rounded-lg transition-all cursor-pointer shadow-2xs"
                      title="Xóa giao dịch này khỏi sổ chi tiêu"
                      aria-label="Xóa giao dịch"
                    >
                      <Trash2 className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Không tìm thấy giao dịch nào</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Không có giao dịch nào khớp với bộ lọc tháng & danh mục đang chọn. Hãy chọn tháng khác hoặc dán thông báo BIDV mới.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              {selectedMonth !== 'all' && (
                <button
                  onClick={() => onSelectMonth('all')}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Xem tất cả các tháng
                </button>
              )}
              <button
                onClick={onOpenSimulator}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                Dán thông báo BIDV ngay
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Raw SMS Modal */}
      {inspectTx && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                Chi Tiết Thông Báo Gốc BIDV
              </h3>
              <button
                onClick={() => setInspectTx(null)}
                className="text-slate-400 hover:text-slate-600 text-xs p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <span className="font-semibold text-slate-500 block mb-1">
                  Nội dung thông báo gốc (SMS / OTT):
                </span>
                <div className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed whitespace-pre-wrap select-all">
                  {inspectTx.rawMessage}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">
                    {inspectTx.type === 'credit' ? 'Số tiền cộng' : 'Số tiền trừ'}
                  </span>
                  <span
                    className={`font-bold text-sm font-mono ${
                      inspectTx.type === 'credit' ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {inspectTx.type === 'credit' ? '+' : '-'}
                    {formatVND(inspectTx.amount)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Danh mục</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {getCategoryById(inspectTx.categoryId).name}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Thời gian giao dịch</span>
                  <span className="font-medium text-slate-800">
                    {formatDateTime(inspectTx.timestamp)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Số tài khoản BIDV</span>
                  <span className="font-medium text-slate-800 font-mono">
                    {inspectTx.accountNumber}
                  </span>
                </div>
              </div>

              {inspectTx.categoryReason && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200">
                  <span className="font-bold block">Quy tắc phân loại:</span>
                  <span>{inspectTx.categoryReason}</span>
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const toDel = inspectTx;
                  setInspectTx(null);
                  setTxToDelete(toDel);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 active:bg-red-200 border border-red-200 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa giao dịch này
              </button>
              <button
                type="button"
                onClick={() => setInspectTx(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Xác nhận xóa giao dịch?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Giao dịch này sẽ bị xóa khỏi danh sách và số liệu báo cáo sẽ được cập nhật lại.
                  </p>
                </div>
              </div>

              {/* Transaction Summary Card */}
              <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-500 shrink-0">Giao dịch:</span>
                  <span className="font-bold text-slate-800 truncate text-right">
                    {txToDelete.merchant || txToDelete.description}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Số tiền:</span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      txToDelete.type === 'credit' ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {txToDelete.type === 'credit' ? '+' : '-'}
                    {formatVND(txToDelete.amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Thời gian:</span>
                  <span className="text-slate-700">{formatDateTime(txToDelete.timestamp)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Danh mục:</span>
                  <span className="font-medium text-slate-800">
                    {getCategoryById(txToDelete.categoryId).name}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setTxToDelete(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const idToDelete = txToDelete.id;
                    setTxToDelete(null);
                    onDeleteTransaction(idToDelete);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Edit Transaction Modal */}
      <EditTransactionModal
        isOpen={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
        transaction={editingTx}
        onSave={(updated) => {
          onSaveTransaction?.(updated);
          setEditingTx(null);
        }}
        onDelete={(id) => {
          onDeleteTransaction(id);
          setEditingTx(null);
        }}
      />
    </div>
  );
};
