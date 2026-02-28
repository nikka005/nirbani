import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
    FileText, Printer, Download, Share2, Search, Loader2, Milk, Users,
    Calendar, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '../lib/utils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const BillingPage = () => {
    const { language } = useAuth();
    const t = (en, hi) => language === 'hi' ? hi : en;
    const billRef = useRef(null);

    const [activeTab, setActiveTab] = useState('farmer');
    const [farmers, setFarmers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [billData, setBillData] = useState(null);

    const [selectedId, setSelectedId] = useState('');
    const [period, setPeriod] = useState('monthly');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedName, setSelectedName] = useState('');

    const token = localStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        const fetchLists = async () => {
            try {
                const [fRes, cRes] = await Promise.all([
                    axios.get(`${BACKEND_URL}/api/farmers`, { headers }),
                    axios.get(`${BACKEND_URL}/api/customers`, { headers }),
                ]);
                setFarmers(fRes.data);
                setCustomers(cRes.data);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchLists();
    }, []);

    const getDateRange = () => {
        const now = new Date();
        let start, end;
        if (period === 'monthly') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (period === '15days') {
            if (now.getDate() <= 15) {
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth(), 15);
            } else {
                start = new Date(now.getFullYear(), now.getMonth(), 16);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            }
        } else {
            start = new Date(customStart);
            end = new Date(customEnd);
        }
        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        };
    };

    const generateBill = async () => {
        if (!selectedId) { toast.error(t('Select a farmer/customer', 'किसान/ग्राहक चुनें')); return; }
        if (period === 'custom' && (!customStart || !customEnd)) { toast.error(t('Select dates', 'तारीख चुनें')); return; }

        const { start, end } = getDateRange();
        setGenerating(true);
        setBillData(null);
        try {
            const endpoint = activeTab === 'farmer'
                ? `${BACKEND_URL}/api/billing/farmer/${selectedId}?start_date=${start}&end_date=${end}`
                : `${BACKEND_URL}/api/billing/customer/${selectedId}?start_date=${start}&end_date=${end}`;
            const res = await axios.get(endpoint, { headers });
            setBillData({ ...res.data, type: activeTab, period_label: getPeriodLabel(start, end) });
        } catch (e) { toast.error(t('Error generating bill', 'बिल बनाने में त्रुटि')); }
        finally { setGenerating(false); }
    };

    const getPeriodLabel = (start, end) => {
        const s = new Date(start);
        const e = new Date(end);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        if (period === 'monthly') return `${months[s.getMonth()]} ${s.getFullYear()}`;
        return `${s.getDate()} ${months[s.getMonth()]} - ${e.getDate()} ${months[e.getMonth()]} ${e.getFullYear()}`;
    };

    const handlePrint = () => {
        const content = billRef.current;
        if (!content) return;
        const win = window.open('', '_blank');
        win.document.write(`
            <html><head><title>Bill - Nirbani Dairy</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Segoe UI', sans-serif; padding: 20px; color: #1a1a1a; }
                .bill-header { text-align: center; border-bottom: 3px solid #166534; padding-bottom: 16px; margin-bottom: 16px; }
                .bill-header h1 { font-size: 24px; color: #166534; font-weight: 800; }
                .bill-header p { font-size: 12px; color: #666; }
                .bill-info { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 13px; }
                .bill-info div { line-height: 1.6; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
                th { background: #166534; color: white; padding: 8px 6px; text-align: left; font-weight: 600; }
                td { padding: 6px; border-bottom: 1px solid #e5e5e5; }
                tr:nth-child(even) { background: #f9fafb; }
                .summary { background: #f0fdf4; border: 2px solid #166534; border-radius: 8px; padding: 16px; }
                .summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
                .summary-row.total { font-size: 16px; font-weight: 800; border-top: 2px solid #166534; padding-top: 8px; margin-top: 8px; color: #166534; }
                .footer { text-align: center; margin-top: 24px; font-size: 10px; color: #999; border-top: 1px solid #e5e5e5; padding-top: 12px; }
                @media print { body { padding: 10px; } }
            </style></head><body>${content.innerHTML}
            <div class="footer">Nirbani Dairy Management Software | Computer Generated Bill</div>
            </body></html>
        `);
        win.document.close();
        win.print();
    };

    const handleShare = async () => {
        if (!billRef.current) return;
        const text = buildShareText();
        if (navigator.share) {
            try { await navigator.share({ title: 'Bill - Nirbani Dairy', text }); }
            catch (e) { /* cancelled */ }
        } else {
            navigator.clipboard.writeText(text);
            toast.success(t('Bill copied to clipboard!', 'बिल क्लिपबोर्ड पर कॉपी हो गया!'));
        }
    };

    const buildShareText = () => {
        if (!billData) return '';
        const d = billData;
        const name = d.type === 'farmer' ? d.farmer?.name : d.customer?.name;
        let text = `NIRBANI DAIRY - BILL\n${name}\nPeriod: ${d.period_label}\n\n`;
        if (d.type === 'farmer') {
            text += `Date | Shift | Qty(L) | Fat | Rate | Amount\n`;
            d.collections?.forEach(c => {
                text += `${c.date} | ${c.shift} | ${c.quantity} | ${c.fat} | ₹${c.rate} | ₹${c.amount}\n`;
            });
            text += `\nTotal Qty: ${d.summary.total_quantity}L\nTotal Amount: ₹${d.summary.total_amount}\nPaid: ₹${d.summary.total_paid}\nBalance Due: ₹${d.summary.balance_due}`;
        } else {
            text += `Date | Product | Qty | Rate | Amount\n`;
            d.sales?.forEach(s => {
                text += `${s.date} | ${s.product} | ${s.quantity} | ₹${s.rate} | ₹${s.amount}\n`;
            });
            text += `\nTotal: ₹${d.summary.total_amount}`;
        }
        return text;
    };

    const items = activeTab === 'farmer' ? farmers : customers;
    const filtered = items.filter(i =>
        !searchTerm || i.name?.toLowerCase().includes(searchTerm.toLowerCase()) || i.phone?.includes(searchTerm)
    );

    if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

    return (
        <div className="p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-6 max-w-5xl mx-auto">
            <div>
                <h1 className="font-heading text-lg sm:text-xl md:text-2xl font-bold text-zinc-900">{t('Billing', 'बिलिंग')}</h1>
                <p className="text-xs text-muted-foreground">{t('Generate bills for farmers & customers', 'किसानों और ग्राहकों के बिल बनाएं')}</p>
            </div>

            {/* Controls */}
            <Card>
                <CardContent className="p-4 space-y-4">
                    {/* Type Tab */}
                    <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedId(''); setSelectedName(''); setBillData(null); setSearchTerm(''); }}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="farmer" data-testid="bill-farmer-tab" className="text-xs sm:text-sm">
                                <Milk className="w-3 h-3 mr-1" />{t('Farmer Bill', 'किसान बिल')}
                            </TabsTrigger>
                            <TabsTrigger value="customer" data-testid="bill-customer-tab" className="text-xs sm:text-sm">
                                <Users className="w-3 h-3 mr-1" />{t('Customer Bill', 'ग्राहक बिल')}
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Search & Select */}
                    <div className="relative">
                        <Label className="text-xs mb-1.5 block">
                            {activeTab === 'farmer' ? t('Select Farmer', 'किसान चुनें') : t('Select Customer', 'ग्राहक चुनें')} *
                        </Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <Input
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                                onFocus={() => setShowDropdown(true)}
                                placeholder={selectedName || t('Search by name or phone...', 'नाम या फ़ोन से खोजें...')}
                                className={cn("h-12 pl-10", selectedId && "border-emerald-400 bg-emerald-50")}
                                data-testid="billing-search" />
                            {selectedId && (
                                <button type="button" onClick={() => { setSelectedId(''); setSelectedName(''); setSearchTerm(''); setBillData(null); }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-sm">✕</button>
                            )}
                        </div>
                        {showDropdown && !selectedId && (
                            <div className="absolute z-50 w-full bg-white border rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto">
                                {filtered.map(item => (
                                    <button key={item.id} type="button" data-testid={`bill-item-${item.id}`}
                                        onClick={() => { setSelectedId(item.id); setSelectedName(item.name); setSearchTerm(''); setShowDropdown(false); }}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-emerald-50 text-left border-b last:border-0">
                                        <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center text-xs font-bold text-emerald-700">
                                            {item.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate">{item.name}</p>
                                            <p className="text-[10px] text-zinc-500">{item.phone || ''} {item.village ? `| ${item.village}` : ''}</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-zinc-300" />
                                    </button>
                                ))}
                                {filtered.length === 0 && (
                                    <p className="p-3 text-sm text-zinc-400 text-center">{t('No match', 'कोई मिलान नहीं')}</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Period */}
                    <div>
                        <Label className="text-xs mb-1.5 block">{t('Billing Period', 'बिलिंग अवधि')}</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { val: 'monthly', label: t('Monthly', 'मासिक') },
                                { val: '15days', label: t('15 Days', '15 दिन') },
                                { val: 'custom', label: t('Custom', 'कस्टम') },
                            ].map(p => (
                                <button key={p.val} type="button" data-testid={`period-${p.val}`}
                                    onClick={() => setPeriod(p.val)}
                                    className={cn("py-2.5 rounded-xl border-2 text-xs font-semibold transition-all",
                                        period === p.val ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-500")}>
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {period === 'custom' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">{t('From', 'से')}</Label>
                                <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                                    className="h-10" data-testid="custom-start" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">{t('To', 'तक')}</Label>
                                <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                                    className="h-10" data-testid="custom-end" />
                            </div>
                        </div>
                    )}

                    <Button onClick={generateBill} data-testid="generate-bill-btn"
                        className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-base" disabled={generating}>
                        {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <><FileText className="w-4 h-4 mr-2" />{t('Generate Bill', 'बिल बनाएं')}</>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Bill Preview */}
            {billData && (
                <div className="space-y-3">
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Button onClick={handlePrint} variant="outline" data-testid="print-bill" className="flex-1 h-10">
                            <Printer className="w-4 h-4 mr-1" />{t('Print', 'प्रिंट')}
                        </Button>
                        <Button onClick={handleShare} variant="outline" data-testid="share-bill" className="flex-1 h-10">
                            <Share2 className="w-4 h-4 mr-1" />{t('Share', 'शेयर')}
                        </Button>
                    </div>

                    {/* Bill Content */}
                    <Card className="overflow-hidden" data-testid="bill-preview">
                        <div ref={billRef}>
                            {/* Bill Header - Branding */}
                            <div className="bill-header bg-emerald-800 text-white p-4 sm:p-6 text-center">
                                <h1 className="text-xl sm:text-2xl font-bold tracking-wide" style={{fontFamily: 'serif'}}>NIRBANI DAIRY</h1>
                                <p className="text-emerald-200 text-xs mt-1">{t('Dairy Management Software', 'डेयरी प्रबंधन सॉफ्टवेयर')}</p>
                                <div className="mt-2 inline-block px-4 py-1 bg-white/10 rounded-full text-xs">
                                    {billData.type === 'farmer' ? t('FARMER BILL', 'किसान बिल') : t('CUSTOMER BILL', 'ग्राहक बिल')}
                                </div>
                            </div>

                            {/* Bill Info */}
                            <div className="p-4 sm:p-6 border-b bg-zinc-50">
                                <div className="flex justify-between flex-wrap gap-2">
                                    <div>
                                        <p className="text-xs text-zinc-500">{billData.type === 'farmer' ? t('Farmer', 'किसान') : t('Customer', 'ग्राहक')}</p>
                                        <p className="text-base font-bold text-zinc-900">
                                            {billData.type === 'farmer' ? billData.farmer?.name : billData.customer?.name}
                                        </p>
                                        <p className="text-xs text-zinc-500">
                                            {billData.type === 'farmer' ? billData.farmer?.phone : billData.customer?.phone}
                                            {billData.farmer?.village ? ` | ${billData.farmer.village}` : ''}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-zinc-500">{t('Period', 'अवधि')}</p>
                                        <p className="text-sm font-bold text-zinc-900">{billData.period_label}</p>
                                        <p className="text-xs text-zinc-500">{billData.summary?.total_entries} {t('entries', 'प्रविष्टि')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Date-wise Table */}
                            <div className="p-4 sm:p-6">
                                {billData.type === 'farmer' ? (
                                    <FarmerBillTable data={billData} t={t} />
                                ) : (
                                    <CustomerBillTable data={billData} t={t} />
                                )}
                            </div>

                            {/* Summary */}
                            <div className="p-4 sm:p-6 bg-emerald-50 border-t-2 border-emerald-600">
                                {billData.type === 'farmer' ? (
                                    <div className="space-y-2">
                                        <SummaryRow label={t('Total Milk Quantity', 'कुल दूध मात्रा')} value={`${billData.summary.total_quantity} L`} />
                                        <SummaryRow label={t('Total Amount', 'कुल राशि')} value={formatCurrency(billData.summary.total_amount)} />
                                        <SummaryRow label={t('Amount Paid', 'भुगतान किया')} value={formatCurrency(billData.summary.total_paid)} />
                                        <div className="border-t-2 border-emerald-600 pt-2 mt-2">
                                            <SummaryRow label={t('Balance Due', 'बकाया राशि')} value={formatCurrency(billData.summary.balance_due)} bold />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <SummaryRow label={t('Total Entries', 'कुल प्रविष्टि')} value={billData.summary.total_entries} />
                                        <div className="border-t-2 border-emerald-600 pt-2 mt-2">
                                            <SummaryRow label={t('Total Amount', 'कुल राशि')} value={formatCurrency(billData.summary.total_amount)} bold />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

const SummaryRow = ({ label, value, bold }) => (
    <div className={cn("flex justify-between items-center", bold && "font-bold text-emerald-800")}>
        <span className={cn("text-sm", !bold && "text-zinc-600")}>{label}</span>
        <span className={cn("text-sm", bold ? "text-lg" : "")}>{value}</span>
    </div>
);

const FarmerBillTable = ({ data, t }) => {
    if (!data.collections?.length) return <p className="text-center text-zinc-400 py-6">{t('No records found', 'कोई रिकॉर्ड नहीं')}</p>;

    // Group by date
    const dateMap = {};
    data.collections.forEach(c => {
        if (!dateMap[c.date]) dateMap[c.date] = [];
        dateMap[c.date].push(c);
    });

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
                <thead>
                    <tr className="bg-emerald-800 text-white">
                        <th className="py-2 px-2 sm:px-3 text-left font-semibold">{t('Date', 'तारीख')}</th>
                        <th className="py-2 px-2 sm:px-3 text-left font-semibold">{t('Shift', 'शिफ्ट')}</th>
                        <th className="py-2 px-2 sm:px-3 text-left font-semibold">{t('Type', 'प्रकार')}</th>
                        <th className="py-2 px-2 sm:px-3 text-right font-semibold">{t('Qty (L)', 'मात्रा (L)')}</th>
                        <th className="py-2 px-2 sm:px-3 text-right font-semibold">{t('Fat', 'फैट')}</th>
                        <th className="py-2 px-2 sm:px-3 text-right font-semibold">{t('Rate', 'दर')}</th>
                        <th className="py-2 px-2 sm:px-3 text-right font-semibold">{t('Amount', 'राशि')}</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.entries(dateMap).map(([date, items]) => (
                        items.map((c, idx) => (
                            <tr key={c.id || idx} className={idx % 2 === 0 ? "bg-white" : "bg-zinc-50"}>
                                <td className="py-1.5 px-2 sm:px-3">{idx === 0 ? date : ''}</td>
                                <td className="py-1.5 px-2 sm:px-3 capitalize">{c.shift === 'morning' ? t('Morning', 'सुबह') : t('Evening', 'शाम')}</td>
                                <td className="py-1.5 px-2 sm:px-3 capitalize">{c.milk_type || 'cow'}</td>
                                <td className="py-1.5 px-2 sm:px-3 text-right font-medium">{c.quantity}</td>
                                <td className="py-1.5 px-2 sm:px-3 text-right">{c.fat}</td>
                                <td className="py-1.5 px-2 sm:px-3 text-right">₹{c.rate}</td>
                                <td className="py-1.5 px-2 sm:px-3 text-right font-semibold text-emerald-700">₹{c.amount?.toFixed(2)}</td>
                            </tr>
                        ))
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const CustomerBillTable = ({ data, t }) => {
    if (!data.sales?.length) return <p className="text-center text-zinc-400 py-6">{t('No records found', 'कोई रिकॉर्ड नहीं')}</p>;

    const dateMap = {};
    data.sales.forEach(s => {
        if (!dateMap[s.date]) dateMap[s.date] = [];
        dateMap[s.date].push(s);
    });

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
                <thead>
                    <tr className="bg-emerald-800 text-white">
                        <th className="py-2 px-2 sm:px-3 text-left font-semibold">{t('Date', 'तारीख')}</th>
                        <th className="py-2 px-2 sm:px-3 text-left font-semibold">{t('Product', 'उत्पाद')}</th>
                        <th className="py-2 px-2 sm:px-3 text-right font-semibold">{t('Qty', 'मात्रा')}</th>
                        <th className="py-2 px-2 sm:px-3 text-right font-semibold">{t('Rate', 'दर')}</th>
                        <th className="py-2 px-2 sm:px-3 text-right font-semibold">{t('Amount', 'राशि')}</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.entries(dateMap).map(([date, items]) => (
                        items.map((s, idx) => (
                            <tr key={s.id || idx} className={idx % 2 === 0 ? "bg-white" : "bg-zinc-50"}>
                                <td className="py-1.5 px-2 sm:px-3">{idx === 0 ? date : ''}</td>
                                <td className="py-1.5 px-2 sm:px-3 capitalize">{s.product}</td>
                                <td className="py-1.5 px-2 sm:px-3 text-right font-medium">{s.quantity > 0 ? s.quantity : '-'}</td>
                                <td className="py-1.5 px-2 sm:px-3 text-right">{s.rate > 0 ? `₹${s.rate}` : '-'}</td>
                                <td className="py-1.5 px-2 sm:px-3 text-right font-semibold text-emerald-700">₹{s.amount?.toFixed(2)}</td>
                            </tr>
                        ))
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default BillingPage;
