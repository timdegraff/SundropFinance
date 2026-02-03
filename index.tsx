// Sync update: v27.28 - Matrix Discount Logic Integration
import React, { useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom/client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ==========================================
// TYPES
// ==========================================
export interface LineItem {
  id: string;
  label: string;
  baseline: number;
  modifierPercent: number;
  modifierFixed: number;
  finalValue?: number;
}

export interface TuitionTier {
  id: string;
  label: string;
  price: number;
  qty: number;
  ratio: number;
  calculatedPrice?: number; // Added for helper access
  gross?: number;           // Added for helper access
}

export interface DiscountAllocation {
  qty: number;
  discountPercent: number;
}

export interface DiscountTier {
  id: 'staff' | 'sibling' | 'early';
  label: string;
  allocations: Record<string, DiscountAllocation>; 
  totalDiscountValue?: number; // Helper for display
}

/** FSAS: hours per tier per day [Mon, Tue, Wed, Thu, Fri] */
export interface FSASState {
  dollarPerHour: number;
  hoursByTier: Record<string, number[]>;
}

export interface FinancialState {
  tuition: {
    baseFTPrice: number;
    tiers: Record<string, TuitionTier>;
  };
  discounts: Record<string, DiscountTier>;
  revenueItems: LineItem[];
  budgetItems: LineItem[];
  fsas?: FSASState;
}

export const CARDS = {
    STRATEGY: 'strategy',
    FSAS: 'fsas',
    REVENUE: 'revenue',
    BUDGET: 'budget',
    MONTHLY: 'monthly'
};

const TIER_ORDER = ['tuitionFT', 'tuition4Day', 'tuition3Day', 'tuition2Day', 'tuition1Day', 'tuitionHalfDay'];

// ==========================================
// CONSTANTS
// ==========================================
export const BASELINE_BUDGET: LineItem[] = [
  { id: 'b_salaries', label: '101-702 Salaries & Wages', baseline: 190000, modifierPercent: 0, modifierFixed: 0 },
  { id: 'b_payroll_tax', label: '101-703 Payroll Tax Expense', baseline: 15000, modifierPercent: 0, modifierFixed: 0 },
  { id: 'b_health_ins', label: '101-704 Health Insurance', baseline: 14000, modifierPercent: 0, modifierFixed: 0 },
  { id: 'b_scholarships', label: '101-710 Scholarships', baseline: 0, modifierPercent: 0, modifierFixed: 0 },
  { id: 'b_field_trips', label: '101-725 Field Trips', baseline: 500, modifierPercent: 0, modifierFixed: 0 },
  { id: 'b_food', label: '101-726 Food & Meals', baseline: 7000, modifierPercent: 0, modifierFixed: 0 },
  { id: 'b_materials', label: '101-727 Course Materials', baseline: 14000, modifierPercent: 0, modifierFixed: 0 },
  { id: 'b_office_supplies', label: '101-728 Office Supplies', baseline: 2000, modifierPercent: 0, modifierFixed: 0 },
  { id: 'b_software', label: '101-729 Software & Apps', baseline: 1500, modifierPercent: 0, modifierFixed: 0 },
  { id: 'b_memberships', label: '101-730 Memberships & Subs', baseline: 500, modifierPercent: 0, modifierFixed: 0 },
  { id: 'b_shipping', label: '101-731 Shipping & Postage', baseline: 100, modifierPercent: 0, modifierFixed: 0 },
  { id: 'b_fund_exp', label: '101-735 Fundraising Expense', baseline: 1500, modifierPercent: 0, modifierFixed: 0 },
  { id: 'b_bank_fees', label: '101-740 Bank Fees', baseline: 250, modifierPercent: 0, modifierFixed: 0 },
  { id: 'b_equipment', label: '101-750 Equipment Expense', baseline: 0, modifierPercent: 0, modifierFixed: 0 },
  { id: 'b_licenses', label: '101-760 Licenses', baseline: 100, modifierPercent: 0, modifierFixed: 0 },
  { id: 'b_insurance', label: '101-801 Insurance', baseline: 2000, modifierPercent: 0, modifierFixed: 0 },
  { id: 'b_legal', label: '101-802 Legal & Professional Fees', baseline: 300, modifierPercent: 0, modifierFixed: 0 },
  { id: 'b_contracted', label: '101-803 Contracted Services', baseline: 5000, modifierPercent: 0, modifierFixed: 0 },
  { id: 'b_subs', label: '101-804 Substitute Teachers', baseline: 0, modifierPercent: 0, modifierFixed: 0 },
  { id: 'b_travel', label: '101-860 Travel & Training', baseline: 500, modifierPercent: 0, modifierFixed: 0 },
  { id: 'b_marketing', label: '101-900 Advertising & Marketing', baseline: 200, modifierPercent: 0, modifierFixed: 0 },
  { id: 'b_repairs', label: '101-930 Repairs & Maintenance', baseline: 500, modifierPercent: 0, modifierFixed: 0 },
  { id: 'b_rent', label: '101-904 Rent', baseline: 13200, modifierPercent: 0, modifierFixed: 0 },
  { id: 'b_capital', label: '101-971 Capital Outlay', baseline: 25000, modifierPercent: -100, modifierFixed: 0 },
  { id: 'b_misc', label: '101-998 Miscellaneous Expense', baseline: 0, modifierPercent: 0, modifierFixed: 0 },
];

export const BASELINE_REVENUE: LineItem[] = [
  { id: 'tuition', label: '101-401 Tuition Income', baseline: 220000, modifierPercent: 0, modifierFixed: 0 },
  { id: 'r_sigma', label: '101-403 Tuition SIGMA', baseline: 0, modifierPercent: 0, modifierFixed: 0 },
  { id: 'r_afterschool', label: '101-405 Afterschool Program Revenue', baseline: 25000, modifierPercent: 0, modifierFixed: 0 },
  { id: 'r_fees', label: '101-407 Late Fee, Meal Fee & Other Fees', baseline: 100, modifierPercent: 0, modifierFixed: 0 },
  { id: 'r_donations', label: '101-420 Donations', baseline: 1500, modifierPercent: 0, modifierFixed: 0 },
  { id: 'r_oia', label: '101-539 OIA Revenue', baseline: 6000, modifierPercent: 0, modifierFixed: 0 },
  { id: 'r_state', label: '101-540 State Grants', baseline: 500, modifierPercent: 0, modifierFixed: 0 },
  { id: 'r_local', label: '101-560 Local Grants', baseline: 5000, modifierPercent: 0, modifierFixed: 0 },
  { id: 'r_arpa', label: '201-520 ARPA Grant Revenue', baseline: 0, modifierPercent: 0, modifierFixed: 0 },
  { id: 'r_refunds', label: '101-650 Refunds & reimbursements', baseline: 0, modifierPercent: 0, modifierFixed: 0 },
  { id: 'r_interest', label: '101-665 Interest Income', baseline: 1000, modifierPercent: 0, modifierFixed: 0 },
  { id: 'r_scholarship', label: '101-670 Scholarship Fund', baseline: 0, modifierPercent: 0, modifierFixed: 0 },
  { id: 'r_fundraising', label: '101-410 Fundraising Revenue', baseline: 5000, modifierPercent: 0, modifierFixed: 0 },
];

const createEmptyAllocations = (): Record<string, DiscountAllocation> => ({
  tuitionFT: { qty: 0, discountPercent: 0 },
  tuition4Day: { qty: 0, discountPercent: 0 },
  tuition3Day: { qty: 0, discountPercent: 0 },
  tuition2Day: { qty: 0, discountPercent: 0 },
  tuition1Day: { qty: 0, discountPercent: 0 },
  tuitionHalfDay: { qty: 0, discountPercent: 0 },
});

export const INITIAL_STATE: FinancialState = {
  tuition: {
    baseFTPrice: 7520,
    tiers: {
      tuitionFT: { id: 'tuitionFT', label: 'Full-Time (5 Days)', price: 7520, qty: 18, ratio: 100 },
      tuition4Day: { id: 'tuition4Day', label: '4-Day Tier', price: 6016, qty: 7, ratio: 80 },
      tuition3Day: { id: 'tuition3Day', label: '3-Day Tier', price: 4512, qty: 4, ratio: 60 },
      tuition2Day: { id: 'tuition2Day', label: '2-Day Tier', price: 3008, qty: 7, ratio: 40 },
      tuition1Day: { id: 'tuition1Day', label: '1-Day Tier', price: 1504, qty: 5, ratio: 20 },
      tuitionHalfDay: { id: 'tuitionHalfDay', label: 'Half-Day (5 Days)', price: 3760, qty: 2, ratio: 50 },
    }
  },
  discounts: {
    staff: { 
        id: 'staff', 
        label: 'Staff Discount', 
        allocations: { ...createEmptyAllocations(), tuitionFT: { qty: 2, discountPercent: 50 } } 
    },
    sibling: { 
        id: 'sibling', 
        label: 'Sibling Discount', 
        allocations: { ...createEmptyAllocations(), tuitionFT: { qty: 5, discountPercent: 5 }, tuition4Day: { qty: 4, discountPercent: 5 } } 
    },
    early: { 
        id: 'early', 
        label: 'Pre-Pay', 
        allocations: createEmptyAllocations() 
    },
  },
  revenueItems: BASELINE_REVENUE,
  budgetItems: BASELINE_BUDGET,
  fsas: {
    dollarPerHour: 0,
    hoursByTier: TIER_ORDER.reduce((acc, id) => ({ ...acc, [id]: [0, 0, 0, 0, 0] }), {} as Record<string, number[]>)
  }
};

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAsvSVxYOAqKe9pS9xvnD5QZzrsPi-h3TA",
  authDomain: "sundrop-finance.firebaseapp.com",
  projectId: "sundrop-finance",
  storageBucket: "sundrop-finance.firebasestorage.app",
  messagingSenderId: "926693321098",
  appId: "1:926693321098:web:ccb70ce9f7f8473ab00073"
};

