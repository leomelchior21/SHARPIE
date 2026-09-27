import { formatBossNumber } from "../lib/bossTestRunner";

type PythagoreanDiagramProps = {
  a: number | null;
  b: number | null;
  c: number | null;
  revealed: boolean;
};

const ORIGIN_X = 56;
const ORIGIN_Y = 138;
const MAX_LEG_A = 116;
const MAX_LEG_B = 96;
const MIN_LEG = 34;

export function PythagoreanDiagram({ a, b, c, revealed }: PythagoreanDiagramProps) {
  const aValue = a ?? 3;
  const bValue = b ?? 4;
  const scale = Math.max(aValue, bValue, 0.0001);
  const legA = Math.max(MIN_LEG, Math.min(MAX_LEG_A, (aValue / scale) * MAX_LEG_A));
  const legB = Math.max(MIN_LEG, Math.min(MAX_LEG_B, (bValue / scale) * MAX_LEG_B));

  const cornerX = ORIGIN_X + legA;
  const cornerY = ORIGIN_Y;
  const topY = ORIGIN_Y - legB;
  const rightAngleSize = 10;

  return (
    <figure className={`pythagorean-diagram ${revealed ? "is-revealed" : ""}`}>
      <svg viewBox="0 0 240 178" role="img" aria-label="Right triangle with sides a, b, and hypotenuse c">
        <line className="triangle-edge edge-a" x1={ORIGIN_X} y1={ORIGIN_Y} x2={cornerX} y2={cornerY} />
        <line className="triangle-edge edge-b" x1={cornerX} y1={cornerY} x2={cornerX} y2={topY} />
        <line className="triangle-edge edge-c" x1={ORIGIN_X} y1={ORIGIN_Y} x2={cornerX} y2={topY} />
        <polyline
          className="triangle-right-angle"
          points={`${cornerX - rightAngleSize},${cornerY} ${cornerX - rightAngleSize},${cornerY - rightAngleSize} ${cornerX},${cornerY - rightAngleSize}`}
        />
        <text className="triangle-letter letter-a" x={ORIGIN_X + legA / 2} y={ORIGIN_Y + 17} textAnchor="middle">a</text>
        <text className="triangle-letter letter-b" x={cornerX + 13} y={ORIGIN_Y - legB / 2} textAnchor="middle">b</text>
        <text className="triangle-letter letter-c" x={ORIGIN_X + legA / 2 - 12} y={ORIGIN_Y - legB / 2 - 6} textAnchor="middle">c</text>
        <text className="triangle-value value-a" x={ORIGIN_X + legA / 2} y={ORIGIN_Y + 31} textAnchor="middle">
          {a === null ? "" : formatBossNumber(a)}
        </text>
        <text className="triangle-value value-b" x={cornerX + 13} y={ORIGIN_Y - legB / 2 + 15} textAnchor="middle">
          {b === null ? "" : formatBossNumber(b)}
        </text>
        <text className="triangle-value value-c" x={ORIGIN_X + legA / 2 - 12} y={ORIGIN_Y - legB / 2 + 12} textAnchor="middle">
          {revealed && c !== null ? formatBossNumber(c) : a === null || b === null ? "" : "?"}
        </text>
      </svg>
      <figcaption>SQUARE BOTH SIDES <i /> ADD THEM <i /> FIND THE SQUARE ROOT</figcaption>
    </figure>
  );
}
