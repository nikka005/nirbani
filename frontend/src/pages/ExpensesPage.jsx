import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
    Receipt, 
    Plus,
    Trash2,
    Loader2,
    TrendingDown,
    Wallet,
    Truck,
    Zap,
    Wrench,
    MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '../lib/utils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ExpensesPage = () => {
    const { language } = useAuth();
    const [expenses, setExpenses] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showAddExpense, setShowAddExpense] = useState(false);

    const [formData, setFormData] = useState({
        category: 'other',
        amount: '',
        description: '',
        payment_mode: 'cash',
    });

    const categories = [
        { value: 'salary', label: language === 'hi' ? 'वेतन' : 'Salary', icon: Wallet, color: 'blue' },
        { value: 'transport', label: language === 'hi' ? 'परिवहन' : 'Transport', icon: Truck, color: 'orange' },
        { value: 'electricity', label: language === 'hi' ? 'बिजली' : 'Electricity', icon: Zap, color: 'yellow' },
        { value: 'maintenance', label: language === 'hi' ? 'रखरखाव' : 'Maintenance', icon: Wrench, color: 'purple' },
        { value: 'other', label: language === 'hi' ? 'अन्य' : 'Other', icon: MoreHorizontal, color: 'zinc' },
    ];

    const texts = {
        title: language === 'hi' ? 'खर्च' : 'Expenses',
        addExpense: language === 'hi' ? 'खर्च जोड़ें' : 'Add Expense',
        category: language === 'hi' ? 'श्रेणी' : 'Category',
        amount: language === 'hi' ? 'राशि' : 'Amount',
        description: language === 'hi' ? 'विवरण' : 'Description',
        paymentMode: language === 'hi' ? 'भुगतान माध्यम' : 'Payment Mode',
        cash: language === 'hi' ? 'नकद' : 'Cash',
        upi: language === 'hi' ? 'यूपीआई' : 'UPI',
        bank: language === 'hi' ? 'बैंक' : 'Bank',
        save: language === 'hi' ? 'सहेजें' : 'Save',
        thisMonth: language === 'hi' ? 'इस महीने' : 'This Month',
        recentExpenses: language === 'hi' ? 'हाल के खर्च' : 'Recent Expenses',
        noExpenses: language === 'hi' ? 'कोई खर्च नहीं' : 'No expenses',
        totalExpenses: language === 'hi' ? 'कुल खर्च' : 'Total Expenses',
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const token = localStorage.getItem('auth_token');
        try {
            const [expensesRes, summaryRes] = await Promise.all([
                axios.get(`${BACKEND_URL}/api/expenses`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${BACKEND_URL}/api/expenses/summary`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setExpenses(expensesRes.data);
            setSummary(summaryRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.amount) {
            toast.error(language === 'hi' ? 'राशि आवश्यक है' : 'Amount required');
            return;
        }
        setSubmitting(true);
        const token = localStorage.getItem('auth_token');
        try {
            const response = await axios.post(`${BACKEND_URL}/api/expenses`, {
                ...formData,
                amount: parseFloat(formData.amount),
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setExpenses(prev => [response.data, ...prev]);
            setFormData({ category: 'other', amount: '', description: '', payment_mode: 'cash' });
            setShowAddExpense(false);
            toast.success(language === 'hi' ? 'खर्च दर्ज हुआ!' : 'Expense recorded!');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error recording expense');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(language === 'hi' ? 'क्या आप इसे हटाना चाहते हैं?' : 'Delete this expense?')) return;
        const token = localStorage.getItem('auth_token');
        try {
            await axios.delete(`${BACKEND_URL}/api/expenses/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setExpenses(prev => prev.filter(e => e.id !== id));
            toast.success(language === 'hi' ? 'खर्च हटाया गया' : 'Expense deleted');
            fetchData();
        } catch (error) {
            toast.error('Error deleting expense');
        }
    };

    const getCategoryInfo = (cat) => categories.find(c => c.value === cat) || categories[4];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="font-heading text-2xl font-bold text-zinc-900">{texts.title}</h1>
                <Button onClick={() => setShowAddExpense(true)} data-testid="add-expense-btn" className="bg-emerald-700 hover:bg-emerald-800">
                    <Plus className="w-4 h-4 mr-2" />
                    {texts.addExpense}
                </Button>
            </div>

            {/* Summary */}
            <Card className="bg-red-50 border-red-200">
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center">
                            <TrendingDown className="w-7 h-7 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm text-red-600 font-hindi">{texts.thisMonth} {texts.totalExpenses}</p>
                            <p className="text-3xl font-bold text-red-700">{formatCurrency(summary?.total || 0)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Category Breakdown */}
            {summary?.by_category && Object.keys(summary.by_category).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {categories.map(cat => {
                        const amount = summary.by_category[cat.value] || 0;
                        if (amount === 0) return null;
                        const Icon = cat.icon;
                        return (
                            <Card key={cat.value} className="text-center">
                                <CardContent className="p-3">
                                    <Icon className={`w-5 h-5 mx-auto mb-1 text-${cat.color}-600`} />
                                    <p className="text-xs text-zinc-500">{cat.label}</p>
                                    <p className="font-bold text-sm">{formatCurrency(amount)}</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Recent Expenses */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-heading text-lg flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-emerald-600" />
                        {texts.recentExpenses}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {expenses.length === 0 ? (
                        <p className="text-center text-zinc-500 py-8 font-hindi">{texts.noExpenses}</p>
                    ) : (
                        <div className="space-y-3">
                            {expenses.slice(0, 20).map((expense) => {
                                const catInfo = getCategoryInfo(expense.category);
                                const Icon = catInfo.icon;
                                return (
                                    <Card key={expense.id} className="card-hover">
                                        <CardContent className="p-4 flex items-center gap-4">
                                            <div className={`w-10 h-10 bg-${catInfo.color}-100 rounded-xl flex items-center justify-center`}>
                                                <Icon className={`w-5 h-5 text-${catInfo.color}-600`} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold">{catInfo.label}</p>
                                                <p className="text-sm text-zinc-500">
                                                    {expense.description || expense.payment_mode.toUpperCase()}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-red-600">-{formatCurrency(expense.amount)}</p>
                                                <p className="text-xs text-zinc-500">{formatDate(expense.date)}</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(expense.id)}
                                                className="text-zinc-400 hover:text-red-600"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Expense Dialog */}
            <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-heading flex items-center gap-2">
                            <Receipt className="w-5 h-5 text-emerald-600" />
                            {texts.addExpense}
                        </DialogTitle>
                        <DialogDescription>{language === 'hi' ? 'खर्च विवरण दर्ज करें' : 'Enter expense details'}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="font-hindi">{texts.category}</Label>
                            <div className="grid grid-cols-5 gap-2">
                                {categories.map(cat => {
                                    const Icon = cat.icon;
                                    return (
                                        <button
                                            key={cat.value}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                                            className={cn(
                                                "p-2 rounded-lg border-2 flex flex-col items-center gap-1",
                                                formData.category === cat.value ? "border-emerald-500 bg-emerald-50" : "border-zinc-200"
                                            )}
                                        >
                                            <Icon className={`w-4 h-4 text-${cat.color}-600`} />
                                            <span className="text-xs">{cat.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-hindi">{texts.amount} *</Label>
                            <Input
                                type="number"
                                value={formData.amount}
                                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                placeholder="0"
                                className="h-12 text-lg"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="font-hindi">{texts.description}</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder={language === 'hi' ? 'विवरण (वैकल्पिक)' : 'Description (optional)'}
                                rows={2}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="font-hindi">{texts.paymentMode}</Label>
                            <Select
                                value={formData.payment_mode}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, payment_mode: value }))}
                            >
                                <SelectTrigger className="h-12">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">{texts.cash}</SelectItem>
                                    <SelectItem value="upi">{texts.upi}</SelectItem>
                                    <SelectItem value="bank">{texts.bank}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button type="submit" className="w-full h-12 bg-emerald-700 hover:bg-emerald-800" disabled={submitting}>
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : texts.save}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ExpensesPage;
