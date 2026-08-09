const cleanLine = (line) => line
  .replace(/^\s{0,3}#{1,6}\s*/, '')
  .replace(/^\s*[-*+]\s+(?:\[[ xX]\]\s*)?/, '')
  .replace(/^\s*\d+[.)]\s+/, '')
  .replace(/[*_`~]/g, '')
  .trim();

const dateParts = (text) => {
  const full = text.match(/\b(20\d{2})[\/.\-年](\d{1,2})[\/.\-月](\d{1,2})日?\b/);
  if (full) return { year: Number(full[1]), month: Number(full[2]), day: Number(full[3]) };
  const short = text.match(/(?:^|\s)(\d{1,2})[\/月](\d{1,2})日?(?:\s|$)/m);
  return short ? { month: Number(short[1]), day: Number(short[2]) } : null;
};

export function findMatchingDay(trip, parts) {
  if (!trip?.days?.length || !parts) return trip?.days?.[0]?.id || '';
  const match = trip.days.find((day) => {
    const [year, month, date] = day.date.split('-').map(Number);
    return month === parts.month && date === parts.day && (!parts.year || year === parts.year);
  });
  return match?.id || trip.days[0].id;
}

export function extractItineraryDraft(text, trip) {
  const normalized = text.replace(/\r/g, '').trim();
  const lines = normalized.split('\n').map(cleanLine).filter(Boolean);
  const timeMatch = normalized.match(/(?:^|\s)([01]?\d|2[0-3]):([0-5]\d)(?:\s|$)/);
  const time = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : '';
  const price = normalized.match(/(?:[¥￥]\s?[\d,]+|[\d,]+\s?(?:円|JPY))/i)?.[0] || '';
  const labelledLocation = normalized.match(/(?:場所|住所|会場|宿泊先?|集合場所)\s*[:：]\s*([^\n]+)/)?.[1]?.trim();
  const arrowLocation = lines.find((line) => line.includes('→'))?.split('→').at(-1)?.trim();
  const titleLine = lines.find((line) => !/^(日時?|場所|住所|会場|料金|価格|備考|メモ|予約)/.test(line)) || '新しい予定';
  const title = titleLine
    .replace(/\b20\d{2}[\/.\-年]\d{1,2}[\/.\-月]\d{1,2}日?/, '')
    .replace(/(?:^|\s)\d{1,2}[\/月]\d{1,2}日?(?=\s|$)/, ' ')
    .replace(/(?:^|\s)(?:[01]?\d|2[0-3]):[0-5]\d(?=\s|$)/, ' ')
    .replace(/\s+/g, ' ')
    .trim() || '新しい予定';
  const parts = dateParts(normalized);
  return {
    title: title.slice(0, 100),
    time,
    location: labelledLocation || arrowLocation || '',
    price,
    notes: normalized,
    dateParts: parts,
    dayId: findMatchingDay(trip, parts),
  };
}
