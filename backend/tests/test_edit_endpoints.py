"""
Backend tests for Edit/Update endpoints (Iteration 14)
Tests PUT /api/collections/{id} and PUT /api/sales/{id}
Tests GET /api/settings/dairy endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "newstaff@dairy.com"
TEST_PASSWORD = "staff123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping tests")


@pytest.fixture(scope="module")
def headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestDairySettings:
    """Test GET /api/settings/dairy endpoint"""

    def test_get_dairy_settings_returns_200(self, headers):
        """GET /api/settings/dairy should return 200"""
        response = requests.get(f"{BASE_URL}/api/settings/dairy", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Should have dairy_name, dairy_phone, dairy_address fields
        assert "dairy_name" in data, "Response should have dairy_name"
        print(f"✓ GET /api/settings/dairy returns 200 with dairy_name: {data.get('dairy_name')}")

    def test_dairy_settings_has_required_fields(self, headers):
        """Dairy settings should have phone and address fields"""
        response = requests.get(f"{BASE_URL}/api/settings/dairy", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # These fields should exist (may be empty)
        assert "dairy_phone" in data or "phone" in data, "Response should have dairy_phone"
        assert "dairy_address" in data or "address" in data, "Response should have dairy_address"
        print(f"✓ Dairy settings has phone and address fields")


class TestUpdateCollection:
    """Test PUT /api/collections/{id} endpoint"""

    @pytest.fixture
    def test_farmer(self, headers):
        """Create or get a test farmer"""
        # First try to get existing farmers
        response = requests.get(f"{BASE_URL}/api/farmers", headers=headers)
        if response.status_code == 200 and response.json():
            farmer = response.json()[0]
            return farmer
        # Create a test farmer
        response = requests.post(f"{BASE_URL}/api/farmers", headers=headers, json={
            "name": "TEST_EditFarmer",
            "phone": "9999888801",
            "village": "TestVillage"
        })
        return response.json()

    @pytest.fixture
    def test_collection(self, headers, test_farmer):
        """Create a test collection"""
        response = requests.post(f"{BASE_URL}/api/collections", headers=headers, json={
            "farmer_id": test_farmer["id"],
            "shift": "morning",
            "quantity": 10,
            "fat": 4.5,
            "snf": 8.5,
            "rate": 50,
            "date": "2026-01-10"
        })
        if response.status_code in [200, 201]:
            return response.json()
        # If entry already exists (duplicate), get an existing one
        response = requests.get(f"{BASE_URL}/api/collections?farmer_id={test_farmer['id']}", headers=headers)
        if response.status_code == 200 and response.json():
            return response.json()[0]
        pytest.skip("Could not create or find test collection")

    def test_update_collection_quantity(self, headers, test_collection):
        """PUT /api/collections/{id} should update quantity"""
        collection_id = test_collection["id"]
        old_qty = test_collection["quantity"]
        new_qty = 20  # Change to 20
        
        response = requests.put(f"{BASE_URL}/api/collections/{collection_id}", 
                               headers=headers, json={"quantity": new_qty})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        updated = response.json()
        assert updated["quantity"] == new_qty, f"Expected quantity {new_qty}, got {updated['quantity']}"
        print(f"✓ PUT /api/collections/{collection_id} updated quantity from {old_qty} to {new_qty}")

    def test_update_collection_rate(self, headers, test_collection):
        """PUT /api/collections/{id} should update rate and recalculate amount"""
        collection_id = test_collection["id"]
        new_rate = 55
        
        response = requests.put(f"{BASE_URL}/api/collections/{collection_id}", 
                               headers=headers, json={"rate": new_rate})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        updated = response.json()
        assert updated["rate"] == new_rate, f"Expected rate {new_rate}, got {updated['rate']}"
        # Amount should be recalculated
        expected_amount = round(updated["quantity"] * new_rate, 2)
        assert updated["amount"] == expected_amount, f"Expected amount {expected_amount}, got {updated['amount']}"
        print(f"✓ PUT /api/collections updated rate to {new_rate}, amount recalculated to {expected_amount}")

    def test_update_nonexistent_collection_returns_404(self, headers):
        """PUT /api/collections/{nonexistent} should return 404"""
        response = requests.put(f"{BASE_URL}/api/collections/nonexistent-id-12345", 
                               headers=headers, json={"quantity": 10})
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ PUT /api/collections/{nonexistent} returns 404")


class TestUpdateSale:
    """Test PUT /api/sales/{id} endpoint"""

    @pytest.fixture
    def test_customer(self, headers):
        """Create or get a test customer"""
        # First try to get existing customers
        response = requests.get(f"{BASE_URL}/api/customers", headers=headers)
        if response.status_code == 200 and response.json():
            customer = response.json()[0]
            return customer
        # Create a test customer
        response = requests.post(f"{BASE_URL}/api/customers", headers=headers, json={
            "name": "TEST_EditCustomer",
            "phone": "9999888802",
            "customer_type": "retail"
        })
        return response.json()

    @pytest.fixture
    def test_sale(self, headers, test_customer):
        """Create a test sale"""
        response = requests.post(f"{BASE_URL}/api/sales", headers=headers, json={
            "customer_id": test_customer["id"],
            "product": "milk",
            "quantity": 5,
            "rate": 60,
            "date": "2026-01-10"
        })
        if response.status_code in [200, 201]:
            return response.json()
        # Get an existing sale
        response = requests.get(f"{BASE_URL}/api/sales?customer_id={test_customer['id']}", headers=headers)
        if response.status_code == 200 and response.json():
            return response.json()[0]
        pytest.skip("Could not create or find test sale")

    def test_update_sale_quantity(self, headers, test_sale):
        """PUT /api/sales/{id} should update quantity"""
        sale_id = test_sale["id"]
        new_qty = 10
        
        response = requests.put(f"{BASE_URL}/api/sales/{sale_id}", 
                               headers=headers, json={"quantity": new_qty})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        updated = response.json()
        assert updated["quantity"] == new_qty, f"Expected quantity {new_qty}, got {updated['quantity']}"
        print(f"✓ PUT /api/sales/{sale_id} updated quantity to {new_qty}")

    def test_update_sale_rate(self, headers, test_sale):
        """PUT /api/sales/{id} should update rate and recalculate amount"""
        sale_id = test_sale["id"]
        new_rate = 70
        
        response = requests.put(f"{BASE_URL}/api/sales/{sale_id}", 
                               headers=headers, json={"rate": new_rate})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        updated = response.json()
        assert updated["rate"] == new_rate, f"Expected rate {new_rate}, got {updated['rate']}"
        # Amount should be recalculated
        expected_amount = round(updated["quantity"] * new_rate, 2)
        assert updated["amount"] == expected_amount, f"Expected amount {expected_amount}, got {updated['amount']}"
        print(f"✓ PUT /api/sales updated rate to {new_rate}, amount recalculated to {expected_amount}")

    def test_update_nonexistent_sale_returns_404(self, headers):
        """PUT /api/sales/{nonexistent} should return 404"""
        response = requests.put(f"{BASE_URL}/api/sales/nonexistent-id-12345", 
                               headers=headers, json={"quantity": 10})
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ PUT /api/sales/{nonexistent} returns 404")


class TestBillingEndpoints:
    """Test billing endpoints return collections/sales with IDs for edit"""

    @pytest.fixture
    def test_farmer(self, headers):
        """Get a farmer with collections"""
        response = requests.get(f"{BASE_URL}/api/farmers", headers=headers)
        if response.status_code == 200 and response.json():
            return response.json()[0]
        pytest.skip("No farmers available")

    @pytest.fixture
    def test_customer(self, headers):
        """Get a customer with sales"""
        response = requests.get(f"{BASE_URL}/api/customers", headers=headers)
        if response.status_code == 200 and response.json():
            return response.json()[0]
        pytest.skip("No customers available")

    def test_farmer_billing_returns_collection_ids(self, headers, test_farmer):
        """GET /api/billing/farmer/{id} should return collections with IDs for edit"""
        farmer_id = test_farmer["id"]
        response = requests.get(
            f"{BASE_URL}/api/billing/farmer/{farmer_id}?start_date=2025-01-01&end_date=2027-12-31",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if data.get("collections"):
            collection = data["collections"][0]
            assert "id" in collection, "Collection should have id field for edit"
            print(f"✓ Farmer billing returns collections with IDs (e.g., {collection['id'][:8]}...)")
        else:
            print("✓ Farmer billing endpoint works (no collections in date range)")

    def test_customer_billing_returns_sale_ids(self, headers, test_customer):
        """GET /api/billing/customer/{id} should return sales with IDs for edit"""
        customer_id = test_customer["id"]
        response = requests.get(
            f"{BASE_URL}/api/billing/customer/{customer_id}?start_date=2025-01-01&end_date=2027-12-31",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if data.get("sales"):
            sale = data["sales"][0]
            assert "id" in sale, "Sale should have id field for edit"
            print(f"✓ Customer billing returns sales with IDs (e.g., {sale['id'][:8]}...)")
        else:
            print("✓ Customer billing endpoint works (no sales in date range)")
