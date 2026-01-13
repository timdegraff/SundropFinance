import React, { useState, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { SunIcon, LockIcon, TrendingUpIcon, PieChartIcon, SaveIcon } from "./components/Icons";
import { SmartTable } from "./components/SmartTable";
import { calculateFinancials } from "./services/calculationService";
import { saveState, loadState } from "./services/firebaseService";
import { INITIAL_STATE } from "./constants";
import { FinancialState, CARDS } from "./types";

// Recharts Colors
const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
const EXPENSE_COLOR = '#f43f5e';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(false);
  
  const [activeTab, setActiveTab] = useState(CARDS.STRATEGY);
  const [state, setState] = useState<FinancialState>(INITIAL_STATE);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load from Firebase on Mount
  useEffect(() => {
    const fetch = async () => {
      if (isAuthenticated) {
        const data = await loadState();
        if (data) {
          setState(data);
        }
      }
    };
    fetch();
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "finance26") {
      setIsAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await saveState(state);
    setLastSaved(new Date());
    setIsSaving(false);
  };

  // --- Handlers for Strategy Tab ---
  const handleBasePriceChange = (price: number) => {
    setState(prev => ({
      ...prev,
      tuition: { ...prev.tuition, baseFTPrice: price }
    }));
  };

  const handleTierQtyChange = (tierId: string, qty: number) => {
    setState(prev => ({
      ...prev,
      tuition: {
        ...prev.tuition,
        tiers: {
          ...prev.tuition.tiers,
          [tierId]: { ...prev.tuition.tiers[tierId], qty }
        }
      }
    }));
  };

  const handleDiscountChange = (id: string, field: 'qty' | 'discountPercent', value: number) => {
     setState(prev => ({
      ...prev,
      discounts: {
        ...prev.discounts,
        [id]: { ...prev.discounts[id], [field]: value }
      }
    }));
  };

  // --- Handlers for Smart Tables ---
  const handleLineItemUpdate = (type: 'revenue' | 'budget', id: string, field: 'modifierPercent' | 'modifierFixed', value: number) => {
    setState(prev => {
        const list = type === 'revenue' ? prev.revenueItems : prev.budgetItems;
        const updatedList = list.map(item => item.id === id ? { ...item, [field]: value } : item);
        return {
            ...prev,
            [type === 'revenue' ? 'revenueItems' : 'budgetItems']: updatedList
        };
    });
  };

  // --- Derived Calculations ---
  const financials = calculateFinancials(state);

  // --- Chart Data ---
  const revenuePieData = [
    { name: "Net Tuition", value: financials.netTuition },
    { name: "Grants & State", value: financials.processedRevenue.find(i => i.id === 'r_state')?.finalValue || 0 + (financials.processedRevenue.find(i => i.id === 'r_local')?.finalValue || 0) },
    { name: "Afterschool", value: financials.processedRevenue.find(i => i.id === 'r_afterschool')?.finalValue || 0 },
    { name: "Other", value: financials.totalRevenue - financials.netTuition - (financials.processedRevenue.find(i => i.id === 'r_state')?.finalValue || 0) - (financials.processedRevenue.find(i => i.id === 'r_local')?.finalValue || 0) - (financials.processedRevenue.find(i => i.id === 'r_afterschool')?.finalValue || 0) }
  ].filter(i => i.value > 0);

  // --- Render Components ---

  if (!isAuthenticated) {
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
          <p className="text-center text-slate-400 mb-8 text-sm">Strategic Planning & Forecasting FY27</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Access Key</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter secure password"
                />
                <LockIcon className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
              </div>
            </div>
            {authError && <p className="text-rose-500 text-xs text-center">Invalid access key. Please try again.</p>}
            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 rounded-lg transition-colors">
              Unlock Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center text-black">
                <SunIcon className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-100 hidden sm:inline">Sun Drop <span className="text-amber-500">FINANCE</span></span>
          </div>

          <nav className="flex items-center space-x-1 bg-slate-800/50 rounded-full p-1">
            {[CARDS.STRATEGY, CARDS.REVENUE, CARDS.BUDGET].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeTab === tab 
                  ? 'bg-slate-700 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
                } uppercase tracking-wide`}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
             <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">Net Margin</span>
                <span className={`text-lg font-mono font-bold leading-none ${financials.netMargin >= 0 ? 'text-teal-400' : 'text-rose-500'}`}>
                    {financials.netMargin >= 0 ? '+' : ''}${financials.netMargin.toLocaleString()}
                </span>
             </div>
             <button 
                onClick={handleSave}
                disabled={isSaving}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-amber-500 transition-colors"
                title="Save to Cloud"
            >
                 <SaveIcon className={isSaving ? "animate-pulse" : ""} />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        
        {/* Metric Cards Summary (Visible on all tabs) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <p className="text-slate-500 text-xs uppercase font-bold mb-1">Students</p>
                <p className="text-2xl font-bold text-white">{financials.totalHeadcount}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <p className="text-slate-500 text-xs uppercase font-bold mb-1">Net Tuition</p>
                <p className="text-2xl font-bold text-amber-500">${Math.round(financials.netTuition / 1000)}k</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <p className="text-slate-500 text-xs uppercase font-bold mb-1">Total Exp</p>
                <p className="text-2xl font-bold text-rose-500">${Math.round(financials.totalExpenses / 1000)}k</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <p className="text-slate-500 text-xs uppercase font-bold mb-1">Margin %</p>
                <p className={`text-2xl font-bold ${financials.marginPercent >= 0 ? 'text-teal-500' : 'text-rose-500'}`}>
                    {financials.marginPercent.toFixed(1)}%
                </p>
            </div>
        </div>

        {/* --- STRATEGY TAB --- */}
        {activeTab === CARDS.STRATEGY && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Engine: Tuition Controls */}
            <div className="lg:col-span-2 space-y-6">
                <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <TrendingUpIcon className="w-24 h-24 text-amber-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                        <span className="w-2 h-8 bg-amber-500 mr-3 rounded-full"></span>
                        Tuition Engine
                    </h2>

                    <div className="space-y-6">
                        {/* Master Control */}
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                            <label className="text-xs text-amber-500 font-bold uppercase tracking-wider mb-2 block">Base Full-Time Rate (Yearly)</label>
                            <div className="flex items-center gap-4">
                                <div className="relative flex-1">
                                    <span className="absolute left-4 top-3 text-slate-500 text-lg">$</span>
                                    <input 
                                        type="number" 
                                        value={state.tuition.baseFTPrice}
                                        onChange={(e) => handleBasePriceChange(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-slate-900 text-3xl font-bold text-white pl-8 pr-4 py-2 rounded border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                                    />
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-slate-400">Monthly Approx</div>
                                    <div className="text-lg font-mono text-slate-200">${Math.round(state.tuition.baseFTPrice / 10).toLocaleString()}</div>
                                </div>
                            </div>
                        </div>

                        {/* Tier Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {financials.tiers.map((tier) => (
                                <div key={tier.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-medium text-slate-200">{tier.label}</h3>
                                            <span className="text-xs text-slate-500">Ratio: {tier.ratio}% of Base</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-teal-400">${Math.round(tier.calculatedPrice).toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between bg-slate-900 rounded p-2">
                                        <label className="text-xs text-slate-400 uppercase">Enrolled Qty</label>
                                        <input 
                                            type="number"
                                            value={tier.qty}
                                            onChange={(e) => handleTierQtyChange(tier.id, parseInt(e.target.value) || 0)}
                                            className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-right text-white focus:border-amber-500 outline-none"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Discounts */}
                <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
                     <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                        <span className="w-2 h-8 bg-rose-500 mr-3 rounded-full"></span>
                        Discounts & Aid
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-300">
                            <thead className="text-xs uppercase bg-slate-950 text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3 text-center">Qty Students</th>
                                    <th className="px-4 py-3 text-center">Discount %</th>
                                    <th className="px-4 py-3 text-right">Est. Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                {financials.processedDiscounts.map((disc) => (
                                    <tr key={disc.id} className="border-b border-slate-800">
                                        <td className="px-4 py-3 font-medium">{disc.label}</td>
                                        <td className="px-4 py-3 text-center">
                                            <input 
                                                type="number"
                                                value={disc.qty}
                                                onChange={(e) => handleDiscountChange(disc.id, 'qty', parseInt(e.target.value) || 0)}
                                                className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-center text-white focus:border-amber-500 outline-none"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                             <div className="relative inline-block w-16">
                                                <input 
                                                    type="number"
                                                    value={disc.discountPercent}
                                                    onChange={(e) => handleDiscountChange(disc.id, 'discountPercent', parseFloat(e.target.value) || 0)}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-right text-white focus:border-amber-500 outline-none"
                                                />
                                                <span className="absolute right-6 top-1 text-slate-500 pointer-events-none text-xs">%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-rose-400">
                                            -${Math.round(disc.discountValue).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Visualizations Side Panel */}
            <div className="space-y-6">
                <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 h-full">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Revenue Composition</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={revenuePieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {revenuePieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: number) => `$${value.toLocaleString()}`}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-3 mt-4">
                        {revenuePieData.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
                                <div className="flex items-center">
                                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                    <span className="text-slate-300">{item.name}</span>
                                </div>
                                <span className="font-mono text-slate-400">${Math.round(item.value).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* --- REVENUE TAB --- */}
        {activeTab === CARDS.REVENUE && (
           <div className="space-y-6 animate-fade-in">
               <div className="flex items-center justify-between mb-4">
                   <h2 className="text-xl font-bold text-white">Revenue Sources</h2>
                   <div className="text-sm text-slate-400">
                       Total Projected: <span className="text-teal-400 font-bold ml-2 text-lg">${financials.totalRevenue.toLocaleString()}</span>
                   </div>
               </div>
               <SmartTable 
                 items={state.revenueItems} 
                 type="revenue" 
                 onUpdate={(id, field, val) => handleLineItemUpdate('revenue', id, field, val)}
                 readOnlyIds={['tuition']}
               />
           </div>
        )}

        {/* --- BUDGET TAB --- */}
        {activeTab === CARDS.BUDGET && (
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                   <h2 className="text-xl font-bold text-white">Projected Expenses</h2>
                   <div className="text-sm text-slate-400">
                       Total Projected: <span className="text-rose-400 font-bold ml-2 text-lg">${financials.totalExpenses.toLocaleString()}</span>
                   </div>
               </div>
               <SmartTable 
                 items={state.budgetItems} 
                 type="budget" 
                 onUpdate={(id, field, val) => handleLineItemUpdate('budget', id, field, val)} 
               />
           </div>
        )}

      </main>

      {/* Footer / Status */}
      <div className="fixed bottom-0 left-0 w-full bg-slate-950/80 backdrop-blur border-t border-slate-900 py-2 px-4 text-xs text-slate-600 flex justify-between items-center z-40">
        <span>Sundrop Finance v27.1 (Standalone)</span>
        <span>
            {lastSaved ? `Saved: ${lastSaved.toLocaleTimeString()}` : "Unsaved changes"}
        </span>
      </div>
    </div>
  );
}