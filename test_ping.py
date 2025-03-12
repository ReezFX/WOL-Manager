#!/usr/bin/env python3
"""
Test script for WOL-Manager's ping functionality.
This script tests if the ping_host function can successfully ping a local IP address.
"""

import sys
import os
import logging

# Configure logging to display debug information
logging.basicConfig(level=logging.DEBUG, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Add the app directory to the Python path if needed
sys.path.append(os.path.abspath('app'))

# Import the ping module
try:
    from app.ping import ping_host, PingConfig, PingResult
    print("Successfully imported ping module")
except ImportError as e:
    print(f"Error importing ping module: {e}")
    print("Make sure you're running this script from the project root directory")
    sys.exit(1)

def test_ping(host="127.0.0.1"):
    """
    Test the ping_host function with the given host.
    
    Args:
        host: The hostname or IP address to ping
    """
    print(f"Testing ping to {host}...")
    
    try:
        # Create a more verbose configuration for testing
        config = PingConfig(
            timeout=2.0,  # Longer timeout for testing
            retries=3,    # More retries
            interval=1.0  # Longer interval between retries
        )
        
        # Attempt to ping the host
        result = ping_host(host, config)
        
        # Print detailed results
        print("\nPing Result:")
        print(f"  Host: {result.host}")
        print(f"  IP Address: {result.ip_address}")
        print(f"  Is Alive: {result.is_alive}")
        print(f"  Response Time: {result.response_time} ms" if result.response_time else "  Response Time: N/A")
        print(f"  Error: {result.error}" if result.error else "  Error: None")
        
        # Additional information
        if not result.is_alive:
            print("\nPossible reasons for failure:")
            if result.error and "permission" in result.error.lower():
                print("  - Permission error: Raw sockets require root/administrator privileges")
                print("  - Try running this script with sudo/as administrator")
            elif result.error and "resolve" in result.error.lower():
                print("  - Failed to resolve hostname")
                print("  - Check DNS settings or try using an IP address directly")
            else:
                print("  - Host may be unreachable")
                print("  - Firewall might be blocking ICMP packets")
                print("  - Check network connectivity")
        
        return result
        
    except Exception as e:
        print(f"Unexpected error during ping test: {e}")
        return None

if __name__ == "__main__":
    # Test localhost by default
    host = "127.0.0.1"
    
    # Allow specifying a different host as command line argument
    if len(sys.argv) > 1:
        host = sys.argv[1]
    
    print(f"Running ping test on {host}")
    result = test_ping(host)
    
    # Exit with appropriate status code
    if result and result.is_alive:
        print("\nSUCCESS: Host is reachable")
        sys.exit(0)
    else:
        print("\nFAILURE: Could not reach host")
        sys.exit(1)

