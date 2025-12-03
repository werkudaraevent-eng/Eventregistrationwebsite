/**
 * BadgePrintSettings Component
 * 
 * Container component that integrates PaperSizeSelector, OrientationSelector,
 * and PrintPreviewPanel for comprehensive print configuration.
 */

import { useState, useEffect } from 'react';
import { PaperSizeSelector } from './PaperSizeSelector';
import { OrientationSelector } from './OrientationSelector';
import { PrintPreviewPanel } from './PrintPreviewPanel';
import type { PaperSizeConfiguration } from '../utils/localDBStub';
import { DEFAULT_PRINT_CONFIG } from '../utils/localDBStub';

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

      {/* Orientation Selection */}
      <div className="bg-white rounded-lg border border-slate-200 p-3">
        <OrientationSelector
          configuration={localConfig}
          onConfigurationChange={handleConfigChange}
        />
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
