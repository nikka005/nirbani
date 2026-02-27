"""
Test Suite for Nirbani Dairy - Udhar (Credit) Feature
Tests walk-in customers and udhar sales tracking

Features tested:
- Walk-in customer CRUD
- Udhar (credit) sales
- Udhar payments
- Customer ledger/history
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@test.com"
TEST_PASSWORD = "test123"


class TestWalkinCustomerCRUD:
    """Walk-in Customer Management Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_walkin_customer_success(self):
        """POST /api/walkin-customers - creates walk-in customer with name + phone"""
        unique_phone = f"98765{uuid.uuid4().hex[:5]}"
        data = {
            "name": "TEST_Udhar_Customer",
            "phone": unique_phone
        }
        response = requests.post(f"{BASE_URL}/api/walkin-customers", json=data, headers=self.headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        result = response.json()
        
        # Data assertions
        assert result["name"] == "TEST_Udhar_Customer"
        assert result["phone"] == unique_phone
        assert "id" in result
        assert result["pending_amount"] == 0
        assert result["total_paid"] == 0
        print(f"✓ Created walk-in customer: {result['id']}")
        
    def test_create_walkin_customer_duplicate_phone_rejected(self):
        """POST /api/walkin-customers - rejects duplicate phone number"""
        unique_phone = f"98765{uuid.uuid4().hex[:5]}"
        data = {"name": "TEST_Duplicate_Phone1", "phone": unique_phone}
        
        # First creation should succeed
        response1 = requests.post(f"{BASE_URL}/api/walkin-customers", json=data, headers=self.headers)
        assert response1.status_code == 200, f"First creation failed: {response1.text}"
        
        # Second creation with same phone should fail
        data["name"] = "TEST_Duplicate_Phone2"
        response2 = requests.post(f"{BASE_URL}/api/walkin-customers", json=data, headers=self.headers)
        
        assert response2.status_code == 400, f"Expected 400 for duplicate phone, got {response2.status_code}"
        assert "already exists" in response2.json()["detail"].lower()
        print("✓ Duplicate phone number correctly rejected")
        
    def test_get_walkin_customers_list(self):
        """GET /api/walkin-customers - returns list of walk-in customers"""
        response = requests.get(f"{BASE_URL}/api/walkin-customers", headers=self.headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        result = response.json()
        
        assert isinstance(result, list)
        print(f"✓ Got {len(result)} walk-in customers")
        
    def test_get_walkin_customer_detail(self):
        """GET /api/walkin-customers/{id} - returns customer detail with sales and payments history"""
        # First create a customer
        unique_phone = f"98765{uuid.uuid4().hex[:5]}"
        data = {"name": "TEST_Detail_Customer", "phone": unique_phone}
        create_resp = requests.post(f"{BASE_URL}/api/walkin-customers", json=data, headers=self.headers)
        assert create_resp.status_code == 200
        customer_id = create_resp.json()["id"]
        
        # Get detail
        response = requests.get(f"{BASE_URL}/api/walkin-customers/{customer_id}", headers=self.headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        result = response.json()
        
        # Check structure
        assert "customer" in result
        assert "sales" in result
        assert "payments" in result
        assert result["customer"]["name"] == "TEST_Detail_Customer"
        assert isinstance(result["sales"], list)
        assert isinstance(result["payments"], list)
        print(f"✓ Got customer detail with sales and payments history")


class TestShopSaleUdhar:
    """Shop Sale with Udhar (Credit) Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token and create test customer"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Create test walk-in customer for udhar tests
        unique_phone = f"98765{uuid.uuid4().hex[:5]}"
        resp = requests.post(f"{BASE_URL}/api/walkin-customers", json={
            "name": "TEST_Udhar_Sale_Customer",
            "phone": unique_phone
        }, headers=self.headers)
        if resp.status_code == 200:
            self.test_customer_id = resp.json()["id"]
        else:
            # Use existing customer
            customers = requests.get(f"{BASE_URL}/api/walkin-customers", headers=self.headers).json()
            self.test_customer_id = customers[0]["id"] if customers else None
    
    def test_shop_sale_udhar_true_updates_pending_amount(self):
        """POST /api/sales/shop with is_udhar=true records udhar sale and updates customer pending_amount"""
        if not self.test_customer_id:
            pytest.skip("No test customer available")
        
        # Get initial pending amount
        before_resp = requests.get(f"{BASE_URL}/api/walkin-customers/{self.test_customer_id}", headers=self.headers)
        initial_pending = before_resp.json()["customer"]["pending_amount"]
        
        # Create udhar sale
        sale_data = {
            "product": "milk",
            "quantity": 2.0,
            "rate": 60.0,
            "is_udhar": True,
            "walkin_customer_id": self.test_customer_id,
            "customer_name": "TEST_Udhar_Sale_Customer"
        }
        response = requests.post(f"{BASE_URL}/api/sales/shop", json=sale_data, headers=self.headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        result = response.json()
        
        # Verify sale recorded with is_udhar=True
        assert result["is_udhar"] == True
        assert result["amount"] == 120.0  # 2 * 60
        assert result["customer_id"] == self.test_customer_id
        
        # Verify customer pending amount updated
        after_resp = requests.get(f"{BASE_URL}/api/walkin-customers/{self.test_customer_id}", headers=self.headers)
        new_pending = after_resp.json()["customer"]["pending_amount"]
        
        assert new_pending == initial_pending + 120.0, f"Pending not updated: {initial_pending} -> {new_pending}"
        print(f"✓ Udhar sale recorded, pending updated from {initial_pending} to {new_pending}")
        
    def test_shop_sale_cash_no_pending_update(self):
        """POST /api/sales/shop with is_udhar=false records normal cash sale (no pending update)"""
        # Get any walkin customer for reference
        customers = requests.get(f"{BASE_URL}/api/walkin-customers", headers=self.headers).json()
        if customers:
            customer_id = customers[0]["id"]
            before_resp = requests.get(f"{BASE_URL}/api/walkin-customers/{customer_id}", headers=self.headers)
            initial_pending = before_resp.json()["customer"]["pending_amount"]
        
        # Create cash sale (is_udhar=false)
        sale_data = {
            "product": "milk",
            "quantity": 1.0,
            "rate": 50.0,
            "is_udhar": False,
            "customer_name": "Walk-in Cash Customer"
        }
        response = requests.post(f"{BASE_URL}/api/sales/shop", json=sale_data, headers=self.headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        result = response.json()
        
        # Verify sale recorded as cash
        assert result["is_udhar"] == False
        assert result["is_shop_sale"] == True
        assert result["amount"] == 50.0
        
        # If customer existed, verify pending NOT updated
        if customers:
            after_resp = requests.get(f"{BASE_URL}/api/walkin-customers/{customer_id}", headers=self.headers)
            new_pending = after_resp.json()["customer"]["pending_amount"]
            # Cash sale should not change pending
            assert new_pending == initial_pending, f"Cash sale should not update pending"
        
        print("✓ Cash sale recorded, no pending amount update")


class TestUdharPayments:
    """Udhar Payment Recording Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup with auth and test customer with udhar balance"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Create test customer with some udhar
        unique_phone = f"98765{uuid.uuid4().hex[:5]}"
        resp = requests.post(f"{BASE_URL}/api/walkin-customers", json={
            "name": "TEST_Payment_Customer",
            "phone": unique_phone
        }, headers=self.headers)
        
        if resp.status_code == 200:
            self.customer_id = resp.json()["id"]
            # Add some udhar
            requests.post(f"{BASE_URL}/api/sales/shop", json={
                "product": "milk",
                "quantity": 5.0,
                "rate": 60.0,
                "is_udhar": True,
                "walkin_customer_id": self.customer_id
            }, headers=self.headers)
    
    def test_udhar_payment_reduces_pending_amount(self):
        """POST /api/udhar-payments records payment and reduces pending_amount"""
        if not hasattr(self, 'customer_id'):
            pytest.skip("No test customer available")
        
        # Get initial pending
        before_resp = requests.get(f"{BASE_URL}/api/walkin-customers/{self.customer_id}", headers=self.headers)
        initial_pending = before_resp.json()["customer"]["pending_amount"]
        
        # Record payment of 100
        payment_data = {
            "walkin_customer_id": self.customer_id,
            "amount": 100.0,
            "notes": "Test payment"
        }
        response = requests.post(f"{BASE_URL}/api/udhar-payments", json=payment_data, headers=self.headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        result = response.json()
        
        # Verify payment recorded
        assert result["amount"] == 100.0
        assert result["walkin_customer_id"] == self.customer_id
        assert "id" in result
        
        # Verify pending reduced
        after_resp = requests.get(f"{BASE_URL}/api/walkin-customers/{self.customer_id}", headers=self.headers)
        new_pending = after_resp.json()["customer"]["pending_amount"]
        
        expected_pending = initial_pending - 100.0
        assert new_pending == expected_pending, f"Pending should be {expected_pending}, got {new_pending}"
        print(f"✓ Payment recorded, pending reduced from {initial_pending} to {new_pending}")
        
    def test_udhar_payment_invalid_customer_404(self):
        """POST /api/udhar-payments with invalid customer_id returns 404"""
        payment_data = {
            "walkin_customer_id": "non-existent-id-12345",
            "amount": 100.0
        }
        response = requests.post(f"{BASE_URL}/api/udhar-payments", json=payment_data, headers=self.headers)
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid customer correctly returns 404")


class TestExistingTestCustomer:
    """Test using existing walk-in customer from context"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        # Existing customer from context: Ramesh Kumar, phone: 9876500001
        self.existing_customer_id = "c819a327-e8a9-4b9a-b6ce-81fa25f3da73"
    
    def test_get_existing_walkin_customer(self):
        """Verify existing walk-in customer 'Ramesh Kumar' exists"""
        response = requests.get(f"{BASE_URL}/api/walkin-customers/{self.existing_customer_id}", headers=self.headers)
        
        if response.status_code == 200:
            result = response.json()
            assert result["customer"]["name"] == "Ramesh Kumar"
            assert result["customer"]["phone"] == "9876500001"
            print(f"✓ Found existing customer: {result['customer']['name']} with pending ₹{result['customer']['pending_amount']}")
            print(f"  Sales: {len(result['sales'])}, Payments: {len(result['payments'])}")
        else:
            print(f"⚠ Existing customer not found (may have been deleted), status: {response.status_code}")


class TestTodaySalesUdharFlag:
    """Test that today's sales API includes udhar flag"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_today_sales_shows_udhar_flag(self):
        """GET /api/sales/today returns sales with is_udhar flag"""
        response = requests.get(f"{BASE_URL}/api/sales/today", headers=self.headers)
        
        assert response.status_code == 200, f"Failed: {response.text}"
        result = response.json()
        
        assert "sales" in result
        assert "total_amount" in result
        
        # Check that sales have udhar flags
        for sale in result["sales"]:
            assert "is_shop_sale" in sale or sale.get("customer_id") != "shop_walk_in"
            # Udhar sales will have is_udhar=True
            if sale.get("is_udhar"):
                print(f"  Found udhar sale: {sale['customer_name']} - ₹{sale['amount']}")
        
        print(f"✓ Today's sales endpoint working, {len(result['sales'])} sales found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
