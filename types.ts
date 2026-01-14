// Sync update: v27.12 - Types Update
export interface LineItem {
  id: string;
  label: string;
  baseline: number;
  modifierPercent: number;
  modifierFixed: number;
  finalValue?: number; // Added to support overrides from calculation engine
}

export interface TuitionTier {
  id: 'tuitionFT' | 'tuition4Day' | 'tuition3Day' | 'tuition2Day' | 'tuition1Day' | 'tuitionHalfDay';
  label: string;
  price: number; // Base price for FT, calculated for others
  qty: number;
  ratio: number; // Percentage of FT price (e.g. 100, 60, 80)
}

export interface DiscountTier {
  id: 'staff' | 'sibling' | 'early';
  label: string;
  qty: number;
  discountPercent: number;
}

export interface FinancialState {
  tuition: {
    baseFTPrice: number;
    tiers: Record<string, TuitionTier>;
  };
  discounts: Record<string, DiscountTier>;
  revenueItems: LineItem[];
  budgetItems: LineItem[];
}

export const CARDS = {
    STRATEGY: 'strategy',
    REVENUE: 'revenue',
    BUDGET: 'budget',
    MONTHLY: 'monthly'
};