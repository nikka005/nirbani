import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

// Format currency in INR
export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
}

// Format number with Indian numbering system
export function formatNumber(num, decimals = 2) {
    return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
    }).format(num);
}

// Format date
export function formatDate(dateString, options = {}) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        ...options,
    }).format(date);
}

// Format time
export function formatTime(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    }).format(date);
}

// Get today's date in YYYY-MM-DD format
export function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

// Get initials from name
export function getInitials(name) {
    if (!name) return '?';
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

// Bilingual text helper
export const bilingualText = {
    // Navigation
    dashboard: { en: 'Dashboard', hi: 'डैशबोर्ड' },
    collection: { en: 'Collection', hi: 'संग्रह' },
    farmers: { en: 'Farmers', hi: 'किसान' },
    payments: { en: 'Payments', hi: 'भुगतान' },
    reports: { en: 'Reports', hi: 'रिपोर्ट' },
    settings: { en: 'Settings', hi: 'सेटिंग्स' },
    
    // Actions
    addCollection: { en: 'Add Collection', hi: 'दूध प्रविष्टि' },
    addFarmer: { en: 'Add Farmer', hi: 'किसान जोड़ें' },
    makePayment: { en: 'Make Payment', hi: 'भुगतान करें' },
    viewAll: { en: 'View All', hi: 'सभी देखें' },
    save: { en: 'Save', hi: 'सहेजें' },
    cancel: { en: 'Cancel', hi: 'रद्द करें' },
    delete: { en: 'Delete', hi: 'हटाएं' },
    edit: { en: 'Edit', hi: 'संपादित करें' },
    search: { en: 'Search', hi: 'खोजें' },
    filter: { en: 'Filter', hi: 'फ़िल्टर' },
    
    // Shifts
    morning: { en: 'Morning', hi: 'सुबह' },
    evening: { en: 'Evening', hi: 'शाम' },
    
    // Fields
    farmerName: { en: 'Farmer Name', hi: 'किसान का नाम' },
    phone: { en: 'Phone', hi: 'फ़ोन' },
    village: { en: 'Village', hi: 'गाँव' },
    quantity: { en: 'Quantity', hi: 'मात्रा' },
    fat: { en: 'Fat %', hi: 'फैट %' },
    snf: { en: 'SNF %', hi: 'एसएनएफ %' },
    rate: { en: 'Rate', hi: 'दर' },
    amount: { en: 'Amount', hi: 'राशि' },
    balance: { en: 'Balance', hi: 'बकाया' },
    paid: { en: 'Paid', hi: 'भुगतान' },
    due: { en: 'Due', hi: 'देय' },
    date: { en: 'Date', hi: 'तारीख' },
    
    // Stats
    todayCollection: { en: "Today's Collection", hi: 'आज का संग्रह' },
    totalFarmers: { en: 'Total Farmers', hi: 'कुल किसान' },
    pendingPayments: { en: 'Pending Payments', hi: 'बकाया भुगतान' },
    avgFat: { en: 'Average Fat', hi: 'औसत फैट' },
    
    // Messages
    noData: { en: 'No data available', hi: 'कोई डेटा उपलब्ध नहीं' },
    loading: { en: 'Loading...', hi: 'लोड हो रहा है...' },
    success: { en: 'Success', hi: 'सफल' },
    error: { en: 'Error', hi: 'त्रुटि' },
    
    // Auth
    login: { en: 'Login', hi: 'लॉगिन' },
    logout: { en: 'Logout', hi: 'लॉगआउट' },
    register: { en: 'Register', hi: 'रजिस्टर' },
    email: { en: 'Email', hi: 'ईमेल' },
    password: { en: 'Password', hi: 'पासवर्ड' },
    name: { en: 'Name', hi: 'नाम' },
};

// Get bilingual text
export function getText(key, lang = 'hi') {
    const text = bilingualText[key];
    if (!text) return key;
    return text[lang] || text.en;
}

// Format bilingual label
export function getBilingualLabel(key) {
    const text = bilingualText[key];
    if (!text) return { en: key, hi: key };
    return text;
}

// Calculate SNF from Fat
export function calculateSNF(fat) {
    return (8.5 + (fat / 4)).toFixed(2);
}

// Validate phone number (Indian)
export function isValidPhone(phone) {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
}

// Debounce function
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
