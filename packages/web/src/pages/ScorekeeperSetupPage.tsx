import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { type GameType, RULES_250, RULES_500 } from '@250-500/shared';
import { GameTypeCard } from '../components/scorekeeper/GameTypeCard';
import { TargetScoreSlider } from '../components/scorekeeper/TargetScoreSlider';
import { PlayerSetup } from '../components/scorekeeper/PlayerSetup';
import { useScorekeeperStore } from '../stores/scorekeeper-store';

/** Setup page: pick game type, target score, and enter player names. */
export function ScorekeeperSetupPage(): JSX.Element {
  const navigate = useNavigate();
  const initGame = useScorekeeperStore((s) => s.initGame);

  const [gameType, setGameType] = useState<GameType>('250');
  const [targetScore, setTargetScore] = useState(1000);
  const playerCount = gameType === '250' ? RULES_250.PLAYER_COUNT : RULES_500.PLAYER_COUNT;
  const [names, setNames] = useState<string[]>(() => Array.from({ length: 6 }, () => ''));

  const handleGameTypeChange = (next: GameType) => {
    setGameType(next);
    const nextCount = next === '250' ? RULES_250.PLAYER_COUNT : RULES_500.PLAYER_COUNT;
    setNames((prev) => {
      const out = prev.slice(0, nextCount);
      while (out.length < nextCount) out.push('');
      return out;
    });
  };

  const handleNameChange = (index: number, name: string) => {
    setNames((prev) => prev.map((n, i) => (i === index ? name : n)));
  };

  const allNamesFilled = names.length === playerCount && names.every((n) => n.trim().length > 0);

  const handleStart = () => {
    if (!allNamesFilled) return;
    initGame({
      gameType,
      targetScore,
      players: names.map((name, i) => ({
        id: `p${i + 1}`,
        name: name.trim(),
        seat: i + 1,
      })),
    });
    navigate('/scorekeeper/hand');
  };

  return (
    <main className="flex min-h-screen flex-col px-5 pb-24 pt-4">
      <header className="mb-6 flex items-center gap-2">
        <Link
          to="/"
          aria-label="Back to home"
          className="flex h-10 w-10 items-center justify-center rounded-full text-stone-700 active:bg-stone-200"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-xl font-medium">New game</h1>
      </header>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-medium text-stone-700">Game type</h2>
        <div className="grid grid-cols-2 gap-3">
          <GameTypeCard
            gameType="250"
            playerCount={RULES_250.PLAYER_COUNT}
            selected={gameType === '250'}
            onSelect={handleGameTypeChange}
          />
          <GameTypeCard
            gameType="500"
            playerCount={RULES_500.PLAYER_COUNT}
            selected={gameType === '500'}
            onSelect={handleGameTypeChange}
          />
        </div>
      </section>

      <section className="mb-6 rounded-xl bg-white p-4">
        <TargetScoreSlider value={targetScore} onChange={setTargetScore} />
      </section>

      <section className="mb-6 rounded-xl bg-white p-4">
        <PlayerSetup names={names} onChange={handleNameChange} />
      </section>

      <div
        className="fixed inset-x-0 bottom-0 bg-surface-warm/95 px-5 pb-6 pt-3 backdrop-blur"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        <button
          type="button"
          onClick={handleStart}
          disabled={!allNamesFilled}
          className="w-full rounded-xl bg-felt p-4 text-base font-medium text-white shadow-sm transition active:scale-95 active:bg-felt-dark disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
        >
          Start game
        </button>
      </div>
    </main>
  );
}
