import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    ChevronRight, Plus, PlusCircle, Trash2, Copy, Pencil, CalendarOff, Image
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL; = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const BillingPage = () => {
    const { language, user } = useAuth();
    const t = (en, hi) => language === 'hi' ? hi : en;
    const billedBy = user?.name || 'Staff';
    const billRef = useRef(null);

    const [activeTab, setActiveTab] = useState('farmer');
    const [farmers, setFarmers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(null);
    const [billData, setBillData] = useState(null);
    const [dairyInfo, setDairyInfo] = useState({ dairy_name: 'Nirbani Dairy', dairy_phone: '', dairy_address: '' });

    const [selectedId, setSelectedId] = useState('');
    const [selectedName, setSelectedName] = useState('');
    const [period, setPeriod] = useState('monthly');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    // Dialogs
    const [showAddCollection, setShowAddCollection] = useState(false);
    const [showAddSale, setShowAddSale] = useState(false);
    const [showEditEntry, setShowEditEntry] = useState(false);
    const [editEntry, setEditEntry] = useState(null);
    const [showHolidayDialog, setShowHolidayDialog] = useState(false);
    const [holidays, setHolidays] = useState([]);
    const [holidayDate, setHolidayDate] = useState('');

    const today = toLocalDateStr(new Date());
    const [collForm, setCollForm] = useState({ date: today, shift: new Date().getHours() < 12 ? 'morning' : 'evening', milk_type: 'cow', quantity: '', fat: '', snf: '', rate: '' });
    const [saleForm, setSaleForm] = useState({ date: today, product: 'milk', quantity: '', rate: '', direct_amount: '', mode: 'direct', repeatDays: '1' });

    const token = localStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        const fetchLists = async () => {
            try {
                const [fRes, cRes, sRes] = await Promise.all([
                    axios.get(`${BACKEND_URL}/api/farmers`, { headers }),
                    axios.get(`${BACKEND_URL}/api/customers`, { headers }),
                    axios.get(`${BACKEND_URL}/api/settings/dairy`, { headers }),
                ]);
                setFarmers(fRes.data);
                setCustomers(cRes.data);
                setDairyInfo(sRes.data);
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
        const s = new Date(start + 'T12:00:00');
        const e = new Date(end + 'T12:00:00');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        if (period === 'monthly') return `${months[s.getMonth()]} ${s.getFullYear()}`;
        return `${s.getDate()} ${months[s.getMonth()]} - ${e.getDate()} ${months[e.getMonth()]} ${e.getFullYear()}`;
    };

    const generateBill = useCallback(async () => {
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
    }, [selectedId, activeTab, period, customStart, customEnd]);

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

    // Edit entry
    const openEditEntry = (entry, type) => {
        setEditEntry({ ...entry, _type: type });
        setShowEditEntry(true);
    };

    const handleUpdateEntry = async (e) => {
        e.preventDefault();
        if (!editEntry) return;
        setSubmitting(true);
        try {
            if (editEntry._type === 'collection') {
                await axios.put(`${BACKEND_URL}/api/collections/${editEntry.id}`, {
                    date: editEntry.date, shift: editEntry.shift, milk_type: editEntry.milk_type,
                    quantity: parseFloat(editEntry.quantity), fat: parseFloat(editEntry.fat || 0),
                    snf: parseFloat(editEntry.snf || 0), rate: parseFloat(editEntry.rate),
                }, { headers });
            } else {
                await axios.put(`${BACKEND_URL}/api/sales/${editEntry.id}`, {
                    date: editEntry.date, product: editEntry.product,
                    quantity: parseFloat(editEntry.quantity || 0), rate: parseFloat(editEntry.rate || 0),
                    direct_amount: editEntry.amount ? parseFloat(editEntry.amount) : null,
                }, { headers });
            }
            toast.success(t('Entry updated!', 'प्रविष्टि अपडेट!'));
            setShowEditEntry(false);
            setEditEntry(null);
            await generateBill();
        } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
        finally { setSubmitting(false); }
    };

    const handleAddCollection = async (e) => {
        e.preventDefault();
        if (!collForm.quantity || !collForm.rate) { toast.error(t('Fill quantity and rate', 'मात्रा और दर भरें')); return; }
        setSubmitting(true);
        try {
            await axios.post(`${BACKEND_URL}/api/collections`, {
                farmer_id: selectedId, date: collForm.date, shift: collForm.shift,
                milk_type: collForm.milk_type, quantity: parseFloat(collForm.quantity),
                fat: parseFloat(collForm.fat || 0), snf: parseFloat(collForm.snf || 0),
                rate: parseFloat(collForm.rate),
            }, { headers });
            toast.success(t('Entry added!', 'प्रविष्टि जोड़ी गई!'));
            setShowAddCollection(false);
            setCollForm({ date: today, shift: new Date().getHours() < 12 ? 'morning' : 'evening', milk_type: 'cow', quantity: '', fat: '', snf: '', rate: '' });
            await generateBill();
        } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
        finally { setSubmitting(false); }
    };

    const handleAddSale = async (e) => {
        e.preventDefault();
        if (saleForm.mode === 'direct' && !saleForm.direct_amount) { toast.error(t('Enter amount', 'राशि दर्ज करें')); return; }
        if (saleForm.mode === 'qtyrate' && (!saleForm.quantity || !saleForm.rate)) { toast.error(t('Fill quantity and rate', 'मात्रा और दर भरें')); return; }
        const repeatDays = Math.max(1, Math.min(31, parseInt(saleForm.repeatDays) || 1));
        setSubmitting(true);
        try {
            const baseDate = new Date(saleForm.date + 'T12:00:00');
            let addedCount = 0;
            for (let i = 0; i < repeatDays; i++) {
                const d = new Date(baseDate);
                d.setDate(d.getDate() + i);
                const dateStr = toLocalDateStr(d);
                await axios.post(`${BACKEND_URL}/api/sales`, {
                    customer_id: selectedId, date: dateStr, product: saleForm.product,
                    quantity: saleForm.quantity ? parseFloat(saleForm.quantity) : 0,
                    rate: saleForm.rate ? parseFloat(saleForm.rate) : 0,
                    direct_amount: saleForm.direct_amount ? parseFloat(saleForm.direct_amount) : null,
                }, { headers });
                addedCount++;
            }
            toast.success(addedCount > 1 ? t(`${addedCount} entries added!`, `${addedCount} प्रविष्टि जोड़ी गई!`) : t('Sale added!', 'बिक्री जोड़ी गई!'));
            setShowAddSale(false);
            setSaleForm({ date: today, product: 'milk', quantity: '', rate: '', direct_amount: '', mode: 'direct', repeatDays: '1' });
            await generateBill();
        } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
        finally { setSubmitting(false); }
    };

    // Holiday management
    const addHoliday = () => {
        if (!holidayDate) return;
        if (!holidays.includes(holidayDate)) {
            setHolidays([...holidays, holidayDate].sort());
        }
        setHolidayDate('');
    };
    const removeHoliday = (d) => setHolidays(holidays.filter(h => h !== d));

    // Share as image
    const handleShareImage = async () => {
        if (!billRef.current) return;
        try {
            const { default: html2canvas } = await import('html2canvas');
            const canvas = await html2canvas(billRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            canvas.toBlob(async (blob) => {
                if (!blob) { toast.error('Error creating image'); return; }
                const file = new File([blob], 'nirbani-dairy-bill.png', { type: 'image/png' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], title: 'Bill - Nirbani Dairy' });
                } else {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = 'nirbani-dairy-bill.png';
                    a.click(); URL.revokeObjectURL(url);
                    toast.success(t('Bill image downloaded!', 'बिल इमेज डाउनलोड!'));
                }
            }, 'image/png');
        } catch (e) {
            console.error(e);
            toast.error(t('Error sharing bill', 'बिल शेयर करने में त्रुटि'));
        }
    };

    const handlePrint = () => {
        if (!billData) return;
        const d = billData;
        const name = d.type === 'farmer' ? d.farmer?.name : d.customer?.name;
        const phone = d.type === 'farmer' ? d.farmer?.phone : d.customer?.phone;
        const village = d.farmer?.village || '';
        const billType = d.type === 'farmer' ? 'FARMER BILL / किसान बिल' : 'CUSTOMER BILL / ग्राहक बिल';
        const dName = dairyInfo.dairy_name || 'Nirbani Dairy';
        const dPhone = dairyInfo.dairy_phone || '';
        const dAddr = dairyInfo.dairy_address || '';

        let tableRows = '';
        if (d.type === 'farmer') {
            const headers = '<tr><th>Date</th><th>Shift</th><th>Type</th><th class="r">Qty(L)</th><th class="r">Fat</th><th class="r">Rate</th><th class="r">Amount</th></tr>';
            const rows = (d.collections || []).map((c, i) =>
                `<tr class="${i % 2 ? 'alt' : ''}"><td>${c.date}</td><td>${c.shift}</td><td>${c.milk_type || 'cow'}</td><td class="r">${c.quantity}</td><td class="r">${c.fat}</td><td class="r">${c.rate}</td><td class="r b">${c.amount?.toFixed(2)}</td></tr>`
            ).join('');
            tableRows = headers + rows;
        } else {
            const headers = '<tr><th>Date</th><th>Product</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr>';
            const rows = (d.sales || []).map((s, i) => {
                const isHol = holidays.includes(s.date);
                return `<tr class="${i % 2 ? 'alt' : ''} ${isHol ? 'holiday' : ''}"><td>${s.date}${isHol ? ' <span class="hol">Holiday</span>' : ''}</td><td>${s.product}</td><td class="r">${s.quantity > 0 ? s.quantity : '-'}</td><td class="r">${s.rate > 0 ? s.rate : '-'}</td><td class="r b">${s.amount?.toFixed(2)}</td></tr>`;
            }).join('');
            if (holidays.length) {
                const holRows = holidays.filter(h => !(d.sales || []).some(s => s.date === h)).map(h =>
                    `<tr class="holiday"><td>${h} <span class="hol">Holiday</span></td><td colspan="4" class="r" style="color:#999">-</td></tr>`).join('');
                tableRows = headers + rows + holRows;
            } else {
                tableRows = headers + rows;
            }
        }

        let summaryHtml = '';
        if (d.type === 'farmer') {
            summaryHtml = `<div class="sum-grid">
                <div class="sum-item"><span>Total Qty / कुल मात्रा</span><span>${d.summary.total_quantity} L</span></div>
                <div class="sum-item"><span>Total Amount / कुल राशि</span><span>${d.summary.total_amount?.toFixed(2)}</span></div>
                <div class="sum-item"><span>Paid / भुगतान</span><span>${d.summary.total_paid?.toFixed(2)}</span></div>
                <div class="sum-item total"><span>Balance Due / बकाया</span><span>${d.summary.balance_due?.toFixed(2)}</span></div>
            </div>`;
        } else {
            summaryHtml = `<div class="sum-grid">
                <div class="sum-item"><span>Total Entries / कुल प्रविष्टि</span><span>${d.summary.total_entries}</span></div>
                ${holidays.length ? `<div class="sum-item"><span>Holidays / छुट्टी</span><span>${holidays.length} days</span></div>` : ''}
                <div class="sum-item total"><span>Total Amount / कुल राशि</span><span>${d.summary.total_amount?.toFixed(2)}</span></div>
            </div>`;
        }

        const sigHtml = SIGNATORIES.map(n => `<div class="sig"><div class="sig-name">${n}</div><div class="sig-line">Authorized Signatory</div></div>`).join('');

        const win = window.open('', '_blank');
        win.document.write(`<!DOCTYPE html><html><head><title>Bill - ${dName}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Tahoma,sans-serif;color:#1a1a1a;padding:6mm;font-size:10px}
.header{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #166534;padding-bottom:5px;margin-bottom:5px}
.header-left{display:flex;align-items:center;gap:8px}
.logo{width:40px;height:40px;background:#166534;border-radius:6px;display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:16px;font-family:serif}
.dairy-name{font-size:16px;font-weight:800;color:#166534;font-family:Georgia,serif;letter-spacing:1px}
.dairy-sub{font-size:7px;color:#555}
.header-right{text-align:right;font-size:8px;color:#555;line-height:1.4}
.bill-type{text-align:center;background:#166534;color:white;padding:3px 0;font-size:9px;font-weight:700;letter-spacing:2px;margin-bottom:4px}
.info-row{display:flex;justify-content:space-between;margin-bottom:4px;font-size:8px;padding:3px 5px;background:#f8faf8;border:1px solid #e0e8e0;border-radius:3px}
.info-row .label{color:#666;font-size:7px}
.info-row .val{font-weight:700;font-size:9px}
table{width:100%;border-collapse:collapse;margin-bottom:4px;font-size:8px}
th{background:#166534;color:white;padding:3px 4px;text-align:left;font-weight:600;font-size:7px;text-transform:uppercase}
td{padding:2px 4px;border-bottom:1px solid #eee}
tr.alt{background:#f5f8f5}
tr.holiday{background:#fff8f0}
.hol{font-size:6px;color:#d97706;font-weight:700;border:1px solid #d97706;padding:0 2px;border-radius:2px}
.r{text-align:right}.b{font-weight:700;color:#166534}
.sum-grid{border:2px solid #166534;border-radius:3px;overflow:hidden;margin-bottom:4px}
.sum-item{display:flex;justify-content:space-between;padding:2px 6px;font-size:8px;border-bottom:1px solid #e0e8e0}
.sum-item:last-child{border-bottom:none}
.sum-item.total{background:#166534;color:white;font-weight:800;font-size:10px;padding:4px 6px}
.stamp{text-align:center;margin:8px auto 4px;width:120px;border:2px solid #166534;border-radius:50%;padding:8px 4px;color:#166534;font-weight:800;font-size:9px;line-height:1.3;opacity:0.8;transform:rotate(-5deg)}
.stamp .s-name{font-size:11px;letter-spacing:1px}
.sig-row{display:flex;justify-content:space-around;margin-top:6px}
.sig{text-align:center;width:28%}
.sig-name{font-weight:700;font-size:9px;color:#166534;margin-bottom:10px}
.sig-line{border-top:1px solid #999;padding-top:2px;font-size:7px;color:#666}
.footer{text-align:center;font-size:6px;color:#999;border-top:1px solid #ddd;padding-top:3px;margin-top:4px}
@media print{body{padding:4mm}@page{size:A4;margin:4mm}}
</style></head><body>
<div class="header">
    <div class="header-left">
        <div class="logo">${dName.charAt(0)}</div>
        <div><div class="dairy-name">${dName.toUpperCase()}</div><div class="dairy-sub">Dairy Management Software</div></div>
    </div>
    <div class="header-right">${dPhone ? `Ph: ${dPhone}<br>` : ''}${dAddr ? `${dAddr}<br>` : ''}${!dPhone && !dAddr ? 'Dairy Management<br>Software' : ''}</div>
</div>
<div class="bill-type">${billType}</div>
<div class="info-row">
    <div><div class="label">${d.type === 'farmer' ? 'Farmer' : 'Customer'}</div><div class="val">${name}</div></div>
    <div><div class="label">Phone</div><div class="val">${phone || '-'}</div></div>
    ${village ? `<div><div class="label">Village</div><div class="val">${village}</div></div>` : ''}
    <div><div class="label">Period</div><div class="val">${d.period_label}</div></div>
    <div><div class="label">Entries</div><div class="val">${d.summary.total_entries}</div></div>
</div>
<table>${tableRows}</table>
${summaryHtml}
<div class="stamp"><div class="s-name">${dName.toUpperCase()}</div>DIGITAL STAMP<br>VERIFIED</div>
<div class="sig-row">${sigHtml}</div>
<div class="footer">${dName} | Computer Generated Bill | This is not a tax invoice</div>
</body></html>`);
        win.document.close();
        win.print();
    };

    const openAddCollection = () => {
        const farmer = farmers.find(f => f.id === selectedId);
        const rate = farmer?.cow_rate || farmer?.rate || '';
        setCollForm(p => ({ ...p, rate: rate ? String(rate) : '', date: today }));
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
                    <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedId(''); setSelectedName(''); setBillData(null); setSearchTerm(''); setHolidays([]); }}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="farmer" data-testid="bill-farmer-tab" className="text-xs sm:text-sm"><Milk className="w-3 h-3 mr-1" />{t('Farmer Bill', 'किसान बिल')}</TabsTrigger>
                            <TabsTrigger value="customer" data-testid="bill-customer-tab" className="text-xs sm:text-sm"><Users className="w-3 h-3 mr-1" />{t('Customer Bill', 'ग्राहक बिल')}</TabsTrigger>
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
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={activeTab === 'farmer' ? openAddCollection : () => setShowAddSale(true)}
                            data-testid="add-entry-btn" className="flex-1 h-10 bg-amber-600 hover:bg-amber-700">
                            <PlusCircle className="w-4 h-4 mr-1" />{t('Add Entry', 'प्रविष्टि जोड़ें')}
                        </Button>
                        {activeTab === 'customer' && (
                            <Button onClick={() => setShowHolidayDialog(true)} variant="outline" data-testid="holiday-btn" className="h-10">
                                <CalendarOff className="w-4 h-4 mr-1" />{t('Holiday', 'छुट्टी')} {holidays.length > 0 && `(${holidays.length})`}
                            </Button>
                        )}
                        <Button onClick={handlePrint} variant="outline" data-testid="print-bill" className="h-10">
                            <Printer className="w-4 h-4 mr-1" />{t('Print', 'प्रिंट')}
                        </Button>
                        <Button onClick={handleShareImage} variant="outline" data-testid="share-bill" className="h-10">
                            <Image className="w-4 h-4 mr-1" />{t('Share Image', 'इमेज शेयर')}
                        </Button>
                    </div>

                    <Card className="overflow-hidden border-2 border-emerald-200" data-testid="bill-preview">
                        <div ref={billRef} style={{ backgroundColor: '#ffffff' }}>
                            {/* Header */}
                            <div className="bg-emerald-800 text-white px-4 py-3 sm:px-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center text-lg font-black" style={{fontFamily: 'serif'}}>{(dairyInfo.dairy_name || 'N').charAt(0)}</div>
                                        <div>
                                            <h1 className="text-lg sm:text-xl font-bold tracking-wider" style={{fontFamily: 'Georgia, serif'}}>{(dairyInfo.dairy_name || 'NIRBANI DAIRY').toUpperCase()}</h1>
                                            <p className="text-emerald-300 text-[9px]">{t('Dairy Management Software', 'डेयरी प्रबंधन सॉफ्टवेयर')}</p>
                                        </div>
                                    </div>
                                    <div className="text-right text-[9px] text-emerald-200 leading-relaxed hidden sm:block">
                                        {dairyInfo.dairy_phone && <p>Ph: {dairyInfo.dairy_phone}</p>}
                                        {dairyInfo.dairy_address && <p>{dairyInfo.dairy_address}</p>}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-emerald-700 text-white text-center py-1 text-[10px] font-bold tracking-[3px] uppercase">
                                {billData.type === 'farmer' ? t('Farmer Bill', 'किसान बिल') : t('Customer Bill', 'ग्राहक बिल')}
                            </div>

                            {/* Info */}
                            <div className="px-4 py-2 sm:px-6 bg-emerald-50/50 border-b border-emerald-100">
                                <div className="flex flex-wrap justify-between gap-x-6 gap-y-1">
                                    <div>
                                        <p className="text-[9px] text-zinc-400 uppercase tracking-wider">{billData.type === 'farmer' ? t('Farmer', 'किसान') : t('Customer', 'ग्राहक')}</p>
                                        <p className="text-sm font-bold text-zinc-900">{billData.type === 'farmer' ? billData.farmer?.name : billData.customer?.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-zinc-400 uppercase tracking-wider">{t('Phone', 'फ़ोन')}</p>
                                        <p className="text-xs font-semibold text-zinc-700">{(billData.type === 'farmer' ? billData.farmer?.phone : billData.customer?.phone) || '-'}</p>
                                    </div>
                                    {billData.farmer?.village && <div><p className="text-[9px] text-zinc-400 uppercase tracking-wider">{t('Village', 'गांव')}</p><p className="text-xs font-semibold text-zinc-700">{billData.farmer.village}</p></div>}
                                    <div className="text-right">
                                        <p className="text-[9px] text-zinc-400 uppercase tracking-wider">{t('Period', 'अवधि')}</p>
                                        <p className="text-sm font-bold text-emerald-700">{billData.period_label}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="px-3 py-2 sm:px-5">
                                {billData.type === 'farmer'
                                    ? <FarmerBillTable data={billData} t={t} onDelete={handleDeleteCollection} onEdit={(c) => openEditEntry(c, 'collection')} deleting={deleting} />
                                    : <CustomerBillTable data={billData} t={t} onDelete={handleDeleteSale} onEdit={(s) => openEditEntry(s, 'sale')} deleting={deleting} holidays={holidays} />}
                                {((billData.type === 'farmer' && !billData.collections?.length) || (billData.type === 'customer' && !billData.sales?.length)) && (
                                    <div className="text-center py-6 no-print">
                                        <p className="text-zinc-400 text-sm mb-3">{t('No records for this period', 'इस अवधि के लिए कोई रिकॉर्ड नहीं')}</p>
                                        <Button onClick={activeTab === 'farmer' ? openAddCollection : () => setShowAddSale(true)} variant="outline" data-testid="add-first-entry-btn" className="text-sm">
                                            <Plus className="w-4 h-4 mr-1" />{t('Add First Entry', 'पहली प्रविष्टि जोड़ें')}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Summary */}
                            <div className="mx-3 sm:mx-5 mb-2 border-2 border-emerald-600 rounded-lg overflow-hidden">
                                {billData.type === 'farmer' ? (
                                    <>
                                        <div className="flex justify-between px-3 py-1.5 text-xs border-b border-emerald-100"><span className="text-zinc-600">{t('Total Milk Quantity', 'कुल दूध मात्रा')}</span><span className="font-semibold">{billData.summary.total_quantity} L</span></div>
                                        <div className="flex justify-between px-3 py-1.5 text-xs border-b border-emerald-100 bg-emerald-50/30"><span className="text-zinc-600">{t('Total Amount', 'कुल राशि')}</span><span className="font-semibold">{formatCurrency(billData.summary.total_amount)}</span></div>
                                        <div className="flex justify-between px-3 py-1.5 text-xs border-b border-emerald-100"><span className="text-zinc-600">{t('Amount Paid', 'भुगतान किया')}</span><span className="font-semibold">{formatCurrency(billData.summary.total_paid)}</span></div>
                                        <div className="flex justify-between px-3 py-2 text-sm bg-emerald-700 text-white font-bold"><span>{t('Balance Due', 'बकाया राशि')}</span><span>{formatCurrency(billData.summary.balance_due)}</span></div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex justify-between px-3 py-1.5 text-xs border-b border-emerald-100"><span className="text-zinc-600">{t('Total Entries', 'कुल प्रविष्टि')}</span><span className="font-semibold">{billData.summary.total_entries}</span></div>
                                        {holidays.length > 0 && <div className="flex justify-between px-3 py-1.5 text-xs border-b border-emerald-100 bg-amber-50"><span className="text-amber-700">{t('Holidays', 'छुट्टी')}</span><span className="font-semibold text-amber-700">{holidays.length} {t('days', 'दिन')}</span></div>}
                                        <div className="flex justify-between px-3 py-2 text-sm bg-emerald-700 text-white font-bold"><span>{t('Total Amount', 'कुल राशि')}</span><span>{formatCurrency(billData.summary.total_amount)}</span></div>
                                    </>
                                )}
                            </div>

                            {/* Digital Stamp + Signatures */}
                            <div className="px-5 py-2">
                                <div className="flex items-center justify-center mb-2">
                                    <div className="border-2 border-emerald-700 rounded-full px-4 py-2 text-center opacity-80" style={{transform: 'rotate(-5deg)'}}>
                                        <p className="text-[10px] font-black text-emerald-700 tracking-wider">{(dairyInfo.dairy_name || 'NIRBANI DAIRY').toUpperCase()}</p>
                                        <p className="text-[8px] font-bold text-emerald-600">DIGITAL STAMP - VERIFIED</p>
                                    </div>
                                </div>
                                <div className="flex justify-around">
                                    {SIGNATORIES.map(name => (
                                        <div key={name} className="text-center w-[28%]">
                                            <p className="text-[10px] font-bold text-emerald-700 mb-3 italic">{name}</p>
                                            <div className="border-t border-zinc-300 pt-1">
                                                <p className="text-[8px] text-zinc-400">{t('Authorized Signatory', 'अधिकृत हस्ताक्षरकर्ता')}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="text-center text-[7px] text-zinc-300 border-t border-zinc-100 py-1 bg-zinc-50">
                                {dairyInfo.dairy_name || 'Nirbani Dairy'} | Computer Generated Bill
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
                            <div className="space-y-1.5"><Label className="text-xs">{t('Date', 'तारीख')}</Label><Input type="date" value={collForm.date} onChange={(e) => setCollForm(p => ({...p, date: e.target.value}))} className="h-10" data-testid="coll-date" /></div>
                            <div className="space-y-1.5"><Label className="text-xs">{t('Shift', 'शिफ्ट')}</Label>
                                <div className="flex gap-1">{['morning', 'evening'].map(s => (
                                    <button key={s} type="button" onClick={() => setCollForm(p => ({...p, shift: s}))}
                                        className={cn("flex-1 py-2 rounded-lg border text-xs font-semibold", collForm.shift === s ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-500")}>
                                        {s === 'morning' ? t('Morning', 'सुबह') : t('Evening', 'शाम')}</button>))}</div>
                            </div>
                        </div>
                        <div className="space-y-1.5"><Label className="text-xs">{t('Milk Type', 'दूध प्रकार')}</Label>
                            <div className="flex gap-1">{['cow', 'buffalo'].map(mt => (
                                <button key={mt} type="button" onClick={() => { const farmer = farmers.find(f => f.id === selectedId); const rate = mt === 'cow' ? (farmer?.cow_rate || farmer?.rate || '') : (farmer?.buffalo_rate || farmer?.rate || ''); setCollForm(p => ({...p, milk_type: mt, rate: rate ? String(rate) : ''})); }}
                                    className={cn("flex-1 py-2 rounded-lg border text-xs font-semibold", collForm.milk_type === mt ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-500")}>
                                    {mt === 'cow' ? t('Cow', 'गाय') : t('Buffalo', 'भैंस')}</button>))}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5"><Label className="text-xs">{t('Quantity (L)', 'मात्रा (L)')} *</Label><Input type="number" step="0.1" value={collForm.quantity} onChange={(e) => setCollForm(p => ({...p, quantity: e.target.value}))} className="h-12 text-lg" data-testid="coll-quantity" placeholder="0" required /></div>
                            <div className="space-y-1.5"><Label className="text-xs">{t('Rate (/L)', 'दर (/L)')} *</Label><Input type="number" step="0.5" value={collForm.rate} onChange={(e) => setCollForm(p => ({...p, rate: e.target.value}))} className="h-12 text-lg" data-testid="coll-rate" placeholder="0" required /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5"><Label className="text-xs">{t('Fat %', 'फैट %')}</Label><Input type="number" step="0.1" value={collForm.fat} onChange={(e) => setCollForm(p => ({...p, fat: e.target.value}))} className="h-10" data-testid="coll-fat" placeholder="0" /></div>
                            <div className="space-y-1.5"><Label className="text-xs">{t('SNF %', 'एसएनएफ %')}</Label><Input type="number" step="0.1" value={collForm.snf} onChange={(e) => setCollForm(p => ({...p, snf: e.target.value}))} className="h-10" data-testid="coll-snf" placeholder="0" /></div>
                        </div>
                        {collForm.quantity && collForm.rate && <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-center"><span className="text-sm text-emerald-600">{t('Total', 'कुल')}:</span><span className="text-xl font-bold text-emerald-700 ml-2">{formatCurrency(parseFloat(collForm.quantity || 0) * parseFloat(collForm.rate || 0))}</span></div>}
                        <Button type="submit" data-testid="submit-collection" className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-base" disabled={submitting}>{submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('Add Entry', 'प्रविष्टि जोड़ें')}</Button>
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
                            <div className="space-y-1.5"><Label className="text-xs">{t('Date', 'तारीख')}</Label><Input type="date" value={saleForm.date} onChange={(e) => setSaleForm(p => ({...p, date: e.target.value}))} className="h-10" data-testid="sale-entry-date" /></div>
                            <div className="space-y-1.5"><Label className="text-xs">{t('Product', 'उत्पाद')}</Label>
                                <Select value={saleForm.product} onValueChange={(v) => setSaleForm(p => ({...p, product: v}))}>
                                    <SelectTrigger className="h-10" data-testid="sale-entry-product"><SelectValue /></SelectTrigger>
                                    <SelectContent>{productOptions.map(p => <SelectItem key={p.value} value={p.value}>{p.label[language]}</SelectItem>)}</SelectContent>
                                </Select></div>
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setSaleForm(p => ({...p, mode: 'direct', quantity: '', rate: ''}))} data-testid="sale-entry-mode-direct"
                                className={cn("flex-1 py-2 rounded-lg border text-xs font-semibold", saleForm.mode === 'direct' ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-500")}>{t('Direct Amount', 'सीधी राशि')}</button>
                            <button type="button" onClick={() => setSaleForm(p => ({...p, mode: 'qtyrate', direct_amount: ''}))} data-testid="sale-entry-mode-qtyrate"
                                className={cn("flex-1 py-2 rounded-lg border text-xs font-semibold", saleForm.mode === 'qtyrate' ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-500")}>{t('Qty x Rate', 'मात्रा x दर')}</button>
                        </div>
                        {saleForm.mode === 'direct' ? (
                            <div className="space-y-1.5"><Label className="text-xs">{t('Amount', 'राशि')} *</Label><Input type="number" step="0.5" value={saleForm.direct_amount} onChange={(e) => setSaleForm(p => ({...p, direct_amount: e.target.value}))} className="h-14 text-2xl text-center font-bold" data-testid="sale-entry-amount" placeholder="0" /></div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5"><Label className="text-xs">{t('Quantity', 'मात्रा')} *</Label><Input type="number" step="0.1" value={saleForm.quantity} onChange={(e) => setSaleForm(p => ({...p, quantity: e.target.value}))} className="h-12 text-lg" data-testid="sale-entry-quantity" /></div>
                                <div className="space-y-1.5"><Label className="text-xs">{t('Rate', 'दर')} *</Label><Input type="number" step="0.5" value={saleForm.rate} onChange={(e) => setSaleForm(p => ({...p, rate: e.target.value}))} className="h-12 text-lg" data-testid="sale-entry-rate" /></div>
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <Label className="text-xs flex items-center gap-1"><Copy className="w-3 h-3" />{t('Repeat for how many days?', 'कितने दिन के लिए दोहराएं?')}</Label>
                            <div className="flex items-center gap-2">
                                <Input type="number" min="1" max="31" value={saleForm.repeatDays} onChange={(e) => setSaleForm(p => ({...p, repeatDays: e.target.value}))} className="h-10 w-20 text-center" data-testid="sale-entry-repeat-days" />
                                <span className="text-xs text-zinc-500">{parseInt(saleForm.repeatDays) > 1 ? t(`Will add ${saleForm.repeatDays} entries`, `${saleForm.repeatDays} प्रविष्टि जोड़ेगा`) : t('Single day', 'एक दिन')}</span>
                            </div>
                        </div>
                        {((saleForm.mode === 'direct' && saleForm.direct_amount) || (saleForm.mode === 'qtyrate' && saleForm.quantity && saleForm.rate)) && (
                            <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-center"><span className="text-sm text-emerald-600">{t('Total', 'कुल')}:</span><span className="text-xl font-bold text-emerald-700 ml-2">
                                {formatCurrency((saleForm.mode === 'direct' ? parseFloat(saleForm.direct_amount || 0) : (parseFloat(saleForm.quantity || 0) * parseFloat(saleForm.rate || 0))) * Math.max(1, parseInt(saleForm.repeatDays) || 1))}
                                {parseInt(saleForm.repeatDays) > 1 && <span className="text-xs font-normal text-emerald-500 ml-1">({saleForm.repeatDays} {t('days', 'दिन')})</span>}</span></div>
                        )}
                        <Button type="submit" data-testid="submit-sale-entry" className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-base" disabled={submitting}>
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : parseInt(saleForm.repeatDays) > 1 ? t(`Add ${saleForm.repeatDays} Entries`, `${saleForm.repeatDays} प्रविष्टि जोड़ें`) : t('Add Entry', 'प्रविष्टि जोड़ें')}</Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Entry Dialog */}
            <Dialog open={showEditEntry} onOpenChange={setShowEditEntry}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Pencil className="w-5 h-5 text-blue-600" />{t('Edit Entry', 'प्रविष्टि संपादित करें')}</DialogTitle>
                    </DialogHeader>
                    {editEntry && (
                        <form onSubmit={handleUpdateEntry} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5"><Label className="text-xs">{t('Date', 'तारीख')}</Label><Input type="date" value={editEntry.date} onChange={(e) => setEditEntry(p => ({...p, date: e.target.value}))} className="h-10" /></div>
                                {editEntry._type === 'collection' ? (
                                    <div className="space-y-1.5"><Label className="text-xs">{t('Shift', 'शिफ्ट')}</Label>
                                        <Select value={editEntry.shift} onValueChange={(v) => setEditEntry(p => ({...p, shift: v}))}>
                                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                            <SelectContent><SelectItem value="morning">{t('Morning', 'सुबह')}</SelectItem><SelectItem value="evening">{t('Evening', 'शाम')}</SelectItem></SelectContent>
                                        </Select></div>
                                ) : (
                                    <div className="space-y-1.5"><Label className="text-xs">{t('Product', 'उत्पाद')}</Label>
                                        <Select value={editEntry.product} onValueChange={(v) => setEditEntry(p => ({...p, product: v}))}>
                                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                            <SelectContent>{productOptions.map(p => <SelectItem key={p.value} value={p.value}>{p.label[language]}</SelectItem>)}</SelectContent>
                                        </Select></div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5"><Label className="text-xs">{editEntry._type === 'collection' ? t('Quantity (L)', 'मात्रा (L)') : t('Quantity', 'मात्रा')}</Label><Input type="number" step="0.1" value={editEntry.quantity} onChange={(e) => setEditEntry(p => ({...p, quantity: e.target.value}))} className="h-12 text-lg" /></div>
                                <div className="space-y-1.5"><Label className="text-xs">{t('Rate', 'दर')}</Label><Input type="number" step="0.5" value={editEntry.rate} onChange={(e) => setEditEntry(p => ({...p, rate: e.target.value}))} className="h-12 text-lg" /></div>
                            </div>
                            {editEntry._type === 'collection' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5"><Label className="text-xs">{t('Fat %', 'फैट %')}</Label><Input type="number" step="0.1" value={editEntry.fat} onChange={(e) => setEditEntry(p => ({...p, fat: e.target.value}))} className="h-10" /></div>
                                    <div className="space-y-1.5"><Label className="text-xs">{t('SNF %', 'एसएनएफ %')}</Label><Input type="number" step="0.1" value={editEntry.snf} onChange={(e) => setEditEntry(p => ({...p, snf: e.target.value}))} className="h-10" /></div>
                                </div>
                            )}
                            <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-base" disabled={submitting} data-testid="submit-edit-entry">
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('Update Entry', 'प्रविष्टि अपडेट करें')}</Button>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Holiday Dialog */}
            <Dialog open={showHolidayDialog} onOpenChange={setShowHolidayDialog}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><CalendarOff className="w-5 h-5 text-amber-600" />{t('Mark Holidays', 'छुट्टी चिह्नित करें')}</DialogTitle>
                        <DialogDescription>{t('Mark days with no delivery', 'बिना डिलीवरी वाले दिन चिह्नित करें')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <Input type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} className="h-10 flex-1" data-testid="holiday-date-input" />
                            <Button onClick={addHoliday} size="sm" className="h-10 bg-amber-600 hover:bg-amber-700" data-testid="add-holiday-btn"><Plus className="w-4 h-4" /></Button>
                        </div>
                        {holidays.length > 0 && (
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                {holidays.map(h => (
                                    <div key={h} className="flex items-center justify-between px-3 py-1.5 bg-amber-50 rounded-lg text-xs">
                                        <span className="font-medium">{h}</span>
                                        <button type="button" onClick={() => removeHoliday(h)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {holidays.length === 0 && <p className="text-xs text-zinc-400 text-center py-2">{t('No holidays marked', 'कोई छुट्टी चिह्नित नहीं')}</p>}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const FarmerBillTable = ({ data, t, onDelete, onEdit, deleting }) => {
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
                    <th className="py-1 px-1 no-print" style={{width: '50px'}}></th>
                </tr></thead>
                <tbody>{data.collections.map((c, idx) => (
                    <tr key={c.id || idx} className={idx % 2 === 0 ? "bg-white" : "bg-zinc-50/60"}>
                        <td className="py-1 px-1.5 sm:px-2">{c.date}</td>
                        <td className="py-1 px-1.5 sm:px-2 capitalize">{c.shift === 'morning' ? t('AM', 'सुबह') : t('PM', 'शाम')}</td>
                        <td className="py-1 px-1.5 sm:px-2 capitalize">{c.milk_type || 'cow'}</td>
                        <td className="py-1 px-1.5 sm:px-2 text-right font-medium">{c.quantity}</td>
                        <td className="py-1 px-1.5 sm:px-2 text-right">{c.fat}</td>
                        <td className="py-1 px-1.5 sm:px-2 text-right">{formatCurrency(c.rate)}</td>
                        <td className="py-1 px-1.5 sm:px-2 text-right font-semibold text-emerald-700">{formatCurrency(c.amount)}</td>
                        <td className="py-1 px-1 text-center no-print">
                            <div className="flex gap-0.5 justify-center">
                                <button type="button" onClick={() => onEdit(c)} className="p-0.5 rounded hover:bg-blue-50 text-zinc-400 hover:text-blue-500"><Pencil className="w-3 h-3" /></button>
                                <button type="button" data-testid={`delete-collection-${c.id}`} onClick={() => onDelete(c.id)} disabled={deleting === c.id}
                                    className="p-0.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 disabled:opacity-50">
                                    {deleting === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}</button>
                            </div>
                        </td>
                    </tr>
                ))}</tbody>
            </table>
        </div>
    );
};

const CustomerBillTable = ({ data, t, onDelete, onEdit, deleting, holidays = [] }) => {
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
                    <th className="py-1 px-1 no-print" style={{width: '50px'}}></th>
                </tr></thead>
                <tbody>{data.sales.map((s, idx) => {
                    const isHoliday = holidays.includes(s.date);
                    return (
                        <tr key={s.id || idx} className={cn(idx % 2 === 0 ? "bg-white" : "bg-zinc-50/60", isHoliday && "bg-amber-50")}>
                            <td className="py-1 px-1.5 sm:px-2">{s.date} {isHoliday && <span className="text-[8px] text-amber-600 font-bold border border-amber-400 px-1 rounded">{t('Holiday', 'छुट्टी')}</span>}</td>
                            <td className="py-1 px-1.5 sm:px-2 capitalize">{s.product}</td>
                            <td className="py-1 px-1.5 sm:px-2 text-right font-medium">{s.quantity > 0 ? s.quantity : '-'}</td>
                            <td className="py-1 px-1.5 sm:px-2 text-right">{s.rate > 0 ? formatCurrency(s.rate) : '-'}</td>
                            <td className="py-1 px-1.5 sm:px-2 text-right font-semibold text-emerald-700">{formatCurrency(s.amount)}</td>
                            <td className="py-1 px-1 text-center no-print">
                                <div className="flex gap-0.5 justify-center">
                                    <button type="button" onClick={() => onEdit(s)} className="p-0.5 rounded hover:bg-blue-50 text-zinc-400 hover:text-blue-500"><Pencil className="w-3 h-3" /></button>
                                    <button type="button" data-testid={`delete-sale-${s.id}`} onClick={() => onDelete(s.id)} disabled={deleting === s.id}
                                        className="p-0.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 disabled:opacity-50">
                                        {deleting === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}</button>
                                </div>
                            </td>
                        </tr>
                    );
                })}</tbody>
            </table>
        </div>
    );
};

export default BillingPage;
