import React, { useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom/client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- TYPES & CONSTANTS ---

type TabType = 'strategy' | 'revenue' | 'budget';

interface LineItem {
  id: string;
  label: string;
  baseline: number;
  modifierPercent: number;
  modifierFixed: number;
}

interface TuitionTier {
  id: string;
  label: string;
  price: number;
  qty: number;
  ratio: number;
}

interface DiscountTier {
  id: string;
  label: string;
  qty: number;
  discountPercent: number;
}

interface FinancialState {
  tuition: {
    baseFTPrice: number;
    tiers: Record<string, TuitionTier>;
  };
  discounts: Record<string, DiscountTier>;
  revenueItems: LineItem[];
  budgetItems: LineItem[];
}

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAsvSVxYOAqKe9pS9xvnD5QZzrsPi-h3TA",
  authDomain: "sundrop-finance.firebaseapp.com",
  projectId: "sundrop-finance",
  storageBucket: "sundrop-finance.firebasestorage.app",
  messagingSenderId: "926693321098",
  appId: "1:926693321098:web:ccb70ce9f7f8473ab00073"
};

const ALLOWED_EMAILS = ["degraff.tim@gmail.com", "mariahfrye@gmail.com", "watterstj1@gmail.com"];

const INITIAL_STATE: FinancialState = {
  tuition: {
    baseFTPrice: 7520,
    tiers: {
      tuitionFT: { id: 'tuitionFT', label: 'Full-Time (5 Days)', price: 7520, qty: 19, ratio: 100 },
      tuition4Day: { id: 'tuition4Day', label: '4-Day Tier', price: 6016, qty: 6, ratio: 80 },
      tuition3Day: { id: 'tuition3Day', label: '3-Day Tier', price: 4512, qty: 7, ratio: 60 },
      tuition2Day: { id: 'tuition2Day', label: '2-Day Tier', price: 3008, qty: 4, ratio: 40 },
      tuition1Day: { id: 'tuition1Day', label: '1-Day Tier', price: 1504, qty: 7, ratio: 20 },
      tuitionHalfDay: { id: 'tuitionHalfDay', label: 'Half-Day (5 Days)', price: 3760, qty: 0, ratio: 50 },
    }
  },
  discounts: {
    staff: { id: 'staff', label: 'Staff Discount', qty: 2, discountPercent: 50 },
    sibling: { id: 'sibling', label: 'Sibling Discount', qty: 8, discountPercent: 5 },
    early: { id: 'early', label: 'Early Bird', qty: 12, discountPercent: 5 },
  },
  revenueItems: [
    { id: 'tuition', label: '101-401 Tuition Income', baseline: 220000, modifierPercent: 0, modifierFixed: 0 },
    { id: 'r_afterschool', label: '101-405 Afterschool Program Revenue', baseline: 25000, modifierPercent: 0, modifierFixed: 0 },
    { id: 'r_donations', label: '101-420 Donations', baseline: 1500, modifierPercent: 0, modifierFixed: 0 },
  ],
  budgetItems: [
    { id: 'b_salaries', label: '101-702 Salaries & Wages', baseline: 190000, modifierPercent: 0, modifierFixed: 0 },
    { id: 'b_rent', label: '101-904 Rent', baseline: 13200, modifierPercent: 0, modifierFixed: 0 },
  ]
};

// --- SERVICES ---

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);
const auth = getAuth(app);
const DOC_ID = "fy27_master_plan";

const calculateItemTotal = (item: LineItem): number => {
  return item.baseline + (item.baseline * (item.modifierPercent / 100)) + item.modifierFixed;
};

// --- ICONS ---

const Icons = {
  Sun: ({ className }: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
  ),
  Save: ({ className }: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
  ),
  Trash: ({ className }: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
  ),
  Plus: ({ className }: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
  ),
  TrendingUp: ({ className }: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
  )
};

// --- TABLE COMPONENT ---

