/** Keep the complete marker, including its stroke, within a square SVG viewport. */
export function cycleRingGeometry(currentDay: number, cycleLength: number, size = 220, requestedStroke = 16) {
  const safeSize = Number.isFinite(size) ? Math.max(80, size) : 220;
  const length = Number.isFinite(cycleLength) ? Math.max(1, Math.round(cycleLength)) : 28;
  const day = Number.isFinite(currentDay) ? ((Math.round(currentDay) - 1) % length + length) % length + 1 : 1;
  const strokeWidth = Number.isFinite(requestedStroke) ? Math.min(safeSize / 10, Math.max(2, requestedStroke)) : 16;
  const markerStroke = 2;
  const markerRadius = strokeWidth / 2 + 2;
  const center = safeSize / 2;
  const radius = center - markerRadius - markerStroke / 2 - 2;
  const angle = (day - 1) / length * Math.PI * 2 - Math.PI / 2;
  return { size: safeSize, day, length, strokeWidth, markerStroke, markerRadius, center, radius,
    circumference: Math.PI * 2 * radius, cx: center + radius * Math.cos(angle), cy: center + radius * Math.sin(angle) };
}
