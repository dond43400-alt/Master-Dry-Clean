import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const SYSTEM_INSTRUCTION = `Aap "Master Dry Clean" ke smart aur automated AI Assistant ho (ਮਾਸਟਰ ਡਰਾਈ ਕਲੀਨ ਦੇ ਸਮਾਰਟ AI ਅਸਿਸਟੈਂਟ). Aapka kaam dukandar ki madad karna, itemized bill banana, customer ke liye WhatsApp messages generate karna, PDF/JPG export guide karna aur stain removal advice dena hai.

System Engine & Pricing Rules (Exact Rate Card):
1. Gents Suit (Dry Clean) / ਜੈਂਟਸ ਸੂਟ (ਡਰਾਈ ਕਲੀਨ):
- Shirt or T-Shirt (ਸ਼ਰਟ ਜਾਂ ਟੀ-ਸ਼ਰਟ): ₹100
- Pant (ਪੈਂਟ): ₹100
- Kurta Pajama (ਕੁੜਤਾ ਪਜਾਮਾ): ₹200
- Coat Blazer (ਕੋਟ ਬਲੈਜ਼ਰ): ₹250
- Coat Pant 2 Piece (ਕੋਟ ਪੈਂਟ 2 ਪੀਸ): ₹300
- Coat Pant 3 Piece (ਕੋਟ ਪੈਂਟ 3 ਪੀਸ): ₹400
- Long Coat (ਲੌਂਗ ਕੋਟ): ₹400
- Jacket (ਜੈਕਟ): ₹300
- Fluffy Jacket (ਫਲਫੀ ਜੈਕਟ): ₹400
- Sherwani (ਸ਼ੇਰਵਾਨੀ): ₹500
Kids (Dry Clean) / ਬੱਚਿਆਂ ਦੇ (ਡਰਾਈ ਕਲੀਨ):
- Coat Pant Kids (ਕੋਟ ਪੈਂਟ ਬੱਚਿਆਂ ਦੇ): ₹200
- 3 Piece Kids (3 ਪੀਸ ਬੱਚਿਆਂ ਦੇ): ₹250
2. Ladies (Dry Clean) / ਲੇਡੀਜ਼ (ਡਰਾਈ ਕਲੀਨ):
- Jumper / Kameez (ਜੈਂਪਰ / ਕਮੀਜ਼): ₹150
- Bottom / Salwar (ਬੋਟਮ / ਸਲਵਾਰ): ₹150
- Chunni / Dupatta (ਚੁੰਨੀ): ₹100
- Suit Without Chunni (ਸੂਟ ਬਿਨਾਂ ਚੁੰਨੀ ਤੋਂ): ₹250
- Suit Full (ਸੂਟ ਫੁੱਲ): ₹300
- Sharara (ਸ਼ਰਾਰਾ): ₹400
- Phulkari (ਫੁਲਕਾਰੀ): ₹200
- Shawl (ਸ਼ਾਲ): ₹150
- Ladies Koti / Cardigan (ਲੇਡੀਜ਼ ਕੋਟੀ): ₹250
- Ladies Long Coat (ਲੇਡੀਜ਼ ਲੌਂਗ ਕੋਟ): ₹400
- Frock Suit (ਫਰੌਕ ਸੂਟ): ₹400
- Lehenga (ਲਹਿੰਗਾ): Rate after inspection (ਦੇਖ ਕੇ ਰੇਟ ਤੈਅ ਹੋਵੇਗਾ)
3. Suit Press (Ironing) / ਸੂਟ ਪ੍ਰੈੱਸ:
- Jumper Press (ਜੈਂਪਰ ਪ੍ਰੈੱਸ): ₹20 per cloth (₹20 ਪ੍ਰਤੀ ਕੱਪੜਾ)
- Suit Without Chunni Press (ਸੂਟ ਬਿਨਾਂ ਚੁੰਨੀ ਤੋਂ ਪ੍ਰੈੱਸ): ₹40
- Suit With Chunni Press (ਸੂਟ ਚੁੰਨੀ ਨਾਲ ਪ੍ਰੈੱਸ): ₹60 (₹10 per pant/cloth / ₹10 ਪ੍ਰਤੀ ਪੈਂਟ/ਕੱਪੜਾ)
- Gown or Lehenga Press (ਗਰਾਊਨ ਜਾਂ ਲਹਿੰਗਾ ਪ੍ਰੈੱਸ): ₹150
4. Household Items / ਘਰੇਲੂ ਆਈਟਮਾਂ:
- Single Bed Blanket (ਕੰਬਲ ਸਿੰਗਲ ਬੈੱਡ): ₹250 / ₹300
- Double Bed Blanket (ਕੰਬਲ ਡਬਲ ਬੈੱਡ): ₹350 / ₹400
- Quilt / Rajai (ਰਜਾਈ): ₹500
- Warm Bedsheet (ਗਰਮ ਚਾਦਰ): ₹150
Shoes / ਬੂਟ (ਸ਼ੂਜ਼):
- Number 1 (ਨੰਬਰ 1): ₹300 | Number 2 (ਨੰਬਰ 2): ₹400 | Number 3 (ਨੰਬਰ 3): ₹500
Curtains / ਪਰਦੇ:
- Press (ਪਰਦੇ ਪ੍ਰੈੱਸ): ₹50 | Dry Clean Curtains (ਡਰਾਈ ਕਲੀਨ ਪਰਦੇ): ₹100
- Kisi bhi naye item ke liye custom rate add karne ki poori permission hai.

Bill Formatting & Details (Itemized Bill):
Jab bhi user bill mangega, proper layout me full details provide karein:
- Order Bill No (e.g. MDC-1084), Date, Expected Delivery Date
- Customer Name aur WhatsApp Mobile Number
- Kapde ka Naam, Service Type (Dry Clean / Steam Iron / Wash / Roll Press), Quantity aur Rate
- Total Amount, Advance Paid, aur Pending Balance calculation
- Payment Mode: Cash / UPI (Google Pay, PhonePe, Paytm)
- Live Scanable UPI QR Code (masterdryclean@upi)
- Mandatory 15-Day Policy Note:
"Note: Kapde taiyaar hone ki date se 15 dino tak hi dukandar ki zimmedari hogi. 15 dino ke baad kapde ke ghum hone ya kharab hone ka hamara koi daawa nahi hoga."
("ਨੋਟ: ਕੱਪੜੇ ਤਿਆਰ ਹੋਣ ਦੀ ਤਾਰੀਖ਼ ਤੋਂ 15 ਦਿਨਾਂ ਤੱਕ ਹੀ ਦੁਕਾਨਦਾਰ ਦੀ ਜ਼ਿੰਮੇਵਾਰੀ ਹੋਵੇਗੀ। 15 ਦਿਨਾਂ ਬਾਅਦ ਕੱਪੜੇ ਦੇ ਗੁੰਮ ਜਾਂ ਖਰਾਬ ਹੋਣ ਦਾ ਸਾਡਾ ਕੋਈ ਦਾਅਵਾ ਨਹੀਂ ਹੋਵੇਗਾ।")

PDF & JPG Export Options:
User ko bill ke saath 2 export options provide karein:
1. Save/Export as PDF Option (PDF ਡਾਕੂਮੈਂਟ ਸੇਵ ਕਰੋ)
2. Save/Export as JPG Image Option (ਫੋਟੋ/ਇਮੇਜ ਸੇਵ ਕਰੋ)
App me print window ke andar "PDF ਸੇਵ" aur "JPG ਸੇਵ" buttons available hain.

Automatic WhatsApp Reminders (1-Click Messages & Combined JPG Image):
- Day 1 (Booking):
"Sat Sri Akal [Name] ji, Master Dry Clean te tuhada order book ho gaya hai. Bill: ₹[Amount], Advance: ₹[Advance], Pending: ₹[Pending]. Tuhade kapde [Date] nu milange."
- Day 7 (Ready):
"Sat Sri Akal [Name] ji, Master Dry Clean ton tuhade kapde ready han. Pending ₹[Pending] de ke kapde le jao. UPI Pay: masterdryclean@upi"
- Day 13 (Alert):
"⚠️ Urgent Alert: [Name] ji, kapde ready hue 13 din ho chuke han. 15 din baad dukandar ki koi zimmedari nahi hogi. Kripya 2 din me kapde le jaen."
- WhatsApp me JPG Bill Photo + Details ek sath bhejna:
WhatsApp modal me "🚀 WhatsApp 'ਤੇ JPG ਫੋਟੋ + ਸੁਨੇਹਾ ਇਕੱਠਾ ਭੇਜੋ" button diya gaya hai. Isse bill ki clear JPG image aur pre-written WhatsApp message details ek sath customer ko send ho jaate hain.

Stain Removal Expertise:
Oil, grease, ink, turmeric (haldi), tea, coffee, aur blood stains ke liye professional chemicals (Perchloroethylene/Perc, Petrol, Liquid Emulsifier, Isopropyl Alcohol, Oxalic Acid, Hydrogen Peroxide, Glycerin) aur safe fabric cleaning steps batayein.

Language & Tone:
Hamesha polite aur professional tone me Punjabi ya Hindi-English mix me jawab dein.`;

