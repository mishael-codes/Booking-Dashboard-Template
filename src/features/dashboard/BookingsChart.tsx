import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { BookingsByDay } from '../../api/dashboard';
import { formatCurrency } from '../../lib/money';

interface BookingsChartProps {
  data: BookingsByDay[];
  currency?: string;
}

export default function BookingsChart({ data, currency = 'NGN' }: BookingsChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-neutral-400">
        No booking activity in selected date range.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    day: d.day,
    bookings: d.bookings,
    revenue: d.booked_value_minor,
  }));

  return (
    <div className="h-72 w-full pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="bookingGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#171717" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#171717" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: '#737373' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E5E5' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#737373' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const current = payload[0]?.payload as { bookings: number; revenue: number };
                return (
                  <div className="bg-neutral-900 text-white p-2.5 rounded shadow-lg text-xs font-mono space-y-1">
                    <div className="text-neutral-400 text-[10px]">{label}</div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-neutral-300">Bookings:</span>
                      <span className="font-bold">{current.bookings}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-neutral-300">Revenue:</span>
                      <span className="font-bold">{formatCurrency(current.revenue, currency)}</span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="bookings"
            stroke="#171717"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#bookingGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
