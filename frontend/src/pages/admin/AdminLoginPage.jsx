import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AdminLoginPage = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loginData, setLoginData] = useState({ email: '', password: '' });

    React.useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (token) navigate('/backman');
    }, [navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post(`${BACKEND_URL}/api/admin/login`, loginData);
            const { access_token, user } = res.data;
            localStorage.setItem('admin_token', access_token);
            localStorage.setItem('admin_user', JSON.stringify(user));
            toast.success('Admin login successful!');
            navigate('/backman');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-900 p-6">
            <Card className="w-full max-w-md shadow-2xl border-zinc-800 bg-zinc-950">
                <CardHeader className="text-center pb-2">
                    <div className="w-14 h-14 bg-amber-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-7 h-7 text-amber-500" />
                    </div>
                    <CardTitle className="font-heading text-2xl text-white">
                        Admin Panel
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                        Nirbani Dairy Management
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-zinc-300">Email</Label>
                            <Input
                                type="email"
                                data-testid="admin-login-email"
                                placeholder="admin@dairy.com"
                                value={loginData.email}
                                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                                required
                                className="h-12 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-zinc-300">Password</Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    data-testid="admin-login-password"
                                    placeholder="********"
                                    value={loginData.password}
                                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                    required
                                    className="h-12 pr-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        <Button type="submit" data-testid="admin-login-submit"
                            className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-base font-semibold"
                            disabled={loading}>
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login to Admin Panel'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminLoginPage;
