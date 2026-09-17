import React, { useState } from 'react';
import {
  Wallet,
  Check,
  RotateCcw,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
  Info,
  HelpCircle,
} from 'lucide-react';
import { formatVND } from '../utils/bidvParser';

interface BalanceUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance?: number;
  onSaveBalance: (newBalance: number, reason: string, createTransaction: boolean) => void;
  onOpenSimulator: () => void;
}

export const BalanceUpdateModal: React.FC<BalanceUpdateModalProps> = ({
  isOpen,
  onClose,
  currentBalance,
  onSaveBalance,
  onOpenSimulator,
}) => {
  const [balanceInput, setBalanceInput] = useState<string>(
    currentBalance ? currentBalance.toLocaleString('vi-VN') : '15,000,000'
  );
  const [reason, setReason] = useState('Đồng bộ số dư thực tế theo app BIDV SmartBanking');
  const [createTransaction, setCreateTransaction] = useState(true);

  if (!isOpen) return null;

  const cleanNum = parseInt(balanceInput.replace(/[^\d]/g, ''), 10) || 0;
  const difference = currentBalance !== undefined ? cleanNum - currentBalance : 0;

  const handleQuickPreset = (amountToAdd: number) => {
    const nextVal = (currentBalance || 0) + amountToAdd;
    setBalanceInput(Math.max(0, nextVal).toLocaleString('vi-VN'));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cleanNum < 0) return;
    onSaveBalance(cleanNum, reason, createTransaction);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Cập Nhật Số Dư Tài Khoản BIDV
              </h2>
              <p className="text-xs text-slate-500">
                Đồng bộ số dư theo thực tế hoặc kiểm tra cơ chế tự động
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          {/* Automatic vs Manual Explanation */}
          <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-200/80 text-teal-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-xs text-teal-950">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              Hai cách cập nhật số dư:
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed text-teal-800">
              <li>
                <strong>Cách 1 (Tự động 100%):</strong> Mỗi khi bạn dán SMS hoặc Webhook gửi về, tin nhắn BIDV thường có dòng <code>Số dư: 15,200,000VND</code>, hệ thống sẽ <strong>tự động nhận và cập nhật ngay</strong>.
              </li>
              <li>
                <strong>Cách 2 (Thủ công / Khởi tạo ban đầu):</strong> Nhập trực tiếp số dư thực tế trong tài khoản ngân hàng của bạn vào bên dưới.
              </li>
            </ul>
          </div>

          {/* Current Balance Display */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-slate-500 block text-[11px]">Số dư ghi nhận hiện tại:</span>
              <span className="font-bold text-slate-900 text-base font-mono">
                {currentBalance !== undefined ? formatVND(currentBalance) : 'Chưa có dữ liệu'}
              </span>
            </div>

            {difference !== 0 && currentBalance !== undefined && (
              <div className="text-right">
                <span className="text-slate-500 block text-[11px]">Chênh lệch:</span>
                <span
                  className={`font-bold font-mono text-xs ${
                    difference > 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {difference > 0 ? `+${formatVND(difference)}` : `-${formatVND(Math.abs(difference))}`}
                </span>
              </div>
            )}
          </div>

          {/* Input New Balance */}
          <div>
            <label className="font-bold text-slate-800 block mb-1 text-xs">
              Nhập số dư BIDV mới (VND) *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={balanceInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d]/g, '');
                  setBalanceInput(val ? parseInt(val, 10).toLocaleString('vi-VN') : '');
                }}
                className="w-full text-lg font-bold font-mono text-emerald-800 rounded-xl border border-slate-200 p-3 bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden pr-12"
                placeholder="Ví dụ: 15,000,000"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                ₫
              </span>
            </div>
          </div>

          {/* Quick preset chips */}
          <div>
            <span className="text-slate-500 text-[11px] block mb-1.5 font-medium">
              Cộng nhanh (ví dụ nhận tiền/nạp thêm):
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[500000, 1000000, 2000000, 5000000, 10000000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickPreset(amt)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] transition-colors cursor-pointer"
                >
                  +{formatVND(amt)}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1 text-xs">
              Lý do / Ghi chú cập nhật
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Nhận lương, Nạp tiền mặt, Khớp với app SmartBanking..."
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden text-slate-800"
            />
          </div>

          {/* Checkbox: Record as transaction */}
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={createTransaction}
                onChange={(e) => setCreateTransaction(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              <div className="text-[11px]">
                <span className="font-semibold text-slate-800 block">
                  Tạo bản ghi biến động trong lịch sử giao dịch
                </span>
                <span className="text-slate-500">
                  {difference > 0
                    ? `Ghi nhận một khoản thu/nạp tiền +${formatVND(difference)} để khớp sổ sách.`
                    : difference < 0
                    ? `Ghi nhận khoản điều chỉnh giảm -${formatVND(Math.abs(difference))}.`
                    : 'Lưu mốc số dư này vào lịch sử tài khoản.'}
                </span>
              </div>
            </label>
          </div>

          {/* Alternative action */}
          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
            <span>Muốn thử cập nhật tự động từ tin nhắn thật?</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSimulator();
              }}
              className="text-emerald-600 hover:text-emerald-700 font-bold underline cursor-pointer"
            >
              Dán SMS BIDV có số dư
            </button>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
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
              Xác Nhận Lưu Số Dư
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
