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

// Enhanced Color palette
export const CHART_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#F97316', // Orange
];

// Beautiful Custom Tooltip Component
export const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-2xl shadow-gray-300/20 backdrop-blur-sm">
        {label && <p className="font-bold text-gray-800 mb-2 text-sm">{label}</p>}
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: entry.color }}
                ></div>
                <span className="text-gray-600 text-sm">{entry.name}:</span>
              </div>
              <span className="font-medium text-gray-800 text-sm ml-2">
                {formatter ? formatter(entry.value) : entry.value}
              </span>
            </div>
          ))}
        </div>
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
  innerRadius?: number;
  outerRadius?: number;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  height = 300,
  showLegend = true,
  formatter = formatVietnameseCurrency,
  innerRadius = 60,
  outerRadius = 90
}) => {
  const total = data.reduce((sum, entry) => sum + entry.value, 0);
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          labelLine={true}
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} 
              className="hover:opacity-90 transition-opacity duration-200"
            />
          ))}
        </Pie>
        <Tooltip 
          content={<CustomTooltip formatter={formatter} />}
          cursor={{ fill: 'transparent' }}
        />
        {showLegend && (
          <Legend 
            formatter={(value, name, props) => `${props.payload?.name || name}`}
            wrapperStyle={{ paddingTop: '10px', textAlign: 'center' }}
          />
        )}
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
  strokeWidth?: number;
  showArea?: boolean;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  xKey,
  yKey,
  height = 300,
  color = CHART_COLORS[0],
  formatter = formatVietnameseCurrency,
  strokeWidth = 3,
  showArea = false
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart 
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid 
          strokeDasharray="3 3" 
          strokeOpacity={0.1}
        />
        <XAxis 
          dataKey={xKey} 
          tick={{ fill: '#6B7280', fontSize: 12 }}
          axisLine={{ stroke: '#E5E7EB' }}
          tickLine={{ stroke: '#E5E7EB' }}
        />
        <YAxis 
          tickFormatter={formatter}
          tick={{ fill: '#6B7280', fontSize: 12 }}
          axisLine={{ stroke: '#E5E7EB' }}
          tickLine={{ stroke: '#E5E7EB' }}
        />
        <Tooltip 
          content={<CustomTooltip formatter={formatter} />}
          wrapperStyle={{ outline: 'none' }}
        />
        {showArea && (
          <Area 
            type="monotone" 
            dataKey={yKey} 
            stroke="none"
            fill={color}
            fillOpacity={0.1}
            strokeWidth={strokeWidth}
          />
        )}
        <Line 
          type="monotone" 
          dataKey={yKey} 
          stroke={color} 
          strokeWidth={strokeWidth}
          dot={{ 
            fill: color, 
            strokeWidth: 2, 
            r: 4,
            className: "hover:opacity-90 transition-opacity duration-200"
          }}
          activeDot={{ 
            r: 6, 
            stroke: color, 
            strokeWidth: 2,
            fill: 'white'
          }}
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
  strokeWidth?: number;
}

export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  xKey,
  yKey,
  height = 300,
  color = CHART_COLORS[0],
  formatter = formatVietnameseCurrency,
  strokeWidth = 2
}) => {
  const gradientOffset = () => {
    const dataMax = Math.max(...data.map(i => i[yKey]));
    const dataMin = Math.min(...data.map(i => i[yKey]));
    return (dataMax + dataMin) / 2;
  };
  
  const off = gradientOffset();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart 
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id={`colorGradient-${yKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid 
          strokeDasharray="3 3" 
          strokeOpacity={0.1}
        />
        <XAxis 
          dataKey={xKey} 
          tick={{ fill: '#6B7280', fontSize: 12 }}
          axisLine={{ stroke: '#E5E7EB' }}
          tickLine={{ stroke: '#E5E7EB' }}
        />
        <YAxis 
          tickFormatter={formatter}
          tick={{ fill: '#6B7280', fontSize: 12 }}
          axisLine={{ stroke: '#E5E7EB' }}
          tickLine={{ stroke: '#E5E7EB' }}
        />
        <Tooltip 
          content={<CustomTooltip formatter={formatter} />}
          wrapperStyle={{ outline: 'none' }}
        />
        <Area 
          type="monotone" 
          dataKey={yKey} 
          stroke={color} 
          fill={`url(#colorGradient-${yKey})`}
          strokeWidth={strokeWidth}
          dot={{ 
            fill: color, 
            strokeWidth: 2, 
            r: 4,
            className: "hover:opacity-90 transition-opacity duration-200"
          }}
          activeDot={{ 
            r: 6, 
            stroke: color, 
            strokeWidth: 2,
            fill: 'white'
          }}
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
      <RechartsBarChart 
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid 
          strokeDasharray="3 3" 
          strokeOpacity={0.1}
        />
        <XAxis 
          dataKey={xKey} 
          tick={{ fill: '#6B7280', fontSize: 12 }}
          axisLine={{ stroke: '#E5E7EB' }}
          tickLine={{ stroke: '#E5E7EB' }}
        />
        <YAxis 
          tickFormatter={formatter}
          tick={{ fill: '#6B7280', fontSize: 12 }}
          axisLine={{ stroke: '#E5E7EB' }}
          tickLine={{ stroke: '#E5E7EB' }}
        />
        <Tooltip 
          content={<CustomTooltip formatter={formatter} />}
          wrapperStyle={{ outline: 'none' }}
        />
        <Bar 
          dataKey={yKey} 
          fill={color}
          radius={[4, 4, 0, 0]}
          className="hover:opacity-90 transition-opacity duration-200"
        />
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
  strokeWidth?: number;
}

export const MultiLineChart: React.FC<MultiLineChartProps> = ({
  data,
  xKey,
  lines,
  height = 300,
  formatter = formatVietnameseCurrency,
  strokeWidth = 3
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart 
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid 
          strokeDasharray="3 3" 
          strokeOpacity={0.1}
        />
        <XAxis 
          dataKey={xKey} 
          tick={{ fill: '#6B7280', fontSize: 12 }}
          axisLine={{ stroke: '#E5E7EB' }}
          tickLine={{ stroke: '#E5E7EB' }}
        />
        <YAxis 
          tickFormatter={formatter}
          tick={{ fill: '#6B7280', fontSize: 12 }}
          axisLine={{ stroke: '#E5E7EB' }}
          tickLine={{ stroke: '#E5E7EB' }}
        />
        <Tooltip 
          content={<CustomTooltip formatter={formatter} />}
          wrapperStyle={{ outline: 'none' }}
        />
        <Legend 
          wrapperStyle={{ paddingTop: '10px', textAlign: 'center' }}
        />
        {lines.map((line, index) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.name}
            stroke={line.color || CHART_COLORS[index % CHART_COLORS.length]}
            strokeWidth={strokeWidth}
            dot={{ 
              fill: line.color || CHART_COLORS[index % CHART_COLORS.length], 
              strokeWidth: 2, 
              r: 4,
              className: "hover:opacity-90 transition-opacity duration-200"
            }}
            activeDot={{ 
              r: 6, 
              stroke: line.color || CHART_COLORS[index % CHART_COLORS.length], 
              strokeWidth: 2,
              fill: 'white'
            }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};
