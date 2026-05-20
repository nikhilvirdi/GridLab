import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GridCanvas } from './canvas/GridCanvas';

function App() {
  const [activeTab, setActiveTab] = useState<'visualizer' | 'documentation'>('visualizer');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  return (
    <div className={`h-screen overflow-hidden flex flex-col select-none transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#0d0d0d] text-white' : 'bg-[#e2e2e2] text-[#1a1a1a]'
    }`}>
      {/* Floating pill-shaped Navbar */}
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 p-1 rounded-xl font-sans text-[14px] select-none transition-all duration-300 ${
        theme === 'dark'
          ? 'bg-[#1a1a1a] border border-[rgba(255,255,255,0.2)]'
          : 'bg-[#d0d0d0] border border-[rgba(0,0,0,0.15)]'
      }`}>
        <button
          onClick={() => setActiveTab('visualizer')}
          className={`w-[130px] py-2 rounded-lg transition-all duration-200 font-medium text-center ${
            activeTab === 'visualizer'
              ? (theme === 'dark' ? 'bg-[#0a0a0a] text-white' : 'bg-[#e2e2e2] text-[#1a1a1a]')
              : (theme === 'dark' ? 'text-[#888888] hover:text-white' : 'text-[#666666] hover:text-[#1a1a1a]')
          }`}
        >
          Visualizer
        </button>
        <button
          onClick={() => setActiveTab('documentation')}
          className={`w-[130px] py-2 rounded-lg transition-all duration-200 font-medium text-center ${
            activeTab === 'documentation'
              ? (theme === 'dark' ? 'bg-[#0a0a0a] text-white' : 'bg-[#e2e2e2] text-[#1a1a1a]')
              : (theme === 'dark' ? 'text-[#888888] hover:text-white' : 'text-[#666666] hover:text-[#1a1a1a]')
          }`}
        >
          Documentation
        </button>
      </div>

      {/* Logo */}
      <img
        src={theme === 'dark' ? '/gridlab_logo.png' : '/gridlab_logo_lighttheme.png'}
        alt="GridLab"
        style={{ height: '40px', width: 'auto' }}
        className="fixed top-6 left-6"
      />

      {/* Theme Toggle Button */}
      <button
        onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        className={`fixed top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 active:scale-95 z-50 focus:outline-none ${
          theme === 'dark'
            ? 'bg-[#1a1a1a] border border-[rgba(255,255,255,0.2)] hover:bg-[#262626]'
            : 'bg-[#d0d0d0] border border-[rgba(0,0,0,0.15)] hover:bg-[#c8c8c8]'
        }`}
        aria-label="Toggle Theme"
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
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#1a1a1a]">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
              </svg>
            )}
          </motion.div>
        </AnimatePresence>
      </button>

      {/* Page content — sits below fixed navbar */}
      <div className="flex-1 pt-[70px] overflow-hidden">
        {activeTab === 'visualizer' ? (
          <div className="h-full w-full">
            <GridCanvas size={60} theme={theme} />
          </div>
        ) : (
          /* Empty placeholder for Documentation tab as instructed */
          <div className="h-full" />
        )}
      </div>
    </div>
  );
}

export default App;
