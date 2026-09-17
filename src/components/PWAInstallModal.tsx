import React, { useState } from 'react';
import {
  Smartphone,
  Share,
  PlusSquare,
  MoreVertical,
  Download,
  Check,
  Copy,
  ExternalLink,
  Laptop,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'desktop'>(
    isIOS ? 'ios' : isAndroid ? 'android' : 'android'
  );
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setIsCopied(true);
    onShowToast('Đã sao chép link web vào bộ nhớ tạm!');
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleNativeInstall = async () => {
    const res = await install();
    if (res === 'accepted') {
      onShowToast('Đang cài đặt ứng dụng vào màn hình chính...');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with App Branding */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur border border-white/25 flex items-center justify-center text-white shadow-xs shrink-0">
              <span className="font-extrabold text-sm tracking-tight">BIDV</span>
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg leading-tight flex items-center gap-1.5">
                Cài Đặt Ứng Dụng Ra Màn Hình
                <Sparkles className="w-4 h-4 text-emerald-300" />
              </h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                Mở nhanh như ứng dụng thật, không có thanh địa chỉ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center text-white text-xs transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-700">
          {/* Status Banner */}
          {isInstalled ? (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold block">Ứng dụng đã được cài đặt!</span>
                Bạn đang sử dụng ứng dụng ở chế độ toàn màn hình trên thiết bị.
              </div>
            </div>
          ) : isInstallable ? (
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-emerald-900">
                <span className="font-bold text-sm block text-emerald-950">
                  Trình duyệt hỗ trợ cài đặt 1 chạm!
                </span>
                Nhấn nút bên cạnh để đưa icon app ra màn hình chính ngay.
              </div>
              <button
                type="button"
                onClick={handleNativeInstall}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
                Cài Đặt Ngay
              </button>
            </div>
          ) : null}

          {/* Platform Switcher Tabs */}
          <div className="grid grid-cols-3 p-1 rounded-xl bg-slate-100 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'ios'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-slate-800" />
              iPhone (iOS)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('android')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'android'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              Android
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('desktop')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === 'desktop'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Laptop className="w-3.5 h-3.5 text-teal-600" />
              Máy tính
            </button>
          </div>

          {/* iOS Instructions */}
          {activeTab === 'ios' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <span className="font-bold shrink-0">Lưu ý:</span>
                <span>
                  Trên iPhone/iPad, bạn cần mở trang web bằng trình duyệt <strong>Safari</strong> (nếu đang mở trong Zalo, Facebook hãy bấm nút chia sẻ để chọn <em>Mở bằng Safari</em>).
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block">
                      Bấm nút Chia sẻ (Share)
                    </span>
                    Nhìn thanh công cụ dưới đáy màn hình Safari, bấm vào biểu tượng{' '}
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-semibold">
                      <Share className="w-3 h-3 text-blue-600" /> Chia sẻ
                    </span>{' '}
                    (hình ô vuông có mũi tên chỉ lên).
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block">
                      Chọn "Thêm vào MH chính" (Add to Home Screen)
                    </span>
                    Cuộn danh sách tùy chọn xuống phía dưới và tìm dòng có biểu tượng dấu cộng:{' '}
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-semibold">
                      <PlusSquare className="w-3 h-3 text-slate-700" /> Thêm vào MH chính
                    </span>.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block">
                      Xác nhận "Thêm" (Add)
                    </span>
                    Bấm chữ <strong>"Thêm"</strong> ở góc trên bên phải màn hình. Biểu tượng ứng dụng BIDV màu xanh ngọc sẽ xuất hiện ngay trên màn hình chính iPhone của bạn!
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Android Instructions */}
          {activeTab === 'android' && (
            <div className="space-y-3">
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block">
                      Mở bằng Google Chrome
                    </span>
                    Đảm bảo trang web đang mở trong trình duyệt Chrome trên điện thoại Android (Samsung, Xiaomi, Oppo, Realme...).
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block">
                      Bấm vào Menu 3 dấu chấm (⋮)
                    </span>
                    Bấm vào biểu tượng{' '}
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-semibold">
                      <MoreVertical className="w-3 h-3 text-slate-700" /> Menu 3 chấm
                    </span>{' '}
                    ở góc trên cùng bên phải trình duyệt Chrome.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block">
                      Chọn "Cài đặt ứng dụng" hoặc "Thêm vào màn hình chính"
                    </span>
                    Nhấn vào dòng <strong>"Cài đặt ứng dụng"</strong> (Install app) hoặc <strong>"Thêm vào màn hình chính"</strong>, sau đó xác nhận Cài đặt.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Instructions */}
          {activeTab === 'desktop' && (
            <div className="space-y-3">
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block">
                      Trên Chrome / Edge (Windows & Mac)
                    </span>
                    Nhìn vào thanh địa chỉ URL góc bên phải (bên cạnh ngôi sao bookmark), bạn sẽ thấy biểu tượng hình máy tính có dấu mũi tên{' '}
                    <strong>"Cài đặt Quản Lý Chi Tiêu BIDV"</strong>.
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block">
                      Nhấn "Cài đặt"
                    </span>
                    Trang web sẽ lập tức biến thành một cửa sổ phần mềm độc lập, có icon ghim trên Taskbar / Dock như phần mềm máy tính chuyên nghiệp.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Copy Link Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="font-bold text-slate-700 block mb-1">
              Link mở ứng dụng trên điện thoại:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={currentUrl}
                className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-slate-600 outline-hidden select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                  isCopied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                }`}
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Đã chép
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Chép Link
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            Hỗ trợ PWA chuẩn Web App trên iOS & Android
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 text-white hover:bg-slate-700 active:bg-slate-900 rounded-xl transition-colors cursor-pointer"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
