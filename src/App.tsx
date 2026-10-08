import { useState, useEffect } from 'react';
import type { Script, ScriptLine, Role } from './types/script';
import { defaultMockScript } from './data/mockScript';
import { useSpeechPlayer } from './hooks/useSpeechPlayer';
import { Header } from './components/Header';
import { ScriptViewer } from './components/ScriptViewer';
import { PlayerControls } from './components/PlayerControls';
import { RoleSettingsModal } from './components/RoleSettingsModal';
import { LineEditorModal } from './components/LineEditorModal';
import { TipsModal } from './components/TipsModal';
import { OcrImportModal } from './components/OcrImportModal';

const STORAGE_KEY = 'shikishima_script_v1';

export function App() {
  // 台本データの管理（LocalStorage対応）
  const [script, setScript] = useState<Script>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('保存された台本データの読み込みに失敗しました:', e);
        }
      }
    }
    return defaultMockScript;
  });

  // モーダル管理
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [selectedTipsLine, setSelectedTipsLine] = useState<ScriptLine | null>(null);

  // プレイヤー設定
  const [soloPracticeMode, setSoloPracticeMode] = useState(true);
  const [globalVolume, setGlobalVolume] = useState(1.0);
  const [globalRate, setGlobalRate] = useState(1.0);

  // 音声読み上げフック
  const {
    isPlaying,
    isPaused,
    currentLineIndex,
    isUserTurn,
    availableVoices,
    isVoicevoxConnected,
    customEndpoint,
    updateCustomEndpoint,
    checkVoicevoxStatus,
    play,
    pause,
    stop,
    seekToLine,
    nextLine,
    prevLine,
  } = useSpeechPlayer({
    script,
    soloPracticeMode,
    globalVolume,
    globalRate,
  });

  // 台本変更時にLocalStorageに保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(script));
  }, [script]);

  // 役の更新ハンドラ
  const handleUpdateRole = (updatedRole: Role) => {
    setScript((prev) => ({
      ...prev,
      roles: prev.roles.map((r) => (r.id === updatedRole.id ? updatedRole : r)),
    }));
  };

  // 自分の担当役の切り替えハンドラ
  const handleSetUserRole = (roleId: string) => {
    setScript((prev) => ({
      ...prev,
      roles: prev.roles.map((r) => ({
        ...r,
        isUserRole: r.id === roleId,
      })),
    }));
  };

  // セリフ行の一括更新ハンドラ
  const handleUpdateLines = (newLines: ScriptLine[]) => {
    setScript((prev) => ({
      ...prev,
      lines: newLines,
    }));
  };

  // Tipsの保存ハンドラ
  const handleSaveTips = (lineId: string, tips: ScriptLine['tips']) => {
    setScript((prev) => ({
      ...prev,
      lines: prev.lines.map((l) => (l.id === lineId ? { ...l, tips } : l)),
    }));
  };

  // 初期台本へのリセット
  const handleResetScript = () => {
    if (window.confirm('台本を初期の「雨上がりのプラットフォーム」にリセットしますか？')) {
      stop();
      setScript(defaultMockScript);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // 写真OCRからの台本取り込みハンドラ
  const handleImportScript = (newScript: Script) => {
    stop();
    setScript(newScript);
    // ト書き以外の最初の役があれば自役に自動設定
    const firstCharRole = newScript.roles.find((r) => r.id !== 'direction');
    if (firstCharRole) {
      setScript((prev) => ({
        ...prev,
        roles: prev.roles.map((r) => ({
          ...r,
          isUserRole: r.id === firstCharRole.id,
        })),
      }));
    }
  };

  // 選択された行に対応する役を取得
  const tipsLineRole = selectedTipsLine
    ? script.roles.find((r) => r.id === selectedTipsLine.roleId)
    : undefined;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-pink-500 selection:text-white">
      {/* 上部ヘッダー */}
      <Header
        script={script}
        isVoicevoxConnected={isVoicevoxConnected}
        onOpenRoleModal={() => setIsRoleModalOpen(true)}
        onOpenEditorModal={() => setIsEditorModalOpen(true)}
        onOpenOcrModal={() => setIsOcrModalOpen(true)}
        onResetScript={handleResetScript}
      />

      {/* メイン：Spotify風スクロールビューア */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <ScriptViewer
          script={script}
          currentLineIndex={currentLineIndex}
          isPlaying={isPlaying}
          isUserTurn={isUserTurn}
          onLineClick={seekToLine}
          onOpenTips={(line) => setSelectedTipsLine(line)}
        />
      </main>

      {/* 下部固定プレイヤーコントロールバー */}
      <PlayerControls
        script={script}
        isPlaying={isPlaying}
        isPaused={isPaused}
        currentLineIndex={currentLineIndex}
        soloPracticeMode={soloPracticeMode}
        globalVolume={globalVolume}
        globalRate={globalRate}
        onPlay={play}
        onPause={pause}
        onStop={stop}
        onNext={nextLine}
        onPrev={prevLine}
        onToggleSoloMode={() => setSoloPracticeMode(!soloPracticeMode)}
        onChangeVolume={setGlobalVolume}
        onChangeRate={setGlobalRate}
      />

      {/* 役・ボイス設定モーダル */}
      <RoleSettingsModal
        roles={script.roles}
        availableVoices={availableVoices}
        isVoicevoxConnected={isVoicevoxConnected}
        customEndpoint={customEndpoint}
        onRefreshVoicevox={checkVoicevoxStatus}
        onUpdateCustomEndpoint={updateCustomEndpoint}
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        onUpdateRole={handleUpdateRole}
        onSetUserRole={handleSetUserRole}
      />

      {/* 台本編集モーダル */}
      <LineEditorModal
        script={script}
        isOpen={isEditorModalOpen}
        onClose={() => setIsEditorModalOpen(false)}
        onUpdateLines={handleUpdateLines}
      />

      {/* 演技Tipsモーダル */}
      <TipsModal
        line={selectedTipsLine}
        role={tipsLineRole}
        isOpen={selectedTipsLine !== null}
        onClose={() => setSelectedTipsLine(null)}
        onSaveTips={handleSaveTips}
      />

      {/* 写真OCR台本取り込みモーダル */}
      <OcrImportModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        onImportScript={handleImportScript}
      />
    </div>
  );
}

export default App;
