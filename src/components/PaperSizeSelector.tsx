/**
 * PaperSizeSelector Component
 * 
 * Provides UI for selecting paper size for badge printing.
 * Supports standard paper sizes, Indonesian ID card sizes, and custom dimensions.
 * Uses dropdown for compact display.
 */

import { Label } from './ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { PAPER_SIZES, type PaperSizeConfiguration } from '../utils/localDBStub';
import { validateCustomDimensions } from '../utils/printUtils';

interface PaperSizeSelectorProps {
  configuration: PaperSizeConfiguration;
  onConfigurationChange: (config: Partial<PaperSizeConfiguration>) => void;
}

// Group paper sizes by category (no landscape/portrait distinction - user can toggle orientation)
const SIZE_GROUPS = {
  'Standard Paper': ['A4', 'A5', 'A6', 'A7', 'Letter'],
  'ID Card Sizes': ['CR80', 'B1', 'B2', 'B3', 'B4', 'A1_ID', 'A2_ID', 'A3_ID'],
  'Custom': ['Custom']
};

export function PaperSizeSelector({ configuration, onConfigurationChange }: PaperSizeSelectorProps) {
  const handleSizeTypeChange = (sizeType: string) => {
    onConfigurationChange({ sizeType: sizeType as PaperSizeConfiguration['sizeType'] });
  };

  const handleCustomWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      onConfigurationChange({ customWidth: value });
    }
  };

  const handleCustomHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      onConfigurationChange({ customHeight: value });
    }
  };

  // Validate custom dimensions
  const customValidation = configuration.sizeType === 'Custom'
    ? validateCustomDimensions(
        configuration.customWidth || 100,
        configuration.customHeight || 150
      )
    : { valid: true };

  return (
    <div className="space-y-2">
      <div>
        <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">
          Paper Size
        </Label>
        <Select value={configuration.sizeType} onValueChange={handleSizeTypeChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select paper size" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {Object.entries(SIZE_GROUPS).map(([groupName, sizes]) => (
              <SelectGroup key={groupName}>
                <SelectLabel className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider">
                  {groupName}
                </SelectLabel>
                {sizes.map((key) => {
                  const size = PAPER_SIZES[key as keyof typeof PAPER_SIZES];
                  if (!size) return null;
                  return (
                    <SelectItem key={key} value={key} className="text-xs">
                      <div className="flex items-center justify-between gap-3 w-full">
                        <span>{size.label}</span>
                        {key !== 'Custom' && (
                          <span className="text-[10px] text-slate-400">
                            {size.width}×{size.height}mm
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {configuration.sizeType === 'Custom' && (
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="custom-width" className="text-[10px] text-slate-600">
                Width (mm)
              </Label>
              <Input
                id="custom-width"
                type="number"
                min={50}
                max={500}
                step={0.1}
                value={configuration.customWidth || 100}
                onChange={handleCustomWidthChange}
                className={`h-7 text-xs ${
                  !customValidation.valid && configuration.customWidth
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : ''
                }`}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="custom-height" className="text-[10px] text-slate-600">
                Height (mm)
              </Label>
              <Input
                id="custom-height"
                type="number"
                min={50}
                max={500}
                step={0.1}
                value={configuration.customHeight || 150}
                onChange={handleCustomHeightChange}
                className={`h-7 text-xs ${
                  !customValidation.valid && configuration.customHeight
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : ''
                }`}
              />
            </div>
          </div>

          {!customValidation.valid && (
            <div className="flex items-start gap-1.5 p-2 bg-red-50 border border-red-200 rounded">
              <svg
                className="w-3 h-3 text-red-600 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-[10px] text-red-700 font-medium">
                {customValidation.error}
              </div>
            </div>
          )}

          <div className="text-[10px] text-slate-500 bg-slate-50 rounded p-2 border border-slate-200">
            Range: 50mm - 500mm
          </div>
        </div>
      )}
    </div>
  );
}
