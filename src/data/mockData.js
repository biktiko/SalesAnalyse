// src/data/mockData.js
export const mockSummaryLineData = [
  { name: '1', current: 120, lastMonth: 100, lastYear: 80 },
  { name: '5', current: 150, lastMonth: 130, lastYear: 90 },
  { name: '10', current: 180, lastMonth: 120, lastYear: 100 },
  { name: '15', current: 190, lastMonth: 150, lastYear: 110 },
  { name: '20', current: 140, lastMonth: 160, lastYear: 120 },
  { name: '25', current: 220, lastMonth: 190, lastYear: 140 },
  { name: '30', current: 260, lastMonth: 210, lastYear: 150 },
];

export const mockProductsStatus = {
  growing: 45,
  falling: 12,
  unchanged: 28,
};

export const mockCategories = [
  { id: 1, name: 'Սերմեր (Семечки)', growing: 15, falling: 2, unchanged: 5 },
  { id: 2, name: 'Ընկույզներ (Орехи)', growing: 10, falling: 5, unchanged: 10 },
  { id: 3, name: 'Չրեր (Сухофрукты)', growing: 8, falling: 1, unchanged: 8 },
  { id: 4, name: 'Քաղցրավենիք (Сладости)', growing: 12, falling: 4, unchanged: 5 },
];

export const mockProducts = [
  { id: '1', name: 'Արեւածաղկի Սերմեր 100գ (Семечки 100г)', category: 'Սերմեր', currentSales: 5400, trend: 'up', percentage: 12.5 },
  { id: '2', name: 'Դդմի Սերմեր 50գ (Тыквенные 50г)', category: 'Սերմեր', currentSales: 1200, trend: 'down', percentage: -4.2 },
  { id: '3', name: 'Ընկույզ 200գ (Грецкий орех 200г)', category: 'Ընկույզներ', currentSales: 3200, trend: 'up', percentage: 8.1 },
  { id: '4', name: 'Նուշ 150գ (Миндаль 150г)', category: 'Ընկույզներ', currentSales: 1100, trend: 'down', percentage: -15.4 },
  { id: '5', name: 'Ծիրանի Չիր 250գ (Курага 250г)', category: 'Չրեր', currentSales: 4500, trend: 'up', percentage: 22.0 },
  { id: '6', name: 'Սալորաչիր 200գ (Чернослив 200г)', category: 'Չրեր', currentSales: 2100, trend: 'stable', percentage: 0.5 },
];

// Initial mock promotions state
export const initialPromotions = [
  {
    id: 'promo-1',
    name: 'Ամանորյա Զեղչ (Новогодняя Акция)',
    description: 'Սերմերի և ընկույզների հավաքածու',
    isActive: true,
    products: [
      { productId: '1', quantity: 10 },
      { productId: '3', quantity: 5 },
    ],
  },
  {
    id: 'promo-2',
    name: 'Գարնանային Փաթեթ (Весенний Пакет)',
    description: 'Չրերի հատուկ հավաքածու',
    isActive: false,
    products: [
      { productId: '5', quantity: 20 },
      { productId: '6', quantity: 20 },
    ],
  }
];
