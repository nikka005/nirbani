import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '../components/ui/dialog';
import { 
    Building2, 
    Plus,
    Edit,
    Trash2,
    Loader2,
    Phone,
    MapPin,
    User,
    Milk
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { cn, formatCurrency } from '../lib/utils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const BranchesPage = () => {
    const { language } = useAuth();
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        address: '',
        phone: '',
        manager_name: '',
    });

    const texts = {
        title: language === 'hi' ? 'शाखा प्रबंधन' : 'Branch Management',
        addBranch: language === 'hi' ? 'शाखा जोड़ें' : 'Add Branch',
        editBranch: language === 'hi' ? 'शाखा संपादित करें' : 'Edit Branch',
        name: language === 'hi' ? 'शाखा का नाम' : 'Branch Name',
        code: language === 'hi' ? 'शाखा कोड' : 'Branch Code',
        address: language === 'hi' ? 'पता' : 'Address',
        phone: language === 'hi' ? 'फ़ोन' : 'Phone',
        manager: language === 'hi' ? 'प्रबंधक' : 'Manager',
        save: language === 'hi' ? 'सहेजें' : 'Save',
        noBranches: language === 'hi' ? 'कोई शाखा नहीं' : 'No branches',
        todayCollection: language === 'hi' ? 'आज का संग्रह' : "Today's Collection",
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        const token = localStorage.getItem('auth_token');
        try {
            const response = await axios.get(`${BACKEND_URL}/api/branches`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Fetch stats for each branch
            const branchesWithStats = await Promise.all(
                response.data.map(async (branch) => {
                    try {
                        const statsRes = await axios.get(`${BACKEND_URL}/api/branches/${branch.id}/stats`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        return { ...branch, stats: statsRes.data };
                    } catch {
                        return { ...branch, stats: null };
                    }
                })
            );
            
            setBranches(branchesWithStats);
        } catch (error) {
            console.error('Error fetching branches:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.code) {
            toast.error(language === 'hi' ? 'नाम और कोड आवश्यक है' : 'Name and code required');
            return;
        }
        setSubmitting(true);
        const token = localStorage.getItem('auth_token');
        try {
            if (editingBranch) {
                await axios.put(`${BACKEND_URL}/api/branches/${editingBranch.id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success(language === 'hi' ? 'शाखा अपडेट हुई!' : 'Branch updated!');
            } else {
                await axios.post(`${BACKEND_URL}/api/branches`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success(language === 'hi' ? 'शाखा जोड़ी गई!' : 'Branch added!');
            }
            setFormData({ name: '', code: '', address: '', phone: '', manager_name: '' });
            setEditingBranch(null);
            setShowAddDialog(false);
            fetchBranches();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error saving branch');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (branch) => {
        setEditingBranch(branch);
        setFormData({
            name: branch.name,
            code: branch.code,
            address: branch.address,
            phone: branch.phone,
            manager_name: branch.manager_name,
        });
        setShowAddDialog(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm(language === 'hi' ? 'क्या आप इसे हटाना चाहते हैं?' : 'Delete this branch?')) return;
        const token = localStorage.getItem('auth_token');
        try {
            await axios.delete(`${BACKEND_URL}/api/branches/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBranches(prev => prev.filter(b => b.id !== id));
            toast.success(language === 'hi' ? 'शाखा हटाई गई' : 'Branch deleted');
        } catch (error) {
            toast.error('Error deleting branch');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="font-heading text-2xl font-bold text-zinc-900">{texts.title}</h1>
                <Button 
                    onClick={() => {
                        setEditingBranch(null);
                        setFormData({ name: '', code: '', address: '', phone: '', manager_name: '' });
                        setShowAddDialog(true);
                    }} 
                    data-testid="add-branch-btn" 
                    className="bg-emerald-700 hover:bg-emerald-800"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    {texts.addBranch}
                </Button>
            </div>

            {branches.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                    <Building2 className="w-12 h-12 mx-auto mb-4 text-zinc-300" />
                    <p className="font-hindi">{texts.noBranches}</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    {branches.map((branch) => (
                        <Card key={branch.id} className="card-hover">
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="font-heading text-lg flex items-center gap-2">
                                            <Building2 className="w-5 h-5 text-emerald-600" />
                                            {branch.name}
                                        </CardTitle>
                                        <p className="text-sm text-zinc-500 font-mono">{branch.code}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(branch)}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(branch.id)} className="text-red-600">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm">
                                    {branch.address && (
                                        <div className="flex items-center gap-2 text-zinc-600">
                                            <MapPin className="w-4 h-4" />
                                            {branch.address}
                                        </div>
                                    )}
                                    {branch.phone && (
                                        <div className="flex items-center gap-2 text-zinc-600">
                                            <Phone className="w-4 h-4" />
                                            {branch.phone}
                                        </div>
                                    )}
                                    {branch.manager_name && (
                                        <div className="flex items-center gap-2 text-zinc-600">
                                            <User className="w-4 h-4" />
                                            {branch.manager_name}
                                        </div>
                                    )}
                                </div>
                                
                                {branch.stats && (
                                    <div className="mt-4 pt-4 border-t">
                                        <p className="text-xs text-zinc-500 mb-2">{texts.todayCollection}</p>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1 text-emerald-600">
                                                <Milk className="w-4 h-4" />
                                                <span className="font-bold">{branch.stats.today?.quantity || 0} L</span>
                                            </div>
                                            <span className="text-zinc-400">|</span>
                                            <span className="font-bold text-emerald-700">
                                                {formatCurrency(branch.stats.today?.amount || 0)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add/Edit Branch Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-heading flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-emerald-600" />
                            {editingBranch ? texts.editBranch : texts.addBranch}
                        </DialogTitle>
                        <DialogDescription>
                            {language === 'hi' ? 'शाखा की जानकारी दर्ज करें' : 'Enter branch details'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="font-hindi">{texts.name} *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder={language === 'hi' ? 'शाखा का नाम' : 'Branch name'}
                                    className="h-12"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-hindi">{texts.code} *</Label>
                                <Input
                                    value={formData.code}
                                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                    placeholder="BR001"
                                    className="h-12 font-mono"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-hindi">{texts.address}</Label>
                            <Input
                                value={formData.address}
                                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                placeholder={language === 'hi' ? 'पता' : 'Address'}
                                className="h-12"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="font-hindi">{texts.phone}</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="9876543210"
                                    className="h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-hindi">{texts.manager}</Label>
                                <Input
                                    value={formData.manager_name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, manager_name: e.target.value }))}
                                    placeholder={language === 'hi' ? 'प्रबंधक का नाम' : 'Manager name'}
                                    className="h-12"
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full h-12 bg-emerald-700 hover:bg-emerald-800" disabled={submitting}>
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : texts.save}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BranchesPage;
