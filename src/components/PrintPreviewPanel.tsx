/**
 * PrintPreviewPanel Component
 * 
 * Displays visual preview of how badges will be arranged on the selected paper size.
 * Shows paper dimensions, printable area, badge count, and potential issues.
 */

import { useState } from 'react';
import type { PaperSizeConfiguration } from '../utils/localDBStub';
import {
  getPaperDimensions,
  getPrintableArea,
  calculateBadgesPerPage,
  validateBadgeFitsOnPaper
} from '../utils/printUtils';
import { AlertTriangle, Info } from 'lucide-react';

interface PrintPreviewPanelProps {
  configuration: PaperSizeConfiguration;
  badgeWidth: number;  // in mm
  badgeHeight: number; // in mm
}

export function PrintPreviewPanel({ configuration, badgeWidth, badgeHeight }: PrintPreviewPanelProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const paperDims = getPaperDimensions(configuration);
  const printableArea = getPrintableArea(configuration);
  const badgesPerPage = calculateBadgesPerPage(badgeWidth, badgeHeight, configuration);
  const badgeFitsValidation = validateBadgeFitsOnPaper(badgeWidth, badgeHeight, configuration);

  // Calculate scale for preview (fit within 200px width)
  const previewMaxWidth = 200;
  const scale = previewMaxWidth / paperDims.width;
  const previewWidth = paperDims.width * scale;
  const previewHeight = paperDims.height * scale;

  // Calculate printable area dimensions for preview
  const printablePreviewWidth = printableArea.width * scale;
  const printablePreviewHeight = printableArea.height * scale;
  const marginTopPreview = configuration.margins.top * scale;
  const marginLeftPreview = configuration.margins.left * scale;

  // Calculate badge dimensions for preview
  const badgePreviewWidth = badgeWidth * scale;
  const badgePreviewHeight = badgeHeight * scale;

  // Calculate badge positions
  const badgesPerRow = Math.floor(printableArea.width / badgeWidth);
  const badgesPerColumn = Math.floor(printableArea.height / badgeHeight);

  // Check for issues
  const hasIssues = !badgeFitsValidation.valid;
  const hasSmallMargins = Object.values(configuration.margins).some(m => m < 5);

  return (
    <div className="space-y-2">
      {/* Paper Dimensions Info */}
      <div className="bg-neutral-50 rounded-lg p-2 border border-neutral-200">
        <div className="text-xs font-semibold text-neutral-700 mb-1.5">Paper Dimensions</div>
        <div className="space-y-1 text-xs">
          <div>
            <span className="text-neutral-500">Size:</span>
            <span className="ml-1.5 font-medium text-neutral-900">
              {paperDims.width.toFixed(1)}mm × {paperDims.height.toFixed(1)}mm
            </span>
          </div>
          <div>
            <span className="text-neutral-500">Orientation:</span>
            <span className="ml-1.5 font-medium text-neutral-900 capitalize">
              {configuration.orientation}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Preview */}
      <div
        className="relative bg-white rounded-lg border-2 border-slate-300 shadow-lg mx-auto"
        style={{
          width: `${previewWidth}px`,
          height: `${previewHeight}px`
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Paper background */}
        <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50" />

        {/* Printable area */}
        <div
          className="absolute border-2 border-dashed border-primary-300 bg-primary-50/30"
          style={{
            top: `${marginTopPreview}px`,
            left: `${marginLeftPreview}px`,
            width: `${printablePreviewWidth}px`,
            height: `${printablePreviewHeight}px`
          }}
        >
          {/* Badge placeholders */}
          {badgeFitsValidation.valid && badgesPerPage > 0 && (
            <>
              {Array.from({ length: Math.min(badgesPerPage, 12) }).map((_, index) => {
                const row = Math.floor(index / badgesPerRow);
                const col = index % badgesPerRow;
                const x = col * badgePreviewWidth;
                const y = row * badgePreviewHeight;

                return (
                  <div
                    key={index}
                    className="absolute bg-primary-200/50 border border-primary-400 rounded-sm"
                    style={{
                      left: `${x}px`,
                      top: `${y}px`,
                      width: `${badgePreviewWidth}px`,
                      height: `${badgePreviewHeight}px`
                    }}
                  />
                );
              })}
            </>
          )}
        </div>

        {/* Tooltip on hover */}
        {showTooltip && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full bg-neutral-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl z-10 whitespace-nowrap">
            <div className="space-y-1">
              <div>Paper: {paperDims.width.toFixed(1)}mm × {paperDims.height.toFixed(1)}mm</div>
              <div>Printable: {printableArea.width.toFixed(1)}mm × {printableArea.height.toFixed(1)}mm</div>
              <div>Margins: {configuration.margins.top}mm / {configuration.margins.right}mm / {configuration.margins.bottom}mm / {configuration.margins.left}mm</div>
            </div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-neutral-900" />
          </div>
        )}
      </div>

      {/* Printable Area Info */}
      <div className="bg-primary-50 rounded-lg p-2 border border-primary-200">
        <div className="text-xs font-semibold text-primary-900 mb-1">Printable Area</div>
        <div className="text-xs text-primary-700">
          {printableArea.width.toFixed(1)}mm × {printableArea.height.toFixed(1)}mm
        </div>
      </div>

      {/* Badge Count */}
      <div className="bg-info-light rounded-lg p-2 border-info-light">
        <div className="text-xs font-semibold text-info-dark mb-1">Badges Per Page</div>
        <div className="text-xl font-bold text-info">
          {badgesPerPage}
        </div>
        {badgesPerPage > 0 && (
          <div className="text-xs text-info mt-0.5">
            {badgesPerRow} × {badgesPerColumn} layout
          </div>
        )}
      </div>

      {/* Issues/Warnings */}
      {hasIssues && (
        <div className="flex items-start gap-1.5 p-2 alert-error rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5 text-error mt-0.5 flex-shrink-0" />
          <div className="text-xs text-error-dark">
            <div className="font-semibold mb-0.5">Issue Detected</div>
            <div>{badgeFitsValidation.error}</div>
          </div>
        </div>
      )}

      {hasSmallMargins && !hasIssues && (
        <div className="flex items-start gap-1.5 p-2 alert-warning rounded-lg">
          <Info className="w-3.5 h-3.5 text-warning mt-0.5 flex-shrink-0" />
          <div className="text-xs text-warning-dark">
            <div className="font-semibold mb-0.5">Small Margins</div>
            <div>Margins &lt; 5mm may cause printing issues.</div>
          </div>
        </div>
      )}
    </div>
  );
}
