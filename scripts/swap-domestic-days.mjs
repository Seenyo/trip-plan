export const DOMESTIC_TRIP_ID = 'silver-week-oki-chugoku-2026';
export const TO_SEPTEMBER_21 = [
  '29474892-b6dd-478b-aa0a-721a1a0f1c9b',
  '339e8ef7-3028-4e2d-8857-5048b8e77871',
  'ee0a3796-1c35-4649-9c6b-fd71302f9924',
];
export const TO_SEPTEMBER_20 = [
  '1ee2d5ed-d9c8-4f67-89b4-63ba1123cdca',
  'd441fbde-92aa-4c7f-a51d-2babe3e17bd9',
  '75d7b88f-7dd1-45a3-8541-d679671e4792',
];

const orderedSelection = (activities, ids) => ids.map((id) => activities.find((activity) => activity.id === id));

export function swapDomesticActivities(trip) {
  if (trip.id !== DOMESTIC_TRIP_ID) return trip;
  const september20 = trip.days.find((day) => day.date === '2026-09-20');
  const september21 = trip.days.find((day) => day.date === '2026-09-21');
  if (!september20 || !september21) throw new Error('9月20日または21日の予定が見つかりません。');
  const everyActivity = [...september20.activities, ...september21.activities];
  const allMovedIds = [...TO_SEPTEMBER_21, ...TO_SEPTEMBER_20];
  const missing = allMovedIds.filter((id) => !everyActivity.some((activity) => activity.id === id));
  if (missing.length) throw new Error(`移動する予定が見つかりません: ${missing.join(', ')}`);
  const alreadySwapped = TO_SEPTEMBER_20.every((id) => september20.activities.some((a) => a.id === id))
    && TO_SEPTEMBER_21.every((id) => september21.activities.some((a) => a.id === id));
  if (alreadySwapped) return trip;
  const removeMoved = (activities) => activities.filter((activity) => !allMovedIds.includes(activity.id));
  const insertBefore = (activities, additions, beforeId) => {
    const index = activities.findIndex((activity) => activity.id === beforeId);
    const result = [...activities];
    result.splice(index < 0 ? result.length : index, 0, ...additions);
    return result;
  };
  return {
    ...trip,
    days: trip.days.map((day) => {
      if (day.id === september20.id) return {
        ...day,
        title: '鳥取観光',
        note: '米子でレンタカーを受け取り、北栄・鳥取砂丘・浦富海岸を巡って宿へ。',
        activities: insertBefore(removeMoved(day.activities), orderedSelection(everyActivity, TO_SEPTEMBER_20), 'cf29e932-048c-4b5d-91c5-d50cba7d3336'),
      };
      if (day.id === september21.id) return {
        ...day,
        title: '出雲観光から境港へ',
        note: '稲佐の浜・出雲大社・日御碕灯台を巡り、レンタカーを返却して境港方面へ。',
        activities: insertBefore(removeMoved(day.activities), orderedSelection(everyActivity, TO_SEPTEMBER_21), 'domestic-car-return'),
      };
      return day;
    }),
  };
}
