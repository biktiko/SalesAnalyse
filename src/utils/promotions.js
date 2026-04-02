import { ref, get, set } from "firebase/database";
import { db } from "../firebase";

const DB_PATH = 'promotions';

// Fetch all promotions (Async version)
export const getPromotions = async () => {
  try {
    const promoRef = ref(db, DB_PATH);
    const snapshot = await get(promoRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      // Firebase objects to array conversion
      return Object.entries(data).map(([id, val]) => ({ ...val, id }));
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
    return true;
  } catch (e) {
    console.error("Firebase save error:", e);
    return false;
  }
};
