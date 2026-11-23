import React, { useState } from 'react';
import {
  Tag,
  Search,
  Plus,
  Check,
  ShieldAlert,
  Pencil,
  Trash2,
  X,
  RotateCcw,
} from 'lucide-react';
import { RateItem, ServiceType } from '../types';

const SERVICE_OPTIONS: {
  value: ServiceType;
  labelPa: string;
  shortPa: string;
  badgeClass: string;
}[] = [
  {
    value: 'Dry Clean',
    labelPa: 'ਡਰਾਈ ਕਲੀਨ (Dry Clean)',
    shortPa: 'ਡਰਾਈ ਕਲੀਨ',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100',
  },
  {
    value: 'Steam Iron',
    labelPa: 'ਸਟੀਮ ਪ੍ਰੈੱਸ (Steam Press)',
    shortPa: 'ਸਟੀਮ ਪ੍ਰੈੱਸ',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
  },
  {
    value: 'Wash',
    labelPa: 'ਧੁਲਾਈ (Wash)',
    shortPa: 'ਧੁਲਾਈ',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100',
  },
  {
    value: 'Roll Press',
    labelPa: 'ਰੋਲ ਪ੍ਰੈੱਸ (Roll Press)',
    shortPa: 'ਰੋਲ ਪ੍ਰੈੱਸ',
    badgeClass: 'bg-violet-50 text-violet-800 border-violet-200 hover:bg-violet-100',
  },
  {
    value: 'Stain Removal',
    labelPa: 'ਦਾਗ਼ ਸਫਾਈ (Stain Removal)',
    shortPa: 'ਦਾਗ਼ ਸਫਾਈ',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100',
  },
];

interface RateListTableProps {
  rates: RateItem[];
  onSelectRateItem: (item: RateItem, customRate?: number, service?: ServiceType) => void;
  onSaveRateItem: (item: RateItem) => void;
  onDeleteRateItem: (rateId: string) => void;
  onResetRates: () => void;
}

interface RateFormState {
  id?: string;
  namePa: string;
  nameEn: string;
  category: RateItem['category'];
  defaultService: ServiceType;
  serviceRates: Record<ServiceType, string>;
  maxRate: string;
  rateLabel: string;
  descriptionPa: string;
}

const emptyFormState = (): RateFormState => ({
  namePa: '',
  nameEn: '',
  category: 'women',
  defaultService: 'Dry Clean',
  serviceRates: {
    'Dry Clean': '',
    'Steam Iron': '',
    Wash: '',
    'Roll Press': '',
    'Stain Removal': '',
  },
  maxRate: '',
  rateLabel: '',
  descriptionPa: '',
});

const formStateFromItem = (item: RateItem): RateFormState => {
  const sr = item.serviceRates || { [item.defaultService]: item.defaultRate };
  return {
    id: item.id,
    namePa: item.namePa,
    nameEn: item.nameEn,
    category: item.category,
    defaultService: item.defaultService,
    serviceRates: {
      'Dry Clean': sr['Dry Clean'] !== undefined ? String(sr['Dry Clean']) : '',
      'Steam Iron': sr['Steam Iron'] !== undefined ? String(sr['Steam Iron']) : '',
      Wash: sr['Wash'] !== undefined ? String(sr['Wash']) : '',
      'Roll Press': sr['Roll Press'] !== undefined ? String(sr['Roll Press']) : '',
      'Stain Removal': sr['Stain Removal'] !== undefined ? String(sr['Stain Removal']) : '',
    },
    maxRate: item.maxRate > item.minRate ? String(item.maxRate) : '',
    rateLabel: item.rateLabel || '',
    descriptionPa: item.descriptionPa || '',
  };
};

