import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collectionAPI, farmerAPI } from '../lib/api';
import { formatCurrency, formatNumber, calculateSNF, getTodayDate } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';
import { 
    Milk, 
    Sun, 
    Moon, 
    Plus,
    Search,
    Trash2,
    Loader2,
    Check
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const CollectionPage = () => {
    const { language } = useAuth();
    const [collections, setCollections] = useState([]);
    const [farmers, setFarmers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [shift, setShift] = useState('morning');
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [selectedFarmer, setSelectedFarmer] = useState(null);

    const [formData, setFormData] = useState({
        farmer_id: '',
        quantity: '',
        fat: '',
        snf: '',
    });

    const [calculatedAmount, setCalculatedAmount] = useState(null);

    const texts = {
        title: language === 'hi' ? 'दूध संग्रह' : 'Milk Collection',
        addCollection: language === 'hi' ? 'नई प्रविष्टि' : 'New Entry',
        morning: language === 'hi' ? 'सुबह' : 'Morning',
        evening: language === 'hi' ? 'शाम' : 'Evening',
        selectFarmer: language === 'hi' ? 'किसान चुनें' : 'Select Farmer',
        quantity: language === 'hi' ? 'मात्रा (लीटर)' : 'Quantity (Liters)',
        fat: language === 'hi' ? 'फैट %' : 'Fat %',
        snf: language === 'hi' ? 'एसएनएफ %' : 'SNF %',
        rate: language === 'hi' ? 'दर' : 'Rate',
        amount: language === 'hi' ? 'राशि' : 'Amount',
        save: language === 'hi' ? 'सहेजें' : 'Save',
        search: language === 'hi' ? 'किसान खोजें...' : 'Search farmers...',
        todayCollections: language === 'hi' ? 'आज की प्रविष्टियाँ' : "Today's Entries",
        noCollections: language === 'hi' ? 'कोई प्रविष्टि नहीं' : 'No entries yet',
        deleteConfirm: language === 'hi' ? 'क्या आप इसे हटाना चाहते हैं?' : 'Delete this entry?',
        success: language === 'hi' ? 'प्रविष्टि सफल!' : 'Entry saved!',
    };

    useEffect(() => {
        fetchData();
    }, [shift]);

    useEffect(() => {
        // Auto-calculate SNF when fat changes
        if (formData.fat && !formData.snf) {
            const snf = calculateSNF(parseFloat(formData.fat));
            setFormData(prev => ({ ...prev, snf }));
        }
    }, [formData.fat]);

    const fetchData = async () => {
        try {
            const [collectionsRes, farmersRes] = await Promise.all([
                collectionAPI.getToday({ shift }),
                farmerAPI.getAll({ is_active: true })
            ]);
            setCollections(collectionsRes.data);
            setFarmers(farmersRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.farmer_id || !formData.quantity || !formData.fat) {
            toast.error(language === 'hi' ? 'सभी फ़ील्ड भरें' : 'Fill all fields');
            return;
        }

        setSubmitting(true);
        try {
            const response = await collectionAPI.create({
                farmer_id: formData.farmer_id,
                shift,
                quantity: parseFloat(formData.quantity),
                fat: parseFloat(formData.fat),
                snf: formData.snf ? parseFloat(formData.snf) : null,
            });

            setCollections(prev => [response.data, ...prev]);
            setFormData({ farmer_id: '', quantity: '', fat: '', snf: '' });
            setSelectedFarmer(null);
            setCalculatedAmount(null);
            setShowAddDialog(false);
            toast.success(texts.success);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error saving entry');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(texts.deleteConfirm)) return;
        
        try {
            await collectionAPI.delete(id);
            setCollections(prev => prev.filter(c => c.id !== id));
            toast.success(language === 'hi' ? 'प्रविष्टि हटाई गई' : 'Entry deleted');
        } catch (error) {
            toast.error('Error deleting entry');
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

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="font-heading text-2xl font-bold text-zinc-900">
                    {texts.title}
                </h1>
                <Button 
                    onClick={() => setShowAddDialog(true)}
                    data-testid="add-collection-btn"
                    className="bg-emerald-700 hover:bg-emerald-800"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    {texts.addCollection}
                </Button>
            </div>

            {/* Shift Toggle */}
            <div className="shift-toggle">
                <button
                    type="button"
                    onClick={() => setShift('morning')}
                    data-testid="shift-morning"
                    className={cn('morning', shift === 'morning' && 'active')}
                >
                    <Sun className="w-5 h-5 inline mr-2" />
                    {texts.morning}
                </button>
                <button
                    type="button"
                    onClick={() => setShift('evening')}
                    data-testid="shift-evening"
                    className={cn('evening', shift === 'evening' && 'active')}
                >
                    <Moon className="w-5 h-5 inline mr-2" />
                    {texts.evening}
                </button>
            </div>

            {/* Today's Collections */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-heading text-lg flex items-center gap-2">
                        <Milk className="w-5 h-5 text-emerald-600" />
                        {texts.todayCollections}
                        <span className="text-sm font-normal text-muted-foreground ml-auto">
                            {collections.length} {language === 'hi' ? 'प्रविष्टियाँ' : 'entries'}
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                        </div>
                    ) : collections.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <Milk className="w-8 h-8" />
                            </div>
                            <p className="font-hindi">{texts.noCollections}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {collections.map((collection) => (
                                <div 
                                    key={collection.id}
                                    data-testid={`collection-${collection.id}`}
                                    className={cn(
                                        "collection-card p-4 rounded-xl flex items-center gap-4",
                                        collection.shift
                                    )}
                                >
                                    <div className="farmer-avatar">
                                        {collection.farmer_name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-zinc-900 truncate">
                                            {collection.farmer_name}
                                        </p>
                                        <div className="flex items-center gap-3 text-sm text-zinc-500">
                                            <span>{formatNumber(collection.quantity)} L</span>
                                            <span>•</span>
                                            <span>Fat: {collection.fat}%</span>
                                            <span>•</span>
                                            <span>SNF: {collection.snf}%</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-emerald-700">
                                            {formatCurrency(collection.amount)}
                                        </p>
                                        <p className="text-xs text-zinc-500">
                                            @{formatCurrency(collection.rate)}/L
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(collection.id)}
                                        data-testid={`delete-collection-${collection.id}`}
                                        className="text-zinc-400 hover:text-red-600"
                                    >
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
                            {texts.addCollection}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Shift Selector */}
                        <div className="shift-toggle">
                            <button
                                type="button"
                                onClick={() => setShift('morning')}
                                className={cn('morning', shift === 'morning' && 'active')}
                            >
                                <Sun className="w-4 h-4 inline mr-1" />
                                {texts.morning}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShift('evening')}
                                className={cn('evening', shift === 'evening' && 'active')}
                            >
                                <Moon className="w-4 h-4 inline mr-1" />
                                {texts.evening}
                            </button>
                        </div>

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
                                        <p className="text-xs text-zinc-500">{selectedFarmer.phone}</p>
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
                                        data-testid="farmer-search"
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
                                                    <div>
                                                        <p className="font-semibold text-sm">{farmer.name}</p>
                                                        <p className="text-xs text-zinc-500">{farmer.phone}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Quantity */}
                        <div className="space-y-2">
                            <Label className="font-hindi">{texts.quantity}</Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={formData.quantity}
                                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                                data-testid="quantity-input"
                                placeholder="0.0"
                                className="h-12 text-lg"
                            />
                        </div>

                        {/* Fat & SNF */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="font-hindi">{texts.fat}</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={formData.fat}
                                    onChange={(e) => setFormData(prev => ({ ...prev, fat: e.target.value, snf: '' }))}
                                    data-testid="fat-input"
                                    placeholder="0.0"
                                    className="h-12 text-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-hindi">{texts.snf}</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={formData.snf}
                                    onChange={(e) => setFormData(prev => ({ ...prev, snf: e.target.value }))}
                                    data-testid="snf-input"
                                    placeholder="Auto"
                                    className="h-12 text-lg bg-zinc-50"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            data-testid="submit-collection"
                            className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 font-hindi text-base"
                            disabled={submitting || !formData.farmer_id}
                        >
                            {submitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Check className="w-5 h-5 mr-2" />
                                    {texts.save}
                                </>
                            )}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CollectionPage;
