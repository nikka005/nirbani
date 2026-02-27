import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '../components/ui/dialog';
import { Users, Plus, Loader2, Shield, ShieldCheck, UserX, KeyRound, Trash2, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const UsersPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', role: 'staff' });

    const currentUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
    const token = localStorage.getItem('admin_token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        try {
            const res = await axios.get(`${BACKEND_URL}/api/users`, { headers });
            setUsers(res.data);
        } catch (e) {
            toast.error('Failed to load users');
        } finally { setLoading(false); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.password) {
            toast.error('Fill all required fields');
            return;
        }
        setSubmitting(true);
        try {
            await axios.post(`${BACKEND_URL}/api/auth/register`, formData, { headers });
            toast.success('User created!');
            setFormData({ name: '', email: '', phone: '', password: '', role: 'staff' });
            setShowAddDialog(false);
            fetchUsers();
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Error creating user');
        } finally { setSubmitting(false); }
    };

    const toggleActive = async (userId, currentActive) => {
        try {
            await axios.put(`${BACKEND_URL}/api/users/${userId}`, { is_active: !currentActive }, { headers });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentActive } : u));
            toast.success(!currentActive ? 'User activated' : 'User deactivated');
        } catch (e) {
            toast.error('Failed to update');
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        setSubmitting(true);
        try {
            await axios.put(`${BACKEND_URL}/api/users/${selectedUserId}/reset-password`, { password: newPassword }, { headers });
            toast.success('Password reset!');
            setShowPasswordDialog(false);
            setNewPassword('');
        } catch (e) {
            toast.error('Failed to reset password');
        } finally { setSubmitting(false); }
    };

    const handleDelete = async (userId) => {
        if (!window.confirm('Delete this user?')) return;
        try {
            await axios.delete(`${BACKEND_URL}/api/users/${userId}`, { headers });
            setUsers(prev => prev.filter(u => u.id !== userId));
            toast.success('User deleted');
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Failed to delete');
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-white">User Management</h1>
                    <p className="text-zinc-500 text-sm">Manage staff logins ({users.length})</p>
                </div>
                <Button onClick={() => setShowAddDialog(true)} data-testid="add-user-btn" className="bg-amber-600 hover:bg-amber-700">
                    <Plus className="w-4 h-4 mr-2" />Add User
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
            ) : users.length === 0 ? (
                <div className="text-center py-12">
                    <Users className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-500">No users found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {users.map((u) => (
                        <Card key={u.id} data-testid={`user-${u.id}`} className={cn("bg-zinc-900 border-zinc-800", !u.is_active && "opacity-60")}>
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold",
                                    u.role === 'admin' ? "bg-amber-600" : "bg-zinc-600")}>
                                    {u.name?.charAt(0)?.toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-semibold text-white truncate">{u.name}</p>
                                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                            u.role === 'admin' ? "bg-amber-600/20 text-amber-500" : "bg-blue-600/20 text-blue-400")}>
                                            {u.role}
                                        </span>
                                        {u.is_active === false && (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600/20 text-red-400">
                                                Disabled
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-zinc-500">
                                        <span>{u.email}</span>
                                        {u.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{u.phone}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {u.id !== currentUser?.id && (
                                        <>
                                            <Button variant="ghost" size="icon" data-testid={`toggle-user-${u.id}`}
                                                onClick={() => toggleActive(u.id, u.is_active !== false)}
                                                title={u.is_active !== false ? 'Deactivate' : 'Activate'}>
                                                {u.is_active !== false ? <UserX className="w-4 h-4 text-zinc-500" /> : <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                                            </Button>
                                            <Button variant="ghost" size="icon" data-testid={`reset-pwd-${u.id}`}
                                                onClick={() => { setSelectedUserId(u.id); setShowPasswordDialog(true); }}
                                                title="Reset Password">
                                                <KeyRound className="w-4 h-4 text-zinc-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" data-testid={`delete-user-${u.id}`}
                                                onClick={() => handleDelete(u.id)} title="Delete">
                                                <Trash2 className="w-4 h-4 text-zinc-600 hover:text-red-500" />
                                            </Button>
                                        </>
                                    )}
                                    {u.id === currentUser?.id && (
                                        <span className="text-xs text-amber-500 font-semibold px-2">You</span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add User Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-heading flex items-center gap-2">
                            <Shield className="w-5 h-5 text-amber-600" />
                            Add New User
                        </DialogTitle>
                        <DialogDescription>Create login credentials for staff</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name *</Label>
                            <Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                                data-testid="new-user-name" placeholder="Staff name" className="h-12" required />
                        </div>
                        <div className="space-y-2">
                            <Label>Email *</Label>
                            <Input type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                                data-testid="new-user-email" placeholder="staff@dairy.com" className="h-12" required />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input type="tel" value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                                data-testid="new-user-phone" placeholder="9876543210" className="h-12" />
                        </div>
                        <div className="space-y-2">
                            <Label>Password *</Label>
                            <Input type="text" value={formData.password} onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                                data-testid="new-user-password" placeholder="Min 6 characters" className="h-12" required minLength={6} />
                        </div>
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {['staff', 'admin'].map(role => (
                                    <button key={role} type="button" onClick={() => setFormData(p => ({ ...p, role }))}
                                        data-testid={`role-${role}`}
                                        className={cn("py-3 rounded-xl border-2 text-sm font-semibold transition-all",
                                            formData.role === role ? "border-amber-500 bg-amber-50 text-amber-700" : "border-zinc-200 text-zinc-600")}>
                                        {role === 'admin' ? 'Admin' : 'Staff'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <Button type="submit" data-testid="submit-new-user" className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-base" disabled={submitting}>
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create User'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Reset Password Dialog */}
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="font-heading flex items-center gap-2">
                            <KeyRound className="w-5 h-5 text-amber-600" />
                            Reset Password
                        </DialogTitle>
                        <DialogDescription>Set a new password for this user</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>New Password</Label>
                            <Input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                                data-testid="reset-password-input" placeholder="Min 6 characters" className="h-12" minLength={6} />
                        </div>
                        <Button onClick={handleResetPassword} data-testid="confirm-reset-password"
                            className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-base" disabled={submitting}>
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default UsersPage;
