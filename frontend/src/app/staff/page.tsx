"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { getStaff, createStaff, updateStaff, deleteStaff } from "@/lib/api";
import type { Staff } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const emptyStaff = (): Partial<Staff> => ({
  name: "", email: "", phone: "", department: "",
});

export default function StaffPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState<Partial<Staff>>(emptyStaff());
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getStaff().then(setStaffList).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyStaff()); setShowForm(true); };
  const openEdit = (s: Staff) => { setEditing(s); setForm(s); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      if (editing) await updateStaff(editing.id, form);
      else await createStaff(form);
      setShowForm(false);
      load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("この担当者を削除しますか？")) return;
    await deleteStaff(id);
    load();
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">担当者管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">全 {staffList.length} 名</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#1e3a5f] hover:bg-[#2d5a9e] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> 担当者を追加
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">読み込み中...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">氏名</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">部署</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">メール</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">電話</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">登録日</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map(s => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.department || "---"}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{s.email || "---"}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{s.phone || "---"}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatDate(s.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {staffList.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">担当者が登録されていません</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-800">{editing ? "担当者を編集" : "担当者を追加"}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {[
                { key: "name", label: "氏名 *", placeholder: "田中 一郎" },
                { key: "department", label: "部署", placeholder: "営業部" },
                { key: "email", label: "メール", placeholder: "tanaka@example.com" },
                { key: "phone", label: "電話", placeholder: "090-0000-0000" },
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
