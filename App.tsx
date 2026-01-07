
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { UserRole, User, Product, CartItem, Supplier, Order, Message, Notification, CoverageArea } from './types';
import { CATEGORIES, URUGUAY_GEOGRAPHY } from './constants';
import Navbar from './components/Navbar';
import MerchantView from './components/MerchantView';
import SupplierDashboard from './components/SupplierDashboard';
import CartDrawer from './components/CartDrawer';

// --- SERVICIO DE PERSISTENCIA ---
const DB_KEYS = {
  USERS: 'b2b_users',
  PRODUCTS: 'b2b_products',
  ORDERS: 'b2b_orders',
  MESSAGES: 'b2b_messages',
  NOTIFICATIONS: 'b2b_notifications'
};

const Storage = {
  getUsers: (): User[] => JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]'),
  saveUser: (user: User) => {
    const users = Storage.getUsers();
    const idx = users.findIndex(u => u.id === user.id || u.email === user.email);
    if (idx !== -1) {
      users[idx] = user;
      localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
    } else {
      localStorage.setItem(DB_KEYS.USERS, JSON.stringify([...users, user]));
    }
  },
  getProducts: (): Product[] => JSON.parse(localStorage.getItem(DB_KEYS.PRODUCTS) || '[]'),
  saveProducts: (products: Product[]) => localStorage.setItem(DB_KEYS.PRODUCTS, JSON.stringify(products)),
  getOrders: (): Order[] => JSON.parse(localStorage.getItem(DB_KEYS.ORDERS) || '[]'),
  saveOrders: (orders: Order[]) => localStorage.setItem(DB_KEYS.ORDERS, JSON.stringify(orders)),
  getMessages: (): Message[] => JSON.parse(localStorage.getItem(DB_KEYS.MESSAGES) || '[]'),
  saveMessages: (msgs: Message[]) => localStorage.setItem(DB_KEYS.MESSAGES, JSON.stringify(msgs)),
  getNotifications: (): Notification[] => JSON.parse(localStorage.getItem(DB_KEYS.NOTIFICATIONS) || '[]'),
  saveNotifications: (notifs: Notification[]) => localStorage.setItem(DB_KEYS.NOTIFICATIONS, JSON.stringify(notifs))
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authStep, setAuthStep] = useState<'LANDING' | 'LOGIN' | 'REGISTER'>('LANDING');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [loginEmail, setLoginEmail] = useState('');
  
  // Estados para Registro
  const [regDepartment, setRegDepartment] = useState(URUGUAY_GEOGRAPHY[0].department);
  
  const [supplierTab, setSupplierTab] = useState<'inventory' | 'orders' | 'messages' | 'coverage'>('inventory');

  useEffect(() => {
    setAllProducts(Storage.getProducts());
    setOrders(Storage.getOrders());
    setRegisteredUsers(Storage.getUsers());
    setMessages(Storage.getMessages());
    setNotifications(Storage.getNotifications());
  }, []);

  const unreadMessagesCount = useMemo(() => {
    if (!user) return 0;
    return messages.filter(m => m.receiverId === user.id && !m.read).length;
  }, [messages, user]);

  const unreadNotifCount = useMemo(() => {
    if (!user) return 0;
    return notifications.filter(n => n.receiverId === user.id && !n.read).length;
  }, [notifications, user]);

  const userNotifications = useMemo(() => {
    if (!user) return [];
    return notifications.filter(n => n.receiverId === user.id);
  }, [notifications, user]);

  const handleSendMessage = (receiverId: string, text: string) => {
    if (!user) return;
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      senderId: user.id,
      receiverId,
      text,
      timestamp: new Date().toISOString(),
      read: false
    };
    const updated = [...messages, newMessage];
    setMessages(updated);
    Storage.saveMessages(updated);
  };

  const handleMarkAsRead = (senderId: string) => {
    if (!user) return;
    const updated = messages.map(m => (m.senderId === senderId && m.receiverId === user.id) ? { ...m, read: true } : m);
    setMessages(updated);
    Storage.saveMessages(updated);
  };

  const handleUpdateUserCoverage = (coverage: CoverageArea[]) => {
    if (!user) return;
    const updatedUser = { ...user, coverage };
    setUser(updatedUser);
    Storage.saveUser(updatedUser);
    setRegisteredUsers(Storage.getUsers());
  };

  const handleMarkOrderAsRead = (orderId: string) => {
    const orderToUpdate = orders.find(o => o.id === orderId);
    if (!orderToUpdate) return;

    const updatedOrders = orders.map(o => o.id === orderId ? { ...o, isReadBySupplier: true } : o);
    setOrders(updatedOrders);
    Storage.saveOrders(updatedOrders);
    
    let updatedNotifs = notifications.map(n => n.orderId === orderId && n.receiverId === user?.id ? { ...n, read: true } : n);
    
    if (user?.role === 'SUPPLIER' && !orderToUpdate.isReadBySupplier) {
      const merchantNotif: Notification = {
        id: `notif-read-${Date.now()}`,
        type: 'order',
        title: 'Pedido Abierto',
        message: `${user?.businessName} ha visto tu pedido #${orderId}.`,
        time: new Date().toISOString(),
        read: false,
        receiverId: orderToUpdate.merchantId,
        orderId: orderId
      };
      updatedNotifs = [merchantNotif, ...updatedNotifs];
    }

    setNotifications(updatedNotifs);
    Storage.saveNotifications(updatedNotifs);
    
    if (user?.role === 'SUPPLIER') setSupplierTab('orders');
    setIsNotifOpen(false);
  };

  const handleConfirmCart = () => {
    if (cart.length === 0 || !user) return;
    const orderId = `ord-${Date.now()}`;
    const supplierId = cart[0].supplierId;
    
    const newOrder: Order = {
      id: orderId,
      supplierId: supplierId,
      merchantId: user.id,
      merchantName: user.businessName,
      items: [...cart],
      total: cart.reduce((acc, i) => acc + (i.price * i.quantity), 0),
      status: 'pending',
      isReadBySupplier: false,
      createdAt: new Date().toISOString()
    };
    
    const updatedOrders = [...orders, newOrder];
    setOrders(updatedOrders);
    Storage.saveOrders(updatedOrders);

    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      type: 'order',
      title: 'Nuevo Pedido Recibido',
      message: `${user.businessName} ha enviado un pedido por $${newOrder.total}.`,
      time: new Date().toISOString(),
      read: false,
      receiverId: supplierId,
      orderId: orderId
    };
    const updatedNotifs = [newNotif, ...notifications];
    setNotifications(updatedNotifs);
    Storage.saveNotifications(updatedNotifs);

    setCart([]);
    setIsCartOpen(false);
    alert("¡Pedido confirmado! El distribuidor ha sido notificado.");
  };

  const handleUpdateProducts = (updatedSupplierProducts: Product[]) => {
    if (!user) return;
    setAllProducts(prev => {
      const otherSuppliersProducts = prev.filter(p => p.supplierId !== user.id);
      const updatedAllProducts = [...otherSuppliersProducts, ...updatedSupplierProducts];
      Storage.saveProducts(updatedAllProducts);
      return updatedAllProducts;
    });
  };

  const handleAuth = (e: React.FormEvent<HTMLFormElement>, mode: 'LOGIN' | 'REGISTER') => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const users = Storage.getUsers();

    if (mode === 'REGISTER') {
      const bName = formData.get('businessName') as string;
      const dept = formData.get('department') as string;
      const loc = formData.get('locality') as string;
      
      const newUser: User = { 
        id: `u-${Date.now()}`, 
        name: email.split('@')[0], 
        email, 
        role: selectedRole!, 
        businessName: bName, 
        isVerified: true,
        location: { department: dept, locality: loc },
        coverage: selectedRole === 'SUPPLIER' ? [] : undefined
      };
      Storage.saveUser(newUser);
      setRegisteredUsers(Storage.getUsers());
      setUser(newUser);
    } else {
      const found = users.find(u => u.email === email && u.role === selectedRole);
      if (found) setUser(found); else alert("Cuenta no encontrada.");
    }
  };

  if (!user) {
    const mainColor = selectedRole === 'MERCHANT' ? 'indigo' : 'emerald';
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        {authStep === 'LANDING' ? (
          <div className="bg-white rounded-[3.5rem] shadow-2xl p-12 max-w-lg w-full text-center space-y-10">
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-indigo-600 to-violet-600 w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl rotate-3">
                <svg className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h1 className="text-5xl font-black tracking-tighter text-slate-900 leading-tight">Uruguay B2B</h1>
              <p className="text-slate-400 font-bold text-lg uppercase tracking-widest leading-none">Red Mayorista Uruguay</p>
            </div>
            <div className="space-y-4">
               <button onClick={() => { setSelectedRole('MERCHANT'); setAuthStep('LOGIN'); }} className="w-full p-6 bg-indigo-50 text-indigo-700 rounded-3xl font-black text-xl hover:bg-indigo-100 transition-all flex items-center justify-between group">
                  <span>Soy Comerciante</span>
                  <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
               </button>
               <button onClick={() => { setSelectedRole('SUPPLIER'); setAuthStep('LOGIN'); }} className="w-full p-6 bg-emerald-50 text-emerald-700 rounded-3xl font-black text-xl hover:bg-emerald-100 transition-all flex items-center justify-between group">
                  <span>Soy Distribuidor</span>
                  <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
               </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[3rem] shadow-2xl max-w-md w-full overflow-hidden p-10 relative">
             <button onClick={() => { setAuthStep('LANDING'); setSelectedRole(null); }} className="absolute top-8 left-8 p-3 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all group">
                <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
             </button>
             <div className="flex justify-between items-center mb-8 mt-12">
               <h2 className="text-3xl font-black text-slate-900 tracking-tight">{authStep === 'LOGIN' ? 'Ingreso' : 'Registro'}</h2>
               <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${selectedRole === 'MERCHANT' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>{selectedRole === 'MERCHANT' ? 'Comercio' : 'Distribuidor'}</span>
             </div>
             <form onSubmit={(e) => handleAuth(e, authStep as any)} className="space-y-4">
                {authStep === 'REGISTER' && (
                  <>
                    <input name="businessName" type="text" placeholder="Nombre de tu Empresa" className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold outline-none" required />
                    <div className="grid grid-cols-2 gap-3">
                      <select name="department" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs" value={regDepartment} onChange={(e) => setRegDepartment(e.target.value)}>
                        {URUGUAY_GEOGRAPHY.map(g => <option key={g.department} value={g.department}>{g.department}</option>)}
                      </select>
                      <select name="locality" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs">
                        {URUGUAY_GEOGRAPHY.find(g => g.department === regDepartment)?.localities.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </>
                )}
                <input name="email" type="email" placeholder="email@empresa.com" className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold outline-none" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                <input name="password" type="password" placeholder="••••••••" className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold outline-none" required />
                <button type="submit" className={`w-full py-5 ${selectedRole === 'MERCHANT' ? 'bg-indigo-600' : 'bg-emerald-600'} text-white rounded-2xl font-black text-lg shadow-xl hover:opacity-90 transition-all active:scale-95`}>{authStep === 'LOGIN' ? 'Entrar' : 'Registrarse'}</button>
                <div className="text-center pt-6 space-y-4">
                  <button type="button" onClick={() => setAuthStep(authStep === 'LOGIN' ? 'REGISTER' : 'LOGIN')} className="text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 block w-full">{authStep === 'LOGIN' ? '¿Sin cuenta? Regístrate' : '¿Ya tienes cuenta? Ingresa'}</button>
                  <button type="button" onClick={() => { setAuthStep('LANDING'); setSelectedRole(null); }} className="text-slate-300 font-black text-[10px] uppercase tracking-[0.2em] hover:text-red-500 transition-colors">Volver al inicio</button>
                </div>
             </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar 
        user={user} 
        onLogout={() => setUser(null)} 
        onOpenCart={() => setIsCartOpen(true)} 
        onMessageClick={() => user.role === 'SUPPLIER' ? setSupplierTab('messages') : setIsInboxOpen(true)}
        onNotifClick={() => setIsNotifOpen(true)}
        cartCount={cart.reduce((acc, i) => acc + i.quantity, 0)} 
        messageCount={unreadMessagesCount}
        notifCount={unreadNotifCount}
      />
      <main className="flex-1">
        {user.role === 'MERCHANT' ? (
          <MerchantView 
            products={allProducts} 
            addToCart={(p) => {
              setCart(prev => {
                const existing = prev.find(item => item.id === p.id);
                if (existing) return prev.map(item => item.id === p.id ? { ...item, quantity: item.quantity + 1 } : item);
                return [...prev, { ...p, quantity: 1 }];
              });
              setIsCartOpen(true);
            }} 
            suppliers={registeredUsers.filter(u => u.role === 'SUPPLIER').map(u => ({ 
              id: u.id, 
              name: u.businessName, 
              logo: `https://picsum.photos/seed/${u.id}/200`, 
              description: '', 
              minOrderValue: 2000, 
              rating: 5,
              coverage: u.coverage 
            }))} 
            messages={messages}
            orders={orders.filter(o => o.merchantId === user.id)}
            currentUser={user}
            onSendMessage={handleSendMessage}
            onMarkAsRead={handleMarkAsRead}
          />
        ) : (
          <SupplierDashboard 
            supplier={{ id: user.id, name: user.businessName, logo: '', description: '', minOrderValue: 2000, rating: 5, coverage: user.coverage }} 
            products={allProducts.filter(p => p.supplierId === user.id)}
            orders={orders.filter(o => o.supplierId === user.id)}
            messages={messages}
            merchants={registeredUsers.filter(u => u.role === 'MERCHANT')}
            currentUser={user}
            activeTab={supplierTab}
            onTabChange={setSupplierTab}
            onReceiveOrder={handleMarkOrderAsRead}
            onSendMessage={handleSendMessage}
            onMarkAsRead={handleMarkAsRead}
            onUpdateProducts={handleUpdateProducts}
            onUpdateSupplier={() => {}}
            onUpdateCoverage={handleUpdateUserCoverage}
          />
        )}
      </main>

      {isNotifOpen && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsNotifOpen(false)} />
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-slide-in p-8">
            <h2 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">Mis Notificaciones</h2>
            <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide">
              {userNotifications.length === 0 ? (
                <div className="text-center pt-20">
                  <p className="text-slate-300 font-bold uppercase text-[10px] tracking-widest">No hay nuevas alertas</p>
                </div>
              ) : (
                userNotifications.map(n => (
                  <button key={n.id} onClick={() => n.orderId && handleMarkOrderAsRead(n.orderId)} className={`w-full p-5 rounded-3xl border text-left transition-all ${n.read ? 'bg-slate-50 border-transparent' : 'bg-indigo-50 border-indigo-100 shadow-md'}`}>
                    <p className="font-black text-slate-900 text-sm mb-1">{n.title}</p>
                    <p className="text-xs font-bold text-slate-500 leading-relaxed">{n.message}</p>
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-2 block">{new Date(n.time).toLocaleTimeString()}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} cart={cart} updateQuantity={(id, d) => setCart(prev => prev.map(i => i.id === id ? {...i, quantity: Math.max(1, i.quantity + d)} : i))} removeFromCart={(id) => setCart(prev => prev.filter(i => i.id !== id))} clearCartBySupplier={() => setCart([])} suppliers={registeredUsers.filter(u => u.role === 'SUPPLIER').map(u => ({ id: u.id, name: u.businessName, logo: '', description: '', minOrderValue: 2000, rating: 5, coverage: u.coverage }))} onConfirm={handleConfirmCart} />
    </div>
  );
};

export default App;
