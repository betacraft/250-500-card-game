interface TargetScoreSliderProps {
  /** Current value */
  value: number;
  /** Called when the value changes */
  onChange: (value: number) => void;
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** Step (defaults to 50) */
  step?: number;
}

/** Slider for picking the target score that wins the game. */
export function TargetScoreSlider({
  value,
  onChange,
  min = 250,
  max = 2000,
  step = 50,
}: TargetScoreSliderProps): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor="target-score" className="text-sm font-medium text-stone-700">
          Target score
        </label>
        <span className="text-2xl font-medium tabular-nums">{value}</span>
      </div>
      <input
        id="target-score"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-felt"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
      <div className="flex justify-between text-xs text-stone-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
