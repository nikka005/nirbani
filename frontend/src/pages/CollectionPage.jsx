import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collectionAPI, farmerAPI } from '../lib/api';
import { formatCurrency, formatNumber, calculateSNF, getTodayDate } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '../components/ui/dialog';
import { 
    Milk, Sun, Moon, Plus, Search, Trash2, Loader2, Check, Users,
    TrendingUp, Droplets, Wallet, Download, Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const CollectionPage = () => {
    const { language } = useAuth();
    const [collections, setCollections] = useState([]);
    const [allCollections, setAllCollections] = useState([]);
    const [farmers, setFarmers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [shift, setShift] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [selectedFarmer, setSelectedFarmer] = useState(null);
    const [selectedDate, setSelectedDate] = useState(getTodayDate());
    const [formShift, setFormShift] = useState(() => new Date().getHours() < 12 ? 'morning' : 'evening');
    const [formData, setFormData] = useState({ farmer_id: '', quantity: '', fat: '', snf: '' });
    const [collectionMilkType, setCollectionMilkType] = useState('cow');

    const t = (en, hi) => language === 'hi' ? hi : en;

    useEffect(() => { fetchData(); }, [selectedDate]);

    useEffect(() => {
        if (formData.fat && !formData.snf) {
            const snf = calculateSNF(parseFloat(formData.fat));
            setFormData(prev => ({ ...prev, snf }));
        }
    }, [formData.fat]);

    useEffect(() => {
        if (shift === 'all') {
            setCollections(allCollections);
        } else {
            setCollections(allCollections.filter(c => c.shift === shift));
        }
    }, [shift, allCollections]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('auth_token');
            const [collectionsRes, farmersRes] = await Promise.all([
                axios.get(`${BACKEND_URL}/api/collections?date=${selectedDate}`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                farmerAPI.getAll({ is_active: true })
            ]);
            setAllCollections(collectionsRes.data);
            setCollections(collectionsRes.data);
            setFarmers(farmersRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate stats
    const morningData = allCollections.filter(c => c.shift === 'morning');
    const eveningData = allCollections.filter(c => c.shift === 'evening');
    const totalMilk = allCollections.reduce((s, c) => s + c.quantity, 0);
    const totalAmount = allCollections.reduce((s, c) => s + c.amount, 0);
    const morningMilk = morningData.reduce((s, c) => s + c.quantity, 0);
    const eveningMilk = eveningData.reduce((s, c) => s + c.quantity, 0);
    const avgFat = allCollections.length > 0 
        ? (allCollections.reduce((s, c) => s + c.fat * c.quantity, 0) / totalMilk).toFixed(1) 
        : 0;
    const uniqueFarmers = new Set(allCollections.map(c => c.farmer_id)).size;
    const avgRate = totalMilk > 0 ? (totalAmount / totalMilk).toFixed(2) : 0;

    // Cow vs Buffalo breakdown
    const cowMilk = allCollections.filter(c => c.milk_type === 'cow').reduce((s, c) => s + c.quantity, 0);
    const buffaloMilk = allCollections.filter(c => c.milk_type === 'buffalo').reduce((s, c) => s + c.quantity, 0);
    const mixMilk = allCollections.filter(c => c.milk_type === 'mix').reduce((s, c) => s + c.quantity, 0);

    // Determine if farmer has a fixed rate for the selected milk type
    const isBothType = selectedFarmer?.milk_type === 'both';
    const getActiveRate = () => {
        if (!selectedFarmer) return null;
        if (isBothType) {
            return collectionMilkType === 'buffalo' 
                ? (selectedFarmer.buffalo_rate || null) 
                : (selectedFarmer.cow_rate || null);
        }
        if (selectedFarmer.milk_type === 'buffalo' && selectedFarmer.buffalo_rate > 0) return selectedFarmer.buffalo_rate;
        if (selectedFarmer.milk_type === 'cow' && selectedFarmer.cow_rate > 0) return selectedFarmer.cow_rate;
        return selectedFarmer.fixed_rate > 0 ? selectedFarmer.fixed_rate : null;
    };
    const activeRate = getActiveRate();
    const hasFixedRate = activeRate && activeRate > 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.farmer_id || !formData.quantity) {
            toast.error(t('Fill all fields', 'सभी फ़ील्ड भरें'));
            return;
        }
        if (!hasFixedRate && !formData.fat) {
            toast.error(t('Fat % is required', 'फैट % आवश्यक है'));
            return;
        }
        setSubmitting(true);
        try {
            const response = await collectionAPI.create({
                farmer_id: formData.farmer_id,
                shift: formShift,
                quantity: parseFloat(formData.quantity),
                fat: hasFixedRate ? 0 : parseFloat(formData.fat),
                snf: hasFixedRate ? 0 : (formData.snf ? parseFloat(formData.snf) : null),
                milk_type: isBothType ? collectionMilkType : undefined,
            });
            setAllCollections(prev => [response.data, ...prev]);
            setFormData({ farmer_id: '', quantity: '', fat: '', snf: '' });
            setSelectedFarmer(null);
            setShowAddDialog(false);
            toast.success(t('Entry saved!', 'प्रविष्टि सफल!'));
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error saving entry');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t('Delete this entry?', 'क्या आप इसे हटाना चाहते हैं?'))) return;
        try {
            await collectionAPI.delete(id);
            setAllCollections(prev => prev.filter(c => c.id !== id));
            toast.success(t('Entry deleted', 'प्रविष्टि हटाई गई'));
        } catch (error) { toast.error('Error deleting entry'); }
    };

    const [showEditCollection, setShowEditCollection] = useState(false);
    const [editCollData, setEditCollData] = useState(null);

    const openEditCollection = (coll) => {
        setEditCollData({ ...coll });
        setShowEditCollection(true);
    };

    const handleUpdateCollection = async (e) => {
        e.preventDefault();
        if (!editCollData) return;
        setSubmitting(true);
        try {
            await collectionAPI.update(editCollData.id, {
                quantity: parseFloat(editCollData.quantity),
                fat: parseFloat(editCollData.fat || 0),
                snf: parseFloat(editCollData.snf || 0),
                rate: parseFloat(editCollData.rate),
                shift: editCollData.shift,
                milk_type: editCollData.milk_type,
            });
            toast.success(t('Entry updated!', 'प्रविष्टि अपडेट!'));
            setShowEditCollection(false);
            setEditCollData(null);
            fetchData();
        } catch (error) { toast.error(error.response?.data?.detail || 'Error'); }
        finally { setSubmitting(false); }
    };

    const handleExport = async () => {
        const token = localStorage.getItem('auth_token');
        try {
            const res = await axios.get(`${BACKEND_URL}/api/export/collections?start_date=${selectedDate}&end_date=${selectedDate}`, {
                headers: { Authorization: `Bearer ${token}` }, responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url; a.download = `collections_${selectedDate}.csv`;
            document.body.appendChild(a); a.click();
            window.URL.revokeObjectURL(url); document.body.removeChild(a);
            toast.success(t('Downloaded!', 'डाउनलोड हुआ!'));
        } catch (e) { toast.error(t('Export failed', 'एक्सपोर्ट विफल')); }
    };

    const filteredFarmers = searchTerm.length > 0 
        ? farmers.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()) || f.phone.includes(searchTerm))
        : farmers.slice(0, 10);

    const selectFarmer = (farmer) => {
        setSelectedFarmer(farmer);
        setFormData(prev => ({ ...prev, farmer_id: farmer.id }));
        setSearchTerm('');
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="font-heading text-xl sm:text-2xl font-bold text-zinc-900">{t('Milk Collection', 'दूध संग्रह')}</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">{t('Daily milk collection dashboard', 'दैनिक दूध संग्रह डैशबोर्ड')}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} 
                        data-testid="collection-date-picker" className="h-9 w-auto text-sm" />
                    <Button variant="outline" size="sm" onClick={handleExport} data-testid="export-collections-btn" className="h-9">
                        <Download className="w-4 h-4 mr-1" />CSV
                    </Button>
                    <Button onClick={() => setShowAddDialog(true)} data-testid="add-collection-btn" className="bg-emerald-700 hover:bg-emerald-800 h-9">
                        <Plus className="w-4 h-4 mr-1" /><span className="hidden sm:inline">{t('New Entry', 'नई प्रविष्टि')}</span><span className="sm:hidden">{t('New', 'नया')}</span>
                    </Button>
                </div>
            </div>

            {/* Summary Dashboard */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="collection-dashboard">
                <Card className="bg-emerald-50 border-emerald-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Milk className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs text-emerald-600 font-semibold">{t('Total Milk', 'कुल दूध')}</span>
                        </div>
                        <p className="text-3xl font-bold text-emerald-700 font-heading">{formatNumber(totalMilk)} <span className="text-base">L</span></p>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Wallet className="w-4 h-4 text-blue-600" />
                            <span className="text-xs text-blue-600 font-semibold">{t('Total Amount', 'कुल राशि')}</span>
                        </div>
                        <p className="text-3xl font-bold text-blue-700 font-heading">{formatCurrency(totalAmount)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Users className="w-4 h-4 text-amber-600" />
                            <span className="text-xs text-amber-600 font-semibold">{t('Farmers', 'किसान')}</span>
                        </div>
                        <p className="text-3xl font-bold text-amber-700 font-heading">{uniqueFarmers}</p>
                        <p className="text-xs text-amber-500">{allCollections.length} {t('entries', 'प्रविष्टियाँ')}</p>
                    </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Droplets className="w-4 h-4 text-purple-600" />
                            <span className="text-xs text-purple-600 font-semibold">{t('Avg Fat', 'औसत फैट')}</span>
                        </div>
                        <p className="text-3xl font-bold text-purple-700 font-heading">{avgFat}<span className="text-base">%</span></p>
                        <p className="text-xs text-purple-500">{t('Avg Rate', 'औसत दर')}: ₹{avgRate}/L</p>
                    </CardContent>
                </Card>
            </div>

            {/* Shift Breakdown */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="border-amber-200 bg-amber-50/50 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShift('morning')}>
                    <CardContent className="p-3 flex items-center gap-3">
                        <Sun className="w-6 h-6 text-amber-500" />
                        <div>
                            <p className="text-xs text-amber-600 font-semibold">{t('Morning', 'सुबह')}</p>
                            <p className="text-lg font-bold text-amber-700">{formatNumber(morningMilk)} L</p>
                            <p className="text-[10px] text-amber-500">{morningData.length} {t('entries', 'प्रविष्टियाँ')}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-indigo-200 bg-indigo-50/50 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShift('evening')}>
                    <CardContent className="p-3 flex items-center gap-3">
                        <Moon className="w-6 h-6 text-indigo-500" />
                        <div>
                            <p className="text-xs text-indigo-600 font-semibold">{t('Evening', 'शाम')}</p>
                            <p className="text-lg font-bold text-indigo-700">{formatNumber(eveningMilk)} L</p>
                            <p className="text-[10px] text-indigo-500">{eveningData.length} {t('entries', 'प्रविष्टियाँ')}</p>
                        </div>
                    </CardContent>
                </Card>
                {cowMilk > 0 && (
                    <Card className="border-blue-200 bg-blue-50/50">
                        <CardContent className="p-3 flex items-center gap-3">
                            <span className="text-lg">🐄</span>
                            <div>
                                <p className="text-xs text-blue-600 font-semibold">{t('Cow', 'गाय')}</p>
                                <p className="text-lg font-bold text-blue-700">{formatNumber(cowMilk)} L</p>
                            </div>
                        </CardContent>
                    </Card>
                )}
                {buffaloMilk > 0 && (
                    <Card className="border-amber-200 bg-amber-50/50">
                        <CardContent className="p-3 flex items-center gap-3">
                            <span className="text-lg">🐃</span>
                            <div>
                                <p className="text-xs text-amber-600 font-semibold">{t('Buffalo', 'भैंस')}</p>
                                <p className="text-lg font-bold text-amber-700">{formatNumber(buffaloMilk)} L</p>
                            </div>
                        </CardContent>
                    </Card>
                )}
                {mixMilk > 0 && (
                    <Card className="border-purple-200 bg-purple-50/50">
                        <CardContent className="p-3 flex items-center gap-3">
                            <span className="text-lg">🥛</span>
                            <div>
                                <p className="text-xs text-purple-600 font-semibold">{t('Mix', 'मिक्स')}</p>
                                <p className="text-lg font-bold text-purple-700">{formatNumber(mixMilk)} L</p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Shift Filter + Entries */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="font-heading text-lg flex items-center gap-2">
                            <Milk className="w-5 h-5 text-emerald-600" />
                            {t('Collection Entries', 'संग्रह प्रविष्टियाँ')}
                            <span className="text-sm font-normal text-muted-foreground">({collections.length})</span>
                        </CardTitle>
                        <div className="flex rounded-lg border overflow-hidden">
                            {[
                                { key: 'all', label: t('All', 'सभी') },
                                { key: 'morning', label: t('Morning', 'सुबह'), icon: Sun },
                                { key: 'evening', label: t('Evening', 'शाम'), icon: Moon },
                            ].map(s => (
                                <button key={s.key} onClick={() => setShift(s.key)} data-testid={`filter-${s.key}`}
                                    className={cn("px-3 py-1.5 text-xs font-semibold transition-colors", 
                                        shift === s.key ? "bg-emerald-600 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50")}>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
                    ) : collections.length === 0 ? (
                        <div className="text-center py-12">
                            <Milk className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                            <p className="text-zinc-500 font-hindi">{t('No entries', 'कोई प्रविष्टि नहीं')}</p>
                            <Button onClick={() => setShowAddDialog(true)} className="mt-3 bg-emerald-700 hover:bg-emerald-800">
                                <Plus className="w-4 h-4 mr-2" />{t('Add First Entry', 'पहली प्रविष्टि जोड़ें')}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {collections.map((c) => (
                                <div key={c.id} data-testid={`collection-${c.id}`}
                                    className={cn("p-3 rounded-xl flex items-center gap-3 border transition-colors",
                                        c.shift === 'morning' ? "bg-amber-50/50 border-amber-100 hover:border-amber-200" : "bg-indigo-50/50 border-indigo-100 hover:border-indigo-200")}>
                                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white",
                                        c.shift === 'morning' ? "bg-amber-500" : "bg-indigo-500")}>
                                        {c.farmer_name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-zinc-900 truncate text-sm">{c.farmer_name}</p>
                                            <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                                                c.milk_type === 'buffalo' ? "bg-amber-100 text-amber-700" :
                                                c.milk_type === 'mix' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700")}>
                                                {c.milk_type === 'buffalo' ? t('BUF', 'भैंस') : c.milk_type === 'mix' ? t('MIX', 'मिक्स') : t('COW', 'गाय')}
                                            </span>
                                            {c.shift === 'morning' 
                                                ? <Sun className="w-3.5 h-3.5 text-amber-500" /> 
                                                : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                                            <span className="font-semibold text-zinc-700">{formatNumber(c.quantity)} L</span>
                                            <span>|</span>
                                            {c.fat > 0 ? (
                                                <>
                                                    <span>Fat: {c.fat}%</span>
                                                    <span>|</span>
                                                    <span>SNF: {c.snf}%</span>
                                                    <span>|</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-emerald-600 font-semibold">{t('Fixed Rate', 'निश्चित दर')}</span>
                                                    <span>|</span>
                                                </>
                                            )}
                                            <span>@₹{c.rate}/L</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-emerald-700 text-base">{formatCurrency(c.amount)}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => openEditCollection(c)}
                                        data-testid={`edit-collection-${c.id}`} className="text-zinc-300 hover:text-blue-500 shrink-0">
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}
                                        data-testid={`delete-collection-${c.id}`} className="text-zinc-300 hover:text-red-500 shrink-0">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Collection Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-heading flex items-center gap-2">
                            <Milk className="w-5 h-5 text-emerald-600" />
                            {t('New Entry', 'नई प्रविष्टि')}
                        </DialogTitle>
                        <DialogDescription>{t('Record farmer milk collection', 'किसान का दूध दर्ज करें')}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Shift */}
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => setFormShift('morning')} data-testid="form-shift-morning"
                                className={cn("flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold transition-all",
                                    formShift === 'morning' ? "border-amber-400 bg-amber-50 text-amber-700" : "border-zinc-200 text-zinc-500")}>
                                <Sun className="w-5 h-5" />{t('Morning', 'सुबह')}
                            </button>
                            <button type="button" onClick={() => setFormShift('evening')} data-testid="form-shift-evening"
                                className={cn("flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold transition-all",
                                    formShift === 'evening' ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-zinc-200 text-zinc-500")}>
                                <Moon className="w-5 h-5" />{t('Evening', 'शाम')}
                            </button>
                        </div>

                        {/* Farmer Selection */}
                        <div className="space-y-2">
                            <Label className="font-hindi">{t('Select Farmer', 'किसान चुनें')}</Label>
                            {selectedFarmer ? (
                                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">
                                        {selectedFarmer.name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-sm">{selectedFarmer.name}</p>
                                            <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                                                selectedFarmer.milk_type === 'buffalo' ? "bg-amber-100 text-amber-700" :
                                                selectedFarmer.milk_type === 'both' ? "bg-emerald-100 text-emerald-700" :
                                                selectedFarmer.milk_type === 'mix' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700")}>
                                                {selectedFarmer.milk_type === 'buffalo' ? t('Buffalo', 'भैंस') : selectedFarmer.milk_type === 'both' ? t('Both', 'दोनों') : selectedFarmer.milk_type === 'mix' ? t('Mix', 'मिक्स') : t('Cow', 'गाय')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-500">
                                            {selectedFarmer.phone}
                                            {selectedFarmer.fixed_rate && <span className="ml-2 text-emerald-600 font-semibold">{t('Fixed', 'निश्चित')}: ₹{selectedFarmer.fixed_rate}/L</span>}
                                        </p>
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedFarmer(null); setFormData(p => ({...p, farmer_id: ''})); }}>
                                        {t('Change', 'बदलें')}
                                    </Button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                    <Input placeholder={t('Search farmers...', 'किसान खोजें...')} value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)} data-testid="farmer-search" className="pl-10 h-12" />
                                    {filteredFarmers.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto z-50">
                                            {filteredFarmers.map(farmer => (
                                                <button key={farmer.id} type="button" onClick={() => selectFarmer(farmer)}
                                                    className="w-full flex items-center gap-3 p-3 hover:bg-zinc-50 text-left">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">
                                                        {farmer.name.charAt(0)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-semibold text-sm">{farmer.name}</p>
                                                            <span className={cn("px-1 py-0.5 rounded text-[8px] font-bold uppercase",
                                                                farmer.milk_type === 'buffalo' ? "bg-amber-100 text-amber-700" :
                                                                farmer.milk_type === 'both' ? "bg-emerald-100 text-emerald-700" :
                                                                farmer.milk_type === 'mix' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700")}>
                                                                {farmer.milk_type === 'buffalo' ? 'BUF' : farmer.milk_type === 'both' ? t('BOTH', 'दोनों') : farmer.milk_type === 'mix' ? 'MIX' : 'COW'}
                                                            </span>
                                                            {farmer.fixed_rate && <span className="text-[9px] text-emerald-600 font-bold">₹{farmer.fixed_rate}/L</span>}
                                                        </div>
                                                        <p className="text-xs text-zinc-500">{farmer.phone}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="font-hindi">{t('Quantity (Liters)', 'मात्रा (लीटर)')}</Label>
                            <Input type="number" step="0.1" value={formData.quantity}
                                onChange={(e) => setFormData(p => ({...p, quantity: e.target.value}))}
                                data-testid="quantity-input" placeholder="0.0" className="h-12 text-lg" />
                        </div>

                        {hasFixedRate ? (
                            <div className="space-y-3">
                                {isBothType && (
                                    <div className="grid grid-cols-2 gap-2" data-testid="collection-milk-type-selector">
                                        <button type="button" onClick={() => setCollectionMilkType('cow')}
                                            className={cn("py-3 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-2",
                                                collectionMilkType === 'cow' ? "border-amber-500 bg-amber-50 text-amber-700" : "border-zinc-200 text-zinc-600")}>
                                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                            {t('Cow', 'गाय')} {selectedFarmer.cow_rate > 0 ? `₹${selectedFarmer.cow_rate}/L` : ''}
                                        </button>
                                        <button type="button" onClick={() => setCollectionMilkType('buffalo')}
                                            className={cn("py-3 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-2",
                                                collectionMilkType === 'buffalo' ? "border-zinc-700 bg-zinc-100 text-zinc-800" : "border-zinc-200 text-zinc-600")}>
                                            <span className="w-2 h-2 rounded-full bg-zinc-700"></span>
                                            {t('Buffalo', 'भैंस')} {selectedFarmer.buffalo_rate > 0 ? `₹${selectedFarmer.buffalo_rate}/L` : ''}
                                        </button>
                                    </div>
                                )}
                                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200" data-testid="fixed-rate-info">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-emerald-700">{t('Fixed Rate Applied', 'निश्चित दर लागू')}</p>
                                            <p className="text-xs text-emerald-600 mt-0.5">
                                                {isBothType 
                                                    ? (collectionMilkType === 'cow' ? t('Cow milk rate', 'गाय दूध की दर') : t('Buffalo milk rate', 'भैंस दूध की दर'))
                                                    : t('Fat/SNF not needed for fixed rate farmers', 'निश्चित दर किसानों के लिए फैट/एसएनएफ की जरूरत नहीं')}
                                            </p>
                                        </div>
                                        <p className="text-2xl font-bold text-emerald-700">₹{activeRate}<span className="text-sm font-normal">/L</span></p>
                                    </div>
                                    {formData.quantity && (
                                        <div className="mt-2 pt-2 border-t border-emerald-200 flex justify-between">
                                            <span className="text-sm text-emerald-600">{t('Estimated Amount', 'अनुमानित राशि')}:</span>
                                            <span className="font-bold text-emerald-700">₹{(parseFloat(formData.quantity || 0) * activeRate).toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="font-hindi">{t('Fat %', 'फैट %')}</Label>
                                    <Input type="number" step="0.1" value={formData.fat}
                                        onChange={(e) => setFormData(p => ({...p, fat: e.target.value, snf: ''}))}
                                        data-testid="fat-input" placeholder="0.0" className="h-12 text-lg" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-hindi">{t('SNF %', 'एसएनएफ %')}</Label>
                                    <Input type="number" step="0.1" value={formData.snf}
                                        onChange={(e) => setFormData(p => ({...p, snf: e.target.value}))}
                                        data-testid="snf-input" placeholder="Auto" className="h-12 text-lg bg-zinc-50" />
                                </div>
                            </div>
                        )}
                        <Button type="submit" data-testid="submit-collection"
                            className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 font-hindi text-base"
                            disabled={submitting || !formData.farmer_id}>
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5 mr-2" />{t('Save', 'सहेजें')}</>}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CollectionPage;
