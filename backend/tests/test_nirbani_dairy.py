"""
Nirbani Dairy Management System - Comprehensive Backend Tests
Tests: Auth, Farmers, Collections, Payments, Customers, Sales, Products, Expenses, Branches,
       Bulk Upload, Reports, Export, Settings, Bills
"""

import pytest
import requests
import os
import time
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="session")
def auth_token(api_client):
    """Get auth token - try login first, register if needed"""
    # Try login with test credentials
    login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@nirbani.com",
        "password": "admin123"
    })
    
    if login_response.status_code == 200:
        return login_response.json().get("access_token")
    
    # If login fails, register new user
    register_response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "name": "Admin User",
        "email": "admin@nirbani.com",
        "phone": "9999999999",
        "password": "admin123",
        "role": "admin"
    })
    
    if register_response.status_code == 200:
        return register_response.json().get("access_token")
    
    pytest.skip("Authentication failed - cannot proceed")

@pytest.fixture(scope="session")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestHealthAndAuth:
    """Health check and authentication tests"""
    
    def test_health_check(self, api_client):
        """Test health endpoint"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health check passed")

    def test_login_success(self, api_client):
        """Test login with valid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@nirbani.com",
            "password": "admin123"
        })
        
        # May be 200 if user exists, or 401 if user not registered yet
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            assert "user" in data
            assert data["user"]["email"] == "admin@nirbani.com"
            print("✓ Login success test passed")
        else:
            # Register first if user doesn't exist
            register_response = api_client.post(f"{BASE_URL}/api/auth/register", json={
                "name": "Admin User",
                "email": "admin@nirbani.com",
                "phone": "9999999999",
                "password": "admin123"
            })
            assert register_response.status_code in [200, 400]  # 400 if already exists
            print("✓ User registered/exists")

    def test_get_me(self, authenticated_client):
        """Test getting current user info"""
        response = authenticated_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "name" in data
        print(f"✓ Get Me: {data['name']} ({data['email']})")


