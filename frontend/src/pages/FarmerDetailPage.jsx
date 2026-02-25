import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { farmerAPI, paymentAPI } from '../lib/api';
import { formatCurrency, formatDate, getInitials } from '../lib/utils';
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
    ArrowLeft,
    Phone,
    MapPin,
    Wallet,
    Milk,
    CreditCard,
    Building,
    FileText,
    Loader2,
    Plus,
    Edit,
    Trash2,
    Printer,
    Share2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const FarmerDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { language } = useAuth();
    const [farmer, setFarmer] = useState(null);
    const [ledger, setLedger] = useState({ collections: [], payments: [] });
    const [loading, setLoading] = useState(true);
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [paymentData, setPaymentData] = useState({
        amount: '',
        payment_mode: 'cash',
        notes: '',
    });

    const texts = {
        back: language === 'hi' ? 'वापस' : 'Back',
        collections: language === 'hi' ? 'दूध संग्रह' : 'Collections',
        payments: language === 'hi' ? 'भुगतान' : 'Payments',
        makePayment: language === 'hi' ? 'भुगतान करें' : 'Make Payment',
        printBill: language === 'hi' ? 'बिल प्रिंट' : 'Print Bill',
        totalMilk: language === 'hi' ? 'कुल दूध' : 'Total Milk',
        totalDue: language === 'hi' ? 'कुल देय' : 'Total Due',
        totalPaid: language === 'hi' ? 'कुल भुगतान' : 'Total Paid',
        balance: language === 'hi' ? 'बकाया' : 'Balance',
        amount: language === 'hi' ? 'राशि' : 'Amount',
        paymentMode: language === 'hi' ? 'भुगतान माध्यम' : 'Payment Mode',
        cash: language === 'hi' ? 'नकद' : 'Cash',
        upi: language === 'hi' ? 'यूपीआई' : 'UPI',
        bank: language === 'hi' ? 'बैंक' : 'Bank',
        notes: language === 'hi' ? 'टिप्पणी' : 'Notes',
        save: language === 'hi' ? 'सहेजें' : 'Save',
        noRecords: language === 'hi' ? 'कोई रिकॉर्ड नहीं' : 'No records',
        bankDetails: language === 'hi' ? 'बैंक विवरण' : 'Bank Details',
        accountNo: language === 'hi' ? 'खाता नंबर' : 'Account No',
        ifscCode: language === 'hi' ? 'IFSC कोड' : 'IFSC Code',
        aadhar: language === 'hi' ? 'आधार' : 'Aadhar',
    };

    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

    const openBill = () => {
        const token = localStorage.getItem('auth_token');
        window.open(`${BACKEND_URL}/api/bills/farmer/${id}`, '_blank');
    };

    const openThermalBill = () => {
        window.open(`${BACKEND_URL}/api/bills/thermal/${id}`, '_blank');
    };

    const openA4Invoice = () => {
        window.open(`${BACKEND_URL}/api/bills/a4/${id}`, '_blank');
    };

    const handleWhatsAppShare = async () => {
        const token = localStorage.getItem('auth_token');
        try {
            const response = await fetch(`${BACKEND_URL}/api/share/farmer-bill/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            window.open(data.whatsapp_link, '_blank');
        } catch (error) {
            toast.error(language === 'hi' ? 'WhatsApp शेयर विफल' : 'WhatsApp share failed');
        }
    };

    useEffect(() => {
        fetchFarmerData();
    }, [id]);

    const fetchFarmerData = async () => {
        try {
            const [farmerRes, ledgerRes] = await Promise.all([
                farmerAPI.getById(id),
                farmerAPI.getLedger(id)
            ]);
            setFarmer(farmerRes.data);
            setLedger(ledgerRes.data);
        } catch (error) {
            console.error('Error fetching farmer:', error);
            toast.error(language === 'hi' ? 'किसान नहीं मिला' : 'Farmer not found');
            navigate('/farmers');
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
            toast.error(language === 'hi' ? 'सही राशि दर्ज करें' : 'Enter valid amount');
            return;
        }

        setSubmitting(true);
        try {
            await paymentAPI.create({
                farmer_id: id,
                amount: parseFloat(paymentData.amount),
                payment_mode: paymentData.payment_mode,
                notes: paymentData.notes,
            });

            setPaymentData({ amount: '', payment_mode: 'cash', notes: '' });
            setShowPaymentDialog(false);
            toast.success(language === 'hi' ? 'भुगतान सफल!' : 'Payment recorded!');
            fetchFarmerData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error recording payment');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (!farmer) return null;

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/farmers')}
                    data-testid="back-btn"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="font-heading text-2xl font-bold text-zinc-900">
                        {farmer.name}
                    </h1>
                    <div className="flex items-center gap-3 text-sm text-zinc-500">
                        <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {farmer.phone}
                        </span>
                        {farmer.village && (
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {farmer.village}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        variant="outline"
                        onClick={handleWhatsAppShare}
                        data-testid="whatsapp-share-btn"
                        className="border-green-200 text-green-700 hover:bg-green-50"
                    >
                        <Share2 className="w-4 h-4 mr-2" />
                        WhatsApp
                    </Button>
                    <Button
                        variant="outline"
                        onClick={openThermalBill}
                        data-testid="thermal-bill-btn"
                        className="border-orange-200 text-orange-700 hover:bg-orange-50"
                    >
                        <Printer className="w-4 h-4 mr-2" />
                        {language === 'hi' ? 'थर्मल बिल' : 'Thermal'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={openA4Invoice}
                        data-testid="a4-invoice-btn"
                        className="border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        {language === 'hi' ? 'A4 बिल' : 'A4 Invoice'}
                    </Button>
                    <Button
                        onClick={() => setShowPaymentDialog(true)}
                        data-testid="make-payment-btn"
                        className="bg-emerald-700 hover:bg-emerald-800"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        {texts.makePayment}
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-blue-50 border-blue-200" data-testid="total-milk-card">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Milk className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-blue-600 font-hindi">{texts.totalMilk}</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-700 font-heading">
                            {farmer.total_milk.toFixed(1)} L
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-amber-50 border-amber-200" data-testid="total-due-card">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-4 h-4 text-amber-600" />
                            <span className="text-sm text-amber-600 font-hindi">{texts.totalDue}</span>
                        </div>
                        <p className="text-2xl font-bold text-amber-700 font-heading">
                            {formatCurrency(farmer.total_due)}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-50 border-emerald-200" data-testid="total-paid-card">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <CreditCard className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm text-emerald-600 font-hindi">{texts.totalPaid}</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-700 font-heading">
                            {formatCurrency(farmer.total_paid)}
                        </p>
                    </CardContent>
                </Card>

                <Card className={cn(
                    farmer.balance > 0 ? "bg-orange-50 border-orange-200" : "bg-green-50 border-green-200"
                )} data-testid="balance-card">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Wallet className={cn(
                                "w-4 h-4",
                                farmer.balance > 0 ? "text-orange-600" : "text-green-600"
                            )} />
                            <span className={cn(
                                "text-sm font-hindi",
                                farmer.balance > 0 ? "text-orange-600" : "text-green-600"
                            )}>{texts.balance}</span>
                        </div>
                        <p className={cn(
                            "text-2xl font-bold font-heading",
                            farmer.balance > 0 ? "text-orange-700" : "text-green-700"
                        )}>
                            {formatCurrency(farmer.balance)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Bank Details */}
            {(farmer.bank_account || farmer.aadhar_number) && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Building className="w-4 h-4 text-zinc-500" />
                            {texts.bankDetails}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-4 text-sm">
                        {farmer.bank_account && (
                            <div>
                                <p className="text-zinc-500 font-hindi">{texts.accountNo}</p>
                                <p className="font-mono">{farmer.bank_account}</p>
                            </div>
                        )}
                        {farmer.ifsc_code && (
                            <div>
                                <p className="text-zinc-500 font-hindi">{texts.ifscCode}</p>
                                <p className="font-mono">{farmer.ifsc_code}</p>
                            </div>
                        )}
                        {farmer.aadhar_number && (
                            <div>
                                <p className="text-zinc-500 font-hindi">{texts.aadhar}</p>
                                <p className="font-mono">{farmer.aadhar_number}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Collections & Payments Tabs */}
            <Tabs defaultValue="collections">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="collections" data-testid="collections-tab" className="font-hindi">
                        <Milk className="w-4 h-4 mr-2" />
                        {texts.collections}
                    </TabsTrigger>
                    <TabsTrigger value="payments" data-testid="payments-tab" className="font-hindi">
                        <CreditCard className="w-4 h-4 mr-2" />
                        {texts.payments}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="collections" className="mt-4">
                    {ledger.collections.length === 0 ? (
                        <div className="empty-state py-8">
                            <div className="empty-state-icon">
                                <Milk className="w-8 h-8" />
                            </div>
                            <p className="font-hindi">{texts.noRecords}</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {ledger.collections.map((c) => (
                                <Card key={c.id} className={cn("collection-card", c.shift)}>
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <div className="flex-1">
                                            <p className="font-semibold text-zinc-900">
                                                {c.quantity.toFixed(1)} L
                                            </p>
                                            <p className="text-sm text-zinc-500">
                                                Fat: {c.fat}% | SNF: {c.snf}% | @{formatCurrency(c.rate)}/L
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-emerald-700">
                                                {formatCurrency(c.amount)}
                                            </p>
                                            <p className="text-xs text-zinc-500">
                                                {formatDate(c.date)} | {c.shift === 'morning' ? '☀️' : '🌙'}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="payments" className="mt-4">
                    {ledger.payments.length === 0 ? (
                        <div className="empty-state py-8">
                            <div className="empty-state-icon">
                                <CreditCard className="w-8 h-8" />
                            </div>
                            <p className="font-hindi">{texts.noRecords}</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {ledger.payments.map((p) => (
                                <Card key={p.id}>
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                            <CreditCard className="w-5 h-5 text-emerald-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-emerald-700">
                                                {formatCurrency(p.amount)}
                                            </p>
                                            <p className="text-sm text-zinc-500">
                                                {p.payment_mode.toUpperCase()} {p.notes && `• ${p.notes}`}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-zinc-500">
                                                {formatDate(p.date)}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Payment Dialog */}
            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
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

                    <form onSubmit={handlePayment} className="space-y-4">
                        <div className="p-4 bg-zinc-50 rounded-xl">
                            <p className="text-sm text-zinc-500 mb-1">{texts.balance}</p>
                            <p className={cn(
                                "text-2xl font-bold font-heading",
                                farmer.balance > 0 ? "text-orange-600" : "text-emerald-600"
                            )}>
                                {formatCurrency(farmer.balance)}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-hindi">{texts.amount} *</Label>
                            <Input
                                type="number"
                                step="1"
                                value={paymentData.amount}
                                onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                                data-testid="payment-amount-input"
                                placeholder="0"
                                className="h-12 text-lg"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="font-hindi">{texts.paymentMode}</Label>
                            <Select
                                value={paymentData.payment_mode}
                                onValueChange={(value) => setPaymentData(prev => ({ ...prev, payment_mode: value }))}
                            >
                                <SelectTrigger className="h-12" data-testid="payment-mode-select">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">{texts.cash}</SelectItem>
                                    <SelectItem value="upi">{texts.upi}</SelectItem>
                                    <SelectItem value="bank">{texts.bank}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-hindi">{texts.notes}</Label>
                            <Input
                                value={paymentData.notes}
                                onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                                data-testid="payment-notes-input"
                                placeholder={language === 'hi' ? 'वैकल्पिक टिप्पणी' : 'Optional notes'}
                                className="h-12"
                            />
                        </div>

                        <Button
                            type="submit"
                            data-testid="submit-payment"
                            className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 font-hindi text-base"
                            disabled={submitting}
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

export default FarmerDetailPage;
