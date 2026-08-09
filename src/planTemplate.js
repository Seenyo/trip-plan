export const templateOptions = [
  { id: 'overview', label: '旅の概要', hint: '行き先・日程・旅のテーマ', group: '基本' },
  { id: 'questions', label: '未決定のこと', hint: '相談したいことをチェックリストに', group: '基本' },
  { id: 'days', label: '日ごとのアイデア', hint: '日付ごとに候補をメモ', group: '基本' },
  { id: 'decisions', label: '最終決定', hint: '確定した内容だけをまとめる', group: '基本' },
  { id: 'flight', label: '飛行機', hint: '便名・空港・時刻・料金', group: '移動' },
  { id: 'train', label: '電車・バス', hint: '路線・時刻・乗り換え', group: '移動' },
  { id: 'car', label: 'レンタカー', hint: '店舗・返却・保険・料金', group: '移動' },
  { id: 'ferry', label: 'フェリー', hint: '港・便・乗船手続き', group: '移動' },
  { id: 'stay', label: '宿泊', hint: '住所・予約番号・設備', group: '予約' },
  { id: 'activities', label: '観光・体験', hint: '候補・営業時間・予約', group: '予約' },
  { id: 'food', label: '食事', hint: '店・営業時間・予約', group: '予約' },
  { id: 'budget', label: '予算', hint: '交通・宿・体験の金額', group: '準備' },
  { id: 'packing', label: '持ち物', hint: '忘れ物防止のチェックリスト', group: '準備' },
  { id: 'links', label: 'リンク', hint: '予約ページや参考記事', group: '準備' },
];

const paragraph = (content = '') => ({ type: 'paragraph', content });
const check = (content) => ({ type: 'checkListItem', props: { checked: false }, content });
const bullet = (content) => ({ type: 'bulletListItem', content });

const sectionContent = {
  overview: [
    paragraph('行き先：'),
    paragraph('期間：'),
    paragraph('旅のテーマ：'),
    paragraph('参加者：'),
  ],
  questions: [check('決めることを書く'), check('確認することを書く')],
  days: [
    { type: 'heading', props: { level: 3 }, content: '1日目' },
    bullet('時間　場所・やること'),
    { type: 'heading', props: { level: 3 }, content: '2日目' },
    bullet('時間　場所・やること'),
  ],
  decisions: [check('予約・手配が完了したらチェック')],
  flight: [
    paragraph('往路：出発空港 → 到着空港'),
    paragraph('日時・便名：'),
    paragraph('復路：出発空港 → 到着空港'),
    paragraph('料金・予約番号：'),
  ],
  train: [paragraph('区間・路線：'), paragraph('出発・到着時刻：'), paragraph('料金・予約：')],
  car: [paragraph('受取場所・日時：'), paragraph('返却場所・日時：'), paragraph('車種・保険・料金：')],
  ferry: [paragraph('出発港 → 到着港：'), paragraph('出発・到着時刻：'), paragraph('料金・予約：')],
  stay: [check('宿泊先を決める'), paragraph('住所：'), paragraph('チェックイン・アウト：'), paragraph('料金・予約番号：')],
  activities: [check('候補を追加する'), paragraph('日時・集合場所：'), paragraph('料金・予約：')],
  food: [check('行きたい店を追加する'), paragraph('場所・営業時間：'), paragraph('予約：')],
  budget: [
    { type: 'table', content: { type: 'tableContent', rows: [
      { cells: [['項目'], ['予定'], ['実績']] },
      { cells: [['交通'], ['¥0'], ['¥0']] },
      { cells: [['宿泊'], ['¥0'], ['¥0']] },
      { cells: [['体験・食事'], ['¥0'], ['¥0']] },
    ] } },
  ],
  packing: [check('身分証・予約情報'), check('衣類'), check('充電器'), check('天候に合わせた装備')],
  links: [bullet('参考リンクを貼る')],
};

export function createTemplateDocument(title, selectedIds) {
  const selected = templateOptions.filter((option) => selectedIds.includes(option.id));
  return [
    { type: 'heading', props: { level: 1 }, content: title.trim() || '新しい旅の計画' },
    paragraph('候補も迷いも、ここにそのまま書いてください。選んだ文章は旅程へ追加できます。'),
    ...selected.map((option) => ({
      type: 'heading',
      props: { level: 2, isToggleable: true },
      content: option.label,
      children: sectionContent[option.id] || [paragraph()],
    })),
  ];
}

export function isEmptyDocument(document) {
  if (!Array.isArray(document) || document.length === 0) return true;
  if (document.length > 1) return false;
  const block = document[0];
  const text = Array.isArray(block.content)
    ? block.content.map((item) => item.text || '').join('')
    : typeof block.content === 'string' ? block.content : '';
  return !text.trim() && !(block.children?.length);
}

