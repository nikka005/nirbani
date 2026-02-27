import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Milk, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const LoginPage = () => {
    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const [loginData, setLoginData] = useState({
        email: '',
        password: '',
    });

    React.useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(loginData.email, loginData.password);
            toast.success('लॉगिन सफल!', { description: 'स्वागत है आपका' });
            navigate('/');
        } catch (error) {
            toast.error('लॉगिन विफल', { 
                description: error.response?.data?.detail || 'कृपया अपना ईमेल और पासवर्ड जांचें' 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col lg:flex-row">
            {/* Hero Section */}
            <div className="login-hero lg:w-1/2 p-8 lg:p-16 flex flex-col justify-center text-white">
                <div className="relative z-10 max-w-lg">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                            <Milk className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="font-heading text-3xl font-bold">Nirbani Dairy</h1>
                            <p className="text-emerald-200 font-hindi">डेयरी प्रबंधन सॉफ्टवेयर</p>
                        </div>
                    </div>
                    
                    <h2 className="font-heading text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                        अपनी डेयरी का<br />
                        <span className="text-lime-300">स्मार्ट प्रबंधन</span>
                    </h2>
                    
                    <p className="text-lg text-emerald-100 mb-8 font-hindi leading-relaxed">
                        दूध संग्रह, किसान भुगतान, फैट/एसएनएफ गणना - सब कुछ एक जगह।
                        भारतीय डेयरी व्यवसाय के लिए बनाया गया।
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                            <p className="text-3xl font-bold">100+</p>
                            <p className="text-emerald-200 text-sm font-hindi">सक्रिय डेयरी</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                            <p className="text-3xl font-bold">50K+</p>
                            <p className="text-emerald-200 text-sm font-hindi">दैनिक संग्रह</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Section */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-16 bg-zinc-50">
                <Card className="w-full max-w-md shadow-xl border-0">
                    <CardHeader className="text-center pb-2">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4 lg:hidden">
                            <Milk className="w-6 h-6 text-emerald-700" />
                        </div>
                        <CardTitle className="font-heading text-2xl">
                            लॉगिन करें
                        </CardTitle>
                        <CardDescription className="font-hindi">
                            अपने खाते में प्रवेश करें
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="login-email" className="font-hindi">ईमेल</Label>
                                <Input
                                    id="login-email"
                                    type="email"
                                    data-testid="login-email"
                                    placeholder="your@email.com"
                                    value={loginData.email}
                                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                                    required
                                    className="h-12"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <Label htmlFor="login-password" className="font-hindi">पासवर्ड</Label>
                                <div className="relative">
                                    <Input
                                        id="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        data-testid="login-password"
                                        placeholder="********"
                                        value={loginData.password}
                                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                        required
                                        className="h-12 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <Button 
                                type="submit" 
                                data-testid="login-submit"
                                className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 font-hindi text-base"
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    'लॉगिन करें'
                                )}
                            </Button>
                            
                            <p className="text-xs text-center text-zinc-400 font-hindi mt-4">
                                लॉगिन की जानकारी के लिए एडमिन से संपर्क करें
                            </p>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default LoginPage;
