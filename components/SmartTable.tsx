import React from "react";
import { LineItem } from "../types";
import { calculateItemTotal } from "../services/calculationService";

interface SmartTableProps {
  items: LineItem[];
  type: 'revenue' | 'budget';
  onUpdate: (id: string, field: 'modifierPercent' | 'modifierFixed', value: number) => void;
  readOnlyIds?: string[];
}

export const SmartTable: React.FC<SmartTableProps> = ({ items, type, onUpdate, readOnlyIds = [] }) => {
  const isRevenue = type === 'revenue';
  const totalColor = isRevenue ? 'text-teal-400' : 'text-rose-400';

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/50 backdrop-blur">
      <table className="w-full text-sm text-left text-slate-300">
        <thead className="text-xs uppercase bg-slate-950 text-slate-400">
          <tr>
            <th className="px-6 py-4">Line Item</th>
            <th className="px-6 py-4 text-right">FY26 Baseline</th>
            <th className="px-6 py-4 text-center">Strategy %</th>
            <th className="px-6 py-4 text-center">Fixed Adj ($)</th>
            <th className="px-6 py-4 text-right">FY27 Final</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isReadOnly = readOnlyIds.includes(item.id);
            const final = calculateItemTotal(item);
            
            return (
              <tr key={item.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4 font-medium truncate max-w-[200px]" title={item.label}>
                  {item.label}
                  {isReadOnly && <span className="ml-2 text-xs text-amber-500 font-normal">(Linked)</span>}
                </td>
                <td className="px-6 py-4 text-right opacity-60">
                  ${item.baseline.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-center">
                  {isReadOnly ? (
                     <span className="opacity-30">-</span>
                  ) : (
                    <div className="relative inline-block w-20">
                      <input
                        type="number"
                        value={item.modifierPercent}
                        onChange={(e) => onUpdate(item.id, 'modifierPercent', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-right focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-200"
                        placeholder="0"
                      />
                      <span className="absolute right-7 top-1 text-slate-500 pointer-events-none">%</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  {isReadOnly ? (
                     <span className="opacity-30">-</span>
                  ) : (
                    <div className="relative inline-block w-24">
                       <span className="absolute left-2 top-1 text-slate-500 pointer-events-none">$</span>
                      <input
                        type="number"
                        value={item.modifierFixed}
                        onChange={(e) => onUpdate(item.id, 'modifierFixed', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-700 rounded pl-5 pr-2 py-1 text-right focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-slate-200"
                        placeholder="0"
                      />
                    </div>
                  )}
                </td>
                <td className={`px-6 py-4 text-right font-bold ${isRevenue && item.id === 'tuition' ? 'text-amber-400' : 'text-slate-100'}`}>
                  ${final.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};