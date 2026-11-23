/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar, AppTab } from './components/Navbar';
import {
  BillingDesk,
  QueuedCustomerSelection,
  QueuedRateSelection,
} from './components/BillingDesk';
import { OrdersManager } from './components/OrdersManager';
import { CustomersManager } from './components/CustomersManager';
import { RateListTable } from './components/RateListTable';
import { StainExpertGuide } from './components/StainExpertGuide';
import { AiAssistant } from './components/AiAssistantDrawer';
import { PrintInvoiceModal } from './components/PrintInvoiceModal';
import { WhatsAppModal } from './components/WhatsAppModal';
import { SettingsModal } from './components/SettingsModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { CustomerAccount, Order, OrderStatus, RateItem, ServiceType, ShopSettings } from './types';
import { DEFAULT_SHOP_SETTINGS, SAMPLE_ORDERS, STANDARD_RATES } from './data/initialData';
import { normalizePhone, orderMatchesCustomer } from './utils/helpers';
import { Sparkles, MessageSquare, Plus, CheckCircle2, X } from 'lucide-react';

function deriveCustomersFromOrders(ordersList: Order[]): CustomerAccount[] {
  const accounts: CustomerAccount[] = [];
  for (const ord of ordersList) {
    if (!ord.customerName?.trim()) continue;
    const exists = accounts.some((c) => orderMatchesCustomer(ord, c));
    if (!exists) {
      accounts.push({
        id: ord.customerId || `cust_${ord.id}`,
        name: ord.customerName.trim(),
        phone: ord.customerPhone?.trim() || '',
        createdAt: ord.createdAt || new Date().toISOString(),
      });
    }
  }
  return accounts;
}

