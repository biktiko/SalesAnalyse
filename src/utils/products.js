import { ref, get, update } from "firebase/database";
import { db } from "../firebase";
import initialProducts from "./initial_products.json";

const DB_PATH = 'all_products';

let globalProductsCache = null;

// Call this ONLY ONCE manually if the DB is empty
export const seedInitialProducts = async () => {
  try {
    const productsRef = ref(db, DB_PATH);
    const snapshot = await get(productsRef);
    if (!snapshot.exists()) {
      console.log("Seeding products DB...");
      const dataToSave = {};
      
      const map = new Map();
      initialProducts.forEach(r => {
         const safeName = r.product_name.trim();
         const isMixInName = safeName.toLowerCase().includes('միքս');
         if (!isMixInName && !map.has(safeName.toLowerCase())) {
            map.set(safeName.toLowerCase(), { id: r.product_id, name: safeName, isMix: false });
         }
      });
      
      const finalProds = Array.from(map.values());
      
      finalProds.forEach(p => {
         // Create a safe key for Firebase
         const key = p.name.replace(/[.#$[\]/]/g, "_"); // Firebase keys cannot contain . # $ [ ] /
         dataToSave[key] = p;
      });

      await update(ref(db), { [DB_PATH]: dataToSave });
      console.log("Seeding completed. Total products:", finalProds.length);
    }
  } catch (e) {
    console.error("Firebase seed error:", e);
  }
};

export const getOfficialProducts = async () => {
  if (globalProductsCache) return globalProductsCache;
  
  try {
    const productsRef = ref(db, DB_PATH);
    const snapshot = await get(productsRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      globalProductsCache = Object.values(data);
      return globalProductsCache;
    }
  } catch (e) {
    console.error("Firebase fetch error:", e);
  }
  
  return [];
};

export const syncRecentProducts = async () => {
   // Check when we last synced
   const lastSyncStr = localStorage.getItem('last_product_sync');
   const now = Date.now();
   
   // Sync once a day (24 hours)
   if (lastSyncStr && (now - parseInt(lastSyncStr)) < 24 * 60 * 60 * 1000) {
      return; 
   }

   try {
      console.log("Checking for new products...");
      const api_url = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${api_url}/query`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         // Only fetch the last 7 days to keep it fast
         body: JSON.stringify({ queryText: "SELECT product_id, TRIM(TRAILING '.' FROM TRIM(MAX(product_name))) as product_name FROM public.vw_sales_report WHERE delivery_date >= CURRENT_DATE - INTERVAL '7 days' GROUP BY TRIM(TRAILING '.' FROM TRIM(product_name)), product_id ORDER BY product_name ASC" })
      });
      const data = await res.json();
      
      if (data.rows && data.rows.length > 0) {
         // Load current products from DB
         const existingProducts = await getOfficialProducts();
         const existingMap = new Set(existingProducts.map(p => p.name.toLowerCase()));
         
         const newProducts = [];
         
         data.rows.forEach(r => {
            const safeName = r.product_name.trim();
            const isMixInName = safeName.toLowerCase().includes('միքս');
            if (!isMixInName && !existingMap.has(safeName.toLowerCase())) {
               newProducts.push({ id: r.product_id, name: safeName, isMix: false });
               existingMap.add(safeName.toLowerCase()); // prevent duplicates in the same query
            }
         });
         
         if (newProducts.length > 0) {
            console.log(`Found ${newProducts.length} new products. Uploading to Firebase...`);
            const updates = {};
            newProducts.forEach(p => {
               const key = p.name.replace(/[.#$[\]/]/g, "_");
               updates[`${DB_PATH}/${key}`] = p;
               // Add to cache
               if(globalProductsCache) {
                  globalProductsCache.push(p);
               }
            });
            
            await update(ref(db), updates);
            // Update last sync time here to avoid fetching constantly
            localStorage.setItem('last_product_sync', now.toString());
            return true;
         } else {
             console.log("No new products found.");
         }
      }
      
      // Update last sync time
      localStorage.setItem('last_product_sync', now.toString());
      return false;
      
   } catch (e) {
      console.error("Failed to sync recent products:", e);
      return false;
   }
};
