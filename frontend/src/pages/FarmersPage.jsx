import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { farmerAPI } from '../lib/api';
import { formatCurrency, getInitials } from '../lib/utils';
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
    Users, 
    Plus,
    Search,
    Phone,
    MapPin,
    ChevronRight,
    Loader2,
    Wallet,
    Milk
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const MILK_TYPES = [
    { value: 'cow', labelEn: 'Cow', labelHi: 'गाय' },
    { value: 'buffalo', labelEn: 'Buffalo', labelHi: 'भैंस' },
    { value: 'both', labelEn: 'Both', labelHi: 'दोनों' },
];

const FarmersPage = () => {
    const { language } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [farmers, setFarmers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddDialog, setShowAddDialog] = useState(searchParams.get('add') === 'true');

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        village: '',
        address: '',
        bank_account: '',
        ifsc_code: '',
        aadhar_number: '',
        milk_type: 'cow',
        fixed_rate: '',
        cow_rate: '',
        buffalo_rate: '',
    });

    const texts = {
        title: language === 'hi' ? 'किसान' : 'Farmers',
        addFarmer: language === 'hi' ? 'किसान जोड़ें' : 'Add Farmer',
        search: language === 'hi' ? 'नाम या फ़ोन से खोजें...' : 'Search by name or phone...',
        name: language === 'hi' ? 'नाम' : 'Name',
        phone: language === 'hi' ? 'फ़ोन नंबर' : 'Phone Number',
        village: language === 'hi' ? 'गाँव' : 'Village',
        address: language === 'hi' ? 'पता' : 'Address',
        bankAccount: language === 'hi' ? 'बैंक खाता नंबर' : 'Bank Account Number',
        ifsc: language === 'hi' ? 'IFSC कोड' : 'IFSC Code',
        aadhar: language === 'hi' ? 'आधार नंबर' : 'Aadhar Number',
        save: language === 'hi' ? 'सहेजें' : 'Save',
        balance: language === 'hi' ? 'बकाया' : 'Balance',
        noFarmers: language === 'hi' ? 'कोई किसान नहीं मिला' : 'No farmers found',
        totalFarmers: language === 'hi' ? 'कुल किसान' : 'Total Farmers',
        success: language === 'hi' ? 'किसान जोड़ा गया!' : 'Farmer added!',
        milkType: language === 'hi' ? 'दूध का प्रकार' : 'Milk Type',
        fixedRate: language === 'hi' ? 'निश्चित दर (₹/L)' : 'Fixed Rate (₹/L)',
        fixedRateHint: language === 'hi' ? 'खाली छोड़ें तो चार्ट से दर लगेगी' : 'Leave empty to use rate chart',
    };

    useEffect(() => {
        fetchFarmers();
    }, []);

    useEffect(() => {
        if (searchParams.get('add') === 'true') {
            setShowAddDialog(true);
            setSearchParams({});
        }
    }, [searchParams, setSearchParams]);

    const fetchFarmers = async () => {
        try {
            const response = await farmerAPI.getAll();
            setFarmers(response.data);
        } catch (error) {
            console.error('Error fetching farmers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.phone) {
            toast.error(language === 'hi' ? 'नाम और फ़ोन आवश्यक है' : 'Name and phone required');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                fixed_rate: formData.fixed_rate ? parseFloat(formData.fixed_rate) : null,
            };
            const response = await farmerAPI.create(payload);
            setFarmers(prev => [response.data, ...prev]);
            setFormData({
                name: '',
                phone: '',
                village: '',
                address: '',
                bank_account: '',
                ifsc_code: '',
                aadhar_number: '',
                milk_type: 'cow',
                fixed_rate: '',
            });
            setShowAddDialog(false);
            toast.success(texts.success);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error adding farmer');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredFarmers = farmers.filter(f => 
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.phone.includes(searchTerm) ||
        f.village?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading text-2xl font-bold text-zinc-900">
                        {texts.title}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {texts.totalFarmers}: {farmers.length}
                    </p>
                </div>
                <Button 
                    onClick={() => setShowAddDialog(true)}
                    data-testid="add-farmer-btn"
                    className="bg-emerald-700 hover:bg-emerald-800"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    {texts.addFarmer}
                </Button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <Input
                    placeholder={texts.search}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="farmer-search-input"
                    className="pl-12 h-12 text-base"
                />
            </div>

            {/* Farmers List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
            ) : filteredFarmers.length === 0 ? (
                <div className="empty-state py-12">
                    <div className="empty-state-icon">
                        <Users className="w-8 h-8" />
                    </div>
                    <p className="font-hindi">{texts.noFarmers}</p>
                </div>
            ) : (
                <div className="space-y-3 stagger-children">
                    {filteredFarmers.map((farmer) => (
                        <Card 
                            key={farmer.id}
                            data-testid={`farmer-${farmer.id}`}
                            className="card-hover cursor-pointer"
                            onClick={() => navigate(`/farmers/${farmer.id}`)}
                        >
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="farmer-avatar">
                                    {getInitials(farmer.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-zinc-900 truncate">
                                            {farmer.name}
                                        </p>
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide",
                                            farmer.milk_type === 'buffalo' ? "bg-amber-100 text-amber-700" :
                                            farmer.milk_type === 'mix' ? "bg-purple-100 text-purple-700" :
                                            "bg-blue-100 text-blue-700"
                                        )}>
                                            {farmer.milk_type === 'buffalo' ? (language === 'hi' ? 'भैंस' : 'Buffalo') :
                                             farmer.milk_type === 'mix' ? (language === 'hi' ? 'मिक्स' : 'Mix') :
                                             (language === 'hi' ? 'गाय' : 'Cow')}
                                        </span>
                                        {farmer.fixed_rate && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                                ₹{farmer.fixed_rate}/L
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
                                <div className="text-right">
                                    <div className={cn(
                                        "flex items-center gap-1 text-sm font-semibold",
                                        farmer.balance > 0 ? "text-orange-600" : "text-emerald-600"
                                    )}>
                                        <Wallet className="w-4 h-4" />
                                        {formatCurrency(farmer.balance)}
                                    </div>
                                    <p className="text-xs text-zinc-500">{texts.balance}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-zinc-400" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add Farmer Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-heading flex items-center gap-2">
                            <Users className="w-5 h-5 text-emerald-600" />
                            {texts.addFarmer}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground">
                            {language === 'hi' ? 'नए किसान की जानकारी भरें' : 'Enter new farmer details'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="font-hindi">{texts.name} *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                data-testid="farmer-name-input"
                                placeholder={language === 'hi' ? 'किसान का नाम' : 'Farmer name'}
                                className="h-12"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="font-hindi">{texts.phone} *</Label>
                            <Input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                data-testid="farmer-phone-input"
                                placeholder="9876543210"
                                className="h-12"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="font-hindi">{texts.village}</Label>
                            <Input
                                value={formData.village}
                                onChange={(e) => setFormData(prev => ({ ...prev, village: e.target.value }))}
                                data-testid="farmer-village-input"
                                placeholder={language === 'hi' ? 'गाँव का नाम' : 'Village name'}
                                className="h-12"
                            />
                        </div>

                        {/* Milk Type & Fixed Rate */}
                        <div className="border-t pt-4 mt-4">
                            <p className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
                                <Milk className="w-4 h-4 text-emerald-600" />
                                {texts.milkType}
                            </p>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {MILK_TYPES.map((mt) => (
                                    <button
                                        key={mt.value}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, milk_type: mt.value }))}
                                        data-testid={`milk-type-${mt.value}`}
                                        className={cn(
                                            "py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all",
                                            formData.milk_type === mt.value
                                                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                                : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
                                        )}
                                    >
                                        {language === 'hi' ? mt.labelHi : mt.labelEn}
                                    </button>
                                ))}
                            </div>
                            <div className="space-y-2">
                                <Label className="font-hindi">{texts.fixedRate}</Label>
                                <Input
                                    type="number"
                                    step="0.5"
                                    value={formData.fixed_rate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, fixed_rate: e.target.value }))}
                                    data-testid="farmer-fixed-rate-input"
                                    placeholder={language === 'hi' ? 'उदा: 35' : 'e.g. 35'}
                                    className="h-12"
                                />
                                <p className="text-xs text-zinc-500">{texts.fixedRateHint}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-hindi">{texts.address}</Label>
                            <Input
                                value={formData.address}
                                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                data-testid="farmer-address-input"
                                placeholder={language === 'hi' ? 'पूरा पता' : 'Full address'}
                                className="h-12"
                            />
                        </div>

                        <div className="border-t pt-4 mt-4">
                            <p className="text-sm font-semibold text-zinc-700 mb-3">
                                {language === 'hi' ? 'बैंक विवरण (वैकल्पिक)' : 'Bank Details (Optional)'}
                            </p>
                            
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="font-hindi">{texts.bankAccount}</Label>
                                    <Input
                                        value={formData.bank_account}
                                        onChange={(e) => setFormData(prev => ({ ...prev, bank_account: e.target.value }))}
                                        data-testid="farmer-bank-input"
                                        placeholder="1234567890123456"
                                        className="h-12"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="font-hindi">{texts.ifsc}</Label>
                                    <Input
                                        value={formData.ifsc_code}
                                        onChange={(e) => setFormData(prev => ({ ...prev, ifsc_code: e.target.value.toUpperCase() }))}
                                        data-testid="farmer-ifsc-input"
                                        placeholder="SBIN0001234"
                                        className="h-12"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="font-hindi">{texts.aadhar}</Label>
                                    <Input
                                        value={formData.aadhar_number}
                                        onChange={(e) => setFormData(prev => ({ ...prev, aadhar_number: e.target.value }))}
                                        data-testid="farmer-aadhar-input"
                                        placeholder="1234 5678 9012"
                                        className="h-12"
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            data-testid="submit-farmer"
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

export default FarmersPage;
