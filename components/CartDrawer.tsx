
import React from 'react';
import { CartItem, Supplier } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  clearCartBySupplier: (id: string) => void;
  suppliers: Supplier[];
  onConfirm: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, cart, updateQuantity, removeFromCart, clearCartBySupplier, suppliers, onConfirm }) => {
  const cartBySupplier = cart.reduce((acc, item) => {
    if (!acc[item.supplierId]) acc[item.supplierId] = [];
    acc[item.supplierId].push(item);
    return acc;
  }, {} as Record<string, CartItem[]>);

  const calculateSubtotal = (items: CartItem[]) => items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = calculateSubtotal(cart);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in">
        <div className="p-8 border-b flex items-center justify-between bg-gray-50/50">
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Tu Pedido</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-all">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
          {cart.length === 0 ? (
            <div className="text-center py-32 space-y-4">
              <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-gray-200">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              </div>
              <p className="text-gray-400 font-black uppercase text-xs tracking-widest">Tu carrito está vacío</p>
            </div>
          ) : (
            // Added explicit type cast to Object.entries to ensure 'items' is correctly typed as CartItem[]
            (Object.entries(cartBySupplier) as [string, CartItem[]][]).map(([supplierId, items]) => {
              const supplier = suppliers.find(s => s.id === supplierId);
              const subtotal = calculateSubtotal(items);
              const isBelowMinimum = subtotal < (supplier?.minOrderValue || 0);

              return (
                <div key={supplierId} className="space-y-6">
                  <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl">
                    <div className="flex items-center space-x-3">
                      <img src={supplier?.logo} className="w-8 h-8 rounded-full border border-white shadow-sm" alt="" />
                      <span className="text-sm font-black text-gray-900">{supplier?.name}</span>
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mínimo: ${supplier?.minOrderValue}</span>
                  </div>

                  <div className="space-y-4">
                    {items.map(item => (
                      <div key={item.id} className="flex items-center space-x-4 group">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border bg-gray-50 shrink-0 shadow-sm"><img src={item.image} className="w-full h-full object-cover" /></div>
                        <div className="flex-1">
                          <h4 className="text-sm font-black text-gray-900 truncate">{item.name}</h4>
                          <p className="text-xs text-indigo-600 font-black">${item.price}</p>
                        </div>
                        <div className="flex items-center space-x-3 bg-gray-50 p-1 rounded-xl">
                          <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 bg-white text-gray-400 font-bold rounded-lg hover:text-indigo-600 shadow-sm">-</button>
                          <span className="text-sm font-black text-gray-900 w-4 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 bg-white text-gray-400 font-bold rounded-lg hover:text-indigo-600 shadow-sm">+</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center px-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subtotal Proveedor:</span>
                    <span className="text-xl font-black text-gray-900">${subtotal}</span>
                  </div>

                  {isBelowMinimum && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-6 space-y-4">
                       <p className="text-xs font-bold text-red-600 leading-tight">No alcanzas el mínimo para {supplier?.name}.</p>
                       <button onClick={() => clearCartBySupplier(supplierId)} className="w-full py-3 bg-white text-red-600 border border-red-200 rounded-xl font-black text-[10px] uppercase tracking-widest">Eliminar este grupo</button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-8 border-t bg-gray-50/50 space-y-6">
            <div className="flex justify-between items-end">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Consolidado</span>
              <span className="text-4xl font-black text-indigo-600 tracking-tighter">${total}</span>
            </div>
            <button 
              onClick={onConfirm}
              className="w-full bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black text-xl shadow-2xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
            >
              CONFIRMAR PEDIDO
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
