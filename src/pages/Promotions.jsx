import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Package, X, Loader2, Edit2, Search, 
  Database, Tag, Filter, Check, ChevronRight, Hash, Layers, ArrowUp
} from 'lucide-react';
import { getPromotions, savePromotions, getPromoProducts, savePromoProducts } from '../utils/promotions';

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${d}.${m}.${y} ${h}:${min}`;
};

const Promotions = () => {
  const [activeTab, setActiveTab] = useState('promos'); // 'promos' | 'products'
  
  const [promotions, setPromotions] = useState([]);
  const [productsList, setProductsList] = useState([]);
  
  // Tab Filters/Search
  const [prodSearch, setProdSearch] = useState('');
  const [prodFilter, setProdFilter] = useState('all'); // all | mix | db
  const [promoSearch, setPromoSearch] = useState('');

  // Promos states
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [newPromo, setNewPromo] = useState({ id: '', name: '', description: '', products: [] });

  // Promo Products states
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [isMixModalOpen, setIsMixModalOpen] = useState(false);
  const [dbProducts, setDbProducts] = useState([]);
  const [isDbLoading, setIsDbLoading] = useState(false);
  const [dbSearch, setDbSearch] = useState('');
  const [newMixName, setNewMixName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const promos = await getPromotions();
    setPromotions(promos);
    const prods = await getPromoProducts();
    setProductsList(prods);
  };

  // --- Promo Functions ---
  const handleSavePromo = async () => {
    if (!newPromo.name.trim()) return alert('Գրեք ակցիայի անվանումը');
    if (newPromo.products.length === 0) return alert('Ավելացրեք գոնե մեկ պրոդուկտ');
    
    let updated;
    const promoId = newPromo.id || Date.now().toString();
    const now = new Date().toISOString();
    const updatedPromo = { 
      ...newPromo, 
      id: promoId,
      createdAt: newPromo.createdAt || now 
    };

    if (newPromo.id) {
       updated = promotions.map(p => p.id === newPromo.id ? updatedPromo : p);
    } else {
       updated = [...promotions, updatedPromo];
    }
    
    setPromotions(updated);
    await savePromotions(updated);
    setIsPromoModalOpen(false);
  };

  const handleDeletePromo = async (id) => {
    if (!window.confirm("Համոզվա՞ծ եք։")) return;
    const updated = promotions.filter(p => p.id !== id);
    setPromotions(updated);
    await savePromotions(updated);
  };

  const openNewPromoModal = () => {
    setNewPromo({ id: '', name: '', description: '', products: [] });
    setIsPromoModalOpen(true);
  };

  const openEditPromoModal = (promo) => {
    setNewPromo({ ...promo, products: [...promo.products] });
    setIsPromoModalOpen(true);
  };

  const addPromoProductRow = () => {
     setNewPromo({
        ...newPromo,
        products: [...newPromo.products, { productId: '', productName: '', quantity: 1 }]
     });
  };

  const updatePromoProductRow = (index, field, value) => {
     const updatedProducts = [...newPromo.products];
     if (field === 'productId') {
        // Value is ID
        const prod = productsList.find(p => p.id.toString() === value.toString());
        updatedProducts[index].productId = value;
        updatedProducts[index].productName = prod ? prod.name : '';
     } else if (field === 'productSearch') {
        // Value is Name from datalist
        updatedProducts[index].productName = value;
        const prod = productsList.find(p => p.name === value);
        if (prod) {
           updatedProducts[index].productId = prod.id;
        } else {
           updatedProducts[index].productId = '';
        }
     } else {
        updatedProducts[index][field] = value;
     }
     setNewPromo({ ...newPromo, products: updatedProducts });
  };

  const removePromoProductRow = (index) => {
     const updatedProducts = newPromo.products.filter((_, i) => i !== index);
     setNewPromo({ ...newPromo, products: updatedProducts });
  };

  // --- Product Functions ---
  const fetchDbProducts = async (force = false) => {
    const cached = localStorage.getItem('db_products_cache');
    if (!force && cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        setDbProducts(parsed.data);
        return;
      }
    }

    setIsDbLoading(true);
    try {
      const api_url = import.meta.env.VITE_API_URL;
      const res = await fetch(`${api_url}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryText: "SELECT product_id, TRIM(TRAILING '.' FROM TRIM(MAX(product_name))) as product_name FROM public.vw_sales_report WHERE delivery_date >= CURRENT_DATE - INTERVAL '3 years' GROUP BY TRIM(TRAILING '.' FROM TRIM(product_name)), product_id ORDER BY product_name ASC" })
      });
      const data = await res.json();
      if (data.rows) {
        const map = new Map();
        data.rows.forEach(r => {
           const safeName = r.product_name.trim();
           const isMixInName = safeName.toLowerCase().includes('միքս');
           if (!isMixInName && !map.has(safeName.toLowerCase())) {
              map.set(safeName.toLowerCase(), { id: r.product_id, name: safeName, isMix: false });
           }
        });
        const finalProds = Array.from(map.values());
        setDbProducts(finalProds);
        localStorage.setItem('db_products_cache', JSON.stringify({
          timestamp: Date.now(),
          data: finalProds
        }));
      }
    } catch (e) {
      console.error("Failed to fetch products:", e);
    } finally {
      setIsDbLoading(false);
    }
  };

  const openDbModal = () => {
      setDbSearch('');
      setIsDbModalOpen(true);
      if (dbProducts.length === 0) fetchDbProducts();
  };

  const addDbProduct = async (dbProd) => {
      const updated = [...productsList, dbProd];
      setProductsList(updated);
      await savePromoProducts(updated);
  };

  const openMixModal = () => {
      setNewMixName('');
      setIsMixModalOpen(true);
  };

  const addMixProduct = async () => {
      const trimName = newMixName.trim();
      if (!trimName) return alert("Գրեք անվանումը");
      if (productsList.some(p => p.name.toLowerCase() === trimName.toLowerCase())) {
          return alert("Այդ անվանումով ապրանք արդեն կա։");
      }
      const newCustom = { 
        id: `mix_${Date.now()}`, 
        name: trimName, 
        isMix: true, 
        createdAt: new Date().toISOString() 
      };
      const updated = [...productsList, newCustom];
      setProductsList(updated);
      await savePromoProducts(updated);
      setIsMixModalOpen(false);
  };

  const handleDeleteProduct = async (id) => {
      const usedIn = promotions.filter(promo => promo.products.some(p => p.productId.toString() === id.toString()));
      if (usedIn.length > 0) {
          return alert(`Չեք կարող ջնջել այս ապրանքը, քանի որ այն օգտագործվում է հետևյալ ակցիաներում:\n\n${usedIn.map(u => u.name).join('\n')}`);
      }
      if (!window.confirm("Համոզվա՞ծ եք։")) return;
      const updated = productsList.filter(p => p.id !== id);
      setProductsList(updated);
      await savePromoProducts(updated);
  };

  const sortedAndFilteredProducts = useMemo(() => {
    let list = [...productsList];
    list.sort((a, b) => a.name.localeCompare(b.name));
    if (prodSearch.trim()) {
      const low = prodSearch.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(low));
    }
    if (prodFilter === 'mix') list = list.filter(p => p.isMix);
    if (prodFilter === 'db') list = list.filter(p => !p.isMix);
    return list;
  }, [productsList, prodSearch, prodFilter]);

  const filteredPromotions = useMemo(() => {
    let list = [...promotions];
    // Automatic sorting: Newest to Oldest
    list.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    if (promoSearch.trim()) {
      const low = promoSearch.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(low) || p.description.toLowerCase().includes(low));
    }
    return list;
  }, [promotions, promoSearch]);

  const availableDbProducts = useMemo(() => {
     const alreadyAddedIds = new Set(productsList.map(p => p.id.toString()));
     const alreadyAddedNames = new Set(productsList.map(p => p.name.toLowerCase()));
     return dbProducts.filter(p => !alreadyAddedIds.has(p.id.toString()) && !alreadyAddedNames.has(p.name.toLowerCase())).filter(p => p.name.toLowerCase().includes(dbSearch.toLowerCase()));
  }, [dbProducts, productsList, dbSearch]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="max-w-6xl mx-auto pb-20 px-4 sm:px-0"
    >
      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px', marginTop: '16px', flexWrap: 'wrap', gap: '24px' }}>
        <div>
          <h1 className="title-font" style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '8px' }}>Ակցիաներ</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Կառավարեք ակցիաները և ապրանքների ցանկը</p>
        </div>
        
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '6px', borderRadius: '18px', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
           <button 
             onClick={() => setActiveTab('promos')}
             style={{ 
               padding: '12px 28px', borderRadius: '14px', fontWeight: 'bold', fontSize: '14px', border: 'none', cursor: 'pointer',
               background: activeTab === 'promos' ? 'var(--accent-blue)' : 'transparent',
               color: activeTab === 'promos' ? 'white' : 'var(--text-secondary)',
               transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
               boxShadow: activeTab === 'promos' ? '0 8px 16px rgba(0, 122, 255, 0.25)' : 'none'
             }}
           >Ակցիաներ</button>
           <button 
             onClick={() => setActiveTab('products')}
             style={{ 
               padding: '12px 28px', borderRadius: '14px', fontWeight: 'bold', fontSize: '14px', border: 'none', cursor: 'pointer',
               background: activeTab === 'products' ? 'var(--accent-blue)' : 'transparent',
               color: activeTab === 'products' ? 'white' : 'var(--text-secondary)',
               transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
               boxShadow: activeTab === 'products' ? '0 8px 16px rgba(0, 122, 255, 0.25)' : 'none'
             }}
           >Ակցիայի տեսականի</button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'promos' ? (
           <motion.div key="promos" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} style={{ paddingTop: '16px' }}>
              <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderRadius: '24px', marginBottom: '24px', flexWrap: 'wrap', gap: '20px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(0, 122, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>
                       <Layers size={24} />
                    </div>
                    <div>
                      <p className="text-secondary" style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Կարգավիճակ</p>
                      <p style={{ fontWeight: 'bold', fontSize: '18px' }}><span style={{ color: 'var(--accent-blue)' }}>{promotions.length}</span> ակտիվ ակցիա</p>
                    </div>
                 </div>
                 <button className="btn btn-primary" style={{ padding: '14px 28px', borderRadius: '16px' }} onClick={openNewPromoModal}>
                   <Plus size={20} />Ստեղծել Ակցիա
                 </button>
              </div>

              <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', marginBottom: '48px' }}>
                 <div style={{ position: 'relative', width: '100%' }}>
                    <Search size={20} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', opacity: 0.5 }} />
                    <input 
                      type="text" 
                      placeholder="Որոնել ակցիաների ցանկում..." 
                      value={promoSearch} 
                      onChange={e => setPromoSearch(e.target.value)} 
                      className="input-base" 
                      style={{ width: '100%', height: '56px', paddingLeft: '52px', background: 'var(--bg-primary)', borderRadius: '16px', fontSize: '15px' }} 
                    />
                 </div>
              </div>

              {promotions.length === 0 ? (
                 <div className="glass-card" style={{ padding: '80px', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: '32px' }}>
                    <Package size={64} style={{ margin: '0 auto 24px', opacity: 0.2 }} />
                    <h3 className="text-xl font-bold mb-2">Ակցիաներ չեն գտնվել</h3>
                    <p>Սեղմեք «Ստեղծել Ակցիա» կոճակը սկսելու համար</p>
                 </div>
              ) : filteredPromotions.length === 0 ? (
                 <div className="glass-card" style={{ padding: '80px', textAlign: 'center', color: 'var(--text-secondary)', borderRadius: '32px' }}>
                    <Search size={64} style={{ margin: '0 auto 24px', opacity: 0.2 }} />
                    <h3 className="text-xl font-bold mb-2">Որոնման արդյունքներ չկան</h3>
                    <p>Փորձեք փոխել որոնման բառը</p>
                 </div>
              ) : (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                   {filteredPromotions.map((promo) => (
                     <div key={promo.id} className="glass-card" style={{ padding: '32px', borderRadius: '32px' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: '300px' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <h3 className="title-font" style={{ fontSize: '24px', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => openEditPromoModal(promo)}>{promo.name}</h3>
                                <ChevronRight size={18} className="text-secondary" style={{ opacity: 0.3 }} />
                             </div>
                             <p className="text-secondary" style={{ fontSize: '16px', maxWidth: '600px' }}>{promo.description}</p>
                             {promo.createdAt && (
                                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', opacity: 0.7 }}>
                                   Ստեղծված է՝ {formatDate(promo.createdAt)}
                                </p>
                             )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                             <button className="btn" style={{ width: '44px', height: '44px', borderRadius: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: 0 }} onClick={() => openEditPromoModal(promo)}><Edit2 size={18} /></button>
                             <button className="btn" style={{ width: '44px', height: '44px', borderRadius: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--accent-red)', padding: 0 }} onClick={() => handleDeletePromo(promo.id)}><Trash2 size={20} /></button>
                          </div>
                       </div>

                       <div style={{ background: 'var(--bg-primary)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
                          <p className="text-secondary" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            <Hash size={16} color="var(--accent-blue)" /> Ներառված պրոդուկտների կազմը
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                             {promo.products.map((item, idx) => (
                               <div key={idx} style={{ padding: '14px 18px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '16px' }}>
                                     {item.productName || 'Անհայտ ապրանք'}
                                  </span>
                                  <span style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', background: 'rgba(0, 122, 255, 0.1)', color: 'var(--accent-blue)', borderRadius: '12px', fontSize: '12px', fontWeight: '900' }}>
                                     x{item.quantity}
                                  </span>
                               </div>
                             ))}
                          </div>
                       </div>
                     </div>
                   ))}
                 </div>
              )}
           </motion.div>
        ) : (
           <motion.div key="products" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="pt-4">
              <div className="glass-card shadow-sm overflow-visible" style={{ padding: '32px', borderRadius: '32px', position: 'relative', zIndex: 10, marginBottom: '64px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px', marginBottom: '32px' }}>
                   <div>
                      <h2 className="text-2xl font-bold"><span className="text-blue">{productsList.length}</span> պրոդուկտ ցանկում</h2>
                   </div>
                   <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <button className="btn flex-1 sm:flex-none h-[56px] px-8" style={{ background: 'rgba(52, 199, 89, 0.08)', color: '#34c759', border: '1px solid rgba(52, 199, 89, 0.15)', borderRadius: '18px' }} onClick={openMixModal}>
                        <Plus size={22} /> Նոր պրոդուկտ ստեղծել
                      </button>
                      <button className="btn btn-primary flex-1 sm:flex-none h-[56px] px-8" style={{ borderRadius: '18px', boxShadow: '0 8px 24px rgba(0, 122, 255, 0.2)' }} onClick={openDbModal}>
                        <Database size={20} /> Նոր պրոդուկտ բազայից
                      </button>
                   </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', flexDirection: 'row', flexWrap: 'wrap' }}>
                   <div style={{ position: 'relative', flex: '1 1 300px' }}>
                      <Search size={20} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', opacity: 0.5 }} />
                      <input type="text" placeholder="Որոնել ակցիոն ցանկում..." value={prodSearch} onChange={e => setProdSearch(e.target.value)} className="input-base" style={{ width: '100%', height: '56px', paddingLeft: '52px', background: 'var(--bg-primary)', borderRadius: '16px', fontSize: '15px' }} />
                   </div>
                   <div className="flex gap-1.5 bg-[var(--bg-primary)] p-1.5 rounded-[18px] border border-[var(--border-color)] overflow-x-auto no-scrollbar">
                      {[
                        { id: 'all', label: 'Բոլորը' },
                        { id: 'db', label: 'Բազայից' },
                        { id: 'mix', label: 'Ստեղծած' }
                      ].map(f => (
                        <button 
                          key={f.id}
                          onClick={() => setProdFilter(f.id)} 
                          style={{ 
                            padding: '10px 20px', borderRadius: '14px', fontSize: '13px', fontStyle: 'normal', fontWeight: '800', border: 'none', cursor: 'pointer', flexShrink: 0,
                            background: prodFilter === f.id ? 'var(--bg-secondary)' : 'transparent', 
                            color: prodFilter === f.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                            boxShadow: prodFilter === f.id ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                            transition: 'all 0.2s'
                          }}
                        >{f.label}</button>
                      ))}
                   </div>
                </div>
              </div>

              {sortedAndFilteredProducts.length === 0 ? (
                 <div className="glass-card py-20 text-center text-secondary opacity-50" style={{ borderRadius: '32px' }}>
                    <Search size={48} style={{ margin: '0 auto 16px' }} />
                    <p className="font-bold">Արդյունքներ չեն գտնվել</p>
                 </div>
              ) : (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {sortedAndFilteredProducts.map(prod => (
                       <div key={prod.id} className="glass-card" style={{ padding: '24px', borderRadius: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s', position: 'relative' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', overflow: 'hidden' }}>
                             <div style={{ width: '56px', height: '56px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: prod.isMix ? 'rgba(52, 199, 89, 0.08)' : 'rgba(10, 132, 255, 0.08)' }}>
                                {prod.isMix ? <Tag size={24} color="#34c759" /> : <Database size={24} color="var(--accent-blue)" />}
                             </div>
                             <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <h4 style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--text-primary)', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prod.name}</h4>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '8px', background: prod.isMix ? '#34c759' : 'var(--accent-blue)', color: 'white', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {prod.isMix ? 'Mix' : 'Database'}
                                  </span>
                                  {prod.createdAt && (
                                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.6 }}>
                                       {formatDate(prod.createdAt)}
                                    </span>
                                  )}
                                </div>
                             </div>
                          </div>
                          <button 
                             onClick={() => handleDeleteProduct(prod.id)}
                             style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--border-color)', color: 'var(--accent-red)', transition: 'all 0.2s', flexShrink: 0 }}
                          >
                             <Trash2 size={20} />
                          </button>
                       </div>
                    ))}
                 </div>
              )}
           </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODALS (Enhanced Styles) --- */}
      <AnimatePresence>
        {isPromoModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)' }} onClick={() => setIsPromoModalOpen(false)} />
            
            <motion.div initial={{ y: 50, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 50, opacity: 0, scale: 0.95 }} style={{ position: 'relative', width: '100%', maxWidth: '540px', background: 'var(--bg-secondary)', padding: '40px', borderRadius: '32px', zIndex: 1001, border: '1px solid var(--border-color)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
              <div className="flex justify-between items-center mb-10">
                 <h2 className="title-font text-3xl font-bold">{newPromo.id ? 'Խմբագրել Ակցիան' : 'Նոր Ակցիա'}</h2>
                 <button onClick={() => setIsPromoModalOpen(false)} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary hover:text-primary transition-colors"><X size={24} /></button>
              </div>
              
              <div className="flex flex-col gap-6">
                 <div>
                    <label className="text-[11px] font-black uppercase tracking-widest text-secondary mb-2 block">Ակցիայի Անվանում</label>
                    <input type="text" value={newPromo.name} onChange={e => setNewPromo({...newPromo, name: e.target.value})} placeholder="Օրինակ՝ Promo A..." className="input-base w-full h-[56px] rounded-2xl" />
                 </div>
                 <div>
                    <label className="text-[11px] font-black uppercase tracking-widest text-secondary mb-2 block">Նկարագրություն</label>
                    <input type="text" value={newPromo.description} onChange={e => setNewPromo({...newPromo, description: e.target.value})} placeholder="Այլ տեղեկություն..." className="input-base w-full h-[56px] rounded-2xl" />
                 </div>

                 <div style={{ marginTop: '12px' }}>
                    <label className="text-[11px] font-black uppercase tracking-widest text-secondary mb-4 block">Ապրանքների Բաղադրություն</label>
                    {productsList.length === 0 ? (
                       <div className="p-6 bg-red/5 border border-red/10 rounded-2xl text-red text-sm font-bold flex items-center gap-3">
                          <AlertTriangle size={20} /> Ակցիոն տեսականին դատարկ է: Նախ ավելացրեք ապրանքներ:
                       </div>
                    ) : (
                       <div className="flex flex-col gap-3">
                         {newPromo.products.map((prodRow, index) => (
                            <div key={index} className="flex gap-2 items-center">
                               <select 
                                  value={prodRow.productId} 
                                  onChange={e => updatePromoProductRow(index, 'productId', e.target.value)}
                                  className="input-base h-[56px] rounded-2xl pr-10" 
                                  style={{ flex: 1, minWidth: 0 }}
                               >
                                  <option value="">-- Ընտրել ապրանքը --</option>
                                  {[...productsList].sort((a,b) => a.name.localeCompare(b.name)).map(p => (
                                     <option key={p.id} value={p.id}>{p.name} {p.isMix ? '(Mix)' : ''}</option>
                                  ))}
                               </select>
                               <input type="number" value={prodRow.quantity} onChange={e => updatePromoProductRow(index, 'quantity', Number(e.target.value))} className="input-base h-[56px] rounded-2xl text-center" style={{ width: '80px' }} min="1" />
                               <button onClick={() => removePromoProductRow(index)} className="w-14 h-[56px] border border-red/20 rounded-2xl flex items-center justify-center text-red hover:bg-red hover:text-white transition-all"><Trash2 size={20} /></button>
                            </div>
                         ))}
                       </div>
                    )}
                 </div>
                 
                 {productsList.length > 0 && (
                    <button onClick={addPromoProductRow} className="btn h-14 bg-blue/5 border border-dashed border-blue/40 text-blue font-bold rounded-2xl hover:bg-blue/10">
                       <Plus size={20} /> Ավելացնել բաղադրիչ
                    </button>
                 )}

                 <div className="flex gap-4" style={{ marginTop: '20px' }}>
                    <button className="btn btn-secondary flex-1 h-16 rounded-2xl font-black text-xs uppercase tracking-widest" onClick={() => setIsPromoModalOpen(false)}>Չեղարկել</button>
                    <button className="btn btn-primary flex-1 h-16 rounded-2xl font-black text-xs uppercase tracking-widest shadow-blue/30" onClick={handleSavePromo}>Պահպանել Ակցիան</button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Database Products Modal */}
        {isDbModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)' }} onClick={() => setIsDbModalOpen(false)} />
            
            <motion.div initial={{ y: 50, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 50, opacity: 0, scale: 0.95 }} style={{ position: 'relative', width: '100%', maxWidth: '640px', background: 'var(--bg-secondary)', padding: '40px', borderRadius: '40px', zIndex: 1001, border: '1px solid var(--border-color)', height: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                 <div className="flex justify-between items-start mb-8">
                    <div>
                       <h2 className="title-font text-3xl font-bold mb-2">Բազայի Ապրանքներ</h2>
                       <p className="text-secondary text-sm">Ավելացրեք ապրանքներ հիմնական վաճառքների բազայից</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                       <button onClick={() => fetchDbProducts(true)} className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center text-secondary border border-[var(--border-color)] hover:bg-blue hover:text-white transition-all"><Database size={18} /></button>
                       <button onClick={() => setIsDbModalOpen(false)} className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center text-secondary border border-[var(--border-color)] hover:text-red transition-all"><X size={24} /></button>
                    </div>
                 </div>
              
              <div className="mb-6 relative">
                 <Search size={20} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', opacity: 0.4 }} />
                 <input type="text" placeholder="Որոնել բազայում..." value={dbSearch} onChange={e => setDbSearch(e.target.value)} className="input-base w-full h-[64px] rounded-2xl" style={{ paddingLeft: '60px', background: 'var(--bg-primary)', fontSize: '16px' }} />
              </div>

              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', marginBottom: '8px' }} className="custom-scrollbar">
                 {isDbLoading ? (
                    <div className="flex flex-col justify-center items-center h-full text-secondary opacity-50 gap-4">
                       <Loader2 size={42} className="animate-spin text-blue" />
                       <p className="font-bold tracking-widest text-[11px] uppercase">Յունիվերսալ բազայի թարմացում...</p>
                    </div>
                 ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                       {availableDbProducts.map(p => (
                          <div key={p.id} className="flex justify-between items-center p-5 rounded-2xl border border-transparent hover:border-blue hover:shadow-lg transition-all cursor-pointer group bg-[var(--bg-primary)] h-[72px]" onClick={() => addDbProduct(p)}>
                             <span className="text-sm font-bold text-primary group-hover:text-blue transition-colors truncate pr-4">{p.name}</span>
                             <div className="w-10 h-10 rounded-xl bg-blue/10 text-blue flex items-center justify-center shrink-0 group-hover:bg-blue group-hover:text-white transition-all">
                               <Plus size={20} />
                             </div>
                          </div>
                       ))}
                       {availableDbProducts.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-20 text-blue/30 bg-blue/5 rounded-3xl border border-dashed border-blue/20">
                             <Check size={64} className="mb-4" />
                             <p className="font-bold uppercase tracking-widest text-xs">Բոլոր ապրանքները պատրաստ են</p>
                          </div>
                       )}
                    </div>
                 )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Custom Mix Modal */}
        {isMixModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)' }} onClick={() => setIsMixModalOpen(false)} />
            
            <motion.div initial={{ y: 50, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 50, opacity: 0, scale: 0.95 }} style={{ position: 'relative', width: '100%', maxWidth: '420px', background: 'var(--bg-secondary)', padding: '40px', borderRadius: '40px', zIndex: 1001, border: '1px solid var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
              <div className="flex justify-between items-center mb-8">
                 <h2 className="title-font text-3xl font-bold">Mix-ի պրոդուկտ ստեղծել</h2>
                 <button onClick={() => setIsMixModalOpen(false)} className="w-10 h-10 rounded-full flex items-center justify-center text-secondary hover:text-red transition-colors"><X size={24} /></button>
              </div>
              
              <div className="flex flex-col gap-6">
                 <div>
                    <label className="text-[11px] font-black uppercase tracking-widest text-secondary mb-3 block">Անվանում</label>
                    <input type="text" autoFocus value={newMixName} onChange={e => setNewMixName(e.target.value)} placeholder="Միքսի անվանումը..." className="input-base w-full h-[64px] rounded-2xl" onKeyDown={e => e.key === 'Enter' && addMixProduct()} />
                 </div>

                 <div className="flex gap-4" style={{ marginTop: '10px' }}>
                    <button className="btn btn-secondary flex-1 h-14 rounded-2xl font-black text-[11px] uppercase tracking-widest" onClick={() => setIsMixModalOpen(false)}>Չեղարկել</button>
                    <button className="btn h-14 bg-green text-white flex-1 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-green/20" style={{ background: '#34c759' }} onClick={addMixProduct}>Պատրաստել</button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        body.dark-mode .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
        .btn:hover { transform: translateY(-2px); transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .btn:active { transform: scale(0.96); }
      `}</style>
       <ScrollToTop />
    </motion.div>
  );
};

const ScrollToTop = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const handle = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', handle);
    return () => window.removeEventListener('scroll', handle);
  }, []);
  return (
    <AnimatePresence>{visible && (<motion.button initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ position: 'fixed', bottom: '24px', right: '24px', width: '50px', height: '50px', borderRadius: '50%', background: 'var(--accent-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0, 122, 255, 0.3)', zIndex: 1000, border: 'none' }}><ArrowUp size={24} strokeWidth={3} /></motion.button>)}</AnimatePresence>
  );
};

export default Promotions;
