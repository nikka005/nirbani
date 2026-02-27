import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Shield, Users, LayoutDashboard, LogOut, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const adminNavItems = [
    { path: '/backman', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { path: '/backman/users', icon: Users, label: 'User Management' },
];

const AdminLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [adminUser, setAdminUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        const user = localStorage.getItem('admin_user');
        if (!token || !user) {
            navigate('/backman/login');
            return;
        }
        setAdminUser(JSON.parse(user));
        // Verify token
        axios.get(`${BACKEND_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => {
                if (res.data.role !== 'admin') {
                    localStorage.removeItem('admin_token');
                    localStorage.removeItem('admin_user');
                    navigate('/backman/login');
                }
            })
            .catch(() => {
                localStorage.removeItem('admin_token');
                localStorage.removeItem('admin_user');
                navigate('/backman/login');
            });
    }, [navigate]);

    const isActive = (item) => item.exact
        ? location.pathname === item.path
        : location.pathname.startsWith(item.path);

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        navigate('/backman/login');
    };

    if (!adminUser) return null;

    return (
        <div className="min-h-screen bg-zinc-950 md:pl-64">
            {/* Sidebar */}
            <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-zinc-900 border-r border-zinc-800 flex-col z-50">
                <div className="p-6 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-heading font-bold text-lg text-white">Nirbani</h1>
                            <p className="text-xs text-zinc-500">Admin Panel</p>
                        </div>
                    </div>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    {adminNavItems.map((item) => (
                        <NavLink key={item.path} to={item.path} end={item.exact}
                            data-testid={`admin-nav-${item.path.replace('/backman/', '').replace('/backman', 'dashboard')}`}
                            className={cn("flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                                isActive(item) ? "bg-amber-600/20 text-amber-500 font-semibold" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200")}>
                            <item.icon className={cn("w-5 h-5", isActive(item) && "text-amber-500")} />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>
                <div className="p-4 border-t border-zinc-800">
                    <div className="flex items-center gap-3 p-3 mb-2">
                        <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center font-bold text-white">
                            {adminUser?.name?.charAt(0)?.toUpperCase() || 'A'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-white truncate">{adminUser?.name}</p>
                            <p className="text-xs text-zinc-500 truncate">{adminUser?.email}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} data-testid="admin-logout"
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-xl transition-colors font-semibold text-sm">
                        <LogOut className="w-4 h-4" /> Logout
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 z-40">
                <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-500" />
                    <span className="font-heading font-bold text-white">Admin</span>
                </div>
                <div className="flex items-center gap-2">
                    {adminNavItems.map(item => (
                        <NavLink key={item.path} to={item.path} end={item.exact}
                            className={cn("p-2 rounded-lg", isActive(item) ? "bg-amber-600/20 text-amber-500" : "text-zinc-400")}>
                            <item.icon className="w-5 h-5" />
                        </NavLink>
                    ))}
                    <button onClick={handleLogout} className="p-2 text-red-400">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-14 md:pt-0 min-h-screen">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
