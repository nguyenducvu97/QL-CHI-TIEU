import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { parseBidvNotificationLocally } from './src/utils/bidvParser';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(
  express.json({
    limit: '10mb',
    verify: (req: any, _res, buf) => {
      req.rawBodyString = buf.toString();
    },
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
    verify: (req: any, _res, buf) => {
      req.rawBodyString = buf.toString();
    },
  })
);
app.use(
  express.text({
    type: ['text/*', '*/*'],
    limit: '10mb',
    verify: (req: any, _res, buf) => {
      req.rawBodyString = buf.toString();
    },
  })
);

// Lazy init Gemini SDK
let genAIClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

// Raw HTTP traffic history for instant diagnostics
interface HttpTrafficItem {
  id: string;
  time: string;
  method: string;
  url: string;
  ip: string;
  userAgent: string;
  bodyPreview: string;
  query: any;
  status: 'received' | 'error_empty' | 'processed';
  detail?: string;
}

const TRAFFIC_FILE = path.join(process.cwd(), 'data', 'webhook_traffic.json');
let recentTrafficLog: HttpTrafficItem[] = [];

try {
  if (fs.existsSync(TRAFFIC_FILE)) {
    recentTrafficLog = JSON.parse(fs.readFileSync(TRAFFIC_FILE, 'utf-8'));
  }
} catch {
  recentTrafficLog = [];
}

// Helper to record traffic
function recordTraffic(req: express.Request, status: HttpTrafficItem['status'], detail?: string) {
  try {
    const rawBody = typeof req.body === 'object' ? JSON.stringify(req.body) : String(req.body || '');
    recentTrafficLog.unshift({
      id: 'tr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      time: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl || req.url,
      ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
      bodyPreview: rawBody.substring(0, 300),
      query: req.query,
      status,
      detail,
    });
    if (recentTrafficLog.length > 50) recentTrafficLog.pop();
    if (!fs.existsSync(path.dirname(TRAFFIC_FILE))) {
      fs.mkdirSync(path.dirname(TRAFFIC_FILE), { recursive: true });
    }
    fs.writeFileSync(TRAFFIC_FILE, JSON.stringify(recentTrafficLog.slice(0, 50), null, 2), 'utf-8');
  } catch (e) {
    // Ignore
  }
}

// In-memory queue + disk persistence for real-time webhook events
interface WebhookEventItem {
  id: string;
  receivedAt: string;
  text: string;
  source: string;
  parsedData: any;
}

const EVENTS_FILE = path.join(process.cwd(), 'data', 'webhook_events.json');
const TRANSACTIONS_FILE = path.join(process.cwd(), 'data', 'transactions.json');

let recentWebhookEvents: WebhookEventItem[] = [];
let serverTransactions: any[] = [];

try {
  if (!fs.existsSync(path.dirname(EVENTS_FILE))) {
    fs.mkdirSync(path.dirname(EVENTS_FILE), { recursive: true });
  }
  if (fs.existsSync(EVENTS_FILE)) {
    const raw = fs.readFileSync(EVENTS_FILE, 'utf-8');
    recentWebhookEvents = JSON.parse(raw);
    console.log(`[Webhook] Loaded ${recentWebhookEvents.length} persisted webhook events`);
  }
} catch (e) {
  console.warn('[Webhook] Could not load persisted events:', e);
  recentWebhookEvents = [];
}

try {
  if (fs.existsSync(TRANSACTIONS_FILE)) {
    const raw = fs.readFileSync(TRANSACTIONS_FILE, 'utf-8');
    serverTransactions = JSON.parse(raw);
    console.log(`[Transactions] Loaded ${serverTransactions.length} persisted transactions`);
  }
} catch (e) {
  console.warn('[Transactions] Could not load persisted transactions:', e);
  serverTransactions = [];
}

function saveEventsToDisk() {
  try {
    if (!fs.existsSync(path.dirname(EVENTS_FILE))) {
      fs.mkdirSync(path.dirname(EVENTS_FILE), { recursive: true });
    }
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(recentWebhookEvents.slice(0, 50), null, 2), 'utf-8');
  } catch (e) {
    console.error('[Webhook] Failed to persist events:', e);
  }
}

function saveTransactionsToDisk() {
  try {
    if (!fs.existsSync(path.dirname(TRANSACTIONS_FILE))) {
      fs.mkdirSync(path.dirname(TRANSACTIONS_FILE), { recursive: true });
    }
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(serverTransactions, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Transactions] Failed to persist transactions:', e);
  }
}

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

