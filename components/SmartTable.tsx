// Sync update: v27.9 - Strategy engine refinement
import React from "react";
import { LineItem } from "../types.ts";
import { calculateItemTotal } from "../services/calculationService.ts";

interface SmartTableProps {
  items: LineItem[];
  type: 'revenue' | 'budget';
  onUpdate: (id: string, field: 'modifierPercent' | 'modifierFixed' | 'finalValue' | 'baseline' | 'label', value: any) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  readOnlyIds?: string[];
}

export const SmartTable: React.FC<SmartTableProps> = ({ items, type, onUpdate, onAdd, onDelete, readOnlyIds = [] }) => {
  const isRevenue = type === 'revenue';
  const totalColor = isRevenue ? 'text-teal-400' : 'text-rose-400';
  const totalBaseline = items.reduce((acc, item) => acc + item.baseline, 0);
  const totalFinal = items.reduce((acc, item) => acc + calculateItemTotal(item), 0); 
  
  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl">
      <table className="w-full text-sm text-left text-slate-300">
        <thead className="text-[10px] uppercase bg-slate-950/80 text-slate-500 font-black tracking-widest border-b border-slate-800">
          <tr>
            <th className="px-8 py-6">Line Item</th>
            <th className="px-8 py-6 text-right">FY26 Baseline</th>
            <th className="px-8 py-6 text-center">Strategy %</th>
            <th className="px-8 py-6 text-center">Delta ($)</th>
            <th className="px-8 py-6 text-right">FY27 Final</th>
            <th className="px-4 py-6 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isReadOnly = readOnlyIds.includes(item.id);
            const final = calculateItemTotal(item);
            const delta = final - item.baseline;
            
            return (
              <tr key={item.id} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-all group">
                <td className="px-8 py-5 font-bold">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => onUpdate(item.id, 'label', e.target.value)}
                    className={`bg-transparent border-b border-transparent hover:border-slate-700 focus:border-amber-500 focus:outline-none w-full py-1 ${isReadOnly ? 'text-amber-500' : 'text-slate-200'}`}
                    readOnly={isReadOnly}
                  />
                </td>
                <td className="px-8 py-5 text-right font-mono">
                  {isReadOnly ? (
                     <span className="opacity-40">${Math.round(item.baseline).toLocaleString()}</span>
                  ) : (
                    <input
                        type="number"
                        value={Math.round(item.baseline) || ''}
                        onChange={(e) => onUpdate(item.id, 'baseline', parseFloat(e.target.value) || 0)}
                        className="w-32 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-right focus:border-amber-500 outline-none text-xs"
                    />
                  )}
                </td>
                <td className="px-8 py-5 text-center font-mono">
                  {!isReadOnly && (
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="number"
                        value={item.modifierPercent || ''}
                        onChange={(e) => onUpdate(item.id, 'modifierPercent', parseFloat(e.target.value) || 0)}
                        className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-right text-xs focus:border-amber-500 outline-none"
                      />
                      <span className="text-[10px] text-slate-600 font-black">%</span>
                    </div>
                  )}
                </td>
                <td className="px-8 py-5 text-center font-mono">
                  {!isReadOnly && (
                    <input
                      type="number"
                      value={Math.round(delta) || ''}
                      onChange={(e) => onUpdate(item.id, 'finalValue', item.baseline + (parseFloat(e.target.value) || 0))}
                      className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-right text-xs focus:border-amber-500 outline-none text-slate-400"
                    />
                  )}
                </td>
                <td className={`px-8 py-5 text-right font-black font-mono ${isRevenue ? 'text-teal-400' : 'text-rose-400'}`}>
                   ${Math.round(final).toLocaleString()}
                </td>
                <td className="px-4 py-5">
                  {!isReadOnly && (
                    <button onClick={() => onDelete(item.id)} className="text-slate-700 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-slate-950/80 font-black border-t border-slate-700">
            <tr>
                <td className="px-8 py-6">
                  <button onClick={onAdd} className="flex items-center gap-2 text-[10px] text-amber-500 hover:text-amber-400 uppercase tracking-[0.2em] transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Add Ledger Item
                  </button>
                </td>
                <td className="px-8 py-6 text-right opacity-40 font-mono">${Math.round(totalBaseline).toLocaleString()}</td>
                <td colSpan={2}></td>
                <td className={`px-8 py-6 text-right text-lg ${totalColor} font-mono`}>
                    ${Math.round(totalFinal).toLocaleString()}
                </td>
                <td></td>
            </tr>
        </tfoot>
      </table>
    </div>
  );
};
