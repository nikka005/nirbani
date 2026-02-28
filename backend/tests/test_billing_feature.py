"""
Billing Feature Tests - Iteration 11
Tests for GET /api/billing/farmer/{id} and GET /api/billing/customer/{id} endpoints
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBillingFeature:
    """Billing endpoint tests for farmers and customers"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data - get auth token and existing IDs"""
        # Login to get token
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "test123"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.token = login_resp.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get a farmer ID
        farmers_resp = requests.get(f"{BASE_URL}/api/farmers", headers=self.headers)
        assert farmers_resp.status_code == 200
        farmers = farmers_resp.json()
        assert len(farmers) > 0, "No farmers found in database"
        self.farmer_id = farmers[0]["id"]
        self.farmer_name = farmers[0]["name"]
        
        # Get a customer ID
        customers_resp = requests.get(f"{BASE_URL}/api/customers", headers=self.headers)
        assert customers_resp.status_code == 200
        customers = customers_resp.json()
        assert len(customers) > 0, "No customers found in database"
        self.customer_id = customers[0]["id"]
        self.customer_name = customers[0]["name"]
    
    # ==================== FARMER BILLING TESTS ====================
    
    def test_farmer_billing_with_valid_dates(self):
        """Test GET /api/billing/farmer/{id} with valid date range"""
        response = requests.get(
            f"{BASE_URL}/api/billing/farmer/{self.farmer_id}",
            params={"start_date": "2026-02-01", "end_date": "2026-02-28"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "farmer" in data, "Response should include farmer object"
        assert "collections" in data, "Response should include collections array"
        assert "payments" in data, "Response should include payments array"
        assert "summary" in data, "Response should include summary object"
        
        # Validate farmer data
        farmer = data["farmer"]
        assert farmer["id"] == self.farmer_id
        assert "name" in farmer
        assert "phone" in farmer
        
        # Validate summary structure
        summary = data["summary"]
        assert "total_quantity" in summary
        assert "total_amount" in summary
        assert "total_paid" in summary
        assert "balance_due" in summary
        assert "total_entries" in summary
        assert summary["start_date"] == "2026-02-01"
        assert summary["end_date"] == "2026-02-28"
        
        print(f"✓ Farmer billing: {farmer['name']} - {summary['total_entries']} entries, Amount: ₹{summary['total_amount']}")
    
    def test_farmer_billing_summary_calculation(self):
        """Test that farmer billing summary is calculated correctly"""
        response = requests.get(
            f"{BASE_URL}/api/billing/farmer/{self.farmer_id}",
            params={"start_date": "2026-02-01", "end_date": "2026-02-28"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify summary calculations match collections/payments
        collections = data["collections"]
        payments = data["payments"]
        summary = data["summary"]
        
        # Sum collections
        calc_quantity = sum(c.get("quantity", 0) for c in collections)
        calc_amount = sum(c.get("amount", 0) for c in collections)
        calc_paid = sum(p.get("amount", 0) for p in payments)
        
        assert summary["total_entries"] == len(collections), "total_entries should match collections count"
        assert round(summary["total_quantity"], 2) == round(calc_quantity, 2), "total_quantity mismatch"
        assert round(summary["total_amount"], 2) == round(calc_amount, 2), "total_amount mismatch"
        assert round(summary["total_paid"], 2) == round(calc_paid, 2), "total_paid mismatch"
        assert round(summary["balance_due"], 2) == round(calc_amount - calc_paid, 2), "balance_due mismatch"
        
        print(f"✓ Summary calculation verified: Qty={summary['total_quantity']}, Amount=₹{summary['total_amount']}, Paid=₹{summary['total_paid']}, Balance=₹{summary['balance_due']}")
    
    def test_farmer_billing_invalid_id(self):
        """Test GET /api/billing/farmer/{invalid_id} returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/billing/farmer/invalid-farmer-id-12345",
            params={"start_date": "2026-02-01", "end_date": "2026-02-28"},
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404 for invalid farmer ID, got {response.status_code}"
        print("✓ Invalid farmer ID returns 404")
    
    def test_farmer_billing_empty_date_range(self):
        """Test farmer billing with date range having no data"""
        response = requests.get(
            f"{BASE_URL}/api/billing/farmer/{self.farmer_id}",
            params={"start_date": "2020-01-01", "end_date": "2020-01-31"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should return empty collections but valid structure
        assert data["collections"] == [], "Collections should be empty for old date range"
        assert data["summary"]["total_entries"] == 0
        assert data["summary"]["total_amount"] == 0
        print("✓ Empty date range returns zero totals")
    
    def test_farmer_billing_collection_data_structure(self):
        """Test that collection entries have required fields"""
        response = requests.get(
            f"{BASE_URL}/api/billing/farmer/{self.farmer_id}",
            params={"start_date": "2026-02-01", "end_date": "2026-02-28"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["collections"]:
            collection = data["collections"][0]
            required_fields = ["id", "date", "shift", "quantity", "fat", "rate", "amount"]
            for field in required_fields:
                assert field in collection, f"Collection missing required field: {field}"
            print(f"✓ Collection data has all required fields: {required_fields}")
        else:
            print("⚠ No collections to verify structure")
    
    # ==================== CUSTOMER BILLING TESTS ====================
    
    def test_customer_billing_with_valid_dates(self):
        """Test GET /api/billing/customer/{id} with valid date range"""
        response = requests.get(
            f"{BASE_URL}/api/billing/customer/{self.customer_id}",
            params={"start_date": "2026-02-01", "end_date": "2026-02-28"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "customer" in data, "Response should include customer object"
        assert "sales" in data, "Response should include sales array"
        assert "summary" in data, "Response should include summary object"
        
        # Validate customer data
        customer = data["customer"]
        assert customer["id"] == self.customer_id
        assert "name" in customer
        assert "phone" in customer
        
        # Validate summary structure
        summary = data["summary"]
        assert "total_quantity" in summary
        assert "total_amount" in summary
        assert "total_entries" in summary
        assert summary["start_date"] == "2026-02-01"
        assert summary["end_date"] == "2026-02-28"
        
        print(f"✓ Customer billing: {customer['name']} - {summary['total_entries']} sales, Amount: ₹{summary['total_amount']}")
    
    def test_customer_billing_summary_calculation(self):
        """Test that customer billing summary is calculated correctly"""
        response = requests.get(
            f"{BASE_URL}/api/billing/customer/{self.customer_id}",
            params={"start_date": "2026-02-01", "end_date": "2026-02-28"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify summary calculations match sales
        sales = data["sales"]
        summary = data["summary"]
        
        calc_quantity = sum(s.get("quantity", 0) for s in sales)
        calc_amount = sum(s.get("amount", 0) for s in sales)
        
        assert summary["total_entries"] == len(sales), "total_entries should match sales count"
        assert round(summary["total_quantity"], 2) == round(calc_quantity, 2), "total_quantity mismatch"
        assert round(summary["total_amount"], 2) == round(calc_amount, 2), "total_amount mismatch"
        
        print(f"✓ Customer summary verified: {summary['total_entries']} sales, Qty={summary['total_quantity']}, Amount=₹{summary['total_amount']}")
    
    def test_customer_billing_invalid_id(self):
        """Test GET /api/billing/customer/{invalid_id} returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/billing/customer/invalid-customer-id-12345",
            params={"start_date": "2026-02-01", "end_date": "2026-02-28"},
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404 for invalid customer ID, got {response.status_code}"
        print("✓ Invalid customer ID returns 404")
    
    def test_customer_billing_empty_date_range(self):
        """Test customer billing with date range having no data"""
        response = requests.get(
            f"{BASE_URL}/api/billing/customer/{self.customer_id}",
            params={"start_date": "2020-01-01", "end_date": "2020-01-31"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should return empty sales but valid structure
        assert data["sales"] == [], "Sales should be empty for old date range"
        assert data["summary"]["total_entries"] == 0
        assert data["summary"]["total_amount"] == 0
        print("✓ Empty date range returns zero totals for customer")
    
    def test_customer_billing_sale_data_structure(self):
        """Test that sale entries have required fields"""
        response = requests.get(
            f"{BASE_URL}/api/billing/customer/{self.customer_id}",
            params={"start_date": "2026-02-01", "end_date": "2026-02-28"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["sales"]:
            sale = data["sales"][0]
            required_fields = ["id", "date", "product", "quantity", "rate", "amount"]
            for field in required_fields:
                assert field in sale, f"Sale missing required field: {field}"
            print(f"✓ Sale data has all required fields: {required_fields}")
        else:
            print("⚠ No sales to verify structure")
    
    # ==================== AUTH TESTS ====================
    
    def test_farmer_billing_requires_auth(self):
        """Test that farmer billing requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/billing/farmer/{self.farmer_id}",
            params={"start_date": "2026-02-01", "end_date": "2026-02-28"}
        )
        # Should return 403 or 401 without auth
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Farmer billing requires authentication")
    
    def test_customer_billing_requires_auth(self):
        """Test that customer billing requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/billing/customer/{self.customer_id}",
            params={"start_date": "2026-02-01", "end_date": "2026-02-28"}
        )
        # Should return 403 or 401 without auth
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Customer billing requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
