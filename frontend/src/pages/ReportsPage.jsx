import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportAPI, farmerAPI } from '../lib/api';
import { formatCurrency, formatNumber, formatDate, getTodayDate } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../components/ui/table';
import { 
    FileText, 
    Calendar,
    Users,
    Milk,
    Wallet,
    Download,
    Loader2,
    Sun,
    Moon
} from 'lucide-react';
import { cn } from '../lib/utils';

const ReportsPage = () => {
    const { language } = useAuth();
    const [activeTab, setActiveTab] = useState('daily');
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(getTodayDate());
    const [selectedFarmer, setSelectedFarmer] = useState('');
    const [farmers, setFarmers] = useState([]);
    const [dailyReport, setDailyReport] = useState(null);
    const [farmerReport, setFarmerReport] = useState(null);

    const texts = {
        title: language === 'hi' ? 'रिपोर्ट' : 'Reports',
        dailyReport: language === 'hi' ? 'दैनिक रिपोर्ट' : 'Daily Report',
        farmerReport: language === 'hi' ? 'किसान रिपोर्ट' : 'Farmer Report',
        selectDate: language === 'hi' ? 'तारीख चुनें' : 'Select Date',
        selectFarmer: language === 'hi' ? 'किसान चुनें' : 'Select Farmer',
        generate: language === 'hi' ? 'रिपोर्ट देखें' : 'View Report',
        totalCollection: language === 'hi' ? 'कुल संग्रह' : 'Total Collection',
        totalAmount: language === 'hi' ? 'कुल राशि' : 'Total Amount',
        morning: language === 'hi' ? 'सुबह' : 'Morning',
        evening: language === 'hi' ? 'शाम' : 'Evening',
        collections: language === 'hi' ? 'संग्रह' : 'Collections',
        payments: language === 'hi' ? 'भुगतान' : 'Payments',
        farmer: language === 'hi' ? 'किसान' : 'Farmer',
        quantity: language === 'hi' ? 'मात्रा' : 'Quantity',
        fat: language === 'hi' ? 'फैट' : 'Fat',
        snf: language === 'hi' ? 'एसएनएफ' : 'SNF',
        rate: language === 'hi' ? 'दर' : 'Rate',
        amount: language === 'hi' ? 'राशि' : 'Amount',
        shift: language === 'hi' ? 'पाली' : 'Shift',
        noData: language === 'hi' ? 'कोई डेटा नहीं' : 'No data',
        download: language === 'hi' ? 'डाउनलोड' : 'Download',
    };

    useEffect(() => {
        fetchFarmers();
    }, []);

    useEffect(() => {
        if (activeTab === 'daily' && selectedDate) {
            fetchDailyReport();
        }
    }, [activeTab, selectedDate]);

    const fetchFarmers = async () => {
        try {
            const response = await farmerAPI.getAll();
            setFarmers(response.data);
        } catch (error) {
            console.error('Error fetching farmers:', error);
        }
    };

    const fetchDailyReport = async () => {
        setLoading(true);
        try {
            const response = await reportAPI.getDaily(selectedDate);
            setDailyReport(response.data);
        } catch (error) {
            console.error('Error fetching daily report:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFarmerReport = async () => {
        if (!selectedFarmer) return;
        setLoading(true);
        try {
            const response = await reportAPI.getFarmerReport(selectedFarmer);
            setFarmerReport(response.data);
        } catch (error) {
            console.error('Error fetching farmer report:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="font-heading text-2xl font-bold text-zinc-900">
                    {texts.title}
                </h1>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="daily" data-testid="daily-report-tab" className="font-hindi">
                        <Calendar className="w-4 h-4 mr-2" />
                        {texts.dailyReport}
                    </TabsTrigger>
                    <TabsTrigger value="farmer" data-testid="farmer-report-tab" className="font-hindi">
                        <Users className="w-4 h-4 mr-2" />
                        {texts.farmerReport}
                    </TabsTrigger>
                </TabsList>

                {/* Daily Report Tab */}
                <TabsContent value="daily" className="space-y-4 mt-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-end gap-4">
                                <div className="flex-1 space-y-2">
                                    <Label className="font-hindi">{texts.selectDate}</Label>
                                    <Input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        data-testid="daily-report-date"
                                        className="h-12"
                                    />
                                </div>
                                <Button
                                    onClick={fetchDailyReport}
                                    data-testid="generate-daily-report"
                                    className="bg-emerald-700 hover:bg-emerald-800 h-12"
                                >
                                    {texts.generate}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                        </div>
                    ) : dailyReport ? (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card className="bg-emerald-50 border-emerald-200">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Milk className="w-4 h-4 text-emerald-600" />
                                            <span className="text-sm text-emerald-600 font-hindi">{texts.totalCollection}</span>
                                        </div>
                                        <p className="text-2xl font-bold text-emerald-700 font-heading">
                                            {formatNumber(dailyReport.summary.total_quantity)} L
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-blue-50 border-blue-200">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Wallet className="w-4 h-4 text-blue-600" />
                                            <span className="text-sm text-blue-600 font-hindi">{texts.totalAmount}</span>
                                        </div>
                                        <p className="text-2xl font-bold text-blue-700 font-heading">
                                            {formatCurrency(dailyReport.summary.total_amount)}
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-amber-50 border-amber-200">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Sun className="w-4 h-4 text-amber-600" />
                                            <span className="text-sm text-amber-600 font-hindi">{texts.morning}</span>
                                        </div>
                                        <p className="text-2xl font-bold text-amber-700 font-heading">
                                            {formatNumber(dailyReport.summary.morning_quantity)} L
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-indigo-50 border-indigo-200">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Moon className="w-4 h-4 text-indigo-600" />
                                            <span className="text-sm text-indigo-600 font-hindi">{texts.evening}</span>
                                        </div>
                                        <p className="text-2xl font-bold text-indigo-700 font-heading">
                                            {formatNumber(dailyReport.summary.evening_quantity)} L
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Collections Table */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-heading text-lg flex items-center gap-2">
                                        <Milk className="w-5 h-5 text-emerald-600" />
                                        {texts.collections}
                                        <span className="text-sm font-normal text-muted-foreground ml-auto">
                                            {dailyReport.collections.length} {language === 'hi' ? 'प्रविष्टियाँ' : 'entries'}
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {dailyReport.collections.length === 0 ? (
                                        <p className="text-center text-zinc-500 py-8 font-hindi">{texts.noData}</p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="font-hindi">{texts.farmer}</TableHead>
                                                        <TableHead className="font-hindi">{texts.shift}</TableHead>
                                                        <TableHead className="font-hindi">{texts.quantity}</TableHead>
                                                        <TableHead className="font-hindi">{texts.fat}</TableHead>
                                                        <TableHead className="font-hindi">{texts.snf}</TableHead>
                                                        <TableHead className="font-hindi">{texts.rate}</TableHead>
                                                        <TableHead className="font-hindi text-right">{texts.amount}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {dailyReport.collections.map((c) => (
                                                        <TableRow key={c.id}>
                                                            <TableCell className="font-semibold">{c.farmer_name}</TableCell>
                                                            <TableCell>
                                                                <span className={cn(
                                                                    "px-2 py-1 rounded text-xs font-semibold",
                                                                    c.shift === 'morning' ? "badge-morning" : "badge-evening"
                                                                )}>
                                                                    {c.shift === 'morning' ? '☀️' : '🌙'} {c.shift}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>{formatNumber(c.quantity)} L</TableCell>
                                                            <TableCell>{c.fat}%</TableCell>
                                                            <TableCell>{c.snf}%</TableCell>
                                                            <TableCell>{formatCurrency(c.rate)}</TableCell>
                                                            <TableCell className="text-right font-semibold text-emerald-700">
                                                                {formatCurrency(c.amount)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Payments */}
                            {dailyReport.payments.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="font-heading text-lg flex items-center gap-2">
                                            <Wallet className="w-5 h-5 text-blue-600" />
                                            {texts.payments}
                                            <span className="text-sm font-normal text-muted-foreground ml-auto">
                                                {formatCurrency(dailyReport.summary.total_paid)}
                                            </span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="font-hindi">{texts.farmer}</TableHead>
                                                        <TableHead className="font-hindi">{language === 'hi' ? 'माध्यम' : 'Mode'}</TableHead>
                                                        <TableHead className="font-hindi text-right">{texts.amount}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {dailyReport.payments.map((p) => (
                                                        <TableRow key={p.id}>
                                                            <TableCell className="font-semibold">{p.farmer_name}</TableCell>
                                                            <TableCell>{p.payment_mode.toUpperCase()}</TableCell>
                                                            <TableCell className="text-right font-semibold text-blue-700">
                                                                {formatCurrency(p.amount)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    ) : null}
                </TabsContent>

                {/* Farmer Report Tab */}
                <TabsContent value="farmer" className="space-y-4 mt-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-end gap-4">
                                <div className="flex-1 space-y-2">
                                    <Label className="font-hindi">{texts.selectFarmer}</Label>
                                    <Select
                                        value={selectedFarmer}
                                        onValueChange={setSelectedFarmer}
                                    >
                                        <SelectTrigger className="h-12" data-testid="farmer-report-select">
                                            <SelectValue placeholder={texts.selectFarmer} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {farmers.map(farmer => (
                                                <SelectItem key={farmer.id} value={farmer.id}>
                                                    {farmer.name} - {farmer.phone}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    onClick={fetchFarmerReport}
                                    data-testid="generate-farmer-report"
                                    className="bg-emerald-700 hover:bg-emerald-800 h-12"
                                    disabled={!selectedFarmer}
                                >
                                    {texts.generate}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                        </div>
                    ) : farmerReport ? (
                        <>
                            {/* Farmer Info */}
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        <div className="farmer-avatar w-14 h-14 text-xl">
                                            {farmerReport.farmer.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h2 className="font-heading font-bold text-xl">{farmerReport.farmer.name}</h2>
                                            <p className="text-zinc-500">{farmerReport.farmer.phone}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Summary */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card className="bg-blue-50 border-blue-200">
                                    <CardContent className="p-4">
                                        <p className="text-sm text-blue-600 font-hindi mb-1">{language === 'hi' ? 'कुल दूध' : 'Total Milk'}</p>
                                        <p className="text-2xl font-bold text-blue-700 font-heading">
                                            {formatNumber(farmerReport.summary.total_milk)} L
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-amber-50 border-amber-200">
                                    <CardContent className="p-4">
                                        <p className="text-sm text-amber-600 font-hindi mb-1">{language === 'hi' ? 'कुल देय' : 'Total Due'}</p>
                                        <p className="text-2xl font-bold text-amber-700 font-heading">
                                            {formatCurrency(farmerReport.summary.total_amount)}
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-emerald-50 border-emerald-200">
                                    <CardContent className="p-4">
                                        <p className="text-sm text-emerald-600 font-hindi mb-1">{language === 'hi' ? 'कुल भुगतान' : 'Total Paid'}</p>
                                        <p className="text-2xl font-bold text-emerald-700 font-heading">
                                            {formatCurrency(farmerReport.summary.total_paid)}
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className={cn(
                                    farmerReport.summary.balance > 0 ? "bg-orange-50 border-orange-200" : "bg-green-50 border-green-200"
                                )}>
                                    <CardContent className="p-4">
                                        <p className={cn(
                                            "text-sm font-hindi mb-1",
                                            farmerReport.summary.balance > 0 ? "text-orange-600" : "text-green-600"
                                        )}>{language === 'hi' ? 'बकाया' : 'Balance'}</p>
                                        <p className={cn(
                                            "text-2xl font-bold font-heading",
                                            farmerReport.summary.balance > 0 ? "text-orange-700" : "text-green-700"
                                        )}>
                                            {formatCurrency(farmerReport.summary.balance)}
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Recent Collections */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-heading text-lg flex items-center gap-2">
                                        <Milk className="w-5 h-5 text-emerald-600" />
                                        {language === 'hi' ? 'हाल के संग्रह' : 'Recent Collections'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {farmerReport.collections.length === 0 ? (
                                        <p className="text-center text-zinc-500 py-8 font-hindi">{texts.noData}</p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="font-hindi">{language === 'hi' ? 'तारीख' : 'Date'}</TableHead>
                                                        <TableHead className="font-hindi">{texts.shift}</TableHead>
                                                        <TableHead className="font-hindi">{texts.quantity}</TableHead>
                                                        <TableHead className="font-hindi">{texts.fat}</TableHead>
                                                        <TableHead className="font-hindi">{texts.rate}</TableHead>
                                                        <TableHead className="font-hindi text-right">{texts.amount}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {farmerReport.collections.slice(0, 20).map((c) => (
                                                        <TableRow key={c.id}>
                                                            <TableCell>{formatDate(c.date)}</TableCell>
                                                            <TableCell>
                                                                {c.shift === 'morning' ? '☀️' : '🌙'}
                                                            </TableCell>
                                                            <TableCell>{formatNumber(c.quantity)} L</TableCell>
                                                            <TableCell>{c.fat}%</TableCell>
                                                            <TableCell>{formatCurrency(c.rate)}</TableCell>
                                                            <TableCell className="text-right font-semibold text-emerald-700">
                                                                {formatCurrency(c.amount)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    ) : null}
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ReportsPage;
