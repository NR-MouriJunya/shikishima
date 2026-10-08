import React from 'react';
import { BookOpen, Users, Edit3, RotateCcw, Camera, Menu, ChevronRight } from 'lucide-react';
import type { Script } from '../types/script';

interface HeaderProps {
  script: Script;
  isVoicevoxConnected: boolean;
  onOpenSidebar: () => void;
  onOpenRoleModal: () => void;
  onOpenEditorModal: () => void;
  onOpenOcrModal: () => void;
  onResetScript: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  script,
  isVoicevoxConnected,
  onOpenSidebar,
  onOpenRoleModal,
  onOpenEditorModal,
  onOpenOcrModal,
  onResetScript,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-3 py-2.5 sm:px-6 sm:py-3 shadow-xs">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* ロゴとタイトル */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          {/* 台本一覧サイドバー開閉ボタン（DADSハンバーガーメニュー風） */}
          <button
            onClick={onOpenSidebar}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-700 hover:text-gray-950 border border-gray-300 transition-colors shadow-2xs"
            title="保存した台本一覧を開く"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="w-8 h-8 rounded bg-[#004de5] flex items-center justify-center text-white shrink-0 hidden xs:flex">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base sm:text-lg tracking-tight text-gray-900">
                しきしま
              </span>
              <span className="hidden md:inline-block text-[11px] text-gray-500 font-normal border-l border-gray-300 pl-2">
                台本練習支援システム
              </span>
              {/* 音声ステータスバッジ（DADSチップラベル風） */}
              <button
                onClick={onOpenRoleModal}
                className={`text-[11px] px-2 py-0.5 rounded border transition-colors flex items-center space-x-1.5 font-medium ${
                  isVoicevoxConnected
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                }`}
                title={
                  isVoicevoxConnected
                    ? 'VOICEVOX接続中（超自然AI音声が有効です）'
                    : '標準TTS（PCでVOICEVOXを起動するとAI音声に切り替わります）'
                }
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isVoicevoxConnected ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'
                  }`}
                />
                <span>{isVoicevoxConnected ? 'VOICEVOX' : '標準TTS'}</span>
              </button>
            </div>
            {/* クリックで台本一覧が開くタイトルリンク */}
            <button
              onClick={onOpenSidebar}
              className="flex items-center space-x-1 text-left mt-0.5 group"
              title="クリックして別の台本を選択"
            >
              <span className="text-xs font-semibold text-gray-700 group-hover:text-[#004de5] truncate max-w-[130px] sm:max-w-xs transition-colors underline decoration-gray-300 group-hover:decoration-[#004de5]">
                {script.title}
              </span>
              <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-[#004de5] transition-colors" />
            </button>
          </div>
        </div>

        {/* アクションボタン群（DADSボタンスタイル） */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {/* 台本写真OCRボタン（プライマリー） */}
          <button
            onClick={onOpenOcrModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#004de5] hover:bg-[#0037a6] text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs"
            title="カメラ撮影または画像から台本を文字起こし"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">写真から読取</span>
          </button>

          {/* 役設定ボタン（アウトライン） */}
          <button
            onClick={onOpenRoleModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-white hover:bg-gray-50 text-gray-800 text-xs sm:text-sm font-semibold transition-colors border border-gray-300 shadow-2xs"
            title="役のボイスや色を設定"
          >
            <Users className="w-4 h-4 text-gray-600" />
            <span className="hidden sm:inline">役・ボイス</span>
          </button>

          {/* 台本編集ボタン（アウトライン） */}
          <button
            onClick={onOpenEditorModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-white hover:bg-gray-50 text-gray-800 text-xs sm:text-sm font-semibold transition-colors border border-gray-300 shadow-2xs"
            title="セリフや読み方の編集"
          >
            <Edit3 className="w-4 h-4 text-gray-600" />
            <span className="hidden sm:inline">台本編集</span>
          </button>

          {/* リセットボタン（アウトライン・アイコン） */}
          <button
            onClick={onResetScript}
            className="p-1.5 rounded bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors border border-gray-300 shadow-2xs"
            title="初期台本にリセット"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
