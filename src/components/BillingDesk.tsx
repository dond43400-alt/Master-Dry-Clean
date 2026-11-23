import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Printer,
  MessageSquare,
  Sparkles,
  QrCode,
  AlertTriangle,
  Calendar,
  User,
  Phone,
  CheckCircle2,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Banknote,
  Percent,
  Search,
  Users,
  FileText,
  X,
  MapPin,
  Languages,
  Save,
  RotateCcw,
  Package,
  Pencil,
} from 'lucide-react';
import { BillItem, CustomerAccount, Order, RateItem, ServiceType, ShopSettings } from '../types';
import {
  generateUpiQrDataUrl,
  getDefaultBankAccount,
  getShopBankAccounts,
  orderMatchesCustomer,
} from '../utils/helpers';
import { formatCombinedBilingual, transliterateEnglishToPunjabi } from '../utils/transliteratePa';
import { PaymentConfirmModal } from './PaymentConfirmModal';

const BILLING_DRAFT_KEY = 'mdc_billing_draft';

interface BillingDraft {
  selectedCustomerId?: string;
  customerNameEn: string;
  customerName: string;
  villageEn: string;
  villagePa: string;
  customerPhone: string;
  billDate: string;
  deliveryDate: string;
  items: BillItem[];
  discount: number;
  advanceAmount: number;
  paymentMode: 'Cash' | 'UPI' | 'Mix';
  utrNumber: string;
  notes: string;
  boxTagNumber?: string;
  boxCount?: number;
}