const SmartTable = ({ items, type, onUpdate, onAdd, onDelete, readOnlyIds = [] }: any) => {
  const isRevenue = type === 'revenue';
  const totalColor = isRevenue ? 'text-teal-400' : 'text-rose-400';
  const totalBaseline = items.reduce((acc: number, i: any) => acc + i.baseline, 0);
  const totalFinal = items.reduce((acc: number, i: any) => acc + calculateItemTotal(i), 0);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur">
      <table className="w-full text-sm text-left text-slate-300">
        <thead className="text-[10px] uppercase bg-slate-950 text-slate-500 font-bold tracking-widest">
          <tr>
            <th className="px-6 py-4">Line Item</th>
            <th className="px-6 py-4 text-right">FY26 Baseline</th>
            <th className="px-6 py-4 text-center">Strategy %</th>
            <th className="px-6 py-4 text-center">Delta ($)</th>
            <th className="px-6 py-4 text-right">FY27 Final</th>
            <th className="px-4 py-4 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any) => {
            const isReadOnly = readOnlyIds.includes(item.id);
            const final = calculateItemTotal(item);
            const delta = final - item.baseline;
            return (
              <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors group">
                <td className="px-6 py-4 font-medium">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => onUpdate(item.id, 'label', e.target.value)}
                    className={`bg-transparent border-b border-transparent hover:border-slate-700 focus:border-amber-500 focus:outline-none w-full py-1 ${isReadOnly ? 'text-amber-500 font-bold' : 'text-slate-200'}`}
                    readOnly={isReadOnly}
                  />
                </td>
                <td className="px-6 py-4 text-right">
                  {isReadOnly ? (
                    <span className="opacity-50">${Math.round(item.baseline).toLocaleString()}</span>
                  ) : (
                    <input
                      type="number"
                      value={Math.round(item.baseline) || ''}
                      onChange={(e) => onUpdate(item.id, 'baseline', parseFloat(e.target.value) || 0)}
                      className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-right focus:border-amber-500 outline-none"
                    />
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  {!isReadOnly && (
                    <div className="relative inline-block">
                      <input
                        type="number"
                        value={item.modifierPercent || ''}
                        onChange={(e) => onUpdate(item.id, 'modifierPercent', parseFloat(e.target.value) || 0)}
                        className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-right focus:border-amber-500 outline-none"
                        placeholder="0"
                      />
                      <span className="ml-1 text-slate-600">%</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                   {!isReadOnly && (
                    <input
                      type="number"
                      value={Math.round(delta) || ''}
                      onChange={(e) => onUpdate(item.id, 'finalValue', item.baseline + (parseFloat(e.target.value) || 0))}
                      className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-right focus:border-amber-500 outline-none"
                      placeholder="0"
                    />
                  )}
                </td>
                <td className={`px-6 py-4 text-right font-bold ${isRevenue ? 'text-teal-400' : 'text-rose-400'}`}>
                  ${Math.round(final).toLocaleString()}
                </td>
                <td className="px-4 py-4 text-center">
                  {!isReadOnly && (
                    <button onClick={() => onDelete(item.id)} className="text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Icons.Trash />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-slate-950/80 font-bold border-t border-slate-700">
          <tr>
            <td className="px-6 py-4">
               <button onClick={onAdd} className="flex items-center gap-2 text-[10px] text-amber-500 hover:text-amber-400 uppercase tracking-widest font-black transition-colors">
                <Icons.Plus /> Add Line Item
              </button>
            </td>
            <td className="px-6 py-4 text-right opacity-50">${Math.round(totalBaseline).toLocaleString()}</td>
            <td colSpan={2}></td>
            <td className={`px-6 py-4 text-right text-lg ${totalColor}`}>${Math.round(totalFinal).toLocaleString()}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

// --- MAIN APP ---

function App() {
  const [user, setUser] = useState<any>(null);
  const [state, setState] = useState<FinancialState>(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<TabType>('strategy');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      if (u && ALLOWED_EMAILS.includes(u.email)) {
        setUser(u);
        onSnapshot(doc(db, "plans", DOC_ID), (snap) => {
          if (snap.exists()) setState(snap.data());
        });
      } else if (u) {
        signOut(auth);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    await setDoc(doc(db, "plans", DOC_ID), state);
    setLastSaved(new Date());
    setIsSaving(false);
  };

  const handleUpdate = (type: 'revenue' | 'budget', id: string, field: string, val: any) => {
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
    
    const tiers = Object.values(state.tuition.tiers).map(t => {
      const price = basePrice * (t.ratio / 100);
      const gross = price * t.qty;
      grossTuition += gross;
      students += t.qty;
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

    return { tiers, discounts, revItems, expItems, totalRev, totalExp, students, netTuition, totalDiscounts };
  }, [state]);

  const pieData = useMemo(() => {
    const ft = financials.tiers.find(t => t.id === 'tuitionFT')?.gross || 0;
    const pt = financials.tiers.filter(t => t.id !== 'tuitionFT').reduce((s, t) => s + t.gross, 0);
    const as = financials.revItems.find(i => i.label.toLowerCase().includes('afterschool'))?.finalValue || 0;
    const other = financials.totalRev - ft - pt - as;
    return [
      { name: 'Full-Time Tuition', value: ft },
      { name: 'Part-Time Tuition', value: pt },
      { name: 'Afterschool', value: as },
      { name: 'Other Revenue', value: other }
    ].filter(v => v.value > 0);
  }, [financials]);

  // LOGIN SCREEN (RESTORED DESIGN)
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl relative overflow-hidden">
          {/* Accent Bar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-rose-500"></div>
          
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-amber-500/10 rounded-lg flex items-center justify-center border border-amber-500/20">
               <Icons.Sun className="w-8 h-8 text-amber-500" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center text-white mb-2">Sundrop Finance</h1>
          <p className="text-center text-slate-400 mb-8 text-sm">Strategic Planning & Forecasting FY27</p>
          
          <div className="space-y-4">
            <button 
                onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
                className="w-full bg-white text-slate-900 font-bold py-3 rounded-lg transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </button>
            <p className="text-[10px] text-center text-slate-600 uppercase tracking-widest font-bold">Secure Authorized Access Only</p>
          </div>
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD (REMAINED CONSISTENT)
  return (
    <div className="min-h-screen pb-20 text-slate-300">
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/50 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-amber-500 rounded text-black"><Icons.Sun className="w-5 h-5" /></div>
          <span className="text-lg font-black text-white uppercase tracking-tighter">Sundrop <span className="text-amber-500">Finance</span></span>
        </div>
        <nav className="flex gap-1 bg-slate-950 rounded-full p-1 border border-slate-800">
          {['strategy', 'revenue', 'budget'].map(t => (
            <button key={t} onClick={() => setActiveTab(t as TabType)} className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-slate-800 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}>
              {t}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-6">
           <div className="text-right">
              <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">Net Margin</div>
              <div className={`text-xl font-black leading-none ${financials.totalRev - financials.totalExp >= 0 ? 'text-teal-400' : 'text-rose-500'}`}>
                ${Math.round(financials.totalRev - financials.totalExp).toLocaleString()}
              </div>
           </div>
           <button onClick={handleSave} className={`px-4 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold ${isSaving ? 'bg-amber-500/10 text-amber-500 animate-pulse' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}>
              <Icons.Save className="w-3.5 h-3.5" /> {isSaving ? '...' : 'SAVE'}
           </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 space-y-10">
        {activeTab === 'strategy' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                    <Icons.TrendingUp className="w-32 h-32 text-amber-500" />
                </div>
                <div className="flex justify-between items-end border-b border-slate-800 pb-6">
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">Tuition Engine</h2>
                    <p className="text-slate-500 text-xs">FY27 Rate Scaling & Enrollment</p>
                  </div>
                  <div className="text-right">
                    <label className="text-[10px] uppercase font-bold text-amber-500 mb-1 block">FT Base Rate</label>
                    <input type="number" value={state.tuition.baseFTPrice} onChange={(e) => setState(s => ({...s, tuition: {...s.tuition, baseFTPrice: parseFloat(e.target.value) || 0}}))} className="bg-slate-950 border border-slate-800 text-2xl font-black text-white text-right w-36 p-1.5 rounded-lg focus:border-amber-500 outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {financials.tiers.map(t => (
                    <div key={t.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors space-y-3">
                      <div className="flex justify-between font-bold text-sm">
                        <span className="text-white">{t.label}</span>
                        <div className="flex items-center gap-2 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          <span className="text-[9px] text-slate-500">QTY</span>
                          <input type="number" value={t.qty} onChange={(e) => setState(s => ({...s, tuition: {...s.tuition, tiers: {...s.tuition.tiers, [t.id]: {...t, qty: parseInt(e.target.value) || 0}} }}))} className="w-8 bg-transparent text-right outline-none text-white text-xs" />
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">
                           Ratio: <input type="number" value={t.ratio} onChange={(e) => setState(s => ({...s, tuition: {...s.tuition, tiers: {...s.tuition.tiers, [t.id]: {...t, ratio: parseFloat(e.target.value) || 0}} }}))} className="w-8 bg-transparent text-amber-500 outline-none font-black" />%
                        </div>
                        <div className="text-lg font-black text-teal-400">${Math.round(t.price).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-6">Discounts & Aid</h3>
                <div className="space-y-3">
                  {financials.discounts.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="font-bold text-sm">{d.label}</span>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-[9px] text-slate-500 uppercase font-black">Students</div>
                          <input type="number" value={d.qty} onChange={(e) => setState(s => ({...s, discounts: {...s.discounts, [d.id]: {...d, qty: parseInt(e.target.value) || 0}} }))} className="bg-transparent text-center font-bold outline-none w-8 text-white text-xs" />
                        </div>
                        <div className="text-center">
                          <div className="text-[9px] text-slate-500 uppercase font-black">Disc %</div>
                          <input type="number" value={d.discountPercent} onChange={(e) => setState(s => ({...s, discounts: {...s.discounts, [d.id]: {...d, discountPercent: parseFloat(e.target.value) || 0}} }))} className="bg-transparent text-center font-bold outline-none w-8 text-white text-xs" />
                        </div>
                        <div className="text-right font-black text-rose-500 w-24 text-sm">-${Math.round(d.value).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                   <div className="pt-4 flex justify-between font-black text-rose-500 border-t border-slate-800 text-sm">
                    <span className="uppercase tracking-widest">Total Discounts</span>
                    <span>-${Math.round(financials.totalDiscounts).toLocaleString()}</span>
                  </div>
                </div>
              </section>
            </div>

            <div className="space-y-8">
               <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-[480px] flex flex-col">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Revenue Mix (Projected)</h3>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {pieData.map((_, i) => <Cell key={i} fill={['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'][i % 4]} stroke="none" />)}
                        </Pie>
                        <Tooltip contentStyle={{background: '#0a0f1d', border: '1px solid #1e293b', borderRadius: '12px'}} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-4 border-t border-slate-800 pt-4">
                    {pieData.map((p, i) => (
                      <div key={i} className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-500">{p.name}</span>
                        <span className="text-white font-mono">${Math.round(p.value).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'revenue' && (
          <SmartTable 
            items={financials.revItems} 
            type="revenue" 
            onUpdate={(id, f, v) => handleUpdate('revenue', id, f, v)}
            onAdd={() => setState(s => ({...s, revenueItems: [...s.revenueItems, {id: 'r_'+Date.now(), label: 'New Revenue', baseline: 0, modifierPercent: 0, modifierFixed: 0}]}))}
            onDelete={(id) => setState(s => ({...s, revenueItems: s.revenueItems.filter(i => i.id !== id)}))}
            readOnlyIds={['tuition']}
          />
        )}

        {activeTab === 'budget' && (
          <SmartTable 
            items={financials.expItems} 
            type="budget" 
            onUpdate={(id, f, v) => handleUpdate('budget', id, f, v)}
            onAdd={() => setState(s => ({...s, budgetItems: [...s.budgetItems, {id: 'b_'+Date.now(), label: 'New Expense', baseline: 0, modifierPercent: 0, modifierFixed: 0}]}))}
            onDelete={(id) => setState(s => ({...s, budgetItems: s.budgetItems.filter(i => i.id !== id)}))}
          />
        )}
      </main>

      <footer className="fixed bottom-0 left-0 w-full bg-slate-950/80 backdrop-blur-sm border-t border-slate-900 py-2 px-6 text-[9px] font-bold text-slate-700 flex justify-between tracking-widest uppercase">
        <span>Sundrop Finance FY27 v2.2</span>
        <span>{lastSaved ? `Synced: ${lastSaved.toLocaleTimeString()}` : 'Live Session'}</span>
      </footer>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);