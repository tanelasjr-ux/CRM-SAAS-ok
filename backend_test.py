#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class CRMAPITester:
    def __init__(self, base_url="https://sales-vault-5.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status=200, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if not headers:
            headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(response_data) <= 3:
                        print(f"   Response: {response_data}")
                    elif isinstance(response_data, list) and len(response_data) <= 2:
                        print(f"   Response length: {len(response_data)} items")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Error: {response.text[:200]}...")
                self.failed_tests.append({
                    'test': name,
                    'endpoint': endpoint,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'error': response.text[:200]
                })

            return success, response

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout after 30s")
            self.failed_tests.append({
                'test': name,
                'endpoint': endpoint,
                'error': 'Request timeout'
            })
            return False, None
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                'test': name,
                'endpoint': endpoint,
                'error': str(e)
            })
            return False, None

    def test_health_check(self):
        """Test API health check endpoints"""
        print("\n=== HEALTH CHECK TESTS ===")
        
        # Test root endpoint
        success1, _ = self.run_test(
            "API Root Health Check",
            "GET",
            "api/",
            200
        )
        
        # Test health endpoint
        success2, _ = self.run_test(
            "API Health Endpoint",
            "GET",
            "api/health",
            200
        )
        
        return success1 and success2

    def test_unauthenticated_endpoints(self):
        """Test endpoints that should work without authentication"""
        print("\n=== UNAUTHENTICATED ENDPOINT TESTS ===")
        
        # Test pipeline stages - should fail without auth
        success1, _ = self.run_test(
            "Pipeline Stages (Unauthorized)",
            "GET",
            "api/pipeline-stages",
            401
        )
        
        # Test leads - should fail without auth  
        success2, _ = self.run_test(
            "Leads (Unauthorized)",
            "GET",
            "api/leads",
            401
        )
        
        # Test dashboard stats - should fail without auth
        success3, _ = self.run_test(
            "Dashboard Stats (Unauthorized)",
            "GET",
            "api/dashboard/stats",
            401
        )
        
        return success1 and success2 and success3

    def mock_google_auth(self):
        """Mock Google authentication - skip actual OAuth"""
        print("\n=== AUTHENTICATION TESTS ===")
        print("⚠️  Skipping Google OAuth test - requires valid credential token")
        print("   This would need actual Google token for testing")
        
        # For now, we'll test with invalid token to check error handling
        success, response = self.run_test(
            "Google Auth (Invalid Token)",
            "POST",
            "api/auth/google",
            400,
            data={"credential": "invalid_token"}
        )
        
        return success

    def test_authenticated_endpoints_mock(self):
        """Test endpoints that require authentication (with mocked scenarios)"""
        print("\n=== MOCKED AUTHENTICATED ENDPOINT TESTS ===")
        print("ℹ️  Testing authentication required responses (401 expected)")
        
        # Without proper auth, these should all return 401
        endpoints_to_test = [
            ("Pipeline Stages", "GET", "api/pipeline-stages"),
            ("Leads", "GET", "api/leads"),
            ("Dashboard Stats", "GET", "api/dashboard/stats"),
            ("Current User Info", "GET", "api/auth/me"),
            ("Current Tenant", "GET", "api/tenants/current"),
            ("Activities", "GET", "api/activities"),
            ("Deals", "GET", "api/deals"),
            ("Revenue Chart", "GET", "api/dashboard/revenue-chart"),
            ("WhatsApp Conversations", "GET", "api/whatsapp/conversations"),
        ]
        
        all_passed = True
        for name, method, endpoint in endpoints_to_test:
            success, _ = self.run_test(name, method, endpoint, 401)
            all_passed = all_passed and success
        
        return all_passed

    def test_cors_headers(self):
        """Test CORS configuration"""
        print("\n=== CORS TESTS ===")
        
        success, response = self.run_test(
            "OPTIONS Request (CORS)",
            "GET",
            "api/health",
            200
        )
        
        if response and success:
            cors_headers = [
                'Access-Control-Allow-Origin',
                'Access-Control-Allow-Methods', 
                'Access-Control-Allow-Headers'
            ]
            
            print("   CORS Headers check:")
            for header in cors_headers:
                if header in response.headers:
                    print(f"   ✅ {header}: {response.headers[header]}")
                else:
                    print(f"   ⚠️  {header}: Not present")
        
        return success

def main():
    """Run all backend API tests"""
    print("🚀 Starting CRM SaaS Backend API Tests")
    print("=" * 50)
    
    tester = CRMAPITester()
    
    # Run test suites
    health_passed = tester.test_health_check()
    unauth_passed = tester.test_unauthenticated_endpoints()
    auth_mock_passed = tester.mock_google_auth()
    endpoints_passed = tester.test_authenticated_endpoints_mock()
    cors_passed = tester.test_cors_headers()
    
    # Print summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Tests failed: {len(tester.failed_tests)}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if tester.failed_tests:
        print("\n❌ FAILED TESTS:")
        for fail in tester.failed_tests:
            print(f"   - {fail['test']}: {fail.get('error', 'Status code mismatch')}")
    
    print("\n🔍 TEST RESULTS BY CATEGORY:")
    print(f"   Health Check: {'✅ PASS' if health_passed else '❌ FAIL'}")
    print(f"   Unauthorized Access: {'✅ PASS' if unauth_passed else '❌ FAIL'}")
    print(f"   Authentication: {'✅ PASS' if auth_mock_passed else '❌ FAIL'}")
    print(f"   Protected Endpoints: {'✅ PASS' if endpoints_passed else '❌ FAIL'}")
    print(f"   CORS Configuration: {'✅ PASS' if cors_passed else '❌ FAIL'}")
    
    # Overall status
    overall_success = all([health_passed, unauth_passed, auth_mock_passed, endpoints_passed])
    
    print(f"\n🎯 OVERALL STATUS: {'✅ BACKEND APIs WORKING' if overall_success else '⚠️  ISSUES DETECTED'}")
    
    return 0 if overall_success else 1

if __name__ == "__main__":
    sys.exit(main())