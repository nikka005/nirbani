import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/utils';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '../components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
    FileText, Printer, Share2, Search, Loader2, Milk, Users,
    ChevronRight, Plus, PlusCircle, Trash2, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '../lib/utils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const productOptions = [
    { value: 'milk', label: { en: 'Milk', hi: 'दूध' } },
    { value: 'paneer', label: { en: 'Paneer', hi: 'पनीर' } },
    { value: 'dahi', label: { en: 'Dahi', hi: 'दही' } },
    { value: 'ghee', label: { en: 'Ghee', hi: 'घी' } },
    { value: 'cream', label: { en: 'Cream', hi: 'क्रीम' } },
    { value: 'other', label: { en: 'Other', hi: 'अन्य' } },
];

const BillingPage = () => {
    const { language } = useAuth();
    const t = (en, hi) => language === 'hi' ? hi : en;
    const billRef = useRef(null);

    // Format date as YYYY-MM-DD in local timezone (avoids UTC shift bug for IST users)
    const toLocalDateStr = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const [activeTab, setActiveTab] = useState('farmer');
    const [farmers, setFarmers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [billData, setBillData] = useState(null);

    const [selectedId, setSelectedId] = useState('');
    const [selectedName, setSelectedName] = useState('');
    const [period, setPeriod] = useState('monthly');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    // Add Entry dialogs
    const [showAddCollection, setShowAddCollection] = useState(false);
    const [showAddSale, setShowAddSale] = useState(false);
    const today = toLocalDateStr(new Date());
    const [collForm, setCollForm] = useState({ date: today, shift: new Date().getHours() < 12 ? 'morning' : 'evening', milk_type: 'cow', quantity: '', fat: '', snf: '', rate: '' });
    const [saleForm, setSaleForm] = useState({ date: today, product: 'milk', quantity: '', rate: '', direct_amount: '', mode: 'direct', repeatDays: '1' });

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
        return { start: toLocalDateStr(start), end: toLocalDateStr(end) };
    };

    const getPeriodLabel = (start, end) => {
        const s = new Date(start);
        const e = new Date(end);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        if (period === 'monthly') return `${months[s.getMonth()]} ${s.getFullYear()}`;
        return `${s.getDate()} ${months[s.getMonth()]} - ${e.getDate()} ${months[e.getMonth()]} ${e.getFullYear()}`;
    };

    const generateBill = async () => {
        if (!selectedId) { toast.error(t('Select a farmer/customer', 'किसान/ग्राहक चुनें')); return; }
        if (period === 'custom' && (!customStart || !customEnd)) { toast.error(t('Select dates', 'तारीख चुनें')); return; }
        const { start, end } = getDateRange();
        setGenerating(true);
        try {
            const ts = Date.now();
            const endpoint = activeTab === 'farmer'
                ? `${BACKEND_URL}/api/billing/farmer/${selectedId}?start_date=${start}&end_date=${end}&_t=${ts}`
                : `${BACKEND_URL}/api/billing/customer/${selectedId}?start_date=${start}&end_date=${end}&_t=${ts}`;
            const res = await axios.get(endpoint, { headers });
            setBillData({ ...res.data, type: activeTab, period_label: getPeriodLabel(start, end) });
        } catch (e) { toast.error(t('Error generating bill', 'बिल बनाने में त्रुटि')); }
        finally { setGenerating(false); }
    };

    // Delete a collection entry
    const handleDeleteCollection = async (collectionId) => {
        if (!window.confirm(t('Delete this entry?', 'यह प्रविष्टि हटाएं?'))) return;
        setDeleting(collectionId);
        try {
            await axios.delete(`${BACKEND_URL}/api/collections/${collectionId}`, { headers });
            toast.success(t('Entry deleted', 'प्रविष्टि हटाई गई'));
            await generateBill();
        } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
        finally { setDeleting(null); }
    };

    // Delete a sale entry
    const handleDeleteSale = async (saleId) => {
        if (!window.confirm(t('Delete this entry?', 'यह प्रविष्टि हटाएं?'))) return;
        setDeleting(saleId);
        try {
            await axios.delete(`${BACKEND_URL}/api/sales/${saleId}`, { headers });
            toast.success(t('Entry deleted', 'प्रविष्टि हटाई गई'));
            await generateBill();
        } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
        finally { setDeleting(null); }
    };

    // Add Farmer Collection Entry
    const handleAddCollection = async (e) => {
        e.preventDefault();
        if (!collForm.quantity || !collForm.rate) { toast.error(t('Fill quantity and rate', 'मात्रा और दर भरें')); return; }
        setSubmitting(true);
        try {
            await axios.post(`${BACKEND_URL}/api/collections`, {
                farmer_id: selectedId,
                date: collForm.date,
                shift: collForm.shift,
                milk_type: collForm.milk_type,
                quantity: parseFloat(collForm.quantity),
                fat: parseFloat(collForm.fat || 0),
                snf: parseFloat(collForm.snf || 0),
                rate: parseFloat(collForm.rate),
            }, { headers });
            toast.success(t('Entry added!', 'प्रविष्टि जोड़ी गई!'));
            setShowAddCollection(false);
            setCollForm({ date: toLocalDateStr(new Date()), shift: new Date().getHours() < 12 ? 'morning' : 'evening', milk_type: 'cow', quantity: '', fat: '', snf: '', rate: '' });
            await generateBill();
        } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
        finally { setSubmitting(false); }
    };

    // Add Customer Sale Entry (supports multi-day repeat)
    const handleAddSale = async (e) => {
        e.preventDefault();
        if (saleForm.mode === 'direct' && !saleForm.direct_amount) { toast.error(t('Enter amount', 'राशि दर्ज करें')); return; }
        if (saleForm.mode === 'qtyrate' && (!saleForm.quantity || !saleForm.rate)) { toast.error(t('Fill quantity and rate', 'मात्रा और दर भरें')); return; }

        const repeatDays = Math.max(1, Math.min(31, parseInt(saleForm.repeatDays) || 1));
        setSubmitting(true);
        try {
            const baseDate = new Date(saleForm.date);
            let addedCount = 0;

            for (let i = 0; i < repeatDays; i++) {
                const d = new Date(baseDate);
                d.setDate(d.getDate() + i);
                const dateStr = toLocalDateStr(d);

                await axios.post(`${BACKEND_URL}/api/sales`, {
                    customer_id: selectedId,
                    date: dateStr,
                    product: saleForm.product,
                    quantity: saleForm.quantity ? parseFloat(saleForm.quantity) : 0,
                    rate: saleForm.rate ? parseFloat(saleForm.rate) : 0,
                    direct_amount: saleForm.direct_amount ? parseFloat(saleForm.direct_amount) : null,
                }, { headers });
                addedCount++;
            }

            if (addedCount > 1) {
                toast.success(t(`${addedCount} entries added!`, `${addedCount} प्रविष्टि जोड़ी गई!`));
            } else {
                toast.success(t('Sale added!', 'बिक्री जोड़ी गई!'));
            }
            setShowAddSale(false);
            setSaleForm({ date: toLocalDateStr(new Date()), product: 'milk', quantity: '', rate: '', direct_amount: '', mode: 'direct', repeatDays: '1' });
            await generateBill();
        } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
        finally { setSubmitting(false); }
    };

    const handlePrint = () => {
        if (!billData) return;
        const d = billData;
        const name = d.type === 'farmer' ? d.farmer?.name : d.customer?.name;
        const phone = d.type === 'farmer' ? d.farmer?.phone : d.customer?.phone;
        const village = d.farmer?.village || '';
        const billType = d.type === 'farmer' ? 'FARMER BILL / किसान बिल' : 'CUSTOMER BILL / ग्राहक बिल';

        let tableRows = '';
        if (d.type === 'farmer') {
            const headers = '<tr><th>Date</th><th>Shift</th><th>Type</th><th class="r">Qty(L)</th><th class="r">Fat</th><th class="r">Rate</th><th class="r">Amount</th></tr>';
            const rows = (d.collections || []).map((c, i) =>
                `<tr class="${i % 2 ? 'alt' : ''}"><td>${c.date}</td><td>${c.shift}</td><td>${c.milk_type || 'cow'}</td><td class="r">${c.quantity}</td><td class="r">${c.fat}</td><td class="r">${c.rate}</td><td class="r b">${c.amount?.toFixed(2)}</td></tr>`
            ).join('');
            tableRows = headers + rows;
        } else {
            const headers = '<tr><th>Date</th><th>Product</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr>';
            const rows = (d.sales || []).map((s, i) =>
                `<tr class="${i % 2 ? 'alt' : ''}"><td>${s.date}</td><td>${s.product}</td><td class="r">${s.quantity > 0 ? s.quantity : '-'}</td><td class="r">${s.rate > 0 ? s.rate : '-'}</td><td class="r b">${s.amount?.toFixed(2)}</td></tr>`
            ).join('');
            tableRows = headers + rows;
        }

        let summaryHtml = '';
        if (d.type === 'farmer') {
            summaryHtml = `
                <div class="sum-grid">
                    <div class="sum-item"><span>Total Quantity / कुल मात्रा</span><span>${d.summary.total_quantity} L</span></div>
                    <div class="sum-item"><span>Total Amount / कुल राशि</span><span>${d.summary.total_amount?.toFixed(2)}</span></div>
                    <div class="sum-item"><span>Paid / भुगतान</span><span>${d.summary.total_paid?.toFixed(2)}</span></div>
                    <div class="sum-item total"><span>Balance Due / बकाया</span><span>${d.summary.balance_due?.toFixed(2)}</span></div>
                </div>`;
        } else {
            summaryHtml = `
                <div class="sum-grid">
                    <div class="sum-item"><span>Total Entries / कुल प्रविष्टि</span><span>${d.summary.total_entries}</span></div>
                    <div class="sum-item total"><span>Total Amount / कुल राशि</span><span>${d.summary.total_amount?.toFixed(2)}</span></div>
                </div>`;
        }

        const win = window.open('', '_blank');
        win.document.write(`<!DOCTYPE html><html><head><title>Bill - Nirbani Dairy</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Tahoma,sans-serif;color:#1a1a1a;padding:8mm;font-size:10px;max-width:210mm}
.header{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #166534;padding-bottom:6px;margin-bottom:6px}
.header-left{display:flex;align-items:center;gap:10px}
.logo{width:44px;height:44px;background:#166534;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:18px;font-family:serif}
.dairy-name{font-size:18px;font-weight:800;color:#166534;font-family:Georgia,serif;letter-spacing:1px}
.dairy-sub{font-size:8px;color:#555;margin-top:1px}
.header-right{text-align:right;font-size:8px;color:#555;line-height:1.5}
.bill-type{text-align:center;background:#166534;color:white;padding:4px 0;font-size:10px;font-weight:700;letter-spacing:2px;margin-bottom:6px}
.info-row{display:flex;justify-content:space-between;margin-bottom:6px;font-size:9px;padding:4px 6px;background:#f8faf8;border:1px solid #e0e8e0;border-radius:4px}
.info-row .label{color:#666;font-size:8px}
.info-row .val{font-weight:700;font-size:10px;color:#1a1a1a}
table{width:100%;border-collapse:collapse;margin-bottom:6px;font-size:9px}
th{background:#166534;color:white;padding:4px 5px;text-align:left;font-weight:600;font-size:8px;text-transform:uppercase}
td{padding:3px 5px;border-bottom:1px solid #e5e5e5}
tr.alt{background:#f5f8f5}
.r{text-align:right}
.b{font-weight:700;color:#166534}
.sum-grid{border:2px solid #166534;border-radius:4px;overflow:hidden;margin-bottom:6px}
.sum-item{display:flex;justify-content:space-between;padding:3px 8px;font-size:9px;border-bottom:1px solid #e0e8e0}
.sum-item:last-child{border-bottom:none}
.sum-item.total{background:#166534;color:white;font-weight:800;font-size:11px;padding:5px 8px}
.footer{text-align:center;font-size:7px;color:#999;border-top:1px solid #ddd;padding-top:4px;margin-top:6px}
.sig-row{display:flex;justify-content:space-between;margin-top:16px;font-size:8px;color:#666}
.sig-row div{text-align:center;border-top:1px solid #999;padding-top:3px;width:35%}
@media print{body{padding:5mm}@page{size:A4;margin:5mm}}
</style></head><body>
<div class="header">
    <div class="header-left">
        <div class="logo">N</div>
        <div>
            <div class="dairy-name">NIRBANI DAIRY</div>
            <div class="dairy-sub">Dairy Management Software / डेयरी प्रबंधन सॉफ्टवेयर</div>
        </div>
    </div>
    <div class="header-right">
        Ph: _______________<br>
        Address: _______________<br>
        GST: _______________
    </div>
</div>
<div class="bill-type">${billType}</div>
<div class="info-row">
    <div><div class="label">${d.type === 'farmer' ? 'Farmer / किसान' : 'Customer / ग्राहक'}</div><div class="val">${name}</div></div>
    <div><div class="label">Phone / फ़ोन</div><div class="val">${phone || '-'}</div></div>
    ${village ? `<div><div class="label">Village / गांव</div><div class="val">${village}</div></div>` : ''}
    <div><div class="label">Period / अवधि</div><div class="val">${d.period_label}</div></div>
    <div><div class="label">Entries / प्रविष्टि</div><div class="val">${d.summary.total_entries}</div></div>
</div>
<table>${tableRows}</table>
${summaryHtml}
<div class="sig-row"><div>Dairy Signature / डेयरी हस्ताक्षर</div><div>${d.type === 'farmer' ? 'Farmer Signature / किसान हस्ताक्षर' : 'Customer Signature / ग्राहक हस्ताक्षर'}</div></div>
<div class="footer">Nirbani Dairy Management Software | Computer Generated Bill | This is not a tax invoice</div>
</body></html>`);
        win.document.close();
        win.print();
    };

    const handleShare = async () => {
        if (!billData) return;
        const d = billData;
        const name = d.type === 'farmer' ? d.farmer?.name : d.customer?.name;
        let text = `NIRBANI DAIRY - BILL\n${name}\nPeriod: ${d.period_label}\n\n`;
        if (d.type === 'farmer') {
            text += `Date | Shift | Qty(L) | Fat | Rate | Amount\n`;
            d.collections?.forEach(c => { text += `${c.date} | ${c.shift} | ${c.quantity} | ${c.fat} | ${c.rate} | ${c.amount}\n`; });
            text += `\nTotal: ${d.summary.total_quantity}L | ${formatCurrency(d.summary.total_amount)}\nPaid: ${formatCurrency(d.summary.total_paid)}\nBalance: ${formatCurrency(d.summary.balance_due)}`;
        } else {
            text += `Date | Product | Qty | Rate | Amount\n`;
            d.sales?.forEach(s => { text += `${s.date} | ${s.product} | ${s.quantity} | ${s.rate} | ${s.amount}\n`; });
            text += `\nTotal: ${formatCurrency(d.summary.total_amount)}`;
        }
        if (navigator.share) {
            try { await navigator.share({ title: 'Bill - Nirbani Dairy', text }); } catch (e) {}
        } else {
            navigator.clipboard.writeText(text);
            toast.success(t('Bill copied!', 'बिल कॉपी हो गया!'));
        }
    };

    // Pre-fill rate from farmer data
    const openAddCollection = () => {
        const farmer = farmers.find(f => f.id === selectedId);
        const rate = farmer?.cow_rate || farmer?.rate || '';
        setCollForm(p => ({ ...p, rate: rate ? String(rate) : '', date: toLocalDateStr(new Date()) }));
        setShowAddCollection(true);
    };

    const items = activeTab === 'farmer' ? farmers : customers;
    const filtered = items.filter(i => !searchTerm || i.name?.toLowerCase().includes(searchTerm.toLowerCase()) || i.phone?.includes(searchTerm));

    if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

    return (
        <div className="p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-6 max-w-5xl mx-auto">
            <div>
                <h1 className="font-heading text-lg sm:text-xl md:text-2xl font-bold text-zinc-900">{t('Billing', 'बिलिंग')}</h1>
                <p className="text-xs text-muted-foreground">{t('Generate bills & add entries', 'बिल बनाएं और प्रविष्टि जोड़ें')}</p>
            </div>

            {/* Controls */}
            <Card>
                <CardContent className="p-4 space-y-4">
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

                    {/* Search */}
                    <div className="relative">
                        <Label className="text-xs mb-1.5 block">{activeTab === 'farmer' ? t('Select Farmer', 'किसान चुनें') : t('Select Customer', 'ग्राहक चुनें')} *</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <Input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                                onFocus={() => setShowDropdown(true)}
                                placeholder={selectedName || t('Search by name or phone...', 'नाम या फ़ोन से खोजें...')}
                                className={cn("h-12 pl-10", selectedId && "border-emerald-400 bg-emerald-50")}
                                data-testid="billing-search" />
                            {selectedId && <button type="button" onClick={() => { setSelectedId(''); setSelectedName(''); setSearchTerm(''); setBillData(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-sm">&#x2715;</button>}
                        </div>
                        {showDropdown && !selectedId && (
                            <div className="absolute z-50 w-full bg-white border rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto">
                                {filtered.map(item => (
                                    <button key={item.id} type="button" data-testid={`bill-item-${item.id}`}
                                        onClick={() => { setSelectedId(item.id); setSelectedName(item.name); setSearchTerm(''); setShowDropdown(false); }}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-emerald-50 text-left border-b last:border-0">
                                        <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center text-xs font-bold text-emerald-700">{item.name?.charAt(0)?.toUpperCase()}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate">{item.name}</p>
                                            <p className="text-[10px] text-zinc-500">{item.phone || ''} {item.village ? `| ${item.village}` : ''}</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-zinc-300" />
                                    </button>
                                ))}
                                {filtered.length === 0 && <p className="p-3 text-sm text-zinc-400 text-center">{t('No match', 'कोई मिलान नहीं')}</p>}
                            </div>
                        )}
                    </div>

                    {/* Period */}
                    <div>
                        <Label className="text-xs mb-1.5 block">{t('Billing Period', 'बिलिंग अवधि')}</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {[{ val: 'monthly', label: t('Monthly', 'मासिक') }, { val: '15days', label: t('15 Days', '15 दिन') }, { val: 'custom', label: t('Custom', 'कस्टम') }].map(p => (
                                <button key={p.val} type="button" data-testid={`period-${p.val}`} onClick={() => setPeriod(p.val)}
                                    className={cn("py-2.5 rounded-xl border-2 text-xs font-semibold transition-all",
                                        period === p.val ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-500")}>{p.label}</button>
                            ))}
                        </div>
                    </div>
                    {period === 'custom' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1"><Label className="text-xs">{t('From', 'से')}</Label><Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-10" data-testid="custom-start" /></div>
                            <div className="space-y-1"><Label className="text-xs">{t('To', 'तक')}</Label><Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-10" data-testid="custom-end" /></div>
                        </div>
                    )}

                    <Button onClick={generateBill} data-testid="generate-bill-btn" className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-base" disabled={generating}>
                        {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><FileText className="w-4 h-4 mr-2" />{t('Generate Bill', 'बिल बनाएं')}</>}
                    </Button>
                </CardContent>
            </Card>

            {/* Bill Preview */}
            {billData && (
                <div className="space-y-3">
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Button onClick={activeTab === 'farmer' ? openAddCollection : () => setShowAddSale(true)}
                            data-testid="add-entry-btn" className="flex-1 h-10 bg-amber-600 hover:bg-amber-700">
                            <PlusCircle className="w-4 h-4 mr-1" />{t('Add Entry', 'प्रविष्टि जोड़ें')}
                        </Button>
                        <Button onClick={handlePrint} variant="outline" data-testid="print-bill" className="flex-1 h-10">
                            <Printer className="w-4 h-4 mr-1" />{t('Print', 'प्रिंट')}
                        </Button>
                        <Button onClick={handleShare} variant="outline" data-testid="share-bill" className="flex-1 h-10">
                            <Share2 className="w-4 h-4 mr-1" />{t('Share', 'शेयर')}
                        </Button>
                    </div>

                    {/* Bill Content */}
                    <Card className="overflow-hidden border-2 border-emerald-200" data-testid="bill-preview">
                        <div ref={billRef}>
                            {/* Compact Invoice Header */}
                            <div className="bg-emerald-800 text-white px-4 py-3 sm:px-6 sm:py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-lg font-black" style={{fontFamily: 'serif'}}>N</div>
                                        <div>
                                            <h1 className="text-lg sm:text-xl font-bold tracking-wider" style={{fontFamily: 'Georgia, serif'}}>NIRBANI DAIRY</h1>
                                            <p className="text-emerald-300 text-[9px] tracking-wide">{t('Dairy Management Software', 'डेयरी प्रबंधन सॉफ्टवेयर')}</p>
                                        </div>
                                    </div>
                                    <div className="text-right text-[9px] text-emerald-200 leading-relaxed hidden sm:block">
                                        <p>Ph: _______________</p>
                                        <p>Address: _______________</p>
                                    </div>
                                </div>
                            </div>

                            {/* Bill Type Bar */}
                            <div className="bg-emerald-700 text-white text-center py-1.5 text-[10px] font-bold tracking-[3px] uppercase">
                                {billData.type === 'farmer' ? t('Farmer Bill', 'किसान बिल') : t('Customer Bill', 'ग्राहक बिल')}
                            </div>

                            {/* Info Row */}
                            <div className="px-4 py-2.5 sm:px-6 bg-emerald-50/50 border-b border-emerald-100">
                                <div className="flex flex-wrap justify-between gap-x-6 gap-y-1">
                                    <div>
                                        <p className="text-[9px] text-zinc-400 uppercase tracking-wider">{billData.type === 'farmer' ? t('Farmer', 'किसान') : t('Customer', 'ग्राहक')}</p>
                                        <p className="text-sm font-bold text-zinc-900">{billData.type === 'farmer' ? billData.farmer?.name : billData.customer?.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-zinc-400 uppercase tracking-wider">{t('Phone', 'फ़ोन')}</p>
                                        <p className="text-xs font-semibold text-zinc-700">{(billData.type === 'farmer' ? billData.farmer?.phone : billData.customer?.phone) || '-'}</p>
                                    </div>
                                    {billData.farmer?.village && (
                                        <div>
                                            <p className="text-[9px] text-zinc-400 uppercase tracking-wider">{t('Village', 'गांव')}</p>
                                            <p className="text-xs font-semibold text-zinc-700">{billData.farmer.village}</p>
                                        </div>
                                    )}
                                    <div className="text-right">
                                        <p className="text-[9px] text-zinc-400 uppercase tracking-wider">{t('Period', 'अवधि')}</p>
                                        <p className="text-sm font-bold text-emerald-700">{billData.period_label}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] text-zinc-400 uppercase tracking-wider">{t('Entries', 'प्रविष्टि')}</p>
                                        <p className="text-xs font-semibold text-zinc-700">{billData.summary?.total_entries}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="px-3 py-2 sm:px-5">
                                {billData.type === 'farmer'
                                    ? <FarmerBillTable data={billData} t={t} onDelete={handleDeleteCollection} deleting={deleting} />
                                    : <CustomerBillTable data={billData} t={t} onDelete={handleDeleteSale} deleting={deleting} />}
                                {/* Empty state */}
                                {((billData.type === 'farmer' && !billData.collections?.length) || (billData.type === 'customer' && !billData.sales?.length)) && (
                                    <div className="text-center py-6 no-print">
                                        <p className="text-zinc-400 text-sm mb-3">{t('No records for this period', 'इस अवधि के लिए कोई रिकॉर्ड नहीं')}</p>
                                        <Button onClick={activeTab === 'farmer' ? openAddCollection : () => setShowAddSale(true)}
                                            variant="outline" data-testid="add-first-entry-btn" className="text-sm">
                                            <Plus className="w-4 h-4 mr-1" />{t('Add First Entry', 'पहली प्रविष्टि जोड़ें')}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Summary */}
                            <div className="mx-3 sm:mx-5 mb-3 border-2 border-emerald-600 rounded-lg overflow-hidden">
                                {billData.type === 'farmer' ? (
                                    <>
                                        <div className="flex justify-between px-3 py-1.5 text-xs border-b border-emerald-100">
                                            <span className="text-zinc-600">{t('Total Milk Quantity', 'कुल दूध मात्रा')}</span>
                                            <span className="font-semibold">{billData.summary.total_quantity} L</span>
                                        </div>
                                        <div className="flex justify-between px-3 py-1.5 text-xs border-b border-emerald-100 bg-emerald-50/30">
                                            <span className="text-zinc-600">{t('Total Amount', 'कुल राशि')}</span>
                                            <span className="font-semibold">{formatCurrency(billData.summary.total_amount)}</span>
                                        </div>
                                        <div className="flex justify-between px-3 py-1.5 text-xs border-b border-emerald-100">
                                            <span className="text-zinc-600">{t('Amount Paid', 'भुगतान किया')}</span>
                                            <span className="font-semibold">{formatCurrency(billData.summary.total_paid)}</span>
                                        </div>
                                        <div className="flex justify-between px-3 py-2 text-sm bg-emerald-700 text-white font-bold">
                                            <span>{t('Balance Due', 'बकाया राशि')}</span>
                                            <span>{formatCurrency(billData.summary.balance_due)}</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex justify-between px-3 py-1.5 text-xs border-b border-emerald-100">
                                            <span className="text-zinc-600">{t('Total Entries', 'कुल प्रविष्टि')}</span>
                                            <span className="font-semibold">{billData.summary.total_entries}</span>
                                        </div>
                                        <div className="flex justify-between px-3 py-2 text-sm bg-emerald-700 text-white font-bold">
                                            <span>{t('Total Amount', 'कुल राशि')}</span>
                                            <span>{formatCurrency(billData.summary.total_amount)}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Signature Row */}
                            <div className="px-5 pb-3 flex justify-between text-[9px] text-zinc-400">
                                <div className="border-t border-zinc-300 pt-1 w-[35%] text-center">{t('Dairy Signature', 'डेयरी हस्ताक्षर')}</div>
                                <div className="border-t border-zinc-300 pt-1 w-[35%] text-center">
                                    {billData.type === 'farmer' ? t('Farmer Signature', 'किसान हस्ताक्षर') : t('Customer Signature', 'ग्राहक हस्ताक्षर')}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="text-center text-[8px] text-zinc-300 border-t border-zinc-100 py-1.5 bg-zinc-50">
                                Nirbani Dairy Management Software | Computer Generated Bill
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Add Farmer Collection Dialog */}
            <Dialog open={showAddCollection} onOpenChange={setShowAddCollection}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Milk className="w-5 h-5 text-emerald-600" />{t('Add Milk Entry', 'दूध प्रविष्टि जोड़ें')}</DialogTitle>
                        <DialogDescription>{selectedName} — {t('Add to billing', 'बिलिंग में जोड़ें')}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddCollection} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs">{t('Date', 'तारीख')}</Label>
                                <Input type="date" value={collForm.date} onChange={(e) => setCollForm(p => ({...p, date: e.target.value}))} className="h-10" data-testid="coll-date" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">{t('Shift', 'शिफ्ट')}</Label>
                                <div className="flex gap-1">
                                    {['morning', 'evening'].map(s => (
                                        <button key={s} type="button" onClick={() => setCollForm(p => ({...p, shift: s}))}
                                            className={cn("flex-1 py-2 rounded-lg border text-xs font-semibold",
                                                collForm.shift === s ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-500")}>
                                            {s === 'morning' ? t('Morning', 'सुबह') : t('Evening', 'शाम')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">{t('Milk Type', 'दूध प्रकार')}</Label>
                            <div className="flex gap-1">
                                {['cow', 'buffalo'].map(mt => (
                                    <button key={mt} type="button" onClick={() => {
                                        const farmer = farmers.find(f => f.id === selectedId);
                                        const rate = mt === 'cow' ? (farmer?.cow_rate || farmer?.rate || '') : (farmer?.buffalo_rate || farmer?.rate || '');
                                        setCollForm(p => ({...p, milk_type: mt, rate: rate ? String(rate) : ''}));
                                    }}
                                        className={cn("flex-1 py-2 rounded-lg border text-xs font-semibold",
                                            collForm.milk_type === mt ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-500")}>
                                        {mt === 'cow' ? t('Cow', 'गाय') : t('Buffalo', 'भैंस')}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs">{t('Quantity (L)', 'मात्रा (L)')} *</Label>
                                <Input type="number" step="0.1" value={collForm.quantity} onChange={(e) => setCollForm(p => ({...p, quantity: e.target.value}))}
                                    className="h-12 text-lg" data-testid="coll-quantity" placeholder="0" required />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">{t('Rate (/L)', 'दर (/L)')} *</Label>
                                <Input type="number" step="0.5" value={collForm.rate} onChange={(e) => setCollForm(p => ({...p, rate: e.target.value}))}
                                    className="h-12 text-lg" data-testid="coll-rate" placeholder="0" required />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs">{t('Fat %', 'फैट %')}</Label>
                                <Input type="number" step="0.1" value={collForm.fat} onChange={(e) => setCollForm(p => ({...p, fat: e.target.value}))}
                                    className="h-10" data-testid="coll-fat" placeholder="0" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">{t('SNF %', 'एसएनएफ %')}</Label>
                                <Input type="number" step="0.1" value={collForm.snf} onChange={(e) => setCollForm(p => ({...p, snf: e.target.value}))}
                                    className="h-10" data-testid="coll-snf" placeholder="0" />
                            </div>
                        </div>
                        {collForm.quantity && collForm.rate && (
                            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                                <span className="text-sm text-emerald-600">{t('Total', 'कुल')}:</span>
                                <span className="text-xl font-bold text-emerald-700 ml-2">{formatCurrency(parseFloat(collForm.quantity || 0) * parseFloat(collForm.rate || 0))}</span>
                            </div>
                        )}
                        <Button type="submit" data-testid="submit-collection" className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-base" disabled={submitting}>
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('Add Entry', 'प्रविष्टि जोड़ें')}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Customer Sale Dialog */}
            <Dialog open={showAddSale} onOpenChange={setShowAddSale}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-emerald-600" />{t('Add Sale Entry', 'बिक्री प्रविष्टि जोड़ें')}</DialogTitle>
                        <DialogDescription>{selectedName} — {t('Add to billing', 'बिलिंग में जोड़ें')}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddSale} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs">{t('Date', 'तारीख')}</Label>
                                <Input type="date" value={saleForm.date} onChange={(e) => setSaleForm(p => ({...p, date: e.target.value}))} className="h-10" data-testid="sale-entry-date" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">{t('Product', 'उत्पाद')}</Label>
                                <Select value={saleForm.product} onValueChange={(v) => setSaleForm(p => ({...p, product: v}))}>
                                    <SelectTrigger className="h-10" data-testid="sale-entry-product"><SelectValue /></SelectTrigger>
                                    <SelectContent>{productOptions.map(p => <SelectItem key={p.value} value={p.value}>{p.label[language]}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setSaleForm(p => ({...p, mode: 'direct', quantity: '', rate: ''}))} data-testid="sale-entry-mode-direct"
                                className={cn("flex-1 py-2 rounded-lg border text-xs font-semibold", saleForm.mode === 'direct' ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-500")}>
                                {t('Direct Amount', 'सीधी राशि')}
                            </button>
                            <button type="button" onClick={() => setSaleForm(p => ({...p, mode: 'qtyrate', direct_amount: ''}))} data-testid="sale-entry-mode-qtyrate"
                                className={cn("flex-1 py-2 rounded-lg border text-xs font-semibold", saleForm.mode === 'qtyrate' ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-500")}>
                                {t('Qty x Rate', 'मात्रा x दर')}
                            </button>
                        </div>
                        {saleForm.mode === 'direct' ? (
                            <div className="space-y-1.5">
                                <Label className="text-xs">{t('Amount', 'राशि')} *</Label>
                                <Input type="number" step="0.5" value={saleForm.direct_amount} onChange={(e) => setSaleForm(p => ({...p, direct_amount: e.target.value}))}
                                    className="h-14 text-2xl text-center font-bold" data-testid="sale-entry-amount" placeholder="0" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">{t('Quantity', 'मात्रा')} *</Label>
                                    <Input type="number" step="0.1" value={saleForm.quantity} onChange={(e) => setSaleForm(p => ({...p, quantity: e.target.value}))}
                                        className="h-12 text-lg" data-testid="sale-entry-quantity" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">{t('Rate', 'दर')} *</Label>
                                    <Input type="number" step="0.5" value={saleForm.rate} onChange={(e) => setSaleForm(p => ({...p, rate: e.target.value}))}
                                        className="h-12 text-lg" data-testid="sale-entry-rate" />
                                </div>
                            </div>
                        )}

                        {/* Repeat for multiple days */}
                        <div className="space-y-1.5">
                            <Label className="text-xs flex items-center gap-1">
                                <Copy className="w-3 h-3" />
                                {t('Repeat for how many days?', 'कितने दिन के लिए दोहराएं?')}
                            </Label>
                            <div className="flex items-center gap-2">
                                <Input type="number" min="1" max="31" value={saleForm.repeatDays}
                                    onChange={(e) => setSaleForm(p => ({...p, repeatDays: e.target.value}))}
                                    className="h-10 w-20 text-center" data-testid="sale-entry-repeat-days" />
                                <span className="text-xs text-zinc-500">
                                    {parseInt(saleForm.repeatDays) > 1
                                        ? t(`Will add ${saleForm.repeatDays} entries from ${saleForm.date}`, `${saleForm.date} से ${saleForm.repeatDays} प्रविष्टि जोड़ेगा`)
                                        : t('Single day entry', 'एक दिन की प्रविष्टि')}
                                </span>
                            </div>
                        </div>

                        {((saleForm.mode === 'direct' && saleForm.direct_amount) || (saleForm.mode === 'qtyrate' && saleForm.quantity && saleForm.rate)) && (
                            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                                <span className="text-sm text-emerald-600">{t('Total', 'कुल')}:</span>
                                <span className="text-xl font-bold text-emerald-700 ml-2">
                                    {formatCurrency(
                                        (saleForm.mode === 'direct' ? parseFloat(saleForm.direct_amount || 0) : (parseFloat(saleForm.quantity || 0) * parseFloat(saleForm.rate || 0)))
                                        * Math.max(1, parseInt(saleForm.repeatDays) || 1)
                                    )}
                                    {parseInt(saleForm.repeatDays) > 1 && (
                                        <span className="text-xs font-normal text-emerald-500 ml-1">
                                            ({saleForm.repeatDays} {t('days', 'दिन')})
                                        </span>
                                    )}
                                </span>
                            </div>
                        )}
                        <Button type="submit" data-testid="submit-sale-entry" className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-base" disabled={submitting}>
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> :
                                parseInt(saleForm.repeatDays) > 1
                                    ? t(`Add ${saleForm.repeatDays} Entries`, `${saleForm.repeatDays} प्रविष्टि जोड़ें`)
                                    : t('Add Entry', 'प्रविष्टि जोड़ें')}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const SummaryRow = ({ label, value, bold }) => (
    <div className={cn("flex justify-between items-center", bold && "font-bold text-emerald-800")}>
        <span className={cn("text-sm", !bold && "text-zinc-600")}>{label}</span>
        <span className={cn("text-sm", bold ? "text-lg" : "")}>{value}</span>
    </div>
);

const FarmerBillTable = ({ data, t, onDelete, deleting }) => {
    if (!data.collections?.length) return null;
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-[10px] sm:text-xs">
                <thead><tr className="bg-emerald-800 text-white">
                    <th className="py-1.5 px-1.5 sm:px-2 text-left font-semibold">{t('Date', 'तारीख')}</th>
                    <th className="py-1.5 px-1.5 sm:px-2 text-left font-semibold">{t('Shift', 'शिफ्ट')}</th>
                    <th className="py-1.5 px-1.5 sm:px-2 text-left font-semibold">{t('Type', 'प्रकार')}</th>
                    <th className="py-1.5 px-1.5 sm:px-2 text-right font-semibold">{t('Qty(L)', 'मात्रा')}</th>
                    <th className="py-1.5 px-1.5 sm:px-2 text-right font-semibold">{t('Fat', 'फैट')}</th>
                    <th className="py-1.5 px-1.5 sm:px-2 text-right font-semibold">{t('Rate', 'दर')}</th>
                    <th className="py-1.5 px-1.5 sm:px-2 text-right font-semibold">{t('Amount', 'राशि')}</th>
                    <th className="py-1 px-1 text-center font-semibold no-print" style={{width: '32px'}}></th>
                </tr></thead>
                <tbody>
                    {data.collections.map((c, idx) => (
                        <tr key={c.id || idx} className={idx % 2 === 0 ? "bg-white" : "bg-zinc-50/60"}>
                            <td className="py-1 px-1.5 sm:px-2">{c.date}</td>
                            <td className="py-1 px-1.5 sm:px-2 capitalize">{c.shift === 'morning' ? t('AM', 'सुबह') : t('PM', 'शाम')}</td>
                            <td className="py-1 px-1.5 sm:px-2 capitalize">{c.milk_type || 'cow'}</td>
                            <td className="py-1 px-1.5 sm:px-2 text-right font-medium">{c.quantity}</td>
                            <td className="py-1 px-1.5 sm:px-2 text-right">{c.fat}</td>
                            <td className="py-1 px-1.5 sm:px-2 text-right">{formatCurrency(c.rate)}</td>
                            <td className="py-1 px-1.5 sm:px-2 text-right font-semibold text-emerald-700">{formatCurrency(c.amount)}</td>
                            <td className="py-1 px-1 text-center no-print">
                                <button type="button" data-testid={`delete-collection-${c.id}`} onClick={() => onDelete(c.id)}
                                    disabled={deleting === c.id}
                                    className="p-0.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50">
                                    {deleting === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const CustomerBillTable = ({ data, t, onDelete, deleting }) => {
    if (!data.sales?.length) return null;
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-[10px] sm:text-xs">
                <thead><tr className="bg-emerald-800 text-white">
                    <th className="py-1.5 px-1.5 sm:px-2 text-left font-semibold">{t('Date', 'तारीख')}</th>
                    <th className="py-1.5 px-1.5 sm:px-2 text-left font-semibold">{t('Product', 'उत्पाद')}</th>
                    <th className="py-1.5 px-1.5 sm:px-2 text-right font-semibold">{t('Qty', 'मात्रा')}</th>
                    <th className="py-1.5 px-1.5 sm:px-2 text-right font-semibold">{t('Rate', 'दर')}</th>
                    <th className="py-1.5 px-1.5 sm:px-2 text-right font-semibold">{t('Amount', 'राशि')}</th>
                    <th className="py-1 px-1 text-center font-semibold no-print" style={{width: '32px'}}></th>
                </tr></thead>
                <tbody>
                    {data.sales.map((s, idx) => (
                        <tr key={s.id || idx} className={idx % 2 === 0 ? "bg-white" : "bg-zinc-50/60"}>
                            <td className="py-1 px-1.5 sm:px-2">{s.date}</td>
                            <td className="py-1 px-1.5 sm:px-2 capitalize">{s.product}</td>
                            <td className="py-1 px-1.5 sm:px-2 text-right font-medium">{s.quantity > 0 ? s.quantity : '-'}</td>
                            <td className="py-1 px-1.5 sm:px-2 text-right">{s.rate > 0 ? formatCurrency(s.rate) : '-'}</td>
                            <td className="py-1 px-1.5 sm:px-2 text-right font-semibold text-emerald-700">{formatCurrency(s.amount)}</td>
                            <td className="py-1 px-1 text-center no-print">
                                <button type="button" data-testid={`delete-sale-${s.id}`} onClick={() => onDelete(s.id)}
                                    disabled={deleting === s.id}
                                    className="p-0.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50">
                                    {deleting === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default BillingPage;
