import React, { useState, useRef } from 'react';
import {
  X,
  Settings,
  Check,
  RotateCcw,
  AlertTriangle,
  Download,
  Upload,
  HardDrive,
  Landmark,
  Plus,
  Pencil,
  Trash2,
  QrCode,
  Star,
  ImagePlus,
} from 'lucide-react';
import { BankAccount, CustomerAccount, Order, RateItem, ShopSettings } from '../types';
import { DEFAULT_SHOP_SETTINGS } from '../data/initialData';
import { getShopBankAccounts, readQrImageAsDataUrl } from '../utils/helpers';

interface SettingsModalProps {
  settings: ShopSettings;
  orders: Order[];
  rates: RateItem[];
  customers: CustomerAccount[];
  onSaveSettings: (settings: ShopSettings) => void;
  onRestoreBackup: (data: {
    settings?: ShopSettings;
    orders?: Order[];
    rates?: RateItem[];
    customers?: CustomerAccount[];
  }) => void;
  onClose: () => void;
}

interface BankFormState {
  id?: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  upiName: string;
  qrCodeImage: string;
  isDefault: boolean;
}

const emptyBankForm = (): BankFormState => ({
  accountHolderName: '',
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  upiId: '',
  upiName: '',
  qrCodeImage: '',
  isDefault: false,
});

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  orders,
  rates,
  customers,
  onSaveSettings,
  onRestoreBackup,
  onClose,
}) => {
  const [formData, setFormData] = useState<ShopSettings>(() => ({
    ...settings,
    bankAccounts: getShopBankAccounts(settings),
  }));
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [backupErr, setBackupErr] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bank / UPI / QR management state
  const [isBankFormOpen, setIsBankFormOpen] = useState(false);
  const [bankForm, setBankForm] = useState<BankFormState>(emptyBankForm);
  const [bankFormError, setBankFormError] = useState('');
  const [confirmDeleteBankId, setConfirmDeleteBankId] = useState<string | null>(null);
  const [bankNotice, setBankNotice] = useState<string | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement>(null);

  const bankAccounts = getShopBankAccounts(formData);

  const handleChange = (field: keyof ShopSettings, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const syncAccountsAndSave = (nextAccounts: BankAccount[], noticeMsg?: string) => {
    // Ensure at least one account is marked default if list is non-empty
    let normalized = [...nextAccounts];
    if (normalized.length > 0 && !normalized.some((a) => a.isDefault)) {
      normalized[0] = { ...normalized[0], isDefault: true };
    }
    const defaultAcc = normalized.find((a) => a.isDefault) || normalized[0];
    const nextSettings: ShopSettings = {
      ...formData,
      bankAccounts: normalized,
      upiId: defaultAcc?.upiId || formData.upiId,
      upiName: defaultAcc?.upiName || defaultAcc?.accountHolderName || formData.upiName,
    };
    setFormData(nextSettings);
    onSaveSettings(nextSettings);
    if (noticeMsg) {
      setBankNotice(noticeMsg);
      setTimeout(() => setBankNotice(null), 3500);
    }
  };

  const handleOpenAddBank = () => {
    setBankForm({
      ...emptyBankForm(),
      isDefault: bankAccounts.length === 0,
    });
    setBankFormError('');
    setIsBankFormOpen(true);
  };

  const handleOpenEditBank = (acc: BankAccount) => {
    setBankForm({
      id: acc.id,
      accountHolderName: acc.accountHolderName || '',
      bankName: acc.bankName || '',
      accountNumber: acc.accountNumber || '',
      ifscCode: acc.ifscCode || '',
      upiId: acc.upiId || '',
      upiName: acc.upiName || '',
      qrCodeImage: acc.qrCodeImage || '',
      isDefault: Boolean(acc.isDefault),
    });
    setBankFormError('');
    setConfirmDeleteBankId(null);
    setIsBankFormOpen(true);
  };

  const handleQrFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBankFormError('');
    try {
      const dataUrl = await readQrImageAsDataUrl(file, 520);
      setBankForm((prev) => ({ ...prev, qrCodeImage: dataUrl }));
    } catch {
      setBankFormError('QR ਕੋਡ ਫੋਟੋ ਲੋਡ ਕਰਨ ਵਿੱਚ ਗਲਤੀ ਆਈ। ਕਿਰਪਾ ਕਰਕੇ JPG/PNG ਫੋਟੋ ਚੁਣੋ।');
    } finally {
      if (qrFileInputRef.current) qrFileInputRef.current.value = '';
    }
  };

  const handleSaveBankAccount = () => {
    if (!bankForm.accountHolderName.trim() && !bankForm.bankName.trim()) {
      setBankFormError('ਕਿਰਪਾ ਕਰਕੇ ਖਾਤਾਧਾਰਕ ਦਾ ਨਾਮ ਜਾਂ ਬੈਂਕ ਦਾ ਨਾਮ ਦਰਜ ਕਰੋ।');
      return;
    }
    if (!bankForm.upiId.trim() && !bankForm.accountNumber.trim() && !bankForm.qrCodeImage) {
      setBankFormError('ਘੱਟੋ-ਘੱਟ UPI ID, ਖਾਤਾ ਨੰਬਰ ਜਾਂ QR ਕੋਡ ਫੋਟੋ ਵਿੱਚੋਂ ਇੱਕ ਜ਼ਰੂਰ ਭਰੋ।');
      return;
    }

    const newEntry: BankAccount = {
      id: bankForm.id || `bank_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      accountHolderName: bankForm.accountHolderName.trim(),
      bankName: bankForm.bankName.trim(),
      accountNumber: bankForm.accountNumber.trim(),
      ifscCode: bankForm.ifscCode.trim().toUpperCase(),
      upiId: bankForm.upiId.trim(),
      upiName: bankForm.upiName.trim() || bankForm.accountHolderName.trim() || formData.shopNameEn,
      qrCodeImage: bankForm.qrCodeImage || undefined,
      isDefault: bankForm.isDefault,
    };

    let updatedList: BankAccount[];
    const exists = bankAccounts.some((b) => b.id === newEntry.id);
    if (exists) {
      updatedList = bankAccounts.map((b) =>
        b.id === newEntry.id
          ? newEntry
          : newEntry.isDefault
          ? { ...b, isDefault: false }
          : b
      );
    } else {
      updatedList = [
        ...(newEntry.isDefault
          ? bankAccounts.map((b) => ({ ...b, isDefault: false }))
          : bankAccounts),
        newEntry,
      ];
    }

    syncAccountsAndSave(
      updatedList,
      exists ? '✓ ਬੈਂਕ / UPI ਖਾਤਾ ਅੱਪਡੇਟ ਹੋ ਗਿਆ!' : '✓ ਨਵਾਂ ਬੈਂਕ / UPI ਖਾਤਾ ਸੇਵ ਹੋ ਗਿਆ!'
    );
    setIsBankFormOpen(false);
    setBankForm(emptyBankForm());
    setBankFormError('');
  };

  const handleSetDefaultBank = (bankId: string) => {
    const updatedList = bankAccounts.map((b) => ({
      ...b,
      isDefault: b.id === bankId,
    }));
    syncAccountsAndSave(updatedList, '✓ ਮੁੱਖ (Default) ਬੈਂਕ / QR ਖਾਤਾ ਬਦਲਿਆ ਗਿਆ!');
  };

  const handleConfirmDeleteBank = (bankId: string) => {
    const updatedList = bankAccounts.filter((b) => b.id !== bankId);
    setConfirmDeleteBankId(null);
    if (bankForm.id === bankId) {
      setIsBankFormOpen(false);
      setBankForm(emptyBankForm());
    }
    syncAccountsAndSave(updatedList, '✓ ਬੈਂਕ / UPI ਖਾਤਾ ਹਟਾ ਦਿੱਤਾ ਗਿਆ।');
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    setFormData(DEFAULT_SHOP_SETTINGS);
    setConfirmReset(false);
  };

  const handleDownloadBackup = () => {
    setBackupErr(null);
    const payload = {
      app: 'Master Dry Clean AI',
      exportedAt: new Date().toISOString(),
      settings: formData,
      orders,
      rates,
      customers,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateTag = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `MasterDryClean-Backup-${dateTag}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupMsg('✅ ਬੈਕਅੱਪ ਫਾਈਲ (ਆਰਡਰ + ਗਾਹਕ ਖਾਤੇ + ਬੈਂਕ QR + ਰੇਟ) ਡਾਊਨਲੋਡ ਹੋ ਗਈ ਹੈ!');
    setTimeout(() => setBackupMsg(null), 4000);
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackupErr(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (
        !parsed ||
        (!Array.isArray(parsed.orders) &&
          !parsed.settings &&
          !Array.isArray(parsed.rates) &&
          !Array.isArray(parsed.customers))
      ) {
        throw new Error('Invalid backup file');
      }
      onRestoreBackup({
        settings: parsed.settings,
        orders: parsed.orders,
        rates: parsed.rates,
        customers: parsed.customers,
      });
      if (parsed.settings) {
        setFormData({
          ...parsed.settings,
          bankAccounts: getShopBankAccounts(parsed.settings),
        });
      }
      setBackupMsg(
        `✅ ${parsed.orders?.length || 0} ਆਰਡਰ${
          Array.isArray(parsed.customers) ? `, ${parsed.customers.length} ਗਾਹਕ` : ''
        }${
          Array.isArray(parsed.rates) ? `, ${parsed.rates.length} ਰੇਟ` : ''
        } ਰੀਸਟੋਰ ਹੋ ਗਏ!`
      );
      setTimeout(() => setBackupMsg(null), 4000);
    } catch {
      setBackupErr('ਬੈਕਅੱਪ ਫਾਈਲ ਸਹੀ ਨਹੀਂ ਹੈ (Invalid .json backup file)');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const defaultAcc = bankAccounts.find((a) => a.isDefault) || bankAccounts[0];
    onSaveSettings({
      ...formData,
      bankAccounts,
      upiId: defaultAcc?.upiId || formData.upiId,
      upiName: defaultAcc?.upiName || defaultAcc?.accountHolderName || formData.upiName,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-slate-700" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              ਦੁਕਾਨ ਦੀਆਂ ਸੈਟਿੰਗਾਂ ਅਤੇ ਬੈਂਕ / QR ਖਾਤੇ (Shop Settings)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Basic Shop Details */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ਦੁਕਾਨ ਦਾ ਨਾਮ (ਪੰਜਾਬੀ)
                </label>
                <input
                  type="text"
                  value={formData.shopNamePa}
                  onChange={(e) => handleChange('shopNamePa', e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Shop Name (English)
                </label>
                <input
                  type="text"
                  value={formData.shopNameEn}
                  onChange={(e) => handleChange('shopNameEn', e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ਦੁਕਾਨ ਦਾ ਪਤਾ (Address)
                </label>
                <input
                  type="text"
                  value={formData.addressPa}
                  onChange={(e) => handleChange('addressPa', e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ਸੰਪਰਕ ਨੰਬਰ (Mobile)
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>
            </div>
          </div>

          {/* Multiple Bank Accounts, UPI ID, IFSC & QR Upload Section */}
          <div className="p-4 bg-sky-50/50 border border-sky-200 rounded-2xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                    ਬੈਂਕ ਖਾਤੇ, UPI ID, IFSC ਅਤੇ QR ਕੋਡ ({bankAccounts.length})
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    ਇੱਕ ਤੋਂ ਵੱਧ ਬੈਂਕ/UPI ਖਾਤੇ ਜੋੜੋ, QR ਕੋਡ ਅੱਪਲੋਡ ਕਰੋ, ਐਡਿਟ ਕਰੋ ਜਾਂ ਹਟਾਓ।
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenAddBank}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ਨਵਾਂ ਖਾਤਾ ਜੋੜੋ</span>
              </button>
            </div>

            {bankNotice && (
              <div className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
                {bankNotice}
              </div>
            )}

            {/* Add / Edit Bank Account Inline Form */}
            {isBankFormOpen && (
              <div className="bg-white border-2 border-sky-400 rounded-xl p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-extrabold text-sky-900 flex items-center space-x-1.5">
                    <Landmark className="w-4 h-4 text-sky-600" />
                    <span>
                      {bankForm.id
                        ? 'ਬੈਂਕ / UPI ਖਾਤਾ ਸੋਧੋ (Edit Bank Account)'
                        : 'ਨਵਾਂ ਬੈਂਕ / UPI ਖਾਤਾ ਜੋੜੋ (Add Bank Account)'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBankFormOpen(false);
                      setBankFormError('');
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {bankFormError && (
                  <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg">
                    {bankFormError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      ਖਾਤਾਧਾਰਕ ਦਾ ਨਾਮ (Account Holder Name) *
                    </label>
                    <input
                      type="text"
                      value={bankForm.accountHolderName}
                      onChange={(e) =>
                        setBankForm((prev) => ({ ...prev, accountHolderName: e.target.value }))
                      }
                      placeholder="ਜਿਵੇਂ: Jaspreet Singh / Master Dry Clean"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      ਬੈਂਕ ਦਾ ਨਾਮ (Bank Name)
                    </label>
                    <input
                      type="text"
                      value={bankForm.bankName}
                      onChange={(e) =>
                        setBankForm((prev) => ({ ...prev, bankName: e.target.value }))
                      }
                      placeholder="ਜਿਵੇਂ: State Bank of India / HDFC Bank"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      ਬੈਂਕ ਖਾਤਾ ਨੰਬਰ (Account Number)
                    </label>
                    <input
                      type="text"
                      value={bankForm.accountNumber}
                      onChange={(e) =>
                        setBankForm((prev) => ({ ...prev, accountNumber: e.target.value }))
                      }
                      placeholder="ਜਿਵੇਂ: 50100234567890"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      IFSC ਕੋਡ (IFSC Code)
                    </label>
                    <input
                      type="text"
                      value={bankForm.ifscCode}
                      onChange={(e) =>
                        setBankForm((prev) => ({
                          ...prev,
                          ifscCode: e.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="ਜਿਵੇਂ: SBIN0001234"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase focus:bg-white focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      UPI ID (GPay / PhonePe / Paytm)
                    </label>
                    <input
                      type="text"
                      value={bankForm.upiId}
                      onChange={(e) =>
                        setBankForm((prev) => ({ ...prev, upiId: e.target.value }))
                      }
                      placeholder="ਜਿਵੇਂ: 9876543210@ybl"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      UPI ਨਾਮ (Payee Name - Optional)
                    </label>
                    <input
                      type="text"
                      value={bankForm.upiName}
                      onChange={(e) =>
                        setBankForm((prev) => ({ ...prev, upiName: e.target.value }))
                      }
                      placeholder="ਜਿਵੇਂ: Master Dry Clean"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Upload Custom QR Code Image */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    {bankForm.qrCodeImage ? (
                      <img
                        src={bankForm.qrCodeImage}
                        alt="Uploaded QR Preview"
                        className="w-16 h-16 object-contain bg-white border border-slate-300 rounded-lg p-1 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-white border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                        <QrCode className="w-7 h-7" />
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        QR ਕੋਡ ਫੋਟੋ ਅੱਪਲੋਡ ਕਰੋ (Upload QR Code)
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {bankForm.qrCodeImage
                          ? 'ਤੁਹਾਡਾ ਅੱਪਲੋਡ ਕੀਤਾ QR ਕੋਡ ਸੇਵ ਹੈ (ਗੈਲਰੀ ਤੋਂ ਬਦਲ ਜਾਂ ਹਟਾ ਸਕਦੇ ਹੋ)'
                          : 'GPay / PhonePe / Bank ਦਾ QR ਸਕਰੀਨਸ਼ਾਟ ਅੱਪਲੋਡ ਕਰੋ (ਜਾਂ ਖਾਲੀ ਛੱਡਣ ਤੇ UPI ਤੋਂ ਆਟੋ QR ਬਣੇਗਾ)'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => qrFileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center space-x-1 cursor-pointer"
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                      <span>{bankForm.qrCodeImage ? 'QR ਬਦਲੋ' : 'QR ਅੱਪਲੋਡ'}</span>
                    </button>
                    {bankForm.qrCodeImage && (
                      <button
                        type="button"
                        onClick={() => setBankForm((prev) => ({ ...prev, qrCodeImage: '' }))}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-lg cursor-pointer"
                      >
                        ਹਟਾਓ
                      </button>
                    )}
                    <input
                      ref={qrFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleQrFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <label className="inline-flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bankForm.isDefault}
                      onChange={(e) =>
                        setBankForm((prev) => ({ ...prev, isDefault: e.target.checked }))
                      }
                      className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
                    />
                    <span>ਇਸਨੂੰ ਮੁੱਖ (Default) ਬੈਂਕ / QR ਬਣਾਓ</span>
                  </label>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsBankFormOpen(false);
                        setBankFormError('');
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
                    >
                      ਰੱਦ ਕਰੋ
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveBankAccount}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center space-x-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{bankForm.id ? 'ਖਾਤਾ ਅੱਪਡੇਟ ਕਰੋ' : 'ਖਾਤਾ ਸੇਵ ਕਰੋ'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* List of Saved Bank / UPI Accounts */}
            {bankAccounts.length === 0 ? (
              <div className="p-4 bg-white border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
                ਹਾਲੇ ਕੋਈ ਬੈਂਕ ਜਾਂ UPI ਖਾਤਾ ਸ਼ਾਮਲ ਨਹੀਂ ਹੈ। ਉੱਪਰ <strong>"ਨਵਾਂ ਖਾਤਾ ਜੋੜੋ"</strong> ਤੇ ਕਲਿੱਕ ਕਰੋ।
              </div>
            ) : (
              <div className="space-y-2.5">
                {bankAccounts.map((acc) => {
                  const isDeleting = confirmDeleteBankId === acc.id;
                  return (
                    <div
                      key={acc.id}
                      className={`p-3 rounded-xl border transition-all bg-white ${
                        acc.isDefault
                          ? 'border-sky-400 ring-1 ring-sky-200'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start space-x-3 min-w-0">
                          {acc.qrCodeImage ? (
                            <img
                              src={acc.qrCodeImage}
                              alt="QR"
                              className="w-12 h-12 object-contain bg-white border border-slate-200 rounded-lg p-0.5 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-500 shrink-0">
                              <QrCode className="w-5 h-5" />
                              <span className="text-[8px] font-bold">AUTO</span>
                            </div>
                          )}

                          <div className="min-w-0 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                                {acc.accountHolderName || acc.bankName || 'ਬੈਂਕ ਖਾਤਾ'}
                              </span>
                              {acc.isDefault && (
                                <span className="inline-flex items-center space-x-0.5 text-[10px] font-extrabold px-1.5 py-0.5 bg-sky-100 text-sky-800 rounded border border-sky-200">
                                  <Star className="w-2.5 h-2.5 fill-sky-600 text-sky-600" />
                                  <span>ਮੁੱਖ (Default)</span>
                                </span>
                              )}
                              {acc.qrCodeImage && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                                  Uploaded QR
                                </span>
                              )}
                            </div>

                            {acc.bankName && (
                              <div className="text-[11px] font-semibold text-slate-700">
                                ਬੈਂਕ: {acc.bankName}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-mono text-slate-600">
                              {acc.accountNumber && <span>A/C: {acc.accountNumber}</span>}
                              {acc.ifscCode && <span>IFSC: {acc.ifscCode}</span>}
                              {acc.upiId && <span className="text-sky-800 font-bold">UPI: {acc.upiId}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          {!acc.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultBank(acc.id)}
                              className="px-2 py-1 text-[11px] font-bold bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg cursor-pointer"
                            >
                              ਮੁੱਖ ਬਣਾਓ
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEditBank(acc)}
                            className="px-2 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg flex items-center space-x-1 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>ਐਡਿਟ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteBankId(isDeleting ? null : acc.id)}
                            className="px-2 py-1 text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg flex items-center space-x-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>ਹਟਾਓ</span>
                          </button>
                        </div>
                      </div>

                      {/* Warning Confirmation before Deleting Bank Account */}
                      {isDeleting && (
                        <div className="mt-2.5 p-2.5 bg-rose-50 border border-rose-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start space-x-2 text-[11px] text-rose-900 font-semibold">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <span>
                              ਚੇਤਾਵਨੀ: ਕੀ ਤੁਸੀਂ ਪੱਕਾ{' '}
                              <strong>{acc.bankName || acc.accountHolderName || acc.upiId}</strong>{' '}
                              ਖਾਤਾ ਹਟਾਉਣਾ ਚਾਹੁੰਦੇ ਹੋ? ਇਸਦਾ QR ਕੋਡ ਤੇ ਵੇਰਵਾ ਸਦਾ ਲਈ ਹਟ ਜਾਵੇਗਾ।
                            </span>
                          </div>
                          <div className="flex items-center space-x-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleConfirmDeleteBank(acc.id)}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-lg cursor-pointer"
                            >
                              ਪੱਕਾ ਹਟਾਓ
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteBankId(null)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-[11px] rounded-lg cursor-pointer"
                            >
                              ਰੱਦ ਕਰੋ
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-800 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>15-ਦਿਨਾਂ ਦੀ ਲਾਜ਼ਮੀ ਦੁਕਾਨਦਾਰ ਸ਼ਰਤ (Liability Disclaimer):</span>
            </div>
            <textarea
              rows={3}
              value={formData.disclaimerPa}
              onChange={(e) => handleChange('disclaimerPa', e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl leading-relaxed text-slate-800"
              required
            />
            <span className="text-[10px] text-slate-400">
              ਇਹ ਸ਼ਰਤ ਹਰ ਪ੍ਰਿੰਟਿਡ ਬਿੱਲ ਅਤੇ ਰਿਮਾਇੰਡਰ ਵਿੱਚ ਲਿਖੀ ਜਾਵੇਗੀ।
            </span>
          </div>

          {/* Local Data Backup & Restore */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                <HardDrive className="w-4 h-4 text-sky-600" />
                <span>ਡਾਟਾ ਬੈਕਅੱਪ ਅਤੇ ਰੀਸਟੋਰ (Offline File Backup)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {orders.length} ਆਰਡਰ • {customers.length} ਗਾਹਕ • {rates.length} ਰੇਟ
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              ਆਪਣੇ ਸਾਰੇ ਬਿੱਲਾਂ, ਬੈਂਕ QR ਖਾਤਿਆਂ ਤੇ ਰੇਟ ਲਿਸਟ ਦੀ ਫਾਈਲ ਡਾਊਨਲੋਡ ਕਰਕੇ ਰੱਖੋ ਤਾਂ ਜੋ ਨਵੇਂ ਫੋਨ ਵਿੱਚ 1-ਕਲਿੱਕ ਨਾਲ ਵਾਪਸ ਲਿਆ ਸਕੋ।
            </p>
            {backupMsg && (
              <p className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                {backupMsg}
              </p>
            )}
            {backupErr && (
              <p className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded-lg">
                {backupErr}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="py-2 px-3 bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ਬੈਕਅੱਪ ਡਾਊਨਲੋਡ</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-2 px-3 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>ਡਾਟਾ ਰੀਸਟੋਰ ਕਰੋ</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleRestoreFile}
                className="hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleReset}
              className={`px-3 py-1.5 text-xs font-semibold flex items-center space-x-1 rounded-lg transition-colors cursor-pointer ${
                confirmReset
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{confirmReset ? 'ਪੱਕਾ ਰੀਸੈੱਟ? ਕਲਿੱਕ ਕਰੋ' : 'ਡਿਫਾਲਟ ਕਰੋ'}</span>
            </button>

            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>ਸੇਵ ਕਰੋ (Save Changes)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
