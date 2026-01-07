
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Supplier, Product, ConservationType, Order, Message, User, CoverageArea, LocalityCoverage, DeliverySchedule } from '../types';
import { CATEGORIES, URUGUAY_GEOGRAPHY, DAYS_OF_WEEK } from '../constants';
import * as XLSX from 'xlsx';

interface SupplierDashboardProps {
  supplier: Supplier;
  products: Product[];
  orders: Order[];
  messages: Message[];
  merchants: User[];
  currentUser: User;
  activeTab: 'inventory' | 'orders' | 'messages' | 'coverage';
  onTabChange: (tab: 'inventory' | 'orders' | 'messages' | 'coverage') => void;
  onReceiveOrder: (orderId: string) => void;
  onSendMessage: (receiverId: string, text: string) => void;
  onMarkAsRead: (senderId: string) => void;
  onUpdateProducts: (products: Product[]) => void;
  onUpdateSupplier: (supplier: Supplier) => void;
  onUpdateCoverage: (coverage: CoverageArea[]) => void;
}

const SupplierDashboard: React.FC<SupplierDashboardProps> = ({ supplier, products, orders, messages, merchants, currentUser, activeTab, onTabChange, onReceiveOrder, onSendMessage, onMarkAsRead, onUpdateProducts, onUpdateSupplier, onUpdateCoverage }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ ids: string[], label: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Estados para Cobertura
  const [activeDept, setActiveDept] = useState(URUGUAY_GEOGRAPHY[0].department);
  const [localCoverage, setLocalCoverage] = useState<CoverageArea[]>(currentUser.coverage || []);
  const [editingLocality, setEditingLocality] = useState<string | null>(null);
  const [tempSchedule, setTempSchedule] = useState<DeliverySchedule>({ days: [], hours: '08:00 - 18:00' });

  const bulkFileRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedMerchantId && activeTab === 'messages') onMarkAsRead(selectedMerchantId);
  }, [selectedMerchantId, activeTab, messages.length]);

  useEffect(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), [selectedMerchantId, messages]);

  const toggleLocality = (dept: string, locName: string) => {
    setLocalCoverage(prev => {
      const deptEntry = prev.find(c => c.department === dept);
      let newCoverage;
      if (deptEntry) {
        const isSelected = deptEntry.localities.some(l => l.name === locName);
        if (isSelected) {
          const updatedLocalities = deptEntry.localities.filter(l => l.name !== locName);
          if (updatedLocalities.length === 0) {
            newCoverage = prev.filter(c => c.department !== dept);
          } else {
            newCoverage = prev.map(c => c.department === dept ? { ...c, localities: updatedLocalities } : c);
          }
        } else {
          newCoverage = prev.map(c => c.department === dept ? { ...c, localities: [...c.localities, { name: locName, schedule: { days: [], hours: '08:00 - 18:00' } }] } : c);
        }
      } else {
        newCoverage = [...prev, { department: dept, localities: [{ name: locName, schedule: { days: [], hours: '08:00 - 18:00' } }] }];
      }
      onUpdateCoverage(newCoverage);
      return newCoverage;
    });
    setEditingLocality(locName);
  };

  const updateLocalitySchedule = (dept: string, locName: string, schedule: DeliverySchedule) => {
    setLocalCoverage(prev => {
      const newCoverage = prev.map(c => {
        if (c.department === dept) {
          return {
            ...c,
            localities: c.localities.map(l => l.name === locName ? { ...l, schedule } : l)
          };
        }
        return c;
      });
      onUpdateCoverage(newCoverage);
      return newCoverage;
    });
  };

  const applyScheduleToAllInDept = (dept: string) => {
    setLocalCoverage(prev => {
      const newCoverage = prev.map(c => {
        if (c.department === dept) {
          return {
            ...c,
            localities: c.localities.map(l => ({ ...l, schedule: { ...tempSchedule } }))
          };
        }
        return c;
      });
      onUpdateCoverage(newCoverage);
      return newCoverage;
    });
    alert(`Horario aplicado a todas las localidades de ${dept}`);
  };

  const toggleDayInTemp = (day: string) => {
    setTempSchedule(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day]
    }));
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(sheet);
        const newProducts: Product[] = json.map((row, idx) => ({
          id: `p-bulk-${Date.now()}-${idx}`,
          productNumber: String(row.SKU || row.ID || row.Codigo || `ART-${idx}`),
          supplierId: supplier.id,
          name: String(row.Nombre || row.Producto || 'Nuevo Producto'),
          description: String(row.Descripcion || ''),
          category: String(row.Categoria || CATEGORIES[0]),
          brand: String(row.Marca || 'Genérica'),
          price: Number(row.Precio || 0),
          stock: Number(row.Stock || 100),
          minStock: Number(row.Minimo || 10),
          unit: String(row.Unidad || 'Unidad'),
          conservation: ConservationType.DRY,
          image: `https://picsum.photos/seed/${idx + Math.random()}/400`,
          isSale: Boolean(row.Oferta)
        }));
        onUpdateProducts([...products, ...newProducts]);
        alert(`¡Éxito! Se cargaron ${newProducts.length} productos.`);
      } catch (err) { alert("Error al procesar el Excel."); } 
      finally { setIsUploading(false); if (bulkFileRef.current) bulkFileRef.current.value = ''; }
    };
    reader.readAsBinaryString(file);
  };

  const handleDownloadExcel = (order: Order) => {
    const data = order.items.map(item => ({ 'Producto': item.name, 'Marca': item.brand, 'SKU': item.productNumber, 'Cantidad': item.quantity, 'Precio Unit.': item.price, 'Subtotal': item.price * item.quantity }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Detalle de Pedido");
    XLSX.writeFile(workbook, `Pedido_${order.merchantName}_${order.id}.xlsx`);
  };

  const handleSaveProduct = () => {
    if (!editingProduct) return;
    const isNew = !editingProduct.id;
    const productData: Product = { ...editingProduct, id: editingProduct.id || `p-${Date.now()}`, supplierId: supplier.id, image: editingProduct.image || `https://picsum.photos/seed/${Date.now()}/400`, productNumber: editingProduct.productNumber || `ART-${Date.now()}`, category: editingProduct.category || CATEGORIES[0], brand: editingProduct.brand || 'Genérica', conservation: ConservationType.DRY, unit: editingProduct.unit || 'Unidad', price: editingProduct.price || 0, stock: editingProduct.stock !== undefined ? editingProduct.stock : 100, minStock: editingProduct.minStock || 5, name: editingProduct.name || 'Producto sin nombre', isSale: editingProduct.isSale || false } as Product;
    onUpdateProducts(isNew ? [...products, productData] : products.map(p => p.id === productData.id ? productData : p));
    setIsEditing(false); setEditingProduct(null);
  };

  const handleExecuteDelete = () => {
    if (!deleteModal) return;
    const idsToRemove = new Set(deleteModal.ids);
    onUpdateProducts(products.filter(p => !idsToRemove.has(p.id)));
    setDeleteModal(null); setSelectedIds([]);
  };

  const myMessages = useMemo(() => messages.filter(m => m.receiverId === currentUser.id || m.senderId === currentUser.id), [messages, currentUser.id]);
  const merchantConversations = useMemo(() => {
    const map = new Map<string, { msgs: Message[], unread: boolean }>();
    myMessages.forEach(m => {
      const partnerId = m.senderId === currentUser.id ? m.receiverId : m.senderId;
      if (!map.has(partnerId)) map.set(partnerId, { msgs: [], unread: false });
      const entry = map.get(partnerId)!;
      entry.msgs.push(m);
      if (m.receiverId === currentUser.id && !m.read) entry.unread = true;
    });
    return Array.from(map.entries()).sort((a, b) => {
      const lastA = [...a[1].msgs].sort((x, y) => new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime())[0];
      const lastB = [...b[1].msgs].sort((x, y) => new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime())[0];
      return new Date(lastB.timestamp).getTime() - new Date(lastA.timestamp).getTime();
    });
  }, [myMessages, currentUser.id]);

  const activeChatMessages = useMemo(() => {
    if (!selectedMerchantId) return [];
    return myMessages.filter(m => m.senderId === selectedMerchantId || m.receiverId === selectedMerchantId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [myMessages, selectedMerchantId]);

  const selectedMerchant = useMemo(() => merchants.find(m => m.id === selectedMerchantId), [merchants, selectedMerchantId]);

  // Sincronizar tempSchedule cuando cambia la localidad editada
  useEffect(() => {
    if (editingLocality) {
      const currentLoc = localCoverage.find(c => c.department === activeDept)?.localities.find(l => l.name === editingLocality);
      if (currentLoc) setTempSchedule(currentLoc.schedule);
    }
  }, [editingLocality, activeDept]);

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-10 space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-6">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Panel Distribuidor</h2>
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 inline-flex flex-wrap">
            {[
              { id: 'inventory', label: 'Inventario' },
              { id: 'orders', label: `Pedidos (${orders.length})` },
              { id: 'messages', label: 'Chat' },
              { id: 'coverage', label: 'Zonas de Reparto' }
            ].map((tab) => (
              <button key={tab.id} onClick={() => onTabChange(tab.id as any)} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-400 hover:text-slate-600'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'inventory' && (
          <div className="flex gap-4 items-center">
            {selectedIds.length > 0 && <button onClick={() => setDeleteModal({ ids: selectedIds, label: `${selectedIds.length} productos` })} className="bg-red-50 text-red-600 px-8 py-4 rounded-2xl font-black hover:bg-red-100 transition-all flex items-center gap-2">Eliminar ({selectedIds.length})</button>}
            <button onClick={() => bulkFileRef.current?.click()} className="bg-emerald-50 text-emerald-600 px-8 py-4 rounded-2xl font-black hover:bg-emerald-100 transition-all flex items-center gap-2">Carga Masiva</button>
            <button onClick={() => { setEditingProduct({ isSale: false, stock: 100 }); setIsEditing(true); }} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-emerald-700 transition-all active:scale-95">Nuevo Ítem</button>
            <input type="file" ref={bulkFileRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleBulkUpload} />
          </div>
        )}
      </div>

      <div className="animate-in fade-in duration-500">
        {activeTab === 'inventory' && (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
             <table className="w-full">
               <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                 <tr>
                   <th className="px-8 py-6 text-left"><input type="checkbox" className="w-5 h-5" checked={products.length > 0 && selectedIds.length === products.length} onChange={() => setSelectedIds(selectedIds.length === products.length ? [] : products.map(p => p.id))} /></th>
                   <th className="px-4 py-6 text-left">Producto</th>
                   <th className="px-8 py-6 text-left">Precio</th>
                   <th className="px-8 py-6 text-left">Stock</th>
                   <th className="px-8 py-6 text-right">Acciones</th>
                 </tr>
               </thead>
               <tbody className="divide-y">
                 {products.map(p => (
                   <tr key={p.id} className={`hover:bg-slate-50 ${selectedIds.includes(p.id) ? 'bg-emerald-50/30' : ''}`}>
                     <td className="px-8 py-5"><input type="checkbox" className="w-5 h-5" checked={selectedIds.includes(p.id)} onChange={() => setSelectedIds(prev => prev.includes(p.id) ? prev.filter(i => i !== p.id) : [...prev, p.id])} /></td>
                     <td className="px-4 py-5 flex items-center gap-4"><img src={p.image} className="w-12 h-12 rounded-xl border object-cover" /><div><div className="font-black text-slate-900">{p.name}</div><div className="text-[9px] font-bold text-slate-400">{p.brand}</div></div></td>
                     <td className="px-8 py-5 font-black text-slate-900">${p.price}</td>
                     <td className="px-8 py-5"><span className={`px-4 py-1.5 rounded-xl text-xs font-black ${p.stock <= p.minStock ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-700'}`}>{p.stock}</span></td>
                     <td className="px-8 py-5 text-right"><button onClick={() => { setEditingProduct(p); setIsEditing(true); }} className="p-2 text-emerald-600">Editar</button></td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        )}

        {activeTab === 'coverage' && (
          <div className="flex flex-col gap-8 h-full">
             <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col md:flex-row min-h-[750px]">
                {/* Sidebar Departamentos */}
                <div className="w-full md:w-[280px] bg-slate-50 border-r flex flex-col">
                   <div className="p-6 border-b bg-white"><h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">Departamentos</h3></div>
                   <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                     {URUGUAY_GEOGRAPHY.map(g => {
                       const deptCoverage = localCoverage.find(c => c.department === g.department);
                       const count = deptCoverage?.localities.length || 0;
                       return (
                         <button 
                           key={g.department} 
                           onClick={() => { setActiveDept(g.department); setEditingLocality(null); }}
                           className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all group ${activeDept === g.department ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-emerald-50'}`}
                         >
                           <span className="font-black text-sm">{g.department}</span>
                           {count > 0 && <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeDept === g.department ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-600'}`}>{count}</span>}
                         </button>
                       );
                     })}
                   </div>
                </div>

                {/* Centro: Localidades */}
                <div className="flex-1 flex flex-col bg-white">
                   <div className="p-8 border-b flex items-center justify-between">
                      <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{activeDept}</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Elige ciudades para reparto en este departamento</p>
                      </div>
                   </div>
                   <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 sm:grid-cols-2 gap-4 scrollbar-hide">
                      {URUGUAY_GEOGRAPHY.find(g => g.department === activeDept)?.localities.map(loc => {
                        const isSelected = localCoverage.find(c => c.department === activeDept)?.localities.some(l => l.name === loc);
                        const locData = localCoverage.find(c => c.department === activeDept)?.localities.find(l => l.name === loc);
                        return (
                          <div 
                            key={loc}
                            onClick={() => toggleLocality(activeDept, loc)}
                            className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all flex flex-col justify-between ${isSelected ? (editingLocality === loc ? 'border-emerald-500 bg-emerald-50 shadow-inner' : 'border-emerald-200 bg-emerald-50/30') : 'border-slate-50 hover:border-slate-200 bg-white'}`}
                          >
                             <div className="flex items-center justify-between mb-4">
                               <span className={`font-black text-sm ${isSelected ? 'text-emerald-700' : 'text-slate-500'}`}>{loc}</span>
                               <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-100'}`}>
                                 {isSelected && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                               </div>
                             </div>
                             {isSelected && (
                               <div className="space-y-2">
                                  <div className="flex flex-wrap gap-1">
                                    {DAYS_OF_WEEK.map(d => (
                                      <span key={d} className={`text-[8px] font-black w-5 h-5 flex items-center justify-center rounded-md ${locData?.schedule.days.includes(d) ? 'bg-emerald-600 text-white' : 'bg-white text-slate-300'}`}>{d[0]}</span>
                                    ))}
                                  </div>
                                  <p className="text-[9px] font-black text-emerald-600/60 uppercase">{locData?.schedule.hours}</p>
                               </div>
                             )}
                          </div>
                        );
                      })}
                   </div>
                </div>

                {/* Derecha: Configuración Logística */}
                <div className="w-full md:w-[350px] border-l bg-slate-50 flex flex-col">
                   <div className="p-6 border-b bg-white flex items-center justify-between">
                      <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">Logística</h3>
                      {editingLocality && <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">Editando ciudad</span>}
                   </div>
                   
                   <div className="flex-1 p-8 space-y-10 overflow-y-auto scrollbar-hide">
                      {!editingLocality ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-slate-300 space-y-4">
                           <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                           </div>
                           <p className="font-black uppercase text-[10px] tracking-widest leading-relaxed">Selecciona una ciudad para configurar sus días y horarios de entrega</p>
                        </div>
                      ) : (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                           <div className="space-y-4">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Días de Reparto</label>
                              <div className="grid grid-cols-2 gap-2">
                                 {DAYS_OF_WEEK.map(day => (
                                   <button 
                                      key={day}
                                      onClick={() => {
                                        const newDays = tempSchedule.days.includes(day) ? tempSchedule.days.filter(d => d !== day) : [...tempSchedule.days, day];
                                        const newSched = { ...tempSchedule, days: newDays };
                                        setTempSchedule(newSched);
                                        updateLocalitySchedule(activeDept, editingLocality, newSched);
                                      }}
                                      className={`p-3 rounded-xl text-[10px] font-black uppercase transition-all border ${tempSchedule.days.includes(day) ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-200'}`}
                                   >
                                      {day}
                                   </button>
                                 ))}
                              </div>
                           </div>

                           <div className="space-y-4">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Franja Horaria</label>
                              <input 
                                 type="text" 
                                 className="w-full bg-white border-2 border-slate-100 p-5 rounded-2xl font-bold text-slate-700 outline-none focus:border-emerald-500 transition-all"
                                 placeholder="Ej: 08:00 a 16:00"
                                 value={tempSchedule.hours}
                                 onChange={(e) => {
                                   const newSched = { ...tempSchedule, hours: e.target.value };
                                   setTempSchedule(newSched);
                                   updateLocalitySchedule(activeDept, editingLocality, newSched);
                                 }}
                              />
                           </div>

                           <div className="pt-6 border-t space-y-4">
                              <p className="text-[10px] font-bold text-slate-400 leading-relaxed italic text-center">Puedes aplicar este mismo horario a todas tus localidades seleccionadas en {activeDept}.</p>
                              <button 
                                 onClick={() => applyScheduleToAllInDept(activeDept)}
                                 className="w-full py-5 bg-white border-2 border-emerald-100 text-emerald-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-sm"
                              >
                                 Aplicar a todo {activeDept}
                              </button>
                           </div>
                        </div>
                      )}
                   </div>
                </div>
             </div>

             {/* Resumen Global Inferior */}
             <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm overflow-hidden">
                <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tight">Tu Red de Distribución Actual</h3>
                {localCoverage.length === 0 ? (
                  <p className="text-slate-300 font-bold uppercase text-[10px] tracking-widest text-center py-10">Aún no has definido zonas de cobertura</p>
                ) : (
                  <div className="flex flex-wrap gap-4">
                    {localCoverage.map(c => (
                      <div key={c.department} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 min-w-[250px] space-y-4">
                         <div className="flex justify-between items-center border-b pb-3">
                            <span className="font-black text-emerald-600 text-xs uppercase">{c.department}</span>
                            <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[9px] font-black">{c.localities.length}</span>
                         </div>
                         <div className="space-y-3">
                            {c.localities.map(l => (
                              <div key={l.name} className="flex justify-between items-center">
                                 <span className="text-[10px] font-bold text-slate-500">{l.name}</span>
                                 <div className="flex gap-1">
                                    {l.schedule.days.map(d => (
                                      <span key={d} className="w-4 h-4 rounded bg-emerald-100 text-emerald-700 text-[7px] flex items-center justify-center font-black">{d[0]}</span>
                                    ))}
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-8 max-w-5xl mx-auto">
            {orders.length === 0 ? <div className="bg-white p-20 rounded-[3rem] text-center border">No hay pedidos</div> : orders.map(o => (
              <div key={o.id} className={`bg-white rounded-[2.5rem] shadow-xl border-l-[12px] overflow-hidden ${o.isReadBySupplier ? 'border-l-slate-200' : 'border-l-emerald-500 shadow-emerald-50'}`}>
                <div className="p-8 flex items-center justify-between">
                  <div><h3 className="text-2xl font-black text-slate-900">{o.merchantName}</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {o.id} • {new Date(o.createdAt).toLocaleDateString()}</p></div>
                  <div className="text-right"><p className="text-3xl font-black text-slate-900">${o.total}</p></div>
                  <div className="flex gap-3"><button onClick={() => handleDownloadExcel(o)} className="px-8 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-xs">Exportar</button>{!o.isReadBySupplier && <button onClick={() => onReceiveOrder(o.id)} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs">Ver Pedido</button>}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 h-[700px] flex overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30">
              {selectedMerchantId && selectedMerchant ? (
                <>
                  <div className="p-6 bg-white border-b flex items-center justify-between">
                    <div className="flex items-center gap-4"><div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl">{selectedMerchant.businessName[0].toUpperCase()}</div><h3 className="text-lg font-black text-slate-900 leading-none">{selectedMerchant.businessName}</h3></div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 space-y-4">
                    {activeChatMessages.map(m => (
                      <div key={m.id} className={`flex ${m.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] p-4 rounded-[1.8rem] shadow-sm ${m.senderId === currentUser.id ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 border'}`}><p className="font-bold text-sm">{m.text}</p></div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="p-6 bg-white border-t flex gap-4">
                    <input type="text" placeholder="Escribir respuesta..." className="flex-1 bg-slate-50 p-5 rounded-2xl font-bold" value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (onSendMessage(selectedMerchantId, replyText), setReplyText(''))} />
                    <button onClick={() => { onSendMessage(selectedMerchantId, replyText); setReplyText(''); }} className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-xl"><svg className="w-6 h-6 rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg></button>
                  </div>
                </>
              ) : <div className="h-full flex flex-col items-center justify-center text-slate-300">Selecciona un chat</div>}
            </div>
            <div className="w-[380px] border-l bg-slate-50 p-4 space-y-3">
              {merchantConversations.map(([partnerId, data]) => {
                const merch = merchants.find(m => m.id === partnerId);
                const isSelected = selectedMerchantId === partnerId;
                return (
                  <button key={partnerId} onClick={() => setSelectedMerchantId(partnerId)} className={`w-full p-5 rounded-[1.8rem] transition-all flex items-center gap-4 text-left border ${isSelected ? 'bg-emerald-600 text-white' : 'bg-white'}`}>
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black">{merch?.businessName[0].toUpperCase()}</div>
                    <div className="flex-1 min-w-0"><p className="font-black truncate text-sm">{merch?.businessName}</p></div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* MODALES PRODUCTO Y ELIMINACIÓN */}
      {isEditing && (
        <div className="fixed inset-0 z-[200] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] w-full max-w-lg p-12 shadow-2xl">
            <h2 className="text-3xl font-black text-slate-900 mb-8 tracking-tighter">Ficha de Producto</h2>
            <div className="space-y-6">
              <input placeholder="Nombre del Producto" className="w-full bg-slate-50 p-5 rounded-3xl font-bold outline-none" value={editingProduct?.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Precio" className="w-full bg-slate-50 p-5 rounded-3xl font-bold outline-none" value={editingProduct?.price || ''} onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})} />
                <input type="number" placeholder="Stock" className="w-full bg-slate-50 p-5 rounded-3xl font-bold outline-none" value={editingProduct?.stock || 0} onChange={e => setEditingProduct({...editingProduct, stock: Number(e.target.value)})} />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setIsEditing(false)} className="flex-1 py-5 font-black text-slate-400 uppercase text-xs tracking-widest">Cancelar</button>
                <button onClick={handleSaveProduct} className="flex-[2] py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-lg">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteModal && (
        <div className="fixed inset-0 z-[250] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-10 shadow-2xl">
            <h3 className="text-2xl font-black text-slate-900 text-center mb-2 tracking-tighter">¿Eliminar?</h3>
            <p className="text-slate-500 text-center text-sm font-bold mb-8 uppercase tracking-widest">{deleteModal.label}</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleExecuteDelete} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-xs">Eliminar Ahora</button>
              <button onClick={() => setDeleteModal(null)} className="w-full py-5 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-xs">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierDashboard;
