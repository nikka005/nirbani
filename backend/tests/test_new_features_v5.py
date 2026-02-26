"""
Test file for Nirbani Dairy new features - Iteration 5
Features tested:
1. POST /api/sales/shop - Shop/walk-in sale without customer account
2. GET /api/dispatches/{id}/bill - HTML bill for dispatch entry
3. GET /api/dairy-plants/{id}/statement - HTML statement for dairy ledger
4. GET /api/dairy/profit-report - Includes retail_sales in calculation
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Login and get auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test@test.com",
        "password": "test123"
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Authentication failed - cannot run tests")

@pytest.fixture(scope="module")
def headers(auth_token):
    """Auth headers for API requests"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestShopSaleAPI:
    """Tests for POST /api/sales/shop - Shop/walk-in sale"""
    
    def test_shop_sale_basic(self, headers):
        """Test creating a basic shop sale"""
        response = requests.post(f"{BASE_URL}/api/sales/shop", json={
            "product": "milk",
            "quantity": 2.5,
            "rate": 60
        }, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["customer_id"] == "shop_walk_in"
        assert data["customer_name"] == "Walk-in"
        assert data["product"] == "milk"
        assert data["quantity"] == 2.5
        assert data["rate"] == 60
        assert data["amount"] == 150.0  # 2.5 * 60
        assert data["is_shop_sale"] == True
        assert "date" in data
        print(f"PASS: Shop sale created - ID: {data['id']}, Amount: Rs.{data['amount']}")
    
    def test_shop_sale_with_customer_name(self, headers):
        """Test shop sale with optional customer name"""
        response = requests.post(f"{BASE_URL}/api/sales/shop", json={
            "customer_name": "Ramesh ji",
            "product": "milk",
            "quantity": 1,
            "rate": 65
        }, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["customer_name"] == "Ramesh ji"
        assert data["is_shop_sale"] == True
        print(f"PASS: Shop sale with customer name - {data['customer_name']}")
    
    def test_shop_sale_different_product(self, headers):
        """Test shop sale with different product"""
        response = requests.post(f"{BASE_URL}/api/sales/shop", json={
            "product": "dahi",
            "quantity": 0.5,
            "rate": 80
        }, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["product"] == "dahi"
        assert data["amount"] == 40.0
        print(f"PASS: Shop sale for dahi - Amount: Rs.{data['amount']}")
    
    def test_shop_sale_appears_in_today_sales(self, headers):
        """Verify shop sale appears in today's sales list"""
        # First create a unique shop sale
        unique_name = f"TEST_ShopSale_{datetime.now().strftime('%H%M%S')}"
        create_res = requests.post(f"{BASE_URL}/api/sales/shop", json={
            "customer_name": unique_name,
            "product": "milk",
            "quantity": 3,
            "rate": 55
        }, headers=headers)
        assert create_res.status_code == 200
        created_id = create_res.json()["id"]
        
        # Check today's sales
        today_res = requests.get(f"{BASE_URL}/api/sales/today", headers=headers)
        assert today_res.status_code == 200
        sales = today_res.json().get("sales", [])
        
        # Find our sale
        found = any(s["id"] == created_id for s in sales)
        assert found, f"Shop sale {created_id} not found in today's sales"
        print(f"PASS: Shop sale {created_id} appears in today's sales list")


class TestDispatchBillAPI:
    """Tests for GET /api/dispatches/{id}/bill - Dispatch bill HTML"""
    
    @pytest.fixture
    def dairy_plant_id(self, headers):
        """Get or create a dairy plant"""
        # First try to get existing plants
        res = requests.get(f"{BASE_URL}/api/dairy-plants", headers=headers)
        if res.status_code == 200 and len(res.json()) > 0:
            return res.json()[0]["id"]
        
        # Create new plant if none exists
        create_res = requests.post(f"{BASE_URL}/api/dairy-plants", json={
            "name": "TEST_Dairy_Plant",
            "code": "TDP"
        }, headers=headers)
        if create_res.status_code == 200:
            return create_res.json()["id"]
        pytest.skip("Cannot get/create dairy plant")
    
    @pytest.fixture
    def dispatch_id(self, headers, dairy_plant_id):
        """Get or create a dispatch entry"""
        # Try to get existing dispatches
        res = requests.get(f"{BASE_URL}/api/dispatches", headers=headers)
        if res.status_code == 200 and len(res.json()) > 0:
            return res.json()[0]["id"]
        
        # Create dispatch if none exists
        create_res = requests.post(f"{BASE_URL}/api/dispatches", json={
            "dairy_plant_id": dairy_plant_id,
            "quantity_kg": 100,
            "avg_fat": 4.5,
            "avg_snf": 8.5,
            "rate_per_kg": 35
        }, headers=headers)
        if create_res.status_code == 200:
            return create_res.json()["id"]
        pytest.skip("Cannot get/create dispatch")
    
    def test_dispatch_bill_returns_html(self, headers, dispatch_id):
        """Test that dispatch bill endpoint returns HTML"""
        response = requests.get(f"{BASE_URL}/api/dispatches/{dispatch_id}/bill", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "html" in data, "Response should contain 'html' field"
        assert "dispatch" in data, "Response should contain 'dispatch' field"
        
        html = data["html"]
        assert "<!DOCTYPE html>" in html
        assert "DISPATCH BILL" in html or "डिस्पैच बिल" in html
        assert "quantity_kg" in str(data["dispatch"]) or data["dispatch"]["quantity_kg"] > 0
        print(f"PASS: Dispatch bill HTML returned for {dispatch_id}")
    
    def test_dispatch_bill_contains_details(self, headers, dispatch_id):
        """Verify dispatch bill contains all required details"""
        response = requests.get(f"{BASE_URL}/api/dispatches/{dispatch_id}/bill", headers=headers)
        assert response.status_code == 200
        html = response.json()["html"]
        
        # Check for key sections
        assert "FAT" in html
        assert "SNF" in html
        assert "KG" in html
        assert "Net Receivable" in html or "शुद्ध प्राप्य" in html
        print("PASS: Dispatch bill contains all required details")
    
    def test_dispatch_bill_not_found(self, headers):
        """Test 404 for non-existent dispatch bill"""
        response = requests.get(f"{BASE_URL}/api/dispatches/non-existent-id/bill", headers=headers)
        assert response.status_code == 404
        print("PASS: Returns 404 for non-existent dispatch")


class TestDairyStatementAPI:
    """Tests for GET /api/dairy-plants/{id}/statement"""
    
    @pytest.fixture
    def dairy_plant_id(self, headers):
        """Get or create a dairy plant"""
        res = requests.get(f"{BASE_URL}/api/dairy-plants", headers=headers)
        if res.status_code == 200 and len(res.json()) > 0:
            return res.json()[0]["id"]
        
        create_res = requests.post(f"{BASE_URL}/api/dairy-plants", json={
            "name": "TEST_Statement_Dairy",
            "code": "TSD"
        }, headers=headers)
        if create_res.status_code == 200:
            return create_res.json()["id"]
        pytest.skip("Cannot get/create dairy plant")
    
    def test_dairy_statement_returns_html(self, headers, dairy_plant_id):
        """Test that dairy statement endpoint returns HTML"""
        response = requests.get(f"{BASE_URL}/api/dairy-plants/{dairy_plant_id}/statement", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "html" in data, "Response should contain 'html' field"
        
        html = data["html"]
        assert "<!DOCTYPE html>" in html
        assert "DAIRY STATEMENT" in html or "डेयरी विवरण" in html
        print(f"PASS: Dairy statement HTML returned for plant {dairy_plant_id}")
    
    def test_dairy_statement_contains_summary(self, headers, dairy_plant_id):
        """Verify statement contains summary section"""
        response = requests.get(f"{BASE_URL}/api/dairy-plants/{dairy_plant_id}/statement", headers=headers)
        assert response.status_code == 200
        html = response.json()["html"]
        
        assert "Total Supplied" in html or "कुल आपूर्ति" in html
        assert "Total Amount" in html or "कुल राशि" in html
        assert "Balance" in html or "बकाया" in html
        print("PASS: Dairy statement contains summary sections")
    
    def test_dairy_statement_with_date_range(self, headers, dairy_plant_id):
        """Test statement with date range parameters"""
        response = requests.get(
            f"{BASE_URL}/api/dairy-plants/{dairy_plant_id}/statement",
            params={"start_date": "2026-01-01", "end_date": "2026-01-31"},
            headers=headers
        )
        assert response.status_code == 200
        html = response.json()["html"]
        assert "2026-01-01 to 2026-01-31" in html
        print("PASS: Dairy statement with date range works")
    
    def test_dairy_statement_not_found(self, headers):
        """Test 404 for non-existent dairy plant"""
        response = requests.get(f"{BASE_URL}/api/dairy-plants/non-existent-id/statement", headers=headers)
        assert response.status_code == 404
        print("PASS: Returns 404 for non-existent dairy plant")


class TestProfitReportWithRetailSales:
    """Tests for GET /api/dairy/profit-report with retail_sales"""
    
    def test_profit_report_has_retail_sales_field(self, headers):
        """Test that profit report includes retail_sales in response"""
        response = requests.get(f"{BASE_URL}/api/dairy/profit-report", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "retail_sales" in data, "Profit report should include 'retail_sales' field"
        retail = data["retail_sales"]
        assert "total_amount" in retail
        assert "count" in retail
        print(f"PASS: Profit report has retail_sales - Amount: Rs.{retail['total_amount']}, Count: {retail['count']}")
    
    def test_profit_report_structure(self, headers):
        """Verify complete profit report structure"""
        response = requests.get(f"{BASE_URL}/api/dairy/profit-report", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check main sections exist
        assert "profit" in data
        assert "dispatch" in data
        assert "collection" in data
        assert "expenses" in data
        assert "retail_sales" in data
        
        # Check profit calculation fields
        profit = data["profit"]
        assert "net_profit" in profit
        assert "gross_profit" in profit
        print(f"PASS: Profit report structure verified - Net Profit: Rs.{profit.get('net_profit', 0)}")
    
    def test_profit_report_with_date_range(self, headers):
        """Test profit report with date parameters"""
        response = requests.get(
            f"{BASE_URL}/api/dairy/profit-report",
            params={"start_date": "2026-01-01", "end_date": "2026-01-25"},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        # Verify profit report returns expected structure
        assert "profit" in data or "period" in data
        print(f"PASS: Profit report with date range works - Keys: {list(data.keys())}")
    
    def test_retail_sales_included_in_profit_calculation(self, headers):
        """Verify retail sales is considered in profit calculation"""
        # Create a shop sale first
        shop_res = requests.post(f"{BASE_URL}/api/sales/shop", json={
            "customer_name": "TEST_ProfitCheck",
            "product": "milk",
            "quantity": 5,
            "rate": 60
        }, headers=headers)
        assert shop_res.status_code == 200
        
        # Get profit report
        profit_res = requests.get(f"{BASE_URL}/api/dairy/profit-report", headers=headers)
        assert profit_res.status_code == 200
        data = profit_res.json()
        
        # Retail sales should have value
        retail_amount = data["retail_sales"]["total_amount"]
        assert retail_amount >= 300, f"Expected retail amount >= 300 (from test sale), got {retail_amount}"
        print(f"PASS: Retail sales included in profit - Retail Amount: Rs.{retail_amount}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
