import { ref, get, set } from "firebase/database";
import { db } from "../firebase";

const DB_PATH = 'promotions';
const PROD_DB_PATH = 'promo_products';

let globalPromotionsCache = null;

// Fetch all promotions (Async version)
export const getPromotions = async () => {
  if (globalPromotionsCache) return globalPromotionsCache;
  try {
    const promoRef = ref(db, DB_PATH);
    const snapshot = await get(promoRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      // Firebase objects to array conversion
      globalPromotionsCache = Object.entries(data).map(([id, val]) => ({ ...val, id }));
      return globalPromotionsCache;
    }
  } catch (e) {
    console.error("Firebase fetch error:", e);
  }
  return [];
};

// Save ALL promotions (for simplicity in sync screens)
export const savePromotions = async (promotions) => {
  try {
    const promoRef = ref(db, DB_PATH);
    const dataToSave = {};
    promotions.forEach(p => {
       const { id, ...rest } = p;
       dataToSave[id] = rest;
    });
    await set(promoRef, dataToSave);
    globalPromotionsCache = promotions;
    return true;
  } catch (e) {
    console.error("Firebase save error:", e);
    return false;
  }
};

let globalPromoProductsCache = null;

export const getPromoProducts = async () => {
  if (globalPromoProductsCache) return globalPromoProductsCache;
  try {
    const promoRef = ref(db, PROD_DB_PATH);
    const snapshot = await get(promoRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      globalPromoProductsCache = Object.entries(data).map(([id, val]) => ({ ...val, id }));
      return globalPromoProductsCache;
    }
  } catch (e) {
    console.error("Firebase fetch error:", e);
  }
  return [];
};

export const savePromoProducts = async (products) => {
  try {
    const promoRef = ref(db, PROD_DB_PATH);
    const dataToSave = {};
    products.forEach(p => {
       const { id, ...rest } = p;
       dataToSave[id] = rest;
    });
    await set(promoRef, dataToSave);
    globalPromoProductsCache = products;
    return true;
  } catch (e) {
    console.error("Firebase save error:", e);
    return false;
  }
};
