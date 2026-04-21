import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, AlertTriangle, CheckCircle2, Loader2, Play, 
  Download, Trash2, Copy, Info, Save, BookMarked, ChevronRight, Plus, X, Search, Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ref, push, set, onValue, remove, serverTimestamp } from "firebase/database";
import { db } from "../firebase";

const defaultSQL = `SELECT 
    product_name, 
    SUM(sold_count) AS total_sold_count
FROM public.vw_sales_report
WHERE delivery_date >= CURRENT_DATE - INTERVAL '1 month'
  AND product_name != 'Պարտքերի զրոյացում'
GROUP BY product_name
ORDER BY total_sold_count DESC;`;

const Develop = () => {
  // Persistence: load from localStorage if exists
  const [query, setQuery] = useState(() => {
    const saved = localStorage.getItem('sql_explorer_query');
    return saved !== null ? saved : defaultSQL;
  });
  
  const [result, setResult] = useState(() => {
    const saved = localStorage.getItem('sql_explorer_result');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Template States
  const [templates, setTemplates] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Persistence: save state to localStorage
  useEffect(() => {
    localStorage.setItem('sql_explorer_query', query);
  }, [query]);

  useEffect(() => {
    if (result) {
      try {
        // Prevent caching massive datasets that crash the browser
        const jsonStr = JSON.stringify(result);
        if (jsonStr.length < 4000000) { // ~4MB safe limit
          localStorage.setItem('sql_explorer_result', jsonStr);
        } else {
          localStorage.removeItem('sql_explorer_result');
          console.warn('Dataset too large to cache in localStorage');
        }
      } catch (e) {
        console.warn('Failed to save SQL results to localStorage', e);
        localStorage.removeItem('sql_explorer_result');
      }
    } else {
      localStorage.removeItem('sql_explorer_result');
    }
  }, [result]);

  // Firebase: Fetch templates
  useEffect(() => {
    const templatesRef = ref(db, 'sql_templates');
    const unsubscribe = onValue(templatesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]) => ({
          id,
          ...val
        })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setTemplates(list);
      } else {
        setTemplates([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const executeQuery = async (customQuery = null) => {
    setLoading(true);
    setError(null);
    setResult(null);
    localStorage.removeItem('sql_explorer_result');
    
    try {
      const api_url = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const startTime = performance.now();
      const response = await fetch(`${api_url}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryText: customQuery || query })
      });
      
      const resData = await response.json();
      const executionTime = Math.round(performance.now() - startTime);
      
      if (!response.ok || resData.error) {
        throw new Error(resData.message || resData.error || 'Unknown error');
      }

      resData.executionTimeMs = executionTime;

      setResult(resData);
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Սերվերը միացված չէ: Խնդրում եմ ստուգեք PM2 կարգավիճակը:' : err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) return;
    
    try {
      const templatesRef = ref(db, 'sql_templates');
      const newTemplateRef = push(templatesRef);
      await set(newTemplateRef, {
        name: templateName,
        query: query,
        createdAt: serverTimestamp()
      });
      setShowSaveModal(false);
      setTemplateName("");
    } catch (err) {
      console.error("Error saving template:", err);
      alert("Error saving template");
    }
  };

  const deleteTemplate = async (id, e) => {
    e.stopPropagation();
    if (window.confirm("Ջնջե՞լ այս շաբլոնը:")) {
      try {
        await remove(ref(db, `sql_templates/${id}`));
      } catch (err) {
        console.error("Error deleting template:", err);
      }
    }
  };

  const selectTemplate = (t) => {
    setQuery(t.query);
    setIsDrawerOpen(false);
  };

  const downloadExcel = () => {
    if (!result || !result.rows.length) return;
    const ws = XLSX.utils.json_to_sheet(result.rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
    XLSX.writeFile(wb, `sales_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const copyToClipboard = () => {
     navigator.clipboard.writeText(query);
  };

  const clearQuery = () => {
    setQuery("");
    setResult(null);
    localStorage.removeItem('sql_explorer_result');
  };

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.query.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="max-w-6xl pb-20 px-4 sm:px-0"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="title-font" style={{ fontSize: '32px', fontWeight: 'bold' }}>SQL Explorer</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>Analyze your data directly</p>
        </div>
        
        <button 
          onClick={() => setIsDrawerOpen(true)}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            padding: '8px 16px', borderRadius: '12px',
            border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          className="hover-trigger"
        >
          <BookMarked size={18} className="text-blue" />
          <span className="font-bold text-sm hidden sm:inline" style={{ color: 'var(--text-primary)' }}>ՇԱԲԼՈՆՆԵՐ</span>
          {templates.length > 0 && <span className="flex items-center justify-center w-5 h-5 bg-blue text-white rounded-full text-[10px] font-bold">{templates.length}</span>}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
         
         {/* Query Editor Box */}
         <div className="glass-card" style={{ padding: '20px', borderRadius: '24px', border: '1px solid var(--border-color)', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Play size={16} className="text-blue" />
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold' }}>SQL Հարցում</h3>
               </div>
               <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={copyToClipboard} title="Պատճենել" className="btn-icon-sq" style={{ color: 'var(--text-secondary)' }}><Copy size={18} /></button>
                  <button onClick={clearQuery} title="Մաքրել" className="btn-icon-sq" style={{ color: 'var(--accent-red)' }}><Trash2 size={18} /></button>
               </div>
            </div>
            
            <textarea 
               value={query}
               onChange={(e) => setQuery(e.target.value)}
               spellCheck="false"
               placeholder="Write your SQL here..."
               style={{ 
                  width: '100%', 
                  height: '180px', 
                  background: 'var(--bg-primary)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '16px', 
                  padding: '16px', 
                  color: 'var(--text-primary)', 
                  fontFamily: '"Fira Code", monospace', 
                  fontSize: '14px', 
                  outline: 'none',
                  resize: 'vertical',
                  lineHeight: '1.6'
               }}
            />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '16px' }}>
               <button 
                  onClick={() => setShowSaveModal(true)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '12px 24px', borderRadius: '12px',
                    border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)', cursor: 'pointer',
                    fontSize: '14px', fontWeight: 'bold', transition: 'all 0.2s'
                  }}
                  className="hover-trigger"
               >
                  <Save size={18} className="text-blue" />
                  ՊԱՀՊԱՆԵԼ
               </button>

               <button 
                 className="btn btn-primary" 
                 onClick={() => executeQuery()} 
                 disabled={loading}
                 style={{ flex: 1, padding: '14px 48px', borderRadius: '14px', boxShadow: '0 4px 15px rgba(10, 132, 255, 0.3)' }}
               >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                  <span style={{ fontWeight: '800' }}>{loading ? 'Կատարվում է...' : 'RUN QUERY'}</span>
               </button>
            </div>
         </div>

         {/* Results Area */}
         <AnimatePresence mode="wait">
            {error && (
               <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ padding: '20px', borderRadius: '20px', background: 'rgba(255, 69, 58, 0.08)', border: '1px solid var(--accent-red)', display: 'flex', gap: '14px', color: 'var(--accent-red)' }}>
                  <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                  <div>
                     <h4 style={{ fontWeight: 'bold', marginBottom: '4px' }}>Query Error</h4>
                     <p style={{ fontSize: '13px', fontFamily: 'monospace' }}>{error}</p>
                  </div>
               </motion.div>
            )}

            {result && (
               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)' }}></div>
                        <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Արդյունք: {result.rowCount} տող</span>
                        {result.executionTimeMs !== undefined && (
                           <span style={{ fontSize: '12px', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '6px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} /> {result.executionTimeMs} մվ
                           </span>
                        )}
                     </div>
                     
                     {result.rows.length > 0 && (
                        <button 
                           onClick={downloadExcel}
                           style={{ 
                              display: 'flex', alignItems: 'center', gap: '8px', 
                              background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                              padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold',
                              color: 'var(--text-primary)', cursor: 'pointer'
                           }}
                        >
                           <Download size={16} />
                           Excel
                        </button>
                     )}
                  </div>

                  <div className="glass-card" style={{ padding: '0', overflow: 'hidden', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
                     <div style={{ width: '100%', overflowX: 'auto', maxHeight: '600px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                           <thead style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
                              <tr>
                                 {result.fields.map((f, i) => (
                                    <th key={i} style={{ padding: '18px 24px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '1.2px', fontWeight: '800', background: 'var(--bg-secondary)' }}>{f}</th>
                                 ))}
                              </tr>
                           </thead>
                           <tbody style={{ background: 'white' }}>
                              {result.rows.map((row, ridx) => (
                                 <tr key={ridx} style={{ borderBottom: ridx !== result.rows.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                    {result.fields.map((f, fidx) => (
                                       <td key={fidx} style={{ padding: '14px 24px', fontSize: '13px', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                                          {row[f] === null ? <span style={{ opacity: 0.3, fontStyle: 'italic' }}>NULL</span> : String(row[f])}
                                       </td>
                                    ))}
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </motion.div>
            )}
         </AnimatePresence>
      </div>

      {/* Templates Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setIsDrawerOpen(false)}
               style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', zIndex: 1000 }}
            />
            <motion.div 
               initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
               transition={{ type: 'spring', damping: 25, stiffness: 200 }}
               style={{ 
                  position: 'fixed', right: 0, top: 0, bottom: 0, 
                  width: 'min(400px, 100%)', background: 'var(--bg-primary)', 
                  zIndex: 1001, borderLeft: '1px solid var(--border-color)',
                  display: 'flex', flexDirection: 'column',
                  boxShadow: '-10px 0 30px rgba(0,0,0,0.1)'
               }}
            >
               <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Templates</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Saved SQL queries</p>
                  </div>
                  <button onClick={() => setIsDrawerOpen(false)} className="btn-icon-sq"><X size={24} /></button>
               </div>

               <div style={{ padding: '20px' }}>
                  <div style={{ position: 'relative' }}>
                     <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                     <input 
                        type="text" 
                        placeholder="Search templates..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ 
                           width: '100%', padding: '12px 12px 12px 40px', borderRadius: '12px',
                           border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                           color: 'var(--text-primary)', outline: 'none'
                        }}
                     />
                  </div>
               </div>

               <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }} className="custom-scrollbar">
                  {filteredTemplates.length === 0 ? (
                     <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                        <BookMarked size={40} style={{ opacity: 0.2, marginBottom: '12px' }} />
                        <p>Շաբլոններ չկան</p>
                     </div>
                  ) : (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {filteredTemplates.map(t => (
                           <motion.div 
                              key={t.id}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => selectTemplate(t)}
                              style={{ 
                                 padding: '16px', borderRadius: '16px', background: 'var(--bg-secondary)',
                                 border: '1px solid var(--border-color)', cursor: 'pointer',
                                 position: 'relative', overflow: 'hidden'
                              }}
                           >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                 <h4 style={{ fontWeight: 'bold', fontSize: '15px' }}>{t.name}</h4>
                                 <button onClick={(e) => deleteTemplate(t.id, e)} style={{ color: 'var(--accent-red)', opacity: 0.6, background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                              </div>
                              <pre style={{ 
                                 fontSize: '11px', color: 'var(--text-secondary)', 
                                 background: 'rgba(0,0,0,0.03)', padding: '8px', 
                                 borderRadius: '8px', margin: 0, maxHeight: '60px', 
                                 overflow: 'hidden', textOverflow: 'ellipsis',
                                 whiteSpace: 'pre-wrap', fontFamily: 'monospace'
                              }}>
                                 {t.query}
                              </pre>
                              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={12} />
                                    {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '---'}
                                 </div>
                                 <div style={{ flex: 1 }} />
                                 <ChevronRight size={14} />
                              </div>
                           </motion.div>
                        ))}
                     </div>
                  )}
               </div>
               
               <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)' }}>
                  <button 
                     onClick={() => { setIsDrawerOpen(false); setShowSaveModal(true); }}
                     className="btn btn-primary w-full"
                  >
                     <Plus size={18} />
                     ՊԱՀՊԱՆԵԼ ՆՈՐԸ
                  </button>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Save Modal */}
      <AnimatePresence>
         {showSaveModal && (
            <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSaveModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
               <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  style={{ 
                     width: '100%', maxWidth: '400px', background: 'var(--bg-secondary)', 
                     padding: '32px', borderRadius: '24px', position: 'relative', 
                     border: '1px solid var(--border-color)', boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
                  }}
               >
                  <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>Save Template</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>Give your SQL query a name to find it later easily.</p>
                  
                  <div style={{ marginBottom: '24px' }}>
                     <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px' }}>Template Name</label>
                     <input 
                        autoFocus
                        type="text" 
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="e.g. Monthly Sales Report"
                        className="input-base"
                        onKeyDown={(e) => e.key === 'Enter' && saveTemplate()}
                     />
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                     <button onClick={() => setShowSaveModal(false)} style={{ flex: 1, background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} className="btn">Չեղարկել</button>
                     <button onClick={saveTemplate} style={{ flex: 1 }} className="btn btn-primary" disabled={!templateName.trim()}>Պահպանել</button>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

      <style>{`
        .hover-trigger:hover {
          background: var(--bg-primary) !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
        }
        .btn-icon-sq {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.03);
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-icon-sq:hover {
          background: rgba(0,0,0,0.08);
        }
        body.dark-mode .btn-icon-sq {
          background: rgba(255,255,255,0.05);
        }
        body.dark-mode .btn-icon-sq:hover {
          background: rgba(255,255,255,0.1);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          display: block;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 10px;
        }
      `}</style>
    </motion.div>
  );
};

export default Develop;
