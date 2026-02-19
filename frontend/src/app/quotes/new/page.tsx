"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Sparkles, List } from "lucide-react";
import Link from "next/link";
import { getCustomers, getStaff, getCategories, getProducts, createQuote } from "@/lib/api";
import type { Customer, Staff, Category, Product, QuoteItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import QuoteEditor from "@/components/QuoteEditor";
import AIAnalysisPanel from "@/components/AIAnalysisPanel";

type Mode = "ai" | "manual";

export default function NewQuotePage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("manual");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form fields
  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState<string>("");
  const [staffId, setStaffId] = useState<string>("");
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);

  useEffect(() => {
    Promise.all([getCustomers(), getStaff(), getCategories(), getProducts()])
      .then(([c, s, cat, p]) => {
        setCustomers(c);
        setStaffList(s);
        setCategories(cat);
        setProducts(p);
      });
  }, []);

  const subtotal = items.reduce((sum, item) => {
    const optsTotal = item.selected_options.reduce((s, o) => s + o.unit_price * o.quantity, 0);
    return sum + (item.unit_price + item.construction_cost + optsTotal) * item.quantity;
  }, 0);
  const total = subtotal - discountAmount;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "件名を入力してください";
    if (!customerId) errs.customerId = "顧客を選択してください";
    if (!staffId) errs.staffId = "担当者を選択してください";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const quote = await createQuote({
        title,
        customer_id: parseInt(customerId),
        staff_id: parseInt(staffId),
        status: status as any,
        notes,
        discount_amount: discountAmount,
        items: items.map((item, i) => ({ ...item, sort_order: i })),
      });
      router.push(`/quotes/${quote.id}`);
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleAIApply = (aiItems: QuoteItem[]) => {
    setItems(prev => [
      ...prev,
      ...aiItems.map((item, i) => ({ ...item, sort_order: prev.length + i })),
    ]);
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/quotes" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">新規見積作成</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#1e3a5f] hover:bg-[#2d5a9e] disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? "保存中..." : "保存"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left: main content */}
        <div className="space-y-5">
          {/* Meta fields */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h2 className="font-semibold text-gray-700 text-sm">基本情報</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Title */}
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-500">件名 *</label>
                <input
                  className={`mt-1 block w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${errors.title ? "border-red-400" : "border-gray-200"}`}
                  placeholder="例：山田様邸 キッチン・浴室リフォーム工事"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
                {errors.title && <p className="text-xs text-red-500 mt-0.5">{errors.title}</p>}
              </div>
              {/* Customer */}
              <div>
                <label className="text-xs font-medium text-gray-500">顧客 *</label>
                <select
                  className={`mt-1 block w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 ${errors.customerId ? "border-red-400" : "border-gray-200"}`}
                  value={customerId}
                  onChange={e => setCustomerId(e.target.value)}
                >
                  <option value="">顧客を選択...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.contact_person ? ` (${c.contact_person})` : ""}
                    </option>
                  ))}
                </select>
                {errors.customerId && <p className="text-xs text-red-500 mt-0.5">{errors.customerId}</p>}
              </div>
              {/* Staff */}
              <div>
                <label className="text-xs font-medium text-gray-500">担当者 *</label>
                <select
                  className={`mt-1 block w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 ${errors.staffId ? "border-red-400" : "border-gray-200"}`}
                  value={staffId}
                  onChange={e => setStaffId(e.target.value)}
                >
                  <option value="">担当者を選択...</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {errors.staffId && <p className="text-xs text-red-500 mt-0.5">{errors.staffId}</p>}
              </div>
              {/* Status */}
              <div>
                <label className="text-xs font-medium text-gray-500">ステータス</label>
                <select
                  className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                >
                  <option value="draft">作成中</option>
                  <option value="submitted">提出済</option>
                  <option value="won">受注</option>
                  <option value="lost">失注</option>
                </select>
              </div>
              {/* Notes */}
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-gray-500">備考</label>
                <textarea
                  className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  rows={2}
                  placeholder="見積に関する備考・特記事項"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode("ai")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${mode === "ai" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent" : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"}`}
            >
              <Sparkles className="w-4 h-4" /> AI自動入力
            </button>
            <button
              onClick={() => setMode("manual")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${mode === "manual" ? "bg-[#1e3a5f] text-white border-transparent" : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"}`}
            >
              <List className="w-4 h-4" /> 手動入力
            </button>
          </div>

          {/* AI Panel */}
          {mode === "ai" && (
            <AIAnalysisPanel onApply={handleAIApply} />
          )}

          {/* Quote Editor */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold text-gray-700 text-sm mb-3">
              見積明細 ({items.length}件)
            </h2>
            <QuoteEditor
              items={items}
              onChange={setItems}
              categories={categories}
              products={products}
            />
          </div>
        </div>

        {/* Right: summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 sticky top-6">
            <h3 className="font-semibold text-gray-700 text-sm mb-4">見積合計</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>小計</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>値引き</span>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">-</span>
                  <input
                    type="number"
                    className="w-24 text-right text-sm border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    value={discountAmount}
                    min={0}
                    onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-800 text-base">
                <span>合計（税抜）</span>
                <span className="text-lg">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>消費税（10%）</span>
                <span>{formatCurrency(total * 0.1)}</span>
              </div>
              <div className="border-t border-gray-100 pt-1 flex justify-between text-sm font-bold text-blue-700">
                <span>税込合計</span>
                <span>{formatCurrency(total * 1.1)}</span>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-[#1e3a5f] hover:bg-[#2d5a9e] disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? "保存中..." : "見積を保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
