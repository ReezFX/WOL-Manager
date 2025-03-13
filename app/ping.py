"""
ICMP Ping Utility for WOL-Manager

This module provides functionality to check if hosts are up or down using ICMP ping.
"""

import socket
import struct
import time
import os
import concurrent.futures
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from app.logging_config import get_logger

# Initialize module-level logger
logger = get_logger('app.ping')


@dataclass
class PingConfig:
    """Configuration settings for ping operations."""
    timeout: float = 1.5  # seconds - increased from 1.0 to be more tolerant of network latency
    retries: int = 2
    interval: float = 0.5  # seconds between retries
    max_socket_errors: int = 2  # Number of socket errors to tolerate before giving up


@dataclass
class PingResult:
    """Result of a ping operation."""
    host: str
    ip_address: Optional[str]
    is_alive: bool
    response_time: Optional[float] = None
    error: Optional[str] = None


def resolve_hostname(hostname: str) -> Optional[str]:
    """
    Resolve hostname to IP address.
    
    Args:
        hostname: The hostname or IP address to resolve
        
    Returns:
        IP address as string or None if resolution failed
    """
    try:
        # If it's already an IP address, this will still work
        ip = socket.gethostbyname(hostname)
        logger.debug(f"Resolved hostname '{hostname}' to IP '{ip}'")
        return ip
    except socket.gaierror as e:
        logger.warning(f"Failed to resolve hostname '{hostname}': {str(e)}")
        return None
def ping_host(host: str, config: PingConfig = PingConfig()) -> PingResult:
    """
    Ping a single host to check if it's up.
    
    Args:
        host: Hostname or IP address to ping
        config: Configuration settings for the ping operation
        
    Returns:
        PingResult object containing the ping results
    """
    ip_address = resolve_hostname(host)
    if not ip_address:
        logger.info(f"Ping failed for host '{host}': Unable to resolve hostname")
        return PingResult(
            host=host,
            ip_address=None,
            is_alive=False,
            error="Failed to resolve hostname"
        )
    # Track socket errors to allow some retries for socket-related issues
    socket_errors = 0
    last_error = None
    
    # Use raw socket for ICMP ping
    for attempt in range(config.retries + 1):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_ICMP)
            sock.settimeout(config.timeout)
            
            # Record start time
            start_time = time.time()
            
            # Generate a more reliable packet ID using timestamp and process ID
            current_pid = os.getpid()
            packet_id = (int(time.time() * 1000) + current_pid) % 65535
            packet = create_icmp_packet(packet_id, attempt + 1)  # Use attempt as sequence number
            sock.sendto(packet, (ip_address, 0))
            
            # Wait for reply
            try:
                data, addr = sock.recvfrom(1024)
                response_time = (time.time() - start_time) * 1000  # in milliseconds
                # Verify response
                if verify_icmp_response(data, packet_id):
                    logger.debug(f"Host '{host}' ({ip_address}) is alive, response time: {response_time:.2f}ms")
                    return PingResult(
                        host=host,
                        ip_address=ip_address,
                        is_alive=True,
                        response_time=response_time
                    )
            except socket.timeout:
                pass
                
            finally:
                sock.close()
                
            # Wait before retry
            if attempt < config.retries:
                time.sleep(config.interval)
                
        except (socket.error, OSError) as e:
            # Track socket errors but don't immediately fail
            socket_errors += 1
            last_error = str(e)
            logger.warning(f"Socket error when pinging '{host}' ({ip_address}): {last_error}")
            if socket_errors < config.max_socket_errors and attempt < config.retries:
                # Exponential backoff for retries - longer wait after each failure
                backoff_time = config.interval * (2 ** attempt)
                time.sleep(backoff_time)
                continue
            # Too many socket errors, return failure
            if socket_errors >= config.max_socket_errors:
                logger.error(f"Ping failed for '{host}' ({ip_address}) after {socket_errors} socket errors: {last_error}")
                return PingResult(
                    host=host,
                    ip_address=ip_address,
                    is_alive=False,
                    error=f"Multiple socket errors ({socket_errors}): {last_error}"
                )
    # If we get here, all attempts failed
    logger.info(f"Host '{host}' ({ip_address}) did not respond to ping after {config.retries+1} attempts")
    return PingResult(
        host=host,
        ip_address=ip_address,
        is_alive=False,
        error="Host did not respond to ping requests"
    )

