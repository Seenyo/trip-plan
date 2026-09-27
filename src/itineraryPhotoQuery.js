import { icelandSpotMeta } from './icelandSpots';

// Existing Oki/Chugoku stops whose names identify a real place. Descriptive
// travel tasks and provisional stops are omitted to avoid unrelated photos.
const okiPlaces = {
  '道の駅ほうじょう': '道の駅ほうじょう',
  '鳥取砂丘': '鳥取砂丘',
  '浦富海岸': '浦富海岸',
  '白兎神社': '白兎神社',
  '鳥取砂丘 砂の美術館': '砂の美術館 鳥取',
  '大山ベースキャンプハイカーズ宿泊': '大山ベースキャンプハイカーズ',
  '稲佐の浜': '稲佐の浜',
  '出雲大社': '出雲大社',
  '日御碕灯台': '出雲日御碕灯台',
  '米子ユニバーサルホテル宿泊': '米子ユニバーサルホテル',
  '玉若酢命神社': '玉若酢命神社',
  'トカゲ岩': 'トカゲ岩 隠岐',
  '白島展望台': '白島展望台',
  'ローソク展望台': 'ローソク島展望台',
  '油井の池': '油井の池',
  '壇鏡の滝': '壇鏡の滝',
  '屋那の松原': '屋那の松原',
  'ホテルB stone Garden': 'ホテルB stone Garden',
  '摩天崖': '摩天崖',
  '通天橋': '通天橋 隠岐',
  '鬼舞展望台': '鬼舞展望台',
  '隠岐シーサイドホテル鶴丸（予約済み）': '隠岐シーサイドホテル鶴丸',
};

export function itineraryPhotoQuery(item, tripId) {
  if (!item?.coords && !item?.placeId) return null;
  if (tripId === 'iceland-ring-road-2026') {
    return icelandSpotMeta(item, tripId)?.photoQuery || (item.placeId ? item.title : null);
  }
  if (tripId === 'silver-week-oki-chugoku-2026') {
    return okiPlaces[item.title] || (item.placeId ? item.title : null);
  }
  return item.placeId ? item.title : null;
}
