import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dairyPlantAPI, dispatchAPI, collectionAPI } from '../lib/api';
import { formatCurrency, getTodayDate } from '../lib/utils';
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
    Truck, Plus, Loader2, Trash2, Factory, Droplets, Weight,
    AlertTriangle, Check, Calculator, X
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const DEDUCTION_TYPES = [
    { value: 'transport', en: 'Transport', hi: 'ट्रांसपोर्ट' },
    { value: 'quality_penalty', en: 'Quality Penalty', hi: 'गुणवत्ता जुर्माना' },
    { value: 'commission', en: 'Commission', hi: 'कमीशन' },
    { value: 'testing_charges', en: 'Testing Charges', hi: 'टेस्टिंग शुल्क' },
    { value: 'other', en: 'Other', hi: 'अन्य' },
];

const DairyDispatchPage = () => {
    const { language } = useAuth();
    const t = (en, hi) => language === 'hi' ? hi : en;
    const [plants, setPlants] = useState([]);
    const [dispatches, setDispatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showAddPlant, setShowAddPlant] = useState(false);
    const [showAddDispatch, setShowAddDispatch] = useState(false);
    const [showSlipMatch, setShowSlipMatch] = useState(null);
    const [selectedDate, setSelectedDate] = useState(getTodayDate());
    const [todayCollectionStats, setTodayCollectionStats] = useState({ totalQty: 0, avgFat: 0, avgSnf: 0 });

    const [plantForm, setPlantForm] = useState({ name: '', code: '', address: '', phone: '', contact_person: '' });
    const [dispatchForm, setDispatchForm] = useState({
        dairy_plant_id: '', tanker_number: '', quantity_kg: '', avg_fat: '', avg_snf: '',
        clr: '', rate_per_kg: '', notes: '',
    });
    const [deductions, setDeductions] = useState([]);
    const [slipForm, setSlipForm] = useState({ slip_fat: '', slip_snf: '', slip_amount: '', slip_deductions: '' });

    useEffect(() => { fetchData(); }, [selectedDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [plantsRes, dispatchRes] = await Promise.all([
                dairyPlantAPI.getAll(),
                dispatchAPI.getAll({ start_date: selectedDate, end_date: selectedDate }),
            ]);
            setPlants(plantsRes.data);
            setDispatches(dispatchRes.data);

            // Get today's collection stats for auto-fill
            const colRes = await collectionAPI.getAll({ date: selectedDate });
            const cols = colRes.data || [];
            const totalQty = cols.reduce((s, c) => s + c.quantity, 0);
            const wFat = cols.reduce((s, c) => s + c.fat * c.quantity, 0);
            const wSnf = cols.reduce((s, c) => s + c.snf * c.quantity, 0);
            setTodayCollectionStats({
                totalQty: Math.round(totalQty * 10) / 10,
                totalKg: Math.round(totalQty * 1.03 * 10) / 10,
                avgFat: totalQty > 0 ? Math.round(wFat / totalQty * 100) / 100 : 0,
                avgSnf: totalQty > 0 ? Math.round(wSnf / totalQty * 100) / 100 : 0,
            });
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPlant = async (e) => {
        e.preventDefault();
        if (!plantForm.name) { toast.error(t('Name required', 'नाम आवश्यक है')); return; }
        setSubmitting(true);
        try {
            const res = await dairyPlantAPI.create(plantForm);
            setPlants(prev => [...prev, res.data]);
            setPlantForm({ name: '', code: '', address: '', phone: '', contact_person: '' });
            setShowAddPlant(false);
            toast.success(t('Dairy plant added!', 'डेयरी प्लांट जोड़ा गया!'));
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error');
        } finally { setSubmitting(false); }
    };

    const autoFillFromCollection = () => {
        setDispatchForm(prev => ({
            ...prev,
            quantity_kg: todayCollectionStats.totalKg?.toString() || '',
            avg_fat: todayCollectionStats.avgFat?.toString() || '',
            avg_snf: todayCollectionStats.avgSnf?.toString() || '',
        }));
        toast.success(t('Auto-filled from today\'s collection', 'आज के संग्रह से ऑटो-भरा'));
    };

    const handleAddDispatch = async (e) => {
        e.preventDefault();
        if (!dispatchForm.dairy_plant_id || !dispatchForm.quantity_kg || !dispatchForm.rate_per_kg) {
            toast.error(t('Fill required fields', 'आवश्यक फ़ील्ड भरें')); return;
        }
        setSubmitting(true);
        try {
            const payload = {
                dairy_plant_id: dispatchForm.dairy_plant_id,
                date: selectedDate,
                tanker_number: dispatchForm.tanker_number,
                quantity_kg: parseFloat(dispatchForm.quantity_kg),
                avg_fat: parseFloat(dispatchForm.avg_fat || 0),
                avg_snf: parseFloat(dispatchForm.avg_snf || 0),
                clr: dispatchForm.clr ? parseFloat(dispatchForm.clr) : null,
                rate_per_kg: parseFloat(dispatchForm.rate_per_kg),
                deductions: deductions.filter(d => d.amount > 0),
                notes: dispatchForm.notes,
            };
            await dispatchAPI.create(payload);
            setDispatchForm({ dairy_plant_id: '', tanker_number: '', quantity_kg: '', avg_fat: '', avg_snf: '', clr: '', rate_per_kg: '', notes: '' });
            setDeductions([]);
            setShowAddDispatch(false);
            toast.success(t('Dispatch recorded!', 'डिस्पैच दर्ज हुआ!'));
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error');
        } finally { setSubmitting(false); }
    };

    const handleSlipMatch = async (e) => {
        e.preventDefault();
        if (!slipForm.slip_fat || !slipForm.slip_amount) {
            toast.error(t('Fill slip details', 'स्लिप विवरण भरें')); return;
        }
        setSubmitting(true);
        try {
            await dispatchAPI.matchSlip(showSlipMatch, {
                slip_fat: parseFloat(slipForm.slip_fat),
                slip_snf: parseFloat(slipForm.slip_snf || 0),
                slip_amount: parseFloat(slipForm.slip_amount),
                slip_deductions: parseFloat(slipForm.slip_deductions || 0),
            });
            setShowSlipMatch(null);
            setSlipForm({ slip_fat: '', slip_snf: '', slip_amount: '', slip_deductions: '' });
            toast.success(t('Slip matched!', 'स्लिप मैच हुई!'));
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error');
        } finally { setSubmitting(false); }
    };

    const handleDeleteDispatch = async (id) => {
        if (!window.confirm(t('Delete this dispatch?', 'यह डिस्पैच हटाएं?'))) return;
        try {
            await dispatchAPI.delete(id);
            toast.success(t('Deleted', 'हटाया गया'));
            fetchData();
        } catch (error) { toast.error('Error'); }
    };

    const addDeduction = () => setDeductions(prev => [...prev, { type: 'transport', amount: 0, notes: '' }]);
    const removeDeduction = (idx) => setDeductions(prev => prev.filter((_, i) => i !== idx));
    const updateDeduction = (idx, field, value) => setDeductions(prev => prev.map((d, i) => i === idx ? { ...d, [field]: field === 'amount' ? parseFloat(value || 0) : value } : d));

    const totalDispatchQty = dispatches.reduce((s, d) => s + d.quantity_kg, 0);
    const totalDispatchAmount = dispatches.reduce((s, d) => s + d.net_receivable, 0);
    const milkDiff = todayCollectionStats.totalKg - totalDispatchQty;
    const milkLossPercent = todayCollectionStats.totalKg > 0 ? ((milkDiff / todayCollectionStats.totalKg) * 100).toFixed(1) : 0;

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="font-heading text-xl sm:text-2xl font-bold text-zinc-900">{t('Dairy Dispatch', 'डेयरी डिस्पैच')}</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">{t('Bulk milk dispatch to dairy plants', 'डेयरी प्लांट को दूध डिस्पैच')}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-9 w-auto text-sm" data-testid="dispatch-date" />
                    {plants.length === 0 ? (
                        <Button onClick={() => setShowAddPlant(true)} data-testid="add-plant-btn" className="bg-blue-600 hover:bg-blue-700 h-9">
                            <Factory className="w-4 h-4 mr-1" />{t('Add Dairy', 'डेयरी जोड़ें')}
                        </Button>
                    ) : (
                        <Button onClick={() => setShowAddDispatch(true)} data-testid="add-dispatch-btn" className="bg-emerald-700 hover:bg-emerald-800 h-9">
                            <Truck className="w-4 h-4 mr-1" />{t('New Dispatch', 'नया डिस्पैच')}
                        </Button>
                    )}
                </div>
            </div>

            {/* Dairy Plants */}
            {plants.length > 0 && (
                <div className="flex items-center gap-3 flex-wrap">
                    {plants.map(p => (
                        <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
                            <Factory className="w-4 h-4 text-blue-600" />
                            <span className="font-semibold text-sm text-blue-800">{p.name}</span>
                            <span className="text-xs text-blue-500">{t('Balance', 'बकाया')}: {formatCurrency(p.balance)}</span>
                        </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setShowAddPlant(true)} data-testid="add-more-plant" className="h-8">
                        <Plus className="w-3 h-3 mr-1" />{t('Add', 'जोड़ें')}
                    </Button>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-emerald-50 border-emerald-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Weight className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs text-emerald-600 font-semibold">{t('Collected (KG)', 'संग्रह (KG)')}</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-700" data-testid="collected-kg">{todayCollectionStats.totalKg || 0}</p>
                        <p className="text-xs text-emerald-500">FAT: {todayCollectionStats.avgFat}%</p>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Truck className="w-4 h-4 text-blue-600" />
                            <span className="text-xs text-blue-600 font-semibold">{t('Dispatched (KG)', 'डिस्पैच (KG)')}</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-700" data-testid="dispatched-kg">{totalDispatchQty.toFixed(1)}</p>
                        <p className="text-xs text-blue-500">{formatCurrency(totalDispatchAmount)}</p>
                    </CardContent>
                </Card>
                <Card className={cn("border", milkLossPercent > 1 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200")}>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            {milkLossPercent > 1 ? <AlertTriangle className="w-4 h-4 text-red-600" /> : <Droplets className="w-4 h-4 text-amber-600" />}
                            <span className={cn("text-xs font-semibold", milkLossPercent > 1 ? "text-red-600" : "text-amber-600")}>{t('Milk Diff', 'दूध अंतर')}</span>
                        </div>
                        <p className={cn("text-2xl font-bold", milkLossPercent > 1 ? "text-red-700" : "text-amber-700")} data-testid="milk-diff">{milkDiff.toFixed(1)} KG</p>
                        <p className={cn("text-xs", milkLossPercent > 1 ? "text-red-500" : "text-amber-500")}>{milkLossPercent}% {milkLossPercent > 1 ? t('ALERT!', 'चेतावनी!') : ''}</p>
                    </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Droplets className="w-4 h-4 text-purple-600" />
                            <span className="text-xs text-purple-600 font-semibold">{t('Avg FAT', 'औसत FAT')}</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-700">{todayCollectionStats.avgFat}%</p>
                        <p className="text-xs text-purple-500">SNF: {todayCollectionStats.avgSnf}%</p>
                    </CardContent>
                </Card>
            </div>

            {/* Dispatch List */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-heading text-lg flex items-center gap-2">
                        <Truck className="w-5 h-5 text-emerald-600" />
                        {t('Dispatch Entries', 'डिस्पैच प्रविष्टियाँ')} ({dispatches.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
                    ) : dispatches.length === 0 ? (
                        <div className="text-center py-12">
                            <Truck className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                            <p className="text-zinc-500">{t('No dispatches today', 'आज कोई डिस्पैच नहीं')}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {dispatches.map(d => (
                                <div key={d.id} data-testid={`dispatch-${d.id}`}
                                    className="p-4 rounded-xl border bg-white hover:shadow-sm transition-shadow">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className="font-bold text-zinc-900">{d.dairy_plant_name}</span>
                                                {d.tanker_number && <span className="px-2 py-0.5 bg-zinc-100 rounded text-xs">{d.tanker_number}</span>}
                                                {d.slip_matched ? (
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold flex items-center gap-1">
                                                        <Check className="w-3 h-3" />{t('Slip Matched', 'स्लिप मैच')}
                                                    </span>
                                                ) : (
                                                    <button onClick={() => { setShowSlipMatch(d.id); setSlipForm({ slip_fat: '', slip_snf: '', slip_amount: '', slip_deductions: '' }); }}
                                                        className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-semibold hover:bg-amber-200 cursor-pointer"
                                                        data-testid={`slip-match-${d.id}`}>
                                                        {t('Match Slip', 'स्लिप मैच करें')}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-zinc-600 flex-wrap">
                                                <span className="font-semibold">{d.quantity_kg} KG</span>
                                                <span>FAT: {d.avg_fat}%</span>
                                                <span>SNF: {d.avg_snf}%</span>
                                                <span>@₹{d.rate_per_kg}/KG</span>
                                            </div>
                                            {d.total_deduction > 0 && (
                                                <p className="text-xs text-red-500 mt-1">{t('Deductions', 'कटौती')}: -{formatCurrency(d.total_deduction)}</p>
                                            )}
                                            {d.slip_matched && d.amount_difference !== 0 && (
                                                <p className={cn("text-xs mt-1 font-semibold", d.amount_difference > 0 ? "text-red-600" : "text-green-600")}>
                                                    {t('Slip Diff', 'स्लिप अंतर')}: {formatCurrency(Math.abs(d.amount_difference))} {d.amount_difference > 0 ? t('(Your favor)', '(आपके पक्ष में)') : t('(Dairy favor)', '(डेयरी पक्ष में)')}
                                                    {d.fat_difference !== 0 && ` | FAT Diff: ${d.fat_difference}`}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-lg font-bold text-emerald-700">{formatCurrency(d.net_receivable)}</p>
                                            {d.gross_amount !== d.net_receivable && (
                                                <p className="text-xs text-zinc-400 line-through">{formatCurrency(d.gross_amount)}</p>
                                            )}
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteDispatch(d.id)} className="text-zinc-300 hover:text-red-500 shrink-0">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Dairy Plant Dialog */}
            <Dialog open={showAddPlant} onOpenChange={setShowAddPlant}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Factory className="w-5 h-5 text-blue-600" />{t('Add Dairy Plant', 'डेयरी प्लांट जोड़ें')}</DialogTitle>
                        <DialogDescription>{t('Add milk buyer dairy plant', 'दूध खरीदार डेयरी प्लांट जोड़ें')}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddPlant} className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('Name', 'नाम')} *</Label>
                            <Input value={plantForm.name} onChange={(e) => setPlantForm(p => ({...p, name: e.target.value}))}
                                placeholder={t('e.g. Sabar Dairy', 'जैसे सबर डेयरी')} className="h-12" data-testid="plant-name" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('Code', 'कोड')}</Label>
                                <Input value={plantForm.code} onChange={(e) => setPlantForm(p => ({...p, code: e.target.value}))} placeholder="SD01" className="h-12" />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Phone', 'फ़ोन')}</Label>
                                <Input value={plantForm.phone} onChange={(e) => setPlantForm(p => ({...p, phone: e.target.value}))} className="h-12" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Contact Person', 'संपर्क व्यक्ति')}</Label>
                            <Input value={plantForm.contact_person} onChange={(e) => setPlantForm(p => ({...p, contact_person: e.target.value}))} className="h-12" />
                        </div>
                        <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700" disabled={submitting} data-testid="submit-plant">
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('Save', 'सहेजें')}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Add Dispatch Dialog */}
            <Dialog open={showAddDispatch} onOpenChange={setShowAddDispatch}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Truck className="w-5 h-5 text-emerald-600" />{t('New Dispatch', 'नया डिस्पैच')}</DialogTitle>
                        <DialogDescription>{t('Record milk dispatch to dairy plant', 'डेयरी प्लांट को दूध डिस्पैच दर्ज करें')}</DialogDescription>
                    </DialogHeader>

                    {/* Auto-fill banner */}
                    {todayCollectionStats.totalKg > 0 && (
                        <button onClick={autoFillFromCollection} type="button" data-testid="auto-fill-btn"
                            className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 hover:bg-blue-100 transition-colors text-left">
                            <Calculator className="w-5 h-5 text-blue-600 shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-blue-700">{t('Auto-fill from Collection', 'संग्रह से ऑटो-भरें')}</p>
                                <p className="text-xs text-blue-500">{todayCollectionStats.totalKg} KG | FAT: {todayCollectionStats.avgFat}% | SNF: {todayCollectionStats.avgSnf}%</p>
                            </div>
                        </button>
                    )}

                    <form onSubmit={handleAddDispatch} className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('Dairy Plant', 'डेयरी प्लांट')} *</Label>
                            <Select value={dispatchForm.dairy_plant_id} onValueChange={(v) => setDispatchForm(p => ({...p, dairy_plant_id: v}))}>
                                <SelectTrigger className="h-12" data-testid="dispatch-plant-select"><SelectValue placeholder={t('Select dairy', 'डेयरी चुनें')} /></SelectTrigger>
                                <SelectContent>{plants.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('Tanker No.', 'टैंकर नं.')}</Label>
                                <Input value={dispatchForm.tanker_number} onChange={(e) => setDispatchForm(p => ({...p, tanker_number: e.target.value}))}
                                    placeholder="RJ-XX-XXXX" className="h-12" data-testid="tanker-number" />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Quantity (KG)', 'मात्रा (KG)')} *</Label>
                                <Input type="number" step="0.1" value={dispatchForm.quantity_kg}
                                    onChange={(e) => setDispatchForm(p => ({...p, quantity_kg: e.target.value}))}
                                    className="h-12" data-testid="dispatch-qty" required />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-2">
                                <Label>FAT %</Label>
                                <Input type="number" step="0.01" value={dispatchForm.avg_fat}
                                    onChange={(e) => setDispatchForm(p => ({...p, avg_fat: e.target.value}))}
                                    className="h-12" data-testid="dispatch-fat" />
                            </div>
                            <div className="space-y-2">
                                <Label>SNF %</Label>
                                <Input type="number" step="0.01" value={dispatchForm.avg_snf}
                                    onChange={(e) => setDispatchForm(p => ({...p, avg_snf: e.target.value}))}
                                    className="h-12" data-testid="dispatch-snf" />
                            </div>
                            <div className="space-y-2">
                                <Label>CLR</Label>
                                <Input type="number" step="0.1" value={dispatchForm.clr}
                                    onChange={(e) => setDispatchForm(p => ({...p, clr: e.target.value}))}
                                    className="h-12" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Rate per KG (₹)', 'दर प्रति KG (₹)')} *</Label>
                            <Input type="number" step="0.01" value={dispatchForm.rate_per_kg}
                                onChange={(e) => setDispatchForm(p => ({...p, rate_per_kg: e.target.value}))}
                                className="h-12 text-lg" data-testid="dispatch-rate" required />
                        </div>

                        {/* Deductions */}
                        <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-3">
                                <Label className="font-semibold">{t('Deductions', 'कटौती')}</Label>
                                <Button type="button" variant="outline" size="sm" onClick={addDeduction} data-testid="add-deduction">
                                    <Plus className="w-3 h-3 mr-1" />{t('Add', 'जोड़ें')}
                                </Button>
                            </div>
                            {deductions.map((ded, idx) => (
                                <div key={idx} className="flex items-center gap-2 mb-2">
                                    <Select value={ded.type} onValueChange={(v) => updateDeduction(idx, 'type', v)}>
                                        <SelectTrigger className="h-10 flex-1"><SelectValue /></SelectTrigger>
                                        <SelectContent>{DEDUCTION_TYPES.map(dt => <SelectItem key={dt.value} value={dt.value}>{language === 'hi' ? dt.hi : dt.en}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Input type="number" step="1" value={ded.amount || ''} onChange={(e) => updateDeduction(idx, 'amount', e.target.value)}
                                        placeholder="₹" className="h-10 w-28" />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeDeduction(idx)} className="shrink-0 text-red-400 hover:text-red-600">
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        {/* Preview */}
                        {dispatchForm.quantity_kg && dispatchForm.rate_per_kg && (
                            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200" data-testid="dispatch-preview">
                                <div className="flex justify-between text-sm"><span>{t('Gross', 'कुल')}:</span><span>₹{(parseFloat(dispatchForm.quantity_kg) * parseFloat(dispatchForm.rate_per_kg)).toFixed(2)}</span></div>
                                {deductions.length > 0 && <div className="flex justify-between text-sm text-red-600"><span>{t('Deductions', 'कटौती')}:</span><span>-₹{deductions.reduce((s, d) => s + (d.amount || 0), 0).toFixed(2)}</span></div>}
                                <div className="flex justify-between font-bold text-emerald-700 border-t border-emerald-200 mt-1 pt-1">
                                    <span>{t('Net Receivable', 'शुद्ध प्राप्य')}:</span>
                                    <span>₹{(parseFloat(dispatchForm.quantity_kg) * parseFloat(dispatchForm.rate_per_kg) - deductions.reduce((s, d) => s + (d.amount || 0), 0)).toFixed(2)}</span>
                                </div>
                            </div>
                        )}

                        <Button type="submit" data-testid="submit-dispatch"
                            className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-base" disabled={submitting}>
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5 mr-2" />{t('Save Dispatch', 'डिस्पैच सहेजें')}</>}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Slip Match Dialog */}
            <Dialog open={!!showSlipMatch} onOpenChange={() => setShowSlipMatch(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Check className="w-5 h-5 text-emerald-600" />{t('Match Dairy Slip', 'डेयरी स्लिप मैच करें')}</DialogTitle>
                        <DialogDescription>{t('Enter details from official dairy slip', 'डेयरी की आधिकारिक स्लिप से विवरण दर्ज करें')}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSlipMatch} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('Slip FAT %', 'स्लिप FAT %')} *</Label>
                                <Input type="number" step="0.01" value={slipForm.slip_fat} onChange={(e) => setSlipForm(p => ({...p, slip_fat: e.target.value}))}
                                    className="h-12" data-testid="slip-fat" required />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Slip SNF %', 'स्लिप SNF %')}</Label>
                                <Input type="number" step="0.01" value={slipForm.slip_snf} onChange={(e) => setSlipForm(p => ({...p, slip_snf: e.target.value}))}
                                    className="h-12" data-testid="slip-snf" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Slip Amount (₹)', 'स्लिप राशि (₹)')} *</Label>
                            <Input type="number" step="0.01" value={slipForm.slip_amount} onChange={(e) => setSlipForm(p => ({...p, slip_amount: e.target.value}))}
                                className="h-12 text-lg" data-testid="slip-amount" required />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('Slip Deductions (₹)', 'स्लिप कटौती (₹)')}</Label>
                            <Input type="number" step="0.01" value={slipForm.slip_deductions} onChange={(e) => setSlipForm(p => ({...p, slip_deductions: e.target.value}))}
                                className="h-12" data-testid="slip-deductions" />
                        </div>
                        <Button type="submit" data-testid="submit-slip-match" className="w-full h-12 bg-emerald-700 hover:bg-emerald-800" disabled={submitting}>
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('Match Slip', 'स्लिप मैच करें')}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DairyDispatchPage;