def create_icmp_packet(packet_id: int, seq_number: int) -> bytes:
    """Create an ICMP echo request packet."""
    # ICMP type 8 (echo request)
    icmp_type = 8
    # ICMP code 0
    icmp_code = 0
    # Initial checksum
    checksum = 0
    # Header without checksum
    header = struct.pack('!BBHHH', icmp_type, icmp_code, checksum, packet_id, seq_number)
    # Data - timestamp to pad the packet
    data = struct.pack('!d', time.time())
    # Calculate checksum
    checksum = calculate_checksum(header + data)
    # Final header with checksum
    header = struct.pack('!BBHHH', icmp_type, icmp_code, checksum, packet_id, seq_number)
    return header + data


def verify_icmp_response(data: bytes, packet_id: int) -> bool:
    """
    Verify that the ICMP response matches our request.
    
    Now more strict: only accepts echo replies (type 0) with matching packet IDs.
    Other response types are logged but not accepted as valid responses.
    """
    try:
        # ICMP header starts at byte 20 in the IP packet
        icmp_header = data[20:28]
        type, code, checksum, received_id, sequence = struct.unpack('!BBHHH', icmp_header)
        logger.debug(f"ICMP response received: type={type}, code={code}, id={received_id} (expected id={packet_id})")
        
        # Only accept echo reply (type 0) as the standard response
        if type == 0:
            # Strictly validate the packet ID
            if received_id == packet_id:
                return True
            else:
                return False
        # Other response types are not valid
        logger.debug(f"Received unexpected ICMP type {type}, expected echo reply (type 0)")
        
        # Any response type other than echo reply (0) with matching ID is invalid
        return False
    except Exception as e:
        logger.warning(f"Error verifying ICMP response: {str(e)}")
        return False

def calculate_checksum(data: bytes) -> int:
    """Calculate the checksum for an ICMP packet."""
    checksum = 0
    # Handle data in 2-byte chunks
    for i in range(0, len(data), 2):
        if i + 1 < len(data):
            checksum += (data[i] << 8) + data[i + 1]
        else:
            # Handle odd-length data
            checksum += data[i] << 8
    # Add carry bits
    checksum = (checksum >> 16) + (checksum & 0xffff)
    checksum += checksum >> 16
    # Take one's complement
    return ~checksum & 0xffff

def ping_hosts(hosts: List[str], config: PingConfig = PingConfig()) -> Dict[str, PingResult]:
    """
    Ping multiple hosts concurrently and return their status.
    
    Args:
        hosts: List of hostnames or IP addresses to ping
        config: Configuration settings for the ping operations
        
    Returns:
        Dictionary mapping each host to its PingResult
    """
    logger.info(f"Pinging {len(hosts)} hosts concurrently")
    results = {}
    
    # Use a thread pool to ping hosts concurrently
    with ThreadPoolExecutor(max_workers=min(32, len(hosts))) as executor:
        future_to_host = {executor.submit(ping_host, host, config): host for host in hosts}
        for future in concurrent.futures.as_completed(future_to_host):
            host = future_to_host[future]
            try:
                result = future.result()
                results[host] = result
            except Exception as e:
                logger.error(f"Unexpected error while pinging '{host}': {str(e)}")
                results[host] = PingResult(
                    host=host,
                    ip_address=None,
                    is_alive=False,
                    error=str(e)
                )
    return results


def ping_hosts_with_timeout(hosts: List[str], 
                           timeout: float = 1.5, 
                           retries: int = 2,
                           interval: float = 0.5) -> Dict[str, PingResult]:
    """
    Convenience function to ping multiple hosts with custom timeout and retry settings.
    
    Args:
        hosts: List of hostnames or IP addresses to ping
        timeout: Timeout in seconds for each ping attempt
        retries: Number of retry attempts per host
        interval: Time in seconds to wait between retries
        
    Returns:
        Dictionary mapping each host to its PingResult
    """
    logger.debug(f"Starting ping operation for {len(hosts)} hosts with timeout={timeout}s, retries={retries}")
    config = PingConfig(timeout=timeout, retries=retries, interval=interval)
    return ping_hosts(hosts, config)


