import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
    LayoutDashboard, 
    Milk, 
    Users, 
    Wallet, 
    FileText,
    LogOut,
    Languages,
    ChartLine
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '../ui/dropdown-menu';

const navItems = [
    { 
        path: '/', 
        icon: LayoutDashboard, 
        label: { en: 'Dashboard', hi: 'डैशबोर्ड' },
        exact: true 
    },
    { 
        path: '/collection', 
        icon: Milk, 
        label: { en: 'Collection', hi: 'संग्रह' } 
    },
    { 
        path: '/farmers', 
        icon: Users, 
        label: { en: 'Farmers', hi: 'किसान' } 
    },
    { 
        path: '/payments', 
        icon: Wallet, 
        label: { en: 'Payments', hi: 'भुगतान' } 
    },
    { 
        path: '/reports', 
        icon: FileText, 
        label: { en: 'Reports', hi: 'रिपोर्ट' } 
    },
];

const MainLayout = () => {
    const { user, logout, language, toggleLanguage } = useAuth();
    const location = useLocation();

    return (
        <div className="min-h-screen bg-zinc-50 pb-20 md:pb-0 md:pl-64">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-zinc-200 flex-col z-50">
                {/* Logo */}
                <div className="p-6 border-b border-zinc-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-700 rounded-xl flex items-center justify-center">
                            <Milk className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-heading font-bold text-lg text-zinc-900">Nirbani</h1>
                            <p className="text-xs text-zinc-500 font-hindi">डेयरी प्रबंधन</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = item.exact 
                            ? location.pathname === item.path
                            : location.pathname.startsWith(item.path);
                        
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                data-testid={`nav-${item.path.replace('/', '') || 'dashboard'}`}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                                    isActive 
                                        ? "bg-emerald-50 text-emerald-700 font-semibold" 
                                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                                )}
                            >
                                <item.icon className={cn("w-5 h-5", isActive && "text-emerald-600")} />
                                <span className="font-hindi">{item.label[language]}</span>
                            </NavLink>
                        );
                    })}
                    
                    {/* Rate Chart Link */}
                    <NavLink
                        to="/rate-chart"
                        data-testid="nav-rate-chart"
                        className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                            location.pathname === '/rate-chart'
                                ? "bg-emerald-50 text-emerald-700 font-semibold" 
                                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                        )}
                    >
                        <ChartLine className={cn("w-5 h-5", location.pathname === '/rate-chart' && "text-emerald-600")} />
                        <span className="font-hindi">{language === 'hi' ? 'दर चार्ट' : 'Rate Chart'}</span>
                    </NavLink>
                </nav>

                {/* Language Toggle */}
                <div className="px-4 py-2">
                    <button
                        onClick={toggleLanguage}
                        data-testid="desktop-language-toggle"
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-colors font-semibold"
                    >
                        <Languages className="w-5 h-5" />
                        {language === 'hi' ? 'English' : 'हिंदी'}
                    </button>
                </div>

                {/* User Menu */}
                <div className="p-4 border-t border-zinc-100">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button 
                                data-testid="user-menu-trigger"
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 transition-colors"
                            >
                                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
                                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-semibold text-sm text-zinc-900 truncate">{user?.name}</p>
                                    <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                                </div>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={toggleLanguage} data-testid="toggle-language">
                                <Languages className="w-4 h-4 mr-2" />
                                {language === 'hi' ? 'Switch to English' : 'हिंदी में बदलें'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={logout} className="text-red-600" data-testid="logout-btn">
                                <LogOut className="w-4 h-4 mr-2" />
                                {language === 'hi' ? 'लॉगआउट' : 'Logout'}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-zinc-200 flex items-center justify-between px-4 z-40">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-700 rounded-lg flex items-center justify-center">
                        <Milk className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-heading font-bold text-zinc-900">Nirbani</span>
                </div>
                <div className="flex items-center gap-1">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={toggleLanguage}
                        data-testid="mobile-language-toggle"
                        className="text-xs h-8 px-3 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                        <Languages className="w-3 h-3 mr-1" />
                        {language === 'hi' ? 'EN' : 'हिं'}
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={logout}
                        data-testid="mobile-logout"
                        className="text-zinc-600 h-8 w-8"
                    >
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-14 md:pt-0 min-h-screen">
                <Outlet />
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bottom-nav border-t border-zinc-200 pb-safe z-40">
                <div className="flex items-center justify-around h-16">
                    {navItems.map((item) => {
                        const isActive = item.exact 
                            ? location.pathname === item.path
                            : location.pathname.startsWith(item.path);
                        
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                data-testid={`mobile-nav-${item.path.replace('/', '') || 'dashboard'}`}
                                className={cn(
                                    "nav-item flex-1",
                                    isActive && "active"
                                )}
                            >
                                <item.icon className={cn("w-5 h-5 icon", isActive && "text-emerald-700")} />
                                <span className={cn(
                                    "text-xs font-hindi",
                                    isActive ? "text-emerald-700 font-semibold" : "text-zinc-500"
                                )}>
                                    {item.label[language]}
                                </span>
                            </NavLink>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
};

export default MainLayout;