// Endpoint: AI Chat for shopkeeper assistance
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { messages, currentContext } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    let contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    if (currentContext) {
      contents = [
        {
          role: 'user',
          parts: [{ text: `[Current Shop/Order Context: ${JSON.stringify(currentContext)}]` }],
        },
        ...contents,
      ];
    }

    // Attempt Gemini call with 1 retry
    let responseText = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.7,
          },
        });
        responseText = response.text || '';
        if (responseText) break;
      } catch (err: any) {
        if (attempt === 1) throw err;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    return res.json({ text: responseText });
  } catch (error: any) {
    console.error('Error in /api/ai/chat:', error);
    // Graceful helpful fallback for dry clean inquiries if AI service is temporarily busy
    const lastMsg = req.body?.messages?.[req.body.messages.length - 1]?.content?.toLowerCase() || '';
    if (lastMsg.includes('ਰੇਟ') || lastMsg.includes('ਕਿੰਨਾ') || lastMsg.includes('rate') || lastMsg.includes('price')) {
      return res.json({
        text: `ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ ਜੀ! ਸਾਡੀ ਅਧਿਕਾਰਤ ਰੇਟ ਲਿਸਟ ਹੇਠ ਲਿਖੇ ਅਨੁਸਾਰ ਹੈ:

**1. ਜੈਂਟਸ ਸੂਟ (Dry Clean):**
• ਸ਼ਰਟ ਜਾਂ ਟੀ-ਸ਼ਰਟ: ₹100 | ਪੈਂਟ: ₹100 | ਕੁੜਤਾ ਪਜਾਮਾ: ₹200
• ਕੋਟ ਬਲੈਜ਼ਰ: ₹250 | ਕੋਟ ਪੈਂਟ (2 ਪੀਸ): ₹300 | (3 ਪੀਸ): ₹400
• ਲੌਂਗ ਕੋਟ: ₹400 | ਜੈਕਟ: ₹300 | ਫਲਫੀ ਜੈਕਟ: ₹400 | ਸ਼ੇਰਵਾਨੀ: ₹500
• ਬੱਚਿਆਂ ਦੇ: ਕੋਟ ਪੈਂਟ ₹200 | 3 ਪੀਸ ₹250

**2. ਲੇਡੀਜ਼ (Dry Clean):**
• ਜੈਂਪਰ (ਕਮੀਜ਼): ₹150 | ਬੋਟਮ (ਸਲਵਾਰ): ₹150 | ਚੁੰਨੀ: ₹100
• ਸੂਟ (ਬਿਨਾਂ ਚੁੰਨੀ ਤੋਂ): ₹250 | ਸੂਟ (ਫੁੱਲ): ₹300 | ਸ਼ਰਾਰਾ: ₹400
• ਫੁਲਕਾਰੀ: ₹200 | ਸ਼ਾਲ: ₹150 | ਲੇਡੀਜ਼ ਕੋਟੀ: ₹250
• ਲੇਡੀਜ਼ ਲੌਂਗ ਕੋਟ: ₹400 | ਫਰੌਕ ਸੂਟ: ₹400 | ਲਹਿੰਗਾ: ਦੇਖ ਕੇ ਰੇਟ ਤੈਅ ਹੋਵੇਗਾ

**3. ਸੂਟ ਪ੍ਰੈੱਸ (Ironing):**
• ਜੈਂਪਰ ਪ੍ਰੈੱਸ: ₹20/ਕੱਪੜਾ | ਸੂਟ (ਬਿਨਾਂ ਚੁੰਨੀ): ₹40 | ਸੂਟ (ਚੁੰਨੀ ਨਾਲ): ₹60 (₹10/ਪੈਂਟ-ਕੱਪੜਾ) | ਗਰਾਊਨ/ਲਹਿੰਗਾ: ₹150

**4. ਘਰੇਲੂ ਆਈਟਮਾਂ, ਬੂਟ ਅਤੇ ਪਰਦੇ:**
• ਸਿੰਗਲ ਬੈੱਡ ਕੰਬਲ: ₹250 / ₹300 | ਡਬਲ ਬੈੱਡ ਕੰਬਲ: ₹350 / ₹400
• ਰਜਾਈ: ₹500 | ਗਰਮ ਚਾਦਰ: ₹150
• ਬੂਟ (ਸ਼ੂਜ਼): ਨੰਬਰ 1 ₹300 | ਨੰਬਰ 2 ₹400 | ਨੰਬਰ 3 ₹500
• ਪਰਦੇ: ਪ੍ਰੈੱਸ ₹50 | ਡਰਾਈ ਕਲੀਨ ₹100`,
      });
    }
    if (lastMsg.includes('ਦਾਗ਼') || lastMsg.includes('ਸਿਆਹੀ') || lastMsg.includes('ਤੇਲ') || lastMsg.includes('stain')) {
      return res.json({
        text: `ਦਾਗ਼ ਰਿਮੂਵਲ ਸਲਾਹ:
• **ਤੇਲ / ਗਰੀਸ**: ਪਰਕਲੋਰੋਈਥਾਈਲੀਨ (Perc) ਜਾਂ ਐਮਾਈਲ ਐਸੀਟੇਟ ਲਗਾਓ। ਪਹਿਲਾਂ ਚਾਕ ਪਾਊਡਰ ਨਾਲ ਚੂਸੋ।
• **ਸਿਆਹੀ / ਬਾਲ ਪੈੱਨ**: ਆਈਸੋਪ੍ਰੋਪਾਈਲ ਅਲਕੋਹਲ (IPA 99%) ਜਾਂ ਸਪਿਰਿਟ ਨਾਲ ਉਲਟੇ ਪਾਸਿਓਂ ਸੋਖੋ। ਗਰਮ ਪਾਣੀ ਕਦੇ ਨਾ ਲਗਾਓ।
• **ਹਲਦੀ**: ਲਿਕਵਿਡ ਡਿਟਰਜੈਂਟ ਨਾਲ ਧੋ ਕੇ ਸਿੱਧੀ ਧੁੱਪ ਵਿੱਚ ਸੁਕਾਓ (ਧੁੱਪ ਦੀ UV ਕਿਰਨਾਂ ਨਾਲ ਹਲਦੀ ਉੱਡ ਜਾਂਦੀ ਹੈ)।
• **ਖੂਨ**: ਸਿਰਫ਼ ਠੰਢੇ ਪਾਣੀ ਨਾਲ ਧੋਵੋ, 3% ਹਾਈਡ੍ਰੋਜਨ ਪਰਆਕਸਾਈਡ ਵਰਤੋ।`,
      });
    }
    return res.status(500).json({ error: error?.message || 'AI request failed' });
  }
});

