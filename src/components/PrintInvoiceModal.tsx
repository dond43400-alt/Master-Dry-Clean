import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  Printer,
  Scissors,
  FileDown,
  Image as ImageIcon,
  Loader2,
  Check,
  Package,
  Pencil,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Order, ShopSettings } from '../types';
import {
  generateUpiQrDataUrl,
  formatDatePunjabi,
  formatItemServices,
  getDefaultBankAccount,
  getShopBankAccounts,
} from '../utils/helpers';
import { captureNodeToJpeg, captureNodeToPng } from '../utils/captureReceipt';
import jsPDF from 'jspdf';

type PrintLayoutMode = 'a4_2up' | 'a4_1up' | 'thermal';

interface PrintInvoiceModalProps {
  order: Order | null;
  settings: ShopSettings;
  onEditOrder?: (order: Order) => void;
  onClose: () => void;
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({
  order,
  settings,
  onEditOrder,
  onClose,
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [printFormat, setPrintFormat] = useState<PrintLayoutMode>(() => {
    const saved = localStorage.getItem('mdc_print_format');
    if (saved === 'a4_2up' || saved === 'a4_1up' || saved === 'thermal') {
      return saved;
    }
    return 'a4_2up';
  });
  const [includeBoxSlip, setIncludeBoxSlip] = useState<boolean>(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingJpg, setIsExportingJpg] = useState(false);
  const [exportNotice, setExportNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  const receiptRef = useRef<HTMLDivElement>(null);

  const bankAccounts = getShopBankAccounts(settings);
  const defaultBank = getDefaultBankAccount(settings);
  const [selectedBankId, setSelectedBankId] = useState<string>(defaultBank?.id || '');
  const activeBank =
    bankAccounts.find((b) => b.id === selectedBankId) || defaultBank;

  useEffect(() => {
    localStorage.setItem('mdc_print_format', printFormat);
  }, [printFormat]);

  useEffect(() => {
    if (!order) return;
    if (activeBank?.qrCodeImage) {
      setQrCodeUrl(activeBank.qrCodeImage);
      return;
    }
    const targetUpiId = activeBank?.upiId || settings.upiId;
    const targetUpiName =
      activeBank?.upiName || activeBank?.accountHolderName || settings.upiName;
    if (targetUpiId) {
      const amount = order.pendingAmount > 0 ? order.pendingAmount : order.totalAmount;
      generateUpiQrDataUrl(targetUpiId, targetUpiName, amount, order.billNumber).then(
        (url) => setQrCodeUrl(url)
      );
    } else {
      setQrCodeUrl('');
    }
  }, [order, activeBank, settings.upiId, settings.upiName]);

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  // Export as JPG Image
  const handleExportJpg = async () => {
    if (!receiptRef.current) return;
    setIsExportingJpg(true);
    try {
      const result = await captureNodeToJpeg(receiptRef.current, `Bill-${order.billNumber}.jpg`);
      const link = document.createElement('a');
      link.download = `Bill-${order.billNumber}.jpg`;
      link.href = result.dataUrl;
      link.click();
      setExportNotice({ type: 'ok', text: 'JPG ਡਾਊਨਲੋਡ ਹੋ ਗਿਆ!' });
      setTimeout(() => setExportNotice(null), 2500);
    } catch (err) {
      console.error('Failed to export JPG:', err);
      setExportNotice({ type: 'err', text: 'JPG ਐਕਸਪੋਰਟ ਵਿੱਚ ਤਰੁੱਟੀ ਆਈ' });
      setTimeout(() => setExportNotice(null), 3000);
    } finally {
      setIsExportingJpg(false);
    }
  };

  // Export as PDF (True A4 Portrait 1-Page PDF for a4_2up & a4_1up, or 80mm roll for thermal)
  const handleExportPdf = async () => {
    if (!receiptRef.current) return;
    setIsExportingPdf(true);
    try {
      const result = await captureNodeToPng(receiptRef.current, `Bill-${order.billNumber}.png`);
      const imgData = result.dataUrl;

      const img = new Image();
      img.src = imgData;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
      });

      if (printFormat === 'thermal') {
        const imgWidth = 80; // mm
        const pageHeight = (img.naturalHeight * imgWidth) / img.naturalWidth;
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [imgWidth + 10, pageHeight + 10],
        });
        pdf.addImage(imgData, 'PNG', 5, 5, imgWidth, pageHeight);
        pdf.save(`Bill-${order.billNumber}-Thermal.pdf`);
      } else {
        // Genuine A4 Portrait (210mm x 297mm) fitting cleanly on 1 single page
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });
        const pageW = pdf.internal.pageSize.getWidth(); // 210mm
        const pageH = pdf.internal.pageSize.getHeight(); // 297mm
        const margin = 5;
        const maxW = pageW - margin * 2; // 200mm
        const maxH = pageH - margin * 2; // 287mm
        const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
        const drawW = img.naturalWidth * ratio;
        const drawH = img.naturalHeight * ratio;
        const offsetX = (pageW - drawW) / 2;
        const offsetY = margin;
        pdf.addImage(imgData, 'PNG', offsetX, offsetY, drawW, drawH);
        const suffix = printFormat === 'a4_2up' ? 'A4-2Copy' : 'A4-Full';
        pdf.save(`Bill-${order.billNumber}-${suffix}.pdf`);
      }

      setExportNotice({
        type: 'ok',
        text:
          printFormat === 'a4_2up'
            ? 'A4 Portrait (2 ਕਾਪੀਆਂ - 1 ਪੇਜ) PDF ਡਾਊਨਲੋਡ ਹੋ ਗਿਆ!'
            : printFormat === 'a4_1up'
            ? 'A4 Portrait (1 ਪੂਰੀ ਕਾਪੀ) PDF ਡਾਊਨਲੋਡ ਹੋ ਗਿਆ!'
            : 'Thermal PDF ਡਾਊਨਲੋਡ ਹੋ ਗਿਆ!',
      });
      setTimeout(() => setExportNotice(null), 3000);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      setExportNotice({ type: 'err', text: 'PDF ਐਕਸਪੋਰਟ ਵਿੱਚ ਤਰੁੱਟੀ ਆਈ' });
      setTimeout(() => setExportNotice(null), 3000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const effectiveBoxTag =
    order.boxTagNumber || `BOX-${order.billNumber.replace(/\D/g, '') || order.billNumber}`;
  const boxCount = order.boxCount || 1;
  const totalPieces = order.items.reduce((sum, it) => sum + it.quantity, 0);
  const displayUpiId = activeBank?.upiId || settings.upiId;

  // Compact half-A4 copy designed so 2 copies of the same bill fit comfortably on ONE A4 Portrait page
  const renderA4CompactCopy = (
    copyType: 'ਗਾਹਕ ਕਾਪੀ (Customer Copy)' | 'ਦੁਕਾਨ ਕਾਊਂਟਰ ਕਾਪੀ (Shop Copy)'
  ) => (
    <div className="p-3 bg-white border border-slate-400 rounded-md text-slate-900 font-sans text-[11px] leading-tight">
      {/* Compact Header Strip */}
      <div className="flex items-start justify-between border-b border-dashed border-slate-400 pb-2 mb-2 gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-black tracking-tight text-slate-950">
              {settings.shopNamePa}
            </h2>
            <span className="text-[10px] font-bold text-slate-600">({settings.shopNameEn})</span>
          </div>
          <p className="text-[10px] text-slate-600 truncate">{settings.addressPa}</p>
          <p className="text-[10px] font-mono text-slate-800">
            Mob: {settings.phone}
            {displayUpiId ? ` • UPI: ${displayUpiId}` : ''}
          </p>
        </div>

        <div className="text-right shrink-0 space-y-1">
          <span className="inline-block text-[9px] font-black uppercase tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded-xs">
            {copyType}
          </span>
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-xs font-black font-mono text-slate-950">
              {order.billNumber}
            </span>
            <span className="text-[10px] font-black font-mono px-1.5 py-0.5 border border-slate-900 bg-slate-100 rounded-xs">
              📦 {effectiveBoxTag}
              {boxCount > 1 ? ` (${boxCount})` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Customer + Dates Bar */}
      <div className="grid grid-cols-3 gap-2 pb-1.5 mb-2 border-b border-dashed border-slate-300 text-[10px] bg-slate-50 px-2 py-1 rounded-xs">
        <div className="truncate">
          <span className="font-bold text-slate-600">ਗਾਹਕ:</span>{' '}
          <strong className="text-slate-950">{order.customerName}</strong>
          {order.customerVillage && (
            <span className="text-slate-600"> • {order.customerVillage}</span>
          )}
        </div>
        <div className="text-center font-mono">
          <span className="font-bold text-slate-600">Mob:</span>{' '}
          {order.customerPhone || '—'} • <strong>{totalPieces} ਪੀਸ</strong>
        </div>
        <div className="text-right">
          <span className="font-bold">ਬੁਕਿੰਗ:</span> {formatDatePunjabi(order.createdAt)} |{' '}
          <span className="font-bold">ਤਿਆਰ:</span>{' '}
          <strong>{formatDatePunjabi(order.expectedDeliveryDate)}</strong>
        </div>
      </div>

      {/* 2-Column Body: Items Table (Left) + Totals & QR (Right) */}
      <div className="grid grid-cols-12 gap-2.5 items-start">
        <div className="col-span-8">
          <table className="w-full text-left text-[10px] border-collapse">
            <thead>
              <tr className="border-b border-slate-400 text-slate-700 bg-slate-50">
                <th className="py-1 px-1">ਕੱਪੜਾ (Item)</th>
                <th className="py-1 px-1">ਕੰਮ (Work)</th>
                <th className="py-1 px-1 text-center">ਗਿਣਤੀ</th>
                <th className="py-1 px-1 text-right">ਰੇਟ</th>
                <th className="py-1 px-1 text-right">ਕੁੱਲ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {order.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-0.5 px-1 font-semibold text-slate-900">
                    {item.clothName}
                    {item.clothNameEn && (
                      <span className="text-[9px] text-slate-500 font-normal ml-1">
                        ({item.clothNameEn})
                      </span>
                    )}
                  </td>
                  <td className="py-0.5 px-1 text-slate-600 text-[9px]">
                    {formatItemServices(item)}
                  </td>
                  <td className="py-0.5 px-1 text-center font-bold font-mono">{item.quantity}</td>
                  <td className="py-0.5 px-1 text-right font-mono">₹{item.rate}</td>
                  <td className="py-0.5 px-1 text-right font-mono font-bold">₹{item.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {order.notes && (
            <p className="text-[9px] text-slate-700 mt-1 px-1">
              <strong>ਨੋਟ:</strong> {order.notes}
            </p>
          )}
        </div>

        {/* Right Summary & QR */}
        <div className="col-span-4 border-l border-dashed border-slate-300 pl-2.5 space-y-1.5">
          <div className="space-y-0.5 text-[10px]">
            <div className="flex justify-between">
              <span>ਕੁੱਲ ਜੋੜ:</span>
              <span className="font-mono font-semibold">₹{order.subtotal}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>ਛੋਟ (Discount):</span>
                <span className="font-mono">-₹{order.discount}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-[11px] border-t border-slate-300 pt-0.5">
              <span>ਕੁੱਲ ਬਿੱਲ:</span>
              <span className="font-mono">₹{order.totalAmount}</span>
            </div>
            <div className="flex justify-between text-emerald-800 font-semibold">
              <span>ਐਡਵਾਂਸ ({order.paymentMode}):</span>
              <span className="font-mono">₹{order.advanceAmount}</span>
            </div>
            <div className="flex justify-between font-black text-[11px] text-amber-950 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-xs">
              <span>ਬਾਕੀ (Pending):</span>
              <span className="font-mono">₹{order.pendingAmount}</span>
            </div>
            {order.utrNumber && (
              <div className="text-[9px] font-mono text-slate-600 text-right">
                UTR: {order.utrNumber}
              </div>
            )}
          </div>

          {(qrCodeUrl || activeBank) && (
            <div className="pt-1 border-t border-dashed border-slate-300 text-center flex flex-col items-center">
              {qrCodeUrl && (
                <img
                  src={qrCodeUrl}
                  alt="UPI QR"
                  className="w-16 h-16 border border-slate-300 p-0.5 object-contain bg-white"
                />
              )}
              {displayUpiId && (
                <p className="text-[8px] font-mono text-slate-700 mt-0.5 truncate max-w-full">
                  {displayUpiId}
                </p>
              )}
              {activeBank && (activeBank.bankName || activeBank.ifscCode) && (
                <p className="text-[8px] font-mono text-slate-500 leading-tight">
                  {activeBank.bankName}
                  {activeBank.ifscCode ? ` • ${activeBank.ifscCode}` : ''}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Compact Disclaimer Footer */}
      <div className="mt-2 pt-1 border-t border-dashed border-slate-300 flex items-center justify-between gap-2 text-[9px] text-slate-700">
        <span className="font-bold leading-tight">⚠️ {settings.disclaimerPa}</span>
        <span className="shrink-0 font-semibold text-slate-500">ਧੰਨਵਾਦ!</span>
      </div>
    </div>
  );

  // Full single-slip layout (used for Thermal 80mm AND A4 Full Single Page)
  const renderSlip = (
    copyType: 'ਗਾਹਕ ਕਾਪੀ (Customer Copy)' | 'ਦੁਕਾਨ ਕਾਊਂਟਰ ਕਾਪੀ (Shop Counter)',
    isA4Full = false
  ) => (
    <div
      className={`${
        isA4Full ? 'p-6 text-xs' : 'p-4 sm:p-5 text-xs'
      } bg-white border border-slate-300 rounded-lg text-slate-900 font-sans`}
    >
      {/* Slip Header */}
      <div className="text-center border-b border-dashed border-slate-400 pb-3 mb-2.5">
        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-sm">
          {copyType}
        </span>
        <h2 className={`${isA4Full ? 'text-2xl' : 'text-lg'} font-black tracking-tight mt-1`}>
          {settings.shopNamePa}
        </h2>
        <h3 className="text-xs font-bold text-slate-700 tracking-wide">{settings.shopNameEn}</h3>
        <p className="text-[10px] text-slate-600 mt-0.5">{settings.addressPa}</p>
        <p className="text-[10px] font-mono text-slate-800">
          Mobile: {settings.phone} • UPI ID: {displayUpiId}
        </p>
      </div>

      {/* Linked Box / Tag Number Highlight */}
      <div className="mb-2.5 px-2.5 py-1.5 rounded-md border-2 border-slate-900 bg-slate-50 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-800 flex items-center gap-1">
          <Package className="w-3.5 h-3.5 text-slate-900" />
          <span>ਡੱਬਾ / ਟੈਗ ਨੰ. (Box Tag):</span>
        </span>
        <span className="text-sm font-black font-mono text-slate-950 tracking-wider">
          {effectiveBoxTag}
          {boxCount > 1 ? ` (${boxCount} ਡੱਬੇ)` : ''}
        </span>
      </div>

      {/* Bill & Customer Meta */}
      <div className="grid grid-cols-2 gap-2 pb-2.5 border-b border-dashed border-slate-300 text-[11px]">
        <div>
          <p>
            <span className="font-bold">Bill No:</span> {order.billNumber}
          </p>
          <p>
            <span className="font-bold">Date:</span> {formatDatePunjabi(order.createdAt)}
          </p>
          <p>
            <span className="font-bold">Delivery Date:</span>{' '}
            {formatDatePunjabi(order.expectedDeliveryDate)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-900 truncate">{order.customerName}</p>
          <p className="font-mono text-slate-700">{order.customerPhone || 'ਨੰਬਰ ਨਹੀਂ'}</p>
          {order.customerVillage && (
            <p className="text-[10px] text-slate-600 truncate">ਪਿੰਡ: {order.customerVillage}</p>
          )}
          <p>
            <span className="font-semibold text-slate-600">Mode:</span> {order.paymentMode}
          </p>
          {order.utrNumber && (
            <p className="text-[10px] font-mono text-slate-600">UTR: {order.utrNumber}</p>
          )}
        </div>
      </div>

      {/* Items Table */}
      <table className={`w-full text-left my-2.5 ${isA4Full ? 'text-xs' : 'text-[11px]'}`}>
        <thead>
          <tr className="border-b border-slate-400 text-slate-700">
            <th className="py-1">ਕੱਪੜਾ (Item)</th>
            <th className="py-1">ਸਰਵਿਸ (Service)</th>
            <th className="py-1 text-center">ਮਾਤਰਾ (Qty)</th>
            <th className="py-1 text-right">ਰੇਟ (Rate)</th>
            <th className="py-1 text-right">ਕੁੱਲ (Total)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {order.items.map((item, idx) => (
            <tr key={idx}>
              <td className="py-1 font-medium text-slate-900">
                {item.clothName}
                {item.clothNameEn && (
                  <span className="block text-[10px] text-slate-500 font-normal">
                    {item.clothNameEn}
                  </span>
                )}
              </td>
              <td className="py-1 text-slate-600 text-[10px]">{formatItemServices(item)}</td>
              <td className="py-1 text-center font-bold font-mono">{item.quantity}</td>
              <td className="py-1 text-right font-mono">₹{item.rate}</td>
              <td className="py-1 text-right font-mono font-bold">₹{item.total}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Financial Summary */}
      <div className="border-t border-dashed border-slate-400 pt-2 space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span>ਕੁੱਲ ਜੋੜ (Subtotal):</span>
          <span className="font-mono font-semibold">₹{order.subtotal}</span>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between text-slate-600">
            <span>ਛੋਟ (Discount):</span>
            <span className="font-mono">-₹{order.discount}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-200">
          <span>ਕੁੱਲ ਬਿੱਲ (Total Amount):</span>
          <span className="font-mono">₹{order.totalAmount}</span>
        </div>
        <div className="flex justify-between text-emerald-800 font-semibold">
          <span>ਐਡਵਾਂਸ ਦਿੱਤਾ (Advance Paid):</span>
          <span className="font-mono">₹{order.advanceAmount}</span>
        </div>
        <div className="flex justify-between font-bold text-xs text-amber-900 bg-amber-50 p-1.5 rounded-sm">
          <span>ਬਾਕੀ ਰਕਮ (Pending Balance):</span>
          <span className="font-mono">₹{order.pendingAmount}</span>
        </div>
      </div>

      {/* Live Scanable UPI / Bank QR & Payment Info */}
      {(qrCodeUrl || activeBank) && (
        <div className="my-3 pt-2 border-t border-dashed border-slate-300 text-center flex flex-col items-center space-y-0.5">
          <p className="text-[10px] font-bold text-slate-700">UPI / ਬੈਂਕ ਭੁਗਤਾਨ (Scan to Pay)</p>
          {qrCodeUrl && (
            <img
              src={qrCodeUrl}
              alt="UPI QR"
              className={`${isA4Full ? 'w-28 h-28' : 'w-24 h-24'} my-1 border border-slate-300 p-1 object-contain`}
            />
          )}
          {displayUpiId && (
            <p className="text-[9px] font-mono text-slate-700">
              UPI ID: <strong>{displayUpiId}</strong>
            </p>
          )}
          {activeBank && (activeBank.bankName || activeBank.accountNumber || activeBank.ifscCode) && (
            <div className="text-[9px] text-slate-600 leading-tight">
              <span className="font-semibold">
                {activeBank.accountHolderName}
                {activeBank.bankName ? ` (${activeBank.bankName})` : ''}
              </span>
              {(activeBank.accountNumber || activeBank.ifscCode) && (
                <div className="font-mono">
                  {activeBank.accountNumber && `A/C: ${activeBank.accountNumber}`}
                  {activeBank.accountNumber && activeBank.ifscCode && ' • '}
                  {activeBank.ifscCode && `IFSC: ${activeBank.ifscCode}`}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Critical 15-Day Policy Note */}
      <div className="mt-3 pt-2 border-t border-dashed border-slate-400 text-center space-y-1">
        <p className="text-[10px] font-bold text-slate-900 leading-tight">
          ⚠️ {settings.disclaimerPa}
        </p>
        <p className="text-[9px] text-slate-600 leading-snug">
          "Note: Kapde taiyaar hone ki date se 15 dino tak hi dukandar ki zimmedari hogi. 15 dino ke baad kapde ke ghum hone ya kharab hone ka hamara koi daawa nahi hoga."
        </p>
        <p className="text-[9px] text-slate-500 pt-1">ਧੰਨਵਾਦ! ਦੁਬਾਰਾ ਸੇਵਾ ਦਾ ਮੌਕਾ ਦਿਓ।</p>
      </div>
    </div>
  );

  const renderBoxTagSlip = (compact = false) => (
    <div
      className={`${
        compact ? 'p-2.5 text-[11px]' : 'p-3.5 sm:p-4 text-xs'
      } bg-white border-2 border-slate-900 rounded-lg text-slate-950 font-sans`}
    >
      {compact ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded text-center shrink-0">
              <div className="text-[8px] font-bold uppercase tracking-wider">BOX TAG</div>
              <div className="text-sm font-black font-mono tracking-wider">{effectiveBoxTag}</div>
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-slate-950 truncate">
                {order.customerName} • <span className="font-mono">{order.billNumber}</span>
              </div>
              <div className="text-[10px] text-slate-700 truncate">
                {order.customerPhone || '—'}
                {order.customerVillage ? ` • ਪਿੰਡ: ${order.customerVillage}` : ''} •{' '}
                <strong>{totalPieces} ਪੀਸ</strong>
                {boxCount > 1 ? ` • ${boxCount} ਡੱਬੇ` : ''}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0 text-[10px]">
            <div className="font-bold">ਤਿਆਰ: {formatDatePunjabi(order.expectedDeliveryDate)}</div>
            <div className="font-black font-mono">
              {order.pendingAmount > 0 ? `ਬਾਕੀ: ₹${order.pendingAmount}` : 'PAID ✓'}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-dashed border-slate-400 pb-2 mb-2.5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded-sm inline-flex items-center gap-1">
                <Package className="w-3 h-3" />
                <span>ਡੱਬਾ / ਗੱਠੜੀ ਸਲਿੱਪ (BOX SLIP)</span>
              </span>
              <p className="text-[10px] font-bold text-slate-700 mt-1">{settings.shopNamePa}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-500">ਬਿੱਲ ਨੰ. (Bill No)</p>
              <p className="text-sm font-black font-mono text-slate-950">{order.billNumber}</p>
            </div>
          </div>

          <div className="bg-slate-100 border-2 border-slate-900 rounded-md py-2 px-3 text-center mb-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
              ਡੱਬਾ / ਟੈਗ ਨੰਬਰ (BOX / TAG NO.)
            </div>
            <div className="text-2xl font-black font-mono tracking-widest text-slate-950 mt-0.5">
              {effectiveBoxTag}
            </div>
            <div className="flex items-center justify-center gap-3 text-[11px] font-bold text-slate-800 mt-1">
              <span>ਕੁੱਲ ਕੱਪੜੇ: {totalPieces} ਪੀਸ</span>
              {boxCount > 1 && <span>• ਡੱਬੇ: {boxCount}</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pb-2 border-b border-dashed border-slate-300">
            <div>
              <p className="font-bold text-slate-950 truncate">{order.customerName}</p>
              {order.customerVillage && (
                <p className="text-[10px] text-slate-700 truncate">ਪਿੰਡ: {order.customerVillage}</p>
              )}
              <p className="font-mono text-[10px] text-slate-700">
                {order.customerPhone || 'ਨੰਬਰ ਨਹੀਂ'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px]">
                <span className="font-semibold">ਬੁਕਿੰਗ:</span> {formatDatePunjabi(order.createdAt)}
              </p>
              <p className="text-[11px] font-bold text-slate-950">
                <span>ਤਿਆਰ:</span> {formatDatePunjabi(order.expectedDeliveryDate)}
              </p>
              <p className="text-[10px] font-extrabold font-mono mt-0.5">
                {order.pendingAmount > 0 ? `ਬਾਕੀ: ₹${order.pendingAmount}` : 'PAID ✓'}
              </p>
            </div>
          </div>

          <div className="pt-2 space-y-1">
            <p className="text-[10px] font-bold text-slate-700">ਡੱਬੇ ਵਿੱਚ ਕੱਪੜਿਆਂ ਦਾ ਵੇਰਵਾ:</p>
            <div className="flex flex-wrap gap-1">
              {order.items.map((item, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-semibold px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded-sm"
                >
                  {item.quantity}× {item.clothName} ({formatItemServices(item)})
                </span>
              ))}
            </div>
            {order.notes && (
              <p className="text-[10px] font-semibold text-slate-800 pt-1">ਨੋਟ: {order.notes}</p>
            )}
          </div>

          <div className="mt-2 pt-1.5 border-t border-dashed border-slate-300 text-center text-[9px] font-bold text-slate-600">
            ✂️ ਇਹ ਸਲਿੱਪ ਕੱਟ ਕੇ ਡੱਬੇ / ਬੈਗ ਉੱਪਰ ਲਗਾਓ • ਉੱਪਰਲਾ ਬਿੱਲ ਗਾਹਕ ਨੂੰ ਦਿਓ
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 overflow-y-auto">
      {/* Print Specific CSS (A4 Portrait 1-Page Fit or Thermal 80mm) */}
      <style>{`
        @media print {
          @page {
            margin: ${printFormat === 'thermal' ? '4mm' : '5mm'};
            size: ${printFormat === 'thermal' ? 'auto' : 'A4 portrait'};
          }
          html, body {
            height: auto !important;
            min-height: 100% !important;
            overflow: visible !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #root, .fixed, [class*="max-h-"], [class*="overflow-"] {
            position: static !important;
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-invoice-container, #printable-invoice-container * {
            visibility: visible;
          }
          #printable-invoice-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: ${printFormat === 'thermal' ? '6px' : '0'} !important;
            background: white !important;
            display: block !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden my-3 border border-slate-200">
        {/* Modal Controls Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50 space-y-2.5 no-print shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Printer className="w-5 h-5 text-sky-600 shrink-0" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                  ਬਿੱਲ ਪ੍ਰਿੰਟ ਤੇ PDF ਸੈਟਿੰਗ - {order.billNumber}
                </h3>
                <p className="text-[11px] text-slate-500">
                  A4 Portrait (2 ਕਾਪੀਆਂ 1 ਪੇਜ / 1 ਪੂਰੀ ਕਾਪੀ) ਜਾਂ ਥਰਮਲ ਚੁਣੋ
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {bankAccounts.length > 1 && (
                <select
                  value={activeBank?.id || ''}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="px-2 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-800 cursor-pointer"
                  title="ਰਸੀਦ ਲਈ ਬੈਂਕ / QR ਖਾਤਾ ਚੁਣੋ"
                >
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      QR: {acc.bankName || acc.accountHolderName || acc.upiId}
                    </option>
                  ))}
                </select>
              )}

              {/* Export as PDF */}
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs"
                title="Save/Export as A4 Portrait PDF"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                <span>PDF ਡਾਊਨਲੋਡ</span>
              </button>

              {/* Export as JPG */}
              <button
                type="button"
                onClick={handleExportJpg}
                disabled={isExportingJpg}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs"
                title="Save/Export as JPG Image"
              >
                {isExportingJpg ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5" />
                )}
                <span>JPG ਸੇਵ</span>
              </button>

              {/* Print */}
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>ਪ੍ਰਿੰਟ ਕਰੋ</span>
              </button>

              {/* Quick Edit Bill */}
              {onEditOrder && (
                <button
                  type="button"
                  onClick={() => onEditOrder(order)}
                  className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs"
                  title="ਪੂਰਾ ਬਿੱਲ ਐਡਿਟ ਕਰੋ"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>ਐਡਿਟ</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tick-box Print Layout Options Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setPrintFormat('a4_2up')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                printFormat === 'a4_2up'
                  ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {printFormat === 'a4_2up' ? (
                <CheckSquare className="w-4 h-4 shrink-0" />
              ) : (
                <Square className="w-4 h-4 shrink-0 text-slate-400" />
              )}
              <span>2 ਕਾਪੀਆਂ — 1 A4 ਪੇਜ (Portrait)</span>
            </button>

            <button
              type="button"
              onClick={() => setPrintFormat('a4_1up')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                printFormat === 'a4_1up'
                  ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {printFormat === 'a4_1up' ? (
                <CheckSquare className="w-4 h-4 shrink-0" />
              ) : (
                <Square className="w-4 h-4 shrink-0 text-slate-400" />
              )}
              <span>1 ਪੇਜ — 1 ਪੂਰੀ ਕਾਪੀ (A4 Full)</span>
            </button>

            <button
              type="button"
              onClick={() => setPrintFormat('thermal')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                printFormat === 'thermal'
                  ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {printFormat === 'thermal' ? (
                <CheckSquare className="w-4 h-4 shrink-0" />
              ) : (
                <Square className="w-4 h-4 shrink-0 text-slate-400" />
              )}
              <span>ਥਰਮਲ (80mm POS)</span>
            </button>

            {/* Cut-out Box Slip Toggle */}
            <label
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer select-none transition-colors ml-auto ${
                includeBoxSlip
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-white border-slate-300 text-slate-600'
              }`}
            >
              <input
                type="checkbox"
                checked={includeBoxSlip}
                onChange={(e) => setIncludeBoxSlip(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-amber-600 cursor-pointer"
              />
              <Scissors className="w-3.5 h-3.5" />
              <span>ਬਾਕਸ ਸਲਿੱਪ ਸ਼ਾਮਲ ਕਰੋ</span>
            </label>
          </div>
        </div>

        {exportNotice && (
          <div
            className={`${
              exportNotice.type === 'ok' ? 'bg-emerald-500' : 'bg-rose-600'
            } text-white text-xs font-bold py-1.5 px-4 text-center flex items-center justify-center space-x-1 shrink-0`}
          >
            <Check className="w-4 h-4" />
            <span>{exportNotice.text}</span>
          </div>
        )}

        {/* Printable & Exportable Canvas Area */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-200/80 flex justify-center">
          <div
            id="printable-invoice-container"
            ref={receiptRef}
            className={
              printFormat === 'thermal'
                ? 'max-w-sm w-full bg-transparent'
                : 'w-full max-w-[760px] bg-white p-3 sm:p-4 rounded-xl shadow-sm'
            }
          >
            {printFormat === 'a4_2up' && (
              <div className="space-y-2.5">
                {/* Copy 1 (Top half of A4 Portrait) */}
                {renderA4CompactCopy('ਗਾਹਕ ਕਾਪੀ (Customer Copy)')}

                {/* Scissors Cutting Line between Copy 1 and Copy 2 */}
                <div className="py-0.5 flex items-center justify-center gap-1.5 text-slate-800">
                  <Scissors className="w-3.5 h-3.5 shrink-0 text-slate-900" />
                  <div className="border-t-2 border-dashed border-slate-700 flex-1"></div>
                  <span className="text-[9px] font-black tracking-wider uppercase whitespace-nowrap px-1">
                    ✂️ ਇੱਥੋਂ ਕੱਟੋ • SAME BILL (2 COPIES / 1 A4 PORTRAIT PAGE) ✂️
                  </span>
                  <div className="border-t-2 border-dashed border-slate-700 flex-1"></div>
                  <Scissors className="w-3.5 h-3.5 shrink-0 text-slate-900 rotate-180" />
                </div>

                {/* Copy 2 (Bottom half of A4 Portrait) */}
                {renderA4CompactCopy('ਦੁਕਾਨ ਕਾਊਂਟਰ ਕਾਪੀ (Shop Copy)')}

                {/* Compact Cut-out Box Slip strip if checked */}
                {includeBoxSlip && (
                  <>
                    <div className="flex items-center justify-center gap-1 text-slate-700">
                      <Scissors className="w-3 h-3 shrink-0" />
                      <div className="border-t border-dashed border-slate-600 flex-1"></div>
                      <span className="text-[8px] font-bold uppercase px-1">
                        ✂️ BOX STICKER SLIP
                      </span>
                      <div className="border-t border-dashed border-slate-600 flex-1"></div>
                    </div>
                    {renderBoxTagSlip(true)}
                  </>
                )}
              </div>
            )}

            {printFormat === 'a4_1up' && (
              <div className="space-y-3">
                {/* Single Full Page A4 Portrait Copy */}
                {renderSlip('ਗਾਹਕ ਕਾਪੀ (Customer Copy)', true)}

                {includeBoxSlip && (
                  <>
                    <div className="py-1 flex items-center justify-center gap-1 text-slate-800">
                      <Scissors className="w-4 h-4 shrink-0 text-slate-900" />
                      <div className="border-t-2 border-dashed border-slate-800 flex-1"></div>
                      <span className="text-[10px] font-black tracking-wide uppercase whitespace-nowrap px-1.5">
                        ✂️ ਇੱਥੋਂ ਕੱਟੋ • BOX SLIP ✂️
                      </span>
                      <div className="border-t-2 border-dashed border-slate-800 flex-1"></div>
                      <Scissors className="w-4 h-4 shrink-0 text-slate-900 rotate-180" />
                    </div>
                    {renderBoxTagSlip(false)}
                  </>
                )}
              </div>
            )}

            {printFormat === 'thermal' && (
              <div>
                {renderSlip('ਗਾਹਕ ਕਾਪੀ (Customer Copy)', false)}

                {includeBoxSlip && (
                  <>
                    <div className="my-3 py-1 flex items-center justify-center gap-1 text-slate-800">
                      <Scissors className="w-4 h-4 shrink-0 text-slate-900" />
                      <div className="border-t-2 border-dashed border-slate-800 flex-1"></div>
                      <span className="text-[10px] font-black tracking-wide uppercase whitespace-nowrap px-1.5">
                        ✂️ ਇੱਥੋਂ ਕੱਟੋ • BOX SLIP ✂️
                      </span>
                      <div className="border-t-2 border-dashed border-slate-800 flex-1"></div>
                      <Scissors className="w-4 h-4 shrink-0 text-slate-900 rotate-180" />
                    </div>
                    {renderBoxTagSlip(false)}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 no-print shrink-0">
          <span>
            {printFormat === 'a4_2up'
              ? 'A4 Portrait: 1 ਪੇਜ ਤੇ ਇੱਕੋ ਬਿੱਲ ਦੀਆਂ 2 ਕਾਪੀਆਂ ਪ੍ਰਿੰਟ/PDF ਹੋਣਗੀਆਂ'
              : printFormat === 'a4_1up'
              ? 'A4 Portrait: 1 ਪੇਜ ਤੇ 1 ਪੂਰਾ ਬਿੱਲ ਪ੍ਰਿੰਟ/PDF ਹੋਵੇਗਾ'
              : 'POS 80mm ਥਰਮਲ ਪ੍ਰਿੰਟਰ ਮੋਡ'}
          </span>
          <span className="font-medium text-slate-700">UPI: {displayUpiId}</span>
        </div>
      </div>
    </div>
  );
};
