import React, { useEffect, useRef } from 'react';

interface QRCodeProps {
  value: string;
  size?: number;
}

/**
 * Lightweight QR Code renderer using Canvas API.
 * Generates a simple QR-like data matrix without external dependencies.
 * For production, replace with `qrcode.react`.
 */
export const QRCode: React.FC<QRCodeProps> = ({ value, size = 128 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Simple deterministic bit matrix from string hash
    const gridSize = 21; // Standard QR v1
    const cellSize = size / gridSize;
    
    // Generate reproducible pattern from value
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#1a1a2e';

    // Finder patterns (3 corners)
    const drawFinder = (x: number, y: number) => {
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          const isOuter = i === 0 || i === 6 || j === 0 || j === 6;
          const isInner = i >= 2 && i <= 4 && j >= 2 && j <= 4;
          if (isOuter || isInner) {
            ctx.fillRect((x + i) * cellSize, (y + j) * cellSize, cellSize, cellSize);
          }
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(gridSize - 7, 0);
    drawFinder(0, gridSize - 7);

    // Data area — seeded pseudo-random from hash
    let seed = Math.abs(hash);
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        // Skip finder pattern areas
        if ((row < 8 && col < 8) || (row < 8 && col > gridSize - 9) || (row > gridSize - 9 && col < 8)) continue;
        
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        if (seed % 3 !== 0) {
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }
  }, [value, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-lg border border-gray-200 shadow-sm"
    />
  );
};
