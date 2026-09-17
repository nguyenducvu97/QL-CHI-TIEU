import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  Tag,
  Check,
  Sparkles,
  Info,
} from 'lucide-react';
import { CategoryId, SmartRule } from '../types';
import { DEFAULT_CATEGORIES, getCategoryById } from '../data/categories';
import { CategoryIcon } from './CategoryIcon';

interface CategoryRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: SmartRule[];
  onAddRule: (keyword: string, categoryId: CategoryId) => void;
  onDeleteRule: (ruleId: string) => void;
}

export const CategoryRulesModal: React.FC<CategoryRulesModalProps> = ({
  isOpen,
  onClose,
  rules,
  onAddRule,
  onDeleteRule,
}) => {
  const [newKeyword, setNewKeyword] = useState('');
  const [targetCategory, setTargetCategory] = useState<CategoryId>('food');
  const [selectedViewCategory, setSelectedViewCategory] = useState<CategoryId>('food');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    onAddRule(newKeyword.trim(), targetCategory);
    setNewKeyword('');
  };

  const currentCategoryInfo = getCategoryById(selectedViewCategory);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Quy Tắc Phân Loại Tự Động
              </h2>
              <p className="text-xs text-slate-500">
                Tự động nhận diện từ khóa trong nội dung chuyển khoản BIDV và gán vào danh mục
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

        <div className="p-5 sm:p-6 space-y-5">
          {/* Add custom rule form */}
          <form
            onSubmit={handleSubmit}
            className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-3"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Thêm từ khóa phân loại mới
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-6">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Ví dụ: pho bat dan, hoc phi toeic..."
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <div className="sm:col-span-4">
                <select
                  value={targetCategory}
                  onChange={(e) => setTargetCategory(e.target.value as CategoryId)}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden cursor-pointer"
                >
                  {DEFAULT_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={!newKeyword.trim()}
                  className="w-full h-full min-h-[38px] flex items-center justify-center gap-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm
                </button>
              </div>
            </div>
            <p className="text-[11px] text-emerald-700">
              Mẹo: Khi nội dung thông báo BIDV có chứa từ khóa này, hệ thống sẽ tự động gán vào danh mục bạn chọn.
            </p>
          </form>

          {/* User Custom Rules List */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Quy tắc do bạn thiết lập ({rules.length})
            </h3>

            {rules.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {rules.map((rule) => {
                  const cat = getCategoryById(rule.categoryId);
                  return (
                    <div
                      key={rule.id}
                      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 shadow-2xs"
                    >
                      <Tag className="w-3 h-3 text-slate-400" />
                      <span className="font-semibold">{rule.keyword}</span>
                      <span className="text-slate-400">→</span>
                      <span className="text-emerald-700 font-medium">{cat.name}</span>
                      <button
                        onClick={() => onDeleteRule(rule.id)}
                        className="text-slate-400 hover:text-red-600 ml-1 transition-colors cursor-pointer"
                        title="Xóa quy tắc"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Chưa có quy tắc tùy chỉnh nào. Bạn có thể thêm từ khóa đặc thù của mình ở trên.
              </p>
            )}
          </div>

          {/* Built-in Dictionary Preview */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Từ điển nhận diện mặc định theo danh mục
              </h3>
              <select
                value={selectedViewCategory}
                onChange={(e) => setSelectedViewCategory(e.target.value as CategoryId)}
                className="text-xs font-medium text-slate-700 border border-slate-200 rounded-lg px-2 py-1 bg-white outline-hidden cursor-pointer"
              >
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <CategoryIcon
                  categoryId={currentCategoryInfo.id}
                  className="w-4 h-4"
                  style={{ color: currentCategoryInfo.color }}
                />
                <span className="text-xs font-bold text-slate-800">
                  {currentCategoryInfo.name} ({currentCategoryInfo.keywords.length} từ khóa)
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {currentCategoryInfo.keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md text-[11px] bg-white border border-slate-200 text-slate-600 font-mono"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
