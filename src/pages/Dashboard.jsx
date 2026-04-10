import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Activity, AlertTriangle, Loader2, Search, CheckCircle2, X, Calendar, Filter, ArrowUp, ArrowDown, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getPromotions } from '../utils/promotions';
import { DateRange } from 'react-date-range';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

const formatNum = (num) => num.toLocaleString('en-US');

const CACHE_KEY = "dashboard_data_cache";
const CACHE_TIME_KEY = "dashboard_data_time";
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

const getDaysBetween = (start, end) => {
   if (!start || !end) return 1;
   const s = new Date(start);
   const e = new Date(end);
   const diffTime = Math.abs(e - s);
   return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

const formatDateRange = (startStr, endStr) => {
  if (!startStr || !endStr) return "";
  const start = new Date(startStr);
  const end = new Date(endStr);
  
  const d1 = String(start.getDate()).padStart(2, '0');
  const m1 = String(start.getMonth() + 1).padStart(2, '0');
  const y1 = start.getFullYear();
  
  const d2 = String(end.getDate()).padStart(2, '0');
  const m2 = String(end.getMonth() + 1).padStart(2, '0');
  const y2 = end.getFullYear();

  if (y1 === y2) {
    if (m1 === m2) {
      return `${d1} - ${d2}.${m1}.${y1}`;
    }
    return `${d1}.${m1} - ${d2}.${m2}.${y1}`;
  }
  return `${d1}.${m1}.${y1} - ${d2}.${m2}.${y2}`;
};

const getFilterCacheKey = (filtersObj) => {
   if (!filtersObj) return "default";
   let key = "default";
   if (filtersObj.periodAStart && filtersObj.periodAEnd) {
      key = `custom_${filtersObj.periodAStart}_${filtersObj.periodAEnd}`;
      if (filtersObj.periodBStart && filtersObj.periodBEnd) {
         key += `_vs_${filtersObj.periodBStart}_${filtersObj.periodBEnd}`;
      }
   }
   return key;
};

const getCachedData = (keySuffix = "default") => {
   try {
      const data = localStorage.getItem(`${CACHE_KEY}_${keySuffix}`);
      const time = localStorage.getItem(`${CACHE_TIME_KEY}_${keySuffix}`);
      if (data && time && (Date.now() - Number(time) < CACHE_DURATION)) {
         return JSON.parse(data);
      }
   } catch (e) {}
   return null;
};

const saveCache = (data, keySuffix = "default") => {
   try {
      localStorage.setItem(`${CACHE_KEY}_${keySuffix}`, JSON.stringify(data));
      localStorage.setItem(`${CACHE_TIME_KEY}_${keySuffix}`, Date.now().toString());
   } catch (e) {}
};

const Dashboard = () => {
  const [data, setData] = useState(() => getCachedData() || []);
  const [loading, setLoading] = useState(() => !getCachedData());
  const [error, setError] = useState(null);
  
  // Navigation State
  const [viewMode, setViewMode] = useState('all'); // 'all', 'growth', 'decline'
  const [activeModes, setActiveModes] = useState({ month: true, year: false, avg: false });
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'

  // Filter State
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    periodAStart: '',
    periodAEnd: '',
    periodBStart: '',
    periodBEnd: '',
    diffPercentMin: '',
    diffPercentMax: '',
    diffNumericMin: '',
    diffNumericMax: ''
  });
  const [draftFilters, setDraftFilters] = useState(filters);
  const [showRangeA, setShowRangeA] = useState(false);
  const [showRangeB, setShowRangeB] = useState(false);
  const hasActiveFilters = filters.periodAStart !== '' || 
    filters.diffPercentMin !== '' || filters.diffPercentMax !== '' || 
    filters.diffNumericMin !== '' || filters.diffNumericMax !== '';

  const openFilterModal = () => {
     setDraftFilters(filters);
     setIsFilterModalOpen(true);
  };

  const applyFilters = () => {
     setFilters(draftFilters);
     setIsFilterModalOpen(false);
     fetchAnalytics(true, draftFilters);
  };

  const clearFilters = () => {
     const empty = { periodAStart: '', periodAEnd: '', periodBStart: '', periodBEnd: '', diffPercentMin: '', diffPercentMax: '', diffNumericMin: '', diffNumericMax: '' };
     setFilters(empty);
     setDraftFilters(empty);
     setIsFilterModalOpen(false);
     fetchAnalytics(true, empty);
     setShowRangeA(false);
     setShowRangeB(false);
  };

  // Auto-progress bar state
  const [progress, setProgress] = useState(0);

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (isFilterModalOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isFilterModalOpen]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [modalData, setModalData] = useState([]);
  const [chartRange, setChartRange] = useState('30days'); // 30days, 90days, 180days, 1year, custom
  const [chartGroup, setChartGroup] = useState('day'); // day, week, month
  const [graphRange, setGraphRange] = useState({
     startDate: new Date(),
     endDate: new Date(),
     key: 'selection'
  });
  const [showGraphDatePicker, setShowGraphDatePicker] = useState(false);

  const startProgressBar = () => {
    setProgress(15);
    const interval = setInterval(() => {
       setProgress(p => p < 85 ? p + 10 : p);
    }, 200);
    return interval;
  };

  const finishProgressBar = (interval) => {
    clearInterval(interval);
    setProgress(100);
    setTimeout(() => setProgress(0), 400);
  };

  const fetchAnalytics = async (force = false, appliedFilters = filters) => {
    const keySuffix = getFilterCacheKey(appliedFilters);
    const cached = getCachedData(keySuffix);

    if (!force && cached) {
       setData(cached);
       setLoading(false);
       return; // Return immediately to avoid background fetching
    } else {
       setLoading(true);
    }

    setError(null);
    const pInterval = startProgressBar();

    let query = ``;
    if (appliedFilters.periodAStart && appliedFilters.periodAEnd) {
       const hasB = appliedFilters.periodBStart && appliedFilters.periodBEnd;
       query = `
          SELECT 
              product_id, 
              MAX(product_name) as product_name, 
              COALESCE(SUM(CASE WHEN delivery_date >= '${appliedFilters.periodAStart}' AND delivery_date <= '${appliedFilters.periodAEnd}' THEN sold_count ELSE 0 END), 0) as current_month,
              ${hasB ? `COALESCE(SUM(CASE WHEN delivery_date >= '${appliedFilters.periodBStart}' AND delivery_date <= '${appliedFilters.periodBEnd}' THEN sold_count ELSE 0 END), 0)` : '0'} as previous_month,
              0 as previous_year
          FROM public.vw_sales_report
          WHERE ((delivery_date >= '${appliedFilters.periodAStart}' AND delivery_date <= '${appliedFilters.periodAEnd}')
             ${hasB ? `OR (delivery_date >= '${appliedFilters.periodBStart}' AND delivery_date <= '${appliedFilters.periodBEnd}')` : ''})
          AND product_name != 'Պարտքերի զրոյացում'
          GROUP BY product_id
       `;
    } else {
       query = `
          SELECT 
              product_id, 
              MAX(product_name) as product_name, 
              COALESCE(SUM(CASE WHEN delivery_date >= CURRENT_DATE - INTERVAL '30 days' THEN sold_count ELSE 0 END), 0) as current_month,
              COALESCE(SUM(CASE WHEN delivery_date >= CURRENT_DATE - INTERVAL '60 days' AND delivery_date < CURRENT_DATE - INTERVAL '30 days' THEN sold_count ELSE 0 END), 0) as previous_month,
              COALESCE(SUM(CASE WHEN delivery_date >= (CURRENT_DATE - INTERVAL '1 year' - INTERVAL '30 days') AND delivery_date < CURRENT_DATE - INTERVAL '1 year' THEN sold_count ELSE 0 END), 0) as previous_year
          FROM public.vw_sales_report
          WHERE ((delivery_date >= CURRENT_DATE - INTERVAL '60 days') 
             OR (delivery_date >= CURRENT_DATE - INTERVAL '1 year' - INTERVAL '30 days' AND delivery_date < CURRENT_DATE - INTERVAL '1 year'))
          AND product_name != 'Պարտքերի զրոյացում'
          GROUP BY product_id
       `;
    }

    try {
      const api_url = import.meta.env.VITE_API_URL;
      const response = await fetch(`${api_url}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryText: query })
      });
      
      const resData = await response.json();
      if (!response.ok || resData.error) throw new Error(resData.message || resData.error);

      let daysA = 30;
      let daysB = 30;
      let daysY = 30;

      if (appliedFilters.periodAStart && appliedFilters.periodAEnd) {
         daysA = getDaysBetween(appliedFilters.periodAStart, appliedFilters.periodAEnd);
      }
      if (appliedFilters.periodBStart && appliedFilters.periodBEnd) {
         daysB = getDaysBetween(appliedFilters.periodBStart, appliedFilters.periodBEnd);
      }

      // --- Promotions Unpacking Logic ---
      const activePromos = await getPromotions();
      const productMap = new Map();

      resData.rows.forEach(r => {
         const promo = activePromos.find(p => p.name.toLowerCase() === r.product_name.toLowerCase());
         if (promo) {
            const multiplierCM = Number(r.current_month || 0);
            const multiplierPM = Number(r.previous_month || 0);
            const multiplierPY = Number(r.previous_year || 0);

            promo.products.forEach(prod => {
               const pId = String(prod.productId);
               const qty = Number(prod.quantity || 1);

               const existing = productMap.get(pId) || { product_id: pId, product_name: prod.productName || 'Անհայտ', current_month: 0, previous_month: 0, previous_year: 0 };
               existing.current_month += (multiplierCM * qty);
               existing.previous_month += (multiplierPM * qty);
               existing.previous_year += (multiplierPY * qty);
               productMap.set(pId, existing);
            });
         } else {
            const pId = String(r.product_id);
            const existing = productMap.get(pId) || { product_id: pId, product_name: r.product_name, current_month: 0, previous_month: 0, previous_year: 0 };
            existing.current_month += Number(r.current_month || 0);
            existing.previous_month += Number(r.previous_month || 0);
            existing.previous_year += Number(r.previous_year || 0);
            productMap.set(pId, existing);
         }
      });

      const processedRows = Array.from(productMap.values());
      // ------------------------------------

      const processed = processedRows.map(r => {
        const cm = r.current_month;
        const pm = r.previous_month;
        const py = r.previous_year;
        
        const avgA = (cm / daysA) || 0;
        const avgB = (pm / daysB) || 0;
        const avgY = (py / daysY) || 0;

        let trendMonthTot = 0, diffMonthTot = 0, trendYearTot = 0, diffYearTot = 0;
        let trendMonthAvg = 0, diffMonthAvg = 0, trendYearAvg = 0, diffYearAvg = 0;

        // TOTALS
        if (pm > 0) trendMonthTot = ((cm - pm) / pm) * 100;
        else if (cm > 0 && pm === 0) trendMonthTot = 100;
        diffMonthTot = cm - pm;

        if (py > 0) trendYearTot = ((cm - py) / py) * 100;
        else if (cm > 0 && py === 0) trendYearTot = 100;
        diffYearTot = cm - py;

        // AVERAGES
        if (avgB > 0) trendMonthAvg = ((avgA - avgB) / avgB) * 100;
        else if (avgA > 0 && avgB === 0) trendMonthAvg = 100;
        diffMonthAvg = avgA - avgB;

        if (avgY > 0) trendYearAvg = ((avgA - avgY) / avgY) * 100;
        else if (avgA > 0 && avgY === 0) trendYearAvg = 100;
        diffYearAvg = avgA - avgY;

        return {
          id: r.product_id,
          name: r.product_name,
          current: cm,
          previous: pm,
          prevYear: py,
          avgA,
          avgB,
          avgY,
          daysA,
          daysB,
          trendMonthTot,
          diffMonthTot,
          trendYearTot,
          diffYearTot,
          trendMonthAvg,
          diffMonthAvg,
          trendYearAvg,
          diffYearAvg
        };
      });

      setData(processed);
      saveCache(processed, keySuffix);
      if (pInterval) finishProgressBar(pInterval);
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Սերվերը անհասանելի է: Ստուգեք կապը PM2-ի հետ:' : err.message);
      if (pInterval) {
         clearInterval(pInterval);
         setProgress(0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
     fetchAnalytics(); 
  }, []);

  const filteredData = useMemo(() => {
    const isAvg = activeModes.avg;
    let result = data.map(item => ({
      ...item,
      trendMonth: isAvg ? item.trendMonthAvg : item.trendMonthTot,
      diffMonth: isAvg ? item.diffMonthAvg : item.diffMonthTot,
      trendYear: isAvg ? item.trendYearAvg : item.trendYearTot,
      diffYear: isAvg ? item.diffYearAvg : item.diffYearTot
    }));
    
    const frame = activeModes.year && !activeModes.month ? 'year' : 'month';

    // Apply Range Filters (Percentage and Numeric)
    // These now work regardless of whether Period B is explicitly selected
    // and they automatically target either month or year based on active view mode
    if (filters.diffPercentMin !== '') {
      result = result.filter(r => (frame === 'month' ? r.trendMonth : r.trendYear) >= Number(filters.diffPercentMin));
    }
    if (filters.diffPercentMax !== '') {
      result = result.filter(r => (frame === 'month' ? r.trendMonth : r.trendYear) <= Number(filters.diffPercentMax));
    }
    if (filters.diffNumericMin !== '') {
      result = result.filter(r => (frame === 'month' ? r.diffMonth : r.diffYear) >= Number(filters.diffNumericMin));
    }
    if (filters.diffNumericMax !== '') {
      result = result.filter(r => (frame === 'month' ? r.diffMonth : r.diffYear) <= Number(filters.diffNumericMax));
    }

    const getSmartScore = (item, f) => {
      const diff = f === 'month' ? item.diffMonth : item.diffYear;
      const volume = item.current + (f === 'month' ? item.previous : item.prevYear);
      return diff * Math.sqrt(volume || 1);
    };

    const isComparison = (viewMode !== 'all') || (filters.periodBStart && filters.periodBEnd);

    if (isComparison) {
      const frame = activeModes.year && !activeModes.month ? 'year' : 'month';
      
      if (viewMode === 'decline') {
        result = result
          .filter(i => (frame === 'month' ? i.diffMonth : i.diffYear) < 0)
          .sort((a, b) => {
             const res = getSmartScore(a, frame) - getSmartScore(b, frame);
             return sortOrder === 'desc' ? res : -res;
          });
      } 
      else if (viewMode === 'growth') {
        result = result
          .filter(i => (frame === 'month' ? i.diffMonth : i.diffYear) > 0)
          .sort((a, b) => {
             const res = getSmartScore(b, frame) - getSmartScore(a, frame);
             return sortOrder === 'desc' ? res : -res;
          });
      } 
      else {
        // all mode with comparison
        result.sort((a, b) => {
           const res = getSmartScore(b, frame) - getSmartScore(a, frame);
           return sortOrder === 'desc' ? res : -res;
        });
      }
    } 
    else {
      result.sort((a, b) => {
         const res = b.current - a.current;
         return sortOrder === 'desc' ? res : -res;
      });
    }

    if (search.trim()) {
      const lowerReq = search.toLowerCase();
      result = result.filter(i => i.name && i.name.toLowerCase().includes(lowerReq));
    }
    return result;
  }, [data, viewMode, activeModes, search, sortOrder, filters]);

  const downloadExcel = () => {
    const titleA = (hasActiveFilters && filters.periodAStart && filters.periodAEnd) 
                    ? formatDateRange(filters.periodAStart, filters.periodAEnd) 
                    : 'Վերջին 30 օրը';
    
    const titleB = (hasActiveFilters && filters.periodBStart && filters.periodBEnd)
                    ? formatDateRange(filters.periodBStart, filters.periodBEnd)
                    : 'Նախորդ Ամիս';
    
    const exportData = filteredData.map(item => {
      const row = {
        "Անվանում": item.name,
        [`${titleA} (Ընդհանուր)`]: item.current,
        [`${titleA} (Միջին օրական)`]: Math.round(item.avgA || 0),
      };

      if (!hasActiveFilters || (hasActiveFilters && filters.periodBStart && filters.periodBEnd)) {
        row[`${titleB} (Ընդհանուր)`] = item.previous;
        row[`${titleB} (Միջին օրական)`] = Math.round(item.avgB || 0);
        row["Տարբերություն (Հատ)"] = Math.round(item.diffMonth || 0);
        row["Տարբերություն (%)"] = (item.trendMonth || 0).toFixed(1) + "%";
      }

      if (!hasActiveFilters) {
        row["Նախորդ Տարի (Ընդհանուր)"] = item.prevYear;
        row["Տարբերություն Տարվա (Հատ)"] = Math.round(item.diffYear || 0);
        row["Տարբերություն Տարվա (%)"] = (item.trendYear || 0).toFixed(1) + "%";
      }

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Վաճառքներ");
    XLSX.writeFile(workbook, `sales_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Graph Caching
  const getCachedGraph = (id, range, start = '', end = '') => {
     try {
        const key = range === 'custom' ? `graph_${id}_custom_${start}_${end}` : `graph_${id}_${range}`;
        const data = localStorage.getItem(key);
        const time = localStorage.getItem(`${key}_time`);
        if (data && time && (Date.now() - Number(time) < CACHE_DURATION)) return JSON.parse(data);
     } catch (e) {} return null;
  };

  const setCachedGraph = (id, range, data, start = '', end = '') => {
     try { 
        const key = range === 'custom' ? `graph_${id}_custom_${start}_${end}` : `graph_${id}_${range}`;
        localStorage.setItem(key, JSON.stringify(data)); 
        localStorage.setItem(`${key}_time`, Date.now().toString());
     } catch (e) {}
  };

  const fetchProductGraph = async (product, range, forceStart = '', forceEnd = '') => {
    setSelectedProduct(product);
    
    const sDate = forceStart || (graphRange.startDate ? format(graphRange.startDate, 'yyyy-MM-dd') : '');
    const eDate = forceEnd || (graphRange.endDate ? format(graphRange.endDate, 'yyyy-MM-dd') : '');
    
    // Check if graph already cached
    const cachedPlot = getCachedGraph(product.id, range, sDate, eDate);
    if (cachedPlot) {
       setModalData(cachedPlot);
       setModalLoading(false);
       return; // Do not refetch graph. It changes rarely during same session.
    }

    setModalLoading(true);
    const pInterval = startProgressBar();
    
    let dateFilter = `delivery_date >= CURRENT_DATE - INTERVAL '30 days'`;
    if (range === '90days') dateFilter = `delivery_date >= CURRENT_DATE - INTERVAL '90 days'`;
    else if (range === '180days') dateFilter = `delivery_date >= CURRENT_DATE - INTERVAL '180 days'`;
    else if (range === '1year') dateFilter = `delivery_date >= CURRENT_DATE - INTERVAL '1 year'`;
    else if (range === 'custom' && sDate && eDate) {
      dateFilter = `delivery_date >= '${sDate}' AND delivery_date <= '${eDate}'`;
    }

    const activePromos = await getPromotions();
    const relevantPromos = activePromos.filter(p => p.products.some(prod => String(prod.productId) === String(product.id)));
    const promoNamesSql = relevantPromos.map(p => `'${p.name.replace(/'/g, "''")}'`).join(', ');
    const whereClause = `(product_id = ${product.id} ${promoNamesSql ? `OR product_name IN (${promoNamesSql})` : ''})`;

    const query = `
      SELECT TO_CHAR(delivery_date, 'YYYY-MM-DD') as date_str, MAX(product_name) as product_name, SUM(sold_count) as total
      FROM public.vw_sales_report
      WHERE ${whereClause} AND ${dateFilter}
      GROUP BY TO_CHAR(delivery_date, 'YYYY-MM-DD'), product_name
      ORDER BY date_str ASC
    `;
    try {
      const api_url = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${api_url}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryText: query })
      });
      const resData = await response.json();
      if (!response.ok || resData.error) throw new Error(resData.message || resData.error);
      
      let datesMap = {};
      resData.rows.forEach(r => {
         let sold = Number(r.total);
         const pName = r.product_name;
         
         const promo = relevantPromos.find(p => p.name === pName);
         if (promo) {
             const prodInPromo = promo.products.find(prod => String(prod.productId) === String(product.id));
             if (prodInPromo) {
                sold = sold * Number(prodInPromo.quantity || 1);
             }
         }

         if (!datesMap[r.date_str]) datesMap[r.date_str] = 0;
         datesMap[r.date_str] += sold;
      });

      let rawData = Object.keys(datesMap).sort().map(date => ({ date, total: datesMap[date] }));
      setModalData(rawData);
      setCachedGraph(product.id, range, rawData, sDate, eDate);
      finishProgressBar(pInterval);
    } catch (err) {
      console.error("Modal Fetch Error:", err);
      setModalData([]);
      clearInterval(pInterval);
      setProgress(0);
    } finally {
      setModalLoading(false);
    }
  };

  const processChartData = () => {
    if (!modalData || modalData.length === 0) return [];
    if (chartGroup === 'day') return modalData;
    const grouped = {};
    modalData.forEach(item => {
      const d = new Date(item.date);
      let key = item.date;
      if (chartGroup === 'week') {
         const day = d.getDay();
         const diff = d.getDate() - day + (day === 0 ? -6 : 1);
         const startOfWeek = new Date(d.setDate(diff));
         key = startOfWeek.toISOString().split('T')[0];
      } else if (chartGroup === 'month') {
         key = item.date.substring(0, 7); 
      }
      if (!grouped[key]) grouped[key] = 0;
      grouped[key] += item.total;
    });
    return Object.keys(grouped).sort().map(k => ({ date: k, total: grouped[k] }));
  };

  const chartProcessedData = processChartData();
  const summaryTotal = chartProcessedData.reduce((acc, curr) => acc + curr.total, 0);

  const getDynamicKPI = () => {
    const totalCurrent = filteredData.reduce((acc, curr) => acc + curr.current, 0);
    const count = filteredData.length;
    
    if (viewMode === 'all') {
      const isComparison = hasActiveFilters && filters.periodAStart && filters.periodBStart;
      const totalPrevMonth = filteredData.reduce((acc, curr) => acc + curr.previous, 0);
      const totalPrevYear = filteredData.reduce((acc, curr) => acc + curr.prevYear, 0);
      const totalAvgA = filteredData.reduce((acc, curr) => acc + curr.avgA, 0);
      const totalAvgB = filteredData.reduce((acc, curr) => acc + curr.avgB, 0);
      const totalAvgY = filteredData.reduce((acc, curr) => acc + curr.avgY, 0);

      const trendMonth = totalAvgB > 0 ? ((totalAvgA - totalAvgB) / totalAvgB) * 100 : 0;
      const trendYear = totalAvgY > 0 ? ((totalAvgA - totalAvgY) / totalAvgY) * 100 : 0;
      
      if (isComparison) {
        // Upper row: TOTAL values comparison
        const diffTotal = totalCurrent - totalPrevMonth;
        const trendTotal = totalPrevMonth > 0 ? (diffTotal / totalPrevMonth) * 100 : 0;
        
        // Lower row: AVERAGE values comparison
        const diffAvg = totalAvgA - totalAvgB;
        const trendAvg = totalAvgB > 0 ? (diffAvg / totalAvgB) * 100 : 0;

        return { 
          isComparison: true,
          title: "Համեմատական վերլուծություն",
          mainNumber: totalCurrent,
          compareNumber: totalPrevMonth,
          trend: trendTotal,
          diff: diffTotal,
          trendAvg: trendAvg,
          diffAvg: diffAvg,
          subtext: "Դիտարկվում է " + formatNum(count) + " պրոդուկտ",
        };
      }

      return { 
        title: "Ընդհանուր Վաճառք",
        mainNumber: totalCurrent,
        subtext: "Դիտարկվում է " + formatNum(count) + " պրոդուկտ",
        stats: [
          { label: "Նախորդ ամսվա համեմատ " + formatNum(totalPrevMonth), trend: trendMonth },
          ...(activeModes.year ? [{ label: "Նախորդ տարվա համեմատ " + formatNum(totalPrevYear), trend: trendYear }] : [])
        ]
      };
    } 
    else if (viewMode === 'decline') {
      const frame = activeModes.year && !activeModes.month ? 'year' : 'month';
      const diffKey = frame === 'month' ? 'diffMonth' : 'diffYear';
      const totalLost = filteredData.reduce((acc, curr) => acc + curr[diffKey] || 0, 0);
      return { title: "Անկումային Պրոդուկտներ", mainNumber: count, subtext: `Ընդհանուր ծավալային անկում՝ ${formatNum(totalLost)} `, isDecline: true };
    }
    else {
      const frame = activeModes.year && !activeModes.month ? 'year' : 'month';
      const diffKey = frame === 'month' ? 'diffMonth' : 'diffYear';
      const totalGained = filteredData.reduce((acc, curr) => acc + curr[diffKey] || 0, 0);
      return { title: "Աճող Պրոդուկտներ", mainNumber: count, subtext: `Ընդհանուր ծավալային աճ՝ +${formatNum(totalGained)}`, isGrowth: true };
    }
  };

  const kpi = getDynamicKPI();

  return (
    <div className="relative">
      <AnimatePresence>
        {progress > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, height: '3px', background: 'var(--accent-blue)', width: `${progress}%`, zIndex: 9999, transition: 'width 0.2s ease-out', boxShadow: '0 0 10px var(--accent-blue)' }} />
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto pb-20 md:pb-10 relative">
        {!isMobile && (
           <div className="flex justify-end mb-6">
             <button onClick={() => fetchAnalytics(true)} disabled={progress > 0} className="btn" style={{ background: 'var(--bg-secondary)', padding: '10px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
               {progress > 0 ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} className="text-blue" />} Թարմացնել
             </button>
           </div>
        )}
        {isMobile && document.getElementById('mobile-header-actions') && createPortal(
           <button onClick={() => fetchAnalytics(true)} disabled={progress > 0} className="flex items-center justify-center p-2 rounded-full bg-transparent border-none text-secondary hover:text-primary">
              {progress > 0 ? <Loader2 size={24} className="animate-spin text-blue" /> : <Activity size={24} />}
           </button>,
           document.getElementById('mobile-header-actions')
        )}

        {error ? (
          <div style={{ padding: '24px', borderRadius: '20px', background: 'rgba(255, 69, 58, 0.08)', border: '1px solid var(--accent-red)', display: 'flex', gap: '14px', color: 'var(--accent-red)' }}>
            <AlertTriangle size={24} style={{ flexShrink: 0 }} />
            <div><h4 style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '18px' }}>Սխալ կապի մեջ</h4><p style={{ fontSize: '15px' }}>{error}</p></div>
          </div>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-card mb-4" style={{ padding: isMobile ? '14px 16px' : '12px 20px', borderRadius: '18px' }}>
               {/* Row 1: Main numbers + Date */}
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: (viewMode === 'all' && (!hasActiveFilters || (filters.periodAStart && filters.periodBStart))) ? '10px' : '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', flex: 1 }}>
                     {kpi.isComparison ? (
                       <div style={{ display: 'flex', alignItems: 'center', gap: '24px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-start' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                             <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                <span style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: '900', color: 'var(--text-primary)' }}>{formatNum(kpi.mainNumber)}</span>
                                {/* <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>հատ</span> */}
                             </div>
                             <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '-2px' }}>{formatDateRange(filters.periodAStart, filters.periodAEnd)}</span>
                          </div>
                          
                          <div style={{ padding: '4px 10px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                             <span style={{ fontSize: '16px', fontWeight: '900', color: kpi.trend >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{kpi.trend >= 0 ? '+' : ''}{kpi.trend.toFixed(1)}%</span>
                             {kpi.trend >= 0 ? <TrendingUp size={16} className="text-green" /> : <TrendingDown size={16} className="text-red" />}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'flex-end' : 'flex-start' }}>
                             <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                <span style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: '900', color: 'var(--text-primary)', opacity: 0.7 }}>{formatNum(kpi.compareNumber)}</span>
                              </div>
                             <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '-2px' }}>{formatDateRange(filters.periodBStart, filters.periodBEnd)}</span>
                          </div>
                       </div>
                     ) : (
                       <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                             <span style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: '900', color: 'var(--text-primary)', fontFamily: 'inherit' }}>{formatNum(kpi.mainNumber)}</span>
                             <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Հատ</span>
                             <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginLeft: '2px' }}>{kpi.title}</span>
                          </div>
                          {viewMode === 'all' && (
                             <>
                                <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: isMobile ? '0 4px' : '0 12px', flexShrink: 0 }} />
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                   <span style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: '900', color: 'var(--text-primary)' }}>{kpi.subtext.replace('Դիտարկվում է ', '').replace(' պրոդուկտ', '')}</span>
                                   <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Տեսակ Պրոդ.</span>
                                </div>
                             </>
                          )}
                          {viewMode !== 'all' && (
                             <span style={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', color: kpi.isDecline ? 'var(--accent-red)' : 'var(--accent-green)', paddingLeft: '16px', borderLeft: '1px solid var(--border-color)' }}>{kpi.subtext}</span>
                          )}
                       </div>
                     )}
                  </div>
                  {!kpi.isComparison && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                       <Calendar size={12} style={{ opacity: 0.6, flexShrink: 0 }} />
                       <span>
                          {(() => {
                             if (filters.periodAStart && filters.periodAEnd) return formatDateRange(filters.periodAStart, filters.periodAEnd);
                             const end = new Date(); const start = new Date();
                             start.setDate(end.getDate() - 29);
                             return formatDateRange(start.toISOString(), end.toISOString());
                          })()}
                       </span>
                    </div>
                  )}
               </div>
               {/* Row 2: Smart comparisons */}
               {viewMode === 'all' && !hasActiveFilters && kpi.stats && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px dashed var(--border-color)' }}>
                     {kpi.stats.map((s, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                           <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 7px', borderRadius: '6px', fontWeight: '900', fontSize: '11px', background: s.trend >= 0 ? 'rgba(48, 209, 88, 0.12)' : 'rgba(255, 69, 58, 0.12)', color: s.trend >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', whiteSpace: 'nowrap' }}>
                              {s.trend >= 0 ? <TrendingUp size={12} strokeWidth={3} /> : <TrendingDown size={12} strokeWidth={3} />}
                              {s.trend > 0 ? '+' : ''}{s.trend.toFixed(1)}%
                           </span>
                           <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>{s.label}</span>
                        </div>
                     ))}
                  </div>
               )}
               {viewMode === 'all' && hasActiveFilters && filters.periodAStart && filters.periodBStart && (() => {
                  const isAvgMode = true; // Always true, based on new requirement
                  const totalA = filteredData.reduce((acc, curr) => acc + curr.avgA, 0);
                  const totalB = filteredData.reduce((acc, curr) => acc + curr.avgB, 0);
                  const diff = kpi.diffAvg;
                  const pct = kpi.trendAvg;
                  const isUp = diff >= 0;
                  return (
                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px dashed var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                           <span style={{ fontWeight: '800', color: 'var(--text-primary)' }}>{formatNum(Math.round(totalA))}</span>
                           <span style={{ opacity: 0.5 }}>vs</span>
                           <span style={{ fontWeight: '800', color: 'var(--text-primary)' }}>{formatNum(Math.round(totalB))}</span>
                           <span style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--accent-blue)', opacity: 0.8 }}>(ՕՐԱԿԱՆ)</span>
                        </div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '8px', fontWeight: '900', fontSize: '12px', background: isUp ? 'rgba(48, 209, 88, 0.12)' : 'rgba(255, 69, 58, 0.12)', color: isUp ? 'var(--accent-green)' : 'var(--accent-red)', whiteSpace: 'nowrap' }}>
                           {isUp ? <TrendingUp size={13} strokeWidth={3} /> : <TrendingDown size={13} strokeWidth={3} />}
                           {isUp ? '+' : ''}{pct.toFixed(1)}%
                           <span style={{ fontWeight: '600', fontSize: '10px', marginLeft: '2px' }}>({isUp ? '+' : ''}{formatNum(Math.abs(Math.round(diff)))} օրը)</span>
                        </span>
                     </div>
                  );
               })()}
            </motion.div>

            <div style={{ 
              display: 'flex', 
              flexDirection: 'row', 
              gap: '16px', 
              marginBottom: '16px', 
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: isMobile ? '4px' : '8px', 
                width: isMobile ? '100%' : 'fit-content',
                background: isMobile ? 'var(--bg-secondary)' : 'transparent',
                padding: isMobile ? '4px' : '0',
                borderRadius: isMobile ? '16px' : '0',
              }}>
                {[{ id: 'all', label: 'Բոլորը' }, { id: 'growth', label: 'Աճ' }, { id: 'decline', label: 'Անկում' }].map(tab => (
                  <button 
                    key={tab.id} 
                    onClick={() => setViewMode(tab.id)} 
                    style={{ 
                      flex: isMobile ? 1 : 'none',
                      padding: isMobile ? '10px 8px' : '10px 24px', 
                      borderRadius: isMobile ? '12px' : '14px', 
                      fontSize: isMobile ? '13px' : '15px', 
                      fontWeight: 'bold', 
                      transition: 'all 0.2s', 
                      background: viewMode === tab.id ? 'var(--text-primary)' : (isMobile ? 'transparent' : 'var(--bg-secondary)'), 
                      color: viewMode === tab.id ? 'var(--bg-primary)' : 'var(--text-secondary)', 
                      border: 'none',
                      boxShadow: (viewMode === tab.id && isMobile) ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {isMobile && (
              <AnimatePresence>
                {!hasActiveFilters && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                    <div style={{ 
                      display: 'flex', 
                      gap: '4px', 
                      marginBottom: '16px',
                      padding: '6px', 
                      background: 'var(--bg-secondary)', 
                      width: '100%', 
                      borderRadius: '14px', 
                      border: '1px solid var(--border-color)' 
                    }}>
                        <button onClick={() => setActiveModes(prev => ({ ...prev, month: !prev.month }))} style={{ flex: 1, padding: '8px 4px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', background: activeModes.month ? 'var(--bg-primary)' : 'transparent', color: activeModes.month ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: activeModes.month ? '0 4px 12px rgba(0,0,0,0.08)' : 'none', border: activeModes.month ? '1px solid var(--border-color)' : '1px solid transparent', transition: 'all 0.2s' }}>Նախորդ Ամիս</button>
                        <button onClick={() => setActiveModes(prev => ({ ...prev, year: !prev.year }))} style={{ flex: 1, padding: '8px 4px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', background: activeModes.year ? 'var(--bg-primary)' : 'transparent', color: activeModes.year ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: activeModes.year ? '0 4px 12px rgba(0,0,0,0.08)' : 'none', border: activeModes.year ? '1px solid var(--border-color)' : '1px solid transparent', transition: 'all 0.2s' }}>Նախորդ Տարի</button>
                        <button onClick={() => setActiveModes(prev => ({ ...prev, avg: !prev.avg }))} style={{ flex: 1, padding: '8px 4px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', background: activeModes.avg ? 'var(--bg-primary)' : 'transparent', color: activeModes.avg ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: activeModes.avg ? '0 4px 12px rgba(0,0,0,0.08)' : 'none', border: activeModes.avg ? '1px solid var(--border-color)' : '1px solid transparent', transition: 'all 0.2s' }}>Միջինում օրական</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

         <AnimatePresence>
            {isFilterModalOpen && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? '0' : '16px', touchAction: 'none' }} onClick={() => setIsFilterModalOpen(false)}>
                  <motion.div initial={{ scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: isMobile ? 1 : 0.95, y: isMobile ? '100%' : 20 }} onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-primary)', width: '100%', maxWidth: isMobile ? '100%' : '440px', borderRadius: isMobile ? '24px 24px 0 0' : '28px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 -10px 50px rgba(0,0,0,0.2)', maxHeight: isMobile ? '88vh' : '90vh', touchAction: 'none' }}>
                     {/* Header (Fixed) */}
                     <div style={{ padding: isMobile ? '16px 20px 12px' : '20px 28px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)', position: 'relative', zIndex: 2, flexShrink: 0 }}>
                        <h2 className="title-font" style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: '900', color: 'var(--text-primary)' }}>Ֆիլտրներ</h2>
                        <button onClick={() => setIsFilterModalOpen(false)} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: isMobile ? '28px' : '32px', height: isMobile ? '28px' : '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={16} strokeWidth={2.5} /></button>
                     </div>

                     {/* Content Area (Scrollable) */}
                     <div style={{ padding: isMobile ? '12px 16px' : '20px 28px', display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '20px', flex: '1 1 auto', overflowY: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', background: 'var(--bg-primary)' }}>
                        
                        {/* Period A Select */}
                        <div>
                           <label style={{ fontSize: isMobile ? '13px' : '15px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: isMobile ? '8px' : '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Calendar size={18} className="text-blue" />Ժամանակահատված 1 <span style={{ color: 'var(--accent-red)' }}>*</span>
                           </label>
                           
                           <div 
                              onClick={() => setShowRangeA(!showRangeA)}
                              style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: isMobile ? '14px' : '18px', padding: isMobile ? '12px 16px' : '14px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                           >
                              <span style={{ fontSize: isMobile ? '14px' : '15px', fontWeight: '600', color: draftFilters.periodAStart ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                 {draftFilters.periodAStart ? formatDateRange(draftFilters.periodAStart, draftFilters.periodAEnd) : 'Ընտրել օրերը...'}
                              </span>
                              <Calendar size={18} className="text-secondary" />
                           </div>

                           <AnimatePresence>
                              {showRangeA && (
                                 <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginTop: '10px' }}>
                                    <div className="range-picker-container">
                                       <DateRange
                                          editableDateInputs={true}
                                          onChange={item => {
                                             const sel = item.selection;
                                             const s = format(sel.startDate, 'yyyy-MM-dd');
                                             const e = format(sel.endDate, 'yyyy-MM-dd');
                                             setDraftFilters({ ...draftFilters, periodAStart: s, periodAEnd: e });
                                             if (s !== e) setShowRangeA(false);
                                          }}
                                          moveRangeOnFirstSelection={false}
                                          ranges={[{
                                             startDate: draftFilters.periodAStart ? parseISO(draftFilters.periodAStart) : new Date(),
                                             endDate: draftFilters.periodAEnd ? parseISO(draftFilters.periodAEnd) : new Date(),
                                             key: 'selection'
                                          }]}
                                          rangeColors={['var(--accent-blue)']}
                                       />
                                    </div>
                                 </motion.div>
                              )}
                           </AnimatePresence>
                        </div>

                        {/* Period B Select */}
                        <div style={{ paddingTop: isMobile ? '12px' : '20px', borderTop: '1px dashed var(--border-color)' }}>
                           <label style={{ fontSize: isMobile ? '13px' : '15px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: isMobile ? '8px' : '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Calendar size={18} style={{ color: 'var(--accent-orange)' }} />Ժամանակահատված 2 (համեմատության համար)
                           </label>

                           <div 
                              onClick={() => setShowRangeB(!showRangeB)}
                              style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: isMobile ? '14px' : '18px', padding: isMobile ? '12px 16px' : '14px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                           >
                              <span style={{ fontSize: isMobile ? '14px' : '15px', fontWeight: '600', color: draftFilters.periodBStart ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                 {draftFilters.periodBStart ? formatDateRange(draftFilters.periodBStart, draftFilters.periodBEnd) : 'Ընտրել օրերը...'}
                              </span>
                              <X 
                                size={18} 
                                className="text-secondary" 
                                onClick={(e) => {
                                   if (draftFilters.periodBStart) {
                                      e.stopPropagation();
                                      setDraftFilters({...draftFilters, periodBStart: '', periodBEnd: ''});
                                      setShowRangeB(false);
                                   }
                                }} 
                              />
                           </div>

                           <AnimatePresence>
                              {showRangeB && (
                                 <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginTop: '10px' }}>
                                    <div className="range-picker-container">
                                       <DateRange
                                          editableDateInputs={true}
                                          onChange={item => {
                                             const sel = item.selection;
                                             setDraftFilters({
                                                ...draftFilters,
                                                periodBStart: format(sel.startDate, 'yyyy-MM-dd'),
                                                periodBEnd: format(sel.endDate, 'yyyy-MM-dd')
                                             });
                                          }}
                                          moveRangeOnFirstSelection={false}
                                          ranges={[{
                                             startDate: draftFilters.periodBStart ? parseISO(draftFilters.periodBStart) : new Date(),
                                             endDate: draftFilters.periodBEnd ? parseISO(draftFilters.periodBEnd) : new Date(),
                                             key: 'selection'
                                          }]}
                                          rangeColors={['var(--accent-orange)']}
                                       />
                                    </div>
                                 </motion.div>
                              )}
                           </AnimatePresence>
                        </div>

                        {/* Comparison Settings (Always visible) */}
                        <div style={{ background: 'var(--bg-secondary)', padding: '18px', borderRadius: '24px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                           <div>
                              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '10px', display: 'block' }}>Տոկոսային Տարբերություն (%)</label>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                 <input type="number" placeholder="Սկսած..." value={draftFilters.diffPercentMin} onChange={e => setDraftFilters({...draftFilters, diffPercentMin: e.target.value})} style={{ flex: 1, minWidth: 0, background: 'var(--bg-primary)', border: 'none', borderRadius: '14px', padding: '12px 14px', fontSize: '14px', color: 'var(--text-primary)', outline: 'none' }} />
                                 <input type="number" placeholder="Մինչև..." value={draftFilters.diffPercentMax} onChange={e => setDraftFilters({...draftFilters, diffPercentMax: e.target.value})} style={{ flex: 1, minWidth: 0, background: 'var(--bg-primary)', border: 'none', borderRadius: '14px', padding: '12px 14px', fontSize: '14px', color: 'var(--text-primary)', outline: 'none' }} />
                              </div>
                           </div>
                           <div>
                              <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '10px', display: 'block' }}>Քանակական Տարբերություն (Հատ)</label>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                 <input type="number" placeholder="Սկսած..." value={draftFilters.diffNumericMin} onChange={e => setDraftFilters({...draftFilters, diffNumericMin: e.target.value})} style={{ flex: 1, minWidth: 0, background: 'var(--bg-primary)', border: 'none', borderRadius: '14px', padding: '12px 14px', fontSize: '14px', color: 'var(--text-primary)', outline: 'none' }} />
                                 <input type="number" placeholder="Մինչև..." value={draftFilters.diffNumericMax} onChange={e => setDraftFilters({...draftFilters, diffNumericMax: e.target.value})} style={{ flex: 1, minWidth: 0, background: 'var(--bg-primary)', border: 'none', borderRadius: '14px', padding: '12px 14px', fontSize: '14px', color: 'var(--text-primary)', outline: 'none' }} />
                              </div>
                           </div>
                        </div>

                     </div>
                     <div style={{ padding: isMobile ? '12px 20px' : '20px 28px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px' }}>
                        <button onClick={() => { clearFilters(); setIsFilterModalOpen(false); }} style={{ flex: 1, padding: isMobile ? '12px' : '16px', borderRadius: '18px', fontWeight: '900', fontSize: isMobile ? '14px' : '15px', background: 'rgba(255, 69, 58, 0.1)', color: 'var(--accent-red)', border: 'none' }}>Մաքրել</button>
                        <button onClick={applyFilters} disabled={draftFilters.periodAStart && !draftFilters.periodAEnd} style={{ flex: 2, padding: isMobile ? '12px' : '16px', borderRadius: '18px', fontWeight: '900', fontSize: isMobile ? '14px' : '15px', background: 'var(--accent-blue)', color: 'white', border: 'none', opacity: (draftFilters.periodAStart && !draftFilters.periodAEnd) ? 0.5 : 1 }}>Կիրառել</button>
                     </div>
                  </motion.div>
               </motion.div>
            )}
         </AnimatePresence>

            <div className={`flex w-full gap-3 flex-wrap ${isMobile ? 'mb-4' : 'mb-6'} items-center`}>
               <div className="glass-card flex-1 flex items-center" style={{ padding: '0 16px', borderRadius: '16px', height: '54px' }}>
                  <Search size={20} className="text-secondary" />
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Որոնել անվանումով..." style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', marginLeft: '12px', fontSize: '15px', width: '100%', height: '100%' }} />
               </div>

               <div className="flex items-center gap-2">
                  {hasActiveFilters && (<button onClick={clearFilters} className="flex items-center justify-center bg-[rgba(255,69,58,0.1)] text-[#FF453A] hover:bg-[rgba(255,69,58,0.2)] transition-colors" style={{ width: '36px', height: '36px', borderRadius: '50%' }}><X size={16} strokeWidth={3} /></button>)}
                  <button onClick={openFilterModal} className="glass-card flex items-center justify-center relative hover-lift" style={{ height: '54px', width: '54px', borderRadius: '16px', padding: 0, background: hasActiveFilters ? 'var(--accent-blue)' : 'var(--bg-secondary)', color: hasActiveFilters ? '#fff' : 'var(--text-primary)' }}><Filter size={22} fill={hasActiveFilters ? "currentColor" : "none"} />{hasActiveFilters && <div className="absolute top-[12px] right-[14px] w-2.5 h-2.5 rounded-full bg-white border-2 border-[var(--accent-blue)]"></div>}</button>
                  <button onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')} className="glass-card flex items-center justify-center hover-lift" style={{ height: '54px', width: '54px', borderRadius: '16px', padding: 0, background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    {sortOrder === 'desc' ? <ArrowDown size={22} /> : <ArrowUp size={22} />}
                  </button>
                  <button onClick={downloadExcel} className="glass-card flex items-center justify-center hover-lift" style={{ height: '54px', width: '54px', borderRadius: '16px', padding: 0, background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    <Download size={22} />
                  </button>
               </div>

               {!isMobile && (
                  <>
                    <AnimatePresence>
                      {!hasActiveFilters && (
                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} style={{ overflow: 'hidden' }}>
                          <div style={{ display: 'flex', gap: '8px', padding: '6px', background: 'var(--bg-secondary)', borderRadius: '14px', border: '1px solid var(--border-color)', height: '100%' }}>
                            <button onClick={() => setActiveModes(prev => ({ ...prev, month: !prev.month }))} style={{ padding: '8px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', background: activeModes.month ? 'var(--bg-primary)' : 'transparent', color: activeModes.month ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: activeModes.month ? '0 4px 12px rgba(0,0,0,0.08)' : 'none', border: activeModes.month ? '1px solid var(--border-color)' : '1px solid transparent', transition: 'all 0.2s' }}>Նախորդ Ամիս</button>
                            <button onClick={() => setActiveModes(prev => ({ ...prev, year: !prev.year }))} style={{ padding: '8px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', background: activeModes.year ? 'var(--bg-primary)' : 'transparent', color: activeModes.year ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: activeModes.year ? '0 4px 12px rgba(0,0,0,0.08)' : 'none', border: activeModes.year ? '1px solid var(--border-color)' : '1px solid transparent', transition: 'all 0.2s' }}>Նախորդ Տարի</button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div style={{ display: 'flex', gap: '4px', padding: '6px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                      <button onClick={() => setActiveModes(prev => ({...prev, avg: false}))} className="hover-lift" style={{ padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', background: !activeModes.avg ? 'var(--accent-blue)' : 'transparent', color: !activeModes.avg ? '#fff' : 'var(--text-secondary)', border: 'none', transition: 'all 0.2s' }}>Ընդհանուր</button>
                      <button onClick={() => setActiveModes(prev => ({...prev, avg: true}))} className="hover-lift" style={{ padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', background: activeModes.avg ? 'var(--accent-blue)' : 'transparent', color: activeModes.avg ? '#fff' : 'var(--text-secondary)', border: 'none', transition: 'all 0.2s' }}>Օրական</button>
                    </div>
                  </>
               )}
            </div>

            {isMobile && (
              <div style={{ display: 'flex', gap: '4px', padding: '6px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                <button onClick={() => setActiveModes(prev => ({...prev, avg: false}))} style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', background: !activeModes.avg ? 'var(--accent-blue)' : 'transparent', color: !activeModes.avg ? '#fff' : 'var(--text-secondary)', border: 'none', transition: 'all 0.2s' }}>Ընդհանուր</button>
                <button onClick={() => setActiveModes(prev => ({...prev, avg: true}))} style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', background: activeModes.avg ? 'var(--accent-blue)' : 'transparent', color: activeModes.avg ? '#fff' : 'var(--text-secondary)', border: 'none', transition: 'all 0.2s' }}>Օրական</button>
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
               {loading && data.length === 0 ? (<div className="flex flex-col items-center justify-center w-full py-20 text-secondary"><p>Բեռնվում են տվյալները...</p></div>) : filteredData.length === 0 ? (<div className="flex flex-col items-center justify-center w-full py-20 text-secondary glass-card" style={{ borderRadius: '24px' }}><CheckCircle2 size={40} className="mb-4 text-green" /><p className="font-bold text-lg">Տվյալներ չեն գտնվել / Դատարկ է</p></div>) : (
                  filteredData.map((item) => (
                     <div key={item.id} onClick={() => fetchProductGraph(item, chartRange)} className="glass-card hover-lift cursor-pointer" style={{ padding: activeModes.avg ? '24px' : '16px 20px', borderRadius: '24px', display: 'flex', flexDirection: 'column', flex: '1 1 calc(50% - 16px)', minWidth: '320px', maxWidth: '100%' }}><h3 style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: '1.4', color: 'var(--text-primary)', marginBottom: activeModes.avg ? '24px' : '12px' }}>{item.name}</h3>
                        <div className={`flex flex-col ${activeModes.avg ? 'gap-6' : 'gap-2'}`}>
                           <div className="flex justify-between items-center bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--border-color)]">
                              <div className="flex flex-col">
                                 <span className="text-secondary text-[13px] font-semibold mb-1">
                                    {(hasActiveFilters && filters.periodAStart && filters.periodAEnd) ? formatDateRange(filters.periodAStart, filters.periodAEnd) : 'Վերջին 30 օրը'}
                                 </span>
                                 <div className="flex flex-col sm:flex-row sm:items-center sm:gap-x-1 text-secondary text-[12px]">
                                    <span className="whitespace-nowrap">Ընդհանուր: <span style={{fontWeight: 'bold', color: 'var(--text-primary)'}}>{formatNum(item.current)}</span></span>
                                    {activeModes.avg && <span className="whitespace-nowrap">Միջինում օրական: <span style={{fontWeight: 'bold', color: 'var(--text-primary)'}}>{formatNum(Math.round(item.avgA || 0))}</span></span>}
                                 </div>
                              </div>
                           </div>

                           {/* Previous Period */}
                           {((!hasActiveFilters && activeModes.month) || (hasActiveFilters && filters.periodBStart && filters.periodBEnd)) && (
                              <div className={`flex justify-between items-end px-2 ${activeModes.avg ? 'mt-2' : 'mt-1'}`}>
                                 <div className="flex flex-col">
                                    <span className="text-secondary text-[13px] font-semibold mb-1">
                                       {(hasActiveFilters && filters.periodBStart && filters.periodBEnd) ? formatDateRange(filters.periodBStart, filters.periodBEnd) : 'Նախորդ Ամիս'}
                                    </span>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-x-1 text-secondary text-[12px] mb-1">
                                       <span className="whitespace-nowrap">Ընդհանուր: <span style={{fontWeight: 'bold', color: 'var(--text-primary)'}}>{formatNum(item.previous)}</span></span>
                                       {activeModes.avg && <span className="whitespace-nowrap">Միջինում օրական: <span style={{fontWeight: 'bold', color: 'var(--text-primary)'}}>{formatNum(Math.round(item.avgB || 0))}</span></span>}
                                    </div>
                                 </div>
                                 <div className="flex flex-col items-end">
                                    <div style={{ background: item.trendMonth > 0 ? 'rgba(48, 209, 88, 0.15)' : (item.trendMonth < 0 ? 'rgba(255, 69, 58, 0.15)' : 'var(--bg-secondary)'), color: item.trendMonth > 0 ? 'var(--accent-green)' : (item.trendMonth < 0 ? 'var(--accent-red)' : 'var(--text-secondary)'), padding: '6px 12px', borderRadius: '10px', fontSize: '14px', fontWeight: '900', marginBottom: '4px' }}>{item.trendMonth > 0 ? '+' : ''}{(item.trendMonth || 0).toFixed(1)}%</div>
                                    <span style={{ fontSize: '14px', fontWeight: '900', color: item.diffMonth > 0 ? 'var(--accent-green)' : (item.diffMonth < 0 ? 'var(--accent-red)' : 'var(--text-secondary)'), marginRight: '-6px' }}>{item.diffMonth > 0 ? '+' : ''}{formatNum(Math.round(item.diffMonth || 0))}<span style={{ fontSize: '10px', marginLeft: '2px' }}>{activeModes.avg ? 'օր.' : 'հատ'}</span></span>
                                 </div>
                              </div>
                           )}

                           {/* Previous Year */}
                           {!hasActiveFilters && activeModes.year && (
                              <div className={`flex justify-between items-end px-2 ${activeModes.avg ? 'mt-4' : 'mt-1'}`}>
                                 <div className="flex flex-col"><span className="text-secondary text-[11px] font-semibold mb-1">Նախորդ Տարի</span>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-x-1 text-secondary text-[12px] mb-1">
                                       <span className="whitespace-nowrap">Ընդհանուր: <span style={{fontWeight: 'bold', color: 'var(--text-primary)'}}>{formatNum(item.prevYear)}</span></span>
                                       {activeModes.avg && <span className="whitespace-nowrap">Միջինում օրական: <span style={{fontWeight: 'bold', color: 'var(--text-primary)'}}>{formatNum(Math.round(item.avgY || 0))}</span></span>}
                                    </div>
                                 </div>
                                 <div className="flex flex-col items-end">
                                    <div style={{ background: item.trendYear > 0 ? 'rgba(48, 209, 88, 0.15)' : (item.trendYear < 0 ? 'rgba(255, 69, 58, 0.15)' : 'var(--bg-secondary)'), color: item.trendYear > 0 ? 'var(--accent-green)' : (item.trendYear < 0 ? 'var(--accent-red)' : 'var(--text-secondary)'), padding: '6px 12px', borderRadius: '10px', fontSize: '14px', fontWeight: '900', marginBottom: '4px' }}>{item.trendYear > 0 ? '+' : ''}{(item.trendYear || 0).toFixed(1)}%</div>
                                    <span style={{ fontSize: '14px', fontWeight: '900', color: item.diffYear > 0 ? 'var(--accent-green)' : (item.diffYear < 0 ? 'var(--accent-red)' : 'var(--text-secondary)'), marginRight: '-6px' }}>{item.diffYear > 0 ? '+' : ''}{formatNum(Math.round(item.diffYear || 0))}<span style={{ fontSize: '10px', marginLeft: '2px' }}>{activeModes.avg ? 'օր.' : 'հատ'}</span></span>
                                 </div>
                              </div>
                           )}
                        </div></div>
                  ))
               )}
            </div>
          </>
        )}

        <AnimatePresence>
           {selectedProduct && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '0' : '16px' }} onClick={() => setSelectedProduct(null)}>
                 <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-primary)', width: '100%', maxWidth: '800px', borderRadius: isMobile ? '0' : '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: isMobile ? '100%' : 'auto', maxHeight: isMobile ? '100%' : '90vh' }}>
                    <div style={{ padding: isMobile ? '16px 20px' : '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div style={{ flex: 1, minWidth: 0 }}>
                          <h2 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: '900', lineHeight: '1.3', paddingRight: '12px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                             {selectedProduct.name}
                          </h2>
                       </div>
                       <button onClick={() => setSelectedProduct(null)} style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: isMobile ? '32px' : '36px', height: isMobile ? '32px' : '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}><X size={isMobile ? 18 : 20} /></button>
                    </div>
                    <div style={{ padding: isMobile ? '12px 16px' : '12px 24px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                       <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-primary)', padding: '4px 8px', borderRadius: '10px', border: '1px solid var(--border-color)', flex: isMobile ? '1 1 calc(50% - 4px)' : 'none' }}>
                            <Calendar size={14} className={chartRange === 'custom' ? 'text-blue' : 'text-secondary'} style={{ cursor: 'pointer' }} onClick={() => setShowGraphDatePicker(true)} />
                            <select value={chartRange} onChange={(e) => { setChartRange(e.target.value); if (e.target.value !== 'custom') { fetchProductGraph(selectedProduct, e.target.value); setShowGraphDatePicker(false); } else setShowGraphDatePicker(true); }} onClick={() => { if (chartRange === 'custom') setShowGraphDatePicker(true); }} style={{ background: 'transparent', border: 'none', padding: '4px 0', fontSize: '12px', outline: 'none', color: 'var(--text-primary)', fontWeight: '600', width: '100%', cursor: 'pointer' }}>
                              <option value="30days">Վերջին 30 օր</option>
                              <option value="90days">Վերջին 90 օր</option>
                              <option value="180days">Վերջին 180 օր</option>
                              <option value="1year">Վերջին 1 տարի</option>
                              <option value="custom">📅 Ընտրել օրերը...</option>
                            </select>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-primary)', padding: '4px 8px', borderRadius: '10px', border: '1px solid var(--border-color)', flex: isMobile ? '1 1 calc(50% - 4px)' : 'none' }}>
                            <Filter size={14} className="text-secondary" />
                            <select value={chartGroup} onChange={(e) => setChartGroup(e.target.value)} style={{ background: 'transparent', border: 'none', padding: '4px 0', fontSize: '12px', outline: 'none', color: 'var(--text-primary)', fontWeight: '600', width: '100%' }}>
                              <option value="day">Ըստ օրերի</option>
                              <option value="week">Ըստ շաբաթների</option>
                              <option value="month">Ըստ ամիսների</option>
                            </select>
                          </div>
                       </div>

                       <AnimatePresence>
                         {showGraphDatePicker && (
                           <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                             <div className="range-picker-container" style={{ margin: '8px 0', background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: isMobile ? '4px' : '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                               <div style={{ 
                                 transform: isMobile ? 'scale(0.85)' : 'none', 
                                 transformOrigin: 'top center',
                                 width: '100%',
                                 display: 'flex',
                                 justifyContent: 'center',
                                 height: isMobile ? '280px' : 'auto'
                               }}>
                                 <DateRange
                                   editableDateInputs={true}
                                   onChange={item => {
                                     const sel = item.selection;
                                     setGraphRange(sel);
                                     const s = format(sel.startDate, 'yyyy-MM-dd');
                                     const e = format(sel.endDate, 'yyyy-MM-dd');
                                     if (s !== e) {
                                       setShowGraphDatePicker(false);
                                       setChartRange('custom');
                                       fetchProductGraph(selectedProduct, 'custom', s, e);
                                     }
                                   }}
                                   moveRangeOnFirstSelection={false}
                                   ranges={[graphRange]}
                                   rangeColors={['var(--accent-blue)']}
                                   staticRanges={[]}
                                   inputRanges={[]}
                                  />
                               </div>
                               <div style={{ display: 'flex', gap: '8px', marginTop: '8px', padding: '0 8px 8px 8px', flexDirection: isMobile ? 'column' : 'row' }}>
                                 <button onClick={() => setShowGraphDatePicker(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '13px', fontWeight: 'bold', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Չեղարկել</button>
                                 <button onClick={() => { 
                                   setShowGraphDatePicker(false); 
                                   const s = format(graphRange.startDate, 'yyyy-MM-dd');
                                   const e = format(graphRange.endDate, 'yyyy-MM-dd');
                                   fetchProductGraph(selectedProduct, 'custom', s, e); 
                                 }} style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'var(--accent-blue)', color: 'white', border: 'none', fontSize: '13px', fontWeight: 'bold' }}>Կիրառել</button>
                               </div>
                             </div>
                           </motion.div>
                         )}
                       </AnimatePresence>

                       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          {chartRange === 'custom' && graphRange.startDate && (
                            <div onClick={() => setShowGraphDatePicker(true)} style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                              <Calendar size={12} /> {formatDateRange(format(graphRange.startDate, 'yyyy-MM-dd'), format(graphRange.endDate, 'yyyy-MM-dd'))}
                            </div>
                          )}
                          {!modalLoading && chartProcessedData.length > 0 && (
                            <div style={{ background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: '10px', fontWeight: '900', fontSize: '12px', marginLeft: 'auto' }}>
                               Ընդհանուր՝ <span className="text-blue">{formatNum(summaryTotal)}</span>
                            </div>
                          )}
                       </div>
                    </div>
                    <div style={{ padding: isMobile ? '10px' : '20px', flex: 1, minHeight: isMobile ? '280px' : '350px', overflowY: 'auto' }}>
                       {modalLoading ? (<div className="flex flex-col items-center justify-center h-full py-12 text-secondary"><Loader2 size={32} className="animate-spin mb-4 text-blue" /><p style={{fontSize: '13px'}}>Ստացվում են տվյալները...</p></div>) : chartProcessedData.length === 0 ? (<div className="flex flex-col items-center justify-center h-full py-12 text-secondary"><AlertTriangle size={36} className="mb-4 text-orange-500" /><p className="font-bold text-lg">Վաճառքներ չկան</p></div>) : (
                          <div style={{ width: '100%', height: isMobile ? '250px' : '300px' }}><ResponsiveContainer width="100%" height="100%"><BarChart data={chartProcessedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" /><XAxis dataKey="date" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} tickMargin={10} axisLine={false} tickLine={false} tickFormatter={(val) => isMobile && chartProcessedData.length > 15 ? '' : val} /><YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(val) => val >= 1000 ? (val/1000).toFixed(1)+'k' : val} /><Tooltip cursor={{ fill: 'rgba(10, 132, 255, 0.05)' }} contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }} formatter={(value) => [formatNum(value) + ' հատ', 'Վաճառք']} labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px' }} /><Bar dataKey="total" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} maxBarSize={isMobile ? 30 : 50} /></BarChart></ResponsiveContainer></div>
                       )}
                    </div>
                 </motion.div>
              </motion.div>
           )}
        </AnimatePresence>
        <ScrollToTop />
      </motion.div>
    </div>
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

export default Dashboard;