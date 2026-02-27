import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '../components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
    Package, Plus, Search, Loader2, Phone, Truck, CheckCircle, XCircle,
    Clock, Trash2, Building2, ChefHat, Store, Users, IndianRupee
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '../lib/utils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const customerTypes = [
    { value: 'hotel', label: { en: 'Hotel', hi: 'होटल' }, icon: Building2 },
    { value: 'caterer', label: { en: 'Caterer', hi: 'केटरर' }, icon: ChefHat },
    { value: 'halwai', label: { en: 'Halwai', hi: 'हलवाई' }, icon: Store },
    { value: 'other', label: { en: 'Other', hi: 'अन्य' }, icon: Users },
];

const productOptions = [
    { value: 'milk', label: { en: 'Milk', hi: 'दूध' } },
    { value: 'paneer', label: { en: 'Paneer', hi: 'पनीर' } },
    { value: 'dahi', label: { en: 'Dahi', hi: 'दही' } },
    { value: 'ghee', label: { en: 'Ghee', hi: 'घी' } },
    { value: 'cream', label: { en: 'Cream', hi: 'क्रीम' } },
    { value: 'buttermilk', label: { en: 'Buttermilk', hi: 'छाछ' } },
    { value: 'other', label: { en: 'Other', hi: 'अन्य' } },
];

const statusConfig = {
    pending: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock, label: { en: 'Pending', hi: 'लंबित' } },
    delivered: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle, label: { en: 'Delivered', hi: 'डिलीवर' } },
    cancelled: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, label: { en: 'Cancelled', hi: 'रद्द' } },
};

