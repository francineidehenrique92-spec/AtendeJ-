export interface MenuItem {
  id: string;
  name: string;
  price: number;
  costPrice?: number;
  profitMargin?: number;
  category: string;
  description: string;
  image?: string;
  stock: number;
  minStock: number;
}

export interface OrderItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  obs?: string[];
  ponto?: string;
  status: 'pending' | 'preparing' | 'delivered';
}

export interface Order {
  id: string;
  tableId: string;
  items: OrderItem[];
  status: 'pending' | 'preparing' | 'delivered' | 'paid';
  total: number;
  type: 'waiter' | 'customer';
  createdAt: any;
  updatedAt: any;
}

export interface Table {
  id: string;
  number: number;
  status: 'free' | 'busy' | 'alert' | 'billing';
  currentOrderId?: string;
  callWaiter?: boolean;
  requestBill?: boolean;
  updatedAt: any;
}
