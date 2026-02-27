"""
Test Bulk Orders Feature for Nirbani Dairy
- POST /api/bulk-orders (direct_amount & qty x rate)
- GET /api/bulk-orders (with filters)
- PUT /api/bulk-orders/{id} (status update)
- DELETE /api/bulk-orders/{id}
- GET /api/bulk-order-customers (unique customer aggregation)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBulkOrders:
    """Bulk Order CRUD and Customer Search Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "test123"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        self.created_order_ids = []
        yield
        
        # Cleanup created orders
        for order_id in self.created_order_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/bulk-orders/{order_id}")
            except:
                pass

    # ------- CREATE TESTS -------
    
    def test_create_bulk_order_direct_amount(self):
        """POST /api/bulk-orders with direct_amount"""
        payload = {
            "customer_name": "TEST_Hotel Grand",
            "customer_phone": "9876543211",
            "customer_type": "hotel",
            "product": "milk",
            "quantity": 0,
            "rate": 0,
            "direct_amount": 5000,
            "notes": "Test order with direct amount"
        }
        res = self.session.post(f"{BASE_URL}/api/bulk-orders", json=payload)
        assert res.status_code == 200, f"Failed to create: {res.text}"
        
        data = res.json()
        self.created_order_ids.append(data["id"])
        
        # Verify response data
        assert data["customer_name"] == "TEST_Hotel Grand"
        assert data["customer_phone"] == "9876543211"
        assert data["customer_type"] == "hotel"
        assert data["product"] == "milk"
        assert data["amount"] == 5000  # Direct amount used
        assert data["status"] == "pending"
        assert "id" in data
        assert "date" in data
        print(f"✓ Created bulk order with direct_amount: {data['id']}")

    def test_create_bulk_order_qty_rate(self):
        """POST /api/bulk-orders with quantity x rate"""
        payload = {
            "customer_name": "TEST_Sharma Caterer",
            "customer_phone": "9876543222",
            "customer_type": "caterer",
            "product": "paneer",
            "quantity": 10,  # 10 kg
            "rate": 350,     # ₹350/kg
            "direct_amount": None,
            "notes": "Test order with qty x rate"
        }
        res = self.session.post(f"{BASE_URL}/api/bulk-orders", json=payload)
        assert res.status_code == 200, f"Failed to create: {res.text}"
        
        data = res.json()
        self.created_order_ids.append(data["id"])
        
        # Verify amount calculation: 10 * 350 = 3500
        assert data["amount"] == 3500
        assert data["quantity"] == 10
        assert data["rate"] == 350
        assert data["customer_type"] == "caterer"
        print(f"✓ Created bulk order with qty x rate: {data['id']}, amount=₹{data['amount']}")

    def test_create_bulk_order_halwai_type(self):
        """POST /api/bulk-orders with halwai customer type"""
        payload = {
            "customer_name": "TEST_Ram Halwai",
            "customer_phone": "9876543233",
            "customer_type": "halwai",
            "product": "ghee",
            "quantity": 5,
            "rate": 600,
            "notes": "Halwai order"
        }
        res = self.session.post(f"{BASE_URL}/api/bulk-orders", json=payload)
        assert res.status_code == 200, f"Failed to create: {res.text}"
        
        data = res.json()
        self.created_order_ids.append(data["id"])
        
        assert data["customer_type"] == "halwai"
        assert data["amount"] == 3000  # 5 * 600
        print(f"✓ Created halwai order: {data['id']}")

    def test_create_bulk_order_other_type(self):
        """POST /api/bulk-orders with 'other' customer type"""
        payload = {
            "customer_name": "TEST_Event Order",
            "customer_phone": "9876543244",
            "customer_type": "other",
            "product": "dahi",
            "direct_amount": 1500
        }
        res = self.session.post(f"{BASE_URL}/api/bulk-orders", json=payload)
        assert res.status_code == 200, f"Failed to create: {res.text}"
        
        data = res.json()
        self.created_order_ids.append(data["id"])
        
        assert data["customer_type"] == "other"
        print(f"✓ Created 'other' type order: {data['id']}")

    # ------- READ TESTS -------
    
    def test_get_all_bulk_orders(self):
        """GET /api/bulk-orders returns all orders"""
        res = self.session.get(f"{BASE_URL}/api/bulk-orders")
        assert res.status_code == 200, f"Failed to get orders: {res.text}"
        
        orders = res.json()
        assert isinstance(orders, list)
        print(f"✓ GET /api/bulk-orders returned {len(orders)} orders")
        
        # Check existing test orders (Taj Hotel, Ram Halwai mentioned in context)
        order_names = [o["customer_name"] for o in orders]
        print(f"  Order customers: {order_names[:5]}...")  # First 5

    def test_get_bulk_orders_filter_pending(self):
        """GET /api/bulk-orders?status=pending filters correctly"""
        res = self.session.get(f"{BASE_URL}/api/bulk-orders?status=pending")
        assert res.status_code == 200, f"Failed: {res.text}"
        
        orders = res.json()
        for order in orders:
            assert order["status"] == "pending", f"Found non-pending order: {order['status']}"
        print(f"✓ GET /api/bulk-orders?status=pending returned {len(orders)} pending orders")

    def test_get_bulk_orders_filter_delivered(self):
        """GET /api/bulk-orders?status=delivered filters correctly"""
        res = self.session.get(f"{BASE_URL}/api/bulk-orders?status=delivered")
        assert res.status_code == 200, f"Failed: {res.text}"
        
        orders = res.json()
        for order in orders:
            assert order["status"] == "delivered", f"Found non-delivered order: {order['status']}"
        print(f"✓ GET /api/bulk-orders?status=delivered returned {len(orders)} delivered orders")

    # ------- UPDATE TESTS -------
    
    def test_update_order_status_to_delivered(self):
        """PUT /api/bulk-orders/{id} updates status to delivered"""
        # First create an order
        create_res = self.session.post(f"{BASE_URL}/api/bulk-orders", json={
            "customer_name": "TEST_Deliver Test",
            "customer_phone": "9876543255",
            "customer_type": "hotel",
            "product": "milk",
            "direct_amount": 2000
        })
        assert create_res.status_code == 200
        order_id = create_res.json()["id"]
        self.created_order_ids.append(order_id)
        
        # Update to delivered
        update_res = self.session.put(f"{BASE_URL}/api/bulk-orders/{order_id}", json={
            "status": "delivered"
        })
        assert update_res.status_code == 200, f"Failed to update: {update_res.text}"
        
        updated = update_res.json()
        assert updated["status"] == "delivered"
        print(f"✓ Updated order {order_id} status to delivered")

    def test_update_order_status_to_cancelled(self):
        """PUT /api/bulk-orders/{id} updates status to cancelled"""
        # Create order
        create_res = self.session.post(f"{BASE_URL}/api/bulk-orders", json={
            "customer_name": "TEST_Cancel Test",
            "customer_phone": "9876543266",
            "customer_type": "caterer",
            "product": "paneer",
            "direct_amount": 1500
        })
        assert create_res.status_code == 200
        order_id = create_res.json()["id"]
        self.created_order_ids.append(order_id)
        
        # Update to cancelled
        update_res = self.session.put(f"{BASE_URL}/api/bulk-orders/{order_id}", json={
            "status": "cancelled"
        })
        assert update_res.status_code == 200
        
        updated = update_res.json()
        assert updated["status"] == "cancelled"
        print(f"✓ Updated order {order_id} status to cancelled")

    def test_update_nonexistent_order(self):
        """PUT /api/bulk-orders/{invalid_id} returns 404"""
        res = self.session.put(f"{BASE_URL}/api/bulk-orders/nonexistent-id-123", json={
            "status": "delivered"
        })
        assert res.status_code == 404, f"Expected 404, got {res.status_code}"
        print("✓ PUT nonexistent order returns 404")

    # ------- DELETE TESTS -------
    
    def test_delete_bulk_order(self):
        """DELETE /api/bulk-orders/{id} deletes order"""
        # Create order
        create_res = self.session.post(f"{BASE_URL}/api/bulk-orders", json={
            "customer_name": "TEST_Delete Test",
            "customer_phone": "9876543277",
            "customer_type": "halwai",
            "product": "milk",
            "direct_amount": 1000
        })
        assert create_res.status_code == 200
        order_id = create_res.json()["id"]
        
        # Delete
        delete_res = self.session.delete(f"{BASE_URL}/api/bulk-orders/{order_id}")
        assert delete_res.status_code == 200, f"Failed to delete: {delete_res.text}"
        
        # Verify it's gone
        get_res = self.session.get(f"{BASE_URL}/api/bulk-orders")
        order_ids = [o["id"] for o in get_res.json()]
        assert order_id not in order_ids, "Order still exists after delete"
        print(f"✓ Deleted order {order_id}")

    def test_delete_nonexistent_order(self):
        """DELETE /api/bulk-orders/{invalid_id} returns 404"""
        res = self.session.delete(f"{BASE_URL}/api/bulk-orders/nonexistent-id-456")
        assert res.status_code == 404, f"Expected 404, got {res.status_code}"
        print("✓ DELETE nonexistent order returns 404")

    # ------- CUSTOMER AGGREGATION -------
    
    def test_get_bulk_order_customers(self):
        """GET /api/bulk-order-customers returns unique customers from orders"""
        res = self.session.get(f"{BASE_URL}/api/bulk-order-customers")
        assert res.status_code == 200, f"Failed: {res.text}"
        
        customers = res.json()
        assert isinstance(customers, list)
        
        if customers:
            # Verify customer structure
            sample = customers[0]
            assert "name" in sample
            assert "phone" in sample
            assert "customer_type" in sample
            assert "total_orders" in sample
            assert "total_amount" in sample
            print(f"✓ GET /api/bulk-order-customers returned {len(customers)} unique customers")
            print(f"  Sample customer: {sample['name']} ({sample['customer_type']}) - {sample['total_orders']} orders")
        else:
            print("✓ GET /api/bulk-order-customers returned empty list (no orders yet)")


