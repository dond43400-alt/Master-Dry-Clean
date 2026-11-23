import React from 'react';
import {
  Sparkles,
  Receipt,
  Package,
  MessageSquare,
  BookOpen,
  Tag,
  Settings,
  AlertTriangle,
  Shirt,
  Users,
} from 'lucide-react';
import { CustomerAccount, Order, ShopSettings } from '../types';
import { getDaysSince } from '../utils/helpers';
import { PWAInstallButton } from './PWAInstallButton';

export type AppTab = 'billing' | 'orders' | 'customers' | 'whatsapp' | 'rates' | 'stains' | 'ai';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  orders: Order[];
  customers: CustomerAccount[];
  settings: ShopSettings;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  orders,
  customers,
  settings,
  onOpenSettings,
}) => {
  // Calculate critical alerts: ready for >= 12 days and pending
  const urgentOrders = orders.filter(
    (o) => o.status === 'ready' && getDaysSince(o.readyDate || o.createdAt) >= 12
  );
  const readyOrders = orders.filter((o) => o.status === 'ready');

  const navItems = [
    { id: 'billing', labelPa: 'ਬਿੱਲਿੰਗ ਡੈਸਕ', labelEn: 'New Bill', icon: Receipt },
    {
      id: 'orders',
      labelPa: 'ਆਰਡਰ ਮੈਨੇਜਰ',
      labelEn: 'Orders',
      icon: Package,
      badge: readyOrders.length > 0 ? readyOrders.length : undefined,
      badgeColor: 'bg-emerald-500',
    },
    {
      id: 'customers',
      labelPa: 'ਗਾਹਕ ਖਾਤੇ',
      labelEn: 'Customers',
      icon: Users,
      badge: customers.length > 0 ? customers.length : undefined,
    },
    {
      id: 'whatsapp',
      labelPa: 'WhatsApp ਸੁਨੇਹੇ',
      labelEn: 'Reminders',
      icon: MessageSquare,
      alertCount: urgentOrders.length > 0 ? urgentOrders.length : undefined,
    },
    { id: 'rates', labelPa: 'ਰੇਟ ਲਿਸਟ', labelEn: 'Rates', icon: Tag },
    { id: 'stains', labelPa: 'ਦਾਗ਼ ਗਾਈਡ', labelEn: 'Stains', icon: BookOpen },
    {
      id: 'ai',
      labelPa: 'AI ਅਸਿਸਟੈਂਟ',
      labelEn: 'AI Assistant',
      icon: Sparkles,
      highlight: true,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Shop Brand */}
          <div
            onClick={() => setActiveTab('billing')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-sky-600/20 group-hover:scale-105 transition-transform">
              <Shirt className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight">
                  {settings.shopNamePa}
                </span>
                <span className="hidden md:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                  {settings.shopNameEn}
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block truncate max-w-xs md:max-w-md">
                {settings.taglinePa} • UPI: {settings.upiId}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-xl font-medium text-sm transition-all duration-150 ${
                    isActive
                      ? item.highlight
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm'
                        : 'bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs'
                      : item.highlight
                      ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive
                        ? item.highlight
                          ? 'text-white'
                          : 'text-sky-600'
                        : item.highlight
                        ? 'text-indigo-600'
                        : 'text-slate-500'
                    }`}
                  />
                  <span>{item.labelPa}</span>

                  {item.badge !== undefined && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs font-bold bg-emerald-500 text-white leading-tight">
                      {item.badge}
                    </span>
                  )}

                  {item.alertCount !== undefined && (
                    <span className="ml-1 flex items-center px-1.5 py-0.2 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                      <AlertTriangle className="w-3 h-3 mr-0.5" />
                      {item.alertCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action: Install PWA, Settings and Alerts */}
          <div className="flex items-center space-x-2">
            <PWAInstallButton />

            <button
              onClick={onOpenSettings}
              title="ਦੁਕਾਨ ਦੀਆਂ ਸੈਟਿੰਗਾਂ (Shop Settings)"
              className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center space-x-1.5 text-xs font-medium"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">ਸੈਟਿੰਗਜ਼</span>
            </button>

            {urgentOrders.length > 0 && (
              <button
                onClick={() => setActiveTab('whatsapp')}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold animate-pulse"
                title={`${urgentOrders.length} ਕੱਪੜੇ 12+ ਦਿਨਾਂ ਤੋਂ ਪੈਂਡਿੰਗ ਹਨ`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>{urgentOrders.length} ਅਰਜੰਟ ਅਲਰਟ</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Tab Bar */}
        <div className="lg:hidden flex items-center justify-between overflow-x-auto py-2 border-t border-slate-100 no-scrollbar space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex-shrink-0 flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? item.highlight
                      ? 'bg-indigo-600 text-white'
                      : 'bg-sky-600 text-white'
                    : 'text-slate-600 bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.labelPa}</span>
                {item.alertCount && (
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
