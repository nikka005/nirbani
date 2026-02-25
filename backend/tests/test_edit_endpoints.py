"""
Test cases for Farmer and Customer Edit functionality (PUT endpoints)
Tests the newly added edit buttons and dialogs for farmer and customer detail pages
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEditEndpoints:
    """Test PUT endpoints for farmers and customers"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "test123"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            # Try creating user if login fails
            register_response = self.session.post(f"{BASE_URL}/api/auth/register", json={
                "name": "Test User",
                "email": "test@test.com",
                "phone": "9999999999",
                "password": "test123",
                "role": "admin"
            })
            if register_response.status_code == 200:
                token = register_response.json().get("access_token")
                self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    # ==================== FARMER EDIT TESTS ====================
    
    def test_put_farmer_endpoint_exists(self):
        """Test that PUT /api/farmers/{farmer_id} endpoint exists"""
        # Use a known farmer ID from the test request
        farmer_id = "492bdcdf-8eda-4bea-8c7c-a89b0db0e8ff"
        
        response = self.session.put(f"{BASE_URL}/api/farmers/{farmer_id}", json={
            "name": "Test Update"
        })
        
        # Should be 200 (success) or 404 (farmer not found) - not 405 (method not allowed)
        assert response.status_code in [200, 404], f"PUT endpoint should exist, got {response.status_code}"
        print(f"✓ PUT /api/farmers/{{farmer_id}} endpoint exists (status: {response.status_code})")
    
    def test_create_and_update_farmer(self):
        """Test creating a farmer and then updating via PUT"""
        # Create a test farmer
        create_payload = {
            "name": "TEST_EditFarmer",
            "phone": "9876540001",
            "village": "Test Village",
            "address": "Test Address",
            "milk_type": "cow",
            "fixed_rate": 45.0
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/farmers", json=create_payload)
        assert create_response.status_code == 200, f"Failed to create farmer: {create_response.text}"
        
        created_farmer = create_response.json()
        farmer_id = created_farmer["id"]
        print(f"✓ Created test farmer with ID: {farmer_id}")
        
        # Update the farmer via PUT
        update_payload = {
            "name": "TEST_EditFarmer_Updated",
            "phone": "9876540002",
            "village": "Updated Village",
            "address": "Updated Address",
            "milk_type": "buffalo",
            "fixed_rate": 55.0,
            "bank_account": "1234567890",
            "ifsc_code": "SBIN0001234",
            "aadhar_number": "123456789012"
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/farmers/{farmer_id}", json=update_payload)
        assert update_response.status_code == 200, f"Failed to update farmer: {update_response.text}"
        
        updated_farmer = update_response.json()
        print(f"✓ Updated farmer successfully")
        
        # Verify the update was persisted
        assert updated_farmer["name"] == "TEST_EditFarmer_Updated", "Name not updated"
        assert updated_farmer["phone"] == "9876540002", "Phone not updated"
        assert updated_farmer["village"] == "Updated Village", "Village not updated"
        assert updated_farmer["address"] == "Updated Address", "Address not updated"
        assert updated_farmer["milk_type"] == "buffalo", "Milk type not updated"
        assert updated_farmer["fixed_rate"] == 55.0, "Fixed rate not updated"
        assert updated_farmer["bank_account"] == "1234567890", "Bank account not updated"
        assert updated_farmer["ifsc_code"] == "SBIN0001234", "IFSC code not updated"
        assert updated_farmer["aadhar_number"] == "123456789012", "Aadhar not updated"
        print(f"✓ All farmer fields updated correctly")
        
        # Verify via GET
        get_response = self.session.get(f"{BASE_URL}/api/farmers/{farmer_id}")
        assert get_response.status_code == 200
        fetched_farmer = get_response.json()
        assert fetched_farmer["name"] == "TEST_EditFarmer_Updated"
        print(f"✓ Verified update persisted via GET")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/farmers/{farmer_id}")
        print(f"✓ Cleaned up test farmer")
    
    def test_update_farmer_partial_fields(self):
        """Test that partial updates work (only updating some fields)"""
        # Create a test farmer
        create_response = self.session.post(f"{BASE_URL}/api/farmers", json={
            "name": "TEST_PartialUpdate",
            "phone": "9876540003",
            "village": "Original Village",
            "milk_type": "cow"
        })
        assert create_response.status_code == 200
        farmer_id = create_response.json()["id"]
        
        # Update only the name
        update_response = self.session.put(f"{BASE_URL}/api/farmers/{farmer_id}", json={
            "name": "TEST_PartialUpdate_NewName"
        })
        assert update_response.status_code == 200
        
        # Verify only name changed, other fields preserved
        updated = update_response.json()
        assert updated["name"] == "TEST_PartialUpdate_NewName", "Name should be updated"
        assert updated["phone"] == "9876540003", "Phone should be preserved"
        assert updated["village"] == "Original Village", "Village should be preserved"
        assert updated["milk_type"] == "cow", "Milk type should be preserved"
        print(f"✓ Partial update works correctly - only specified fields updated")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/farmers/{farmer_id}")
    
    def test_update_farmer_not_found(self):
        """Test updating a non-existent farmer returns 404"""
        response = self.session.put(f"{BASE_URL}/api/farmers/non-existent-id", json={
            "name": "Test"
        })
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ PUT on non-existent farmer returns 404")
    
    # ==================== CUSTOMER EDIT TESTS ====================
    
    def test_put_customer_endpoint_exists(self):
        """Test that PUT /api/customers/{customer_id} endpoint exists"""
        # Use a known customer ID from the test request
        customer_id = "c5a58cbd-e560-4dbf-821a-a685799b78b7"
        
        response = self.session.put(f"{BASE_URL}/api/customers/{customer_id}", json={
            "name": "Test Update"
        })
        
        # Should be 200 (success) or 404 (customer not found) - not 405 (method not allowed)
        assert response.status_code in [200, 404], f"PUT endpoint should exist, got {response.status_code}"
        print(f"✓ PUT /api/customers/{{customer_id}} endpoint exists (status: {response.status_code})")
    
    def test_create_and_update_customer(self):
        """Test creating a customer and then updating via PUT"""
        # Create a test customer
        create_payload = {
            "name": "TEST_EditCustomer",
            "phone": "9876541001",
            "address": "Test Customer Address",
            "customer_type": "retail",
            "gst_number": ""
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/customers", json=create_payload)
        assert create_response.status_code == 200, f"Failed to create customer: {create_response.text}"
        
        created_customer = create_response.json()
        customer_id = created_customer["id"]
        print(f"✓ Created test customer with ID: {customer_id}")
        
        # Update the customer via PUT
        update_payload = {
            "name": "TEST_EditCustomer_Updated",
            "phone": "9876541002",
            "address": "Updated Customer Address",
            "customer_type": "wholesale",
            "gst_number": "29ABCDE1234F1Z5"
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/customers/{customer_id}", json=update_payload)
        assert update_response.status_code == 200, f"Failed to update customer: {update_response.text}"
        
        updated_customer = update_response.json()
        print(f"✓ Updated customer successfully")
        
        # Verify the update was persisted
        assert updated_customer["name"] == "TEST_EditCustomer_Updated", "Name not updated"
        assert updated_customer["phone"] == "9876541002", "Phone not updated"
        assert updated_customer["address"] == "Updated Customer Address", "Address not updated"
        assert updated_customer["customer_type"] == "wholesale", "Customer type not updated"
        assert updated_customer["gst_number"] == "29ABCDE1234F1Z5", "GST number not updated"
        print(f"✓ All customer fields updated correctly")
        
        # Verify via GET
        get_response = self.session.get(f"{BASE_URL}/api/customers/{customer_id}")
        assert get_response.status_code == 200
        fetched_customer = get_response.json()
        assert fetched_customer["name"] == "TEST_EditCustomer_Updated"
        print(f"✓ Verified update persisted via GET")
        
        # Cleanup - customers don't have delete endpoint in the code, so we skip this
        print(f"✓ Customer test complete (no delete endpoint to cleanup)")
    
    def test_update_customer_partial_fields(self):
        """Test that partial updates work for customers"""
        # Create a test customer
        create_response = self.session.post(f"{BASE_URL}/api/customers", json={
            "name": "TEST_CustomerPartial",
            "phone": "9876541003",
            "address": "Original Address",
            "customer_type": "retail"
        })
        assert create_response.status_code == 200
        customer_id = create_response.json()["id"]
        
        # Update only the name and address
        update_response = self.session.put(f"{BASE_URL}/api/customers/{customer_id}", json={
            "name": "TEST_CustomerPartial_Updated",
            "address": "New Address"
        })
        assert update_response.status_code == 200
        
        # Verify only specified fields changed
        updated = update_response.json()
        assert updated["name"] == "TEST_CustomerPartial_Updated", "Name should be updated"
        assert updated["address"] == "New Address", "Address should be updated"
        assert updated["phone"] == "9876541003", "Phone should be preserved"
        assert updated["customer_type"] == "retail", "Customer type should be preserved"
        print(f"✓ Partial customer update works correctly")
    
    def test_update_customer_not_found(self):
        """Test updating a non-existent customer returns 404"""
        response = self.session.put(f"{BASE_URL}/api/customers/non-existent-id", json={
            "name": "Test"
        })
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ PUT on non-existent customer returns 404")
    
    # ==================== EDGE CASES ====================
    
    def test_update_farmer_with_empty_optional_fields(self):
        """Test updating farmer with empty optional fields works"""
        # Create farmer
        create_response = self.session.post(f"{BASE_URL}/api/farmers", json={
            "name": "TEST_EmptyFields",
            "phone": "9876540004"
        })
        assert create_response.status_code == 200
        farmer_id = create_response.json()["id"]
        
        # Update with some empty optional fields
        update_response = self.session.put(f"{BASE_URL}/api/farmers/{farmer_id}", json={
            "name": "TEST_EmptyFields_Updated",
            "village": "",
            "address": "",
            "fixed_rate": None
        })
        assert update_response.status_code == 200
        print(f"✓ Update with empty optional fields works")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/farmers/{farmer_id}")
    
    def test_update_customer_type_change(self):
        """Test changing customer type from retail to wholesale"""
        # Create retail customer
        create_response = self.session.post(f"{BASE_URL}/api/customers", json={
            "name": "TEST_TypeChange",
            "phone": "9876541004",
            "customer_type": "retail"
        })
        assert create_response.status_code == 200
        customer_id = create_response.json()["id"]
        
        # Change to wholesale
        update_response = self.session.put(f"{BASE_URL}/api/customers/{customer_id}", json={
            "customer_type": "wholesale",
            "gst_number": "29XYZAB5678C1D6"
        })
        assert update_response.status_code == 200
        updated = update_response.json()
        
        assert updated["customer_type"] == "wholesale", "Customer type should be wholesale"
        assert updated["gst_number"] == "29XYZAB5678C1D6", "GST number should be set"
        print(f"✓ Customer type change from retail to wholesale works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