function loadBillingDraft(): Partial<BillingDraft> {
  try {
    const raw = localStorage.getItem(BILLING_DRAFT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

const getDefaultDeliveryDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 4);
  return d.toISOString().split('T')[0];
};

const WORK_OPTIONS: { value: ServiceType; labelPa: string }[] = [
  { value: 'Dry Clean', labelPa: 'ਡਰਾਈ ਕਲੀਨ' },
  { value: 'Steam Iron', labelPa: 'ਸਟੀਮ ਪ੍ਰੈੱਸ' },
  { value: 'Wash', labelPa: 'ਧੁਲਾਈ' },
  { value: 'Roll Press', labelPa: 'ਰੋਲ ਪ੍ਰੈੱਸ' },
  { value: 'Stain Removal', labelPa: 'ਦਾਗ਼ ਸਫਾਈ' },
];

export interface QueuedRateSelection {
  item: RateItem;
  customRate?: number;
  service?: ServiceType;
  nonce: number;
}

export interface QueuedCustomerSelection {
  customer: CustomerAccount;
  nonce: number;
}

interface BillingDeskProps {
  settings: ShopSettings;
  rates: RateItem[];
  customers: CustomerAccount[];
  orders: Order[];
  onSaveOrder: (order: Order, printImmediately?: boolean, sendWhatsAppImmediately?: boolean) => void;
  nextBillNumber: string;
  nextBoxTagNumber: string;
  editingOrder?: Order | null;
  onCancelEdit?: () => void;
  onOpenAiChat: (initialPrompt?: string) => void;
  queuedRateItem?: QueuedRateSelection | null;
  onConsumeQueuedRateItem?: () => void;
  queuedCustomer?: QueuedCustomerSelection | null;
  onConsumeQueuedCustomer?: () => void;
}

export const BillingDesk: React.FC<BillingDeskProps> = ({
  settings,
  rates,
  customers,
  orders,
  onSaveOrder,
  nextBillNumber,
  nextBoxTagNumber,
  editingOrder,
  onCancelEdit,
  onOpenAiChat,
  queuedRateItem,
  onConsumeQueuedRateItem,
  queuedCustomer,
  onConsumeQueuedCustomer,
}) => {
  const [initialDraft] = useState<Partial<BillingDraft>>(() => loadBillingDraft());

  // Form State (restored automatically from localStorage draft if user went back/reloaded)
  const [billNumber, setBillNumber] = useState(nextBillNumber);
  const [boxTagNumber, setBoxTagNumber] = useState(
    initialDraft.boxTagNumber || nextBoxTagNumber
  );
  const [boxCount, setBoxCount] = useState<number>(Number(initialDraft.boxCount) || 1);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(
    initialDraft.selectedCustomerId
  );
  const [autoTranslate, setAutoTranslate] = useState<boolean>(
    () => localStorage.getItem('mdc_auto_translate') !== 'false'
  );
  const [customerNameEn, setCustomerNameEn] = useState(initialDraft.customerNameEn || '');
  const [customerName, setCustomerName] = useState(initialDraft.customerName || '');
  const [villageEn, setVillageEn] = useState(initialDraft.villageEn || '');
  const [villagePa, setVillagePa] = useState(initialDraft.villagePa || '');
  const [customerPhone, setCustomerPhone] = useState(initialDraft.customerPhone || '');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [billDate, setBillDate] = useState(
    initialDraft.billDate || new Date().toISOString().split('T')[0]
  );
  const [deliveryDate, setDeliveryDate] = useState(
    initialDraft.deliveryDate || getDefaultDeliveryDate()
  );
  const [items, setItems] = useState<BillItem[]>(
    Array.isArray(initialDraft.items) ? initialDraft.items : []
  );
  const [discount, setDiscount] = useState<number>(Number(initialDraft.discount) || 0);
  const [advanceAmount, setAdvanceAmount] = useState<number>(
    Number(initialDraft.advanceAmount) || 0
  );
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Mix'>(
    initialDraft.paymentMode || 'Cash'
  );
  const [utrNumber, setUtrNumber] = useState(initialDraft.utrNumber || '');
  const [notes, setNotes] = useState(initialDraft.notes || '');
  const [formError, setFormError] = useState('');
  const [confirmClearDraft, setConfirmClearDraft] = useState(false);
  const [confirmClearItems, setConfirmClearItems] = useState(false);

  // AI Natural Language input state
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [aiError, setAiError] = useState('');

  // UPI QR Code preview state
  const [upiQrUrl, setUpiQrUrl] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);

  // Quick Selector filters
  const [pickerCategory, setPickerCategory] = useState<string>('all');
  const [pickerSearch, setPickerSearch] = useState('');

  const hasDraftData = Boolean(
    customerNameEn.trim() ||
      customerName.trim() ||
      villageEn.trim() ||
      villagePa.trim() ||
      customerPhone.trim() ||
      items.length > 0 ||
      discount > 0 ||
      advanceAmount > 0 ||
      utrNumber.trim() ||
      notes.trim()
  );

  useEffect(() => {
    localStorage.setItem('mdc_auto_translate', String(autoTranslate));
  }, [autoTranslate]);

  // Auto-save active bill draft so accidental back/click/reload never loses filled data
  // Pause draft overwrite while editing an already-saved bill so any unrelated draft stays intact
  useEffect(() => {
    if (editingOrder) return;
    if (hasDraftData) {
      const draftPayload: BillingDraft = {
        selectedCustomerId,
        customerNameEn,
        customerName,
        villageEn,
        villagePa,
        customerPhone,
        billDate,
        deliveryDate,
        items,
        discount,
        advanceAmount,
        paymentMode,
        utrNumber,
        notes,
        boxTagNumber,
        boxCount,
      };
      localStorage.setItem(BILLING_DRAFT_KEY, JSON.stringify(draftPayload));
    } else {
      localStorage.removeItem(BILLING_DRAFT_KEY);
    }
  }, [
    editingOrder,
    hasDraftData,
    selectedCustomerId,
    customerNameEn,
    customerName,
    villageEn,
    villagePa,
    customerPhone,
    billDate,
    deliveryDate,
    items,
    discount,
    advanceAmount,
    paymentMode,
    utrNumber,
    notes,
    boxTagNumber,
    boxCount,
  ]);

  // Warn if user closes/reloads tab while a bill draft is in progress
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasDraftData) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasDraftData]);

  const pickerCategories = [
    { id: 'all', label: 'ਸਾਰੇ (All)' },
    { id: 'men', label: 'ਜੈਂਟਸ' },
    { id: 'kids', label: 'ਬੱਚੇ' },
    { id: 'women', label: 'ਲੇਡੀਜ਼' },
    { id: 'services', label: 'ਸੂਟ ਪ੍ਰੈੱਸ' },
    { id: 'household', label: 'ਘਰੇਲੂ' },
    { id: 'shoes', label: 'ਬੂਟ / ਸ਼ੂਜ਼' },
    { id: 'curtains', label: 'ਪਰਦੇ' },
  ];

  const filteredRates = rates.filter((rateItem) => {
    const matchesCat = pickerCategory === 'all' || rateItem.category === pickerCategory;
    const q = pickerSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      rateItem.namePa.toLowerCase().includes(q) ||
      rateItem.nameEn.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  // Sync billNumber if nextBillNumber changes (unless editing a saved bill)
  useEffect(() => {
    if (!editingOrder) {
      setBillNumber(nextBillNumber);
    }
  }, [nextBillNumber, editingOrder]);

  // Sync boxTagNumber when a new order advances nextBoxTagNumber (unless editing a saved bill)
  const prevNextBoxTagRef = React.useRef(nextBoxTagNumber);
  useEffect(() => {
    if (prevNextBoxTagRef.current !== nextBoxTagNumber) {
      prevNextBoxTagRef.current = nextBoxTagNumber;
      if (!editingOrder) {
        setBoxTagNumber(nextBoxTagNumber);
        setBoxCount(1);
      }
    }
  }, [nextBoxTagNumber, editingOrder]);

  // Populate entire form when editing an existing saved bill
  useEffect(() => {
    if (!editingOrder) return;

    const nameEn = editingOrder.customerNameEn || '';
    const namePa =
      nameEn && editingOrder.customerName.endsWith(`(${nameEn})`)
        ? editingOrder.customerName.slice(0, -`(${nameEn})`.length).trim()
        : editingOrder.customerName;

    const vEn = editingOrder.customerVillageEn || '';
    const vPaRaw = editingOrder.customerVillage || '';
    const vPa =
      vEn && vPaRaw.endsWith(`(${vEn})`)
        ? vPaRaw.slice(0, -`(${vEn})`.length).trim()
        : vPaRaw;

    setBillNumber(editingOrder.billNumber);
    setBoxTagNumber(editingOrder.boxTagNumber || nextBoxTagNumber);
    setBoxCount(editingOrder.boxCount || 1);
    setSelectedCustomerId(editingOrder.customerId);
    setCustomerNameEn(nameEn);
    setCustomerName(namePa);
    setVillageEn(vEn);
    setVillagePa(vPa);
    setCustomerPhone(editingOrder.customerPhone || '');
    setShowCustomerDropdown(false);
    setBillDate(
      editingOrder.createdAt
        ? editingOrder.createdAt.split('T')[0]
        : new Date().toISOString().split('T')[0]
    );
    setDeliveryDate(editingOrder.expectedDeliveryDate || getDefaultDeliveryDate());
    setItems(editingOrder.items.map((it) => ({ ...it })));
    setDiscount(editingOrder.discount || 0);
    setAdvanceAmount(editingOrder.advanceAmount || 0);
    setPaymentMode(editingOrder.paymentMode || 'Cash');
    setUtrNumber(editingOrder.utrNumber || '');
    setNotes(editingOrder.notes || '');
    setFormError('');
    setConfirmClearDraft(false);
    setConfirmClearItems(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [editingOrder, nextBoxTagNumber]);

  // Totals
  const subtotal = items.reduce((acc, item) => acc + item.total, 0);
  const totalAmount = Math.max(0, subtotal - (discount || 0));
  const pendingAmount = Math.max(0, totalAmount - (advanceAmount || 0));

  const bankAccounts = getShopBankAccounts(settings);
  const defaultBank = getDefaultBankAccount(settings);
  const [selectedBankId, setSelectedBankId] = useState<string>(defaultBank?.id || '');
  const activeBank =
    bankAccounts.find((b) => b.id === selectedBankId) || defaultBank;

  // Generate UPI QR Code (or use uploaded QR image from active bank account)
  useEffect(() => {
    if (activeBank?.qrCodeImage) {
      setUpiQrUrl(activeBank.qrCodeImage);
      return;
    }
    const amountToPay = advanceAmount > 0 ? advanceAmount : totalAmount;
    const targetUpiId = activeBank?.upiId || settings.upiId;
    const targetUpiName =
      activeBank?.upiName || activeBank?.accountHolderName || settings.upiName;
    if (amountToPay > 0 && targetUpiId) {
      generateUpiQrDataUrl(targetUpiId, targetUpiName, amountToPay, billNumber).then(
        (url) => setUpiQrUrl(url)
      );
    } else {
      setUpiQrUrl('');
    }
  }, [totalAmount, advanceAmount, activeBank, settings.upiId, settings.upiName, billNumber]);

  // Quick Add Standard Rate Item with per-service rate support
  const handleAddStandardItem = (
    rateItem: RateItem,
    customRate?: number,
    chosenService?: ServiceType
  ) => {
    const targetService = chosenService || rateItem.defaultService;
    const initialServiceRates: Partial<Record<ServiceType, number>> = {
      ...(rateItem.serviceRates || { [rateItem.defaultService]: rateItem.defaultRate }),
    };

    const effectiveRate =
      customRate !== undefined
        ? customRate
        : initialServiceRates[targetService] ?? rateItem.defaultRate;

    initialServiceRates[targetService] = effectiveRate;

    setItems((prev) => {
      const existingIndex = prev.findIndex((it) => {
        const services =
          it.serviceTypes && it.serviceTypes.length > 0 ? it.serviceTypes : [it.serviceType];
        return (
          it.clothName === rateItem.namePa &&
          services.length === 1 &&
          services[0] === targetService &&
          !it.customWork &&
          !(it.customWorkRate && it.customWorkRate > 0) &&
          it.rate === effectiveRate
        );
      });

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
          total: (updated[existingIndex].quantity + 1) * updated[existingIndex].rate,
        };
        return updated;
      }

      const newItem: BillItem = {
        id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        clothName: rateItem.namePa,
        clothNameEn: rateItem.nameEn,
        quantity: 1,
        serviceType: targetService,
        serviceTypes: [targetService],
        serviceRates: initialServiceRates,
        customWorkRate: 0,
        rate: effectiveRate,
        total: effectiveRate,
      };
      return [...prev, newItem];
    });
  };

  // Consume item selected from Rate List tab
  useEffect(() => {
    if (queuedRateItem) {
      handleAddStandardItem(queuedRateItem.item, queuedRateItem.customRate, queuedRateItem.service);
      onConsumeQueuedRateItem?.();
    }
  }, [queuedRateItem]);

  // Add custom cloth item
  const handleAddCustomItem = () => {
    const newItem: BillItem = {
      id: 'custom_' + Date.now(),
      clothName: 'ਹੋਰ ਕੱਪੜਾ (Other Item)',
      clothNameEn: 'Custom Item',
      quantity: 1,
      serviceType: 'Dry Clean',
      serviceTypes: ['Dry Clean'],
      serviceRates: { 'Dry Clean': 100 },
      customWorkRate: 0,
      rate: 100,
      total: 100,
    };
    setItems([...items, newItem]);
  };

  // Update item details
  const updateItem = (id: string, updates: Partial<BillItem>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        if (updates.rate !== undefined) {
          const active =
            updated.serviceTypes && updated.serviceTypes.length > 0
              ? updated.serviceTypes
              : [updated.serviceType];
          if (active.length === 1 && !(updated.customWorkRate && updated.customWorkRate > 0)) {
            updated.serviceRates = {
              ...(updated.serviceRates || {}),
              [active[0]]: updates.rate,
            };
          }
        }
        if (updates.quantity !== undefined || updates.rate !== undefined) {
          updated.total = updated.quantity * updated.rate;
        }
        return updated;
      })
    );
  };

  // Toggle multiple services on a single bill item and auto-recalculate rate
  const toggleItemService = (id: string, service: ServiceType) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const current =
          item.serviceTypes && item.serviceTypes.length > 0 ? item.serviceTypes : [item.serviceType];
        const exists = current.includes(service);
        let nextList: ServiceType[];
        if (exists) {
          if (current.length === 1) return item; // Keep at least 1 service selected
          nextList = current.filter((s) => s !== service);
        } else {
          nextList = [...current, service];
        }

        const nextServiceRates: Partial<Record<ServiceType, number>> = {
          ...(item.serviceRates || { [item.serviceType]: item.rate }),
        };
        if (nextServiceRates[service] === undefined) {
          nextServiceRates[service] = 0;
        }

        const servicesSum = nextList.reduce(
          (sum, s) => sum + (Number(nextServiceRates[s]) || 0),
          0
        );
        const nextRate = servicesSum + (Number(item.customWorkRate) || 0);

        return {
          ...item,
          serviceTypes: nextList,
          serviceType: nextList[0],
          serviceRates: nextServiceRates,
          rate: nextRate,
          total: item.quantity * nextRate,
        };
      })
    );
  };

  // Edit per-service rate for a selected work inside Multi-Work
  const updateItemServiceRate = (id: string, service: ServiceType, value: number) => {
    const cleanVal = Math.max(0, value || 0);
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const active =
          item.serviceTypes && item.serviceTypes.length > 0 ? item.serviceTypes : [item.serviceType];
        const nextServiceRates: Partial<Record<ServiceType, number>> = {
          ...(item.serviceRates || { [item.serviceType]: item.rate }),
          [service]: cleanVal,
        };
        const servicesSum = active.reduce(
          (sum, s) => sum + (Number(nextServiceRates[s]) || 0),
          0
        );
        const nextRate = servicesSum + (Number(item.customWorkRate) || 0);
        return {
          ...item,
          serviceRates: nextServiceRates,
          rate: nextRate,
          total: item.quantity * nextRate,
        };
      })
    );
  };

  // Edit optional custom work extra rate
  const updateCustomWorkRate = (id: string, value: number) => {
    const cleanVal = Math.max(0, value || 0);
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const active =
          item.serviceTypes && item.serviceTypes.length > 0 ? item.serviceTypes : [item.serviceType];
        const baseServiceRates: Partial<Record<ServiceType, number>> =
          item.serviceRates || { [item.serviceType]: item.rate };
        const servicesSum = active.reduce(
          (sum, s) => sum + (Number(baseServiceRates[s]) || 0),
          0
        );
        const nextRate = servicesSum + cleanVal;
        return {
          ...item,
          serviceRates: baseServiceRates,
          customWorkRate: cleanVal,
          rate: nextRate,
          total: item.quantity * nextRate,
        };
      })
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Parse order using AI
  const handleAiParse = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiParsing(true);
    setAiError('');

    try {
      const res = await fetch('/api/ai/parse-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      if (!res.ok) {
        throw new Error('AI ਸੇਵਾ ਨਾਲ ਸੰਪਰਕ ਨਹੀਂ ਹੋ ਸਕਿਆ');
      }

      const data = await res.json();
      if (data.customerName) {
        const rawName = String(data.customerName).trim();
        const hasGurmukhi = /[\u0A00-\u0A7F]/.test(rawName);
        if (!hasGurmukhi) {
          setCustomerNameEn(rawName);
          setCustomerName(transliterateEnglishToPunjabi(rawName));
        } else {
          setCustomerName(rawName);
        }
      }
      if (data.customerPhone) setCustomerPhone(data.customerPhone);
      if (data.advanceAmount !== undefined) setAdvanceAmount(Number(data.advanceAmount) || 0);
      if (data.notes) setNotes(data.notes);

      if (Array.isArray(data.items) && data.items.length > 0) {
        const parsedItems: BillItem[] = data.items.map((it: any, index: number) => {
          const serviceList: ServiceType[] =
            Array.isArray(it.serviceTypes) && it.serviceTypes.length > 0
              ? it.serviceTypes
              : [(it.serviceType as ServiceType) || 'Dry Clean'];
          return {
            id: `ai_${Date.now()}_${index}`,
            clothName: it.clothName || 'ਕੱਪੜਾ',
            clothNameEn: it.clothNameEn || '',
            quantity: Number(it.quantity) || 1,
            serviceType: serviceList[0],
            serviceTypes: serviceList,
            customWork: it.customWork || '',
            rate: Number(it.rate) || 100,
            total: (Number(it.quantity) || 1) * (Number(it.rate) || 100),
          };
        });
        setItems(parsedItems);
      }
      setAiPrompt('');
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'ਬਿੱਲ ਪਾਰਸ ਕਰਨ ਵਿੱਚ ਸਮੱਸਿਆ ਆਈ');
    } finally {
      setIsAiParsing(false);
    }
  };

  // Consume customer selected from Customer Accounts tab
  useEffect(() => {
    if (queuedCustomer) {
      const cust = queuedCustomer.customer;
      setSelectedCustomerId(cust.id);
      setCustomerNameEn(cust.nameEn || '');
      setCustomerName(cust.namePa || cust.name);
      setVillageEn(cust.villageEn || '');
      setVillagePa(cust.villagePa || cust.address || '');
      setCustomerPhone(cust.phone);
      setShowCustomerDropdown(false);
      onConsumeQueuedCustomer?.();
    }
  }, [queuedCustomer]);

  const matchingCustomers = React.useMemo(() => {
    const qNameEn = customerNameEn.trim().toLowerCase();
    const qNamePa = customerName.trim().toLowerCase();
    const qPhone = customerPhone.replace(/\D/g, '');
    if (!qNameEn && !qNamePa && !qPhone) {
      return customers.slice(0, 6);
    }
    return customers
      .filter((c) => {
        const hay = `${c.name} ${c.nameEn || ''} ${c.namePa || ''} ${c.villagePa || ''} ${c.villageEn || ''}`.toLowerCase();
        const nameMatch =
          (qNameEn && hay.includes(qNameEn)) || (qNamePa && hay.includes(qNamePa));
        const phoneMatch = qPhone ? c.phone.replace(/\D/g, '').includes(qPhone) : false;
        return Boolean(nameMatch || phoneMatch);
      })
      .slice(0, 6);
  }, [customers, customerNameEn, customerName, customerPhone]);

  const linkedCustomer = React.useMemo(() => {
    if (!selectedCustomerId) return null;
    const cust = customers.find((c) => c.id === selectedCustomerId);
    if (!cust) return null;
    const custOrders = orders.filter((o) => orderMatchesCustomer(o, cust));
    const pendingBalance = custOrders.reduce((sum, o) => sum + (o.pendingAmount || 0), 0);
    return { cust, orderCount: custOrders.length, pendingBalance };
  }, [selectedCustomerId, customers, orders]);

  const handleSelectExistingCustomer = (cust: CustomerAccount) => {
    setSelectedCustomerId(cust.id);
    setCustomerNameEn(cust.nameEn || '');
    setCustomerName(cust.namePa || cust.name);
    setVillageEn(cust.villageEn || '');
    setVillagePa(cust.villagePa || cust.address || '');
    setCustomerPhone(cust.phone);
    setShowCustomerDropdown(false);
  };

  const handleToggleAutoTranslate = (checked: boolean) => {
    setAutoTranslate(checked);
    if (checked) {
      if (customerNameEn.trim()) {
        setCustomerName(transliterateEnglishToPunjabi(customerNameEn));
      }
      if (villageEn.trim()) {
        setVillagePa(transliterateEnglishToPunjabi(villageEn));
      }
    }
  };

  // Restore any pre-existing new-bill draft after finishing/cancelling Edit Mode, or reset clean
  const restoreDraftOrReset = () => {
    const saved = loadBillingDraft();
    const hasSavedDraft = Boolean(
      saved.customerNameEn ||
        saved.customerName ||
        saved.villageEn ||
        saved.villagePa ||
        saved.customerPhone ||
        (Array.isArray(saved.items) && saved.items.length > 0) ||
        saved.notes
    );
    if (hasSavedDraft) {
      setBillNumber(nextBillNumber);
      setBoxTagNumber(saved.boxTagNumber || nextBoxTagNumber);
      setBoxCount(Number(saved.boxCount) || 1);
      setSelectedCustomerId(saved.selectedCustomerId);
      setCustomerNameEn(saved.customerNameEn || '');
      setCustomerName(saved.customerName || '');
      setVillageEn(saved.villageEn || '');
      setVillagePa(saved.villagePa || '');
      setCustomerPhone(saved.customerPhone || '');
      setBillDate(saved.billDate || new Date().toISOString().split('T')[0]);
      setDeliveryDate(saved.deliveryDate || getDefaultDeliveryDate());
      setItems(Array.isArray(saved.items) ? saved.items : []);
      setDiscount(Number(saved.discount) || 0);
      setAdvanceAmount(Number(saved.advanceAmount) || 0);
      setPaymentMode(saved.paymentMode || 'Cash');
      setUtrNumber(saved.utrNumber || '');
      setNotes(saved.notes || '');
      setFormError('');
      return;
    }
    handleReset();
  };

  // Reset form & clear persisted draft
  const handleReset = () => {
    setBillNumber(nextBillNumber);
    setSelectedCustomerId(undefined);
    setCustomerNameEn('');
    setCustomerName('');
    setVillageEn('');
    setVillagePa('');
    setCustomerPhone('');
    setShowCustomerDropdown(false);
    setBillDate(new Date().toISOString().split('T')[0]);
    setDeliveryDate(getDefaultDeliveryDate());
    setItems([]);
    setDiscount(0);
    setAdvanceAmount(0);
    setPaymentMode('Cash');
    setUtrNumber('');
    setNotes('');
    setFormError('');
    setConfirmClearDraft(false);
    setConfirmClearItems(false);
    setBoxTagNumber(nextBoxTagNumber);
    setBoxCount(1);
    localStorage.removeItem(BILLING_DRAFT_KEY);
  };

  const handleCancelEditing = () => {
    onCancelEdit?.();
    restoreDraftOrReset();
  };

  // Validate form
  const validateBillForm = () => {
    if (!customerName.trim() && !customerNameEn.trim()) {
      setFormError('ਕਿਰਪਾ ਕਰਕੇ ਕਸਟਮਰ ਦਾ ਨਾਮ ਦਰਜ ਕਰੋ (Please enter customer name)');
      return false;
    }
    if (items.length === 0) {
      setFormError('ਕਿਰਪਾ ਕਰਕੇ ਘੱਟੋ-ਘੱਟ ਇੱਕ ਕੱਪੜਾ ਬਿੱਲ ਵਿੱਚ ਸ਼ਾਮਲ ਕਰੋ (Please add at least 1 item)');
      return false;
    }
    setFormError('');
    return true;
  };

  // Build order object (preserves existing order ID/status when editing)
  const buildOrderObject = (overrides?: {
    advanceAmount?: number;
    paymentMode?: 'Cash' | 'UPI' | 'Mix';
    utrNumber?: string;
    paidAt?: string;
  }): Order => {
    const finalAdvance =
      overrides?.advanceAmount !== undefined ? overrides.advanceAmount : Number(advanceAmount) || 0;
    const finalPending = Math.max(0, totalAmount - finalAdvance);
    const combinedName = formatCombinedBilingual(customerName, customerNameEn);
    const combinedVillage = formatCombinedBilingual(villagePa, villageEn);

    const existingDatePart = editingOrder?.createdAt
      ? editingOrder.createdAt.split('T')[0]
      : '';
    const resolvedCreatedAt =
      editingOrder && billDate === existingDatePart
        ? editingOrder.createdAt
        : billDate
        ? new Date(`${billDate}T12:00:00`).toISOString()
        : new Date().toISOString();

    return {
      id: editingOrder ? editingOrder.id : 'ord_' + Date.now(),
      billNumber: billNumber || `MDC-${Math.floor(1000 + Math.random() * 9000)}`,
      boxTagNumber: boxTagNumber.trim() || nextBoxTagNumber,
      boxCount: Math.max(1, Number(boxCount) || 1),
      customerId: selectedCustomerId,
      createdAt: resolvedCreatedAt,
      readyDate: editingOrder?.readyDate || '',
      expectedDeliveryDate: deliveryDate,
      customerName: combinedName,
      customerNameEn: customerNameEn.trim() || undefined,
      customerPhone: customerPhone.trim(),
      customerVillage: combinedVillage || undefined,
      customerVillageEn: villageEn.trim() || undefined,
      items: items,
      subtotal: subtotal,
      discount: Number(discount) || 0,
      totalAmount: totalAmount,
      advanceAmount: finalAdvance,
      pendingAmount: finalPending,
      paymentMode: overrides?.paymentMode || paymentMode,
      utrNumber: overrides?.utrNumber ?? (utrNumber.trim() || undefined),
      paidAt: overrides?.paidAt ?? editingOrder?.paidAt,
      status: editingOrder?.status || 'processing',
      notes: notes,
    };
  };

  // Submit Order
  const handleSubmit = (action: 'save' | 'print' | 'whatsapp') => {
    if (!validateBillForm()) return;

    const wasEditing = Boolean(editingOrder);
    const newOrder = buildOrderObject();

    if (action === 'whatsapp') {
      onSaveOrder(newOrder, false, true);
    } else if (action === 'print') {
      onSaveOrder(newOrder, true, false);
    } else {
      onSaveOrder(newOrder, false, false);
    }

    if (wasEditing) {
      restoreDraftOrReset();
    } else {
      handleReset();
    }
  };

  // Open QR Payment Confirm Modal
  const handleOpenQrConfirm = () => {
    if (!validateBillForm()) return;
    setShowQrModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Edit Mode Banner when editing an existing saved bill */}
      {editingOrder && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 bg-amber-200 text-amber-950 rounded">
                  Full Bill Edit Mode
                </span>
                <span className="font-black font-mono text-sm text-slate-950">
                  {editingOrder.billNumber}
                </span>
                {editingOrder.boxTagNumber && (
                  <span className="text-xs font-bold font-mono text-amber-900">
                    ({editingOrder.boxTagNumber})
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-950 font-semibold mt-1">
                ਤੁਸੀਂ <span className="underline">{editingOrder.customerName}</span> ਦਾ ਪੂਰਾ ਬਿੱਲ ਐਡਿਟ ਕਰ ਰਹੇ ਹੋ — ਕੱਪੜੇ, ਕੰਮ, ਰੇਟ, ਡਿਸਕਾਊਂਟ, ਐਡਵਾਂਸ ਜਾਂ ਗਾਹਕ ਵੇਰਵਾ ਬਦਲ ਕੇ ਸੇਵ ਕਰੋ।
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancelEditing}
            className="px-4 py-2 bg-white hover:bg-amber-100 text-amber-950 border border-amber-400 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>ਐਡਿਟ ਰੱਦ ਕਰੋ (Cancel)</span>
          </button>
        </div>
      )}
      {/* Top Banner: AI Smart Order Input */}
      <div className="bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 rounded-2xl p-4 sm:p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-sky-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="max-w-xl">
            <div className="flex items-center space-x-2 text-sky-400 text-xs sm:text-sm font-semibold mb-1">
              <Sparkles className="w-4 h-4 animate-spin-slow" />
              <span>ਸਮਾਰਟ AI ਬਿੱਲ ਸਹਾਇਕ (Smart AI Auto-Fill)</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">
              ਬੋਲ ਕੇ ਜਾਂ ਲਿਖ ਕੇ ਤੁਰੰਤ ਬਿੱਲ ਤਿਆਰ ਕਰੋ
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              ਉਦਾਹਰਣ: "ਜਸਪ੍ਰੀਤ ਸਿੰਘ 9814012345, 2 ਕੋਟ ਬਲੈਜ਼ਰ, 1 ਸੂਟ (ਫੁੱਲ), ₹200 ਐਡਵਾਂਸ"
            </p>
          </div>

          <div className="w-full md:w-auto flex-1 max-w-lg">
            <div className="flex items-center bg-white/10 backdrop-blur-md rounded-xl p-1.5 border border-white/20 focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-400/30 transition-all">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiParse()}
                placeholder="ਇੱਥੇ ਆਰਡਰ ਦਾ ਵੇਰਵਾ ਲਿਖੋ..."
                className="w-full bg-transparent px-3 py-1.5 text-sm text-white placeholder-slate-400 focus:outline-hidden"
              />
              <button
                onClick={handleAiParse}
                disabled={isAiParsing || !aiPrompt.trim()}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-900 font-bold rounded-lg text-xs transition-colors shrink-0 cursor-pointer"
              >
                {isAiParsing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>ਪਾਰਸ ਕਰ ਰਿਹਾ ਹੈ...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>ਆਟੋ ਫਿਲ ਕਰੋ</span>
                  </>
                )}
              </button>
            </div>
            {aiError && <p className="text-xs text-rose-300 mt-1 ml-1">{aiError}</p>}
          </div>
        </div>
      </div>

      {/* Main Billing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Customer details, Quick item picker, Items table (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Customer & Bill Metadata Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center space-x-2 text-base">
                <User className="w-4 h-4 text-sky-600" />
                <span>ਕਸਟਮਰ ਅਤੇ ਬਿੱਲ ਦਾ ਵੇਰਵਾ (Customer &amp; Bill Info)</span>
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                {!editingOrder && hasDraftData && (
                  <div className="inline-flex items-center space-x-1.5">
                    <span
                      title="ਤੁਹਾਡਾ ਅਧੂਰਾ ਬਿੱਲ ਆਪਣੇ-ਆਪ ਸੇਵ ਹੋ ਰਿਹਾ ਹੈ"
                      className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold"
                    >
                      <Save className="w-3 h-3" />
                      <span>ਡਰਾਫਟ ਸੇਵ</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!confirmClearDraft) {
                          setConfirmClearDraft(true);
                          setTimeout(() => setConfirmClearDraft(false), 3500);
                          return;
                        }
                        handleReset();
                      }}
                      title="ਬਿੱਲ ਫਾਰਮ ਖਾਲੀ ਕਰੋ"
                      className={`inline-flex items-center space-x-1 px-2 py-1 rounded-lg border text-[11px] font-bold cursor-pointer transition-colors ${
                        confirmClearDraft
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border-slate-200'
                      }`}
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{confirmClearDraft ? 'ਪੱਕਾ ਸਾਫ਼ ਕਰੋ?' : 'ਨਵਾਂ ਫਾਰਮ'}</span>
                    </button>
                  </div>
                )}

                {/* Small Auto Translate Checkbox */}
                <label
                  title="ਟਿੱਕ ਹੋਣ 'ਤੇ English ਲਿਖਣ ਨਾਲ ਪੰਜਾਬੀ ਆਪਣੇ-ਆਪ ਆਵੇਗੀ; ਅਨਟਿੱਕ ਕਰਕੇ ਦੋਵੇਂ ਹੱਥੀਂ ਭਰੋ"
                  className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer select-none transition-colors ${
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

                {customers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowCustomerDropdown((v) => !v)}
                    className="px-2.5 py-1 text-xs font-bold bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg flex items-center space-x-1 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>ਪੁਰਾਣਾ ਗਾਹਕ ({customers.length})</span>
                  </button>
                )}

                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-semibold text-slate-500">ਬਿੱਲ ਨੰ:</span>
                  <input
                    type="text"
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    className="w-24 px-2 py-1 text-xs font-bold text-slate-900 bg-slate-100 rounded-md border border-slate-200 text-center"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 relative">
              {/* Customer Name (English) */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Customer Name (English) *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={customerNameEn}
                    onFocus={() => {
                      if (customers.length > 0) setShowCustomerDropdown(true);
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomerNameEn(val);
                      setSelectedCustomerId(undefined);
                      if (autoTranslate) {
                        setCustomerName(transliterateEnglishToPunjabi(val));
                      }
                      if (customers.length > 0) setShowCustomerDropdown(true);
                    }}
                    placeholder="e.g. Harpreet Singh"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Customer Name (Punjabi) */}
              <div>
                <label className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1">
                  <span>ਕਸਟਮਰ ਦਾ ਨਾਮ (ਪੰਜਾਬੀ) *</span>
                  {autoTranslate && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 rounded">
                      Auto
                    </span>
                  )}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-sky-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={customerName}
                    readOnly={autoTranslate}
                    onFocus={() => {
                      if (!autoTranslate && customers.length > 0) setShowCustomerDropdown(true);
                    }}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setSelectedCustomerId(undefined);
                      if (customers.length > 0) setShowCustomerDropdown(true);
                    }}
                    placeholder={autoTranslate ? 'English ਲਿਖਦੇ ਹੀ ਪੰਜਾਬੀ ਆਵੇਗੀ' : 'ਪੰਜਾਬੀ ਵਿੱਚ ਨਾਮ ਲਿਖੋ'}
                    title={
                      autoTranslate
                        ? 'ਹੱਥੀਂ ਭਰਨ ਲਈ ਉੱਪਰੋਂ Auto Translate ਤੋਂ ਟਿੱਕ ਹਟਾਓ'
                        : 'ਪੰਜਾਬੀ ਵਿੱਚ ਨਾਮ ਲਿਖੋ'
                    }
                    className={`w-full pl-9 pr-3 py-2 text-sm border rounded-xl transition-all font-medium ${
                      autoTranslate
                        ? 'bg-sky-50/60 border-sky-200 text-sky-950'
                        : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-200'
                    }`}
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  ਮੋਬਾਈਲ ਨੰਬਰ (WhatsApp)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onFocus={() => {
                      if (customers.length > 0) setShowCustomerDropdown(true);
                    }}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value);
                      setSelectedCustomerId(undefined);
                      if (customers.length > 0) setShowCustomerDropdown(true);
                    }}
                    placeholder="10 ਅੰਕਾਂ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Village (English) */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Village / City (English)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={villageEn}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVillageEn(val);
                      if (autoTranslate) {
                        setVillagePa(transliterateEnglishToPunjabi(val));
                      }
                    }}
                    placeholder="e.g. Dakha / Jagraon"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Village (Punjabi) */}
              <div>
                <label className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1">
                  <span>ਪਿੰਡ / ਸ਼ਹਿਰ (ਪੰਜਾਬੀ)</span>
                  {autoTranslate && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 rounded">
                      Auto
                    </span>
                  )}
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-sky-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={villagePa}
                    readOnly={autoTranslate}
                    onChange={(e) => setVillagePa(e.target.value)}
                    placeholder={autoTranslate ? 'English ਲਿਖਦੇ ਹੀ ਪੰਜਾਬੀ ਆਵੇਗੀ' : 'ਪਿੰਡ / ਸ਼ਹਿਰ ਪੰਜਾਬੀ ਵਿੱਚ'}
                    title={
                      autoTranslate
                        ? 'ਹੱਥੀਂ ਭਰਨ ਲਈ ਉੱਪਰੋਂ Auto Translate ਤੋਂ ਟਿੱਕ ਹਟਾਓ'
                        : 'ਪਿੰਡ / ਸ਼ਹਿਰ ਪੰਜਾਬੀ ਵਿੱਚ ਲਿਖੋ'
                    }
                    className={`w-full pl-9 pr-3 py-2 text-sm border rounded-xl transition-all font-medium ${
                      autoTranslate
                        ? 'bg-sky-50/60 border-sky-200 text-sky-950'
                        : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-200'
                    }`}
                  />
                </div>
              </div>

              {/* Dates side-by-side */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    ਬੁਕਿੰਗ ਮਿਤੀ
                  </label>
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full px-2 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    ਡਿਲੀਵਰੀ ਮਿਤੀ
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-2 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Box / Bundle Tag Number Strip (linked to both Customer Bill & Cut-out Box Slip) */}
              <div className="sm:col-span-2 lg:col-span-3 bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-amber-950">
                      ਡੱਬਾ / ਗੱਠੜੀ ਟੈਗ ਨੰ. (Box / Bag Tag No.)
                    </div>
                    <p className="text-[11px] text-amber-800">
                      ਇਹੀ ਨੰਬਰ ਗਾਹਕ ਦੇ ਬਿੱਲ ਅਤੇ ਹੇਠਾਂ ਕੱਟਣ ਵਾਲੀ ✂️ ਬਾਕਸ ਸਲਿੱਪ ਦੋਵਾਂ 'ਤੇ ਪ੍ਰਿੰਟ ਹੋਵੇਗਾ।
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="flex items-center space-x-1">
                    <input
                      type="text"
                      value={boxTagNumber}
                      onChange={(e) => setBoxTagNumber(e.target.value.toUpperCase())}
                      placeholder={nextBoxTagNumber}
                      className="w-28 px-2.5 py-1.5 text-xs font-black font-mono text-amber-950 bg-white border border-amber-300 rounded-lg text-center focus:outline-hidden focus:border-amber-500"
                    />
                    {boxTagNumber !== nextBoxTagNumber && (
                      <button
                        type="button"
                        onClick={() => setBoxTagNumber(nextBoxTagNumber)}
                        title="ਆਟੋ ਨੰਬਰ ਵਾਪਸ ਲਓ"
                        className="p-1.5 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-1 bg-white border border-amber-300 rounded-lg px-2 py-1">
                    <span className="text-[11px] font-bold text-amber-900">ਡੱਬੇ:</span>
                    <button
                      type="button"
                      onClick={() => setBoxCount((c) => Math.max(1, c - 1))}
                      className="w-5 h-5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-5 text-center text-xs font-extrabold font-mono text-slate-900">
                      {boxCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBoxCount((c) => c + 1)}
                      className="w-5 h-5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Repeat Customer Suggestions Dropdown */}
              {showCustomerDropdown && matchingCustomers.length > 0 && !selectedCustomerId && (
                <div className="sm:col-span-2 md:col-span-4 bg-white border border-sky-200 rounded-xl shadow-lg p-2 space-y-1 z-20">
                  <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-500 border-b border-slate-100">
                    <span>ਸੇਵ ਕੀਤੇ ਗਾਹਕ ਖਾਤੇ (ਕਲਿੱਕ ਕਰਕੇ ਚੁਣੋ):</span>
                    <button
                      type="button"
                      onClick={() => setShowCustomerDropdown(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                    {matchingCustomers.map((cust) => {
                      const custOrders = orders.filter((o) => orderMatchesCustomer(o, cust));
                      const pending = custOrders.reduce((s, o) => s + (o.pendingAmount || 0), 0);
                      return (
                        <button
                          key={cust.id}
                          type="button"
                          onClick={() => handleSelectExistingCustomer(cust)}
                          className="text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-slate-900 truncate">
                              {cust.name}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {cust.phone || 'ਫੋਨ ਨਹੀਂ'} • {custOrders.length} ਆਰਡਰ
                            </div>
                          </div>
                          {pending > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded shrink-0">
                              ਬਾਕੀ ₹{pending}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Linked Repeat Customer Banner */}
            {linkedCustomer && (
              <div className="p-3 bg-sky-50/80 border border-sky-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-bold text-sky-900 flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>ਗਾਹਕ ਖਾਤਾ ਜੁੜਿਆ: {linkedCustomer.cust.name}</span>
                  </span>
                  <span className="text-slate-600">
                    ਪਿਛਲੇ ਆਰਡਰ: <strong>{linkedCustomer.orderCount}</strong>
                  </span>
                  {linkedCustomer.pendingBalance > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold border border-amber-300">
                      ⚠️ ਪਿਛਲਾ ਬਕਾਇਆ: ₹{linkedCustomer.pendingBalance}
                    </span>
                  )}
                  {linkedCustomer.cust.notes && (
                    <span className="text-sky-800 flex items-center space-x-1">
                      <FileText className="w-3.5 h-3.5 text-sky-600" />
                      <span>{linkedCustomer.cust.notes}</span>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCustomerId(undefined)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  ਵੱਖਰਾ ਗਾਹਕ
                </button>
              </div>
            )}
          </div>

          {/* Quick Rate List Picker */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center space-x-2">
                  <ShoppingBag className="w-4 h-4 text-sky-600" />
                  <span>ਕੱਪੜੇ ਚੁਣੋ - ਤੁਰੰਤ ਰੇਟ ਲਿਸਟ (Quick Clothes Selector)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  ਕੈਟਾਗਰੀ ਚੁਣੋ ਅਤੇ ਕੱਪੜੇ 'ਤੇ ਕਲਿੱਕ ਕਰਕੇ ਤੁਰੰਤ ਬਿੱਲ ਵਿੱਚ ਸ਼ਾਮਲ ਕਰੋ
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddCustomItem}
                className="px-3.5 py-2 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-xl border border-sky-200 flex items-center space-x-1.5 transition-colors shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>ਹੋਰ ਕੱਪੜਾ</span>
              </button>
            </div>

            {/* Larger, easy-to-tap Search Box */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="ਕੱਪੜਾ ਖੋਜੋ... (ਜਿਵੇਂ Suit, Coat, ਕਮੀਜ਼, Blanket, Shoes)"
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-hidden transition-all"
              />
              {pickerSearch && (
                <button
                  type="button"
                  onClick={() => setPickerSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category filter bar */}
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-1">
              {pickerCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setPickerCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    pickerCategory === cat.id
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Chips grid for standard rate list */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1 max-h-[340px] overflow-y-auto pr-0.5">
              {filteredRates.map((rateItem) => {
                const isDualRate = rateItem.minRate !== rateItem.maxRate && rateItem.minRate > 0;
                const sr = rateItem.serviceRates || {
                  [rateItem.defaultService]: rateItem.defaultRate,
                };
                const multiServiceKeys = WORK_OPTIONS.filter(
                  (opt) => (sr[opt.value] ?? 0) > 0
                );
                const isInspection =
                  rateItem.defaultRate === 0 && multiServiceKeys.length === 0;

                return (
                  <div
                    key={rateItem.id}
                    onClick={() => {
                      if (!isDualRate) handleAddStandardItem(rateItem);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (!isDualRate && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleAddStandardItem(rateItem);
                      }
                    }}
                    className="flex flex-col text-left p-2.5 rounded-xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 transition-all group cursor-pointer relative justify-between"
                  >
                    <div>
                      <span className="font-semibold text-xs sm:text-sm text-slate-900 group-hover:text-sky-700 block leading-tight">
                        {rateItem.namePa}
                      </span>
                      <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                        {rateItem.nameEn}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 gap-1">
                      {isDualRate ? (
                        <div className="flex items-center gap-1 w-full justify-between">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddStandardItem(rateItem, rateItem.minRate, rateItem.defaultService);
                            }}
                            className="flex-1 py-0.5 px-1.5 bg-sky-50 hover:bg-sky-600 hover:text-white text-sky-700 border border-sky-200 rounded text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            + ₹{rateItem.minRate}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddStandardItem(rateItem, rateItem.maxRate, rateItem.defaultService);
                            }}
                            className="flex-1 py-0.5 px-1.5 bg-sky-50 hover:bg-sky-600 hover:text-white text-sky-700 border border-sky-200 rounded text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            + ₹{rateItem.maxRate}
                          </button>
                        </div>
                      ) : multiServiceKeys.length > 1 ? (
                        <div className="flex flex-wrap gap-1 w-full">
                          {multiServiceKeys.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddStandardItem(rateItem, sr[opt.value], opt.value);
                              }}
                              className="px-1.5 py-0.5 bg-slate-50 hover:bg-sky-600 hover:text-white text-slate-700 border border-slate-200 rounded text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              {opt.labelPa} ₹{sr[opt.value]}
                            </button>
                          ))}
                        </div>
                      ) : isInspection ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 truncate">
                          ਦੇਖ ਕੇ ਰੇਟ
                        </span>
                      ) : (
                        <>
                          <span className="text-xs font-bold text-sky-700">
                            ₹{rateItem.defaultRate}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate">
                            {WORK_OPTIONS.find((w) => w.value === rateItem.defaultService)?.labelPa ||
                              rateItem.defaultService}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredRates.length === 0 && (
                <div className="col-span-full py-6 text-center text-xs text-slate-400">
                  ਕੋਈ ਆਈਟਮ ਨਹੀਂ ਮਿਲੀ।
                </div>
              )}
            </div>
          </div>

          {/* Current Items Table */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                ਬਿੱਲ ਦੇ ਕੱਪੜੇ (Bill Items) - {items.length} ਆਈਟਮਾਂ
              </h3>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (!confirmClearItems) {
                      setConfirmClearItems(true);
                      setTimeout(() => setConfirmClearItems(false), 3500);
                      return;
                    }
                    setItems([]);
                    setConfirmClearItems(false);
                  }}
                  className={`text-xs font-semibold px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                    confirmClearItems
                      ? 'bg-rose-600 text-white'
                      : 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'
                  }`}
                >
                  {confirmClearItems ? 'ਪੱਕਾ ਸਭ ਹਟਾਓ?' : 'ਸਭ ਹਟਾਓ (Clear all)'}
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">
                  ਅਜੇ ਕੋਈ ਕੱਪੜਾ ਸ਼ਾਮਲ ਨਹੀਂ ਕੀਤਾ ਗਿਆ
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  ਉੱਪਰ ਦਿੱਤੀ ਲਿਸਟ ਵਿੱਚੋਂ ਕੱਪੜਾ ਚੁਣੋ ਜਾਂ AI ਨਾਲ ਬੋਲ ਕੇ ਸ਼ਾਮਲ ਕਰੋ
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="pb-2.5">ਕੱਪੜਾ</th>
                      <th className="pb-2.5 min-w-[210px]">ਸਰਵਿਸ / ਕੰਮ (Multi-Work)</th>
                      <th className="pb-2.5 w-24 text-center">ਮਾਤਰਾ (Qty)</th>
                      <th className="pb-2.5 w-24 text-right">ਰੇਟ (₹)</th>
                      <th className="pb-2.5 w-24 text-right">ਕੁੱਲ (₹)</th>
                      <th className="pb-2.5 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => {
                      const activeServices =
                        item.serviceTypes && item.serviceTypes.length > 0
                          ? item.serviceTypes
                          : [item.serviceType];

                      return (
                      <tr key={item.id} className="hover:bg-slate-50/50 group align-top">
                        <td className="py-2.5 pr-2">
                          <input
                            type="text"
                            value={item.clothName}
                            onChange={(e) => updateItem(item.id, { clothName: e.target.value })}
                            className="w-full font-medium text-slate-900 bg-transparent focus:bg-white border-b border-transparent focus:border-sky-400 py-0.5 text-xs sm:text-sm"
                          />
                          {item.clothNameEn && (
                            <span className="block text-[11px] text-slate-400 font-normal">
                              {item.clothNameEn}
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 pr-2 space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {WORK_OPTIONS.map((opt) => {
                              const isSelected = activeServices.includes(opt.value);
                              const presetRate = item.serviceRates?.[opt.value];
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => toggleItemService(item.id, opt.value)}
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                                    isSelected
                                      ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                  }`}
                                >
                                  {isSelected ? '✓ ' : ''}
                                  {opt.labelPa}
                                  {presetRate !== undefined && presetRate > 0 ? ` (₹${presetRate})` : ''}
                                </button>
                              );
                            })}
                          </div>

                          {/* Editable per-selected-service rate breakdown */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {activeServices.map((srv) => {
                              const label =
                                WORK_OPTIONS.find((w) => w.value === srv)?.labelPa || srv;
                              const srvRate =
                                item.serviceRates?.[srv] !== undefined
                                  ? item.serviceRates[srv]
                                  : activeServices.length === 1
                                  ? item.rate
                                  : 0;
                              return (
                                <div
                                  key={srv}
                                  className="inline-flex items-center space-x-1 bg-sky-50/70 border border-sky-200 rounded-md px-1.5 py-0.5"
                                >
                                  <span className="text-[10px] font-semibold text-sky-900">
                                    {label}: ₹
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={srvRate}
                                    onChange={(e) =>
                                      updateItemServiceRate(
                                        item.id,
                                        srv,
                                        Number(e.target.value) || 0
                                      )
                                    }
                                    className="w-12 text-right font-mono text-[11px] font-bold bg-white border border-sky-200 rounded px-1 py-0.5 text-slate-900"
                                  />
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={item.customWork || ''}
                              onChange={(e) => updateItem(item.id, { customWork: e.target.value })}
                              placeholder="+ ਹੋਰ ਕੰਮ (ਜਿਵੇਂ: ਰਫੂ, ਚਰਕ, ਬਟਨ)..."
                              className="flex-1 min-w-0 px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-sky-400 text-slate-700 placeholder-slate-400"
                            />
                            <div className="inline-flex items-center space-x-0.5 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5 shrink-0">
                              <span className="text-[10px] text-slate-500">₹</span>
                              <input
                                type="number"
                                min="0"
                                value={item.customWorkRate || ''}
                                onChange={(e) =>
                                  updateCustomWorkRate(item.id, Number(e.target.value) || 0)
                                }
                                placeholder="0"
                                title="ਹੋਰ ਕੰਮ ਦਾ ਵੱਖਰਾ ਰੇਟ (₹)"
                                className="w-12 text-right font-mono text-[11px] bg-transparent focus:outline-hidden text-slate-800"
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-1 text-center">
                          <div className="inline-flex items-center border border-slate-200 rounded-lg bg-slate-50">
                            <button
                              type="button"
                              onClick={() =>
                                updateItem(item.id, { quantity: Math.max(1, item.quantity - 1) })
                              }
                              className="px-2 py-0.5 text-slate-600 hover:bg-slate-200 rounded-l-md font-bold text-xs"
                            >
                              -
                            </button>
                            <span className="px-2 py-0.5 font-bold text-xs text-slate-800">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}
                              className="px-2 py-0.5 text-slate-600 hover:bg-slate-200 rounded-r-md font-bold text-xs"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        <td className="py-2.5 pl-2 text-right">
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) =>
                              updateItem(item.id, { rate: Number(e.target.value) || 0 })
                            }
                            className={`w-20 text-right font-mono text-xs sm:text-sm rounded-lg px-2 py-1 focus:bg-white focus:border-sky-500 border ${
                              item.rate === 0
                                ? 'bg-amber-50 border-amber-400 text-amber-900'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          />
                          {item.rate === 0 && (
                            <span className="block text-[10px] text-amber-700 font-semibold mt-0.5">
                              ਦੇਖ ਕੇ ਰੇਟ ਭਰੋ
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 pl-2 text-right font-bold text-slate-900 font-mono">
                          ₹{item.total}
                        </td>

                        <td className="py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                            title="ਹਟਾਓ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Payment, Calculation, UPI QR & 15-Day Policy (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Bill Calculation Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>ਹਿਸਾਬ-ਕਿਤਾਬ (Summary)</span>
              <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
                {items.reduce((acc, it) => acc + it.quantity, 0)} ਕੱਪੜੇ
              </span>
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>ਕੁੱਲ ਜੋੜ (Subtotal):</span>
                <span className="font-semibold text-slate-900 font-mono">₹{subtotal}</span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span className="flex items-center space-x-1">
                  <Percent className="w-3.5 h-3.5 text-slate-400" />
                  <span>ਛੋਟ (Discount):</span>
                </span>
                <div className="flex items-center space-x-1">
                  <span>₹</span>
                  <input
                    type="number"
                    value={discount || ''}
                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-20 text-right font-mono text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-base font-bold text-slate-900">
                <span>ਕੁੱਲ ਬਿੱਲ (Total Bill):</span>
                <span className="text-lg text-sky-700 font-mono">₹{totalAmount}</span>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex justify-between items-center text-emerald-700">
                  <span className="font-semibold text-xs sm:text-sm">ਐਡਵਾਂਸ ਪੈਸੇ (Advance):</span>
                  <div className="flex items-center space-x-1">
                    <span>₹</span>
                    <input
                      type="number"
                      value={advanceAmount || ''}
                      onChange={(e) => setAdvanceAmount(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-24 text-right font-mono font-bold text-sm bg-emerald-50 border border-emerald-300 rounded-lg px-2 py-1 text-emerald-800 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  <div>
                    <span className="font-bold text-amber-900 text-xs sm:text-sm block">
                      ਬਾਕੀ ਰਕਮ (Pending):
                    </span>
                    <span className="text-[10px] text-amber-700">ਕੱਪੜੇ ਲੈਂਦੇ ਸਮੇਂ ਦੇਣਯੋਗ</span>
                  </div>
                  <span className="font-extrabold text-lg text-amber-900 font-mono">
                    ₹{pendingAmount}
                  </span>
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  ਪੇਮੈਂਟ ਮੋਡ (Payment Mode):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Cash', 'UPI', 'Mix'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                        paymentMode === mode
                          ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {mode === 'Cash' ? 'ਨਕਦ (Cash)' : mode === 'UPI' ? 'UPI / QR' : 'ਮਿਕਸ (Mix)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* UPI / Bank QR preview for customer + 1-click QR Confirm */}
              {(upiQrUrl || activeBank) && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                    <span className="flex items-center space-x-1">
                      <QrCode className="w-3.5 h-3.5 text-sky-600" />
                      <span>UPI / ਬੈਂਕ ਭੁਗਤਾਨ QR</span>
                    </span>
                    <span className="text-[11px] text-slate-600 font-mono truncate max-w-[150px]">
                      {activeBank?.upiId || settings.upiId}
                    </span>
                  </div>

                  {bankAccounts.length > 1 && (
                    <div className="flex flex-wrap items-center justify-center gap-1">
                      {bankAccounts.map((acc) => (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => setSelectedBankId(acc.id)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer transition-colors ${
                            activeBank?.id === acc.id
                              ? 'bg-sky-600 text-white border-sky-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {acc.bankName || acc.accountHolderName || acc.upiId}
                        </button>
                      ))}
                    </div>
                  )}

                  {upiQrUrl && (
                    <div className="flex justify-center p-2 bg-white rounded-lg border border-slate-200 inline-block mx-auto">
                      <img
                        src={upiQrUrl}
                        alt="UPI QR Code"
                        className="w-32 h-32 object-contain"
                      />
                    </div>
                  )}

                  {activeBank && (activeBank.bankName || activeBank.accountNumber || activeBank.ifscCode) && (
                    <div className="text-[10px] text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1 space-y-0.5">
                      <div className="font-bold text-slate-800">
                        {activeBank.accountHolderName}
                        {activeBank.bankName ? ` • ${activeBank.bankName}` : ''}
                      </div>
                      <div className="font-mono">
                        {activeBank.accountNumber && <span>A/C: {activeBank.accountNumber}</span>}
                        {activeBank.accountNumber && activeBank.ifscCode && <span> • </span>}
                        {activeBank.ifscCode && <span>IFSC: {activeBank.ifscCode}</span>}
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-500">
                    Google Pay, PhonePe, Paytm ਰਾਹੀਂ{' '}
                    <span className="font-bold text-slate-800">
                      ₹{advanceAmount > 0 ? advanceAmount : totalAmount}
                    </span>{' '}
                    ਸਕੈਨ ਕਰਕੇ ਪੇ ਕਰੋ
                  </p>

                  <button
                    type="button"
                    onClick={handleOpenQrConfirm}
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center justify-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>ਵੱਡਾ QR ਦਿਖਾਓ &amp; Payment Confirm ਕਰੋ</span>
                  </button>
                </div>
              )}
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <button
                type="button"
                onClick={() => handleSubmit('save')}
                className={`w-full py-2.5 px-4 text-white font-bold rounded-xl text-sm shadow-md flex items-center justify-center space-x-2 transition-transform active:scale-[0.98] cursor-pointer ${
                  editingOrder
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                    : 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/20'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {editingOrder ? 'ਬਦਲਾਅ ਸੇਵ ਕਰੋ (Update Bill)' : 'ਬਿੱਲ ਸੇਵ ਕਰੋ (Save Bill)'}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSubmit('print')}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                  title="ਪ੍ਰਿੰਟ, PDF ਜਾਂ JPG ਵਿੱਚ ਸੇਵ ਕਰੋ"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{editingOrder ? 'ਸੇਵ ਤੇ ਪ੍ਰਿੰਟ' : 'ਪ੍ਰਿੰਟ / PDF / JPG'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmit('whatsapp')}
                  className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{editingOrder ? 'ਸੇਵ ਤੇ WhatsApp' : 'WhatsApp ਭੇਜੋ'}</span>
                </button>
              </div>

              {editingOrder && (
                <button
                  type="button"
                  onClick={handleCancelEditing}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>ਐਡਿਟ ਰੱਦ ਕਰੋ (Cancel Edit)</span>
                </button>
              )}
            </div>
          </div>

          {/* ⚠️ Mandatory 15-Day Policy Card */}
          <div className="bg-amber-50/80 border-2 border-amber-300 rounded-2xl p-4 text-amber-900 space-y-2 shadow-xs">
            <div className="flex items-center space-x-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>ਲਾਜ਼ਮੀ ਦੁਕਾਨ ਪੋਲਿਸੀ (15 Days Rule)</span>
            </div>
            <p className="text-xs leading-relaxed font-medium text-amber-950">
              {settings.disclaimerPa}
            </p>
            <p className="text-[11px] text-amber-700 italic border-t border-amber-200/60 pt-1">
              *ਇਹ ਸ਼ਰਤ ਹਰ ਗਾਹਕ ਦੀ ਪ੍ਰਿੰਟ ਸਲਿੱਪ ਅਤੇ WhatsApp ਸੁਨੇਹੇ ਵਿੱਚ ਸ਼ਾਮਲ ਕੀਤੀ ਜਾਂਦੀ ਹੈ।
            </p>
          </div>
        </div>
      </div>

      {/* QR Payment Confirm Modal for New Bill */}
      {showQrModal && (
        <PaymentConfirmModal
          billNumber={billNumber}
          customerName={customerName.trim()}
          totalAmount={totalAmount}
          amountDue={advanceAmount > 0 ? advanceAmount : totalAmount}
          initialPaymentMode={paymentMode === 'Cash' ? 'UPI' : paymentMode}
          settings={settings}
          allowCustomAmount={true}
          onConfirm={(details) => {
            const wasEditing = Boolean(editingOrder);
            const confirmedOrder = buildOrderObject({
              advanceAmount: Math.min(totalAmount, details.paidAmount),
              paymentMode: details.paymentMode,
              utrNumber: details.utrNumber,
              paidAt: new Date().toISOString(),
            });
            onSaveOrder(confirmedOrder, false, false);
            setShowQrModal(false);
            if (wasEditing) {
              restoreDraftOrReset();
            } else {
              handleReset();
            }
          }}
          onClose={() => setShowQrModal(false)}
        />
      )}
    </div>
  );
};
