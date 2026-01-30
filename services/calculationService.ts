// services/calculationService.ts
import { FinancialState, LineItem, TuitionTier, DiscountTier } from "../types.ts";

export const calculateItemTotal = (item: LineItem): number => {
  const percentMod = item.baseline * (item.modifierPercent / 100);
  return item.baseline + percentMod + item.modifierFixed;
};

export const calculateFinancials = (state: FinancialState) => {
  // 1. Calculate Tuition Gross & Individual Tier Prices
  let totalTuitionGross = 0;
  let totalHeadcount = 0;

  // We convert the tiers object to an array to iterate, but we also keep a map for easy lookup later
  const calculatedTiersMap: Record<string, TuitionTier & { calculatedPrice: number }> = {};
  
  const tiers = Object.values(state.tuition.tiers).map((tier: TuitionTier) => {
    const calculatedPrice = state.tuition.baseFTPrice * (tier.ratio / 100);
    const gross = calculatedPrice * tier.qty;
    
    totalTuitionGross += gross;
    totalHeadcount += tier.qty;

    const enrichedTier = { ...tier, calculatedPrice, gross };
    calculatedTiersMap[tier.id] = enrichedTier; // Save for discount lookup
    return enrichedTier;
  });

  // 2. Calculate Discounts (Matrix Logic)
  let totalDiscounts = 0;

  const processedDiscounts = Object.values(state.discounts).map((disc: DiscountTier) => {
    let discTotal = 0;

    // Iterate through allocations (FT, 3Day, etc.) within this specific discount
    Object.entries(disc.allocations).forEach(([tierId, alloc]) => {
        const tierData = calculatedTiersMap[tierId];
        if (tierData && alloc.qty > 0) {
            // Formula: (Price of this tier * (Discount% / 100)) * Qty of students
            const value = (tierData.calculatedPrice * (alloc.discountPercent / 100)) * alloc.qty;
            discTotal += value;
        }
    });

    totalDiscounts += discTotal;
    return { ...disc, totalDiscountValue: discTotal };
  });

  const netTuition = totalTuitionGross - totalDiscounts;

  // 3. Calculate Revenue (Unchanged)
  let totalRevenue = 0;
  const processedRevenue = state.revenueItems.map(item => {
    let val = 0;
    if (item.id === 'tuition') {
        val = netTuition;
    } else {
        val = calculateItemTotal(item);
    }
    totalRevenue += val;
    return { ...item, finalValue: val };
  });

  // 4. Calculate Expenses (Unchanged)
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
