
import React, { useState, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { SunIcon, LockIcon, TrendingUpIcon, PieChartIcon, SaveIcon } from "./components/Icons.tsx";
import { SmartTable } from "./components/SmartTable.tsx";
import { calculateFinancials, calculateItemTotal } from "./services/calculationService.ts";
import { saveState, loadState, loginWithGoogle, subscribeToState, logout } from "./services/firebaseService.ts";
import { INITIAL_STATE } from "./constants.ts";
import { FinancialState, CARDS, TuitionTier, LineItem } from "./types.ts";

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#6366f1', '#ec4899'];
const ALLOWED_EMAILS = ["degraff.tim@gmail.com", "mariahfrye@gmail.com", "watterstj1@gmail.com"]; 

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authError, setAuthError] = useState("");
  const [isOffline, setIsOffline] = useState(false);
  const [activeTab, setActiveTab] = useState(CARDS.STRATEGY);
  const [state, setState] = useState<FinancialState>(INITIAL_STATE);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (user && !isOffline) {
        loadState().then(data => { if (data) setState(data); });
        const unsubscribe = subscribeToState((newData) => {
            setState(newData);
            setLastSaved(new Date());
        });
        return () => unsubscribe();
    }
  }, [user, isOffline]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const googleUser = await loginWithGoogle();
    if (googleUser) {
        if (!ALLOWED_EMAILS.includes(googleUser.email)) {
            setAuthError(`Access denied: ${googleUser.email} is not authorized.`);
            await logout();
            setUser(null);
            return; 
        }
        setIsOffline(false);
        setUser(googleUser);
        setAuthError("");
    } else {
        setAuthError("Google Login Failed.");
    }
  };

  const handleOfflineLogin = () => {
    setUser({ uid: "offline-preview", email: ALLOWED_EMAILS[0], displayName: "Preview User", photoURL: null });
    setIsOffline(true);
    setAuthError("");
  };

  const handleSave = async () => {
    setIsSaving(true);
    if (!isOffline) await saveState(state);
    setLastSaved(new Date());
    setIsSaving(false);
  };

  const handleTierQtyChange = (tierId: string, qty: number) => {
    setState(prev => ({
      ...prev,
      tuition: {
        ...prev.tuition,
        tiers: { ...prev.tuition.tiers, [tierId]: { ...prev.tuition.tiers[tierId], qty } }
      }
    }));
  };

  const handleTierRatioChange = (tierId: string, ratio: number) => {
    setState(prev => ({
        ...prev,
        tuition: {
            ...prev.tuition,
            tiers: { ...prev.tuition.tiers, [tierId]: { ...prev.tuition.tiers[tierId], ratio } }
        }
    }));
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

  const ftRevenue = financials.tiers.find(t => t.id === 'tuitionFT')?.gross || 0;
  const ptRevenue = financials.tiers.filter(t => t.id !== 'tuitionFT').reduce((sum, t) => sum + t.gross, 0);
  const afterschoolVal = financials.processedRevenue.find(i => i.id === 'r_afterschool')?.finalValue || 0;
  const grantsVal = financials.processedRevenue.filter(i => i.id === 'r_state' || i.id === 'r_local' || i.id === 'r_oia').reduce((s, i) => s + i.finalValue, 0);
  const otherRevenue = financials.totalRevenue - ftRevenue - ptRevenue - afterschoolVal - grantsVal;

  let revenuePieData = [
    { name: "Net Tuition", value: ftRevenue + ptRevenue },
    { name: "Grants & State", value: grantsVal },
    { name: "Afterschool", value: afterschoolVal },
    { name: "Other", value: otherRevenue }
  ].filter(i => i.value > 0);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-rose-500"></div>
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-amber-500/10 rounded-lg flex items-center justify-center border border-amber-500/20">
               <SunIcon className="w-8 h-8 text-amber-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-white mb-2">Sundrop Finance</h1>
          <p className="text-center text-slate-400 mb-8 text-sm uppercase tracking-widest font-bold">Authorized Access Only</p>
          <div className="space-y-4">
            {authError && <p className="text-rose-500 text-xs text-center">{authError}</p>}
            <button onClick={handleLogin} className="w-full bg-white text-slate-900 font-bold py-3 rounded-lg flex items-center justify-center gap-3 hover:bg-slate-100 transition-all">
               <span className="w-5 h-5 flex items-center">G</span> Sign in with Google
            </button>
            <button onClick={handleOfflineLogin} className="w-full text-[10px] text-slate-500 hover:text-amber-500 transition-colors uppercase tracking-widest font-bold">Offline Preview</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-[#0a0f1d]">
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center text-black shadow-lg shadow-amber-500/20">
                <SunIcon className="w-5 h-5" />
             </div>
             <span className="text-lg font-black tracking-tight text-white uppercase">Sun Drop <span className="text-amber-500">FINANCE</span></span>
          </div>
          <nav className="flex items-center space-x-1 bg-slate-950 rounded-full p-1 border border-slate-800/50">
            {['strategy', 'revenue', 'budget'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-slate-800 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}>
                {tab}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-6">
             <div className="text-right">
                <span className="text-[9px] uppercase text-slate-500 font-black tracking-[0.2em] block mb-0.5">Net Margin</span>
                <span className={`text-xl font-black leading-none ${financials.netMargin >= 0 ? 'text-teal-400' : 'text-rose-500'}`}>
                    {financials.netMargin >= 0 ? '+' : ''}${Math.round(financials.netMargin).toLocaleString()}
                </span>
             </div>
             <button onClick={handleSave} className={`w-10 h-10 rounded-lg flex items-center justify-center bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all ${isSaving ? 'animate-pulse text-amber-500' : ''}`}>
                <SaveIcon className="w-5 h-5" />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {activeTab === 'strategy' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                    { label: 'Students', val: financials.totalHeadcount, color: 'text-white' },
                    { label: 'Net Tuition', val: `$${Math.round(financials.netTuition/1000)}k`, color: 'text-amber-500' },
                    { label: 'Total Exp', val: `$${Math.round(financials.totalExpenses/1000)}k`, color: 'text-rose-500' },
                    { label: 'Margin %', val: `${financials.marginPercent.toFixed(1)}%`, color: 'text-teal-500' }
                ].map((kpi, idx) => (
                    <div key={idx} className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm">
                        <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-3">{kpi.label}</p>
                        <p className={`text-3xl font-black ${kpi.color}`}>{kpi.val}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                            <TrendingUpIcon className="w-32 h-32 text-amber-500" />
                        </div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-8 flex items-center">
                            <span className="w-1.5 h-6 bg-amber-500 mr-4 rounded-full"></span>
                            Tuition Engine
                        </h2>
                        <div className="space-y-10">
                            <div className="bg-slate-950/80 p-8 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-8 items-center justify-between">
                                <div className="flex-1 w-full">
                                    <label className="text-[10px] text-amber-500 font-black uppercase tracking-[0.2em] mb-3 block">Base Full-Time Rate (Yearly)</label>
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 text-3xl font-light">$</span>
                                        <input type="number" value={state.tuition.baseFTPrice} onChange={(e) => setState(s => ({...s, tuition: {...s.tuition, baseFTPrice: parseFloat(e.target.value)||0}}))} className="w-full bg-slate-900 border-2 border-slate-800 text-5xl font-black text-white pl-12 pr-6 py-4 rounded-xl focus:border-amber-500 transition-all outline-none" />
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Monthly Approx</p>
                                    <p className="text-3xl font-black text-white">${Math.round(state.tuition.baseFTPrice/10).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {financials.tiers.map((tier) => (
                                    <div key={tier.id} className="p-6 bg-slate-900/60 rounded-2xl border border-slate-800/60 hover:bg-slate-800/40 transition-all group">
                                        <div className="flex justify-between items-center mb-6">
                                            <div>
                                                <h3 className="text-sm font-black text-slate-200 uppercase tracking-wide">{tier.label}</h3>
                                                <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Ratio: {Math.round(tier.ratio)}% of Base</p>
                                            </div>
                                            <div className="text-xl font-black text-teal-400">${Math.round(tier.calculatedPrice).toLocaleString()}</div>
                                        </div>
                                        <div className="bg-slate-950 rounded-xl p-4 flex justify-between items-center border border-slate-800 group-hover:border-slate-700 transition-all">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Enrolled Qty</span>
                                            <input type="number" value={tier.qty} onChange={(e) => handleTierQtyChange(tier.id, parseInt(e.target.value)||0)} className="w-16 bg-slate-900 border border-slate-800 text-center font-black text-white py-1.5 rounded-lg outline-none focus:border-amber-500" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>

                <div className="space-y-8">
                    <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-8 min-h-[500px] flex flex-col shadow-2xl">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-10">Revenue Composition</h3>
                        <div className="flex-1 min-h-[250px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                      data={revenuePieData} 
                                      cx="50%" cy="50%" 
                                      innerRadius={70} 
                                      outerRadius={95} 
                                      paddingAngle={0} 
                                      dataKey="value"
                                      stroke="#0a0f1d"
                                      strokeWidth={4}
                                    >
                                        {revenuePieData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{backgroundColor: '#0a0f1d', borderRadius: '12px', border: '1px solid #1e293b', fontSize: '10px'}} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-10 space-y-4">
                            {revenuePieData.map((item, idx) => {
                                const percent = (item.value / financials.totalRevenue) * 100;
                                return (
                                    <div key={idx} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{backgroundColor: COLORS[idx % COLORS.length]}}></div>
                                            <span className="text-xs font-bold text-slate-400 group-hover:text-slate-200 transition-colors">{item.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-mono font-bold text-slate-200 mr-4">${Math.round(item.value).toLocaleString()}</span>
                                            <span className="text-[10px] font-black text-slate-500 inline-block w-8">{Math.round(percent)}%</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
          </>
        )}

        {activeTab === 'revenue' && (
           <div className="space-y-6">
               <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-4">Revenue Sources</h2>
               <SmartTable 
                 items={state.revenueItems.map(i => i.id === 'tuition' ? {...i, baseline: financials.netTuition, modifierPercent: 0} : i)} 
                 type="revenue" 
                 onUpdate={(id, f, v) => handleLineItemUpdate('revenue', id, f, v)}
                 onAdd={() => setState(s => ({...s, revenueItems: [...s.revenueItems, {id: 'r'+Date.now(), label:'New Revenue', baseline:0, modifierPercent:0, modifierFixed:0}]}))}
                 onDelete={(id) => setState(s => ({...s, revenueItems: s.revenueItems.filter(i=>i.id!==id)}))}
                 readOnlyIds={['tuition']}
               />
           </div>
        )}

        {activeTab === 'budget' && (
            <div className="space-y-6">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-4">Expense Ledger</h2>
                <SmartTable 
                 items={state.budgetItems} 
                 type="budget" 
                 onUpdate={(id, f, v) => handleLineItemUpdate('budget', id, f, v)} 
                 onAdd={() => setState(s => ({...s, budgetItems: [...s.budgetItems, {id: 'b'+Date.now(), label:'New Expense', baseline:0, modifierPercent:0, modifierFixed:0}]}))}
                 onDelete={(id) => setState(s => ({...s, budgetItems: s.budgetItems.filter(i=>i.id!==id)}))}
               />
           </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 w-full bg-slate-950/90 backdrop-blur-xl border-t border-slate-900 py-3 px-6 text-[9px] font-black text-slate-600 flex justify-between tracking-[0.2em] uppercase z-40">
        <div className="flex items-center gap-4">
            <span className="text-slate-500">Sundrop Finance v27.3 (Standalone)</span>
            <span className="text-rose-900">!</span>
            <span className="text-teal-900 tracking-normal">AUTH: {user.email}</span>
        </div>
        <span>{lastSaved ? `LAST SYNC: ${lastSaved.toLocaleTimeString()}` : "UNSAVED CHANGES"}</span>
      </footer>
    </div>
  );
}
