import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GridCanvas } from './canvas/GridCanvas';

function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const isDark = theme === 'dark';

  return (
    <div
      className="overflow-hidden select-none"
      style={{
        height: '100vh',
        backgroundColor: isDark ? '#000000' : '#f0f0f0',
        color: isDark ? '#ffffff' : '#000000',
      }}
    >
      {/* Logo — fixed top-left */}
      <img
        src={isDark ? '/gridlab_logo.png' : '/gridlab_logo_lighttheme.png'}
        alt="GridLab"
        className="fixed z-50"
        style={{ top: '24px', left: '32px', height: '56px', width: 'auto' }}
      />

      {/* Theme toggle — fixed top-right */}
      <button
        onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        aria-label="Toggle Theme"
        className="fixed z-50 flex items-center justify-center"
        style={{
          top: '24px',
          right: '32px',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          backgroundColor: isDark ? '#111111' : '#e0e0e0',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`,
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={theme}
            initial={{ opacity: 0, rotate: -45, scale: 0.8 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 45, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-center"
          >
            {isDark ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#000000"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            )}
          </motion.div>
        </AnimatePresence>
      </button>

      {/* Main content — two column layout */}
      <div
        style={{
          paddingTop: '56px',
          height: 'calc(100vh - 56px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
        }}
      >
        <GridCanvas size={60} theme={theme} />
      </div>
    </div>
  );
}

export default App;
