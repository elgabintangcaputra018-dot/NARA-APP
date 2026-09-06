export interface Point {
  x: number;
  y: number;
}

/**
 * Calculates the perpendicular distance from a point to a line segment.
 */
function getPerpendicularDistance(p: Point, p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  if (dx === 0 && dy === 0) {
    return Math.hypot(p.x - p1.x, p.y - p1.y);
  }

  const numerator = Math.abs(dy * p.x - dx * p.y + p2.x * p1.y - p2.y * p1.x);
  const denominator = Math.hypot(dx, dy);

  return numerator / denominator;
}

/**
 * Ramer-Douglas-Peucker algorithm to simplify a 2D polyline.
 * Reduces raw coordinates by up to 60-80% without visible loss of fidelity.
 */
export function douglasPeucker(points: Point[], epsilon = 1.5): Point[] {
  if (points.length <= 2) {
    return points;
  }

  let maxDistance = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = getPerpendicularDistance(points[i], points[0], points[end]);
    if (d > maxDistance) {
      maxDistance = d;
      index = i;
    }
  }

  if (maxDistance > epsilon) {
    const left = douglasPeucker(points.slice(0, index + 1), epsilon);
    const right = douglasPeucker(points.slice(index), epsilon);
    return left.slice(0, left.length - 1).concat(right);
  }

  return [points[0], points[end]];
}

/**
 * Converts an array of points into a simplified, smooth SVG path string.
 */
export function pointsToSvgPath(points: Point[], epsilon = 1.5): string {
  if (!points || points.length === 0) return "";
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} l 0.1 0.1`;
  }

  const simplified = douglasPeucker(points, epsilon);
  if (simplified.length === 2) {
    return `M ${simplified[0].x.toFixed(1)} ${simplified[0].y.toFixed(1)} L ${simplified[1].x.toFixed(1)} ${simplified[1].y.toFixed(1)}`;
  }

  let d = `M ${simplified[0].x.toFixed(1)} ${simplified[0].y.toFixed(1)}`;

  for (let i = 1; i < simplified.length - 1; i++) {
    const p0 = simplified[i];
    const p1 = simplified[i + 1];
    const midX = ((p0.x + p1.x) / 2).toFixed(1);
    const midY = ((p0.y + p1.y) / 2).toFixed(1);
    d += ` Q ${p0.x.toFixed(1)} ${p0.y.toFixed(1)}, ${midX} ${midY}`;
  }

  const last = simplified[simplified.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;

  return d;
}

/**
 * Generates an SVG path string for an ellipse/circle.
 */
export function circleToSvgPath(x1: number, y1: number, x2: number, y2: number): string {
  const rx = Math.abs(x2 - x1) / 2;
  const ry = Math.abs(y2 - y1) / 2;
  const cx = Math.min(x1, x2) + rx;
  const cy = Math.min(y1, y2) + ry;

  if (rx <= 0.5 || ry <= 0.5) return "";

  // Draw ellipse with two SVG arc commands
  return `M ${(cx - rx).toFixed(1)} ${cy.toFixed(1)} ` +
    `a ${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 0 ${(rx * 2).toFixed(1)} 0 ` +
    `a ${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 0 ${(-rx * 2).toFixed(1)} 0 Z`;
}

/**
 * Generates an SVG path string for an arrow from (x1, y1) to (x2, y2).
 */
export function arrowToSvgPath(x1: number, y1: number, x2: number, y2: number, strokeWidth = 3): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);
  const headLength = Math.max(12, strokeWidth * 3.5);

  const arrowAngle = Math.PI / 6; // 30 degrees
  const leftX = x2 - headLength * Math.cos(angle - arrowAngle);
  const leftY = y2 - headLength * Math.sin(angle - arrowAngle);
  const rightX = x2 - headLength * Math.cos(angle + arrowAngle);
  const rightY = y2 - headLength * Math.sin(angle + arrowAngle);

  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} ` +
    `M ${leftX.toFixed(1)} ${leftY.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} L ${rightX.toFixed(1)} ${rightY.toFixed(1)}`;
}
