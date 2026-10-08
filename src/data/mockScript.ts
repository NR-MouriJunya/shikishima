import type { Script } from '../types/script';

/**
 * プロトタイプ検証用のモック台本データ
 * 「雨上がりのプラットフォーム」
 */
export const defaultMockScript: Script = {
  id: 'script-sample-01',
  title: '雨上がりのプラットフォーム',
  description: '夕暮れ時、雨が上がり始めた無人駅。別れを告げようとする結衣と、引き止めたい蓮の会話劇。',
  roles: [
    {
      id: 'direction',
      name: 'ト書き',
      color: '#94a3b8', // slate-400
      bgColor: 'rgba(148, 163, 184, 0.15)',
      pitch: 0.9,
      rate: 1.0,
      voiceEngine: 'voicevox',
      voicevoxSpeakerId: 13, // 青山龍星（低音ナレーション）
      isUserRole: false,
    },
    {
      id: 'yuki',
      name: '結衣',
      color: '#f472b6', // pink-400
      bgColor: 'rgba(244, 114, 182, 0.15)',
      pitch: 1.1,
      rate: 1.0,
      voiceEngine: 'voicevox',
      voicevoxSpeakerId: 2, // 四国めたん（ノーマル）
      isUserRole: true, // デフォルトでユーザー担当役にしておく（一人練習確認用）
    },
    {
      id: 'ren',
      name: '蓮',
      color: '#38bdf8', // sky-400
      bgColor: 'rgba(56, 189, 248, 0.15)',
      pitch: 1.0,
      rate: 1.0,
      voiceEngine: 'voicevox',
      voicevoxSpeakerId: 11, // 玄野武宏（青年ボイス）
      isUserRole: false,
    },
  ],
  lines: [
    {
      id: 'line-1',
      roleId: 'direction',
      text: '○ 夕暮れの駅ホーム。遠くで踏切の警報機が鳴り響いている。雨の滴が屋根から静かに滴り落ちる。',
      isDirection: true,
      pauseAfterMs: 800,
      tips: {
        summary: 'シーン冒頭。静寂と雨上がりの切ない空気を伝える情景描写。',
        emotion: '静かで落ち着いた語り口。間をしっかり取る。',
        actingNote: '環境音の余韻を感じさせるように、焦らずゆったりと読み上げる。',
      },
    },
    {
      id: 'line-2',
      roleId: 'ren',
      text: '……本当に行くのか？ 次の電車に乗ったら、もう当分戻ってこられないんだぞ。',
      phoneticText: '……ほんとうにいくのか？ つぎのでんしゃにのったら、もうとうぶんもどってこられないんだぞ。',
      isDirection: false,
      pauseAfterMs: 700,
      tips: {
        summary: '蓮の引き止め。焦りと寂しさが入り混じった問いかけ。',
        emotion: '切迫感、少し震える声。目線を結衣にまっすぐ向けて。',
        actingNote: '語頭の「……」で短いためらいの息を吸ってから発声すると感情が乗りやすい。',
      },
    },
    {
      id: 'line-3',
      roleId: 'yuki',
      text: 'うん。決めたの。ここで立ち止まったままじゃ、何も変わらないから。',
      phoneticText: 'うん。きめたの。ここでたちどまったままじゃ、なにもかわらないから。',
      isDirection: false,
      pauseAfterMs: 700,
      tips: {
        summary: '結衣の決意表明。寂しさはあるが、前を向く意志の強さを示す。',
        emotion: '穏やかだが芯のある声。微笑みを浮かべるイメージ。',
        actingNote: '「うん」でしっかり相手を受け止め、「決めたの」でキリッと意思を込める。',
      },
    },
    {
      id: 'line-4',
      roleId: 'direction',
      text: '結衣は濡れた傘の先を地面にトントンと当て、かすかに微笑んで蓮を見つめ返す。',
      isDirection: true,
      pauseAfterMs: 800,
      tips: {
        summary: '結衣の心の揺れと、蓮を安心させようとする仕草。',
        emotion: '情景の動きを淡々と、しかし情緒豊かに描写。',
      },
    },
    {
      id: 'line-5',
      roleId: 'ren',
      text: '変わらなくていいじゃないか！ 俺は……お前がここにいてくれるだけで良かったのに。',
      phoneticText: 'かわらなくていいじゃないか！ おれは……おまえがここにいてくれるだけでよかったのに。',
      isDirection: false,
      pauseAfterMs: 800,
      tips: {
        summary: '蓮の本音の爆発。思わず感情が高ぶってしまう瞬間。',
        emotion: '感情の昂ぶり、悔しさ、懇願。少し声を張る。',
        actingNote: '「変わらなくていいじゃないか！」は強めに入り、「俺は……」で感情が詰まるような間を取る。',
      },
    },
    {
      id: 'line-6',
      roleId: 'yuki',
      text: '蓮くん……。ありがとう。その言葉だけで、私、東京でもきっと頑張れるよ。',
      phoneticText: 'れんくん……。ありがとう。そのことばだけで、わたし、とうきょうでもきっとがんばれるよ。',
      isDirection: false,
      pauseAfterMs: 900,
      tips: {
        summary: '蓮への感謝と愛おしさ。泣きそうになるのをぐっと堪えて。',
        emotion: '優しく包み込むようなトーン。語尾を柔らかく消えるように。',
        actingNote: '蓮の気持ちを拒絶するのではなく、宝物のように受け取って前を向く演技を意識。',
      },
    },
    {
      id: 'line-7',
      roleId: 'direction',
      text: '遠くのトンネルから列車のヘッドライトが見え始め、二人の足元を照らし出す。',
      isDirection: true,
      pauseAfterMs: 900,
      tips: {
        summary: '別れのタイムリミットが迫るクライマックス。',
        emotion: '緊迫感と別れの訪れを告げるナレーション。',
      },
    },
    {
      id: 'line-8',
      roleId: 'ren',
      text: '……電車、来ちゃったな。',
      phoneticText: '……でんしゃ、きちゃったな。',
      isDirection: false,
      pauseAfterMs: 600,
      tips: {
        summary: '諦めと受け入れ。息混じりのつぶやき。',
        emotion: '脱力、寂しさの吐露。小さめの声。',
      },
    },
    {
      id: 'line-9',
      roleId: 'yuki',
      text: '行かなくちゃ。約束だよ、蓮くん。次に会う時は、お互い夢を叶えて笑顔で会おうね！',
      phoneticText: 'いかなくちゃ。やくそくだよ、れんくん。つぎにあうときは、おたがいゆめをかなえてえがおであおうね！',
      isDirection: false,
      pauseAfterMs: 1000,
      tips: {
        summary: 'ラストの決めゼリフ。背中を押す最高の笑顔。',
        emotion: '明るく元気に、少し涙を堪えた晴れやかな声。',
        actingNote: '最後の「笑顔で会おうね！」は一番明るく響かせて、物語の希望を残す。',
      },
    },
  ],
};
