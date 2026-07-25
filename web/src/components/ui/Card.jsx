export default function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`rounded-lg border border-brand-border bg-brand-surface p-4 shadow-sm shadow-black/30 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
