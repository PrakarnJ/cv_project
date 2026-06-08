export default function ProgressDots({ total, active }) {
  return (
    <div
      className="flex items-center gap-1"
      aria-label={`Lesson ${active} of ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={
            'inline-block h-2 w-2 rounded-full ' +
            (i < active ? 'bg-crt-accent' : 'bg-crt-border')
          }
        />
      ))}
    </div>
  )
}