// Helper regex-based fallback parser if AI is temporarily busy
function fallbackParseBill(prompt: string) {
  // Extract 10-digit phone
  const phoneMatch = prompt.match(/\b[6-9]\d{9}\b/);
  const customerPhone = phoneMatch ? phoneMatch[0] : '';

  // Extract advance e.g. "₹200", "200 ਐਡਵਾਂਸ", "200 advance"
  const advMatch = prompt.match(/(?:₹|rs\.?|ਰੁਪਏ)?\s*(\d+)\s*(?:ਐਡਵਾਂਸ|advance|advance amount)/i) ||
                   prompt.match(/(?:ਐਡਵਾਂਸ|advance)\s*(?:₹|rs\.?|ਰੁਪਏ)?\s*(\d+)/i);
  const advanceAmount = advMatch ? parseInt(advMatch[1], 10) : 0;

  // Extract customer name
  let customerName = 'ਗਾਹਕ (Customer)';
  const nameMatch = prompt.match(/^([\u0A00-\u0A7Fa-zA-Z\s]+?)(?:\s+\d|\s+ਦੇ|\s+ਦਾ|\s+9|\s*,)/);
  if (nameMatch && nameMatch[1].trim().length > 1) {
    customerName = nameMatch[1].trim();
  }

  // Detect clothes (specific multi-word rules first, consuming matched phrases to avoid double-counting)
  const items: any[] = [];
  let remainingText = prompt.toLowerCase();

  const rules: Array<{ keys: string[]; namePa: string; nameEn: string; rate: number; service: string }> = [
    // Specific multi-word / compound items first
    { keys: ['fluffy jacket', 'ਫਲਫੀ ਜੈਕਟ'], namePa: 'ਫਲਫੀ ਜੈਕਟ', nameEn: 'Fluffy Jacket', rate: 400, service: 'Dry Clean' },
    { keys: ['ladies long coat', 'ਲੇਡੀਜ਼ ਲੌਂਗ ਕੋਟ'], namePa: 'ਲੇਡੀਜ਼ ਲੌਂਗ ਕੋਟ', nameEn: 'Ladies Long Coat', rate: 400, service: 'Dry Clean' },
    { keys: ['long coat', 'ਲੌਂਗ ਕੋਟ'], namePa: 'ਲੌਂਗ ਕੋਟ', nameEn: 'Long Coat', rate: 400, service: 'Dry Clean' },
    { keys: ['kids 3 piece', 'ਬੱਚਿਆਂ 3 ਪੀਸ', '3 ਪੀਸ ਬੱਚੇ'], namePa: '3 ਪੀਸ (ਬੱਚਿਆਂ ਦੇ)', nameEn: '3 Piece (Kids)', rate: 250, service: 'Dry Clean' },
    { keys: ['kids coat pant', 'ਬੱਚਿਆਂ ਕੋਟ ਪੈਂਟ'], namePa: 'ਕੋਟ ਪੈਂਟ (ਬੱਚਿਆਂ ਦੇ)', nameEn: 'Coat Pant (Kids)', rate: 200, service: 'Dry Clean' },
    { keys: ['3 piece', '3-piece', '3 ਪੀਸ', '3-ਪੀਸ'], namePa: 'ਕੋਟ ਪੈਂਟ (3 ਪੀਸ)', nameEn: 'Coat Pant (3 Piece)', rate: 400, service: 'Dry Clean' },
    { keys: ['2 piece', '2-piece', '2 ਪੀਸ', '2-ਪੀਸ', 'coat pant', 'ਕੋਟ ਪੈਂਟ'], namePa: 'ਕੋਟ ਪੈਂਟ (2 ਪੀਸ)', nameEn: 'Coat Pant (2 Piece)', rate: 300, service: 'Dry Clean' },
    { keys: ['coat blazer', 'coat', 'blazer', 'ਕੋਟ ਬਲੈਜ਼ਰ', 'ਕੋਟ', 'ਬਲੇਜ਼ਰ'], namePa: 'ਕੋਟ ਬਲੈਜ਼ਰ', nameEn: 'Coat Blazer', rate: 250, service: 'Dry Clean' },
    { keys: ['kurta pajama', 'ਕੁੜਤਾ ਪਜਾਮਾ'], namePa: 'ਕੁੜਤਾ ਪਜਾਮਾ', nameEn: 'Kurta Pajama', rate: 200, service: 'Dry Clean' },
    { keys: ['sherwani', 'ਸ਼ੇਰਵਾਨੀ'], namePa: 'ਸ਼ੇਰਵਾਨੀ', nameEn: 'Sherwani', rate: 500, service: 'Dry Clean' },
    { keys: ['jacket', 'ਜੈਕਟ'], namePa: 'ਜੈਕਟ', nameEn: 'Jacket', rate: 300, service: 'Dry Clean' },
    { keys: ['frock suit', 'ਫਰੌਕ ਸੂਟ'], namePa: 'ਫਰੌਕ ਸੂਟ', nameEn: 'Frock Suit', rate: 400, service: 'Dry Clean' },
    { keys: ['jumper press', 'ਜੈਂਪਰ ਪ੍ਰੈੱਸ'], namePa: 'ਜੈਂਪਰ ਪ੍ਰੈੱਸ', nameEn: 'Jumper Press', rate: 20, service: 'Steam Iron' },
    { keys: ['suit without chunni press', 'ਬਿਨਾਂ ਚੁੰਨੀ ਪ੍ਰੈੱਸ'], namePa: 'ਸੂਟ (ਬਿਨਾਂ ਚੁੰਨੀ ਤੋਂ) ਪ੍ਰੈੱਸ', nameEn: 'Suit (Without Chunni) Press', rate: 40, service: 'Steam Iron' },
    { keys: ['suit with chunni press', 'ਚੁੰਨੀ ਨਾਲ ਪ੍ਰੈੱਸ'], namePa: 'ਸੂਟ (ਚੁੰਨੀ ਨਾਲ) ਪ੍ਰੈੱਸ', nameEn: 'Suit (With Chunni) Press', rate: 60, service: 'Steam Iron' },
    { keys: ['gown', 'ਗਰਾਊਨ'], namePa: 'ਗਰਾਊਨ ਜਾਂ ਲਹਿੰਗਾ ਪ੍ਰੈੱਸ', nameEn: 'Gown or Lehenga Press', rate: 150, service: 'Steam Iron' },
    { keys: ['suit without chunni', 'ਬਿਨਾਂ ਚੁੰਨੀ'], namePa: 'ਸੂਟ (ਬਿਨਾਂ ਚੁੰਨੀ ਤੋਂ)', nameEn: 'Suit (Without Chunni)', rate: 250, service: 'Dry Clean' },
    { keys: ['suit', 'ਸੂਟ'], namePa: 'ਸੂਟ (ਫੁੱਲ)', nameEn: 'Suit (Full)', rate: 300, service: 'Dry Clean' },
    { keys: ['sharara', 'ਸ਼ਰਾਰਾ'], namePa: 'ਸ਼ਰਾਰਾ', nameEn: 'Sharara', rate: 400, service: 'Dry Clean' },
    { keys: ['phulkari', 'ਫੁਲਕਾਰੀ'], namePa: 'ਫੁਲਕਾਰੀ', nameEn: 'Phulkari', rate: 200, service: 'Dry Clean' },
    { keys: ['shawl', 'ਸ਼ਾਲ'], namePa: 'ਸ਼ਾਲ', nameEn: 'Shawl', rate: 150, service: 'Dry Clean' },
    { keys: ['koti', 'cardigan', 'ਕੋਟੀ'], namePa: 'ਲੇਡੀਜ਼ ਕੋਟੀ', nameEn: 'Ladies Koti (Cardigan)', rate: 250, service: 'Dry Clean' },
    { keys: ['jumper', 'kameez', 'ਜੈਂਪਰ', 'ਕਮੀਜ਼'], namePa: 'ਜੈਂਪਰ (ਕਮੀਜ਼)', nameEn: 'Jumper (Kameez)', rate: 150, service: 'Dry Clean' },
    { keys: ['bottom', 'salwar', 'ਬੋਟਮ', 'ਸਲਵਾਰ'], namePa: 'ਬੋਟਮ (ਸਲਵਾਰ)', nameEn: 'Bottom (Salwar)', rate: 150, service: 'Dry Clean' },
    { keys: ['chunni', 'dupatta', 'ਚੁੰਨੀ'], namePa: 'ਚੁੰਨੀ', nameEn: 'Chunni (Dupatta)', rate: 100, service: 'Dry Clean' },
    { keys: ['lehenga', 'ਲਹਿੰਗਾ'], namePa: 'ਲਹਿੰਗਾ', nameEn: 'Lehenga', rate: 0, service: 'Dry Clean' },
    { keys: ['single bed blanket', 'single blanket', 'ਸਿੰਗਲ ਕੰਬਲ'], namePa: 'ਕੰਬਲ ਸਿੰਗਲ ਬੈੱਡ', nameEn: 'Single Bed Blanket', rate: 250, service: 'Dry Clean' },
    { keys: ['double bed blanket', 'double blanket', 'ਡਬਲ ਕੰਬਲ', 'ਕੰਬਲ'], namePa: 'ਕੰਬਲ ਡਬਲ ਬੈੱਡ', nameEn: 'Double Bed Blanket', rate: 350, service: 'Dry Clean' },
    { keys: ['rajai', 'quilt', 'ਰਜਾਈ'], namePa: 'ਰਜਾਈ', nameEn: 'Quilt (Rajai)', rate: 500, service: 'Dry Clean' },
    { keys: ['warm bedsheet', 'ਗਰਮ ਚਾਦਰ', 'ਚਾਦਰ'], namePa: 'ਗਰਮ ਚਾਦਰ', nameEn: 'Warm Bedsheet', rate: 150, service: 'Dry Clean' },
    { keys: ['shoes number 3', 'shoes 3', 'ਨੰਬਰ 3'], namePa: 'ਬੂਟ (ਨੰਬਰ 3)', nameEn: 'Shoes - Number 3', rate: 500, service: 'Dry Clean' },
    { keys: ['shoes number 2', 'shoes 2', 'ਨੰਬਰ 2'], namePa: 'ਬੂਟ (ਨੰਬਰ 2)', nameEn: 'Shoes - Number 2', rate: 400, service: 'Dry Clean' },
    { keys: ['shoes', 'ਬੂਟ', 'ਸ਼ੂਜ਼'], namePa: 'ਬੂਟ (ਨੰਬਰ 1)', nameEn: 'Shoes - Number 1', rate: 300, service: 'Dry Clean' },
    { keys: ['curtains press', 'ਪਰਦੇ ਪ੍ਰੈੱਸ'], namePa: 'ਪਰਦੇ ਪ੍ਰੈੱਸ', nameEn: 'Curtains (Press)', rate: 50, service: 'Steam Iron' },
    { keys: ['curtain', 'ਪਰਦੇ'], namePa: 'ਡਰਾਈ ਕਲੀਨ ਪਰਦੇ', nameEn: 'Dry Clean Curtains', rate: 100, service: 'Dry Clean' },
    { keys: ['t-shirt', 'shirt', 'ਟੀ-ਸ਼ਰਟ', 'ਸ਼ਰਟ'], namePa: 'ਸ਼ਰਟ ਜਾਂ ਟੀ-ਸ਼ਰਟ', nameEn: 'Shirt or T-Shirt', rate: 100, service: 'Dry Clean' },
    { keys: ['pant', 'ਪੈਂਟ'], namePa: 'ਪੈਂਟ', nameEn: 'Pant', rate: 100, service: 'Dry Clean' },
  ];

  for (const rule of rules) {
    const matchedKey = rule.keys.find((k) => remainingText.includes(k));
    if (matchedKey) {
      const escapedKey = matchedKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const qtyRegex = new RegExp(`(\\d+)\\s*${escapedKey}|${escapedKey}\\s*(\\d+)`);
      const qMatch = remainingText.match(qtyRegex);
      const qty = qMatch ? parseInt(qMatch[1] || qMatch[2], 10) : 1;

      items.push({
        clothName: rule.namePa,
        clothNameEn: rule.nameEn,
        quantity: qty > 0 ? qty : 1,
        serviceType: rule.service,
        rate: rule.rate,
      });

      remainingText = remainingText.replace(new RegExp(escapedKey, 'g'), ' ');
    }
  }

  if (items.length === 0) {
    items.push({
      clothName: 'ਕੋਟ ਬਲੈਜ਼ਰ',
      clothNameEn: 'Coat Blazer',
      quantity: 1,
      serviceType: 'Dry Clean',
      rate: 250,
    });
  }

  return {
    customerName,
    customerPhone,
    items,
    advanceAmount,
    notes: 'ਆਟੋਮੈਟਿਕ ਤਿਆਰ ਕੀਤਾ ਗਿਆ ਬਿੱਲ',
  };
}

