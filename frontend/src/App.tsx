import { GridCanvas } from './canvas/GridCanvas';

function App() {
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col justify-center items-center p-6 select-none relative">
      {/* Logo */}
      <img
        src="/gridlab_logo.png"
        alt="GridLab"
        style={{ height: '40px', width: 'auto' }}
        className="fixed top-6 left-6"
      />
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
    </div>
  );
}

export default App;
