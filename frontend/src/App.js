import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';
import './App.css';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CollectionPage from './pages/CollectionPage';
import FarmersPage from './pages/FarmersPage';
import FarmerDetailPage from './pages/FarmerDetailPage';
import PaymentsPage from './pages/PaymentsPage';
import RateChartPage from './pages/RateChartPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

// Layout
import MainLayout from './components/layout/MainLayout';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-700 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground font-hindi">लोड हो रहा है...</p>
                </div>
            </div>
        );
    }
    
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    
    return children;
};

// App Routes
const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route path="/" element={
                <ProtectedRoute>
                    <MainLayout />
                </ProtectedRoute>
            }>
                <Route index element={<DashboardPage />} />
                <Route path="collection" element={<CollectionPage />} />
                <Route path="farmers" element={<FarmersPage />} />
                <Route path="farmers/:id" element={<FarmerDetailPage />} />
                <Route path="payments" element={<PaymentsPage />} />
                <Route path="rate-chart" element={<RateChartPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <div className="app-container">
                    <AppRoutes />
                    <Toaster 
                        position="top-center" 
                        richColors 
                        closeButton
                        toastOptions={{
                            style: {
                                fontFamily: 'Mukta, sans-serif',
                            },
                        }}
                    />
                </div>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
