import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dairyReportAPI } from '../lib/api';
import { formatCurrency, getTodayDate } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
    TrendingUp, TrendingDown, Loader2, Droplets, AlertTriangle,
    Weight, Wallet, Receipt, Factory, Users, Printer, ShoppingBag
} from 'lucide-react';
import { cn } from '../lib/utils';

const ProfitDashboardPage = () => {
    const { language } = useAuth();
    const t = (en, hi) => language === 'hi' ? hi : en;
    const [report, setReport] = useState(null);
    const [fatReport, setFatReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(getTodayDate());
    const [endDate, setEndDate] = useState(getTodayDate());

    useEffect(() => { fetchData(); }, [startDate, endDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [profitRes, fatRes] = await Promise.all([
                dairyReportAPI.profitReport({ start_date: startDate, end_date: endDate }),
                dairyReportAPI.fatAnalysis({ start_date: startDate, end_date: endDate }),
            ]);
            setReport(profitRes.data);
            setFatReport(fatRes.data);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

    const handlePrintReport = () => {
        window.print();
    };

    const p = report?.profit || {};
    const mt = report?.milk_tracking || {};
    const fa = report?.fat_analysis || {};
    const disp = report?.dispatch || {};
    const coll = report?.collection || {};
    const exp = report?.expenses || {};
    const retail = report?.retail_sales || {};

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="font-heading text-xl sm:text-2xl font-bold text-zinc-900">{t('Profit Dashboard', 'लाभ डैशबोर्ड')}</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">{t('Real profit analysis', 'वास्तविक लाभ विश्लेषण')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 w-auto text-sm" data-testid="profit-start-date" />
                    <span className="text-zinc-400">-</span>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 w-auto text-sm" data-testid="profit-end-date" />
                    <Button variant="outline" onClick={handlePrintReport} data-testid="print-profit" className="h-9">
                        <Printer className="w-4 h-4 mr-1" />{t('Print', 'प्रिंट')}
                    </Button>
                </div>
            </div>

            {/* Profit Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className={p.net_profit >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            {p.net_profit >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
                            <span className={cn("text-xs font-semibold", p.net_profit >= 0 ? "text-emerald-600" : "text-red-600")}>{t('Net Profit', 'शुद्ध लाभ')}</span>
                        </div>
                        <p className={cn("text-2xl font-bold", p.net_profit >= 0 ? "text-emerald-700" : "text-red-700")} data-testid="net-profit">{formatCurrency(p.net_profit || 0)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1"><Factory className="w-4 h-4 text-blue-600" /><span className="text-xs text-blue-600 font-semibold">{t('Dispatch Income', 'डिस्पैच आय')}</span></div>
                        <p className="text-2xl font-bold text-blue-700">{formatCurrency(disp.total_amount || 0)}</p>
                        <p className="text-xs text-blue-500">{disp.total_kg || 0} KG @ ₹{disp.avg_rate || 0}/KG</p>
                    </CardContent>
                </Card>
                <Card className="bg-orange-50 border-orange-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1"><ShoppingBag className="w-4 h-4 text-orange-600" /><span className="text-xs text-orange-600 font-semibold">{t('Retail Sales', 'खुदरा बिक्री')}</span></div>
                        <p className="text-2xl font-bold text-orange-700">{formatCurrency(retail.total_amount || 0)}</p>
                        <p className="text-xs text-orange-500">{retail.count || 0} {t('sales', 'बिक्री')}</p>
                    </CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-amber-600" /><span className="text-xs text-amber-600 font-semibold">{t('Farmer Purchase', 'किसान खरीद')}</span></div>
                        <p className="text-2xl font-bold text-amber-700">{formatCurrency(coll.total_amount || 0)}</p>
                        <p className="text-xs text-amber-500">{coll.total_liters || 0} L @ ₹{coll.avg_rate || 0}/L</p>
                    </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1"><Receipt className="w-4 h-4 text-purple-600" /><span className="text-xs text-purple-600 font-semibold">{t('Expenses', 'खर्च')}</span></div>
                        <p className="text-2xl font-bold text-purple-700">{formatCurrency(exp.total || 0)}</p>
                        <p className="text-xs text-purple-500">{t('Gross Profit', 'कुल लाभ')}: {formatCurrency(p.gross_profit || 0)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Margin per unit */}
            <Card>
                <CardContent className="p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-sm text-zinc-500">{t('Buying Rate (Avg)', 'खरीद दर (औसत)')}</p>
                            <p className="text-xl font-bold text-amber-700">₹{coll.avg_rate || 0}/L</p>
                        </div>
                        <div>
                            <p className="text-sm text-zinc-500">{t('Selling Rate (Avg)', 'बिक्री दर (औसत)')}</p>
                            <p className="text-xl font-bold text-blue-700">₹{disp.avg_rate || 0}/KG</p>
                        </div>
                        <div>
                            <p className="text-sm text-zinc-500">{t('Margin/Unit', 'मार्जिन/इकाई')}</p>
                            <p className={cn("text-xl font-bold", (p.gross_margin_per_unit || 0) >= 0 ? "text-emerald-700" : "text-red-700")}>
                                ₹{p.gross_margin_per_unit || 0}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Milk Loss & FAT Tracking */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Milk Loss */}
                <Card className={mt.alert ? "border-red-300" : ""}>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2">
                        <Weight className="w-5 h-5 text-zinc-600" />{t('Milk Loss Tracking', 'दूध हानि ट्रैकिंग')}
                        {mt.alert && <AlertTriangle className="w-4 h-4 text-red-500" />}
                    </CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex justify-between"><span className="text-sm text-zinc-500">{t('Collected', 'संग्रह')}</span><span className="font-semibold">{mt.collected_kg || 0} KG</span></div>
                            <div className="flex justify-between"><span className="text-sm text-zinc-500">{t('Dispatched', 'डिस्पैच')}</span><span className="font-semibold">{mt.dispatched_kg || 0} KG</span></div>
                            <div className={cn("flex justify-between border-t pt-2", mt.alert ? "text-red-600" : "text-amber-600")}>
                                <span className="text-sm font-semibold">{t('Difference', 'अंतर')}</span>
                                <span className="font-bold">{mt.difference_kg || 0} KG ({mt.loss_percent || 0}%)</span>
                            </div>
                            {mt.alert && <p className="text-xs text-red-500 font-semibold">{t('Loss exceeds 1% - investigate!', 'हानि 1% से अधिक - जांच करें!')}</p>}
                        </div>
                    </CardContent>
                </Card>

                {/* FAT Deviation */}
                <Card className={Math.abs(fa.fat_deviation || 0) > 0.3 ? "border-red-300" : ""}>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2">
                        <Droplets className="w-5 h-5 text-zinc-600" />{t('FAT Deviation', 'FAT विचलन')}
                        {Math.abs(fa.fat_deviation || 0) > 0.3 && <AlertTriangle className="w-4 h-4 text-red-500" />}
                    </CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex justify-between"><span className="text-sm text-zinc-500">{t('Your Avg FAT', 'आपका औसत FAT')}</span><span className="font-semibold">{fa.collection_avg_fat || 0}%</span></div>
                            <div className="flex justify-between"><span className="text-sm text-zinc-500">{t('Dispatch FAT', 'डिस्पैच FAT')}</span><span className="font-semibold">{fa.dispatch_avg_fat || 0}%</span></div>
                            <div className={cn("flex justify-between border-t pt-2", Math.abs(fa.fat_deviation || 0) > 0.3 ? "text-red-600" : "text-emerald-600")}>
                                <span className="text-sm font-semibold">{t('Deviation', 'विचलन')}</span>
                                <span className="font-bold">{fa.fat_deviation || 0}%</span>
                            </div>
                            {Math.abs(fa.fat_deviation || 0) > 0.3 && <p className="text-xs text-red-500 font-semibold">{t('FAT deviation is high - check lab results!', 'FAT विचलन अधिक है - लैब परिणाम जांचें!')}</p>}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Expense Breakdown */}
            {exp.total > 0 && (
                <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><Receipt className="w-5 h-5 text-purple-600" />{t('Expense Breakdown', 'खर्च विवरण')}</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {Object.entries(exp.by_category || {}).map(([cat, amt]) => (
                                <div key={cat} className="p-3 bg-zinc-50 rounded-lg">
                                    <p className="text-xs text-zinc-500 capitalize">{cat}</p>
                                    <p className="font-bold text-zinc-700">{formatCurrency(amt)}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* FAT Analysis - Farmer Ranking */}
            <Tabs defaultValue="fat-ranking">
                <TabsList className="grid w-full grid-cols-1">
                    <TabsTrigger value="fat-ranking" data-testid="fat-ranking-tab">
                        <Droplets className="w-4 h-4 mr-2" />{t('Farmer FAT Ranking', 'किसान FAT रैंकिंग')} ({fatReport?.total_farmers || 0})
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="fat-ranking" className="mt-4">
                    {fatReport && (
                        <>
                            <div className="flex gap-3 mb-4 flex-wrap">
                                <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                                    <span className="text-xs text-green-600 font-semibold">{t('Good (4%+)', 'अच्छा (4%+)')}: </span>
                                    <span className="font-bold text-green-700">{fatReport.quality_breakdown?.good || 0}</span>
                                </div>
                                <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                                    <span className="text-xs text-amber-600 font-semibold">{t('Average (3-4%)', 'औसत (3-4%)')}: </span>
                                    <span className="font-bold text-amber-700">{fatReport.quality_breakdown?.average || 0}</span>
                                </div>
                                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                                    <span className="text-xs text-red-600 font-semibold">{t('Low (<3%)', 'कम (<3%)')}: </span>
                                    <span className="font-bold text-red-700">{fatReport.quality_breakdown?.low || 0}</span>
                                </div>
                                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                                    <span className="text-xs text-blue-600 font-semibold">{t('Overall Avg', 'कुल औसत')}: </span>
                                    <span className="font-bold text-blue-700">{fatReport.overall_avg_fat}%</span>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader><TableRow>
                                        <TableHead>#</TableHead>
                                        <TableHead>{t('Farmer', 'किसान')}</TableHead>
                                        <TableHead>{t('Type', 'प्रकार')}</TableHead>
                                        <TableHead>{t('Quantity (L)', 'मात्रा')}</TableHead>
                                        <TableHead>{t('Avg FAT', 'औसत FAT')}</TableHead>
                                        <TableHead>{t('Quality', 'गुणवत्ता')}</TableHead>
                                    </TableRow></TableHeader>
                                    <TableBody>
                                        {(fatReport.farmers || []).map((f, idx) => (
                                            <TableRow key={f.farmer_id} data-testid={`fat-farmer-${f.farmer_id}`}>
                                                <TableCell className="font-semibold">{idx + 1}</TableCell>
                                                <TableCell className="font-semibold">{f.farmer_name}</TableCell>
                                                <TableCell className="uppercase text-xs">{f.milk_type}</TableCell>
                                                <TableCell>{f.total_quantity} L</TableCell>
                                                <TableCell className="font-bold">{f.avg_fat}%</TableCell>
                                                <TableCell>
                                                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold",
                                                        f.quality === 'good' ? "bg-green-100 text-green-700" :
                                                        f.quality === 'average' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                                                    )}>{f.quality === 'good' ? t('Good', 'अच्छा') : f.quality === 'average' ? t('Avg', 'औसत') : t('Low', 'कम')}</span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ProfitDashboardPage;