// ==========================================
// FIREBASE SERVICE
// ==========================================
const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const DOC_ID = "fy27_master_plan";

export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error("Login failed", error);
        return null;
    }
};

export const logout = async () => {
    await signOut(auth);
};

export const saveState = async (state: FinancialState) => {
  try {
    await setDoc(doc(db, "plans", DOC_ID), state);
    console.log("State saved to Firebase");
    return true;
  } catch (error) {
    console.error("Error saving to Firebase:", error);
    return false;
  }
};

export const loadState = async (): Promise<FinancialState | null> => {
  try {
    const docRef = doc(db, "plans", DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as FinancialState;
      
      // DEEP MERGE Logic to prevent crashes on old data schema
      // We must ensure the new 'allocations' object exists if loading old data
      const baseDiscounts = INITIAL_STATE.discounts;
      const mergedDiscounts = { ...baseDiscounts };

      if (data.discounts) {
          Object.keys(baseDiscounts).forEach((key) => {
             const dKey = key as keyof typeof baseDiscounts;
             const remoteDisc = data.discounts[dKey];
             // If remote has allocations, use them; otherwise fallback to initial
             // Keep id/label from INITIAL_STATE (code wins over stale Firebase)
             if (remoteDisc && remoteDisc.allocations) {
                 mergedDiscounts[dKey] = {
                     ...baseDiscounts[dKey],
                     allocations: remoteDisc.allocations
                 };
             }
          });
      }

      const baseFsas = INITIAL_STATE.fsas!;
      const mergedFsas = data.fsas
        ? { dollarPerHour: data.fsas.dollarPerHour ?? baseFsas.dollarPerHour, hoursByTier: { ...baseFsas.hoursByTier, ...data.fsas.hoursByTier } }
        : baseFsas;

      return {
        ...INITIAL_STATE,
        ...data,
        tuition: {
            ...INITIAL_STATE.tuition,
            ...data.tuition
        },
        discounts: mergedDiscounts,
        fsas: mergedFsas
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error loading from Firebase:", error);
    return null;
  }
};

export const subscribeToState = (callback: (state: FinancialState) => void) => {
    return onSnapshot(doc(db, "plans", DOC_ID), (doc) => {
        if (doc.exists()) {
             const data = doc.data() as FinancialState;
             // Repeat Deep Merge Logic
             const baseDiscounts = INITIAL_STATE.discounts;
             const mergedDiscounts = { ...baseDiscounts };

             if (data.discounts) {
                 Object.keys(baseDiscounts).forEach((key) => {
                    const dKey = key as keyof typeof baseDiscounts;
                    const remoteDisc = data.discounts[dKey];
                    if (remoteDisc && remoteDisc.allocations) {
                        mergedDiscounts[dKey] = {
                            ...baseDiscounts[dKey],
                            allocations: remoteDisc.allocations
                        };
                    }
                 });
             }

             const baseFsas = INITIAL_STATE.fsas!;
             const mergedFsas = data.fsas
               ? { dollarPerHour: data.fsas.dollarPerHour ?? baseFsas.dollarPerHour, hoursByTier: { ...baseFsas.hoursByTier, ...data.fsas.hoursByTier } }
               : baseFsas;

             const merged = {
                ...INITIAL_STATE,
                ...data,
                tuition: {
                    ...INITIAL_STATE.tuition,
                    ...data.tuition
                },
                discounts: mergedDiscounts,
                fsas: mergedFsas
             };
             callback(merged);
        }
    });
};

// ==========================================
// CALCULATION SERVICE
// ==========================================
export const calculateItemTotal = (item: LineItem): number => {
  const percentMod = item.baseline * (item.modifierPercent / 100);
  return item.baseline + percentMod + item.modifierFixed;
};

export const calculateFinancials = (state: FinancialState) => {
  let totalTuitionGross = 0;
  let totalHeadcount = 0;

  // 1. Calculate Tuition Gross & Helper Map
  const calculatedTiersMap: Record<string, TuitionTier & { calculatedPrice: number }> = {};

  const tiers = TIER_ORDER.map((id) => {
    const tier = state.tuition.tiers[id] || INITIAL_STATE.tuition.tiers[id];
    const calculatedPrice = state.tuition.baseFTPrice * (tier.ratio / 100);
    const gross = calculatedPrice * tier.qty;
    
    totalTuitionGross += gross;
    totalHeadcount += tier.qty;
    
    const enriched = { ...tier, calculatedPrice, gross };
    calculatedTiersMap[id] = enriched;
    return enriched;
  });
   
  // 2. Calculate Matrix Discounts
  let totalDiscounts = 0;
  
  const processedDiscounts = Object.values(state.discounts).map((disc: DiscountTier) => {
    let discTotal = 0;

    // Safety check for legacy data
    const allocs = disc.allocations || createEmptyAllocations();

    Object.entries(allocs).forEach(([tierId, alloc]) => {
        const tierData = calculatedTiersMap[tierId];
        if (tierData && alloc.qty > 0) {
            const val = (tierData.calculatedPrice * (alloc.discountPercent / 100)) * alloc.qty;
            discTotal += val;
        }
    });

    totalDiscounts += discTotal;
    return { ...disc, totalDiscountValue: discTotal, allocations: allocs };
  });

  const netTuition = totalTuitionGross - totalDiscounts;

  // FSAS yearly revenue: each cell = total kid-hours per day (Children × Hours). Sum all cells for week; * 36 weeks * $/hr
  const FSAS_WEEKS = 36;
  const fsasState = state.fsas || INITIAL_STATE.fsas!;
  let fsasTotalHoursPerWeek = 0;
  TIER_ORDER.forEach((tierId) => {
    const hours = fsasState.hoursByTier[tierId] || [0, 0, 0, 0, 0];
    fsasTotalHoursPerWeek += hours[0] + hours[1] + hours[2] + hours[3] + hours[4];
  });
  const fsasYearlyRevenue = fsasTotalHoursPerWeek * FSAS_WEEKS * (fsasState.dollarPerHour || 0);

  // 3. Revenue
  let totalRevenue = 0;
  const processedRevenue = state.revenueItems.map(item => {
    let val = 0;
    if (item.id === 'tuition') {
        val = netTuition;
    } else if (item.id === 'r_afterschool') {
        val = fsasYearlyRevenue;
    } else {
        val = calculateItemTotal(item);
    }
    totalRevenue += val;
    return { ...item, finalValue: val };
  });

  // 4. Expenses
  let totalExpenses = 0;
  const processedBudget = state.budgetItems.map(item => {
    const val = calculateItemTotal(item);
    totalExpenses += val;
    return { ...item, finalValue: val };
  });

  const netMargin = totalRevenue - totalExpenses;
  const marginPercent = totalRevenue > 0 ? (netMargin / totalRevenue) * 100 : 0;

  return {
    tiers,
    processedDiscounts,
    processedRevenue,
    processedBudget,
    totalTuitionGross,
    totalHeadcount,
    totalDiscounts,
    netTuition,
    totalRevenue,
    totalExpenses,
    netMargin,
    marginPercent
  };
};

// ==========================================
// COMPONENTS
// ==========================================

export const LogoutIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

export const SunIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="5"></circle>
    <line x1="12" y1="1" x2="12" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="23"></line>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
    <line x1="1" y1="12" x2="3" y2="12"></line>
    <line x1="21" y1="12" x2="23" y2="12"></line>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  </svg>
);

interface SmartTableProps {
  items: LineItem[];
  type: 'revenue' | 'budget';
  onUpdate: (id: string, field: 'modifierPercent' | 'modifierFixed' | 'finalValue' | 'baseline' | 'label', value: any) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  readOnlyIds?: string[];
}

export const SmartTable: React.FC<SmartTableProps> = ({ items, type, onUpdate, onAdd, onDelete, onMoveUp, onMoveDown, readOnlyIds = [] }) => {
  const isRevenue = type === 'revenue';
  const totalColor = isRevenue ? 'text-teal-400' : 'text-rose-400';
  const totalBaseline = items.reduce((acc, item) => acc + item.baseline, 0);
   
  const getFinal = (item: LineItem) => item.finalValue !== undefined ? item.finalValue : calculateItemTotal(item);
  const totalFinal = items.reduce((acc, item) => acc + getFinal(item), 0);
   
  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl">
      <table className="w-full text-sm text-left text-slate-300">
        <thead className="text-[10px] uppercase bg-slate-950/80 text-slate-500 font-bold tracking-widest border-b border-slate-800">
          <tr>
            <th className="px-8 py-3">Line Item</th>
            <th className="px-8 py-3 text-right">FY26 Baseline</th>
            <th className="px-8 py-3 text-center">Strategy %</th>
            <th className="px-8 py-3 text-center">Delta ($)</th>
            <th className="px-8 py-3 text-right">FY27 Final</th>
            <th className="px-2 py-3 text-center w-16">Order</th>
            <th className="px-4 py-3 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const isReadOnly = readOnlyIds.includes(item.id);
            const final = getFinal(item);
            const delta = final - item.baseline;
            
            return (
              <tr key={item.id} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-all group">
                <td className="px-8 py-3 font-medium">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => onUpdate(item.id, 'label', e.target.value)}
                    className={`bg-transparent border-b border-transparent hover:border-slate-700 focus:border-amber-500 focus:outline-none w-full py-1 ${isReadOnly ? 'text-amber-500' : 'text-slate-200'}`}
                    readOnly={isReadOnly}
                  />
                </td>
                <td className="px-8 py-3 text-right font-mono">
                  {isReadOnly ? (
                      <span className="opacity-40">${Math.round(item.baseline).toLocaleString()}</span>
                  ) : (
                    <input
                        type="number"
                        value={Math.round(item.baseline) || ''}
                        onChange={(e) => onUpdate(item.id, 'baseline', parseFloat(e.target.value) || 0)}
                        className="w-32 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-right focus:border-amber-500 outline-none text-xs"
                    />
                  )}
                </td>
                <td className="px-8 py-3 text-center font-mono">
                  {!isReadOnly && (
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="number"
                        value={item.modifierPercent || ''}
                        onChange={(e) => onUpdate(item.id, 'modifierPercent', parseFloat(e.target.value) || 0)}
                        className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-right text-xs focus:border-amber-500 outline-none"
                      />
                      <span className="text-[10px] text-slate-600 font-bold">%</span>
                    </div>
                  )}
                </td>
                <td className="px-8 py-3 text-center font-mono">
                  {!isReadOnly && (
                    <input
                      type="number"
                      value={Math.round(delta) || ''}
                      onChange={(e) => onUpdate(item.id, 'finalValue', item.baseline + (parseFloat(e.target.value) || 0))}
                      className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-right text-xs focus:border-amber-500 outline-none text-slate-400"
                    />
                  )}
                </td>
                <td className={`px-8 py-3 text-right font-bold font-mono ${isRevenue ? 'text-teal-400' : 'text-rose-400'}`}>
                   ${Math.round(final).toLocaleString()}
                </td>
                <td className="px-2 py-3">
                  {onMoveUp && onMoveDown && (
                    <div className="flex items-center justify-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => onMoveUp(item.id)}
                        disabled={index === 0}
                        className="p-1 rounded text-slate-500 hover:text-amber-500 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-all"
                        aria-label="Move up"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveDown(item.id)}
                        disabled={index === items.length - 1}
                        className="p-1 rounded text-slate-500 hover:text-amber-500 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-all"
                        aria-label="Move down"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {!isReadOnly && (
                    <button onClick={() => onDelete(item.id)} className="text-slate-700 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-slate-950/80 font-bold border-t border-slate-700">
            <tr>
                <td className="px-8 py-4">
                  <button onClick={onAdd} className="flex items-center gap-2 text-[10px] text-amber-500 hover:text-amber-400 uppercase tracking-[0.2em] transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Add Ledger Item
                  </button>
                </td>
                <td className="px-8 py-4 text-right opacity-40 font-mono">${Math.round(totalBaseline).toLocaleString()}</td>
                <td colSpan={2}></td>
                <td className={`px-8 py-4 text-right text-lg ${totalColor} font-mono`}>
                    ${Math.round(totalFinal).toLocaleString()}
                </td>
                <td></td>
                <td></td>
            </tr>
        </tfoot>
      </table>
    </div>
  );
};

// ==========================================
// APP COMPONENT
// ==========================================
const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
const ALLOWED_EMAILS = ["degraff.tim@gmail.com", "mariahfrye@gmail.com", "watterstj1@gmail.com"]; 

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState(CARDS.STRATEGY);
  const [state, setState] = useState<FinancialState>(INITIAL_STATE);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (user && ALLOWED_EMAILS.includes(user.email)) {
        loadState().then(data => { if (data) setState(data); });
        try {
          const unsubscribe = subscribeToState((newData) => {
              setState(newData);
              setLastSaved(new Date());
          });
          return () => unsubscribe();
        } catch (e) {
          console.error("Firebase subscription failed", e);
        }
    }
  }, [user]);

  // Debounced auto-save
  useEffect(() => {
    if (!user || !ALLOWED_EMAILS.includes(user.email)) return;
    
    const timer = setTimeout(() => {
      saveState(state).catch(e => console.error("Auto-save failed", e));
      setLastSaved(new Date());
    }, 2000);
    return () => clearTimeout(timer);
  }, [state, user]);

  const handleLogin = async () => {
    const googleUser = await loginWithGoogle();
    if (googleUser) {
        if (!ALLOWED_EMAILS.includes(googleUser.email)) {
            setAuthError(`Access denied: ${googleUser.email} is not authorized.`);
            await logout();
            setUser(null);
            return; 
        }
        setUser(googleUser);
        setAuthError("");
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setState(INITIAL_STATE); // Reset state on logout
  };

  const handleLineItemUpdate = (type: 'revenue' | 'budget', id: string, field: any, value: any) => {
    setState(prev => {
        const list = type === 'revenue' ? prev.revenueItems : prev.budgetItems;
        const updatedList = list.map(item => {
            if (item.id !== id) return item;
            if (field === 'finalValue') {
                const delta = value - item.baseline;
                const newPercent = item.baseline > 0 ? (delta / item.baseline) * 100 : 0;
                return { ...item, modifierPercent: newPercent, modifierFixed: 0 };
            }
            return { ...item, [field]: value };
        });
        return { ...prev, [type === 'revenue' ? 'revenueItems' : 'budgetItems']: updatedList };
    });
  };

  const handleMoveItem = (type: 'revenue' | 'budget', id: string, direction: 'up' | 'down') => {
    setState(prev => {
      const list = type === 'revenue' ? [...prev.revenueItems] : [...prev.budgetItems];
      const i = list.findIndex(item => item.id === id);
      if (i === -1) return prev;
      if (direction === 'up' && i > 0) {
        [list[i - 1], list[i]] = [list[i], list[i - 1]];
      } else if (direction === 'down' && i < list.length - 1) {
        [list[i], list[i + 1]] = [list[i + 1], list[i]];
      } else return prev;
      return { ...prev, [type === 'revenue' ? 'revenueItems' : 'budgetItems']: list };
    });
  };

  const handleAddItem = (type: 'revenue' | 'budget') => {
    const prefix = type === 'revenue' ? 'r_custom' : 'b_custom';
    const newItem: LineItem = {
      id: `${prefix}_${Date.now()}`,
      label: 'New Item',
      baseline: 0,
      modifierPercent: 0,
      modifierFixed: 0
    };
    setState(prev => {
      const list = type === 'revenue' ? [...prev.revenueItems, newItem] : [...prev.budgetItems, newItem];
      return { ...prev, [type === 'revenue' ? 'revenueItems' : 'budgetItems']: list };
    });
  };

  const handleDeleteItem = (type: 'revenue' | 'budget', id: string) => {
    if (type === 'revenue' && id === 'tuition') return; // Never delete tuition
    setState(prev => {
      const list = (type === 'revenue' ? prev.revenueItems : prev.budgetItems).filter(item => item.id !== id);
      return { ...prev, [type === 'revenue' ? 'revenueItems' : 'budgetItems']: list };
    });
  };

  const financials = calculateFinancials(state);

  const revenuePieData = useMemo(() => {
    const totalGross = financials.totalTuitionGross || 1;
    const ftGross = financials.tiers.find(t => t.id === 'tuitionFT')?.gross || 0;
    const ptGross = financials.tiers.filter(t => t.id !== 'tuitionFT').reduce((s, t) => s + t.gross, 0);
    
    const ftNet = financials.netTuition * (ftGross / totalGross);
    const ptNet = financials.netTuition * (ptGross / totalGross);

    const afterschool = financials.processedRevenue.find(i => i.id === 'r_afterschool')?.finalValue || 0;
    const grants = financials.processedRevenue.filter(i => i.id.startsWith('r_state') || i.id.startsWith('r_local') || i.id.startsWith('r_oia')).reduce((s, i) => s + i.finalValue, 0);
    const other = financials.totalRevenue - financials.netTuition - afterschool - grants;

    const data = [
      { name: "Full-Time Tuition", value: ftNet },
      { name: "Part-Time Tuition", value: ptNet },
      { name: "Grants & State", value: grants },
      { name: "Afterschool", value: afterschool },
      { name: "Other", value: other }
    ].filter(v => v.value > 0);
    
    return data.sort((a, b) => b.value - a.value);
  }, [financials]);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-rose-500"></div>
          <div className="flex justify-center mb-6"><SunIcon className="w-16 h-16 text-amber-500" /></div>
          <h1 className="text-2xl font-bold text-center text-white mb-2 tracking-tight uppercase">SUNDROP FINANCE</h1>
          <p className="text-center text-slate-400 mb-8 text-sm uppercase tracking-widest font-bold">Authorized Access Only</p>
          
          <button onClick={handleLogin} className="w-full bg-white text-slate-900 font-bold py-3 rounded-lg flex items-center justify-center gap-3 hover:bg-slate-100 transition-all mb-3">
             <span className="w-5 h-5 flex items-center justify-center bg-slate-200 rounded-full text-xs font-bold">G</span>
             Sign in with Google
          </button>
          
          {authError && <p className="text-rose-500 text-xs text-center mt-4 font-bold">{authError}</p>}
        </div>
      </div>
    );
  }
 
  return (
    <div className="min-h-screen pb-20 bg-[#0a0f1d] print:bg-white print:text-black">
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/50 px-6 h-16 flex items-center justify-between no-print">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center text-black shadow-lg shadow-amber-500/20"><SunIcon className="w-5 h-5" /></div>
          <span className="text-lg font-bold tracking-tight text-white uppercase hidden md:inline">SUNDROP <span className="text-amber-500">FINANCE</span></span>
        </div>
        
        <nav className="flex items-center space-x-1 bg-slate-950 rounded-full p-1 border border-slate-800/50">
          {[
            { id: 'strategy', label: 'STRATEGY', short: 'STRAT' },
            { id: 'fsas', label: 'FSAS', short: 'FSAS' },
            { id: 'revenue', label: 'REVENUE', short: 'REV' },
            { id: 'budget', label: 'BUDGET', short: 'BUDG' }
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 md:px-5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-slate-800 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}>
              <span className="md:hidden">{tab.short}</span>
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
           <div className="text-right hidden xl:block">
             <span className="text-[9px] uppercase text-slate-500 font-bold tracking-widest block leading-none mb-1">Net Margin</span>
             <span className={`text-xl font-bold leading-none ${financials.netMargin >= 0 ? 'text-teal-400' : 'text-rose-500'}`}>
                 ${Math.round(financials.netMargin).toLocaleString()}
             </span>
           </div>
           <div className="h-10 border-l border-slate-800/50 hidden md:block"></div>
           <div className="flex items-center gap-3 bg-slate-900/50 rounded-full pl-4 pr-1.5 py-1.5 border border-slate-800/50">
              <div className="text-right hidden sm:block">
                 <p className="text-[10px] font-bold text-white leading-none truncate max-w-[120px]">
                    {user.email}
                 </p>
                 <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                    ADMINISTRATOR
                 </p>
              </div>
              <button onClick={handleLogout} className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-950 border border-slate-800 text-slate-500 hover:text-rose-500 transition-all active:scale-95">
                 <LogoutIcon />
              </button>
              <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-amber-500/50 shadow-lg shadow-amber-500/10" />
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-1 pb-20 md:pt-4 space-y-6">
        {/* Strategy Section */}
        <div className={`${activeTab === 'strategy' ? 'block' : 'hidden'} print-section space-y-6`}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Learners', val: financials.totalHeadcount, color: 'text-white' },
              { label: 'Net Tuition', val: `$${Math.round(financials.netTuition/1000)}K`, color: 'text-amber-500' },
              { label: 'Total Revenue', val: `$${Math.round(financials.totalRevenue/1000)}K`, color: 'text-emerald-400' },
              { label: 'Total Expenses', val: `$${Math.round(financials.totalExpenses/1000)}K`, color: 'text-rose-500' },
              { 
                  label: 'Margin', 
                  val: `$${Math.round(financials.netMargin).toLocaleString()}`, 
                  color: financials.netMargin >= 0 ? 'text-teal-500' : 'text-rose-500', 
                  sub: `${financials.marginPercent.toFixed(1)}%` 
              }
            ].map((kpi, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm shadow-xl">
                <p className="text-[9px] uppercase font-bold text-slate-500 tracking-widest mb-1.5">{kpi.label}</p>
                <div className="flex items-baseline justify-between">
                    <p className={`text-xl md:text-2xl font-bold ${kpi.color}`}>{kpi.val}</p>
                    {(kpi as any).sub && <span className={`text-sm font-bold ${kpi.color} opacity-80`}>{(kpi as any).sub}</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-5 md:p-6 relative overflow-hidden shadow-2xl">
                <h2 className="text-lg font-bold text-white uppercase tracking-tighter mb-4 flex items-center">
                  <span className="w-1.5 h-6 bg-amber-500 mr-4 rounded-full"></span>Tuition Engine
                </h2>
                <div className="space-y-6">
                  <div className="bg-slate-950/80 p-4 md:p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-4 md:gap-8 items-center justify-between">
                    <div className="flex-1 w-full">
                      <label className="text-[9px] text-amber-500 font-bold uppercase tracking-widest mb-2 block">Base Full-Time Rate (Yearly)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-2xl font-light">$</span>
                        <input type="number" value={state.tuition.baseFTPrice} onChange={(e) => setState(s => ({...s, tuition: {...s.tuition, baseFTPrice: parseFloat(e.target.value)||0}}))} className="w-full bg-slate-900 border-2 border-slate-800 text-3xl font-bold text-white pl-10 pr-4 py-2 rounded-xl focus:border-amber-500 outline-none" />
                      </div>
                    </div>
                    <div className="text-right w-full md:w-auto">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">TOTAL LEARNERS</p>
                      <p className="text-2xl font-bold text-white">{financials.totalHeadcount}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {financials.tiers.map((tier) => (
                      <div key={tier.id} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/60 hover:bg-slate-800/40 transition-all group">
                        <div className="flex justify-between items-center mb-2.5">
                          <h3 className="text-[11px] font-bold text-slate-200 uppercase tracking-wide">{tier.label}</h3>
                          <div className="text-sm font-bold text-teal-400">${Math.round(tier.calculatedPrice).toLocaleString()}</div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 flex items-center justify-between bg-slate-950 rounded-lg border border-slate-800 px-3 py-2">
                                <input 
                                    type="number" 
                                    value={tier.ratio} 
                                    onChange={(e) => setState(s => ({...s, tuition: {...s.tuition, tiers: {...s.tuition.tiers, [tier.id]: {...tier, ratio: parseFloat(e.target.value)||0}} }}))}
                                    className="w-12 bg-transparent font-bold text-amber-500 text-xs outline-none"
                                />
                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">% Ratio</span>
                            </div>
                            <div className="flex-1 flex items-center justify-between bg-slate-950 rounded-lg border border-slate-800 px-3 py-2">
                                <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Qty</span>
                                <input 
                                    type="number" 
                                    value={tier.qty} 
                                    onChange={(e) => setState(s => ({...s, tuition: {...s.tuition, tiers: {...s.tuition.tiers, [tier.id]: {...tier, qty: parseInt(e.target.value)||0}} }}))} 
                                    className="w-12 bg-transparent font-bold text-white text-xs text-right outline-none" 
                                />
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Discounts Section - MATRIX UI */}
              <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-5 md:p-6 shadow-xl">
                <h3 className="text-lg font-bold text-white uppercase tracking-tighter mb-4 flex items-center">
                  <span className="w-1.5 h-6 bg-rose-500 mr-4 rounded-full"></span>DISCOUNTS
                </h3>
                
                <div className="space-y-6">
                  {financials.processedDiscounts.map(d => (
                    <div key={d.id} className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800 shadow-lg">
                      <div className="flex justify-between items-end mb-3 pb-2 border-b border-slate-800/50">
                          <div className="text-[10px] font-bold uppercase text-amber-500 tracking-[0.15em]">{d.label}</div>
                          <div className="text-sm font-bold text-rose-500">-${Math.round(d.totalDiscountValue || 0).toLocaleString()}</div>
                      </div>

                      <div className="grid grid-cols-12 gap-2 mb-2 px-1">
                          <div className="col-span-4 text-[8px] font-bold text-slate-600 uppercase tracking-widest">Tier</div>
                          <div className="col-span-3 text-[8px] font-bold text-slate-600 uppercase tracking-widest text-center">Learners</div>
                          <div className="col-span-3 text-[8px] font-bold text-slate-600 uppercase tracking-widest text-center">Disc %</div>
                          <div className="col-span-2 text-[8px] font-bold text-slate-600 uppercase tracking-widest text-right">Saving</div>
                      </div>

                      <div className="space-y-1">
                        {financials.tiers.map((tier) => {
                            const alloc = d.allocations?.[tier.id] || { qty: 0, discountPercent: 0 };
                            const saving = (tier.calculatedPrice * (alloc.discountPercent / 100)) * alloc.qty;
                            
                            return (
                                <div key={tier.id} className="grid grid-cols-12 gap-2 items-center hover:bg-slate-900/50 rounded p-1 transition-colors">
                                    <div className="col-span-4 text-[9px] font-bold text-slate-400 truncate">
                                        {tier.label}
                                    </div>

                                    <div className="col-span-3 text-center">
                                        <input 
                                            type="number" 
                                            value={alloc.qty} 
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 0;
                                                setState(s => ({
                                                    ...s, 
                                                    discounts: {
                                                        ...s.discounts,
                                                        [d.id]: {
                                                            ...s.discounts[d.id],
                                                            allocations: {
                                                                ...s.discounts[d.id].allocations,
                                                                [tier.id]: { ...alloc, qty: val }
                                                            }
                                                        }
                                                    }
                                                }));
                                            }}
                                            className="bg-slate-900 border border-slate-700 focus:border-amber-500 w-full text-center rounded text-[10px] font-bold py-1 text-white outline-none" 
                                        />
                                    </div>

                                    <div className="col-span-3 text-center">
                                        <input 
                                            type="number" 
                                            value={alloc.discountPercent} 
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                setState(s => ({
                                                    ...s, 
                                                    discounts: {
                                                        ...s.discounts,
                                                        [d.id]: {
                                                            ...s.discounts[d.id],
                                                            allocations: {
                                                                ...s.discounts[d.id].allocations,
                                                                [tier.id]: { ...alloc, discountPercent: val }
                                                            }
                                                        }
                                                    }
                                                }));
                                            }}
                                            className="bg-slate-900 border border-slate-700 focus:border-amber-500 w-full text-center rounded text-[10px] font-bold py-1 text-white outline-none" 
                                        />
                                    </div>

                                    <div className="col-span-2 text-right text-[9px] font-mono text-slate-500">
                                        {saving > 0 ? `-${Math.round(saving).toLocaleString()}` : '-'}
                                    </div>
                                </div>
                            );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Savings</span>
                  <span className="text-xl font-bold text-rose-500">-${Math.round(financials.totalDiscounts).toLocaleString()}</span>
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-5 md:p-6 flex flex-col shadow-2xl h-fit">
                <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-6">Revenue Mix</h3>
                <div className="relative h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={revenuePieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={0} startAngle={90} endAngle={-270} dataKey="value" stroke="#0a0f1d" strokeWidth={4}>
                        {revenuePieData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{backgroundColor: '#0a0f1d', borderRadius: '12px', border: '1px solid #1e293b', fontSize: '9px', color: '#ffffff'}} itemStyle={{color: '#ffffff'}} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 space-y-3">
                  {revenuePieData.map((item, idx) => {
                    const percent = (item.value / financials.totalRevenue) * 100;
                    return (
                      <div key={idx} className="flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></div>
                          <span className="text-[10px] font-bold text-slate-400">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-mono font-bold text-slate-200 mr-2">${Math.round(item.value/1000).toLocaleString()}K</span>
                          <span className="text-[9px] font-bold text-slate-500 inline-block w-6">{Math.round(percent)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FSAS Section */}
        <div className={`${activeTab === 'fsas' ? 'block' : 'hidden'} print-section space-y-6`}>
          <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-5 md:p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white uppercase tracking-tighter mb-4 flex items-center">
              <span className="w-1.5 h-6 bg-amber-500 mr-4 rounded-full"></span>Afterschool Revenue Calculator
            </h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-4">Feeds 101-405 Afterschool Program Revenue</p>

            <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-4">Enter the total number of estimated Child-Hours per day (Children × # of Hours).</p>

            <div className="bg-slate-950/80 p-4 md:p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-4 md:gap-8 items-center justify-between mb-6">
              <div className="flex-1 w-full">
                <label className="text-[9px] text-amber-500 font-bold uppercase tracking-widest mb-2 block">Total $/hr (Rate)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-2xl font-light">$</span>
                  <input
                    type="number"
                    value={state.fsas?.dollarPerHour ?? ''}
                    onChange={(e) => setState(s => ({
                      ...s,
                      fsas: { ...(s.fsas || INITIAL_STATE.fsas!), dollarPerHour: parseFloat(e.target.value) || 0 }
                    }))}
                    className="w-full bg-slate-900 border-2 border-slate-800 text-3xl font-bold text-white pl-10 pr-4 py-2 rounded-xl focus:border-amber-500 outline-none"
                  />
                </div>
              </div>
              <div className="text-right w-full md:w-auto">
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">FY27 Afterschool Revenue</p>
                <p className="text-2xl font-bold text-teal-400">${Math.round(financials.processedRevenue.find(i => i.id === 'r_afterschool')?.finalValue || 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/80">
              <table className="w-full text-sm text-slate-300 table-fixed">
                <thead className="text-[10px] uppercase bg-slate-950/80 text-slate-500 font-bold tracking-widest border-b border-slate-800">
                  <tr>
                    <th className="py-3 text-center w-[14.28%]">Tier</th>
                    <th className="py-3 text-center w-[14.28%]"># Students</th>
                    <th className="py-3 text-center w-[14.28%]">Mon</th>
                    <th className="py-3 text-center w-[14.28%]">Tue</th>
                    <th className="py-3 text-center w-[14.28%]">Wed</th>
                    <th className="py-3 text-center w-[14.28%]">Thu</th>
                    <th className="py-3 text-center w-[14.28%]">Fri</th>
                  </tr>
                </thead>
                <tbody>
                  {TIER_ORDER.map((tierId) => {
                    const tier = state.tuition.tiers[tierId] || INITIAL_STATE.tuition.tiers[tierId];
                    const hours = (state.fsas?.hoursByTier || INITIAL_STATE.fsas!.hoursByTier)[tierId] || [0, 0, 0, 0, 0];
                    const shortLabels: Record<string, string> = {
                      tuitionFT: 'FT (5 day)',
                      tuition4Day: '4-day',
                      tuition3Day: '3-day',
                      tuition2Day: '2-day',
                      tuition1Day: '1-day',
                      tuitionHalfDay: 'Half-day'
                    };
                    return (
                      <tr key={tierId} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-all">
                        <td className="py-3 text-center font-medium text-slate-200">{shortLabels[tierId] ?? tier?.label}</td>
                        <td className="py-3 text-center font-mono text-slate-300">{tier?.qty ?? 0}</td>
                        {[0, 1, 2, 3, 4].map((dayIdx) => (
                          <td key={dayIdx} className="py-2 text-center">
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              value={hours[dayIdx] === 0 ? '' : hours[dayIdx]}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setState(s => {
                                  const fsas = s.fsas || INITIAL_STATE.fsas!;
                                  const next = [...(fsas.hoursByTier[tierId] || [0, 0, 0, 0, 0])];
                                  next[dayIdx] = val;
                                  return { ...s, fsas: { ...fsas, hoursByTier: { ...fsas.hoursByTier, [tierId]: next } } };
                                });
                              }}
                              className="w-full max-w-[4rem] mx-auto block bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-center text-xs font-mono text-white focus:border-amber-500 outline-none"
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-950/80 font-bold border-t border-slate-700 text-[10px] uppercase text-slate-500 tracking-widest">
                  <tr>
                    <td className="py-3 text-center">Sub-total (hrs/day)</td>
                    <td className="py-3 text-center">—</td>
                    {[0, 1, 2, 3, 4].map((dayIdx) => {
                      const dayTotal = TIER_ORDER.reduce((sum, tierId) => {
                        const hours = (state.fsas?.hoursByTier || INITIAL_STATE.fsas!.hoursByTier)[tierId] || [0, 0, 0, 0, 0];
                        return sum + (hours[dayIdx] || 0);
                      }, 0);
                      return (
                        <td key={dayIdx} className="py-3 text-center font-mono text-teal-400">{dayTotal > 0 ? dayTotal.toFixed(1) : '—'}</td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </div>

        {/* Revenue Section */}
        <div className={`${activeTab === 'revenue' ? 'block' : 'hidden'} print-section space-y-2`}>
           <h2 className="text-lg font-bold text-white uppercase tracking-tighter mb-1">Revenue Sources</h2>
           <SmartTable items={financials.processedRevenue} type="revenue" onUpdate={(id, f, v) => handleLineItemUpdate('revenue', id, f, v)} onAdd={() => handleAddItem('revenue')} onDelete={(id) => handleDeleteItem('revenue', id)} onMoveUp={(id) => handleMoveItem('revenue', id, 'up')} onMoveDown={(id) => handleMoveItem('revenue', id, 'down')} readOnlyIds={['tuition', 'r_afterschool']} />
        </div>

        {/* Budget Section */}
        <div className={`${activeTab === 'budget' ? 'block' : 'hidden'} print-section space-y-2`}>
            <h2 className="text-lg font-bold text-white uppercase tracking-tighter mb-1">Expense Ledger</h2>
            <SmartTable items={financials.processedBudget} type="budget" onUpdate={(id, f, v) => handleLineItemUpdate('budget', id, f, v)} onAdd={() => handleAddItem('budget')} onDelete={(id) => handleDeleteItem('budget', id)} onMoveUp={(id) => handleMoveItem('budget', id, 'up')} onMoveDown={(id) => handleMoveItem('budget', id, 'down')} />
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 w-full bg-slate-950/90 backdrop-blur-xl border-t border-slate-900 py-3 px-6 text-[9px] font-bold text-slate-600 flex justify-between tracking-[0.2em] uppercase z-40 no-print">
        <div className="flex items-center gap-4">
            <span className="text-slate-500">
              Sundrop Finance FY27 - Updated
              {lastSaved && (
                <> {lastSaved.toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })} EST</>
              )}
            </span>
            <span className="text-teal-900">SYSTEM READY</span>
        </div>
        <div className="flex gap-4">
            <span>{lastSaved ? "SYNCED" : "CONNECTING..."}</span>
        </div>
      </footer>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
