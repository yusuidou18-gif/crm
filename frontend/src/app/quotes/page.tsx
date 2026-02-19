"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Download, Trash2, Eye } from "lucide-react";
import { getQuotes, deleteQuote, downloadQuotePDF } from "@/lib/api";
import type { QuoteListItem, QuoteStatus } from "@/lib/types";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/types";
import { formatCurrency, formatDate, downloadBlob } from "@/lib/utils";

const ALL_STATUSES: { value: string; label: string }[] = [
  { value: "", label: "すべて" },
  { value: "draft", label: "作成中" },
  { value: "submitted", label: "提出済" },
  { value: "won", label: "受注" },
  { value: "lost", label: "失注" },
];

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getQuotes(statusFilter ? { status: statusFilter } : undefined)
      .then(setQuotes)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleDelete = async (id: number) => {
    if (!confirm("この見積を削除しますか？")) return;
    await deleteQuote(id);
    load();
  };

  const handlePDF = async (id: number, quoteNumber?: string) => {
    const blob = await downloadQuotePDF(id);
    downloadBlob(blob, `見積書_${quoteNumber || id}.pdf`);
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">見積管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">全 {quotes.length} 件</p>
        </div>
        <Link
          href="/quotes/new"
          className="flex items-center gap-2 bg-[#1e3a5f] hover:bg-[#2d5a9e] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          新規見積作成
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {ALL_STATUSES.map(s => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              statusFilter === s.value
                ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
                : "bg-white text-gray-600 border-gray-200 hover:border-[#1e3a5f]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">読み込み中...</div>
        ) : quotes.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            見積がありません。<br />
            <Link href="/quotes/new" className="text-blue-600 hover:underline mt-1 inline-block">
              新規見積を作成する
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">見積番号</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">件名</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">顧客</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">担当者</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">ステータス</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">金額</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">作成日</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(q => (
                <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{q.quote_number || "---"}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 max-w-[180px] truncate">{q.title}</td>
                  <td className="px-4 py-3 text-gray-600">{q.customer?.name || "---"}</td>
                  <td className="px-4 py-3 text-gray-600">{q.staff?.name || "---"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${STATUS_COLORS[q.status as QuoteStatus]}`}>
                      {STATUS_LABELS[q.status as QuoteStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">{formatCurrency(q.total_amount)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(q.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/quotes/${q.id}`}
                        className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors"
                        title="詳細・編集"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handlePDF(q.id, q.quote_number)}
                        className="p-1.5 rounded hover:bg-green-50 text-green-600 transition-colors"
                        title="PDF出力"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-500 transition-colors"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