const BulkOrdersPage = () => {
    const { language } = useAuth();
    const t = (en, hi) => language === 'hi' ? hi : en;

    const [orders, setOrders] = useState([]);
    const [savedCustomers, setSavedCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showAddOrder, setShowAddOrder] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [customerSearch, setCustomerSearch] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [amountMode, setAmountMode] = useState('direct');

    const [form, setForm] = useState({
        customer_name: '', customer_phone: '', customer_type: 'hotel',
        product: 'milk', quantity: '', rate: '', direct_amount: '',
        delivery_address: '', notes: '', is_recurring: false
    });

    const token = localStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ordersRes, custRes] = await Promise.all([
                axios.get(`${BACKEND_URL}/api/bulk-orders`, { headers }),
                axios.get(`${BACKEND_URL}/api/bulk-order-customers`, { headers }),
            ]);
            setOrders(ordersRes.data);
            setSavedCustomers(custRes.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.customer_name || !form.customer_phone) {
            toast.error(t('Name and phone required', 'नाम और फ़ोन आवश्यक')); return;
        }
        if (amountMode === 'direct' && !form.direct_amount) {
            toast.error(t('Enter amount', 'राशि दर्ज करें')); return;
        }
        if (amountMode === 'qtyrate' && (!form.quantity || !form.rate)) {
            toast.error(t('Enter quantity and rate', 'मात्रा और दर दर्ज करें')); return;
        }
        setSubmitting(true);
        try {
            await axios.post(`${BACKEND_URL}/api/bulk-orders`, {
                ...form,
                quantity: form.quantity ? parseFloat(form.quantity) : 0,
                rate: form.rate ? parseFloat(form.rate) : 0,
                direct_amount: form.direct_amount ? parseFloat(form.direct_amount) : null,
            }, { headers });
            setForm({ customer_name: '', customer_phone: '', customer_type: 'hotel', product: 'milk', quantity: '', rate: '', direct_amount: '', delivery_address: '', notes: '', is_recurring: false });
            setShowAddOrder(false);
            setAmountMode('direct');
            toast.success(t('Bulk order created!', 'बल्क ऑर्डर बनाया गया!'));
            fetchData();
        } catch (e) { toast.error('Error'); }
        finally { setSubmitting(false); }
    };

    const updateStatus = async (orderId, newStatus) => {
        try {
            await axios.put(`${BACKEND_URL}/api/bulk-orders/${orderId}`, { status: newStatus }, { headers });
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            toast.success(t('Status updated', 'स्थिति अपडेट'));
        } catch (e) { toast.error('Error'); }
    };

    const deleteOrder = async (orderId) => {
        if (!window.confirm(t('Delete this order?', 'क्या आप यह ऑर्डर हटाना चाहते हैं?'))) return;
        try {
            await axios.delete(`${BACKEND_URL}/api/bulk-orders/${orderId}`, { headers });
            setOrders(prev => prev.filter(o => o.id !== orderId));
            toast.success(t('Order deleted', 'ऑर्डर हटाया गया'));
        } catch (e) { toast.error('Error'); }
    };

    const selectCustomer = (cust) => {
        setForm(p => ({ ...p, customer_name: cust.name, customer_phone: cust.phone, customer_type: cust.customer_type }));
        setCustomerSearch('');
        setShowCustomerDropdown(false);
    };

    const filteredOrders = orders.filter(o => {
        const matchSearch = !searchTerm || o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || o.customer_phone?.includes(searchTerm);
        const matchStatus = filterStatus === 'all' || o.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const filteredSavedCustomers = savedCustomers.filter(c =>
        c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone?.includes(customerSearch)
    );

    const todayOrders = orders.filter(o => o.date === new Date().toISOString().split('T')[0]);
    const pendingOrders = orders.filter(o => o.status === 'pending');
    const todayAmount = todayOrders.reduce((s, o) => s + (o.amount || 0), 0);
    const pendingAmount = pendingOrders.reduce((s, o) => s + (o.amount || 0), 0);

    if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

    return (
        <div className="p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-3">
                <div>
                    <h1 className="font-heading text-lg sm:text-xl md:text-2xl font-bold text-zinc-900">{t('Bulk Orders', 'बल्क ऑर्डर')}</h1>
                    <p className="text-xs text-muted-foreground">{t('Orders for Hotels, Caterers, Halwai', 'होटल, केटरर, हलवाई के ऑर्डर')}</p>
                </div>
                <Button onClick={() => setShowAddOrder(true)} data-testid="add-bulk-order-btn"
                    className="bg-emerald-700 hover:bg-emerald-800 h-9 text-xs sm:text-sm w-fit">
                    <Plus className="w-4 h-4 mr-1" />{t('New Order', 'नया ऑर्डर')}
                </Button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-3">
                        <p className="text-[10px] sm:text-xs text-blue-600 font-semibold">{t('Total Orders', 'कुल ऑर्डर')}</p>
                        <p className="text-lg sm:text-xl font-bold text-blue-700">{orders.length}</p>
                    </CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="p-3">
                        <p className="text-[10px] sm:text-xs text-amber-600 font-semibold">{t('Pending', 'लंबित')}</p>
                        <p className="text-lg sm:text-xl font-bold text-amber-700">{pendingOrders.length}</p>
                    </CardContent>
                </Card>
                <Card className="bg-emerald-50 border-emerald-200">
                    <CardContent className="p-3">
                        <p className="text-[10px] sm:text-xs text-emerald-600 font-semibold">{t("Today's Sales", 'आज की बिक्री')}</p>
                        <p className="text-lg sm:text-xl font-bold text-emerald-700">{formatCurrency(todayAmount)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-3">
                        <p className="text-[10px] sm:text-xs text-red-600 font-semibold">{t('Pending Amount', 'बकाया राशि')}</p>
                        <p className="text-lg sm:text-xl font-bold text-red-700">{formatCurrency(pendingAmount)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input placeholder={t('Search by name or phone...', 'नाम या फ़ोन से खोजें...')}
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-10" data-testid="order-search" />
                </div>
                <div className="flex gap-1">
                    {['all', 'pending', 'delivered', 'cancelled'].map(s => (
                        <Button key={s} variant={filterStatus === s ? "default" : "outline"} size="sm"
                            onClick={() => setFilterStatus(s)} data-testid={`filter-${s}`}
                            className={cn("h-10 text-xs", filterStatus === s && "bg-emerald-700")}>
                            {s === 'all' ? t('All', 'सभी') : statusConfig[s]?.label?.[language] || s}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                    <Package className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                    <p className="text-zinc-500 text-sm">{t('No orders found', 'कोई ऑर्डर नहीं')}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredOrders.map(order => {
                        const st = statusConfig[order.status] || statusConfig.pending;
                        const ct = customerTypes.find(c => c.value === order.customer_type);
                        const CtIcon = ct?.icon || Users;
                        return (
                            <Card key={order.id} data-testid={`order-${order.id}`} className="hover:shadow-sm transition-shadow">
                                <CardContent className="p-3 sm:p-4">
                                    <div className="flex items-start gap-3">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                            order.customer_type === 'hotel' ? "bg-blue-100 text-blue-600" :
                                            order.customer_type === 'caterer' ? "bg-purple-100 text-purple-600" :
                                            order.customer_type === 'halwai' ? "bg-amber-100 text-amber-600" :
                                            "bg-zinc-100 text-zinc-600")}>
                                            <CtIcon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-semibold text-sm text-zinc-900 truncate">{order.customer_name}</p>
                                                <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase border", st.color)}>
                                                    {st.label?.[language] || order.status}
                                                </span>
                                                <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-[10px] text-zinc-600 capitalize">
                                                    {ct?.label?.[language] || order.customer_type}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                                                <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{order.customer_phone}</span>
                                                <span className="capitalize">{order.product}{order.quantity > 0 ? ` - ${order.quantity} ${order.product === 'milk' ? 'L' : t('units', 'इकाई')}` : ''}</span>
                                                <span>{order.date}</span>
                                            </div>
                                            {order.notes && <p className="text-[10px] text-zinc-400 mt-1">{order.notes}</p>}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-base font-bold text-emerald-700">{formatCurrency(order.amount)}</p>
                                            <div className="flex gap-1 mt-1 justify-end">
                                                {order.status === 'pending' && (
                                                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-emerald-600" data-testid={`deliver-${order.id}`}
                                                        onClick={() => updateStatus(order.id, 'delivered')}>
                                                        <CheckCircle className="w-3 h-3 mr-0.5" />{t('Deliver', 'डिलीवर')}
                                                    </Button>
                                                )}
                                                <Button size="sm" variant="ghost" className="h-6 px-1.5" data-testid={`delete-order-${order.id}`}
                                                    onClick={() => deleteOrder(order.id)}>
                                                    <Trash2 className="w-3 h-3 text-zinc-400 hover:text-red-500" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Add Order Dialog */}
            <Dialog open={showAddOrder} onOpenChange={setShowAddOrder}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-emerald-600" />{t('New Bulk Order', 'नया बल्क ऑर्डर')}
                        </DialogTitle>
                        <DialogDescription>{t('For Hotels, Caterers, Halwai', 'होटल, केटरर, हलवाई के लिए')}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Customer Search */}
                        <div className="space-y-2 relative">
                            <Label>{t('Customer Search', 'ग्राहक खोजें')}</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <Input value={customerSearch}
                                    onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                                    onFocus={() => setShowCustomerDropdown(true)}
                                    placeholder={t('Search saved customers...', 'पुराने ग्राहक खोजें...')}
                                    className="h-10 pl-10 text-sm" data-testid="customer-search-input" />
                            </div>
                            {showCustomerDropdown && customerSearch && filteredSavedCustomers.length > 0 && (
                                <div className="absolute z-10 w-full bg-white border rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                                    {filteredSavedCustomers.map((c, i) => (
                                        <button key={i} type="button" onClick={() => selectCustomer(c)}
                                            className="w-full flex items-center gap-2 p-2.5 hover:bg-zinc-50 text-left border-b last:border-0" data-testid={`saved-customer-${i}`}>
                                            <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center text-xs font-bold text-emerald-700">
                                                {c.name?.charAt(0)?.toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold truncate">{c.name}</p>
                                                <p className="text-[10px] text-zinc-500">{c.phone} | {c.customer_type} | {c.total_orders} orders</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Customer Details */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs">{t('Name', 'नाम')} *</Label>
                                <Input value={form.customer_name} onChange={(e) => setForm(p => ({...p, customer_name: e.target.value}))}
                                    data-testid="bulk-customer-name" placeholder={t('Customer name', 'ग्राहक नाम')} className="h-10" required />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">{t('Phone', 'फ़ोन')} *</Label>
                                <Input type="tel" value={form.customer_phone} onChange={(e) => setForm(p => ({...p, customer_phone: e.target.value}))}
                                    data-testid="bulk-customer-phone" placeholder="9876543210" className="h-10" required />
                            </div>
                        </div>

                        {/* Customer Type */}
                        <div className="space-y-1.5">
                            <Label className="text-xs">{t('Customer Type', 'ग्राहक प्रकार')}</Label>
                            <div className="grid grid-cols-4 gap-2">
                                {customerTypes.map(ct => (
                                    <button key={ct.value} type="button" onClick={() => setForm(p => ({...p, customer_type: ct.value}))}
                                        data-testid={`type-${ct.value}`}
                                        className={cn("py-2 rounded-xl border-2 text-[11px] font-semibold transition-all flex flex-col items-center gap-1",
                                            form.customer_type === ct.value ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-500")}>
                                        <ct.icon className="w-4 h-4" />
                                        {ct.label[language]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Product */}
                        <div className="space-y-1.5">
                            <Label className="text-xs">{t('Product', 'उत्पाद')}</Label>
                            <Select value={form.product} onValueChange={(v) => setForm(p => ({...p, product: v}))}>
                                <SelectTrigger className="h-10" data-testid="bulk-product"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {productOptions.map(p => <SelectItem key={p.value} value={p.value}>{p.label[language]}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Amount Mode Toggle */}
                        <div className="flex gap-2">
                            <button type="button" data-testid="bulk-mode-direct"
                                onClick={() => { setAmountMode('direct'); setForm(p => ({...p, quantity: '', rate: ''})); }}
                                className={cn("flex-1 py-2 rounded-lg border text-xs font-semibold transition-all",
                                    amountMode === 'direct' ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-500")}>
                                {t('Direct Amount', 'सीधी राशि')}
                            </button>
                            <button type="button" data-testid="bulk-mode-qtyrate"
                                onClick={() => { setAmountMode('qtyrate'); setForm(p => ({...p, direct_amount: ''})); }}
                                className={cn("flex-1 py-2 rounded-lg border text-xs font-semibold transition-all",
                                    amountMode === 'qtyrate' ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-500")}>
                                {t('Qty × Rate', 'मात्रा × दर')}
                            </button>
                        </div>

                        {amountMode === 'direct' ? (
                            <div className="space-y-1.5">
                                <Label className="text-xs">{t('Amount (₹)', 'राशि (₹)')} *</Label>
                                <Input type="number" step="0.5" value={form.direct_amount}
                                    onChange={(e) => setForm(p => ({...p, direct_amount: e.target.value}))}
                                    className="h-14 text-2xl text-center font-bold" data-testid="bulk-direct-amount" placeholder="₹ 0" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">{t('Quantity', 'मात्रा')} *</Label>
                                    <Input type="number" step="0.1" value={form.quantity}
                                        onChange={(e) => setForm(p => ({...p, quantity: e.target.value}))}
                                        className="h-12 text-lg" data-testid="bulk-quantity" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">{t('Rate (₹)', 'दर (₹)')} *</Label>
                                    <Input type="number" step="0.5" value={form.rate}
                                        onChange={(e) => setForm(p => ({...p, rate: e.target.value}))}
                                        className="h-12 text-lg" data-testid="bulk-rate" />
                                </div>
                            </div>
                        )}

                        {/* Total Preview */}
                        {((amountMode === 'direct' && form.direct_amount) || (amountMode === 'qtyrate' && form.quantity && form.rate)) && (
                            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                                <span className="text-sm text-emerald-600">{t('Total', 'कुल')}:</span>
                                <span className="text-xl font-bold text-emerald-700 ml-2">
                                    ₹{amountMode === 'direct'
                                        ? parseFloat(form.direct_amount || 0).toFixed(2)
                                        : (parseFloat(form.quantity || 0) * parseFloat(form.rate || 0)).toFixed(2)}
                                </span>
                            </div>
                        )}

                        {/* Notes */}
                        <div className="space-y-1.5">
                            <Label className="text-xs">{t('Notes (optional)', 'नोट (वैकल्पिक)')}</Label>
                            <Input value={form.notes} onChange={(e) => setForm(p => ({...p, notes: e.target.value}))}
                                placeholder={t('Delivery instructions...', 'डिलीवरी निर्देश...')} className="h-10" data-testid="bulk-notes" />
                        </div>

                        <Button type="submit" data-testid="submit-bulk-order"
                            className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-base" disabled={submitting}>
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('Create Order', 'ऑर्डर बनाएं')}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BulkOrdersPage;
