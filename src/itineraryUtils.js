export const sortActivitiesByTime = (activities) => activities
  .map((activity, index) => ({ activity, index }))
  .sort((a, b) => {
    const aTime = a.activity.time || '99:99';
    const bTime = b.activity.time || '99:99';
    return aTime.localeCompare(bTime) || a.index - b.index;
  })
  .map(({ activity }) => activity);

export const reorderActivitiesIntoTimeSlots = (activities, fromIndex, toIndex) => {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0
    || fromIndex >= activities.length || toIndex >= activities.length) return activities;
  const timeSlots = activities.map((activity) => activity.time);
  const reordered = [...activities];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  return reordered.map((activity, index) => ({ ...activity, time: timeSlots[index] }));
};

export const DEFAULT_ROUTE_COLOR = '#ffad42';
export const ROUTE_POINT_COLORS = [
  '#ffad42', '#4f9298', '#d8624b', '#7568b5',
  '#477daf', '#598961', '#a95c83', '#b47d2d',
];

export const routeColorForIndex = (index, varyByPoint = false) => varyByPoint
  ? ROUTE_POINT_COLORS[index % ROUTE_POINT_COLORS.length]
  : DEFAULT_ROUTE_COLOR;

export const formatTravelDuration = (durationMillis) => {
  const minutes = Math.max(1, Math.round(durationMillis / 60000));
  if (minutes < 60) return `${minutes}分`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}時間${remainder}分` : `${hours}時間`;
};

export const formatTravelDistance = (distanceMeters) => {
  if (!Number.isFinite(distanceMeters)) return '';
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(distanceMeters < 10000 ? 1 : 0)} km`;
};
