import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { RequestStatus } from '../types/score';

interface AdminRequest {
  request_id: string;
  requester_id: string;
  farmer_id: string;
  status: string;
  created_at: string;
}

export const AdminDashboard: React.FC = () => {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      // Endpoint 2: GET /api/admin/requests
      const data = await apiFetch('/api/admin/requests');
      setRequests(data || []);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      // Endpoint 3 & 4: POST /api/admin/requests/:id/approve | reject
      await apiFetch(`/api/admin/requests/${id}/${action}`, { method: 'POST' });
      loadRequests(); // Refresh
    } catch (e: any) {
      alert(`Action failed: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 underline decoration-[#5D0623] decoration-4">
            Farmer Discovery: Admin Approval Portal
          </h1>
          <button onClick={loadRequests} className="text-sm bg-white border border-gray-200 px-3 py-2 rounded shadow-sm hover:bg-gray-50 font-bold">
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 border border-red-200 text-sm font-bold">
            ⚠ {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-400 border-t-transparent" />
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider font-extrabold text-gray-500">
                <tr>
                  <th className="px-6 py-4">Request ID</th>
                  <th className="px-6 py-4">Requester ID</th>
                  <th className="px-6 py-4">Farmer ID</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created At</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium">
                      No pending requests found.
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.request_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs opacity-60 text-gray-400">{r.request_id.slice(0, 8)}...</td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">{r.requester_id.slice(-6)}</td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">{r.farmer_id.slice(0, 8)}...</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          r.status === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button 
                          onClick={() => handleAction(r.request_id, 'approve')}
                          className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase shadow-sm hover:bg-green-700 active:scale-95 transition-all"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleAction(r.request_id, 'reject')}
                          className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase shadow-sm hover:bg-red-100 active:scale-95 transition-all border border-red-100"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-12 text-center text-xs text-gray-400 font-bold uppercase tracking-widest leading-loose">
        Admin Mode Isolated • buzz-off internal use only
        <br />
        <span className="opacity-40">Development environment detected</span>
      </div>
    </div>
  );
};
