import { FinancialState, LineItem, TuitionTier, DiscountTier } from "../types.ts";

export const calculateItemTotal = (item: LineItem): number => {
  const percentMod = item.baseline * (item.modifierPercent / 100);
  return item.baseline + percentMod + item.modifierFixed;
};

export const calculateFinancials = (state: FinancialState) => {
  // 1. Calculate Tuition Gross
  let totalTuitionGross = 0;
  let totalHeadcount = 0;

  const tiers = Object.values(state.tuition.tiers).map((tier: TuitionTier) => {
    // Dynamic price based on Base FT Price * Ratio
    // We treat the stored price as a cache, but recalculate here for display
    const calculatedPrice = state.tuition.baseFTPrice * (tier.ratio / 100);
    const gross = calculatedPrice * tier.qty;
    totalTuitionGross += gross;
    totalHeadcount += tier.qty;
    return { ...tier, calculatedPrice, gross };
  });

  // 2. Calculate Discounts
  // Logic: (TotalQty * AvgPrice) * (Discount% * Count) ??
  // Better Logic based on spec interpretation:
  // We need an "Average Price Per Head" to apply the discount % against.
  const avgPricePerHead = totalHeadcount > 0 ? totalTuitionGross / totalHeadcount : 0;
  
  let totalDiscounts = 0;
  const processedDiscounts = Object.values(state.discounts).map((disc: DiscountTier) => {
    const discountValue = (avgPricePerHead * (disc.discountPercent / 100)) * disc.qty;
    totalDiscounts += discountValue;
    return { ...disc, discountValue };
  });

  const netTuition = totalTuitionGross - totalDiscounts;

  // 3. Calculate Revenue
  let totalRevenue = 0;
  const processedRevenue = state.revenueItems.map(item => {
    let val = 0;
    if (item.id === 'tuition') {
        // HARD LINK to Strategy Tab
        val = netTuition;
    } else {
        val = calculateItemTotal(item);
    }
    totalRevenue += val;
    return { ...item, finalValue: val };
  });

  // 4. Calculate Expenses
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