import React, { useMemo, useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  MapPin,
  FileText,
  Receipt,
  Pencil,
  Trash2,
  X,
  Check,
  Printer,
  MessageSquare,
  QrCode,
  Wallet,
  Shirt,
  Star,
  Calendar,
  ArrowRight,
  Languages,
} from 'lucide-react';
import { CustomerAccount, Order, OrderStatus, ShopSettings } from '../types';
import {
  formatDatePunjabi,
  formatItemServices,
  orderMatchesCustomer,
} from '../utils/helpers';
import { formatCombinedBilingual, transliterateEnglishToPunjabi } from '../utils/transliteratePa';
import { PaymentConfirmModal } from './PaymentConfirmModal';

interface CustomersManagerProps {
  customers: CustomerAccount[];
  orders: Order[];
  settings: ShopSettings;
  onSaveCustomer: (customer: CustomerAccount) => void;
  onDeleteCustomer: (customerId: string) => void;
  onCreateBillForCustomer: (customer: CustomerAccount) => void;
  onEditOrder?: (order: Order) => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onCollectBalance: (
    orderId: string,
    details?: {
      paidAmount: number;
      paymentMode: 'Cash' | 'UPI' | 'Mix';
      utrNumber?: string;
      markDelivered?: boolean;
    }
  ) => void;
  onOpenPrintModal: (order: Order) => void;
  onOpenWhatsAppModal: (order: Order, template?: 'booking' | 'ready' | 'warning') => void;
}

interface CustomerFormState {
  id?: string;
  nameEn: string;
  namePa: string;
  phone: string;
  villageEn: string;
  villagePa: string;
  address: string;
  notes: string;
  createdAt?: string;
}

const emptyCustomerForm = (): CustomerFormState => ({
  nameEn: '',
  namePa: '',
  phone: '',
  villageEn: '',
  villagePa: '',
  address: '',
  notes: '',
});

