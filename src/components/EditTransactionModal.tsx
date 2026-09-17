import React, { useState, useEffect } from 'react';
import { Edit3, Check, Trash2, X, Smartphone, Zap, HelpCircle } from 'lucide-react';
import { CategoryId, Transaction } from '../types';
import { DEFAULT_CATEGORIES } from '../data/categories';
import { CategoryIcon } from './CategoryIcon';
import { formatVND, formatDateTime } from '../utils/bidvParser';

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onSave: (updatedTx: Transaction) => void;
  onDelete?: (id: string) => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onSave,
  onDelete,
}) => {
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [categoryId, setCategoryId] = useState<CategoryId>('food');
  const [type, setType] = useState<'debit' | 'credit'>('debit');
  const [reviewed, setReviewed] = useState(true);

  useEffect(() => {
    if (transaction) {
      setAmountStr(transaction.amount.toString());
      setDescription(transaction.description || '');
      setMerchant(transaction.merchant || '');
      setCategoryId(transaction.categoryId);
      setType(transaction.type);
      setReviewed(transaction.reviewed ?? true);
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseInt(amountStr.replace(/[^\d]/g, ''), 10) || 0;
    if (cleanAmount <= 0) return;

    const updated: Transaction = {
      ...transaction,
      amount: cleanAmount,
      type,
      description: description.trim() || transaction.description,
      merchant: merchant.trim() || undefined,
      categoryId,
      reviewed: true,
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Kiểm Tra & Chỉnh Sửa
                </h2>
                {transaction.source === 'webhook' && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-200 flex items-center gap-0.5">
                    <Smartphone className="w-2.5 h-2.5" />
                    Tự động BIDV
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Chỉnh sửa danh mục, số tiền hoặc ghi chú giao dịch
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Amount & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số tiền (VND)
              </label>
              <input
                type="text"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="50000"
                className="w-full text-sm font-bold font-mono px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-hidden bg-slate-50"
                required
              />
              {parseInt(amountStr, 10) > 0 && (
                <span className="text-[11px] text-teal-600 font-medium mt-0.5 block">
                  ≈ {formatVND(parseInt(amountStr, 10))}
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Loại giao dịch
              </label>
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setType('debit')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    type === 'debit'
                      ? 'bg-white text-red-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  - Chi tiền
                </button>
                <button
                  type="button"
                  onClick={() => setType('credit')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    type === 'credit'
                      ? 'bg-white text-emerald-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  + Thu vào
                </button>
              </div>
            </div>
          </div>

          {/* Category Selector Grid */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Danh mục chi tiêu
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {DEFAULT_CATEGORIES.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50/70 ring-1 ring-teal-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: cat.bgColor, color: cat.color }}
                    >
                      <CategoryIcon categoryId={cat.id} className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nội dung chuyển khoản / Ghi chú
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Cà phê với bạn, Tiền điện..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-hidden bg-slate-50"
              required
            />
          </div>

          {/* Merchant (optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Đơn vị nhận / Cửa hàng (tùy chọn)
            </label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="VD: Highlands Coffee, Shopee, Petrolimex..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-hidden bg-slate-50"
            />
          </div>

          {/* Raw BIDV text reference */}
          {transaction.rawMessage && (
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                <span>Tin nhắn gốc từ BIDV</span>
                <span>{formatDateTime(transaction.timestamp)}</span>
              </div>
              <p className="font-mono text-slate-700 line-clamp-3 select-all bg-white p-2 rounded border border-slate-200">
                {transaction.rawMessage}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
            {onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Bạn có chắc muốn xóa giao dịch này khỏi sổ?')) {
                    onDelete(transaction.id);
                    onClose();
                  }
                }}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa giao dịch</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
