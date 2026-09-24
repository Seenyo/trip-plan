export const sortActivitiesByTime = (activities) => activities
  .map((activity, index) => ({ activity, index }))
  .sort((a, b) => {
    const aTime = a.activity.time || '99:99';
    const bTime = b.activity.time || '99:99';
    return aTime.localeCompare(bTime) || a.index - b.index;
  })
  .map(({ activity }) => activity);

export const sortTripsByStartDate = (trips) => trips
  .map((trip, index) => ({ trip, index }))
  .sort((a, b) => {
    const aDate = /^\d{4}-\d{2}-\d{2}$/.test(a.trip.startDate || '') ? a.trip.startDate : '9999-12-31';
    const bDate = /^\d{4}-\d{2}-\d{2}$/.test(b.trip.startDate || '') ? b.trip.startDate : '9999-12-31';
    return aDate.localeCompare(bDate) || a.index - b.index;
  })
  .map(({ trip }) => trip);

export const distanceKmBetween = (start, end) => {
  if (![start?.lat, start?.lng, end?.lat, end?.lng].every(Number.isFinite)) return Number.POSITIVE_INFINITY;
  const toRadians = (degrees) => degrees * (Math.PI / 180);
  const latitudeDelta = toRadians(end.lat - start.lat);
  const longitudeDelta = toRadians(end.lng - start.lng);
  const startLatitude = toRadians(start.lat);
  const endLatitude = toRadians(end.lat);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

export const previousDayRouteOrigin = (day, previousDay) => {
  if (!day || !previousDay || day.drivingFromPrevious === false) return null;
  const firstDestination = day.activities?.find((item) => item.coords && item.route !== false);
  const previousActivity = previousDay.activities?.filter((item) => item.coords && item.route !== false).at(-1);
  if (!firstDestination || !previousActivity) return null;
  return distanceKmBetween(previousActivity.coords, firstDestination.coords) < 900 ? previousActivity : null;
};

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
  '#ffad42', '#71c3c9', '#f47f68', '#a99ce3',
  '#75aee0', '#82b98a', '#d68bac', '#d8a657',
];

export const routeColorForIndex = (index, varyByPoint = false) => varyByPoint
  ? ROUTE_POINT_COLORS[index % ROUTE_POINT_COLORS.length]
  : DEFAULT_ROUTE_COLOR;

export const travelModeForActivity = (activity) => activity?.travelMode === 'WALKING' ? 'WALKING' : 'DRIVING';

export const travelTimesForRoutes = (stops, routes, fallbackDestinationIndexes, missingLegs) => {
  const travelTimes = Object.fromEntries(missingLegs.flatMap(({ destinationIndex, requestFailed }) => {
    const destination = stops[destinationIndex];
    return destination?.id ? [[destination.id, {
      unavailable: true,
      requestFailed,
      travelMode: destination.travelMode || 'DRIVING',
    }]] : [];
  }));
  const addTravelTime = (destinationIndex, durationMillis, distanceMeters) => {
    const destination = stops[destinationIndex];
    if (!destination?.id || !Number.isFinite(durationMillis)) return;
    travelTimes[destination.id] = {
      durationMillis,
      distanceMeters,
      fromPreviousDay: stops[destinationIndex - 1]?.fromPreviousDay || false,
      travelMode: destination.travelMode || 'DRIVING',
    };
  };
  if (fallbackDestinationIndexes.length === 0 && routes.length === 1 && routes[0].legs?.length) {
    routes[0].legs.forEach((leg, index) => addTravelTime(index + 1, leg.durationMillis, leg.distanceMeters));
  } else {
    routes.forEach((route, index) => addTravelTime(
      fallbackDestinationIndexes[index] ?? index + 1, route.durationMillis, route.distanceMeters,
    ));
  }
  return travelTimes;
};

const relativeLuminance = (hexColor) => {
  const channels = hexColor.match(/[\da-f]{2}/gi)?.map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  if (!channels || channels.length !== 3) return 0;
  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
};

const contrastRatio = (firstColor, secondColor) => {
  const lighter = Math.max(relativeLuminance(firstColor), relativeLuminance(secondColor));
  const darker = Math.min(relativeLuminance(firstColor), relativeLuminance(secondColor));
  return (lighter + 0.05) / (darker + 0.05);
};

export const routeTextColor = (backgroundColor) => {
  const darkText = '#303841';
  if (contrastRatio(backgroundColor, darkText) >= 4.5) return darkText;
  if (contrastRatio(backgroundColor, '#ffffff') >= 4.5) return '#ffffff';
  return '#000000';
};

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
