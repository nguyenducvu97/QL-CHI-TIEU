import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wallet,
  Tag,
  Store,
  RefreshCw,
  Copy,
  Plus,
  Zap,
} from 'lucide-react';
import { CategoryId, ParseResult, SmartRule, Transaction } from '../types';
import { DEFAULT_CATEGORIES, getCategoryById } from '../data/categories';
import { SAMPLE_BIDV_MESSAGES, SampleBidvMessage } from '../data/mockBidvData';
import { parseBidvNotificationLocally, formatVND, formatDateTime } from '../utils/bidvParser';
import { CategoryIcon } from './CategoryIcon';

interface NotificationSimulatorProps {
  onAddTransaction: (tx: Transaction) => void;
  userRules: SmartRule[];
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
}

export const NotificationSimulator: React.FC<NotificationSimulatorProps> = ({
  onAddTransaction,
  userRules,
  isOpen,
  onClose,
  initialText,
}) => {
  const [inputText, setInputText] = useState(initialText || SAMPLE_BIDV_MESSAGES[0].text);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('food');
  const [autoSave, setAutoSave] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [engineUsed, setEngineUsed] = useState<'gemini' | 'local' | null>(null);

  React.useEffect(() => {
    if (initialText) {
      setInputText(initialText);
      setParseResult(null);
    }
  }, [initialText, isOpen]);

  if (!isOpen) return null;

  const handleSelectSample = (sample: SampleBidvMessage) => {
    setInputText(sample.text);
    setParseResult(null);
    setAddedSuccess(false);
  };

  const handleParse = async () => {
    if (!inputText.trim()) return;
    setIsAnalyzing(true);
    setAddedSuccess(false);

    try {
      // Try server-side Gemini parsing first
      const res = await fetch('/api/parse-bidv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, userRules }),
      });

      const data = await res.json();

      if (data.success && data.data) {
        const aiData = data.data;
        const result: ParseResult = {
          success: aiData.amount > 0,
          isBidvDebit: aiData.isBidvDebit ?? true,
          amount: aiData.amount || 0,
          currency: 'VND',
          accountNumber: aiData.accountNumber || '1234567890',
          balance: aiData.balance,
          timestamp: aiData.timestamp || new Date().toISOString(),
          description: aiData.description || 'Giao dịch BIDV',
          merchant: aiData.merchant,
          refNumber: aiData.refNumber,
          suggestedCategoryId: (aiData.suggestedCategoryId as CategoryId) || 'other',
          confidence: aiData.confidence || 0.95,
          reasoning: aiData.reasoning || 'Phân tích bởi Gemini AI',
          rawText: inputText,
        };
        setParseResult(result);
        setSelectedCategory(result.suggestedCategoryId);
        setEngineUsed('gemini');

        if (autoSave && result.success && result.amount > 0) {
          saveTransaction(result, result.suggestedCategoryId);
        }
        setIsAnalyzing(false);
        return;
      }
    } catch (err) {
      console.warn('API error, using local parser:', err);
    }

    // Fallback: high-accuracy local regex & keyword parser
    const localResult = parseBidvNotificationLocally(inputText, userRules);
    setParseResult(localResult);
    setSelectedCategory(localResult.suggestedCategoryId);
    setEngineUsed('local');

    if (autoSave && localResult.success && localResult.amount > 0) {
      saveTransaction(localResult, localResult.suggestedCategoryId);
    }
    setIsAnalyzing(false);
  };

  const saveTransaction = (result: ParseResult, catId: CategoryId) => {
    const newTx: Transaction = {
      id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      accountNumber: result.accountNumber,
      amount: result.amount,
      type: result.isBidvDebit ? 'debit' : 'credit',
      balance: result.balance,
      timestamp: result.timestamp,
      rawMessage: result.rawText,
      description: result.description,
      merchant: result.merchant,
      categoryId: catId,
      categoryReason: result.reasoning,
      confidence: result.confidence,
      source: 'sms_paste',
      refNumber: result.refNumber,
    };

    onAddTransaction(newTx);
    setAddedSuccess(true);
    setTimeout(() => {
      setAddedSuccess(false);
    }, 2500);
  };

  const categoryObj = getCategoryById(selectedCategory);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-6">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Nhận Diện & Phân Loại Thông Báo BIDV
              </h2>
              <p className="text-xs text-slate-500">
                Dán tin nhắn SMS Banking hoặc OTT SmartBanking để phân tích tự động
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
          {/* Quick sample templates */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Chọn tin nhắn mẫu thực tế của BIDV:
              </span>
              <span className="text-xs text-slate-400">Nhấn 1 chạm để thử</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_BIDV_MESSAGES.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSample(sample)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 text-slate-700 transition-all cursor-pointer text-left"
                >
                  <span className="font-semibold">{sample.title}</span>
                  <span className="text-[10px] text-slate-400 ml-1.5">({sample.sourceType})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Textarea for notification text */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="bidv-sms-input" className="text-xs font-semibold text-slate-700">
                Nội dung thông báo / SMS biến động số dư:
              </label>
              <button
                type="button"
                onClick={() => setInputText('')}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Xóa nội dung
              </button>
            </div>
            <div className="relative">
              <textarea
                id="bidv-sms-input"
                rows={3}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  setParseResult(null);
                }}
                placeholder="Dán thông báo trừ tiền của ngân hàng BIDV tại đây, ví dụ: TK 1234567890 tai BIDV -50,000VND vao 14:25 15/09/2026. So du: 14,845,000VND. ND: Highlands Coffee..."
                className="w-full text-sm rounded-xl border border-slate-200 p-3 text-slate-800 font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden bg-slate-50/50"
              />
            </div>
          </div>

          {/* Actions & Auto Save Checkbox */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <span className="text-xs text-slate-600">
                Tự động lưu vào sổ chi tiêu ngay khi phân tích xong
              </span>
            </label>

            <div className="flex items-center gap-2">
              <button
                id="btn-parse-bidv"
                onClick={handleParse}
                disabled={isAnalyzing || !inputText.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Đang phân tích (AI)...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Phân Tích & Phân Loại
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Result Card Preview */}
          {parseResult && (
            <div
              className={`p-4 rounded-xl border transition-all ${
                parseResult.amount > 0
                  ? parseResult.isBidvDebit
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-teal-50/60 border-teal-200'
                  : 'bg-amber-50/50 border-amber-200'
              }`}
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/70">
                <div className="flex items-center gap-2">
                  {parseResult.amount > 0 ? (
                    parseResult.isBidvDebit ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Phát sinh trừ tiền (Chi tiêu)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                        Phát sinh cộng tiền (Thu nhập / Nhận tiền)
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      Không tìm thấy số tiền hợp lệ
                    </span>
                  )}
                  {engineUsed === 'gemini' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <Sparkles className="w-3 h-3 text-indigo-600" />
                      Gemini 3.8 Flash
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-500 block">
                    {parseResult.isBidvDebit ? 'Số tiền trừ:' : 'Số tiền cộng:'}
                  </span>
                  <span
                    className={`text-lg font-bold font-mono ${
                      parseResult.isBidvDebit ? 'text-red-600' : 'text-emerald-600'
                    }`}
                  >
                    {parseResult.isBidvDebit ? '-' : '+'}
                    {formatVND(parseResult.amount)}
                  </span>
                </div>
              </div>

              {/* Grid of parsed details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-500">Tài khoản BIDV:</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {parseResult.accountNumber}
                    </span>
                  </div>

                  {parseResult.balance !== undefined && (
                    <div className="flex items-center gap-2">
                      <Wallet className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-500">Số dư còn lại:</span>
                      <span className="font-semibold text-slate-800 font-mono">
                        {formatVND(parseResult.balance)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-500">Thời gian:</span>
                    <span className="font-medium text-slate-800">
                      {formatDateTime(parseResult.timestamp)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {parseResult.merchant && (
                    <div className="flex items-center gap-2">
                      <Store className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-500">Đơn vị nhận:</span>
                      <span className="font-semibold text-slate-800">
                        {parseResult.merchant}
                      </span>
                    </div>
                  )}

                  <div className="flex items-start gap-2">
                    <Tag className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                    <div>
                      <span className="text-slate-500">Nội dung chuyển:</span>
                      <p className="font-medium text-slate-800 mt-0.5 line-clamp-2">
                        {parseResult.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category selector & reason */}
              <div className="mt-4 pt-3 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">
                    Danh mục tự động cập nhật:
                  </span>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-white shadow-2xs">
                    <CategoryIcon
                      categoryId={selectedCategory}
                      className="w-4 h-4"
                      style={{ color: categoryObj.color }}
                    />
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value as CategoryId)}
                      className="text-xs font-semibold text-slate-800 bg-transparent border-none outline-hidden cursor-pointer"
                    >
                      {DEFAULT_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="text-xs text-slate-500 italic">
                  Lý do: {parseResult.reasoning}
                </div>
              </div>

              {/* Confirm Add Button */}
              <div className="mt-4 flex items-center justify-end gap-2">
                {addedSuccess ? (
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg">
                    <CheckCircle2 className="w-4 h-4" />
                    Đã thêm vào sổ chi tiêu thành công!
                  </div>
                ) : (
                  <button
                    id="btn-confirm-add-tx"
                    onClick={() => saveTransaction(parseResult, selectedCategory)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Xác Nhận Thêm Vào Sổ Giao Dịch
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
