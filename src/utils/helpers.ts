import QRCode from 'qrcode';
import { BankAccount, BillItem, CustomerAccount, Order, ShopSettings } from '../types';

export function normalizePhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) {
    return digits.slice(-10);
  }
  return digits;
}

export function orderMatchesCustomer(order: Order, customer: CustomerAccount): boolean {
  if (order.customerId && order.customerId === customer.id) return true;
  const orderPhone = normalizePhone(order.customerPhone);
  const custPhone = normalizePhone(customer.phone);
  if (orderPhone && custPhone && orderPhone.length >= 8 && orderPhone === custPhone) {
    return true;
  }
  const oName = order.customerName.trim().toLowerCase();
  const cName = customer.name.trim().toLowerCase();
  if ((!orderPhone || !custPhone) && oName && cName && oName === cName) {
    return true;
  }
  return false;
}

export function formatItemServices(item: Pick<BillItem, 'serviceType' | 'serviceTypes' | 'customWork'>): string {
  const list =
    item.serviceTypes && item.serviceTypes.length > 0 ? [...item.serviceTypes] : [item.serviceType];
  const parts: string[] = [...list];
  if (item.customWork && item.customWork.trim()) {
    parts.push(item.customWork.trim());
  }
  return parts.join(' + ');
}

export async function generateUpiQrDataUrl(
  upiId: string,
  payeeName: string,
  amount: number,
  billNumber: string
): Promise<string> {
  // standard UPI payment URI format
  const formattedAmount = amount > 0 ? amount.toFixed(2) : '';
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    payeeName
  )}&tn=${encodeURIComponent('Bill ' + billNumber)}&cu=INR${
    formattedAmount ? `&am=${formattedAmount}` : ''
  }`;

  try {
    const dataUrl = await QRCode.toDataURL(upiUrl, {
      width: 250,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate QR code', err);
    return '';
  }
}

export function formatDatePunjabi(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('pa-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getDaysSince(dateStr: string): number {
  if (!dateStr) return 0;
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  const diffTime = now - target;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function generateBookingMessage(order: Order, lang: 'pa' | 'hinglish' = 'hinglish'): string {
  const deliveryDateFormatted = order.expectedDeliveryDate
    ? formatDatePunjabi(order.expectedDeliveryDate)
    : 'ਜਲਦੀ ਹੀ';
  const boxInfo = order.boxTagNumber ? ` (${order.billNumber} | Box: ${order.boxTagNumber})` : ` (${order.billNumber})`;
  if (lang === 'hinglish') {
    return `Sat Sri Akal ${order.customerName} ji, Master Dry Clean te tuhada order${boxInfo} book ho gaya hai. Bill: ₹${order.totalAmount}, Advance: ₹${order.advanceAmount}, Pending: ₹${order.pendingAmount}. Tuhade kapde ${deliveryDateFormatted} nu milange.`;
  }
  return `ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ ${order.customerName} ਜੀ, Master Dry Clean 'ਤੇ ਤੁਹਾਡਾ ਆਰਡਰ${boxInfo} ਬੁੱਕ ਹੋ ਗਿਆ ਹੈ। ਬਿੱਲ: ₹${order.totalAmount}, ਐਡਵਾਂਸ: ₹${order.advanceAmount}, ਬਾਕੀ: ₹${order.pendingAmount}। ਤੁਹਾਡੇ ਕੱਪੜੇ ${deliveryDateFormatted} ਨੂੰ ਮਿਲਣਗੇ।`;
}

export function generateReadyMessage(order: Order, upiId: string = 'masterdryclean@upi', lang: 'pa' | 'hinglish' = 'hinglish'): string {
  const boxInfo = order.boxTagNumber ? ` (${order.billNumber} / ${order.boxTagNumber})` : '';
  if (lang === 'hinglish') {
    return `Sat Sri Akal ${order.customerName} ji, Master Dry Clean ton tuhade kapde${boxInfo} ready han. Pending ₹${order.pendingAmount} de ke kapde le jao. UPI Pay: ${upiId}`;
  }
  return `ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ ${order.customerName} ਜੀ, Master Dry Clean ਤੋਂ ਤੁਹਾਡੇ ਕੱਪੜੇ${boxInfo} ਬਿਲਕੁਲ ਤਿਆਰ ਹਨ। ਬਾਕੀ ਪੈਸੇ ₹${order.pendingAmount} ਦੇ ਕੇ ਤੁਸੀਂ ਕੱਪੜੇ ਲੈ ਜਾ ਸਕਦੇ ਹੋ। UPI Pay: ${upiId}`;
}

export function generateUrgentWarningMessage(order: Order, daysReady: number = 13, lang: 'pa' | 'hinglish' = 'hinglish'): string {
  if (lang === 'hinglish') {
    return `⚠️ Urgent Alert: ${order.customerName} ji, kapde ready hue ${daysReady} din ho chuke han. 15 din baad dukandar ki koi zimmedari nahi hogi. Kripya 2 din me kapde le jaen.`;
  }
  return `⚠️ ਜ਼ਰੂਰੀ ਸੂਚਨਾ: ${order.customerName} ਜੀ, ਤੁਹਾਡੇ ਕੱਪੜੇ ਤਿਆਰ ਹੋਏ ਨੂੰ ${daysReady} ਦਿਨ ਹੋ ਚੁੱਕੇ ਹਨ। ਸਾਡੀ ਪੋਲਿਸੀ ਮੁਤਾਬਕ 15 ਦਿਨਾਂ ਬਾਅਦ ਦੁਕਾਨਦਾਰ ਦੀ ਕੋਈ ਜ਼ਿੰਮੇਵਾਰੀ ਨਹੀਂ ਹੋਵੇਗੀ। ਕਿਰਪਾ ਕਰਕੇ 2 ਦਿਨਾਂ ਦੇ ਅੰਦਰ ਆਪਣੇ ਕੱਪੜੇ ਲੈ ਜਾਓ।`;
}

export function openWhatsAppLink(phone: string, text: string) {
  // Clean phone number: remove non-digits
  const cleanPhone = phone.replace(/\D/g, '');
  // If Indian 10 digits without 91, prepend 91
  const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const encodedText = encodeURIComponent(text);
  const url = `https://wa.me/${fullPhone}?text=${encodedText}`;
  window.open(url, '_blank');
}

export function getShopBankAccounts(settings: ShopSettings): BankAccount[] {
  if (Array.isArray(settings.bankAccounts) && settings.bankAccounts.length > 0) {
    return settings.bankAccounts;
  }
  if (settings.upiId?.trim()) {
    return [
      {
        id: 'bank_legacy_default',
        accountHolderName: settings.upiName || settings.shopNameEn || 'Master Dry Clean',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        upiId: settings.upiId.trim(),
        upiName: settings.upiName || settings.shopNameEn,
        isDefault: true,
      },
    ];
  }
  return [];
}

export function getDefaultBankAccount(settings: ShopSettings): BankAccount | undefined {
  const list = getShopBankAccounts(settings);
  return list.find((b) => b.isDefault) || list[0];
}

export async function readQrImageAsDataUrl(file: File, maxDim = 520): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}
