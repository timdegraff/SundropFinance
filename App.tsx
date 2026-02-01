// Sync update: v27.24 - Guest Mode Removed
import React, { useState, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { SunIcon, TrendingUpIcon, PDFIcon, LogoutIcon } from "./components/Icons.tsx";
import { SmartTable } from "./components/SmartTable.tsx";
import { calculateFinancials } from "./services/calculationService.ts";
import { saveState, loadState, loginWithGoogle, subscribeToState, logout } from "./services/firebaseService.ts";
import { INITIAL_STATE } from "./constants.ts";
import { FinancialState, CARDS } from "./types.ts";

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

  const financials = calculateFinancials(state);

  const revenuePieData = useMemo(() => {
    const totalGross = financials.totalTuitionGross || 1;
    const ftGross = financials.tiers.find(t => t.id === 'tuitionFT')?.gross || 0;
    const ptGross = financials.tiers.filter(t => t.id !== 'tuitionFT').reduce((s, t) => s + t.gross, 0);
    
    // Pro-rate Net Tuition for breakdown
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

              {/* Discounts Section */}
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

        {/* Revenue Section */}
        <div className={`${activeTab === 'revenue' ? 'block' : 'hidden'} print-section space-y-2`}>
           <h2 className="text-lg font-bold text-white uppercase tracking-tighter mb-1">Revenue Sources</h2>
           <SmartTable items={financials.processedRevenue} type="revenue" onUpdate={(id, f, v) => handleLineItemUpdate('revenue', id, f, v)} onAdd={() => {}} onDelete={() => {}} onMoveUp={(id) => handleMoveItem('revenue', id, 'up')} onMoveDown={(id) => handleMoveItem('revenue', id, 'down')} readOnlyIds={['tuition']} />
        </div>

        {/* Budget Section */}
        <div className={`${activeTab === 'budget' ? 'block' : 'hidden'} print-section space-y-2`}>
            <h2 className="text-lg font-bold text-white uppercase tracking-tighter mb-1">Expense Ledger</h2>
            <SmartTable items={financials.processedBudget} type="budget" onUpdate={(id, f, v) => handleLineItemUpdate('budget', id, f, v)} onAdd={() => {}} onDelete={() => {}} onMoveUp={(id) => handleMoveItem('budget', id, 'up')} onMoveDown={(id) => handleMoveItem('budget', id, 'down')} />
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 w-full bg-slate-950/90 backdrop-blur-xl border-t border-slate-900 py-3 px-6 text-[9px] font-bold text-slate-600 flex justify-between tracking-[0.2em] uppercase z-40 no-print">
        <div className="flex items-center gap-4">
            <span className="text-slate-500">Sundrop Finance v27.24</span>
            <span className="text-teal-900">SYSTEM READY</span>
        </div>
        <div className="flex gap-4">
            <span>{lastSaved ? `SYNCED: ${lastSaved.toLocaleTimeString()}` : "CONNECTING..."}</span>
        </div>
      </footer>
    </div>
  );
}
