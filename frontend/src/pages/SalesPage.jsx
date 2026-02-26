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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '../components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import { 
    ShoppingBag, 
    Plus,
    Search,
    Users,
    Package,
    Loader2,
    Phone,
    Store,
    User,
    ChevronRight,
    Milk
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '../lib/utils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const SalesPage = () => {
    const { language } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('sales');
    const [customers, setCustomers] = useState([]);
    const [sales, setSales] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showAddCustomer, setShowAddCustomer] = useState(false);
    const [showAddSale, setShowAddSale] = useState(false);
    const [showShopSale, setShowShopSale] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    const [customerForm, setCustomerForm] = useState({
        name: '',
        phone: '',
        address: '',
        customer_type: 'retail',
        gst_number: '',
    });

    const [saleForm, setSaleForm] = useState({
        customer_id: '',
        product: 'milk',
        quantity: '',
        rate: '',
    });

    const [shopForm, setShopForm] = useState({
        customer_name: '',
        product: 'milk',
        quantity: '',
        rate: '',
    });

    const texts = {
        title: language === 'hi' ? 'बिक्री' : 'Sales',
        customers: language === 'hi' ? 'ग्राहक' : 'Customers',
        todaySales: language === 'hi' ? 'आज की बिक्री' : "Today's Sales",
        addCustomer: language === 'hi' ? 'ग्राहक जोड़ें' : 'Add Customer',
        addSale: language === 'hi' ? 'बिक्री जोड़ें' : 'Add Sale',
        name: language === 'hi' ? 'नाम' : 'Name',
        phone: language === 'hi' ? 'फ़ोन' : 'Phone',
        address: language === 'hi' ? 'पता' : 'Address',
        type: language === 'hi' ? 'प्रकार' : 'Type',
        retail: language === 'hi' ? 'खुदरा' : 'Retail',
        wholesale: language === 'hi' ? 'थोक' : 'Wholesale',
        product: language === 'hi' ? 'उत्पाद' : 'Product',
        quantity: language === 'hi' ? 'मात्रा' : 'Quantity',
        rate: language === 'hi' ? 'दर' : 'Rate',
        save: language === 'hi' ? 'सहेजें' : 'Save',
        shopSale: language === 'hi' ? 'दुकान बिक्री' : 'Shop Sale',
        walkIn: language === 'hi' ? 'वॉक-इन ग्राहक' : 'Walk-in Customer',
        balance: language === 'hi' ? 'बकाया' : 'Balance',
        noData: language === 'hi' ? 'कोई डेटा नहीं' : 'No data',
        milk: language === 'hi' ? 'दूध' : 'Milk',
        paneer: language === 'hi' ? 'पनीर' : 'Paneer',
        dahi: language === 'hi' ? 'दही' : 'Curd',
        ghee: language === 'hi' ? 'घी' : 'Ghee',
        lassi: language === 'hi' ? 'लस्सी' : 'Lassi',
    };

    const productOptions = [
        { value: 'milk', label: texts.milk },
        { value: 'paneer', label: texts.paneer },
        { value: 'dahi', label: texts.dahi },
        { value: 'ghee', label: texts.ghee },
        { value: 'lassi', label: texts.lassi },
    ];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const token = localStorage.getItem('auth_token');
        try {
            const [customersRes, salesRes, productsRes] = await Promise.all([
                axios.get(`${BACKEND_URL}/api/customers`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${BACKEND_URL}/api/sales/today`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${BACKEND_URL}/api/products`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setCustomers(customersRes.data);
            setSales(salesRes.data);
            setProducts(productsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCustomer = async (e) => {
        e.preventDefault();
        if (!customerForm.name || !customerForm.phone) {
            toast.error(language === 'hi' ? 'नाम और फ़ोन आवश्यक है' : 'Name and phone required');
            return;
        }
        setSubmitting(true);
        const token = localStorage.getItem('auth_token');
        try {
            const response = await axios.post(`${BACKEND_URL}/api/customers`, customerForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCustomers(prev => [response.data, ...prev]);
            setCustomerForm({ name: '', phone: '', address: '', customer_type: 'retail', gst_number: '' });
            setShowAddCustomer(false);
            toast.success(language === 'hi' ? 'ग्राहक जोड़ा गया!' : 'Customer added!');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error adding customer');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddSale = async (e) => {
        e.preventDefault();
        if (!saleForm.customer_id || !saleForm.quantity || !saleForm.rate) {
            toast.error(language === 'hi' ? 'सभी फ़ील्ड भरें' : 'Fill all fields');
            return;
        }
        setSubmitting(true);
        const token = localStorage.getItem('auth_token');
        try {
            await axios.post(`${BACKEND_URL}/api/sales`, {
                ...saleForm,
                quantity: parseFloat(saleForm.quantity),
                rate: parseFloat(saleForm.rate)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSaleForm({ customer_id: '', product: 'milk', quantity: '', rate: '' });
            setSelectedCustomer(null);
            setShowAddSale(false);
            toast.success(language === 'hi' ? 'बिक्री दर्ज हुई!' : 'Sale recorded!');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error recording sale');
        } finally {
            setSubmitting(false);
        }
    };

    const handleShopSale = async (e) => {
        e.preventDefault();
        if (!shopForm.quantity || !shopForm.rate) {
            toast.error(language === 'hi' ? 'मात्रा और दर भरें' : 'Fill quantity and rate');
            return;
        }
        setSubmitting(true);
        const token = localStorage.getItem('auth_token');
        try {
            await axios.post(`${BACKEND_URL}/api/sales/shop`, {
                customer_name: shopForm.customer_name || 'Walk-in',
                product: shopForm.product,
                quantity: parseFloat(shopForm.quantity),
                rate: parseFloat(shopForm.rate),
            }, { headers: { Authorization: `Bearer ${token}` } });
            setShopForm({ customer_name: '', product: 'milk', quantity: '', rate: '' });
            setShowShopSale(false);
            toast.success(language === 'hi' ? 'दुकान बिक्री दर्ज हुई!' : 'Shop sale recorded!');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm)
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="font-heading text-2xl font-bold text-zinc-900">{texts.title}</h1>
                <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={() => setShowShopSale(true)} data-testid="shop-sale-btn"
                        className="border-amber-300 text-amber-700 hover:bg-amber-50">
                        <Milk className="w-4 h-4 mr-1" />{texts.shopSale}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddCustomer(true)} data-testid="add-customer-btn">
                        <Users className="w-4 h-4 mr-2" />
                        {texts.addCustomer}
                    </Button>
                    <Button onClick={() => setShowAddSale(true)} data-testid="add-sale-btn" className="bg-emerald-700 hover:bg-emerald-800">
                        <Plus className="w-4 h-4 mr-2" />
                        {texts.addSale}
                    </Button>
                </div>
            </div>

            {/* Today's Sales Summary */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="bg-emerald-50 border-emerald-200">
                    <CardContent className="p-4 text-center">
                        <p className="text-sm text-emerald-600 font-hindi">{texts.todaySales}</p>
                        <p className="text-2xl font-bold text-emerald-700">{formatCurrency(sales.total_amount || 0)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4 text-center">
                        <p className="text-sm text-blue-600 font-hindi">{texts.customers}</p>
                        <p className="text-2xl font-bold text-blue-700">{customers.length}</p>
                    </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="p-4 text-center">
                        <p className="text-sm text-purple-600 font-hindi">{language === 'hi' ? 'बिक्री संख्या' : 'Sales Count'}</p>
                        <p className="text-2xl font-bold text-purple-700">{sales.total_sales || 0}</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="sales" className="font-hindi">
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        {texts.todaySales}
                    </TabsTrigger>
                    <TabsTrigger value="customers" className="font-hindi">
                        <Users className="w-4 h-4 mr-2" />
                        {texts.customers}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="sales" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-heading text-lg">{texts.todaySales}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!sales.sales || sales.sales.length === 0 ? (
                                <p className="text-center text-zinc-500 py-8 font-hindi">{texts.noData}</p>
                            ) : (
                                <div className="space-y-3">
                                    {sales.sales.map((sale) => (
                                        <Card key={sale.id} className="card-hover">
                                            <CardContent className="p-4 flex items-center gap-4">
                                                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                                    <Package className="w-5 h-5 text-emerald-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-semibold">{sale.customer_name}</p>
                                                    <p className="text-sm text-zinc-500">
                                                        {sale.product} • {sale.quantity} @ {formatCurrency(sale.rate)}
                                                    </p>
                                                </div>
                                                <p className="font-bold text-emerald-700">{formatCurrency(sale.amount)}</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="customers" className="mt-4">
                    <div className="relative mb-4">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                        <Input
                            placeholder={language === 'hi' ? 'ग्राहक खोजें...' : 'Search customers...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 h-12"
                        />
                    </div>
                    <div className="space-y-3">
                        {filteredCustomers.map((customer) => (
                            <Card key={customer.id} className="card-hover cursor-pointer" 
                                onClick={() => navigate(`/customers/${customer.id}`)}
                                data-testid={`customer-${customer.id}`}>
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="farmer-avatar">{getInitials(customer.name)}</div>
                                    <div className="flex-1">
                                        <p className="font-semibold">{customer.name}</p>
                                        <div className="flex items-center gap-3 text-sm text-zinc-500">
                                            <span className="flex items-center gap-1">
                                                <Phone className="w-3 h-3" />
                                                {customer.phone}
                                            </span>
                                            <span className="px-2 py-0.5 bg-zinc-100 rounded text-xs">
                                                {customer.customer_type === 'retail' ? texts.retail : texts.wholesale}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={cn(
                                            "font-bold",
                                            customer.balance > 0 ? "text-orange-600" : "text-emerald-600"
                                        )}>{formatCurrency(customer.balance)}</p>
                                        <p className="text-xs text-zinc-500">{texts.balance}</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-zinc-400" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Add Customer Dialog */}
            <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-heading flex items-center gap-2">
                            <Users className="w-5 h-5 text-emerald-600" />
                            {texts.addCustomer}
                        </DialogTitle>
                        <DialogDescription>{language === 'hi' ? 'नए ग्राहक की जानकारी' : 'New customer details'}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddCustomer} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="font-hindi">{texts.name} *</Label>
                            <Input
                                value={customerForm.name}
                                onChange={(e) => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                                className="h-12"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-hindi">{texts.phone} *</Label>
                            <Input
                                value={customerForm.phone}
                                onChange={(e) => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                                className="h-12"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-hindi">{texts.type}</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCustomerForm(prev => ({ ...prev, customer_type: 'retail' }))}
                                    className={cn(
                                        "p-3 rounded-lg border-2 flex items-center justify-center gap-2",
                                        customerForm.customer_type === 'retail' ? "border-emerald-500 bg-emerald-50" : "border-zinc-200"
                                    )}
                                >
                                    <User className="w-4 h-4" />
                                    {texts.retail}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCustomerForm(prev => ({ ...prev, customer_type: 'wholesale' }))}
                                    className={cn(
                                        "p-3 rounded-lg border-2 flex items-center justify-center gap-2",
                                        customerForm.customer_type === 'wholesale' ? "border-emerald-500 bg-emerald-50" : "border-zinc-200"
                                    )}
                                >
                                    <Store className="w-4 h-4" />
                                    {texts.wholesale}
                                </button>
                            </div>
                        </div>
                        <Button type="submit" className="w-full h-12 bg-emerald-700 hover:bg-emerald-800" disabled={submitting}>
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : texts.save}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Sale Dialog */}
            <Dialog open={showAddSale} onOpenChange={setShowAddSale}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-heading flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5 text-emerald-600" />
                            {texts.addSale}
                        </DialogTitle>
                        <DialogDescription>{language === 'hi' ? 'बिक्री विवरण दर्ज करें' : 'Enter sale details'}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddSale} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="font-hindi">{texts.customers} *</Label>
                            <Select
                                value={saleForm.customer_id}
                                onValueChange={(value) => setSaleForm(prev => ({ ...prev, customer_id: value }))}
                            >
                                <SelectTrigger className="h-12">
                                    <SelectValue placeholder={language === 'hi' ? 'ग्राहक चुनें' : 'Select customer'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {customers.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name} - {c.phone}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="font-hindi">{texts.product} *</Label>
                            <Select
                                value={saleForm.product}
                                onValueChange={(value) => setSaleForm(prev => ({ ...prev, product: value }))}
                            >
                                <SelectTrigger className="h-12">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {productOptions.map(p => (
                                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="font-hindi">{texts.quantity}</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={saleForm.quantity}
                                    onChange={(e) => setSaleForm(prev => ({ ...prev, quantity: e.target.value }))}
                                    className="h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-hindi">{texts.rate}</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={saleForm.rate}
                                    onChange={(e) => setSaleForm(prev => ({ ...prev, rate: e.target.value }))}
                                    className="h-12"
                                />
                            </div>
                        </div>
                        <Button type="submit" className="w-full h-12 bg-emerald-700 hover:bg-emerald-800" disabled={submitting}>
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : texts.save}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SalesPage;
