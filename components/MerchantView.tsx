
import React, { useState, useMemo, useEffect } from 'react';
import { Product, Supplier, Message, User, Order, ConservationType, CoverageArea } from '../types';
import { CATEGORIES, URUGUAY_GEOGRAPHY, DAYS_OF_WEEK } from '../constants';
import * as XLSX from 'xlsx';

interface MerchantViewProps {
  products: Product[];
  addToCart: (p: Product) => void;
  suppliers: Supplier[];
  messages: Message[];
  orders: Order[];
  currentUser: User;
  onSendMessage: (receiverId: string, text: string) => void;
  onMarkAsRead: (senderId: string) => void;
}

const MerchantView: React.FC<MerchantViewProps> = ({ products, addToCart, suppliers, messages, orders, currentUser, onSendMessage, onMarkAsRead }) => {
  const [activeView, setActiveView] = useState<'market' | 'orders'>('market');
  const [messagingSupplier, setMessagingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplierProfile, setViewingSupplierProfile] = useState<Supplier | null>(null);
  const [messageText, setMessageText] = useState('');

  // --- ESTADOS DE FILTROS ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedConservation, setSelectedConservation] = useState<ConservationType | null>(null);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [onlyOnSale, setOnlyOnSale] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);
  
  // Filtros de Ubicación
  const [filterDept, setFilterDept] = useState<string | null>(null);
  const [filterLoc, setFilterLoc] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  useEffect(() => {
    if (messagingSupplier) onMarkAsRead(messagingSupplier.id);
  }, [messagingSupplier, messages.length]);

  const brands = useMemo(() => {
    const bSet = new Set<string>();
    products.forEach(p => bSet.add(p.brand));
    return Array.from(bSet).sort();
  }, [products]);

  const handleDownloadExcel = (order: Order) => {
    const supplier = suppliers.find(s => s.id === order.supplierId);
    const data = order.items.map(item => ({
      'Producto': item.name,
      'Marca': item.brand,
      'Cantidad': item.quantity,
      'Precio Unit.': item.price,
      'Total Item': item.price * item.quantity
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pedido");
    XLSX.writeFile(workbook, `Pedido_${supplier?.name}_${order.id}.xlsx`);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const supplier = suppliers.find(s => s.id === p.supplierId);
      
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.productNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !selectedCategory || p.category === selectedCategory;
      const matchesConservation = !selectedConservation || p.conservation === selectedConservation;
      
      const pMin = minPrice === '' ? 0 : parseFloat(minPrice);
      const pMax = maxPrice === '' ? Infinity : parseFloat(maxPrice);
      const matchesPrice = p.price >= pMin && p.price <= pMax;
      
      const matchesSale = !onlyOnSale || p.isSale;
      const matchesStock = !onlyInStock || p.stock > 0;
      const matchesBrand = !selectedBrand || p.brand === selectedBrand;

      let matchesLocation = true;
      if (filterDept && supplier) {
        const deptCoverage = supplier.coverage?.find(c => c.department === filterDept);
        if (!deptCoverage) {
          matchesLocation = false;
        } else if (filterLoc) {
          matchesLocation = deptCoverage.localities.some(l => l.name === filterLoc);
        }
      }

      return matchesSearch && matchesCategory && matchesConservation && matchesPrice && matchesSale && matchesStock && matchesBrand && matchesLocation;
    });
  }, [products, searchTerm, selectedCategory, selectedConservation, minPrice, maxPrice, onlyOnSale, onlyInStock, selectedBrand, filterDept, filterLoc, suppliers]);

  const groupedProducts = useMemo(() => {
    const map = new Map<string, Product[]>();
    filteredProducts.forEach(p => {
      const key = `${p.name}-${p.brand}`.toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return Array.from(map.values());
  }, [filteredProducts]);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory(null);
    setSelectedConservation(null);
    setMinPrice('');
    setMaxPrice('');
    setOnlyOnSale(false);
    setOnlyInStock(false);
    setSelectedBrand(null);
    setFilterDept(null);
    setFilterLoc(null);
  };

  const setMyAddressFilter = () => {
    if (currentUser.location) {
      setFilterDept(currentUser.location.department);
      setFilterLoc(currentUser.location.locality);
    }
  };

  const conversation = useMemo(() => {
    if (!messagingSupplier) return [];
    return messages.filter(m => (m.senderId === currentUser.id && m.receiverId === messagingSupplier.id) || (m.senderId === messagingSupplier.id && m.receiverId === currentUser.id)).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [messages, messagingSupplier, currentUser.id]);

  const handleSendMessage = () => {
    if (!messageText.trim() || !messagingSupplier) return;
    onSendMessage(messagingSupplier.id, messageText);
    setMessageText('');
  };

  const hasActiveFilters = searchTerm || selectedCategory || selectedConservation || minPrice || maxPrice || onlyOnSale || onlyInStock || selectedBrand || filterDept || filterLoc;

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-10">
      
      <div className="mb-10 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4">
          <button onClick={() => setActiveView('market')} className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeView === 'market' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white text-slate-400 hover:bg-slate-50'}`}>Mercado Mayorista</button>
          <button onClick={() => setActiveView('orders')} className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeView === 'orders' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white text-slate-400 hover:bg-slate-50'}`}>Mis Pedidos ({orders.length})</button>
        </div>
        
        {activeView === 'market' && hasActiveFilters && (
          <button onClick={resetFilters} className="text-red-500 font-black text-[10px] uppercase tracking-widest hover:bg-red-50 px-4 py-2 rounded-xl transition-all border border-red-100">Limpiar Filtros</button>
        )}
      </div>

      {activeView === 'market' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* BARRA LATERAL DE FILTROS */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8 sticky top-28 space-y-8 h-fit max-h-[85vh] overflow-y-auto scrollbar-hide">
              <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                Filtros
              </h3>

              <div className="space-y-4 pt-4 border-t border-slate-50">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ubicación de Reparto</label>
                  <button onClick={setMyAddressFilter} className="text-[9px] font-black text-indigo-600 uppercase hover:underline">Usar mi dirección</button>
                </div>
                <div className="space-y-3">
                  <select 
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs outline-none border-none cursor-pointer"
                    value={filterDept || ''}
                    onChange={(e) => { setFilterDept(e.target.value || null); setFilterLoc(null); }}
                  >
                    <option value="">Todo el país</option>
                    {URUGUAY_GEOGRAPHY.map(g => <option key={g.department} value={g.department}>{g.department}</option>)}
                  </select>
                  
                  {filterDept && (
                    <select 
                      className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs outline-none border-none cursor-pointer animate-in fade-in slide-in-from-top-1"
                      value={filterLoc || ''}
                      onChange={(e) => setFilterLoc(e.target.value || null)}
                    >
                      <option value="">Todas las ciudades</option>
                      {URUGUAY_GEOGRAPHY.find(g => g.department === filterDept)?.localities.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Palabra Clave</label>
                <input type="text" placeholder="Producto, marca o SKU..." className="w-full pl-5 py-4 bg-slate-50 border-none rounded-2xl font-bold outline-none text-xs focus:ring-2 focus:ring-indigo-100 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)} className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${selectedCategory === cat ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'}`}>{cat}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio (UYU)</label>
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="Min" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs outline-none" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
                  <span className="text-slate-300 font-bold">-</span>
                  <input type="number" placeholder="Max" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs outline-none" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conservación</label>
                <div className="grid grid-cols-1 gap-2">
                  {Object.values(ConservationType).map(type => (
                    <button key={type} onClick={() => setSelectedConservation(selectedConservation === type ? null : type)} className={`w-full p-4 rounded-2xl text-[10px] font-black uppercase text-left transition-all border ${selectedConservation === type ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'}`}>{type}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-50">
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Solo Ofertas</span>
                  <div onClick={() => setOnlyOnSale(!onlyOnSale)} className={`w-10 h-6 rounded-full transition-all relative ${onlyOnSale ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${onlyOnSale ? 'left-5' : 'left-1'}`} />
                  </div>
                </label>
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">En Stock</span>
                  <div onClick={() => setOnlyInStock(!onlyInStock)} className={`w-10 h-6 rounded-full transition-all relative ${onlyInStock ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${onlyInStock ? 'left-5' : 'left-1'}`} />
                  </div>
                </label>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Marca</label>
                <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs outline-none appearance-none cursor-pointer" value={selectedBrand || ''} onChange={e => setSelectedBrand(e.target.value || null)}>
                  <option value="">Todas las marcas</option>
                  {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* LISTADO DE PRODUCTOS */}
          <div className="lg:col-span-9 space-y-10">
            <div className="flex items-center justify-between px-4">
               <h2 className="text-2xl font-black text-slate-900 tracking-tighter">Explorar Productos <span className="text-slate-300 font-bold ml-2">({filteredProducts.length})</span></h2>
               {filterDept && (
                 <div className="bg-indigo-50 px-4 py-2 rounded-xl flex items-center gap-2">
                   <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                   <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Llegan a: {filterLoc || filterDept}</span>
                 </div>
               )}
            </div>

            <div className="grid grid-cols-1 gap-8">
              {groupedProducts.length === 0 ? (
                <div className="bg-white p-32 rounded-[3rem] text-center border border-dashed">
                  <p className="text-slate-300 font-black uppercase text-xs tracking-widest">No hay productos que coincidan con los filtros</p>
                  <button onClick={resetFilters} className="mt-6 text-indigo-600 font-black text-[10px] uppercase">Mostrar todo</button>
                </div>
              ) : (
                groupedProducts.map((group, idx) => (
                  <div key={idx} className="bg-white rounded-[3rem] overflow-hidden shadow-sm border border-slate-100 group transition-all hover:shadow-xl hover:shadow-indigo-50 hover:-translate-y-1">
                    <div className="p-8 border-b bg-slate-50/30 flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <img src={group[0].image} className="w-20 h-20 rounded-[1.8rem] bg-white object-cover shadow-sm" />
                        <div>
                          <h3 className="text-2xl font-black text-slate-900 leading-none">{group[0].name}</h3>
                          <div className="flex items-center gap-3 mt-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{group[0].brand}</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{group[0].category}</span>
                            {group[0].conservation !== ConservationType.DRY && (
                              <>
                                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{group[0].conservation}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {group[0].isSale && <span className="bg-red-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase animate-pulse">Oferta</span>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-slate-100">
                      {group.map(p => {
                        const s = suppliers.find(sup => sup.id === p.supplierId);
                        const noStock = p.stock <= 0;
                        return (
                          <div key={p.id} className="p-8 hover:bg-slate-50/50 transition-all flex flex-col justify-between">
                            <div className="space-y-4">
                               <button 
                                 onClick={() => s && setViewingSupplierProfile(s)}
                                 className="flex items-center gap-3 hover:bg-slate-100 p-2 -ml-2 rounded-xl transition-all text-left"
                               >
                                 <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center font-black text-[12px] text-slate-500 overflow-hidden shadow-sm">
                                   {s?.logo ? <img src={s.logo} className="w-full h-full object-cover" /> : s?.name[0]}
                                 </div>
                                 <div className="min-w-0">
                                   <p className="text-[10px] font-black text-gray-900 truncate flex items-center gap-1.5">
                                      {s?.name}
                                      <svg className="w-2.5 h-2.5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" /><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" /></svg>
                                   </p>
                                   <p className="text-[8px] font-bold text-slate-400 uppercase">Stock: {p.stock} {p.unit}</p>
                                 </div>
                               </button>
                               <div className="flex items-baseline gap-2">
                                 <p className="text-3xl font-black text-slate-900 tracking-tighter">${p.price}</p>
                                 {p.oldPrice && <p className="text-sm text-slate-300 line-through font-bold">${p.oldPrice}</p>}
                               </div>
                            </div>
                            <button 
                              disabled={noStock}
                              onClick={() => addToCart(p)} 
                              className={`w-full mt-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg ${noStock ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                            >
                              {noStock ? 'Sin Stock' : 'Añadir'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
           {orders.length === 0 ? (
             <div className="text-center py-40 bg-white rounded-[3rem] shadow-sm border border-slate-100"><p className="text-slate-300 font-black uppercase text-xs tracking-widest">No has enviado pedidos aún</p></div>
           ) : (
             orders.map(o => {
               const s = suppliers.find(sup => sup.id === o.supplierId);
               return (
                 <div key={o.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-8 flex items-center justify-between bg-slate-50/50">
                       <div className="flex items-center gap-6">
                          <button 
                             onClick={() => s && setViewingSupplierProfile(s)}
                             className="w-16 h-16 bg-white rounded-3xl border shadow-sm flex items-center justify-center font-black text-indigo-600 overflow-hidden hover:scale-105 transition-transform"
                          >
                            {s?.logo ? <img src={s.logo} className="w-full h-full object-cover" /> : s?.name[0]}
                          </button>
                          <div>
                             <h4 className="text-2xl font-black text-slate-900 tracking-tight">{s?.name}</h4>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enviado: {new Date(o.createdAt).toLocaleDateString()}</p>
                          </div>
                       </div>
                       <div className="text-right flex items-center gap-8">
                          <div>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Estado</p>
                             {o.isReadBySupplier ? (
                               <span className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-black uppercase"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>Leído</span>
                             ) : (
                               <span className="text-amber-500 text-[10px] font-black uppercase flex items-center gap-1.5"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Pendiente</span>
                             )}
                          </div>
                          <button onClick={() => handleDownloadExcel(o)} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-700 shadow-lg transition-all flex items-center gap-2">Descargar Excel</button>
                       </div>
                    </div>
                 </div>
               );
             })
           )}
        </div>
      )}

      {/* MODAL PERFIL DEL DISTRIBUIDOR */}
      {viewingSupplierProfile && (
        <div className="fixed inset-0 z-[400] bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4">
           <div className="bg-white rounded-[3.5rem] w-full max-w-4xl shadow-2xl flex flex-col h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="relative h-48 bg-gradient-to-br from-emerald-500 to-teal-600 shrink-0">
                 <button 
                   onClick={() => setViewingSupplierProfile(null)}
                   className="absolute top-8 right-8 p-3 bg-white/20 text-white rounded-2xl hover:bg-white/40 transition-all backdrop-blur-md"
                 >
                   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
                 <div className="absolute -bottom-16 left-12 flex items-end gap-8">
                    <div className="w-40 h-40 bg-white rounded-[3rem] shadow-2xl border-[10px] border-white overflow-hidden flex items-center justify-center font-black text-6xl text-emerald-600">
                      {viewingSupplierProfile.logo ? <img src={viewingSupplierProfile.logo} className="w-full h-full object-cover" /> : viewingSupplierProfile.name[0]}
                    </div>
                    <div className="pb-4">
                       <h2 className="text-4xl font-black text-white tracking-tighter drop-shadow-md">{viewingSupplierProfile.name}</h2>
                       <div className="flex items-center gap-2 mt-2">
                          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.9L10 1.554 17.834 4.9c.5.213.834.704.834 1.257V11.1c0 5.223-3.436 9.596-8.334 10.9-4.898-1.304-8.334-5.677-8.334-10.9V6.157c0-.553.334-1.044.834-1.257zM10 19.39c4.128-1.127 7-5.116 7-9.29V6.157l-7-3-7 3v4.133c0 4.174 2.872 8.163 7 9.29zM12.707 7.293a1 1 0 010 1.414L9.414 12l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>Distribuidor Verificado</span>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="flex-1 mt-20 p-12 overflow-y-auto scrollbar-hide flex flex-col md:flex-row gap-12">
                 <div className="flex-1 space-y-10">
                    <div className="space-y-4">
                       <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Información Mayorista</h3>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                             <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Pedido Mínimo</p>
                             <p className="text-2xl font-black text-slate-900">${viewingSupplierProfile.minOrderValue}</p>
                          </div>
                          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                             <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Calificación</p>
                             <div className="flex items-center gap-1.5">
                                <span className="text-2xl font-black text-slate-900">{viewingSupplierProfile.rating}</span>
                                <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zonas y Horarios de Reparto</h3>
                       <div className="space-y-4">
                          {!viewingSupplierProfile.coverage || viewingSupplierProfile.coverage.length === 0 ? (
                            <p className="text-slate-300 font-bold italic text-sm">Este distribuidor no ha especificado sus zonas de reparto.</p>
                          ) : (
                            viewingSupplierProfile.coverage.map(c => (
                              <div key={c.department} className="bg-white border rounded-[2rem] p-6 space-y-4">
                                 <div className="flex items-center justify-between border-b pb-3">
                                    <span className="font-black text-emerald-600 text-sm uppercase tracking-tight">{c.department}</span>
                                    <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[9px] font-black">{c.localities.length} Localidades</span>
                                 </div>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {c.localities.map(l => (
                                      <div key={l.name} className="space-y-2">
                                         <p className="text-xs font-black text-slate-900">{l.name}</p>
                                         <div className="flex gap-1.5 items-center">
                                            <div className="flex gap-1">
                                               {DAYS_OF_WEEK.map(d => (
                                                 <span key={d} className={`w-4 h-4 rounded text-[8px] flex items-center justify-center font-black ${l.schedule.days.includes(d) ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-300'}`}>{d[0]}</span>
                                               ))}
                                            </div>
                                            <span className="text-[8px] font-black text-slate-400 uppercase">{l.schedule.hours}</span>
                                         </div>
                                      </div>
                                    ))}
                                 </div>
                              </div>
                            ))
                          )}
                       </div>
                    </div>
                 </div>

                 <div className="w-full md:w-[300px] space-y-8">
                    <div className="bg-indigo-50 rounded-[2.5rem] p-8 space-y-6">
                       <h4 className="text-indigo-900 font-black uppercase text-[10px] tracking-widest text-center">Acciones Directas</h4>
                       <button 
                         onClick={() => {
                           setMessagingSupplier(viewingSupplierProfile);
                           setViewingSupplierProfile(null);
                         }}
                         className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all"
                       >
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                         Contactar
                       </button>
                    </div>

                    <div className="p-8 border-2 border-slate-100 rounded-[2.5rem] space-y-4">
                       <p className="text-[9px] font-bold text-slate-400 text-center uppercase leading-relaxed">Este perfil es público para todos los comerciantes registrados en B2B Connect.</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL DE CHAT */}
      {messagingSupplier && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white rounded-[3.5rem] w-full max-w-lg shadow-2xl flex flex-col h-[80vh] overflow-hidden">
              <div className="p-8 border-b flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center font-black text-indigo-600 overflow-hidden">
                    {messagingSupplier.logo ? <img src={messagingSupplier.logo} className="w-full h-full object-cover" /> : messagingSupplier.name[0]}
                  </div>
                  <h3 className="text-xl font-black text-slate-900">{messagingSupplier.name}</h3>
                </div>
                <button onClick={() => setMessagingSupplier(null)} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all text-slate-400 hover:text-slate-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/20 scrollbar-hide">
                {conversation.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-300">
                    <p className="text-[10px] font-black uppercase tracking-widest">Inicia una conversación con {messagingSupplier.name}</p>
                  </div>
                ) : (
                  conversation.map(m => (
                    <div key={m.id} className={`flex ${m.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-5 rounded-3xl max-w-[80%] ${m.senderId === currentUser.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-700 shadow-sm border border-slate-100'}`}>
                        <p className="font-bold text-sm leading-relaxed">{m.text}</p>
                        <span className={`text-[8px] font-black uppercase mt-2 block ${m.senderId === currentUser.id ? 'text-indigo-200' : 'text-slate-300'}`}>{new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-8 border-t flex gap-4 bg-white">
                <input 
                  type="text" 
                  placeholder="Escribir mensaje..." 
                  className="flex-1 bg-slate-50 p-5 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-sm" 
                  value={messageText} 
                  onChange={e => setMessageText(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()} 
                />
                <button 
                  onClick={handleSendMessage} 
                  className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl hover:bg-indigo-700 active:scale-90 transition-all shrink-0"
                >
                  <svg className="w-6 h-6 rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default MerchantView;
