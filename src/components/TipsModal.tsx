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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-gray-300 rounded-lg w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-gray-900 text-base sm:text-lg">
              演技アシスト & Tips
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 対象のセリフ表示（DADS注釈ブロック風） */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 border-l-4 border-[#004de5]">
          <div className="flex items-center space-x-2 mb-1.5">
            <span
              className="text-xs px-2.5 py-0.5 rounded font-semibold border"
              style={{
                color: role?.color || '#475569',
                backgroundColor: role?.bgColor || '#ffffff',
                borderColor: `${role?.color || '#94a3b8'}40`,
              }}
            >
              {role?.name || 'ト書き'}
            </span>
          </div>
          <p className="text-sm sm:text-base text-gray-800 italic leading-relaxed">
            「{line.text}」
          </p>
        </div>

        {/* 入力・確認エリア */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* あらすじ・状況 */}
          <div>
            <label className="flex items-center space-x-1.5 text-xs font-bold text-gray-700 mb-1.5">
              <MessageSquare className="w-4 h-4 text-[#004de5]" />
              <span>シーンの文脈・状況</span>
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="例: 駅のホームでの別れの直前。相手の引き止めに対して..."
              rows={2}
              className="w-full bg-white border border-gray-300 rounded p-3 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#004de5] resize-none"
            />
          </div>

          {/* 感情表現 */}
          <div>
            <label className="flex items-center space-x-1.5 text-xs font-bold text-gray-700 mb-1.5">
              <Heart className="w-4 h-4 text-rose-600" />
              <span>感情・トーンの指示</span>
            </label>
            <textarea
              value={emotion}
              onChange={(e) => setEmotion(e.target.value)}
              placeholder="例: 切なさを隠して、前向きに微笑みながら..."
              rows={2}
              className="w-full bg-white border border-gray-300 rounded p-3 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#004de5] resize-none"
            />
          </div>

          {/* 演技アドバイス */}
          <div>
            <label className="flex items-center space-x-1.5 text-xs font-bold text-gray-700 mb-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>演技アドバイス・呼吸・間合い</span>
            </label>
            <textarea
              value={actingNote}
              onChange={(e) => setActingNote(e.target.value)}
              placeholder="例: 冒頭の「うん」でしっかり相手の視線を受け止める..."
              rows={3}
              className="w-full bg-white border border-gray-300 rounded p-3 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#004de5] resize-none"
            />
          </div>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end space-x-3 px-6 py-3.5 border-t border-gray-200 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            className="flex items-center space-x-1.5 px-5 py-2 bg-[#004de5] hover:bg-[#0037a6] text-white rounded text-sm font-bold shadow-2xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Tipsを保存</span>
          </button>
        </div>
      </div>
    </div>
  );
};
