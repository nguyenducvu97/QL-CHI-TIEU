import React, { useState } from 'react';
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
} from 'lucide-react';
import { Transaction } from '../types';
import { SAMPLE_BIDV_MESSAGES } from '../data/mockBidvData';
import { parseBidvNotificationLocally } from '../utils/bidvParser';

interface WebhookIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReceiveWebhookTransaction: (tx: Transaction) => void;
}

export const WebhookIntegrationModal: React.FC<WebhookIntegrationModalProps> = ({
  isOpen,
  onClose,
  onReceiveWebhookTransaction,
}) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'test' | 'api'>('guide');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const webhookUrl = `${window.location.origin}/api/webhook/bidv`;
  const sampleJsonBody = JSON.stringify(
    {
      text: '[not_title]\n[not_body]',
      source: 'MacroDroid Android',
    },
    null,
    2
  );

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyBody = () => {
    navigator.clipboard.writeText('{\n  "text": "{not_title} {not_body}"\n}');
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
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
        const parsed = parseBidvNotificationLocally(randomSample.text);
        const newTx: Transaction = {
          id: 'tx-wb-' + Date.now(),
          accountNumber: parsed.accountNumber,
          amount: parsed.amount,
          type: 'debit',
          balance: parsed.balance,
          timestamp: new Date().toISOString(),
          rawMessage: randomSample.text,
          description: parsed.description,
          merchant: parsed.merchant,
          categoryId: parsed.suggestedCategoryId,
          categoryReason: 'Tự động từ Webhook: ' + parsed.reasoning,
          confidence: 0.99,
          source: 'webhook',
          refNumber: parsed.refNumber,
        };

        onReceiveWebhookTransaction(newTx);
        setTestStatus(`Thành công! Đã tự động ghi nhận: -${parsed.amount.toLocaleString('vi-VN')} VND (${randomSample.title})`);
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
                Khi BIDV trừ tiền, điện thoại tự động bắn dữ liệu về phần mềm và ghi sổ tức thì
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
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'guide'
                ? 'border-teal-600 text-teal-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Hướng dẫn cài đặt A-Z (MacroDroid)
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'test'
                ? 'border-teal-600 text-teal-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-4 h-4" />
            Kiểm tra kết nối (Test Webhook)
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'api'
                ? 'border-teal-600 text-teal-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code2 className="w-4 h-4" />
            Thông số Kỹ Thuật / cURL
          </button>
        </div>

        <div className="p-5 sm:p-6 text-sm max-h-[72vh] overflow-y-auto space-y-5">
          {/* TAB 1: GUIDE A-Z */}
          {activeTab === 'guide' && (
            <div className="space-y-4">
              {/* Webhook URL Endpoint Box */}
              <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-200">
                <span className="text-xs font-bold text-teal-900 block mb-1">
                  ĐƯỜNG DẪN WEBHOOK CỦA BẠN (Dán vào bước 3 bên dưới):
                </span>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={webhookUrl}
                    className="w-full font-mono text-xs text-teal-900 bg-white border border-teal-200 rounded-lg px-2.5 py-1.5 select-all outline-hidden"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedUrl ? 'Đã sao chép' : 'Sao chép'}
                  </button>
                </div>
              </div>

              {/* Step by step */}
              <div className="space-y-3">
                {/* Step 1 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                      1
                    </span>
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Cài đặt ứng dụng tự động hóa MacroDroid (Android)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 pl-8 leading-relaxed">
                    Vào <strong>CH Play (Google Play Store)</strong> trên điện thoại, tìm và cài đặt ứng dụng{' '}
                    <strong>MacroDroid - Tự động hóa thiết bị</strong> (Hoàn toàn miễn phí, giao diện tiếng Việt).
                  </p>
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 ml-8">
                    ⚠️ <strong>Lưu ý quan trọng:</strong> Mở cài đặt điện thoại $\rightarrow$ Quản lý ứng dụng $\rightarrow$ Chọn MacroDroid $\rightarrow$ Tắt tính năng "Tiết kiệm pin" (chọn "Không giới hạn") để app không bị hệ thống tắt ngầm khi khóa màn hình.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                      2
                    </span>
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Tạo Trigger (Kích hoạt khi có thông báo BIDV)
                    </h3>
                  </div>
                  <div className="text-xs text-slate-600 pl-8 space-y-1.5 leading-relaxed">
                    <p>Trong MacroDroid, bấm vào nút <strong>Thêm Macro (Add Macro)</strong>:</p>
                    <ol className="list-decimal pl-4 space-y-1 text-slate-700">
                      <li>Bấm vào dấu <strong>+</strong> màu đỏ tại mục <strong>Kích hoạt (Triggers)</strong>.</li>
                      <li>
                        Chọn: <strong>Sự kiện thiết bị (Device Events)</strong> $\rightarrow$ <strong>Thông báo (Notification)</strong> $\rightarrow$ <strong>Nhận thông báo (Notification Received)</strong>.
                      </li>
                      <li>Chọn <strong>Chọn ứng dụng</strong> $\rightarrow$ Tìm và tick chọn ứng dụng <strong>BIDV SmartBanking</strong> (hoặc ứng dụng <strong>Tin nhắn SMS</strong> nếu bạn nhận qua SMS).</li>
                      <li>Mục <em>Nội dung phù hợp</em>: Có thể để <strong>Bất kỳ (Any)</strong> hoặc chứa từ <code>TK</code> / <code>GD</code>. Bấm <strong>OK</strong>.</li>
                    </ol>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold">
                      3
                    </span>
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Tạo Hành Động (Gửi HTTP POST đến Webhook)
                    </h3>
                  </div>
                  <div className="text-xs text-slate-600 pl-8 space-y-2 leading-relaxed">
                    <p>Bấm vào dấu <strong>+</strong> màu xanh tại mục <strong>Hành động (Actions)</strong>:</p>
                    <ol className="list-decimal pl-4 space-y-1.5 text-slate-700">
                      <li>Chọn: <strong>Kết nối mạng (Connectivity)</strong> $\rightarrow$ <strong>Yêu cầu HTTP (HTTP Request)</strong>.</li>
                      <li>Phương thức: Chọn <strong>POST</strong>.</li>
                      <li>URL: Dán URL Webhook của bạn (đã sao chép ở trên).</li>
                      <li>
                        Tiêu đề HTTP (Headers): Thêm một header:
                        <div className="mt-1 bg-slate-100 font-mono text-[11px] p-1.5 rounded text-slate-800">
                          <code>Content-Type: application/json</code>
                        </div>
                      </li>
                      <li>
                        Phần thân nội dung (Body / Content): Chọn <strong>Văn bản thô (Raw text)</strong> hoặc <strong>application/json</strong> và dán:
                        <div className="mt-1 flex items-center justify-between bg-slate-900 text-emerald-300 font-mono text-[11px] p-2 rounded">
                          <code>{`{"text": "{not_title} {not_body}"}`}</code>
                          <button
                            type="button"
                            onClick={handleCopyBody}
                            className="text-slate-400 hover:text-white text-[10px] underline ml-2 cursor-pointer"
                          >
                            {copiedBody ? 'Đã chép' : 'Sao chép Body'}
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          (Trong đó <code>{`{not_title}`}</code> và <code>{`{not_body}`}</code> là biến nội dung thông báo do MacroDroid tự điền).
                        </span>
                      </li>
                    </ol>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                      4
                    </span>
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Lưu và trải nghiệm tự động hoàn toàn
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 pl-8 leading-relaxed">
                    Đặt tên Macro là <strong>"BIDV Sync Chi Tiêu"</strong> và bấm dấu tick Lưu. Kể từ giờ, mỗi khi bạn chuyển khoản, quẹt thẻ hoặc thanh toán QR qua BIDV, ứng dụng sẽ tự động ghi sổ chi tiêu và cập nhật ngay lập tức!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TEST WEBHOOK */}
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

          {/* TAB 3: API SPEC & CURL */}
          {activeTab === 'api' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Cấu trúc Payload chuẩn nhận qua Webhook:
                </span>
                <pre className="p-3 rounded-xl bg-slate-900 text-emerald-300 font-mono text-xs overflow-x-auto">
{`POST /api/webhook/bidv HTTP/1.1
Host: ${window.location.host}
Content-Type: application/json

{
  "text": "TK 1234567890 tai BIDV -45,000VND vao 15/09/2026 12:30. So du: 15,200,000VND. ND: Thanh toan Highlands Coffee",
  "source": "Tasker / MacroDroid / SMS Forwarder"
}`}
                </pre>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Lệnh cURL kiểm tra bằng Terminal / Postman:
                </span>
                <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto select-all">
{`curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"text":"BIDV: -85,000VND tai Shopee Food vao 16/09/2026. So du 14,915,000VND"}'`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Hỗ trợ Android 8.0+ và mọi dòng máy (Samsung, Xiaomi, Oppo, Vivo, iPhone Shortcuts...)
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
