import React, { useState } from 'react';
import {
  Smartphone,
  Copy,
  Check,
  Send,
  Zap,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  BellRing,
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
  const [copied, setCopied] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const webhookUrl = `${window.location.origin}/api/webhook/bidv`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        // Parse locally and add to ledger
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
        setTestStatus(`Đã nhận: -${parsed.amount.toLocaleString('vi-VN')} VND (${randomSample.title})!`);
      } else {
        setTestStatus('Lỗi gửi webhook');
      }
    } catch (e: any) {
      setTestStatus('Lỗi kết nối webhook');
    } finally {
      setIsSendingTest(false);
      setTimeout(() => setTestStatus(null), 4000);
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
                Tự Động Nhận Thông Báo Từ Điện Thoại (Webhook)
              </h2>
              <p className="text-xs text-slate-500">
                Tự động ghi nhận chi tiêu mỗi khi điện thoại có thông báo từ BIDV
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

        <div className="p-5 sm:p-6 space-y-5 text-sm">
          {/* Webhook URL Endpoint Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Đường dẫn Webhook nhận thông báo:
            </label>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-mono text-xs text-teal-800 break-all select-all flex-1">
                {webhookUrl}
              </span>
              <button
                onClick={handleCopyUrl}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 shadow-2xs transition-colors shrink-0 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Đã chép
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    Sao chép
                  </>
                )}
              </button>
            </div>
          </div>

          {/* How it works banner */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
            <BellRing className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 space-y-1">
              <p className="font-semibold">Nguyên lý hoạt động tự động 100%:</p>
              <p>
                Khi bạn thanh toán qua BIDV (quẹt thẻ, quét QR, chuyển khoản), BIDV gửi tin nhắn SMS hoặc thông báo OTT qua ứng dụng SmartBanking. Điện thoại của bạn sẽ tự động chuyển tiếp nội dung này đến Webhook trên, hệ thống sẽ <strong>tự động bóc tách số tiền và phân loại danh mục</strong> ngay tức thì!
              </p>
            </div>
          </div>

          {/* 3 Step Setup Guide */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Hướng dẫn cài đặt trên Android (3 bước đơn giản):
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold mb-1.5">
                  1
                </div>
                <h4 className="font-semibold text-xs text-slate-900">Cài đặt ứng dụng</h4>
                <p className="text-[11px] text-slate-600">
                  Tải <strong>MacroDroid</strong> hoặc <strong>SMS Forwarder</strong> miễn phí trên Google Play Store.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold mb-1.5">
                  2
                </div>
                <h4 className="font-semibold text-xs text-slate-900">Tạo Trigger</h4>
                <p className="text-[11px] text-slate-600">
                  Chọn Trigger: <strong>Notification Received</strong> từ ứng dụng <em>BIDV SmartBanking</em> hoặc SMS từ <em>BIDV</em>.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold mb-1.5">
                  3
                </div>
                <h4 className="font-semibold text-xs text-slate-900">Gửi HTTP POST</h4>
                <p className="text-[11px] text-slate-600">
                  Hành động (Action): Gửi HTTP POST JSON <code className="bg-slate-200 px-1 rounded text-[10px]">{`{"text": "[not_text]"}`}</code> về Webhook URL ở trên.
                </p>
              </div>
            </div>
          </div>

          {/* Test Webhook simulation button */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {testStatus ? (
                <span className="font-semibold text-emerald-700">{testStatus}</span>
              ) : (
                <span>Nhấn nút bên cạnh để mô phỏng một sự kiện Webhook từ điện thoại</span>
              )}
            </div>

            <button
              id="btn-simulate-webhook"
              onClick={handleSendTestWebhook}
              disabled={isSendingTest}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 active:bg-teal-900 disabled:opacity-50 rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              Gửi Test Webhook BIDV Ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
