"""
Nirbani Dairy Management System - New Features Tests
Tests: Thermal Bill, A4 Invoice, OCR Rate Chart Upload, PWA manifest, Service Worker
"""

import pytest
import requests
import os
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="session")
def auth_token(api_client):
    """Get auth token"""
    login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@nirbani.com",
        "password": "admin123"
    })
    
    if login_response.status_code == 200:
        return login_response.json().get("access_token")
    pytest.skip("Authentication failed - cannot proceed")

@pytest.fixture(scope="session")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client

@pytest.fixture(scope="session")
def test_farmer_id(authenticated_client):
    """Get an existing farmer ID for testing"""
    response = authenticated_client.get(f"{BASE_URL}/api/farmers")
    if response.status_code == 200:
        farmers = response.json()
        if farmers:
            return farmers[0]["id"]
    pytest.skip("No farmers available for testing")


class TestThermalBill:
    """Thermal printer bill (58mm/80mm) tests"""
    
    def test_thermal_bill_html_generated(self, api_client, test_farmer_id):
        """Test thermal bill HTML endpoint returns valid HTML"""
        response = api_client.get(f"{BASE_URL}/api/bills/thermal/{test_farmer_id}")
        assert response.status_code == 200, f"Failed: {response.text}"
        assert "text/html" in response.headers.get("content-type", "")
        
        html = response.text
        # Check for 58mm width styling
        assert "width:58mm" in html or "width: 58mm" in html
        assert "Courier New" in html  # Monospace font
        assert "<!DOCTYPE html>" in html
        print(f"✓ Thermal bill HTML generated: {len(html)} bytes")

    def test_thermal_bill_content(self, api_client, test_farmer_id):
        """Test thermal bill contains expected content"""
        response = api_client.get(f"{BASE_URL}/api/bills/thermal/{test_farmer_id}")
        assert response.status_code == 200
        
        html = response.text
        # Should contain dairy name
        assert "Nirbani Dairy" in html
        # Should have print media query
        assert "@media print" in html
        # Should have table for data
        assert "<table>" in html
        print("✓ Thermal bill contains expected content")

    def test_thermal_bill_not_found(self, api_client):
        """Test thermal bill with invalid farmer ID returns 404"""
        response = api_client.get(f"{BASE_URL}/api/bills/thermal/invalid-id-12345")
        assert response.status_code == 404
        print("✓ Thermal bill returns 404 for invalid farmer")


class TestA4Invoice:
    """Professional A4 invoice tests"""
    
    def test_a4_invoice_html_generated(self, api_client, test_farmer_id):
        """Test A4 invoice HTML endpoint returns valid HTML"""
        response = api_client.get(f"{BASE_URL}/api/bills/a4/{test_farmer_id}")
        assert response.status_code == 200, f"Failed: {response.text}"
        assert "text/html" in response.headers.get("content-type", "")
        
        html = response.text
        # Check for A4 print media
        assert "@page" in html
        assert "<!DOCTYPE html>" in html
        print(f"✓ A4 invoice HTML generated: {len(html)} bytes")

    def test_a4_invoice_professional_styling(self, api_client, test_farmer_id):
        """Test A4 invoice has professional styling"""
        response = api_client.get(f"{BASE_URL}/api/bills/a4/{test_farmer_id}")
        assert response.status_code == 200
        
        html = response.text
        # Green theme matching dairy branding
        assert "#15803d" in html  # Green color
        # Has invoice title
        assert "INVOICE" in html or "invoice" in html.lower()
        # Has signature area
        assert "Signature" in html or "signature" in html.lower()
        print("✓ A4 invoice has professional styling")

    def test_a4_invoice_content(self, api_client, test_farmer_id):
        """Test A4 invoice contains expected content"""
        response = api_client.get(f"{BASE_URL}/api/bills/a4/{test_farmer_id}")
        assert response.status_code == 200
        
        html = response.text
        # Should have dairy name
        assert "Nirbani Dairy" in html
        # Should have table headers
        assert "Fat" in html
        assert "SNF" in html
        assert "Rate" in html
        print("✓ A4 invoice contains expected content")

    def test_a4_invoice_not_found(self, api_client):
        """Test A4 invoice with invalid farmer ID returns 404"""
        response = api_client.get(f"{BASE_URL}/api/bills/a4/invalid-id-12345")
        assert response.status_code == 404
        print("✓ A4 invoice returns 404 for invalid farmer")


class TestOCRRateChartUpload:
    """OCR rate chart upload using AI (GPT-4o) tests"""
    
    def test_ocr_upload_without_file_fails(self, authenticated_client):
        """Test OCR upload without file returns error"""
        response = authenticated_client.post(f"{BASE_URL}/api/rate-charts/ocr-upload")
        assert response.status_code == 422  # Validation error
        print("✓ OCR upload without file returns 422")

    def test_ocr_upload_invalid_file_type(self, authenticated_client):
        """Test OCR upload with invalid file type returns error"""
        # Create a text file (not an image)
        files = {'file': ('test.txt', b'This is not an image', 'text/plain')}
        headers = {k: v for k, v in authenticated_client.headers.items() if k.lower() != 'content-type'}
        
        response = requests.post(
            f"{BASE_URL}/api/rate-charts/ocr-upload",
            files=files,
            headers=headers
        )
        assert response.status_code == 400
        assert "supported" in response.text.lower() or "Only" in response.text
        print("✓ OCR upload with invalid file type returns 400")


