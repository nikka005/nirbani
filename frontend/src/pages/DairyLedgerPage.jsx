import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dairyPlantAPI, dairyPaymentAPI } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
    Factory, Plus, Loader2, Wallet, Truck, CreditCard, Check, Weight, Printer
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const DairyLedgerPage = () => {
    const { language } = useAuth();
    const t = (en, hi) => language === 'hi' ? hi : en;
    const [plants, setPlants] = useState([]);
    const [selectedPlant, setSelectedPlant] = useState(null);
    const [ledger, setLedger] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [paymentForm, setPaymentForm] = useState({ amount: '', payment_mode: 'bank', reference_number: '', notes: '' });

    useEffect(() => { fetchPlants(); }, []);

    const fetchPlants = async () => {
        try {
            const res = await dairyPlantAPI.getAll();
            setPlants(res.data);
            if (res.data.length > 0) {
                setSelectedPlant(res.data[0].id);
                await fetchLedger(res.data[0].id);
            }
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    const fetchLedger = async (plantId) => {
        try {
            const res = await dairyPlantAPI.getLedger(plantId);
            setLedger(res.data);
        } catch (error) { console.error(error); }
    };

    const handlePlantChange = async (plantId) => {
        setSelectedPlant(plantId);
        setLoading(true);
        await fetchLedger(plantId);
        setLoading(false);
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
            toast.error(t('Enter valid amount', 'सही राशि दर्ज करें')); return;
        }
        setSubmitting(true);
        try {
            await dairyPaymentAPI.create({
                dairy_plant_id: selectedPlant,
                amount: parseFloat(paymentForm.amount),
                payment_mode: paymentForm.payment_mode,
                reference_number: paymentForm.reference_number,
                notes: paymentForm.notes,
            });
            setPaymentForm({ amount: '', payment_mode: 'bank', reference_number: '', notes: '' });
            setShowPayment(false);
            toast.success(t('Payment recorded!', 'भुगतान दर्ज हुआ!'));
            fetchPlants();
            fetchLedger(selectedPlant);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error');
        } finally { setSubmitting(false); }
    };

    const handlePrintStatement = async () => {
        if (!selectedPlant) return;
        try {
            const res = await dairyPlantAPI.getStatement(selectedPlant, {});
            const printWindow = window.open('', '_blank');
            printWindow.document.write(res.data.html);
            printWindow.document.close();
            printWindow.print();
        } catch (error) { toast.error(t('Print error', 'प्रिंट त्रुटि')); }
    };

    const plant = ledger?.plant;

    if (loading && !ledger) {
        return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
    }

    if (plants.length === 0) {
        return (
            <div className="p-8 text-center">
                <Factory className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
                <p className="text-zinc-500 mb-2">{t('No dairy plants added yet', 'अभी कोई डेयरी प्लांट नहीं जोड़ा')}</p>
                <p className="text-sm text-zinc-400">{t('Go to Dairy Dispatch to add your first dairy plant', 'पहले डेयरी डिस्पैच में जाकर डेयरी प्लांट जोड़ें')}</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="font-heading text-xl sm:text-2xl font-bold text-zinc-900">{t('Dairy Ledger', 'डेयरी खाता')}</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">{t('Track dairy plant accounts', 'डेयरी प्लांट खातों की निगरानी')}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Select value={selectedPlant || ''} onValueChange={handlePlantChange}>
                        <SelectTrigger className="h-9 w-36 sm:w-48 text-xs sm:text-sm" data-testid="ledger-plant-select"><SelectValue /></SelectTrigger>
                        <SelectContent>{plants.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button onClick={() => setShowPayment(true)} data-testid="record-dairy-payment" className="bg-emerald-700 hover:bg-emerald-800 h-9 text-xs sm:text-sm">
                        <Plus className="w-4 h-4 mr-1" />{t('Payment', 'भुगतान')}
                    </Button>
                    <Button variant="outline" onClick={handlePrintStatement} data-testid="print-statement" className="h-9 text-xs sm:text-sm">
                        <Printer className="w-4 h-4 mr-1" />{t('Print', 'प्रिंट')}
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            {plant && (
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-1"><Weight className="w-4 h-4 text-blue-600" /><span className="text-xs text-blue-600 font-semibold">{t('Total Supplied', 'कुल आपूर्ति')}</span></div>
                            <p className="text-2xl font-bold text-blue-700" data-testid="total-supplied">{plant.total_milk_supplied.toFixed(1)} KG</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-amber-50 border-amber-200">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-1"><Truck className="w-4 h-4 text-amber-600" /><span className="text-xs text-amber-600 font-semibold">{t('Total Amount', 'कुल राशि')}</span></div>
                            <p className="text-2xl font-bold text-amber-700">{formatCurrency(plant.total_amount)}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-emerald-50 border-emerald-200">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-1"><CreditCard className="w-4 h-4 text-emerald-600" /><span className="text-xs text-emerald-600 font-semibold">{t('Total Paid', 'कुल भुगतान')}</span></div>
                            <p className="text-2xl font-bold text-emerald-700">{formatCurrency(plant.total_paid)}</p>
                        </CardContent>
                    </Card>
                    <Card className={plant.balance > 0 ? "bg-orange-50 border-orange-200" : "bg-green-50 border-green-200"}>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-1"><Wallet className={cn("w-4 h-4", plant.balance > 0 ? "text-orange-600" : "text-green-600")} /><span className={cn("text-xs font-semibold", plant.balance > 0 ? "text-orange-600" : "text-green-600")}>{t('Balance Due', 'बकाया')}</span></div>
                            <p className={cn("text-2xl font-bold", plant.balance > 0 ? "text-orange-700" : "text-green-700")} data-testid="dairy-balance">{formatCurrency(plant.balance)}</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tabs: Dispatches & Payments */}
            <Tabs defaultValue="dispatches">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="dispatches" data-testid="ledger-dispatches-tab">
                        <Truck className="w-4 h-4 mr-2" />{t('Dispatches', 'डिस्पैच')} ({ledger?.dispatches?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="payments" data-testid="ledger-payments-tab">
                        <CreditCard className="w-4 h-4 mr-2" />{t('Payments', 'भुगतान')} ({ledger?.payments?.length || 0})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="dispatches" className="mt-4">
                    {!ledger?.dispatches?.length ? (
                        <div className="text-center py-12"><Truck className="w-12 h-12 text-zinc-300 mx-auto mb-3" /><p className="text-zinc-500">{t('No dispatches', 'कोई डिस्पैच नहीं')}</p></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader><TableRow>
                                    <TableHead>{t('Date', 'तारीख')}</TableHead>
                                    <TableHead>{t('Tanker', 'टैंकर')}</TableHead>
                                    <TableHead>{t('Qty (KG)', 'मात्रा')}</TableHead>
                                    <TableHead>FAT%</TableHead>
                                    <TableHead>SNF%</TableHead>
                                    <TableHead>{t('Rate', 'दर')}</TableHead>
                                    <TableHead>{t('Deduction', 'कटौती')}</TableHead>
                                    <TableHead className="text-right">{t('Net Amount', 'शुद्ध राशि')}</TableHead>
                                    <TableHead>{t('Slip', 'स्लिप')}</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                    {ledger.dispatches.map(d => (
                                        <TableRow key={d.id}>
                                            <TableCell className="text-sm">{d.date}</TableCell>
                                            <TableCell className="text-xs">{d.tanker_number || '-'}</TableCell>
                                            <TableCell className="font-semibold">{d.quantity_kg}</TableCell>
                                            <TableCell>{d.avg_fat}%</TableCell>
                                            <TableCell>{d.avg_snf}%</TableCell>
                                            <TableCell>₹{d.rate_per_kg}</TableCell>
                                            <TableCell className="text-red-600">{d.total_deduction > 0 ? `-₹${d.total_deduction}` : '-'}</TableCell>
                                            <TableCell className="text-right font-semibold text-emerald-700">{formatCurrency(d.net_receivable)}</TableCell>
                                            <TableCell>{d.slip_matched ? <Check className="w-4 h-4 text-green-600" /> : <span className="text-xs text-amber-600">{t('Pending', 'बाकी')}</span>}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="payments" className="mt-4">
                    {!ledger?.payments?.length ? (
                        <div className="text-center py-12"><CreditCard className="w-12 h-12 text-zinc-300 mx-auto mb-3" /><p className="text-zinc-500">{t('No payments', 'कोई भुगतान नहीं')}</p></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader><TableRow>
                                    <TableHead>{t('Date', 'तारीख')}</TableHead>
                                    <TableHead>{t('Mode', 'माध्यम')}</TableHead>
                                    <TableHead>{t('Reference', 'संदर्भ')}</TableHead>
                                    <TableHead>{t('Notes', 'नोट्स')}</TableHead>
                                    <TableHead className="text-right">{t('Amount', 'राशि')}</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                    {ledger.payments.map(p => (
                                        <TableRow key={p.id}>
                                            <TableCell>{p.date}</TableCell>
                                            <TableCell className="uppercase text-xs font-semibold">{p.payment_mode}</TableCell>
                                            <TableCell className="text-xs">{p.reference_number || '-'}</TableCell>
                                            <TableCell className="text-sm">{p.notes || '-'}</TableCell>
                                            <TableCell className="text-right font-semibold text-emerald-700">{formatCurrency(p.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Payment Dialog */}
            <Dialog open={showPayment} onOpenChange={setShowPayment}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Wallet className="w-5 h-5 text-emerald-600" />{t('Record Payment', 'भुगतान दर्ज करें')}</DialogTitle>
                        <DialogDescription>{plant?.name} - {t('Balance', 'बकाया')}: {formatCurrency(plant?.balance || 0)}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handlePayment} className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('Amount (₹)', 'राशि (₹)')} *</Label>
                            <Input type="number" step="0.01" value={paymentForm.amount}
                                onChange={(e) => setPaymentForm(p => ({...p, amount: e.target.value}))}
                                className="h-12 text-lg" data-testid="dairy-payment-amount" required />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Mode', 'माध्यम')}</Label>
                            <Select value={paymentForm.payment_mode} onValueChange={(v) => setPaymentForm(p => ({...p, payment_mode: v}))}>
                                <SelectTrigger className="h-12" data-testid="dairy-payment-mode"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="bank">{t('Bank Transfer', 'बैंक')}</SelectItem>
                                    <SelectItem value="cheque">{t('Cheque', 'चेक')}</SelectItem>
                                    <SelectItem value="upi">UPI</SelectItem>
                                    <SelectItem value="cash">{t('Cash', 'नकद')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Reference Number', 'संदर्भ नंबर')}</Label>
                            <Input value={paymentForm.reference_number} onChange={(e) => setPaymentForm(p => ({...p, reference_number: e.target.value}))}
                                placeholder={t('Cheque/UTR number', 'चेक/UTR नंबर')} className="h-12" data-testid="dairy-payment-ref" />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Notes', 'नोट्स')}</Label>
                            <Input value={paymentForm.notes} onChange={(e) => setPaymentForm(p => ({...p, notes: e.target.value}))} className="h-12" />
                        </div>
                        <Button type="submit" className="w-full h-12 bg-emerald-700 hover:bg-emerald-800" disabled={submitting} data-testid="submit-dairy-payment">
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('Record Payment', 'भुगतान दर्ज करें')}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DairyLedgerPage;
