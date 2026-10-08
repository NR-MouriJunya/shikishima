import React from 'react';
import { BookOpen, Users, Edit3, RotateCcw } from 'lucide-react';
import type { Script } from '../types/script';

interface HeaderProps {
  script: Script;
  isVoicevoxConnected: boolean;
  onOpenRoleModal: () => void;
  onOpenEditorModal: () => void;
  onResetScript: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  script,
  isVoicevoxConnected,
  onOpenRoleModal,
  onOpenEditorModal,
  onResetScript,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 sm:px-6">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* ロゴとタイトル */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-indigo-300">
                しきしま
              </span>
              {/* VOICEVOXステータスバッジ */}
              <button
                onClick={onOpenRoleModal}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-all flex items-center space-x-1 ${
                  isVoicevoxConnected
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/80'
                    : 'bg-amber-950/80 text-amber-300 border-amber-700/60 hover:bg-amber-900/80'
                }`}
                title={
                  isVoicevoxConnected
                    ? 'VOICEVOX接続中（超自然AI音声が有効です）'
                    : 'VOICEVOX未起動（PCで起動すると自動接続されます）'
                }
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isVoicevoxConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span>{isVoicevoxConnected ? 'AI音声: VOICEVOX' : '標準TTS'}</span>
              </button>
            </div>
            <h1 className="text-sm font-medium text-slate-300 truncate max-w-[180px] sm:max-w-xs">
              {script.title}
            </h1>
          </div>
        </div>

        {/* アクションボタン群 */}
        <div className="flex items-center space-x-2">
          {/* 役設定ボタン */}
          <button
            onClick={onOpenRoleModal}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium transition-colors border border-slate-700"
            title="役のボイスや色を設定"
          >
            <Users className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">役・ボイス設定</span>
          </button>

          {/* 台本編集ボタン */}
          <button
            onClick={onOpenEditorModal}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium transition-colors border border-slate-700"
            title="セリフや読み方の編集"
          >
            <Edit3 className="w-4 h-4 text-pink-400" />
            <span className="hidden sm:inline">台本編集</span>
          </button>

          {/* リセットボタン */}
          <button
            onClick={onResetScript}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors border border-slate-700"
            title="初期台本にリセット"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
