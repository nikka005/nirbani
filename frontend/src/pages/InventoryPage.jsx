import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/utils';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import { 
    Package, 
    Plus,
    AlertTriangle,
    ArrowUpCircle,
    ArrowDownCircle,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '../lib/utils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const InventoryPage = () => {
    const { language } = useAuth();
    const [products, setProducts] = useState([]);
    const [lowStock, setLowStock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [showStockUpdate, setShowStockUpdate] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const [productForm, setProductForm] = useState({
        name: '',
        unit: 'kg',
        stock: '',
        min_stock: '',
        rate: '',
    });

    const [stockForm, setStockForm] = useState({
        product_id: '',
        quantity: '',
        type: 'in',
        notes: '',
    });

    const texts = {
        title: language === 'hi' ? 'इन्वेंटरी' : 'Inventory',
        addProduct: language === 'hi' ? 'उत्पाद जोड़ें' : 'Add Product',
        updateStock: language === 'hi' ? 'स्टॉक अपडेट' : 'Update Stock',
        name: language === 'hi' ? 'नाम' : 'Name',
        unit: language === 'hi' ? 'इकाई' : 'Unit',
        stock: language === 'hi' ? 'स्टॉक' : 'Stock',
        minStock: language === 'hi' ? 'न्यूनतम स्टॉक' : 'Min Stock',
        rate: language === 'hi' ? 'दर' : 'Rate',
        quantity: language === 'hi' ? 'मात्रा' : 'Quantity',
        stockIn: language === 'hi' ? 'स्टॉक इन' : 'Stock In',
        stockOut: language === 'hi' ? 'स्टॉक आउट' : 'Stock Out',
        save: language === 'hi' ? 'सहेजें' : 'Save',
        lowStockAlert: language === 'hi' ? 'कम स्टॉक अलर्ट' : 'Low Stock Alert',
        noProducts: language === 'hi' ? 'कोई उत्पाद नहीं' : 'No products',
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const token = localStorage.getItem('auth_token');
        try {
            const [productsRes, lowStockRes] = await Promise.all([
                axios.get(`${BACKEND_URL}/api/products`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${BACKEND_URL}/api/products/low-stock`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setProducts(productsRes.data);
            setLowStock(lowStockRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        if (!productForm.name) {
            toast.error(language === 'hi' ? 'नाम आवश्यक है' : 'Name required');
            return;
        }
        setSubmitting(true);
        const token = localStorage.getItem('auth_token');
        try {
            const response = await axios.post(`${BACKEND_URL}/api/products`, {
                ...productForm,
                stock: parseFloat(productForm.stock) || 0,
                min_stock: parseFloat(productForm.min_stock) || 0,
                rate: parseFloat(productForm.rate) || 0,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProducts(prev => [response.data, ...prev]);
            setProductForm({ name: '', unit: 'kg', stock: '', min_stock: '', rate: '' });
            setShowAddProduct(false);
            toast.success(language === 'hi' ? 'उत्पाद जोड़ा गया!' : 'Product added!');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error adding product');
        } finally {
            setSubmitting(false);
        }
    };

    const handleStockUpdate = async (e) => {
        e.preventDefault();
        if (!stockForm.product_id || !stockForm.quantity) {
            toast.error(language === 'hi' ? 'सभी फ़ील्ड भरें' : 'Fill all fields');
            return;
        }
        setSubmitting(true);
        const token = localStorage.getItem('auth_token');
        try {
            await axios.post(`${BACKEND_URL}/api/products/stock-update`, {
                ...stockForm,
                quantity: parseFloat(stockForm.quantity),
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStockForm({ product_id: '', quantity: '', type: 'in', notes: '' });
            setShowStockUpdate(false);
            toast.success(language === 'hi' ? 'स्टॉक अपडेट हुआ!' : 'Stock updated!');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error updating stock');
        } finally {
            setSubmitting(false);
        }
    };

    const openStockUpdate = (product) => {
        setSelectedProduct(product);
        setStockForm({ ...stockForm, product_id: product.id });
        setShowStockUpdate(true);
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
            <div className="flex items-center justify-between">
                <h1 className="font-heading text-2xl font-bold text-zinc-900">{texts.title}</h1>
                <Button onClick={() => setShowAddProduct(true)} data-testid="add-product-btn" className="bg-emerald-700 hover:bg-emerald-800">
                    <Plus className="w-4 h-4 mr-2" />
                    {texts.addProduct}
                </Button>
            </div>

            {/* Low Stock Alerts */}
            {lowStock.length > 0 && (
                <Card className="border-orange-200 bg-orange-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-orange-700 flex items-center gap-2 text-base">
                            <AlertTriangle className="w-5 h-5" />
                            {texts.lowStockAlert}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {lowStock.map(p => (
                                <span key={p.id} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold">
                                    {p.name}: {p.stock} {p.unit}
                                </span>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Products Grid */}
            {products.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                    <Package className="w-12 h-12 mx-auto mb-4 text-zinc-300" />
                    <p className="font-hindi">{texts.noProducts}</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    {products.map((product) => (
                        <Card key={product.id} className="card-hover">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-semibold text-lg">{product.name}</h3>
                                        <p className="text-sm text-zinc-500">{formatCurrency(product.rate)}/{product.unit}</p>
                                    </div>
                                    <div className={cn(
                                        "px-3 py-1 rounded-full text-sm font-bold",
                                        product.stock <= product.min_stock ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                                    )}>
                                        {product.stock} {product.unit}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-500">
                                        Min: {product.min_stock} {product.unit}
                                    </span>
                                    <Button size="sm" variant="outline" onClick={() => openStockUpdate(product)}>
                                        {texts.updateStock}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add Product Dialog */}
            <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-heading flex items-center gap-2">
                            <Package className="w-5 h-5 text-emerald-600" />
                            {texts.addProduct}
                        </DialogTitle>
                        <DialogDescription>{language === 'hi' ? 'नए उत्पाद की जानकारी' : 'New product details'}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddProduct} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="font-hindi">{texts.name} *</Label>
                            <Input
                                value={productForm.name}
                                onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder={language === 'hi' ? 'उत्पाद का नाम' : 'Product name'}
                                className="h-12"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="font-hindi">{texts.unit}</Label>
                                <Select
                                    value={productForm.unit}
                                    onValueChange={(value) => setProductForm(prev => ({ ...prev, unit: value }))}
                                >
                                    <SelectTrigger className="h-12">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="kg">Kg</SelectItem>
                                        <SelectItem value="liter">Liter</SelectItem>
                                        <SelectItem value="piece">Piece</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="font-hindi">{texts.rate}</Label>
                                <Input
                                    type="number"
                                    value={productForm.rate}
                                    onChange={(e) => setProductForm(prev => ({ ...prev, rate: e.target.value }))}
                                    placeholder="0"
                                    className="h-12"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="font-hindi">{texts.stock}</Label>
                                <Input
                                    type="number"
                                    value={productForm.stock}
                                    onChange={(e) => setProductForm(prev => ({ ...prev, stock: e.target.value }))}
                                    placeholder="0"
                                    className="h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-hindi">{texts.minStock}</Label>
                                <Input
                                    type="number"
                                    value={productForm.min_stock}
                                    onChange={(e) => setProductForm(prev => ({ ...prev, min_stock: e.target.value }))}
                                    placeholder="0"
                                    className="h-12"
                                />
                            </div>
                        </div>
                        <Button type="submit" className="w-full h-12 bg-emerald-700 hover:bg-emerald-800" disabled={submitting}>
                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : texts.save}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Stock Update Dialog */}
            <Dialog open={showStockUpdate} onOpenChange={setShowStockUpdate}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-heading">{texts.updateStock}</DialogTitle>
                        <DialogDescription>{selectedProduct?.name}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleStockUpdate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setStockForm(prev => ({ ...prev, type: 'in' }))}
                                className={cn(
                                    "p-4 rounded-lg border-2 flex flex-col items-center gap-2",
                                    stockForm.type === 'in' ? "border-emerald-500 bg-emerald-50" : "border-zinc-200"
                                )}
                            >
                                <ArrowUpCircle className="w-8 h-8 text-emerald-600" />
                                <span className="font-semibold">{texts.stockIn}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setStockForm(prev => ({ ...prev, type: 'out' }))}
                                className={cn(
                                    "p-4 rounded-lg border-2 flex flex-col items-center gap-2",
                                    stockForm.type === 'out' ? "border-red-500 bg-red-50" : "border-zinc-200"
                                )}
                            >
                                <ArrowDownCircle className="w-8 h-8 text-red-600" />
                                <span className="font-semibold">{texts.stockOut}</span>
                            </button>
                        </div>
                        <div className="space-y-2">
                            <Label className="font-hindi">{texts.quantity}</Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={stockForm.quantity}
                                onChange={(e) => setStockForm(prev => ({ ...prev, quantity: e.target.value }))}
                                placeholder="0"
                                className="h-12 text-lg"
                            />
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

export default InventoryPage;
