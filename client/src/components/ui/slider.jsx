export function Slider({ value = 0, min = 0, max = 3, step = 0.25, color = '#ff8c2a', onChange, ...props }) {
  const progress = `${Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))}%`;

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange?.(Number(event.target.value))}
      className="range-input"
      style={{ '--range-color': color, '--range-value': progress }}
      {...props}
    />
  );
}
