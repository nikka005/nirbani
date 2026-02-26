"""
Test suite for Dairy Dispatch Module - Bulk Milk Sale to Dairy Plant
Tests: Dairy Plants, Dispatches, Slip Matching, Dairy Payments, Ledger, Profit Report, FAT Analysis
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test credentials
TEST_EMAIL = "test@test.com"
TEST_PASSWORD = "test123"


class TestAuthSetup:
    """Authentication tests - run first"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("access_token")
    
    def test_login_success(self):
        """Verify login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data


class TestDairyPlants:
    """Tests for Dairy Plant CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_plant_id(self, auth_headers):
        """Create a test plant and return its ID"""
        unique_name = f"TEST_Plant_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/dairy-plants", json={
            "name": unique_name,
            "code": "TP01",
            "address": "Test Address",
            "phone": "9876543210",
            "contact_person": "Test Person"
        }, headers=auth_headers)
        assert response.status_code == 200
        return response.json()["id"]
    
    def test_create_dairy_plant(self, auth_headers):
        """POST /api/dairy-plants - Create a new dairy plant"""
        unique_name = f"TEST_Dairy_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/dairy-plants", json={
            "name": unique_name,
            "code": "TD01",
            "address": "123 Dairy Road",
            "phone": "9999999999",
            "contact_person": "John Doe"
        }, headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["name"] == unique_name
        assert data["code"] == "TD01"
        assert data["total_milk_supplied"] == 0
        assert data["total_amount"] == 0
        assert data["balance"] == 0
        print(f"✓ Created dairy plant: {data['name']} (ID: {data['id']})")
    
    def test_get_all_dairy_plants(self, auth_headers):
        """GET /api/dairy-plants - List all dairy plants"""
        response = requests.get(f"{BASE_URL}/api/dairy-plants", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Found {len(data)} dairy plants")
    
    def test_update_dairy_plant(self, auth_headers, test_plant_id):
        """PUT /api/dairy-plants/{id} - Update dairy plant"""
        response = requests.put(f"{BASE_URL}/api/dairy-plants/{test_plant_id}", json={
            "name": "Updated Test Plant",
            "phone": "1111111111"
        }, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Test Plant"
        assert data["phone"] == "1111111111"
        print(f"✓ Updated dairy plant: {test_plant_id}")


class TestDispatches:
    """Tests for Dispatch operations"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_plant_for_dispatch(self, auth_headers):
        """Create a plant for dispatch testing"""
        unique_name = f"TEST_DispatchPlant_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/dairy-plants", json={
            "name": unique_name,
            "code": "TDP"
        }, headers=auth_headers)
        return response.json()
    
    def test_create_dispatch_basic(self, auth_headers, test_plant_for_dispatch):
        """POST /api/dispatches - Create dispatch without deductions"""
        plant_id = test_plant_for_dispatch["id"]
        response = requests.post(f"{BASE_URL}/api/dispatches", json={
            "dairy_plant_id": plant_id,
            "date": "2026-02-25",
            "tanker_number": "RJ-01-AB-1234",
            "quantity_kg": 500,
            "avg_fat": 4.5,
            "avg_snf": 8.7,
            "clr": 28,
            "rate_per_kg": 55.0,
            "deductions": [],
            "notes": "Test dispatch"
        }, headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["dairy_plant_id"] == plant_id
        assert data["quantity_kg"] == 500
        assert data["gross_amount"] == 27500.0  # 500 * 55
        assert data["net_receivable"] == 27500.0  # No deductions
        assert data["slip_matched"] == False
        print(f"✓ Created dispatch: {data['id']} - {data['quantity_kg']} KG @ ₹{data['rate_per_kg']}/KG")
        return data["id"]
    
    def test_create_dispatch_with_deductions(self, auth_headers, test_plant_for_dispatch):
        """POST /api/dispatches - Create dispatch with structured deductions"""
        plant_id = test_plant_for_dispatch["id"]
        response = requests.post(f"{BASE_URL}/api/dispatches", json={
            "dairy_plant_id": plant_id,
            "date": "2026-02-25",
            "tanker_number": "RJ-01-CD-5678",
            "quantity_kg": 1000,
            "avg_fat": 4.2,
            "avg_snf": 8.5,
            "rate_per_kg": 52.0,
            "deductions": [
                {"type": "transport", "amount": 500, "notes": "Tanker charges"},
                {"type": "quality_penalty", "amount": 200, "notes": "Low FAT"},
                {"type": "commission", "amount": 300, "notes": "Agent fee"},
                {"type": "testing_charges", "amount": 100, "notes": "Lab test"},
                {"type": "other", "amount": 50, "notes": "Misc"}
            ],
            "notes": "Test with deductions"
        }, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["gross_amount"] == 52000.0  # 1000 * 52
        assert data["total_deduction"] == 1150.0  # 500+200+300+100+50
        assert data["net_receivable"] == 50850.0  # 52000 - 1150
        assert len(data["deductions"]) == 5
        print(f"✓ Created dispatch with deductions: {data['id']} - Net: ₹{data['net_receivable']}")
        return data["id"]
    
    def test_get_dispatches_with_date_filter(self, auth_headers):
        """GET /api/dispatches - List dispatches with date filters"""
        response = requests.get(f"{BASE_URL}/api/dispatches", params={
            "start_date": "2026-02-25",
            "end_date": "2026-02-25"
        }, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Found {len(data)} dispatches for 2026-02-25")
    
    def test_delete_dispatch_and_adjust_totals(self, auth_headers, test_plant_for_dispatch):
        """DELETE /api/dispatches/{id} - Delete dispatch and verify plant totals adjust"""
        plant_id = test_plant_for_dispatch["id"]
        
        # Create a dispatch to delete
        create_resp = requests.post(f"{BASE_URL}/api/dispatches", json={
            "dairy_plant_id": plant_id,
            "date": "2026-02-26",
            "quantity_kg": 100,
            "avg_fat": 4.0,
            "avg_snf": 8.5,
            "rate_per_kg": 50.0
        }, headers=auth_headers)
        dispatch_id = create_resp.json()["id"]
        
        # Get plant totals before delete
        plant_before = requests.get(f"{BASE_URL}/api/dairy-plants/{plant_id}", headers=auth_headers).json()
        
        # Delete dispatch
        delete_resp = requests.delete(f"{BASE_URL}/api/dispatches/{dispatch_id}", headers=auth_headers)
        assert delete_resp.status_code == 200
        
        # Verify plant totals reduced
        plant_after = requests.get(f"{BASE_URL}/api/dairy-plants/{plant_id}", headers=auth_headers).json()
        assert plant_after["total_milk_supplied"] == plant_before["total_milk_supplied"] - 100
        print(f"✓ Deleted dispatch and verified plant totals adjusted")


class TestSlipMatching:
    """Tests for Slip Matching functionality"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def dispatch_for_slip_match(self, auth_headers):
        """Create plant and dispatch for slip matching"""
        # Create plant
        plant_resp = requests.post(f"{BASE_URL}/api/dairy-plants", json={
            "name": f"TEST_SlipMatchPlant_{uuid.uuid4().hex[:8]}"
        }, headers=auth_headers)
        plant_id = plant_resp.json()["id"]
        
        # Create dispatch
        dispatch_resp = requests.post(f"{BASE_URL}/api/dispatches", json={
            "dairy_plant_id": plant_id,
            "date": "2026-02-25",
            "quantity_kg": 500,
            "avg_fat": 4.5,
            "avg_snf": 8.7,
            "rate_per_kg": 55.0
        }, headers=auth_headers)
        return dispatch_resp.json()
    
    def test_match_slip_and_calculate_differences(self, auth_headers, dispatch_for_slip_match):
        """PUT /api/dispatches/{id}/slip-match - Match slip and verify calculations"""
        dispatch_id = dispatch_for_slip_match["id"]
        original_amount = dispatch_for_slip_match["net_receivable"]
        original_fat = dispatch_for_slip_match["avg_fat"]
        
        response = requests.put(f"{BASE_URL}/api/dispatches/{dispatch_id}/slip-match", json={
            "slip_fat": 4.3,  # Lower than our 4.5
            "slip_snf": 8.6,
            "slip_amount": 27000,  # Less than our 27500
            "slip_deductions": 300
        }, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["slip_matched"] == True
        assert data["slip_fat"] == 4.3
        assert data["slip_amount"] == 27000
        assert data["fat_difference"] == round(original_fat - 4.3, 2)  # 0.2
        assert data["amount_difference"] == round(original_amount - 27000, 2)  # 500
        print(f"✓ Slip matched: FAT diff = {data['fat_difference']}, Amount diff = ₹{data['amount_difference']}")


class TestDairyPayments:
    """Tests for Dairy Payment operations"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def plant_with_balance(self, auth_headers):
        """Create plant with dispatch balance"""
        # Create plant
        plant_resp = requests.post(f"{BASE_URL}/api/dairy-plants", json={
            "name": f"TEST_PaymentPlant_{uuid.uuid4().hex[:8]}"
        }, headers=auth_headers)
        plant = plant_resp.json()
        
        # Create dispatch to add balance
        requests.post(f"{BASE_URL}/api/dispatches", json={
            "dairy_plant_id": plant["id"],
            "date": "2026-02-25",
            "quantity_kg": 1000,
            "avg_fat": 4.5,
            "avg_snf": 8.7,
            "rate_per_kg": 50.0
        }, headers=auth_headers)
        
        # Get updated plant
        return requests.get(f"{BASE_URL}/api/dairy-plants/{plant['id']}", headers=auth_headers).json()
    
    def test_record_payment_and_update_balance(self, auth_headers, plant_with_balance):
        """POST /api/dairy-payments - Record payment and verify balance update"""
        plant_id = plant_with_balance["id"]
        initial_balance = plant_with_balance["balance"]
        
        response = requests.post(f"{BASE_URL}/api/dairy-payments", json={
            "dairy_plant_id": plant_id,
            "amount": 10000,
            "payment_mode": "bank",
            "reference_number": "UTR123456789",
            "notes": "Test payment"
        }, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["amount"] == 10000
        assert data["payment_mode"] == "bank"
        assert data["dairy_plant_name"] == plant_with_balance["name"]
        
        # Verify balance reduced
        updated_plant = requests.get(f"{BASE_URL}/api/dairy-plants/{plant_id}", headers=auth_headers).json()
        assert updated_plant["balance"] == initial_balance - 10000
        assert updated_plant["total_paid"] == plant_with_balance["total_paid"] + 10000
        print(f"✓ Payment recorded: ₹{data['amount']} - Balance: ₹{updated_plant['balance']}")
    
    def test_get_dairy_payments(self, auth_headers):
        """GET /api/dairy-payments - List dairy payments"""
        response = requests.get(f"{BASE_URL}/api/dairy-payments", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Found {len(data)} dairy payments")


class TestDairyLedger:
    """Tests for Dairy Ledger functionality"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_ledger_with_dispatches_and_payments(self, auth_headers):
        """GET /api/dairy-plants/{id}/ledger - Get full ledger"""
        # First get a plant
        plants_resp = requests.get(f"{BASE_URL}/api/dairy-plants", headers=auth_headers)
        plants = plants_resp.json()
        
        if not plants:
            pytest.skip("No dairy plants found to test ledger")
        
        plant_id = plants[0]["id"]
        response = requests.get(f"{BASE_URL}/api/dairy-plants/{plant_id}/ledger", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "plant" in data
        assert "dispatches" in data
        assert "payments" in data
        assert isinstance(data["dispatches"], list)
        assert isinstance(data["payments"], list)
        print(f"✓ Ledger retrieved: {len(data['dispatches'])} dispatches, {len(data['payments'])} payments")


class TestProfitReport:
    """Tests for Profit Dashboard Report"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_profit_report_structure(self, auth_headers):
        """GET /api/dairy/profit-report - Verify report structure"""
        response = requests.get(f"{BASE_URL}/api/dairy/profit-report", params={
            "start_date": "2026-02-25",
            "end_date": "2026-02-25"
        }, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required sections exist
        assert "period" in data
        assert "dispatch" in data
        assert "collection" in data
        assert "milk_tracking" in data
        assert "fat_analysis" in data
        assert "expenses" in data
        assert "profit" in data
        
        # Verify dispatch section structure
        dispatch = data["dispatch"]
        assert "total_kg" in dispatch
        assert "total_amount" in dispatch
        assert "avg_rate" in dispatch
        
        # Verify profit section
        profit = data["profit"]
        assert "gross_profit" in profit
        assert "net_profit" in profit
        assert "gross_margin_per_unit" in profit
        
        # Verify milk tracking
        mt = data["milk_tracking"]
        assert "collected_kg" in mt
        assert "dispatched_kg" in mt
        assert "difference_kg" in mt
        assert "loss_percent" in mt
        assert "alert" in mt
        
        print(f"✓ Profit report retrieved: Net Profit = ₹{profit['net_profit']}")


class TestFATAnalysis:
    """Tests for Farmer FAT Analysis Report"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_fat_analysis_structure(self, auth_headers):
        """GET /api/dairy/fat-analysis - Verify FAT analysis structure"""
        response = requests.get(f"{BASE_URL}/api/dairy/fat-analysis", params={
            "start_date": "2026-01-01",
            "end_date": "2026-02-28"
        }, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "period" in data
        assert "overall_avg_fat" in data
        assert "total_farmers" in data
        assert "quality_breakdown" in data
        assert "farmers" in data
        
        # Quality breakdown should have good, average, low
        qb = data["quality_breakdown"]
        assert "good" in qb
        assert "average" in qb
        assert "low" in qb
        
        # Farmers list should have proper structure
        if data["farmers"]:
            farmer = data["farmers"][0]
            assert "farmer_id" in farmer
            assert "farmer_name" in farmer
            assert "avg_fat" in farmer
            assert "quality" in farmer
            assert "total_quantity" in farmer
        
        print(f"✓ FAT analysis: {data['total_farmers']} farmers, Avg FAT = {data['overall_avg_fat']}%")


# Cleanup test data marker
class TestCleanup:
    """Cleanup test plants (run last)"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_verify_all_apis_accessible(self, auth_headers):
        """Final verification that all endpoints are accessible"""
        endpoints_to_verify = [
            ("GET", "/api/dairy-plants"),
            ("GET", "/api/dispatches"),
            ("GET", "/api/dairy-payments"),
            ("GET", "/api/dairy/profit-report"),
            ("GET", "/api/dairy/fat-analysis"),
        ]
        
        for method, endpoint in endpoints_to_verify:
            if method == "GET":
                resp = requests.get(f"{BASE_URL}{endpoint}", headers=auth_headers)
            assert resp.status_code == 200, f"{method} {endpoint} failed: {resp.status_code}"
            print(f"✓ {method} {endpoint} - OK")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
