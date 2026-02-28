import requests
import sys
from datetime import datetime
import json
import uuid

class NirbaniDairyTester:
    def __init__(self, base_url="https://farm-billing-hub.preview.emergentagent.com"):
        self.base_url = base_url.rstrip('/')
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.farmer_id = None
        self.collection_id = None
        self.payment_id = None
        self.rate_chart_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        return self.run_test("Health Check", "GET", "/", 200)

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime("%H%M%S")
        register_data = {
            "name": f"Test User {timestamp}",
            "email": f"test_{timestamp}@dairy.com", 
            "phone": f"987654{timestamp[-4:]}",
            "password": "TestPass123!",
            "role": "staff"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST", 
            "/auth/register", 
            200, 
            data=register_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response['user']
            print(f"   📝 Registered user: {self.user_data['name']}")
            return True
        return False

    def test_user_login(self):
        """Test user login with registered user"""
        if not self.user_data:
            print("❌ No user data available for login test")
            return False
            
        login_data = {
            "email": self.user_data['email'],
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "/auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   📝 Login successful for: {response['user']['name']}")
            return True
        return False

    def test_get_current_user(self):
        """Test getting current user info"""
        return self.run_test("Get Current User", "GET", "/auth/me", 200)[0]

    def test_create_farmer(self):
        """Test creating a new farmer"""
        timestamp = datetime.now().strftime("%H%M%S")
        farmer_data = {
            "name": f"Farmer {timestamp}",
            "phone": f"987654{timestamp[-4:]}",
            "village": f"Village {timestamp}",
            "address": f"Test Address {timestamp}",
            "bank_account": "1234567890123456",
            "ifsc_code": "SBIN0001234",
            "aadhar_number": "1234 5678 9012"
        }
        
        success, response = self.run_test(
            "Create Farmer",
            "POST",
            "/farmers",
            200,
            data=farmer_data
        )
        
        if success and 'id' in response:
            self.farmer_id = response['id']
            print(f"   📝 Created farmer: {response['name']} (ID: {self.farmer_id})")
            return True
        return False

    def test_get_farmers(self):
        """Test getting all farmers"""
        return self.run_test("Get All Farmers", "GET", "/farmers", 200)[0]

    def test_get_farmer_by_id(self):
        """Test getting specific farmer"""
        if not self.farmer_id:
            print("❌ No farmer ID available")
            return False
        return self.run_test("Get Farmer by ID", "GET", f"/farmers/{self.farmer_id}", 200)[0]

    def test_create_milk_collection(self):
        """Test creating milk collection entry"""
        if not self.farmer_id:
            print("❌ No farmer ID available for collection test")
            return False
            
        collection_data = {
            "farmer_id": self.farmer_id,
            "shift": "morning",
            "quantity": 10.5,
            "fat": 4.2,
            "snf": 8.7
        }
        
        success, response = self.run_test(
            "Create Milk Collection",
            "POST",
            "/collections",
            200,
            data=collection_data
        )
        
        if success and 'id' in response:
            self.collection_id = response['id']
            print(f"   📝 Created collection: {response['quantity']}L @ {response['rate']}/L = ₹{response['amount']}")
            return True
        return False

    def test_get_collections(self):
        """Test getting all collections"""
        return self.run_test("Get All Collections", "GET", "/collections", 200)[0]

    def test_get_today_collections(self):
        """Test getting today's collections"""
        return self.run_test("Get Today Collections", "GET", "/collections/today", 200)[0]

    def test_create_payment(self):
        """Test creating payment"""
        if not self.farmer_id:
            print("❌ No farmer ID available for payment test")
            return False
            
        payment_data = {
            "farmer_id": self.farmer_id,
            "amount": 500.0,
            "payment_mode": "cash",
            "notes": "Test payment"
        }
        
        success, response = self.run_test(
            "Create Payment",
            "POST",
            "/payments",
            200,
            data=payment_data
        )
        
        if success and 'id' in response:
            self.payment_id = response['id']
            print(f"   📝 Created payment: ₹{response['amount']} via {response['payment_mode']}")
            return True
        return False

    def test_get_payments(self):
        """Test getting all payments"""
        return self.run_test("Get All Payments", "GET", "/payments", 200)[0]

    def test_create_rate_chart(self):
        """Test creating rate chart"""
        rate_chart_data = {
            "name": "Test Rate Chart",
            "entries": [
                {"fat": 3.0, "snf": 8.0, "rate": 25.0},
                {"fat": 4.0, "snf": 8.5, "rate": 30.0},
                {"fat": 5.0, "snf": 9.0, "rate": 35.0}
            ],
            "is_default": True
        }
        
        success, response = self.run_test(
            "Create Rate Chart",
            "POST",
            "/rate-charts",
            200,
            data=rate_chart_data
        )
        
        if success and 'id' in response:
            self.rate_chart_id = response['id']
            print(f"   📝 Created rate chart: {response['name']} with {len(response['entries'])} entries")
            return True
        return False

    def test_get_rate_charts(self):
        """Test getting all rate charts"""
        return self.run_test("Get Rate Charts", "GET", "/rate-charts", 200)[0]

    def test_get_default_rate_chart(self):
        """Test getting default rate chart"""
        return self.run_test("Get Default Rate Chart", "GET", "/rate-charts/default", 200)[0]

    def test_calculate_rate(self):
        """Test rate calculation"""
        params = {"fat": 4.0, "snf": 8.5}
        return self.run_test("Calculate Rate", "POST", "/rate-charts/calculate-rate", 200, params=params)[0]

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        return self.run_test("Dashboard Stats", "GET", "/dashboard/stats", 200)[0]

    def test_weekly_stats(self):
        """Test weekly statistics"""
        return self.run_test("Weekly Stats", "GET", "/dashboard/weekly-stats", 200)[0]

    def test_daily_report(self):
        """Test daily report"""
        return self.run_test("Daily Report", "GET", "/reports/daily", 200)[0]

    def test_farmer_ledger(self):
        """Test farmer ledger"""
        if not self.farmer_id:
            print("❌ No farmer ID available for ledger test")
            return False
        return self.run_test("Farmer Ledger", "GET", f"/farmers/{self.farmer_id}/ledger", 200)[0]

    def test_farmer_report(self):
        """Test farmer report"""
        if not self.farmer_id:
            print("❌ No farmer ID available for report test")
            return False
        return self.run_test("Farmer Report", "GET", f"/reports/farmer/{self.farmer_id}", 200)[0]

def main():
    print("🥛 Starting Nirbani Dairy Management System Tests")
    print("=" * 60)
    
    tester = NirbaniDairyTester()
    
    # Test sequence
    tests = [
        # Basic health
        ("Health Check", tester.test_health_check),
        
        # Authentication
        ("User Registration", tester.test_user_registration),
        ("User Login", tester.test_user_login), 
        ("Get Current User", tester.test_get_current_user),
        
        # Farmer Management
        ("Create Farmer", tester.test_create_farmer),
        ("Get Farmers", tester.test_get_farmers),
        ("Get Farmer by ID", tester.test_get_farmer_by_id),
        
        # Rate Chart
        ("Create Rate Chart", tester.test_create_rate_chart),
        ("Get Rate Charts", tester.test_get_rate_charts),
        ("Get Default Rate Chart", tester.test_get_default_rate_chart),
        ("Calculate Rate", tester.test_calculate_rate),
        
        # Milk Collection
        ("Create Collection", tester.test_create_milk_collection),
        ("Get Collections", tester.test_get_collections),
        ("Get Today Collections", tester.test_get_today_collections),
        
        # Payments
        ("Create Payment", tester.test_create_payment),
        ("Get Payments", tester.test_get_payments),
        
        # Reports & Analytics
        ("Dashboard Stats", tester.test_dashboard_stats),
        ("Weekly Stats", tester.test_weekly_stats),
        ("Daily Report", tester.test_daily_report),
        ("Farmer Ledger", tester.test_farmer_ledger),
        ("Farmer Report", tester.test_farmer_report),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            if not result:
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(f"{test_name} (Exception)")
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    print(f"✅ Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed Tests ({len(failed_tests)}):")
        for test in failed_tests:
            print(f"   • {test}")
    else:
        print("\n🎉 All tests passed!")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())