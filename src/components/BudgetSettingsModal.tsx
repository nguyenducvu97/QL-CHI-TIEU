import React, { useState, useEffect, useMemo } from 'react';
import {
  Target,
  Check,
  RotateCcw,
  Plus,
  Minus,
  Calculator,
  Percent,
  Sparkles,
  X,
  TrendingDown,
} from 'lucide-react';
import { CategoryBudget, CategoryId } from '../types';
import { DEFAULT_CATEGORIES } from '../data/categories';
import { formatVND } from '../utils/bidvParser';
import { CategoryIcon } from './CategoryIcon';

interface BudgetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgets: CategoryBudget[];
  onSaveBudgets: (newBudgets: CategoryBudget[]) => void;
  currentSpentMonth?: number;
}

// Quick presets for total monthly budget
const PRESET_TOTALS = [
  { label: '10 Triệu', value: 10000000 },
  { label: '15 Triệu', value: 15000000 },
  { label: '20 Triệu', value: 20000000 },
  { label: '25 Triệu', value: 25000000 },
  { label: '30 Triệu', value: 30000000 },
  { label: '40 Triệu', value: 40000000 },
];

export const BudgetSettingsModal: React.FC<BudgetSettingsModalProps> = ({
  isOpen,
  onClose,
  budgets,
  onSaveBudgets,
  currentSpentMonth = 0,
}) => {
  // Local state for each category limit
  const [localBudgets, setLocalBudgets] = useState<Record<CategoryId, number>>(() => {
    const record: Partial<Record<CategoryId, number>> = {};
    for (const b of budgets) {
      record[b.categoryId] = b.monthlyLimit;
    }
    // Fill in defaults for any missing
    for (const cat of DEFAULT_CATEGORIES) {
      if (record[cat.id] === undefined) {
        record[cat.id] = cat.defaultBudget;
      }
    }
    return record as Record<CategoryId, number>;
  });

  // State for total budget quick distributor input
  const [customTotalInput, setCustomTotalInput] = useState<string>('');

  // Synchronize local state whenever modal opens or budgets prop changes
  useEffect(() => {
    if (isOpen) {
      const record: Partial<Record<CategoryId, number>> = {};
      for (const b of budgets) {
        record[b.categoryId] = b.monthlyLimit;
      }
      for (const cat of DEFAULT_CATEGORIES) {
        if (record[cat.id] === undefined) {
          record[cat.id] = cat.defaultBudget;
        }
      }
      setLocalBudgets(record as Record<CategoryId, number>);

      const total = (Object.values(record as Record<CategoryId, number>) as number[]).reduce(
        (acc: number, val: number) => acc + (val || 0),
        0
      );
      setCustomTotalInput(total ? total.toLocaleString('vi-VN') : '');
    }
  }, [isOpen, budgets]);

  if (!isOpen) return null;

  // Handle manual change for an individual category limit
  const handleChangeLimit = (catId: CategoryId, valueStr: string) => {
    const clean = valueStr.replace(/[^\d]/g, '');
    const num = clean ? parseInt(clean, 10) : 0;
    setLocalBudgets((prev) => ({
      ...prev,
      [catId]: num,
    }));
  };

  // Stepper increment/decrement
  const handleAdjustStep = (catId: CategoryId, delta: number) => {
    setLocalBudgets((prev) => {
      const current = prev[catId] ?? 0;
      const nextVal = Math.max(0, current + delta);
      return {
        ...prev,
        [catId]: nextVal,
      };
    });
  };

  // Reset to default recommendations
  const handleResetDefaults = () => {
    const record: Partial<Record<CategoryId, number>> = {};
    for (const cat of DEFAULT_CATEGORIES) {
      record[cat.id] = cat.defaultBudget;
    }
    setLocalBudgets(record as Record<CategoryId, number>);
    const total = DEFAULT_CATEGORIES.reduce((s, c) => s + c.defaultBudget, 0);
    setCustomTotalInput(total.toLocaleString('vi-VN'));
  };

  // Calculate total monthly budget currently configured
  const totalMonthlyBudget: number = (Object.values(localBudgets) as number[]).reduce(
    (sum: number, v: number) => sum + (v || 0),
    0
  );

  // Distribute a given total budget proportionally based on default category ratios
  const handleApplyProportionalTotal = (targetTotal: number) => {
    if (targetTotal <= 0) return;
    const defaultTotal = DEFAULT_CATEGORIES.reduce((sum, c) => sum + c.defaultBudget, 0);
    const newRecord: Partial<Record<CategoryId, number>> = {};

    let allocated = 0;
    DEFAULT_CATEGORIES.forEach((cat, index) => {
      if (index === DEFAULT_CATEGORIES.length - 1) {
        // Last item gets remainder to match exactly
        newRecord[cat.id] = Math.max(0, targetTotal - allocated);
      } else {
        const ratio = cat.defaultBudget / defaultTotal;
        // Round to nearest 50,000 VND for clean numbers
        const rounded = Math.round((targetTotal * ratio) / 50000) * 50000;
        newRecord[cat.id] = rounded;
        allocated += rounded;
      }
    });

    setLocalBudgets(newRecord as Record<CategoryId, number>);
    setCustomTotalInput(targetTotal.toLocaleString('vi-VN'));
  };

  // Distribute equally across all active categories
  const handleDistributeEqually = () => {
    const targetTotal = parseInt(customTotalInput.replace(/[^\d]/g, ''), 10) || totalMonthlyBudget;
    if (targetTotal <= 0) return;
    const count = DEFAULT_CATEGORIES.length;
    const eachAmount = Math.round(targetTotal / count / 50000) * 50000;

    const newRecord: Partial<Record<CategoryId, number>> = {};
    DEFAULT_CATEGORIES.forEach((cat) => {
      newRecord[cat.id] = eachAmount;
    });
    setLocalBudgets(newRecord as Record<CategoryId, number>);
  };

  // Save changes
  const handleSave = () => {
    const updated: CategoryBudget[] = DEFAULT_CATEGORIES.map((cat) => ({
      categoryId: cat.id,
      monthlyLimit: localBudgets[cat.id] ?? cat.defaultBudget,
    }));
    onSaveBudgets(updated);
    onClose();
  };

  // Remaining budget
  const remainingBudget = totalMonthlyBudget - currentSpentMonth;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Cài Đặt Ngân Sách Tháng
              </h2>
              <p className="text-xs text-slate-500">
                Thiết lập hạn mức chi tiêu tổng và từng danh mục bằng tay
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[calc(85vh-130px)] overflow-y-auto">
          {/* Section 1: Total Budget Banner & Quick Presets */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-slate-50 border border-emerald-100/80 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                  Tổng ngân sách chi tiêu tháng
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                    {formatVND(totalMonthlyBudget)}
                  </span>
                  {currentSpentMonth > 0 && (
                    <span className="text-xs text-slate-500 font-medium">
                      (Đã chi: <strong className="text-slate-800 font-mono">{formatVND(currentSpentMonth)}</strong>)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-center">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  title="Đặt lại theo mức chuẩn đề xuất"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  Mặc định BIDV
                </button>
              </div>
            </div>

            {/* Quick Presets for Total Budget */}
            <div className="pt-2 border-t border-emerald-100/60">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  Chọn nhanh tổng mức ngân sách tháng:
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_TOTALS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handleApplyProportionalTotal(preset.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      totalMonthlyBudget === preset.value
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Quick Total Allocator */}
            <div className="pt-2 border-t border-emerald-100/60 flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex-1 flex items-center gap-2">
                <span className="text-xs text-slate-600 shrink-0">Hoặc nhập tổng tiền:</span>
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={customTotalInput}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^\d]/g, '');
                      const num = clean ? parseInt(clean, 10) : 0;
                      setCustomTotalInput(num ? num.toLocaleString('vi-VN') : '');
                    }}
                    placeholder="VD: 18.000.000"
                    className="w-full text-xs font-mono font-bold text-slate-900 border border-slate-200 rounded-lg py-1.5 px-2 bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                  <span className="absolute right-2 top-1.5 text-xs text-slate-400 font-bold">₫</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const clean = customTotalInput.replace(/[^\d]/g, '');
                    const num = parseInt(clean, 10) || 0;
                    if (num > 0) handleApplyProportionalTotal(num);
                  }}
                  className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100/80 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer"
                  title="Phân bổ tự động theo tỷ lệ danh mục"
                >
                  Phân bổ theo tỷ lệ
                </button>
                <button
                  type="button"
                  onClick={handleDistributeEqually}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                  title="Chia đều số tiền cho tất cả danh mục"
                >
                  Chia đều
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Detailed Category-by-Category Manual Configuration */}
          <div>
            <div className="flex items-center justify-between mb-2.5 px-1">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Hạn mức cụ thể từng danh mục ({DEFAULT_CATEGORIES.length})
              </span>
              <span className="text-[11px] text-slate-500">
                Nhập số tiền hoặc bấm +/- để điều chỉnh
              </span>
            </div>

            <div className="space-y-2">
              {DEFAULT_CATEGORIES.map((cat) => {
                const currentVal = localBudgets[cat.id] ?? cat.defaultBudget;
                const ratioOfTotal =
                  totalMonthlyBudget > 0 ? Math.round((currentVal / totalMonthlyBudget) * 100) : 0;

                return (
                  <div
                    key={cat.id}
                    className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs transition-all"
                  >
                    {/* Category Label & Info */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: cat.bgColor, borderColor: cat.borderColor }}
                      >
                        <CategoryIcon
                          categoryId={cat.id}
                          className="w-4 h-4 shrink-0"
                          style={{ color: cat.color }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {cat.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
                            {ratioOfTotal}%
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 block truncate">
                          Mặc định: {formatVND(cat.defaultBudget)}
                        </span>
                      </div>
                    </div>

                    {/* Numeric Input & Steppers */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAdjustStep(cat.id, -500000)}
                        className="w-7 h-7 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                        title="Giảm 500.000 ₫"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <div className="relative">
                        <input
                          type="text"
                          value={currentVal ? currentVal.toLocaleString('vi-VN') : '0'}
                          onChange={(e) => handleChangeLimit(cat.id, e.target.value)}
                          className="w-28 sm:w-32 text-right font-mono text-xs font-bold text-slate-900 border border-slate-200 rounded-lg py-1.5 pr-5 pl-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                        />
                        <span className="absolute right-2 top-1.5 text-[11px] text-slate-400 font-bold">
                          ₫
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAdjustStep(cat.id, 500000)}
                        className="w-7 h-7 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                        title="Tăng 500.000 ₫"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAdjustStep(cat.id, 1000000)}
                        className="px-1.5 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                        title="Tăng nhanh 1.000.000 ₫"
                      >
                        +1Tr
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Tổng ngân sách mới:{' '}
            <strong className="text-slate-900 font-mono font-bold text-sm">
              {formatVND(totalMonthlyBudget)}
            </strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Lưu Ngân Sách
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
