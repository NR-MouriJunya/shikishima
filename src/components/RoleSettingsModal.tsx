import React, { useState, useEffect } from 'react';
import {
  X,
  Volume2,
  UserCheck,
  Play,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Globe,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Role } from '../types/script';

interface SpeakerStyle {
  id: number;
  name: string;
}

interface Speaker {
  name: string;
  speaker_uuid: string;
  styles: SpeakerStyle[];
}

interface RoleSettingsModalProps {
  roles: Role[];
  availableVoices: SpeechSynthesisVoice[];
  isVoicevoxConnected: boolean;
  customEndpoint: string;
  onRefreshVoicevox: () => void;
  onUpdateCustomEndpoint: (endpoint: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onUpdateRole: (updatedRole: Role) => void;
  onSetUserRole: (roleId: string) => void;
}

export const RoleSettingsModal: React.FC<RoleSettingsModalProps> = ({
  roles,
  availableVoices,
  isVoicevoxConnected,
  customEndpoint,
  onRefreshVoicevox,
  onUpdateCustomEndpoint,
  isOpen,
  onClose,
  onUpdateRole,
  onSetUserRole,
}) => {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [isPlayingTest, setIsPlayingTest] = useState<string | null>(null);
  const [isEndpointSettingsOpen, setIsEndpointSettingsOpen] = useState(false);
  const [endpointInput, setEndpointInput] = useState(customEndpoint);

  useEffect(() => {
    setEndpointInput(customEndpoint);
  }, [customEndpoint]);

  // スピーカーリストの取得
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/speakers')
      .then((res) => res.json())
      .then((data) => {
        if (data.speakers) {
          setSpeakers(data.speakers);
        }
      })
      .catch((err) => {
        console.warn('スピーカー一覧の取得に失敗:', err);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  // テスト発話
  const handleTestVoice = async (role: Role) => {
    const isVoicevox = role.voiceEngine !== 'browser' && role.voicevoxSpeakerId !== undefined;
    setIsPlayingTest(role.id);

    const sampleText =
      role.id === 'direction'
        ? 'これはト書きの読み上げサンプルです。'
        : `${role.name}のセリフです。よろしくお願いします！`;

    if (isVoicevox && isVoicevoxConnected) {
      try {
        const pitchScale = ((role.pitch ?? 1.0) - 1.0) * 0.2;
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: sampleText,
            speaker: role.voicevoxSpeakerId,
            pitchScale,
            speedScale: role.rate,
          }),
        });

        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.onended = () => {
            setIsPlayingTest(null);
            URL.revokeObjectURL(url);
          };
          audio.onerror = () => setIsPlayingTest(null);
          await audio.play();
          return;
        }
      } catch (e) {
        console.warn('VOICEVOX試聴エラー:', e);
      }
    }

    // ブラウザTTSでの試聴
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(sampleText);
      utterance.pitch = role.pitch;
      utterance.rate = role.rate;

      if (role.voiceURI) {
        const selected = availableVoices.find((v) => v.voiceURI === role.voiceURI);
        if (selected) utterance.voice = selected;
      } else {
        const jaVoice = availableVoices.find((v) => v.lang.includes('ja'));
        if (jaVoice) utterance.voice = jaVoice;
      }

      utterance.onend = () => setIsPlayingTest(null);
      utterance.onerror = () => setIsPlayingTest(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingTest(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-gray-300 rounded-lg w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-2">
            <Volume2 className="w-5 h-5 text-[#004de5]" />
            <h3 className="font-bold text-gray-900 text-base sm:text-lg">
              役・ボイス設定
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* VOICEVOX接続ステータスバー */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            {isVoicevoxConnected ? (
              <span className="flex items-center space-x-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-300 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>VOICEVOX 接続中（超自然AI音声が有効）</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-300 font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>VOICEVOX 未起動（ブラウザ標準音声で代替再生中）</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onRefreshVoicevox}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-medium transition-colors shadow-2xs"
              title="VOICEVOXの接続を再確認"
            >
              <RefreshCw className="w-3 h-3" />
              <span>接続再確認</span>
            </button>
          </div>
        </div>

        {/* スマホPWA・クラウド接続先URL設定アコーディオン（DADSディスクロージャー風） */}
        <div className="border-b border-gray-200 bg-gray-50/60 px-6 py-2.5">
          <button
            onClick={() => setIsEndpointSettingsOpen(!isEndpointSettingsOpen)}
            className="w-full flex items-center justify-between text-xs text-[#004de5] hover:underline transition-colors py-1 font-semibold"
          >
            <div className="flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span>外部音声サーバー接続設定（スマホから完全無料で利用）</span>
            </div>
            {isEndpointSettingsOpen ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {isEndpointSettingsOpen && (
            <div className="mt-3 p-4 rounded-lg bg-white border border-gray-200 space-y-3 shadow-2xs">
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  VOICEVOX サーバー URL
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="url"
                    value={endpointInput}
                    onChange={(e) => setEndpointInput(e.target.value)}
                    placeholder="例: http://192.168.1.5:50021 または https://my-space.hf.space"
                    className="flex-1 min-w-[200px] bg-white border border-gray-300 rounded px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#004de5] font-mono"
                  />
                  <button
                    onClick={() => onUpdateCustomEndpoint(endpointInput.trim())}
                    className="px-3 py-1.5 rounded bg-[#004de5] hover:bg-[#0037a6] text-white text-xs font-bold transition-colors shadow-2xs"
                  >
                    保存して接続テスト
                  </button>
                  {customEndpoint && (
                    <button
                      onClick={() => {
                        setEndpointInput('');
                        onUpdateCustomEndpoint('');
                      }}
                      className="px-2.5 py-1.5 rounded bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-xs font-medium transition-colors"
                    >
                      標準に戻す
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  ※空欄の場合は標準のローカルPC（http://127.0.0.1:50021）を使用します。
                </p>
              </div>

              {/* ヒント情報 */}
              <div className="p-3 rounded bg-blue-50/70 border border-blue-200 text-xs text-gray-800 leading-relaxed space-y-1">
                <span className="font-bold text-[#004de5]">💡 ご案内:</span>
                <p>
                  自宅Wi-Fi内であれば、PCのローカルIP（例: <code className="bg-white px-1 py-0.5 rounded border border-blue-200 font-mono text-gray-800">http://192.168.x.x:50021</code>）を指定するとスマホからもPCのVOICEVOX音声を直接利用できます。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 役設定リスト */}
        <div className="p-4 sm:p-6 space-y-3.5 overflow-y-auto flex-1">
          {roles.map((role) => {
            const isVoicevoxEngine = role.voiceEngine !== 'browser';

            return (
              <div
                key={role.id}
                className="p-4 rounded-lg border border-gray-200 bg-white hover:border-gray-300 transition-colors space-y-3 shadow-2xs"
              >
                {/* 役名と自役切り替え */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <input
                      type="color"
                      value={role.color}
                      onChange={(e) => onUpdateRole({ ...role, color: e.target.value })}
                      className="w-7 h-7 rounded border border-gray-300 cursor-pointer bg-white"
                      title="役のカラーを変更"
                    />
                    <span className="font-bold text-gray-900 text-base">
                      {role.name}
                    </span>
                    {role.id === 'direction' && (
                      <span className="text-[11px] text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded font-medium">
                        演出・ナレーション
                      </span>
                    )}
                  </div>

                  {/* 自分が担当する役ボタン */}
                  {role.id !== 'direction' && (
                    <button
                      onClick={() => onSetUserRole(role.id)}
                      className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-bold transition-colors border ${
                        role.isUserRole
                          ? 'bg-[#004de5] border-[#004de5] text-white shadow-2xs'
                          : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{role.isUserRole ? 'あなたの担当役' : 'この役を担当する'}</span>
                    </button>
                  )}
                </div>

                {/* 音声エンジン選択タブ */}
                <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                  <span className="text-xs font-semibold text-gray-600">音声種類:</span>
                  <button
                    onClick={() => onUpdateRole({ ...role, voiceEngine: 'voicevox' })}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors border ${
                      isVoicevoxEngine
                        ? 'bg-emerald-700 border-emerald-700 text-white'
                        : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>VOICEVOX (自然なAI音声)</span>
                  </button>
                  <button
                    onClick={() => onUpdateRole({ ...role, voiceEngine: 'browser' })}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors border ${
                      !isVoicevoxEngine
                        ? 'bg-[#004de5] border-[#004de5] text-white'
                        : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'
                    }`}
                  >
                    ブラウザ標準音声
                  </button>
                </div>

                {/* 音声詳細設定 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* スピーカー/ボイス選択 */}
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {isVoicevoxEngine ? 'VOICEVOXキャラクター' : 'ブラウザ音声'}
                    </label>

                    {isVoicevoxEngine ? (
                      <select
                        value={role.voicevoxSpeakerId ?? 2}
                        onChange={(e) =>
                          onUpdateRole({
                            ...role,
                            voicevoxSpeakerId: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#004de5]"
                      >
                        {speakers.flatMap((s) =>
                          s.styles.map((style) => (
                            <option key={style.id} value={style.id}>
                              {s.name} ({style.name})
                            </option>
                          ))
                        )}
                      </select>
                    ) : (
                      <select
                        value={role.voiceURI || ''}
                        onChange={(e) => onUpdateRole({ ...role, voiceURI: e.target.value })}
                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#004de5]"
                      >
                        <option value="">標準（端末デフォルト）</option>
                        {availableVoices.map((v) => (
                          <option key={v.voiceURI} value={v.voiceURI}>
                            {v.name} ({v.lang})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* ピッチ */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span className="font-medium">ピッチ (声の高さ)</span>
                      <span className="font-mono font-bold text-gray-800">
                        {role.pitch.toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.6"
                      max="1.5"
                      step="0.05"
                      value={role.pitch}
                      onChange={(e) =>
                        onUpdateRole({ ...role, pitch: parseFloat(e.target.value) })
                      }
                      className="w-full accent-[#004de5] cursor-pointer h-1.5 bg-gray-200 rounded-lg"
                    />
                  </div>

                  {/* 速度 */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span className="font-medium">速度 (テンポ)</span>
                      <span className="font-mono font-bold text-gray-800">
                        {role.rate.toFixed(1)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.7"
                      max="1.5"
                      step="0.05"
                      value={role.rate}
                      onChange={(e) =>
                        onUpdateRole({ ...role, rate: parseFloat(e.target.value) })
                      }
                      className="w-full accent-[#004de5] cursor-pointer h-1.5 bg-gray-200 rounded-lg"
                    />
                  </div>
                </div>

                {/* 試聴ボタン */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-gray-500">
                    {isVoicevoxEngine && !isVoicevoxConnected
                      ? '※VOICEVOX未起動時はブラウザ標準音声で試聴します'
                      : ''}
                  </span>
                  <button
                    onClick={() => handleTestVoice(role)}
                    disabled={isPlayingTest === role.id}
                    className="flex items-center space-x-1.5 px-3 py-1 rounded bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold transition-colors border border-gray-300 disabled:opacity-50 shadow-2xs"
                  >
                    <Play
                      className={`w-3.5 h-3.5 text-emerald-600 fill-emerald-600 ${
                        isPlayingTest === role.id ? 'animate-spin' : ''
                      }`}
                    />
                    <span>{isPlayingTest === role.id ? '試聴中...' : '声を試聴する'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-gray-200 bg-white">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#004de5] hover:bg-[#0037a6] text-white rounded text-sm font-bold transition-colors shadow-2xs"
          >
            完了
          </button>
        </div>
      </div>
    </div>
  );
};
