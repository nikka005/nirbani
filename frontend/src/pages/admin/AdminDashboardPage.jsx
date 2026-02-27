import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Users, Milk, ShoppingBag, Wallet, TrendingUp, Loader2 } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AdminDashboardPage = () => {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('admin_token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, usersRes] = await Promise.all([
                    axios.get(`${BACKEND_URL}/api/dashboard/stats`, { headers }),
                    axios.get(`${BACKEND_URL}/api/users`, { headers }),
                ]);
                setStats(statsRes.data);
                setUsers(usersRes.data);
            } catch (e) {
                console.error('Error fetching admin data:', e);
            } finally { setLoading(false); }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    const statCards = [
        { label: 'Total Users', value: users.length, icon: Users, color: 'amber' },
        { label: 'Active Users', value: users.filter(u => u.is_active !== false).length, icon: Users, color: 'emerald' },
        { label: 'Total Farmers', value: stats?.total_farmers || 0, icon: Milk, color: 'blue' },
        { label: 'Total Customers', value: stats?.total_customers || 0, icon: ShoppingBag, color: 'purple' },
        { label: "Today's Collection", value: `${stats?.today_milk || 0} L`, icon: TrendingUp, color: 'cyan' },
        { label: "Today's Revenue", value: `₹${(stats?.today_amount || 0).toLocaleString()}`, icon: Wallet, color: 'green' },
    ];

    const colorMap = {
        amber: { bg: 'bg-amber-600/10', text: 'text-amber-500', icon: 'text-amber-500' },
        emerald: { bg: 'bg-emerald-600/10', text: 'text-emerald-500', icon: 'text-emerald-500' },
        blue: { bg: 'bg-blue-600/10', text: 'text-blue-500', icon: 'text-blue-500' },
        purple: { bg: 'bg-purple-600/10', text: 'text-purple-500', icon: 'text-purple-500' },
        cyan: { bg: 'bg-cyan-600/10', text: 'text-cyan-500', icon: 'text-cyan-500' },
        green: { bg: 'bg-green-600/10', text: 'text-green-500', icon: 'text-green-500' },
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
            <div>
                <h1 className="font-heading text-2xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-zinc-500 text-sm">System overview and management</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4" data-testid="admin-stats-grid">
                {statCards.map((card, i) => {
                    const c = colorMap[card.color];
                    return (
                        <Card key={i} className="bg-zinc-900 border-zinc-800">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-8 h-8 ${c.bg} rounded-lg flex items-center justify-center`}>
                                        <card.icon className={`w-4 h-4 ${c.icon}`} />
                                    </div>
                                    <span className="text-xs text-zinc-500 font-semibold">{card.label}</span>
                                </div>
                                <p className={`text-2xl font-bold ${c.text} font-heading`}>{card.value}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Recent Users */}
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-white font-heading text-lg flex items-center gap-2">
                        <Users className="w-5 h-5 text-amber-500" /> Recent Users
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {users.slice(0, 5).map(u => (
                            <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm ${u.role === 'admin' ? 'bg-amber-600' : 'bg-zinc-600'}`}>
                                    {u.name?.charAt(0)?.toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">{u.name}</p>
                                    <p className="text-xs text-zinc-500">{u.email}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.role === 'admin' ? 'bg-amber-600/20 text-amber-500' : 'bg-blue-600/20 text-blue-400'}`}>
                                    {u.role}
                                </span>
                                {u.is_active === false && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600/20 text-red-400">Disabled</span>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminDashboardPage;
