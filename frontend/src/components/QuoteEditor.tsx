"use client";

import { useState, useCallback } from "react";
import {
  Plus, Trash2, ChevronDown, ChevronUp, Sparkles, Package,
  GripVertical, X, Check,
} from "lucide-react";
import type { QuoteItem, SelectedOption, Product, Category } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface Props {
  items: QuoteItem[];
  onChange: (items: QuoteItem[]) => void;
  categories: Category[];
  products: Product[];
}

const UNITS = ["式", "個", "台", "m", "m²", "m³", "枚", "本", "箱", "セット"];

function newItem(sort_order: number): QuoteItem {
  return {
    name: "",
    manufacturer: "",
    model_number: "",
    quantity: 1,
    unit: "式",
    unit_price: 0,
    purchase_price: 0,
    construction_cost: 0,
    selected_options: [],
    note: "",
    sort_order,
    category_id: null,
    product_id: null,
  };
}

export default function QuoteEditor({ items, onChange, categories, products }: Props) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [showProductPicker, setShowProductPicker] = useState<number | null>(null);
  const [pickerCategory, setPickerCategory] = useState<number | null>(null);

  const update = useCallback((idx: number, patch: Partial<QuoteItem>) => {
    const next = items.map((item, i) => i === idx ? { ...item, ...patch } : item);
    onChange(next);
  }, [items, onChange]);

  const addRow = () => {
    onChange([...items, newItem(items.length)]);
  };

  const removeRow = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.delete(idx);
      return next;
    });
  };

  const toggleExpand = (idx: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const applyProduct = (idx: number, product: Product) => {
    update(idx, {
      name: product.name,
      manufacturer: product.manufacturer || "",
      model_number: product.model_number || "",
      unit_price: product.sale_price,
      purchase_price: product.purchase_price,
      construction_cost: product.construction_cost,
      product_id: product.id,
      category_id: product.category_id,
      selected_options: [],
    });
    setShowProductPicker(null);
  };

  const toggleOption = (idx: number, opt: { name: string; sale_price: number; purchase_price: number; construction_cost: number }) => {
    const item = items[idx];
    const exists = item.selected_options.find(o => o.name === opt.name);
    const newOpts = exists
      ? item.selected_options.filter(o => o.name !== opt.name)
      : [...item.selected_options, {
          name: opt.name,
          unit_price: opt.sale_price,
          purchase_price: opt.purchase_price,
          construction_cost: opt.construction_cost,
          quantity: 1,
        }];
    update(idx, { selected_options: newOpts });
  };

  const getItemSubtotal = (item: QuoteItem) => {
    const optsTotal = item.selected_options.reduce(
      (sum, o) => sum + o.unit_price * o.quantity, 0
    );
    return (item.unit_price + item.construction_cost + optsTotal) * item.quantity;
  };

  const filteredProducts = pickerCategory
    ? products.filter(p => p.category_id === pickerCategory)
    : products;

  const pickerItem = showProductPicker !== null ? items[showProductPicker] : null;
  const pickerProduct = pickerItem?.product_id
    ? products.find(p => p.id === pickerItem.product_id)
    : null;

  return (
    <div className="space-y-2">
      {/* Table header */}
      <div className="grid grid-cols-[2fr_1fr_0.7fr_0.6fr_1fr_1fr_1fr_auto] gap-1 text-xs font-semibold text-gray-500 bg-[#1e3a5f] text-white rounded-t-lg px-2 py-2">
        <div>品名・工事名</div>
        <div>メーカー/型番</div>
        <div className="text-right">数量</div>
        <div>単位</div>
        <div className="text-right">販売単価</div>
        <div className="text-right">施工費</div>
        <div className="text-right">小計</div>
        <div className="w-16"></div>
      </div>

      {items.length === 0 && (
        <div className="border border-dashed border-gray-300 rounded py-8 text-center text-gray-400 text-sm">
          明細を追加してください
        </div>
      )}

      {items.map((item, idx) => (
        <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Main row */}
          <div className="grid grid-cols-[2fr_1fr_0.7fr_0.6fr_1fr_1fr_1fr_auto] gap-1 items-center px-2 py-1.5 bg-white hover:bg-gray-50">
            {/* Name */}
            <input
              className="editable-cell w-full text-sm"
              placeholder="品名・工事名"
              value={item.name}
              onChange={e => update(idx, { name: e.target.value })}
            />
            {/* Manufacturer/Model */}
            <div className="space-y-0.5">
              <input
                className="editable-cell w-full text-xs"
                placeholder="メーカー"
                value={item.manufacturer || ""}
                onChange={e => update(idx, { manufacturer: e.target.value })}
              />
              <input
                className="editable-cell w-full text-xs"
                placeholder="型番"
                value={item.model_number || ""}
                onChange={e => update(idx, { model_number: e.target.value })}
              />
            </div>
            {/* Quantity */}
            <input
              type="number"
              className="editable-cell w-full text-sm text-right"
              value={item.quantity}
              min={0}
              step={0.5}
              onChange={e => update(idx, { quantity: parseFloat(e.target.value) || 0 })}
            />
            {/* Unit */}
            <select
              className="editable-cell w-full text-xs bg-transparent"
              value={item.unit}
              onChange={e => update(idx, { unit: e.target.value })}
            >
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            {/* Unit price */}
            <input
              type="number"
              className="editable-cell w-full text-sm text-right"
              value={item.unit_price}
              min={0}
              onChange={e => update(idx, { unit_price: parseFloat(e.target.value) || 0 })}
            />
            {/* Construction cost */}
            <input
              type="number"
              className="editable-cell w-full text-sm text-right"
              value={item.construction_cost}
              min={0}
              onChange={e => update(idx, { construction_cost: parseFloat(e.target.value) || 0 })}
            />
            {/* Subtotal */}
            <div className="text-sm font-semibold text-gray-800 text-right pr-1">
              {formatCurrency(getItemSubtotal(item))}
            </div>
            {/* Actions */}
            <div className="flex items-center gap-0.5 w-16">
              <button
                onClick={() => { setShowProductPicker(idx); setPickerCategory(null); }}
                className="p-1 rounded hover:bg-blue-100 text-blue-600"
                title="商品マスタから選択"
              >
                <Package className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => toggleExpand(idx)}
                className="p-1 rounded hover:bg-gray-100 text-gray-500"
                title="オプション・詳細"
              >
                {expandedRows.has(idx) ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => removeRow(idx)}
                className="p-1 rounded hover:bg-red-100 text-red-500"
                title="削除"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Expanded: Options */}
          {expandedRows.has(idx) && (
            <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 space-y-2">
              {/* Selected options */}
              {item.selected_options.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500">選択オプション</p>
                  {item.selected_options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2 text-xs bg-white rounded border border-gray-200 px-2 py-1">
                      <span className="flex-1 text-gray-700">{opt.name}</span>
                      <input
                        type="number"
                        className="w-16 text-right border-none outline-none bg-transparent"
                        value={opt.quantity}
                        min={1}
                        onChange={e => {
                          const newOpts = [...item.selected_options];
                          newOpts[oi] = { ...opt, quantity: parseFloat(e.target.value) || 1 };
                          update(idx, { selected_options: newOpts });
                        }}
                      />
                      <span className="text-gray-400">×</span>
                      <span className="text-gray-700 w-20 text-right">{formatCurrency(opt.unit_price)}</span>
                      <button
                        onClick={() => {
                          update(idx, { selected_options: item.selected_options.filter((_, i) => i !== oi) });
                        }}
                        className="text-red-400 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Product options picker */}
              {pickerProduct && pickerProduct.options.length > 0 && showProductPicker !== idx && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">利用可能なオプション</p>
                  <div className="flex flex-wrap gap-1">
                    {pickerProduct.options.map(opt => {
                      const selected = item.selected_options.find(o => o.name === opt.name);
                      return (
                        <button
                          key={opt.id}
                          onClick={() => toggleOption(idx, opt)}
                          className={`text-xs px-2 py-1 rounded border transition-colors ${selected ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"}`}
                        >
                          {selected && <Check className="w-3 h-3 inline mr-0.5" />}
                          {opt.name} (+{formatCurrency(opt.sale_price)})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Note */}
              <div>
                <label className="text-xs text-gray-500">備考</label>
                <input
                  className="editable-cell w-full text-xs mt-0.5"
                  placeholder="備考・仕様メモ"
                  value={item.note || ""}
                  onChange={e => update(idx, { note: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add row */}
      <button
        onClick={addRow}
        className="w-full border border-dashed border-gray-300 rounded-lg py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1"
      >
        <Plus className="w-4 h-4" /> 明細を追加
      </button>

      {/* Product Picker Modal */}
      {showProductPicker !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-800">商品マスタから選択</h3>
              <button onClick={() => setShowProductPicker(null)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            {/* Category filter */}
            <div className="px-5 py-3 border-b flex gap-2 flex-wrap">
              <button
                onClick={() => setPickerCategory(null)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${!pickerCategory ? "bg-[#1e3a5f] text-white border-[#1e3a5f]" : "text-gray-600 border-gray-300"}`}
              >
                すべて
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setPickerCategory(c.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${pickerCategory === c.id ? "bg-[#1e3a5f] text-white border-[#1e3a5f]" : "text-gray-600 border-gray-300"}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1">
              {filteredProducts.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">商品がありません</p>
              ) : (
                filteredProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => applyProduct(showProductPicker, p)}
                    className="w-full text-left px-3 py-2.5 rounded-lg border border-transparent hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.manufacturer} {p.model_number}</p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-sm font-semibold">{formatCurrency(p.sale_price)}</p>
                        <p className="text-xs text-gray-400">施工費 +{formatCurrency(p.construction_cost)}</p>
                      </div>
                    </div>
                    {p.options.length > 0 && (
                      <p className="text-xs text-blue-500 mt-1">オプション {p.options.length} 種</p>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
