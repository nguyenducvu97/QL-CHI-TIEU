import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  Copy,
  Check,
  Send,
  Zap,
  ArrowRight,
  ShieldCheck,
  BellRing,
  BookOpen,
  Code2,
  HelpCircle,
  Cpu,
  Layers,
  BatteryCharging,
  Activity,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  Trash2,
  QrCode,
  Download,
} from 'lucide-react';
import { Transaction } from '../types';
import { SAMPLE_BIDV_MESSAGES } from '../data/mockBidvData';
import { parseBidvNotificationLocally, formatVND, formatDateTime } from '../utils/bidvParser';

interface WebhookIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReceiveWebhookTransaction: (tx: Transaction) => void;
}

interface ServerWebhookEvent {
  id: string;
  receivedAt: string;
  text: string;
  source: string;
  parsedData?: any;
}

export const WebhookIntegrationModal: React.FC<WebhookIntegrationModalProps> = ({
  isOpen,
  onClose,
  onReceiveWebhookTransaction,
}) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'live_log' | 'test' | 'api'>('guide');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedGetUrl, setCopiedGetUrl] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showQr, setShowQr] = useState<boolean>(false);

  // Live log state
  const [serverEvents, setServerEvents] = useState<ServerWebhookEvent[]>([]);
  const [serverTraffic, setServerTraffic] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isServerOnline, setIsServerOnline] = useState<boolean | null>(null);

  const currentOrigin = window.location.origin;
  const isDevOrigin = currentOrigin.includes('ais-dev-');
  const publicSharedOrigin = isDevOrigin
    ? currentOrigin.replace('ais-dev-', 'ais-pre-')
    : currentOrigin;

  // Selected URL type: prefer public shared URL for MacroDroid
  const [useSharedUrl, setUseSharedUrl] = useState<boolean>(isDevOrigin);

  const activeOrigin = useSharedUrl ? publicSharedOrigin : currentOrigin;
  const webhookPostUrl = `${activeOrigin}/api/webhook/bidv`;
  const webhookGetUrl = `${activeOrigin}/api/webhook/bidv?text=[not_title] [not_body]`;

  // Generate QR code for phone scanning (pointing to the clean webhook URL)
  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(webhookPostUrl, { width: 220, margin: 1 })
        .then((url) => setQrDataUrl(url))
        .catch(() => {});
    }
  }, [isOpen, webhookPostUrl]);

  const fetchLogs = async () => {
    try {
      setIsLoadingLogs(true);
      const [resEvents, resTraffic] = await Promise.all([
        fetch('/api/webhook/events'),
        fetch('/api/webhook/traffic'),
      ]);

      if (resEvents.ok) {
        const data = await resEvents.json();
        setServerEvents(data.events || []);
        setIsServerOnline(true);
      } else {
        setIsServerOnline(false);
      }

      if (resTraffic.ok) {
        const trData = await resTraffic.json();
        setServerTraffic(trData.traffic || []);
      }
    } catch {
      setIsServerOnline(false);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
      const timer = setInterval(fetchLogs, 4000);
      return () => clearInterval(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyPostUrl = () => {
    navigator.clipboard.writeText(webhookPostUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyGetUrl = () => {
    navigator.clipboard.writeText(webhookGetUrl);
    setCopiedGetUrl(true);
    setTimeout(() => setCopiedGetUrl(false), 2000);
  };

  const handleCopyBody = () => {
    navigator.clipboard.writeText('{\n  "text": "[not_title] [not_body]"\n}');
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
  };

  const handleDownloadMacroConfig = () => {
    const macroConfig = {
      macro_name: "BIDV Auto Expense Sync",
      description: "Tự động bắt thông báo trừ tiền BIDV SmartBanking và đồng bộ vào sổ chi tiêu",
      trigger: {
        type: "Notification Received",
        application: "BIDV SmartBanking (hoặc SMS Banking)",
        match_text: "Any"
      },
      action: {
        type: "HTTP Request",
        method: "GET",
        url: webhookGetUrl,
        headers: {},
        body: ""
      },
      note: "Chỉ cần tạo Action HTTP Request GET dán đường link url ở trên vào MacroDroid là xong!"
    };

    const blob = new Blob([JSON.stringify(macroConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bidv_macrodroid_config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearLogs = async () => {
    try {
      await fetch('/api/webhook/clear', { method: 'POST' });
      setServerEvents([]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportSingleEvent = (evt: ServerWebhookEvent) => {
    const parsed = parseBidvNotificationLocally(evt.text);
    if (parsed.amount > 0) {
      const newTx: Transaction = {
        id: 'tx-' + evt.id,
        accountNumber: parsed.accountNumber,
        amount: parsed.amount,
        type: parsed.isBidvDebit ? 'debit' : 'credit',
        balance: parsed.balance,
        timestamp: parsed.timestamp,
        rawMessage: evt.text,
        description: parsed.description,
        merchant: parsed.merchant,
        categoryId: parsed.suggestedCategoryId,
        categoryReason: parsed.isBidvDebit
          ? 'Thêm từ Nhật ký Webhook: ' + parsed.reasoning
          : 'Thêm từ Nhật ký Webhook: Cộng tiền BIDV',
        confidence: parsed.confidence,
        source: 'webhook',
        refNumber: parsed.refNumber,
      };
      onReceiveWebhookTransaction(newTx);
    }
  };

  const handleSendTestWebhook = async () => {
    setIsSendingTest(true);
    setTestStatus('Đang gửi test thông báo...');

    const randomSample =
      SAMPLE_BIDV_MESSAGES[Math.floor(Math.random() * SAMPLE_BIDV_MESSAGES.length)];

    try {
      const res = await fetch('/api/webhook/bidv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: randomSample.text,
          source: 'Android MacroDroid (Simulation)',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestStatus(`Thành công! Máy chủ đã tiếp nhận và tự động thêm -${data.parsed.amount.toLocaleString('vi-VN')} VND vào sổ chi tiêu.`);
        fetchLogs();
      } else {
        setTestStatus('Lỗi: Endpoint trả về không hợp lệ');
      }
    } catch (e: any) {
      setTestStatus('Lỗi kết nối tới webhook server');
    } finally {
      setIsSendingTest(false);
      setTimeout(() => setTestStatus(null), 4500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Tự Động Bắt Thông Báo BIDV (Webhook Từ A-Z)
              </h2>
              <p className="text-xs text-slate-500">
                Khi BIDV trừ tiền, MacroDroid tự động đẩy dữ liệu về phần mềm và ghi sổ tức thì
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 sm:px-6 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-3 sm:px-4 border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
              activeTab === 'guide'
                ? 'border-teal-600 text-teal-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Hướng dẫn cài đặt (A-Z)
          </button>
          <button
            onClick={() => setActiveTab('live_log')}
            className={`py-3 px-3 sm:px-4 border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
              activeTab === 'live_log'
                ? 'border-teal-600 text-teal-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Nhật ký nhận tin ({serverEvents.length})
            {serverEvents.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`py-3 px-3 sm:px-4 border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
              activeTab === 'test'
                ? 'border-teal-600 text-teal-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Kiểm tra kết nối
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`py-3 px-3 sm:px-4 border-b-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
              activeTab === 'api'
                ? 'border-teal-600 text-teal-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Thông số kỹ thuật
          </button>
        </div>

        <div className="p-5 sm:p-6 text-sm max-h-[70vh] overflow-y-auto space-y-5">
          {/* TAB 1: GUIDE A-Z */}
          {activeTab === 'guide' && (
            <div className="space-y-4">
              {/* CRITICAL NOTICE & FIX FROM USER'S SCREENSHOTS & LOGS */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 shadow-xs space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white tracking-wide uppercase">
                    CHẨN ĐOÁN LỖI TỪ NHẬT KÝ MACRODROID
                  </span>
                  <span className="text-xs text-amber-900 font-bold">
                    Khắc phục lỗi DNS "UnknownHostException" & "Không thể sử dụng mạng"
                  </span>
                </div>
                <div className="text-xs text-amber-950 space-y-2 leading-relaxed">
                  <div className="p-3 bg-white/90 rounded-xl border border-rose-300 space-y-2 text-[12px]">
                    <div className="font-bold text-rose-700 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Nguyên nhân nhật ký báo "DNS resolution failed - UnknownHostException":</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-slate-700">
                      <li>
                        <strong>Lý do 1 (Quan trọng nhất):</strong> Trong Macro bạn đang để Trigger <code>T: (2) Thông báo đã nhận - Tất cả các ứng dụng</code>. Điều này khiến Macro kích hoạt hàng chục lần/phút cho mọi thao tác (bàn phím, zalo, hệ thống...), làm Android phát hiện ứng dụng chạy ngầm bất thường và ngắt mạng (Nhật ký ghi: <em>"MacroDroid không thể sử dụng mạng"</em>).
                      </li>
                      <li>
                        <strong>Lý do 2:</strong> Chế độ Tiết kiệm pin của Android tự động chặn MacroDroid kết nối mạng khi tắt màn hình hoặc chạy ngầm.
                      </li>
                    </ul>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300 space-y-2 text-[12px]">
                    <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>3 Bước sửa triệt để (Chỉ mất 1 phút):</span>
                    </div>
                    <ol className="list-decimal pl-4 space-y-2 text-slate-800">
                      <li>
                        <strong>XÓA NGAY Trigger "Tất cả các ứng dụng":</strong>
                        <p className="text-slate-600 mt-0.5">
                          Trong Macro, xóa Trigger (2), chỉ giữ lại DUY NHẤT 1 Trigger: <code>Thông báo đã nhận $\rightarrow$ Chọn ứng dụng: BIDV SmartBanking</code>.
                        </p>
                      </li>
                      <li>
                        <strong>Cấp quyền Pin "Không giới hạn" (Unrestricted):</strong>
                        <p className="text-slate-600 mt-0.5">
                          Vào Cài đặt điện thoại $\rightarrow$ Ứng dụng $\rightarrow$ MacroDroid $\rightarrow$ <strong>Pin</strong>: Chọn <strong>Không hạn chế (Unrestricted)</strong>. Bật <strong>"Cho phép dữ liệu nền"</strong>.
                        </p>
                      </li>
                      <li>
                        <strong>Thêm Hành Động Dự Phòng (100% Không Bao Giờ Trượt):</strong>
                        <p className="text-slate-600 mt-0.5">
                          Trong MacroDroid, bấm dấu <strong>+ Hành động</strong> $\rightarrow$ <strong>Khay nhớ tạm</strong> $\rightarrow$ <strong>Đặt văn bản</strong>: nhập <code>[not_title] [not_body]</code>. Khi có biến động, MacroDroid tự chép vào bộ nhớ tạm. Trên trang web bạn chỉ cần bấm nút <strong>"📋 Đọc Clipboard"</strong> là giao dịch tự thêm tức thì!
                        </p>
                      </li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* QR Code and Clean Links Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 border border-emerald-500/30 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    Đường dẫn Webhook Máy Chủ
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowQr(!showQr)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-teal-800 bg-white hover:bg-teal-50 border border-teal-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>{showQr ? 'Ẩn mã QR' : 'Quét mã QR bằng ĐT'}</span>
                  </button>
                </div>

                {isDevOrigin && (
                  <div className="p-3 bg-white rounded-xl border border-teal-200 text-xs space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Chọn URL cho MacroDroid:
                      </span>
                      <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
                        <button
                          type="button"
                          onClick={() => setUseSharedUrl(true)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                            useSharedUrl
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          🌐 URL Công khai (ais-pre) — Khuyên dùng
                        </button>
                        <button
                          type="button"
                          onClick={() => setUseSharedUrl(false)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                            !useSharedUrl
                              ? 'bg-slate-800 text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          🔒 URL Dev (ais-dev)
                        </button>
                      </div>
                    </div>
                    {useSharedUrl ? (
                      <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200 leading-relaxed">
                        ✨ <strong>Bắt buộc cho MacroDroid:</strong> URL <code>ais-pre</code> là đường dẫn công khai (Public) không bị hệ thống Google chặn phiên đăng nhập <code>__cookie_check.html</code>. Hãy nhấn nút <strong>"Share" (Chia sẻ)</strong> ở góc trên bên phải giao diện AI Studio 1 lần để kích hoạt link này.
                      </p>
                    ) : (
                      <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 leading-relaxed">
                        ⚠️ <strong>Lưu ý:</strong> Link <code>ais-dev</code> yêu cầu đăng nhập tài khoản Google trên trình duyệt. Nếu MacroDroid gọi vào link này sẽ bị Google chặn và trả về trang xác thực cookie.
                      </p>
                    )}
                  </div>
                )}

                {showQr && qrDataUrl && (
                  <div className="p-4 bg-white rounded-xl border border-teal-200 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left animate-in fade-in duration-200">
                    <img
                      src={qrDataUrl}
                      alt="Mã QR Webhook BIDV"
                      className="w-36 h-36 rounded-lg border border-slate-200 shadow-2xs"
                    />
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <h4 className="font-bold text-slate-900 text-sm">
                        Quét QR để sao chép nhanh link vào điện thoại
                      </h4>
                      <p>
                        Mở camera hoặc Zalo trên điện thoại quét mã này để copy link trực tiếp vào MacroDroid mà không cần gõ từng chữ.
                      </p>
                      <button
                        onClick={handleCopyPostUrl}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors cursor-pointer"
                      >
                        {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedUrl ? 'Đã chép link POST' : 'Sao chép link POST'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">
                    URL Webhook (Phương thức POST):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={webhookPostUrl}
                      className="w-full font-mono text-xs text-emerald-950 bg-white border border-emerald-300 rounded-xl px-3 py-2 select-all outline-hidden shadow-2xs font-medium"
                    />
                    <button
                      onClick={handleCopyPostUrl}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
                    >
                      {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedUrl ? 'Đã sao chép' : 'Sao chép URL'}
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <span className="text-slate-600 text-[11px]">
                    Muốn dùng file mẫu cấu hình sẵn?
                  </span>
                  <button
                    onClick={handleDownloadMacroConfig}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-600" />
                    Tải file cấu hình mẫu (.json)
                  </button>
                </div>
              </div>

              {/* Crucial Android/Xiaomi notice */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>LƯU Ý QUAN TRỌNG ĐỂ TỰ ĐỘNG CHẠY 24/7 (ĐẶC BIỆT LÀ XIAOMI, SAMSUNG, OPPO):</span>
                </div>
                <p className="leading-relaxed text-slate-700">
                  Hệ điều hành Android tự động đóng các ứng dụng ngầm nếu bạn không thiết lập. Để MacroDroid không bao giờ bị dừng:
                </p>
                <div className="p-2.5 rounded-lg bg-white/90 border border-amber-200 font-medium space-y-1 text-slate-800 text-[11px]">
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Vào <strong>Cài đặt</strong> $\rightarrow$ <strong>Ứng dụng</strong> $\rightarrow$ Chọn <strong>MacroDroid</strong>.</li>
                    <li>Bật <strong>Tự khởi chạy (Autostart)</strong>.</li>
                    <li>Mục <strong>Tiết kiệm pin</strong>: Chọn <strong>Không giới hạn (No restrictions)</strong>.</li>
                    <li>Cấp quyền: <strong>Quyền truy cập thông báo (Notification Access)</strong>.</li>
                  </ul>
                </div>
              </div>

              {/* Step by step */}
              <div className="space-y-3">
                {/* Step 1 */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                      1
                    </span>
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Cài đặt MacroDroid
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 pl-8 leading-relaxed">
                    Mở <strong>CH Play (Google Play)</strong> $\rightarrow$ Tìm và cài đặt <strong>MacroDroid - Tự động hóa thiết bị</strong> (miễn phí).
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                      2
                    </span>
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Cấp quyền đọc thông báo
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 pl-8 leading-relaxed">
                    Mở MacroDroid $\rightarrow$ Khi được yêu cầu, cho phép quyền <strong>Truy cập thông báo</strong> để ứng dụng có thể đọc thông báo từ ngân hàng.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                      3
                    </span>
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Tạo Kích Hoạt (Trigger) khi có thông báo BIDV
                    </h3>
                  </div>
                  <div className="text-xs text-slate-600 pl-8 space-y-1.5 leading-relaxed">
                    <p>Trong MacroDroid, bấm <strong>Thêm Macro (Add Macro)</strong>:</p>
                    <ol className="list-decimal pl-4 space-y-1 text-slate-700">
                      <li>Bấm vào dấu <strong>+</strong> màu đỏ tại mục <strong>Kích hoạt (Triggers)</strong>.</li>
                      <li>
                        Chọn: <strong>Sự kiện thiết bị</strong> $\rightarrow$ <strong>Thông báo</strong> $\rightarrow$ <strong>Nhận thông báo</strong>.
                      </li>
                      <li>Chọn <strong>Chọn ứng dụng</strong> $\rightarrow$ Tick chọn <strong>BIDV SmartBanking</strong> (hoặc ứng dụng Tin nhắn SMS).</li>
                      <li>Mục <em>Nội dung phù hợp</em>: Chọn <strong>Bất kỳ (Any)</strong> $\rightarrow$ Bấm <strong>OK</strong>.</li>
                    </ol>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-3.5 sm:p-4 rounded-xl border-2 border-emerald-500/50 bg-emerald-50/30 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                        4
                      </span>
                      <h3 className="font-bold text-emerald-950 text-xs uppercase tracking-wider">
                        Tạo Hành Động Yêu Cầu HTTP (Phương thức POST)
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                      Quan trọng nhất
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 pl-8 space-y-2 leading-relaxed">
                    <p>Bấm vào dấu <strong>+</strong> màu xanh tại mục <strong>Hành động (Actions)</strong>:</p>
                    <ol className="list-decimal pl-4 space-y-2 text-slate-800">
                      <li>
                        Chọn: <strong>Kết nối mạng (Connectivity)</strong> $\rightarrow$ <strong>Yêu cầu HTTP (HTTP Request)</strong>.
                      </li>
                      <li>
                        <strong>Yêu cầu phương thức</strong>: Chọn <strong className="text-emerald-700">POST</strong>.
                      </li>
                      <li>
                        <strong>Nhập URL</strong>: Dán đường dẫn máy chủ Webhook sạch:
                        <div className="mt-1 flex items-center gap-2 bg-white p-2 rounded-lg border border-emerald-300 font-mono text-[11px] text-emerald-950 select-all overflow-x-auto">
                          <span>{webhookPostUrl}</span>
                        </div>
                      </li>
                      <li>
                        Nhìn lên thanh tab ở đỉnh màn hình điện thoại: Chọn tab thứ 3 <strong>"Nội dung" (Body)</strong>:
                        <div className="mt-1 space-y-1">
                          <p className="text-slate-600">Kiểu nội dung: Chọn <strong>application/json</strong></p>
                          <p className="text-slate-600">Nội dung văn bản:</p>
                          <div className="bg-slate-900 text-emerald-300 p-2 rounded-lg font-mono text-[11px]">
                            {`{"text": "[not_title] [not_body]"}`}
                          </div>
                        </div>
                      </li>
                      <li>
                        Bấm dấu tick (V) góc trên bên phải để lưu hành động.
                      </li>
                    </ol>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                      5
                    </span>
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Lưu Macro và Tận Hưởng
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 pl-8 leading-relaxed">
                    Đặt tên cho Macro là <strong>"BIDV Tự Động Chi Tiêu"</strong> và bấm dấu tick Lưu. Từ thời điểm này, mỗi khi có thông báo trừ tiền từ BIDV, điện thoại sẽ tự động bắn tin sang phần mềm trong tích tắc mà bạn không cần mở ứng dụng hay làm gì thêm!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE LOG & DIAGNOSTICS */}
          {activeTab === 'live_log' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      isServerOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`}
                  ></span>
                  <div className="text-xs">
                    <span className="font-bold text-slate-900">
                      Máy chủ Webhook:{' '}
                      <span className={isServerOnline ? 'text-emerald-700' : 'text-rose-700'}>
                        {isServerOnline ? 'Sẵn Sàng & Trực Tuyến' : 'Mất kết nối'}
                      </span>
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Đã nhận tổng cộng: <strong>{serverEvents.length}</strong> thông báo từ điện thoại
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchLogs}
                    disabled={isLoadingLogs}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                    Làm mới
                  </button>
                  {serverEvents.length > 0 && (
                    <button
                      onClick={handleClearLogs}
                      className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
                      title="Xóa lịch sử nhận tin"
                    >
                      <Trash2 className="w-3 h-3" />
                      Xóa
                    </button>
                  )}
                </div>
              </div>

              {serverEvents.length === 0 ? (
                <div className="p-6 rounded-xl border border-dashed border-slate-300 text-center space-y-3 bg-white">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800">
                      Chưa có thông báo nào được chuyển thành công tới máy chủ
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Hệ thống đang mở sẵn cổng đón tín hiệu thời gian thực từ điện thoại của bạn.
                    </p>
                  </div>
                  <div className="p-3.5 bg-amber-50/80 rounded-xl text-left text-xs text-slate-700 space-y-2 max-w-lg mx-auto border border-amber-200">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      Giải thích vì sao MacroDroid đã kích hoạt nhưng ở đây chưa nhận được:
                    </span>
                    <p className="leading-relaxed">
                      Trên màn hình MacroDroid, lệnh HTTP dùng phương thức <strong>GET</strong> với <code>[not_body]</code> trên URL sẽ bị Android chặn lại ngay trên máy do thông báo BIDV có dấu xuống dòng.
                    </p>
                    <div className="p-2 bg-white rounded-lg border border-amber-200 text-[11px] font-medium text-slate-800 space-y-1">
                      <p>1. Mở MacroDroid $\rightarrow$ Chọn <strong>Nhật ký hệ thống (System Log)</strong>: Bạn sẽ thấy dòng báo lỗi màu đỏ của lệnh vừa chạy.</p>
                      <p>2. Chuyển sang <strong>Tab Hướng dẫn</strong> trên cửa sổ này và đổi phương thức sang <strong>POST</strong> $\rightarrow$ Mọi thông báo sẽ lập tức thông suốt 100%.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Danh sách gói tin MacroDroid đã gửi đến:
                  </span>
                  {serverEvents.map((evt) => {
                    const parsed = evt.parsedData || parseBidvNotificationLocally(evt.text);
                    return (
                      <div
                        key={evt.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-teal-300 transition-colors space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-500 text-[11px]">
                            Nhận lúc: {formatDateTime(evt.receivedAt)}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 font-bold font-mono text-[11px] border border-teal-200">
                            {parsed.isBidvDebit ? '-' : '+'}
                            {formatVND(parsed.amount)}
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-slate-50 font-mono text-[11px] text-slate-700 whitespace-pre-wrap break-all border border-slate-100">
                          {evt.text}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-slate-500 text-[11px]">
                            {parsed.description || 'Không có mô tả'} • TK: {parsed.accountNumber}
                          </span>
                          <button
                            onClick={() => handleImportSingleEvent(evt)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            Ghi vào sổ ngay
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Server Traffic attempts if any */}
              {serverTraffic.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Lịch sử các yêu cầu mạng đã chạm tới máy chủ:
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {serverTraffic.map((tr) => (
                      <div key={tr.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${tr.method === 'POST' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'}`}>
                            {tr.method}
                          </span>
                          <span className="text-slate-700 truncate max-w-[200px] sm:max-w-xs">{tr.url}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 shrink-0">{tr.detail || tr.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TEST WEBHOOK */}
          {activeTab === 'test' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <span className="font-bold text-slate-800 block">
                  Kiểm tra xem Webhook có hoạt động bình thường không:
                </span>
                <p className="text-slate-600">
                  Nút bên dưới sẽ gửi một gói tin JSON mô phỏng một thông báo trừ tiền thực tế từ BIDV đến endpoint Webhook <code>/api/webhook/bidv</code> của bạn.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Thử gửi sự kiện giả lập:
                  </span>
                  <button
                    id="btn-simulate-webhook-modal"
                    onClick={handleSendTestWebhook}
                    disabled={isSendingTest}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50 rounded-xl transition-colors shadow-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSendingTest ? 'Đang gửi...' : 'Bấm Gửi Test Webhook Ngay'}
                  </button>
                </div>

                {testStatus && (
                  <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold animate-in fade-in">
                    {testStatus}
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-500">
                💡 <em>Mẹo: Sau khi bấm gửi test thành công, bạn sẽ thấy giao dịch xuất hiện ngay trên danh sách và biểu đồ trang chủ mà không cần tải lại trang.</em>
              </div>
            </div>
          )}

          {/* TAB 4: API SPEC & CURL */}
          {activeTab === 'api' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Cấu trúc Payload chuẩn nhận qua Webhook (Hỗ trợ cả POST và GET):
                </span>
                <pre className="p-3 rounded-xl bg-slate-900 text-emerald-300 font-mono text-xs overflow-x-auto">
{`POST /api/webhook/bidv HTTP/1.1
Host: ${window.location.host}
Content-Type: application/json

{
  "text": "Thông báo BIDV\\nThời gian giao dịch: 10:14 17/09/2026\\nTài khoản thanh toán: 8832123271\\nSố tiền GD: -10,000 VND\\nSố dư cuối: 578,597 VND\\nNội dung giao dịch: 8821702530 an uong\\nMã giao dịch: 0392TzXK-8CBAkPtKO",
  "source": "MacroDroid Android"
}`}
                </pre>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Lệnh cURL kiểm tra bằng Terminal / Postman:
                </span>
                <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto select-all">
{`curl -X POST "${webhookPostUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"text":"Thông báo BIDV\\nSố tiền GD: -10,000 VND\\nSố dư cuối: 578,597 VND\\nNội dung giao dịch: an uong"}'`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Hỗ trợ Android 8.0+ và mọi dòng máy (Xiaomi, Samsung, Oppo, Vivo...)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors cursor-pointer"
          >
            Đã hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

