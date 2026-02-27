"""
Test cases for Admin User Management Features (Iteration 7)
- Self-registration disabled (requires admin auth)
- Admin can create users
- Admin can view all users
- Admin can deactivate/activate users
- Admin can reset passwords
- Admin can delete users (except self)
- Staff cannot access user management endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthRegister:
    """Test that self-registration is disabled"""
    
    def test_register_without_auth_returns_401(self):
        """POST /api/auth/register without token should return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Unauth User",
            "email": "unauth@test.com",
            "phone": "9999999999",
            "password": "test123",
            "role": "staff"
        })
        assert response.status_code == 401
        assert "Not authenticated" in response.json().get("detail", "")
    
    def test_register_with_admin_token_succeeds(self, admin_token):
        """POST /api/auth/register with admin token should create user"""
        import time
        unique_email = f"test_user_{int(time.time())}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", 
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Test Staff",
                "email": unique_email,
                "phone": "9876500001",
                "password": "test123456",
                "role": "staff"
            })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == unique_email
        assert data["user"]["role"] == "staff"
    
    def test_register_with_staff_token_returns_403(self, staff_token):
        """POST /api/auth/register with staff token should return 403"""
        response = requests.post(f"{BASE_URL}/api/auth/register",
            headers={"Authorization": f"Bearer {staff_token}"},
            json={
                "name": "New Staff",
                "email": "newstaff_test@test.com",
                "phone": "9999999999",
                "password": "test123",
                "role": "staff"
            })
        assert response.status_code == 403
        assert "Only admin can create users" in response.json().get("detail", "")


class TestAdminUserManagement:
    """Test admin user management endpoints"""
    
    def test_get_users_admin_succeeds(self, admin_token):
        """GET /api/users with admin token should return list of users"""
        response = requests.get(f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify user fields
        user = data[0]
        assert "id" in user
        assert "name" in user
        assert "email" in user
        assert "role" in user
        assert "password" not in user  # Password should not be returned
    
    def test_get_users_staff_returns_403(self, staff_token):
        """GET /api/users with staff token should return 403"""
        response = requests.get(f"{BASE_URL}/api/users",
            headers={"Authorization": f"Bearer {staff_token}"})
        assert response.status_code == 403
        assert "Only admin can view users" in response.json().get("detail", "")
    
    def test_update_user_toggle_active(self, admin_token, test_user_id):
        """PUT /api/users/{id} should toggle is_active"""
        # Deactivate user
        response = requests.put(f"{BASE_URL}/api/users/{test_user_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_active": False})
        assert response.status_code == 200
        assert response.json()["is_active"] == False
        
        # Reactivate user
        response = requests.put(f"{BASE_URL}/api/users/{test_user_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_active": True})
        assert response.status_code == 200
        assert response.json()["is_active"] == True
    
    def test_reset_password(self, admin_token, test_user_id):
        """PUT /api/users/{id}/reset-password should reset password"""
        response = requests.put(f"{BASE_URL}/api/users/{test_user_id}/reset-password",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"password": "newpassword123"})
        assert response.status_code == 200
        assert response.json()["message"] == "Password reset successful"
    
    def test_reset_password_short_fails(self, admin_token, test_user_id):
        """PUT /api/users/{id}/reset-password with short password should fail"""
        response = requests.put(f"{BASE_URL}/api/users/{test_user_id}/reset-password",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"password": "123"})
        assert response.status_code == 400
        assert "at least 6 characters" in response.json().get("detail", "")
    
    def test_cannot_delete_self(self, admin_token, admin_user_id):
        """DELETE /api/users/{id} should not allow deleting own account"""
        response = requests.delete(f"{BASE_URL}/api/users/{admin_user_id}",
            headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 400
        assert "Cannot delete your own account" in response.json().get("detail", "")


class TestLogin:
    """Test login functionality"""
    
    def test_login_admin_succeeds(self):
        """POST /api/auth/login with admin credentials should work"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "test123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
    
    def test_login_staff_succeeds(self):
        """POST /api/auth/login with staff credentials should work"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "newstaff@dairy.com",
            "password": "staff123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "staff"
    
    def test_login_invalid_credentials_fails(self):
        """POST /api/auth/login with wrong credentials should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        assert "Invalid email or password" in response.json().get("detail", "")


# Fixtures
@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test@test.com",
        "password": "test123"
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Admin login failed")

@pytest.fixture(scope="module")
def staff_token():
    """Get staff authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "newstaff@dairy.com",
        "password": "staff123"
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Staff login failed")

@pytest.fixture(scope="module")
def admin_user_id(admin_token):
    """Get admin user ID"""
    response = requests.get(f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"})
    if response.status_code == 200:
        return response.json()["id"]
    pytest.skip("Could not get admin user ID")

@pytest.fixture(scope="module")
def test_user_id(admin_token):
    """Get a non-admin user ID for testing"""
    response = requests.get(f"{BASE_URL}/api/users",
        headers={"Authorization": f"Bearer {admin_token}"})
    if response.status_code == 200:
        users = response.json()
        for user in users:
            if user["email"] != "test@test.com" and user["email"] != "newstaff@dairy.com":
                return user["id"]
        # Create a test user if none available
        import time
        create_resp = requests.post(f"{BASE_URL}/api/auth/register",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Delete Test User",
                "email": f"deletetest_{int(time.time())}@test.com",
                "phone": "9999888877",
                "password": "test123456",
                "role": "staff"
            })
        if create_resp.status_code == 200:
            return create_resp.json()["user"]["id"]
    pytest.skip("Could not get test user ID")
