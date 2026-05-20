import { useState } from 'react';
import { GridCanvas } from './canvas/GridCanvas';

function App() {
  const [activeTab, setActiveTab] = useState<'visualizer' | 'documentation'>('visualizer');

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col justify-center items-center p-6 select-none relative">
      {/* Floating pill-shaped Navbar */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 p-1 bg-[#1a1a1a] border border-[rgba(255,255,255,0.2)] rounded-xl font-sans text-[14px] select-none">
        <button
          onClick={() => setActiveTab('visualizer')}
          className={`w-[130px] py-2 rounded-lg transition-all duration-200 font-medium text-center ${
            activeTab === 'visualizer'
              ? 'bg-[#0a0a0a] text-white'
              : 'text-[#888888] hover:text-white'
          }`}
        >
          Visualizer
        </button>
        <button
          onClick={() => setActiveTab('documentation')}
          className={`w-[130px] py-2 rounded-lg transition-all duration-200 font-medium text-center ${
            activeTab === 'documentation'
              ? 'bg-[#0a0a0a] text-white'
              : 'text-[#888888] hover:text-white'
          }`}
        >
          Documentation
        </button>
      </div>

      {/* Logo */}
      <img
        src="/gridlab_logo.png"
        alt="GridLab"
        style={{ height: '40px', width: 'auto' }}
        className="fixed top-6 left-6"
      />

      {activeTab === 'visualizer' ? (
        <>
          {/* Title */}
          <header className="mb-8 text-center">
            <h1 className="text-2xl font-bold tracking-wider text-[#ffd700] uppercase font-mono">
              GRIDLAB
            </h1>
            <p className="text-xs text-gray-500 mt-1 uppercase font-mono tracking-widest">
              Base Grid Canvas Visualizer
            </p>
          </header>

          {/* Main Canvas Component Container */}
          <main className="w-full max-w-[600px] flex justify-center items-center">
            <GridCanvas size={60} />
          </main>

          {/* Footer */}
          <footer className="mt-8 text-[10px] text-gray-600 font-mono tracking-wider">
            GRID RES: 60x60 | WALL RATIO: ~30%
          </footer>
        </>
      ) : (
        /* Empty placeholder for Documentation tab as instructed */
        <div className="w-full max-w-[600px] h-[50vh]" />
      )}
    </div>
  );
}

export default App;
