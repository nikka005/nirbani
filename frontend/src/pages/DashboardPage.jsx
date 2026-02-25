import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../lib/api';
import { formatCurrency, formatNumber, getTodayDate } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
    Milk, 
    Users, 
    Wallet, 
    TrendingUp,
    Sun,
    Moon,
    Plus,
    ArrowRight,
    Droplets,
    Loader2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const DashboardPage = () => {
    const { language } = useAuth();
    const [stats, setStats] = useState(null);
    const [weeklyStats, setWeeklyStats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [statsRes, weeklyRes] = await Promise.all([
                dashboardAPI.getStats(),
                dashboardAPI.getWeeklyStats()
            ]);
            setStats(statsRes.data);
            setWeeklyStats(weeklyRes.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const texts = {
        greeting: language === 'hi' ? 'नमस्ते!' : 'Hello!',
        todayCollection: language === 'hi' ? 'आज का संग्रह' : "Today's Collection",
        totalFarmers: language === 'hi' ? 'कुल किसान' : 'Total Farmers',
        pendingPayments: language === 'hi' ? 'बकाया भुगतान' : 'Pending Payments',
        avgFat: language === 'hi' ? 'औसत फैट' : 'Average Fat',
        morning: language === 'hi' ? 'सुबह' : 'Morning',
        evening: language === 'hi' ? 'शाम' : 'Evening',
        quickActions: language === 'hi' ? 'त्वरित कार्य' : 'Quick Actions',
        addCollection: language === 'hi' ? 'दूध प्रविष्टि' : 'Add Collection',
        addFarmer: language === 'hi' ? 'किसान जोड़ें' : 'Add Farmer',
        makePayment: language === 'hi' ? 'भुगतान करें' : 'Make Payment',
        weeklyTrend: language === 'hi' ? 'साप्ताहिक रुझान' : 'Weekly Trend',
        liters: language === 'hi' ? 'लीटर' : 'Liters',
        viewAll: language === 'hi' ? 'सभी देखें' : 'View All',
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-2xl md:text-3xl font-bold text-zinc-900">
                        {texts.greeting}
                    </h1>
                    <p className="text-muted-foreground font-hindi">
                        {getTodayDate()}
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Today's Collection */}
                <Card className="stat-card card-hover" data-testid="stat-today-collection">
                    <CardContent className="p-4 md:p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground font-hindi mb-1">
                                    {texts.todayCollection}
                                </p>
                                <p className="text-2xl md:text-3xl font-bold text-emerald-700 font-heading">
                                    {formatNumber(stats?.today_milk_quantity || 0)} L
                                </p>
                                <p className="text-sm text-zinc-600 mt-1">
                                    {formatCurrency(stats?.today_milk_amount || 0)}
                                </p>
                            </div>
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                <Milk className="w-5 h-5 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Total Farmers */}
                <Card className="stat-card card-hover" data-testid="stat-total-farmers">
                    <CardContent className="p-4 md:p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground font-hindi mb-1">
                                    {texts.totalFarmers}
                                </p>
                                <p className="text-2xl md:text-3xl font-bold text-zinc-900 font-heading">
                                    {stats?.total_farmers || 0}
                                </p>
                                <p className="text-sm text-zinc-600 mt-1">
                                    {stats?.active_farmers || 0} {language === 'hi' ? 'सक्रिय' : 'active'}
                                </p>
                            </div>
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Pending Payments */}
                <Card className="stat-card card-hover" data-testid="stat-pending-payments">
                    <CardContent className="p-4 md:p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground font-hindi mb-1">
                                    {texts.pendingPayments}
                                </p>
                                <p className="text-2xl md:text-3xl font-bold text-orange-600 font-heading">
                                    {formatCurrency(stats?.total_pending_payments || 0)}
                                </p>
                            </div>
                            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                                <Wallet className="w-5 h-5 text-orange-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Average Fat */}
                <Card className="stat-card card-hover" data-testid="stat-avg-fat">
                    <CardContent className="p-4 md:p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground font-hindi mb-1">
                                    {texts.avgFat}
                                </p>
                                <p className="text-2xl md:text-3xl font-bold text-purple-600 font-heading">
                                    {formatNumber(stats?.avg_fat || 0, 1)}%
                                </p>
                                <p className="text-sm text-zinc-600 mt-1">
                                    SNF: {formatNumber(stats?.avg_snf || 0, 1)}%
                                </p>
                            </div>
                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                <Droplets className="w-5 h-5 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Morning/Evening Split */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="border-l-4 border-l-amber-500" data-testid="morning-collection">
                    <CardContent className="p-4 md:p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                            <Sun className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-hindi">{texts.morning}</p>
                            <p className="text-xl font-bold text-zinc-900 font-heading">
                                {formatNumber(stats?.today_morning_quantity || 0)} L
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-indigo-500" data-testid="evening-collection">
                    <CardContent className="p-4 md:p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                            <Moon className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-hindi">{texts.evening}</p>
                            <p className="text-xl font-bold text-zinc-900 font-heading">
                                {formatNumber(stats?.today_evening_quantity || 0)} L
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="font-heading font-semibold text-lg mb-4 text-zinc-900">
                    {texts.quickActions}
                </h2>
                <div className="grid grid-cols-3 gap-4">
                    <Link to="/collection" data-testid="quick-add-collection">
                        <div className="quick-action">
                            <div className="icon bg-emerald-700">
                                <Milk className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-semibold text-zinc-700 font-hindi text-center">
                                {texts.addCollection}
                            </span>
                        </div>
                    </Link>

                    <Link to="/farmers?add=true" data-testid="quick-add-farmer">
                        <div className="quick-action">
                            <div className="icon bg-blue-600">
                                <Plus className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-semibold text-zinc-700 font-hindi text-center">
                                {texts.addFarmer}
                            </span>
                        </div>
                    </Link>

                    <Link to="/payments?add=true" data-testid="quick-make-payment">
                        <div className="quick-action">
                            <div className="icon bg-orange-600">
                                <Wallet className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-semibold text-zinc-700 font-hindi text-center">
                                {texts.makePayment}
                            </span>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Weekly Trend Chart */}
            <Card data-testid="weekly-trend-chart">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="font-heading text-lg">
                        {texts.weeklyTrend}
                    </CardTitle>
                    <Link to="/reports">
                        <Button variant="ghost" size="sm" className="text-emerald-600">
                            {texts.viewAll}
                            <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={weeklyStats}>
                                <defs>
                                    <linearGradient id="colorQuantity" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#047857" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#047857" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                    tick={{ fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis 
                                    tick={{ fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(val) => `${val}L`}
                                />
                                <Tooltip 
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-white p-3 rounded-lg shadow-lg border">
                                                    <p className="text-sm text-zinc-500">{new Date(label).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                                                    <p className="font-bold text-emerald-700">{formatNumber(payload[0].value)} {texts.liters}</p>
                                                    <p className="text-sm text-zinc-600">{formatCurrency(payload[0].payload.amount)}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="quantity" 
                                    stroke="#047857" 
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorQuantity)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DashboardPage;
