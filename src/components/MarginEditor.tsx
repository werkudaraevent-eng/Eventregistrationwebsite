/**
 * MarginEditor Component
 * 
 * Provides UI for editing print margins (top, right, bottom, left).
 * Compact design with individual inputs for each margin.
 */

import { Label } from './ui/label';
import { Input } from './ui/input';
import type { PaperSizeConfiguration } from '../utils/localDBStub';

interface MarginEditorProps {
  margins: PaperSizeConfiguration['margins'];
  onMarginsChange: (margins: PaperSizeConfiguration['margins']) => void;
}

export function MarginEditor({ margins, onMarginsChange }: MarginEditorProps) {
  const handleMarginChange = (side: keyof PaperSizeConfiguration['margins'], value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 50) {
      onMarginsChange({
        ...margins,
        [side]: numValue
      });
    }
  };

  const setAllMargins = (value: number) => {
    onMarginsChange({
      top: value,
      right: value,
      bottom: value,
      left: value
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-slate-700">
          Margins (mm)
        </Label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setAllMargins(0)}
            className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 rounded text-slate-600"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => setAllMargins(2)}
            className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 rounded text-slate-600"
          >
            2
          </button>
          <button
            type="button"
            onClick={() => setAllMargins(5)}
            className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 rounded text-slate-600"
          >
            5
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <div className="space-y-0.5">
          <Label htmlFor="margin-top" className="text-[10px] text-slate-500">
            Top
          </Label>
          <Input
            id="margin-top"
            type="number"
            min={0}
            max={50}
            step={1}
            value={margins.top}
            onChange={(e) => handleMarginChange('top', e.target.value)}
            className="h-7 text-xs text-center"
          />
        </div>
        <div className="space-y-0.5">
          <Label htmlFor="margin-right" className="text-[10px] text-slate-500">
            Right
          </Label>
          <Input
            id="margin-right"
            type="number"
            min={0}
            max={50}
            step={1}
            value={margins.right}
            onChange={(e) => handleMarginChange('right', e.target.value)}
            className="h-7 text-xs text-center"
          />
        </div>
        <div className="space-y-0.5">
          <Label htmlFor="margin-bottom" className="text-[10px] text-slate-500">
            Bottom
          </Label>
          <Input
            id="margin-bottom"
            type="number"
            min={0}
            max={50}
            step={1}
            value={margins.bottom}
            onChange={(e) => handleMarginChange('bottom', e.target.value)}
            className="h-7 text-xs text-center"
          />
        </div>
        <div className="space-y-0.5">
          <Label htmlFor="margin-left" className="text-[10px] text-slate-500">
            Left
          </Label>
          <Input
            id="margin-left"
            type="number"
            min={0}
            max={50}
            step={1}
            value={margins.left}
            onChange={(e) => handleMarginChange('left', e.target.value)}
            className="h-7 text-xs text-center"
          />
        </div>
      </div>

      <div className="text-[10px] text-slate-400">
        Tip: Set to 0 for thermal/POS printers
      </div>
    </div>
  );
}