export const RateListTable: React.FC<RateListTableProps> = ({
  rates,
  onSelectRateItem,
  onSaveRateItem,
  onDeleteRateItem,
  onResetRates,
}) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [addedKey, setAddedKey] = useState<string | null>(null);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<RateFormState>(emptyFormState);
  const [formError, setFormError] = useState('');

  // Inline Delete & Reset Confirmations
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const categories: { id: RateItem['category'] | 'all'; labelPa: string }[] = [
    { id: 'all', labelPa: 'ਸਾਰੇ (All)' },
    { id: 'men', labelPa: 'ਜੈਂਟਸ ਸੂਟ (Gents)' },
    { id: 'kids', labelPa: 'ਬੱਚਿਆਂ ਦੇ (Kids)' },
    { id: 'women', labelPa: 'ਲੇਡੀਜ਼ (Ladies)' },
    { id: 'services', labelPa: 'ਸੂਟ ਪ੍ਰੈੱਸ (Suit Press)' },
    { id: 'household', labelPa: 'ਘਰੇਲੂ ਆਈਟਮਾਂ (Household)' },
    { id: 'shoes', labelPa: 'ਬੂਟ / ਸ਼ੂਜ਼ (Shoes)' },
    { id: 'curtains', labelPa: 'ਪਰਦੇ (Curtains)' },
  ];

  const filteredRates = rates.filter((item) => {
    const matchesCategory = category === 'all' || item.category === category;
    const matchesSearch =
      item.namePa.toLowerCase().includes(search.toLowerCase()) ||
      item.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      (item.rateLabel && item.rateLabel.toLowerCase().includes(search.toLowerCase())) ||
      (item.descriptionPa && item.descriptionPa.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleAdd = (item: RateItem, customRate?: number, service?: ServiceType) => {
    onSelectRateItem(item, customRate, service);
    const key = `${item.id}_${service || item.defaultService}_${customRate ?? ''}`;
    setAddedKey(key);
    setTimeout(() => setAddedKey(null), 1500);
  };

  const openAddModal = () => {
    setForm({
      ...emptyFormState(),
      category: category !== 'all' ? (category as RateItem['category']) : 'women',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: RateItem) => {
    setForm(formStateFromItem(item));
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.namePa.trim() && !form.nameEn.trim()) {
      setFormError('ਕਿਰਪਾ ਕਰਕੇ ਕੱਪੜੇ ਜਾਂ ਆਈਟਮ ਦਾ ਨਾਮ ਲਿਖੋ');
      return;
    }

    const parsedServiceRates: Partial<Record<ServiceType, number>> = {};
    for (const opt of SERVICE_OPTIONS) {
      const raw = form.serviceRates[opt.value]?.trim();
      if (raw !== '' && !isNaN(Number(raw))) {
        parsedServiceRates[opt.value] = Math.max(0, Number(raw));
      }
    }

    const primaryRate =
      parsedServiceRates[form.defaultService] ??
      Object.values(parsedServiceRates).find((v) => v !== undefined) ??
      0;

    if (parsedServiceRates[form.defaultService] === undefined) {
      parsedServiceRates[form.defaultService] = primaryRate;
    }

    const parsedMax =
      form.maxRate.trim() !== '' && !isNaN(Number(form.maxRate))
        ? Math.max(primaryRate, Number(form.maxRate))
        : primaryRate;

    const savedItem: RateItem = {
      id: form.id || `custom_rate_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      namePa: form.namePa.trim() || form.nameEn.trim(),
      nameEn: form.nameEn.trim() || form.namePa.trim(),
      category: form.category,
      defaultService: form.defaultService,
      defaultRate: primaryRate,
      minRate: primaryRate,
      maxRate: parsedMax,
      serviceRates: parsedServiceRates,
      rateLabel: form.rateLabel.trim() || undefined,
      descriptionPa: form.descriptionPa.trim() || undefined,
    };

    onSaveRateItem(savedItem);
    setIsModalOpen(false);
  };

  const handleResetClick = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    onResetRates();
    setConfirmReset(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-sky-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Tag className="w-4 h-4" />
            <span>Master Dry Clean ਅਧਿਕਾਰਤ ਰੇਟ ਸੂਚੀ ({rates.length} ਆਈਟਮਾਂ)</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            ਰੇਟ ਲਿਸਟ ਅਤੇ ਵੱਖ-ਵੱਖ ਸਰਵਿਸ ਚਾਰਟ (Multi-Service Rate List)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ਹਰ ਆਈਟਮ ਲਈ ਡਰਾਈ ਕਲੀਨ, ਸਟੀਮ ਪ੍ਰੈੱਸ, ਧੁਲਾਈ, ਰੋਲ ਪ੍ਰੈੱਸ ਅਤੇ ਦਾਗ਼ ਸਫਾਈ ਦੇ ਅਲੱਗ-ਅਲੱਗ ਰੇਟ ਜੋੜੋ ਅਤੇ ਸੋਧੋ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ਕੱਪੜੇ ਜਾਂ ਆਈਟਮ ਦਾ ਨਾਮ ਖੋਜੋ..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500"
            />
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>ਨਵੀਂ ਆਈਟਮ ਜੋੜੋ</span>
          </button>

          <button
            type="button"
            onClick={handleResetClick}
            title="ਮੂਲ ਰੇਟ ਲਿਸਟ ਵਾਪਸ ਲਿਆਓ"
            className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center space-x-1 transition-colors cursor-pointer shrink-0 ${
              confirmReset
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{confirmReset ? 'ਪੱਕਾ ਰੀਸੈੱਟ?' : 'ਡਿਫਾਲਟ'}</span>
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              category === cat.id
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat.labelPa}
          </button>
        ))}
      </div>

      {/* Rate Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">ਕੱਪੜੇ / ਆਈਟਮ (ਪੰਜਾਬੀ / English)</th>
                <th className="py-3 px-4">ਵੱਖ-ਵੱਖ ਸਰਵਿਸ ਰੇਟ (ਕਲਿੱਕ ਕਰਕੇ ਬਿੱਲ ਵਿੱਚ ਪਾਓ)</th>
                <th className="py-3 px-4 text-right">ਐਕਸ਼ਨ (Add / Edit)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRates.map((item) => {
                const isDualRate = item.minRate !== item.maxRate && item.minRate > 0;
                const isInspectionRate =
                  item.defaultRate === 0 &&
                  !Object.entries(item.serviceRates || {}).some(
                    ([k, v]) => k !== item.defaultService && (v || 0) > 0
                  );
                const serviceRates = item.serviceRates || {
                  [item.defaultService]: item.defaultRate,
                };
                const configuredServices = SERVICE_OPTIONS.filter(
                  (opt) => serviceRates[opt.value] !== undefined
                );

                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-bold text-slate-900">{item.namePa}</div>
                      <div className="text-xs text-slate-500 font-medium">{item.nameEn}</div>
                      {item.descriptionPa && (
                        <span className="text-[11px] text-slate-400 font-normal block mt-0.5">
                          {item.descriptionPa}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 align-middle">
                      {isDualRate ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {[item.minRate, item.maxRate].map((rateOpt) => {
                            const key = `${item.id}_${item.defaultService}_${rateOpt}`;
                            return (
                              <button
                                key={rateOpt}
                                type="button"
                                onClick={() => handleAdd(item, rateOpt, item.defaultService)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 border cursor-pointer ${
                                  addedKey === key
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200'
                                }`}
                              >
                                {addedKey === key ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <Plus className="w-3 h-3" />
                                )}
                                <span>ਡਰਾਈ ਕਲੀਨ: ₹{rateOpt}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {configuredServices.map((opt) => {
                            const rateVal = serviceRates[opt.value] ?? 0;
                            const key = `${item.id}_${opt.value}_${rateVal}`;
                            const isZeroInspection = rateVal === 0;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleAdd(item, rateVal, opt.value)}
                                title={`${opt.shortPa} ਲਈ ਬਿੱਲ ਵਿੱਚ ਸ਼ਾਮਲ ਕਰੋ`}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center space-x-1 cursor-pointer ${
                                  addedKey === key
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : isZeroInspection
                                    ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                    : opt.badgeClass
                                }`}
                              >
                                {addedKey === key ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <Plus className="w-3 h-3 opacity-70" />
                                )}
                                <span>
                                  {opt.shortPa}:{' '}
                                  {isZeroInspection ? 'ਦੇਖ ਕੇ ਰੇਟ' : `₹${rateVal}`}
                                </span>
                              </button>
                            );
                          })}

                          {isInspectionRate && item.rateLabel && (
                            <span className="text-[11px] text-amber-700 font-medium">
                              ({item.rateLabel})
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right align-middle">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {!isDualRate && (
                          <button
                            type="button"
                            onClick={() => handleAdd(item)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 flex items-center space-x-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>ਬਿੱਲ</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          title="ਰੇਟ ਸੋਧੋ (Edit Rates)"
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center space-x-1 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>ਸੋਧੋ</span>
                        </button>

                        {confirmDeleteId === item.id ? (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteRateItem(item.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white cursor-pointer"
                          >
                            ਪੱਕਾ ਹਟਾਓ?
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDeleteId(item.id);
                              setTimeout(() => setConfirmDeleteId((cur) => (cur === item.id ? null : cur)), 3500);
                            }}
                            title="ਆਈਟਮ ਹਟਾਓ"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredRates.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-slate-400 text-sm">
                    ਕੋਈ ਆਈਟਮ ਨਹੀਂ ਮਿਲੀ। ਨਵੀਂ ਆਈਟਮ ਜੋੜਨ ਲਈ "ਨਵੀਂ ਆਈਟਮ ਜੋੜੋ" ਬਟਨ ਦਬਾਓ।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note about rates */}
      <div className="p-4 bg-sky-50 rounded-2xl border border-sky-200 text-sky-900 text-xs flex items-center space-x-2">
        <ShieldAlert className="w-5 h-5 text-sky-700 shrink-0" />
        <p>
          ਤੁਸੀਂ ਕਿਸੇ ਵੀ ਆਈਟਮ ਵਿੱਚ "ਸੋਧੋ" ਦਬਾ ਕੇ ਉਸਦੇ ਡਰਾਈ ਕਲੀਨ, ਸਟੀਮ ਪ੍ਰੈੱਸ, ਧੁਲਾਈ, ਰੋਲ ਪ੍ਰੈੱਸ ਅਤੇ ਦਾਗ਼ ਸਫਾਈ ਦੇ ਅਲੱਗ-ਅਲੱਗ ਰੇਟ ਸੇਵ ਕਰ ਸਕਦੇ ਹੋ। ਬਿੱਲ ਵਿੱਚ ਜਿੰਨੀਆਂ ਸਰਵਿਸਾਂ ਚੁਣੋਗੇ, ਉਨ੍ਹਾਂ ਦੇ ਰੇਟ ਆਪਣੇ-ਆਪ ਜੁੜ ਜਾਣਗੇ।
        </p>
      </div>

      {/* Add / Edit Rate Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  {form.id ? 'ਆਈਟਮ ਅਤੇ ਵੱਖ-ਵੱਖ ਰੇਟ ਸੋਧੋ (Edit Item Rates)' : 'ਨਵੀਂ ਆਈਟਮ ਅਤੇ ਵੱਖ-ਵੱਖ ਰੇਟ ਜੋੜੋ'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ਆਈਟਮ ਦਾ ਨਾਮ (ਪੰਜਾਬੀ) *
                  </label>
                  <input
                    type="text"
                    value={form.namePa}
                    onChange={(e) => setForm((f) => ({ ...f, namePa: e.target.value }))}
                    placeholder="ਜਿਵੇਂ: ਸੂਟ (ਫੁੱਲ)"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Item Name (English)
                  </label>
                  <input
                    type="text"
                    value={form.nameEn}
                    onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
                    placeholder="e.g. Suit (Full)"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ਕੈਟਾਗਰੀ (Category)
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        category: e.target.value as RateItem['category'],
                      }))
                    }
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500"
                  >
                    {categories
                      .filter((c) => c.id !== 'all')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.labelPa}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ਮੁੱਖ ਸਰਵਿਸ (Default Service)
                  </label>
                  <select
                    value={form.defaultService}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        defaultService: e.target.value as ServiceType,
                      }))
                    }
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500"
                  >
                    {SERVICE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.labelPa}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Per-service separate rates */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    ਹਰ ਸਰਵਿਸ ਦੇ ਅਲੱਗ-ਅਲੱਗ ਰੇਟ (₹)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    ਜੋ ਸਰਵਿਸ ਨਹੀਂ ਦੇਣੀ, ਖਾਲੀ ਛੱਡੋ
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SERVICE_OPTIONS.map((opt) => (
                    <div
                      key={opt.value}
                      className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200"
                    >
                      <label className="text-xs font-semibold text-slate-700 pr-2">
                        {opt.shortPa}
                      </label>
                      <div className="flex items-center space-x-1 shrink-0">
                        <span className="text-xs text-slate-400">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={form.serviceRates[opt.value]}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              serviceRates: {
                                ...f.serviceRates,
                                [opt.value]: e.target.value,
                              },
                            }))
                          }
                          placeholder="—"
                          className="w-20 text-right font-mono text-xs sm:text-sm px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-sky-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Optional secondary rate & description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ਦੂਜਾ ਰੇਟ ਵਿਕਲਪ (ਵਿਕਲਪਿਕ - ਜਿਵੇਂ ₹300)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.maxRate}
                    onChange={(e) => setForm((f) => ({ ...f, maxRate: e.target.value }))}
                    placeholder="ਜਿਵੇਂ ਕੰਬਲ ਲਈ 300"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ਵੇਰਵਾ / ਨੋਟ (ਵਿਕਲਪਿਕ)
                  </label>
                  <input
                    type="text"
                    value={form.descriptionPa}
                    onChange={(e) => setForm((f) => ({ ...f, descriptionPa: e.target.value }))}
                    placeholder="ਜਿਵੇਂ: ਲੇਡੀਜ਼ ਡਰਾਈ ਕਲੀਨ"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {formError && (
                <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl">
                  {formError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ਰੱਦ ਕਰੋ (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>ਰੇਟ ਸੇਵ ਕਰੋ (Save Rate)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
