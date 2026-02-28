"""
Backend tests for Edit/Delete Features - Iteration 14
Tests:
- PUT /api/farmers/{id} - Update farmer
- DELETE /api/farmers/{id} - Delete farmer
- PUT /api/collections/{id} - Update collection
- DELETE /api/collections/{id} - Delete collection  
- PUT /api/sales/{id} - Update sale
- DELETE /api/sales/{id} - Delete sale
"""

import pytest
import requests
import os
import uuid

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


class TestFarmerCRUD:
    """Test farmer CRUD operations - Create, Read, Update, Delete"""

    @pytest.fixture
    def test_farmer_data(self):
        """Generate unique test farmer data"""
        unique_id = str(uuid.uuid4())[:8]
        return {
            "name": f"TEST_Farmer_{unique_id}",
            "phone": f"999{unique_id[:7]}",
            "village": "TestVillage",
            "milk_type": "cow",
            "fixed_rate": 40
        }

    def test_create_farmer_for_edit(self, headers, test_farmer_data):
        """Create a farmer for subsequent edit/delete tests"""
        response = requests.post(f"{BASE_URL}/api/farmers", headers=headers, json=test_farmer_data)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        farmer = response.json()
        assert farmer["name"] == test_farmer_data["name"]
        assert farmer["phone"] == test_farmer_data["phone"]
        print(f"✓ Created farmer: {farmer['name']} (id: {farmer['id'][:8]}...)")
        # Store for cleanup
        TestFarmerCRUD.test_farmer_id = farmer["id"]
        return farmer

    def test_update_farmer_phone(self, headers, test_farmer_data):
        """PUT /api/farmers/{id} should update phone number"""
        # Create farmer first
        farmer = self.test_create_farmer_for_edit(headers, test_farmer_data)
        farmer_id = farmer["id"]
        
        # Update phone
        new_phone = "8888777766"
        response = requests.put(f"{BASE_URL}/api/farmers/{farmer_id}", headers=headers, json={
            "phone": new_phone
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        updated = response.json()
        assert updated["phone"] == new_phone, f"Expected phone {new_phone}, got {updated['phone']}"
        print(f"✓ PUT /api/farmers/{farmer_id[:8]}... updated phone to {new_phone}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/farmers/{farmer_id}", headers=headers)

    def test_update_farmer_milk_type_and_rates(self, headers, test_farmer_data):
        """PUT /api/farmers/{id} should update milk_type and rates"""
        # Create farmer first
        test_farmer_data["milk_type"] = "cow"
        farmer = self.test_create_farmer_for_edit(headers, test_farmer_data)
        farmer_id = farmer["id"]
        
        # Update to buffalo with rate
        response = requests.put(f"{BASE_URL}/api/farmers/{farmer_id}", headers=headers, json={
            "milk_type": "buffalo",
            "fixed_rate": 55
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        updated = response.json()
        assert updated["milk_type"] == "buffalo", f"Expected milk_type 'buffalo', got {updated['milk_type']}"
        assert updated["fixed_rate"] == 55, f"Expected fixed_rate 55, got {updated['fixed_rate']}"
        print(f"✓ PUT /api/farmers updated milk_type to 'buffalo' and fixed_rate to 55")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/farmers/{farmer_id}", headers=headers)

    def test_delete_farmer(self, headers, test_farmer_data):
        """DELETE /api/farmers/{id} should delete farmer"""
        # Create farmer first
        farmer = self.test_create_farmer_for_edit(headers, test_farmer_data)
        farmer_id = farmer["id"]
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/farmers/{farmer_id}", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify deleted - should get 404
        response = requests.get(f"{BASE_URL}/api/farmers/{farmer_id}", headers=headers)
        assert response.status_code == 404, f"Expected 404 for deleted farmer, got {response.status_code}"
        print(f"✓ DELETE /api/farmers/{farmer_id[:8]}... returned 200 and farmer no longer exists")

    def test_delete_nonexistent_farmer_returns_404(self, headers):
        """DELETE /api/farmers/{nonexistent} should return 404"""
        response = requests.delete(f"{BASE_URL}/api/farmers/nonexistent-farmer-id-12345", headers=headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ DELETE /api/farmers/{nonexistent} returns 404")


class TestCollectionCRUD:
    """Test collection CRUD with edit verification"""

    @pytest.fixture
    def get_farmer(self, headers):
        """Get existing farmer or create one"""
        response = requests.get(f"{BASE_URL}/api/farmers", headers=headers)
        if response.status_code == 200 and response.json():
            return response.json()[0]
        # Create one
        response = requests.post(f"{BASE_URL}/api/farmers", headers=headers, json={
            "name": "TEST_CollectionFarmer",
            "phone": "9998887770"
        })
        return response.json()

    def test_create_and_update_collection(self, headers, get_farmer):
        """Create collection then update quantity/rate"""
        farmer_id = get_farmer["id"]
        
        # Create
        response = requests.post(f"{BASE_URL}/api/collections", headers=headers, json={
            "farmer_id": farmer_id,
            "shift": "morning",
            "quantity": 15,
            "fat": 4.5,
            "snf": 8.5,
            "rate": 45,
            "date": "2026-01-15"
        })
        assert response.status_code in [200, 201]
        collection = response.json()
        collection_id = collection["id"]
        
        # Update quantity
        response = requests.put(f"{BASE_URL}/api/collections/{collection_id}", headers=headers, json={
            "quantity": 25
        })
        assert response.status_code == 200
        updated = response.json()
        assert updated["quantity"] == 25
        print(f"✓ PUT /api/collections updated quantity from 15 to 25")
        
        # Update rate
        response = requests.put(f"{BASE_URL}/api/collections/{collection_id}", headers=headers, json={
            "rate": 50
        })
        assert response.status_code == 200
        updated = response.json()
        assert updated["rate"] == 50
        # Amount should be recalculated: 25 * 50 = 1250
        assert updated["amount"] == 1250.0
        print(f"✓ PUT /api/collections updated rate to 50, amount recalculated to 1250")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/collections/{collection_id}", headers=headers)


class TestSaleCRUD:
    """Test sale CRUD with edit verification"""

    @pytest.fixture
    def get_customer(self, headers):
        """Get existing customer or create one"""
        response = requests.get(f"{BASE_URL}/api/customers", headers=headers)
        if response.status_code == 200 and response.json():
            return response.json()[0]
        # Create one
        response = requests.post(f"{BASE_URL}/api/customers", headers=headers, json={
            "name": "TEST_SaleCustomer",
            "phone": "9998887771"
        })
        return response.json()

    def test_create_and_update_sale(self, headers, get_customer):
        """Create sale then update quantity/rate/amount"""
        customer_id = get_customer["id"]
        
        # Create
        response = requests.post(f"{BASE_URL}/api/sales", headers=headers, json={
            "customer_id": customer_id,
            "product": "milk",
            "quantity": 5,
            "rate": 60,
            "date": "2026-01-15"
        })
        assert response.status_code in [200, 201]
        sale = response.json()
        sale_id = sale["id"]
        
        # Update product
        response = requests.put(f"{BASE_URL}/api/sales/{sale_id}", headers=headers, json={
            "product": "paneer"
        })
        assert response.status_code == 200
        updated = response.json()
        assert updated["product"] == "paneer"
        print(f"✓ PUT /api/sales updated product from 'milk' to 'paneer'")
        
        # Update amount directly
        response = requests.put(f"{BASE_URL}/api/sales/{sale_id}", headers=headers, json={
            "direct_amount": 500
        })
        assert response.status_code == 200
        updated = response.json()
        assert updated["amount"] == 500
        print(f"✓ PUT /api/sales updated amount directly to 500")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/sales/{sale_id}", headers=headers)


class TestUserNameInBilling:
    """Test that user name is returned for billing signature"""

    def test_auth_me_returns_user_name(self, headers):
        """GET /api/auth/me should return user with name field"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        user = response.json()
        assert "name" in user, "User should have 'name' field for bill signature"
        assert user["name"] == "New Staff", f"Expected 'New Staff', got '{user.get('name')}'"
        print(f"✓ GET /api/auth/me returns user name: '{user['name']}'")


class TestFarmersPageRequirements:
    """Test farmer page edit/delete API requirements"""

    def test_farmers_list_has_edit_delete_data(self, headers):
        """GET /api/farmers should return farmers with IDs for edit/delete"""
        response = requests.get(f"{BASE_URL}/api/farmers", headers=headers)
        assert response.status_code == 200
        farmers = response.json()
        
        if farmers:
            farmer = farmers[0]
            # Must have id for edit/delete buttons
            assert "id" in farmer, "Farmer must have id for edit/delete"
            assert "name" in farmer, "Farmer must have name"
            assert "phone" in farmer, "Farmer must have phone"
            assert "milk_type" in farmer, "Farmer must have milk_type"
            print(f"✓ Farmers list returns {len(farmers)} farmers with id, name, phone, milk_type")
        else:
            print("✓ Farmers endpoint works (no farmers found)")

    def test_farmer_update_preserves_balance(self, headers):
        """Updating farmer should not reset balance"""
        response = requests.get(f"{BASE_URL}/api/farmers", headers=headers)
        if not response.json():
            pytest.skip("No farmers to test")
        
        farmer = response.json()[0]
        farmer_id = farmer["id"]
        original_balance = farmer.get("balance", 0)
        
        # Update name
        response = requests.put(f"{BASE_URL}/api/farmers/{farmer_id}", headers=headers, json={
            "name": farmer["name"]  # Same name
        })
        assert response.status_code == 200
        updated = response.json()
        
        # Balance should not change
        assert updated.get("balance", 0) == original_balance
        print(f"✓ Farmer update preserves balance: {original_balance}")
