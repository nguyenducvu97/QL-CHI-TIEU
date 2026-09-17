import { CategoryId, ParseResult, SmartRule } from '../types';
import { DEFAULT_CATEGORIES } from '../data/categories';

/**
 * Remove Vietnamese accents for loose keyword matching
 */
export function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Formats a number as VND (e.g. 50,000 ₫)
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a readable date in Vietnamese
 */
export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return isoString;
  }
}

/**
 * Parses numeric amount strings such as "-55,000", "55.000", "2,500,000 VND"
 */
function cleanNumber(str: string): number {
  if (!str) return 0;
  // Remove commas, dots, spaces, currencies
  const cleaned = str.replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
}

/**
 * Parse BIDV notification string using regular expressions
 */
export function parseBidvNotificationLocally(
  rawText: string,
  userRules: SmartRule[] = []
): ParseResult {
  const text = rawText.trim();
  const normalized = removeVietnameseTones(text);

  // Check if it looks like a BIDV notification or banking message
  const hasBidvSign =
    normalized.includes('bidv') ||
    normalized.includes('smartbanking') ||
    normalized.includes('tk ') ||
    normalized.includes('bien dong so du');

  // 1. Extract Account Number
  // "TK 1234567890", "TK: 1234567890", "Tai khoan 1234567890"
  let accountNumber = '1234567890';
  const accMatch =
    text.match(/(?:TK|Tai khoan|Tài khoản|Số TK|So TK)[:\s]+([0-9xX*]{6,16})/i) ||
    text.match(/([0-9]{9,14})/);
  if (accMatch) {
    accountNumber = accMatch[1];
  }

  // 2. Extract Amount and Debit / Credit check
  // E.g. "-55,000VND", "+10,000,000VND", "nhan tien 500,000", "thanh toan 120,000"
  let amount = 0;
  let isDebit = true;

  const creditMatch = text.match(
    /(?:\+|cộng|cong|nhan tien|chuyen vao|nap tien|hoan tien|nhan duoc|ting ting)\s*([0-9]{1,3}(?:[.,]\d{3})+|[0-9]+)\s*(?:VND|đ|d)?/i
  );
  const debitMatch = text.match(
    /(?:-|trừ|bi tru|thanh toan|chuyen tien|rut tien|phi)\s*([0-9]{1,3}(?:[.,]\d{3})+|[0-9]+)\s*(?:VND|đ|d)?/i
  );
  const generalAmountMatch = text.match(
    /([+-]?)\s*([0-9]{1,3}(?:[.,]\d{3})+|[0-9]{4,})\s*(?:VND|đ|d)/i
  );

  if (creditMatch && (!debitMatch || text.includes('+') || normalized.includes('cong') || normalized.includes('nhan'))) {
    amount = cleanNumber(creditMatch[1]);
    isDebit = false;
  } else if (debitMatch) {
    amount = cleanNumber(debitMatch[1]);
    isDebit = true;
  } else if (generalAmountMatch) {
    const sign = generalAmountMatch[1];
    amount = cleanNumber(generalAmountMatch[2]);
    isDebit = sign !== '+';
  } else {
    // Fallback: raw '+' or '-'
    const rawPlusMatch = text.match(/\+([0-9.,]+)/);
    const rawMinusMatch = text.match(/-([0-9.,]+)/);
    if (rawPlusMatch) {
      amount = cleanNumber(rawPlusMatch[1]);
      isDebit = false;
    } else if (rawMinusMatch) {
      amount = cleanNumber(rawMinusMatch[1]);
      isDebit = true;
    }
  }

  // 3. Extract Balance (Số dư / SD)
  let balance: number | undefined = undefined;
  const balanceMatch = text.match(
    /(?:Số dư|So du|SD)[:\s]+([0-9]{1,3}(?:[.,]\d{3})+|[0-9]+)\s*(?:VND|đ|d)?/i
  );
  if (balanceMatch) {
    balance = cleanNumber(balanceMatch[1]);
  }

  // 4. Extract Timestamp
  // "vao 14:25 15/09/2026" or "luc 10:15 12/09/2026" or "15/09/2026 14:25"
  let timestamp = new Date().toISOString();
  const timeDateMatch = text.match(
    /(?:vao|vào|luc|lúc)?\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:ngay|ngày)?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i
  );
  const dateTimeMatch = text.match(
    /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s*(\d{1,2}:\d{2}(?::\d{2})?)/i
  );

  if (timeDateMatch) {
    const timeStr = timeDateMatch[1];
    const dateStr = timeDateMatch[2].replace(/-/g, '/');
    const [day, month, yearPart] = dateStr.split('/');
    const fullYear = yearPart.length === 2 ? `20${yearPart}` : yearPart;
    const isoCandidate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timeStr}:00.000Z`;
    const parsed = new Date(isoCandidate);
    if (!isNaN(parsed.getTime())) {
      timestamp = isoCandidate;
    }
  } else if (dateTimeMatch) {
    const dateStr = dateTimeMatch[1].replace(/-/g, '/');
    const timeStr = dateTimeMatch[2];
    const [day, month, yearPart] = dateStr.split('/');
    const fullYear = yearPart.length === 2 ? `20${yearPart}` : yearPart;
    const isoCandidate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timeStr}:00.000Z`;
    const parsed = new Date(isoCandidate);
    if (!isNaN(parsed.getTime())) {
      timestamp = isoCandidate;
    }
  }

  // 5. Extract Reference code
  let refNumber: string | undefined = undefined;
  const refMatch = text.match(/(?:Ref|So GD|Số GD|Mã GD|Ma GD)[:\s]+([A-Za-z0-9]+)/i);
  if (refMatch) {
    refNumber = refMatch[1];
  }

  // 6. Extract Description / Note
  // "ND: ...", "Nội dung: ...", "Noi dung: ..."
  let description = '';
  const descMatch = text.match(/(?:ND|Nội dung|Noi dung|Lý do|Ly do)[:\s]+([^.]+)/i);
  if (descMatch) {
    description = descMatch[1].trim();
  } else {
    // If not explicitly formatted with ND:, use the tail portion
    const parts = text.split(/[.;]/);
    if (parts.length > 1) {
      description = parts[parts.length - 1].trim();
    } else {
      description = text;
    }
  }

  // 7. Extract Merchant / Payee heuristics
  let merchant = '';
  const cleanDesc = description.toUpperCase();
  if (cleanDesc.includes('HIGHLANDS')) merchant = 'HIGHLANDS COFFEE';
  else if (cleanDesc.includes('SHOPEE')) merchant = 'SHOPEE';
  else if (cleanDesc.includes('GRAB')) merchant = 'GRAB';
  else if (cleanDesc.includes('PETROLIMEX')) merchant = 'PETROLIMEX';
  else if (cleanDesc.includes('PHARMACITY')) merchant = 'PHARMACITY';
  else if (cleanDesc.includes('LONG CHAU')) merchant = 'LONG CHÂU';
  else if (cleanDesc.includes('WINMART')) merchant = 'WINMART';
  else if (cleanDesc.includes('EVN')) merchant = 'EVN';
  else if (cleanDesc.includes('NETFLIX')) merchant = 'NETFLIX';
  else if (cleanDesc.includes('STARBUCKS')) merchant = 'STARBUCKS';
  else if (cleanDesc.includes('PHUC LONG')) merchant = 'PHÚC LONG';
  else if (cleanDesc.includes('LAZADA')) merchant = 'LAZADA';
  else if (cleanDesc.includes('TIKI')) merchant = 'TIKI';
  else if (cleanDesc.includes('BE ')) merchant = 'BE GROUP';
  else if (cleanDesc.includes('XANH SM')) merchant = 'XANH SM';

  // 8. Categorize using User Rules first, then Default Category Keywords
  let suggestedCategoryId: CategoryId = 'other';
  let reasoning = 'Phân loại mặc định';
  let confidence = 0.6;

  const descNormalized = removeVietnameseTones(description + ' ' + text);

  // Check custom user rules
  for (const rule of userRules) {
    const kwNormalized = removeVietnameseTones(rule.keyword);
    if (kwNormalized && descNormalized.includes(kwNormalized)) {
      suggestedCategoryId = rule.categoryId;
      reasoning = `Khớp quy tắc người dùng đặt: "${rule.keyword}"`;
      confidence = 0.99;
      break;
    }
  }

  // Check default categories
  if (suggestedCategoryId === 'other') {
    for (const cat of DEFAULT_CATEGORIES) {
      for (const kw of cat.keywords) {
        const kwNorm = removeVietnameseTones(kw);
        if (kwNorm.length > 2 && descNormalized.includes(kwNorm)) {
          suggestedCategoryId = cat.id;
          reasoning = `Khớp từ khóa nhận diện: "${kw}"`;
          confidence = 0.95;
          break;
        }
      }
      if (suggestedCategoryId !== 'other') break;
    }
  }

  // If credit (cộng tiền), set appropriate classification
  if (!isDebit) {
    if (suggestedCategoryId === 'other') {
      suggestedCategoryId = 'investment';
    }
    if (reasoning === 'Phân loại mặc định') {
      reasoning = 'Giao dịch cộng tiền / nhận tiền vào tài khoản BIDV';
    }
  }

  return {
    success: amount > 0,
    isBidvDebit: isDebit,
    amount,
    currency: 'VND',
    accountNumber,
    balance,
    timestamp,
    description: description || 'Giao dịch qua ngân hàng BIDV',
    merchant: merchant || undefined,
    refNumber,
    suggestedCategoryId,
    confidence,
    reasoning,
    rawText: text,
  };
}