class TestPWA:
    """PWA (Progressive Web App) tests"""
    
    def test_manifest_accessible(self, api_client):
        """Test manifest.json is accessible"""
        response = api_client.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200
        
        manifest = response.json()
        assert "name" in manifest
        assert "short_name" in manifest
        assert "icons" in manifest
        print(f"✓ PWA manifest accessible: {manifest.get('name')}")

    def test_manifest_content(self, api_client):
        """Test manifest has required PWA fields"""
        response = api_client.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200
        
        manifest = response.json()
        assert manifest.get("name") == "Nirbani Dairy"
        assert manifest.get("short_name") == "Nirbani"
        assert manifest.get("display") == "standalone"
        assert manifest.get("theme_color") == "#15803d"  # Green theme
        assert len(manifest.get("icons", [])) >= 2  # At least 192 and 512 icons
        print("✓ PWA manifest has required fields")

    def test_manifest_icons(self, api_client):
        """Test manifest icons are defined"""
        response = api_client.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200
        
        manifest = response.json()
        icons = manifest.get("icons", [])
        
        sizes = [icon.get("sizes") for icon in icons]
        assert "192x192" in sizes
        assert "512x512" in sizes
        print(f"✓ PWA manifest has icons: {sizes}")


class TestCSVExportEndpoints:
    """CSV export endpoints tests (updated)"""
    
    def test_export_collections_csv(self, authenticated_client):
        """Test collections export"""
        response = authenticated_client.get(f"{BASE_URL}/api/export/collections")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        assert "Date,Farmer,Shift" in response.text
        print(f"✓ Collections CSV export: {len(response.content)} bytes")

    def test_export_farmers_csv(self, authenticated_client):
        """Test farmers export"""
        response = authenticated_client.get(f"{BASE_URL}/api/export/farmers")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        assert "Name,Phone,Village" in response.text
        print(f"✓ Farmers CSV export: {len(response.content)} bytes")

    def test_export_payments_csv(self, authenticated_client):
        """Test payments export"""
        response = authenticated_client.get(f"{BASE_URL}/api/export/payments")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        assert "Date,Farmer,Amount" in response.text
        print(f"✓ Payments CSV export: {len(response.content)} bytes")

    def test_export_sales_csv(self, authenticated_client):
        """Test sales export"""
        response = authenticated_client.get(f"{BASE_URL}/api/export/sales")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print(f"✓ Sales CSV export: {len(response.content)} bytes")

    def test_export_expenses_csv(self, authenticated_client):
        """Test expenses export"""
        response = authenticated_client.get(f"{BASE_URL}/api/export/expenses")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print(f"✓ Expenses CSV export: {len(response.content)} bytes")


class TestWhatsAppShareLinks:
    """WhatsApp share link generation tests"""
    
    def test_farmer_bill_whatsapp_share(self, authenticated_client, test_farmer_id):
        """Test farmer bill WhatsApp share link"""
        response = authenticated_client.get(f"{BASE_URL}/api/share/farmer-bill/{test_farmer_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "whatsapp_link" in data
        assert "message" in data
        assert data["whatsapp_link"].startswith("https://wa.me/")
        # Message should have Hindi content
        assert "Nirbani Dairy" in data["message"]
        print(f"✓ WhatsApp share link for farmer: {data.get('farmer', 'unknown')}")


class TestReportsEndpoints:
    """Reports API endpoint tests"""
    
    def test_daily_report(self, authenticated_client):
        """Test daily report"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = authenticated_client.get(f"{BASE_URL}/api/reports/daily?date={today}")
        assert response.status_code == 200
        
        data = response.json()
        assert "collections" in data
        assert "summary" in data
        print(f"✓ Daily report: {data['summary']['total_quantity']}L")

    def test_fat_average_report(self, authenticated_client):
        """Test fat average report"""
        response = authenticated_client.get(f"{BASE_URL}/api/reports/fat-average")
        assert response.status_code == 200
        
        data = response.json()
        assert "period" in data
        assert "report" in data
        print(f"✓ Fat average report: {len(data['report'])} farmers")

    def test_farmer_ranking_report(self, authenticated_client):
        """Test farmer ranking report"""
        response = authenticated_client.get(f"{BASE_URL}/api/reports/farmer-ranking?sort_by=quantity")
        assert response.status_code == 200
        
        data = response.json()
        assert "ranking" in data
        print(f"✓ Farmer ranking: {len(data['ranking'])} farmers")

    def test_monthly_summary(self, authenticated_client):
        """Test monthly summary report"""
        current_month = datetime.now().strftime("%Y-%m")
        response = authenticated_client.get(f"{BASE_URL}/api/reports/monthly-summary?month={current_month}")
        assert response.status_code == 200
        
        data = response.json()
        assert "collection" in data
        assert "sales" in data
        assert "expenses" in data
        assert "profit" in data
        print(f"✓ Monthly summary: {data['collection']['total_milk']}L, ₹{data['profit']['net']} net")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
