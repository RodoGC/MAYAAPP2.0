#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Maay App
Tests all authentication, lesson, and utility endpoints
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend .env
BASE_URL = "https://maya-learn.preview.emergentagent.com/api"

class MaayAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.auth_token = None
        self.test_user_email = "maria.gonzalez@test.com"
        self.test_user_password = "MayaLearner2024!"
        self.test_username = "MariaG"
        self.results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def test_signup(self):
        """Test user signup endpoint"""
        url = f"{self.base_url}/auth/signup"
        payload = {
            "email": self.test_user_email,
            "password": self.test_user_password,
            "username": self.test_username
        }
        
        try:
            response = requests.post(url, json=payload, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "token_type" in data:
                    self.auth_token = data["access_token"]
                    self.log_result("POST /api/auth/signup", True, "User signup successful")
                    return True
                else:
                    self.log_result("POST /api/auth/signup", False, "Missing token in response", data)
                    return False
            elif response.status_code == 400:
                # User might already exist, try login instead
                self.log_result("POST /api/auth/signup", True, "User already exists (expected)", response.json())
                return self.test_login()
            else:
                self.log_result("POST /api/auth/signup", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("POST /api/auth/signup", False, f"Request failed: {str(e)}")
            return False
    
    def test_login(self):
        """Test user login endpoint"""
        url = f"{self.base_url}/auth/login"
        payload = {
            "email": self.test_user_email,
            "password": self.test_user_password
        }
        
        try:
            response = requests.post(url, json=payload, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "token_type" in data:
                    self.auth_token = data["access_token"]
                    self.log_result("POST /api/auth/login", True, "User login successful")
                    return True
                else:
                    self.log_result("POST /api/auth/login", False, "Missing token in response", data)
                    return False
            else:
                self.log_result("POST /api/auth/login", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("POST /api/auth/login", False, f"Request failed: {str(e)}")
            return False
    
    def test_get_me(self):
        """Test get current user endpoint"""
        if not self.auth_token:
            self.log_result("GET /api/auth/me", False, "No auth token available")
            return False
            
        url = f"{self.base_url}/auth/me"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "email", "username", "xp", "lives", "streak", "level"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("GET /api/auth/me", True, f"User info retrieved: {data['username']}")
                    return True
                else:
                    self.log_result("GET /api/auth/me", False, f"Missing fields: {missing_fields}", data)
                    return False
            else:
                self.log_result("GET /api/auth/me", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("GET /api/auth/me", False, f"Request failed: {str(e)}")
            return False
    
    def test_get_lessons(self):
        """Test get all lessons endpoint"""
        if not self.auth_token:
            self.log_result("GET /api/lessons", False, "No auth token available")
            return False
            
        url = f"{self.base_url}/lessons"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) == 5:  # Should have 5 units
                    unit_titles = [unit.get("title", "") for unit in data]
                    expected_titles = ["Saludos", "Números", "Colores", "Familia", "Verbos Comunes"]
                    
                    total_lessons = sum(len(unit.get("lessons", [])) for unit in data)
                    if total_lessons == 20:  # Should have 20 lessons total
                        self.log_result("GET /api/lessons", True, f"Retrieved 5 units with 20 lessons total")
                        return True
                    else:
                        self.log_result("GET /api/lessons", False, f"Expected 20 lessons, got {total_lessons}")
                        return False
                else:
                    self.log_result("GET /api/lessons", False, f"Expected 5 units, got {len(data) if isinstance(data, list) else 'non-list'}", data)
                    return False
            else:
                self.log_result("GET /api/lessons", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("GET /api/lessons", False, f"Request failed: {str(e)}")
            return False
    
    def test_get_specific_lesson(self, lesson_id="u1l1"):
        """Test get specific lesson endpoint"""
        if not self.auth_token:
            self.log_result(f"GET /api/lessons/{lesson_id}", False, "No auth token available")
            return False
            
        url = f"{self.base_url}/lessons/{lesson_id}"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "unit", "title", "description", "exercises"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    exercises = data.get("exercises", [])
                    if len(exercises) == 3:  # Each lesson should have 3 exercises
                        self.log_result(f"GET /api/lessons/{lesson_id}", True, f"Lesson retrieved with 3 exercises")
                        return True
                    else:
                        self.log_result(f"GET /api/lessons/{lesson_id}", False, f"Expected 3 exercises, got {len(exercises)}")
                        return False
                else:
                    self.log_result(f"GET /api/lessons/{lesson_id}", False, f"Missing fields: {missing_fields}", data)
                    return False
            else:
                self.log_result(f"GET /api/lessons/{lesson_id}", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result(f"GET /api/lessons/{lesson_id}", False, f"Request failed: {str(e)}")
            return False
    
    def test_complete_lesson(self, lesson_id="u1l1"):
        """Test lesson completion endpoint"""
        if not self.auth_token:
            self.log_result(f"POST /api/lessons/{lesson_id}/complete", False, "No auth token available")
            return False
            
        url = f"{self.base_url}/lessons/{lesson_id}/complete"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        payload = {
            "lesson_id": lesson_id,
            "score": 85,
            "xp_earned": 10
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["success", "xp_earned", "total_xp", "level"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields and data.get("success"):
                    self.log_result(f"POST /api/lessons/{lesson_id}/complete", True, f"Lesson completed, XP: {data['total_xp']}")
                    return True
                else:
                    self.log_result(f"POST /api/lessons/{lesson_id}/complete", False, f"Missing fields or failed: {missing_fields}", data)
                    return False
            else:
                self.log_result(f"POST /api/lessons/{lesson_id}/complete", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result(f"POST /api/lessons/{lesson_id}/complete", False, f"Request failed: {str(e)}")
            return False
    
    def test_lose_life(self):
        """Test lose life endpoint"""
        if not self.auth_token:
            self.log_result("POST /api/lessons/lose-life", False, "No auth token available")
            return False
            
        url = f"{self.base_url}/lessons/lose-life"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = requests.post(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "success" in data and "lives" in data:
                    self.log_result("POST /api/lessons/lose-life", True, f"Life lost, remaining: {data['lives']}")
                    return True
                else:
                    self.log_result("POST /api/lessons/lose-life", False, "Missing success or lives field", data)
                    return False
            else:
                self.log_result("POST /api/lessons/lose-life", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("POST /api/lessons/lose-life", False, f"Request failed: {str(e)}")
            return False
    
    def test_review_lesson(self, lesson_id="u1l1"):
        """Test review lesson endpoint"""
        if not self.auth_token:
            self.log_result("POST /api/lessons/review", False, "No auth token available")
            return False
            
        url = f"{self.base_url}/lessons/review"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        payload = {"lesson_id": lesson_id}
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "success" in data and "lives" in data:
                    self.log_result("POST /api/lessons/review", True, f"Lesson reviewed, lives: {data['lives']}")
                    return True
                else:
                    self.log_result("POST /api/lessons/review", False, "Missing success or lives field", data)
                    return False
            elif response.status_code == 400:
                # Expected if lives are full or lesson not completed
                self.log_result("POST /api/lessons/review", True, "Review blocked (expected - lives full or lesson not completed)")
                return True
            else:
                self.log_result("POST /api/lessons/review", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("POST /api/lessons/review", False, f"Request failed: {str(e)}")
            return False
    
    def test_get_tips(self, unit=1):
        """Test get unit tips endpoint"""
        if not self.auth_token:
            self.log_result(f"GET /api/tips/{unit}", False, "No auth token available")
            return False
            
        url = f"{self.base_url}/tips/{unit}"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["title", "grammar", "pronunciation", "vocabulary"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result(f"GET /api/tips/{unit}", True, f"Tips retrieved for unit {unit}")
                    return True
                else:
                    self.log_result(f"GET /api/tips/{unit}", False, f"Missing fields: {missing_fields}", data)
                    return False
            else:
                self.log_result(f"GET /api/tips/{unit}", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result(f"GET /api/tips/{unit}", False, f"Request failed: {str(e)}")
            return False
    
    def test_get_dictionary(self):
        """Test get dictionary endpoint"""
        if not self.auth_token:
            self.log_result("GET /api/dictionary", False, "No auth token available")
            return False
            
        url = f"{self.base_url}/dictionary"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) >= 40:  # Should have 40+ entries
                    self.log_result("GET /api/dictionary", True, f"Dictionary retrieved with {len(data)} entries")
                    return True
                else:
                    self.log_result("GET /api/dictionary", False, f"Expected 40+ entries, got {len(data) if isinstance(data, list) else 'non-list'}")
                    return False
            else:
                self.log_result("GET /api/dictionary", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("GET /api/dictionary", False, f"Request failed: {str(e)}")
            return False
    
    def test_search_dictionary(self, search_term="Hola"):
        """Test dictionary search functionality"""
        if not self.auth_token:
            self.log_result(f"GET /api/dictionary?search={search_term}", False, "No auth token available")
            return False
            
        url = f"{self.base_url}/dictionary?search={search_term}"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    # Check if search results contain the search term
                    found_match = any(
                        search_term.lower() in entry.get("maya", "").lower() or 
                        search_term.lower() in entry.get("spanish", "").lower()
                        for entry in data
                    )
                    if found_match:
                        self.log_result(f"GET /api/dictionary?search={search_term}", True, f"Search returned {len(data)} matching entries")
                        return True
                    else:
                        self.log_result(f"GET /api/dictionary?search={search_term}", False, f"No matching entries found for '{search_term}'")
                        return False
                else:
                    self.log_result(f"GET /api/dictionary?search={search_term}", False, "Response is not a list")
                    return False
            else:
                self.log_result(f"GET /api/dictionary?search={search_term}", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result(f"GET /api/dictionary?search={search_term}", False, f"Request failed: {str(e)}")
            return False
    
    def test_get_user_stats(self):
        """Test get user statistics endpoint"""
        if not self.auth_token:
            self.log_result("GET /api/user/stats", False, "No auth token available")
            return False
            
        url = f"{self.base_url}/user/stats"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["username", "xp", "level", "lives", "streak", "lessons_completed", "total_lessons", "progress_percentage"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("GET /api/user/stats", True, f"Stats retrieved: {data['lessons_completed']}/{data['total_lessons']} lessons, {data['xp']} XP")
                    return True
                else:
                    self.log_result("GET /api/user/stats", False, f"Missing fields: {missing_fields}", data)
                    return False
            else:
                self.log_result("GET /api/user/stats", False, f"HTTP {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("GET /api/user/stats", False, f"Request failed: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all API tests in sequence"""
        print(f"🚀 Starting Maay App Backend API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Authentication flow
        print("\n🔐 AUTHENTICATION TESTS")
        auth_success = self.test_signup()
        if not auth_success:
            auth_success = self.test_login()
        
        if auth_success:
            self.test_get_me()
        
        # Lesson endpoints
        print("\n📚 LESSON TESTS")
        self.test_get_lessons()
        self.test_get_specific_lesson("u1l1")
        self.test_complete_lesson("u1l1")
        self.test_lose_life()
        self.test_review_lesson("u1l1")
        
        # Other endpoints
        print("\n🔧 UTILITY TESTS")
        self.test_get_tips(1)
        self.test_get_dictionary()
        self.test_search_dictionary("Hola")
        self.test_get_user_stats()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.results if "✅ PASS" in r["status"])
        failed = sum(1 for r in self.results if "❌ FAIL" in r["status"])
        total = len(self.results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.results:
                if "❌ FAIL" in result["status"]:
                    print(f"  - {result['test']}: {result['message']}")
        
        return failed == 0

if __name__ == "__main__":
    tester = MaayAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)