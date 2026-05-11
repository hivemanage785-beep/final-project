import { QRCodeCanvas } from 'qrcode.react';

export default function QRCodeCard({ batchId }: { batchId: string }) {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || window.location.origin;
  
  const qrValue = `${baseUrl}/trace/${batchId}`;
  
  return (
    <div style={{ textAlign: 'center', padding: 16 }}> 
      <QRCodeCanvas value={qrValue} size={180} />
      <p style={{ marginTop: 8, fontSize: 12 }}>Batch ID: {batchId}</p> 
    </div>
  );
}
