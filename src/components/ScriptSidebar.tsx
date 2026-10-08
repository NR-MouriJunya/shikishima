import React from 'react';
import {
  X,
  BookOpen,
  Camera,
  Plus,
  Trash2,
  Copy,
  Clock,
  Check,
  FolderOpen,
} from 'lucide-react';
import type { Script } from '../types/script';

interface ScriptSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  scripts: Script[];
  currentScriptId: string;
  onSelectScript: (scriptId: string) => void;
  onDeleteScript: (scriptId: string) => void;
  onDuplicateScript: (scriptId: string) => void;
  onOpenOcrModal: () => void;
  onAddNewScript: () => void;
}

export const ScriptSidebar: React.FC<ScriptSidebarProps> = ({
  isOpen,
  onClose,
  scripts,
  currentScriptId,
  onSelectScript,
  onDeleteScript,
  onDuplicateScript,
  onOpenOcrModal,
  onAddNewScript,
}) => {
  if (!isOpen) return null;

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '初期台本';
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
      {/* 背景オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* DADS ドロワー本体 */}
      <div className="fixed inset-y-0 left-0 max-w-full flex">
        <div className="w-screen max-w-sm sm:max-w-md bg-white border-r border-gray-200 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
          {/* ドロワーヘッダー */}
          <div className="px-5 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded bg-[#004de5] flex items-center justify-center text-white shrink-0">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  台本ライブラリ
                </h3>
                <p className="text-[11px] text-gray-500">
                  保存済みの台本一覧・切り替え
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              title="閉じる"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* クイックアクションエリア */}
          <div className="p-3.5 bg-gray-50 border-b border-gray-200 grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenOcrModal();
              }}
              className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded bg-[#004de5] hover:bg-[#0037a6] text-white text-xs font-bold transition-colors shadow-2xs"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>写真から取込</span>
            </button>
            <button
              onClick={() => {
                onAddNewScript();
              }}
              className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 text-xs font-semibold transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#004de5]" />
              <span>新規台本作成</span>
            </button>
          </div>

          {/* 台本一覧スクロールエリア */}
          <div className="p-3.5 space-y-2.5 overflow-y-auto flex-1">
            {scripts.map((item) => {
              const isSelected = item.id === currentScriptId;
              const roleCount = item.roles.filter((r) => r.id !== 'direction').length;
              const lineCount = item.lines.length;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectScript(item.id);
                    onClose();
                  }}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer select-none space-y-2 relative group ${
                    isSelected
                      ? 'bg-blue-50/80 border-[#004de5] ring-1 ring-[#004de5]/40 shadow-xs'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50 shadow-2xs'
                  }`}
                  style={{
                    borderLeftWidth: '4px',
                    borderLeftColor: isSelected ? '#004de5' : '#cbd5e1',
                  }}
                >
                  {/* タイトルと選択バッジ */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                      <BookOpen
                        className={`w-4 h-4 shrink-0 ${
                          isSelected ? 'text-[#004de5]' : 'text-gray-400'
                        }`}
                      />
                      <h4
                        className={`text-sm truncate font-bold ${
                          isSelected ? 'text-[#002573]' : 'text-gray-900'
                        }`}
                      >
                        {item.title}
                      </h4>
                    </div>

                    {isSelected && (
                      <span className="shrink-0 text-[10px] bg-[#004de5] text-white px-2 py-0.5 rounded font-bold flex items-center space-x-1">
                        <Check className="w-3 h-3" />
                        <span>練習中</span>
                      </span>
                    )}
                  </div>

                  {/* 説明 */}
                  {item.description && (
                    <p className="text-xs text-gray-500 line-clamp-1 leading-normal">
                      {item.description}
                    </p>
                  )}

                  {/* メタ情報とアクションボタン群 */}
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs text-gray-500">
                    <div className="flex items-center space-x-2">
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded font-medium text-[11px] text-gray-600">
                        {lineCount} 行
                      </span>
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded font-medium text-[11px] text-gray-600">
                        {roleCount} 役
                      </span>
                      <span className="flex items-center space-x-1 text-[10px] text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(item.updatedAt)}</span>
                      </span>
                    </div>

                    {/* 複製・削除ボタン */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateScript(item.id);
                        }}
                        className="p-1 rounded text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                        title="この台本を複製"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {scripts.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`「${item.title}」を削除してもよろしいですか？`)) {
                              onDeleteScript(item.id);
                            }
                          }}
                          className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="この台本を削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ドロワーフッター */}
          <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
            <span>保存件数: {scripts.length} 件</span>
            <span className="text-[11px]">端末に安全に自動保存中</span>
          </div>
        </div>
      </div>
    </div>
  );
};
