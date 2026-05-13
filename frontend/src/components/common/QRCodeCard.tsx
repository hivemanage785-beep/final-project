import React from 'react';
import { QRCode } from './QRCode';
import { getTraceUrl } from '../../utils/getTraceUrl';

export default function QRCodeCard({ batchId }: { batchId: string }) {
  const qrValue = getTraceUrl(batchId);
  
  return (
    <div style={{ textAlign: 'center', padding: 16 }}> 
      <QRCode value={qrValue} size={180} />
      <p style={{ marginTop: 8, fontSize: 12 }}>Batch ID: {batchId}</p> 
      <p style={{ 
        marginTop: 4, 
        fontSize: 9, 
        fontFamily: 'monospace', 
        userSelect: 'all',
        wordBreak: 'break-all',
        color: '#64748b'
      }}>
        {qrValue}
      </p>
    </div>
  );
}
