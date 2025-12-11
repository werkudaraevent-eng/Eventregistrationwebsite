/**
 * BadgePrintSettings Component
 * 
 * Container component that integrates PaperSizeSelector, MarginEditor,
 * PrintPreviewPanel, and Print Rotation for comprehensive print configuration.
 */

import { useState, useEffect } from 'react';
import { PaperSizeSelector } from './PaperSizeSelector';
import { MarginEditor } from './MarginEditor';
import { PrintPreviewPanel } from './PrintPreviewPanel';
import { RotateCcw } from 'lucide-react';
import type { PaperSizeConfiguration } from '../utils/localDBStub';

interface BadgePrintSettingsProps {
  configuration: PaperSizeConfiguration;
  badgeWidth: number;  // in mm
  badgeHeight: number; // in mm
  onConfigurationChange: (config: PaperSizeConfiguration) => void;
}

export function BadgePrintSettings({
  configuration,
  badgeWidth,
  badgeHeight,
  onConfigurationChange
}: BadgePrintSettingsProps) {
  // Local state for immediate updates
  const [localConfig, setLocalConfig] = useState<PaperSizeConfiguration>(configuration);

  // Sync with parent when configuration prop changes
  useEffect(() => {
    setLocalConfig(configuration);
  }, [configuration]);

  const handleConfigChange = (updates: Partial<PaperSizeConfiguration>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    onConfigurationChange(newConfig);
  };

  return (
    <div className="space-y-3">
      {/* Paper Size Selection */}
      <div className="bg-white rounded-lg border border-slate-200 p-3">
        <PaperSizeSelector
          configuration={localConfig}
          onConfigurationChange={handleConfigChange}
        />
      </div>

      {/* Margin Editor */}
      <div className="bg-white rounded-lg border border-slate-200 p-3">
        <MarginEditor
          margins={localConfig.margins}
          onMarginsChange={(margins) => handleConfigChange({ margins })}
        />
      </div>

      {/* Print Rotation */}
      <div className="bg-white rounded-lg border border-slate-200 p-3">
        <div className="flex items-center gap-2 mb-2">
          <RotateCcw className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-700">Print Rotation</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleConfigChange({ printRotation: 0 })}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium rounded-lg border transition-colors ${
              (localConfig.printRotation ?? 0) === 0
                ? 'bg-primary-100 border-primary-500 text-primary-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none" className="flex-shrink-0">
              <rect x="0.5" y="0.5" width="15" height="11" rx="1" stroke="currentColor" strokeWidth="1" fill="none" />
              <text x="8" y="7.5" fontSize="5" fill="currentColor" textAnchor="middle" fontFamily="sans-serif">A</text>
            </svg>
            0°
          </button>
          <button
            type="button"
            onClick={() => handleConfigChange({ printRotation: 90 })}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium rounded-lg border transition-colors ${
              localConfig.printRotation === 90
                ? 'bg-primary-100 border-primary-500 text-primary-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <svg width="12" height="16" viewBox="0 0 12 16" fill="none" className="flex-shrink-0">
              <rect x="0.5" y="0.5" width="11" height="15" rx="1" stroke="currentColor" strokeWidth="1" fill="none" />
              <text x="6" y="9.5" fontSize="5" fill="currentColor" textAnchor="middle" fontFamily="sans-serif" transform="rotate(90 6 8)">A</text>
            </svg>
            90°
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Rotate badge 90° when printing. Useful for thermal printers.
        </p>
      </div>

      {/* Print Preview */}
      <div className="bg-white rounded-lg border border-slate-200 p-3">
        <div className="text-xs font-semibold text-slate-700 mb-2">
          Print Preview
        </div>
        <PrintPreviewPanel
          configuration={localConfig}
          badgeWidth={badgeWidth}
          badgeHeight={badgeHeight}
        />
      </div>
    </div>
  );
}
