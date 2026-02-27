"""
Test Suite for Admin Panel Separation - Iteration 8
Tests: Admin login endpoint, admin-only access, session separation
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminLogin:
    """Admin login endpoint tests at POST /api/admin/login"""
    
    def test_admin_login_success(self):
        """Admin login with correct admin credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "nirbanidairy@gmal.com",
            "password": "Nirbani0056!"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == "nirbanidairy@gmal.com"
        print("✓ Admin login successful with correct credentials")
    
    def test_admin_login_rejects_staff(self):
        """Admin login should reject non-admin (staff) users"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "newstaff@dairy.com",
            "password": "staff123"
        })
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        data = response.json()
        assert "Admin access only" in str(data.get("detail", ""))
        print("✓ Admin login correctly rejects staff credentials")
    
    def test_admin_login_wrong_password(self):
        """Admin login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "nirbanidairy@gmal.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Admin login correctly rejects wrong password")
    
    def test_admin_login_nonexistent_email(self):
        """Admin login with non-existent email"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "nonexistent@dairy.com",
            "password": "anypassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Admin login correctly rejects non-existent email")


class TestUserLogin:
    """User login endpoint tests at POST /api/auth/login"""
    
    def test_staff_login_success(self):
        """Staff user can login via regular endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "newstaff@dairy.com",
            "password": "staff123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "staff"
        print("✓ Staff user login successful")
    
    def test_admin_login_via_user_endpoint(self):
        """Admin can also login via regular user endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nirbanidairy@gmal.com",
            "password": "Nirbani0056!"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "admin"
        print("✓ Admin can also login via regular endpoint")


class TestAdminOnlyEndpoints:
    """Test admin-only API access control"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        # Get admin token
        res = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "nirbanidairy@gmal.com",
            "password": "Nirbani0056!"
        })
        self.admin_token = res.json().get("access_token")
        
        # Get staff token  
        res2 = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "newstaff@dairy.com",
            "password": "staff123"
        })
        self.staff_token = res2.json().get("access_token")
    
    def test_get_users_with_admin_token(self):
        """GET /api/users succeeds with admin token"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin can view users list ({len(data)} users)")
    
    def test_get_users_with_staff_token_fails(self):
        """GET /api/users fails with staff token (403)"""
        headers = {"Authorization": f"Bearer {self.staff_token}"}
        response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Staff user correctly blocked from /api/users")
    
    def test_admin_dashboard_stats(self):
        """GET /api/dashboard/stats works with admin token"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "total_farmers" in data
        print("✓ Admin can access dashboard stats")


class TestTokenSeparation:
    """Test that admin_token and auth_token are conceptually separate"""
    
    def test_tokens_are_jwt_valid(self):
        """Both admin and user tokens are valid JWTs"""
        # Admin token
        res_admin = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "nirbanidairy@gmal.com",
            "password": "Nirbani0056!"
        })
        admin_token = res_admin.json().get("access_token")
        
        # Staff token
        res_staff = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "newstaff@dairy.com",
            "password": "staff123"
        })
        staff_token = res_staff.json().get("access_token")
        
        # Verify both tokens via /api/auth/me
        admin_me = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
        assert admin_me.status_code == 200
        assert admin_me.json()["role"] == "admin"
        
        staff_me = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {staff_token}"})
        assert staff_me.status_code == 200
        assert staff_me.json()["role"] == "staff"
        
        print("✓ Both admin and staff tokens are valid and return correct user roles")


class TestTestAdminAccount:
    """Test the test admin account (test@test.com)"""
    
    def test_test_admin_login(self):
        """Test admin account login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "test123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["user"]["role"] == "admin"
        print("✓ Test admin account login successful")
    
    def test_test_admin_via_admin_endpoint(self):
        """Test admin via /api/admin/login"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "test@test.com",
            "password": "test123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Test admin can use admin login endpoint")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
