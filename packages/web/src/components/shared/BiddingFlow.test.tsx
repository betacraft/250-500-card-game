import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BiddingFlow } from './BiddingFlow';
import type { Player } from '@250-500/shared';

const PLAYERS_6: Player[] = Array.from({ length: 6 }, (_, i) => ({
  id: `p${i + 1}`,
  name: `Player ${i + 1}`,
  seat: i + 1,
}));

describe('BiddingFlow', () => {
  it('shows current bidder name and "no bids yet" before any bids', () => {
    render(
      <BiddingFlow
        players={PLAYERS_6}
        gameType="250"
        firstBidderId="p1"
        bidHistory={[]}
        onBid={() => {}}
        onPass={() => {}}
        onAuctionClose={() => {}}
      />,
    );
    expect(screen.getByText(/no bids yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Player 1/)).toBeInTheDocument();
  });

  it('clicking Bid calls onBid with current bidder + amount', async () => {
    const onBid = vi.fn();
    render(
      <BiddingFlow
        players={PLAYERS_6}
        gameType="250"
        firstBidderId="p1"
        bidHistory={[]}
        onBid={onBid}
        onPass={() => {}}
        onAuctionClose={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^bid 160$/i }));
    expect(onBid).toHaveBeenCalledWith('p1', 160);
  });

  it('clicking Pass calls onPass with current bidder', async () => {
    const onPass = vi.fn();
    render(
      <BiddingFlow
        players={PLAYERS_6}
        gameType="250"
        firstBidderId="p1"
        bidHistory={[]}
        onBid={() => {}}
        onPass={onPass}
        onAuctionClose={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^pass$/i }));
    expect(onPass).toHaveBeenCalledWith('p1');
  });

  it('shows auction-closed view with winner when 5 of 6 have passed', () => {
    const history = [
      { playerId: 'p1', action: 'bid' as const, amount: 175 },
      { playerId: 'p2', action: 'pass' as const },
      { playerId: 'p3', action: 'pass' as const },
      { playerId: 'p4', action: 'pass' as const },
      { playerId: 'p5', action: 'pass' as const },
      { playerId: 'p6', action: 'pass' as const },
    ];
    render(
      <BiddingFlow
        players={PLAYERS_6}
        gameType="250"
        firstBidderId="p1"
        bidHistory={history}
        onBid={() => {}}
        onPass={() => {}}
        onAuctionClose={() => {}}
      />,
    );
    expect(screen.getByText(/bidding closed/i)).toBeInTheDocument();
    expect(screen.getByText(/won the bid at 175/i)).toBeInTheDocument();
  });

  it('shows bid history as it accumulates', () => {
    const history = [
      { playerId: 'p1', action: 'bid' as const, amount: 165 },
      { playerId: 'p2', action: 'pass' as const },
    ];
    render(
      <BiddingFlow
        players={PLAYERS_6}
        gameType="250"
        firstBidderId="p1"
        bidHistory={history}
        onBid={() => {}}
        onPass={() => {}}
        onAuctionClose={() => {}}
      />,
    );
    expect(screen.getAllByText('165').length).toBeGreaterThan(0);
    expect(screen.getByText(/passed/i)).toBeInTheDocument();
  });

  it('plus/minus buttons adjust the draft amount in increments of 5', async () => {
    render(
      <BiddingFlow
        players={PLAYERS_6}
        gameType="250"
        firstBidderId="p1"
        bidHistory={[]}
        onBid={() => {}}
        onPass={() => {}}
        onAuctionClose={() => {}}
      />,
    );
    expect(screen.getByText('160')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /increase bid by 5/i }));
    expect(screen.getAllByText('165').length).toBeGreaterThan(0);
  });
});
