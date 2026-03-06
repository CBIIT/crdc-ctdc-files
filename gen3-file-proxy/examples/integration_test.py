"""Example integration test script.

This script demonstrates how to test the service against a real Gen3 instance.
Requires a valid Gen3 access token and a known test file ID.

Usage:
    export GEN3_TOKEN="your_token_here"
    export TEST_FILE_ID="dg.1234/abc-def-ghi"
    python examples/integration_test.py
"""
import os
import sys
import httpx
import asyncio


async def test_integration():
    """Run integration tests against the service."""
    
    # Configuration
    service_url = os.getenv("SERVICE_URL", "http://localhost:8000")
    token = os.getenv("GEN3_TOKEN")
    test_file_id = os.getenv("TEST_FILE_ID")
    
    if not token:
        print("Error: GEN3_TOKEN environment variable not set")
        sys.exit(1)
    
    if not test_file_id:
        print("Error: TEST_FILE_ID environment variable not set")
        sys.exit(1)
    
    print(f"Testing service at: {service_url}")
    print(f"File ID: {test_file_id}")
    print("-" * 60)
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        # Test 1: Health check
        print("\n1. Testing health endpoint...")
        try:
            response = await client.get(f"{service_url}/health")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.json()}")
            assert response.status_code == 200
            print("   ✓ Health check passed")
        except Exception as e:
            print(f"   ✗ Health check failed: {e}")
            sys.exit(1)
        
        # Test 2: Gen3 connectivity
        print("\n2. Testing Gen3 connectivity...")
        try:
            response = await client.get(f"{service_url}/health/gen3")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.json()}")
            assert response.status_code == 200
            print("   ✓ Gen3 connectivity passed")
        except Exception as e:
            print(f"   ✗ Gen3 connectivity failed: {e}")
        
        # Test 3: File HEAD request
        print("\n3. Testing HEAD request for file metadata...")
        try:
            response = await client.head(
                f"{service_url}/api/files/{test_file_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            print(f"   Status: {response.status_code}")
            print(f"   Content-Length: {response.headers.get('content-length')}")
            print(f"   Content-Disposition: {response.headers.get('content-disposition')}")
            assert response.status_code == 200
            print("   ✓ HEAD request passed")
        except Exception as e:
            print(f"   ✗ HEAD request failed: {e}")
        
        # Test 4: File download (first 1KB)
        print("\n4. Testing file download (streaming first 1KB)...")
        try:
            downloaded_bytes = 0
            async with client.stream(
                "GET",
                f"{service_url}/api/files/{test_file_id}",
                headers={"Authorization": f"Bearer {token}"}
            ) as response:
                print(f"   Status: {response.status_code}")
                assert response.status_code == 200
                
                async for chunk in response.aiter_bytes(chunk_size=1024):
                    downloaded_bytes += len(chunk)
                    print(f"   Downloaded: {downloaded_bytes} bytes")
                    if downloaded_bytes >= 1024:
                        break  # Only download first KB for testing
            
            print(f"   ✓ File download passed (streamed {downloaded_bytes} bytes)")
        except Exception as e:
            print(f"   ✗ File download failed: {e}")
        
        # Test 5: Invalid token
        print("\n5. Testing authentication with invalid token...")
        try:
            response = await client.get(
                f"{service_url}/api/files/{test_file_id}",
                headers={"Authorization": "Bearer invalid_token_12345"}
            )
            print(f"   Status: {response.status_code}")
            assert response.status_code in [401, 403]
            print("   ✓ Authentication validation passed")
        except Exception as e:
            print(f"   ✗ Authentication test failed: {e}")
        
        # Test 6: Non-existent file
        print("\n6. Testing non-existent file...")
        try:
            response = await client.get(
                f"{service_url}/api/files/non-existent-file-id-9999",
                headers={"Authorization": f"Bearer {token}"}
            )
            print(f"   Status: {response.status_code}")
            assert response.status_code == 404
            print("   ✓ File not found handling passed")
        except Exception as e:
            print(f"   ✗ File not found test failed: {e}")
    
    print("\n" + "=" * 60)
    print("Integration tests completed!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_integration())
