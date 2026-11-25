/** Result line on the scored hand. A last-trick lock uses the banner words and colour. */
export function RecapHeading({ made, lastTrick, reduced }: { made: boolean; lastTrick: boolean; reduced: boolean }): JSX.Element {
  if (!lastTrick) {
    return <h2 className="text-lg font-medium">{made ? 'Bid made' : 'Bid failed'}</h2>;
  }
  const color = made ? 'text-felt' : 'text-[#7A3E2E]';
  const motion = reduced ? '' : 'recap-title-pop';
  return (
    <h2 data-testid="recap-header" data-lock={made ? 'made' : 'sunk'} className={`inline-block origin-left text-lg font-medium ${color} ${motion}`}>
      {made ? 'Bid made!' : 'Bid sunk!'}
    </h2>
  );
}
