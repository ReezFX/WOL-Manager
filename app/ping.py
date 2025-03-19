"""
ICMP Ping Utility for WOL-Manager (Lightweight Version)

This module provides functionality to check if hosts are up or down using ICMP ping.
Optimized for low resource usage on ARM hardware.
"""

import socket
import struct
import time
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from typing import Dict, List, Optional, Union
from app.logging_config import get_logger

# Initialize module-level logger
logger = get_logger('app.ping')


@dataclass
class PingConfig:
    """Configuration settings for ping operations."""
    timeout: float = 1.5  # seconds - increased from 1.0 to be more tolerant of network latency
    retries: int = 1  # reduced to 1 to minimize resource usage
    interval: float = 2.0  # seconds between retries - increased to reduce network load
    max_socket_errors: int = 1  # Number of socket errors to tolerate before giving up
    max_workers: int = 4  # Maximum number of worker threads for concurrent pinging


@dataclass
class PingResult:
    """Result of a ping operation."""
    host: str
    ip_address: Optional[str]
    is_alive: bool
    response_time: Optional[float] = None
    error: Optional[str] = None

def resolve_hostname(hostname: str) -> Optional[str]:
    """Resolve hostname to IP address."""
    try:
        ip = socket.gethostbyname(hostname)
        return ip
    except socket.gaierror as e:
        logger.warning(f"Failed to resolve hostname '{hostname}': {str(e)}")
        return None
def ping_host(host: str, config: PingConfig = PingConfig()) -> PingResult:
    """Ping a single host to check if it's up, optimized for low resource usage."""
    ip_address = resolve_hostname(host)
    if not ip_address:
        return PingResult(
            host=host,
            ip_address=None,
            is_alive=False,
            error="Failed to resolve hostname"
        )
    
    socket_errors = 0
    last_error = None
    
    # Use a smaller buffer for receiving data
    recv_buffer = bytearray(64)
    
    for attempt in range(config.retries + 1):
        sock = None
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_ICMP)
            sock.settimeout(config.timeout)
            
            # Use simple packet ID generation
            packet_id = (os.getpid() + attempt) % 65535
            packet = create_icmp_packet(packet_id, attempt + 1)
            
            start_time = time.time()
            sock.sendto(packet, (ip_address, 0))
            
            try:
                # Use the pre-allocated buffer with memoryview for efficiency
                view = memoryview(recv_buffer)
                nbytes, _ = sock.recvfrom_into(view)
                response_time = (time.time() - start_time) * 1000
                
                if nbytes > 20 and verify_icmp_response(view[:nbytes], packet_id):
                    return PingResult(
                        host=host,
                        ip_address=ip_address,
                        is_alive=True,
                        response_time=response_time
                    )
            except socket.timeout:
                pass
            
            if attempt < config.retries:
                time.sleep(config.interval)
                
        except (socket.error, OSError) as e:
            socket_errors += 1
            last_error = str(e)
            # Only log at warning level for permission errors
            if "Operation not permitted" in str(e):
                logger.warning(f"Socket error when pinging '{host}': {last_error}")
            elif __debug__:
                logger.debug(f"Socket error when pinging '{host}': {last_error}")
                
            if socket_errors < config.max_socket_errors and attempt < config.retries:
                time.sleep(config.interval)
                continue
                
            if socket_errors >= config.max_socket_errors:
                return PingResult(
                    host=host,
                    ip_address=ip_address,
                    is_alive=False,
                    error="Socket error"
                )
        finally:
            if sock:
                sock.close()
    
    return PingResult(
        host=host,
        ip_address=ip_address,
        is_alive=False,
        error="No response"
    )
def create_icmp_packet(packet_id: int, seq_number: int) -> bytes:
    """Create a minimal ICMP echo request packet."""
    icmp_type = 8  # Echo request
    icmp_code = 0
    checksum = 0
    header = struct.pack('!BBHHH', icmp_type, icmp_code, checksum, packet_id, seq_number)
    # Using a smaller data payload to reduce packet size
    data = struct.pack('!H', seq_number)  # Just include sequence number as data
    checksum = calculate_checksum(header + data)
    header = struct.pack('!BBHHH', icmp_type, icmp_code, checksum, packet_id, seq_number)
    return header + data

def verify_icmp_response(data: Union[bytes, memoryview], packet_id: int) -> bool:
    """Verify that the ICMP response matches our request using memory-efficient access."""
    try:
        # Use memoryview if not already one to avoid copies
        view = data if isinstance(data, memoryview) else memoryview(data)
        
        # ICMP header starts at byte 20 in the IP packet
        if len(view) < 28:  # Ensure we have enough data
            return False
            
        # Extract just the type and ID fields from the header
        icmp_type = view[20]
        received_id = (view[24] << 8) | view[25]
        
        # Only accept echo reply (type 0) with matching packet IDs
        return icmp_type == 0 and received_id == packet_id
    except Exception as e:
        if __debug__:  # Only log in debug mode
            logger.debug(f"Error verifying ICMP response: {str(e)}")
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
    # Log only in debug mode
    if __debug__:
        logger.debug(f"Pinging {len(hosts)} hosts")
    
    # Remove duplicates to avoid pinging the same host multiple times
    unique_hosts = list(dict.fromkeys(hosts))
    results = {}
    
    # Use a thread pool with limited workers to reduce resource usage
    with ThreadPoolExecutor(max_workers=min(config.max_workers, len(unique_hosts))) as executor:
        future_to_host = {executor.submit(ping_host, host, config): host for host in unique_hosts}
        for future in as_completed(future_to_host):
            host = future_to_host[future]
            try:
                result = future.result()
                results[host] = result
            except Exception as e:
                logger.error(f"Error pinging '{host}': {str(e)}")
                results[host] = PingResult(
                    host=host,
                    ip_address=None,
                    is_alive=False,
                    error=f"Exception: {str(e)}"
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


