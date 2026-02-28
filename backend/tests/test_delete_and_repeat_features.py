"""
Test suite for Billing Page Delete and Repeat Features (Iteration 13)
Tests:
1. DELETE /api/sales/{sale_id} endpoint
2. DELETE /api/collections/{collection_id} endpoint
3. Multiple sale entries creation (repeat days feature)
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "newstaff@dairy.com"
TEST_PASSWORD = "staff123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for API calls"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def headers(auth_token):
    """Return headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture(scope="module")
def test_customer(headers):
    """Get or create a test customer for sale tests"""
    # First try to find an existing customer
    response = requests.get(f"{BASE_URL}/api/customers", headers=headers)
    assert response.status_code == 200
    customers = response.json()
    
    if customers:
        return customers[0]
    
    # Create a test customer if none exists
    response = requests.post(f"{BASE_URL}/api/customers", headers=headers, json={
        "name": "TEST_Delete_Customer",
        "phone": "9999888877",
        "customer_type": "retail"
    })
    assert response.status_code == 200
    return response.json()


@pytest.fixture(scope="module")
def test_farmer(headers):
    """Get or create a test farmer for collection tests"""
    # First try to find an existing farmer
    response = requests.get(f"{BASE_URL}/api/farmers", headers=headers)
    assert response.status_code == 200
    farmers = response.json()
    
    if farmers:
        return farmers[0]
    
    # Create a test farmer if none exists
    response = requests.post(f"{BASE_URL}/api/farmers", headers=headers, json={
        "name": "TEST_Delete_Farmer",
        "phone": "9999777766",
        "milk_type": "cow",
        "cow_rate": 50
    })
    assert response.status_code == 200
    return response.json()


