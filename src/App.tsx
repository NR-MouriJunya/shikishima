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
import { ScriptSidebar } from './components/ScriptSidebar';

const STORAGE_KEY_SCRIPTS = 'shikishima_scripts_library_v1';
const STORAGE_KEY_CURRENT_ID = 'shikishima_current_script_id_v1';
const OLD_STORAGE_KEY = 'shikishima_script_v1';

// 初期台本リストと現在選択中IDの復元
const loadInitialState = (): { scripts: Script[]; currentId: string } => {
  if (typeof window === 'undefined') {
    return { scripts: [defaultMockScript], currentId: defaultMockScript.id };
  }
  try {
    const savedLibrary = localStorage.getItem(STORAGE_KEY_SCRIPTS);
    let loadedScripts: Script[] = [];

    if (savedLibrary) {
      loadedScripts = JSON.parse(savedLibrary);
    } else {
      // 旧ストレージデータからの移行（既存ユーザーの作業データ保持）
      const oldSaved = localStorage.getItem(OLD_STORAGE_KEY);
      if (oldSaved) {
        try {
          const oldScript = JSON.parse(oldSaved);
          loadedScripts = [oldScript];
        } catch {
          loadedScripts = [defaultMockScript];
        }
      } else {
        loadedScripts = [defaultMockScript];
      }
    }

    if (loadedScripts.length === 0) {
      loadedScripts = [defaultMockScript];
    }

    const savedCurrentId = localStorage.getItem(STORAGE_KEY_CURRENT_ID);
    const currentId = loadedScripts.some((s) => s.id === savedCurrentId)
      ? (savedCurrentId as string)
      : loadedScripts[0]?.id || defaultMockScript.id;

    return { scripts: loadedScripts, currentId };
  } catch (e) {
    console.error('保存された台本データの読み込みに失敗しました:', e);
    return { scripts: [defaultMockScript], currentId: defaultMockScript.id };
  }
};

