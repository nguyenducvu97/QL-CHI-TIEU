import React, { useState } from 'react';
import { PlusCircle, Check } from 'lucide-react';
import { CategoryId, Transaction } from '../types';
import { DEFAULT_CATEGORIES } from '../data/categories';
import { CategoryIcon } from './CategoryIcon';

interface ManualAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (tx: Transaction) => void;
}

export const ManualAddModal: React.FC<ManualAddModalProps> = ({
  isOpen,
  onClose,
  onAddTransaction,
}) => {
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [categoryId, setCategoryId] = useState<CategoryId>('food');
  const [accountNumber, setAccountNumber] = useState('1234567890');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseInt(amountStr.replace(/[^\d]/g, ''), 10) || 0;
    if (cleanAmount <= 0 || !description.trim()) return;

    const newTx: Transaction = {
      id: 'tx-m-' + Date.now(),
      accountNumber: accountNumber.trim() || 'Tiền mặt',
      amount: cleanAmount,
      type: 'debit',
      timestamp: new Date().toISOString(),
      rawMessage: `[Nhập thủ công] ${description} - ${cleanAmount.toLocaleString('vi-VN')} VND`,
      description: description.trim(),
      merchant: merchant.trim() || undefined,
      categoryId,
      categoryReason: 'Thêm thủ công',
      confidence: 1.0,
      source: 'manual',
    };

    onAddTransaction(newTx);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Thêm Chi Tiêu Thủ Công
              </h2>
              <p className="text-xs text-slate-500">
                Ghi nhận các khoản chi tiêu tiền mặt hoặc tài khoản khác
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Số tiền chi (VND) *
            </label>
            <input
              type="text"
              required
              value={amountStr}
              onChange={(e) => {
                const num = e.target.value.replace(/[^\d]/g, '');
                setAmountStr(num ? parseInt(num, 10).toLocaleString('vi-VN') : '');
              }}
              placeholder="Ví dụ: 50,000"
              className="w-full text-base font-bold font-mono rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Nội dung chi tiêu *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ví dụ: Ăn trưa bún bò, Mua quà sinh nhật..."
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Đơn vị nhận / Cửa hàng (tùy chọn)
            </label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Ví dụ: Quán Bún Bò Huế O Xuân..."
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Danh mục chi tiêu
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_CATEGORIES.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl border transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900 font-semibold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CategoryIcon
                      categoryId={cat.id}
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: cat.color }}
                    />
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Tài khoản / Nguồn tiền
            </label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="1234567890 (BIDV) hoặc Tiền mặt"
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Lưu Chi Tiêu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
