/**
 * OrientationSelector Component
 * 
 * Provides UI for selecting paper orientation (portrait or landscape) for badge printing.
 */

import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import type { PaperSizeConfiguration } from '../utils/localDBStub';

interface OrientationSelectorProps {
  configuration: PaperSizeConfiguration;
  onConfigurationChange: (config: Partial<PaperSizeConfiguration>) => void;
}

export function OrientationSelector({ configuration, onConfigurationChange }: OrientationSelectorProps) {
  const handleOrientationChange = (orientation: string) => {
    onConfigurationChange({ orientation: orientation as PaperSizeConfiguration['orientation'] });
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-neutral-700">
        Orientation
      </Label>
      
      <RadioGroup
        value={configuration.orientation}
        onValueChange={handleOrientationChange}
        className="grid grid-cols-2 gap-2"
      >
        <label
          htmlFor="orientation-portrait"
          className={`flex items-center gap-2 rounded-md px-2 py-2 text-xs cursor-pointer transition-all border ${
            configuration.orientation === 'portrait'
              ? 'border-primary-500 bg-primary-50'
              : 'border-neutral-200 hover:border-primary-300 hover:bg-primary-50/50'
          }`}
        >
          <RadioGroupItem value="portrait" id="orientation-portrait" className="sr-only" />
          
          {/* Portrait Icon */}
          <svg
            className={`w-5 h-7 ${
              configuration.orientation === 'portrait' ? 'text-primary-600' : 'text-neutral-400'
            }`}
            fill="none"
            viewBox="0 0 24 32"
            stroke="currentColor"
          >
            <rect
              x="2"
              y="2"
              width="20"
              height="28"
              strokeWidth="2"
              fill="currentColor"
              fillOpacity="0.1"
            />
          </svg>
          
          <span className={`font-medium ${
            configuration.orientation === 'portrait' ? 'text-primary-900' : 'text-neutral-700'
          }`}>
            Portrait
          </span>
        </label>

        <label
          htmlFor="orientation-landscape"
          className={`flex items-center gap-2 rounded-md px-2 py-2 text-xs cursor-pointer transition-all border ${
            configuration.orientation === 'landscape'
              ? 'border-primary-500 bg-primary-50'
              : 'border-neutral-200 hover:border-primary-300 hover:bg-primary-50/50'
          }`}
        >
          <RadioGroupItem value="landscape" id="orientation-landscape" className="sr-only" />
          
          {/* Landscape Icon */}
          <svg
            className={`w-7 h-5 ${
              configuration.orientation === 'landscape' ? 'text-primary-600' : 'text-neutral-400'
            }`}
            fill="none"
            viewBox="0 0 32 24"
            stroke="currentColor"
          >
            <rect
              x="2"
              y="2"
              width="28"
              height="20"
              strokeWidth="2"
              fill="currentColor"
              fillOpacity="0.1"
            />
          </svg>
          
          <span className={`font-medium ${
            configuration.orientation === 'landscape' ? 'text-primary-900' : 'text-neutral-700'
          }`}>
            Landscape
          </span>
        </label>
      </RadioGroup>
    </div>
  );
}
