import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// In-memory queue for real-time webhook events
interface WebhookEventItem {
  id: string;
  receivedAt: string;
  text: string;
  source: string;
  parsedData: any;
}
const recentWebhookEvents: WebhookEventItem[] = [];

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

// Webhook for receiving real-time BIDV alerts from Android MacroDroid / Tasker / SMS Forwarder
app.post('/api/webhook/bidv', async (req, res) => {
  try {
    const rawBody = req.body;
    // Support common forwarder payload shapes: { text }, { message }, { content }, or { body }
    const text =
      rawBody.text ||
      rawBody.message ||
      rawBody.content ||
      rawBody.body ||
      (typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody));

    const source = rawBody.source || req.headers['user-agent'] || 'Android Webhook';

    const eventId = 'wb-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    const eventItem: WebhookEventItem = {
      id: eventId,
      receivedAt: new Date().toISOString(),
      text,
      source,
      parsedData: null,
    };

    recentWebhookEvents.unshift(eventItem);
    if (recentWebhookEvents.length > 50) {
      recentWebhookEvents.pop();
    }

    res.json({
      success: true,
      message: 'Đã nhận thông báo biến động BIDV thành công',
      eventId,
      receivedAt: eventItem.receivedAt,
    });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message || 'Lỗi nhận webhook' });
  }
});

// Get recent webhook events for real-time sync
app.get('/api/webhook/events', (req, res) => {
  res.json({
    events: recentWebhookEvents,
  });
});

// Clear webhook events
app.post('/api/webhook/clear', (req, res) => {
  recentWebhookEvents.length = 0;
  res.json({ success: true });
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
