#!/usr/bin/env python3
"""
Real-world UI Feature Testing for TestDriver Proxy
Tests all endpoints with actual tasks and interactions
"""

import asyncio
import httpx
import json
import sys
from typing import Dict, List

# Server configuration
BASE_URL = "http://localhost:8000"
ZAI_API_KEY = "665b963943b647dc9501dff942afb877.A47LrMc7sgGjyfBJ"

class UIFeatureTester:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=60.0)
        self.results = []
        
    async def log_result(self, test_name: str, success: bool, details: str):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"\n{status} | {test_name}")
        print(f"  Details: {details}")
        self.results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
    
    async def test_health_check(self):
        """Test 1: Health Check Endpoint"""
        try:
            response = await self.client.get(f"{BASE_URL}/health")
            success = response.status_code == 200 and response.json().get("status") == "healthy"
            await self.log_result(
                "Health Check Endpoint",
                success,
                f"Status: {response.status_code}, Body: {response.json()}"
            )
        except Exception as e:
            await self.log_result("Health Check Endpoint", False, str(e))
    
    async def test_list_models(self):
        """Test 2: List Available Models"""
        try:
            response = await self.client.get(f"{BASE_URL}/v1/models")
            data = response.json()
            models = [m["id"] for m in data.get("data", [])]
            success = "glm-4.5" in models and "glm-4.5v" in models
            await self.log_result(
                "List Models Endpoint",
                success,
                f"Found models: {models}"
            )
        except Exception as e:
            await self.log_result("List Models Endpoint", False, str(e))
    
    async def test_simple_question_answer(self):
        """Test 3: Simple Question-Answer Task"""
        try:
            request = {
                "model": "glm-4.5",
                "messages": [
                    {"role": "user", "content": "What is the capital of France? Answer in one word."}
                ],
                "max_tokens": 50
            }
            response = await self.client.post(
                f"{BASE_URL}/v1/chat/completions",
                json=request
            )
            data = response.json()
            answer = data["choices"][0]["message"]["content"]
            success = "Paris" in answer
            await self.log_result(
                "Simple Q&A Task",
                success,
                f"Question: Capital of France | Answer: {answer}"
            )
        except Exception as e:
            await self.log_result("Simple Q&A Task", False, str(e))
    
    async def test_math_calculation(self):
        """Test 4: Math Calculation Task"""
        try:
            request = {
                "model": "glm-4.5",
                "messages": [
                    {"role": "system", "content": "You are a math calculator. Only provide the numeric answer."},
                    {"role": "user", "content": "Calculate: 1234 + 5678 = ?"}
                ],
                "max_tokens": 50
            }
            response = await self.client.post(
                f"{BASE_URL}/v1/chat/completions",
                json=request
            )
            data = response.json()
            answer = data["choices"][0]["message"]["content"]
            success = "6912" in answer
            await self.log_result(
                "Math Calculation Task",
                success,
                f"Problem: 1234 + 5678 | Answer: {answer}"
            )
        except Exception as e:
            await self.log_result("Math Calculation Task", False, str(e))
    
    async def test_code_generation(self):
        """Test 5: Code Generation Task"""
        try:
            request = {
                "model": "glm-4.5",
                "messages": [
                    {"role": "user", "content": "Write a Python function to calculate factorial of a number. Only provide the code."}
                ],
                "max_tokens": 200
            }
            response = await self.client.post(
                f"{BASE_URL}/v1/chat/completions",
                json=request
            )
            data = response.json()
            code = data["choices"][0]["message"]["content"]
            success = "def" in code and "factorial" in code.lower()
            await self.log_result(
                "Code Generation Task",
                success,
                f"Generated code contains function definition: {success}"
            )
        except Exception as e:
            await self.log_result("Code Generation Task", False, str(e))
    
    async def test_conversation_context(self):
        """Test 6: Multi-turn Conversation with Context"""
        try:
            # Turn 1
            request1 = {
                "model": "glm-4.5",
                "messages": [
                    {"role": "user", "content": "My favorite color is blue."}
                ],
                "max_tokens": 50
            }
            response1 = await self.client.post(
                f"{BASE_URL}/v1/chat/completions",
                json=request1
            )
            data1 = response1.json()
            reply1 = data1["choices"][0]["message"]["content"]
            
            # Turn 2 - Test context
            request2 = {
                "model": "glm-4.5",
                "messages": [
                    {"role": "user", "content": "My favorite color is blue."},
                    {"role": "assistant", "content": reply1},
                    {"role": "user", "content": "What did I just tell you?"}
                ],
                "max_tokens": 50
            }
            response2 = await self.client.post(
                f"{BASE_URL}/v1/chat/completions",
                json=request2
            )
            data2 = response2.json()
            reply2 = data2["choices"][0]["message"]["content"]
            
            success = "blue" in reply2.lower()
            await self.log_result(
                "Conversation Context Memory",
                success,
                f"Remembered context: {success} | Reply: {reply2[:100]}"
            )
        except Exception as e:
            await self.log_result("Conversation Context Memory", False, str(e))
    
    async def test_streaming_response(self):
        """Test 7: Streaming Response"""
        try:
            request = {
                "model": "glm-4.5",
                "messages": [
                    {"role": "user", "content": "Count from 1 to 5 slowly."}
                ],
                "max_tokens": 100,
                "stream": True
            }
            
            chunks = []
            async with self.client.stream(
                "POST",
                f"{BASE_URL}/v1/chat/completions",
                json=request
            ) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data.strip() != "[DONE]":
                            try:
                                chunk = json.loads(data)
                                chunks.append(chunk)
                            except:
                                pass
            
            success = len(chunks) > 0
            content_chunks = [c for c in chunks if c.get("choices", [{}])[0].get("delta", {}).get("content")]
            await self.log_result(
                "Streaming Response",
                success,
                f"Received {len(chunks)} chunks, {len(content_chunks)} with content"
            )
        except Exception as e:
            await self.log_result("Streaming Response", False, str(e))
    
    async def test_vision_model_text(self):
        """Test 8: Vision Model with Text"""
        try:
            request = {
                "model": "glm-4.5V",
                "messages": [
                    {"role": "user", "content": "Describe what a rainbow looks like."}
                ],
                "max_tokens": 150
            }
            response = await self.client.post(
                f"{BASE_URL}/v1/chat/completions",
                json=request
            )
            data = response.json()
            description = data["choices"][0]["message"]["content"]
            success = len(description) > 50 and "color" in description.lower()
            await self.log_result(
                "Vision Model (Text)",
                success,
                f"Description length: {len(description)} chars"
            )
        except Exception as e:
            await self.log_result("Vision Model (Text)", False, str(e))
    
    async def test_temperature_variation(self):
        """Test 9: Temperature Parameter Effect"""
        try:
            # Low temperature (more deterministic)
            request_low = {
                "model": "glm-4.5",
                "messages": [
                    {"role": "user", "content": "Say 'hello' in 5 different languages."}
                ],
                "temperature": 0.1,
                "max_tokens": 100
            }
            response_low = await self.client.post(
                f"{BASE_URL}/v1/chat/completions",
                json=request_low
            )
            
            # High temperature (more creative)
            request_high = {
                "model": "glm-4.5",
                "messages": [
                    {"role": "user", "content": "Say 'hello' in 5 different languages."}
                ],
                "temperature": 0.9,
                "max_tokens": 100
            }
            response_high = await self.client.post(
                f"{BASE_URL}/v1/chat/completions",
                json=request_high
            )
            
            success = response_low.status_code == 200 and response_high.status_code == 200
            await self.log_result(
                "Temperature Parameter",
                success,
                f"Low temp (0.1): {response_low.status_code}, High temp (0.9): {response_high.status_code}"
            )
        except Exception as e:
            await self.log_result("Temperature Parameter", False, str(e))
    
    async def test_token_usage_tracking(self):
        """Test 10: Token Usage Tracking"""
        try:
            request = {
                "model": "glm-4.5",
                "messages": [
                    {"role": "user", "content": "Write a short poem about coding."}
                ],
                "max_tokens": 100
            }
            response = await self.client.post(
                f"{BASE_URL}/v1/chat/completions",
                json=request
            )
            data = response.json()
            usage = data.get("usage", {})
            
            has_all_fields = all(k in usage for k in ["prompt_tokens", "completion_tokens", "total_tokens"])
            success = has_all_fields and usage["total_tokens"] > 0
            await self.log_result(
                "Token Usage Tracking",
                success,
                f"Usage: {usage}"
            )
        except Exception as e:
            await self.log_result("Token Usage Tracking", False, str(e))
    
    async def test_error_handling_invalid_model(self):
        """Test 11: Error Handling - Invalid Model"""
        try:
            request = {
                "model": "invalid-model-999",
                "messages": [
                    {"role": "user", "content": "Test"}
                ]
            }
            response = await self.client.post(
                f"{BASE_URL}/v1/chat/completions",
                json=request
            )
            success = response.status_code >= 400
            await self.log_result(
                "Error Handling (Invalid Model)",
                success,
                f"Status: {response.status_code}, Response: {response.json()}"
            )
        except Exception as e:
            await self.log_result("Error Handling (Invalid Model)", False, str(e))
    
    async def test_system_prompt_behavior(self):
        """Test 12: System Prompt Influences Behavior"""
        try:
            request = {
                "model": "glm-4.5",
                "messages": [
                    {"role": "system", "content": "You are a pirate. Always talk like a pirate."},
                    {"role": "user", "content": "Tell me about the weather."}
                ],
                "max_tokens": 100
            }
            response = await self.client.post(
                f"{BASE_URL}/v1/chat/completions",
                json=request
            )
            data = response.json()
            reply = data["choices"][0]["message"]["content"].lower()
            
            # Check for pirate-like language
            pirate_words = ["arr", "matey", "ahoy", "ship", "sea", "captain", "ye"]
            success = any(word in reply for word in pirate_words)
            await self.log_result(
                "System Prompt Behavior",
                success,
                f"Contains pirate language: {success} | Reply: {reply[:100]}"
            )
        except Exception as e:
            await self.log_result("System Prompt Behavior", False, str(e))
    
    async def run_all_tests(self):
        """Run all UI feature tests"""
        print("=" * 80)
        print("🚀 TestDriver Proxy - Real-World UI Feature Testing")
        print("=" * 80)
        
        tests = [
            self.test_health_check,
            self.test_list_models,
            self.test_simple_question_answer,
            self.test_math_calculation,
            self.test_code_generation,
            self.test_conversation_context,
            self.test_streaming_response,
            self.test_vision_model_text,
            self.test_temperature_variation,
            self.test_token_usage_tracking,
            self.test_error_handling_invalid_model,
            self.test_system_prompt_behavior,
        ]
        
        for test in tests:
            await test()
            await asyncio.sleep(1)  # Rate limiting
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        passed = sum(1 for r in self.results if r["success"])
        total = len(self.results)
        pass_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"\nTotal Tests: {total}")
        print(f"Passed: {passed} ✅")
        print(f"Failed: {total - passed} ❌")
        print(f"Pass Rate: {pass_rate:.1f}%")
        
        if pass_rate == 100:
            print("\n🎉 ALL TESTS PASSED! System is fully functional!")
        elif pass_rate >= 80:
            print("\n✅ Most tests passed! System is operational with minor issues.")
        else:
            print("\n⚠️ Several tests failed. System needs attention.")
        
        await self.client.aclose()
        return pass_rate >= 80

async def main():
    tester = UIFeatureTester()
    success = await tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())
