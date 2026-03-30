export const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!value)}
    className={`relative w-10 h-5 rounded-full transition-colors ${value ? "bg-primary" : "bg-muted"}`}
  >
    <div
      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
        value ? "translate-x-[22px]" : "translate-x-0.5"
      }`}
    />
  </button>
);
