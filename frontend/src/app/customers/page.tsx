"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Check, Phone, Mail, MapPin } from "lucide-react";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from "@/lib/api";
import type { Customer } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const emptyCustomer = (): Partial<Customer> => ({
  name: "", contact_person: "", phone: "", email: "", address: "", notes: "",
});

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<Partial<Customer>>(emptyCustomer());
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getCustomers().then(setCustomers).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyCustomer());
    setShowForm(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm(c);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateCustomer(editing.id, form);
      } else {
        await createCustomer(form);
      }
      setShowForm(false);
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("この顧客を削除しますか？")) return;
    await deleteCustomer(id);
    load();
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">顧客管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">全 {customers.length} 件</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#1e3a5f] hover:bg-[#2d5a9e] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> 顧客を追加
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">読み込み中...</div>
        ) : customers.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            顧客が登録されていません
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">顧客名</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">担当者</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">連絡先</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">住所</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">登録日</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.contact_person || "---"}</td>
                  <td className="px-4 py-3 space-y-0.5">
                    {c.phone && <div className="flex items-center gap-1 text-xs text-gray-600"><Phone className="w-3 h-3" />{c.phone}</div>}
                    {c.email && <div className="flex items-center gap-1 text-xs text-gray-600"><Mail className="w-3 h-3" />{c.email}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate">
                    {c.address ? <span className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{c.address}</span> : "---"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatDate(c.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500">
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

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-800">{editing ? "顧客を編集" : "顧客を追加"}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {[
                { key: "name", label: "顧客名 *", placeholder: "山田 太郎 / 株式会社〇〇" },
                { key: "contact_person", label: "担当者名", placeholder: "山田 花子" },
                { key: "phone", label: "電話番号", placeholder: "090-0000-0000" },
                { key: "email", label: "メールアドレス", placeholder: "yamada@example.com" },
                { key: "address", label: "住所", placeholder: "東京都渋谷区〇〇1-1-1" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-gray-500">{label}</label>
                  <input
                    className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder={placeholder}
                    value={(form as any)[key] || ""}
                    onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-gray-500">備考</label>
                <textarea
                  className="mt-1 block w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  rows={2}
                  value={form.notes || ""}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name?.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d5a9e] disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
