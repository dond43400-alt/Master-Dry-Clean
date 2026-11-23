import React, { useEffect, useState } from 'react';
import {
  X,
  QrCode,
  CheckCircle2,
  Banknote,
  Smartphone,
  ShieldCheck,
  Receipt,
} from 'lucide-react';
import { ShopSettings } from '../types';
import {
  generateUpiQrDataUrl,
  getDefaultBankAccount,
  getShopBankAccounts,
} from '../utils/helpers';

interface PaymentConfirmModalProps {
  billNumber: string;
  customerName: string;
  totalAmount: number;
  amountDue: number;
  initialPaymentMode?: 'Cash' | 'UPI' | 'Mix';
  settings: ShopSettings;
  showDeliveredToggle?: boolean;
  defaultMarkDelivered?: boolean;
  allowCustomAmount?: boolean;
  onConfirm: (details: {
    paidAmount: number;
    paymentMode: 'Cash' | 'UPI' | 'Mix';
    utrNumber?: string;
    markDelivered?: boolean;
  }) => void;
  onClose: () => void;
}

function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    [587.33, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      gain.gain.setValueAtTime(0.08, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.24);
    });
  } catch {
    // Ignore audio context restrictions
  }
}

export const PaymentConfirmModal: React.FC<PaymentConfirmModalProps> = ({
  billNumber,
  customerName,
  totalAmount,
  amountDue,
  initialPaymentMode = 'UPI',
  settings,
  showDeliveredToggle = false,
  defaultMarkDelivered = true,
  allowCustomAmount = false,
  onConfirm,
  onClose,
}) => {
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Mix'>(initialPaymentMode);
  const [paidAmount, setPaidAmount] = useState<number>(amountDue > 0 ? amountDue : totalAmount);
  const [utrNumber, setUtrNumber] = useState('');
  const [markDelivered, setMarkDelivered] = useState(defaultMarkDelivered);
  const [qrUrl, setQrUrl] = useState('');

  const bankAccounts = getShopBankAccounts(settings);
  const defaultBank = getDefaultBankAccount(settings);
  const [selectedBankId, setSelectedBankId] = useState<string>(defaultBank?.id || '');
  const activeBank =
    bankAccounts.find((b) => b.id === selectedBankId) || defaultBank;

  useEffect(() => {
    const qrAmount = paidAmount > 0 ? paidAmount : totalAmount;
    const isUpiVisible = paymentMode === 'UPI' || paymentMode === 'Mix';
    if (!isUpiVisible) {
      setQrUrl('');
      return;
    }
    if (activeBank?.qrCodeImage) {
      setQrUrl(activeBank.qrCodeImage);
      return;
    }
    const targetUpiId = activeBank?.upiId || settings.upiId;
    const targetUpiName =
      activeBank?.upiName || activeBank?.accountHolderName || settings.upiName;
    if (qrAmount > 0 && targetUpiId) {
      generateUpiQrDataUrl(targetUpiId, targetUpiName, qrAmount, billNumber).then((url) =>
        setQrUrl(url)
      );
    } else {
      setQrUrl('');
    }
  }, [paidAmount, totalAmount, activeBank, settings.upiId, settings.upiName, billNumber, paymentMode]);

  const handleConfirm = () => {
    playSuccessChime();
    onConfirm({
      paidAmount: Math.max(0, Number(paidAmount) || 0),
      paymentMode,
      utrNumber: utrNumber.trim() || undefined,
      markDelivered: showDeliveredToggle ? markDelivered : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                ਪੇਮੈਂਟ ਕਨਫਰਮ ਕਰੋ (Collect & Confirm)
              </h3>
              <p className="text-[11px] text-slate-300">
                ਬਿੱਲ: <span className="font-mono font-bold text-white">{billNumber}</span> •{' '}
                {customerName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Amount Summary */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-medium block">
                ਪ੍ਰਾਪਤ ਕਰਨ ਵਾਲੀ ਰਕਮ (Amount)
              </span>
              <span className="text-[11px] text-slate-400">ਕੁੱਲ ਬਿੱਲ: ₹{totalAmount}</span>
            </div>

            {allowCustomAmount ? (
              <div className="flex items-center space-x-1.5">
                <span className="text-lg font-extrabold text-emerald-700">₹</span>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                  className="w-28 text-right font-mono font-extrabold text-xl text-emerald-800 bg-white border border-emerald-300 rounded-lg px-2.5 py-1 focus:outline-hidden focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            ) : (
              <span className="text-2xl font-extrabold text-emerald-700 font-mono">
                ₹{paidAmount}
              </span>
            )}
          </div>

          {allowCustomAmount && amountDue !== totalAmount && amountDue > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPaidAmount(totalAmount)}
                className={`flex-1 py-1.5 px-2 rounded-lg font-semibold border cursor-pointer transition-colors ${
                  paidAmount === totalAmount
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                ਪੂਰਾ ਬਿੱਲ (₹{totalAmount})
              </button>
              <button
                type="button"
                onClick={() => setPaidAmount(amountDue)}
                className={`flex-1 py-1.5 px-2 rounded-lg font-semibold border cursor-pointer transition-colors ${
                  paidAmount === amountDue
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                ਐਡਵਾਂਸ (₹{amountDue})
              </button>
            </div>
          )}

          {/* Payment Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              ਭੁਗਤਾਨ ਦਾ ਤਰੀਕਾ (Payment Mode):
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['UPI', 'Cash', 'Mix'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    paymentMode === mode
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {mode === 'UPI' ? (
                    <Smartphone className="w-3.5 h-3.5" />
                  ) : mode === 'Cash' ? (
                    <Banknote className="w-3.5 h-3.5" />
                  ) : (
                    <Receipt className="w-3.5 h-3.5" />
                  )}
                  <span>{mode === 'UPI' ? 'UPI / QR' : mode === 'Cash' ? 'ਨਕਦ (Cash)' : 'ਮਿਕਸ'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Live UPI / Bank QR View */}
          {(paymentMode === 'UPI' || paymentMode === 'Mix') && (qrUrl || activeBank) && (
            <div className="p-4 bg-gradient-to-b from-sky-50/70 to-white rounded-2xl border border-sky-200 text-center space-y-2.5">
              {/* Switch between multiple saved Bank / UPI accounts */}
              {bankAccounts.length > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-1.5 pb-1">
                  {bankAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setSelectedBankId(acc.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-colors ${
                        activeBank?.id === acc.id
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {acc.bankName || acc.accountHolderName || acc.upiId}
                    </button>
                  ))}
                </div>
              )}

              <div className="text-xs font-bold text-slate-800">
                {activeBank?.accountHolderName || settings.shopNameEn}
                {activeBank?.bankName ? ` • ${activeBank.bankName}` : ''}
              </div>

              {qrUrl && (
                <div className="inline-block p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <img src={qrUrl} alt="UPI Payment QR" className="w-44 h-44 object-contain" />
                </div>
              )}

              <div className="space-y-1">
                {(activeBank?.upiId || settings.upiId) && (
                  <div className="text-[11px] font-mono text-slate-700 bg-slate-100 py-1 px-2.5 rounded-lg inline-block">
                    UPI ID: <strong>{activeBank?.upiId || settings.upiId}</strong>
                  </div>
                )}
                {(activeBank?.accountNumber || activeBank?.ifscCode) && (
                  <div className="text-[10px] font-mono text-slate-600">
                    {activeBank.accountNumber && <span>A/C: {activeBank.accountNumber}</span>}
                    {activeBank.accountNumber && activeBank.ifscCode && <span> • </span>}
                    {activeBank.ifscCode && <span>IFSC: {activeBank.ifscCode}</span>}
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-600 leading-snug">
                ਗਾਹਕ ਨੂੰ GPay / PhonePe / Paytm ਨਾਲ ਸਕੈਨ ਕਰਨ ਲਈ ਕਹੋ। ਫੋਨ ਜਾਂ Soundbox &apos;ਤੇ
                ਪੈਸੇ ਆਉਣ ਤੋਂ ਬਾਅਦ ਹੇਠਾਂ <strong>Confirm</strong> ਦਬਾਓ।
              </p>

              {/* Optional UTR / Transaction Ref */}
              <div className="text-left pt-1">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  UTR / Transaction Ref ਨੰਬਰ (ਵਿਕਲਪਿਕ / Optional):
                </label>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  placeholder="ਜਿਵੇਂ: 432819204512 (ਜੇ ਲਿਖਣਾ ਹੋਵੇ)"
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                />
              </div>
            </div>
          )}

          {/* Optional mark delivered checkbox */}
          {showDeliveredToggle && (
            <label className="flex items-center space-x-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={markDelivered}
                onChange={(e) => setMarkDelivered(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
              <span className="font-semibold">
                ਪੇਮੈਂਟ ਤੋਂ ਬਾਅਦ ਕੱਪੜੇ &quot;ਡਿਲੀਵਰਡ (Delivered)&quot; ਮਾਰਕ ਕਰੋ
              </span>
            </label>
          )}

          {/* 1-Click Confirm Button */}
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-2 transition-transform active:scale-[0.98] cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>✅ Payment Received (₹{paidAmount}) — Confirm & Save</span>
          </button>

          <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>100% Free UPI QR • Zero Gateway Fee</span>
          </div>
        </div>
      </div>
    </div>
  );
};
