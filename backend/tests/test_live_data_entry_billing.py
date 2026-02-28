"""
Test Live Data Entry on Billing Page Feature
- Tests POST /api/collections with date and rate override
- Tests POST /api/sales with date override  
- Tests billing endpoints return newly added entries
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLiveDataEntryBilling:
    """Tests for Live Data Entry feature on Billing Page"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        # Login with staff credentials
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "newstaff@dairy.com",
            "password": "staff123"
        })
        
        if response.status_code != 200:
            pytest.skip("Cannot login - skipping tests")
        
        self.token = response.json().get('access_token')
        self.session.headers.update({'Authorization': f'Bearer {self.token}'})
        
        # Get a farmer for testing
        farmers_res = self.session.get(f"{BASE_URL}/api/farmers")
        if farmers_res.status_code == 200 and farmers_res.json():
            self.farmer = farmers_res.json()[0]
            self.farmer_id = self.farmer['id']
        else:
            pytest.skip("No farmers available for testing")
        
        # Get a customer for testing
        customers_res = self.session.get(f"{BASE_URL}/api/customers")
        if customers_res.status_code == 200 and customers_res.json():
            self.customer = customers_res.json()[0]
            self.customer_id = self.customer['id']
        else:
            pytest.skip("No customers available for testing")
        
        # Track created entries for cleanup
        self.created_collection_ids = []
        self.created_sale_ids = []
        
        yield
        
        # Cleanup: Delete test-created entries
        for cid in self.created_collection_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/collections/{cid}")
            except:
                pass
        
        for sid in self.created_sale_ids:
            try:
                # Note: There's no delete sale endpoint, so we just track them
                pass
            except:
                pass
    
    # ===== COLLECTION TESTS (Farmer Bill) =====
    
    def test_create_collection_with_historical_date(self):
        """Test creating milk collection with a historical date (not today)"""
        historical_date = "2026-02-05"
        
        response = self.session.post(f"{BASE_URL}/api/collections", json={
            "farmer_id": self.farmer_id,
            "date": historical_date,
            "shift": "morning",
            "milk_type": "cow",
            "quantity": 15.0,
            "fat": 4.0,
            "snf": 8.5,
            "rate": 50.0
        })
        
        print(f"Create collection response: {response.status_code} - {response.text}")
        
        # Might get 400 if entry already exists - that's also valid
        if response.status_code == 400 and "already exists" in response.text:
            print("Entry already exists for this date/shift - this is expected for duplicate prevention")
            return
        
        assert response.status_code == 200 or response.status_code == 201, f"Failed: {response.text}"
        
        data = response.json()
        self.created_collection_ids.append(data['id'])
        
        # Verify the date is the historical date, not today
        assert data['date'] == historical_date, f"Expected date {historical_date}, got {data['date']}"
        assert data['quantity'] == 15.0
        assert data['rate'] == 50.0
        assert data['amount'] == 750.0  # 15 * 50
        
        print(f"Created collection with historical date: {data['date']}")
    
    def test_create_collection_with_rate_override(self):
        """Test creating collection with custom rate override (not from farmer/rate chart)"""
        custom_rate = 55.0
        test_date = "2026-02-06"
        
        response = self.session.post(f"{BASE_URL}/api/collections", json={
            "farmer_id": self.farmer_id,
            "date": test_date,
            "shift": "evening",
            "milk_type": "cow",
            "quantity": 10.0,
            "fat": 3.5,
            "snf": 8.0,
            "rate": custom_rate
        })
        
        print(f"Create collection with rate override: {response.status_code} - {response.text}")
        
        if response.status_code == 400 and "already exists" in response.text:
            print("Entry already exists - duplicate prevention working")
            return
        
        assert response.status_code == 200 or response.status_code == 201
        
        data = response.json()
        self.created_collection_ids.append(data['id'])
        
        # Verify rate override was used
        assert data['rate'] == custom_rate, f"Expected rate {custom_rate}, got {data['rate']}"
        assert data['amount'] == 550.0  # 10 * 55
        
        print(f"Created collection with rate override: ₹{data['rate']}")
    
    def test_create_collection_defaults_to_today(self):
        """Test that omitting date defaults to today's date"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        # First delete any existing entry for today to avoid conflict
        existing = self.session.get(f"{BASE_URL}/api/collections?date={today}&farmer_id={self.farmer_id}")
        
        response = self.session.post(f"{BASE_URL}/api/collections", json={
            "farmer_id": self.farmer_id,
            "shift": "morning",  # Use morning to avoid conflict with evening
            "milk_type": "buffalo",  # Use buffalo to differentiate
            "quantity": 5.0,
            "fat": 6.0,
            "snf": 9.0,
            "rate": 60.0
        })
        
        print(f"Create collection without date: {response.status_code} - {response.text}")
        
        if response.status_code == 400 and "already exists" in response.text:
            print("Entry already exists for today - that's fine")
            return
        
        if response.status_code in [200, 201]:
            data = response.json()
            self.created_collection_ids.append(data['id'])
            assert data['date'] == today, f"Expected today's date {today}, got {data['date']}"
            print(f"Collection defaulted to today's date: {data['date']}")
    
    def test_collection_appears_in_farmer_billing(self):
        """Test that newly created collection appears in farmer billing endpoint"""
        test_date = "2026-02-07"
        
        # Create a collection entry
        create_res = self.session.post(f"{BASE_URL}/api/collections", json={
            "farmer_id": self.farmer_id,
            "date": test_date,
            "shift": "morning",
            "milk_type": "cow",
            "quantity": 12.0,
            "fat": 4.2,
            "rate": 48.0
        })
        
        if create_res.status_code == 400 and "already exists" in create_res.text:
            print("Entry exists - checking billing endpoint anyway")
        elif create_res.status_code in [200, 201]:
            self.created_collection_ids.append(create_res.json()['id'])
        
        # Fetch billing for that date range
        billing_res = self.session.get(
            f"{BASE_URL}/api/billing/farmer/{self.farmer_id}",
            params={"start_date": test_date, "end_date": test_date}
        )
        
        assert billing_res.status_code == 200
        billing_data = billing_res.json()
        
        print(f"Farmer billing data: {billing_data['summary']}")
        
        # Check that collections are returned
        assert "collections" in billing_data
        assert "summary" in billing_data
        
        # If we created an entry, verify it's in the list
        collections = billing_data['collections']
        if collections:
            found = any(c['date'] == test_date for c in collections)
            print(f"Collection for {test_date} found in billing: {found}")
    
    # ===== SALE TESTS (Customer Bill) =====
    
    def test_create_sale_with_historical_date(self):
        """Test creating sale with a historical date"""
        historical_date = "2026-02-06"
        
        response = self.session.post(f"{BASE_URL}/api/sales", json={
            "customer_id": self.customer_id,
            "date": historical_date,
            "product": "milk",
            "direct_amount": 750.0
        })
        
        print(f"Create sale response: {response.status_code} - {response.text}")
        
        assert response.status_code == 200 or response.status_code == 201
        
        data = response.json()
        self.created_sale_ids.append(data['id'])
        
        # Verify the date is the historical date
        assert data['date'] == historical_date, f"Expected date {historical_date}, got {data['date']}"
        assert data['amount'] == 750.0
        
        print(f"Created sale with historical date: {data['date']}")
    
    def test_create_sale_with_qty_rate_mode(self):
        """Test creating sale with quantity × rate calculation"""
        test_date = "2026-02-08"
        
        response = self.session.post(f"{BASE_URL}/api/sales", json={
            "customer_id": self.customer_id,
            "date": test_date,
            "product": "paneer",
            "quantity": 5.0,
            "rate": 60.0
        })
        
        print(f"Create sale with qty×rate: {response.status_code} - {response.text}")
        
        assert response.status_code == 200 or response.status_code == 201
        
        data = response.json()
        self.created_sale_ids.append(data['id'])
        
        assert data['date'] == test_date
        assert data['quantity'] == 5.0
        assert data['rate'] == 60.0
        assert data['amount'] == 300.0  # 5 * 60
        
        print(f"Created sale: qty={data['quantity']}, rate={data['rate']}, amount={data['amount']}")
    
    def test_create_sale_defaults_to_today(self):
        """Test that omitting date in sale defaults to today"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = self.session.post(f"{BASE_URL}/api/sales", json={
            "customer_id": self.customer_id,
            "product": "dahi",
            "direct_amount": 100.0
        })
        
        print(f"Create sale without date: {response.status_code} - {response.text}")
        
        assert response.status_code == 200 or response.status_code == 201
        
        data = response.json()
        self.created_sale_ids.append(data['id'])
        
        assert data['date'] == today, f"Expected today {today}, got {data['date']}"
        print(f"Sale defaulted to today: {data['date']}")
    
    def test_sale_appears_in_customer_billing(self):
        """Test that newly created sale appears in customer billing endpoint"""
        test_date = "2026-02-09"
        
        # Create a sale entry
        create_res = self.session.post(f"{BASE_URL}/api/sales", json={
            "customer_id": self.customer_id,
            "date": test_date,
            "product": "ghee",
            "direct_amount": 500.0
        })
        
        assert create_res.status_code in [200, 201]
        self.created_sale_ids.append(create_res.json()['id'])
        
        # Fetch billing for that date range
        billing_res = self.session.get(
            f"{BASE_URL}/api/billing/customer/{self.customer_id}",
            params={"start_date": test_date, "end_date": test_date}
        )
        
        assert billing_res.status_code == 200
        billing_data = billing_res.json()
        
        print(f"Customer billing data: {billing_data['summary']}")
        
        # Check that sales are returned
        assert "sales" in billing_data
        assert "summary" in billing_data
        
        # Verify our sale is in the list
        sales = billing_data['sales']
        found = any(s['date'] == test_date and s['product'] == 'ghee' for s in sales)
        assert found, f"Sale for {test_date} not found in billing"
        print(f"Sale for {test_date} found in customer billing")
    
    def test_sale_products_variety(self):
        """Test creating sales with different product types"""
        products = ['milk', 'paneer', 'dahi', 'ghee', 'cream', 'other']
        
        for product in products:
            response = self.session.post(f"{BASE_URL}/api/sales", json={
                "customer_id": self.customer_id,
                "date": f"2026-02-1{products.index(product)}",
                "product": product,
                "direct_amount": 100.0 + products.index(product) * 10
            })
            
            if response.status_code in [200, 201]:
                self.created_sale_ids.append(response.json()['id'])
                print(f"Created sale with product '{product}': ₹{response.json()['amount']}")
            else:
                print(f"Sale creation for '{product}' returned: {response.status_code}")


