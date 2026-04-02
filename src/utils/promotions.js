export const LS_PROMOTIONS_KEY = 'sales_analyse_promotions';

export const getPromotions = () => {
  try {
    const data = localStorage.getItem(LS_PROMOTIONS_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error("Failed to parse promotions from localStorage", e);
  }
  return [];
};

export const savePromotions = (promotions) => {
  localStorage.setItem(LS_PROMOTIONS_KEY, JSON.stringify(promotions));
};
