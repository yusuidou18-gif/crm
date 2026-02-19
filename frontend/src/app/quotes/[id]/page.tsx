"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Download, Sparkles, List,
  BadgeJapaneseYen, TrendingUp,
} from "lucide-react";
import {
  getQuote, updateQuote, getCustomers, getStaff,
  getCategories, getProducts, downloadQuotePDF,
} from "@/lib/api";
import type { Quote, Customer, Staff, Category, Product, QuoteItem } from "@/lib/types";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/types";
import { formatCurrency, formatDate, downloadBlob } from "@/lib/utils";
import QuoteEditor from "@/components/QuoteEditor";
import AIAnalysisPanel from "@/components/AIAnalysisPanel";

type Mode = "ai" | "manual";

export default function QuoteDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const quoteId = parseInt(id);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [mode, setMode] = useState<Mode>("manual");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Editable fields
  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);

  useEffect(() => {
    Promise.all([
      getQuote(quoteId),
      getCustomers(),
      getStaff(),
      getCategories(),
      getProducts(),
    ]).then(([q, c, s, cat, p]) => {
      setQuote(q);
      setTitle(q.title);
      setCustomerId(String(q.customer_id));
      setStaffId(String(q.staff_id));
      setStatus(q.status);
      setNotes(q.notes || "");
      setDiscountAmount(q.discount_amount || 0);
      setItems(q.items);
      setCustomers(c);
      setStaffList(s);
      setCategories(cat);
      setProducts(p);
    }).catch(console.error).finally(() => setLoading(false));
  }, [quoteId]);

  const subtotal = items.reduce((sum, item) => {
    const optsTotal = item.selected_options.reduce((s, o) => s + o.unit_price * o.quantity, 0);
    return sum + (item.unit_price + item.construction_cost + optsTotal) * item.quantity;
  }, 0);
  const total = subtotal - discountAmount;
  const grossProfit = total - items.reduce((sum, item) => {
    const optsPurchase = item.selected_options.reduce((s, o) => s + o.purchase_price * o.quantity, 0);
    return sum + (item.purchase_price + optsPurchase) * item.quantity;
  }, 0);
  const gpRate = total > 0 ? (grossProfit / total * 100) : 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateQuote(quoteId, {
        title,
        customer_id: parseInt(customerId),
        staff_id: parseInt(staffId),
        status: status as any,
        notes,
        discount_amount: discountAmount,
        items: items.map((item, i) => ({ ...item, sort_order: i })),
      });
      alert("保存しました");
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handlePDF = async () => {
    const blob = await downloadQuotePDF(quoteId);
    downloadBlob(blob, `見積書_${quote?.quote_number || quoteId}.pdf`);
  };

  const handleAIApply = (aiItems: QuoteItem[]) => {
    setItems(prev => [
      ...prev,
      ...aiItems.map((item, i) => ({ ...item, sort_order: prev.length + i })),
    ]);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="text-gray-500 text-sm">読み込み中...</div></div>;
  }
  if (!quote) {
    return <div className="p-6 text-red-500">見積が見つかりません</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/quotes" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-gray-400">{quote.quote_number}</span>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${STATUS_COLORS[quote.status]}`}>
              {STATUS_LABELS[quote.status]}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mt-0.5">{title || "無題の見積"}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePDF}
            className="flex items-center gap-2 border border-green-600 text-green-700 hover:bg-green-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" /> PDF出力
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#1e3a5f] hover:bg-[#2d5a9e] disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left */}
        <div className="space-y-5">
          {/* Meta */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-gray-700 text-sm">基本情報</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-500">件名</label>
                <input
                  className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">顧客</label>
                <select className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={customerId} onChange={e => setCustomerId(e.target.value)}>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">担当者</label>
                <select className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={staffId} onChange={e => setStaffId(e.target.value)}>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">ステータス</label>
                <select className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="draft">作成中</option>
                  <option value="submitted">提出済</option>
                  <option value="won">受注</option>
                  <option value="lost">失注</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">作成日</label>
                <div className="mt-1 px-3 py-2 text-sm text-gray-600">{formatDate(quote.created_at)}</div>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-500">備考</label>
                <textarea className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2">
            <button onClick={() => setMode("ai")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${mode === "ai" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent" : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"}`}>
              <Sparkles className="w-4 h-4" /> AI自動入力
            </button>
            <button onClick={() => setMode("manual")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${mode === "manual" ? "bg-[#1e3a5f] text-white border-transparent" : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"}`}>
              <List className="w-4 h-4" /> 手動入力
            </button>
          </div>

          {mode === "ai" && <AIAnalysisPanel onApply={handleAIApply} />}

          {/* Editor */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold text-gray-700 text-sm mb-3">見積明細 ({items.length}件)</h2>
            <QuoteEditor items={items} onChange={setItems} categories={categories} products={products} />
          </div>
        </div>

        {/* Right: summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 sticky top-6 space-y-4">
            <h3 className="font-semibold text-gray-700 text-sm">見積合計</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>小計</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>値引き</span>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">-</span>
                  <input type="number" className="w-24 text-right text-sm border border-gray-200 rounded px-1.5 py-0.5"
                    value={discountAmount} min={0} onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-gray-800 text-base">
                <span>合計（税抜）</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>消費税（10%）</span>
                <span>{formatCurrency(total * 0.1)}</span>
              </div>
              <div className="border-t pt-1 flex justify-between text-sm font-bold text-blue-700">
                <span>税込合計</span>
                <span>{formatCurrency(total * 1.1)}</span>
              </div>
            </div>

            {/* Profit section */}
            <div className="border-t border-gray-100 pt-3 space-y-1.5">
              <h4 className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> 収益性
              </h4>
              <div className="flex justify-between text-sm text-gray-600">
                <span>粗利益</span>
                <span className={`font-semibold ${grossProfit >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {formatCurrency(grossProfit)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>粗利率</span>
                <span className={`font-semibold ${gpRate >= 30 ? "text-green-600" : gpRate >= 20 ? "text-yellow-600" : "text-red-500"}`}>
                  {gpRate.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={handlePDF}
                className="flex-1 flex items-center justify-center gap-1.5 border border-green-600 text-green-700 hover:bg-green-50 px-3 py-2 rounded-lg text-xs font-medium">
                <Download className="w-3.5 h-3.5" /> PDF出力
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#1e3a5f] hover:bg-[#2d5a9e] disabled:opacity-50 text-white px-3 py-2 rounded-lg text-xs font-medium">
                <Save className="w-3.5 h-3.5" /> {saving ? "保存中" : "保存"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
