import React, { useState, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { SunIcon, TrendingUpIcon, PDFIcon, LogoutIcon } from "./components/Icons.tsx";
import { SmartTable } from "./components/SmartTable.tsx";
import { calculateFinancials } from "./services/calculationService.ts";
import { saveState, loadState, loginWithGoogle, subscribeToState, logout } from "./services/firebaseService.ts";
import { INITIAL_STATE } from "./constants.ts";
import { FinancialState, CARDS } from "./types.ts";

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
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

  const financials = calculateFinancials(state);

  const revenuePieData = useMemo(() => {
    const ftGross = financials.tiers.find(t => t.id === 'tuitionFT')?.gross || 0;
    const ptGross = financials.tiers.filter(t => t.id !== 'tuitionFT').reduce((s, t) => s + t.gross, 0);
    const afterschool = financials.processedRevenue.find(i => i.id === 'r_afterschool')?.finalValue || 0;
    const grants = financials.processedRevenue.filter(i => i.id.includes('state') || i.id.includes('local') || i.id.includes('oia')).reduce((s, i) => s + i.finalValue, 0);
    const other = financials.totalRevenue - ftGross - ptGross - afterschool - grants;

    return [
      { name: "Net Tuition", value: ftGross + ptGross },
      { name: "Grants & State", value: grants },
      { name: "Afterschool", value: afterschool },
      { name: "Other", value: other }
    ].filter(v => v.value > 0);
  }, [financials]);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-rose-500"></div>
          <div className="flex justify-center mb-6"><SunIcon className="w-16 h-16 text-amber-500" /></div>
          <h1 className="text-2xl font-black text-center text-white mb-2 tracking-tight">SUNDROP FINANCE</h1>
          <p className="text-center text-slate-400 mb-8 text-sm uppercase tracking-widest font-black">Authorized Access Only</p>
          <button onClick={handleLogin} className="w-full bg-white text-slate-900 font-black py-3 rounded-lg flex items-center justify-center gap-3 hover:bg-slate-100 transition-all">Sign in with Google</button>
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
          <span className="text-lg font-black tracking-tight text-white uppercase hidden md:inline">SUNDROP <span className="text-amber-500">FINANCE</span></span>
        </div>
        
        <nav className="flex items-center space-x-1 bg-slate-950 rounded-full p-1 border border-slate-800/50">
          {[
            { id: 'strategy', label: 'STRATEGY', short: 'STRAT' },
            { id: 'revenue', label: 'REVENUE', short: 'REV' },
            { id: 'budget', label: 'BUDGET', short: 'BUDG' }
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 md:px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-slate-800 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}>
              <span className="md:hidden">{tab.short}</span>
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
           <div className="text-right hidden xl:block">
              <span className="text-[9px] uppercase text-slate-500 font-black tracking-widest block leading-none mb-1">Net Margin</span>
              <span className={`text-xl font-black leading-none ${financials.netMargin >= 0 ? 'text-teal-400' : 'text-rose-500'}`}>
                  ${Math.round(financials.netMargin).toLocaleString()}
              </span>
           </div>
           <div className="h-10 border-l border-slate-800/50 hidden md:block"></div>
           <div className="flex items-center gap-3 bg-slate-900/50 rounded-full pl-4 pr-1.5 py-1.5 border border-slate-800/50">
              <div className="text-right hidden sm:block">
                 <p className="text-[10px] font-black text-white leading-none truncate max-w-[120px]">{user.email}</p>
                 <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Administrator</p>
              </div>
              <button onClick={handleLogout} className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-950 border border-slate-800 text-slate-500 hover:text-rose-500 transition-all active:scale-95">
                 <LogoutIcon />
              </button>
              <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-amber-500/50 shadow-lg shadow-amber-500/10" />
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8 space-y-6">
        {/* Strategy Section */}
        <div className={`${activeTab === 'strategy' ? 'block' : 'hidden'} print-section space-y-6`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Students', val: financials.totalHeadcount, color: 'text-white' },
              { label: 'Net Tuition', val: `$${Math.round(financials.netTuition/1000)}K`, color: 'text-amber-500' },
              { label: 'Total Exp', val: `$${Math.round(financials.totalExpenses/1000)}K`, color: 'text-rose-500' },
              { label: 'Margin %', val: `${financials.marginPercent.toFixed(1)}%`, color: 'text-teal-500' }
            ].map((kpi, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm shadow-xl">
                <p className="text-[9px] uppercase font-black text-slate-500 tracking-widest mb-1.5">{kpi.label}</p>
                <p className={`text-xl md:text-2xl font-black ${kpi.color}`}>{kpi.val}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-5 md:p-6 relative overflow-hidden shadow-2xl">
                <h2 className="text-lg font-black text-white uppercase tracking-tighter mb-4 flex items-center">
                  <span className="w-1.5 h-6 bg-amber-500 mr-4 rounded-full"></span>Tuition Engine
                </h2>
                <div className="space-y-6">
                  <div className="bg-slate-950/80 p-4 md:p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-4 md:gap-8 items-center justify-between">
                    <div className="flex-1 w-full">
                      <label className="text-[9px] text-amber-500 font-black uppercase tracking-widest mb-2 block">Base Full-Time Rate (Yearly)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-2xl font-light">$</span>
                        <input type="number" value={state.tuition.baseFTPrice} onChange={(e) => setState(s => ({...s, tuition: {...s.tuition, baseFTPrice: parseFloat(e.target.value)||0}}))} className="w-full bg-slate-900 border-2 border-slate-800 text-3xl font-black text-white pl-10 pr-4 py-2 rounded-xl focus:border-amber-500 outline-none" />
                      </div>
                    </div>
                    <div className="text-right w-full md:w-auto">
                      <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-0.5">Monthly Approx</p>
                      <p className="text-2xl font-black text-white">${Math.round(state.tuition.baseFTPrice/10).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {financials.tiers.map((tier) => (
                      <div key={tier.id} className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800/60 hover:bg-slate-800/40 transition-all">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex flex-col">
                            <h3 className="text-[11px] font-black text-slate-200 uppercase tracking-wide">{tier.label}</h3>
                            <div className="mt-1 flex items-center gap-2">
                               <input 
                                 type="number" 
                                 value={tier.ratio} 
                                 onChange={(e) => setState(s => ({...s, tuition: {...s.tuition, tiers: {...s.tuition.tiers, [tier.id]: {...tier, ratio: parseFloat(e.target.value)||0}} }}))}
                                 className="w-10 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] font-black text-amber-500 text-center outline-none"
                               />
                               <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">% Ratio</span>
                            </div>
                          </div>
                          <div className="text-lg font-black text-teal-400">${Math.round(tier.calculatedPrice).toLocaleString()}</div>
                        </div>
                        <div className="bg-slate-950 rounded-xl p-3 flex justify-between items-center border border-slate-800">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Enrolled Qty</span>
                          <input type="number" value={tier.qty} onChange={(e) => setState(s => ({...s, tuition: {...s.tuition, tiers: {...s.tuition.tiers, [tier.id]: {...tier, qty: parseInt(e.target.value)||0}} }}))} className="w-12 bg-slate-900 border border-slate-800 text-center font-black text-white py-1 rounded-lg outline-none focus:border-amber-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Discounts Section */}
              <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-5 md:p-6 shadow-xl">
                <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-4 flex items-center">
                  <span className="w-1.5 h-6 bg-rose-500 mr-4 rounded-full"></span>DISCOUNTS
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {financials.processedDiscounts.map(d => (
                    <div key={d.id} className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 shadow-lg">
                      <div className="text-[9px] font-black uppercase text-slate-500 tracking-[0.15em]">{d.label}</div>
                      <div className="flex justify-between items-center border-y border-slate-800/50 py-2">
                        <div className="text-center">
                          <div className="text-[8px] text-slate-600 font-bold uppercase mb-0.5">Students</div>
                          <input type="number" value={d.qty} onChange={(e) => setState(s => ({...s, discounts: {...s.discounts, [d.id]: {...d, qty: parseInt(e.target.value) || 0}} }))} className="bg-slate-900 border border-slate-800 w-8 text-center rounded text-[10px] font-black p-0.5 text-white" />
                        </div>
                        <div className="text-center">
                          <div className="text-[8px] text-slate-600 font-bold uppercase mb-0.5">Disc %</div>
                          <input type="number" value={d.discountPercent} onChange={(e) => setState(s => ({...s, discounts: {...s.discounts, [d.id]: {...d, discountPercent: parseFloat(e.target.value) || 0}} }))} className="bg-slate-900 border border-slate-800 w-8 text-center rounded text-[10px] font-black p-0.5 text-white" />
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-rose-500">-${Math.round(d.discountValue).toLocaleString()}</span>
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

            <div className="space-y-6">
              <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-5 md:p-6 flex flex-col shadow-2xl h-fit">
                <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-6">Revenue Mix</h3>
                <div className="relative h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={revenuePieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={0} dataKey="value" stroke="#0a0f1d" strokeWidth={4}>
                        {revenuePieData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{backgroundColor: '#0a0f1d', borderRadius: '12px', border: '1px solid #1e293b', fontSize: '9px'}} />
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
                          <span className="text-[9px] font-black text-slate-500 inline-block w-6">{Math.round(percent)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Section */}
        <div className={`${activeTab === 'revenue' ? 'block' : 'hidden'} print-section space-y-4`}>
           <h2 className="text-lg font-black text-white uppercase tracking-tighter mb-2">Revenue Sources</h2>
           <SmartTable items={financials.processedRevenue} type="revenue" onUpdate={(id, f, v) => handleLineItemUpdate('revenue', id, f, v)} onAdd={() => {}} onDelete={() => {}} readOnlyIds={['tuition']} />
        </div>

        {/* Budget Section */}
        <div className={`${activeTab === 'budget' ? 'block' : 'hidden'} print-section space-y-4`}>
            <h2 className="text-lg font-black text-white uppercase tracking-tighter mb-2">Expense Ledger</h2>
            <SmartTable items={financials.processedBudget} type="budget" onUpdate={(id, f, v) => handleLineItemUpdate('budget', id, f, v)} onAdd={() => {}} onDelete={() => {}} />
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 w-full bg-slate-950/90 backdrop-blur-xl border-t border-slate-900 py-3 px-6 text-[9px] font-black text-slate-600 flex justify-between tracking-[0.2em] uppercase z-40 no-print">
        <div className="flex items-center gap-4">
            <span className="text-slate-500">Sundrop Finance v27.7</span>
            <span className="text-teal-900">SYSTEM READY</span>
        </div>
        <span>{lastSaved ? `SYNCED: ${lastSaved.toLocaleTimeString()}` : "CONNECTING..."}</span>
      </footer>
    </div>
  );
}