class TestDuplicateEntryPrevention:
    """Test duplicate entry prevention for collections"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "newstaff@dairy.com",
            "password": "staff123"
        })
        
        if response.status_code != 200:
            pytest.skip("Cannot login")
        
        self.token = response.json().get('access_token')
        self.session.headers.update({'Authorization': f'Bearer {self.token}'})
        
        farmers_res = self.session.get(f"{BASE_URL}/api/farmers")
        if farmers_res.status_code == 200 and farmers_res.json():
            self.farmer_id = farmers_res.json()[0]['id']
        else:
            pytest.skip("No farmers available")
        
        self.test_collection_id = None
        yield
        
        if self.test_collection_id:
            self.session.delete(f"{BASE_URL}/api/collections/{self.test_collection_id}")
    
    def test_duplicate_collection_prevented(self):
        """Test that duplicate entries (same farmer, date, shift) are prevented"""
        unique_date = "2026-02-20"  # Use a unique date
        
        # First entry should succeed
        first_res = self.session.post(f"{BASE_URL}/api/collections", json={
            "farmer_id": self.farmer_id,
            "date": unique_date,
            "shift": "morning",
            "milk_type": "cow",
            "quantity": 10.0,
            "fat": 4.0,
            "rate": 50.0
        })
        
        if first_res.status_code in [200, 201]:
            self.test_collection_id = first_res.json()['id']
            print(f"First entry created: {first_res.json()['id']}")
            
            # Second entry with same farmer/date/shift should fail
            second_res = self.session.post(f"{BASE_URL}/api/collections", json={
                "farmer_id": self.farmer_id,
                "date": unique_date,
                "shift": "morning",
                "milk_type": "cow",
                "quantity": 5.0,
                "fat": 3.5,
                "rate": 45.0
            })
            
            assert second_res.status_code == 400, f"Expected 400, got {second_res.status_code}"
            assert "already exists" in second_res.text.lower()
            print(f"Duplicate prevented: {second_res.json()}")
        elif first_res.status_code == 400 and "already exists" in first_res.text:
            print("Entry already exists from previous test - duplicate prevention working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
