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
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [editData, setEditData] = useState({
        name: '', phone: '', village: '', address: '',
        bank_account: '', ifsc_code: '', aadhar_number: '',
        milk_type: 'cow', fixed_rate: '', cow_rate: '', buffalo_rate: '',
    });

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
        edit: language === 'hi' ? 'संपादन' : 'Edit',
        editFarmer: language === 'hi' ? 'किसान संपादित करें' : 'Edit Farmer',
        milkType: language === 'hi' ? 'दूध का प्रकार' : 'Milk Type',
        fixedRate: language === 'hi' ? 'निश्चित दर (₹/L)' : 'Fixed Rate (₹/L)',
        village: language === 'hi' ? 'गाँव' : 'Village',
        nameLabel: language === 'hi' ? 'नाम' : 'Name',
        phoneLabel: language === 'hi' ? 'फ़ोन' : 'Phone',
        addressLabel: language === 'hi' ? 'पता' : 'Address',
        updated: language === 'hi' ? 'किसान अपडेट हुआ!' : 'Farmer updated!',
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

    const openEditDialog = () => {
        if (farmer) {
            setEditData({
                name: farmer.name || '',
                phone: farmer.phone || '',
                village: farmer.village || '',
                address: farmer.address || '',
                bank_account: farmer.bank_account || '',
                ifsc_code: farmer.ifsc_code || '',
                aadhar_number: farmer.aadhar_number || '',
                milk_type: farmer.milk_type || 'cow',
                fixed_rate: farmer.fixed_rate || '',
                cow_rate: farmer.cow_rate || '',
                buffalo_rate: farmer.buffalo_rate || '',
            });
            setShowEditDialog(true);
        }
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        if (!editData.name || !editData.phone) {
            toast.error(language === 'hi' ? 'नाम और फ़ोन आवश्यक है' : 'Name and phone required');
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                ...editData,
                fixed_rate: editData.fixed_rate ? parseFloat(editData.fixed_rate) : null,
                cow_rate: editData.cow_rate ? parseFloat(editData.cow_rate) : null,
                buffalo_rate: editData.buffalo_rate ? parseFloat(editData.buffalo_rate) : null,
            };
            await farmerAPI.update(id, payload);
            setShowEditDialog(false);
            toast.success(texts.updated);
            fetchFarmerData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error updating farmer');
        } finally {
            setSubmitting(false);
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
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="font-heading text-2xl font-bold text-zinc-900">
                            {farmer.name}
                        </h1>
                        <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-bold uppercase",
                            farmer.milk_type === 'buffalo' ? "bg-amber-100 text-amber-700" :
                            farmer.milk_type === 'mix' ? "bg-purple-100 text-purple-700" :
                            "bg-blue-100 text-blue-700"
                        )}>
                            {farmer.milk_type === 'buffalo' ? (language === 'hi' ? 'भैंस' : 'Buffalo') :
                             farmer.milk_type === 'mix' ? (language === 'hi' ? 'मिक्स' : 'Mix') :
                             (language === 'hi' ? 'गाय' : 'Cow')}
                        </span>
                        {farmer.fixed_rate && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700" data-testid="fixed-rate-badge">
                                {language === 'hi' ? 'निश्चित दर' : 'Fixed'}: ₹{farmer.fixed_rate}/L
                            </span>
                        )}
                    </div>
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
                    <Button variant="outline" size="sm" onClick={openEditDialog} data-testid="edit-farmer-btn"
                        className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 h-8 text-xs">
                        <Edit className="w-3 h-3 mr-1" />{texts.edit}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleWhatsAppShare} data-testid="whatsapp-share-btn"
                        className="border-green-200 text-green-700 hover:bg-green-50 h-8 text-xs">
                        <Share2 className="w-3 h-3 mr-1" />WA
                    </Button>
                    <Button variant="outline" size="sm" onClick={openThermalBill} data-testid="thermal-bill-btn"
                        className="border-orange-200 text-orange-700 hover:bg-orange-50 h-8 text-xs">
                        <Printer className="w-3 h-3 mr-1" />{language === 'hi' ? 'थर्मल' : 'Thermal'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={openA4Invoice} data-testid="a4-invoice-btn"
                        className="border-blue-200 text-blue-700 hover:bg-blue-50 h-8 text-xs">
                        <FileText className="w-3 h-3 mr-1" />A4
                    </Button>
                    <Button size="sm" onClick={() => setShowPaymentDialog(true)} data-testid="make-payment-btn"
                        className="bg-emerald-700 hover:bg-emerald-800 h-8 text-xs">
                        <Plus className="w-3 h-3 mr-1" />{texts.makePayment}
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

            {/* Edit Farmer Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-heading flex items-center gap-2">
                            <Edit className="w-5 h-5 text-emerald-600" />
                            {texts.editFarmer}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground">
                            {language === 'hi' ? 'किसान की जानकारी अपडेट करें' : 'Update farmer details'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>{texts.nameLabel} *</Label>
                            <Input value={editData.name} onChange={(e) => setEditData(p => ({...p, name: e.target.value}))}
                                data-testid="edit-farmer-name" className="h-12" required />
                        </div>
                        <div className="space-y-2">
                            <Label>{texts.phoneLabel} *</Label>
                            <Input type="tel" value={editData.phone} onChange={(e) => setEditData(p => ({...p, phone: e.target.value}))}
                                data-testid="edit-farmer-phone" className="h-12" required />
                        </div>
                        <div className="space-y-2">
                            <Label>{texts.village}</Label>
                            <Input value={editData.village} onChange={(e) => setEditData(p => ({...p, village: e.target.value}))}
                                data-testid="edit-farmer-village" className="h-12" />
                        </div>
                        <div className="space-y-2">
                            <Label>{texts.addressLabel}</Label>
                            <Input value={editData.address} onChange={(e) => setEditData(p => ({...p, address: e.target.value}))}
                                data-testid="edit-farmer-address" className="h-12" />
                        </div>
                        <div className="border-t pt-4">
                            <p className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
                                <Milk className="w-4 h-4 text-emerald-600" /> {texts.milkType}
                            </p>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {[{value:'cow',en:'Cow',hi:'गाय'},{value:'buffalo',en:'Buffalo',hi:'भैंस'},{value:'mix',en:'Mix',hi:'मिक्स'}].map(mt => (
                                    <button key={mt.value} type="button"
                                        onClick={() => setEditData(p => ({...p, milk_type: mt.value}))}
                                        data-testid={`edit-milk-type-${mt.value}`}
                                        className={cn("py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all",
                                            editData.milk_type === mt.value ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
                                        )}>{language === 'hi' ? mt.hi : mt.en}</button>
                                ))}
                            </div>
                            <div className="space-y-2">
                                <Label>{texts.fixedRate}</Label>
                                <Input type="number" step="0.5" value={editData.fixed_rate}
                                    onChange={(e) => setEditData(p => ({...p, fixed_rate: e.target.value}))}
                                    data-testid="edit-farmer-fixed-rate" className="h-12" />
                            </div>
                        </div>
                        <div className="border-t pt-4">
                            <p className="text-sm font-semibold text-zinc-700 mb-3">{texts.bankDetails}</p>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>{texts.accountNo}</Label>
                                    <Input value={editData.bank_account} onChange={(e) => setEditData(p => ({...p, bank_account: e.target.value}))}
                                        data-testid="edit-farmer-bank" className="h-12" />
                                </div>
                                <div className="space-y-2">
                                    <Label>{texts.ifscCode}</Label>
                                    <Input value={editData.ifsc_code} onChange={(e) => setEditData(p => ({...p, ifsc_code: e.target.value.toUpperCase()}))}
                                        data-testid="edit-farmer-ifsc" className="h-12" />
                                </div>
                                <div className="space-y-2">
                                    <Label>{texts.aadhar}</Label>
                                    <Input value={editData.aadhar_number} onChange={(e) => setEditData(p => ({...p, aadhar_number: e.target.value}))}
                                        data-testid="edit-farmer-aadhar" className="h-12" />
                                </div>
                            </div>
                        </div>
                        <Button type="submit" data-testid="submit-edit-farmer"
                            className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 font-hindi text-base" disabled={submitting}>
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : texts.save}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default FarmerDetailPage;
