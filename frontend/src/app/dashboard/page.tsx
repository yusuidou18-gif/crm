"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  TrendingUp, FileText, Trophy, Target, Award, BadgeJapaneseYen
} from "lucide-react";
import { getDashboard } from "@/lib/api";
import type { DashboardData } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const STATUS_JP: Record<string, string> = {
  draft: "作成中",
  submitted: "提出済",
  won: "受注",
  lost: "失注",
};

const PIE_COLORS = [
  "#1e3a5f", "#2d5a9e", "#4a80c4", "#6fa3d8", "#94c0e8",
  "#b8d5f0", "#2ecc71", "#e74c3c",
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 text-sm">読み込み中...</div>
      </div>
    );
  }

  if (!data) {
    return <div className="p-6 text-red-500">データの取得に失敗しました</div>;
  }

  const statusData = Object.entries(data.status_breakdown).map(([k, v]) => ({
    name: STATUS_JP[k] ?? k,
    value: v,
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">ダッシュボード</h1>
        <p className="text-sm text-gray-500 mt-0.5">営業実績・経営指標の概要</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<FileText className="w-5 h-5" />}
          label="総見積件数"
          value={`${data.total_quotes} 件`}
          color="bg-blue-50 text-blue-700"
        />
        <KpiCard
          icon={<Trophy className="w-5 h-5" />}
          label="受注件数"
          value={`${data.total_won} 件`}
          color="bg-green-50 text-green-700"
        />
        <KpiCard
          icon={<BadgeJapaneseYen className="w-5 h-5" />}
          label="受注金額合計"
          value={formatCurrency(data.total_won_amount)}
          color="bg-yellow-50 text-yellow-700"
        />
        <KpiCard
          icon={<Target className="w-5 h-5" />}
          label="受注率"
          value={`${data.win_rate.toFixed(1)}%`}
          color="bg-purple-50 text-purple-700"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Sales */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> 月次受注金額推移（過去12ヶ月）
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.monthly_sales} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 10000).toFixed(0)}万`} />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v), "受注金額"]}
                labelStyle={{ fontSize: 11 }}
                contentStyle={{ fontSize: 11 }}
              />
              <Bar dataKey="amount" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">ステータス別件数</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {statusData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v} 件`]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Staff Rankings */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Award className="w-4 h-4" /> 担当者別受注実績
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pb-2 text-gray-500 font-medium">担当者</th>
                <th className="text-right pb-2 text-gray-500 font-medium">受注件数</th>
                <th className="text-right pb-2 text-gray-500 font-medium">受注金額</th>
                <th className="text-right pb-2 text-gray-500 font-medium">受注率</th>
              </tr>
            </thead>
            <tbody>
              {data.staff_rankings.map((s, i) => (
                <tr key={s.staff_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2.5 flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? "bg-yellow-400" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-orange-400" : "bg-gray-200 text-gray-600"}`}>
                      {i + 1}
                    </span>
                    {s.staff_name}
                  </td>
                  <td className="text-right py-2.5 font-medium">{s.won_count}</td>
                  <td className="text-right py-2.5 font-medium">{formatCurrency(s.won_amount)}</td>
                  <td className="text-right py-2.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${s.win_rate >= 50 ? "bg-green-100 text-green-700" : s.win_rate >= 30 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                      {s.win_rate}%
                    </span>
                  </td>
                </tr>
              ))}
              {data.staff_rankings.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-400 text-sm">データなし</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Category Sales */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">カテゴリ別売上比率</h2>
          {data.category_sales.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data.category_sales}
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  dataKey="amount"
                  nameKey="category"
                >
                  {data.category_sales.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [formatCurrency(v)]} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              受注データなし
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${color} mb-3`}>
        {icon}
      </div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-xl font-bold text-gray-800 mt-0.5">{value}</p>
    </div>
  );
}