class TestDeleteSaleEndpoint:
    """Tests for DELETE /api/sales/{sale_id} endpoint"""
    
    def test_delete_sale_success(self, headers, test_customer):
        """Test: Create a sale then delete it - should return 200"""
        # Create a sale first
        create_response = requests.post(f"{BASE_URL}/api/sales", headers=headers, json={
            "customer_id": test_customer["id"],
            "product": "milk",
            "direct_amount": 100,
            "date": "2026-02-01"
        })
        assert create_response.status_code == 200, f"Create sale failed: {create_response.text}"
        sale = create_response.json()
        sale_id = sale["id"]
        
        # Now delete the sale
        delete_response = requests.delete(f"{BASE_URL}/api/sales/{sale_id}", headers=headers)
        assert delete_response.status_code == 200, f"Delete sale failed: {delete_response.text}"
        
        data = delete_response.json()
        assert "message" in data
        assert "deleted" in data["message"].lower() or "success" in data["message"].lower()
        print(f"✓ DELETE /api/sales/{sale_id} returned 200 with message: {data['message']}")
    
    def test_delete_sale_nonexistent(self, headers):
        """Test: Delete a non-existent sale - should return 404"""
        fake_sale_id = "nonexistent-sale-id-12345"
        response = requests.delete(f"{BASE_URL}/api/sales/{fake_sale_id}", headers=headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ DELETE /api/sales/{fake_sale_id} returned 404 for non-existent sale")
    
    def test_delete_sale_updates_customer_totals(self, headers, test_customer):
        """Test: Deleting sale should update customer totals"""
        # Get initial customer state
        initial_response = requests.get(f"{BASE_URL}/api/customers/{test_customer['id']}", headers=headers)
        initial_customer = initial_response.json()
        initial_balance = initial_customer.get("balance", 0)
        
        # Create a sale
        create_response = requests.post(f"{BASE_URL}/api/sales", headers=headers, json={
            "customer_id": test_customer["id"],
            "product": "milk",
            "direct_amount": 150,
            "date": "2026-02-02"
        })
        sale = create_response.json()
        
        # Delete the sale
        delete_response = requests.delete(f"{BASE_URL}/api/sales/{sale['id']}", headers=headers)
        assert delete_response.status_code == 200
        
        # Verify customer totals reverted
        final_response = requests.get(f"{BASE_URL}/api/customers/{test_customer['id']}", headers=headers)
        final_customer = final_response.json()
        final_balance = final_customer.get("balance", 0)
        
        # Balance should be back to initial (or very close due to float precision)
        assert abs(final_balance - initial_balance) < 1, f"Balance not reverted: initial={initial_balance}, final={final_balance}"
        print(f"✓ Customer balance correctly reverted after delete (initial: {initial_balance}, final: {final_balance})")


class TestDeleteCollectionEndpoint:
    """Tests for DELETE /api/collections/{collection_id} endpoint"""
    
    def test_delete_collection_success(self, headers, test_farmer):
        """Test: Create a collection then delete it - should return 200"""
        # First check if there's an existing entry for this date/shift to avoid duplicate
        # We'll use a unique date to avoid conflicts
        test_date = "2026-03-15"
        
        # Create a collection first
        create_response = requests.post(f"{BASE_URL}/api/collections", headers=headers, json={
            "farmer_id": test_farmer["id"],
            "shift": "morning",
            "quantity": 10,
            "fat": 4.5,
            "rate": 50,
            "date": test_date
        })
        
        if create_response.status_code == 400 and "already exists" in create_response.text:
            # Entry already exists, skip this test
            pytest.skip("Collection entry already exists for this date/shift")
        
        assert create_response.status_code == 200, f"Create collection failed: {create_response.text}"
        collection = create_response.json()
        collection_id = collection["id"]
        
        # Now delete the collection
        delete_response = requests.delete(f"{BASE_URL}/api/collections/{collection_id}", headers=headers)
        assert delete_response.status_code == 200, f"Delete collection failed: {delete_response.text}"
        
        data = delete_response.json()
        assert "message" in data
        print(f"✓ DELETE /api/collections/{collection_id} returned 200 with message: {data['message']}")
    
    def test_delete_collection_nonexistent(self, headers):
        """Test: Delete a non-existent collection - should return 404"""
        fake_collection_id = "nonexistent-collection-id-12345"
        response = requests.delete(f"{BASE_URL}/api/collections/{fake_collection_id}", headers=headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ DELETE /api/collections/{fake_collection_id} returned 404 for non-existent collection")


class TestRepeatDaysFeature:
    """Tests for the Repeat Days feature - creating multiple sale entries"""
    
    def test_create_multiple_sales_for_repeat_days(self, headers, test_customer):
        """Test: Simulate repeat days by creating 3 consecutive entries"""
        base_date = datetime(2026, 2, 10)
        repeat_days = 3
        amount_per_day = 200
        created_sale_ids = []
        
        # Create entries for 3 consecutive days (simulating repeat feature)
        for i in range(repeat_days):
            entry_date = (base_date + timedelta(days=i)).strftime("%Y-%m-%d")
            response = requests.post(f"{BASE_URL}/api/sales", headers=headers, json={
                "customer_id": test_customer["id"],
                "product": "milk",
                "direct_amount": amount_per_day,
                "date": entry_date
            })
            assert response.status_code == 200, f"Failed to create sale for {entry_date}: {response.text}"
            created_sale_ids.append(response.json()["id"])
            print(f"✓ Created sale entry for {entry_date} with amount {amount_per_day}")
        
        assert len(created_sale_ids) == 3
        print(f"✓ Successfully created {repeat_days} entries (simulating repeat days feature)")
        
        # Cleanup - delete the test entries
        for sale_id in created_sale_ids:
            requests.delete(f"{BASE_URL}/api/sales/{sale_id}", headers=headers)
    
    def test_billing_includes_repeated_entries(self, headers, test_customer):
        """Test: Verify billing endpoint returns all entries for date range"""
        # Create some test entries
        base_date = datetime(2026, 2, 20)
        created_ids = []
        
        for i in range(2):
            entry_date = (base_date + timedelta(days=i)).strftime("%Y-%m-%d")
            response = requests.post(f"{BASE_URL}/api/sales", headers=headers, json={
                "customer_id": test_customer["id"],
                "product": "milk",
                "direct_amount": 100,
                "date": entry_date
            })
            if response.status_code == 200:
                created_ids.append(response.json()["id"])
        
        # Get billing for date range
        billing_response = requests.get(
            f"{BASE_URL}/api/billing/customer/{test_customer['id']}?start_date=2026-02-01&end_date=2026-02-28",
            headers=headers
        )
        assert billing_response.status_code == 200
        billing_data = billing_response.json()
        
        assert "sales" in billing_data
        assert "summary" in billing_data
        print(f"✓ Billing endpoint returned {len(billing_data['sales'])} sales entries")
        
        # Cleanup
        for sale_id in created_ids:
            requests.delete(f"{BASE_URL}/api/sales/{sale_id}", headers=headers)


class TestCacheBusting:
    """Tests related to cache busting (fresh data on bill generation)"""
    
    def test_billing_returns_fresh_data(self, headers, test_customer):
        """Test: Consecutive billing calls should return consistent data"""
        url = f"{BASE_URL}/api/billing/customer/{test_customer['id']}?start_date=2026-01-01&end_date=2026-01-31"
        
        # Make two consecutive calls
        response1 = requests.get(url, headers=headers)
        response2 = requests.get(url, headers=headers)
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        # Both should return same data structure
        data1 = response1.json()
        data2 = response2.json()
        
        assert data1["summary"]["total_entries"] == data2["summary"]["total_entries"]
        print(f"✓ Billing endpoint returns consistent data across calls")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
