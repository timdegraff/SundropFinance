// Sync update: v27.23 - Unbold Line Items
import React from "react";
import { LineItem } from "../types.ts";
import { calculateItemTotal } from "../services/calculationService.ts";

interface SmartTableProps {
  items: LineItem[];
  type: 'revenue' | 'budget';
  onUpdate: (id: string, field: 'modifierPercent' | 'modifierFixed' | 'finalValue' | 'baseline' | 'label', value: any) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  readOnlyIds?: string[];
}

export const SmartTable: React.FC<SmartTableProps> = ({ items, type, onUpdate, onAdd, onDelete, onMoveUp, onMoveDown, readOnlyIds = [] }) => {
  const isRevenue = type === 'revenue';
  const totalColor = isRevenue ? 'text-teal-400' : 'text-rose-400';
  const totalBaseline = items.reduce((acc, item) => acc + item.baseline, 0);
  
  // Use the pre-calculated finalValue if it exists (for Tuition override), otherwise calculate standard
  const getFinal = (item: LineItem) => item.finalValue !== undefined ? item.finalValue : calculateItemTotal(item);

  const totalFinal = items.reduce((acc, item) => acc + getFinal(item), 0);
  
  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl">
      <table className="w-full text-sm text-left text-slate-300">
        <thead className="text-[10px] uppercase bg-slate-950/80 text-slate-500 font-bold tracking-widest border-b border-slate-800">
          <tr>
            <th className="px-8 py-3">Line Item</th>
            <th className="px-8 py-3 text-right">FY26 Baseline</th>
            <th className="px-8 py-3 text-center">Strategy %</th>
            <th className="px-8 py-3 text-center">Delta ($)</th>
            <th className="px-8 py-3 text-right">FY27 Final</th>
            <th className="px-2 py-3 text-center w-16">Order</th>
            <th className="px-4 py-3 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const isReadOnly = readOnlyIds.includes(item.id);
            const final = getFinal(item);
            const delta = final - item.baseline;
            
            return (
              <tr key={item.id} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-all group">
                <td className="px-8 py-3 font-medium">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => onUpdate(item.id, 'label', e.target.value)}
                    className={`bg-transparent border-b border-transparent hover:border-slate-700 focus:border-amber-500 focus:outline-none w-full py-1 ${isReadOnly ? 'text-amber-500' : 'text-slate-200'}`}
                    readOnly={isReadOnly}
                  />
                </td>
                <td className="px-8 py-3 text-right font-mono">
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
                <td className="px-8 py-3 text-center font-mono">
                  {!isReadOnly && (
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="number"
                        value={item.modifierPercent || ''}
                        onChange={(e) => onUpdate(item.id, 'modifierPercent', parseFloat(e.target.value) || 0)}
                        className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-right text-xs focus:border-amber-500 outline-none"
                      />
                      <span className="text-[10px] text-slate-600 font-bold">%</span>
                    </div>
                  )}
                </td>
                <td className="px-8 py-3 text-center font-mono">
                  {!isReadOnly && (
                    <input
                      type="number"
                      value={Math.round(delta) || ''}
                      onChange={(e) => onUpdate(item.id, 'finalValue', item.baseline + (parseFloat(e.target.value) || 0))}
                      className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-right text-xs focus:border-amber-500 outline-none text-slate-400"
                    />
                  )}
                </td>
                <td className={`px-8 py-3 text-right font-bold font-mono ${isRevenue ? 'text-teal-400' : 'text-rose-400'}`}>
                   ${Math.round(final).toLocaleString()}
                </td>
                <td className="px-2 py-3">
                  {onMoveUp && onMoveDown && (
                    <div className="flex items-center justify-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => onMoveUp(item.id)}
                        disabled={index === 0}
                        className="p-1 rounded text-slate-500 hover:text-amber-500 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-all"
                        aria-label="Move up"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveDown(item.id)}
                        disabled={index === items.length - 1}
                        className="p-1 rounded text-slate-500 hover:text-amber-500 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-all"
                        aria-label="Move down"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
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
        <tfoot className="bg-slate-950/80 font-bold border-t border-slate-700">
            <tr>
                <td className="px-8 py-4">
                  <button onClick={onAdd} className="flex items-center gap-2 text-[10px] text-amber-500 hover:text-amber-400 uppercase tracking-[0.2em] transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Add Ledger Item
                  </button>
                </td>
                <td className="px-8 py-4 text-right opacity-40 font-mono">${Math.round(totalBaseline).toLocaleString()}</td>
                <td colSpan={2}></td>
                <td className={`px-8 py-4 text-right text-lg ${totalColor} font-mono`}>
                    ${Math.round(totalFinal).toLocaleString()}
                </td>
                <td></td>
                <td></td>
            </tr>
        </tfoot>
      </table>
    </div>
  );
};