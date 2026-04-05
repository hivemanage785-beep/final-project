import React, { useEffect, useState } from 'react';
import api from '../api/axiosInstance';

interface Farmer {
  _id: string;
  name: string;
  contact: string;
  cropTypes: string[];
  status: string;
}

interface Beekeeper {
  _id: string;
  displayName: string;
  email: string;
  isVerified: boolean;
  createdAt: string;
}

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'farmers' | 'beekeepers'>('farmers');
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [beekeepers, setBeekeepers] = useState<Beekeeper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFarmer, setNewFarmer] = useState({ name: '', contact: '', crops: '', lat: '', lng: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'farmers') {
        const { data } = await api.get('/api/admin/farmers');
        setFarmers(data.data || []);
      } else {
        const { data } = await api.get('/api/admin/beekeepers');
        setBeekeepers(data.data || []);
      }
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleAddFarmer = async () => {
    try {
        const payload = {
            name: newFarmer.name,
            phone: newFarmer.contact,
            crop_type: newFarmer.crops.split(',').map(s => s.trim()),
            location: {
                type: 'Point',
                coordinates: [parseFloat(newFarmer.lng), parseFloat(newFarmer.lat)]
            },
            status: 'approved'
        };
        await api.post('/api/farmers', payload);
        setNewFarmer({ name: '', contact: '', crops: '', lat: '', lng: '' });
        setShowAddForm(false);
        loadData();
    } catch (e: any) {
        alert("Failed to add farmer: " + (e.response?.data?.error || e.message));
    }
  };

  const handleFarmerStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/api/admin/farmers/${id}/status`, { status });
      loadData(); 
    } catch (e: any) { alert(`Action failed: ${e.message}`); }
  };

  const handleDeleteFarmer = async (id: string) => {
    if (!confirm('Delete this farmer?')) return;
    try {
      await api.delete(`/api/admin/farmers/${id}`);
      loadData();
    } catch (e: any) { alert(`Delete failed: ${e.message}`); }
  };

  const handleVerifyBeekeeper = async (id: string, isVerified: boolean) => {
    try {
      await api.patch(`/api/admin/beekeepers/${id}/verify`, { isVerified });
      loadData();
    } catch (e: any) { alert(`Action failed: ${e.message}`); }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-6 border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 underline decoration-[#5D0623] decoration-4 mb-4">
              Admin Platform
            </h1>
            <div className="flex gap-4">
              <button onClick={() => setActiveTab('farmers')} className={`font-bold transition-colors ${activeTab === 'farmers' ? 'text-[#5D0623]' : 'text-gray-400 hover:text-gray-600'}`}>
                Farmer Network
              </button>
              <button onClick={() => setActiveTab('beekeepers')} className={`font-bold transition-colors ${activeTab === 'beekeepers' ? 'text-[#5D0623]' : 'text-gray-400 hover:text-gray-600'}`}>
                Beekeeper Verifications
              </button>
            </div>
          </div>
          <div className="space-x-2">
            {activeTab === 'farmers' && (
              <button onClick={() => setShowAddForm(!showAddForm)} className="text-sm bg-[#5D0623] text-white px-4 py-2 rounded shadow-sm hover:bg-[#72072b] font-bold">
                {showAddForm ? 'Cancel' : '+ Add Farmer'}
              </button>
            )}
            <button onClick={loadData} className="text-sm bg-white border border-gray-200 px-3 py-2 rounded shadow-sm hover:bg-gray-50 font-bold">
              Refresh
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 border border-red-200 text-sm font-bold">⚠ {error}</div>}

        {activeTab === 'farmers' && showAddForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-8">
            <h3 className="font-bold text-gray-800 mb-4">Register New Farmer</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Farmer Name" className="p-3 border rounded-lg text-sm" value={newFarmer.name} onChange={e => setNewFarmer({...newFarmer, name: e.target.value})} />
              <input type="text" placeholder="Phone/Contact" className="p-3 border rounded-lg text-sm" value={newFarmer.contact} onChange={e => setNewFarmer({...newFarmer, contact: e.target.value})} />
              <input type="text" placeholder="Crops (comma separated)" className="p-3 border rounded-lg text-sm" value={newFarmer.crops} onChange={e => setNewFarmer({...newFarmer, crops: e.target.value})} />
              <div className="flex gap-2">
                <input type="number" placeholder="Lat" className="flex-1 p-3 border rounded-lg text-sm" value={newFarmer.lat} onChange={e => setNewFarmer({...newFarmer, lat: e.target.value})} />
                <input type="number" placeholder="Lng" className="flex-1 p-3 border rounded-lg text-sm" value={newFarmer.lng} onChange={e => setNewFarmer({...newFarmer, lng: e.target.value})} />
              </div>
            </div>
            <button onClick={handleAddFarmer} className="mt-6 w-full bg-[#5D0623] text-white py-3 rounded-xl font-bold hover:bg-[#72072b] transition-all">Save Farmer Record</button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-400 border-t-transparent" /></div>
        ) : activeTab === 'farmers' ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider font-extrabold text-gray-500">
                <tr><th className="px-4 py-4">Farmer Name</th><th className="px-4 py-4">Contact</th><th className="px-4 py-4">Status</th><th className="px-4 py-4 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {farmers.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-medium">No farmers found.</td></tr>
                ) : farmers.map(f => (
                  <tr key={f._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 font-bold text-sm text-gray-700">{f.name}</td>
                    <td className="px-4 py-4 font-mono text-xs text-gray-500">{f.contact}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-extrabold uppercase ${f.status === 'approved' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>{f.status}</span>
                    </td>
                    <td className="px-4 py-4 text-right space-x-2">
                       {f.status !== 'approved' && <button onClick={() => handleFarmerStatus(f._id, 'approved')} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-green-700">Approve</button>}
                       {f.status !== 'rejected' && <button onClick={() => handleFarmerStatus(f._id, 'rejected')} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-red-100">Reject</button>}
                       <button onClick={() => handleDeleteFarmer(f._id)} className="bg-gray-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-gray-600">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider font-extrabold text-gray-500">
                <tr><th className="px-4 py-4">Beekeeper Name / Email</th><th className="px-4 py-4">Verified Status</th><th className="px-4 py-4 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {beekeepers.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-12 text-center text-gray-400 font-medium">No active beekeepers found.</td></tr>
                ) : beekeepers.map(b => (
                  <tr key={b._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                       <p className="font-bold text-sm text-gray-700">{b.displayName}</p>
                       <p className="text-xs font-mono text-gray-400">{b.email}</p>
                    </td>
                    <td className="px-4 py-4">
                      {b.isVerified ? (
                        <span className="bg-green-50 text-green-600 border border-green-200 px-2 py-1 rounded-full text-[10px] uppercase font-bold">Verified</span>
                      ) : (
                        <span className="bg-amber-50 text-amber-600 border border-amber-200 px-2 py-1 rounded-full text-[10px] uppercase font-bold">Unverified</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                       {!b.isVerified ? (
                         <button onClick={() => handleVerifyBeekeeper(b._id, true)} className="bg-[#5D0623] text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase hover:bg-[#72072b]">
                           Grant Verification
                         </button>
                       ) : (
                         <button onClick={() => handleVerifyBeekeeper(b._id, false)} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-[10px] font-bold uppercase hover:bg-gray-200">
                           Revoke Verification
                         </button>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
