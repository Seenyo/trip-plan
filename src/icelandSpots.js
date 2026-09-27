// Display-only names for the current Iceland itinerary. Keep the saved title untouched:
// it is also used by search, editing, and synced trip data. An expected title prevents
// stale metadata from appearing if a traveller renames a stop.
const spots = {
  'iceland-kef-arrival': ['ケプラヴィーク国際空港に到着', 'ケプラヴィーク', 'Keflavíkurflugvöllur', 'Keflavík International Airport'],
  'iceland-car-return': ['レンタカー返却', 'ケプラヴィーク', 'Keflavíkurflugvöllur'],
  'iceland-kef-departure': ['ケプラヴィーク国際空港を出発', 'ケプラヴィーク', 'Keflavíkurflugvöllur'],
  'd44a92e7-1f92-4d61-97e6-4aaf41da4eb8': ['ケリズ湖', 'ケリズ', 'Kerið', 'Kerið crater Iceland'],
  '480b2148-e796-46b2-9cb4-c45d9bfce67c': ['シンクヴェリトル', 'シンクヴェトリル', 'Þingvellir', 'Þingvellir National Park'],
  'e86916cc-c840-451f-b77f-7aea6e57ddcb': ['Caves of Laugarvatn', 'ロイガルヴァトンスヘットリル', 'Laugarvatnshellir', 'Caves of Laugarvatn'],
  'e3adce14-46b8-477c-bd7d-f6185fcb9934': ['Brúarfoss', 'ブルアゥルフォス', 'Brúarfoss', 'Brúarfoss'],
  '3e874498-9efc-4ac8-bd5d-9466d56fb030': ['ストロックル間欠泉、ゲイシール地熱地帯', 'ストロックル／ゲイシール', 'Strokkur / Geysir', 'Strokkur Geysir'],
  'f9f6b5c6-4f80-4a59-a80c-bc5d65d0419b': ['Flúða Bakarí', 'フルーダ・バカリ', 'Flúða Bakarí', 'Flúða Bakarí'],
  'iceland-efra-sel': ['Efra-Sel Hostel', 'エフラ・セル', 'Efra-Sel Hostel', 'Efra-Sel Hostel'],
  'b248cdcd-99e5-4182-a5e2-6adc1407c4da': ['Drangurinn í Drangshlíð 2', 'ドランギュリン', 'Drangurinn í Drangshlíð', 'Drangurinn í Drangshlíð'],
  '688dc919-b73f-4057-b625-8017d9a9d05c': ['Drangshlíð 2', 'ドランスフリズ', 'Drangshlíð', 'Drangshlíð 2'],
  'bd922a9d-5868-4564-9fa5-5d063c510489': ['Restaurant Suður-Vík', 'スズル・ヴィーク', 'Suður-Vík', 'Restaurant Suður-Vík'],
  'f344c295-3144-45ff-9ac0-00deea67277c': ['Gljúfrabúi', 'グリューブラブーイ', 'Gljúfrabúi', 'Gljúfrabúi'],
  'iceland-seljalandsfoss': ['セリャラントスフォス', 'セリャラントスフォス', 'Seljalandsfoss', 'Seljalandsfoss'],
  'iceland-skogafoss': ['スコゥガフォスの滝', 'スコゥガフォス', 'Skógafoss', 'Skógafoss'],
  '77a03a80-940d-4889-bbe4-b3e3aa9a3771': ['Krónan Vík', 'クローナン・ヴィーク', 'Krónan Vík', 'Krónan Vík'],
  'c8681d4e-7651-4b85-ae2e-9a88545b5554': ['Smiðjan Brugghús', 'スミジャン・ブルッグフース', 'Smiðjan Brugghús', 'Smiðjan Brugghús'],
  'iceland-reynisfjara': ['レイニスフィヤラ', 'レイニスフィヤラ', 'Reynisfjara', 'Reynisfjara Black Sand Beach'],
  'iceland-vik-shopping': ['ヴィーク観光＆買い出し', 'ヴィーク', 'Vík í Mýrdal', 'Vík í Mýrdal'],
  'iceland-vik-stay': ['1908 Hostel by Tröll', '1908 ホステル・バイ・トロットル', '1908 Hostel by Tröll', '1908 Hostel by Tröll'],
  'iceland-katla-tour': ['カトラ火山体験ツアー', 'カトラ', 'Katla'],
  '9636cb4c-7d52-4e73-9e09-d908215815ef': ['かわいい赤い教会', 'ヴィークルキルキャ', 'Víkurkirkja', 'Víkurkirkja'],
  '3002f2b4-bd7d-4505-ad16-10078cf9f0a7': ['PRWR+76M', 'エルドフロイン', 'Eldhraun', 'Gönguleið um Eldhraun'],
  '363ad937-f0e8-423b-b1d8-285be160dc6a': ['Fossálar Waterfall', 'フォッサゥラル', 'Fossálar', 'Fossálar Waterfall'],
  'bb7b31f5-5937-46e7-a265-d2f8983d0af0': ['Tjaldsvæðið í Svínafelli', 'スヴィナフェットル', 'Svínafell', 'Tjaldsvæðið í Svínafelli'],
  'f1293f22-9bac-4206-b0f4-cc93d4fdd23e': ['渓谷', 'ムーラグリューフル', 'Múlagljúfur', 'Múlagljúfur Canyon'],
  '9934f97e-62da-4f16-ae6a-5b7e216c19fd': ['スヴァルティスフォス(柱状黒い滝)', 'スヴァルティフォス', 'Svartifoss', 'Svartifoss'],
  'iceland-hali-stay': ['Skyrhúsið Guesthouse', 'スキールフーシズ', 'Skyrhúsið Guesthouse', 'Skyrhúsið Guesthouse'],
  'iceland-vatnajokull': ['ヴァトナヨークトル国立公園・氷河湖へ移動', 'ヨークルスアゥルロゥン', 'Jökulsárlón', 'Jökulsárlón'],
  'iceland-diamond-beach': ['ダイヤモンドビーチ', 'ブレイザメルクルサンドゥル', 'Breiðamerkursandur', 'Diamond Beach Iceland'],
  'iceland-ice-cave': ['アイスケーヴツアー', 'ヨークルスアゥルロゥン', 'Jökulsárlón', 'Jökulsárlón'],
  'iceland-zodiac': ['ゾディアックボートツアー', 'ヨークルスアゥルロゥン', 'Jökulsárlón', 'Jökulsárlón'],
  'iceland-hofn-stay': ['Central Stay Höfn', 'ヘプン', 'Central Stay Höfn', 'Central Stay Höfn'],
  '1b22f19c-5967-47f3-9a35-853e296fcac0': ['朝ごはん？シナモンロールが人気', 'リョースディース', 'Ljósdís Kaffihús & Bakarí', 'Ljósdís Kaffihús & Bakarí'],
  '603f9856-0845-454a-be34-7c7a9092636d': ['ストックスネス', 'ストックスネス', 'Stokksnes', 'Stokksnes'],
  '66c406ce-eed8-40cb-9729-7a4a73f30116': ['Parking ベストラホルン', 'ヴェストラホルン', 'Vestrahorn', 'Vestrahorn'],
  'd67f690f-a04d-49aa-bae1-6960b67755b7': ['赤い椅子', 'レッド・チェア', 'Red Chair', 'Red Chair Iceland'],
  '4816cf80-30dd-4a36-b046-6fced2d2bb3e': ['オレンジの建物', 'クヴァルネスヴィティ', 'Hvalnesviti', 'Hvalnes Lighthouse'],
  'iceland-borgarfjordur-stay': ['Blábjörg Resort', 'ブラゥビョルグ', 'Blábjörg Resort', 'Blábjörg Resort'],
  'iceland-egilsstadir': ['東フィヨルドへ移動', 'エイイルススタジル', 'Egilsstaðir'],
  '7db3f26d-bc64-4027-950a-63a9b443dac7': ['渓谷', 'ストゥズラギル', 'Stuðlagil', 'Stuðlagil Canyon'],
  '6d56d69d-7957-4c28-892d-9984b1899c77': ['デティフォス(北の豪爆)', 'デティフォス', 'Dettifoss', 'Dettifoss'],
  'c87a0a75-f1af-445a-aa04-48b18ad5bb21': ['地熱熱帯(ハエぶんぶん)', 'クヴェーリル', 'Hverir', 'Hverir Geothermal Area'],
  'de0cd536-2f11-4441-a4a4-6bb4119c6b8f': ['ディムボルギルの溶岩柱', 'ディムボルギル', 'Dimmuborgir', 'Dimmuborgir'],
  '0f6f9caa-4317-41f2-b002-0865daacca7d': ['ミーヴァトン湖', 'ミーヴァトン', 'Mývatn', 'Lake Mývatn'],
  'iceland-skulagardur-stay': ['Skúlagarður Country Hotel', 'スクーラガルズル', 'Skúlagarður Country Hotel', 'Skúlagarður Country Hotel'],
  '1493d140-1f3d-41d0-a53d-05b225ece37c': ['ゴーザフォス滝', 'ゴーザフォス', 'Goðafoss', 'Goðafoss'],
  'iceland-forest-lagoon': ['Forest Lagoonで温泉', 'フォレスト・ラグーン', 'Forest Lagoon', 'Forest Lagoon Akureyri'],
  'iceland-whale-watching': ['ホエールウォッチング', 'フーサヴィーク', 'Húsavík', 'Húsavík Harbour'],
  'iceland-akureyri-stay': ['Akureyri Hostel', 'アークレイリ・ホステル', 'Akureyri Hostel', 'Akureyri Hostel'],
  'iceland-leave-akureyri': ['アークレイリを出発', 'アークレイリ', 'Akureyri'],
  'b7b6faf3-5c23-411d-bc7f-7e4522bbf62a': ['フヴィートセルクルの奇岩', 'フヴィートセルクル', 'Hvítserkur', 'Hvítserkur'],
  'iceland-vidihlid-stay': ['Aurora Igloo North', 'オーロラ・イグルー・ノース', 'Aurora Igloo North', 'Aurora Igloo North'],
  'iceland-hvammstangi-tbd': ['自由時間（TBD）', 'クヴァンムスタンギ', 'Hvammstangi'],
  'e7a74ef4-1c57-4c58-99cd-e4ad117d33f5': ['グラゥブロゥク火口跡', 'グラゥブロゥク', 'Grábrók', 'Grábrók'],
  'iceland-reykjavik-stay-one': ['Guesthouse Pavi', 'ゲストハウス・パヴィ', 'Guesthouse Pavi', 'Guesthouse Pavi'],
  'iceland-reykjavik-drive': ['レイキャヴィークへ移動', 'レイキャヴィーク', 'Reykjavík'],
  'iceland-blue-lagoon': ['ブルーラグーン', 'ブルー・ラグーン', 'Bláa lónið', 'Blue Lagoon Iceland'],
  '01647b98-82c4-4560-b31f-47cae1b9bfec': ['ハットグリムス教会', 'ハットルグリムスキルキャ', 'Hallgrímskirkja', 'Hallgrímskirkja'],
  '70551a0d-e377-4fbd-b694-fd605c2ce9f8': ['ロイガヴェーグル大通り', 'ロイガヴェーグル', 'Laugavegur', 'Laugavegur Reykjavik'],
  'c5402f5a-7cee-42b6-8515-c61f47e04489': ['ソゥルファリズの彫刻', 'ソゥルファリズ', 'Sólfar', 'Sun Voyager Reykjavik'],
  'iceland-phallological-museum': ['アイスランドペニス博物館', 'ペニスサフニズ', 'Hið Íslenzka Reðasafn', 'Icelandic Phallological Museum'],
  'iceland-reykjavik-stay-two': ['Guesthouse Pavi（2泊目）', 'ゲストハウス・パヴィ', 'Guesthouse Pavi', 'Guesthouse Pavi'],
};

// The bundled itinerary predates edits made in the shared trip. Its Skaftafell
// stop is also at a different coordinate from the shared trip's glacier lagoon.
const bundledSpots = {
  'iceland-reynisfjara': ['ブラックサンドビーチ', 'レイニスフィヤラ', 'Reynisfjara', 'Reynisfjara Black Sand Beach'],
  'iceland-vatnajokull': ['ヴァトナヨークトル国立公園へ移動', 'ヴァトナヨークトル', 'Vatnajökull', 'Skaftafell Visitor Centre'],
};

export function icelandSpotMeta(item, tripId) {
  if (tripId !== 'iceland-ring-road-2026') return null;
  const current = spots[item?.id];
  const bundled = bundledSpots[item?.id];
  const [expectedTitle, kana, localName, photoQuery] = (item?.title === current?.[0] ? current : bundled) || [];
  return item?.title === expectedTitle ? { kana, localName, photoQuery } : null;
}