// Parse BIDV SMS / Notification endpoint using Gemini AI
app.post('/api/parse-bidv', async (req, res) => {
  try {
    const { text, userRules } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text notification is required' });
    }

    const ai = getGeminiClient();

    // If Gemini key is available, use Gemini 3.8 Flash for intelligent parsing and categorization
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Phân tích thông báo biến động số dư trừ tiền của ngân hàng BIDV Việt Nam sau đây:
"${text}"

Hãy bóc tách chính xác các thông tin:
1. isBidvDebit: true nếu là biến động TRỪ TIỀN / CHI TIÊU / THANH TOÁN (debit). false nếu là cộng tiền hoặc thông báo rác không liên quan.
2. amount: Số tiền trừ (số nguyên dương VND, ví dụ 55000).
3. accountNumber: Số tài khoản BIDV trong tin nhắn (nếu có, ví dụ 1234567890 hoặc ...6789).
4. balance: Số dư còn lại sau giao dịch (nếu có, ví dụ 14845000).
5. timestamp: Thời gian giao dịch theo chuẩn ISO 8601 nếu có ngày giờ trong tin nhắn.
6. description: Nội dung chuyển khoản / giao dịch (phần ND hoặc nội dung).
7. merchant: Đơn vị nhận tiền / cửa hàng / dịch vụ được nhận diện (ví dụ: HIGHLANDS COFFEE, EVN, SHOPEE, WINMART, GRAB, PHARMACITY, TIỀN THUÊ NHÀ).
8. refNumber: Mã giao dịch / số tham chiếu (nếu có).
9. suggestedCategoryId: Chọn 1 trong các mã sau phù hợp nhất với mục đích chi tiêu:
   - "food": Ăn uống, cà phê, trà sữa, nhà hàng, quán ăn, GrabFood, ShopeeFood
   - "shopping": Mua sắm quần áo, siêu thị Winmart, Co.op, Shopee, Tiki, đồ dùng
   - "transport": Di chuyển, xe ôm Grab/Be/XanhSM, taxi, xăng dầu Petrolimex, vé xe, gửi xe
   - "bills": Hóa đơn tiền điện EVN, tiền nước, cước internet FPT/VNPT/Viettel, nạp điện thoại
   - "housing": Tiền thuê nhà, phòng trọ, phí dịch vụ chung cư, sửa nhà, đồ gia dụng
   - "health": Thuốc men, nhà thuốc Long Châu, Pharmacity, khám chữa bệnh, bệnh viện
   - "education": Học phí, khóa học, sách vở, tài liệu
   - "entertainment": Xem phim CGV, Netflix, Spotify, du lịch, khách sạn, vui chơi
   - "investment": Tiết kiệm, chứng khoán, trả nợ, phí ngân hàng
   - "other": Chi tiêu khác
10. confidence: Độ tin cậy từ 0.0 đến 1.0.
11. reasoning: Giải thích ngắn gọn bằng tiếng Việt vì sao chọn danh mục đó (1 câu).`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                isBidvDebit: { type: Type.BOOLEAN },
                amount: { type: Type.INTEGER },
                currency: { type: Type.STRING },
                accountNumber: { type: Type.STRING },
                balance: { type: Type.INTEGER },
                timestamp: { type: Type.STRING },
                description: { type: Type.STRING },
                merchant: { type: Type.STRING },
                refNumber: { type: Type.STRING },
                suggestedCategoryId: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                reasoning: { type: Type.STRING },
              },
              required: [
                'isBidvDebit',
                'amount',
                'description',
                'suggestedCategoryId',
                'confidence',
                'reasoning',
              ],
            },
          },
        });

        if (response.text) {
          const parsedAI = JSON.parse(response.text.trim());
          return res.json({
            success: true,
            source: 'gemini-ai',
            data: parsedAI,
          });
        }
      } catch (aiErr) {
        console.warn('Gemini parsing error, falling back to local engine:', aiErr);
      }
    }

    // Local heuristic fallback if Gemini is not ready
    return res.json({
      success: false,
      source: 'fallback',
      message: 'Sử dụng bộ phân tích cục bộ phía client',
    });
  } catch (error: any) {
    console.error('API /api/parse-bidv error:', error);
    res.status(500).json({ error: error.message || 'Lỗi xử lý tin nhắn' });
  }
});

// Helper to extract notification text from all possible forwarder formats
function extractWebhookText(req: express.Request & { rawBodyString?: string }): {
  rawText: string;
  cleanedText: string;
  isTestPing: boolean;
} {
  const parts: string[] = [];

  const isLiteralToken = (s: string) => {
    const t = s.trim().toLowerCase();
    return (
      t === '[not_title]' ||
      t === '[not_body]' ||
      t === '[not_ticker]' ||
      t === '[not_text]' ||
      t === '[notification]' ||
      t === '{not_title}' ||
      t === '{not_body}' ||
      t === ''
    );
  };

  // 1. Request body directly parsed by express
  const rawBody = req.body;
  if (rawBody && typeof rawBody === 'object') {
    // Check known field names
    const title = String(rawBody.not_title || rawBody.title || '').trim();
    const bodyText = String(
      rawBody.text ||
      rawBody.not_body ||
      rawBody.message ||
      rawBody.content ||
      rawBody.body ||
      rawBody.notification ||
      rawBody.not_text ||
      ''
    ).trim();
    const ticker = String(rawBody.not_ticker || rawBody.ticker || rawBody.subtext || '').trim();

    if (title && !isLiteralToken(title)) parts.push(title);
    if (bodyText && !isLiteralToken(bodyText)) parts.push(bodyText);
    if (ticker && !isLiteralToken(ticker)) parts.push(ticker);

    // If no direct fields found, inspect keys
    const keys = Object.keys(rawBody);
    if (keys.length > 0) {
      const firstKey = keys[0];
      if (firstKey.trim().startsWith('{')) {
        try {
          const parsedK = JSON.parse(firstKey);
          if (parsedK && typeof parsedK === 'object') {
            const kText = parsedK.text || parsedK.message || parsedK.content || parsedK.body || parsedK.not_body;
            if (kText && typeof kText === 'string') parts.push(kText.trim());
          }
        } catch {
          // ignore
        }
      } else if (
        firstKey.includes('BIDV') ||
        firstKey.includes('GD') ||
        firstKey.includes('VND') ||
        firstKey.includes('SmartBanking') ||
        firstKey.includes('TK')
      ) {
        parts.push(firstKey);
      }
    }
  }

  // 2. Query parameters (e.g. GET or POST ?text=... or ?not_title=...&not_body=...)
  if (req.query && Object.keys(req.query).length > 0) {
    const qTitle = String(req.query.not_title || req.query.title || '').trim();
    const qBody = String(
      req.query.text ||
      req.query.not_body ||
      req.query.message ||
      req.query.content ||
      req.query.body ||
      req.query.notification ||
      ''
    ).trim();
    const qTicker = String(req.query.not_ticker || req.query.ticker || '').trim();

    if (qTitle && !isLiteralToken(qTitle)) parts.push(qTitle);
    if (qBody && !isLiteralToken(qBody)) parts.push(qBody);
    if (qTicker && !isLiteralToken(qTicker)) parts.push(qTicker);
  }

  // 3. Raw body string captured at stream level
  const rawStr = (req.rawBodyString || (typeof rawBody === 'string' ? rawBody : '')).trim();
  if (rawStr && rawStr !== '{}' && rawStr !== '[]' && !isLiteralToken(rawStr)) {
    try {
      const parsed = JSON.parse(rawStr);
      if (typeof parsed === 'string') {
        parts.push(parsed.trim());
      } else if (parsed && typeof parsed === 'object') {
        const pText = parsed.text || parsed.message || parsed.content || parsed.body || parsed.not_body;
        const pTitle = parsed.not_title || parsed.title;
        if (pTitle && typeof pTitle === 'string' && !isLiteralToken(pTitle)) parts.push(pTitle);
        if (pText && typeof pText === 'string' && !isLiteralToken(pText)) parts.push(pText);
      }
    } catch {
      if (!isLiteralToken(rawStr) && !parts.includes(rawStr)) {
        parts.push(rawStr);
      }
    }
  }

  const rawCombined = parts.join(' ').trim();

  // Strip token placeholders
  const cleanedText = rawCombined
    .replace(/\[not_title\]/gi, '')
    .replace(/\[not_body\]/gi, '')
    .replace(/\[not_ticker\]/gi, '')
    .replace(/\[notification\]/gi, '')
    .replace(/\[not_text\]/gi, '')
    .replace(/\[not_sub_text\]/gi, '')
    .replace(/\{not_title\}/gi, '')
    .replace(/\{not_body\}/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // A test ping occurs only when there's zero content or explicit ping words
  const isTestPing =
    cleanedText.length === 0 ||
    cleanedText.toLowerCase() === 'test' ||
    cleanedText.toLowerCase() === 'ping' ||
    cleanedText.toLowerCase() === 'kiem tra';

  return {
    rawText: rawCombined || cleanedText,
    cleanedText,
    isTestPing,
  };
}

// Webhook for receiving real-time BIDV alerts from Android MacroDroid / Tasker / SMS Forwarder
// Accepts both POST and GET, and aliases for safety
const WEBHOOK_PATHS = ['/api/webhook/bidv', '/api/webhook', '/webhook/bidv', '/webhook'];

app.all(WEBHOOK_PATHS, async (req, res) => {
  try {
    const { rawText, cleanedText, isTestPing } = extractWebhookText(req);

    if (isTestPing) {
      console.log('[Webhook BIDV] Received test ping from device/MacroDroid');
      recordTraffic(req, 'received', 'Kiểm tra kết nối từ điện thoại thành công (chưa có thông báo BIDV thật)');

      // Broadcast connection test event so UI shows a green ping confirmation
      const testEventId = 'test-' + Date.now();
      const testItem: WebhookEventItem = {
        id: testEventId,
        receivedAt: new Date().toISOString(),
        text: 'Kiểm tra kết nối thành công từ MacroDroid! (Sẵn sàng nhận thông báo SmartBanking)',
        source: 'Android MacroDroid Test Ping',
        parsedData: {
          success: true,
          isBidvDebit: false,
          amount: 0,
          currency: 'VND',
          accountNumber: '8832123271',
          timestamp: new Date().toISOString(),
          description: 'Kiểm tra kết nối thành công',
          suggestedCategoryId: 'other',
          confidence: 1,
          reasoning: 'Kiểm tra đường truyền thành công',
          rawText: 'Test connection',
          isTestPing: true,
        },
      };
      broadcastWebhookEvent(testItem);

      return res.json({
        success: true,
        message: 'Kết nối thành công tới máy chủ Quản lý chi tiêu BIDV!',
        isTest: true,
        note: 'Khi có biến động số dư thật từ SmartBanking, số tiền sẽ được tự động ghi sổ.',
      });
    }

    const textToParse = cleanedText || rawText;

    const source =
      (typeof req.body === 'object' && req.body?.source) ||
      (req.query?.source as string) ||
      req.headers['user-agent'] ||
      'Android Webhook';

    console.log(`[Webhook BIDV] Received notification (${source}): "${textToParse.substring(0, 100)}..."`);

    // Parse notification immediately with local BIDV engine
    const parsedData = parseBidvNotificationLocally(textToParse);

    const eventId = 'wb-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    const eventItem: WebhookEventItem = {
      id: eventId,
      receivedAt: new Date().toISOString(),
      text: textToParse,
      source,
      parsedData,
    };

    recentWebhookEvents.unshift(eventItem);
    if (recentWebhookEvents.length > 100) {
      recentWebhookEvents.pop();
    }
    saveEventsToDisk();
    recordTraffic(req, 'processed', `Đã bóc tách thành công: ${parsedData.amount} VND (${parsedData.suggestedCategoryId})`);

    // Automatic 100% real-time transaction recording
    let autoRecordedTx: any = null;
    if (parsedData.amount > 0) {
      const txId = 'tx-' + (parsedData.refNumber ? parsedData.refNumber.replace(/[^a-zA-Z0-9_-]/g, '') : eventId);
      const isDuplicate = parsedData.refNumber && serverTransactions.some((t) => t.refNumber === parsedData.refNumber);

      if (!isDuplicate) {
        autoRecordedTx = {
          id: txId,
          accountNumber: parsedData.accountNumber || '8832123271',
          amount: parsedData.amount,
          type: parsedData.isBidvDebit ? 'debit' : 'credit',
          balance: parsedData.balance,
          timestamp: parsedData.timestamp || new Date().toISOString(),
          rawMessage: textToParse,
          description: parsedData.description || 'Giao dịch BIDV SmartBanking',
          merchant: parsedData.merchant,
          categoryId: parsedData.suggestedCategoryId || 'other',
          categoryReason: parsedData.isBidvDebit
            ? 'Tự động bắt từ thông báo BIDV: ' + (parsedData.reasoning || 'Nhận diện tự động')
            : 'Tự động bắt từ thông báo BIDV: Tiền vào tài khoản',
          confidence: parsedData.confidence || 0.95,
          source: 'webhook',
          refNumber: parsedData.refNumber,
          isAutoRecorded: true,
          reviewed: false,
        };

        serverTransactions.unshift(autoRecordedTx);
        saveTransactionsToDisk();
        console.log(`[AutoRecord] Ghi sổ tự động thành công: ${autoRecordedTx.type === 'debit' ? '-' : '+'}${autoRecordedTx.amount} VND (${autoRecordedTx.description})`);
      }
    }

    broadcastWebhookEvent(eventItem, autoRecordedTx);

    res.json({
      success: true,
      message: 'Đã nhận thông báo biến động BIDV thành công và tự động ghi sổ',
      eventId,
      receivedAt: eventItem.receivedAt,
      transaction: autoRecordedTx,
      parsed: {
        amount: parsedData.amount,
        type: parsedData.isBidvDebit ? 'debit' : 'credit',
        accountNumber: parsedData.accountNumber,
        balance: parsedData.balance,
        description: parsedData.description,
        category: parsedData.suggestedCategoryId,
      },
    });
  } catch (error: any) {
    console.error('[Webhook BIDV] Error:', error);
    recordTraffic(req, 'received', 'Lỗi xử lý: ' + String(error.message || error));
    res.status(500).json({ error: error.message || 'Lỗi nhận webhook' });
  }
});

// SSE Clients set
const sseClients = new Set<express.Response>();

function broadcastWebhookEvent(eventItem: WebhookEventItem, transaction?: any) {
  const data = JSON.stringify({
    type: 'bidv_event',
    event: eventItem,
    transaction: transaction || null,
  });
  const message = `data: ${data}\n\n`;

  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Server-Sent Events (SSE) for 0-latency instant delivery to the browser
app.get('/api/webhook/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Send initial ping
  res.write(
    `data: ${JSON.stringify({
      type: 'connected',
      count: recentWebhookEvents.length,
      latest: recentWebhookEvents[0] || null,
      serverTime: new Date().toISOString(),
    })}\n\n`
  );

  sseClients.add(res);

  // Keep-alive heartbeat every 15s to keep connection alive through cloud proxies
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// Transactions API (Persistent Server Storage & Cross-Device Sync)
app.get('/api/transactions', (_req, res) => {
  res.json({
    transactions: serverTransactions,
    count: serverTransactions.length,
    serverTime: new Date().toISOString(),
  });
});

app.post('/api/transactions', (req, res) => {
  const tx = req.body;
  if (!tx || !tx.id) {
    return res.status(400).json({ error: 'Dữ liệu giao dịch không hợp lệ (thiếu id)' });
  }
  const idx = serverTransactions.findIndex((t) => t.id === tx.id);
  if (idx !== -1) {
    serverTransactions[idx] = { ...serverTransactions[idx], ...tx };
  } else {
    serverTransactions.unshift(tx);
  }
  saveTransactionsToDisk();
  res.json({ success: true, transaction: tx });
});

app.patch('/api/transactions/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const idx = serverTransactions.findIndex((t) => t.id === id);
  if (idx !== -1) {
    serverTransactions[idx] = { ...serverTransactions[idx], ...updates };
    saveTransactionsToDisk();
    return res.json({ success: true, transaction: serverTransactions[idx] });
  }
  res.status(404).json({ error: 'Không tìm thấy giao dịch' });
});

app.delete('/api/transactions/:id', (req, res) => {
  const { id } = req.params;
  serverTransactions = serverTransactions.filter((t) => t.id !== id);
  saveTransactionsToDisk();
  res.json({ success: true, message: 'Đã xóa giao dịch khỏi máy chủ' });
});

// Get recent webhook events for real-time sync
app.get('/api/webhook/events', (req, res) => {
  res.json({
    events: recentWebhookEvents,
    count: recentWebhookEvents.length,
    serverTime: new Date().toISOString(),
  });
});

// Detailed webhook status & diagnostics
app.get('/api/webhook/status', (req, res) => {
  res.json({
    status: 'online',
    totalReceived: recentWebhookEvents.length,
    latestEvent: recentWebhookEvents[0] || null,
    totalTrafficAttempts: recentTrafficLog.length,
    serverTime: new Date().toISOString(),
  });
});

// Get raw HTTP traffic log for deep diagnostics
app.get('/api/webhook/traffic', (req, res) => {
  res.json({
    traffic: recentTrafficLog,
    count: recentTrafficLog.length,
    serverTime: new Date().toISOString(),
  });
});

// Clear webhook events
app.post('/api/webhook/clear', (req, res) => {
  recentWebhookEvents.length = 0;
  saveEventsToDisk();
  res.json({ success: true, message: 'Đã xóa nhật ký webhook' });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