export function App() {
  const [initialData] = useState(loadInitialState);
  const [scripts, setScripts] = useState<Script[]>(initialData.scripts);
  const [currentScriptId, setCurrentScriptId] = useState<string>(initialData.currentId);

  // 現在選択されている台本
  const script = scripts.find((s) => s.id === currentScriptId) || scripts[0] || defaultMockScript;

  // モーダル・サイドバー管理
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

  // 台本リストまたは選択台本変更時にLocalStorageに自動保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SCRIPTS, JSON.stringify(scripts));
    localStorage.setItem(STORAGE_KEY_CURRENT_ID, currentScriptId);
  }, [scripts, currentScriptId]);

  // 現在の台本を更新するヘルパー関数
  const updateCurrentScript = (updater: (prev: Script) => Script) => {
    setScripts((prev) =>
      prev.map((s) => {
        if (s.id === script.id) {
          const updated = updater(s);
          return { ...updated, updatedAt: Date.now() };
        }
        return s;
      })
    );
  };

  // 別の台本を選択・切り替え
  const handleSelectScript = (scriptId: string) => {
    if (scriptId === currentScriptId) return;
    stop();
    setCurrentScriptId(scriptId);
  };

  // 台本の削除
  const handleDeleteScript = (scriptId: string) => {
    if (scripts.length <= 1) {
      alert('これ以上台本を削除することはできません。');
      return;
    }
    stop();
    const remaining = scripts.filter((s) => s.id !== scriptId);
    setScripts(remaining);
    if (currentScriptId === scriptId) {
      setCurrentScriptId(remaining[0].id);
    }
  };

  // 台本の複製
  const handleDuplicateScript = (scriptId: string) => {
    const target = scripts.find((s) => s.id === scriptId);
    if (!target) return;
    stop();
    const duplicated: Script = {
      ...target,
      id: `script-${Date.now()}`,
      title: `${target.title} (コピー)`,
      updatedAt: Date.now(),
      lines: target.lines.map((l) => ({
        ...l,
        id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      })),
    };
    setScripts((prev) => [duplicated, ...prev]);
    setCurrentScriptId(duplicated.id);
  };

  // 新規台本作成
  const handleAddNewScript = () => {
    stop();
    const newScript: Script = {
      id: `script-${Date.now()}`,
      title: `新しい台本 ${scripts.length + 1}`,
      description: '自分でセリフを追加して練習できる台本です。',
      updatedAt: Date.now(),
      roles: [
        {
          id: 'direction',
          name: 'ト書き',
          color: '#94a3b8',
          bgColor: '#f1f5f9',
          pitch: 0.9,
          rate: 1.0,
          isUserRole: false,
        },
        {
          id: 'role-1',
          name: '自分',
          color: '#004de5',
          bgColor: '#eff6ff',
          pitch: 1.0,
          rate: 1.0,
          isUserRole: true,
        },
        {
          id: 'role-2',
          name: '相手役',
          color: '#059669',
          bgColor: '#ecfdf5',
          pitch: 1.0,
          rate: 1.0,
          isUserRole: false,
        },
      ],
      lines: [
        {
          id: `line-${Date.now()}-1`,
          roleId: 'direction',
          text: '○ 静かな稽古場。机の上に台本が置かれている。',
          isDirection: true,
          pauseAfterMs: 700,
        },
        {
          id: `line-${Date.now()}-2`,
          roleId: 'role-1',
          text: '準備はいいかい？さあ、セリフ合わせを始めよう。',
          isDirection: false,
          pauseAfterMs: 600,
        },
        {
          id: `line-${Date.now()}-3`,
          roleId: 'role-2',
          text: 'ええ、いつでもどうぞ。あなたの番を待っているわ。',
          isDirection: false,
          pauseAfterMs: 600,
        },
      ],
    };
    setScripts((prev) => [newScript, ...prev]);
    setCurrentScriptId(newScript.id);
    setIsSidebarOpen(false);
    setIsEditorModalOpen(true);
  };

  // 役の更新ハンドラ
  const handleUpdateRole = (updatedRole: Role) => {
    updateCurrentScript((prev) => ({
      ...prev,
      roles: prev.roles.map((r) => (r.id === updatedRole.id ? updatedRole : r)),
    }));
  };

  // 自分の担当役の切り替えハンドラ
  const handleSetUserRole = (roleId: string) => {
    updateCurrentScript((prev) => ({
      ...prev,
      roles: prev.roles.map((r) => ({
        ...r,
        isUserRole: r.id === roleId,
      })),
    }));
  };

  // セリフ行の一括更新ハンドラ
  const handleUpdateLines = (newLines: ScriptLine[]) => {
    updateCurrentScript((prev) => ({
      ...prev,
      lines: newLines,
    }));
  };

  // Tipsの保存ハンドラ
  const handleSaveTips = (lineId: string, tips: ScriptLine['tips']) => {
    updateCurrentScript((prev) => ({
      ...prev,
      lines: prev.lines.map((l) => (l.id === lineId ? { ...l, tips } : l)),
    }));
  };

  // 初期台本へのリセット／追加
  const handleResetScript = () => {
    if (window.confirm('初期サンプル台本「雨上がりのプラットフォーム」に切り替えますか？')) {
      stop();
      if (!scripts.some((s) => s.id === defaultMockScript.id)) {
        setScripts((prev) => [defaultMockScript, ...prev]);
      }
      setCurrentScriptId(defaultMockScript.id);
    }
  };

  // 写真OCRからの台本取り込みハンドラ（ライブラリに追加して即選択）
  const handleImportScript = (newScript: Script) => {
    stop();
    const scriptWithTimestamp: Script = {
      ...newScript,
      updatedAt: Date.now(),
    };
    const firstCharRole = scriptWithTimestamp.roles.find((r) => r.id !== 'direction');
    if (firstCharRole) {
      scriptWithTimestamp.roles = scriptWithTimestamp.roles.map((r) => ({
        ...r,
        isUserRole: r.id === firstCharRole.id,
      }));
    }
    setScripts((prev) => [scriptWithTimestamp, ...prev]);
    setCurrentScriptId(scriptWithTimestamp.id);
  };

  // 選択された行に対応する役を取得
  const tipsLineRole = selectedTipsLine
    ? script.roles.find((r) => r.id === selectedTipsLine.roleId)
    : undefined;

  return (
    <div className="min-h-screen bg-[#f7f9fa] text-[#1b1c1d] flex flex-col selection:bg-blue-100 selection:text-blue-900">
      {/* 上部ヘッダー */}
      <Header
        script={script}
        isVoicevoxConnected={isVoicevoxConnected}
        onOpenSidebar={() => setIsSidebarOpen(true)}
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

      {/* 台本一覧・切り替えサイドバー（DADSドロワー） */}
      <ScriptSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        scripts={scripts}
        currentScriptId={currentScriptId}
        onSelectScript={handleSelectScript}
        onDeleteScript={handleDeleteScript}
        onDuplicateScript={handleDuplicateScript}
        onOpenOcrModal={() => setIsOcrModalOpen(true)}
        onAddNewScript={handleAddNewScript}
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
