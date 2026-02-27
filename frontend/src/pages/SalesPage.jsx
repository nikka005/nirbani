import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getInitials } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '../components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
    ShoppingBag, Plus, Search, Users, Package, Loader2, Phone, Store, User,
    ChevronRight, Milk, CreditCard, Wallet, ArrowDownCircle, ArrowUpCircle,
    IndianRupee, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '../lib/utils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const SalesPage = () => {
    const { language } = useAuth();
    const navigate = useNavigate();
    const t = (en, hi) => language === 'hi' ? hi : en;

    const [activeTab, setActiveTab] = useState('shop');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [todaySales, setTodaySales] = useState([]);
    const [walkinCustomers, setWalkinCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddCustomer, setShowAddCustomer] = useState(false);
    const [showAddSale, setShowAddSale] = useState(false);
    const [showShopSale, setShowShopSale] = useState(false);
    const [showAddWalkin, setShowAddWalkin] = useState(false);
    const [showUdharPayment, setShowUdharPayment] = useState(false);
    const [showUdharLedger, setShowUdharLedger] = useState(false);
    const [selectedWalkin, setSelectedWalkin] = useState(null);
    const [walkinDetail, setWalkinDetail] = useState(null);

    const [customerForm, setCustomerForm] = useState({ name: '', phone: '', address: '', customer_type: 'retail', gst_number: '' });
    const [saleForm, setSaleForm] = useState({ customer_id: '', product: 'milk', quantity: '', rate: '' });
    const [shopForm, setShopForm] = useState({ customer_name: '', product: 'milk', quantity: '', rate: '', is_udhar: false, walkin_customer_id: '' });
    const [walkinForm, setWalkinForm] = useState({ name: '', phone: '' });
    const [paymentAmount, setPaymentAmount] = useState('');

    const token = localStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };

    const productOptions = [
        { value: 'milk', label: t('Milk', 'दूध'), icon: '🥛' },
        { value: 'paneer', label: t('Paneer', 'पनीर'), icon: '🧀' },
        { value: 'dahi', label: t('Dahi', 'दही'), icon: '🥣' },
        { value: 'ghee', label: t('Ghee', 'घी'), icon: '🫕' },
        { value: 'lassi', label: t('Lassi', 'लस्सी'), icon: '🥤' },
        { value: 'buttermilk', label: t('Buttermilk', 'छाछ'), icon: '🥛' },
        { value: 'cream', label: t('Cream', 'क्रीम'), icon: '🍶' },
        { value: 'other', label: t('Other', 'अन्य'), icon: '📦' },
    ];

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [custRes, salesRes, walkinRes] = await Promise.all([
                axios.get(`${BACKEND_URL}/api/customers`, { headers }),
                axios.get(`${BACKEND_URL}/api/sales/today`, { headers }),
                axios.get(`${BACKEND_URL}/api/walkin-customers`, { headers }),
            ]);
            setCustomers(custRes.data);
            setTodaySales(salesRes.data?.sales || []);
            setWalkinCustomers(walkinRes.data);
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const handleAddCustomer = async (e) => {
        e.preventDefault();
        if (!customerForm.name) { toast.error(t('Name required', 'नाम आवश्यक')); return; }
        setSubmitting(true);
        try {
            await axios.post(`${BACKEND_URL}/api/customers`, customerForm, { headers });
            setCustomerForm({ name: '', phone: '', address: '', customer_type: 'retail', gst_number: '' });
            setShowAddCustomer(false);
            toast.success(t('Customer added!', 'ग्राहक जोड़ा गया!'));
            fetchData();
        } catch (error) { toast.error('Error'); }
        finally { setSubmitting(false); }
    };

    const handleAddSale = async (e) => {
        e.preventDefault();
        if (!saleForm.customer_id || !saleForm.quantity || !saleForm.rate) {
            toast.error(t('Fill all fields', 'सभी फ़ील्ड भरें')); return;
        }
        setSubmitting(true);
        try {
            await axios.post(`${BACKEND_URL}/api/sales`, {
                customer_id: saleForm.customer_id, product: saleForm.product,
                quantity: parseFloat(saleForm.quantity), rate: parseFloat(saleForm.rate),
            }, { headers });
            setSaleForm({ customer_id: '', product: 'milk', quantity: '', rate: '' });
            setShowAddSale(false);
            toast.success(t('Sale recorded!', 'बिक्री दर्ज हुई!'));
            fetchData();
        } catch (error) { toast.error('Error'); }
        finally { setSubmitting(false); }
    };

    const handleShopSale = async (e) => {
        e.preventDefault();
        if (!shopForm.quantity || !shopForm.rate) {
            toast.error(t('Fill quantity and rate', 'मात्रा और दर भरें')); return;
        }
        if (shopForm.is_udhar && !shopForm.walkin_customer_id) {
            toast.error(t('Select customer for Udhar', 'उधार के लिए ग्राहक चुनें')); return;
        }
        setSubmitting(true);
        try {
            await axios.post(`${BACKEND_URL}/api/sales/shop`, {
                customer_name: shopForm.customer_name || 'Walk-in',
                product: shopForm.product,
                quantity: parseFloat(shopForm.quantity),
                rate: parseFloat(shopForm.rate),
                is_udhar: shopForm.is_udhar,
                walkin_customer_id: shopForm.walkin_customer_id || null,
            }, { headers });
            setShopForm({ customer_name: '', product: 'milk', quantity: '', rate: '', is_udhar: false, walkin_customer_id: '' });
            setShowShopSale(false);
            toast.success(shopForm.is_udhar ? t('Udhar recorded!', 'उधार दर्ज हुआ!') : t('Shop sale recorded!', 'दुकान बिक्री दर्ज हुई!'));
            fetchData();
        } catch (error) { toast.error('Error'); }
        finally { setSubmitting(false); }
    };

    const handleAddWalkin = async (e) => {
        e.preventDefault();
        if (!walkinForm.name || !walkinForm.phone) {
            toast.error(t('Name and phone required', 'नाम और फ़ोन आवश्यक')); return;
        }
        setSubmitting(true);
        try {
            const res = await axios.post(`${BACKEND_URL}/api/walkin-customers`, walkinForm, { headers });
            setWalkinForm({ name: '', phone: '' });
            setShowAddWalkin(false);
            toast.success(t('Customer added!', 'ग्राहक जोड़ा गया!'));
            // Auto-select new customer for udhar
            setShopForm(p => ({ ...p, walkin_customer_id: res.data.id, customer_name: res.data.name }));
            fetchData();
        } catch (error) { toast.error(error.response?.data?.detail || 'Error'); }
        finally { setSubmitting(false); }
    };

    const handleUdharPayment = async () => {
        if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
            toast.error(t('Enter valid amount', 'सही राशि दर्ज करें')); return;
        }
        setSubmitting(true);
        try {
            await axios.post(`${BACKEND_URL}/api/udhar-payments`, {
                walkin_customer_id: selectedWalkin.id,
                amount: parseFloat(paymentAmount),
            }, { headers });
            setPaymentAmount('');
            setShowUdharPayment(false);
            toast.success(t('Payment recorded!', 'भुगतान दर्ज हुआ!'));
            fetchData();
            // Refresh ledger if open
            if (showUdharLedger && selectedWalkin) {
                fetchWalkinDetail(selectedWalkin.id);
            }
        } catch (error) { toast.error('Error'); }
        finally { setSubmitting(false); }
    };

    const fetchWalkinDetail = async (customerId) => {
        try {
            const res = await axios.get(`${BACKEND_URL}/api/walkin-customers/${customerId}`, { headers });
            setWalkinDetail(res.data);
        } catch (e) { toast.error('Error loading ledger'); }
    };

    const openLedger = (wc) => {
        setSelectedWalkin(wc);
        setShowUdharLedger(true);
        fetchWalkinDetail(wc.id);
    };

    const handleQuickSale = (product) => {
        setShopForm({ customer_name: '', product: product.value, quantity: '', rate: '', is_udhar: false, walkin_customer_id: '' });
        setShowShopSale(true);
    };

    const shopSales = todaySales.filter(s => s.is_shop_sale);
    const totalShopAmount = shopSales.reduce((s, sale) => s + sale.amount, 0);
    const customerSales = todaySales.filter(s => !s.is_shop_sale);
    const totalCustomerAmount = customerSales.reduce((s, sale) => s + sale.amount, 0);
    const totalAllAmount = todaySales.reduce((s, sale) => s + sale.amount, 0);
    const totalUdhar = walkinCustomers.reduce((s, c) => s + (c.pending_amount || 0), 0);

    const productBreakdown = {};
    todaySales.forEach(sale => {
        if (!productBreakdown[sale.product]) productBreakdown[sale.product] = { qty: 0, amount: 0, count: 0 };
        productBreakdown[sale.product].qty += sale.quantity;
        productBreakdown[sale.product].amount += sale.amount;
        productBreakdown[sale.product].count += 1;
    });

    const filteredCustomers = customers.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone?.includes(searchTerm)
    );

    const udharCustomers = walkinCustomers.filter(c => (c.pending_amount || 0) > 0);

    if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

    return (
        <div className="p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-3">
                <div>
                    <h1 className="font-heading text-lg sm:text-xl md:text-2xl font-bold text-zinc-900">{t('Sales', 'बिक्री')}</h1>
                    <p className="text-xs text-muted-foreground">{t('Shop sales, Udhar & customer management', 'दुकान बिक्री, उधार और ग्राहक प्रबंधन')}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button onClick={() => setShowShopSale(true)} data-testid="shop-sale-btn"
                        className="bg-amber-600 hover:bg-amber-700 h-9 text-xs sm:text-sm">
                        <Milk className="w-4 h-4 mr-1" />{t('Shop Sale', 'दुकान बिक्री')}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddSale(true)} data-testid="add-sale-btn" className="h-9 text-xs sm:text-sm">
                        <Plus className="w-4 h-4 mr-1" />{t('Customer Sale', 'ग्राहक बिक्री')}
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="p-3">
                        <p className="text-[10px] sm:text-xs text-amber-600 font-semibold">{t('Shop Sales', 'दुकान बिक्री')}</p>
                        <p className="text-lg sm:text-xl font-bold text-amber-700" data-testid="shop-total">{formatCurrency(totalShopAmount)}</p>
                        <p className="text-[10px] text-amber-500">{shopSales.length} {t('sales', 'बिक्री')}</p>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-3">
                        <p className="text-[10px] sm:text-xs text-blue-600 font-semibold">{t('Customer Sales', 'ग्राहक बिक्री')}</p>
                        <p className="text-lg sm:text-xl font-bold text-blue-700">{formatCurrency(totalCustomerAmount)}</p>
                        <p className="text-[10px] text-blue-500">{customerSales.length} {t('sales', 'बिक्री')}</p>
                    </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-3">
                        <p className="text-[10px] sm:text-xs text-red-600 font-semibold">{t('Total Udhar', 'कुल उधार')}</p>
                        <p className="text-lg sm:text-xl font-bold text-red-700" data-testid="total-udhar">{formatCurrency(totalUdhar)}</p>
                        <p className="text-[10px] text-red-500">{udharCustomers.length} {t('customers', 'ग्राहक')}</p>
                    </CardContent>
                </Card>
                <Card className="bg-emerald-50 border-emerald-200">
                    <CardContent className="p-3">
                        <p className="text-[10px] sm:text-xs text-emerald-600 font-semibold">{t('Total', 'कुल')}</p>
                        <p className="text-lg sm:text-xl font-bold text-emerald-700" data-testid="total-sales">{formatCurrency(totalAllAmount)}</p>
                        <p className="text-[10px] text-emerald-500">{todaySales.length} {t('sales', 'बिक्री')}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Sale */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm sm:text-base font-heading flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-amber-600" />{t('Quick Sale', 'जल्दी बिक्री')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-4 gap-2">
                        {productOptions.map(p => (
                            <button key={p.value} onClick={() => handleQuickSale(p)} data-testid={`quick-sale-${p.value}`}
                                className="p-2 sm:p-3 rounded-xl border-2 border-zinc-200 hover:border-amber-400 hover:bg-amber-50 transition-all text-center">
                                <span className="text-lg sm:text-xl block">{p.icon}</span>
                                <span className="text-[10px] sm:text-xs font-semibold text-zinc-700 block mt-1">{p.label}</span>
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Product Breakdown */}
            {Object.keys(productBreakdown).length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm sm:text-base font-heading flex items-center gap-2">
                            <Package className="w-4 h-4 text-emerald-600" />{t("Today's Product Breakdown", 'आज उत्पाद विवरण')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {Object.entries(productBreakdown).map(([product, data]) => {
                                const pOpt = productOptions.find(p => p.value === product);
                                return (
                                    <div key={product} className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-zinc-50 border" data-testid={`breakdown-${product}`}>
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <span className="text-base sm:text-lg">{pOpt?.icon || '📦'}</span>
                                            <div>
                                                <p className="text-xs sm:text-sm font-semibold text-zinc-800 capitalize">{product}</p>
                                                <p className="text-[10px] sm:text-xs text-zinc-500">{data.count} {t('entries', 'प्रविष्टि')} | {data.qty} {product === 'milk' ? 'L' : t('units', 'इकाई')}</p>
                                            </div>
                                        </div>
                                        <span className="text-sm sm:text-base font-bold text-emerald-700">{formatCurrency(data.amount)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="shop" data-testid="shop-tab" className="text-xs sm:text-sm">
                        <Milk className="w-3 h-3 mr-1" />{t('Today', 'आज')} ({todaySales.length})
                    </TabsTrigger>
                    <TabsTrigger value="udhar" data-testid="udhar-tab" className="text-xs sm:text-sm">
                        <CreditCard className="w-3 h-3 mr-1" />{t('Udhar', 'उधार')} ({udharCustomers.length})
                    </TabsTrigger>
                    <TabsTrigger value="customers" data-testid="customers-tab" className="text-xs sm:text-sm">
                        <Users className="w-3 h-3 mr-1" />{t('Customers', 'ग्राहक')} ({customers.length})
                    </TabsTrigger>
                </TabsList>

                {/* Today Sales Tab */}
                <TabsContent value="shop" className="mt-4">
                    {todaySales.length === 0 ? (
                        <div className="text-center py-12">
                            <ShoppingBag className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                            <p className="text-zinc-500 text-sm">{t('No sales today', 'आज कोई बिक्री नहीं')}</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {todaySales.map(sale => {
                                const pOpt = productOptions.find(p => p.value === sale.product);
                                return (
                                    <div key={sale.id} data-testid={`sale-${sale.id}`}
                                        className="flex items-center justify-between p-3 rounded-xl border bg-white hover:shadow-sm transition-shadow">
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <span className="text-base sm:text-lg">{pOpt?.icon || '📦'}</span>
                                            <div>
                                                <p className="text-xs sm:text-sm font-semibold text-zinc-800">
                                                    {sale.customer_name || sale.product}
                                                    {sale.is_shop_sale && <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-bold">{t('SHOP', 'दुकान')}</span>}
                                                    {sale.is_udhar && <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-bold">{t('UDHAR', 'उधार')}</span>}
                                                </p>
                                                <p className="text-[10px] sm:text-xs text-zinc-500 capitalize">
                                                    {sale.product} | {sale.quantity} × ₹{sale.rate}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={cn("text-sm sm:text-base font-bold", sale.is_udhar ? "text-red-600" : "text-emerald-700")}>
                                            {formatCurrency(sale.amount)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* Udhar Tab */}
                <TabsContent value="udhar" className="mt-4">
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-xs text-zinc-500">{t('Customers with pending Udhar', 'बकाया उधार वाले ग्राहक')}</p>
                        <Button size="sm" variant="outline" onClick={() => setShowAddWalkin(true)} data-testid="add-walkin-btn" className="h-8 text-xs">
                            <Plus className="w-3 h-3 mr-1" />{t('Add Customer', 'ग्राहक जोड़ें')}
                        </Button>
                    </div>
                    {walkinCustomers.length === 0 ? (
                        <div className="text-center py-12">
                            <CreditCard className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                            <p className="text-zinc-500 text-sm">{t('No walk-in customers yet', 'कोई वॉक-इन ग्राहक नहीं')}</p>
                            <Button size="sm" variant="outline" onClick={() => setShowAddWalkin(true)} className="mt-3 text-xs">
                                <Plus className="w-3 h-3 mr-1" />{t('Add First Customer', 'पहला ग्राहक जोड़ें')}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {walkinCustomers.map(wc => (
                                <div key={wc.id} data-testid={`walkin-${wc.id}`}
                                    className="flex items-center gap-3 p-3 rounded-xl border bg-white hover:shadow-sm transition-shadow">
                                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0",
                                        (wc.pending_amount || 0) > 0 ? "bg-red-500" : "bg-emerald-500")}>
                                        {getInitials(wc.name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-zinc-800 truncate">{wc.name}</p>
                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                            <Phone className="w-3 h-3" /><span>{wc.phone}</span>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={cn("text-sm font-bold", (wc.pending_amount || 0) > 0 ? "text-red-600" : "text-emerald-600")}>
                                            {formatCurrency(wc.pending_amount || 0)}
                                        </p>
                                        <p className="text-[10px] text-zinc-400">{t('pending', 'बकाया')}</p>
                                    </div>
                                    <div className="flex flex-col gap-1 shrink-0">
                                        <Button size="sm" variant="outline" className="h-7 text-[10px] px-2" data-testid={`pay-udhar-${wc.id}`}
                                            onClick={() => { setSelectedWalkin(wc); setShowUdharPayment(true); }}>
                                            <IndianRupee className="w-3 h-3 mr-0.5" />{t('Pay', 'भुगतान')}
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2" data-testid={`ledger-${wc.id}`}
                                            onClick={() => openLedger(wc)}>
                                            {t('Ledger', 'खाता')}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Customers Tab */}
                <TabsContent value="customers" className="mt-4">
                    <div className="flex flex-col sm:flex-row gap-2 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <Input placeholder={t('Search customers...', 'ग्राहक खोजें...')} value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-10" data-testid="customer-search" />
                        </div>
                        <Button variant="outline" onClick={() => setShowAddCustomer(true)} data-testid="add-customer-btn" className="h-10 text-xs sm:text-sm">
                            <Plus className="w-4 h-4 mr-1" />{t('Add Customer', 'ग्राहक जोड़ें')}
                        </Button>
                    </div>
                    {filteredCustomers.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                            <p className="text-zinc-500 text-sm">{t('No customers', 'कोई ग्राहक नहीं')}</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredCustomers.map(c => (
                                <div key={c.id} data-testid={`customer-${c.id}`}
                                    onClick={() => navigate(`/customers/${c.id}`)}
                                    className="flex items-center gap-3 p-3 rounded-xl border bg-white hover:shadow-sm transition-shadow cursor-pointer">
                                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0",
                                        c.customer_type === 'wholesale' ? "bg-blue-600" : "bg-emerald-600")}>
                                        {getInitials(c.name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-zinc-800 truncate">{c.name}</p>
                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                            {c.phone && <><Phone className="w-3 h-3" /><span>{c.phone}</span></>}
                                            <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-[10px] capitalize">{c.customer_type}</span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Shop Sale Dialog */}
            <Dialog open={showShopSale} onOpenChange={setShowShopSale}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Milk className="w-5 h-5 text-amber-600" />{t('Shop Sale', 'दुकान बिक्री')}</DialogTitle>
                        <DialogDescription>{t('Quick counter sale - cash or udhar', 'दुकान से बिक्री - नकद या उधार')}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleShopSale} className="space-y-4">
                        {/* Udhar Toggle */}
                        <div className="flex gap-2">
                            <button type="button" data-testid="cash-toggle"
                                onClick={() => setShopForm(p => ({ ...p, is_udhar: false, walkin_customer_id: '' }))}
                                className={cn("flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-2",
                                    !shopForm.is_udhar ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-500")}>
                                <Wallet className="w-4 h-4" />{t('Cash', 'नकद')}
                            </button>
                            <button type="button" data-testid="udhar-toggle"
                                onClick={() => setShopForm(p => ({ ...p, is_udhar: true }))}
                                className={cn("flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-2",
                                    shopForm.is_udhar ? "border-red-500 bg-red-50 text-red-700" : "border-zinc-200 text-zinc-500")}>
                                <CreditCard className="w-4 h-4" />{t('Udhar', 'उधार')}
                            </button>
                        </div>

                        {/* Customer Selection for Udhar */}
                        {shopForm.is_udhar ? (
                            <div className="space-y-2">
                                <Label>{t('Customer', 'ग्राहक')} *</Label>
                                <div className="flex gap-2">
                                    <Select value={shopForm.walkin_customer_id} onValueChange={(v) => {
                                        const wc = walkinCustomers.find(c => c.id === v);
                                        setShopForm(p => ({ ...p, walkin_customer_id: v, customer_name: wc?.name || '' }));
                                    }}>
                                        <SelectTrigger className="h-12 flex-1" data-testid="udhar-customer-select">
                                            <SelectValue placeholder={t('Select customer', 'ग्राहक चुनें')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {walkinCustomers.map(wc => (
                                                <SelectItem key={wc.id} value={wc.id}>
                                                    {wc.name} ({wc.phone}) {(wc.pending_amount || 0) > 0 ? `- ₹${wc.pending_amount}` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button type="button" variant="outline" className="h-12 px-3" onClick={() => setShowAddWalkin(true)} data-testid="add-walkin-from-sale">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label>{t('Customer Name (optional)', 'ग्राहक नाम (वैकल्पिक)')}</Label>
                                <Input value={shopForm.customer_name} onChange={(e) => setShopForm(p => ({...p, customer_name: e.target.value}))}
                                    placeholder={t('Walk-in', 'वॉक-इन')} className="h-12" data-testid="shop-customer-name" />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>{t('Product', 'उत्पाद')}</Label>
                            <Select value={shopForm.product} onValueChange={(v) => setShopForm(p => ({...p, product: v}))}>
                                <SelectTrigger className="h-12" data-testid="shop-product"><SelectValue /></SelectTrigger>
                                <SelectContent>{productOptions.map(p => <SelectItem key={p.value} value={p.value}>{p.icon} {p.label}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('Quantity', 'मात्रा')} *</Label>
                                <Input type="number" step="0.1" value={shopForm.quantity}
                                    onChange={(e) => setShopForm(p => ({...p, quantity: e.target.value}))}
                                    className="h-12 text-lg" data-testid="shop-quantity" required />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Rate (₹)', 'दर (₹)')} *</Label>
                                <Input type="number" step="0.5" value={shopForm.rate}
                                    onChange={(e) => setShopForm(p => ({...p, rate: e.target.value}))}
                                    className="h-12 text-lg" data-testid="shop-rate" required />
                            </div>
                        </div>
                        {shopForm.quantity && shopForm.rate && (
                            <div className={cn("p-3 rounded-xl border text-center",
                                shopForm.is_udhar ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200")}>
                                <span className={cn("text-sm", shopForm.is_udhar ? "text-red-600" : "text-amber-600")}>{t('Total', 'कुल')}:</span>
                                <span className={cn("text-xl font-bold ml-2", shopForm.is_udhar ? "text-red-700" : "text-amber-700")}>
                                    ₹{(parseFloat(shopForm.quantity || 0) * parseFloat(shopForm.rate || 0)).toFixed(2)}
                                </span>
                                {shopForm.is_udhar && <span className="block text-xs text-red-500 mt-1">{t('Will be added to Udhar', 'उधार में जुड़ेगा')}</span>}
                            </div>
                        )}
                        <Button type="submit" data-testid="submit-shop-sale"
                            className={cn("w-full h-12", shopForm.is_udhar ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700")}
                            disabled={submitting}>
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (shopForm.is_udhar ? t('Record Udhar', 'उधार दर्ज करें') : t('Save', 'सहेजें'))}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Customer Sale Dialog */}
            <Dialog open={showAddSale} onOpenChange={setShowAddSale}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-emerald-600" />{t('Customer Sale', 'ग्राहक बिक्री')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddSale} className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('Customer', 'ग्राहक')} *</Label>
                            <Select value={saleForm.customer_id} onValueChange={(v) => setSaleForm(p => ({...p, customer_id: v}))}>
                                <SelectTrigger className="h-12" data-testid="sale-customer"><SelectValue placeholder={t('Select', 'चुनें')} /></SelectTrigger>
                                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Product', 'उत्पाद')}</Label>
                            <Select value={saleForm.product} onValueChange={(v) => setSaleForm(p => ({...p, product: v}))}>
                                <SelectTrigger className="h-12" data-testid="sale-product"><SelectValue /></SelectTrigger>
                                <SelectContent>{productOptions.map(p => <SelectItem key={p.value} value={p.value}>{p.icon} {p.label}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('Quantity', 'मात्रा')} *</Label>
                                <Input type="number" step="0.1" value={saleForm.quantity}
                                    onChange={(e) => setSaleForm(p => ({...p, quantity: e.target.value}))}
                                    className="h-12 text-lg" data-testid="sale-quantity" required />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Rate (₹)', 'दर (₹)')} *</Label>
                                <Input type="number" step="0.5" value={saleForm.rate}
                                    onChange={(e) => setSaleForm(p => ({...p, rate: e.target.value}))}
                                    className="h-12 text-lg" data-testid="sale-rate" required />
                            </div>
                        </div>
                        {saleForm.quantity && saleForm.rate && (
                            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                                <span className="text-sm text-emerald-600">{t('Total', 'कुल')}:</span>
                                <span className="text-xl font-bold text-emerald-700 ml-2">₹{(parseFloat(saleForm.quantity || 0) * parseFloat(saleForm.rate || 0)).toFixed(2)}</span>
                            </div>
                        )}
                        <Button type="submit" className="w-full h-12 bg-emerald-700 hover:bg-emerald-800" disabled={submitting} data-testid="submit-sale">
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('Save', 'सहेजें')}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Regular Customer Dialog */}
            <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-emerald-600" />{t('Add Customer', 'ग्राहक जोड़ें')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddCustomer} className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('Name', 'नाम')} *</Label>
                            <Input value={customerForm.name} onChange={(e) => setCustomerForm(p => ({...p, name: e.target.value}))}
                                className="h-12" data-testid="customer-name" required />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Phone', 'फ़ोन')}</Label>
                            <Input value={customerForm.phone} onChange={(e) => setCustomerForm(p => ({...p, phone: e.target.value}))}
                                className="h-12" data-testid="customer-phone" />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Type', 'प्रकार')}</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <button type="button" onClick={() => setCustomerForm(p => ({...p, customer_type: 'retail'}))}
                                    className={cn("p-3 rounded-lg border-2 flex items-center justify-center gap-2 text-sm",
                                        customerForm.customer_type === 'retail' ? "border-emerald-500 bg-emerald-50" : "border-zinc-200")}>
                                    <User className="w-4 h-4" />{t('Retail', 'खुदरा')}
                                </button>
                                <button type="button" onClick={() => setCustomerForm(p => ({...p, customer_type: 'wholesale'}))}
                                    className={cn("p-3 rounded-lg border-2 flex items-center justify-center gap-2 text-sm",
                                        customerForm.customer_type === 'wholesale' ? "border-emerald-500 bg-emerald-50" : "border-zinc-200")}>
                                    <Store className="w-4 h-4" />{t('Wholesale', 'थोक')}
                                </button>
                            </div>
                        </div>
                        <Button type="submit" className="w-full h-12 bg-emerald-700 hover:bg-emerald-800" disabled={submitting} data-testid="submit-customer">
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('Save', 'सहेजें')}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Walk-in Customer Dialog */}
            <Dialog open={showAddWalkin} onOpenChange={setShowAddWalkin}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><User className="w-5 h-5 text-amber-600" />{t('Add Walk-in Customer', 'वॉक-इन ग्राहक जोड़ें')}</DialogTitle>
                        <DialogDescription>{t('For Udhar tracking', 'उधार ट्रैकिंग के लिए')}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddWalkin} className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('Name', 'नाम')} *</Label>
                            <Input value={walkinForm.name} onChange={(e) => setWalkinForm(p => ({...p, name: e.target.value}))}
                                data-testid="walkin-name" placeholder={t('Customer name', 'ग्राहक का नाम')} className="h-12" required />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Phone', 'फ़ोन')} *</Label>
                            <Input type="tel" value={walkinForm.phone} onChange={(e) => setWalkinForm(p => ({...p, phone: e.target.value}))}
                                data-testid="walkin-phone" placeholder="9876543210" className="h-12" required />
                        </div>
                        <Button type="submit" className="w-full h-12 bg-amber-600 hover:bg-amber-700" disabled={submitting} data-testid="submit-walkin">
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('Add Customer', 'ग्राहक जोड़ें')}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Udhar Payment Dialog */}
            <Dialog open={showUdharPayment} onOpenChange={setShowUdharPayment}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><IndianRupee className="w-5 h-5 text-emerald-600" />{t('Record Payment', 'भुगतान दर्ज करें')}</DialogTitle>
                        <DialogDescription>{selectedWalkin?.name} - {t('Pending', 'बकाया')}: {formatCurrency(selectedWalkin?.pending_amount || 0)}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('Payment Amount (₹)', 'भुगतान राशि (₹)')}</Label>
                            <Input type="number" step="0.5" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
                                data-testid="udhar-payment-amount" placeholder="0" className="h-14 text-2xl text-center font-bold" />
                        </div>
                        <Button onClick={handleUdharPayment} data-testid="submit-udhar-payment"
                            className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-base" disabled={submitting}>
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('Record Payment', 'भुगतान दर्ज करें')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Udhar Ledger Dialog */}
            <Dialog open={showUdharLedger} onOpenChange={setShowUdharLedger}>
                <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-amber-600" />
                            {selectedWalkin?.name} - {t('Udhar Ledger', 'उधार खाता')}
                        </DialogTitle>
                        <DialogDescription>
                            <Phone className="w-3 h-3 inline mr-1" />{selectedWalkin?.phone}
                        </DialogDescription>
                    </DialogHeader>
                    {walkinDetail ? (
                        <div className="space-y-4">
                            {/* Balance Summary */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="p-3 bg-red-50 rounded-xl text-center border border-red-200">
                                    <p className="text-[10px] text-red-500 font-semibold">{t('Total Udhar', 'कुल उधार')}</p>
                                    <p className="text-base font-bold text-red-700">{formatCurrency(walkinDetail.sales.reduce((s, sale) => s + sale.amount, 0))}</p>
                                </div>
                                <div className="p-3 bg-emerald-50 rounded-xl text-center border border-emerald-200">
                                    <p className="text-[10px] text-emerald-500 font-semibold">{t('Paid', 'भुगतान')}</p>
                                    <p className="text-base font-bold text-emerald-700">{formatCurrency(walkinDetail.payments.reduce((s, p) => s + p.amount, 0))}</p>
                                </div>
                                <div className="p-3 bg-amber-50 rounded-xl text-center border border-amber-200">
                                    <p className="text-[10px] text-amber-500 font-semibold">{t('Pending', 'बकाया')}</p>
                                    <p className="text-base font-bold text-amber-700">{formatCurrency(walkinDetail.customer.pending_amount || 0)}</p>
                                </div>
                            </div>

                            {/* Combined Timeline */}
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-zinc-500 uppercase">{t('Transaction History', 'लेनदेन इतिहास')}</p>
                                {[
                                    ...walkinDetail.sales.map(s => ({ ...s, type: 'sale', sortDate: s.created_at })),
                                    ...walkinDetail.payments.map(p => ({ ...p, type: 'payment', sortDate: p.created_at })),
                                ].sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate)).map((item, i) => (
                                    <div key={i} className={cn("flex items-center gap-3 p-3 rounded-lg border",
                                        item.type === 'sale' ? "bg-red-50/50 border-red-100" : "bg-emerald-50/50 border-emerald-100")}>
                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center",
                                            item.type === 'sale' ? "bg-red-100" : "bg-emerald-100")}>
                                            {item.type === 'sale'
                                                ? <ArrowUpCircle className="w-4 h-4 text-red-600" />
                                                : <ArrowDownCircle className="w-4 h-4 text-emerald-600" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-zinc-800">
                                                {item.type === 'sale'
                                                    ? `${item.product || 'Item'} - ${item.quantity} × ₹${item.rate}`
                                                    : t('Payment Received', 'भुगतान प्राप्त')}
                                            </p>
                                            <p className="text-[10px] text-zinc-400">{item.date || item.sortDate?.split('T')[0]}</p>
                                        </div>
                                        <span className={cn("text-sm font-bold", item.type === 'sale' ? "text-red-600" : "text-emerald-600")}>
                                            {item.type === 'sale' ? '+' : '-'}{formatCurrency(item.amount)}
                                        </span>
                                    </div>
                                ))}
                                {walkinDetail.sales.length === 0 && walkinDetail.payments.length === 0 && (
                                    <p className="text-center text-zinc-400 text-sm py-6">{t('No transactions yet', 'कोई लेनदेन नहीं')}</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SalesPage;
