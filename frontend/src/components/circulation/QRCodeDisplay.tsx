import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeDisplayProps {
  /** The QR code value to encode, e.g. "HR-8a2b3c4d-C1" */
  value: string;
  /** Size in pixels (default: 72) */
  size?: number;
  /** Error correction level (default: 'M') */
  level?: 'L' | 'M' | 'Q' | 'H';
  /** Optional label below the QR code */
  label?: string;
  /** Optional subtitle below the label */
  subtitle?: string;
  /** Whether to show the code value below the QR */
  showValue?: boolean;
  /** Optional CSS class */
  className?: string;
}

/**
 * Renders an SVG QR code for a given value (e.g. a book copy QR code).
 * Uses qrcode.react for rendering.
 *
 * QR Code Format: HR-{bookID[:8]}-C{copyNumber}
 * Example: HR-8a2b3c4d-C1
 */
const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 72,
  level = 'M',
  label,
  subtitle,
  showValue = false,
  className = '',
}) => {
  if (!value) return null;

  return (
    <div className={`flex flex-col items-center gap-1.5 ${className}`}>
      <div className="bg-white p-2 rounded-lg shadow-sm border">
        <QRCodeSVG
          value={value}
          size={size}
          level={level}
          includeMargin={false}
        />
      </div>
      {label && (
        <p className="text-xs font-medium text-center leading-tight line-clamp-2 max-w-[120px]">
          {label}
        </p>
      )}
      {subtitle && (
        <p className="text-[10px] text-muted-foreground text-center">
          {subtitle}
        </p>
      )}
      {showValue && (
        <p className="text-[10px] font-mono text-muted-foreground text-center">
          {value}
        </p>
      )}
    </div>
  );
};

export default QRCodeDisplay;
