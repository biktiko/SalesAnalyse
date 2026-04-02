import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, AlertTriangle, CheckCircle2, Loader2, Play, 
  Download, Trash2, Copy, Info 
} from 'lucide-react';
import * as XLSX from 'xlsx';

const defaultSQL = `SELECT 
    product_name, 
    SUM(sold_count) AS total_sold_count
FROM public.vw_sales_report
WHERE delivery_date >= CURRENT_DATE - INTERVAL '1 month'
GROUP BY product_name
ORDER BY total_sold_count DESC;`;

const Develop = () => {
  const [query, setQuery] = useState(defaultSQL);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const executeQuery = async (customQuery = null) => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const api_url = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${api_url}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryText: customQuery || query })
      });
      
      const resData = await response.json();
      
      if (!response.ok || resData.error) {
        throw new Error(resData.message || resData.error || 'Unknown error');
      }

      setResult(resData);
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Սերվերը միացված չէ: Խնդրում եմ ստուգեք PM2 կարգավիճակը:' : err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    if (!result || !result.rows.length) return;
    
    // Create a worksheet from the result rows
    const ws = XLSX.utils.json_to_sheet(result.rows);
    
    // Create a workbook and append the worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
    
    // Generate full XLSX binary and trigger download
    XLSX.writeFile(wb, `sales_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const copyToClipboard = () => {
     navigator.clipboard.writeText(query);
  };

  const clearQuery = () => setQuery("");

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4 }}
      className="max-w-6xl pb-10"
    >
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="title-font" style={{ fontSize: '32px', fontWeight: 'bold' }}>SQL Explorer</h1>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
         
         {/* Query Editor Box */}
         <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Play size={16} className="text-blue" />
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold' }}>SQL Հարցում</h3>
               </div>
               <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={copyToClipboard} title="Պատճենել" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><Copy size={18} /></button>
                  <button onClick={clearQuery} title="Մաքրել" style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }}><Trash2 size={18} /></button>
               </div>
            </div>
            
            <textarea 
               value={query}
               onChange={(e) => setQuery(e.target.value)}
               spellCheck="false"
               style={{ 
                  width: '100%', 
                  height: '160px', 
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
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
            
               <button 
                 className="btn btn-primary" 
                 onClick={() => executeQuery()} 
                 disabled={loading}
                 style={{ padding: '14px 48px', borderRadius: '14px', boxShadow: '0 4px 15px rgba(10, 132, 255, 0.3)' }}
               >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                  <span style={{ fontWeight: '800' }}>{loading ? 'Կատարվում է...' : 'RUN QUERY'}</span>
               </button>
            </div>
         </div>

         {/* Results Area */}
         <AnimatePresence mode="wait">
            {error && (
               <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} style={{ padding: '20px', borderRadius: '20px', background: 'rgba(255, 69, 58, 0.08)', border: '1px solid var(--accent-red)', display: 'flex', gap: '14px', color: 'var(--accent-red)' }}>
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
                           Ներբեռնել Excel
                        </button>
                     )}
                  </div>

                  <div className="glass-card" style={{ padding: '0', overflow: 'hidden', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
                     <div style={{ width: '100%', overflowX: 'auto', maxHeight: '500px' }}>
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
    </motion.div>
  );
};

export default Develop;
