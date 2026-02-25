import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [language, setLanguage] = useState(() => {
        return localStorage.getItem('language') || 'hi';
    });

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        localStorage.setItem('language', language);
    }, [language]);

    const checkAuth = async () => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            try {
                const response = await authAPI.getMe();
                setUser(response.data);
            } catch (error) {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    };

    const login = async (email, password) => {
        const response = await authAPI.login({ email, password });
        const { access_token, user: userData } = response.data;
        localStorage.setItem('auth_token', access_token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return userData;
    };

    const register = async (userData) => {
        const response = await authAPI.register(userData);
        const { access_token, user: newUser } = response.data;
        localStorage.setItem('auth_token', access_token);
        localStorage.setItem('user', JSON.stringify(newUser));
        setUser(newUser);
        return newUser;
    };

    const logout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'hi' ? 'en' : 'hi');
    };

    const value = {
        user,
        loading,
        language,
        login,
        register,
        logout,
        toggleLanguage,
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
