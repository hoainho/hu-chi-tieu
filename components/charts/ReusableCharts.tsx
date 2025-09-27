import React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line,
  AreaChart as RechartsAreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { formatVietnameseCurrency } from '../../utils/vietnamCurrency';

// Color palette
export const CHART_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
];

// Custom Tooltip Component
export const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        {label && <p className="font-semibold text-gray-800">{label}</p>}
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {formatter ? formatter(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Pie Chart Component
interface PieChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  height?: number;
  showLegend?: boolean;
  formatter?: (value: number) => string;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  height = 300,
  showLegend = true,
  formatter = formatVietnameseCurrency
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} 
            />
          ))}
        </Pie>
        <Tooltip 
          content={<CustomTooltip formatter={formatter} />}
        />
        {showLegend && <Legend />}
      </RechartsPieChart>
    </ResponsiveContainer>
  );
};

// Line Chart Component
interface LineChartProps {
  data: Array<{ [key: string]: any }>;
  xKey: string;
  yKey: string;
  height?: number;
  color?: string;
  formatter?: (value: number) => string;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  xKey,
  yKey,
  height = 300,
  color = CHART_COLORS[0],
  formatter = formatVietnameseCurrency
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis tickFormatter={formatter} />
        <Tooltip content={<CustomTooltip formatter={formatter} />} />
        <Line 
          type="monotone" 
          dataKey={yKey} 
          stroke={color} 
          strokeWidth={2}
          dot={{ fill: color, strokeWidth: 2, r: 4 }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};

// Area Chart Component
interface AreaChartProps {
  data: Array<{ [key: string]: any }>;
  xKey: string;
  yKey: string;
  height?: number;
  color?: string;
  formatter?: (value: number) => string;
}

export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  xKey,
  yKey,
  height = 300,
  color = CHART_COLORS[0],
  formatter = formatVietnameseCurrency
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis tickFormatter={formatter} />
        <Tooltip content={<CustomTooltip formatter={formatter} />} />
        <Area 
          type="monotone" 
          dataKey={yKey} 
          stroke={color} 
          fill={`${color}20`} // 20% opacity
          strokeWidth={2}
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
};

// Bar Chart Component
interface BarChartProps {
  data: Array<{ [key: string]: any }>;
  xKey: string;
  yKey: string;
  height?: number;
  color?: string;
  formatter?: (value: number) => string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  xKey,
  yKey,
  height = 300,
  color = CHART_COLORS[0],
  formatter = formatVietnameseCurrency
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis tickFormatter={formatter} />
        <Tooltip content={<CustomTooltip formatter={formatter} />} />
        <Bar dataKey={yKey} fill={color} />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};

// Multi-line Chart Component
interface MultiLineChartProps {
  data: Array<{ [key: string]: any }>;
  xKey: string;
  lines: Array<{ key: string; name: string; color?: string }>;
  height?: number;
  formatter?: (value: number) => string;
}

export const MultiLineChart: React.FC<MultiLineChartProps> = ({
  data,
  xKey,
  lines,
  height = 300,
  formatter = formatVietnameseCurrency
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis tickFormatter={formatter} />
        <Tooltip content={<CustomTooltip formatter={formatter} />} />
        <Legend />
        {lines.map((line, index) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.name}
            stroke={line.color || CHART_COLORS[index % CHART_COLORS.length]}
            strokeWidth={2}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};
