/**
 * 役・キャラクター設定の型定義
 */
export interface Role {
  /** 役の一意な識別子 (例: 'direction', 'yuki', 'ren') */
  id: string;
  /** 役の名前 (例: 'ト書き', '結衣', '蓮') */
  name: string;
  /** テキストやバッジのアクセントカラー (例: '#38bdf8') */
  color: string;
  /** 背景のソフトなカラー（バッジ用） */
  bgColor?: string;
  /** Web Speech API の音声URIまたは音声名 */
  voiceURI?: string;
  /** 読み上げのピッチ（高低: 0.5 〜 2.0、標準 1.0） */
  pitch: number;
  /** 読み上げの速度（0.5 〜 2.0、標準 1.0） */
  rate: number;
  /** 使用する音声合成エンジン ('voicevox' | 'browser') */
  voiceEngine?: 'voicevox' | 'browser';
  /** VOICEVOXの話者スタイルID (例: 2=四国めたんノーマル, 3=ずんだもんノーマル, 11=玄野武宏など) */
  voicevoxSpeakerId?: number;
  /** 「キミ（自分）の役」フラグ（一人読み合わせモードでミュート対象にする） */
  isUserRole?: boolean;
}

/**
 * 演技アドバイスや文脈情報（Tips）の型定義
 */
export interface LineTips {
  /** シーンのあらすじ・文脈 */
  summary?: string;
  /** 感情表現・トーン指示（例: 「少し伏し目がちに、寂しさを隠して」） */
  emotion?: string;
  /** 演技の具体的なアドバイスや呼吸の置き方 */
  actingNote?: string;
}

/**
 * 台本の各行データの型定義
 */
export interface ScriptLine {
  /** 行の一意な識別子 */
  id: string;
  /** 割り当てられている役のID */
  roleId: string;
  /** セリフまたはト書きの本文 */
  text: string;
  /** 漢字の読み間違い防止用（ルビ・ひらがな読み上げ用テキスト） */
  phoneticText?: string;
  /** ト書き（情景・動作指示）かどうか */
  isDirection?: boolean;
  /** この行の読み上げ完了後の待機時間（ミリ秒、標準: 600ms） */
  pauseAfterMs?: number;
  /** 演技アシスト・感情のヒント */
  tips?: LineTips;
}

/**
 * 台本全体のデータ構造
 */
export interface Script {
  /** 台本ID */
  id: string;
  /** 作品タイトル */
  title: string;
  /** サブタイトルまたは説明 */
  description?: string;
  /** 登場人物・役の一覧 */
  roles: Role[];
  /** 台本の全行一覧 */
  lines: ScriptLine[];
}
