import React from 'react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  UserCheck,
  Gauge,
} from 'lucide-react';
import type { Script } from '../types/script';

interface PlayerControlsProps {
  script: Script;
  isPlaying: boolean;
  isPaused: boolean;
  currentLineIndex: number;
  soloPracticeMode: boolean;
  globalVolume: number;
  globalRate: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleSoloMode: () => void;
  onChangeVolume: (volume: number) => void;
  onChangeRate: (rate: number) => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  script,
  isPlaying,
  isPaused,
  currentLineIndex,
  soloPracticeMode,
  globalVolume,
  globalRate,
  onPlay,
  onPause,
  onStop,
  onNext,
  onPrev,
  onToggleSoloMode,
  onChangeVolume,
  onChangeRate,
}) => {
  const totalLines = script.lines.length;
  const progressPercent = totalLines > 0 && currentLineIndex >= 0
    ? ((currentLineIndex + 1) / totalLines) * 100
    : 0;

  const userRole = script.roles.find((r) => r.isUserRole);

  const speedOptions = [0.8, 1.0, 1.2, 1.5];

  const handleNextSpeed = () => {
    const currentIndex = speedOptions.indexOf(globalRate);
    const nextIndex = (currentIndex + 1) % speedOptions.length;
    onChangeRate(speedOptions[nextIndex]);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-3 py-2.5 sm:px-6 sm:py-3 shadow-md">
      <div className="max-w-4xl mx-auto flex flex-col space-y-2">
        {/* 進捗プログレスバー */}
        <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-[#004de5] h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* コントロール行 */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* 左側：一人練習トグル ＆ 進行度テキスト */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <button
              onClick={onToggleSoloMode}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded text-xs font-semibold transition-colors border ${
                soloPracticeMode
                  ? 'bg-blue-50 border-[#004de5] text-[#004de5]'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              title="オンにすると自分の役のセリフだけ無音になり、自分で発声練習できます"
            >
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">一人読み合わせ:</span>
              <span>{soloPracticeMode ? '自役ミュート' : '全役再生'}</span>
            </button>

            {soloPracticeMode && userRole && (
              <span
                className="hidden md:inline-flex text-[11px] px-2 py-0.5 rounded font-semibold truncate max-w-[100px] border border-gray-300"
                style={{ color: userRole.color, backgroundColor: userRole.bgColor || '#f8fafc' }}
              >
                担当: {userRole.name}
              </span>
            )}

            <div className="text-xs font-mono font-medium text-gray-500 hidden xs:block">
              {currentLineIndex >= 0 ? currentLineIndex + 1 : 0} / {totalLines}
            </div>
          </div>

          {/* 中央：再生・一時停止・スキップボタン群 */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* 前の行へ */}
            <button
              onClick={onPrev}
              disabled={currentLineIndex <= 0}
              className="p-2 rounded text-gray-700 hover:text-gray-950 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="前の行"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            {/* 再生 / 一時停止 */}
            {isPlaying ? (
              <button
                onClick={onPause}
                className="p-3 rounded-full bg-[#004de5] hover:bg-[#0037a6] text-white shadow-xs transition-colors"
                title="一時停止"
              >
                <Pause className="w-5 h-5 fill-white" />
              </button>
            ) : (
              <button
                onClick={onPlay}
                className="p-3 rounded-full bg-[#004de5] hover:bg-[#0037a6] text-white shadow-xs transition-colors"
                title="再生（タップした行または最初から）"
              >
                <Play className="w-5 h-5 fill-white ml-0.5" />
              </button>
            )}

            {/* 停止 */}
            <button
              onClick={onStop}
              disabled={!isPlaying && !isPaused && currentLineIndex === -1}
              className="p-2 rounded text-gray-600 hover:text-red-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="停止"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>

            {/* 次の行へ */}
            <button
              onClick={onNext}
              disabled={currentLineIndex >= totalLines - 1}
              className="p-2 rounded text-gray-700 hover:text-gray-950 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="次の行"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* 右側：再生速度 ＆ 音量 */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* 再生速度ボタン */}
            <button
              onClick={handleNextSpeed}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-white hover:bg-gray-50 text-xs font-semibold text-gray-800 border border-gray-300 transition-colors shadow-2xs"
              title="再生速度を切り替え"
            >
              <Gauge className="w-3.5 h-3.5 text-[#004de5]" />
              <span>{globalRate.toFixed(1)}x</span>
            </button>

            {/* 音量コントロール */}
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => onChangeVolume(globalVolume === 0 ? 1.0 : 0)}
                className="p-1.5 text-gray-600 hover:text-gray-900 transition-colors"
                title={globalVolume === 0 ? 'ミュート解除' : 'ミュート'}
              >
                {globalVolume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-600" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={globalVolume}
                onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
                className="w-14 sm:w-20 accent-[#004de5] cursor-pointer h-1.5 bg-gray-200 rounded-lg hidden sm:block"
                title="音量調整"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
