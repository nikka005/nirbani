import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
    Upload, 
    Download,
    FileSpreadsheet,
    Users,
    Milk,
    Loader2,
    CheckCircle,
    XCircle,
    AlertCircle,
    FileUp
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const BulkUploadPage = () => {
    const { language } = useAuth();
    const [activeTab, setActiveTab] = useState('collections');
    const [csvData, setCsvData] = useState('');
    const [uploading, setUploading] = useState(false);
    const [results, setResults] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);

    const texts = {
        title: language === 'hi' ? 'बल्क अपलोड' : 'Bulk Upload',
        collections: language === 'hi' ? 'दूध संग्रह' : 'Milk Collections',
        farmers: language === 'hi' ? 'किसान' : 'Farmers',
        downloadTemplate: language === 'hi' ? 'टेम्पलेट डाउनलोड करें' : 'Download Template',
        upload: language === 'hi' ? 'अपलोड करें' : 'Upload',
        pasteData: language === 'hi' ? 'CSV डेटा पेस्ट करें' : 'Paste CSV Data',
        success: language === 'hi' ? 'सफल' : 'Success',
        failed: language === 'hi' ? 'विफल' : 'Failed',
        errors: language === 'hi' ? 'त्रुटियाँ' : 'Errors',
        orUploadFile: language === 'hi' ? 'या Excel/CSV फ़ाइल अपलोड करें' : 'Or upload Excel/CSV file',
        selectFile: language === 'hi' ? 'फ़ाइल चुनें' : 'Select File',
        instructions: language === 'hi' 
            ? 'Excel/CSV फ़ाइल से डेटा कॉपी करके नीचे पेस्ट करें' 
            : 'Copy data from Excel/CSV file and paste below',
        collectionFormat: language === 'hi'
            ? 'प्रारूप: farmer_phone, shift (morning/evening), quantity, fat, snf'
            : 'Format: farmer_phone, shift (morning/evening), quantity, fat, snf',
        farmerFormat: language === 'hi'
            ? 'प्रारूप: name, phone, village, address, bank_account, ifsc_code, aadhar_number'
            : 'Format: name, phone, village, address, bank_account, ifsc_code, aadhar_number',
    };

    const downloadTemplate = async (type) => {
        const token = localStorage.getItem('auth_token');
        try {
            const response = await axios.get(`${BACKEND_URL}/api/bulk/template/${type}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const blob = new Blob([response.data.template], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}_template.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success(language === 'hi' ? 'टेम्पलेट डाउनलोड हुआ' : 'Template downloaded');
        } catch (error) {
            toast.error('Error downloading template');
        }
    };

    const parseCSV = (csv) => {
        const lines = csv.trim().split('\n');
        if (lines.length < 2) return [];
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((h, idx) => { row[h] = values[idx]; });
                data.push(row);
            }
        }
        return data;
    };

    const handleFileUpload = async () => {
        if (!selectedFile) {
            toast.error(language === 'hi' ? 'फ़ाइल चुनें' : 'Select a file');
            return;
        }
        setUploading(true);
        setResults(null);
        const token = localStorage.getItem('auth_token');
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            const response = await axios.post(
                `${BACKEND_URL}/api/bulk/upload-file?upload_type=${activeTab}`,
                formData,
                { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
            );
            setResults(response.data);
            if (response.data.success > 0) {
                toast.success(`${response.data.success} ${language === 'hi' ? 'प्रविष्टियाँ सफल' : 'entries successful'}`);
            }
            if (response.data.failed > 0) {
                toast.error(`${response.data.failed} ${language === 'hi' ? 'प्रविष्टियाँ विफल' : 'entries failed'}`);
            }
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleCSVUpload = async () => {
        if (!csvData.trim()) {
            toast.error(language === 'hi' ? 'कृपया डेटा पेस्ट करें' : 'Please paste data');
            return;
        }
        setUploading(true);
        setResults(null);
        const token = localStorage.getItem('auth_token');
        try {
            const parsedData = parseCSV(csvData);
            if (parsedData.length === 0) {
                toast.error(language === 'hi' ? 'कोई वैध डेटा नहीं मिला' : 'No valid data found');
                setUploading(false);
                return;
            }
            let response;
            if (activeTab === 'collections') {
                const entries = parsedData.map(row => ({
                    farmer_phone: row.farmer_phone || row.phone,
                    shift: row.shift || 'morning',
                    quantity: parseFloat(row.quantity) || 0,
                    fat: parseFloat(row.fat) || 0,
                    snf: row.snf ? parseFloat(row.snf) : null,
                }));
                response = await axios.post(`${BACKEND_URL}/api/bulk/collections`, 
                    { entries }, { headers: { Authorization: `Bearer ${token}` } });
            } else {
                const farmers = parsedData.map(row => ({
                    name: row.name, phone: row.phone,
                    village: row.village || '', address: row.address || '',
                    bank_account: row.bank_account || '', ifsc_code: row.ifsc_code || '',
                    aadhar_number: row.aadhar_number || '',
                }));
                response = await axios.post(`${BACKEND_URL}/api/bulk/farmers`, 
                    farmers, { headers: { Authorization: `Bearer ${token}` } });
            }
            setResults(response.data);
            if (response.data.success > 0) toast.success(`${response.data.success} entries successful`);
            if (response.data.failed > 0) toast.error(`${response.data.failed} entries failed`);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const renderUploadContent = (type) => (
        <Card>
            <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    {type === 'collections' ? texts.collections : texts.farmers}
                </CardTitle>
                <CardDescription>{type === 'collections' ? texts.collectionFormat : texts.farmerFormat}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button variant="outline" onClick={() => downloadTemplate(type)} data-testid={`download-${type}-template`}>
                    <Download className="w-4 h-4 mr-2" />
                    {texts.downloadTemplate}
                </Button>

                {/* File Upload */}
                <div className="border-2 border-dashed border-zinc-200 rounded-xl p-6 text-center hover:border-emerald-300 transition-colors">
                    <FileUp className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
                    <p className="text-sm text-zinc-600 mb-3">{texts.orUploadFile}</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={(e) => setSelectedFile(e.target.files[0])}
                        className="hidden"
                        data-testid={`file-input-${type}`}
                    />
                    <div className="flex items-center justify-center gap-3">
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()} data-testid={`select-file-${type}`}>
                            {texts.selectFile}
                        </Button>
                        {selectedFile && (
                            <span className="text-sm text-emerald-600 font-semibold">{selectedFile.name}</span>
                        )}
                    </div>
                    {selectedFile && (
                        <Button 
                            onClick={handleFileUpload} 
                            className="mt-3 bg-emerald-700 hover:bg-emerald-800"
                            disabled={uploading}
                            data-testid={`upload-file-${type}`}
                        >
                            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <><Upload className="w-4 h-4 mr-2" />{texts.upload}</>
                            )}
                        </Button>
                    )}
                </div>

                {/* CSV Paste */}
                <div className="space-y-2">
                    <p className="text-sm text-zinc-600 font-semibold">{texts.instructions}</p>
                    <Textarea
                        value={csvData}
                        onChange={(e) => setCsvData(e.target.value)}
                        placeholder={type === 'collections' 
                            ? "farmer_phone,shift,quantity,fat,snf\n9876543210,morning,5.5,4.2,8.5"
                            : "name,phone,village,address\nRam,9876543210,Gokulpur,Main Market"}
                        rows={6}
                        className="font-mono text-sm"
                        data-testid={`csv-textarea-${type}`}
                    />
                </div>

                <Button 
                    onClick={handleCSVUpload} 
                    className="w-full h-12 bg-emerald-700 hover:bg-emerald-800"
                    disabled={uploading}
                    data-testid={`csv-upload-${type}`}
                >
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <><Upload className="w-5 h-5 mr-2" />{texts.upload} (CSV)</>
                    )}
                </Button>
            </CardContent>
        </Card>
    );

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Upload className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                    <h1 className="font-heading text-2xl font-bold text-zinc-900">{texts.title}</h1>
                    <p className="text-muted-foreground text-sm">
                        {language === 'hi' ? 'Excel/CSV से एक साथ कई प्रविष्टियाँ अपलोड करें' : 'Upload multiple entries from Excel/CSV'}
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setResults(null); setCsvData(''); setSelectedFile(null); }}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="collections" className="font-hindi" data-testid="bulk-collections-tab">
                        <Milk className="w-4 h-4 mr-2" />{texts.collections}
                    </TabsTrigger>
                    <TabsTrigger value="farmers" className="font-hindi" data-testid="bulk-farmers-tab">
                        <Users className="w-4 h-4 mr-2" />{texts.farmers}
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="collections" className="mt-4 space-y-4">{renderUploadContent('collections')}</TabsContent>
                <TabsContent value="farmers" className="mt-4 space-y-4">{renderUploadContent('farmers')}</TabsContent>
            </Tabs>

            {results && (
                <Card className={results.failed > 0 ? "border-orange-200" : "border-emerald-200"} data-testid="upload-results">
                    <CardHeader>
                        <CardTitle className="text-base">{language === 'hi' ? 'अपलोड परिणाम' : 'Upload Results'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-6 mb-4">
                            <div className="flex items-center gap-2 text-emerald-600">
                                <CheckCircle className="w-5 h-5" />
                                <span className="font-bold">{results.success}</span>
                                <span className="text-sm">{texts.success}</span>
                            </div>
                            {results.failed > 0 && (
                                <div className="flex items-center gap-2 text-red-600">
                                    <XCircle className="w-5 h-5" />
                                    <span className="font-bold">{results.failed}</span>
                                    <span className="text-sm">{texts.failed}</span>
                                </div>
                            )}
                        </div>
                        {results.errors && results.errors.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-red-700 mb-2">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="font-semibold">{texts.errors}:</span>
                                </div>
                                <ul className="text-sm text-red-600 space-y-1 max-h-40 overflow-y-auto">
                                    {results.errors.map((err, idx) => (<li key={idx}>&#x2022; {err}</li>))}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default BulkUploadPage;
