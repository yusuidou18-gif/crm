"use client";

import { useEffect, useState } from "react";
import {
  Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronUp,
  Package, Tag
} from "lucide-react";
import {
  getProducts, createProduct, updateProduct, deleteProduct,
  getCategories,
} from "@/lib/api";
import type { Product, Category, ProductOption } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const emptyProduct = (): Partial<Product> & { options: Partial<ProductOption>[] } => ({
  name: "", manufacturer: "", model_number: "",
  sale_price: 0, purchase_price: 0, construction_cost: 0,
  description: "", category_id: 0, options: [],
});

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyProduct());
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const load = () => {
    setLoading(true);
    Promise.all([
      getProducts(categoryFilter || undefined),
      getCategories(),
    ]).then(([p, c]) => {
      setProducts(p);
      setCategories(c);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [categoryFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyProduct(), category_id: categories[0]?.id || 0 });
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      ...p,
      options: p.options.map(o => ({ ...o })),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name?.trim() || !form.category_id) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        options: form.options.filter(o => o.name?.trim()),
      };
      if (editing) {
        await updateProduct(editing.id, payload as any);
      } else {
        await createProduct(payload as any);
      }
      setShowForm(false);
      load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("この商品を削除しますか？")) return;
    await deleteProduct(id);
    load();
  };

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const addOption = () => {
    setForm(prev => ({
      ...prev,
      options: [...prev.options, { name: "", sale_price: 0, purchase_price: 0, construction_cost: 0 }],
    }));
  };

  const updateOption = (i: number, patch: Partial<ProductOption>) => {
    setForm(prev => {
      const opts = [...prev.options];
      opts[i] = { ...opts[i], ...patch };
      return { ...prev, options: opts };
    });
  };

  const removeOption = (i: number) => {
    setForm(prev => ({ ...prev, options: prev.options.filter((_, j) => j !== i) }));
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">商品マスタ</h1>
          <p className="text-sm text-gray-500 mt-0.5">全 {products.length} 件</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-[#1e3a5f] hover:bg-[#2d5a9e] text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> 商品を追加
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setCategoryFilter(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${!categoryFilter ? "bg-[#1e3a5f] text-white border-[#1e3a5f]" : "bg-white text-gray-600 border-gray-200"}`}>
          すべて
        </button>
        {categories.map(c => (
          <button key={c.id} onClick={() => setCategoryFilter(c.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${categoryFilter === c.id ? "bg-[#1e3a5f] text-white border-[#1e3a5f]" : "bg-white text-gray-600 border-gray-200"}`}>
            {c.name}
          </button>
        ))}
      </div>

      {/* Product list */}
      <div className="space-y-2">
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">読み込み中...</div>
        ) : products.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm border border-dashed border-gray-300 rounded-xl">
            商品が登録されていません
          </div>
        ) : (
          products.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 text-[#1e3a5f]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800 text-sm">{p.name}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                      {p.category?.name || "---"}
                    </span>
                    {p.options.length > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                        オプション {p.options.length}種
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {p.manufacturer} {p.model_number}
                  </div>
                </div>
                <div className="text-right shrink-0 mr-2">
                  <div className="text-sm font-semibold text-gray-800">{formatCurrency(p.sale_price)}</div>
                  <div className="text-xs text-gray-400">施工費 +{formatCurrency(p.construction_cost)}</div>
                </div>
                <div className="flex items-center gap-1">
                  {p.options.length > 0 && (
                    <button onClick={() => toggleExpand(p.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                      {expanded.has(p.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                  <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {expanded.has(p.id) && p.options.length > 0 && (
                <div className="border-t border-gray-100 px-4 py-2 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> オプション</p>
                  <div className="space-y-1">
                    {p.options.map(opt => (
                      <div key={opt.id} className="flex justify-between items-center text-xs text-gray-700 bg-white rounded border border-gray-200 px-2 py-1">
                        <span>{opt.name}</span>
                        <span className="font-medium">{formatCurrency(opt.sale_price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-800">{editing ? "商品を編集" : "商品を追加"}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Category */}
              <div>
                <label className="text-xs font-medium text-gray-500">カテゴリ *</label>
                <select className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.category_id || ""}
                  onChange={e => setForm(prev => ({ ...prev, category_id: parseInt(e.target.value) }))}>
                  <option value="">選択...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {/* Name */}
              <div>
                <label className="text-xs font-medium text-gray-500">商品名 *</label>
                <input className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.name || ""} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">メーカー</label>
                  <input className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={form.manufacturer || ""} onChange={e => setForm(prev => ({ ...prev, manufacturer: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">型番</label>
                  <input className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={form.model_number || ""} onChange={e => setForm(prev => ({ ...prev, model_number: e.target.value }))} />
                </div>
              </div>
              {/* Prices */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "sale_price", label: "販売単価" },
                  { key: "purchase_price", label: "仕入単価" },
                  { key: "construction_cost", label: "標準施工費" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-gray-500">{label}</label>
                    <input type="number" className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      value={(form as any)[key] || 0}
                      onChange={e => setForm(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))} />
                  </div>
                ))}
              </div>
              {/* Options */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-500 flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> オプション</label>
                  <button onClick={addOption} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5">
                    <Plus className="w-3.5 h-3.5" /> 追加
                  </button>
                </div>
                <div className="space-y-1.5">
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <input className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder="オプション名" value={opt.name || ""}
                        onChange={e => updateOption(i, { name: e.target.value })} />
                      <input type="number" className="w-20 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder="販売単価" value={opt.sale_price || 0}
                        onChange={e => updateOption(i, { sale_price: parseFloat(e.target.value) || 0 })} />
                      <input type="number" className="w-20 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder="仕入単価" value={opt.purchase_price || 0}
                        onChange={e => updateOption(i, { purchase_price: parseFloat(e.target.value) || 0 })} />
                      <button onClick={() => removeOption(i)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                  {form.options.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2">オプションなし</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">キャンセル</button>
              <button onClick={handleSave} disabled={saving || !form.name?.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d5a9e] disabled:opacity-50">
                <Check className="w-4 h-4" /> {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
