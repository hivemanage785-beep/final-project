import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeProps {
  value: string;
  size?: number;
}

export const QRCode: React.FC<QRCodeProps> = ({ value, size = 128 }) => {
  return (
    <div className="rounded-lg border border-gray-200 shadow-sm overflow-hidden inline-block bg-white">
      <QRCodeSVG
        value={value}
        size={size}
        level="H"
        includeMargin={true}
        bgColor="#ffffff"
        fgColor="#1a1a2e"
        style={{ display: 'block' }}
      />
    </div>
  );
};

