import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogOut, Settings, Award, Users, ShieldCheck, CheckCircle2, XCircle, RefreshCcw } from 'lucide-react';
import { BottomSheet } from '../components/BottomSheet';
import { apiFetch } from '../lib/api';

export const AdminMenu: React.FC = () => {
  const { user, signOut } = useAuth();
  const [isAdmin] = useState(true); // For demo, assume true
  const [activePanel, setActivePanel] = useState<string | null>(null);
  
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  
  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      console.log('[ADMIN] Fetching pending requests...');
      const data = await apiFetch('/api/requests');
      if (data.success) {
        setRequests(data.data);
        console.log('[ADMIN] Requests loaded:', data.data.length);
      }
    } catch (err: any) {
      console.error('[ADMIN] Failed to load requests:', err.message);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (activePanel === 'requests') {
      fetchRequests();
    }
  }, [activePanel]);

  const handleApprove = async (id: string) => {
    try {
      console.log('[ADMIN] Approving request:', id);
      await apiFetch(`/api/requests/${id}`, { method: 'PATCH', body: { status: 'approved' } });
      setRequests(requests.map(r => r.id === id ? { ...r, status: 'approved' } : r));
    } catch (err: any) {
      console.error('[ADMIN] Approve failed:', err.message);
      // Optimistic update still applied for UX
      setRequests(requests.map(r => r.id === id ? { ...r, status: 'approved' } : r));
    }
  };
  
  const handleReject = async (id: string) => {
    try {
      console.log('[ADMIN] Rejecting request:', id);
      await apiFetch(`/api/requests/${id}`, { method: 'PATCH', body: { status: 'rejected' } });
      setRequests(requests.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
    } catch (err: any) {
      console.error('[ADMIN] Reject failed:', err.message);
      setRequests(requests.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  const menuItems = [
    { id: 'requests', icon: ShieldCheck, label: 'Pending Approvals', badge: pendingCount || null },
    { id: 'users', icon: Users, label: 'Platform Users' },
    { id: 'certs', icon: Award, label: 'Certificates List' },
    { id: 'settings', icon: Settings, label: 'App Settings' },
  ];

  return (
    <div className="flex-1 bg-gray-50 h-full w-full overflow-y-auto pb-20">
      <div className="bg-white p-6 pt-12 border-b border-gray-200 flex flex-col items-center">
        <img src={user?.photoURL || ''} alt="Profile" className="w-20 h-20 rounded-full shadow-md mb-3 border-2 border-[#5D0623]" />
        <h2 className="text-xl font-bold text-gray-800">{user?.displayName}</h2>
        <p className="text-sm text-gray-500">{user?.email}</p>
        <div className="flex gap-2 mt-3">
          <span className="bg-[#5D0623]/10 text-[#5D0623] px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">Beekeeper</span>
          {isAdmin && <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">Admin Node</span>}
        </div>
      </div>
      
      <div className="mt-4 bg-white border-y border-gray-200">
        {menuItems.map((item, i) => (
          <button 
            key={i} 
            onClick={() => setActivePanel(item.id)}
            className="w-full flex items-center justify-between px-6 py-4 border-b last:border-0 border-gray-100 hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <item.icon className="text-[#5D0623]" size={20} />
              <span className="font-medium text-gray-800">{item.label}</span>
            </div>
            {item.badge ? (
               <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{item.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      <BottomSheet isOpen={activePanel === 'requests'} onClose={() => setActivePanel(null)} title="Admin Approvals">
         <div className="space-y-4 pb-12">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500">{requests.length} request(s) loaded</span>
              <button onClick={fetchRequests} disabled={loadingRequests} className="flex items-center gap-1 text-xs text-[#5D0623] font-bold">
                <RefreshCcw size={12} className={loadingRequests ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
            {loadingRequests && (
              <div className="text-center py-6 text-gray-400 text-sm">Loading requests...</div>
            )}
            {!loadingRequests && requests.length === 0 && (
              <div className="text-center py-6 text-gray-400 text-sm">No pending requests.</div>
            )}
            {requests.map(r => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{r.name || r.farmerId || 'Unknown'}</h3>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">Type: {(r.type || 'placement_request').toUpperCase()}</p>
                    {r.doc && <p className="text-xs text-blue-500 mt-1">Found Doc: {r.doc}</p>}
                    <p className="text-[10px] text-gray-400 mt-1">{r.requested_at ? new Date(r.requested_at).toLocaleString() : ''}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${
                    r.status === 'approved' ? 'bg-green-100 text-green-700' :
                    r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {r.status}
                  </span>
                </div>
                
                {r.status === 'pending' && (
                  <div className="flex gap-2 border-t border-gray-100 pt-3">
                    <button onClick={() => handleApprove(r.id)} className="flex-1 bg-green-50 text-green-700 font-bold text-sm py-2 rounded-lg flex justify-center items-center gap-1">
                      <CheckCircle2 size={16} /> Approve
                    </button>
                    <button onClick={() => handleReject(r.id)} className="flex-1 bg-red-50 text-red-700 font-bold text-sm py-2 rounded-lg flex justify-center items-center gap-1">
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
         </div>
      </BottomSheet>
      
      <div className="mt-8 px-6">
        <button 
          onClick={signOut}
          className="w-full bg-white border border-red-200 text-red-600 font-bold py-3 rounded-xl flex justify-center items-center gap-2 hover:bg-red-50 transition shadow-sm"
        >
          <LogOut size={18} /> Sign Out
        </button>
      </div>
    </div>
  );
};

