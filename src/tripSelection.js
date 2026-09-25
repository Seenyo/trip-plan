const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '');
const dayNumber = (value) => Date.parse(`${value}T00:00:00Z`) / 86400000;

export const localDateISO = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const tripEndDate = (trip) => [trip.endDate, ...(trip.days || []).map((day) => day.date)]
  .filter(validDate).sort().at(-1);

export const closestDayIndex = (trip, today) => {
  if (!trip.days?.length || tripEndDate(trip) < today) return 0;
  const target = dayNumber(today);
  return trip.days.reduce((best, day, index) => {
    if (!validDate(day.date)) return best;
    const distance = Math.abs(dayNumber(day.date) - target);
    const bestDate = trip.days[best.index]?.date;
    return distance < best.distance || (distance === best.distance && day.date >= today && bestDate < today)
      ? { index, distance } : best;
  }, { index: 0, distance: Infinity }).index;
};

export const selectDefaultTrip = (trips, today) => {
  const eligible = trips.filter((trip) => trip.days?.length && tripEndDate(trip) >= today)
    .sort((a, b) => {
      const aStart = validDate(a.startDate) ? a.startDate : a.days[0].date;
      const bStart = validDate(b.startDate) ? b.startDate : b.days[0].date;
      const aDistance = Math.max(0, dayNumber(aStart) - dayNumber(today));
      const bDistance = Math.max(0, dayNumber(bStart) - dayNumber(today));
      return aDistance - bDistance || bStart.localeCompare(aStart);
    });
  const trip = eligible[0];
  return trip ? { tripId: trip.id, dayIndex: closestDayIndex(trip, today) } : null;
};
