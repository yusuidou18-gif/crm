"use client";

import { useState, useRef } from "react";
import { Sparkles, Upload, Loader2, X, AlertCircle } from "lucide-react";
import { analyzeQuoteForm } from "@/lib/api";
import type { QuoteItem } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface Props {
  onApply: (items: QuoteItem[]) => void;
}

const EXAMPLE_PROMPTS = [
  "キッチンのリフォーム。LIXILのシエラ、食洗機付きで壁紙も張り替えたい。",
  "浴室をLIXILのアライズに交換。浴室暖房乾燥機もつけてほしい。",
  "トイレを最新のウォシュレット付きに交換。手洗いカウンターも追加で。",
  "洗面台の交換とトイレのリフォーム。予算は50万円以内で。",
];

export default function AIAnalysisPanel({ onApply }: Props) {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuoteItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const analyze = async () => {
    if (!text && !imageFile) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await analyzeQuoteForm(text, imageFile || undefined);
      setResult(data.items);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "AI解析に失敗しました。OpenAI APIキーを確認してください。");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    onApply(result);
    setResult(null);
    setText("");
    setImageFile(null);
  };

  const getItemSubtotal = (item: QuoteItem) => {
    const optsTotal = item.selected_options.reduce(
      (sum, o) => sum + o.unit_price * o.quantity, 0
    );
    return (item.unit_price + item.construction_cost + optsTotal) * item.quantity;
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800 text-sm">AI自動見積生成</h3>
          <p className="text-xs text-gray-500">自然言語や画像からリフォーム項目を自動抽出します</p>
        </div>
      </div>

      {/* Text input */}
      <div>
        <textarea
          className="w-full border border-blue-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          rows={3}
          placeholder="例：キッチンのリフォーム。LIXILのシエラ、食洗機付きで壁紙も張り替えたい。"
          value={text}
          onChange={e => setText(e.target.value)}
        />
        {/* Example prompts */}
        <div className="mt-1.5 flex flex-wrap gap-1">
          {EXAMPLE_PROMPTS.map((p, i) => (
            <button
              key={i}
              onClick={() => setText(p)}
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate max-w-[240px]"
            >
              📝 {p.slice(0, 30)}...
            </button>
          ))}
        </div>
      </div>

      {/* Image upload */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg px-3 py-1.5 hover:border-blue-400 hover:text-blue-600 bg-white transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          画像・PDFをアップロード
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={e => setImageFile(e.target.files?.[0] || null)}
        />
        {imageFile && (
          <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-100 rounded-lg px-2 py-1">
            {imageFile.name}
            <button onClick={() => setImageFile(null)}>
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Analyze button */}
      <button
        onClick={analyze}
        disabled={loading || (!text && !imageFile)}
        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> 解析中...</>
        ) : (
          <><Sparkles className="w-4 h-4" /> AI解析を実行</>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Result preview */}
      {result && (
        <div className="border border-blue-300 rounded-lg bg-white overflow-hidden">
          <div className="bg-blue-600 text-white px-3 py-2 text-xs font-semibold">
            AI抽出結果（{result.length}件） - 確認後に「明細に追加」してください
          </div>
          <div className="divide-y divide-gray-100">
            {result.map((item, i) => (
              <div key={i} className="px-3 py-2 flex justify-between items-start text-sm">
                <div>
                  <p className="font-medium text-gray-800">{item.name}</p>
                  {(item.manufacturer || item.model_number) && (
                    <p className="text-xs text-gray-500">{item.manufacturer} {item.model_number}</p>
                  )}
                  {item.selected_options.length > 0 && (
                    <p className="text-xs text-blue-600 mt-0.5">
                      オプション: {item.selected_options.map(o => o.name).join(", ")}
                    </p>
                  )}
                  {item.note && <p className="text-xs text-gray-400 mt-0.5">{item.note}</p>}
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="font-semibold text-gray-800">{formatCurrency(getItemSubtotal(item))}</p>
                  <p className="text-xs text-gray-400">{item.quantity}{item.unit}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t px-3 py-2.5 flex justify-between items-center bg-gray-50">
            <span className="text-xs text-gray-500">
              合計: <strong>{formatCurrency(result.reduce((sum, item) => sum + getItemSubtotal(item), 0))}</strong>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setResult(null)}
                className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-300 rounded-lg"
              >
                キャンセル
              </button>
              <button
                onClick={handleApply}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
              >
                明細に追加 ({result.length}件)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
