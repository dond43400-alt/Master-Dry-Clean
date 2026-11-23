import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  MessageSquare,
  Copy,
  Check,
  Send,
  Calendar,
  AlertTriangle,
  Clock,
  Sparkles,
  Image as ImageIcon,
  Share2,
  Download,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Order, ShopSettings } from '../types';
import {
  generateBookingMessage,
  generateReadyMessage,
  generateUrgentWarningMessage,
  openWhatsAppLink,
  getDaysSince,
  formatDatePunjabi,
  formatItemServices,
  generateUpiQrDataUrl,
  getDefaultBankAccount,
} from '../utils/helpers';
import { captureNodeToJpeg, copyNodeImageToClipboard } from '../utils/captureReceipt';

interface WhatsAppModalProps {
  order: Order | null;
  settings: ShopSettings;
  onClose: () => void;
  defaultTemplate?: 'booking' | 'ready' | 'warning' | 'custom';
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  order,
  settings,
  onClose,
  defaultTemplate = 'booking',
}) => {
  const [templateType, setTemplateType] = useState<'booking' | 'ready' | 'warning' | 'custom'>(
    defaultTemplate
  );
  const [messageLang, setMessageLang] = useState<'hinglish' | 'pa'>('hinglish');
  const [phone, setPhone] = useState(order?.customerPhone || '');
  const [customerName, setCustomerName] = useState(order?.customerName || '');
  const [messageText, setMessageText] = useState('');
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isGeneratingJpg, setIsGeneratingJpg] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const receiptRef = useRef<HTMLDivElement>(null);

  // Determine days since ready
  const daysReady = order
    ? Math.max(1, getDaysSince(order.readyDate || order.createdAt))
    : 13;

  // Active or fallback order for receipt rendering
  const activeOrder: Order = order || {
    id: 'demo_order',
    billNumber: 'MDC-1084',
    createdAt: new Date().toISOString(),
    readyDate: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
    expectedDeliveryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    customerName: customerName || 'ਗਾਹਕ (Customer)',
    customerPhone: phone || '9876543210',
    items: [
      {
        id: 'item_1',
        clothName: '3-ਪੀਸ ਸੂਟ',
        clothNameEn: '3-Piece Suit',
        quantity: 1,
        serviceType: 'Dry Clean',
        rate: 480,
        total: 480,
      },
      {
        id: 'item_2',
        clothName: 'ਡਬਲ ਕੰਬਲ / ਰਜ਼ਾਈ',
        clothNameEn: 'Double Blanket',
        quantity: 1,
        serviceType: 'Dry Clean',
        rate: 420,
        total: 420,
      },
    ],
    subtotal: 900,
    discount: 0,
    totalAmount: 900,
    advanceAmount: 300,
    pendingAmount: 600,
    paymentMode: 'UPI',
    status: 'ready',
  };

  const defaultBank = getDefaultBankAccount(settings);

  // Generate UPI QR code (or use uploaded QR image from default bank account)
  useEffect(() => {
    if (defaultBank?.qrCodeImage) {
      setQrCodeUrl(defaultBank.qrCodeImage);
      return;
    }
    const targetUpiId = defaultBank?.upiId || settings.upiId;
    const targetUpiName =
      defaultBank?.upiName || defaultBank?.accountHolderName || settings.upiName;
    if (targetUpiId) {
      const amount = activeOrder.pendingAmount > 0 ? activeOrder.pendingAmount : activeOrder.totalAmount;
      generateUpiQrDataUrl(targetUpiId, targetUpiName, amount, activeOrder.billNumber).then(
        (url) => setQrCodeUrl(url)
      );
    } else {
      setQrCodeUrl('');
    }
  }, [defaultBank, settings.upiId, settings.upiName, activeOrder]);

  // Update text whenever template or language changes
  useEffect(() => {
    if (order) {
      setPhone(order.customerPhone || '');
      setCustomerName(order.customerName || '');

      if (templateType === 'booking') {
        setMessageText(generateBookingMessage(order, messageLang));
      } else if (templateType === 'ready') {
        setMessageText(generateReadyMessage(order, settings.upiId, messageLang));
      } else if (templateType === 'warning') {
        setMessageText(generateUrgentWarningMessage(order, daysReady, messageLang));
      }
    } else {
      // Generic template fallback
      const cName = customerName || '[Name]';
      if (templateType === 'booking') {
        setMessageText(
          messageLang === 'hinglish'
            ? `Sat Sri Akal ${cName} ji, Master Dry Clean te tuhada order book ho gaya hai. Bill: ₹${activeOrder.totalAmount}, Advance: ₹${activeOrder.advanceAmount}, Pending: ₹${activeOrder.pendingAmount}. Tuhade kapde 4 din baad milange.`
            : `ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ ${cName} ਜੀ, Master Dry Clean 'ਤੇ ਤੁਹਾਡਾ ਆਰਡਰ ਬੁੱਕ ਹੋ ਗਿਆ ਹੈ। ਬਿੱਲ: ₹${activeOrder.totalAmount}, ਐਡਵਾਂਸ: ₹${activeOrder.advanceAmount}, ਬਾਕੀ: ₹${activeOrder.pendingAmount}। ਤੁਹਾਡੇ ਕੱਪੜੇ 4 ਦਿਨ ਬਾਅਦ ਮਿਲਣਗੇ।`
        );
      } else if (templateType === 'ready') {
        setMessageText(
          messageLang === 'hinglish'
            ? `Sat Sri Akal ${cName} ji, Master Dry Clean ton tuhade kapde ready han. Pending ₹${activeOrder.pendingAmount} de ke kapde le jao. UPI Pay: ${settings.upiId}`
            : `ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ ${cName} ਜੀ, Master Dry Clean ਤੋਂ ਤੁਹਾਡੇ ਕੱਪੜੇ ਬਿਲਕੁਲ ਤਿਆਰ ਹਨ। ਬਾਕੀ ਪੈਸੇ ₹${activeOrder.pendingAmount} ਦੇ ਕੇ ਤੁਸੀਂ ਕੱਪੜੇ ਲੈ ਜਾ ਸਕਦੇ ਹੋ। UPI Pay: ${settings.upiId}`
        );
      } else if (templateType === 'warning') {
        setMessageText(
          messageLang === 'hinglish'
            ? `⚠️ Urgent Alert: ${cName} ji, kapde ready hue ${daysReady} din ho chuke han. 15 din baad dukandar ki koi zimmedari nahi hogi. Kripya 2 din me kapde le jaen.`
            : `⚠️ ਜ਼ਰੂਰੀ ਸੂਚਨਾ: ${cName} ਜੀ, ਤੁਹਾਡੇ ਕੱਪੜੇ ਤਿਆਰ ਹੋਏ ਨੂੰ ${daysReady} ਦਿਨ ਹੋ ਚੁੱਕੇ ਹਨ। ਸਾਡੀ ਪੋਲਿਸੀ ਮੁਤਾਬਕ 15 ਦਿਨਾਂ ਬਾਅਦ ਦੁਕਾਨਦਾਰ ਦੀ ਕੋਈ ਜ਼ਿੰਮੇਵਾਰੀ ਨਹੀਂ ਹੋਵੇਗੀ। ਕਿਰਪਾ ਕਰਕੇ 2 ਦਿਨਾਂ ਦੇ ਅੰਦਰ ਆਪਣੇ ਕੱਪੜੇ ਲੈ ਜਾਓ।`
        );
      }
    }
  }, [templateType, messageLang, order, settings, daysReady, customerName, activeOrder.totalAmount, activeOrder.advanceAmount, activeOrder.pendingAmount]);

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Copy Image to Clipboard
  const handleCopyImage = async () => {
    if (!receiptRef.current) return;
    setIsGeneratingJpg(true);
    try {
      const success = await copyNodeImageToClipboard(receiptRef.current);
      if (success) {
        setActionNotice('✅ JPG ਫੋਟੋ ਕਾਪੀ ਹੋ ਗਈ! WhatsApp ਚੈਟ ਵਿੱਚ Ctrl+V ਕਰੋ।');
        setTimeout(() => setActionNotice(null), 4000);
      } else {
        await handleDownloadJpg();
      }
    } catch (err) {
      console.error(err);
      alert('ਫੋਟੋ ਕਾਪੀ ਕਰਨ ਵਿੱਚ ਸਮੱਸਿਆ ਆਈ');
    } finally {
      setIsGeneratingJpg(false);
    }
  };

  // Download JPG
  const handleDownloadJpg = async () => {
    if (!receiptRef.current) return;
    setIsGeneratingJpg(true);
    try {
      const result = await captureNodeToJpeg(receiptRef.current, `Bill-${activeOrder.billNumber}.jpg`);
      const link = document.createElement('a');
      link.download = `Bill-${activeOrder.billNumber}.jpg`;
      link.href = result.dataUrl;
      link.click();
      setActionNotice('📥 ਬਿੱਲ ਦੀ JPG ਫੋਟੋ ਡਾਊਨਲੋਡ ਹੋ ਗਈ!');
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingJpg(false);
    }
  };

  // Primary action: Send JPG and Text Details together in 1 single message
  const handleSendJpgAndMessage = async () => {
    if (!phone) {
      alert('ਕਿਰਪਾ ਕਰਕੇ ਕਸਟਮਰ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ!');
      return;
    }

    if (!receiptRef.current) return;
    setIsGeneratingJpg(true);
    setActionNotice('ਬਿੱਲ ਦੀ JPG ਤਿਆਰ ਹੋ ਰਹੀ ਹੈ...');

    try {
      const result = await captureNodeToJpeg(receiptRef.current, `Bill-${activeOrder.billNumber}.jpg`);

      // Check if navigator.share with files is supported (Mobile/Android/iOS/supported desktop)
      if (
        navigator.canShare &&
        navigator.canShare({ files: [result.file] })
      ) {
        try {
          await navigator.share({
            files: [result.file],
            text: messageText,
            title: `Master Dry Clean Bill - ${activeOrder.billNumber}`,
          });
          setActionNotice('✅ WhatsApp ਸੁਨੇਹਾ ਅਤੇ JPG ਫੋਟੋ ਸਫਲਤਾਪੂਰਵਕ ਸ਼ੇਅਰ ਹੋ ਗਏ!');
          setTimeout(() => setActionNotice(null), 3000);
          setIsGeneratingJpg(false);
          return;
        } catch (shareErr: any) {
          // User cancelled share or failed, proceed to fallback
          if (shareErr.name === 'AbortError') {
            setIsGeneratingJpg(false);
            setActionNotice(null);
            return;
          }
        }
      }

      // Fallback for Desktop & WhatsApp Web:
      // 1. Copy image to clipboard so user can instantly paste it in WhatsApp chat
      let imageCopied = false;
      try {
        imageCopied = await copyNodeImageToClipboard(receiptRef.current);
      } catch (e) {
        console.warn('Clipboard write image not supported on this browser:', e);
      }

      // 2. Download the JPG as a guarantee
      const link = document.createElement('a');
      link.download = `Bill-${activeOrder.billNumber}.jpg`;
      link.href = result.dataUrl;
      link.click();

      // 3. Open WhatsApp Web / App with prefilled text
      openWhatsAppLink(phone, messageText);

      setActionNotice(
        imageCopied
          ? '🚀 WhatsApp ਖੁੱਲ੍ਹ ਗਿਆ ਹੈ! ਬਿੱਲ JPG ਕਾਪੀ ਹੋ ਚੁੱਕਾ ਹੈ — ਚੈਟ ਵਿੱਚ ਸਿਰਫ਼ Ctrl+V (Paste) ਦਬਾਓ, ਫੋਟੋ ਅਤੇ ਸੁਨੇਹਾ ਇਕੱਠੇ ਭੇਜੇ ਜਾਣਗੇ!'
          : '🚀 WhatsApp ਖੁੱਲ੍ਹ ਗਿਆ ਹੈ! ਬਿੱਲ JPG ਡਾਊਨਲੋਡ ਹੋ ਗਿਆ ਹੈ — ਚੈਟ ਵਿੱਚ ਡਰੈਗ ਜਾਂ ਅਟੈਚ ਕਰੋ।'
      );
    } catch (err: any) {
      console.error('Failed to combine JPG & WhatsApp:', err);
      // Fallback to regular text send
      openWhatsAppLink(phone, messageText);
    } finally {
      setIsGeneratingJpg(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 bg-emerald-600 text-white shrink-0">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                WhatsApp ਬਿੱਲ ਸੁਨੇਹਾ ਅਤੇ JPG ਫੋਟੋ (1-Click Share)
              </h3>
              <p className="text-[11px] text-emerald-100">
                {activeOrder ? `ਬਿੱਲ: ${activeOrder.billNumber} • ${activeOrder.customerName}` : 'ਕਸਟਮਰ ਸੁਨੇਹਾ ਤਿਆਰ ਕਰੋ'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Action Notification Alert Banner */}
          {actionNotice && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionNotice}</span>
            </div>
          )}

          {/* Language Switcher */}
          <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <span className="text-xs font-semibold text-slate-600 pl-2">ਬੋਲੀ / ਭਾਸ਼ਾ (Language):</span>
            <div className="flex space-x-1">
              <button
                type="button"
                onClick={() => setMessageLang('hinglish')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  messageLang === 'hinglish'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hinglish / Roman
              </button>
              <button
                type="button"
                onClick={() => setMessageLang('pa')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  messageLang === 'pa'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ਪੰਜਾਬੀ (Gurmukhi)
              </button>
            </div>
          </div>

          {/* Template Selectors */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              ਸੁਨੇਹੇ ਦੀ ਕਿਸਮ ਚੁਣੋ (Choose Message Template):
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTemplateType('booking')}
                className={`p-2 rounded-xl text-left border transition-all ${
                  templateType === 'booking'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-1 text-emerald-700 text-xs mb-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="font-semibold">Day 1</span>
                </div>
                <div className="text-xs truncate">ਆਰਡਰ ਬੁਕਿੰਗ</div>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('ready')}
                className={`p-2 rounded-xl text-left border transition-all ${
                  templateType === 'ready'
                    ? 'border-sky-500 bg-sky-50 text-sky-950 font-bold shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-1 text-sky-700 text-xs mb-0.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-semibold">Day 7</span>
                </div>
                <div className="text-xs truncate">ਕੱਪੜੇ ਤਿਆਰ (Ready)</div>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('warning')}
                className={`p-2 rounded-xl text-left border transition-all ${
                  templateType === 'warning'
                    ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-1 text-amber-700 text-xs mb-0.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="font-semibold">Day 13</span>
                </div>
                <div className="text-xs truncate">15-ਦਿਨ ਅਲਰਟ</div>
              </button>
            </div>
          </div>

          {/* Recipient Phone input */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                ਕਸਟਮਰ ਦਾ ਨਾਮ
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="ਗੁਰਮੀਤ ਸਿੰਘ"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                WhatsApp ਮੋਬਾਈਲ ਨੰਬਰ
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>

          {/* Grid: Message text on left + JPG receipt preview on right */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: WhatsApp Text Message & Bubble */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    ਸੁਨੇਹਾ (Message Details):
                  </label>
                  <span className="text-[10px] text-slate-400">ਸੰਪਾਦਨ ਯੋਗ</span>
                </div>
                <textarea
                  rows={4}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 font-sans leading-relaxed"
                />
              </div>

              {/* WhatsApp Live Bubble Preview */}
              <div className="bg-[#EFEAE2] p-3 rounded-xl border border-[#ded8cf]">
                <div className="text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  WhatsApp ਝਲਕ (Preview):
                </div>
                <div className="flex justify-end">
                  <div className="bg-[#DCF8C6] text-slate-900 rounded-xl rounded-tr-xs p-2.5 max-w-full shadow-xs text-xs space-y-1">
                    <p className="whitespace-pre-wrap leading-relaxed text-[11px]">{messageText}</p>
                    <div className="text-[9px] text-slate-400 text-right font-mono">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: JPG Receipt Live Preview Canvas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>ਨਾਲ ਜਾਣ ਵਾਲੀ ਪੂਰੀ ਬਿੱਲ ਕਾਪੀ (Full Bill Receipt JPG):</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  ਪੂਰੀ ਰਸੀਦ + QR + ਸ਼ਰਤਾਂ
                </span>
              </div>

              {/* The rendered thermal slip for JPG capture (unclipped, full details) */}
              <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 max-h-[360px] overflow-y-auto flex justify-center">
                <div
                  ref={receiptRef}
                  className="bg-white p-4 rounded-xl border border-slate-300 text-slate-900 font-sans text-xs w-full max-w-[310px] shadow-sm space-y-2.5"
                >
                  {/* Slip Header */}
                  <div className="text-center border-b border-dashed border-slate-400 pb-2.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded-sm">
                      ਗਾਹਕ ਕਾਪੀ (Customer Bill Copy)
                    </span>
                    <h2 className="text-base font-black tracking-tight mt-1 text-slate-950">
                      {settings.shopNamePa}
                    </h2>
                    <h3 className="text-[11px] font-bold text-slate-700 tracking-wide">
                      {settings.shopNameEn}
                    </h3>
                    <p className="text-[10px] text-slate-600 mt-0.5">{settings.addressPa}</p>
                    <p className="text-[10px] font-mono text-slate-800">
                      Mobile: {settings.phone} • UPI ID: {settings.upiId}
                    </p>
                  </div>

                  {/* Bill & Customer Meta */}
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] border-b border-dashed border-slate-300 pb-2">
                    <div>
                      <p>
                        <span className="font-bold">Bill No:</span> {activeOrder.billNumber}
                      </p>
                      <p>
                        <span className="font-bold">Date:</span> {formatDatePunjabi(activeOrder.createdAt)}
                      </p>
                      <p>
                        <span className="font-bold">Delivery:</span>{' '}
                        {formatDatePunjabi(activeOrder.expectedDeliveryDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 truncate">{activeOrder.customerName}</p>
                      <p className="font-mono text-slate-700">{activeOrder.customerPhone || phone}</p>
                      <p>
                        <span className="font-semibold text-slate-600">Mode:</span> {activeOrder.paymentMode}
                      </p>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="border-b border-dashed border-slate-300 pb-2">
                    <table className="w-full text-left text-[10px]">
                      <thead>
                        <tr className="border-b border-slate-300 text-slate-600 font-bold">
                          <th className="py-1">ਕੱਪੜਾ</th>
                          <th className="py-1 text-center">ਮਾਤਰਾ</th>
                          <th className="py-1 text-right">ਰੇਟ</th>
                          <th className="py-1 text-right">ਕੁੱਲ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeOrder.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-1 font-medium text-slate-900 max-w-[135px]">
                              <div className="truncate">{it.clothName}</div>
                              <div className="text-[9px] text-slate-500 font-normal leading-tight">
                                {formatItemServices(it)}
                              </div>
                            </td>
                            <td className="py-1 text-center font-mono">{it.quantity}</td>
                            <td className="py-1 text-right font-mono">₹{it.rate}</td>
                            <td className="py-1 text-right font-mono font-bold">₹{it.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals Summary */}
                  <div className="space-y-1 text-[11px] pt-0.5">
                    <div className="flex justify-between">
                      <span className="text-slate-600">ਕੁੱਲ ਜੋੜ (Subtotal):</span>
                      <span className="font-mono font-semibold">₹{activeOrder.subtotal || activeOrder.totalAmount}</span>
                    </div>
                    {activeOrder.discount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>ਛੋਟ (Discount):</span>
                        <span className="font-mono">-₹{activeOrder.discount}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-xs pt-0.5 border-t border-slate-200">
                      <span>ਕੁੱਲ ਬਿੱਲ (Total Amount):</span>
                      <span className="font-mono">₹{activeOrder.totalAmount}</span>
                    </div>
                    <div className="flex justify-between text-emerald-800 font-semibold text-[11px]">
                      <span>ਐਡਵਾਂਸ ਦਿੱਤਾ (Advance Paid):</span>
                      <span className="font-mono">₹{activeOrder.advanceAmount}</span>
                    </div>
                    <div className="flex justify-between font-bold text-xs text-amber-950 bg-amber-100/90 border border-amber-300 p-1.5 rounded-md">
                      <span>ਬਾਕੀ ਰਕਮ (Pending Balance):</span>
                      <span className="font-mono text-sm">₹{activeOrder.pendingAmount}</span>
                    </div>
                  </div>

                  {/* UPI / Bank QR in receipt */}
                  {(qrCodeUrl || defaultBank) && (
                    <div className="text-center pt-2 border-t border-dashed border-slate-300 flex flex-col items-center space-y-0.5">
                      <p className="text-[10px] font-bold text-slate-800">
                        UPI / ਬੈਂਕ ਭੁਗਤਾਨ (Scan to Pay)
                      </p>
                      {qrCodeUrl && (
                        <img
                          src={qrCodeUrl}
                          alt="UPI QR"
                          className="w-20 h-20 my-1 border border-slate-300 p-1 bg-white rounded-xs object-contain"
                        />
                      )}
                      {(defaultBank?.upiId || settings.upiId) && (
                        <p className="text-[9px] font-mono text-slate-700">
                          UPI ID: <strong>{defaultBank?.upiId || settings.upiId}</strong>
                        </p>
                      )}
                      {defaultBank && (defaultBank.bankName || defaultBank.accountNumber || defaultBank.ifscCode) && (
                        <div className="text-[8px] text-slate-600 leading-tight">
                          <span className="font-semibold">
                            {defaultBank.accountHolderName}
                            {defaultBank.bankName ? ` (${defaultBank.bankName})` : ''}
                          </span>
                          {(defaultBank.accountNumber || defaultBank.ifscCode) && (
                            <div className="font-mono">
                              {defaultBank.accountNumber && `A/C: ${defaultBank.accountNumber}`}
                              {defaultBank.accountNumber && defaultBank.ifscCode && ' • '}
                              {defaultBank.ifscCode && `IFSC: ${defaultBank.ifscCode}`}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 15-Day Policy Note */}
                  <div className="border-t border-dashed border-slate-400 pt-2 text-center space-y-1">
                    <p className="text-[10px] font-bold text-slate-900 leading-tight">
                      ⚠️ {settings.disclaimerPa}
                    </p>
                    <p className="text-[8px] text-slate-600 leading-tight">
                      "Note: Kapde taiyaar hone ki date se 15 dino tak hi dukandar ki zimmedari hogi. 15 dino ke baad kapde ke ghum hone ya kharab hone ka hamara koi daawa nahi hoga."
                    </p>
                    <p className="text-[9px] text-slate-500 pt-0.5 font-medium">
                      ਧੰਨਵਾਦ! ਦੁਬਾਰਾ ਸੇਵਾ ਦਾ ਮੌਕਾ ਦਿਓ।
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Image Tools */}
              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyImage}
                  disabled={isGeneratingJpg}
                  className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg flex items-center justify-center space-x-1 transition-colors cursor-pointer border border-slate-200"
                  title="JPG ਫੋਟੋ ਕਾਪੀ ਕਰੋ ਤਾਂ ਜੋ WhatsApp ਵਿੱਚ Paste ਹੋ ਸਕੇ"
                >
                  <Copy className="w-3 h-3 text-slate-500" />
                  <span>ਫੋਟੋ ਕਾਪੀ ਕਰੋ</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadJpg}
                  disabled={isGeneratingJpg}
                  className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg flex items-center justify-center space-x-1 transition-colors cursor-pointer border border-slate-200"
                  title="ਪੂਰੀ JPG ਫੋਟੋ ਡਾਊਨਲੋਡ ਕਰੋ"
                >
                  <Download className="w-3 h-3 text-slate-500" />
                  <span>ਪੂਰੀ JPG ਡਾਊਨਲੋਡ</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Fixed Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 space-y-2">
          {/* Main 1-Click Button to send JPG + Message together */}
          <button
            type="button"
            onClick={handleSendJpgAndMessage}
            disabled={isGeneratingJpg}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-xl text-sm sm:text-base flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/25 transition-transform active:scale-[0.99] cursor-pointer"
          >
            {isGeneratingJpg ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>JPG ਤਿਆਰ ਕਰਕੇ WhatsApp 'ਤੇ ਭੇਜ ਰਿਹਾ ਹੈ...</span>
              </>
            ) : (
              <>
                <Share2 className="w-5 h-5" />
                <span>🚀 WhatsApp 'ਤੇ JPG ਫੋਟੋ + ਸੁਨੇਹਾ ਇਕੱਠਾ ਭੇਜੋ</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <button
              type="button"
              onClick={handleCopy}
              className="text-slate-600 hover:text-slate-900 font-semibold flex items-center space-x-1"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">ਸੁਨੇਹਾ ਕਾਪੀ ਹੋ ਗਿਆ!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>ਸਿਰਫ਼ ਸੁਨੇਹਾ ਕਾਪੀ ਕਰੋ</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => openWhatsAppLink(phone, messageText)}
              className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center space-x-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span>ਸਿਰਫ਼ ਟੈਕਸਟ ਚੈਟ ਖੋਲ੍ਹੋ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
