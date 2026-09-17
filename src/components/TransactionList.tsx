import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Trash2,
  Eye,
  ArrowDownRight,
  Smartphone,
  Zap,
  Tag,
  Check,
  Calendar,
  Wallet,
} from 'lucide-react';
import { CategoryId, Transaction } from '../types';
import { DEFAULT_CATEGORIES, getCategoryById } from '../data/categories';
import { formatVND, formatDateTime } from '../utils/bidvParser';
import { CategoryIcon } from './CategoryIcon';

interface TransactionListProps {
  transactions: Transaction[];
  onUpdateCategory: (txId: string, newCatId: CategoryId) => void;
  onDeleteTransaction: (txId: string) => void;
  onOpenSimulator: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onUpdateCategory,
  onDeleteTransaction,
  onOpenSimulator,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<CategoryId | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'webhook' | 'sms_paste' | 'manual'>('all');
  const [inspectTx, setInspectTx] = useState<Transaction | null>(null);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Category filter
      if (selectedCategoryFilter !== 'all' && t.categoryId !== selectedCategoryFilter) {
        return false;
      }
      // Source filter
      if (sourceFilter !== 'all' && t.source !== sourceFilter) {
        return false;
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
  }, [transactions, selectedCategoryFilter, sourceFilter, searchTerm]);

  const filteredTotal = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Sổ Chi Tiêu Tự Động Từ BIDV
            </h2>
            <p className="text-xs text-slate-500">
              {filteredTransactions.length} giao dịch • Tổng cộng:{' '}
              <span className="font-mono font-bold text-red-600">
                -{formatVND(filteredTotal)}
              </span>
            </p>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search-transactions"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm nội dung, merchant, tiền..."
              className="w-full text-xs rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden bg-slate-50/50"
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
            return (
              <div
                key={tx.id}
                className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Left: Category Icon & Details */}
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                    style={{
                      backgroundColor: cat.bgColor,
                      borderColor: cat.borderColor,
                      color: cat.color,
                    }}
                  >
                    <CategoryIcon categoryId={tx.categoryId} className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-900 truncate">
                        {tx.merchant || tx.description}
                      </span>

                      {/* Source badge */}
                      {tx.source === 'webhook' && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded border border-teal-200">
                          <Smartphone className="w-2.5 h-2.5" />
                          Webhook
                        </span>
                      )}
                      {tx.source === 'sms_paste' && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                          <Zap className="w-2.5 h-2.5" />
                          BIDV SMS
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {tx.description}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                      <span>{formatDateTime(tx.timestamp)}</span>
                      <span>•</span>
                      <span>TK BIDV: {tx.accountNumber}</span>
                      {tx.categoryReason && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 font-medium truncate max-w-[200px]">
                            {tx.categoryReason}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Quick Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pl-13 sm:pl-0">
                  {/* Category Dropdown Selector */}
                  <div className="relative">
                    <select
                      value={tx.categoryId}
                      onChange={(e) => onUpdateCategory(tx.id, e.target.value as CategoryId)}
                      className="text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-lg px-2 py-1 outline-hidden cursor-pointer"
                      title="Nhấn để đổi danh mục"
                    >
                      {DEFAULT_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <span className="font-bold text-base font-mono text-red-600 block">
                      -{formatVND(tx.amount)}
                    </span>
                    {tx.balance !== undefined && (
                      <span className="text-[10px] text-slate-400 font-mono block">
                        Dư: {formatVND(tx.balance)}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setInspectTx(tx)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Xem tin nhắn BIDV gốc"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteTransaction(tx.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Xóa giao dịch"
                    >
                      <Trash2 className="w-4 h-4" />
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
              Không có giao dịch nào khớp với bộ lọc. Hãy dán thông báo BIDV mới hoặc thử các mẫu có sẵn.
            </p>
            <button
              onClick={onOpenSimulator}
              className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              Dán thông báo BIDV ngay
            </button>
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
                className="text-slate-400 hover:text-slate-600 text-xs p-1 rounded-lg"
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
                  <span className="text-slate-500 block">Số tiền trừ</span>
                  <span className="font-bold text-red-600 text-sm font-mono">
                    -{formatVND(inspectTx.amount)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Danh mục tự động</span>
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

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-right">
              <button
                onClick={() => setInspectTx(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
