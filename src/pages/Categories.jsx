import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Plus, Trash2, Search, X, Loader2, Edit2, Database, Tag, CheckSquare, Square, FolderPlus } from 'lucide-react';
import { getCategories, saveCategories } from '../utils/categories';
import { getPromoProducts } from '../utils/promotions';

import { getOfficialProducts, syncRecentProducts } from '../utils/products';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [officialProducts, setOfficialProducts] = useState([]);
  const [mixProducts, setMixProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' or 'products'
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [modalSearch, setModalSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Categories
      const fetchedCats = await getCategories();
      setCategories(fetchedCats || []);

      // 2. Fetch Mix Products
      const fetchedMix = await getPromoProducts();
      setMixProducts(fetchedMix.filter(p => p.isMix) || []);

      const products = await getOfficialProducts();
      setOfficialProducts(products);

    } catch (e) {
      console.error("Failed to load data for categories page:", e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    const loadProducts = async () => {
        if (activeTab === 'products' || isModalOpen) {
            if (officialProducts.length === 0) {
              setProductsLoading(true);
              const products = await getOfficialProducts();
              setOfficialProducts(products || []);
              setProductsLoading(false);
            }
            
            // Smart sync: check for new products in the background
            const hasNewProducts = await syncRecentProducts();
            if (hasNewProducts) {
               const refreshed = await getOfficialProducts();
               setOfficialProducts([...refreshed]); // Force reference update
            }
        }
    };
    loadProducts();
  }, [activeTab, isModalOpen, officialProducts.length]);

  const allProducts = useMemo(() => {
    return [...officialProducts, ...mixProducts].sort((a,b) => a.name.localeCompare(b.name));
  }, [officialProducts, mixProducts]);

  const normalizeProductName = (s) => (s || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/\.$/, '');

  const productToCategoryMap = useMemo(() => {
    const map = new Map();
    categories.forEach(cat => {
      if (cat.products && Array.isArray(cat.products)) {
        cat.products.forEach(pName => map.set(normalizeProductName(pName), cat.id));
      }
    });
    return map;
  }, [categories]);

  const handleSaveCategories = async (newCategories) => {
    setCategories(newCategories);
    await saveCategories(newCategories);
  };

  const openNewCategoryModal = () => {
    setEditingCategory({
      id: crypto.randomUUID(),
      name: '',
      description: '',
      products: [],
      createdAt: new Date().toISOString()
    });
    setModalSearch('');
    setIsModalOpen(true);
  };

  const openEditCategoryModal = (cat) => {
    setEditingCategory(JSON.parse(JSON.stringify(cat)));
    setModalSearch('');
    setIsModalOpen(true);
  };

  const saveEditingCategory = async () => {
    if (!editingCategory.name.trim()) return alert("Խնդրում ենք լրացնել կատեգորիայի անվանումը");
    
    // Enforce exclusivity: Remove these products from any other category
    let newCategories = categories.filter(c => c.id !== editingCategory.id).map(cat => ({
      ...cat,
      products: (cat.products || []).filter(p => !editingCategory.products.includes(p))
    }));
    
    newCategories.push(editingCategory);
    await handleSaveCategories(newCategories);
    setIsModalOpen(false);
  };

  const deleteCategory = async (id) => {
    if (window.confirm("Համոզվա՞ծ եք, որ ցանկանում եք ջնջել այս կատեգորիան:")) {
      const newCategories = categories.filter(c => c.id !== id);
      await handleSaveCategories(newCategories);
    }
  };

  const handleAssignProduct = async (productName, targetCategoryId) => {
    // Remove from everywhere first
    let newCategories = categories.map(cat => ({
        ...cat,
        products: (cat.products || []).filter(p => p !== productName)
    }));
    
    // Add to target category
    if (targetCategoryId) {
        newCategories = newCategories.map(cat => {
            if (cat.id === targetCategoryId) {
                return { ...cat, products: [...(cat.products || []), productName] };
            }
            return cat;
        });
    }
    await handleSaveCategories(newCategories);
  };

  // --- Filtering Logic ---
  const filteredCategories = useMemo(() => {
    let list = [...categories].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
    }
    return list;
  }, [categories, searchQuery]);

  const filteredProducts = useMemo(() => {
    let list = [...allProducts];
    // Sort: Unassigned first, then Alphabetical
    list.sort((a, b) => {
      const aAssigned = productToCategoryMap.has(normalizeProductName(a.name));
      const bAssigned = productToCategoryMap.has(normalizeProductName(b.name));
      if (aAssigned !== bAssigned) return aAssigned ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [allProducts, searchQuery, productToCategoryMap]);

  const modalFilteredProducts = useMemo(() => {
    let list = [...allProducts];
    list.sort((a, b) => {
      // Products not in ANY category should come first
      // Note: we check if they are in the map
      const aAssigned = productToCategoryMap.has(normalizeProductName(a.name));
      const bAssigned = productToCategoryMap.has(normalizeProductName(b.name));
      
      if (aAssigned !== bAssigned) {
        return aAssigned ? 1 : -1;
      }
      return a.name.localeCompare(b.name);
    });

    if (modalSearch.trim()) {
      const q = modalSearch.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [allProducts, modalSearch, productToCategoryMap]);

  const toggleProductInEditingCategory = (productName) => {
    const prods = editingCategory.products || [];
    let newProds;
    if (prods.includes(productName)) {
      newProds = prods.filter(p => p !== productName);
    } else {
      newProds = [...prods, productName];
    }
    setEditingCategory({ ...editingCategory, products: newProds });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="page-container h-full flex flex-col pt-0">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div>
          <h1 className="title font-bold mb-2">Կատեգորիաներ</h1>
          <p className="text-secondary text-sm">Խմբավորեք ապրանքները վերլուծության համար</p>
        </div>
        
        {/* View Toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '6px', borderRadius: '20px', border: '1px solid var(--border-color)', alignSelf: 'stretch', alignItems: 'center' }}>
          <button 
             onClick={() => setActiveTab('categories')}
             style={{ padding: '12px 24px', borderRadius: '14px', fontSize: '14px', fontWeight: 'bold', background: activeTab === 'categories' ? 'var(--text-primary)' : 'transparent', color: activeTab === 'categories' ? 'var(--bg-primary)' : 'var(--text-secondary)', transition: 'all 0.2s', border: 'none' }}>
             Կատեգորիաներ
          </button>
          <button 
             onClick={() => setActiveTab('products')}
             style={{ padding: '12px 24px', borderRadius: '14px', fontSize: '14px', fontWeight: 'bold', background: activeTab === 'products' ? 'var(--text-primary)' : 'transparent', color: activeTab === 'products' ? 'var(--bg-primary)' : 'var(--text-secondary)', transition: 'all 0.2s', border: 'none' }}>
             Պրոդուկտներ
          </button>
        </div>
      </div>

      {/* Global Actions */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
           <Search size={20} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
           <input 
              type="text" 
              placeholder={activeTab === 'categories' ? "Որոնել կատեգորիա..." : "Որոնել ապրանք..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-base w-full h-[64px] rounded-[24px]"
              style={{ paddingLeft: '60px', fontSize: '16px' }}
           />
        </div>
        {activeTab === 'categories' && (
           <button onClick={openNewCategoryModal} className="btn btn-primary h-[64px] px-8 rounded-[24px] font-bold shadow-blue/20 flex gap-2 items-center shrink-0">
             <Plus size={20} /> <span className="hidden sm:inline">Ստեղծել Կատեգորիա</span>
           </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center flex-1 text-secondary opacity-60">
           <Loader2 size={40} className="animate-spin mb-4 text-blue" />
           <p className="font-bold">Բեռնվում են տվյալները...</p>
        </div>
      ) : activeTab === 'categories' ? (
        // CATEGORIES VIEW
        <div className="flex-1 overflow-y-auto pb-10" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', alignItems: 'start' }}>
          {filteredCategories.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-secondary glass-card" style={{ borderRadius: '24px' }}>
               <Layers size={48} className="mb-4 opacity-40" />
               <p className="font-bold text-lg mb-2">Կատեգորիաներ չկան</p>
               <p className="text-sm">Ստեղծեք նոր կատեգորիա ապրանքները խմբավորելու համար:</p>
            </div>
          ) : (
             filteredCategories.map(cat => (
               <div key={cat.id} className="glass-card flex flex-col" style={{ padding: '24px', borderRadius: '24px', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                     <div>
                       <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '4px' }}>{cat.name}</h3>
                       <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{cat.description || 'Առանց նկարագրության'}</p>
                     </div>
                     <span style={{ fontSize: '12px', fontWeight: '900', background: 'rgba(10, 132, 255, 0.1)', color: 'var(--accent-blue)', padding: '6px 14px', borderRadius: '12px' }}>
                        {(cat.products || []).length} ապրանք
                     </span>
                  </div>
                  
                  <div style={{ flex: 1, maxHeight: '150px', overflowY: 'auto', marginBottom: '20px', background: 'var(--bg-primary)', padding: '12px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                     {!(cat.products || []).length ? (
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', marginTop: '10px' }}>Դատարկ</p>
                     ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                           {(cat.products || []).map((pName, idx) => (
                              <div key={idx} style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                 <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-blue)', flexShrink:0 }}></div>
                                 <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{pName}</span>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                     <button onClick={() => openEditCategoryModal(cat)} style={{ flex: 1, padding: '12px', borderRadius: '14px', fontSize: '13px', fontWeight: 'bold', background: 'rgba(10, 132, 255, 0.1)', color: 'var(--accent-blue)', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                        <Edit2 size={16} /> Խմբագրել
                     </button>
                     <button onClick={() => deleteCategory(cat.id)} style={{ padding: '12px', borderRadius: '14px', background: 'var(--bg-primary)', color: 'var(--accent-red)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Trash2 size={18} />
                     </button>
                  </div>
               </div>
             ))
          )}
        </div>
      ) : (
        // PRODUCTS VIEW
        <div className="glass-card flex-1 flex flex-col" style={{ padding: '8px', borderRadius: '24px', overflow: 'hidden' }}>
           <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }} className="custom-scrollbar">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 {filteredProducts.slice(0, 200).map(prod => {
                    const currentCatId = productToCategoryMap.get(normalizeProductName(prod.name)) || "";
                    return (
                       <div key={prod.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-color)', gap: '16px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '250px' }}>
                             <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: prod.isMix ? 'rgba(52, 199, 89, 0.1)' : 'rgba(10, 132, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {prod.isMix ? <Tag size={18} color="var(--accent-green)" /> : <Database size={18} color="var(--accent-blue)" />}
                             </div>
                             <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)' }}>{prod.name}</span>
                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>{prod.isMix ? 'Ստեղծված ակցիաների բաժնում' : 'Հիմնական բազա'}</span>
                             </div>
                          </div>
                          
                          <select 
                             value={currentCatId} 
                             onChange={(e) => handleAssignProduct(prod.name, e.target.value)}
                             style={{ padding: '10px 16px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', outline: 'none', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 'bold', width: '220px', cursor: 'pointer' }}
                          >
                             <option value="" style={{ color: 'var(--text-secondary)' }}>-- Չկա կատեգորիա --</option>
                             {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                             ))}
                          </select>
                       </div>
                    )})}
                  {!productsLoading && filteredProducts.length > 200 && (
                     <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 'bold' }}>
                        Ցուցադրվում է 200 ապրանք: Օգտագործեք որոնումը բոլոր էլեմենտները գտնելու համար:
                     </div>
                  )}
               </div>
            </div>
         </div>
      )}

      {/* CREATE/EDIT MODAL */}
      <AnimatePresence>
        {isModalOpen && editingCategory && (
           <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }} onClick={() => setIsModalOpen(false)} />
             
             <motion.div initial={{ y: 50, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 50, opacity: 0, scale: 0.95 }} style={{ position: 'relative', width: '100%', maxWidth: '800px', background: 'var(--bg-secondary)', borderRadius: '32px', zIndex: 1001, border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)' }}>
                
                {/* Modal Header */}
                <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
                   <div>
                      <h2 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '4px' }}>
                         {editingCategory.products.length !== undefined && categories.find(c => c.id === editingCategory.id) ? 'Խմբագրել Կատեգորիան' : 'Նոր Կատեգորիա'}
                      </h2>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Ընտրեք ապրանքներ այս կատեգորիայի համար</p>
                   </div>
                   <button onClick={() => setIsModalOpen(false)} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                      <X size={20} />
                   </button>
                </div>

                {/* Modal Body */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'column' }}>
                   {/* Top Inputs */}
                   <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '16px', flexDirection: 'column' }}>
                      <div>
                         <label style={{ fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Անվանում</label>
                         <input type="text" value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} className="input-base w-full" style={{ padding: '16px', borderRadius: '16px', background: 'var(--bg-primary)', fontSize: '15px' }} placeholder="Օրինակ՝ Չորահացեր" />
                      </div>
                      <div>
                         <label style={{ fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Նկարագրություն (Ընտրովի)</label>
                         <input type="text" value={editingCategory.description} onChange={e => setEditingCategory({...editingCategory, description: e.target.value})} className="input-base w-full" style={{ padding: '16px', borderRadius: '16px', background: 'var(--bg-primary)', fontSize: '15px' }} placeholder="Հավելյալ ինֆորմացիա..." />
                      </div>
                   </div>

                   {/* Product Selector */}
                   <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '300px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
                         <label style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-primary)', display: 'block' }}>Պրոդուկտների Կազմ</label>
                         <span style={{ fontSize: '12px', fontWeight: 'bold', background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                            Ընտրված է: <span style={{ color: 'var(--accent-blue)' }}>{(editingCategory.products || []).length}</span>
                         </span>
                      </div>
                      
                      <div style={{ position: 'relative', marginBottom: '16px' }}>
                         <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                         <input type="text" value={modalSearch} onChange={e => setModalSearch(e.target.value)} placeholder="Որոնել ապրանքներ..." className="input-base w-full" style={{ padding: '14px 14px 14px 44px', borderRadius: '12px', background: 'var(--bg-primary)', fontSize: '14px' }} />
                      </div>

                      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '8px' }} className="custom-scrollbar">
                         {productsLoading ? (
                            <div className="flex flex-col items-center justify-center h-full text-secondary py-10">
                               <Loader2 className="animate-spin mb-4" size={24} />
                               <p className="text-sm font-bold">Բեռնվում են ապրանքները...</p>
                            </div>
                         ) : modalFilteredProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-secondary py-10">
                               <Search size={32} className="mb-4 opacity-30" />
                               <p className="text-sm font-bold">Ոչինչ չի գտնվել</p>
                            </div>
                         ) : (
                            modalFilteredProducts.slice(0, 100).map(prod => {
                            const isSelected = (editingCategory.products || []).includes(prod.name);
                            const existingCatId = productToCategoryMap.get(normalizeProductName(prod.name));
                            const existingCatName = existingCatId && existingCatId !== editingCategory.id ? categories.find(c => c.id === existingCatId)?.name : null;

                            return (
                               <div 
                                  key={prod.name} 
                                  onClick={() => toggleProductInEditingCategory(prod.name)}
                                  style={{ 
                                     display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', 
                                     borderRadius: '12px', cursor: 'pointer', transition: 'all 0.1s',
                                     background: isSelected ? 'rgba(10, 132, 255, 0.08)' : 'transparent',
                                     marginBottom: '4px'
                                  }}
                                  className="hover:bg-[var(--bg-secondary)]"
                               >
                                  <div style={{ color: isSelected ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>
                                     {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                  </div>
                                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                     <span style={{ fontSize: '13px', fontWeight: isSelected ? 'bold' : 'normal', color: 'var(--text-primary)' }}>{prod.name}</span>
                                     {existingCatName && !isSelected && (
                                        <span style={{ fontSize: '10px', color: 'var(--accent-orange)' }}>Արդեն պատկանում է «{existingCatName}»-ին (կփոխարինվի)</span>
                                     )}
                                     {prod.isMix && (
                                        <span style={{ fontSize: '10px', color: 'var(--accent-green)' }}>Միայն ակցիայի բաղադրիչ</span>
                                     )}
                                  </div>
                               </div>
                            );
                         })
                      )}
                      {!productsLoading && modalFilteredProducts.length > 100 && (
                         <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 'bold' }}>
                            Ցուցադրվում է 100-ը: Օգտագործեք որոնումը:
                         </div>
                      )}
                   </div>
                </div>
             </div>

                {/* Modal Footer */}
                <div style={{ padding: '20px 32px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary)', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                   <button onClick={() => setIsModalOpen(false)} style={{ padding: '14px 24px', borderRadius: '14px', fontWeight: 'bold', fontSize: '14px', background: 'transparent', color: 'var(--text-secondary)', border: 'none' }}>Չեղարկել</button>
                   <button onClick={saveEditingCategory} style={{ padding: '14px 32px', borderRadius: '14px', fontWeight: 'bold', fontSize: '14px', background: 'var(--accent-blue)', color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(10, 132, 255, 0.3)' }}>Պահպանել Կատեգորիան</button>
                </div>
             </motion.div>
           </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(100,100,100,0.2); border-radius: 10px; }
        body.dark-mode .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
      `}</style>
    </motion.div>
  );
};

export default Categories;
