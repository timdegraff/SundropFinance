import { LineItem, FinancialState } from "./types";

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
  { id: 'b_capital', label: '101-971 Capital Outlay', baseline: 25000, modifierPercent: 0, modifierFixed: 0 },
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

export const INITIAL_STATE: FinancialState = {
  tuition: {
    baseFTPrice: 7520,
    tiers: {
      tuitionFT: { id: 'tuitionFT', label: 'Full-Time (5 Days)', price: 7520, qty: 30, ratio: 100 },
      tuition3Day: { id: 'tuition3Day', label: '3-Day Tier', price: 4512, qty: 5, ratio: 60 },
      tuition2Day: { id: 'tuition2Day', label: '4-Day Tier', price: 6016, qty: 4, ratio: 80 },
      tuitionHalfDay: { id: 'tuitionHalfDay', label: 'Half-Day (5 Days)', price: 3760, qty: 4, ratio: 50 },
    }
  },
  discounts: {
    staff: { id: 'staff', label: 'Staff Discount', qty: 3, discountPercent: 50 },
    sibling: { id: 'sibling', label: 'Sibling Discount', qty: 10, discountPercent: 5 },
    early: { id: 'early', label: 'Early Bird', qty: 15, discountPercent: 5 },
  },
  revenueItems: BASELINE_REVENUE,
  budgetItems: BASELINE_BUDGET
};

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAsvSVxYOAqKe9pS9xvnD5QZzrsPi-h3TA",
  authDomain: "sundrop-finance.firebaseapp.com",
  projectId: "sundrop-finance",
  storageBucket: "sundrop-finance.firebasestorage.app",
  messagingSenderId: "926693321098",
  appId: "1:926693321098:web:ccb70ce9f7f8473ab00073"
};