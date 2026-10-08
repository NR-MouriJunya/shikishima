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
  ExternalLink,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-2">
            <Volume2 className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-slate-100 text-base sm:text-lg">
              役・ボイス設定
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* VOICEVOX接続ステータスバー */}
        <div className="px-6 py-3 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            {isVoicevoxConnected ? (
              <span className="flex items-center space-x-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>VOICEVOX 接続中（超自然AI音声が有効）</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 text-amber-400 font-medium">
                <AlertCircle className="w-4 h-4" />
                <span>VOICEVOX 未起動（ブラウザ標準音声で代替再生中）</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {!isVoicevoxConnected && (
              <span className="text-[11px] text-slate-400 hidden md:inline">
                ※PCでVOICEVOXを起動すると自動接続されます
              </span>
            )}
            <button
              onClick={onRefreshVoicevox}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="VOICEVOXの接続を再確認"
            >
              <RefreshCw className="w-3 h-3" />
              <span>接続再確認</span>
            </button>
          </div>
        </div>

        {/* スマホPWA・クラウド接続先URL設定アコーディオン */}
        <div className="border-b border-slate-800 bg-slate-900/60 px-6 py-2.5">
          <button
            onClick={() => setIsEndpointSettingsOpen(!isEndpointSettingsOpen)}
            className="w-full flex items-center justify-between text-xs text-indigo-300 hover:text-indigo-200 transition-colors py-1"
          >
            <div className="flex items-center space-x-1.5 font-medium">
              <Globe className="w-3.5 h-3.5" />
              <span>スマホPWA・外部サーバー接続設定（完全無料でスマホから使う）</span>
            </div>
            {isEndpointSettingsOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {isEndpointSettingsOpen && (
            <div className="mt-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 animate-fadeIn">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  VOICEVOX サーバー URL
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="url"
                    value={endpointInput}
                    onChange={(e) => setEndpointInput(e.target.value)}
                    placeholder="例: https://my-voicevox.hf.space または http://192.168.1.5:50021"
                    className="flex-1 min-w-[200px] bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    onClick={() => onUpdateCustomEndpoint(endpointInput.trim())}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                  >
                    保存して接続テスト
                  </button>
                  {customEndpoint && (
                    <button
                      onClick={() => {
                        setEndpointInput('');
                        onUpdateCustomEndpoint('');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs transition-colors"
                    >
                      標準に戻す
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  ※空欄の場合は標準のローカルPC（http://127.0.0.1:50021）を使用します。
                </p>
              </div>

              {/* 無料クラウドサーバーの作り方ヒント */}
              <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-900/40 text-[11px] text-indigo-200/90 leading-relaxed">
                <span className="font-bold text-amber-300">💡 スマホ単体で完全無料で動かす方法:</span>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-300">
                  <li>
                    <strong>Hugging Face Spaces（無料枠）</strong>に公式のVOICEVOX Dockerイメージを置くだけで、自分専用の完全無料クラウド音声サーバー（常時アクセス可能）が手に入ります！
                  </li>
                  <li>
                    自宅のWi-Fi内であれば、PCのローカルIP（例: <code className="text-pink-300">http://192.168.x.x:50021</code>）を指定するだけでもスマホから即座に繋がります。
                  </li>
                  <li className="pt-1">
                    <a
                      href="https://voicevox.hiroshiba.jp/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1 text-pink-400 hover:text-pink-300 underline"
                    >
                      <span>VOICEVOX 公式サイトでキャラクター詳細を見る</span>
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* 役設定リスト */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {roles.map((role) => {
            const isVoicevoxEngine = role.voiceEngine !== 'browser';

            return (
              <div
                key={role.id}
                className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-slate-700 transition-colors space-y-3"
              >
                {/* 役名と自役切り替え */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={role.color}
                      onChange={(e) => onUpdateRole({ ...role, color: e.target.value })}
                      className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                      title="役のカラーを変更"
                    />
                    <span className="font-bold text-slate-100 text-base">
                      {role.name}
                    </span>
                    {role.id === 'direction' && (
                      <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        演出・ナレーション
                      </span>
                    )}
                  </div>

                  {/* 自分が担当する役ボタン */}
                  {role.id !== 'direction' && (
                    <button
                      onClick={() => onSetUserRole(role.id)}
                      className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        role.isUserRole
                          ? 'bg-pink-500 text-white shadow-md shadow-pink-500/25 ring-2 ring-pink-400'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{role.isUserRole ? '担当役（キミ）' : 'この役を担当する'}</span>
                    </button>
                  )}
                </div>

                {/* 音声エンジン選択タブ */}
                <div className="flex items-center space-x-2 pt-1 border-t border-slate-800/80">
                  <span className="text-xs text-slate-400">音声の種類:</span>
                  <button
                    onClick={() => onUpdateRole({ ...role, voiceEngine: 'voicevox' })}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      isVoicevoxEngine
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>VOICEVOX (自然なAI音声)</span>
                  </button>
                  <button
                    onClick={() => onUpdateRole({ ...role, voiceEngine: 'browser' })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      !isVoicevoxEngine
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ブラウザ標準音声
                  </button>
                </div>

                {/* 音声詳細設定 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* スピーカー/ボイス選択 */}
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] text-slate-400 mb-1">
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
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>ピッチ (声の高さ)</span>
                      <span className="font-mono text-indigo-400">
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
                      className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                    />
                  </div>

                  {/* 速度 */}
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>速度 (テンポ)</span>
                      <span className="font-mono text-pink-400">
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
                      className="w-full accent-pink-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                    />
                  </div>
                </div>

                {/* 試聴ボタン */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    {isVoicevoxEngine && !isVoicevoxConnected
                      ? '※VOICEVOX未起動時はブラウザ音声で試聴します'
                      : ''}
                  </span>
                  <button
                    onClick={() => handleTestVoice(role)}
                    disabled={isPlayingTest === role.id}
                    className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors border border-slate-700 disabled:opacity-50"
                  >
                    <Play
                      className={`w-3.5 h-3.5 text-emerald-400 fill-emerald-400 ${
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
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-800 bg-slate-900/90">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            完了
          </button>
        </div>
      </div>
    </div>
  );
};
