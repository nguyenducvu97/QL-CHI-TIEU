import React from 'react';
import {
  Wallet,
  Zap,
  SlidersHorizontal,
  Download,
  PlusCircle,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { formatVND } from '../utils/bidvParser';

interface NavbarProps {
  latestBalance?: number;
  totalSpentMonth: number;
  onOpenSimulator: () => void;
  onOpenWebhook: () => void;
  onOpenRules: () => void;
  onOpenBudget: () => void;
  onOpenManualAdd: () => void;
  onExportData: () => void;
  autoProcessCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  latestBalance,
  totalSpentMonth,
  onOpenSimulator,
  onOpenWebhook,
  onOpenRules,
  onOpenBudget,
  onOpenManualAdd,
  onExportData,
  autoProcessCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-sm ring-2 ring-emerald-100">
              <span className="font-extrabold text-sm tracking-tight">BIDV</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 text-lg leading-tight tracking-tight">
                  Quản Lý Chi Tiêu BIDV
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  Auto-Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Tự động nhận diện SMS & phân loại danh mục thông minh
              </p>
            </div>
          </div>

          {/* Balance Preview Badge */}
          {latestBalance !== undefined && (
            <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-sm">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-slate-500">Số dư BIDV:</span>
              <span className="font-bold text-slate-800 font-mono">
                {formatVND(latestBalance)}
              </span>
            </div>
          )}

          {/* Quick Action Navigation */}
          <div className="flex items-center gap-2">
            <button
              id="btn-open-simulator"
              onClick={onOpenSimulator}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Dán tin nhắn BIDV để phân tích"
            >
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Dán Thông Báo</span>
              <span className="sm:hidden">Dán SMS</span>
            </button>

            <button
              id="btn-open-webhook"
              onClick={onOpenWebhook}
              className="relative inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors cursor-pointer"
              title="Cài đặt Webhook nhận thông báo tự động từ điện thoại"
            >
              <Smartphone className="w-4 h-4 text-teal-600" />
              <span className="hidden md:inline">Webhook Tự Động</span>
              {autoProcessCount > 0 && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </button>

            <button
              id="btn-open-rules"
              onClick={onOpenRules}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Cài đặt quy tắc phân loại"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            <button
              id="btn-open-manual-add"
              onClick={onOpenManualAdd}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Thêm chi tiêu thủ công"
            >
              <PlusCircle className="w-4 h-4" />
            </button>

            <button
              id="btn-export-data"
              onClick={onExportData}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Xuất dữ liệu Excel / CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
