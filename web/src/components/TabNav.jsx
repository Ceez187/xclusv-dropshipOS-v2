export default function TabNav({ tabs, active, onChange }) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 px-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
            active === tab.id
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
