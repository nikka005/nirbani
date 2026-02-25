import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportAPI, farmerAPI } from '../lib/api';
import { formatCurrency, formatNumber, formatDate, getTodayDate } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../components/ui/table';
import { 
    FileText, Calendar, Users, Milk, Wallet, Download, Loader2, Sun, Moon,
    Trophy, BarChart3, TrendingUp
} from 'lucide-react';
import { cn } from '../lib/utils';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ReportsPage = () => {
    const { language } = useAuth();
    const [activeTab, setActiveTab] = useState('daily');
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(getTodayDate());
    const [selectedFarmer, setSelectedFarmer] = useState('');
    const [farmers, setFarmers] = useState([]);
    const [dailyReport, setDailyReport] = useState(null);
    const [farmerReport, setFarmerReport] = useState(null);
    const [fatReport, setFatReport] = useState(null);
    const [rankingReport, setRankingReport] = useState(null);
    const [monthlyReport, setMonthlyReport] = useState(null);
    const [rankSortBy, setRankSortBy] = useState('quantity');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    const t = (en, hi) => language === 'hi' ? hi : en;

    useEffect(() => { fetchFarmers(); }, []);
    useEffect(() => { if (activeTab === 'daily' && selectedDate) fetchDailyReport(); }, [activeTab, selectedDate]);

    const fetchFarmers = async () => {
        try { const r = await farmerAPI.getAll(); setFarmers(r.data); } catch (e) { console.error(e); }
    };

    const fetchDailyReport = async () => {
        setLoading(true);
        try { const r = await reportAPI.getDaily(selectedDate); setDailyReport(r.data); } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const fetchFarmerReport = async () => {
        if (!selectedFarmer) return;
        setLoading(true);
        try { const r = await reportAPI.getFarmerReport(selectedFarmer); setFarmerReport(r.data); } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const fetchFatReport = async () => {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        try {
            const r = await axios.get(`${BACKEND_URL}/api/reports/fat-average`, { headers: { Authorization: `Bearer ${token}` } });
            setFatReport(r.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const fetchRankingReport = async () => {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        try {
            const r = await axios.get(`${BACKEND_URL}/api/reports/farmer-ranking?sort_by=${rankSortBy}`, { headers: { Authorization: `Bearer ${token}` } });
            setRankingReport(r.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const fetchMonthlyReport = async () => {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        try {
            const r = await axios.get(`${BACKEND_URL}/api/reports/monthly-summary?month=${selectedMonth}`, { headers: { Authorization: `Bearer ${token}` } });
            setMonthlyReport(r.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleExport = async (type) => {
        const token = localStorage.getItem('auth_token');
        try {
            const response = await axios.get(`${BACKEND_URL}/api/export/${type}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}_export.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success(t('Downloaded!', 'डाउनलोड हुआ!'));
        } catch (e) { toast.error(t('Export failed', 'एक्सपोर्ट विफल')); }
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="font-heading text-2xl font-bold text-zinc-900">{t('Reports', 'रिपोर्ट')}</h1>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleExport('collections')} data-testid="export-collections">
                        <Download className="w-4 h-4 mr-1" />{t('Collections', 'संग्रह')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport('farmers')} data-testid="export-farmers">
                        <Download className="w-4 h-4 mr-1" />{t('Farmers', 'किसान')}
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="daily" data-testid="daily-report-tab" className="font-hindi text-xs sm:text-sm">
                        <Calendar className="w-4 h-4 mr-1 hidden sm:block" />{t('Daily', 'दैनिक')}
                    </TabsTrigger>
                    <TabsTrigger value="farmer" data-testid="farmer-report-tab" className="font-hindi text-xs sm:text-sm">
                        <Users className="w-4 h-4 mr-1 hidden sm:block" />{t('Farmer', 'किसान')}
                    </TabsTrigger>
                    <TabsTrigger value="fat" data-testid="fat-report-tab" className="font-hindi text-xs sm:text-sm">
                        <BarChart3 className="w-4 h-4 mr-1 hidden sm:block" />{t('Fat Avg', 'फैट')}
                    </TabsTrigger>
                    <TabsTrigger value="ranking" data-testid="ranking-report-tab" className="font-hindi text-xs sm:text-sm">
                        <Trophy className="w-4 h-4 mr-1 hidden sm:block" />{t('Ranking', 'रैंकिंग')}
                    </TabsTrigger>
                    <TabsTrigger value="monthly" data-testid="monthly-report-tab" className="font-hindi text-xs sm:text-sm">
                        <TrendingUp className="w-4 h-4 mr-1 hidden sm:block" />{t('Monthly', 'मासिक')}
                    </TabsTrigger>
                </TabsList>

                {/* Daily Report */}
                <TabsContent value="daily" className="space-y-4 mt-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-end gap-4">
                                <div className="flex-1 space-y-2">
                                    <Label className="font-hindi">{t('Select Date', 'तारीख चुनें')}</Label>
                                    <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} data-testid="daily-report-date" className="h-12" />
                                </div>
                                <Button onClick={fetchDailyReport} data-testid="generate-daily-report" className="bg-emerald-700 hover:bg-emerald-800 h-12">
                                    {t('View Report', 'रिपोर्ट देखें')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                    {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div> : dailyReport ? (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card className="bg-emerald-50 border-emerald-200"><CardContent className="p-4">
                                    <div className="flex items-center gap-2 mb-1"><Milk className="w-4 h-4 text-emerald-600" /><span className="text-sm text-emerald-600 font-hindi">{t('Total Collection', 'कुल संग्रह')}</span></div>
                                    <p className="text-2xl font-bold text-emerald-700 font-heading">{formatNumber(dailyReport.summary.total_quantity)} L</p>
                                </CardContent></Card>
                                <Card className="bg-blue-50 border-blue-200"><CardContent className="p-4">
                                    <div className="flex items-center gap-2 mb-1"><Wallet className="w-4 h-4 text-blue-600" /><span className="text-sm text-blue-600 font-hindi">{t('Total Amount', 'कुल राशि')}</span></div>
                                    <p className="text-2xl font-bold text-blue-700 font-heading">{formatCurrency(dailyReport.summary.total_amount)}</p>
                                </CardContent></Card>
                                <Card className="bg-amber-50 border-amber-200"><CardContent className="p-4">
                                    <div className="flex items-center gap-2 mb-1"><Sun className="w-4 h-4 text-amber-600" /><span className="text-sm text-amber-600 font-hindi">{t('Morning', 'सुबह')}</span></div>
                                    <p className="text-2xl font-bold text-amber-700 font-heading">{formatNumber(dailyReport.summary.morning_quantity)} L</p>
                                </CardContent></Card>
                                <Card className="bg-indigo-50 border-indigo-200"><CardContent className="p-4">
                                    <div className="flex items-center gap-2 mb-1"><Moon className="w-4 h-4 text-indigo-600" /><span className="text-sm text-indigo-600 font-hindi">{t('Evening', 'शाम')}</span></div>
                                    <p className="text-2xl font-bold text-indigo-700 font-heading">{formatNumber(dailyReport.summary.evening_quantity)} L</p>
                                </CardContent></Card>
                            </div>
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="font-heading text-lg flex items-center gap-2">
                                            <Milk className="w-5 h-5 text-emerald-600" />{t('Collections', 'संग्रह')}
                                        </CardTitle>
                                        <Button variant="outline" size="sm" onClick={() => handleExport('collections')}><Download className="w-4 h-4 mr-1" />Excel</Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {dailyReport.collections.length === 0 ? <p className="text-center text-zinc-500 py-8 font-hindi">{t('No data', 'कोई डेटा नहीं')}</p> : (
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader><TableRow>
                                                    <TableHead className="font-hindi">{t('Farmer', 'किसान')}</TableHead>
                                                    <TableHead className="font-hindi">{t('Shift', 'पाली')}</TableHead>
                                                    <TableHead className="font-hindi">{t('Qty', 'मात्रा')}</TableHead>
                                                    <TableHead className="font-hindi">{t('Fat', 'फैट')}</TableHead>
                                                    <TableHead className="font-hindi">{t('SNF', 'SNF')}</TableHead>
                                                    <TableHead className="font-hindi">{t('Rate', 'दर')}</TableHead>
                                                    <TableHead className="font-hindi text-right">{t('Amount', 'राशि')}</TableHead>
                                                </TableRow></TableHeader>
                                                <TableBody>
                                                    {dailyReport.collections.map((c) => (
                                                        <TableRow key={c.id}>
                                                            <TableCell className="font-semibold">{c.farmer_name}</TableCell>
                                                            <TableCell><span className={cn("px-2 py-1 rounded text-xs font-semibold", c.shift === 'morning' ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700")}>{c.shift}</span></TableCell>
                                                            <TableCell>{formatNumber(c.quantity)} L</TableCell>
                                                            <TableCell>{c.fat}%</TableCell>
                                                            <TableCell>{c.snf}%</TableCell>
                                                            <TableCell>{formatCurrency(c.rate)}</TableCell>
                                                            <TableCell className="text-right font-semibold text-emerald-700">{formatCurrency(c.amount)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    ) : null}
                </TabsContent>

                {/* Farmer Report */}
                <TabsContent value="farmer" className="space-y-4 mt-4">
                    <Card><CardContent className="p-4">
                        <div className="flex items-end gap-4">
                            <div className="flex-1 space-y-2">
                                <Label className="font-hindi">{t('Select Farmer', 'किसान चुनें')}</Label>
                                <Select value={selectedFarmer} onValueChange={setSelectedFarmer}>
                                    <SelectTrigger className="h-12" data-testid="farmer-report-select"><SelectValue placeholder={t('Select Farmer', 'किसान चुनें')} /></SelectTrigger>
                                    <SelectContent>{farmers.map(f => <SelectItem key={f.id} value={f.id}>{f.name} - {f.phone}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <Button onClick={fetchFarmerReport} data-testid="generate-farmer-report" className="bg-emerald-700 hover:bg-emerald-800 h-12" disabled={!selectedFarmer}>{t('View Report', 'रिपोर्ट देखें')}</Button>
                        </div>
                    </CardContent></Card>
                    {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div> : farmerReport ? (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card className="bg-blue-50 border-blue-200"><CardContent className="p-4"><p className="text-sm text-blue-600 font-hindi mb-1">{t('Total Milk', 'कुल दूध')}</p><p className="text-2xl font-bold text-blue-700">{formatNumber(farmerReport.summary.total_milk)} L</p></CardContent></Card>
                                <Card className="bg-amber-50 border-amber-200"><CardContent className="p-4"><p className="text-sm text-amber-600 font-hindi mb-1">{t('Total Due', 'कुल देय')}</p><p className="text-2xl font-bold text-amber-700">{formatCurrency(farmerReport.summary.total_amount)}</p></CardContent></Card>
                                <Card className="bg-emerald-50 border-emerald-200"><CardContent className="p-4"><p className="text-sm text-emerald-600 font-hindi mb-1">{t('Total Paid', 'कुल भुगतान')}</p><p className="text-2xl font-bold text-emerald-700">{formatCurrency(farmerReport.summary.total_paid)}</p></CardContent></Card>
                                <Card className={farmerReport.summary.balance > 0 ? "bg-orange-50 border-orange-200" : "bg-green-50 border-green-200"}><CardContent className="p-4"><p className={cn("text-sm font-hindi mb-1", farmerReport.summary.balance > 0 ? "text-orange-600" : "text-green-600")}>{t('Balance', 'बकाया')}</p><p className={cn("text-2xl font-bold", farmerReport.summary.balance > 0 ? "text-orange-700" : "text-green-700")}>{formatCurrency(farmerReport.summary.balance)}</p></CardContent></Card>
                            </div>
                            <Card><CardHeader><CardTitle className="font-heading text-lg">{t('Recent Collections', 'हाल के संग्रह')}</CardTitle></CardHeader>
                                <CardContent>
                                    {farmerReport.collections.length === 0 ? <p className="text-center text-zinc-500 py-8">{t('No data', 'कोई डेटा नहीं')}</p> : (
                                        <div className="overflow-x-auto"><Table><TableHeader><TableRow>
                                            <TableHead>{t('Date', 'तारीख')}</TableHead><TableHead>{t('Shift', 'पाली')}</TableHead><TableHead>{t('Qty', 'मात्रा')}</TableHead><TableHead>{t('Fat', 'फैट')}</TableHead><TableHead>{t('Rate', 'दर')}</TableHead><TableHead className="text-right">{t('Amount', 'राशि')}</TableHead>
                                        </TableRow></TableHeader><TableBody>
                                            {farmerReport.collections.slice(0, 20).map((c) => (
                                                <TableRow key={c.id}><TableCell>{formatDate(c.date)}</TableCell><TableCell>{c.shift === 'morning' ? 'AM' : 'PM'}</TableCell><TableCell>{formatNumber(c.quantity)} L</TableCell><TableCell>{c.fat}%</TableCell><TableCell>{formatCurrency(c.rate)}</TableCell><TableCell className="text-right font-semibold text-emerald-700">{formatCurrency(c.amount)}</TableCell></TableRow>
                                            ))}
                                        </TableBody></Table></div>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    ) : null}
                </TabsContent>

                {/* Fat Average Report */}
                <TabsContent value="fat" className="space-y-4 mt-4">
                    <Card><CardContent className="p-4 flex items-end gap-4">
                        <div className="flex-1"><p className="text-sm text-zinc-600 font-hindi">{t('Fat average report for current month', 'इस महीने की फैट औसत रिपोर्ट')}</p></div>
                        <Button onClick={fetchFatReport} data-testid="generate-fat-report" className="bg-emerald-700 hover:bg-emerald-800 h-12">{t('View Report', 'रिपोर्ट देखें')}</Button>
                    </CardContent></Card>
                    {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div> : fatReport ? (
                        <Card><CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-emerald-600" />{t('Fat Average by Farmer', 'किसान वार फैट औसत')}</CardTitle></CardHeader>
                            <CardContent>
                                {fatReport.report.length === 0 ? <p className="text-center text-zinc-500 py-8">{t('No data', 'कोई डेटा नहीं')}</p> : (
                                    <div className="overflow-x-auto"><Table><TableHeader><TableRow>
                                        <TableHead>#</TableHead><TableHead>{t('Farmer', 'किसान')}</TableHead><TableHead>{t('Total Milk', 'कुल दूध')}</TableHead><TableHead>{t('Avg Fat', 'औसत फैट')}</TableHead><TableHead>{t('Avg SNF', 'औसत SNF')}</TableHead><TableHead>{t('Entries', 'प्रविष्टियाँ')}</TableHead>
                                    </TableRow></TableHeader><TableBody>
                                        {fatReport.report.map((r, i) => (
                                            <TableRow key={r.farmer_id}><TableCell className="font-bold">{i + 1}</TableCell><TableCell className="font-semibold">{r.farmer_name}</TableCell><TableCell>{formatNumber(r.total_quantity)} L</TableCell><TableCell><span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded font-bold">{r.avg_fat}%</span></TableCell><TableCell>{r.avg_snf}%</TableCell><TableCell>{r.entries}</TableCell></TableRow>
                                        ))}
                                    </TableBody></Table></div>
                                )}
                            </CardContent>
                        </Card>
                    ) : null}
                </TabsContent>

                {/* Farmer Ranking Report */}
                <TabsContent value="ranking" className="space-y-4 mt-4">
                    <Card><CardContent className="p-4">
                        <div className="flex items-end gap-4">
                            <div className="flex-1 space-y-2">
                                <Label className="font-hindi">{t('Sort By', 'क्रम')}</Label>
                                <Select value={rankSortBy} onValueChange={setRankSortBy}>
                                    <SelectTrigger className="h-12" data-testid="ranking-sort-select"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="quantity">{t('Quantity', 'मात्रा')}</SelectItem>
                                        <SelectItem value="amount">{t('Amount', 'राशि')}</SelectItem>
                                        <SelectItem value="fat">{t('Fat %', 'फैट %')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={fetchRankingReport} data-testid="generate-ranking-report" className="bg-emerald-700 hover:bg-emerald-800 h-12">{t('View Ranking', 'रैंकिंग देखें')}</Button>
                        </div>
                    </CardContent></Card>
                    {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div> : rankingReport ? (
                        <Card><CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" />{t('Farmer Ranking', 'किसान रैंकिंग')}</CardTitle></CardHeader>
                            <CardContent>
                                {rankingReport.ranking.length === 0 ? <p className="text-center text-zinc-500 py-8">{t('No data', 'कोई डेटा नहीं')}</p> : (
                                    <div className="overflow-x-auto"><Table><TableHeader><TableRow>
                                        <TableHead>{t('Rank', 'रैंक')}</TableHead><TableHead>{t('Farmer', 'किसान')}</TableHead><TableHead>{t('Total Milk', 'कुल दूध')}</TableHead><TableHead>{t('Avg Fat', 'औसत फैट')}</TableHead><TableHead className="text-right">{t('Total Amount', 'कुल राशि')}</TableHead>
                                    </TableRow></TableHeader><TableBody>
                                        {rankingReport.ranking.map((r) => (
                                            <TableRow key={r.farmer_id}>
                                                <TableCell><span className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold", r.rank <= 3 ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-600")}>{r.rank}</span></TableCell>
                                                <TableCell className="font-semibold">{r.farmer_name}</TableCell>
                                                <TableCell>{formatNumber(r.total_quantity)} L</TableCell>
                                                <TableCell>{r.avg_fat}%</TableCell>
                                                <TableCell className="text-right font-bold text-emerald-700">{formatCurrency(r.total_amount)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody></Table></div>
                                )}
                            </CardContent>
                        </Card>
                    ) : null}
                </TabsContent>

                {/* Monthly Summary */}
                <TabsContent value="monthly" className="space-y-4 mt-4">
                    <Card><CardContent className="p-4">
                        <div className="flex items-end gap-4">
                            <div className="flex-1 space-y-2">
                                <Label className="font-hindi">{t('Select Month', 'महीना चुनें')}</Label>
                                <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} data-testid="monthly-report-month" className="h-12" />
                            </div>
                            <Button onClick={fetchMonthlyReport} data-testid="generate-monthly-report" className="bg-emerald-700 hover:bg-emerald-800 h-12">{t('View Summary', 'सारांश देखें')}</Button>
                        </div>
                    </CardContent></Card>
                    {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div> : monthlyReport ? (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                <Card className="bg-emerald-50 border-emerald-200"><CardContent className="p-4"><p className="text-sm text-emerald-600 font-hindi mb-1">{t('Total Milk', 'कुल दूध')}</p><p className="text-2xl font-bold text-emerald-700">{formatNumber(monthlyReport.collection.total_milk)} L</p><p className="text-xs text-emerald-500">{monthlyReport.collection.entries} {t('entries', 'प्रविष्टियाँ')}</p></CardContent></Card>
                                <Card className="bg-blue-50 border-blue-200"><CardContent className="p-4"><p className="text-sm text-blue-600 font-hindi mb-1">{t('Milk Value', 'दूध मूल्य')}</p><p className="text-2xl font-bold text-blue-700">{formatCurrency(monthlyReport.collection.total_amount)}</p><p className="text-xs text-blue-500">{monthlyReport.collection.unique_farmers} {t('farmers', 'किसान')}</p></CardContent></Card>
                                <Card className="bg-amber-50 border-amber-200"><CardContent className="p-4"><p className="text-sm text-amber-600 font-hindi mb-1">{t('Avg Fat', 'औसत फैट')}</p><p className="text-2xl font-bold text-amber-700">{monthlyReport.collection.avg_fat}%</p></CardContent></Card>
                                <Card className="bg-purple-50 border-purple-200"><CardContent className="p-4"><p className="text-sm text-purple-600 font-hindi mb-1">{t('Sales', 'बिक्री')}</p><p className="text-2xl font-bold text-purple-700">{formatCurrency(monthlyReport.sales.total)}</p><p className="text-xs text-purple-500">{monthlyReport.sales.count} {t('sales', 'बिक्री')}</p></CardContent></Card>
                                <Card className="bg-red-50 border-red-200"><CardContent className="p-4"><p className="text-sm text-red-600 font-hindi mb-1">{t('Expenses', 'खर्च')}</p><p className="text-2xl font-bold text-red-700">{formatCurrency(monthlyReport.expenses.total)}</p></CardContent></Card>
                                <Card className={monthlyReport.profit.net >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}><CardContent className="p-4"><p className={cn("text-sm font-hindi mb-1", monthlyReport.profit.net >= 0 ? "text-green-600" : "text-red-600")}>{t('Net Profit', 'शुद्ध लाभ')}</p><p className={cn("text-2xl font-bold", monthlyReport.profit.net >= 0 ? "text-green-700" : "text-red-700")}>{formatCurrency(monthlyReport.profit.net)}</p></CardContent></Card>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleExport('collections')} data-testid="export-monthly-collections"><Download className="w-4 h-4 mr-1" />{t('Export Collections', 'संग्रह एक्सपोर्ट')}</Button>
                                <Button variant="outline" size="sm" onClick={() => handleExport('payments')} data-testid="export-monthly-payments"><Download className="w-4 h-4 mr-1" />{t('Export Payments', 'भुगतान एक्सपोर्ट')}</Button>
                                <Button variant="outline" size="sm" onClick={() => handleExport('expenses')} data-testid="export-monthly-expenses"><Download className="w-4 h-4 mr-1" />{t('Export Expenses', 'खर्च एक्सपोर्ट')}</Button>
                            </div>
                        </>
                    ) : null}
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ReportsPage;
