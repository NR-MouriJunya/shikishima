import React, { useEffect, useRef } from 'react';
import { Lightbulb, Mic, Sparkles } from 'lucide-react';
import type { Script, ScriptLine, Role } from '../types/script';

interface ScriptViewerProps {
  script: Script;
  currentLineIndex: number;
  isPlaying: boolean;
  isUserTurn: boolean;
  onLineClick: (index: number) => void;
  onOpenTips: (line: ScriptLine) => void;
}

export const ScriptViewer: React.FC<ScriptViewerProps> = ({
  script,
  currentLineIndex,
  isPlaying,
  isUserTurn,
  onLineClick,
  onOpenTips,
}) => {
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const longPressTimerRef = useRef<number | null>(null);
  const isLongPressTriggered = useRef<boolean>(false);

  // 現在再生中の行に自動スムーズスクロール
  useEffect(() => {
    if (currentLineIndex >= 0 && lineRefs.current[currentLineIndex]) {
      lineRefs.current[currentLineIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentLineIndex]);

  // 長押し検知の開始
  const handleTouchStart = (line: ScriptLine) => {
    isLongPressTriggered.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      isLongPressTriggered.current = true;
      onOpenTips(line);
    }, 600); // 600ms以上の長押しでTips表示
  };

  // 長押し検知のキャンセル/終了
  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleLineClickInternal = (index: number) => {
    // 長押しが発火した直後のクリックは無視
    if (isLongPressTriggered.current) {
      isLongPressTriggered.current = false;
      return;
    }
    onLineClick(index);
  };

  const getRole = (roleId: string): Role | undefined => {
    return script.roles.find((r) => r.id === roleId);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 md:px-8 pb-36 max-w-3xl mx-auto w-full space-y-5">
      {/* 台本紹介カード */}
      <div className="text-center py-4 mb-4 border-b border-slate-800/80">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight mb-2">
          {script.title}
        </h2>
        {script.description && (
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            {script.description}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {script.roles.map((r) => (
            <span
              key={r.id}
              className="text-xs px-2.5 py-1 rounded-full font-medium flex items-center space-x-1"
              style={{
                color: r.color,
                backgroundColor: r.bgColor || 'rgba(255,255,255,0.05)',
                border: `1px solid ${r.color}33`,
              }}
            >
              <span>{r.name}</span>
              {r.isUserRole && (
                <span className="text-[10px] bg-pink-500/20 text-pink-300 px-1 rounded ml-1">
                  担当
                </span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* セリフ・ト書き行一覧 */}
      {script.lines.map((line, index) => {
        const role = getRole(line.roleId);
        const isActive = currentLineIndex === index;
        const isCurrentLineUserTurn = isActive && isUserTurn;

        return (
          <div
            key={line.id}
            ref={(el) => {
              lineRefs.current[index] = el;
            }}
            onClick={() => handleLineClickInternal(index)}
            onTouchStart={() => handleTouchStart(line)}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            onMouseDown={() => handleTouchStart(line)}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
            className={`group relative rounded-2xl p-4 sm:p-5 transition-all duration-300 cursor-pointer select-none ${
              isActive
                ? 'bg-slate-800/90 shadow-xl shadow-indigo-950/40 ring-2 ring-indigo-500/60 scale-[1.01]'
                : isPlaying
                ? 'opacity-40 hover:opacity-85 hover:bg-slate-800/40'
                : 'opacity-90 hover:opacity-100 hover:bg-slate-800/40'
            }`}
            style={{
              borderLeft: isActive
                ? `6px solid ${role?.color || '#6366f1'}`
                : '6px solid transparent',
            }}
          >
            {/* 行ヘッダー情報 */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span
                  className="text-xs font-bold px-2.5 py-0.5 rounded-full tracking-wide transition-colors"
                  style={{
                    color: role?.color || '#94a3b8',
                    backgroundColor: role?.bgColor || 'rgba(148, 163, 184, 0.15)',
                  }}
                >
                  {role?.name || 'ト書き'}
                </span>

                {/* 自分のセリフ番インジケータ */}
                {isCurrentLineUserTurn && (
                  <span className="inline-flex items-center space-x-1 text-xs px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold border border-pink-500/50 animate-pulse">
                    <Mic className="w-3.5 h-3.5 text-pink-400" />
                    <span>キミの番だよ！発声してね</span>
                  </span>
                )}
              </div>

              {/* Tipsボタン（長押しでも開けるが、分かりやすくアイコンも常備） */}
              <div className="flex items-center space-x-1.5">
                {line.tips?.emotion && (
                  <span className="hidden sm:inline-flex text-[11px] text-pink-300/80 bg-pink-950/40 px-2 py-0.5 rounded-md border border-pink-900/40">
                    {line.tips.emotion}
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTips(line);
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${
                    line.tips?.actingNote || line.tips?.emotion
                      ? 'text-amber-400 hover:bg-amber-400/10'
                      : 'text-slate-600 hover:text-slate-300 hover:bg-slate-700/50'
                  }`}
                  title="演技Tipsを確認・編集（長押しでも開けます）"
                >
                  <Lightbulb className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 本文テキスト（大きめフォント・Spotify歌詞風） */}
            <p
              className={`leading-relaxed tracking-normal font-sans transition-all duration-300 ${
                line.isDirection
                  ? 'text-sm sm:text-base italic text-slate-400 font-serif'
                  : 'text-base sm:text-lg md:text-xl font-medium text-slate-100'
              } ${isActive ? 'font-semibold text-white' : ''}`}
            >
              {line.text}
            </p>

            {/* ルビ・読み仮名 */}
            {line.phoneticText && isActive && (
              <p className="text-xs text-indigo-300/80 mt-1.5 font-mono">
                読み: {line.phoneticText}
              </p>
            )}

            {/* アクティブ時の波形・再生インジケータ */}
            {isActive && isPlaying && !isCurrentLineUserTurn && (
              <div className="mt-3 flex items-center space-x-1 text-xs text-indigo-400">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>読み上げ中...</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
