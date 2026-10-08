/**
 * 台本OCR画像のページ番号（ノンブル）検出および自動並び替えユーティリティ
 * デジタル庁デザインシステム（DADS）対応
 */

export interface PageOcrItem {
  id: string; // 画像ID
  originalIndex: number; // プールされた元の選択・撮影順 (0始まり)
  imageUrl: string;
  imageName: string;
  rawText: string;
  detectedPageNumber: number | null; // 自動検出されたページ番号
  effectivePageNumber: number | null; // 実際にソートに使用するページ番号（手動修正可能）
  matchedLineIndex?: number; // ノンブルと判定された行のインデックス（除去用）
}

/**
 * 全角数字・記号を半角に正規化する
 */
export function normalizeTextNumbers(text: string): string {
  if (!text) return '';
  return text
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[—―ー〜～]/g, '-')
    .replace(/[（［｛【]/g, '(')
    .replace(/[）］｝】]/g, ')');
}

/**
 * OCRテキストからページ番号（ノンブル）を抽出する
 * 戻り値: { pageNumber: number | null, lineIndex: number | null }
 */
export function extractPageNumber(rawText: string): {
  pageNumber: number | null;
  lineIndex: number | null;
} {
  if (!rawText) return { pageNumber: null, lineIndex: null };

  const lines = rawText.split('\n').map((l) => l.trim());
  if (lines.length === 0) return { pageNumber: null, lineIndex: null };

  // ノンブルは通常、文書の先頭数行（ヘッダー）または末尾数行（フッター）に記載される
  // 優先順位: 末尾4行 -> 先頭4行 -> その他全体
  const lineCount = lines.length;
  const candidateIndices: number[] = [];

  // 末尾4行（下部ノンブルが最も一般的）
  for (let i = Math.max(0, lineCount - 4); i < lineCount; i++) {
    candidateIndices.push(i);
  }
  // 先頭4行（上部ノンブル）
  for (let i = 0; i < Math.min(4, lineCount); i++) {
    if (!candidateIndices.includes(i)) {
      candidateIndices.push(i);
    }
  }

  // ノンブル検出用のパターン（優先度順）
  const patterns: RegExp[] = [
    // 1. - 12 - や -- 12 -- や -1-
    /^(?:[-]\s*)+(\d{1,3})(?:\s*[-])+$/,
    // 2. ( 12 ) や [ 12 ]
    /^\(\s*(\d{1,3})\s*\)$/,
    // 3. P.12, p.12, Page 12, P-12, p 12, PAGE 12
    /^p(?:age)?[\.\s\-_:]*(\d{1,3})$/i,
    // 4. 12頁, 12ページ, 第12頁, 第12ページ
    /^(?:第)?\s*(\d{1,3})\s*(?:頁|ページ|page)$/i,
    // 5. 単独の数字のみ（1〜3桁）
    /^(\d{1,3})$/,
    // 6. 行中に明確なページ表記がある場合（例: "PAGE 5 / 12" や "- 5 -"）
    /p(?:age)?[\.\s\-_:]*(\d{1,3})(?:\s*[\/\-]\s*\d+)?/i,
    /(?:^|\s)-+\s*(\d{1,3})\s*-+(?:\s|$)/,
  ];

  // 1. まず優先候補行（先頭・末尾）をチェック
  for (const idx of candidateIndices) {
    const rawLine = lines[idx];
    const norm = normalizeTextNumbers(rawLine).trim();
    if (!norm) continue;

    for (const pat of patterns) {
      const match = norm.match(pat);
      if (match) {
        const num = parseInt(match[1], 10);
        // 台本のページ番号として妥当な範囲（1〜500）
        if (num > 0 && num <= 500) {
          return { pageNumber: num, lineIndex: idx };
        }
      }
    }
  }

  // 2. 優先行で見つからない場合、全行から厳格なパターン（単独数字や明示的表記）で検索
  const strictPatterns: RegExp[] = [
    /^(?:[-]\s*)+(\d{1,3})(?:\s*[-])+$/,
    /^\(\s*(\d{1,3})\s*\)$/,
    /^p(?:age)?[\.\s\-_:]*(\d{1,3})$/i,
    /^(?:第)?\s*(\d{1,3})\s*(?:頁|ページ|page)$/i,
    /^(\d{1,3})$/,
  ];

  for (let idx = 0; idx < lines.length; idx++) {
    if (candidateIndices.includes(idx)) continue;
    const rawLine = lines[idx];
    const norm = normalizeTextNumbers(rawLine).trim();
    if (!norm) continue;

    for (const pat of strictPatterns) {
      const match = norm.match(pat);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > 0 && num <= 500) {
          return { pageNumber: num, lineIndex: idx };
        }
      }
    }
  }

  return { pageNumber: null, lineIndex: null };
}

/**
 * ページ番号と元インデックスに基づいてページ配列を昇順ソートする
 */
export function sortPagesAuto(pages: PageOcrItem[]): {
  sortedPages: PageOcrItem[];
  detectedCount: number;
  hasOrderingChanged: boolean;
} {
  const detectedCount = pages.filter((p) => p.effectivePageNumber !== null).length;

  // ソート用配列を複製
  const sorted = [...pages].sort((a, b) => {
    const numA = a.effectivePageNumber;
    const numB = b.effectivePageNumber;

    // 両方番号がある場合は昇順
    if (numA !== null && numB !== null) {
      if (numA !== numB) return numA - numB;
      return a.originalIndex - b.originalIndex;
    }

    // Aのみ番号がある場合はAを前
    if (numA !== null && numB === null) return -1;
    // Bのみ番号がある場合はBを前
    if (numA === null && numB !== null) return 1;

    // どちらも未検出の場合は元の順序
    return a.originalIndex - b.originalIndex;
  });

  // 順序が変化したかどうか
  const hasOrderingChanged = sorted.some((item, idx) => item.id !== pages[idx]?.id);

  return {
    sortedPages: sorted,
    detectedCount,
    hasOrderingChanged,
  };
}

/**
 * ソート後の各ページテキストを結合する（ノンブル行の自動除外付き）
 */
export function combinePageTexts(pages: PageOcrItem[]): string {
  const cleanedTexts = pages.map((page) => {
    const lines = page.rawText.split('\n');
    // ノンブルと判定された行がある場合は、その行を除去してセリフに混ざるのを防ぐ
    if (page.matchedLineIndex !== undefined && page.matchedLineIndex >= 0) {
      return lines.filter((_, idx) => idx !== page.matchedLineIndex).join('\n');
    }
    return page.rawText;
  });

  return cleanedTexts.join('\n\n');
}
