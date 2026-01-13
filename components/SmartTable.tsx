import React from "react";
import { LineItem } from "../types";
import { calculateItemTotal } from "../services/calculationService";

interface SmartTableProps {
  items: LineItem[];
  type: 'revenue' | 'budget';
  onUpdate: (id: string, field: 'modifierPercent' | 'modifierFixed' | 'finalValue' | 'baseline', value: number) => void;
  readOnlyIds?: string[];
}

export const SmartTable: React.FC<SmartTableProps> = ({ items, type, onUpdate, readOnlyIds = [] }) => {
  const isRevenue = type === 'revenue';
  const totalColor = isRevenue ? 'text-teal-400' : 'text-rose-400';

  // Calculate Totals
  const totalBaseline = items.reduce((acc, item) => acc + item.baseline, 0);
  const totalFinal = items.reduce((acc, item) => {
    return acc + calculateItemTotal(item);
  }, 0); 
  
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
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isReadOnly = readOnlyIds.includes(item.id);
            const final = calculateItemTotal(item);
            const delta = final - item.baseline;
            
            return (
              <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4 font-medium truncate max-w-[200px]" title={item.label}>
                  {item.label}
                  {isReadOnly && <span className="ml-2 text-xs text-amber-500 font-normal">(Linked)</span>}
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
                        // Delta is Final - Baseline. We display this, and editing it updates Final.
                        value={Math.round(delta) === 0 ? '' : Math.round(delta)}
                        // When Delta changes, we calculate the implied Final Value (Baseline + NewDelta) and update that.
                        // This allows App.tsx to handle the % calculation.
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
                         ${Math.round(final).toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-slate-950/80 border-t border-slate-700 font-bold text-slate-200">
            <tr>
                <td className="px-6 py-4">TOTALS</td>
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
            </tr>
        </tfoot>
      </table>
    </div>
  );
};