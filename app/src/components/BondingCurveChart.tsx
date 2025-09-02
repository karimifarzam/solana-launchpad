'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface BondingCurveChartProps {
  data: Array<{
    supply: number;
    price: number;
    currentSupply?: boolean;
  }>;
  curveType: 'linear' | 'exponential';
  currentPrice?: number;
  currentSupply?: number;
  className?: string;
}

export function BondingCurveChart({ 
  data, 
  curveType, 
  currentPrice, 
  currentSupply,
  className = ''
}: BondingCurveChartProps) {
  return (
    <div className={`bg-white rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Bonding Curve</h3>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-primary-500 rounded-full mr-2"></div>
            <span className="text-gray-600">Price Curve</span>
          </div>
          {currentPrice && (
            <div className="text-gray-900 font-medium">
              Current: ${currentPrice.toFixed(6)}
            </div>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          
          <XAxis
            dataKey="supply"
            stroke="#6b7280"
            fontSize={12}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
          />
          
          <YAxis
            stroke="#6b7280"
            fontSize={12}
            tickFormatter={(value) => `$${value.toFixed(6)}`}
          />
          
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            formatter={(value: number, name: string) => [
              `$${value.toFixed(6)}`,
              'Price'
            ]}
            labelFormatter={(label) => `Supply: ${parseInt(label).toLocaleString()}`}
          />
          
          <Area
            type="monotone"
            dataKey="price"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#priceGradient)"
            dot={{ r: 0 }}
            activeDot={{ 
              r: 6, 
              fill: '#3b82f6',
              stroke: '#ffffff',
              strokeWidth: 2
            }}
          />

          {/* Current supply marker */}
          {currentSupply && (
            <Line
              type="linear"
              dataKey={() => currentSupply}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <div className="text-gray-500">Curve Type</div>
          <div className="font-medium text-gray-900 capitalize">{curveType}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">Price Range</div>
          <div className="font-medium text-gray-900">
            ${Math.min(...data.map(d => d.price)).toFixed(6)} - ${Math.max(...data.map(d => d.price)).toFixed(6)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">Max Supply</div>
          <div className="font-medium text-gray-900">
            {Math.max(...data.map(d => d.supply)).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

// Generate sample data for bonding curve visualization
export function generateCurveData(
  curveType: 'linear' | 'exponential',
  basePrice: number,
  slope: number,
  maxSupply: number,
  step: number = 1000
): Array<{ supply: number; price: number }> {
  const data = [];
  const points = Math.min(100, Math.floor(maxSupply / step));
  
  for (let i = 0; i <= points; i++) {
    const supply = (i * maxSupply) / points;
    let price: number;
    
    if (curveType === 'linear') {
      price = basePrice + (slope * supply);
    } else {
      // Exponential: P(S) = basePrice * multiplier^(S/step)
      const exponent = supply / step;
      price = basePrice * Math.pow(slope, exponent);
    }
    
    data.push({ supply: Math.floor(supply), price });
  }
  
  return data;
}