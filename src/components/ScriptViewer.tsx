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
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 md:px-8 pb-36 max-w-4xl mx-auto w-full space-y-4">
      {/* 台本紹介カード（DADSカードコンポーネント風） */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-2xs text-center space-y-3">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          {script.title}
        </h2>
        {script.description && (
          <p className="text-xs sm:text-sm text-gray-600 max-w-2xl mx-auto leading-relaxed">
            {script.description}
          </p>
        )}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-semibold text-gray-500 mr-1">登場人物:</span>
          {script.roles.map((r) => (
            <span
              key={r.id}
              className={`text-xs px-2.5 py-1 rounded font-semibold flex items-center space-x-1.5 border ${
                r.isUserRole
                  ? 'bg-blue-50 text-[#004de5] border-[#004de5]'
                  : 'bg-gray-50 text-gray-700 border-gray-300'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: r.color }}
              />
              <span>{r.name}</span>
              {r.isUserRole && (
                <span className="text-[10px] bg-[#004de5] text-white px-1.5 py-0.2 rounded font-bold">
                  あなたの役
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
            className={`group relative rounded-lg p-4 sm:p-5 transition-all duration-200 cursor-pointer select-none border ${
              isActive
                ? 'bg-blue-50/80 border-[#004de5] shadow-xs ring-1 ring-[#004de5]/50'
                : isPlaying
                ? 'bg-white border-gray-200 opacity-60 hover:opacity-90 hover:border-gray-300'
                : 'bg-white border-gray-200 hover:border-gray-300 shadow-2xs'
            }`}
            style={{
              borderLeftWidth: '5px',
              borderLeftColor: isActive
                ? '#004de5'
                : role?.color || '#94a3b8',
            }}
          >
            {/* 行ヘッダー情報 */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded tracking-wide border"
                  style={{
                    color: role?.color || '#475569',
                    backgroundColor: role?.bgColor || '#f1f5f9',
                    borderColor: `${role?.color || '#94a3b8'}40`,
                  }}
                >
                  {role?.name || 'ト書き'}
                </span>

                {/* 自分のセリフ番インジケータ（DADSハイライトカラー） */}
                {isCurrentLineUserTurn && (
                  <span className="inline-flex items-center space-x-1 text-xs px-2.5 py-0.5 rounded bg-amber-100 text-amber-950 font-bold border border-amber-300">
                    <Mic className="w-3.5 h-3.5 text-amber-800" />
                    <span>あなたの番です！発声してください</span>
                  </span>
                )}
              </div>

              {/* Tipsボタン */}
              <div className="flex items-center space-x-1.5">
                {line.tips?.emotion && (
                  <span className="hidden sm:inline-flex text-[11px] text-gray-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-300 font-medium">
                    {line.tips.emotion}
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTips(line);
                  }}
                  className={`p-1 rounded transition-colors ${
                    line.tips?.actingNote || line.tips?.emotion
                      ? 'text-amber-600 hover:bg-amber-50'
                      : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  title="演技Tipsを確認・編集（長押しでも開けます）"
                >
                  <Lightbulb className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 本文テキスト */}
            <p
              className={`leading-relaxed tracking-normal font-sans transition-colors ${
                line.isDirection
                  ? 'text-sm sm:text-base italic text-gray-600 bg-gray-50/80 p-2.5 rounded border border-gray-200'
                  : 'text-base sm:text-lg md:text-xl font-medium text-gray-900'
              } ${isActive ? 'font-bold text-gray-950' : ''}`}
            >
              {line.text}
            </p>

            {/* ルビ・読み仮名 */}
            {line.phoneticText && isActive && (
              <p className="text-xs text-[#004de5] mt-1.5 font-medium">
                読み: {line.phoneticText}
              </p>
            )}

            {/* アクティブ時のステータス */}
            {isActive && isPlaying && !isCurrentLineUserTurn && (
              <div className="mt-2.5 flex items-center space-x-1.5 text-xs text-[#004de5] font-semibold">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>音声再生中</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
