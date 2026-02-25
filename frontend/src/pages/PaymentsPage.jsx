import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { paymentAPI, farmerAPI } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
    Wallet, 
    Plus,
    Search,
    CreditCard,
    Banknote,
    Smartphone,
    Loader2,
    Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const PaymentsPage = () => {
    const { language } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [payments, setPayments] = useState([]);
    const [farmers, setFarmers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddDialog, setShowAddDialog] = useState(searchParams.get('add') === 'true');
    const [selectedFarmer, setSelectedFarmer] = useState(null);

    const [formData, setFormData] = useState({
        farmer_id: '',
        amount: '',
        payment_mode: 'cash',
        notes: '',
    });

    const texts = {
        title: language === 'hi' ? 'भुगतान' : 'Payments',
        makePayment: language === 'hi' ? 'भुगतान करें' : 'Make Payment',
        search: language === 'hi' ? 'किसान खोजें...' : 'Search farmer...',
        selectFarmer: language === 'hi' ? 'किसान चुनें' : 'Select Farmer',
        amount: language === 'hi' ? 'राशि' : 'Amount',
        paymentMode: language === 'hi' ? 'भुगतान माध्यम' : 'Payment Mode',
        cash: language === 'hi' ? 'नकद' : 'Cash',
        upi: language === 'hi' ? 'यूपीआई' : 'UPI',
        bank: language === 'hi' ? 'बैंक' : 'Bank',
        notes: language === 'hi' ? 'टिप्पणी' : 'Notes',
        save: language === 'hi' ? 'सहेजें' : 'Save',
        recentPayments: language === 'hi' ? 'हाल के भुगतान' : 'Recent Payments',
        noPayments: language === 'hi' ? 'कोई भुगतान नहीं' : 'No payments yet',
        balance: language === 'hi' ? 'बकाया' : 'Balance',
        success: language === 'hi' ? 'भुगतान सफल!' : 'Payment recorded!',
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (searchParams.get('add') === 'true') {
            setShowAddDialog(true);
            setSearchParams({});
        }
    }, [searchParams, setSearchParams]);

    const fetchData = async () => {
        try {
            const [paymentsRes, farmersRes] = await Promise.all([
                paymentAPI.getAll(),
                farmerAPI.getAll({ is_active: true })
            ]);
            setPayments(paymentsRes.data);
            setFarmers(farmersRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.farmer_id || !formData.amount) {
            toast.error(language === 'hi' ? 'किसान और राशि आवश्यक है' : 'Farmer and amount required');
            return;
        }

        setSubmitting(true);
        try {
            const response = await paymentAPI.create({
                farmer_id: formData.farmer_id,
                amount: parseFloat(formData.amount),
                payment_mode: formData.payment_mode,
                notes: formData.notes,
            });

            setPayments(prev => [response.data, ...prev]);
            setFormData({ farmer_id: '', amount: '', payment_mode: 'cash', notes: '' });
            setSelectedFarmer(null);
            setShowAddDialog(false);
            toast.success(texts.success);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error recording payment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(language === 'hi' ? 'क्या आप इसे हटाना चाहते हैं?' : 'Delete this payment?')) return;
        
        try {
            await paymentAPI.delete(id);
            setPayments(prev => prev.filter(p => p.id !== id));
            toast.success(language === 'hi' ? 'भुगतान हटाया गया' : 'Payment deleted');
        } catch (error) {
            toast.error('Error deleting payment');
        }
    };

    const filteredFarmers = searchTerm.length > 0 
        ? farmers.filter(f => 
            f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.phone.includes(searchTerm)
        )
        : farmers.slice(0, 10);

    const selectFarmer = (farmer) => {
        setSelectedFarmer(farmer);
        setFormData(prev => ({ ...prev, farmer_id: farmer.id }));
        setSearchTerm('');
    };

    const getPaymentIcon = (mode) => {
        switch (mode) {
            case 'cash': return <Banknote className="w-5 h-5 text-emerald-600" />;
            case 'upi': return <Smartphone className="w-5 h-5 text-purple-600" />;
            case 'bank': return <CreditCard className="w-5 h-5 text-blue-600" />;
            default: return <Wallet className="w-5 h-5 text-zinc-600" />;
        }
    };

    const getPaymentColor = (mode) => {
        switch (mode) {
            case 'cash': return 'bg-emerald-100';
            case 'upi': return 'bg-purple-100';
            case 'bank': return 'bg-blue-100';
            default: return 'bg-zinc-100';
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="font-heading text-2xl font-bold text-zinc-900">
                    {texts.title}
                </h1>
                <Button 
                    onClick={() => setShowAddDialog(true)}
                    data-testid="make-payment-btn"
                    className="bg-emerald-700 hover:bg-emerald-800"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    {texts.makePayment}
                </Button>
            </div>

            {/* Recent Payments */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-heading text-lg flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-emerald-600" />
                        {texts.recentPayments}
                        <span className="text-sm font-normal text-muted-foreground ml-auto">
                            {payments.length} {language === 'hi' ? 'भुगतान' : 'payments'}
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                        </div>
                    ) : payments.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <Wallet className="w-8 h-8" />
                            </div>
                            <p className="font-hindi">{texts.noPayments}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {payments.map((payment) => (
                                <Card 
                                    key={payment.id}
                                    data-testid={`payment-${payment.id}`}
                                    className="card-hover"
                                >
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <div className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center",
                                            getPaymentColor(payment.payment_mode)
                                        )}>
                                            {getPaymentIcon(payment.payment_mode)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-zinc-900 truncate">
                                                {payment.farmer_name}
                                            </p>
                                            <p className="text-sm text-zinc-500">
                                                {payment.payment_mode.toUpperCase()}
                                                {payment.notes && ` • ${payment.notes}`}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-emerald-700">
                                                {formatCurrency(payment.amount)}
                                            </p>
                                            <p className="text-xs text-zinc-500">
                                                {formatDate(payment.date)}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(payment.id)}
                                            data-testid={`delete-payment-${payment.id}`}
                                            className="text-zinc-400 hover:text-red-600"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Payment Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-heading flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-emerald-600" />
                            {texts.makePayment}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground">
                            {language === 'hi' ? 'किसान को भुगतान करें' : 'Record payment to farmer'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Farmer Selection */}
                        <div className="space-y-2">
                            <Label className="font-hindi">{texts.selectFarmer}</Label>
                            {selectedFarmer ? (
                                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                    <div className="farmer-avatar w-8 h-8 text-sm">
                                        {selectedFarmer.name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-sm">{selectedFarmer.name}</p>
                                        <p className="text-xs text-zinc-500">
                                            {texts.balance}: <span className={cn(
                                                "font-semibold",
                                                selectedFarmer.balance > 0 ? "text-orange-600" : "text-emerald-600"
                                            )}>{formatCurrency(selectedFarmer.balance)}</span>
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setSelectedFarmer(null);
                                            setFormData(prev => ({ ...prev, farmer_id: '' }));
                                        }}
                                    >
                                        {language === 'hi' ? 'बदलें' : 'Change'}
                                    </Button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                    <Input
                                        placeholder={texts.search}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        data-testid="payment-farmer-search"
                                        className="pl-10 h-12"
                                    />
                                    {filteredFarmers.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto z-50">
                                            {filteredFarmers.map(farmer => (
                                                <button
                                                    key={farmer.id}
                                                    type="button"
                                                    onClick={() => selectFarmer(farmer)}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-zinc-50 text-left"
                                                >
                                                    <div className="farmer-avatar w-8 h-8 text-sm">
                                                        {farmer.name.charAt(0)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-sm">{farmer.name}</p>
                                                        <p className="text-xs text-zinc-500">
                                                            Balance: {formatCurrency(farmer.balance)}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Amount */}
                        <div className="space-y-2">
                            <Label className="font-hindi">{texts.amount} *</Label>
                            <Input
                                type="number"
                                step="1"
                                value={formData.amount}
                                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                data-testid="payment-amount"
                                placeholder="0"
                                className="h-12 text-lg"
                            />
                        </div>

                        {/* Payment Mode */}
                        <div className="space-y-2">
                            <Label className="font-hindi">{texts.paymentMode}</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {['cash', 'upi', 'bank'].map(mode => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, payment_mode: mode }))}
                                        data-testid={`payment-mode-${mode}`}
                                        className={cn(
                                            "p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all",
                                            formData.payment_mode === mode 
                                                ? "border-emerald-500 bg-emerald-50" 
                                                : "border-zinc-200 hover:border-zinc-300"
                                        )}
                                    >
                                        {mode === 'cash' && <Banknote className="w-5 h-5 text-emerald-600" />}
                                        {mode === 'upi' && <Smartphone className="w-5 h-5 text-purple-600" />}
                                        {mode === 'bank' && <CreditCard className="w-5 h-5 text-blue-600" />}
                                        <span className="text-xs font-semibold">
                                            {mode === 'cash' ? texts.cash : mode === 'upi' ? texts.upi : texts.bank}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label className="font-hindi">{texts.notes}</Label>
                            <Input
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                data-testid="payment-notes"
                                placeholder={language === 'hi' ? 'वैकल्पिक टिप्पणी' : 'Optional notes'}
                                className="h-12"
                            />
                        </div>

                        <Button
                            type="submit"
                            data-testid="submit-payment"
                            className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 font-hindi text-base"
                            disabled={submitting || !formData.farmer_id}
                        >
                            {submitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                texts.save
                            )}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PaymentsPage;
