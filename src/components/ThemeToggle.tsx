import type { Theme } from '../hooks/useTheme';

interface Props {
  theme: Theme;
  onToggle: () => void;
  variant?: 'header' | 'login' | 'settings';
}

export default function ThemeToggle({ theme, onToggle, variant = 'header' }: Props) {
  const isDark = theme === 'dark';

  if (variant === 'settings') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-xl border border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{isDark ? '🌙' : '☀️'}</span>
            <div>
              <p className="text-white font-semibold text-sm">Tema de la aplicación</p>
              <p className="text-slate-400 text-xs">
                Actualmente en modo <span className="font-bold text-purple-400">{isDark ? 'Oscuro' : 'Claro'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            style={{
              background: isDark
                ? 'linear-gradient(180deg, #6d28d9 0%, #5b21b6 100%)'
                : 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)',
              boxShadow: isDark
                ? '0 0 12px rgba(109,40,217,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
                : '0 0 12px rgba(245,158,11,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
            }}
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-lg transform transition-transform duration-300 text-sm"
              style={{
                transform: isDark ? 'translateX(28px)' : 'translateX(4px)',
              }}
            >
              {isDark ? '🌙' : '☀️'}
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'login') {
    return (
      <button
        onClick={onToggle}
        className="fixed top-4 right-4 z-50 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 border shadow-lg hover:scale-110 active:scale-95"
        style={{
          background: isDark
            ? 'linear-gradient(180deg, #1a3a6e 0%, #142d54 100%)'
            : 'linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)',
          borderColor: isDark ? 'rgba(56, 120, 200, 0.2)' : 'rgba(245, 158, 11, 0.4)',
          boxShadow: isDark
            ? '0 4px 12px rgba(0,0,0,0.5), 0 0 16px rgba(59,130,246,0.1)'
            : '0 4px 12px rgba(0,0,0,0.1), 0 0 16px rgba(245,158,11,0.15)',
        }}
        title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        <span className="text-lg">{isDark ? '☀️' : '🌙'}</span>
      </button>
    );
  }

  // variant === 'header' (inline button for nav bar)
  return (
    <button
      onClick={onToggle}
      className="nav-btn-3d nav-btn-inactive flex items-center gap-1.5 px-3 py-2"
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      <span className="text-base">{isDark ? '☀️' : '🌙'}</span>
      <span className="text-xs font-semibold hidden sm:inline">{isDark ? 'Claro' : 'Oscuro'}</span>
    </button>
  );
}
