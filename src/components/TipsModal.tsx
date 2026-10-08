import React, { useState } from 'react';
import { X, Sparkles, Heart, MessageSquare, Save } from 'lucide-react';
import type { ScriptLine, Role } from '../types/script';

interface TipsModalProps {
  line: ScriptLine | null;
  role: Role | undefined;
  isOpen: boolean;
  onClose: () => void;
  onSaveTips: (lineId: string, tips: ScriptLine['tips']) => void;
}

export const TipsModal: React.FC<TipsModalProps> = ({
  line,
  role,
  isOpen,
  onClose,
  onSaveTips,
}) => {
  if (!isOpen || !line) return null;

  const [summary, setSummary] = useState(line.tips?.summary || '');
  const [emotion, setEmotion] = useState(line.tips?.emotion || '');
  const [actingNote, setActingNote] = useState(line.tips?.actingNote || '');

  const handleSave = () => {
    onSaveTips(line.id, {
      summary,
      emotion,
      actingNote,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-slate-100 text-base sm:text-lg">
              演技アシスト & Tips
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 対象のセリフ表示 */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800">
          <div className="flex items-center space-x-2 mb-1.5">
            <span
              className="text-xs px-2.5 py-0.5 rounded-full font-medium"
              style={{
                color: role?.color || '#94a3b8',
                backgroundColor: role?.bgColor || 'rgba(148, 163, 184, 0.15)',
              }}
            >
              {role?.name || 'ト書き'}
            </span>
          </div>
          <p className="text-sm sm:text-base text-slate-200 italic font-serif leading-relaxed">
            「{line.text}」
          </p>
        </div>

        {/* 入力・確認エリア */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* あらすじ・状況 */}
          <div>
            <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300 mb-1.5">
              <MessageSquare className="w-4 h-4 text-sky-400" />
              <span>シーンの文脈・あらすじ</span>
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="例: 駅のホームでの別れの直前。蓮の引き止めに対して..."
              rows={2}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500/50 resize-none"
            />
          </div>

          {/* 感情表現 */}
          <div>
            <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300 mb-1.5">
              <Heart className="w-4 h-4 text-pink-400" />
              <span>感情・トーンの指示</span>
            </label>
            <textarea
              value={emotion}
              onChange={(e) => setEmotion(e.target.value)}
              placeholder="例: 切なさを隠して、前向きに微笑みながら..."
              rows={2}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500/50 resize-none"
            />
          </div>

          {/* 演技アドバイス */}
          <div>
            <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300 mb-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>演技アドバイス・呼吸の置き方</span>
            </label>
            <textarea
              value={actingNote}
              onChange={(e) => setActingNote(e.target.value)}
              placeholder="例: 冒頭の「うん」でしっかり相手の視線を受け止める..."
              rows={3}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500/50 resize-none"
            />
          </div>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end space-x-3 px-6 py-3 border-t border-slate-800 bg-slate-900/80">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-600 hover:to-indigo-600 text-white rounded-xl text-sm font-medium shadow-md shadow-pink-500/20 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Tipsを保存</span>
          </button>
        </div>
      </div>
    </div>
  );
};
