export type CategoryId =
  | 'food'
  | 'shopping'
  | 'transport'
  | 'bills'
  | 'housing'
  | 'health'
  | 'education'
  | 'entertainment'
  | 'investment'
  | 'other';

export interface CategoryInfo {
  id: CategoryId;
  name: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class or hex
  bgColor: string;
  borderColor: string;
  defaultBudget: number; // Monthly budget in VND
  keywords: string[];
}

export interface Transaction {
  id: string;
  accountNumber: string; // e.g. "1234567890" or "124***99"
  amount: number; // in VND (always positive for spending/debit)
  type: 'debit' | 'credit'; // mostly 'debit' for expense tracker
  balance?: number; // Post-transaction balance in VND
  timestamp: string; // ISO string
  rawMessage: string; // Original BIDV notification text
  description: string; // Extracted payment note / description
  merchant?: string; // Recognized merchant/receiver
  categoryId: CategoryId;
  categoryReason?: string; // Explanation of how it was categorized (e.g. "Khớp từ khóa HIGHLANDS" or "Gemini AI phân tích")
  confidence?: number; // 0 to 1
  source: 'manual' | 'sms_paste' | 'webhook' | 'demo';
  refNumber?: string; // e.g. "FT26258123456"
}

export interface CategoryBudget {
  categoryId: CategoryId;
  monthlyLimit: number; // in VND
}

export interface SmartRule {
  id: string;
  keyword: string; // e.g. "highlands", "shopee", "tien dien"
  categoryId: CategoryId;
  createdAt: string;
}

export interface ParseResult {
  success: boolean;
  isBidvDebit: boolean;
  amount: number;
  currency: string;
  accountNumber: string;
  balance?: number;
  timestamp: string;
  description: string;
  merchant?: string;
  refNumber?: string;
  suggestedCategoryId: CategoryId;
  confidence: number;
  reasoning: string;
  rawText: string;
}

export interface WebhookEvent {
  id: string;
  receivedAt: string;
  text: string;
  source?: string;
  status: 'processed' | 'pending' | 'failed';
  parsedData?: Partial<ParseResult>;
}
