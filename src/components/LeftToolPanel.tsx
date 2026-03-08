import { useState } from 'react';
import KreatePlusModal from './KreatePlusModal';

const panelEasing = 'cubic-bezier(0.32, 0.72, 0, 1)';

const iconClass = 'w-8 h-8 object-contain rounded-full';
const btnCircleClass = 'w-12 h-12 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0';

interface LeftToolPanelProps {
  onOpenCreate?: () => void;
  onUseKreatePlusPrompt?: (prompt: string) => void;
}

export default function LeftToolPanel({ onOpenCreate, onUseKreatePlusPrompt }: LeftToolPanelProps) {
  const [kreatePlusOpen, setKreatePlusOpen] = useState(false);

  return (
    <>
      <div
        className="fixed left-4 top-1/2 -translate-y-1/2 z-40 opacity-50 hover:opacity-100 transition-opacity duration-300"
        style={{ transitionTimingFunction: panelEasing }}
      >
        <div
          className="rounded-2xl flex flex-col gap-1.5 py-3 px-2 min-w-[56px]
            bg-transparent"
        >
          {/* Create / open control panel */}
          <button
            type="button"
            onClick={onOpenCreate}
            className={`${btnCircleClass} text-white/70 hover:text-white active:scale-[0.96] transition-all duration-200 bg-transparent border-0 p-0`}
            style={{ transitionTimingFunction: panelEasing, borderRadius: '50%' }}
            title="Create"
          >
            <img src="/newgen.png" alt="Create" className={iconClass} style={{ borderRadius: '50%' }} />
          </button>
          {/* Kreate+ — step-by-step prompt builder */}
          <button
            type="button"
            onClick={() => setKreatePlusOpen(true)}
            className={`${btnCircleClass} text-white/50 hover:text-white/90 active:scale-[0.96] transition-all duration-200 bg-transparent border-0 p-0`}
            style={{ transitionTimingFunction: panelEasing, borderRadius: '50%' }}
            title="Kreate+"
          >
            <img src="/kreate+.png" alt="Kreate+" className={iconClass} style={{ borderRadius: '50%' }} />
          </button>
        </div>
      </div>

      {kreatePlusOpen && (
        <KreatePlusModal
          onClose={() => setKreatePlusOpen(false)}
          onUsePrompt={(prompt) => {
            onUseKreatePlusPrompt?.(prompt);
            setKreatePlusOpen(false);
          }}
        />
      )}
    </>
  );
}
