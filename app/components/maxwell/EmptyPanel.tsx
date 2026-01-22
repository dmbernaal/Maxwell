import { PanelFrame } from './primitives/PanelFrame';

interface EmptyPanelProps {
  onGenerate?: () => void;
}

export function EmptyPanel({ onGenerate }: EmptyPanelProps) {
  return (
    <PanelFrame>
      <div className="text-center py-12">
        <div className="font-mono text-4xl text-cyan-500 mb-6">
          {'┌─────────────┐'}
          <br />
          {'│  ⚡ MAXWELL │'}
          <br />
          {'│  ▁▂▃▄▅▆▇█  │'}
          <br />
          {'└─────────────┘'}
        </div>

        <h3 className="text-lg font-semibold text-white mb-2">
          No analysis available
        </h3>
        <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
          Generate an intelligence report to see Maxwell's analysis of this market.
        </p>

        {onGenerate && (
          <button
            onClick={onGenerate}
            className="font-mono text-sm bg-cyan-500/20 hover:bg-cyan-500/30
                       text-cyan-400 px-6 py-3 rounded-sm
                       transition-all-200"
            aria-label="Generate analysis"
          >
            [Generate Analysis] (Enter)
          </button>
        )}

        <div className="mt-4">
          <span className="font-mono text-xs text-white/30">
            Press <kbd className="bg-white/10 px-1 rounded">Enter</kbd> to generate
          </span>
        </div>
      </div>
    </PanelFrame>
  );
}
