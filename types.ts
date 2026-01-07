
export type UserRole = 'MERCHANT' | 'SUPPLIER';

export enum ConservationType {
  DRY = 'Seco',
  COLD = 'Frío',
  FROZEN = 'Congelado',
  CONVENIENCE = 'Conveniencia'
}

export interface DeliverySchedule {
  days: string[];
  hours: string;
}

export interface LocalityCoverage {
  name: string;
  schedule: DeliverySchedule;
}

export interface CoverageArea {
  department: string;
  localities: LocalityCoverage[];
}

export interface Supplier {
  id: string;
  name: string;
  description: string;
  logo: string;
  minOrderValue: number;
  rating: number;
  coverage?: CoverageArea[];
  isTopSupplier?: boolean;
  totalSales?: number;
}

export interface Product {
  id: string;
  productNumber: string;
  supplierId: string;
  name: string;
  description: string;
  category: string;
  image: string;
  price: number;
  oldPrice?: number;
  brand: string;
  conservation: ConservationType;
  unit: string;
  stock: number;
  minStock: number;
  expiryDate?: string;
  isSale: boolean;
  saleEndsAt?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  businessName: string;
  isVerified?: boolean;
  location?: {
    department: string;
    locality: string;
  };
  coverage?: CoverageArea[];
}

export interface Order {
  id: string;
  supplierId: string;
  merchantId: string;
  merchantName?: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'received' | 'shipped' | 'delivered';
  isReadBySupplier: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: 'stock' | 'order' | 'message';
  title: string;
  message: string;
  time: string;
  read: boolean;
  receiverId: string;
  orderId?: string;
  senderId?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  read: boolean;
}
