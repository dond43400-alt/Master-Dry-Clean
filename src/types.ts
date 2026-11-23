export type ServiceType = 'Dry Clean' | 'Steam Iron' | 'Wash' | 'Roll Press' | 'Stain Removal';

export type OrderStatus = 'received' | 'processing' | 'ready' | 'delivered';

export interface BillItem {
  id: string;
  clothName: string;
  clothNameEn?: string;
  quantity: number;
  serviceType: ServiceType;
  serviceTypes?: ServiceType[];
  serviceRates?: Partial<Record<ServiceType, number>>;
  customWork?: string;
  customWorkRate?: number;
  rate: number;
  total: number;
}

export interface CustomerAccount {
  id: string;
  name: string;
  nameEn?: string;
  namePa?: string;
  phone: string;
  villageEn?: string;
  villagePa?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Order {
  id: string;
  billNumber: string;
  boxTagNumber?: string;
  boxCount?: number;
  customerId?: string;
  createdAt: string; // ISO date
  readyDate: string; // ISO date
  expectedDeliveryDate: string;
  customerName: string;
  customerNameEn?: string;
  customerPhone: string;
  customerVillage?: string;
  customerVillageEn?: string;
  items: BillItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  advanceAmount: number;
  pendingAmount: number;
  paymentMode: 'Cash' | 'UPI' | 'Mix';
  utrNumber?: string;
  paidAt?: string;
  status: OrderStatus;
  notes?: string;
}

export interface RateItem {
  id: string;
  namePa: string;
  nameEn: string;
  category: 'men' | 'kids' | 'women' | 'services' | 'household' | 'shoes' | 'curtains';
  minRate: number;
  maxRate: number;
  defaultRate: number;
  defaultService: ServiceType;
  serviceRates?: Partial<Record<ServiceType, number>>;
  rateLabel?: string;
  descriptionPa?: string;
}

export interface StainGuideItem {
  id: string;
  stainNamePa: string;
  stainNameEn: string;
  category: string;
  recommendedChemicals: string[];
  stepByStepPa: string[];
  safeFabricsPa: string;
  fabricWarningsPa: string;
  proTipPa: string;
}

export interface BankAccount {
  id: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  upiName?: string;
  qrCodeImage?: string;
  isDefault?: boolean;
}

export interface ShopSettings {
  shopNamePa: string;
  shopNameEn: string;
  taglinePa: string;
  addressPa: string;
  addressEn: string;
  phone: string;
  upiId: string;
  upiName: string;
  disclaimerPa: string;
  bankAccounts?: BankAccount[];
}
