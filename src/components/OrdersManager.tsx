import React, { useState } from 'react';
import {
  Search,
  Filter,
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Printer,
  MessageSquare,
  DollarSign,
  Phone,
  Trash2,
  Calendar,
  Sparkles,
  ArrowRight,
  QrCode,
  MapPin,
  Pencil,
} from 'lucide-react';
import { Order, OrderStatus, ShopSettings } from '../types';
import { formatDatePunjabi, formatItemServices, getDaysSince } from '../utils/helpers';
import { PaymentConfirmModal } from './PaymentConfirmModal';

interface OrdersManagerProps {
  orders: Order[];
  settings: ShopSettings;
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
  onDeleteOrder: (orderId: string) => void;
  onEditOrder?: (order: Order) => void;
  onOpenPrintModal: (order: Order) => void;
  onOpenWhatsAppModal: (order: Order, template?: 'booking' | 'ready' | 'warning') => void;
  onNewBillClick: () => void;
}

export const OrdersManager: React.FC<OrdersManagerProps> = ({
  orders,
  settings,
  onUpdateOrderStatus,
  onCollectBalance,
  onDeleteOrder,
  onEditOrder,
  onOpenPrintModal,
  onOpenWhatsAppModal,
  onNewBillClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus | 'urgent'>('all');
  const [collectOrder, setCollectOrder] = useState<Order | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Metrics
  const totalOrders = orders.length;
  const totalPendingMoney = orders.reduce((sum, o) => sum + (o.status !== 'delivered' ? o.pendingAmount : 0), 0);
  const readyOrders = orders.filter((o) => o.status === 'ready');
  const urgentOrders = orders.filter((o) => {
    if (o.status !== 'ready') return false;
    const days = getDaysSince(o.readyDate || o.createdAt);
    return days >= 12;
  });

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    // Search match
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      order.customerName.toLowerCase().includes(q) ||
      order.customerPhone.includes(q) ||
      (order.customerVillage && order.customerVillage.toLowerCase().includes(q)) ||
      order.billNumber.toLowerCase().includes(q) ||
      (order.boxTagNumber && order.boxTagNumber.toLowerCase().includes(q)) ||
      order.items.some((it) => it.clothName.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'urgent') {
      return order.status === 'ready' && getDaysSince(order.readyDate || order.createdAt) >= 12;
    }
    return order.status === statusFilter;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'received':
        return {
          label: 'ਪ੍ਰਾਪਤ ਹੋਇਆ (Received)',
          bg: 'bg-blue-100 text-blue-800 border-blue-200',
        };
      case 'processing':
        return {
          label: 'ਧੁਲਾਈ ਜਾਰੀ (Cleaning/Wash)',
          bg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        };
      case 'ready':
        return {
          label: 'ਕੱਪੜੇ ਤਿਆਰ (Ready for Pickup)',
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
        };
      case 'delivered':
        return {
          label: 'ਸੌਂਪ ਦਿੱਤਾ (Delivered)',
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
        };
      default:
        return { label: status, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">ਕੁੱਲ ਆਰਡਰ (Total)</span>
            <p className="text-xl font-extrabold text-slate-900">{totalOrders}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">ਤਿਆਰ ਕੱਪੜੇ (Ready)</span>
            <p className="text-xl font-extrabold text-emerald-700">{readyOrders.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">ਕੁੱਲ ਬਾਕੀ ਰਕਮ (Pending)</span>
            <p className="text-xl font-extrabold text-amber-900 font-mono">₹{totalPendingMoney}</p>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter('urgent')}
          className={`rounded-2xl p-4 border shadow-xs flex items-center space-x-3 cursor-pointer transition-transform hover:scale-[1.02] ${
            urgentOrders.length > 0
              ? 'bg-rose-50 border-rose-300'
              : 'bg-white border-slate-200'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              urgentOrders.length > 0 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-600 font-medium">12+ ਦਿਨ ਅਲਰਟ</span>
            <p
              className={`text-xl font-extrabold ${
                urgentOrders.length > 0 ? 'text-rose-700' : 'text-slate-700'
              }`}
            >
              {urgentOrders.length}
            </p>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filter Tabs */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ਕਸਟਮਰ ਦਾ ਨਾਮ, ਫੋਨ, ਬਿੱਲ ਨੰ. ਜਾਂ BOX ਨੰ. ਖੋਜੋ..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-sky-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ਸਾਰੇ ({orders.length})
          </button>

          <button
            onClick={() => setStatusFilter('processing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'processing'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ਧੁਲਾਈ ਜਾਰੀ
          </button>

          <button
            onClick={() => setStatusFilter('ready')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'ready'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ਤਿਆਰ ({readyOrders.length})
          </button>

          <button
            onClick={() => setStatusFilter('urgent')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center space-x-1 transition-colors ${
              statusFilter === 'urgent'
                ? 'bg-rose-600 text-white'
                : urgentOrders.length > 0
                ? 'bg-rose-100 text-rose-800'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>ਅਰਜੰਟ ({urgentOrders.length})</span>
          </button>

          <button
            onClick={() => setStatusFilter('delivered')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'delivered'
                ? 'bg-slate-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ਡਿਲੀਵਰਡ
          </button>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">ਕੋਈ ਆਰਡਰ ਨਹੀਂ ਮਿਲਿਆ</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            ਖੋਜ ਬਦਲੋ ਜਾਂ ਨਵਾਂ ਬਿੱਲ ਬਣਾਉਣ ਲਈ ਬਟਨ ਦਬਾਓ
          </p>
          <button
            onClick={onNewBillClick}
            className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs"
          >
            + ਨਵਾਂ ਬਿੱਲ ਬਣਾਓ
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrders.map((order) => {
            const badge = getStatusBadge(order.status);
            const daysSinceReady =
              order.status === 'ready'
                ? getDaysSince(order.readyDate || order.createdAt)
                : 0;
            const isUrgent = order.status === 'ready' && daysSinceReady >= 12;

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl p-5 border transition-all shadow-xs hover:shadow-md space-y-3.5 relative overflow-hidden ${
                  isUrgent ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'
                }`}
              >
                {/* Header: Bill No, Date, Status */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-extrabold text-base font-mono text-slate-900">
                        {order.billNumber}
                      </span>
                      {order.boxTagNumber && (
                        <span className="text-[11px] font-extrabold font-mono px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                          📦 {order.boxTagNumber}
                          {(order.boxCount || 1) > 1 ? ` (${order.boxCount} ਡੱਬੇ)` : ''}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{formatDatePunjabi(order.createdAt)}</span>
                      {order.expectedDeliveryDate && (
                        <span>
                          • ਡਿਲੀਵਰੀ:{' '}
                          <strong className="text-slate-700">
                            {formatDatePunjabi(order.expectedDeliveryDate)}
                          </strong>
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Quick Status Dropdown */}
                  <select
                    value={order.status}
                    onChange={(e) =>
                      onUpdateOrderStatus(order.id, e.target.value as OrderStatus)
                    }
                    className="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg px-2 py-1 font-medium text-slate-800 cursor-pointer"
                  >
                    <option value="received">ਪ੍ਰਾਪਤ ਹੋਇਆ</option>
                    <option value="processing">ਧੁਲਾਈ ਜਾਰੀ</option>
                    <option value="ready">ਕੱਪੜੇ ਤਿਆਰ</option>
                    <option value="delivered">ਡਿਲੀਵਰ ਹੋ ਗਿਆ</option>
                  </select>
                </div>

                {/* Customer Details */}
                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{order.customerName}</h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-600 mt-0.5">
                      <span className="font-mono flex items-center space-x-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{order.customerPhone || 'ਨੰਬਰ ਨਹੀਂ'}</span>
                      </span>
                      {order.customerVillage && (
                        <span className="flex items-center space-x-1 text-slate-500">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{order.customerVillage}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-500">ਕੁੱਲ ਕੱਪੜੇ:</span>
                    <p className="font-bold text-sm text-slate-900">
                      {order.items.reduce((s, it) => s + it.quantity, 0)} ਨੰਗ
                    </p>
                  </div>
                </div>

                {/* Items Summary Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {order.items.map((item, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200"
                    >
                      {item.clothName} ({item.quantity}) - {formatItemServices(item)}
                    </span>
                  ))}
                </div>

                {/* Financial Overview */}
                <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-100">
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">ਕੁੱਲ ਬਿੱਲ</span>
                    <span className="font-bold text-slate-900 font-mono">₹{order.totalAmount}</span>
                  </div>

                  <div className="bg-emerald-50 p-2 rounded-lg">
                    <span className="text-[10px] text-emerald-700 block">ਐਡਵਾਂਸ ਦਿੱਤਾ</span>
                    <span className="font-bold text-emerald-800 font-mono">
                      ₹{order.advanceAmount}
                    </span>
                  </div>

                  <div
                    className={`p-2 rounded-lg ${
                      order.pendingAmount > 0
                        ? 'bg-amber-50 text-amber-900'
                        : 'bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-[10px] block opacity-80">ਬਾਕੀ ਰਕਮ</span>
                    <span className="font-bold font-mono">₹{order.pendingAmount}</span>
                  </div>
                </div>

                {/* 13-Day Urgent Warning Alert Banner if ready >= 12 days */}
                {isUrgent && (
                  <div className="bg-amber-100/80 border border-amber-300 rounded-xl p-2.5 flex items-center justify-between text-xs text-amber-900">
                    <div className="flex items-center space-x-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>
                        <strong>{daysSinceReady} ਦਿਨ</strong> ਹੋ ਗਏ ਹਨ! (15 ਦਿਨਾਂ ਦੀ ਸ਼ਰਤ ਲਾਗੂ)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenWhatsAppModal(order, 'warning')}
                      className="px-2 py-0.5 bg-amber-700 text-white rounded-md text-[10px] font-bold hover:bg-amber-800"
                    >
                      ਅਲਰਟ ਭੇਜੋ
                    </button>
                  </div>
                )}

                {/* Actions Row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Edit Full Bill */}
                    {onEditOrder && (
                      <button
                        type="button"
                        onClick={() => onEditOrder(order)}
                        title="ਪੂਰਾ ਬਿੱਲ ਐਡਿਟ ਕਰੋ (Edit Full Bill)"
                        className="p-1.5 px-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold flex items-center space-x-1 border border-sky-200 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>ਐਡਿਟ</span>
                      </button>
                    )}

                    {/* WhatsApp button */}
                    <button
                      onClick={() =>
                        onOpenWhatsAppModal(
                          order,
                          isUrgent ? 'warning' : order.status === 'ready' ? 'ready' : 'booking'
                        )
                      }
                      title="WhatsApp ਸੁਨੇਹਾ ਭੇਜੋ"
                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center space-x-1 border border-emerald-200 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </button>

                    {/* Print / PDF / JPG Receipt */}
                    <button
                      onClick={() => onOpenPrintModal(order)}
                      title="ਬਿੱਲ ਪ੍ਰਿੰਟ, PDF ਜਾਂ JPG ਵਿੱਚ ਸੇਵ ਕਰੋ"
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1 border border-slate-200 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">ਪ੍ਰਿੰਟ / PDF / JPG</span>
                    </button>

                    {/* Collect Balance / QR Payment Modal if pending > 0 */}
                    {order.pendingAmount > 0 && (
                      <button
                        onClick={() => setCollectOrder(order)}
                        className="p-1.5 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center space-x-1 border border-amber-200 transition-colors cursor-pointer"
                        title="QR ਦਿਖਾਓ ਤੇ ਭੁਗਤਾਨ ਕਨਫਰਮ ਕਰੋ"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QR / ਬਾਕੀ ਲਵੋ (₹{order.pendingAmount})</span>
                      </button>
                    )}

                    {order.utrNumber && (
                      <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 px-2 py-1 rounded-md border border-emerald-200">
                        UTR: {order.utrNumber}
                      </span>
                    )}
                  </div>

                  {confirmDeleteId === order.id ? (
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteOrder(order.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2 py-1 text-[11px] font-bold bg-rose-600 text-white rounded-md hover:bg-rose-700 cursor-pointer"
                      >
                        ਹਟਾਓ
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 text-[11px] font-semibold bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 cursor-pointer"
                      >
                        ਰੱਦ
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(order.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      title="ਆਰਡਰ ਹਟਾਓ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Free 1-Click QR Payment Confirm Modal */}
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