export const CustomersManager: React.FC<CustomersManagerProps> = ({
  customers,
  orders,
  settings,
  onSaveCustomer,
  onDeleteCustomer,
  onCreateBillForCustomer,
  onEditOrder,
  onUpdateOrderStatus,
  onCollectBalance,
  onOpenPrintModal,
  onOpenWhatsAppModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'repeat'>('all');

  // Add/Edit modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState<boolean>(
    () => localStorage.getItem('mdc_auto_translate') !== 'false'
  );
  const [form, setForm] = useState<CustomerFormState>(emptyCustomerForm);
  const [formError, setFormError] = useState('');

  // Account detail modal
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [collectOrder, setCollectOrder] = useState<Order | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Enrich each customer with computed order stats & history
  const customerSummaries = useMemo(() => {
    return customers.map((customer) => {
      const custOrders = orders
        .filter((ord) => orderMatchesCustomer(ord, customer))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const totalBills = custOrders.length;
      const totalClothes = custOrders.reduce(
        (sum, ord) => sum + ord.items.reduce((s, it) => s + it.quantity, 0),
        0
      );
      const totalBilled = custOrders.reduce((sum, ord) => sum + ord.totalAmount, 0);
      const totalPaid = custOrders.reduce((sum, ord) => sum + (ord.advanceAmount || 0), 0);
      const totalPending = custOrders.reduce((sum, ord) => sum + (ord.pendingAmount || 0), 0);
      const readyCount = custOrders.filter((ord) => ord.status === 'ready').length;
      const lastOrderDate = custOrders[0]?.createdAt || customer.createdAt;

      return {
        customer,
        orders: custOrders,
        totalBills,
        totalClothes,
        totalBilled,
        totalPaid,
        totalPending,
        readyCount,
        lastOrderDate,
      };
    });
  }, [customers, orders]);

  const totalCustomersCount = customers.length;
  const repeatCustomersCount = customerSummaries.filter((c) => c.totalBills >= 2).length;
  const totalCustomerPending = customerSummaries.reduce((sum, c) => sum + c.totalPending, 0);

  const filteredSummaries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customerSummaries
      .filter((summary) => {
        if (filterMode === 'pending' && summary.totalPending <= 0) return false;
        if (filterMode === 'repeat' && summary.totalBills < 2) return false;
        if (!q) return true;
        const { customer } = summary;
        return (
          customer.name.toLowerCase().includes(q) ||
          customer.phone.toLowerCase().includes(q) ||
          (customer.address && customer.address.toLowerCase().includes(q)) ||
          (customer.notes && customer.notes.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (b.totalPending !== a.totalPending) return b.totalPending - a.totalPending;
        return new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime();
      });
  }, [customerSummaries, searchQuery, filterMode]);

  const activeAccountSummary = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customerSummaries.find((s) => s.customer.id === selectedCustomerId) || null;
  }, [customerSummaries, selectedCustomerId]);

  const openAddModal = () => {
    setForm(emptyCustomerForm());
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditModal = (customer: CustomerAccount) => {
    setForm({
      id: customer.id,
      nameEn: customer.nameEn || '',
      namePa: customer.namePa || customer.name,
      phone: customer.phone,
      villageEn: customer.villageEn || '',
      villagePa: customer.villagePa || '',
      address: customer.address || '',
      notes: customer.notes || '',
      createdAt: customer.createdAt,
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleToggleAutoTranslate = (checked: boolean) => {
    setAutoTranslate(checked);
    localStorage.setItem('mdc_auto_translate', String(checked));
    if (checked) {
      setForm((f) => ({
        ...f,
        namePa: f.nameEn.trim() ? transliterateEnglishToPunjabi(f.nameEn) : f.namePa,
        villagePa: f.villageEn.trim() ? transliterateEnglishToPunjabi(f.villageEn) : f.villagePa,
      }));
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.namePa.trim() && !form.nameEn.trim()) {
      setFormError('ਕਿਰਪਾ ਕਰਕੇ ਗਾਹਕ ਦਾ ਨਾਮ ਦਰਜ ਕਰੋ');
      return;
    }

    const now = new Date().toISOString();
    const combinedName = formatCombinedBilingual(form.namePa, form.nameEn);
    const combinedVillage = formatCombinedBilingual(form.villagePa, form.villageEn);
    const saved: CustomerAccount = {
      id: form.id || `cust_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: combinedName,
      nameEn: form.nameEn.trim() || undefined,
      namePa: form.namePa.trim() || undefined,
      phone: form.phone.trim(),
      villageEn: form.villageEn.trim() || undefined,
      villagePa: form.villagePa.trim() || undefined,
      address: form.address.trim() || combinedVillage || undefined,
      notes: form.notes.trim() || undefined,
      createdAt: form.createdAt || now,
      updatedAt: now,
    };

    onSaveCustomer(saved);
    setIsFormOpen(false);
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'received':
        return { label: 'ਪ੍ਰਾਪਤ ਹੋਇਆ', cls: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'processing':
        return { label: 'ਧੁਲਾਈ ਜਾਰੀ', cls: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      case 'ready':
        return { label: 'ਤਿਆਰ ਹੈ', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'delivered':
        return { label: 'ਡਿਲੀਵਰਡ', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
      default:
        return { label: status, cls: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-sky-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Customer Accounts &amp; Khata Ledger</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            ਗਾਹਕ ਖਾਤੇ ਅਤੇ ਪੂਰਾ ਹਿਸਾਬ-ਕਿਤਾਬ ({totalCustomersCount} ਗਾਹਕ)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ਹਰ ਗਾਹਕ ਦਾ ਅਲੱਗ ਖਾਤਾ — ਫੋਨ ਨੰਬਰ, ਪਤਾ, ਕੱਪੜਿਆਂ ਦਾ ਪੂਰਾ ਇਤਿਹਾਸ, ਖਾਸ ਹਦਾਇਤਾਂ ਅਤੇ ਬਕਾਇਆ ਹਿਸਾਬ
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-sky-600/20 flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>ਨਵਾਂ ਗਾਹਕ ਖਾਤਾ ਬਣਾਓ</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">ਕੁੱਲ ਗਾਹਕ ਖਾਤੇ</span>
            <p className="text-xl font-extrabold text-slate-900">{totalCustomersCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Star className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">ਰੈਗੂਲਰ ਗਾਹਕ (2+ ਆਰਡਰ)</span>
            <p className="text-xl font-extrabold text-indigo-700">{repeatCustomersCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">ਗਾਹਕਾਂ ਵੱਲ ਕੁੱਲ ਬਕਾਇਆ</span>
            <p className="text-xl font-extrabold text-amber-900 font-mono">
              ₹{totalCustomerPending}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ਗਾਹਕ ਦਾ ਨਾਮ, ਮੋਬਾਈਲ ਨੰਬਰ, ਪਤਾ ਜਾਂ ਨੋਟ ਖੋਜੋ..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
              filterMode === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ਸਾਰੇ ({totalCustomersCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
              filterMode === 'pending'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            ਬਕਾਇਆ ਵਾਲੇ ({customerSummaries.filter((c) => c.totalPending > 0).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('repeat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
              filterMode === 'repeat'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ਰੈਗੂਲਰ ({repeatCustomersCount})
          </button>
        </div>
      </div>

      {/* Customer Cards Grid */}
      {filteredSummaries.length === 0 ? (
        <div className="py-14 text-center bg-white rounded-2xl border border-slate-200">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">ਕੋਈ ਗਾਹਕ ਖਾਤਾ ਨਹੀਂ ਮਿਲਿਆ</h3>
          <p className="text-xs text-slate-500 mt-1">
            ਨਵਾਂ ਬਿੱਲ ਬਣਾਉਣ 'ਤੇ ਗਾਹਕ ਦਾ ਖਾਤਾ ਆਪਣੇ-ਆਪ ਬਣ ਜਾਂਦਾ ਹੈ ਜਾਂ ਤੁਸੀਂ ਉੱਪਰੋਂ "ਨਵਾਂ ਗਾਹਕ ਖਾਤਾ ਬਣਾਓ" ਦਬਾ ਸਕਦੇ ਹੋ।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSummaries.map((summary) => {
            const { customer, totalBills, totalClothes, totalBilled, totalPending, readyCount } =
              summary;
            return (
              <div
                key={customer.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top Info */}
                  <div className="flex items-start justify-between gap-2">
                    <div
                      onClick={() => setSelectedCustomerId(customer.id)}
                      className="cursor-pointer group flex-1 min-w-0"
                    >
                      <div className="flex items-center space-x-1.5">
                        <h3 className="font-extrabold text-base text-slate-900 group-hover:text-sky-700 truncate">
                          {customer.name}
                        </h3>
                        {totalBills >= 2 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md shrink-0">
                            ਰੈਗੂਲਰ
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 text-xs text-slate-600 font-mono mt-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{customer.phone || 'ਫੋਨ ਨੰਬਰ ਦਰਜ ਨਹੀਂ'}</span>
                      </div>

                      {customer.address && (
                        <div className="flex items-start space-x-1.5 text-xs text-slate-500 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{customer.address}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(customer)}
                        title="ਜਾਣਕਾਰੀ ਸੋਧੋ"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-700 hover:bg-sky-50 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {confirmDeleteId === customer.id ? (
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteCustomer(customer.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-1 text-[10px] font-bold bg-rose-600 text-white rounded-md cursor-pointer"
                        >
                          ਪੱਕਾ?
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDeleteId(customer.id);
                            setTimeout(
                              () =>
                                setConfirmDeleteId((cur) => (cur === customer.id ? null : cur)),
                              3500
                            );
                          }}
                          title="ਖਾਤਾ ਹਟਾਓ"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {customer.notes && (
                    <div className="px-2.5 py-1.5 bg-sky-50/70 border border-sky-200/80 rounded-xl text-[11px] text-sky-900 flex items-start space-x-1.5">
                      <FileText className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{customer.notes}</span>
                    </div>
                  )}

                  {/* Stats Box */}
                  <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-500 block">ਆਰਡਰ / ਕੱਪੜੇ</span>
                      <span className="text-xs font-extrabold text-slate-900">
                        {totalBills} / {totalClothes}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">ਕੁੱਲ ਬਿੱਲ</span>
                      <span className="text-xs font-extrabold text-slate-900 font-mono">
                        ₹{totalBilled}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">ਬਕਾਇਆ</span>
                      <span
                        className={`text-xs font-extrabold font-mono ${
                          totalPending > 0 ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {totalPending > 0 ? `₹${totalPending}` : '₹0 ✓'}
                      </span>
                    </div>
                  </div>

                  {readyCount > 0 && (
                    <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                      ✓ {readyCount} ਆਰਡਰ ਡਿਲੀਵਰੀ ਲਈ ਤਿਆਰ ਹਨ
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerId(customer.id)}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                  >
                    <span>ਪੂਰਾ ਖਾਤਾ ਦੇਖੋ</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onCreateBillForCustomer(customer)}
                    className="py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1 shadow-xs transition-colors cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>+ ਨਵਾਂ ਬਿੱਲ</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Customer Account Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  {form.id ? 'ਗਾਹਕ ਖਾਤਾ ਸੋਧੋ (Edit Customer)' : 'ਨਵਾਂ ਗਾਹਕ ਖਾਤਾ ਬਣਾਓ'}
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <label
                  title="ਟਿੱਕ ਹੋਣ 'ਤੇ English ਲਿਖਣ ਨਾਲ ਪੰਜਾਬੀ ਆਪਣੇ-ਆਪ ਆਵੇਗੀ; ਅਨਟਿੱਕ ਕਰਕੇ ਦੋਵੇਂ ਹੱਥੀਂ ਭਰੋ"
                  className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer select-none ${
                    autoTranslate
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-slate-100 border-slate-300 text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={autoTranslate}
                    onChange={(e) => handleToggleAutoTranslate(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-emerald-600 cursor-pointer"
                  />
                  <Languages className="w-3.5 h-3.5" />
                  <span>Auto Translate</span>
                </label>

                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-3.5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Customer Name (English) *
                  </label>
                  <input
                    type="text"
                    value={form.nameEn}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((f) => ({
                        ...f,
                        nameEn: val,
                        namePa: autoTranslate ? transliterateEnglishToPunjabi(val) : f.namePa,
                      }));
                    }}
                    placeholder="e.g. Harpreet Singh"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>ਗਾਹਕ ਦਾ ਨਾਮ (ਪੰਜਾਬੀ) *</span>
                    {autoTranslate && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 rounded">
                        Auto
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={form.namePa}
                    readOnly={autoTranslate}
                    onChange={(e) => setForm((f) => ({ ...f, namePa: e.target.value }))}
                    placeholder={autoTranslate ? 'English ਲਿਖਦੇ ਹੀ ਪੰਜਾਬੀ ਆਵੇਗੀ' : 'ਪੰਜਾਬੀ ਵਿੱਚ ਨਾਮ ਲਿਖੋ'}
                    className={`w-full px-3 py-2 text-sm border rounded-xl ${
                      autoTranslate
                        ? 'bg-sky-50/60 border-sky-200 text-sky-950'
                        : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-sky-500'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Village / City (English)
                  </label>
                  <input
                    type="text"
                    value={form.villageEn}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((f) => ({
                        ...f,
                        villageEn: val,
                        villagePa: autoTranslate ? transliterateEnglishToPunjabi(val) : f.villagePa,
                      }));
                    }}
                    placeholder="e.g. Dakha / Jagraon"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>ਪਿੰਡ / ਸ਼ਹਿਰ (ਪੰਜਾਬੀ)</span>
                    {autoTranslate && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 rounded">
                        Auto
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={form.villagePa}
                    readOnly={autoTranslate}
                    onChange={(e) => setForm((f) => ({ ...f, villagePa: e.target.value }))}
                    placeholder={autoTranslate ? 'English ਲਿਖਦੇ ਹੀ ਪੰਜਾਬੀ ਆਵੇਗੀ' : 'ਪਿੰਡ ਪੰਜਾਬੀ ਵਿੱਚ ਲਿਖੋ'}
                    className={`w-full px-3 py-2 text-sm border rounded-xl ${
                      autoTranslate
                        ? 'bg-sky-50/60 border-sky-200 text-sky-950'
                        : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-sky-500'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ਮੋਬਾਈਲ / WhatsApp ਨੰਬਰ
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="10 ਅੰਕਾਂ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ਗਲੀ / ਵਾਰਡ / ਪੂਰਾ ਪਤਾ (ਵਿਕਲਪਿਕ)
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="ਜਿਵੇਂ: ਗਲੀ ਨੰ: 4, ਨੇੜੇ ਬੱਸ ਸਟੈਂਡ"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ਖਾਸ ਹਦਾਇਤਾਂ / ਨੋਟ (Customer Preferences)
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="ਜਿਵੇਂ: ਕਮੀਜ਼ਾਂ ਨੂੰ ਕਲਫ਼ ਨਹੀਂ ਲਾਉਣਾ, ਹਮੇਸ਼ਾ ਹੈਂਗਰ 'ਤੇ ਪੈੱਕ ਕਰਨਾ..."
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500"
                />
              </div>

              {formError && (
                <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl">
                  {formError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  ਰੱਦ ਕਰੋ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>ਖਾਤਾ ਸੇਵ ਕਰੋ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Customer Account & Ledger History Modal */}
      {activeAccountSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="flex items-start justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50 shrink-0 gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                    {activeAccountSummary.customer.name}
                  </h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                    {activeAccountSummary.totalBills} ਆਰਡਰ
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1">
                  <span className="flex items-center space-x-1 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{activeAccountSummary.customer.phone || 'ਫੋਨ ਨਹੀਂ'}</span>
                  </span>
                  {activeAccountSummary.customer.address && (
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{activeAccountSummary.customer.address}</span>
                    </span>
                  )}
                  <span className="flex items-center space-x-1 text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      ਖਾਤਾ ਸ਼ੁਰੂ: {formatDatePunjabi(activeAccountSummary.customer.createdAt)}
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditModal(activeAccountSummary.customer)}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center space-x-1 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ਸੋਧੋ</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cust = activeAccountSummary.customer;
                    setSelectedCustomerId(null);
                    onCreateBillForCustomer(cust);
                  }}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ਨਵਾਂ ਬਿੱਲ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCustomerId(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {activeAccountSummary.customer.notes && (
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-start space-x-2">
                  <FileText className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block">ਖਾਸ ਹਦਾਇਤਾਂ / ਨੋਟ:</strong>
                    <span>{activeAccountSummary.customer.notes}</span>
                  </div>
                </div>
              )}

              {/* Financial & Cloth Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-[11px] text-slate-500 block">ਕੁੱਲ ਕੱਪੜੇ</span>
                  <span className="text-base font-extrabold text-slate-900 flex items-center space-x-1 mt-0.5">
                    <Shirt className="w-4 h-4 text-sky-600" />
                    <span>{activeAccountSummary.totalClothes} ਨੰਗ</span>
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-[11px] text-slate-500 block">ਕੁੱਲ ਬਿੱਲ ਰਕਮ</span>
                  <span className="text-base font-extrabold text-slate-900 font-mono block mt-0.5">
                    ₹{activeAccountSummary.totalBilled}
                  </span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <span className="text-[11px] text-emerald-700 block">ਜਮ੍ਹਾਂ / ਭੁਗਤਾਨ</span>
                  <span className="text-base font-extrabold text-emerald-800 font-mono block mt-0.5">
                    ₹{activeAccountSummary.totalPaid}
                  </span>
                </div>
                <div
                  className={`border rounded-xl p-3 ${
                    activeAccountSummary.totalPending > 0
                      ? 'bg-amber-50 border-amber-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="text-[11px] text-slate-600 block">ਬਾਕੀ / ਉਧਾਰ</span>
                  <span
                    className={`text-base font-extrabold font-mono block mt-0.5 ${
                      activeAccountSummary.totalPending > 0
                        ? 'text-amber-900'
                        : 'text-emerald-700'
                    }`}
                  >
                    ₹{activeAccountSummary.totalPending}
                  </span>
                </div>
              </div>

              {/* Order History List */}
              <div className="space-y-3">
                <h4 className="font-bold text-sm text-slate-800">
                  ਪਿਛਲੇ ਸਾਰੇ ਬਿੱਲ ਅਤੇ ਕੱਪੜਿਆਂ ਦਾ ਵੇਰਵਾ ({activeAccountSummary.orders.length})
                </h4>

                {activeAccountSummary.orders.length === 0 ? (
                  <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                    ਇਸ ਗਾਹਕ ਦਾ ਅਜੇ ਤੱਕ ਕੋਈ ਬਿੱਲ ਨਹੀਂ ਬਣਿਆ। ਉੱਪਰ "+ ਨਵਾਂ ਬਿੱਲ" ਦਬਾ ਕੇ ਪਹਿਲਾ ਬਿੱਲ ਬਣਾਓ।
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeAccountSummary.orders.map((ord) => {
                      const st = getStatusLabel(ord.status);
                      return (
                        <div
                          key={ord.id}
                          className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-extrabold text-sm font-mono text-slate-900">
                                {ord.billNumber}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.cls}`}
                              >
                                {st.label}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {formatDatePunjabi(ord.createdAt)}
                              </span>
                            </div>

                            <select
                              value={ord.status}
                              onChange={(e) =>
                                onUpdateOrderStatus(ord.id, e.target.value as OrderStatus)
                              }
                              className="text-xs bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 font-medium text-slate-800 cursor-pointer"
                            >
                              <option value="received">ਪ੍ਰਾਪਤ ਹੋਇਆ</option>
                              <option value="processing">ਧੁਲਾਈ ਜਾਰੀ</option>
                              <option value="ready">ਕੱਪੜੇ ਤਿਆਰ</option>
                              <option value="delivered">ਡਿਲੀਵਰ ਹੋ ਗਿਆ</option>
                            </select>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {ord.items.map((it, idx) => (
                              <span
                                key={idx}
                                className="text-[11px] px-2 py-0.5 bg-slate-50 text-slate-700 rounded-md border border-slate-200"
                              >
                                {it.clothName} ({it.quantity}) - {formatItemServices(it)} • ₹{it.total}
                              </span>
                            ))}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                            <div className="flex items-center space-x-3 font-mono">
                              <span className="text-slate-700">
                                ਕੁੱਲ: <strong>₹{ord.totalAmount}</strong>
                              </span>
                              <span className="text-emerald-700">
                                ਦਿੱਤੇ: <strong>₹{ord.advanceAmount}</strong>
                              </span>
                              <span
                                className={
                                  ord.pendingAmount > 0 ? 'text-amber-800 font-bold' : 'text-slate-500'
                                }
                              >
                                ਬਾਕੀ: ₹{ord.pendingAmount}
                              </span>
                              {ord.utrNumber && (
                                <span className="text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                                  UTR: {ord.utrNumber}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {onEditOrder && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCustomerId(null);
                                    onEditOrder(ord);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                                >
                                  <Pencil className="w-3 h-3" />
                                  <span>ਐਡਿਟ</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onOpenWhatsAppModal(ord, ord.status === 'ready' ? 'ready' : 'booking')}
                                className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-semibold flex items-center space-x-1 cursor-pointer"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onOpenPrintModal(ord)}
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-semibold flex items-center space-x-1 cursor-pointer"
                              >
                                <Printer className="w-3 h-3" />
                                <span>ਪ੍ਰਿੰਟ</span>
                              </button>
                              {ord.pendingAmount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setCollectOrder(ord)}
                                  className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold flex items-center space-x-1 cursor-pointer"
                                >
                                  <QrCode className="w-3 h-3" />
                                  <span>QR / ਬਾਕੀ ਲਵੋ</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Confirm Modal from Customer Account History */}
      {collectOrder && (
        <PaymentConfirmModal
          billNumber={collectOrder.billNumber}
          customerName={collectOrder.customerName}
          totalAmount={collectOrder.totalAmount}
          amountDue={collectOrder.pendingAmount}
          initialPaymentMode="UPI"
          settings={settings}
          showDeliveredToggle={true}
          defaultMarkDelivered={collectOrder.status === 'ready'}
          onConfirm={(details) => {
            onCollectBalance(collectOrder.id, details);
            setCollectOrder(null);
          }}
          onClose={() => setCollectOrder(null)}
        />
      )}
    </div>
  );
};
