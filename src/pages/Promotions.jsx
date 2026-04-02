import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Package, X, Loader2, Edit2 } from 'lucide-react';
import { getPromotions, savePromotions } from '../utils/promotions';

const Promotions = () => {
  const [promotions, setPromotions] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPromo, setNewPromo] = useState({ id: '', name: '', description: '', products: [] });

  useEffect(() => {
    setPromotions(getPromotions());
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const cached = sessionStorage.getItem('promo_products_list');
    if (cached) {
      setProductsList(JSON.parse(cached));
    } else {
      setIsLoadingProducts(true);
    }
    
    try {
      const api_url = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${api_url}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryText: 'SELECT product_id, MAX(product_name) as product_name FROM public.vw_sales_report GROUP BY product_id ORDER BY product_name ASC' })
      });
      const data = await res.json();
      if (data.rows) {
        const mapped = data.rows.map(r => ({ id: r.product_id, name: r.product_name }));
        setProductsList(mapped);
        sessionStorage.setItem('promo_products_list', JSON.stringify(mapped));
      }
    } catch (e) {
      console.error("Failed to fetch products:", e);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleSavePromo = () => {
    if (!newPromo.name.trim()) return alert('Գրեք ակցիայի անվանումը');
    if (newPromo.products.length === 0) return alert('Ավելացրեք գոնե մեկ պրոդուկտ');
    
    let updated;
    if (newPromo.id) {
       updated = promotions.map(p => p.id === newPromo.id ? newPromo : p);
    } else {
       updated = [...promotions, { ...newPromo, id: Date.now().toString() }];
    }
    
    setPromotions(updated);
    savePromotions(updated);
    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    if (!window.confirm("Համոզվա՞ծ եք։")) return;
    const updated = promotions.filter(p => p.id !== id);
    setPromotions(updated);
    savePromotions(updated);
  };

  const openNewModal = () => {
    setNewPromo({ id: '', name: '', description: '', products: [] });
    setIsModalOpen(true);
  };

  const openEditModal = (promo) => {
    setNewPromo({ ...promo, products: [...promo.products] });
    setIsModalOpen(true);
  };

  const addProductRow = () => {
     setNewPromo({
        ...newPromo,
        products: [...newPromo.products, { productId: '', productName: '', quantity: 1 }]
     });
  };

  const updateProductRow = (index, field, value) => {
     const updatedProducts = [...newPromo.products];
     if (field === 'productId') {
        const prod = productsList.find(p => p.id.toString() === value.toString());
        updatedProducts[index].productId = value;
        updatedProducts[index].productName = prod ? prod.name : '';
     } else {
        updatedProducts[index][field] = value;
     }
     setNewPromo({ ...newPromo, products: updatedProducts });
  };

  const removeProductRow = (index) => {
     const updatedProducts = newPromo.products.filter((_, i) => i !== index);
     setNewPromo({ ...newPromo, products: updatedProducts });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4 }}
      style={{ maxWidth: '900px', margin: '0 auto' }}
    >
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="title-font" style={{ fontSize: '28px', fontWeight: 700, margin: 0 }}>Ակցիաներ</h1>
          <p className="text-secondary text-sm">Ունենք ընդհանուր <span className="font-bold text-blue">{promotions.length}</span> ակցիա</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={openNewModal}
        >
          <Plus size={20} />
          <span>Ստեղծել Ակցիա</span>
        </button>
      </div>

      {/* Promotions List */}
      <div className="flex flex-col gap-4">
        <AnimatePresence>
          {promotions.map((promo) => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, height: 0 }}
              key={promo.id} 
              className="glass-card"
            >
              <div className="flex justify-between" style={{ paddingLeft: '8px', marginBottom: '16px' }}>
                 <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => openEditModal(promo)}>
                       <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent-blue)' }}>{promo.name}</h3>
                    </div>
                    <p className="text-secondary text-sm">{promo.description}</p>
                 </div>
                 
                 <div className="flex items-center gap-2" style={{ alignSelf: 'flex-start' }}>
                    <button 
                       className="btn-icon"
                       style={{ background: 'transparent', color: 'var(--text-secondary)', width: '36px', height: '36px' }} 
                       onClick={() => openEditModal(promo)}
                    >
                       <Edit2 size={20} />
                    </button>
                    <button 
                       className="btn-icon"
                       style={{ background: 'transparent', color: 'var(--accent-red)', width: '36px', height: '36px' }} 
                       onClick={() => handleDelete(promo.id)}
                    >
                       <Trash2 size={22} />
                    </button>
                 </div>
              </div>

              {/* Products Breakdown */}
              <div style={{ paddingLeft: '8px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                 <p className="text-secondary mb-3 flex items-center gap-2 font-bold" style={{ fontSize: '12px', textTransform: 'uppercase' }}>
                   <Package size={16} className="text-blue" /> Ներառված ապրանքներ
                 </p>
                 
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                    {promo.products.map((item, idx) => {
                       return (
                         <div key={idx} className="flex justify-between items-center" style={{ padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '12px' }}>
                               {item.productName || 'Անհայտ ապրանք'}
                            </span>
                            <span className="text-blue flex items-center justify-center font-bold" style={{ background: 'rgba(10, 132, 255, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                               x{item.quantity}
                            </span>
                         </div>
                       );
                    })}
                 </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setIsModalOpen(false)}
            />
            
            <motion.div 
              initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
              style={{ position: 'relative', width: '90%', maxWidth: '500px', background: 'var(--bg-secondary)', padding: '32px', borderRadius: '24px', zIndex: 1001, border: '1px solid var(--border-color)' }}
            >
              <div className="flex justify-between items-center mb-6">
                 <h2 className="title-font" style={{ fontSize: '24px', fontWeight: 'bold' }}>{newPromo.id ? 'Խմբագրել Ակցիան' : 'Նոր Ակցիա'}</h2>
                 <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <X size={24} />
                 </button>
              </div>
              
              <div className="flex flex-col gap-4">
                 <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Անվանում (ճշգրիտ)</label>
                    <input type="text" value={newPromo.name} onChange={e => setNewPromo({...newPromo, name: e.target.value})} placeholder="Օրինակ՝ Promo A..." className="input-base" style={{ background: 'var(--bg-primary)' }} />
                 </div>

                 <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Նկարագրություն</label>
                    <input type="text" value={newPromo.description} onChange={e => setNewPromo({...newPromo, description: e.target.value})} placeholder="Այլ տեղեկություն..." className="input-base" style={{ background: 'var(--bg-primary)' }} />
                 </div>

                 <div style={{ marginTop: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Պրոդուկտների կազմը</label>
                    
                    {isLoadingProducts ? (
                       <div className="flex items-center gap-2 text-secondary p-4"><Loader2 size={16} className="animate-spin" />Բեռնվում են պրոդուկտները...</div>
                    ) : (
                       <div className="flex flex-col gap-3">
                         {newPromo.products.map((prodRow, index) => (
                            <div key={index} className="flex gap-2 items-center">
                               <select 
                                  value={prodRow.productId} 
                                  onChange={e => updateProductRow(index, 'productId', e.target.value)}
                                  className="input-base" 
                                  style={{ flex: 1, background: 'var(--bg-primary)', padding: '10px' }}
                               >
                                  <option value="">--Ընտրել պրոդուկտ--</option>
                                  {productsList.map(p => (
                                     <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                               </select>
                               
                               <input 
                                  type="number" 
                                  value={prodRow.quantity} 
                                  onChange={e => updateProductRow(index, 'quantity', Number(e.target.value))}
                                  className="input-base" 
                                  style={{ width: '80px', background: 'var(--bg-primary)', padding: '10px' }} 
                                  min="1"
                               />
                               
                               <button 
                                  onClick={() => removeProductRow(index)}
                                  className="btn-icon" 
                                  style={{ background: 'rgba(255, 69, 58, 0.1)', color: 'var(--accent-red)', width: '40px', height: '40px', flexShrink: 0 }}
                               >
                                  <Trash2 size={18} />
                               </button>
                            </div>
                         ))}
                       </div>
                    )}
                 </div>
                 
                 <div style={{ marginTop: '8px' }}>
                    <button onClick={addProductRow} className="btn" style={{ width: '100%', background: 'var(--bg-primary)', border: '1px dashed var(--accent-blue)', color: 'var(--accent-blue)' }}>
                       <Plus size={18} /> Ավելացնել ապրանք
                    </button>
                 </div>

                 <div className="flex gap-3" style={{ marginTop: '24px' }}>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>
                       Չեղարկել
                    </button>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSavePromo}>
                       Պահպանել
                    </button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Promotions;
