import type { ExpressionToken, TokenFeedback } from "../../lib/basicOps/expression";

type AttemptTilesProps = {
  tokens: ExpressionToken[];
  feedback?: TokenFeedback[];
};

export function AttemptTiles({ tokens, feedback }: AttemptTilesProps) {
  if (!tokens.length) return null;
  return (
    <span className="bo-tiles" aria-hidden="true">
      {tokens.map((token, index) => (
        <span className={`bo-tile ${feedback ? `is-${feedback[index]}` : ""}`} key={`${token.text}-${index}`}>
          {token.text}
        </span>
      ))}
    </span>
  );
}

export function TokenLegend() {
  return (
    <div className="bo-token-legend" aria-label="Token feedback legend">
      <span><i className="is-green" /> RIGHT PLACE</span>
      <span><i className="is-yellow" /> IN THE PATTERN</span>
      <span><i className="is-dark" /> NOT USED</span>
    </div>
  );
}
