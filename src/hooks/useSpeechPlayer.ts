import { useState, useEffect, useRef, useCallback } from 'react';
import type { Script, ScriptLine, Role } from '../types/script';

interface UseSpeechPlayerProps {
  script: Script;
  /** 一人読み合わせ練習モード（自分の役をミュートにするか） */
  soloPracticeMode: boolean;
  /** 全体音量 (0.0 〜 1.0) */
  globalVolume: number;
  /** 全体再生速度倍率 (0.5 〜 2.0) */
  globalRate: number;
}

export function useSpeechPlayer({
  script,
  soloPracticeMode,
  globalVolume,
  globalRate,
}: UseSpeechPlayerProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(-1);
  const [isUserTurn, setIsUserTurn] = useState<boolean>(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isVoicevoxConnected, setIsVoicevoxConnected] = useState<boolean>(false);
  const [customEndpoint, setCustomEndpoint] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('shikishima_voicevox_endpoint') || '';
    }
    return '';
  });

  const customEndpointRef = useRef(customEndpoint);
  customEndpointRef.current = customEndpoint;

  // 最新の値をコールバック内で参照するためのref
  const scriptRef = useRef(script);
  scriptRef.current = script;
  const soloModeRef = useRef(soloPracticeMode);
  soloModeRef.current = soloPracticeMode;
  const volumeRef = useRef(globalVolume);
  volumeRef.current = globalVolume;
  const rateRef = useRef(globalRate);
  rateRef.current = globalRate;
  const currentLineIndexRef = useRef(currentLineIndex);
  currentLineIndexRef.current = currentLineIndex;

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // VOICEVOXのステータス確認
  const checkVoicevoxStatus = useCallback(async (endpointToTest?: string) => {
    const endpoint = endpointToTest !== undefined ? endpointToTest : customEndpointRef.current;
    try {
      const headers: Record<string, string> = {};
      if (endpoint) {
        headers['x-voicevox-endpoint'] = endpoint;
      }
      const res = await fetch('/api/status', { headers });
      if (res.ok) {
        const data = await res.json();
        setIsVoicevoxConnected(!!data.connected);
        return !!data.connected;
      } else {
        setIsVoicevoxConnected(false);
        return false;
      }
    } catch (_e) {
      setIsVoicevoxConnected(false);
      return false;
    }
  }, []);

  useEffect(() => {
    checkVoicevoxStatus();
    // 10秒ごとにVOICEVOXの稼働状態をポーリング確認
    const interval = setInterval(checkVoicevoxStatus, 10000);
    return () => clearInterval(interval);
  }, [checkVoicevoxStatus]);

  // 利用可能なブラウザ音声リストのロード
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const jaVoices = voices.filter(v => v.lang.includes('ja') || v.lang.includes('JP'));
      setAvailableVoices(jaVoices.length > 0 ? jaVoices : voices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // 再生中オーディオおよびタイマーのクリア
  const stopAllCurrentPlayback = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.onended = null;
      currentAudioRef.current.onerror = null;
      currentAudioRef.current = null;
    }
    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // 音量変更を現在再生中のオーディオに反映
  useEffect(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.volume = globalVolume;
    }
  }, [globalVolume]);

  // ブラウザ標準TTSでの発話（フォールバック用）
  const speakWithBrowserTTS = useCallback((
    text: string,
    role: Role | undefined,
    pauseDuration: number,
    nextIndex: number
  ) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      timerRef.current = setTimeout(() => {
        if (isPlayingRef.current) speakLine(nextIndex);
      }, 2000);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const rolePitch = role?.pitch ?? 1.0;
    const roleRate = role?.rate ?? 1.0;
    utterance.pitch = Math.max(0.5, Math.min(rolePitch, 2.0));
    utterance.rate = Math.max(0.5, Math.min(roleRate * rateRef.current, 2.0));
    utterance.volume = volumeRef.current;

    const voices = window.speechSynthesis.getVoices();
    const jaVoices = voices.filter(v => v.lang.includes('ja') || v.lang.includes('JP'));

    if (role?.voiceURI) {
      const selected = voices.find(v => v.voiceURI === role.voiceURI);
      if (selected) utterance.voice = selected;
    } else if (jaVoices.length > 0) {
      // 役柄に応じたスマート自動音声選択
      const roleId = (role?.id || '').toLowerCase();
      const roleName = (role?.name || '').toLowerCase();
      const isMale = roleId.includes('ren') || roleName.includes('蓮') || roleName.includes('男');
      const isDirection = roleId === 'direction' || roleName.includes('ト書き');

      let matchedVoice: SpeechSynthesisVoice | undefined;
      if (isMale) {
        // 男性役: Otoya(iOS), Keita(Win), Ichiro, Google男性ボイス等を優先
        matchedVoice = jaVoices.find(v => {
          const n = v.name.toLowerCase();
          return n.includes('otoya') || n.includes('keita') || n.includes('ichiro') || n.includes('male') || n.includes('男');
        });
      } else if (!isDirection) {
        // 女性役: Kyoko(iOS), Nanami(Win), Ayumi, Siri, Google女性ボイス等を優先
        matchedVoice = jaVoices.find(v => {
          const n = v.name.toLowerCase();
          return n.includes('kyoko') || n.includes('nanami') || n.includes('siri') || n.includes('ayumi') || n.includes('female') || n.includes('女');
        });
      }

      // 見つからなければ高品質ボイス（NaturalやSiri）または最初の日本語ボイス
      const naturalVoice = jaVoices.find(v => v.name.includes('Natural') || v.name.includes('Siri'));
      utterance.voice = matchedVoice || naturalVoice || jaVoices[0];
    }

    utterance.onend = () => {
      if (!isPlayingRef.current) return;
      timerRef.current = setTimeout(() => {
        if (isPlayingRef.current) speakLine(nextIndex);
      }, pauseDuration);
    };

    utterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      if (isPlayingRef.current) speakLine(nextIndex);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  // 指定した行を再生する関数
  const speakLine = useCallback(async (index: number) => {
    stopAllCurrentPlayback();

    const currentScript = scriptRef.current;
    if (index < 0 || index >= currentScript.lines.length) {
      setIsPlaying(false);
      setIsPaused(false);
      setIsUserTurn(false);
      setCurrentLineIndex(-1);
      return;
    }

    const line: ScriptLine = currentScript.lines[index];
    const role: Role | undefined = currentScript.roles.find(r => r.id === line.roleId);

    setCurrentLineIndex(index);
    setIsPaused(false);

    // 自分の役 かつ 一人練習モード が有効な場合 -> ミュートにして発声を待機
    const isTargetUserRole = role?.isUserRole && soloModeRef.current;
    if (isTargetUserRole) {
      setIsUserTurn(true);
      const textLen = line.text.length;
      const waitMs = Math.min(Math.max(textLen * 150 + 1000, 2000), 8000);

      timerRef.current = setTimeout(() => {
        setIsUserTurn(false);
        if (isPlayingRef.current) {
          speakLine(index + 1);
        }
      }, waitMs);
      return;
    }

    setIsUserTurn(false);

    const textToSpeak = line.phoneticText || line.text;
    const pauseDuration = line.pauseAfterMs ?? 500;

    // VOICEVOX エンジンを使用する場合
    const useVoicevox = role?.voiceEngine !== 'browser' && role?.voicevoxSpeakerId !== undefined;

    if (useVoicevox) {
      try {
        const controller = new AbortController();
        abortControllerRef.current = controller;

        // ピッチは VOICEVOX では 0 が中央 (通常 -0.15 〜 0.15 程度)
        const pitchScale = ((role?.pitch ?? 1.0) - 1.0) * 0.2;
        const speedScale = (role?.rate ?? 1.0) * rateRef.current;

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (customEndpointRef.current) {
          headers['x-voicevox-endpoint'] = customEndpointRef.current;
        }

        const res = await fetch('/api/tts', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            text: textToSpeak,
            speaker: role.voicevoxSpeakerId,
            pitchScale,
            speedScale,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`VOICEVOX synthesis HTTP ${res.status}`);
        }

        const blob = await res.blob();
        if (!isPlayingRef.current) return;

        const blobUrl = URL.createObjectURL(blob);
        currentBlobUrlRef.current = blobUrl;

        const audio = new Audio(blobUrl);
        currentAudioRef.current = audio;
        audio.volume = volumeRef.current;

        audio.onended = () => {
          if (!isPlayingRef.current) return;
          timerRef.current = setTimeout(() => {
            if (isPlayingRef.current) {
              speakLine(index + 1);
            }
          }, pauseDuration);
        };

        audio.onerror = () => {
          console.warn('オーディオ再生エラー、ブラウザTTSにフォールバック');
          speakWithBrowserTTS(textToSpeak, role, pauseDuration, index + 1);
        };

        await audio.play();
        return;
      } catch (e: any) {
        if (e.name === 'AbortError') return;
        console.warn('VOICEVOX接続失敗、ブラウザTTSにフォールバックします:', e);
        // VOICEVOX接続失敗時はブラウザTTSへ自動フォールバック
        speakWithBrowserTTS(textToSpeak, role, pauseDuration, index + 1);
        return;
      }
    }

    // ブラウザ標準TTSを使用
    speakWithBrowserTTS(textToSpeak, role, pauseDuration, index + 1);
  }, [stopAllCurrentPlayback, speakWithBrowserTTS]);

  // 再生開始
  const play = useCallback(() => {
    if (isPaused && currentAudioRef.current) {
      currentAudioRef.current.play();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    if (isPaused && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    setIsPlaying(true);
    setIsPaused(false);
    const targetIndex = currentLineIndexRef.current >= 0 ? currentLineIndexRef.current : 0;
    speakLine(targetIndex);
  }, [isPaused, speakLine]);

  // 一時停止
  const pause = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
    setIsPaused(true);
    setIsPlaying(false);
  }, []);

  // 停止
  const stop = useCallback(() => {
    stopAllCurrentPlayback();
    setIsPlaying(false);
    setIsPaused(false);
    setIsUserTurn(false);
    setCurrentLineIndex(-1);
  }, [stopAllCurrentPlayback]);

  // 行タップでのシーク再生
  const seekToLine = useCallback((index: number) => {
    stopAllCurrentPlayback();
    setIsPlaying(true);
    setIsPaused(false);
    speakLine(index);
  }, [stopAllCurrentPlayback, speakLine]);

  const nextLine = useCallback(() => {
    const nextIdx = currentLineIndexRef.current + 1;
    if (nextIdx < scriptRef.current.lines.length) {
      seekToLine(nextIdx);
    }
  }, [seekToLine]);

  const prevLine = useCallback(() => {
    const prevIdx = Math.max(0, currentLineIndexRef.current - 1);
    seekToLine(prevIdx);
  }, [seekToLine]);

  useEffect(() => {
    return () => {
      stopAllCurrentPlayback();
    };
  }, [stopAllCurrentPlayback]);

  const updateCustomEndpoint = useCallback((newEndpoint: string) => {
    setCustomEndpoint(newEndpoint);
    if (typeof window !== 'undefined') {
      if (newEndpoint) {
        localStorage.setItem('shikishima_voicevox_endpoint', newEndpoint);
      } else {
        localStorage.removeItem('shikishima_voicevox_endpoint');
      }
    }
    checkVoicevoxStatus(newEndpoint);
  }, [checkVoicevoxStatus]);

  return {
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
  };
}
