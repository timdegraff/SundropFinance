// Sync update: FY27.1 - UI Refinement & Auth Flow Optimization
import React, { useState, useEffect, useMemo, useCallback } from "react";
import ReactDOM from "react-dom/client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- CONFIG & DATA ---

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAsvSVxYOAqKe9pS9xvnD5QZzrsPi-h3TA",
  authDomain: "sundrop-finance.firebaseapp.com",
  projectId: "sundrop-finance",
  storageBucket: "sundrop-finance.firebasestorage.app",
  messagingSenderId: "926693321098",
  appId: "1:926693321098:web:ccb70ce9f7f8473ab00073"
};

const ALLOWED_EMAILS = ["degraff.tim@gmail.com", "mariahfrye@gmail.com", "watterstj1@gmail.com"];
const DOC_ID = "fy27_master_plan";
const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#6366f1', '#ec4899'];

const BASELINE_BUDGET = [
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

const BASELINE_REVENUE = [
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

const INITIAL_STATE = {
  tuition: {
    baseFTPrice: 7520,
    tiers: {
      tuitionFT: { id: 'tuitionFT', label: 'Full-Time (5 Days)', qty: 30, ratio: 100 },
      tuition4Day: { id: 'tuition4Day', label: '4-Day Tier', qty: 4, ratio: 80 },
      tuition3Day: { id: 'tuition3Day', label: '3-Day Tier', qty: 5, ratio: 60 },
      tuition2Day: { id: 'tuition2Day', label: '2-Day Tier', qty: 0, ratio: 40 },
      tuition1Day: { id: 'tuition1Day', label: '1-Day Tier', qty: 0, ratio: 20 },
      tuitionHalfDay: { id: 'tuitionHalfDay', label: 'Half-Day (5 Days)', qty: 4, ratio: 50 },
    }
  },
  discounts: {
    staff: { id: 'staff', label: 'Staff Discount', qty: 2, discountPercent: 50 },
    sibling: { id: 'sibling', label: 'Sibling Discount', qty: 8, discountPercent: 5 },
    early: { id: 'early', label: 'Early Bird', qty: 12, discountPercent: 5 },
  },
  revenueItems: BASELINE_REVENUE,
  budgetItems: BASELINE_BUDGET
};

// --- APP INITIALIZATION ---

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);
const auth = getAuth(app);

const calculateItemTotal = (item) => {
  return item.baseline + (item.baseline * (item.modifierPercent / 100)) + item.modifierFixed;
};

// --- ICONS ---

const Icons = {
  Sun: ({ className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
  ),
  Logout: ({ className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
  ),
  PDF: ({ className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
  ),
  Trash: ({ className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
  ),
  TrendingUp: ({ className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
  )
};

// --- COMPONENTS ---

const SmartTable = ({ items, type, onUpdate, onAdd, onDelete, readOnlyIds = [] }) => {
  const isRevenue = type === 'revenue';
  const totalColor = isRevenue ? 'text-teal-400' : 'text-rose-400';
  const totalBaseline = items.reduce((acc, i) => acc + i.baseline, 0);
  const totalFinal = items.reduce((acc, i) => acc + calculateItemTotal(i), 0);

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur shadow-xl print:shadow-none print:border-slate-300 print:bg-white">
      <table className="w-full text-sm text-left text-slate-300 print:text-black">
        <thead className="text-[10px] uppercase bg-slate-950/80 text-slate-500 font-black tracking-widest border-b border-slate-800 print:bg-slate-100 print:border-slate-300">
          <tr>
            <th className="px-6 py-4">Line Item</th>
            <th className="px-6 py-4 text-right">FY26 Baseline</th>
            <th className="px-6 py-4 text-center">Strategy %</th>
            <th className="px-6 py-4 text-center">Delta ($)</th>
            <th className="px-6 py-4 text-right">FY27 Final</th>
            <th className="px-4 py-4 w-10 print:hidden"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isReadOnly = readOnlyIds.includes(item.id);
            const final = calculateItemTotal(item);
            const delta = final - item.baseline;
            return (
              <tr key={item.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group print:border-slate-200 print:hover:bg-transparent">
                <td className="px-6 py-4 font-bold">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => onUpdate(item.id, 'label', e.target.value)}
                    className={`bg-transparent border-b border-transparent hover:border-slate-700 focus:border-amber-500 focus:outline-none w-full py-1 print:border-none ${isReadOnly ? 'text-amber-500' : 'text-slate-200 print:text-black'}`}
                    readOnly={isReadOnly}
                  />
                </td>
                <td className="px-6 py-4 text-right font-mono text-xs">
                  {isReadOnly ? (
                    <span className="opacity-40">${Math.round(item.baseline).toLocaleString()}</span>
                  ) : (
                    <input
                      type="number"
                      value={Math.round(item.baseline) || ''}
                      onChange={(e) => onUpdate(item.id, 'baseline', parseFloat(e.target.value) || 0)}
                      className="w-24 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-right focus:border-amber-500 outline-none print:bg-transparent print:border-none"
                    />
                  )}
                </td>
                <td className="px-6 py-4 text-center font-mono text-xs">
                  {!isReadOnly && (
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="number"
                        value={item.modifierPercent || ''}
                        onChange={(e) => onUpdate(item.id, 'modifierPercent', parseFloat(e.target.value) || 0)}
                        className="w-14 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-right focus:border-amber-500 outline-none print:bg-transparent print:border-none"
                      />
                      <span className="text-[10px] text-slate-600">%</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-center font-mono text-xs">
                   {!isReadOnly && (
                    <input
                      type="number"
                      value={Math.round(delta) || ''}
                      onChange={(e) => onUpdate(item.id, 'finalValue', item.baseline + (parseFloat(e.target.value) || 0))}
                      className="w-24 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-right focus:border-amber-500 outline-none text-slate-500 print:bg-transparent print:border-none"
                    />
                  )}
                </td>
                <td className={`px-6 py-4 text-right font-black font-mono ${isRevenue ? 'text-teal-400' : 'text-rose-400 print:text-red-600'}`}>
                  ${Math.round(final).toLocaleString()}
                </td>
                <td className="px-4 py-4 text-center print:hidden">
                  {!isReadOnly && (
                    <button onClick={() => onDelete(item.id)} className="text-slate-700 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Icons.Trash />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-slate-950/80 font-black border-t border-slate-800 print:bg-slate-50 print:border-slate-300">
          <tr>
            <td className="px-6 py-4">
               <button onClick={onAdd} className="flex items-center gap-2 text-[10px] text-amber-500 hover:text-amber-400 uppercase tracking-widest transition-all print:hidden">
                Add Item
              </button>
            </td>
            <td className="px-6 py-4 text-right opacity-40 font-mono text-xs">${Math.round(totalBaseline).toLocaleString()}</td>
            <td colSpan={2}></td>
            <td className={`px-6 py-4 text-right text-lg ${totalColor} font-mono`}>${Math.round(totalFinal).toLocaleString()}</td>
            <td className="print:hidden"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

// --- MAIN APP ---

function App() {
  const [user, setUser] = useState(null);
  const [state, setState] = useState(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState('strategy');
  const [lastSaved, setLastSaved] = useState(null);

  // Auth Handler with prompt forced
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(auth, provider);
      if (ALLOWED_EMAILS.includes(result.user.email)) {
        setUser(result.user);
      } else {
        await signOut(auth);
        alert("Access Denied.");
      }
    } catch (e) {
      console.error("Login failed", e);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u && ALLOWED_EMAILS.includes(u.email)) {
        setUser(u);
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen for Data
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, "plans", DOC_ID), (snap) => {
      if (snap.exists()) {
        setState(prev => ({ ...prev, ...snap.data() }));
      }
    }, (error) => {
      console.warn("Snapshot listener error (likely permissions):", error.message);
    });
    return () => unsubscribe();
  }, [user]);

  // Debounced Auto-Save
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(async () => {
      try {
        await setDoc(doc(db, "plans", DOC_ID), state);
        setLastSaved(new Date());
      } catch (e) {
        console.warn("Save sync delay...");
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [state, user]);

  const handleUpdate = (type, id, field, val) => {
    setState(prev => {
      const list = type === 'revenue' ? prev.revenueItems : prev.budgetItems;
      const newList = list.map(item => {
        if (item.id !== id) return item;
        if (field === 'finalValue') {
          const delta = val - item.baseline;
          return { ...item, modifierPercent: item.baseline > 0 ? (delta / item.baseline) * 100 : 0, modifierFixed: 0 };
        }
        return { ...item, [field]: val };
      });
      return { ...prev, [type === 'revenue' ? 'revenueItems' : 'budgetItems']: newList };
    });
  };

  const financials = useMemo(() => {
    const basePrice = state.tuition.baseFTPrice;
    let grossTuition = 0;
    let students = 0;
    
    let ftGross = 0;
    let ptGross = 0;

    const tiers = Object.values(state.tuition.tiers).map(t => {
      const price = basePrice * (t.ratio / 100);
      const gross = price * t.qty;
      grossTuition += gross;
      students += t.qty;
      if (t.id === 'tuitionFT') ftGross = gross;
      else ptGross += gross;
      return { ...t, price, gross };
    });

    const avgPrice = students > 0 ? grossTuition / students : 0;
    let totalDiscounts = 0;
    const discounts = Object.values(state.discounts).map(d => {
      const val = (avgPrice * (d.discountPercent / 100)) * d.qty;
      totalDiscounts += val;
      return { ...d, value: val };
    });

    const netTuition = grossTuition - totalDiscounts;
    
    // Proportional split of net tuition for chart
    const ftNet = grossTuition > 0 ? ftGross - (totalDiscounts * (ftGross / grossTuition)) : 0;
    const ptNet = grossTuition > 0 ? ptGross - (totalDiscounts * (ptGross / grossTuition)) : 0;

    let totalRev = 0;
    const revItems = state.revenueItems.map(i => {
      const val = i.id === 'tuition' ? netTuition : calculateItemTotal(i);
      totalRev += val;
      return { ...i, finalValue: val };
    });

    let totalExp = 0;
    const expItems = state.budgetItems.map(i => {
      const val = calculateItemTotal(i);
      totalExp += val;
      return { ...i, finalValue: val };
    });

    const netMargin = totalRev - totalExp;
    const marginPct = totalRev > 0 ? (netMargin / totalRev) * 100 : 0;

    return { tiers, discounts, revItems, expItems, totalRev, totalExp, students, netTuition, ftNet, ptNet, totalDiscounts, netMargin, marginPct };
  }, [state]);

  const pieData = useMemo(() => {
    const as = financials.revItems.find(i => i.id === 'r_afterschool')?.finalValue || 0;
    const grants = financials.revItems.filter(i => i.id.startsWith('r_oia') || i.id.startsWith('r_state') || i.id.startsWith('r_local')).reduce((s,i) => s + i.finalValue, 0);
    const totalRevCalculated = financials.totalRev;
    
    const ft = financials.ftNet;
    const pt = financials.ptNet;
    const other = totalRevCalculated - ft - pt - as - grants;

    const raw = [
      { name: 'Full-Time Tuition', value: ft },
      { name: 'Part-Time Tuition', value: pt },
      { name: 'Grants & State', value: grants },
      { name: 'Afterschool', value: as },
      { name: 'Other', value: other }
    ].filter(v => v.value > 0);

    // Sort descending for legend and starting largest at 12 o'clock
    return raw.sort((a, b) => b.value - a.value);
  }, [financials]);

  // LOGIN SCREEN
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-rose-500"></div>
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-amber-500/10 rounded-lg flex items-center justify-center border border-amber-500/20">
               <Icons.Sun className="w-8 h-8 text-amber-500" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-center text-white mb-2 tracking-tight uppercase">SUNDROP FINANCE</h1>
          <p className="text-center text-slate-400 mb-8 text-sm font-black tracking-widest uppercase">Authorized Access Only</p>
          <div className="space-y-4">
            <button 
                onClick={handleLogin}
                className="w-full bg-white text-slate-900 font-black py-3 rounded-lg transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
            >
              Sign in with Google
            </button>
            <p className="text-[10px] text-center text-slate-600 uppercase tracking-widest font-black opacity-60">Secure Access Restricted</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 text-slate-300 bg-[#0a0f1d] print:bg-white print:text-black">
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/50 px-6 h-16 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-amber-500 rounded text-black shadow-lg shadow-amber-500/20"><Icons.Sun className="w-5 h-5" /></div>
          <span className="text-lg font-black text-white uppercase tracking-tighter hidden md:inline">SUNDROP <span className="text-amber-500">FINANCE</span></span>
        </div>
        <nav className="flex gap-1 bg-slate-950 rounded-full p-1 border border-slate-800">
          {[
            { id: 'strategy', short: 'STRAT', long: 'STRATEGY' },
            { id: 'revenue', short: 'REV', long: 'REVENUE' },
            { id: 'budget', short: 'BUDG', long: 'BUDGET' }
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-4 md:px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-slate-800 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}>
              <span className="md:hidden">{t.short}</span>
              <span className="hidden md:inline">{t.long}</span>
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-4">
           <div className="text-right hidden xl:block">
              <div className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] leading-none mb-1">Net Margin</div>
              <div className={`text-xl font-black leading-none ${financials.netMargin >= 0 ? 'text-teal-400' : 'text-rose-500'}`}>
                {financials.netMargin >= 0 ? '+' : ''}${Math.round(financials.netMargin).toLocaleString()}
              </div>
           </div>
           <div className="flex items-center gap-3 bg-slate-900/50 rounded-full pl-4 pr-1.5 py-1.5 border border-slate-800/50">
              <div className="text-right hidden sm:block">
                 <p className="text-[10px] font-black text-white leading-none truncate max-w-[120px]">{user.email}</p>
                 <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Admin Access</p>
              </div>
              <button onClick={handleLogout} title="Logout" className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-950 border border-slate-800 text-slate-500 hover:text-rose-500 transition-all active:scale-95">
                 <Icons.Logout />
              </button>
              <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-amber-500/50 shadow-lg" />
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-6 space-y-6">
        {/* Strategy Tab */}
        <div className={`${activeTab === 'strategy' ? 'block' : 'hidden'} print:block space-y-6`}>
          {/* KPI ROW */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'LEARNERS', val: financials.students, color: 'text-white' },
              { label: 'Net Tuition', val: `$${Math.round(financials.netTuition / 1000)}K`, color: 'text-amber-500' },
              { label: 'Total Revenue', val: `$${Math.round(financials.totalRev / 1000)}K`, color: 'text-teal-400' },
              { label: 'Total Exp', val: `$${Math.round(financials.totalExp / 1000)}K`, color: 'text-rose-500' },
              { label: 'Margin %', val: `${financials.marginPct.toFixed(1)}%`, color: 'text-teal-400' }
            ].map((kpi, i) => (
              <div key={i} className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 shadow-xl backdrop-blur">
                <p className="text-[9px] uppercase font-black text-slate-500 tracking-widest mb-1">{kpi.label}</p>
                <p className={`text-xl md:text-2xl font-black ${kpi.color}`}>{kpi.val}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* TUITION ENGINE */}
              <section className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 md:p-6 space-y-6 relative overflow-hidden shadow-2xl">
                <div className="flex items-center">
                    <div className="w-1.5 h-6 bg-amber-500 mr-4 rounded-full"></div>
                    <h2 className="text-lg font-black text-white uppercase tracking-tighter">Tuition Engine</h2>
                </div>
                
                <div className="bg-slate-950/80 p-4 md:p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
                   <div className="flex-1 w-full">
                      <label className="text-[9px] uppercase font-black text-amber-500 tracking-[0.2em] mb-1.5 block">Base Full-Time Rate (Yearly)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-2xl font-light">$</span>
                        <input type="number" value={state.tuition.baseFTPrice} onChange={(e) => setState(s => ({...s, tuition: {...s.tuition, baseFTPrice: parseFloat(e.target.value) || 0}}))} className="w-full bg-slate-900 border-2 border-slate-800 text-3xl font-black text-white pl-10 pr-4 py-2 rounded-xl focus:border-amber-500 transition-all outline-none" />
                      </div>
                   </div>
                   <div className="text-right w-full md:w-auto">
                      <p className="text-[9px] font-black uppercase text-amber-500 tracking-widest mb-0.5">TOTAL LEARNERS</p>
                      <p className="text-3xl font-black text-white">{financials.students}</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {financials.tiers.map(t => (
                    <div key={t.id} className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex flex-col">
                            <span className="text-slate-200 font-black uppercase text-[10px] tracking-wider">{t.label}</span>
                            <div className="mt-1 flex items-center gap-2">
                                <input 
                                    type="number" 
                                    value={t.ratio} 
                                    onChange={(e) => setState(s => ({...s, tuition: {...s.tuition, tiers: {...s.tuition.tiers, [t.id]: {...t, ratio: parseFloat(e.target.value) || 0}} }}))}
                                    className="w-24 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] font-black text-amber-500 text-center outline-none"
                                />
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">% Ratio</span>
                            </div>
                        </div>
                        <div className="text-lg font-black text-teal-400">${Math.round(t.price).toLocaleString()}</div>
                      </div>
                      <div className="bg-slate-900 rounded-xl p-3 flex justify-between items-center border border-slate-800">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Enrolled Qty</span>
                        <input type="number" value={t.qty} onChange={(e) => setState(s => ({...s, tuition: {...s.tuition, tiers: {...s.tuition.tiers, [t.id]: {...t, qty: parseInt(e.target.value) || 0}} }}))} className="w-12 bg-slate-950 border border-slate-800 text-center font-black text-white py-1 rounded-lg outline-none focus:border-amber-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* DISCOUNTS */}
              <section className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl">
                <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-4 flex items-center">
                  <span className="w-1.5 h-6 bg-rose-500 mr-4 rounded-full"></span>DISCOUNTS
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {financials.discounts.map(d => (
                    <div key={d.id} className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                      <div className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">{d.label}</div>
                      <div className="flex justify-between items-center border-y border-slate-800/50 py-2">
                        <div className="text-center">
                          <div className="text-[8px] text-slate-600 font-bold uppercase mb-0.5">Students</div>
                          <input type="number" value={d.qty} onChange={(e) => setState(s => ({...s, discounts: {...s.discounts, [d.id]: {...d, qty: parseInt(e.target.value) || 0}} }))} className="bg-slate-900 border border-slate-800 w-[72px] text-center rounded text-[10px] font-black p-0.5" />
                        </div>
                        <div className="text-center">
                          <div className="text-[8px] text-slate-600 font-bold uppercase mb-0.5">Disc %</div>
                          <input type="number" value={d.discountPercent} onChange={(e) => setState(s => ({...s, discounts: {...s.discounts, [d.id]: {...d, discountPercent: parseFloat(e.target.value) || 0}} }))} className="bg-slate-900 border border-slate-800 w-[72px] text-center rounded text-[10px] font-black p-0.5" />
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-rose-500">-${Math.round(d.value).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Net Savings</span>
                  <span className="text-base font-black text-rose-500">-${Math.round(financials.totalDiscounts).toLocaleString()}</span>
                </div>
              </section>
            </div>

            {/* REVENUE PIE CHART */}
            <div className="space-y-6">
               <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 md:p-6 flex flex-col shadow-2xl h-fit">
                  <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Revenue Mix</h3>
                  <div className="relative h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={pieData} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={60} 
                          outerRadius={80} 
                          paddingAngle={0} 
                          dataKey="value" 
                          stroke="#ffffff" 
                          strokeWidth={0.5} 
                          startAngle={90} 
                          endAngle={-270}
                        >
                          {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{background: '#0a0f1d', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px'}} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3 mt-4">
                    {pieData.map((p, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                            <span className="text-[10px] font-bold text-slate-400">{p.name}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-mono font-bold text-slate-200 mr-2">${Math.round(p.value/1000).toLocaleString()}K</span>
                            <span className="text-[9px] font-black text-slate-500 inline-block w-6 text-right">{Math.round((p.value/financials.totalRev)*100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Revenue Tab */}
        <div className={`${activeTab === 'revenue' ? 'block' : 'hidden'} space-y-4`}>
           <h2 className="text-lg font-black text-white uppercase tracking-tighter">Revenue Sources</h2>
           <SmartTable 
            items={financials.revItems} 
            type="revenue" 
            onUpdate={(id, f, v) => handleUpdate('revenue', id, f, v)}
            onAdd={() => setState(s => ({...s, revenueItems: [...s.revenueItems, {id: 'r_'+Date.now(), label: 'New Revenue', baseline: 0, modifierPercent: 0, modifierFixed: 0}]}))}
            onDelete={(id) => setState(s => ({...s, revenueItems: s.revenueItems.filter(i => i.id !== id)}))}
            readOnlyIds={['tuition']}
          />
        </div>

        {/* Budget Tab */}
        <div className={`${activeTab === 'budget' ? 'block' : 'hidden'} space-y-4`}>
            <h2 className="text-lg font-black text-white uppercase tracking-tighter">Expense Ledger</h2>
            <SmartTable 
            items={financials.expItems} 
            type="budget" 
            onUpdate={(id, f, v) => handleUpdate('budget', id, f, v)}
            onAdd={() => setState(s => ({...s, budgetItems: [...s.budgetItems, {id: 'b_'+Date.now(), label: 'New Expense', baseline: 0, modifierPercent: 0, modifierFixed: 0}]}))}
            onDelete={(id) => setState(s => ({...s, budgetItems: s.budgetItems.filter(i => i.id !== id)}))}
          />
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 w-full bg-slate-950/90 backdrop-blur-xl border-t border-slate-900 py-3 px-6 text-[9px] font-black text-slate-600 flex justify-between tracking-[0.2em] uppercase z-40 print:hidden">
        <div className="flex items-center gap-4">
            <span className="text-slate-500">FY27.1</span>
            <span className="text-teal-900">SYSTEM READY</span>
        </div>
        <span>{user ? `CONNECTED: ${lastSaved ? lastSaved.toLocaleTimeString() : 'SYNCING...'}` : 'OFFLINE'}</span>
      </footer>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);