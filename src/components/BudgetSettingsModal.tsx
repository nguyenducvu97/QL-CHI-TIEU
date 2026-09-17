import React, { useState } from 'react';
import { Target, Check, RotateCcw } from 'lucide-react';
import { CategoryBudget, CategoryId } from '../types';
import { DEFAULT_CATEGORIES, getCategoryById } from '../data/categories';
import { formatVND } from '../utils/bidvParser';
import { CategoryIcon } from './CategoryIcon';

interface BudgetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgets: CategoryBudget[];
  onSaveBudgets: (newBudgets: CategoryBudget[]) => void;
}

export const BudgetSettingsModal: React.FC<BudgetSettingsModalProps> = ({
  isOpen,
  onClose,
  budgets,
  onSaveBudgets,
}) => {
  const [localBudgets, setLocalBudgets] = useState<Record<CategoryId, number>>(() => {
    const record: Partial<Record<CategoryId, number>> = {};
    for (const b of budgets) {
      record[b.categoryId] = b.monthlyLimit;
    }
    return record as Record<CategoryId, number>;
  });

  if (!isOpen) return null;

  const handleChangeLimit = (catId: CategoryId, valueStr: string) => {
    const clean = valueStr.replace(/[^\d]/g, '');
    const num = parseInt(clean, 10) || 0;
    setLocalBudgets((prev) => ({
      ...prev,
      [catId]: num,
    }));
  };

  const handleResetDefaults = () => {
    const record: Partial<Record<CategoryId, number>> = {};
    for (const cat of DEFAULT_CATEGORIES) {
      record[cat.id] = cat.defaultBudget;
    }
    setLocalBudgets(record as Record<CategoryId, number>);
  };

  const handleSave = () => {
    const updated: CategoryBudget[] = DEFAULT_CATEGORIES.map((cat) => ({
      categoryId: cat.id,
      monthlyLimit: localBudgets[cat.id] ?? cat.defaultBudget,
    }));
    onSaveBudgets(updated);
    onClose();
  };

  const totalMonthlyBudget: number = (Object.values(localBudgets) as number[]).reduce(
    (sum: number, v: number) => sum + (v || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Thiết Lập Ngân Sách Hạn Mức Tháng
              </h2>
              <p className="text-xs text-slate-500">
                Đặt giới hạn chi tiêu cho từng danh mục để nhận cảnh báo kịp thời
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

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-xs text-slate-500 block">Tổng hạn mức ngân sách tháng:</span>
              <span className="text-xl font-bold text-slate-900 font-mono">
                {formatVND(totalMonthlyBudget)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Khôi phục mặc định
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
            {DEFAULT_CATEGORIES.map((cat) => {
              const currentVal = localBudgets.get(cat.id) ?? cat.defaultBudget;
              return (
                <div
                  key={cat.id}
                  className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2 shadow-2xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CategoryIcon
                      categoryId={cat.id}
                      className="w-4 h-4 shrink-0"
                      style={{ color: cat.color }}
                    />
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {cat.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="text"
                      value={currentVal.toLocaleString('vi-VN')}
                      onChange={(e) => handleChangeLimit(cat.id, e.target.value)}
                      className="w-28 text-right font-mono text-xs font-bold text-slate-900 border border-slate-200 rounded-lg p-1.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    />
                    <span className="text-[11px] text-slate-400 font-medium">₫</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            Lưu Hạn Mức
          </button>
        </div>
      </div>
    </div>
  );
};
