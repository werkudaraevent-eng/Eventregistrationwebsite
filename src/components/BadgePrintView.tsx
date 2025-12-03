/**
 * BadgePrintView Component
 * 
 * Renders badges for printing. This component is hidden from normal view
 * and only visible when printing.
 */

import { useEffect, useState } from 'react';
import QRCodeLib from 'qrcode';

interface Participant {
  id: string;
  name: string;
  email: string;
  company: string;
  position: string;
  qr_code_url?: string;
}

interface BadgeComponent {
  id: string;
  type: 'field' | 'qrcode' | 'logo' | 'eventName' | 'customText';
  fieldName?: string;
  label?: string;
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  customText?: string;
}

interface BadgePrintViewProps {
  participants: Participant[];
  badgeTemplate: {
    size?: string;
    customWidth?: number;
    customHeight?: number;
    backgroundColor?: string;
    backgroundImageUrl?: string;
    logoUrl?: string;
    components?: BadgeComponent[];
  };
  eventName: string;
}

export function BadgePrintView({ participants, badgeTemplate, eventName }: BadgePrintViewProps) {
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});

  // Badge dimensions
  const BADGE_SIZES: Record<string, { width: number; height: number }> = {
    CR80: { width: 85.6, height: 53.98 },
    A6: { width: 105, height: 148 },
    A7: { width: 74, height: 105 },
    custom: { 
      width: badgeTemplate.customWidth || 100, 
      height: badgeTemplate.customHeight || 150 
    }
  };

  const size = BADGE_SIZES[badgeTemplate.size || 'CR80'];
  const components = badgeTemplate.components || [];

  // Generate QR codes for all participants
  useEffect(() => {
    const generateQRCodes = async () => {
      const codes: Record<string, string> = {};
      
      for (const participant of participants) {
        try {
          const qrData = participant.qr_code_url || participant.id;
          const qrCodeUrl = await QRCodeLib.toDataURL(qrData, {
            width: 200,
            margin: 1
          });
          codes[participant.id] = qrCodeUrl;
        } catch (error) {
          console.error('Error generating QR code:', error);
        }
      }
      
      setQrCodes(codes);
    };

    generateQRCodes();
  }, [participants]);

  const renderComponentContent = (component: BadgeComponent, participant: Participant) => {
    if (!component.enabled) return null;

    const style: React.CSSProperties = {
      position: 'absolute',
      left: `${component.x}%`,
      top: `${component.y}%`,
      width: `${component.width}%`,
      height: `${component.height}%`,
      fontSize: `${component.fontSize || 16}px`,
      fontFamily: component.fontFamily || 'sans-serif',
      fontWeight: component.fontWeight || 'normal',
      fontStyle: component.fontStyle || 'normal',
      textAlign: component.textAlign || 'center',
      color: component.color || '#000000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: component.textAlign === 'left' ? 'flex-start' : 
                      component.textAlign === 'right' ? 'flex-end' : 'center',
      overflow: 'hidden'
    };

    switch (component.type) {
      case 'eventName':
        return (
          <div key={component.id} style={style}>
            {component.customText || eventName}
          </div>
        );

      case 'field':
        const fieldValue = component.fieldName ? 
          (participant as any)[component.fieldName] || '' : '';
        return (
          <div key={component.id} style={style}>
            {fieldValue}
          </div>
        );

      case 'qrcode':
        return qrCodes[participant.id] ? (
          <div key={component.id} style={{ ...style, padding: '2%' }}>
            <img 
              src={qrCodes[participant.id]} 
              alt="QR Code" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        ) : null;

      case 'logo':
        return badgeTemplate.logoUrl ? (
          <div key={component.id} style={{ ...style, padding: '2%' }}>
            <img 
              src={badgeTemplate.logoUrl} 
              alt="Logo" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        ) : null;

      case 'customText':
        return (
          <div key={component.id} style={style}>
            {component.customText || ''}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      id="badge-print-container" 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -9999,
        visibility: 'hidden',
        pointerEvents: 'none'
      }}
      className="print:visible print:static print:z-auto"
    >
      {participants.map((participant) => (
        <div
          key={participant.id}
          className="badge-container"
          style={{
            position: 'relative',
            width: `${size.width}mm`,
            height: `${size.height}mm`,
            backgroundColor: badgeTemplate.backgroundColor || '#ffffff',
            backgroundImage: badgeTemplate.backgroundImageUrl ? 
              `url(${badgeTemplate.backgroundImageUrl})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            pageBreakAfter: 'always',
            pageBreakInside: 'avoid',
            breakAfter: 'page',
            breakInside: 'avoid'
          }}
        >
          {components.map((component) => renderComponentContent(component, participant))}
        </div>
      ))}
    </div>
  );
}
