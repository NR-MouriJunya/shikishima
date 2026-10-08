import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Check, ArrowDown, ArrowUp } from 'lucide-react';
import type { Script, ScriptLine, Role } from '../types/script';

interface LineEditorModalProps {
  script: Script;
  isOpen: boolean;
  onClose: () => void;
  onUpdateLines: (newLines: ScriptLine[]) => void;
}

export const LineEditorModal: React.FC<LineEditorModalProps> = ({
  script,
  isOpen,
  onClose,
  onUpdateLines,
}) => {
  if (!isOpen) return null;

  const [lines, setLines] = useState<ScriptLine[]>([...script.lines]);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);

  // 編集内容の保存
  const handleUpdateLine = (id: string, updates: Partial<ScriptLine>) => {
    setLines(prev => prev.map(line => line.id === id ? { ...line, ...updates } : line));
  };

  // 新規行追加
  const handleAddLine = () => {
    const newLine: ScriptLine = {
      id: `line-${Date.now()}`,
      roleId: script.roles[1]?.id || 'yuki',
      text: '新しいセリフを入力してください',
      isDirection: false,
      pauseAfterMs: 600,
    };
    setLines(prev => [...prev, newLine]);
    setEditingLineId(newLine.id);
  };

  // 行削除
  const handleDeleteLine = (id: string) => {
    setLines(prev => prev.filter(line => line.id !== id));
  };

  // 行の移動（上へ）
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setLines(prev => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  // 行の移動（下へ）
  const handleMoveDown = (index: number) => {
    if (index === lines.length - 1) return;
    setLines(prev => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  // 全体保存
  const handleSaveAll = () => {
    onUpdateLines(lines);
    onClose();
  };

  const getRole = (roleId: string): Role | undefined => {
    return script.roles.find(r => r.id === roleId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-gray-300 rounded-lg w-full max-w-3xl shadow-xl flex flex-col max-h-[92vh]">
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <div>
            <h3 className="font-bold text-gray-900 text-base sm:text-lg">
              台本テキストの編集・修正
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              OCRの文字誤認識や、漢字の読み間違い（ひらがな読み）を微調整できます。
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* リストエリア */}
        <div className="p-4 sm:p-6 space-y-3 overflow-y-auto flex-1">
          {lines.map((line, index) => {
            const role = getRole(line.roleId);
            const isEditing = editingLineId === line.id;

            return (
              <div
                key={line.id}
                className={`p-3.5 rounded-lg border transition-all ${
                  isEditing
                    ? 'border-[#004de5] bg-blue-50/40 ring-1 ring-[#004de5]/50'
                    : 'border-gray-200 bg-white hover:border-gray-300 shadow-2xs'
                }`}
              >
                {isEditing ? (
                  /* 編集モード */
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {/* 役の選択 */}
                      <div className="flex items-center space-x-2">
                        <label className="text-xs font-semibold text-gray-700">役名:</label>
                        <select
                          value={line.roleId}
                          onChange={(e) => {
                            const newRoleId = e.target.value;
                            handleUpdateLine(line.id, {
                              roleId: newRoleId,
                              isDirection: newRoleId === 'direction',
                            });
                          }}
                          className="bg-white border border-gray-300 rounded px-2.5 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#004de5]"
                        >
                          {script.roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingLineId(null)}
                          className="flex items-center space-x-1 px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-2xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>完了</span>
                        </button>
                      </div>
                    </div>

                    {/* セリフ本文 */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        画面表示テキスト
                      </label>
                      <textarea
                        value={line.text}
                        onChange={(e) => handleUpdateLine(line.id, { text: e.target.value })}
                        rows={2}
                        className="w-full bg-white border border-gray-300 rounded p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#004de5] resize-none"
                      />
                    </div>

                    {/* ひらがな読み（読み上げ用） */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        読み上げ用テキスト（漢字の誤読がある場合のみひらがな等で入力）
                      </label>
                      <input
                        type="text"
                        value={line.phoneticText || ''}
                        onChange={(e) => handleUpdateLine(line.id, { phoneticText: e.target.value })}
                        placeholder="例: れんくん、ほんとうにいくの？"
                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#004de5]"
                      />
                    </div>
                  </div>
                ) : (
                  /* 閲覧モード */
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span
                          className="text-xs px-2 py-0.5 rounded font-semibold border"
                          style={{
                            color: role?.color || '#475569',
                            backgroundColor: role?.bgColor || '#f8fafc',
                            borderColor: `${role?.color || '#94a3b8'}40`,
                          }}
                        >
                          {role?.name || 'ト書き'}
                        </span>
                        <span className="text-[11px] font-mono text-gray-500">#{index + 1}</span>
                      </div>
                      <p className="text-sm text-gray-900 font-sans break-words font-medium">
                        {line.text}
                      </p>
                      {line.phoneticText && (
                        <p className="text-xs text-[#004de5] mt-1 font-medium">
                          読み: {line.phoneticText}
                        </p>
                      )}
                    </div>

                    {/* アクションボタン */}
                    <div className="flex items-center space-x-1 shrink-0 pt-0.5">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="p-1 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30"
                        title="上へ移動"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === lines.length - 1}
                        className="p-1 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30"
                        title="下へ移動"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingLineId(line.id)}
                        className="p-1 rounded text-[#004de5] hover:bg-blue-50"
                        title="編集"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteLine(line.id)}
                        className="p-1 rounded text-red-600 hover:bg-red-50"
                        title="削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-200 bg-white">
          <button
            onClick={handleAddLine}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded bg-white hover:bg-gray-50 text-gray-800 text-xs sm:text-sm font-semibold border border-gray-300 transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4 text-[#004de5]" />
            <span>行を追加</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium"
            >
              キャンセル
            </button>
            <button
              onClick={handleSaveAll}
              className="px-5 py-2 bg-[#004de5] hover:bg-[#0037a6] text-white rounded text-sm font-bold transition-colors shadow-2xs"
            >
              変更を保存する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