// Endpoint: Quick AI Bill Extractor / Parser from natural language
app.post('/api/ai/parse-bill', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `ਹੇਠ ਲਿਖੇ ਪੰਜਾਬੀ ਜਾਂ ਅੰਗਰੇਜ਼ੀ ਵੇਰਵੇ ਵਿੱਚੋਂ ਕਸਟਮਰ ਦਾ ਨਾਮ, ਫੋਨ ਨੰਬਰ (ਜੇਕਰ ਹੈ), ਕੱਪੜੇ, ਮਾਤਰਾ, ਸਰਵਿਸ ਟਾਈਪ (Dry Clean, Steam Iron, Wash, Roll Press, Stain Removal) ਅਤੇ ਅਨੁਮਾਨਿਤ ਰੇਟ ਕੱਢ ਕੇ ਬਿੱਲ ਦਾ ਡਾਟਾ ਬਣਾਓ।\nਮਹੱਤਵਪੂਰਨ: ਜੇ ਇੱਕ ਹੀ ਕੱਪੜੇ 'ਤੇ ਇੱਕ ਤੋਂ ਵੱਧ ਕੰਮ ਹਨ (ਜਿਵੇਂ "1 Suit Dry Clean ਅਤੇ Steam Press ਦੋਵੇਂ"), ਤਾਂ ਉਸ ਕੱਪੜੇ ਨੂੰ ਦੋ ਵਾਰ ਨਾ ਲਿਖੋ — ਬੱਸ ਇੱਕ ਵਾਰ ਲਿਖੋ ਅਤੇ serviceTypes array ਵਿੱਚ ਦੋਵੇਂ ਸਰਵਿਸਾਂ ਪਾਓ (ਅਤੇ ਕੋਈ ਵਾਧੂ ਕੰਮ ਜਿਵੇਂ ਰਫੂ/ਚਰਕ ਹੋਵੇ ਤਾਂ customWork ਵਿੱਚ ਪਾਓ):\n"${prompt}"\n\nਦੁਕਾਨ ਦੇ ਸਟੈਂਡਰਡ ਰੇਟ:\n- ਜੈਂਟਸ: ਸ਼ਰਟ/ਟੀ-ਸ਼ਰਟ ₹100, ਪੈਂਟ ₹100, ਕੁੜਤਾ ਪਜਾਮਾ ₹200, ਕੋਟ ਬਲੈਜ਼ਰ ₹250, ਕੋਟ ਪੈਂਟ (2 ਪੀਸ) ₹300, ਕੋਟ ਪੈਂਟ (3 ਪੀਸ) ₹400, ਲੌਂਗ ਕੋਟ ₹400, ਜੈਕਟ ₹300, ਫਲਫੀ ਜੈਕਟ ₹400, ਸ਼ੇਰਵਾਨੀ ₹500\n- ਬੱਚਿਆਂ ਦੇ: ਕੋਟ ਪੈਂਟ ₹200, 3 ਪੀਸ ₹250\n- ਲੇਡੀਜ਼: ਜੈਂਪਰ (ਕਮੀਜ਼) ₹150, ਬੋਟਮ (ਸਲਵਾਰ) ₹150, ਚੁੰਨੀ ₹100, ਸੂਟ (ਬਿਨਾਂ ਚੁੰਨੀ ਤੋਂ) ₹250, ਸੂਟ (ਫੁੱਲ) ₹300, ਸ਼ਰਾਰਾ ₹400, ਫੁਲਕਾਰੀ ₹200, ਸ਼ਾਲ ₹150, ਲੇਡੀਜ਼ ਕੋਟੀ ₹250, ਲੇਡੀਜ਼ ਲੌਂਗ ਕੋਟ ₹400, ਫਰੌਕ ਸੂਟ ₹400, ਲਹਿੰਗਾ ₹0 (ਦੇਖ ਕੇ ਰੇਟ ਤੈਅ ਹੋਵੇਗਾ)\n- ਸੂਟ ਪ੍ਰੈੱਸ: ਜੈਂਪਰ ਪ੍ਰੈੱਸ ₹20, ਸੂਟ (ਬਿਨਾਂ ਚੁੰਨੀ) ਪ੍ਰੈੱਸ ₹40, ਸੂਟ (ਚੁੰਨੀ ਨਾਲ) ਪ੍ਰੈੱਸ ₹60, ਗਰਾਊਨ ਜਾਂ ਲਹਿੰਗਾ ਪ੍ਰੈੱਸ ₹150\n- ਘਰੇਲੂ: ਸਿੰਗਲ ਬੈੱਡ ਕੰਬਲ ₹250/₹300, ਡਬਲ ਬੈੱਡ ਕੰਬਲ ₹350/₹400, ਰਜਾਈ ₹500, ਗਰਮ ਚਾਦਰ ₹150\n- ਬੂਟ (ਸ਼ੂਜ਼): ਨੰਬਰ 1 ₹300, ਨੰਬਰ 2 ₹400, ਨੰਬਰ 3 ₹500\n- ਪਰਦੇ: ਪ੍ਰੈੱਸ ₹50, ਡਰਾਈ ਕਲੀਨ ਪਰਦੇ ₹100`,
        config: {
          systemInstruction: 'You extract dry cleaning billing items accurately from Punjabi or mixed text. When one item needs multiple services, group them in serviceTypes on that single item instead of duplicating the item. Return strictly valid JSON.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              customerName: { type: Type.STRING },
              customerPhone: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    clothName: { type: Type.STRING },
                    clothNameEn: { type: Type.STRING },
                    quantity: { type: Type.INTEGER },
                    serviceType: { type: Type.STRING, description: 'Primary service: Dry Clean, Steam Iron, Wash, Roll Press, or Stain Removal' },
                    serviceTypes: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: 'All requested services on this single cloth item',
                    },
                    customWork: { type: Type.STRING, description: 'Any extra work like Rafu, Charak, Button, etc.' },
                    rate: { type: Type.NUMBER },
                  },
                  required: ['clothName', 'quantity', 'serviceType', 'rate'],
                },
              },
              advanceAmount: { type: Type.NUMBER },
              notes: { type: Type.STRING },
            },
            required: ['customerName', 'items'],
          },
        },
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      return res.json(parsed);
    } catch (genAiError) {
      console.warn('Gemini API call failed, using smart fallback parser:', genAiError);
      const fallbackResult = fallbackParseBill(prompt);
      return res.json(fallbackResult);
    }
  } catch (error: any) {
    console.error('Error in /api/ai/parse-bill:', error);
    return res.status(500).json({ error: error?.message || 'Failed to parse bill' });
  }
});

// Setup Vite or static handling
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    process.env.DISABLE_HMR = 'true';
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });

    // When HMR is disabled in AI Studio preview, serve a WebSocket-free @vite/client
    // so CSS style injection and module loading work without WebSocket connection errors.
    app.get('/@vite/client', (_req, res) => {
      res.type('application/javascript').send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
  } else {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url) {
  return url;
}
export class ErrorOverlay extends HTMLElement {}
`);
    });

    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
