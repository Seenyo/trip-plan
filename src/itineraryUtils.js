export const sortActivitiesByTime = (activities) => activities
  .map((activity, index) => ({ activity, index }))
  .sort((a, b) => {
    const aTime = a.activity.time || '99:99';
    const bTime = b.activity.time || '99:99';
    return aTime.localeCompare(bTime) || a.index - b.index;
  })
  .map(({ activity }) => activity);

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
