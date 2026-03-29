/**
 * User Management — Approval workflow and role management
 */
import React, { useState } from 'react';
import { 
  Users, Search, Filter, ShieldCheck, 
  UserPlus, CheckCircle2, XCircle, 
  MoreVertical, Mail, Calendar, Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, LocalUser } from '../../db';
import { EmptyState } from '../shared';

export function UserManagement() {
  const users = useLiveQuery(() => db.users.toArray()) ?? [];
  const [search, setSearch] = useState('');
  const [roleFilter, setRole] = useState<'all' | 'admin' | 'beekeeper'>('all');
  const [statusFilter, setStatus] = useState<'all' | 'pending' | 'approved'>('all');

  const filteredUsers = users.filter((u) => {
    if (search && !u.displayName.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    return true;
  });

  const handleApprove = async (userId: string) => {
    await db.users.update(userId, { status: 'approved', updatedAt: Date.now(), synced: false });
    // In a real app, this would queue a sync job to Firebase
  };

  const handleReject = async (userId: string) => {
    await db.users.delete(userId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">User Management</h1>
          <p className="text-sm text-slate-500">{users.length} users registered</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20">
          <UserPlus className="w-4 h-4" />
          Invite User
        </button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <p className="text-2xl font-black text-slate-800">{users.filter(u => u.status === 'pending').length}</p>
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-0.5">Pending Approval</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <p className="text-2xl font-black text-slate-800">{users.filter(u => u.role === 'beekeeper').length}</p>
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-0.5">Active Beekeepers</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <p className="text-2xl font-black text-slate-800">{users.filter(u => u.role === 'admin').length}</p>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Administrators</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-3 py-2 flex-1 min-w-48">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input 
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…" 
            className="flex-1 text-sm outline-none bg-transparent text-slate-700"
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRole(e.target.value as any)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none">
          <option value="all">All Roles</option>
          <option value="admin">Admins</option>
          <option value="beekeeper">Beekeepers</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatus(e.target.value as any)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {filteredUsers.length === 0 ? (
          <EmptyState icon={Users} title="No users found" description="Try adjusting your filters or search terms." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left">User</th>
                  <th className="px-5 py-3 text-left">Role</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Joined</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 uppercase">
                          {user.displayName.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-700">{user.displayName}</p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border',
                        user.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-primary/5 text-primary border-primary/10'
                      )}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <div className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          user.status === 'approved' ? 'bg-green-500' : 'bg-amber-500'
                        )} />
                        <span className={cn(
                          'text-[10px] font-bold uppercase tracking-widest',
                          user.status === 'approved' ? 'text-green-700' : 'text-amber-700'
                        )}>
                          {user.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs text-slate-500 font-medium">{format(new Date(user.createdAt), 'dd MMM yyyy')}</p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {user.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleApprove(user.id)}
                            className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                            title="Approve User"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleReject(user.id)}
                            className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            title="Reject User"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                          <MoreVertical className="w-4 h-4" />
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
}
