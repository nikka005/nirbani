import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
    Settings as SettingsIcon, 
    Building,
    MessageSquare,
    Languages,
    Loader2,
    Save,
    Check
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const SettingsPage = () => {
    const { language, toggleLanguage } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [dairySettings, setDairySettings] = useState({
        dairy_name: 'Nirbani Dairy',
        dairy_phone: '',
        dairy_address: '',
        sms_enabled: false,
    });

    const [smsTemplates, setSmsTemplates] = useState({
        collection_template: '',
        payment_template: '',
    });

    const texts = {
        title: language === 'hi' ? 'सेटिंग्स' : 'Settings',
        dairyInfo: language === 'hi' ? 'डेयरी जानकारी' : 'Dairy Information',
        smsSettings: language === 'hi' ? 'SMS सेटिंग्स' : 'SMS Settings',
        languageSettings: language === 'hi' ? 'भाषा' : 'Language',
        dairyName: language === 'hi' ? 'डेयरी का नाम' : 'Dairy Name',
        phone: language === 'hi' ? 'फ़ोन नंबर' : 'Phone Number',
        address: language === 'hi' ? 'पता' : 'Address',
        enableSms: language === 'hi' ? 'SMS सक्षम करें' : 'Enable SMS',
        collectionTemplate: language === 'hi' ? 'संग्रह SMS टेम्पलेट' : 'Collection SMS Template',
        paymentTemplate: language === 'hi' ? 'भुगतान SMS टेम्पलेट' : 'Payment SMS Template',
        save: language === 'hi' ? 'सहेजें' : 'Save',
        saved: language === 'hi' ? 'सहेजा गया!' : 'Saved!',
        currentLanguage: language === 'hi' ? 'वर्तमान भाषा: हिंदी' : 'Current Language: English',
        switchTo: language === 'hi' ? 'English में बदलें' : 'हिंदी में बदलें',
        templateVars: language === 'hi' 
            ? 'उपलब्ध चर: {farmer_name}, {shift}, {quantity}, {fat}, {snf}, {rate}, {amount}, {balance}' 
            : 'Available variables: {farmer_name}, {shift}, {quantity}, {fat}, {snf}, {rate}, {amount}, {balance}',
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        const token = localStorage.getItem('auth_token');
        try {
            const [dairyRes, smsRes] = await Promise.all([
                axios.get(`${BACKEND_URL}/api/settings/dairy`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`${BACKEND_URL}/api/settings/sms-templates`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);
            setDairySettings(dairyRes.data);
            setSmsTemplates(smsRes.data);
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveDairySettings = async () => {
        setSaving(true);
        const token = localStorage.getItem('auth_token');
        try {
            await axios.put(`${BACKEND_URL}/api/settings/dairy`, dairySettings, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(texts.saved);
        } catch (error) {
            toast.error('Error saving settings');
        } finally {
            setSaving(false);
        }
    };

    const saveSmsTemplates = async () => {
        setSaving(true);
        const token = localStorage.getItem('auth_token');
        try {
            await axios.put(`${BACKEND_URL}/api/settings/sms-templates`, smsTemplates, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(texts.saved);
        } catch (error) {
            toast.error('Error saving templates');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <SettingsIcon className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                    <h1 className="font-heading text-2xl font-bold text-zinc-900">
                        {texts.title}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {language === 'hi' ? 'डेयरी और SMS सेटिंग्स प्रबंधित करें' : 'Manage dairy and SMS settings'}
                    </p>
                </div>
            </div>

            <Tabs defaultValue="dairy">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="dairy" data-testid="dairy-settings-tab" className="font-hindi">
                        <Building className="w-4 h-4 mr-2" />
                        {texts.dairyInfo}
                    </TabsTrigger>
                    <TabsTrigger value="sms" data-testid="sms-settings-tab" className="font-hindi">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        {texts.smsSettings}
                    </TabsTrigger>
                    <TabsTrigger value="language" data-testid="language-settings-tab" className="font-hindi">
                        <Languages className="w-4 h-4 mr-2" />
                        {texts.languageSettings}
                    </TabsTrigger>
                </TabsList>

                {/* Dairy Settings */}
                <TabsContent value="dairy" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-heading flex items-center gap-2">
                                <Building className="w-5 h-5 text-emerald-600" />
                                {texts.dairyInfo}
                            </CardTitle>
                            <CardDescription>
                                {language === 'hi' 
                                    ? 'यह जानकारी बिल और रिपोर्ट में दिखाई जाएगी' 
                                    : 'This information will appear on bills and reports'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="font-hindi">{texts.dairyName}</Label>
                                <Input
                                    value={dairySettings.dairy_name}
                                    onChange={(e) => setDairySettings(prev => ({ ...prev, dairy_name: e.target.value }))}
                                    data-testid="dairy-name-input"
                                    placeholder="Nirbani Dairy"
                                    className="h-12"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="font-hindi">{texts.phone}</Label>
                                <Input
                                    value={dairySettings.dairy_phone}
                                    onChange={(e) => setDairySettings(prev => ({ ...prev, dairy_phone: e.target.value }))}
                                    data-testid="dairy-phone-input"
                                    placeholder="9876543210"
                                    className="h-12"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="font-hindi">{texts.address}</Label>
                                <Textarea
                                    value={dairySettings.dairy_address}
                                    onChange={(e) => setDairySettings(prev => ({ ...prev, dairy_address: e.target.value }))}
                                    data-testid="dairy-address-input"
                                    placeholder={language === 'hi' ? 'पूरा पता' : 'Full address'}
                                    rows={3}
                                />
                            </div>

                            <Button
                                onClick={saveDairySettings}
                                data-testid="save-dairy-settings"
                                className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 font-hindi"
                                disabled={saving}
                            >
                                {saving ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-5 h-5 mr-2" />
                                        {texts.save}
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SMS Settings */}
                <TabsContent value="sms" className="mt-4 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-heading flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-emerald-600" />
                                {texts.smsSettings}
                            </CardTitle>
                            <CardDescription>
                                {language === 'hi' 
                                    ? 'SMS सूचनाएं सक्षम करने के लिए MSG91 API कॉन्फ़िगर करें' 
                                    : 'Configure MSG91 API to enable SMS notifications'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-lg">
                                <Switch
                                    checked={dairySettings.sms_enabled}
                                    onCheckedChange={(checked) => setDairySettings(prev => ({ ...prev, sms_enabled: checked }))}
                                    data-testid="sms-enabled-switch"
                                />
                                <div>
                                    <Label className="font-hindi cursor-pointer">{texts.enableSms}</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {language === 'hi' 
                                            ? 'संग्रह और भुगतान पर किसानों को SMS भेजें' 
                                            : 'Send SMS to farmers on collection and payment'}
                                    </p>
                                </div>
                            </div>

                            {dairySettings.sms_enabled && (
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                                    <p className="font-semibold text-amber-800 mb-1">
                                        {language === 'hi' ? 'MSG91 कॉन्फ़िगरेशन' : 'MSG91 Configuration'}
                                    </p>
                                    <p className="text-amber-700">
                                        {language === 'hi' 
                                            ? 'SMS सेवा के लिए MSG91_AUTH_KEY को backend .env में सेट करें' 
                                            : 'Set MSG91_AUTH_KEY in backend .env for SMS service'}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">SMS Templates</CardTitle>
                            <CardDescription>{texts.templateVars}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="font-hindi">{texts.collectionTemplate}</Label>
                                <Textarea
                                    value={smsTemplates.collection_template}
                                    onChange={(e) => setSmsTemplates(prev => ({ ...prev, collection_template: e.target.value }))}
                                    data-testid="collection-template-input"
                                    placeholder="Nirbani Dairy: {farmer_name} जी, आपका {shift} का दूध..."
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="font-hindi">{texts.paymentTemplate}</Label>
                                <Textarea
                                    value={smsTemplates.payment_template}
                                    onChange={(e) => setSmsTemplates(prev => ({ ...prev, payment_template: e.target.value }))}
                                    data-testid="payment-template-input"
                                    placeholder="Nirbani Dairy: {farmer_name} जी, ₹{amount} का भुगतान..."
                                    rows={3}
                                />
                            </div>

                            <Button
                                onClick={saveSmsTemplates}
                                data-testid="save-sms-templates"
                                className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 font-hindi"
                                disabled={saving}
                            >
                                {saving ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-5 h-5 mr-2" />
                                        {texts.save}
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Language Settings */}
                <TabsContent value="language" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-heading flex items-center gap-2">
                                <Languages className="w-5 h-5 text-emerald-600" />
                                {texts.languageSettings}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-6 bg-zinc-50 rounded-xl text-center">
                                <p className="text-lg font-semibold text-zinc-900 mb-2">
                                    {texts.currentLanguage}
                                </p>
                                <p className="text-2xl mb-4">
                                    {language === 'hi' ? '🇮🇳 हिंदी' : '🇬🇧 English'}
                                </p>
                                <Button
                                    onClick={toggleLanguage}
                                    data-testid="toggle-language-btn"
                                    className="bg-emerald-700 hover:bg-emerald-800 font-hindi"
                                >
                                    <Languages className="w-5 h-5 mr-2" />
                                    {texts.switchTo}
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => language !== 'hi' && toggleLanguage()}
                                    className={`p-4 rounded-xl border-2 transition-all ${
                                        language === 'hi' 
                                            ? 'border-emerald-500 bg-emerald-50' 
                                            : 'border-zinc-200 hover:border-zinc-300'
                                    }`}
                                >
                                    <p className="text-2xl mb-1">🇮🇳</p>
                                    <p className="font-semibold font-hindi">हिंदी</p>
                                    {language === 'hi' && (
                                        <Check className="w-4 h-4 text-emerald-600 mx-auto mt-1" />
                                    )}
                                </button>
                                <button
                                    onClick={() => language !== 'en' && toggleLanguage()}
                                    className={`p-4 rounded-xl border-2 transition-all ${
                                        language === 'en' 
                                            ? 'border-emerald-500 bg-emerald-50' 
                                            : 'border-zinc-200 hover:border-zinc-300'
                                    }`}
                                >
                                    <p className="text-2xl mb-1">🇬🇧</p>
                                    <p className="font-semibold">English</p>
                                    {language === 'en' && (
                                        <Check className="w-4 h-4 text-emerald-600 mx-auto mt-1" />
                                    )}
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default SettingsPage;
