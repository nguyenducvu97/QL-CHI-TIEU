import React from 'react';
import {
  Wallet,
  Zap,
  Download,
  PlusCircle,
  Sparkles,
  Edit3,
  Calendar,
  Settings,
  Bell,
} from 'lucide-react';
import { formatVND } from '../utils/bidvParser';
import { SettingsTabId } from './UnifiedSettingsModal';

interface NavbarProps {
  latestBalance?: number;
  totalSpentMonth: number;
  notifPermission?: NotificationPermission | 'unsupported';
  onOpenSimulator: () => void;
  onOpenSettings: (tab?: SettingsTabId) => void;
  onOpenManualAdd: () => void;
  onExportData: () => void;
  autoProcessCount: number;
  onOpenBalanceModal: () => void;
  onOpenMonthlyReport?: () => void;
  // Backward compatibility handlers if needed
  onOpenWebhook?: () => void;
  onOpenRules?: () => void;
  onOpenBudget?: () => void;
  onOpenPWAInstall?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  latestBalance,
  totalSpentMonth,
  onOpenSimulator,
  onOpenSettings,
  onOpenManualAdd,
  onExportData,
  autoProcessCount,
  notifPermission,
  onOpenBalanceModal,
  onOpenMonthlyReport,
  onOpenWebhook,
  onOpenRules,
  onOpenBudget,
  onOpenPWAInstall,
}) => {
  const handleOpenSettingsTab = (tab?: SettingsTabId) => {
    onOpenSettings(tab);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        {/* DÒNG 1: Main Header Row (Logo + Branding + Primary Actions) */}
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-xs ring-2 ring-emerald-100 shrink-0">
              <span className="font-extrabold text-xs sm:text-sm tracking-tight">BIDV</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="font-bold text-slate-900 text-sm sm:text-lg leading-tight tracking-tight">
                  <span className="hidden sm:inline">Quản Lý Chi Tiêu BIDV</span>
                  <span className="sm:hidden">Chi Tiêu BIDV</span>
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  Auto-Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Tự động nhận diện SMS & phân loại danh mục thông minh
              </p>
            </div>
          </div>

          {/* Desktop Interactive Balance Badge */}
          <button
            type="button"
            onClick={onOpenBalanceModal}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200 text-sm transition-all cursor-pointer group"
            title="Bấm để cập nhật hoặc điều chỉnh số dư BIDV"
          >
            <Wallet className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs text-emerald-900 font-medium">Số dư BIDV:</span>
            <span className="font-bold text-emerald-950 font-mono">
              {latestBalance !== undefined ? formatVND(latestBalance) : '--- ₫'}
            </span>
            <Edit3 className="w-3 h-3 text-emerald-600 opacity-60 group-hover:opacity-100 ml-0.5" />
          </button>

          {/* Desktop Quick Actions */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button
              id="btn-open-simulator"
              type="button"
              onClick={onOpenSimulator}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Dán tin nhắn BIDV để phân tích"
            >
              <Zap className="w-4 h-4" />
              <span>Dán Thông Báo</span>
            </button>

            {onOpenMonthlyReport && (
              <button
                id="btn-open-monthly-report"
                type="button"
                onClick={onOpenMonthlyReport}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer"
                title="Xem lịch sử chi tiêu theo tháng"
              >
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Báo Cáo Tháng</span>
              </button>
            )}

            <button
              id="btn-open-manual-add"
              type="button"
              onClick={onOpenManualAdd}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer"
              title="Thêm chi tiêu thủ công"
            >
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              <span>Thêm Chi Tiêu</span>
            </button>

            <button
              id="btn-export-data"
              type="button"
              onClick={onExportData}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Xuất dữ liệu Excel / CSV"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Notification API Status & Shortcut Button */}
            <button
              id="btn-nav-notifications"
              type="button"
              onClick={() => handleOpenSettingsTab('notifications')}
              className={`relative p-2 rounded-xl transition-colors cursor-pointer ${
                notifPermission === 'granted'
                  ? 'text-emerald-700 hover:bg-emerald-50 bg-emerald-50/70'
                  : 'text-amber-700 hover:bg-amber-50 bg-amber-50/70'
              }`}
              title={
                notifPermission === 'granted'
                  ? 'Thông báo đẩy BIDV: Đang bật (Nhận thông báo khi ẩn tab)'
                  : 'Bật thông báo đẩy khi có giao dịch BIDV mới'
              }
            >
              <Bell className="w-4 h-4" />
              {notifPermission === 'default' && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              )}
            </button>

            {/* Master Settings Button */}
            <button
              id="btn-open-settings"
              type="button"
              onClick={() => handleOpenSettingsTab('budget')}
              className="relative inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-bold text-slate-800 hover:text-emerald-900 bg-slate-100 hover:bg-emerald-50 active:bg-emerald-100 border border-slate-200 hover:border-emerald-300 rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Mở Bảng Cài Đặt Tổng Hợp (Ngân sách, Webhook, Phân loại, Cài app)"
            >
              <Settings className="w-4 h-4 text-emerald-600" />
              <span>Cài Đặt</span>
              {autoProcessCount > 0 && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </button>
          </div>

          {/* Mobile Row 1 Right Actions (Thêm GD + Thông Báo + Cài Đặt) */}
          <div className="flex md:hidden items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenSettingsTab('notifications')}
              className={`relative p-1.5 rounded-lg border transition-colors cursor-pointer ${
                notifPermission === 'granted'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title="Cài đặt thông báo"
            >
              <Bell className="w-3.5 h-3.5" />
              {notifPermission === 'default' && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full"></span>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenManualAdd}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Thêm giao dịch thủ công"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Ghi Sổ</span>
            </button>

            {/* Master Settings Button on Mobile */}
            <button
              type="button"
              onClick={() => handleOpenSettingsTab('budget')}
              className="relative inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Mở Bảng Cài Đặt (Ngân sách, Webhook, Quy tắc, Cài app)"
            >
              <Settings className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cài Đặt</span>
              {autoProcessCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </button>
          </div>
        </div>

        {/* DÒNG 2: Mobile Action Sub-Bar (Phân bố 100% màn hình, không bao giờ tràn lề) */}
        <div className="md:hidden pt-1 pb-2 border-t border-slate-100">
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={onOpenSimulator}
              className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/70 shadow-2xs active:scale-98 transition-all cursor-pointer"
              title="Dán tin nhắn BIDV để bóc tách ngay"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-[11px] font-bold truncate">Dán SMS</span>
            </button>

            <button
              type="button"
              onClick={onOpenMonthlyReport}
              className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs active:scale-98 transition-all cursor-pointer"
              title="Xem báo cáo chi tiêu theo tháng"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-[11px] font-medium truncate">Báo Cáo</span>
            </button>

            <button
              type="button"
              onClick={onOpenBalanceModal}
              className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs active:scale-98 transition-all cursor-pointer"
              title="Xem và sửa số dư BIDV"
            >
              <Wallet className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-[11px] font-medium truncate">Số Dư</span>
            </button>

            <button
              type="button"
              onClick={onExportData}
              className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs active:scale-98 transition-all cursor-pointer"
              title="Xuất file báo cáo chi tiêu"
            >
              <Download className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span className="text-[11px] font-medium truncate">Xuất File</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
