import React, { useState, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { SunIcon, LockIcon, TrendingUpIcon, PieChartIcon, SaveIcon } from "./components/Icons.tsx";
import { SmartTable } from "./components/SmartTable.tsx";
import { calculateFinancials, calculateItemTotal } from "./services/calculationService.ts";
import { saveState, loadState, loginWithGoogle, subscribeToState, logout } from "./services/firebaseService.ts";
import { INITIAL_STATE } from "./constants.ts";
import { FinancialState, CARDS, TuitionTier } from "./types.ts";

// Recharts Colors
const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#6366f1', '#ec4899'];

// --- CONFIGURATION: AUTHORIZED USERS ---
const ALLOWED_EMAILS = [
    "degraff.tim@gmail.com", 
    "mariahfrye@gmail.com", 
    "watterstj1@gmail.com"
]; 

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authError, setAuthError] = useState("");
  const [isOffline, setIsOffline] = useState(false);
  
  const [activeTab, setActiveTab] = useState(CARDS.STRATEGY);
  const [state, setState] = useState<FinancialState>(INITIAL_STATE);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load from Firebase on Mount & Subscribe
  useEffect(() => {
    if (user && !isOffline) {
        // Initial load
        loadState().then(data => {
            if (data) setState(data);
        });

        // Real-time subscription
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
        // STRICT ALLOWLIST CHECK
        if (!ALLOWED_EMAILS.includes(googleUser.email)) {
            setAuthError(`Access denied: ${googleUser.email} is not authorized.`);
            await logout(); // Force logout from Firebase
            setUser(null);
            return; 
        }
        
        setIsOffline(false);
        setUser(googleUser);
        setAuthError("");
    } else {
        setAuthError("Google Login Failed. Try 'Offline Preview' if in a sandbox.");
    }
  };

  const handleOfflineLogin = () => {
    // Simulates a logged-in state for development/preview without Firebase
    setUser({
        uid: "offline-preview",
        email: ALLOWED_EMAILS[0],
        displayName: "Preview User",
        photoURL: null
    });
    setIsOffline(true);
    setAuthError("");
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    if (isOffline) {
        // Simulate save delay
        await new Promise(resolve => setTimeout(resolve, 600));
        console.log("Offline Mode: Changes saved to local session only.");
    } else {
        await saveState(state);
    }
    
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

  // Bidirectional Handler: Change Ratio OR Price
  const handleTierPriceOrRatioChange = (tierId: string, type: 'ratio' | 'price', value: number) => {
      setState(prev => {
          const tier = prev.tuition.tiers[tierId];
          const basePrice = prev.tuition.baseFTPrice;
          
          let newRatio = tier.ratio;
          
          if (type === 'ratio') {
              newRatio = value;
          } else {
              // Calculate Ratio from Price: (Price / Base) * 100
              newRatio = basePrice > 0 ? (value / basePrice) * 100 : 0;
          }

          return {
              ...prev,
              tuition: {
                  ...prev.tuition,
                  tiers: {
                      ...prev.tuition.tiers,
                      [tierId]: { ...prev.tuition.tiers[tierId], ratio: newRatio }
                  }
              }
          };
      });
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
  const handleLineItemUpdate = (type: 'revenue' | 'budget', id: string, field: 'modifierPercent' | 'modifierFixed' | 'finalValue' | 'baseline', value: number) => {
    setState(prev => {
        const list = type === 'revenue' ? prev.revenueItems : prev.budgetItems;
        const updatedList = list.map(item => {
            if (item.id !== id) return item;
            
            // Handle Baseline Update
            if (field === 'baseline') {
                return { ...item, baseline: value };
            }

            // Logic for "Final Value" direct edit
            if (field === 'finalValue') {
                const delta = value - item.baseline;
                const newPercent = item.baseline > 0 ? (delta / item.baseline) * 100 : 0;
                // When we set via Final Value (or Dollar Delta), we wipe out any fixed mod and rely on percent.
                return { ...item, modifierPercent: newPercent, modifierFixed: 0 };
            }

            // Logic for Percent edit: Zero out Fixed to ensure clean % calculation
            if (field === 'modifierPercent') {
                return { ...item, modifierPercent: value, modifierFixed: 0 };
            }

            // Logic for Fixed edit (Legacy/Fallback, though UI now uses FinalValue path for Delta)
            return { ...item, [field]: value };
        });

        return {
            ...prev,
            [type === 'revenue' ? 'revenueItems' : 'budgetItems']: updatedList
        };
    });
  };

  // --- Derived Calculations ---
  const financials = calculateFinancials(state);

  // --- Chart Data Processing ---
  // Split FT and PT
  const ftRevenue = financials.tiers.find(t => t.id === 'tuitionFT')?.gross || 0;
  const ptRevenue = financials.tiers.filter(t => t.id !== 'tuitionFT').reduce((sum, t) => sum + t.gross, 0);
  
  // Calculate raw revenue items (excluding tuition line item to avoid double count in pie)
  const otherRevenue = financials.processedRevenue
    .filter(i => i.id !== 'tuition')
    .reduce((acc, item) => acc + item.finalValue, 0);

  // Prepare Pie Data
  let revenuePieData = [
    { name: "Full-Time Tuition", value: ftRevenue },
    { name: "Part-Time Tuition", value: ptRevenue },
    { name: "Other Revenue", value: otherRevenue }
  ].filter(i => i.value > 0);
  
  // Sort Largest to Smallest
  revenuePieData.sort((a, b) => b.value - a.value);

  // --- Render Components ---

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
          <p className="text-center text-slate-400 mb-8 text-sm">Strategic Planning & Forecasting FY27</p>
          
          <div className="space-y-4">
            {authError && <p className="text-rose-500 text-xs text-center">{authError}</p>}
            
            <button 
                onClick={handleLogin}
                className="w-full bg-white text-slate-900 font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-3 hover:bg-slate-100"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </button>
            <p className="text-xs text-center text-slate-600">Secure Access Only</p>

            {/* Offline/Preview Bypass */}
            <div className="pt-4 mt-2 border-t border-slate-800 text-center">
                <button 
                    onClick={handleOfflineLogin}
                    className="text-[10px] text-amber-500 hover:text-amber-400 underline uppercase tracking-wide opacity-80 hover:opacity-100"
                >
                    Enter Offline Preview (No Auth)
                </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Inject the calculated tuition total into the revenueItems for the Table Display
  const displayRevenueItems = state.revenueItems.map(item => {
      if (item.id === 'tuition') {
          // We override the baseline/modifiers conceptually for the Table display
          // The table calculates `baseline + (baseline*%) + fixed`.
          // We want the result to be `netTuition`.
          // Hack: Set baseline to netTuition, mods to 0.
          return { ...item, baseline: financials.netTuition, modifierPercent: 0, modifierFixed: 0 };
      }
      return item;
  });

  return (
    <div className="min-h-screen pb-20">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center text-black">
                <SunIcon className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-100 hidden sm:inline">Sundrop <span className="text-amber-500">FINANCE</span></span>
          </div>

          <nav className="flex items-center space-x-1 bg-slate-800/50 rounded-full p-1">
            {[CARDS.STRATEGY, CARDS.REVENUE, CARDS.BUDGET, CARDS.MONTHLY].map((tab) => (
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
                    {financials.netMargin >= 0 ? '+' : ''}${Math.round(financials.netMargin).toLocaleString()}
                </span>
             </div>
             
             {/* Export Buttons (Visual Only) */}
             <div className="flex items-center space-x-1 border-l border-slate-700 pl-4">
                 <button className="px-2 py-1 text-[10px] font-bold bg-slate-800 text-slate-500 rounded cursor-not-allowed opacity-50" title="Coming Soon">PDF</button>
                 <button className="px-2 py-1 text-[10px] font-bold bg-slate-800 text-slate-500 rounded cursor-not-allowed opacity-50" title="Coming Soon">CSV</button>
             </div>
             
             {/* User Avatar Placeholder */}
             {user.photoURL ? (
                 <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-slate-700" />
             ) : (
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border border-slate-700 ${isOffline ? 'bg-slate-800 text-slate-500' : 'bg-amber-500 text-slate-900 font-bold'}`}>
                    {user.displayName ? user.displayName[0] : user.email[0]}
                 </div>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        
        {/* --- STRATEGY TAB --- */}
        {activeTab === CARDS.STRATEGY && (
          <>
            {/* KPI Cards (Strategy Only) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-slate-500 text-xs uppercase font-bold mb-1">Students</p>
                    <p className="text-2xl font-bold text-white">{financials.totalHeadcount}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-slate-500 text-xs uppercase font-bold mb-1">Net Tuition</p>
                    <p className="text-2xl font-bold text-amber-500">${Math.round(financials.netTuition / 1000)}K</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-slate-500 text-xs uppercase font-bold mb-1">Total Exp</p>
                    <p className="text-2xl font-bold text-rose-500">${Math.round(financials.totalExpenses / 1000)}K</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-slate-500 text-xs uppercase font-bold mb-1">Margin</p>
                    <div className="flex items-baseline gap-2">
                         <p className={`text-xl font-bold ${financials.netMargin >= 0 ? 'text-teal-500' : 'text-rose-500'}`}>
                            ${Math.round(financials.netMargin / 1000)}K
                        </p>
                        <p className={`text-sm font-bold ${financials.marginPercent >= 0 ? 'text-teal-500' : 'text-rose-500'}`}>
                            {financials.marginPercent.toFixed(1)}%
                        </p>
                    </div>
                </div>
            </div>

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
                            {/* Master Control: Base Price + Total Learners */}
                            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                <div className="md:col-span-2">
                                    <label className="text-xs text-amber-500 font-bold uppercase tracking-wider mb-2 block">Base Full-Time Rate (Yearly)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-3 text-slate-500 text-lg">$</span>
                                        <input 
                                            type="number" 
                                            value={state.tuition.baseFTPrice}
                                            onChange={(e) => handleBasePriceChange(parseFloat(e.target.value) || 0)}
                                            className="w-full bg-slate-900 text-3xl font-bold text-white pl-8 pr-4 py-2 rounded border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-1 h-full">
                                     <div className="h-full flex flex-col justify-center p-4 bg-slate-900/50 rounded-lg border border-slate-800/50">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 text-right">Total Learners</label>
                                        <div className="text-4xl font-bold text-white text-right">{financials.totalHeadcount}</div>
                                     </div>
                                </div>
                            </div>

                            {/* Tier Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {financials.tiers.map((tier) => (
                                    <div key={tier.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors">
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="font-medium text-slate-200">{tier.label}</h3>
                                            
                                            {/* Qty Input */}
                                            <div className="flex items-center bg-slate-900 rounded p-1 border border-slate-700">
                                                <label className="text-[10px] text-slate-500 uppercase mr-2 ml-1">Qty</label>
                                                <input 
                                                    type="number"
                                                    value={tier.qty}
                                                    onChange={(e) => handleTierQtyChange(tier.id, parseInt(e.target.value) || 0)}
                                                    className="w-12 bg-slate-950 rounded px-1 py-0.5 text-right text-white focus:border-amber-500 outline-none text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center gap-2">
                                            {/* Ratio Input */}
                                            {tier.id !== 'tuitionFT' ? (
                                                <div className="relative w-24">
                                                    <input 
                                                        type="number"
                                                        value={Math.round(tier.ratio)}
                                                        onChange={(e) => handleTierPriceOrRatioChange(tier.id, 'ratio', parseFloat(e.target.value) || 0)}
                                                        className="peer w-full bg-slate-900 border border-slate-700 rounded pl-2 pr-6 py-1 text-right text-xs text-slate-400 focus:text-white focus:border-amber-500 outline-none"
                                                    />
                                                    <span className="absolute right-2 top-1.5 text-slate-600 text-xs pointer-events-none peer-focus:hidden">%</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-500">Base Rate</span>
                                            )}

                                            {/* Price Input (Calculated but editable) */}
                                            <div className="relative flex-1">
                                                <span className="absolute left-2 top-1 text-slate-500 text-sm">$</span>
                                                <input
                                                    type="number"
                                                    value={Math.round(tier.calculatedPrice)}
                                                    onChange={(e) => handleTierPriceOrRatioChange(tier.id, 'price', parseFloat(e.target.value) || 0)}
                                                    className={`w-full bg-slate-900 border border-slate-700 rounded pl-5 pr-2 py-1 text-right font-bold text-teal-400 focus:border-amber-500 outline-none ${tier.id === 'tuitionFT' ? 'opacity-50 pointer-events-none' : ''}`}
                                                    readOnly={tier.id === 'tuitionFT'}
                                                />
                                            </div>
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
                            Discounts & Aid (Budget Impact)
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
                                                <div className="relative inline-block w-20">
                                                    <input 
                                                        type="number"
                                                        value={disc.discountPercent}
                                                        onChange={(e) => handleDiscountChange(disc.id, 'discountPercent', parseFloat(e.target.value) || 0)}
                                                        className="peer w-full bg-slate-950 border border-slate-700 rounded pl-2 pr-6 py-1 text-right text-white focus:border-amber-500 outline-none"
                                                    />
                                                    <span className="absolute right-2 top-1.5 text-slate-500 pointer-events-none text-xs peer-focus:hidden">%</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right text-rose-400">
                                                -${Math.round(disc.discountValue).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-950/50 font-bold border-t border-slate-800">
                                    <tr>
                                        <td className="px-4 py-3 text-slate-400">TOTAL</td>
                                        <td colSpan={2}></td>
                                        <td className="px-4 py-3 text-right text-rose-500">
                                            -${Math.round(financials.totalDiscounts).toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
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
                                        startAngle={90}
                                        endAngle={-270}
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
                            {revenuePieData.map((item, idx) => {
                                const totalVal = revenuePieData.reduce((acc, i) => acc + i.value, 0);
                                const percent = (item.value / totalVal) * 100;
                                return (
                                    <div key={idx} className="flex justify-between items-center text-sm">
                                        <div className="flex items-center">
                                            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                            <span className="text-slate-300 truncate max-w-[120px]">{item.name}</span>
                                        </div>
                                        <div className="flex gap-4">
                                            <span className="font-mono text-slate-400">${Math.round(item.value / 1000)}K</span>
                                            <span className="font-mono text-slate-500 w-10 text-right">{Math.round(percent)}%</span>
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
                 items={displayRevenueItems} 
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

        {/* --- MONTHLY TAB (Placeholder) --- */}
        {activeTab === CARDS.MONTHLY && (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 rounded-xl border border-dashed border-slate-700">
                <p className="text-slate-500 text-lg mb-2">Monthly Cashflow Breakdown</p>
                <p className="text-slate-600 text-sm">Seasonality controls coming soon...</p>
            </div>
        )}

      </main>

      {/* Footer / Status */}
      <div className="fixed bottom-0 left-0 w-full bg-slate-950/80 backdrop-blur border-t border-slate-900 py-2 px-4 text-xs text-slate-600 flex justify-between items-center z-40">
        <span>{isOffline ? "Offline Preview Mode (Data not saved to Cloud)" : "Sundrop Finance v27.2 (Firebase Auth)"}</span>
        <span>
            {lastSaved ? `Saved: ${lastSaved.toLocaleTimeString()}` : "Unsaved changes"}
        </span>
      </div>
    </div>
  );
}