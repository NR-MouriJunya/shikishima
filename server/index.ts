import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const VOICEVOX_URL = process.env.VOICEVOX_URL || 'http://127.0.0.1:50021';

app.use(cors());
app.use(express.json());

// 音声データの簡易メモリキャッシュ (キー: speaker:text)
const audioCache = new Map<string, Buffer>();

// VOICEVOXが未起動の場合のフォールバック用スピーカー一覧
const fallbackSpeakers = [
  {
    name: '四国めたん',
    speaker_uuid: '7ffcb7ce-00ec-4bdc-82cd-45a8889e43ff',
    styles: [
      { name: 'ノーマル', id: 2 },
      { name: 'あまあま', id: 0 },
      { name: 'ツンツン', id: 6 },
      { name: 'セクシー', id: 4 },
    ],
  },
  {
    name: 'ずんだもん',
    speaker_uuid: '388f946a-52d5-403a-99d2-71f5d381e6b3',
    styles: [
      { name: 'ノーマル', id: 3 },
      { name: 'あまあま', id: 1 },
      { name: 'ツンツン', id: 7 },
      { name: 'セクシー', id: 5 },
    ],
  },
  {
    name: '春日部つむぎ',
    speaker_uuid: '3538c511-32aa-44c1-b7fe-5a12c5096d77',
    styles: [{ name: 'ノーマル', id: 8 }],
  },
  {
    name: '玄野武宏',
    speaker_uuid: 'c307d938-6f61-4134-a146-17e35003e878',
    styles: [
      { name: 'ノーマル', id: 11 },
      { name: '喜び', id: 39 },
      { name: 'ツンツン', id: 40 },
      { name: '悲しみ', id: 41 },
    ],
  },
  {
    name: '青山龍星',
    speaker_uuid: '4f51116a-d9ee-4516-925d-21f183e2afad',
    styles: [
      { name: 'ノーマル', id: 13 },
      { name: '熱血', id: 81 },
      { name: '不気味', id: 82 },
      { name: '囁き', id: 83 },
    ],
  },
];

const getTargetVoicevoxUrl = (req: Request): string => {
  const customHeader = req.headers['x-voicevox-endpoint'];
  if (typeof customHeader === 'string' && customHeader.trim()) {
    return customHeader.trim().replace(/\/$/, '');
  }
  const customQuery = req.query.endpoint;
  if (typeof customQuery === 'string' && customQuery.trim()) {
    return customQuery.trim().replace(/\/$/, '');
  }
  return VOICEVOX_URL.replace(/\/$/, '');
};

/**
 * VOICEVOX の稼働ステータスチェック
 */
app.get('/api/status', async (req: Request, res: Response) => {
  const targetUrl = getTargetVoicevoxUrl(req);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${targetUrl}/version`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const version = await response.json();
      res.json({ connected: true, version, url: targetUrl });
      return;
    }
    res.json({ connected: false, message: 'VOICEVOX応答なし', url: targetUrl });
  } catch (_e) {
    res.json({
      connected: false,
      message: `VOICEVOXに接続できません（${targetUrl}）`,
      url: targetUrl,
      hint: 'PCのVOICEVOXアプリ、または無料クラウドエンドポイント（Hugging Face Spaces等）のURLを設定してください。',
    });
  }
});

/**
 * 利用可能なスピーカー一覧を取得
 */
app.get('/api/speakers', async (req: Request, res: Response) => {
  const targetUrl = getTargetVoicevoxUrl(req);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(`${targetUrl}/speakers`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const speakers = await response.json();
      res.json({ speakers, isFallback: false, url: targetUrl });
      return;
    }
    throw new Error('VOICEVOX returned error');
  } catch (_e) {
    // 未起動時はフォールバックデータを返す
    res.json({
      speakers: fallbackSpeakers,
      isFallback: true,
      url: targetUrl,
      message: 'VOICEVOXが起動していないため、代表プリセットを表示しています',
    });
  }
});

/**
 * 音声合成（TTS）エンドポイント
 * クエリ生成 -> 音声合成 -> WAVバイナリを返却
 */
app.post('/api/tts', async (req: Request, res: Response): Promise<void> => {
  const targetUrl = getTargetVoicevoxUrl(req);
  const { text, speaker = 2, pitchScale = 0, speedScale = 1.0 } = req.body;

  if (!text) {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  const cacheKey = `${targetUrl}:${speaker}:${pitchScale}:${speedScale}:${text}`;
  if (audioCache.has(cacheKey)) {
    const cachedBuffer = audioCache.get(cacheKey)!;
    res.setHeader('Content-Type', 'audio/wav');
    res.send(cachedBuffer);
    return;
  }

  try {
    // 1. audio_query の生成
    const queryUrl = `${targetUrl}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`;
    const queryRes = await fetch(queryUrl, { method: 'POST' });

    if (!queryRes.ok) {
      throw new Error(`audio_query failed with status: ${queryRes.status}`);
    }

    const queryData = await queryRes.json();

    // ピッチと速度の微調整を反映
    if (pitchScale !== undefined) {
      queryData.pitchScale = pitchScale;
    }
    if (speedScale !== undefined) {
      queryData.speedScale = speedScale;
    }

    // 2. 音声合成 (synthesis)
    const synthUrl = `${targetUrl}/synthesis?speaker=${speaker}`;
    const synthRes = await fetch(synthUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(queryData),
    });

    if (!synthRes.ok) {
      throw new Error(`synthesis failed with status: ${synthRes.status}`);
    }

    const arrayBuffer = await synthRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // キャッシュ保存
    audioCache.set(cacheKey, buffer);

    res.setHeader('Content-Type', 'audio/wav');
    res.send(buffer);
  } catch (error: any) {
    console.warn('VOICEVOX合成失敗:', error.message);
    res.status(503).json({
      error: 'VOICEVOX接続失敗',
      message: 'VOICEVOXが起動していないか、エラーが発生しました。',
    });
  }
});

app.listen(PORT, () => {
  console.log(`[しきしま バックエンド] サーバー起動: http://localhost:${PORT}`);
  console.log(`[VOICEVOX 対象URL] ${VOICEVOX_URL}`);
});
