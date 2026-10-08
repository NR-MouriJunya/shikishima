import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  FileText,
  Sparkles,
  Check,
  RotateCcw,
  HelpCircle,
  Trash2,
} from 'lucide-react';
import { createWorker } from 'tesseract.js';
import type { Script, ScriptLine, Role } from '../types/script';

interface OcrImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportScript: (newScript: Script) => void;
}

export const OcrImportModal: React.FC<OcrImportModalProps> = ({
  isOpen,
  onClose,
  onImportScript,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');
  const [isVertical, setIsVertical] = useState<boolean>(false); // 縦書きか横書きか

  // 解析後の編集用ステート
  const [scriptTitle, setScriptTitle] = useState<string>('写真から取り込んだ台本');
  const [parsedLines, setParsedLines] = useState<ScriptLine[]>([]);
  const [detectedRoles, setDetectedRoles] = useState<Role[]>([
    {
      id: 'direction',
      name: 'ト書き',
      color: '#94a3b8',
      bgColor: 'rgba(148, 163, 184, 0.15)',
      pitch: 0.9,
      rate: 1.0,
      isUserRole: false,
    },
  ]);
  const [step, setStep] = useState<'upload' | 'editing'>('upload');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 画像ファイルが選択されたとき
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // OCR解析の実行
  const handleStartOcr = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    setProgress(0);
    setStatusText('OCRエンジンを初期化中...');

    try {
      // 縦書き(jpn_vert)または横書き(jpn)の学習データを指定
      const lang = isVertical ? 'jpn_vert' : 'jpn';
      const worker = await createWorker(lang, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setStatusText(`文字を認識中... (${Math.round(m.progress * 100)}%)`);
            setProgress(Math.round(m.progress * 100));
          } else {
            setStatusText(m.status);
          }
        },
      });

      setStatusText('文字起こしを実行中...');
      const ret = await worker.recognize(selectedImage);
      await worker.terminate();

      // テキストを行ごとに解析
      parseOcrTextToScript(ret.data.text);
      setStep('editing');
    } catch (err: any) {
      console.error('OCRエラー:', err);
      alert('文字の認識中にエラーが発生しました。別の画像で試してみてください。');
    } finally {
      setIsProcessing(false);
    }
  };

  // 認識された生テキストを行データと役に自動分解
  const parseOcrTextToScript = (rawText: string) => {
    const rawLines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const rolesMap = new Map<string, Role>();
    // デフォルトのト書き
    rolesMap.set('direction', {
      id: 'direction',
      name: 'ト書き',
      color: '#94a3b8',
      bgColor: 'rgba(148, 163, 184, 0.15)',
      pitch: 0.9,
      rate: 1.0,
      isUserRole: false,
    });

    const roleColors = ['#f472b6', '#38bdf8', '#34d399', '#fbbf24', '#a78bfa'];
    let colorIdx = 0;

    const lines: ScriptLine[] = [];

    rawLines.forEach((text, idx) => {
      // ト書きの判定（行頭が ○, （, [, ［, または情景描写っぽいもの）
      const isDir =
        text.startsWith('○') ||
        text.startsWith('(') ||
        text.startsWith('（') ||
        text.startsWith('［') ||
        text.startsWith('[');

      if (isDir) {
        lines.push({
          id: `line-${Date.now()}-${idx}`,
          roleId: 'direction',
          text,
          isDirection: true,
          pauseAfterMs: 700,
        });
        return;
      }

      // セリフの判定（例: "結衣: セリフ", "蓮「セリフ」", "太郎　セリフ"）
      const match = text.match(/^([^\s:：「『]{1,8})[:：\s「『](.*)$/);

      if (match) {
        const charName = match[1].trim();
        const speech = match[2].replace(/[」』]$/, '').trim() || text;

        let roleId = Array.from(rolesMap.values()).find((r) => r.name === charName)?.id;

        if (!roleId) {
          roleId = `role-${rolesMap.size}`;
          const color = roleColors[colorIdx % roleColors.length];
          colorIdx++;
          rolesMap.set(roleId, {
            id: roleId,
            name: charName,
            color,
            bgColor: `${color}25`,
            pitch: 1.0,
            rate: 1.0,
            isUserRole: rolesMap.size === 1, // 最初の登場人物を初期自役にする
          });
        }

        lines.push({
          id: `line-${Date.now()}-${idx}`,
          roleId,
          text: speech,
          isDirection: false,
          pauseAfterMs: 600,
        });
      } else {
        // 役名が特定できない場合は直前の役、または新しいセリフとして扱う
        const lastLineRoleId = lines.length > 0 ? lines[lines.length - 1].roleId : 'direction';
        lines.push({
          id: `line-${Date.now()}-${idx}`,
          roleId: lastLineRoleId,
          text,
          isDirection: lastLineRoleId === 'direction',
          pauseAfterMs: 600,
        });
      }
    });

    setDetectedRoles(Array.from(rolesMap.values()));
    setParsedLines(
      lines.length > 0
        ? lines
        : [
            {
              id: 'line-default',
              roleId: 'direction',
              text: '文字がうまく認識されませんでした。テキストを手動で追加してください。',
              isDirection: true,
            },
          ]
    );
  };

  // 取り込み完了
  const handleFinishImport = () => {
    const newScript: Script = {
      id: `script-${Date.now()}`,
      title: scriptTitle || '取り込んだ台本',
      roles: detectedRoles,
      lines: parsedLines,
    };
    onImportScript(newScript);
    onClose();
  };

  // リセット
  const handleReset = () => {
    setSelectedImage(null);
    setStep('upload');
    setProgress(0);
    setStatusText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-slate-100 text-base sm:text-lg">
              台本写真のOCR文字起こし
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* コンテンツエリア */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {step === 'upload' ? (
            /* ステップ1: アップロードとOCR実行 */
            <div className="space-y-6 max-w-xl mx-auto">
              <div className="text-center space-y-1">
                <h4 className="text-base font-semibold text-slate-200">
                  台本の写真をアップロードまたは撮影
                </h4>
                <p className="text-xs text-slate-400">
                  スマホのカメラで撮った台本や画像を自動で文字起こしし、役ごとのセリフに分割します。
                </p>
              </div>

              {/* 画像選択エリア */}
              {selectedImage ? (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 max-h-72 flex items-center justify-center">
                    <img
                      src={selectedImage}
                      alt="台本プレビュー"
                      className="max-h-72 object-contain"
                    />
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/80 text-slate-300 hover:text-white"
                      title="画像を取り消す"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 縦書き・横書きトグル */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-xs">
                    <span className="text-slate-300 font-medium">台本の文字方向:</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setIsVertical(false)}
                        className={`px-3 py-1 rounded-lg transition-colors ${
                          !isVertical
                            ? 'bg-indigo-600 text-white font-semibold'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        横書き台本
                      </button>
                      <button
                        onClick={() => setIsVertical(true)}
                        className={`px-3 py-1 rounded-lg transition-colors ${
                          isVertical
                            ? 'bg-indigo-600 text-white font-semibold'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        縦書き台本
                      </button>
                    </div>
                  </div>

                  {/* OCR開始ボタン */}
                  <button
                    onClick={handleStartOcr}
                    disabled={isProcessing}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-600 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-pink-500/25 flex items-center justify-center space-x-2 disabled:opacity-50 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isProcessing ? '文字認識中...' : '文字起こしを開始する'}</span>
                  </button>

                  {/* プログレスバー */}
                  {isProcessing && (
                    <div className="space-y-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span>{statusText}</span>
                        <span className="font-mono text-pink-400">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-pink-500 to-indigo-500 h-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 text-center">
                        ※初回は日本語認識データの読み込みに10〜20秒ほどかかる場合があります
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* 画像未選択時のアップロードボタン群 */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* カメラで撮影 */}
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-700 hover:border-pink-500/70 bg-slate-800/40 hover:bg-slate-800/70 transition-all group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-pink-500/10 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform mb-3">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-slate-200 text-sm mb-1">
                      カメラで撮影する
                    </span>
                    <span className="text-xs text-slate-400 text-center">
                      紙の台本をその場でパシャリ
                    </span>
                  </button>

                  {/* アルバムから選択 */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500/70 bg-slate-800/40 hover:bg-slate-800/70 transition-all group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-slate-200 text-sm mb-1">
                      ファイル・画像を選択
                    </span>
                    <span className="text-xs text-slate-400 text-center">
                      スマホの写真やスクショを選ぶ
                    </span>
                  </button>

                  <input
                    type="file"
                    ref={cameraInputRef}
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              )}

              {/* ヒント情報 */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start space-x-2.5 text-xs text-slate-400">
                <HelpCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  明るい場所で、台本の文字が歪まないようにまっすぐ撮影すると認識精度がグッと上がります。認識後の画面で誤字や役名を修正できます。
                </p>
              </div>
            </div>
          ) : (
            /* ステップ2: 認識結果の確認・編集・取り込み */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-slate-200 text-sm">
                    認識結果の確認・微調整
                  </span>
                  <span className="text-xs text-slate-400">
                    ({parsedLines.length}行 抽出)
                  </span>
                </div>
                <button
                  onClick={handleReset}
                  className="flex items-center space-x-1 text-xs text-slate-400 hover:text-slate-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>別の写真を撮り直す</span>
                </button>
              </div>

              {/* タイトル入力 */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">作品タイトル</label>
                <input
                  type="text"
                  value={scriptTitle}
                  onChange={(e) => setScriptTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
              </div>

              {/* 行リスト編集 */}
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {parsedLines.map((line) => {
                  const role = detectedRoles.find((r) => r.id === line.roleId);

                  return (
                    <div
                      key={line.id}
                      className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* 役の割り当て */}
                        <div className="flex items-center space-x-2">
                          <label className="text-xs text-slate-400">役:</label>
                          <select
                            value={line.roleId}
                            onChange={(e) => {
                              const newRoleId = e.target.value;
                              setParsedLines((prev) =>
                                prev.map((l) =>
                                  l.id === line.id
                                    ? {
                                        ...l,
                                        roleId: newRoleId,
                                        isDirection: newRoleId === 'direction',
                                      }
                                    : l
                                )
                              );
                            }}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200 font-semibold"
                            style={{ color: role?.color }}
                          >
                            {detectedRoles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 行削除 */}
                        <button
                          onClick={() =>
                            setParsedLines((prev) => prev.filter((l) => l.id !== line.id))
                          }
                          className="text-slate-500 hover:text-rose-400 p-1"
                          title="行を削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* 本文入力 */}
                      <textarea
                        value={line.text}
                        onChange={(e) => {
                          const newText = e.target.value;
                          setParsedLines((prev) =>
                            prev.map((l) => (l.id === line.id ? { ...l, text: newText } : l))
                          );
                        }}
                        rows={2}
                        className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg p-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* モーダルフッター */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-900/90">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm text-slate-400 hover:text-slate-200"
          >
            キャンセル
          </button>

          {step === 'editing' && (
            <button
              onClick={handleFinishImport}
              className="flex items-center space-x-1.5 px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/20 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>この台本を取り込んで練習する</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
