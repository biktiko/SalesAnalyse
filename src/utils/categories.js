import { ref, get, set } from "firebase/database";
import { db } from "../firebase";

const DB_PATH = 'categories';

let globalCategoriesCache = null;

export const getCategories = async () => {
  if (globalCategoriesCache) return globalCategoriesCache;
  try {
    const categoriesRef = ref(db, DB_PATH);
    const snapshot = await get(categoriesRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      globalCategoriesCache = Object.entries(data).map(([id, val]) => ({ ...val, id }));
      return globalCategoriesCache;
    }
  } catch (e) {
    console.error("Firebase fetch error:", e);
  }
  return [];
};

export const saveCategories = async (categories) => {
  try {
    const categoriesRef = ref(db, DB_PATH);
    const dataToSave = {};
    categories.forEach(c => {
       const { id, ...rest } = c;
       dataToSave[id] = rest;
    });
    await set(categoriesRef, dataToSave);
    globalCategoriesCache = categories;
    return true;
  } catch (e) {
    console.error("Firebase save error:", e);
    return false;
  }
};