export default function App() {
  // Shop Settings State (persisted in localStorage)
  const [settings, setSettings] = useState<ShopSettings>(() => {
    try {
      const saved = localStorage.getItem('mdc_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return { ...DEFAULT_SHOP_SETTINGS, ...parsed };
        }
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_SHOP_SETTINGS;
  });

  // Orders State (persisted in localStorage)
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('mdc_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return SAMPLE_ORDERS;
  });

  // Rates State (persisted in localStorage)
  const [rates, setRates] = useState<RateItem[]>(() => {
    const saved = localStorage.getItem('mdc_rates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: RateItem) => {
            const defaultMatch = STANDARD_RATES.find((d) => d.id === item.id);
            return {
              ...item,
              serviceRates: item.serviceRates || defaultMatch?.serviceRates || {
                [item.defaultService]: item.defaultRate,
              },
            };
          });
        }
      } catch (e) {
        console.error(e);
      }
    }
    return STANDARD_RATES;
  });

  // Customers State (persisted in localStorage)
  const [customers, setCustomers] = useState<CustomerAccount[]>(() => {
    const saved = localStorage.getItem('mdc_customers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    // Seed from existing orders on first run
    return deriveCustomersFromOrders(orders);
  });

  // Current active navigation tab
  const [activeTab, setActiveTabState] = useState<AppTab>('billing');
  const [backNotice, setBackNotice] = useState<string | null>(null);
  const backNoticeTimerRef = React.useRef<number | null>(null);

  const showBackNotice = React.useCallback((msg: string, duration = 3500) => {
    setBackNotice(msg);
    if (backNoticeTimerRef.current) {
      window.clearTimeout(backNoticeTimerRef.current);
    }
    backNoticeTimerRef.current = window.setTimeout(() => {
      setBackNotice(null);
    }, duration);
  }, []);

  const setActiveTab = (nextTab: AppTab) => {
    setActiveTabState((prev) => {
      if (prev !== nextTab) {
        try {
          window.history.pushState(
            { mdcGuard: true, mdcTab: nextTab },
            '',
            window.location.pathname + window.location.search
          );
        } catch {
          // ignore history errors in restricted contexts
        }
      }
      return nextTab;
    });
  };

  // Modals state
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [whatsAppModalData, setWhatsAppModalData] = useState<{
    order: Order | null;
    template: 'booking' | 'ready' | 'warning' | 'custom';
  } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Floating AI Assistant drawer state
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string | undefined>(undefined);
  const [queuedRateItem, setQueuedRateItem] = useState<QueuedRateSelection | null>(null);
  const [queuedCustomer, setQueuedCustomer] = useState<QueuedCustomerSelection | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const navStateRef = React.useRef({
    activeTab,
    printOrder,
    whatsAppModalData,
    isSettingsOpen,
    isAiDrawerOpen,
  });
  navStateRef.current = {
    activeTab,
    printOrder,
    whatsAppModalData,
    isSettingsOpen,
    isAiDrawerOpen,
  };

  // Intercept phone / browser Back button so accidental Back closes modals or returns to Billing Desk safely
  useEffect(() => {
    try {
      if (!window.history.state?.mdcGuard) {
        window.history.replaceState({ mdcGuard: true, mdcTab: 'billing' }, '');
        window.history.pushState({ mdcGuard: true, mdcTab: 'billing' }, '');
      }
    } catch {
      // ignore
    }

    const handlePopState = () => {
      const current = navStateRef.current;
      if (current.printOrder) {
        setPrintOrder(null);
        window.history.pushState({ mdcGuard: true, mdcTab: current.activeTab }, '');
        return;
      }
      if (current.whatsAppModalData) {
        setWhatsAppModalData(null);
        window.history.pushState({ mdcGuard: true, mdcTab: current.activeTab }, '');
        return;
      }
      if (current.isSettingsOpen) {
        setIsSettingsOpen(false);
        window.history.pushState({ mdcGuard: true, mdcTab: current.activeTab }, '');
        return;
      }
      if (current.isAiDrawerOpen) {
        setIsAiDrawerOpen(false);
        window.history.pushState({ mdcGuard: true, mdcTab: current.activeTab }, '');
        return;
      }
      if (current.activeTab !== 'billing') {
        setActiveTabState('billing');
        window.history.pushState({ mdcGuard: true, mdcTab: 'billing' }, '');
        showBackNotice('ਤੁਸੀਂ ਵਾਪਸ ਬਿੱਲਿੰਗ ਡੈਸਕ ਤੇ ਆ ਗਏ ਹੋ — ਤੁਹਾਡਾ ਬਿੱਲ ਡਾਟਾ ਸੁਰੱਖਿਅਤ ਹੈ!', 3200);
        return;
      }

      // Already on billing: re-push guard so accidental single back doesn't exit app & wipe screen
      window.history.pushState({ mdcGuard: true, mdcTab: 'billing' }, '');
      const hasDraft = Boolean(localStorage.getItem('mdc_billing_draft'));
      if (hasDraft) {
        showBackNotice('ਤੁਹਾਡਾ ਅਧੂਰਾ ਬਿੱਲ ਡਰਾਫਟ ਸੁਰੱਖਿਅਤ ਸੇਵ ਹੈ (Data Lost ਨਹੀਂ ਹੋਵੇਗਾ)', 3500);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (backNoticeTimerRef.current) {
        window.clearTimeout(backNoticeTimerRef.current);
      }
    };
  }, [showBackNotice]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('mdc_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('mdc_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('mdc_rates', JSON.stringify(rates));
  }, [rates]);

  useEffect(() => {
    localStorage.setItem('mdc_customers', JSON.stringify(customers));
  }, [customers]);

  // Compute next sequential bill number
  const nextBillNumber = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    const existingBills = orders
      .map((o) => {
        const match = o.billNumber.match(/MDC-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));

    const maxNum = existingBills.length > 0 ? Math.max(...existingBills) : 1083;
    return `MDC-${maxNum + 1}`;
  }, [orders]);

  // Compute next sequential box/bundle tag number (linked to both bill & box slip)
  const nextBoxTagNumber = React.useMemo(() => {
    const existingTags = orders
      .map((o) => {
        if (!o.boxTagNumber) return 0;
        const match = o.boxTagNumber.match(/BOX-(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));

    const maxTag = existingTags.length > 0 ? Math.max(...existingTags) : 100;
    return `BOX-${maxTag + 1}`;
  }, [orders]);

  // Save new order & automatically link/create Customer Account
  const handleSaveOrder = (
    order: Order,
    printImmediately = false,
    sendWhatsAppImmediately = false
  ) => {
    let linkedCustomerId = order.customerId;
    const matched = customers.find((c) => orderMatchesCustomer(order, c));

    const isUpdatingExisting = orders.some((o) => o.id === order.id);

    if (matched) {
      linkedCustomerId = matched.id;
      const incomingPhone = normalizePhone(order.customerPhone);
      const needsUpdate =
        (!matched.phone && incomingPhone) ||
        (!matched.villagePa && order.customerVillage) ||
        (!matched.villageEn && order.customerVillageEn) ||
        (!matched.nameEn && order.customerNameEn);
      if (needsUpdate) {
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === matched.id
              ? {
                  ...c,
                  phone: c.phone || order.customerPhone.trim(),
                  nameEn: c.nameEn || order.customerNameEn,
                  villagePa: c.villagePa || order.customerVillage,
                  villageEn: c.villageEn || order.customerVillageEn,
                  address: c.address || order.customerVillage,
                  updatedAt: new Date().toISOString(),
                }
              : c
          )
        );
      }
    } else if (order.customerName.trim()) {
      const newCust: CustomerAccount = {
        id: `cust_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: order.customerName.trim(),
        nameEn: order.customerNameEn,
        namePa: order.customerName.replace(/\s*\([^)]*\)\s*$/, '').trim() || order.customerName.trim(),
        phone: order.customerPhone.trim(),
        villagePa: order.customerVillage,
        villageEn: order.customerVillageEn,
        address: order.customerVillage,
        createdAt: order.createdAt || new Date().toISOString(),
      };
      linkedCustomerId = newCust.id;
      setCustomers((prev) => [newCust, ...prev]);
    }

    const orderToSave: Order = { ...order, customerId: linkedCustomerId };
    if (isUpdatingExisting) {
      setOrders((prev) => prev.map((o) => (o.id === orderToSave.id ? orderToSave : o)));
      setEditingOrder(null);
      showBackNotice(`ਬਿੱਲ ${orderToSave.billNumber} ਸਫਲਤਾਪੂਰਵਕ ਅੱਪਡੇਟ ਹੋ ਗਿਆ!`, 3200);
    } else {
      setOrders((prev) => [orderToSave, ...prev]);
    }

    if (printImmediately) {
      setPrintOrder(orderToSave);
    } else if (sendWhatsAppImmediately) {
      setWhatsAppModalData({ order: orderToSave, template: 'booking' });
    } else {
      // Switch to orders view
      setActiveTab('orders');
    }
  };

  // Start editing a saved order in full BillingDesk editor
  const handleStartEditOrder = (order: Order) => {
    setPrintOrder(null);
    setWhatsAppModalData(null);
    setEditingOrder(order);
    setActiveTab('billing');
  };

  // Update order status
  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id === orderId) {
          const updates: Partial<Order> = { status };
          if (status === 'ready' && !order.readyDate) {
            updates.readyDate = new Date().toISOString();
          }
          return { ...order, ...updates };
        }
        return order;
      })
    );
  };

  // Collect balance with optional payment mode & UTR confirmation details
  const handleCollectBalance = (
    orderId: string,
    details?: {
      paidAmount: number;
      paymentMode: 'Cash' | 'UPI' | 'Mix';
      utrNumber?: string;
      markDelivered?: boolean;
    }
  ) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id === orderId) {
          const collected = details ? details.paidAmount : order.pendingAmount;
          const newAdvance = Math.min(order.totalAmount, (order.advanceAmount || 0) + collected);
          const newPending = Math.max(0, order.totalAmount - newAdvance);
          const shouldDeliver =
            details?.markDelivered !== undefined
              ? details.markDelivered
              : order.status === 'ready';

          return {
            ...order,
            advanceAmount: newAdvance,
            pendingAmount: newPending,
            paymentMode: details?.paymentMode || order.paymentMode,
            utrNumber: details?.utrNumber || order.utrNumber,
            paidAt: new Date().toISOString(),
            status: shouldDeliver ? 'delivered' : order.status,
          };
        }
        return order;
      })
    );
  };

  // Delete order
  const handleDeleteOrder = (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  // Add or update rate item
  const handleSaveRateItem = (rateItem: RateItem) => {
    setRates((prev) => {
      const exists = prev.some((r) => r.id === rateItem.id);
      if (exists) {
        return prev.map((r) => (r.id === rateItem.id ? rateItem : r));
      }
      return [rateItem, ...prev];
    });
  };

  // Delete rate item
  const handleDeleteRateItem = (rateId: string) => {
    setRates((prev) => prev.filter((r) => r.id !== rateId));
  };

  // Reset rates to standard defaults
  const handleResetRates = () => {
    setRates(STANDARD_RATES);
  };

  // Add rate item from Rate List directly into billing
  const handleSelectRateItem = (item: RateItem, customRate?: number, service?: ServiceType) => {
    setQueuedRateItem({ item, customRate, service, nonce: Date.now() });
    setActiveTab('billing');
  };

  // Add or update customer account
  const handleSaveCustomer = (customer: CustomerAccount) => {
    setCustomers((prev) => {
      const exists = prev.some((c) => c.id === customer.id);
      if (exists) {
        return prev.map((c) => (c.id === customer.id ? customer : c));
      }
      return [customer, ...prev];
    });
  };

  // Delete customer account
  const handleDeleteCustomer = (customerId: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
  };

  // Start new bill prefilled for a specific customer
  const handleCreateBillForCustomer = (customer: CustomerAccount) => {
    setQueuedCustomer({ customer, nonce: Date.now() });
    setActiveTab('billing');
  };

  // Open AI Chat with query
  const handleAskAi = (prompt?: string) => {
    setAiInitialPrompt(prompt);
    setActiveTab('ai');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        orders={orders}
        customers={customers}
        settings={settings}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Safe Back Navigation Notice Banner */}
      {backNotice && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] sm:w-auto bg-emerald-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-emerald-500/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{backNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setBackNotice(null)}
            className="text-emerald-200 hover:text-white p-0.5 cursor-pointer"
            aria-label="Close notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className={activeTab === 'billing' ? 'block' : 'hidden'}>
          <BillingDesk
            settings={settings}
            rates={rates}
            customers={customers}
            orders={orders}
            onSaveOrder={handleSaveOrder}
            nextBillNumber={nextBillNumber}
            nextBoxTagNumber={nextBoxTagNumber}
            editingOrder={editingOrder}
            onCancelEdit={() => setEditingOrder(null)}
            onOpenAiChat={handleAskAi}
            queuedRateItem={queuedRateItem}
            onConsumeQueuedRateItem={() => setQueuedRateItem(null)}
            queuedCustomer={queuedCustomer}
            onConsumeQueuedCustomer={() => setQueuedCustomer(null)}
          />
        </div>

        {activeTab === 'orders' && (
          <OrdersManager
            orders={orders}
            settings={settings}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onCollectBalance={handleCollectBalance}
            onEditOrder={handleStartEditOrder}
            onDeleteOrder={handleDeleteOrder}
            onOpenPrintModal={(order) => setPrintOrder(order)}
            onOpenWhatsAppModal={(order, template) =>
              setWhatsAppModalData({ order, template: template || 'ready' })
            }
            onNewBillClick={() => setActiveTab('billing')}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersManager
            customers={customers}
            orders={orders}
            settings={settings}
            onSaveCustomer={handleSaveCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onCreateBillForCustomer={handleCreateBillForCustomer}
            onEditOrder={handleStartEditOrder}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onCollectBalance={handleCollectBalance}
            onOpenPrintModal={(order) => setPrintOrder(order)}
            onOpenWhatsAppModal={(order, template) =>
              setWhatsAppModalData({ order, template: template || 'ready' })
            }
          />
        )}

        {activeTab === 'whatsapp' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
                  <MessageSquare className="w-4 h-4" />
                  <span>ਆਟੋਮੈਟਿਕ WhatsApp ਰਿਮਾਇੰਡਰ ਮੈਸੇਜਿੰਗ ਸੈਂਟਰ</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  ਕਸਟਮਰ ਸੁਨੇਹੇ ਭੇਜੋ (Customer WhatsApp Alerts)
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Day 1 ਆਰਡਰ ਬੁਕਿੰਗ, Day 7 ਰੈਡੀ ਅਤੇ Day 13 ਦੀ 15-ਦਿਨਾਂ ਵਾਲੀ ਜ਼ਰੂਰੀ ਵਾਰਨਿੰਗ
                </p>
              </div>

              <button
                type="button"
                onClick={() => setWhatsAppModalData({ order: null, template: 'booking' })}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center space-x-2 transition-transform cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>ਨਵਾਂ ਸੁਨੇਹਾ ਲਿਖੋ</span>
              </button>
            </div>

            {/* Orders list with direct WhatsApp action */}
            <OrdersManager
              orders={orders}
              settings={settings}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onCollectBalance={handleCollectBalance}
              onEditOrder={handleStartEditOrder}
              onDeleteOrder={handleDeleteOrder}
              onOpenPrintModal={(order) => setPrintOrder(order)}
              onOpenWhatsAppModal={(order, template) =>
                setWhatsAppModalData({ order, template: template || 'ready' })
              }
              onNewBillClick={() => setActiveTab('billing')}
            />
          </div>
        )}

        {activeTab === 'rates' && (
          <RateListTable
            rates={rates}
            onSelectRateItem={handleSelectRateItem}
            onSaveRateItem={handleSaveRateItem}
            onDeleteRateItem={handleDeleteRateItem}
            onResetRates={handleResetRates}
          />
        )}

        {activeTab === 'stains' && (
          <StainExpertGuide onAskAiAboutStain={(stain) => handleAskAi(`ਮੈਨੂੰ ${stain} ਸਾਫ਼ ਕਰਨ ਦਾ ਸਭ ਤੋਂ ਵਧੀਆ ਤਰੀਕਾ ਦੱਸੋ।`)} />
        )}

        {activeTab === 'ai' && (
          <div className="max-w-4xl mx-auto">
            <AiAssistant
              settings={settings}
              activeOrders={orders}
              initialPrompt={aiInitialPrompt}
            />
          </div>
        )}
      </main>

      {/* Floating Quick Action: AI Assistant Pill (when not on AI tab) */}
      {activeTab !== 'ai' && (
        <aside aria-label="Quick Actions" className="fixed bottom-6 right-6 z-30 flex items-center space-x-2">
          <button
            onClick={() => setIsAiDrawerOpen(true)}
            className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white font-bold text-xs sm:text-sm rounded-full shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
          >
            <Sparkles className="w-4 h-4 text-sky-300 animate-spin-slow" />
            <span>Master Dry Clean AI</span>
          </button>
        </aside>
      )}

      {/* Slide-over Drawer for Floating AI Assistant */}
      {isAiDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <AiAssistant
              settings={settings}
              activeOrders={orders}
              isOpenAsDrawer={true}
              onCloseDrawer={() => setIsAiDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Print Invoice Modal */}
      {printOrder && (
        <PrintInvoiceModal
          order={printOrder}
          settings={settings}
          onEditOrder={handleStartEditOrder}
          onClose={() => setPrintOrder(null)}
        />
      )}

      {/* WhatsApp Message Modal */}
      {whatsAppModalData && (
        <WhatsAppModal
          order={whatsAppModalData.order}
          settings={settings}
          defaultTemplate={whatsAppModalData.template}
          onClose={() => setWhatsAppModalData(null)}
        />
      )}

      {/* Shop Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          orders={orders}
          rates={rates}
          customers={customers}
          onSaveSettings={(newSettings) => setSettings(newSettings)}
          onRestoreBackup={(data) => {
            if (data.settings) setSettings(data.settings);
            if (Array.isArray(data.orders)) setOrders(data.orders);
            if (Array.isArray(data.rates)) setRates(data.rates);
            if (Array.isArray(data.customers)) setCustomers(data.customers);
          }}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Offline Mode Indicator */}
      <OfflineIndicator />
    </div>
  );
}
