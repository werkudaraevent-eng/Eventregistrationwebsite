/**
 * ResizableTextComponent
 * 
 * A custom resizable text box with 8 handles (4 corners + 4 edges).
 * Font size scales proportionally when width changes.
 * 
 * UX Features:
 * - Rotation-Aware Resize: Mouse deltas transformed to element's local coordinate system
 * - AABB Boundary Checking: Uses actual visual footprint for collision detection
 */

import { useState, useRef, useEffect, useCallback } from 'react';

type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/**
 * Calculate the Axis-Aligned Bounding Box (AABB) of a rotated rectangle.
 * 
 * This gives the actual visual footprint of the element after rotation,
 * which is needed for accurate boundary/collision detection.
 * 
 * @param centerX - Center X position (percentage)
 * @param centerY - Center Y position (percentage)
 * @param width - Element width (percentage)
 * @param height - Element height (percentage)
 * @param angleDeg - Rotation angle in degrees (CSS clockwise positive)
 * @returns Bounding box { left, right, top, bottom, width, height }
 */
interface BoundingBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

function getRotatedBoundingBox(
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  angleDeg: number
): BoundingBox {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  const halfW = width / 2;
  const halfH = height / 2;
  
  // 4 corners in local space (relative to center)
  const corners = [
    { x: -halfW, y: -halfH }, // top-left
    { x: halfW, y: -halfH },  // top-right
    { x: halfW, y: halfH },   // bottom-right
    { x: -halfW, y: halfH },  // bottom-left
  ];
  
  // Rotate each corner and find extremes
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  
  for (const corner of corners) {
    // Rotate corner around origin (center)
    const rotatedX = corner.x * cos - corner.y * sin;
    const rotatedY = corner.x * sin + corner.y * cos;
    
    // Convert to global coordinates
    const globalX = centerX + rotatedX;
    const globalY = centerY + rotatedY;
    
    // Track extremes
    minX = Math.min(minX, globalX);
    maxX = Math.max(maxX, globalX);
    minY = Math.min(minY, globalY);
    maxY = Math.max(maxY, globalY);
  }
  
  return {
    left: minX,
    right: maxX,
    top: minY,
    bottom: maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Constrain a rotated element to stay within canvas bounds.
 * Uses AABB (Axis-Aligned Bounding Box) for accurate boundary detection.
 * 
 * @param proposedCenterX - Proposed center X position
 * @param proposedCenterY - Proposed center Y position
 * @param width - Element width
 * @param height - Element height
 * @param angleDeg - Rotation angle in degrees
 * @param canvasWidth - Canvas width (default 100 for percentage)
 * @param canvasHeight - Canvas height (default 100 for percentage)
 * @returns Adjusted center coordinates that keep AABB within bounds
 */
function constrainToCanvas(
  proposedCenterX: number,
  proposedCenterY: number,
  width: number,
  height: number,
  angleDeg: number,
  canvasWidth: number = 100,
  canvasHeight: number = 100
): { adjustedCenterX: number; adjustedCenterY: number } {
  // Calculate AABB of the rotated element at proposed position
  const aabb = getRotatedBoundingBox(proposedCenterX, proposedCenterY, width, height, angleDeg);
  
  // Calculate correction vectors
  let dx = 0;
  let dy = 0;
  
  // Left boundary check: if AABB left edge < 0, push right
  if (aabb.left < 0) {
    dx = -aabb.left; // aabb.left is negative, so this is positive (push right)
  }
  // Right boundary check: if AABB right edge > canvasWidth, push left
  else if (aabb.right > canvasWidth) {
    dx = canvasWidth - aabb.right; // This is negative (push left)
  }
  
  // Top boundary check: if AABB top edge < 0, push down
  if (aabb.top < 0) {
    dy = -aabb.top; // aabb.top is negative, so this is positive (push down)
  }
  // Bottom boundary check: if AABB bottom edge > canvasHeight, push up
  else if (aabb.bottom > canvasHeight) {
    dy = canvasHeight - aabb.bottom; // This is negative (push up)
  }
  
  return {
    adjustedCenterX: proposedCenterX + dx,
    adjustedCenterY: proposedCenterY + dy,
  };
}

/**
 * ANCHOR & MOUSE MIDPOINT RESIZE ALGORITHM
 * 
 * This approach guarantees the anchor stays PERFECTLY fixed by using
 * pure geometric relationships instead of accumulated calculations.
 * 
 * Key insight: The new center is simply the MIDPOINT between the
 * fixed anchor point and the projected mouse position (active edge).
 */

interface ResizeResult {
  newWidth: number;
  newHeight: number;
  newCenterX: number;
  newCenterY: number;
}

function calculateAnchorBasedResize(
  mouseGlobalX: number,
  mouseGlobalY: number,
  centerX: number,
  centerY: number,
  currentWidth: number,
  currentHeight: number,
  angleDeg: number,
  handle: HandlePosition,
  minWidth: number,
  minHeight: number
): ResizeResult {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  const halfW = currentWidth / 2;
  const halfH = currentHeight / 2;

  // Determine which axes this handle controls
  const controlsWidth = ['e', 'w', 'ne', 'nw', 'se', 'sw'].includes(handle);
  const controlsHeight = ['n', 's', 'ne', 'nw', 'se', 'sw'].includes(handle);
  const isRightSide = ['e', 'ne', 'se'].includes(handle);
  const isBottomSide = ['s', 'se', 'sw'].includes(handle);

  // ============================================
  // STEP 1: Calculate ANCHOR point (Ax, Ay) in GLOBAL space
  // This is the edge OPPOSITE to the handle - it must stay FIXED
  // ============================================
  
  // Anchor offset in LOCAL space (relative to center, before rotation)
  const anchorLocalX = controlsWidth ? (isRightSide ? -halfW : halfW) : 0;
  const anchorLocalY = controlsHeight ? (isBottomSide ? -halfH : halfH) : 0;
  
  // Rotate and translate to global space
  const Ax = centerX + (anchorLocalX * cos - anchorLocalY * sin);
  const Ay = centerY + (anchorLocalX * sin + anchorLocalY * cos);

  // ============================================
  // STEP 2: Project mouse onto the element's local axis
  // This creates the "Active Edge Point" aligned with the element
  // ============================================
  
  // Get mouse position relative to anchor
  const mouseRelX = mouseGlobalX - Ax;
  const mouseRelY = mouseGlobalY - Ay;
  
  // Un-rotate to local space (relative to anchor at origin)
  const mouseLocalX = mouseRelX * cos + mouseRelY * sin;
  const mouseLocalY = -mouseRelX * sin + mouseRelY * cos;
  
  // Project mouse onto the relevant axis (strict axis locking)
  // For width handles: only use X component, zero out Y
  // For height handles: only use Y component, zero out X
  let projectedLocalX = controlsWidth ? mouseLocalX : 0;
  let projectedLocalY = controlsHeight ? mouseLocalY : 0;
  
  // Enforce minimum dimensions
  if (controlsWidth) {
    if (isRightSide && projectedLocalX < minWidth) projectedLocalX = minWidth;
    if (!isRightSide && projectedLocalX > -minWidth) projectedLocalX = -minWidth;
  }
  if (controlsHeight) {
    if (isBottomSide && projectedLocalY < minHeight) projectedLocalY = minHeight;
    if (!isBottomSide && projectedLocalY > -minHeight) projectedLocalY = -minHeight;
  }
  
  // Rotate projected point back to global space to get Active Edge Point
  const activeEdgeX = Ax + (projectedLocalX * cos - projectedLocalY * sin);
  const activeEdgeY = Ay + (projectedLocalX * sin + projectedLocalY * cos);

  // ============================================
  // STEP 3: Calculate NEW CENTER as MIDPOINT
  // Center = (Anchor + ActiveEdge) / 2
  // This GUARANTEES anchor stays fixed!
  // ============================================
  
  const newCenterX = (Ax + activeEdgeX) / 2;
  const newCenterY = (Ay + activeEdgeY) / 2;

  // ============================================
  // STEP 4: Calculate NEW DIMENSIONS
  // Dimension = distance from Anchor to ActiveEdge
  // ============================================
  
  let newWidth = currentWidth;
  let newHeight = currentHeight;
  
  if (controlsWidth) {
    // Width = absolute X distance in local space
    newWidth = Math.abs(projectedLocalX);
  }
  if (controlsHeight) {
    // Height = absolute Y distance in local space
    newHeight = Math.abs(projectedLocalY);
  }

  return {
    newWidth,
    newHeight,
    newCenterX,
    newCenterY,
  };
}

interface ResizableTextComponentProps {
  id: string;
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
  text: string;
  baseFontSize: number; // in px
  color?: string;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  rotation?: number; // rotation in degrees
  isSelected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  onFontSizeChange?: (fontSize: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const HANDLE_SIZE = 8;
const MIN_WIDTH_PERCENT = 5;
const MIN_HEIGHT_PERCENT = 3;

/**
 * Base angles for each handle position (in degrees, 0 = up/north)
 * These represent the direction the handle "points" when element has 0° rotation
 */
const HANDLE_BASE_ANGLES: Record<HandlePosition, number> = {
  n: 0,
  ne: 45,
  e: 90,
  se: 135,
  s: 180,
  sw: 225,
  w: 270,
  nw: 315,
};

/**
 * CSS cursor values mapped to angle ranges
 * Each cursor covers a 45° range centered on its primary direction
 */
const ANGLE_TO_CURSOR: Array<{ minAngle: number; cursor: string }> = [
  { minAngle: 0, cursor: 'ns-resize' },      // 0-22.5° and 337.5-360° -> N/S
  { minAngle: 45, cursor: 'nesw-resize' },   // 22.5-67.5° -> NE/SW diagonal
  { minAngle: 90, cursor: 'ew-resize' },     // 67.5-112.5° -> E/W
  { minAngle: 135, cursor: 'nwse-resize' },  // 112.5-157.5° -> NW/SE diagonal
  { minAngle: 180, cursor: 'ns-resize' },    // 157.5-202.5° -> N/S
  { minAngle: 225, cursor: 'nesw-resize' },  // 202.5-247.5° -> NE/SW diagonal
  { minAngle: 270, cursor: 'ew-resize' },    // 247.5-292.5° -> E/W
  { minAngle: 315, cursor: 'nwse-resize' },  // 292.5-337.5° -> NW/SE diagonal
];

/**
 * Calculate the correct CSS cursor for a handle based on element rotation.
 * 
 * @param handle - The handle position (n, ne, e, se, s, sw, w, nw)
 * @param rotationDeg - Element's rotation in degrees
 * @returns CSS cursor string (e.g., 'ns-resize', 'ew-resize', 'nwse-resize', 'nesw-resize')
 * 
 * Example: Handle 'n' (0°) + Rotation 90° = Effective 90° = 'ew-resize'
 */
function getCursorForHandle(handle: HandlePosition, rotationDeg: number): string {
  // Get base angle for this handle
  const baseAngle = HANDLE_BASE_ANGLES[handle];
  
  // Add element rotation and normalize to 0-360
  let effectiveAngle = (baseAngle + rotationDeg) % 360;
  if (effectiveAngle < 0) effectiveAngle += 360;
  
  // Find the cursor for this angle (each cursor covers 45° centered on its direction)
  // We offset by 22.5° so the ranges are centered properly
  const adjustedAngle = (effectiveAngle + 22.5) % 360;
  const index = Math.floor(adjustedAngle / 45);
  
  return ANGLE_TO_CURSOR[index].cursor;
}

export function ResizableTextComponent({
  id,
  x,
  y,
  width,
  height,
  text,
  baseFontSize,
  color = '#000000',
  fontFamily = 'sans-serif',
  fontWeight = 'normal',
  textAlign = 'left',
  rotation = 0,
  isSelected,
  onSelect,
  onMove,
  onResize,
  onFontSizeChange,
  containerRef,
}: ResizableTextComponentProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [activeHandle, setActiveHandle] = useState<HandlePosition | null>(null);
  
  // Store initial values when drag/resize starts
  const initialState = useRef({
    mouseX: 0,
    mouseY: 0,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    baseWidth: 0, // for font scaling
  });

  // Calculate scaled font size based on width ratio
  // baseWidthRef stores the initial width to calculate scaling ratio
  const baseWidthRef = useRef(width);
  const [scaledFontSize, setScaledFontSize] = useState(baseFontSize);

  useEffect(() => {
    // Scale font based on width change relative to initial width
    const scale = width / baseWidthRef.current;
    const newFontSize = Math.max(8, Math.round(baseFontSize * scale));
    setScaledFontSize(newFontSize);
    onFontSizeChange?.(newFontSize);
  }, [width, baseFontSize, onFontSizeChange]);

  // Get container rect for coordinate calculations
  const getContainerRect = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect() || { width: 1, height: 1, left: 0, top: 0 };
    return {
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top
    };
  }, [containerRef]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).dataset.handle) return; // Don't drag if clicking handle
    
    onSelect();
    
    // Store initial state - mouse coordinates are in screen space
    initialState.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      x,
      y,
      width,
      height,
      baseWidth: width,
    };
    setIsDragging(true);
  };

  const handleHandleMouseDown = (e: React.MouseEvent, handle: HandlePosition) => {
    e.stopPropagation();
    e.preventDefault();
    
    initialState.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      x,
      y,
      width,
      height,
      baseWidth: baseWidthRef.current,
    };
    setActiveHandle(handle);
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = getContainerRect();
      // Convert screen-space mouse delta to percentage of container
      const screenDeltaX = ((e.clientX - initialState.current.mouseX) / rect.width) * 100;
      const screenDeltaY = ((e.clientY - initialState.current.mouseY) / rect.height) * 100;

      if (isDragging) {
        // Calculate proposed new position (top-left)
        const proposedX = initialState.current.x + screenDeltaX;
        const proposedY = initialState.current.y + screenDeltaY;
        
        // Convert to center coordinates for AABB constraint
        const proposedCenterX = proposedX + width / 2;
        const proposedCenterY = proposedY + height / 2;
        
        // Constrain using AABB (handles rotation correctly)
        const constrained = constrainToCanvas(
          proposedCenterX,
          proposedCenterY,
          width,
          height,
          rotation
        );
        
        // Convert back to top-left position
        const newX = constrained.adjustedCenterX - width / 2;
        const newY = constrained.adjustedCenterY - height / 2;
        
        onMove(newX, newY);
      }

      if (isResizing && activeHandle) {
        // Convert current mouse position to percentage of container
        const mouseXPercent = ((e.clientX - rect.left) / rect.width) * 100;
        const mouseYPercent = ((e.clientY - rect.top) / rect.height) * 100;

        // Current element center (x,y is top-left, so center = x + width/2, y + height/2)
        const currentCenterX = initialState.current.x + initialState.current.width / 2;
        const currentCenterY = initialState.current.y + initialState.current.height / 2;

        // Use anchor-based resize calculation
        const result = calculateAnchorBasedResize(
          mouseXPercent,
          mouseYPercent,
          currentCenterX,
          currentCenterY,
          initialState.current.width,
          initialState.current.height,
          rotation,
          activeHandle,
          MIN_WIDTH_PERCENT,
          MIN_HEIGHT_PERCENT
        );

        const newWidth = result.newWidth;
        const newHeight = result.newHeight;

        // Constrain using AABB (handles rotation correctly)
        const constrained = constrainToCanvas(
          result.newCenterX,
          result.newCenterY,
          newWidth,
          newHeight,
          rotation
        );
        
        // Convert center back to top-left position
        const newX = constrained.adjustedCenterX - newWidth / 2;
        const newY = constrained.adjustedCenterY - newHeight / 2;

        onMove(newX, newY);
        onResize(newWidth, newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setActiveHandle(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, activeHandle, width, height, rotation, onMove, onResize, getContainerRect]);

  // Handle positions relative to element
  const handles: { position: HandlePosition; style: React.CSSProperties }[] = [
    { position: 'nw', style: { top: -HANDLE_SIZE/2, left: -HANDLE_SIZE/2 } },
    { position: 'n', style: { top: -HANDLE_SIZE/2, left: '50%', transform: 'translateX(-50%)' } },
    { position: 'ne', style: { top: -HANDLE_SIZE/2, right: -HANDLE_SIZE/2 } },
    { position: 'e', style: { top: '50%', right: -HANDLE_SIZE/2, transform: 'translateY(-50%)' } },
    { position: 'se', style: { bottom: -HANDLE_SIZE/2, right: -HANDLE_SIZE/2 } },
    { position: 's', style: { bottom: -HANDLE_SIZE/2, left: '50%', transform: 'translateX(-50%)' } },
    { position: 'sw', style: { bottom: -HANDLE_SIZE/2, left: -HANDLE_SIZE/2 } },
    { position: 'w', style: { top: '50%', left: -HANDLE_SIZE/2, transform: 'translateY(-50%)' } },
  ];

  return (
    <div
      ref={elementRef}
      data-component-id={id}
      className="absolute select-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        height: `${height}%`,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: 'center',
        // Bring to front when selected
        zIndex: isSelected ? 50 : undefined,
      }}
      onMouseDown={(e) => {
        e.preventDefault(); // Prevent native text selection
        e.stopPropagation();
        handleMouseDown(e);
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Text Content */}
      <div
        className="w-full h-full flex items-center overflow-hidden pointer-events-none"
        style={{
          fontSize: `${scaledFontSize}px`,
          color,
          fontFamily,
          fontWeight,
          justifyContent: textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start',
          userSelect: 'none',
        }}
      >
        {text}
      </div>

      {/* Selection Border */}
      {isSelected && (
        <div className="absolute inset-0 border border-black pointer-events-none" />
      )}

      {/* Resize Handles - cursor dynamically calculated based on rotation */}
      {isSelected && handles.map(({ position, style }) => (
        <div
          key={position}
          data-handle={position}
          className="absolute bg-white border border-black z-50"
          style={{
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            cursor: getCursorForHandle(position, rotation),
            ...style,
          }}
          onMouseDown={(e) => handleHandleMouseDown(e, position)}
        />
      ))}
    </div>
  );
}
