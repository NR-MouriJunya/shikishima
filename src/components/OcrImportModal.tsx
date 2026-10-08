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
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { createWorker } from 'tesseract.js';
import type { Script, ScriptLine, Role } from '../types/script';

interface ImageItem {
  id: string;
  url: string;
  name: string;
}

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
  // プールされた画像リスト
  const [imagePool, setImagePool] = useState<ImageItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [currentProcessingPage, setCurrentProcessingPage] = useState<number>(1);
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
      bgColor: '#f1f5f9',
      pitch: 0.9,
      rate: 1.0,
      isUserRole: false,
    },
  ]);
  const [step, setStep] = useState<'upload' | 'editing'>('upload');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 画像ファイルが選択されたとき（複数ファイル対応）
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    fileList.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePool((prev) => [
          ...prev,
          {
            id: `img-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
            url: reader.result as string,
            name: file.name || `ページ ${prev.length + index + 1}`,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    // 同じファイルを再選択できるようにリセット
    e.target.value = '';
  };

  // 画像の削除
  const handleRemoveImage = (id: string) => {
    setImagePool((prev) => prev.filter((img) => img.id !== id));
  };

  // 画像の順序移動（前へ）
  const handleMoveImageLeft = (index: number) => {
    if (index === 0) return;
    setImagePool((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  // 画像の順序移動（次へ）
  const handleMoveImageRight = (index: number) => {
    if (index === imagePool.length - 1) return;
    setImagePool((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  // 複数画像の順次OCR解析実行（キュー方式）
  const handleStartOcr = async () => {
    if (imagePool.length === 0) return;

    setIsProcessing(true);
    setOverallProgress(0);
    setCurrentProcessingPage(1);
    setStatusText('OCRエンジンを初期化中...');

    try {
      const lang = isVertical ? 'jpn_vert' : 'jpn';
      let activeIndex = 0;

      // 1つのWorkerを再利用してメモリ負荷と読み込み時間を大幅削減
      const worker = await createWorker(lang, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const pagePct = Math.round(m.progress * 100);
            const totalPct = Math.round(
              ((activeIndex + m.progress) / imagePool.length) * 100
            );
            setOverallProgress(totalPct);
            setStatusText(
              `ページ ${activeIndex + 1} / ${imagePool.length} を文字認識中... (${pagePct}%)`
            );
          } else {
            setStatusText(m.status);
          }
        },
      });

      const allRecognizedTexts: string[] = [];

      for (let i = 0; i < imagePool.length; i++) {
        activeIndex = i;
        setCurrentProcessingPage(i + 1);
        setStatusText(`ページ ${i + 1} / ${imagePool.length} のテキストを抽出中...`);
        const ret = await worker.recognize(imagePool[i].url);
        allRecognizedTexts.push(ret.data.text);
      }

      await worker.terminate();

      // 全ページのテキストを順番に連結して台本行に自動分解
      parseOcrTextToScript(allRecognizedTexts.join('\n'));
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
      bgColor: '#f1f5f9',
      pitch: 0.9,
      rate: 1.0,
      isUserRole: false,
    });

    const roleColors = ['#004de5', '#059669', '#d97706', '#9333ea', '#dc2626'];
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
            bgColor: '#eff6ff',
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
      title: scriptTitle || '写真から取り込んだ台本',
      roles: detectedRoles,
      lines: parsedLines,
      updatedAt: Date.now(),
    };
    onImportScript(newScript);
    onClose();
  };

  // リセット
  const handleReset = () => {
    setImagePool([]);
    setStep('upload');
    setOverallProgress(0);
    setCurrentProcessingPage(1);
    setStatusText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-gray-300 rounded-lg w-full max-w-4xl shadow-xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-2.5">
            <Camera className="w-5 h-5 text-[#004de5]" />
            <h3 className="font-bold text-gray-900 text-base sm:text-lg">
              台本写真のOCR文字起こし
            </h3>
            {imagePool.length > 0 && step === 'upload' && (
              <span className="hidden sm:inline-flex text-xs bg-blue-50 text-[#004de5] border border-blue-200 px-2 py-0.5 rounded font-semibold">
                {imagePool.length} ページ選択中
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* コンテンツエリア */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {step === 'upload' ? (
            /* ステップ1: 複数写真のプールと順次OCR実行 */
            <div className="space-y-5 max-w-2xl mx-auto">
              <div className="text-center space-y-1">
                <h4 className="text-base font-bold text-gray-900">
                  台本の写真をプールして一括文字起こし
                </h4>
                <p className="text-xs text-gray-600">
                  複数ページの台本写真をまとめて選択または連続撮影し、1冊の台本として順番に文字起こしします。
                </p>
              </div>

              {/* プールされた画像一覧 */}
              {imagePool.length > 0 ? (
                <div className="space-y-4">
                  {/* アクションバー（追加ボタン群と全クリア） */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={isProcessing}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 font-semibold transition-colors shadow-2xs disabled:opacity-50"
                      >
                        <Camera className="w-3.5 h-3.5 text-[#004de5]" />
                        <span>次のページを撮影</span>
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 font-semibold transition-colors shadow-2xs disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#004de5]" />
                        <span>画像を追加選択</span>
                      </button>
                    </div>

                    <button
                      onClick={() => setImagePool([])}
                      disabled={isProcessing}
                      className="text-gray-500 hover:text-red-600 font-medium transition-colors disabled:opacity-50"
                    >
                      すべてクリア
                    </button>
                  </div>

                  {/* サムネイルプール・グリッド */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto p-1">
                    {imagePool.map((item, idx) => (
                      <div
                        key={item.id}
                        className="relative rounded-lg border border-gray-200 bg-gray-100 overflow-hidden flex flex-col group shadow-2xs"
                      >
                        {/* ページ番号バッジ */}
                        <div className="absolute top-2 left-2 z-10 bg-black/75 text-white text-[11px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs">
                          P.{idx + 1}
                        </div>

                        {/* 削除ボタン */}
                        {!isProcessing && (
                          <button
                            onClick={() => handleRemoveImage(item.id)}
                            className="absolute top-2 right-2 z-10 p-1 rounded bg-white/90 text-gray-700 hover:text-red-600 shadow-sm border border-gray-200"
                            title="このページを削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* 画像サムネイル */}
                        <div className="h-32 w-full flex items-center justify-center bg-gray-900/5">
                          <img
                            src={item.url}
                            alt={`台本 ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        {/* 順序入れ替えコントロール */}
                        {!isProcessing && (
                          <div className="flex items-center justify-between px-2 py-1 bg-white border-t border-gray-200 text-xs text-gray-500">
                            <button
                              onClick={() => handleMoveImageLeft(idx)}
                              disabled={idx === 0}
                              className="p-1 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-20"
                              title="前へ移動"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[10px] font-mono font-semibold">
                              {idx + 1} / {imagePool.length}
                            </span>
                            <button
                              onClick={() => handleMoveImageRight(idx)}
                              disabled={idx === imagePool.length - 1}
                              className="p-1 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-20"
                              title="次へ移動"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 縦書き・横書きトグル */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs">
                    <span className="text-gray-700 font-bold">台本の文字方向:</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setIsVertical(false)}
                        disabled={isProcessing}
                        className={`px-3 py-1.5 rounded font-semibold transition-colors ${
                          !isVertical
                            ? 'bg-[#004de5] text-white shadow-2xs'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        横書き台本
                      </button>
                      <button
                        onClick={() => setIsVertical(true)}
                        disabled={isProcessing}
                        className={`px-3 py-1.5 rounded font-semibold transition-colors ${
                          isVertical
                            ? 'bg-[#004de5] text-white shadow-2xs'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        縦書き台本
                      </button>
                    </div>
                  </div>

                  {/* OCR一括開始ボタン */}
                  <button
                    onClick={handleStartOcr}
                    disabled={isProcessing || imagePool.length === 0}
                    className="w-full py-3 rounded bg-[#004de5] hover:bg-[#0037a6] text-white font-bold text-sm shadow-2xs flex items-center justify-center space-x-2 disabled:opacity-50 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {isProcessing
                        ? `文字認識中... (ページ ${currentProcessingPage} / ${imagePool.length})`
                        : `全 ${imagePool.length} ページの文字起こしを開始する`}
                    </span>
                  </button>

                  {/* 順次プログレスバー */}
                  {isProcessing && (
                    <div className="space-y-2.5 p-3.5 rounded-lg bg-gray-50 border border-gray-200">
                      <div className="flex justify-between text-xs text-gray-700 font-medium">
                        <span>{statusText}</span>
                        <span className="font-mono text-[#004de5] font-bold">
                          全体進捗: {overallProgress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#004de5] h-full transition-all duration-300"
                          style={{ width: `${overallProgress}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-500 text-center">
                        ※端末の負荷を抑えるため、1ページずつ安全に順次文字起こしを行っています
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* 画像未選択時の初期アップロードUI */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* カメラで撮影 */}
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed border-gray-300 hover:border-[#004de5] bg-gray-50 hover:bg-blue-50/40 transition-colors group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded bg-blue-100 flex items-center justify-center text-[#004de5] group-hover:scale-105 transition-transform mb-3">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-gray-900 text-sm mb-1">
                      カメラで撮影する
                    </span>
                    <span className="text-xs text-gray-500 text-center">
                      紙の台本を1ページずつ撮影して追加
                    </span>
                  </button>

                  {/* アルバムから選択（複数選択可） */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed border-gray-300 hover:border-[#004de5] bg-gray-50 hover:bg-blue-50/40 transition-colors group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded bg-blue-100 flex items-center justify-center text-[#004de5] group-hover:scale-105 transition-transform mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-gray-900 text-sm mb-1">
                      写真・画像をまとめて選択
                    </span>
                    <span className="text-xs text-gray-500 text-center">
                      複数の写真やスクショを一括追加
                    </span>
                  </button>
                </div>
              )}

              {/* 隠しinput要素 */}
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
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              {/* DADS注釈ブロック */}
              <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200 flex items-start space-x-2.5 text-xs text-gray-800">
                <HelpCircle className="w-4 h-4 text-[#004de5] shrink-0 mt-0.5" />
                <div className="space-y-1 leading-relaxed">
                  <p className="font-semibold text-gray-900">複数ページの台本取り込みについて:</p>
                  <p>
                    何ページもある長編台本や複数枚の写真をプールして、1冊の通し台本として連結できます。読み取り前にサムネイルの順番（P.1, P.2...）を並び替えることも可能です。
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* ステップ2: 認識結果の確認・編集・取り込み */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-[#004de5]" />
                  <span className="font-bold text-gray-900 text-sm">
                    認識結果の確認・微調整
                  </span>
                  <span className="text-xs font-semibold text-gray-500">
                    ({imagePool.length} ページ分 / {parsedLines.length} 行 抽出)
                  </span>
                </div>
                <button
                  onClick={handleReset}
                  className="flex items-center space-x-1 text-xs text-gray-600 hover:text-gray-900 font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>写真を撮り直す</span>
                </button>
              </div>

              {/* タイトル入力 */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">作品タイトル</label>
                <input
                  type="text"
                  value={scriptTitle}
                  onChange={(e) => setScriptTitle(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-900 font-bold focus:outline-none focus:ring-1 focus:ring-[#004de5]"
                />
              </div>

              {/* 行リスト編集 */}
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {parsedLines.map((line) => {
                  const role = detectedRoles.find((r) => r.id === line.roleId);

                  return (
                    <div
                      key={line.id}
                      className="p-3 rounded-lg border border-gray-200 bg-gray-50/60 space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* 役の割り当て */}
                        <div className="flex items-center space-x-2">
                          <label className="text-xs font-semibold text-gray-700">役:</label>
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
                            className="bg-white border border-gray-300 rounded px-2 py-0.5 text-xs text-gray-900 font-semibold focus:outline-none focus:ring-1 focus:ring-[#004de5]"
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
                          className="text-gray-400 hover:text-red-600 p-1"
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
                        className="w-full bg-white border border-gray-300 rounded p-2 text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#004de5] resize-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* モーダルフッター */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-200 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            キャンセル
          </button>

          {step === 'editing' && (
            <button
              onClick={handleFinishImport}
              className="flex items-center space-x-1.5 px-5 py-2 bg-[#004de5] hover:bg-[#0037a6] text-white rounded text-xs sm:text-sm font-bold shadow-2xs transition-colors"
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
