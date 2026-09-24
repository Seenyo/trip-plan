const literal = (point) => ({
  lat: typeof point?.lat === 'function' ? point.lat() : point?.lat,
  lng: typeof point?.lng === 'function' ? point.lng() : point?.lng,
});

const cell = ({ lat, lng }) => `${lat.toFixed(4)},${lng.toFixed(4)}`;

const segmentCells = (startPoint, endPoint) => {
  const start = literal(startPoint);
  const end = literal(endPoint);
  if (![start.lat, start.lng, end.lat, end.lng].every(Number.isFinite)) return [];
  const steps = Math.min(250, Math.max(1, Math.ceil(Math.max(
    Math.abs(end.lat - start.lat), Math.abs(end.lng - start.lng),
  ) * 10000)));
  return [...new Set(Array.from({ length: steps + 1 }, (_, index) => {
    const ratio = index / steps;
    return cell({
      lat: start.lat + ((end.lat - start.lat) * ratio),
      lng: start.lng + ((end.lng - start.lng) * ratio),
    });
  }))];
};

export function splitOverlappingRouteLegs(legs) {
  const ownersByCell = new Map();
  const legSegments = legs.map((leg, legIndex) => (leg.path || []).slice(0, -1).map((point, segmentIndex) => {
    const cells = segmentCells(point, leg.path[segmentIndex + 1]);
    cells.forEach((key) => {
      if (!ownersByCell.has(key)) ownersByCell.set(key, new Set());
      ownersByCell.get(key).add(legIndex);
    });
    return { start: point, end: leg.path[segmentIndex + 1], cells };
  }));

  return legs.flatMap((leg, legIndex) => {
    const chunks = [];
    legSegments[legIndex].forEach((segment) => {
      const sharedCells = segment.cells.filter((key) => (ownersByCell.get(key)?.size || 0) > 1);
      const isShared = sharedCells.length >= Math.max(2, Math.ceil(segment.cells.length * 0.5));
      const owners = [...new Set(sharedCells.flatMap((key) => [...(ownersByCell.get(key) || [])]))].sort((a, b) => a - b);
      const sharedOwners = isShared ? owners : [legIndex];
      const signature = sharedOwners.join(',');
      const previous = chunks.at(-1);
      if (previous?.signature === signature) previous.path.push(segment.end);
      else chunks.push({
        ...leg,
        path: [segment.start, segment.end],
        shared: sharedOwners.length > 1,
        sharedCount: sharedOwners.length,
        sharedIndex: sharedOwners.indexOf(legIndex),
        signature,
      });
    });
    return chunks;
  });
}

export function routeLegsForDisplay(routeStops, routes, fallbackDestinationIndexes, colorForIndex) {
  const aggregateRoute = routes[0];
  const canUseIndividualLegs = fallbackDestinationIndexes.length === 0
    && routes.length === 1
    && aggregateRoute?.legs?.length
    && aggregateRoute.legs.every((leg) => leg.path?.length);
  if (canUseIndividualLegs) {
    return aggregateRoute.legs.map((leg, index) => ({
      id: routeStops[index + 1]?.id || `leg-${index}`,
      path: leg.path,
      destinationIndex: index + 1,
      color: colorForIndex(routeStops[index + 1]?.activityIndex ?? index),
    }));
  }
  return routes.map((route, index) => {
    const destinationIndex = fallbackDestinationIndexes[index] ?? index + 1;
    return {
      id: routeStops[destinationIndex]?.id || `leg-${index}`,
      path: route.path,
      destinationIndex,
      color: colorForIndex(routeStops[destinationIndex]?.activityIndex ?? destinationIndex),
    };
  });
}