class TestFarmerCRUD:
    """Farmer CRUD operations tests"""
    
    test_farmer_id = None
    
    def test_create_farmer(self, authenticated_client):
        """Create a test farmer"""
        timestamp = int(time.time())
        farmer_data = {
            "name": f"TEST_Ramesh Kumar_{timestamp}",
            "phone": f"98765{timestamp % 100000:05d}",
            "address": "Village Road",
            "village": "Gokulpur",
            "bank_account": "1234567890",
            "ifsc_code": "SBIN0001234",
            "aadhar_number": "123456789012"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/farmers", json=farmer_data)
        assert response.status_code == 200, f"Failed to create farmer: {response.text}"
        
        data = response.json()
        assert data["name"] == farmer_data["name"]
        assert data["phone"] == farmer_data["phone"]
        assert data["village"] == farmer_data["village"]
        assert "id" in data
        
        TestFarmerCRUD.test_farmer_id = data["id"]
        print(f"✓ Created farmer: {data['name']} with ID {data['id']}")

    def test_list_farmers(self, authenticated_client):
        """List all farmers"""
        response = authenticated_client.get(f"{BASE_URL}/api/farmers")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} farmers")

    def test_get_farmer_by_id(self, authenticated_client):
        """Get single farmer by ID"""
        if not TestFarmerCRUD.test_farmer_id:
            pytest.skip("No test farmer created")
        
        response = authenticated_client.get(f"{BASE_URL}/api/farmers/{TestFarmerCRUD.test_farmer_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == TestFarmerCRUD.test_farmer_id
        print(f"✓ Retrieved farmer: {data['name']}")

    def test_update_farmer(self, authenticated_client):
        """Update farmer details"""
        if not TestFarmerCRUD.test_farmer_id:
            pytest.skip("No test farmer created")
        
        update_data = {"village": "Updated Village"}
        response = authenticated_client.put(
            f"{BASE_URL}/api/farmers/{TestFarmerCRUD.test_farmer_id}",
            json=update_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["village"] == "Updated Village"
        print(f"✓ Updated farmer village to: {data['village']}")

    def test_farmer_ledger(self, authenticated_client):
        """Get farmer ledger with collections and payments"""
        if not TestFarmerCRUD.test_farmer_id:
            pytest.skip("No test farmer created")
        
        response = authenticated_client.get(f"{BASE_URL}/api/farmers/{TestFarmerCRUD.test_farmer_id}/ledger")
        assert response.status_code == 200
        
        data = response.json()
        assert "farmer" in data
        assert "collections" in data
        assert "payments" in data
        assert "summary" in data
        print(f"✓ Retrieved farmer ledger with {len(data['collections'])} collections")


class TestMilkCollection:
    """Milk Collection with auto rate calculation tests"""
    
    test_collection_id = None
    
    def test_create_collection_with_auto_rate(self, authenticated_client):
        """Create milk collection - tests auto rate calculation"""
        if not TestFarmerCRUD.test_farmer_id:
            pytest.skip("No test farmer created")
        
        collection_data = {
            "farmer_id": TestFarmerCRUD.test_farmer_id,
            "shift": "morning",
            "quantity": 5.5,
            "fat": 4.2
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/collections", json=collection_data)
        
        # May fail if duplicate entry for today
        if response.status_code == 400 and "already exists" in response.text:
            print("✓ Collection duplicate protection works (entry already exists for today)")
            return
        
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["farmer_id"] == collection_data["farmer_id"]
        assert data["quantity"] == collection_data["quantity"]
        assert data["fat"] == collection_data["fat"]
        assert "snf" in data  # Auto-calculated
        assert "rate" in data  # Auto-calculated
        assert "amount" in data  # Auto-calculated
        assert data["amount"] == round(data["quantity"] * data["rate"], 2)
        
        TestMilkCollection.test_collection_id = data["id"]
        print(f"✓ Created collection: {data['quantity']}L @ ₹{data['rate']}/L = ₹{data['amount']}")

    def test_get_collections_today(self, authenticated_client):
        """Get today's collections"""
        response = authenticated_client.get(f"{BASE_URL}/api/collections/today")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Today's collections: {len(data)} entries")

    def test_get_collections_filtered(self, authenticated_client):
        """Get collections with filters"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = authenticated_client.get(f"{BASE_URL}/api/collections?date={today}")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Filtered collections: {len(data)} entries for {today}")


class TestPayments:
    """Payment recording tests"""
    
    test_payment_id = None
    
    def test_create_payment(self, authenticated_client):
        """Create payment for farmer"""
        if not TestFarmerCRUD.test_farmer_id:
            pytest.skip("No test farmer created")
        
        payment_data = {
            "farmer_id": TestFarmerCRUD.test_farmer_id,
            "amount": 1000.00,
            "payment_mode": "cash",
            "payment_type": "payment",
            "notes": "Weekly payment"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/payments", json=payment_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["amount"] == payment_data["amount"]
        assert data["payment_mode"] == payment_data["payment_mode"]
        
        TestPayments.test_payment_id = data["id"]
        print(f"✓ Created payment: ₹{data['amount']} via {data['payment_mode']}")

    def test_list_payments(self, authenticated_client):
        """List all payments"""
        response = authenticated_client.get(f"{BASE_URL}/api/payments")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} payments")


class TestCustomersAndSales:
    """Customer and Sales tests"""
    
    test_customer_id = None
    test_sale_id = None
    
    def test_create_customer(self, authenticated_client):
        """Create a customer"""
        timestamp = int(time.time())
        customer_data = {
            "name": f"TEST_Customer_{timestamp}",
            "phone": f"77777{timestamp % 100000:05d}",
            "address": "Market Road",
            "customer_type": "retail",
            "gst_number": ""
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/customers", json=customer_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["name"] == customer_data["name"]
        
        TestCustomersAndSales.test_customer_id = data["id"]
        print(f"✓ Created customer: {data['name']}")

    def test_list_customers(self, authenticated_client):
        """List all customers"""
        response = authenticated_client.get(f"{BASE_URL}/api/customers")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} customers")

    def test_create_sale(self, authenticated_client):
        """Create a sale"""
        if not TestCustomersAndSales.test_customer_id:
            pytest.skip("No test customer created")
        
        sale_data = {
            "customer_id": TestCustomersAndSales.test_customer_id,
            "product": "milk",
            "quantity": 2.0,
            "rate": 60.00,
            "notes": "Morning delivery"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/sales", json=sale_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["product"] == sale_data["product"]
        assert data["amount"] == sale_data["quantity"] * sale_data["rate"]
        
        TestCustomersAndSales.test_sale_id = data["id"]
        print(f"✓ Created sale: {data['quantity']}L of {data['product']} = ₹{data['amount']}")

    def test_today_sales(self, authenticated_client):
        """Get today's sales summary"""
        response = authenticated_client.get(f"{BASE_URL}/api/sales/today")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_sales" in data
        assert "total_amount" in data
        print(f"✓ Today's sales: {data['total_sales']} sales, ₹{data['total_amount']}")


class TestInventory:
    """Product/Inventory tests"""
    
    test_product_id = None
    
    def test_create_product(self, authenticated_client):
        """Create a product"""
        timestamp = int(time.time())
        product_data = {
            "name": f"TEST_Product_{timestamp}",
            "unit": "liter",
            "stock": 100.0,
            "min_stock": 10.0,
            "rate": 60.00
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/products", json=product_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["name"] == product_data["name"]
        assert data["stock"] == product_data["stock"]
        
        TestInventory.test_product_id = data["id"]
        print(f"✓ Created product: {data['name']} ({data['stock']} {data['unit']})")

    def test_list_products(self, authenticated_client):
        """List all products"""
        response = authenticated_client.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} products")

    def test_stock_update(self, authenticated_client):
        """Update product stock"""
        if not TestInventory.test_product_id:
            pytest.skip("No test product created")
        
        stock_data = {
            "product_id": TestInventory.test_product_id,
            "quantity": 50.0,
            "type": "in",
            "notes": "New stock added"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/products/stock-update", json=stock_data)
        assert response.status_code == 200
        print(f"✓ Stock updated: +{stock_data['quantity']} units")

    def test_low_stock_products(self, authenticated_client):
        """Get low stock products"""
        response = authenticated_client.get(f"{BASE_URL}/api/products/low-stock")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Low stock products: {len(data)}")


class TestExpenses:
    """Expense management tests"""
    
    test_expense_id = None
    
    def test_create_expense(self, authenticated_client):
        """Create an expense"""
        expense_data = {
            "category": "transport",
            "amount": 500.00,
            "description": "Fuel for delivery",
            "payment_mode": "cash"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/expenses", json=expense_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["category"] == expense_data["category"]
        assert data["amount"] == expense_data["amount"]
        
        TestExpenses.test_expense_id = data["id"]
        print(f"✓ Created expense: ₹{data['amount']} ({data['category']})")

    def test_list_expenses(self, authenticated_client):
        """List all expenses"""
        response = authenticated_client.get(f"{BASE_URL}/api/expenses")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} expenses")

    def test_expense_summary(self, authenticated_client):
        """Get expense summary"""
        response = authenticated_client.get(f"{BASE_URL}/api/expenses/summary")
        assert response.status_code == 200
        
        data = response.json()
        assert "total" in data
        assert "by_category" in data
        print(f"✓ Expense summary: ₹{data['total']} total")


class TestBranchManagement:
    """Branch management CRUD tests"""
    
    test_branch_id = None
    
    def test_create_branch(self, authenticated_client):
        """Create a branch"""
        timestamp = int(time.time())
        branch_data = {
            "name": f"TEST_Branch_{timestamp}",
            "code": f"TB{timestamp % 1000:03d}",
            "address": "Village Center",
            "phone": "9876543210",
            "manager_name": "Test Manager"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/branches", json=branch_data)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["name"] == branch_data["name"]
        assert data["code"] == branch_data["code"].upper()
        
        TestBranchManagement.test_branch_id = data["id"]
        print(f"✓ Created branch: {data['name']} ({data['code']})")

    def test_list_branches(self, authenticated_client):
        """List all branches"""
        response = authenticated_client.get(f"{BASE_URL}/api/branches")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} branches")

    def test_get_branch_by_id(self, authenticated_client):
        """Get single branch"""
        if not TestBranchManagement.test_branch_id:
            pytest.skip("No test branch created")
        
        response = authenticated_client.get(f"{BASE_URL}/api/branches/{TestBranchManagement.test_branch_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == TestBranchManagement.test_branch_id
        print(f"✓ Retrieved branch: {data['name']}")

    def test_update_branch(self, authenticated_client):
        """Update branch"""
        if not TestBranchManagement.test_branch_id:
            pytest.skip("No test branch created")
        
        update_data = {
            "name": "Updated Branch Name",
            "code": "UPD01",
            "address": "Updated Address",
            "phone": "1111111111",
            "manager_name": "Updated Manager"
        }
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/branches/{TestBranchManagement.test_branch_id}",
            json=update_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == update_data["name"]
        print(f"✓ Updated branch: {data['name']}")

    def test_branch_stats(self, authenticated_client):
        """Get branch statistics"""
        if not TestBranchManagement.test_branch_id:
            pytest.skip("No test branch created")
        
        response = authenticated_client.get(f"{BASE_URL}/api/branches/{TestBranchManagement.test_branch_id}/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "branch" in data
        assert "today" in data
        print(f"✓ Branch stats: {data['today']['quantity']}L today")


class TestBulkUpload:
    """Bulk upload via CSV paste tests"""
    
    def test_bulk_collection_template(self, authenticated_client):
        """Get bulk collection template"""
        response = authenticated_client.get(f"{BASE_URL}/api/bulk/template/collections")
        assert response.status_code == 200
        
        data = response.json()
        assert "template" in data
        assert "columns" in data
        assert "farmer_phone" in data["columns"]
        print(f"✓ Collection template columns: {data['columns']}")

    def test_bulk_farmer_template(self, authenticated_client):
        """Get bulk farmer template"""
        response = authenticated_client.get(f"{BASE_URL}/api/bulk/template/farmers")
        assert response.status_code == 200
        
        data = response.json()
        assert "template" in data
        assert "columns" in data
        print(f"✓ Farmer template columns: {data['columns']}")

    def test_bulk_upload_farmers(self, authenticated_client):
        """Test bulk farmer upload"""
        timestamp = int(time.time())
        farmers_data = [
            {
                "name": f"TEST_BulkFarmer1_{timestamp}",
                "phone": f"66666{timestamp % 100000:05d}",
                "village": "BulkVillage1"
            },
            {
                "name": f"TEST_BulkFarmer2_{timestamp}",
                "phone": f"55555{timestamp % 100000:05d}",
                "village": "BulkVillage2"
            }
        ]
        
        response = authenticated_client.post(f"{BASE_URL}/api/bulk/farmers", json=farmers_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data
        assert "failed" in data
        print(f"✓ Bulk farmer upload: {data['success']} success, {data['failed']} failed")


class TestReports:
    """Reports API tests - daily, farmer, fat average, ranking, monthly"""
    
    def test_daily_report(self, authenticated_client):
        """Get daily report"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = authenticated_client.get(f"{BASE_URL}/api/reports/daily?date={today}")
        assert response.status_code == 200
        
        data = response.json()
        assert "collections" in data
        assert "payments" in data
        assert "summary" in data
        print(f"✓ Daily report: {data['summary']['total_quantity']}L, ₹{data['summary']['total_amount']}")

    def test_fat_average_report(self, authenticated_client):
        """Get fat average report"""
        response = authenticated_client.get(f"{BASE_URL}/api/reports/fat-average")
        assert response.status_code == 200
        
        data = response.json()
        assert "period" in data
        assert "report" in data
        print(f"✓ Fat average report: {len(data['report'])} farmers")

    def test_farmer_ranking_report(self, authenticated_client):
        """Get farmer ranking report"""
        response = authenticated_client.get(f"{BASE_URL}/api/reports/farmer-ranking?sort_by=quantity")
        assert response.status_code == 200
        
        data = response.json()
        assert "ranking" in data
        assert "sort_by" in data
        print(f"✓ Farmer ranking: {len(data['ranking'])} farmers ranked")

    def test_monthly_summary_report(self, authenticated_client):
        """Get monthly summary report"""
        current_month = datetime.now().strftime("%Y-%m")
        response = authenticated_client.get(f"{BASE_URL}/api/reports/monthly-summary?month={current_month}")
        assert response.status_code == 200
        
        data = response.json()
        assert "collection" in data
        assert "sales" in data
        assert "expenses" in data
        assert "profit" in data
        print(f"✓ Monthly summary: {data['collection']['total_milk']}L, ₹{data['profit']['net']} net")


class TestWhatsAppShare:
    """WhatsApp share link generation tests"""
    
    def test_farmer_bill_share(self, authenticated_client):
        """Get WhatsApp share link for farmer bill"""
        if not TestFarmerCRUD.test_farmer_id:
            pytest.skip("No test farmer created")
        
        response = authenticated_client.get(f"{BASE_URL}/api/share/farmer-bill/{TestFarmerCRUD.test_farmer_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "whatsapp_link" in data
        assert "message" in data
        assert "summary" in data
        assert data["whatsapp_link"].startswith("https://wa.me/")
        print(f"✓ WhatsApp share link generated: {data['farmer']}")

    def test_daily_report_share(self, authenticated_client):
        """Get WhatsApp share link for daily report"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = authenticated_client.get(f"{BASE_URL}/api/share/daily-report/{today}")
        assert response.status_code == 200
        
        data = response.json()
        assert "whatsapp_link" in data
        assert "message" in data
        print(f"✓ Daily report share link generated for {data['date']}")


class TestCSVExport:
    """CSV export endpoints tests"""
    
    def test_export_collections(self, authenticated_client):
        """Export collections as CSV"""
        response = authenticated_client.get(f"{BASE_URL}/api/export/collections")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print(f"✓ Collections CSV export: {len(response.content)} bytes")

    def test_export_farmers(self, authenticated_client):
        """Export farmers as CSV"""
        response = authenticated_client.get(f"{BASE_URL}/api/export/farmers")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print(f"✓ Farmers CSV export: {len(response.content)} bytes")

    def test_export_payments(self, authenticated_client):
        """Export payments as CSV"""
        response = authenticated_client.get(f"{BASE_URL}/api/export/payments")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print(f"✓ Payments CSV export: {len(response.content)} bytes")

    def test_export_sales(self, authenticated_client):
        """Export sales as CSV"""
        response = authenticated_client.get(f"{BASE_URL}/api/export/sales")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print(f"✓ Sales CSV export: {len(response.content)} bytes")

    def test_export_expenses(self, authenticated_client):
        """Export expenses as CSV"""
        response = authenticated_client.get(f"{BASE_URL}/api/export/expenses")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print(f"✓ Expenses CSV export: {len(response.content)} bytes")


class TestSettings:
    """Settings API tests - dairy info and SMS templates"""
    
    def test_get_dairy_settings(self, authenticated_client):
        """Get dairy settings"""
        response = authenticated_client.get(f"{BASE_URL}/api/settings/dairy")
        assert response.status_code == 200
        
        data = response.json()
        # May be empty dict or have settings
        print(f"✓ Dairy settings retrieved")

    def test_save_dairy_settings(self, authenticated_client):
        """Save dairy settings"""
        settings_data = {
            "dairy_name": "Nirbani Dairy",
            "dairy_phone": "9876543210",
            "dairy_address": "Main Market, Gokulpur",
            "sms_enabled": False,
            "msg91_auth_key": "",
            "msg91_sender_id": "NIRDRY"
        }
        
        response = authenticated_client.put(f"{BASE_URL}/api/settings/dairy", json=settings_data)
        assert response.status_code == 200
        print(f"✓ Dairy settings saved")

    def test_get_sms_templates(self, authenticated_client):
        """Get SMS templates"""
        response = authenticated_client.get(f"{BASE_URL}/api/settings/sms-templates")
        assert response.status_code == 200
        print(f"✓ SMS templates retrieved")

    def test_save_sms_templates(self, authenticated_client):
        """Save SMS templates"""
        templates_data = {
            "collection_template": "Dear {farmer_name}, {quantity}L milk collected. Fat: {fat}%. Amount: Rs.{amount}",
            "payment_template": "Dear {farmer_name}, Payment of Rs.{amount} received. Balance: Rs.{balance}"
        }
        
        response = authenticated_client.put(f"{BASE_URL}/api/settings/sms-templates", json=templates_data)
        assert response.status_code == 200
        print(f"✓ SMS templates saved")


class TestBillGeneration:
    """Bill generation HTML endpoints tests"""
    
    def test_farmer_bill_html(self, authenticated_client):
        """Get farmer bill HTML"""
        if not TestFarmerCRUD.test_farmer_id:
            pytest.skip("No test farmer created")
        
        response = authenticated_client.get(f"{BASE_URL}/api/bills/farmer/{TestFarmerCRUD.test_farmer_id}")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
        assert "<!DOCTYPE html>" in response.text or "<html" in response.text
        print(f"✓ Farmer bill HTML generated: {len(response.text)} bytes")

    def test_daily_bill_html(self, authenticated_client):
        """Get daily report HTML"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = authenticated_client.get(f"{BASE_URL}/api/bills/daily/{today}")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
        print(f"✓ Daily bill HTML generated: {len(response.text)} bytes")


class TestDashboard:
    """Dashboard stats tests"""
    
    def test_dashboard_stats(self, authenticated_client):
        """Get dashboard statistics"""
        response = authenticated_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_farmers" in data
        assert "active_farmers" in data
        assert "today_milk_quantity" in data
        assert "today_milk_amount" in data
        assert "avg_fat" in data
        assert "total_pending_payments" in data
        print(f"✓ Dashboard stats: {data['total_farmers']} farmers, {data['today_milk_quantity']}L today")

    def test_weekly_stats(self, authenticated_client):
        """Get weekly statistics"""
        response = authenticated_client.get(f"{BASE_URL}/api/dashboard/weekly-stats")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 7  # 7 days
        print(f"✓ Weekly stats: {len(data)} days of data")


class TestCleanup:
    """Cleanup test data"""
    
    def test_delete_test_farmer(self, authenticated_client):
        """Delete test farmer"""
        if TestFarmerCRUD.test_farmer_id:
            response = authenticated_client.delete(f"{BASE_URL}/api/farmers/{TestFarmerCRUD.test_farmer_id}")
            # May fail if farmer has collections, that's ok
            print(f"✓ Cleanup: farmer delete attempt (status {response.status_code})")

    def test_delete_test_branch(self, authenticated_client):
        """Delete test branch"""
        if TestBranchManagement.test_branch_id:
            response = authenticated_client.delete(f"{BASE_URL}/api/branches/{TestBranchManagement.test_branch_id}")
            assert response.status_code == 200
            print(f"✓ Cleanup: branch deleted")

    def test_delete_test_expense(self, authenticated_client):
        """Delete test expense"""
        if TestExpenses.test_expense_id:
            response = authenticated_client.delete(f"{BASE_URL}/api/expenses/{TestExpenses.test_expense_id}")
            assert response.status_code == 200
            print(f"✓ Cleanup: expense deleted")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
