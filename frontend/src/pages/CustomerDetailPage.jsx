import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import { 
    ArrowLeft, Phone, MapPin, Wallet, ShoppingBag, FileText, Loader2, Plus, 
    Printer, Share2, CreditCard, Edit, User, Store
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '../lib/utils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const CustomerDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { language } = useAuth();
    const [customer, setCustomer] = useState(null);
    const [sales, setSales] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [paymentForm, setPaymentForm] = useState({ amount: '', payment_mode: 'cash', notes: '' });
    const [editForm, setEditForm] = useState({ name: '', phone: '', address: '', customer_type: 'retail', gst_number: '' });

    const t = (en, hi) => language === 'hi' ? hi : en;

    useEffect(() => { fetchData(); }, [id]);

    const fetchData = async () => {
        const token = localStorage.getItem('auth_token');
        try {
            const res = await axios.get(`${BACKEND_URL}/api/customers/${id}/sales`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCustomer(res.data.customer);
            setSales(res.data.sales);
            setPayments(res.data.payments);
        } catch (error) {
            toast.error(t('Error loading data', 'डेटा लोड करने में त्रुटि'));
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
            toast.error(t('Enter valid amount', 'सही राशि दर्ज करें'));
            return;
        }
        setSubmitting(true);
        const token = localStorage.getItem('auth_token');
        try {
            await axios.post(`${BACKEND_URL}/api/customers/${id}/payment`, paymentForm, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            toast.success(t('Payment recorded!', 'भुगतान दर्ज हुआ!'));
            setPaymentForm({ amount: '', payment_mode: 'cash', notes: '' });
            setShowPaymentDialog(false);
            fetchData();
        } catch (error) {
            toast.error(t('Payment failed', 'भुगतान विफल'));
        } finally {
            setSubmitting(false);
        }
    };

    const openEditDialog = () => {
        if (customer) {
            setEditForm({
                name: customer.name || '',
                phone: customer.phone || '',
                address: customer.address || '',
                customer_type: customer.customer_type || 'retail',
                gst_number: customer.gst_number || '',
            });
            setShowEditDialog(true);
        }
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        if (!editForm.name || !editForm.phone) {
            toast.error(t('Name and phone required', 'नाम और फ़ोन आवश्यक है'));
            return;
        }
        setSubmitting(true);
        const token = localStorage.getItem('auth_token');
        try {
            await axios.put(`${BACKEND_URL}/api/customers/${id}`, editForm, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            toast.success(t('Customer updated!', 'ग्राहक अपडेट हुआ!'));
            setShowEditDialog(false);
            fetchData();
        } catch (error) {
            toast.error(t('Update failed', 'अपडेट विफल'));
        } finally {
            setSubmitting(false);
        }
    };

    const openThermalBill = () => window.open(`${BACKEND_URL}/api/bills/customer/thermal/${id}`, '_blank');
    const openA4Invoice = () => window.open(`${BACKEND_URL}/api/bills/customer/a4/${id}`, '_blank');

    const handleWhatsAppShare = async () => {
        const token = localStorage.getItem('auth_token');
        try {
            const res = await axios.get(`${BACKEND_URL}/api/share/customer-bill/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            window.open(res.data.whatsapp_link, '_blank');
        } catch (error) {
            toast.error(t('WhatsApp share failed', 'WhatsApp शेयर विफल'));
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
    );

    if (!customer) return (
        <div className="p-8 text-center">
            <p className="text-zinc-500">{t('Customer not found', 'ग्राहक नहीं मिला')}</p>
            <Button onClick={() => navigate('/sales')} className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />{t('Back', 'वापस')}
            </Button>
        </div>
    );

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-start gap-4 flex-wrap" data-testid="customer-detail-header">
                <Button variant="ghost" onClick={() => navigate('/sales')} data-testid="back-btn">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="font-heading text-2xl font-bold text-zinc-900">{customer.name}</h1>
                        <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-bold uppercase",
                            customer.customer_type === 'wholesale' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                        )}>
                            {customer.customer_type === 'wholesale' ? t('Wholesale', 'थोक') : t('Retail', 'खुदरा')}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-zinc-500">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{customer.phone}</span>
                        {customer.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{customer.address}</span>}
                        {customer.gst_number && <span className="text-xs bg-zinc-100 px-2 py-0.5 rounded">GST: {customer.gst_number}</span>}
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" onClick={handleWhatsAppShare} data-testid="customer-whatsapp-btn"
                        className="border-green-200 text-green-700 hover:bg-green-50">
                        <Share2 className="w-4 h-4 mr-2" />WhatsApp
                    </Button>
                    <Button variant="outline" onClick={openThermalBill} data-testid="customer-thermal-btn"
                        className="border-orange-200 text-orange-700 hover:bg-orange-50">
                        <Printer className="w-4 h-4 mr-2" />{t('Thermal', 'थर्मल')}
                    </Button>
                    <Button variant="outline" onClick={openA4Invoice} data-testid="customer-a4-btn"
                        className="border-blue-200 text-blue-700 hover:bg-blue-50">
                        <FileText className="w-4 h-4 mr-2" />A4
                    </Button>
                    <Button onClick={() => setShowPaymentDialog(true)} data-testid="customer-payment-btn"
                        className="bg-emerald-700 hover:bg-emerald-800">
                        <Plus className="w-4 h-4 mr-2" />{t('Payment', 'भुगतान')}
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-200"><CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1"><ShoppingBag className="w-4 h-4 text-blue-600" /><span className="text-sm text-blue-600">{t('Total Purchase', 'कुल खरीद')}</span></div>
                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(customer.total_purchase)}</p>
                </CardContent></Card>
                <Card className="bg-emerald-50 border-emerald-200"><CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1"><CreditCard className="w-4 h-4 text-emerald-600" /><span className="text-sm text-emerald-600">{t('Total Paid', 'कुल भुगतान')}</span></div>
                    <p className="text-2xl font-bold text-emerald-700">{formatCurrency(customer.total_paid)}</p>
                </CardContent></Card>
                <Card className={customer.balance > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}><CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1"><Wallet className="w-4 h-4" /><span className={cn("text-sm", customer.balance > 0 ? "text-red-600" : "text-green-600")}>{t('Balance', 'बकाया')}</span></div>
                    <p className={cn("text-2xl font-bold", customer.balance > 0 ? "text-red-700" : "text-green-700")}>{formatCurrency(customer.balance)}</p>
                </CardContent></Card>
            </div>

            {/* Sales Table */}
            <Card>
                <CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-emerald-600" />{t('Sales History', 'बिक्री इतिहास')}
                    <span className="text-sm font-normal text-zinc-500">({sales.length})</span>
                </CardTitle></CardHeader>
                <CardContent>
                    {sales.length === 0 ? <p className="text-center text-zinc-500 py-8">{t('No sales yet', 'अभी कोई बिक्री नहीं')}</p> : (
                        <div className="overflow-x-auto"><Table><TableHeader><TableRow>
                            <TableHead>{t('Date', 'तारीख')}</TableHead>
                            <TableHead>{t('Product', 'उत्पाद')}</TableHead>
                            <TableHead>{t('Qty', 'मात्रा')}</TableHead>
                            <TableHead>{t('Rate', 'दर')}</TableHead>
                            <TableHead className="text-right">{t('Amount', 'राशि')}</TableHead>
                        </TableRow></TableHeader><TableBody>
                            {sales.map((s) => (
                                <TableRow key={s.id}>
                                    <TableCell>{s.date}</TableCell>
                                    <TableCell className="font-semibold capitalize">{s.product}</TableCell>
                                    <TableCell>{s.quantity}</TableCell>
                                    <TableCell>{formatCurrency(s.rate)}</TableCell>
                                    <TableCell className="text-right font-semibold text-emerald-700">{formatCurrency(s.amount)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody></Table></div>
                    )}
                </CardContent>
            </Card>

            {/* Payments Table */}
            {payments.length > 0 && (
                <Card>
                    <CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-emerald-600" />{t('Payment History', 'भुगतान इतिहास')}
                    </CardTitle></CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto"><Table><TableHeader><TableRow>
                            <TableHead>{t('Date', 'तारीख')}</TableHead>
                            <TableHead>{t('Mode', 'माध्यम')}</TableHead>
                            <TableHead>{t('Notes', 'नोट्स')}</TableHead>
                            <TableHead className="text-right">{t('Amount', 'राशि')}</TableHead>
                        </TableRow></TableHeader><TableBody>
                            {payments.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell>{p.date}</TableCell>
                                    <TableCell className="uppercase text-xs font-semibold">{p.payment_mode}</TableCell>
                                    <TableCell>{p.notes}</TableCell>
                                    <TableCell className="text-right font-semibold text-emerald-700">{formatCurrency(p.amount)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody></Table></div>
                    </CardContent>
                </Card>
            )}

            {/* Payment Dialog */}
            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogContent><DialogHeader>
                    <DialogTitle>{t('Record Payment', 'भुगतान दर्ज करें')}</DialogTitle>
                    <DialogDescription>{customer.name} - {t('Balance', 'बकाया')}: {formatCurrency(customer.balance)}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handlePayment} className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('Amount', 'राशि')} *</Label>
                        <Input type="number" step="0.01" value={paymentForm.amount}
                            onChange={(e) => setPaymentForm(p => ({...p, amount: e.target.value}))}
                            placeholder="0.00" className="h-12 text-lg" data-testid="customer-payment-amount" required />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('Mode', 'माध्यम')}</Label>
                        <Select value={paymentForm.payment_mode} onValueChange={(v) => setPaymentForm(p => ({...p, payment_mode: v}))}>
                            <SelectTrigger className="h-12" data-testid="customer-payment-mode"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cash">{t('Cash', 'नकद')}</SelectItem>
                                <SelectItem value="upi">UPI</SelectItem>
                                <SelectItem value="bank">{t('Bank Transfer', 'बैंक')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>{t('Notes', 'नोट्स')}</Label>
                        <Input value={paymentForm.notes} onChange={(e) => setPaymentForm(p => ({...p, notes: e.target.value}))}
                            placeholder={t('Optional notes', 'वैकल्पिक नोट्स')} className="h-12" data-testid="customer-payment-notes" />
                    </div>
                    <Button type="submit" className="w-full h-12 bg-emerald-700 hover:bg-emerald-800" disabled={submitting} data-testid="customer-payment-submit">
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('Record Payment', 'भुगतान दर्ज करें')}
                    </Button>
                </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CustomerDetailPage;