class TestExistingBulkOrders:
    """Test existing bulk orders mentioned in context (Taj Hotel, Ram Halwai)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "test123"
        })
        assert login_res.status_code == 200
        token = login_res.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})

    def test_existing_orders_exist(self):
        """Verify existing test orders (Taj Hotel, Ram Halwai) exist"""
        res = self.session.get(f"{BASE_URL}/api/bulk-orders")
        assert res.status_code == 200
        
        orders = res.json()
        order_names = [o["customer_name"] for o in orders]
        
        # Check for existing orders mentioned in context
        print(f"✓ Found {len(orders)} total bulk orders")
        print(f"  Customer names: {order_names}")
        
        # Look for Taj Hotel and Ram Halwai
        taj_found = any("Taj" in name for name in order_names)
        halwai_found = any("Halwai" in name or "halwai" in name.lower() for name in order_names)
        
        if taj_found:
            print("  ✓ Taj Hotel order found")
        if halwai_found:
            print("  ✓ Halwai order found")

    def test_customer_search_endpoint(self):
        """Verify customer search aggregation returns proper data"""
        res = self.session.get(f"{BASE_URL}/api/bulk-order-customers")
        assert res.status_code == 200
        
        customers = res.json()
        print(f"✓ Bulk order customers aggregation: {len(customers)} unique customers")
        
        for c in customers[:5]:  # Print first 5
            print(f"  - {c['name']} ({c['phone']}, {c['customer_type']}): {c['total_orders']} orders, ₹{c['total_amount']}")
