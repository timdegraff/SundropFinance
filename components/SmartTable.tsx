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
    <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/50 backdrop-blur">
      <table className="w-full text-sm text-left text-slate-300">
        <thead className="text-xs uppercase bg-slate-950 text-slate-400">
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
          {items.map((item) => {
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
                    className={`bg-transparent border-b border-transparent hover:border-slate-700 focus:border-amber-500 focus:outline-none w-full py-1 ${isReadOnly ? 'text-amber-500' : 'text-slate-200'}`}
                    readOnly={isReadOnly}
                  />
                </td>
                <td className="px-6 py-4 text-right">
                  {isReadOnly ? (
                     <span className="opacity-60">${Math.round(item.baseline).toLocaleString()}</span>
                  ) : (
                    <div className="relative inline-block w-28">
                       <span className="absolute left-2 top-1 text-slate-500 pointer-events-none peer-focus:hidden">$</span>
                       <input
                        type="number"
                        value={Math.round(item.baseline) === 0 ? '' : Math.round(item.baseline)}
                        onChange={(e) => onUpdate(item.id, 'baseline', parseFloat(e.target.value) || 0)}
                        className="peer w-full bg-slate-950 border border-slate-700 rounded pl-5 pr-2 py-1 text-right focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-200 placeholder-slate-600"
                      />
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  {isReadOnly ? (
                     <span className="opacity-30">-</span>
                  ) : (
                    <div className="relative inline-block w-20">
                      <input
                        type="number"
                        value={item.modifierPercent === 0 ? '' : item.modifierPercent}
                        onChange={(e) => onUpdate(item.id, 'modifierPercent', parseFloat(e.target.value) || 0)}
                        className="peer w-full bg-slate-950 border border-slate-700 rounded pl-2 pr-6 py-1 text-right focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-200 placeholder-slate-600"
                        placeholder="0"
                      />
                      <span className="absolute right-2 top-1 text-slate-500 pointer-events-none peer-focus:hidden">%</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  {isReadOnly ? (
                     <span className="opacity-30">-</span>
                  ) : (
                    <div className="relative inline-block w-24">
                       <span className="absolute left-2 top-1 text-slate-500 pointer-events-none peer-focus:hidden">$</span>
                      <input
                        type="number"
                        value={Math.round(delta) === 0 ? '' : Math.round(delta)}
                        onChange={(e) => {
                            const newDelta = parseFloat(e.target.value) || 0;
                            onUpdate(item.id, 'finalValue', item.baseline + newDelta);
                        }}
                        className="peer w-full bg-slate-950 border border-slate-700 rounded pl-5 pr-2 py-1 text-right focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-200 placeholder-slate-600"
                        placeholder="0"
                      />
                    </div>
                  )}
                </td>
                <td className={`px-6 py-4 text-right font-bold`}>
                   {isReadOnly ? (
                       <span className={isRevenue ? 'text-amber-400' : 'text-slate-100'}>
                         ${Math.round(final).toLocaleString()}
                       </span>
                   ) : (
                    <div className="relative inline-block w-28">
                       <span className="absolute left-2 top-1 text-slate-500 pointer-events-none peer-focus:hidden">$</span>
                       <input
                        type="number"
                        value={Math.round(final)}
                        onChange={(e) => onUpdate(item.id, 'finalValue', parseFloat(e.target.value) || 0)}
                        className={`peer w-full bg-slate-950 border border-slate-700 rounded pl-5 pr-2 py-1 text-right focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-bold ${isRevenue ? 'text-teal-400' : 'text-rose-400'}`}
                      />
                    </div>
                   )}
                </td>
                <td className="px-4 py-4">
                  {!isReadOnly && (
                    <button 
                      onClick={() => onDelete(item.id)}
                      className="text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-slate-950/80 border-t border-slate-700 font-bold text-slate-200">
            <tr>
                <td className="px-6 py-4">
                  <button 
                    onClick={onAdd}
                    className="flex items-center gap-2 text-xs text-amber-500 hover:text-amber-400 uppercase tracking-widest font-bold px-2 py-1 rounded hover:bg-amber-500/10 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Add Item
                  </button>
                </td>
                <td className="px-6 py-4 text-right">${Math.round(totalBaseline).toLocaleString()}</td>
                <td className="px-6 py-4 text-center opacity-50">-</td>
                <td className="px-6 py-4 text-center opacity-50">
                    <span className={totalFinal > totalBaseline ? 'text-teal-500' : 'text-slate-500'}>
                        {totalFinal > totalBaseline ? '+' : ''}${Math.round(totalFinal - totalBaseline).toLocaleString()}
                    </span>
                </td>
                <td className={`px-6 py-4 text-right ${totalColor}`}>
                    ${Math.round(totalFinal).toLocaleString()}
                </td>
                <td></td>
            </tr>
        </tfoot>
      </table>
    </div>
  );
};