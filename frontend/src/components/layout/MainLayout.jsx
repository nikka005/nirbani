import React, { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
    LayoutDashboard, Milk, Users, Wallet, FileText, LogOut, Languages,
    ChartLine, Settings, ShoppingBag, Package, Receipt, Building2, Upload,
    Menu, X, Truck, Factory, TrendingUp, UserCog
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger, DropdownMenuSeparator,
} from '../ui/dropdown-menu';

const allNavItems = [
    { path: '/', icon: LayoutDashboard, label: { en: 'Dashboard', hi: 'डैशबोर्ड' }, exact: true },
    { path: '/collection', icon: Milk, label: { en: 'Collection', hi: 'संग्रह' } },
    { path: '/farmers', icon: Users, label: { en: 'Farmers', hi: 'किसान' } },
    { path: '/dairy-dispatch', icon: Truck, label: { en: 'Dairy Dispatch', hi: 'डेयरी डिस्पैच' } },
    { path: '/dairy-ledger', icon: Factory, label: { en: 'Dairy Ledger', hi: 'डेयरी खाता' } },
    { path: '/profit-dashboard', icon: TrendingUp, label: { en: 'Profit', hi: 'लाभ' } },
    { path: '/payments', icon: Wallet, label: { en: 'Payments', hi: 'भुगतान' } },
    { path: '/expenses', icon: Receipt, label: { en: 'Expenses', hi: 'खर्च' } },
    { path: '/sales', icon: ShoppingBag, label: { en: 'Sales', hi: 'बिक्री' } },
    { path: '/reports', icon: FileText, label: { en: 'Reports', hi: 'रिपोर्ट' } },
    { path: '/inventory', icon: Package, label: { en: 'Inventory', hi: 'इन्वेंटरी' } },
    { path: '/branches', icon: Building2, label: { en: 'Branches', hi: 'शाखाएँ' } },
    { path: '/bulk-upload', icon: Upload, label: { en: 'Bulk Upload', hi: 'अपलोड' } },
    { path: '/rate-chart', icon: ChartLine, label: { en: 'Rate Chart', hi: 'दर चार्ट' } },
    { path: '/settings', icon: Settings, label: { en: 'Settings', hi: 'सेटिंग्स' } },
    { path: '/users', icon: UserCog, label: { en: 'Users', hi: 'उपयोगकर्ता' }, adminOnly: true },
];

// Bottom nav: only 5 main items
const mobileNavItems = allNavItems.slice(0, 4);

const MainLayout = () => {
    const { user, logout, language, toggleLanguage } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = allNavItems.filter(item => !item.adminOnly || user?.role === 'admin');

    const isActive = (item) => item.exact 
        ? location.pathname === item.path 
        : location.pathname.startsWith(item.path);

    return (
        <div className="min-h-screen bg-zinc-50 pb-16 md:pb-0 md:pl-64">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-zinc-200 flex-col z-50">
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
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {allNavItems.map((item) => (
                        <NavLink key={item.path} to={item.path}
                            data-testid={`nav-${item.path.replace('/', '') || 'dashboard'}`}
                            className={cn("flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                                isActive(item) ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900")}>
                            <item.icon className={cn("w-5 h-5", isActive(item) && "text-emerald-600")} />
                            <span className="font-hindi">{item.label[language]}</span>
                        </NavLink>
                    ))}
                </nav>
                <div className="px-4 py-2">
                    <button onClick={toggleLanguage} data-testid="desktop-language-toggle"
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-colors font-semibold">
                        <Languages className="w-5 h-5" />{language === 'hi' ? 'English' : 'हिंदी'}
                    </button>
                </div>
                <div className="p-4 border-t border-zinc-100">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button data-testid="user-menu-trigger" className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 transition-colors">
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
                            <DropdownMenuItem onClick={toggleLanguage}><Languages className="w-4 h-4 mr-2" />{language === 'hi' ? 'Switch to English' : 'हिंदी में बदलें'}</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={logout} className="text-red-600"><LogOut className="w-4 h-4 mr-2" />{language === 'hi' ? 'लॉगआउट' : 'Logout'}</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-zinc-200 flex items-center justify-between px-3 z-40">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-700 rounded-lg flex items-center justify-center">
                        <Milk className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-heading font-bold text-zinc-900">Nirbani</span>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={toggleLanguage} data-testid="mobile-language-toggle"
                        className="text-xs h-8 px-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                        <Languages className="w-3 h-3 mr-1" />{language === 'hi' ? 'EN' : 'हिं'}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={logout} data-testid="mobile-logout" className="text-zinc-600 h-8 w-8">
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>
            </header>

            {/* Mobile Full Menu Overlay */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setMobileMenuOpen(false)}>
                    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="font-heading font-bold">{language === 'hi' ? 'मेनू' : 'Menu'}</h3>
                            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 p-4">
                            {allNavItems.map((item) => (
                                <button key={item.path} onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                                    data-testid={`menu-${item.path.replace('/', '') || 'dashboard'}`}
                                    className={cn("flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors",
                                        isActive(item) ? "bg-emerald-50 text-emerald-700" : "text-zinc-600 hover:bg-zinc-50")}>
                                    <item.icon className="w-6 h-6" />
                                    <span className="text-[11px] font-hindi font-medium text-center leading-tight">{item.label[language]}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="pt-14 md:pt-0 min-h-screen">
                <Outlet />
            </main>

            {/* Mobile Bottom Navigation - 5 items only */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 z-40 safe-bottom">
                <div className="flex items-center h-16">
                    {mobileNavItems.map((item) => (
                        <NavLink key={item.path} to={item.path}
                            data-testid={`mobile-nav-${item.path.replace('/', '') || 'dashboard'}`}
                            className={cn("flex-1 flex flex-col items-center justify-center gap-0.5 h-full",
                                isActive(item) ? "text-emerald-700" : "text-zinc-400")}>
                            <item.icon className={cn("w-5 h-5", isActive(item) && "text-emerald-600")} />
                            <span className={cn("text-[10px] font-hindi leading-none",
                                isActive(item) ? "text-emerald-700 font-bold" : "text-zinc-500")}>
                                {item.label[language]}
                            </span>
                        </NavLink>
                    ))}
                    {/* More button */}
                    <button onClick={() => setMobileMenuOpen(true)} data-testid="mobile-more-btn"
                        className={cn("flex-1 flex flex-col items-center justify-center gap-0.5 h-full",
                            mobileMenuOpen ? "text-emerald-700" : "text-zinc-400")}>
                        <Menu className="w-5 h-5" />
                        <span className="text-[10px] font-hindi leading-none text-zinc-500">
                            {language === 'hi' ? 'और' : 'More'}
                        </span>
                    </button>
                </div>
            </nav>
        </div>
    );
};

export default MainLayout;
