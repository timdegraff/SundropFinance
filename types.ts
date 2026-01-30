export interface LineItem {
  id: string;
  label: string;
  baseline: number;
  modifierPercent: number;
  modifierFixed: number;
  finalValue?: number;
}

export interface TuitionTier {
  id: 'tuitionFT' | 'tuition4Day' | 'tuition3Day' | 'tuition2Day' | 'tuition1Day' | 'tuitionHalfDay';
  label: string;
  price: number;
  qty: number;
  ratio: number;
  // Added calculated properties for easier access in UI
  calculatedPrice?: number; 
  gross?: number;
}

// NEW INTERFACE
export interface DiscountAllocation {
  qty: number;
  discountPercent: number;
}

// UPDATED INTERFACE
export interface DiscountTier {
  id: 'staff' | 'sibling' | 'early';
  label: string;
  // allocations maps the TuitionTier ID (e.g., 'tuitionFT') to the allocation data
  allocations: Record<string, DiscountAllocation>; 
  totalDiscountValue?: number; // Calculated helper
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
