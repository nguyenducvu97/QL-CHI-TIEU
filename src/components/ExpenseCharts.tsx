import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { PieChart as PieIcon, BarChart3 } from 'lucide-react';
import { Transaction } from '../types';
import { DEFAULT_CATEGORIES, getCategoryById } from '../data/categories';
import { formatVND } from '../utils/bidvParser';

interface ExpenseChartsProps {
  transactions: Transaction[];
}

export const ExpenseCharts: React.FC<ExpenseChartsProps> = ({ transactions }) => {
  const [timeRange, setTimeRange] = useState<'all' | 'month' | '7days'>('month');

  // Filter transactions based on time range
  const filteredTxs = useMemo(() => {
    const debits = transactions.filter((t) => t.type === 'debit');
    const now = new Date();

    if (timeRange === '7days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return debits.filter((t) => new Date(t.timestamp) >= sevenDaysAgo);
    }

    if (timeRange === 'month') {
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      return debits.filter((t) => {
        const d = new Date(t.timestamp);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
    }

    return debits;
  }, [transactions, timeRange]);

  // Donut chart data: grouped by category
  const pieData = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string }>();

    for (const t of filteredTxs) {
      const cat = getCategoryById(t.categoryId);
      const existing = map.get(cat.id);
      if (existing) {
        existing.value += t.amount;
      } else {
        map.set(cat.id, {
          name: cat.name,
          value: t.amount,
          color: cat.color,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [filteredTxs]);

  // Daily bar chart data
  const barData = useMemo(() => {
    const dayMap = new Map<string, number>();

    // Sort chronologically
    const sorted = [...filteredTxs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (const t of sorted) {
      const d = new Date(t.timestamp);
      const dayKey = `${d.getDate()}/${d.getMonth() + 1}`;
      dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + t.amount);
    }

    return Array.from(dayMap.entries()).map(([day, amount]) => ({
      day,
      amount,
    }));
  }, [filteredTxs]);

  const totalSpent = filteredTxs.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Donut Chart: Category Distribution */}
      <div className="lg:col-span-5 p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Cơ cấu chi tiêu
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-slate-700">
            {formatVND(totalSpent)}
          </span>
        </div>

        {pieData.length > 0 ? (
          <div className="flex-1 flex flex-col justify-center">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [formatVND(val), 'Chi tiêu']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Legend */}
            <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
              {pieData.slice(0, 6).map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-600 truncate">{item.name}</span>
                  <span className="font-mono text-slate-900 font-semibold ml-auto text-[11px]">
                    {Math.round((item.value / totalSpent) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-400 py-10">
            Chưa có giao dịch chi tiêu nào trong kỳ này
          </div>
        )}
      </div>

      {/* Bar Chart: Daily Trend */}
      <div className="lg:col-span-7 p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Diễn biến chi tiêu theo ngày
            </h3>
          </div>

          {/* Timeframe selector tabs */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-xs">
            <button
              onClick={() => setTimeRange('month')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                timeRange === 'month'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Tháng này
            </button>
            <button
              onClick={() => setTimeRange('7days')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                timeRange === '7days'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              7 ngày qua
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                timeRange === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
          </div>
        </div>

        {barData.length > 0 ? (
          <div className="flex-1 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: number) => [formatVND(val), 'Chi tiêu']}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="amount" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-400 py-10">
            Không có dữ liệu chi tiêu theo ngày
          </div>
        )}
      </div>
    </div>
  );
};
