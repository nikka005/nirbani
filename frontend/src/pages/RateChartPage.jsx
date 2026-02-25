import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { rateChartAPI } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '../components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../components/ui/table';
import { 
    ChartLine, 
    Plus,
    Trash2,
    Edit,
    Loader2,
    Star,
    Check
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const RateChartPage = () => {
    const { language } = useAuth();
    const [charts, setCharts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [editingChart, setEditingChart] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        is_default: false,
        entries: [{ fat: '', snf: '', rate: '' }],
    });

    const texts = {
        title: language === 'hi' ? 'दर चार्ट' : 'Rate Chart',
        addChart: language === 'hi' ? 'नया चार्ट' : 'New Chart',
        chartName: language === 'hi' ? 'चार्ट नाम' : 'Chart Name',
        setDefault: language === 'hi' ? 'डिफ़ॉल्ट बनाएं' : 'Set as Default',
        fat: language === 'hi' ? 'फैट %' : 'Fat %',
        snf: language === 'hi' ? 'एसएनएफ %' : 'SNF %',
        rate: language === 'hi' ? 'दर (₹/L)' : 'Rate (₹/L)',
        addRow: language === 'hi' ? 'पंक्ति जोड़ें' : 'Add Row',
        save: language === 'hi' ? 'सहेजें' : 'Save',
        noCharts: language === 'hi' ? 'कोई दर चार्ट नहीं' : 'No rate charts',
        default: language === 'hi' ? 'डिफ़ॉल्ट' : 'Default',
        entries: language === 'hi' ? 'प्रविष्टियाँ' : 'entries',
        success: language === 'hi' ? 'चार्ट सहेजा गया!' : 'Chart saved!',
        deleteConfirm: language === 'hi' ? 'क्या आप इसे हटाना चाहते हैं?' : 'Delete this chart?',
    };

    useEffect(() => {
        fetchCharts();
    }, []);

    const fetchCharts = async () => {
        try {
            const response = await rateChartAPI.getAll();
            setCharts(response.data);
        } catch (error) {
            console.error('Error fetching charts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) {
            toast.error(language === 'hi' ? 'चार्ट नाम आवश्यक है' : 'Chart name required');
            return;
        }

        const validEntries = formData.entries.filter(e => e.fat && e.snf && e.rate);
        if (validEntries.length === 0) {
            toast.error(language === 'hi' ? 'कम से कम एक दर प्रविष्टि जोड़ें' : 'Add at least one rate entry');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                name: formData.name,
                is_default: formData.is_default,
                entries: validEntries.map(e => ({
                    fat: parseFloat(e.fat),
                    snf: parseFloat(e.snf),
                    rate: parseFloat(e.rate),
                })),
            };

            if (editingChart) {
                await rateChartAPI.update(editingChart.id, payload);
            } else {
                await rateChartAPI.create(payload);
            }

            setFormData({ name: '', is_default: false, entries: [{ fat: '', snf: '', rate: '' }] });
            setEditingChart(null);
            setShowAddDialog(false);
            toast.success(texts.success);
            fetchCharts();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error saving chart');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(texts.deleteConfirm)) return;
        
        try {
            await rateChartAPI.delete(id);
            setCharts(prev => prev.filter(c => c.id !== id));
            toast.success(language === 'hi' ? 'चार्ट हटाया गया' : 'Chart deleted');
        } catch (error) {
            toast.error('Error deleting chart');
        }
    };

    const openEditDialog = (chart) => {
        setEditingChart(chart);
        setFormData({
            name: chart.name,
            is_default: chart.is_default,
            entries: chart.entries.length > 0 
                ? chart.entries.map(e => ({ fat: e.fat.toString(), snf: e.snf.toString(), rate: e.rate.toString() }))
                : [{ fat: '', snf: '', rate: '' }],
        });
        setShowAddDialog(true);
    };

    const addEntry = () => {
        setFormData(prev => ({
            ...prev,
            entries: [...prev.entries, { fat: '', snf: '', rate: '' }]
        }));
    };

    const removeEntry = (index) => {
        if (formData.entries.length === 1) return;
        setFormData(prev => ({
            ...prev,
            entries: prev.entries.filter((_, i) => i !== index)
        }));
    };

    const updateEntry = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            entries: prev.entries.map((entry, i) => 
                i === index ? { ...entry, [field]: value } : entry
            )
        }));
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="font-heading text-2xl font-bold text-zinc-900">
                    {texts.title}
                </h1>
                <Button 
                    onClick={() => {
                        setEditingChart(null);
                        setFormData({ name: '', is_default: false, entries: [{ fat: '', snf: '', rate: '' }] });
                        setShowAddDialog(true);
                    }}
                    data-testid="add-chart-btn"
                    className="bg-emerald-700 hover:bg-emerald-800"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    {texts.addChart}
                </Button>
            </div>

            {/* Charts List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
            ) : charts.length === 0 ? (
                <div className="empty-state py-12">
                    <div className="empty-state-icon">
                        <ChartLine className="w-8 h-8" />
                    </div>
                    <p className="font-hindi">{texts.noCharts}</p>
                    <p className="text-sm text-zinc-500 mt-2">
                        {language === 'hi' 
                            ? 'दूध की दर गणना के लिए चार्ट बनाएं' 
                            : 'Create a chart for milk rate calculation'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {charts.map((chart) => (
                        <Card 
                            key={chart.id}
                            data-testid={`chart-${chart.id}`}
                            className={cn("card-hover", chart.is_default && "border-emerald-300 bg-emerald-50/30")}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="font-heading text-lg flex items-center gap-2">
                                        <ChartLine className="w-5 h-5 text-emerald-600" />
                                        {chart.name}
                                        {chart.is_default && (
                                            <span className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                                                <Star className="w-3 h-3" />
                                                {texts.default}
                                            </span>
                                        )}
                                    </CardTitle>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openEditDialog(chart)}
                                            data-testid={`edit-chart-${chart.id}`}
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(chart.id)}
                                            data-testid={`delete-chart-${chart.id}`}
                                            className="text-zinc-400 hover:text-red-600"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-zinc-500 mb-3">
                                    {chart.entries.length} {texts.entries}
                                </p>
                                {chart.entries.length > 0 && (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="font-hindi">{texts.fat}</TableHead>
                                                    <TableHead className="font-hindi">{texts.snf}</TableHead>
                                                    <TableHead className="font-hindi">{texts.rate}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {chart.entries.slice(0, 5).map((entry, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{entry.fat}%</TableCell>
                                                        <TableCell>{entry.snf}%</TableCell>
                                                        <TableCell className="font-semibold text-emerald-700">
                                                            {formatCurrency(entry.rate)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {chart.entries.length > 5 && (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="text-center text-zinc-500">
                                                            +{chart.entries.length - 5} more
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add/Edit Chart Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-heading flex items-center gap-2">
                            <ChartLine className="w-5 h-5 text-emerald-600" />
                            {editingChart ? (language === 'hi' ? 'चार्ट संपादित करें' : 'Edit Chart') : texts.addChart}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground">
                            {language === 'hi' ? 'फैट और एसएनएफ के अनुसार दर निर्धारित करें' : 'Set rates based on fat and SNF'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="font-hindi">{texts.chartName} *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                data-testid="chart-name-input"
                                placeholder={language === 'hi' ? 'चार्ट का नाम' : 'Chart name'}
                                className="h-12"
                            />
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg">
                            <Switch
                                checked={formData.is_default}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                                data-testid="chart-default-switch"
                            />
                            <Label className="font-hindi cursor-pointer">{texts.setDefault}</Label>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="font-hindi">
                                    {language === 'hi' ? 'दर प्रविष्टियाँ' : 'Rate Entries'}
                                </Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addEntry}
                                    data-testid="add-entry-btn"
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    {texts.addRow}
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {formData.entries.map((entry, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            step="0.1"
                                            value={entry.fat}
                                            onChange={(e) => updateEntry(index, 'fat', e.target.value)}
                                            placeholder={texts.fat}
                                            className="h-10"
                                            data-testid={`entry-fat-${index}`}
                                        />
                                        <Input
                                            type="number"
                                            step="0.1"
                                            value={entry.snf}
                                            onChange={(e) => updateEntry(index, 'snf', e.target.value)}
                                            placeholder={texts.snf}
                                            className="h-10"
                                            data-testid={`entry-snf-${index}`}
                                        />
                                        <Input
                                            type="number"
                                            step="0.1"
                                            value={entry.rate}
                                            onChange={(e) => updateEntry(index, 'rate', e.target.value)}
                                            placeholder={texts.rate}
                                            className="h-10"
                                            data-testid={`entry-rate-${index}`}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeEntry(index)}
                                            disabled={formData.entries.length === 1}
                                            className="text-zinc-400 hover:text-red-600 shrink-0"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Button
                            type="submit"
                            data-testid="submit-chart"
                            className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 font-hindi text-base"
                            disabled={submitting}
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

export default RateChartPage;
