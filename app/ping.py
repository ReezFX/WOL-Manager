"""
ICMP Ping Utility for WOL-Manager

This module provides functionality to check if hosts are up or down using ICMP ping.
"""

import socket
import struct
import time
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from typing import Dict, List, Optional
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
    """Resolve hostname to IP address."""
    try:
        ip = socket.gethostbyname(hostname)
        return ip
    except socket.gaierror as e:
        logger.warning(f"Failed to resolve hostname '{hostname}': {str(e)}")
        return None
def ping_host(host: str, config: PingConfig = PingConfig()) -> PingResult:
    """Ping a single host to check if it's up."""
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
    
    for attempt in range(config.retries + 1):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_ICMP)
            sock.settimeout(config.timeout)
            
            start_time = time.time()
            packet_id = (int(time.time() * 1000) + os.getpid()) % 65535
            packet = create_icmp_packet(packet_id, attempt + 1)
            sock.sendto(packet, (ip_address, 0))
            
            try:
                data, _ = sock.recvfrom(1024)
                response_time = (time.time() - start_time) * 1000
                
                if verify_icmp_response(data, packet_id):
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
                
            if attempt < config.retries:
                time.sleep(config.interval)
                
        except (socket.error, OSError) as e:
            socket_errors += 1
            last_error = str(e)
            logger.warning(f"Socket error when pinging '{host}': {last_error}")
            
            if socket_errors < config.max_socket_errors and attempt < config.retries:
                backoff_time = config.interval * (2 ** attempt)
                time.sleep(backoff_time)
                continue
            
            if socket_errors >= config.max_socket_errors:
                return PingResult(
                    host=host,
                    ip_address=ip_address,
                    is_alive=False,
                    error=f"Multiple socket errors: {last_error}"
                )
    
    return PingResult(
        host=host,
        ip_address=ip_address,
        is_alive=False,
        error="Host did not respond to ping requests"
    )
def create_icmp_packet(packet_id: int, seq_number: int) -> bytes:
    """Create an ICMP echo request packet."""
    icmp_type = 8  # Echo request
    icmp_code = 0
    checksum = 0
    header = struct.pack('!BBHHH', icmp_type, icmp_code, checksum, packet_id, seq_number)
    data = struct.pack('!d', time.time())
    checksum = calculate_checksum(header + data)
    header = struct.pack('!BBHHH', icmp_type, icmp_code, checksum, packet_id, seq_number)
    return header + data

def verify_icmp_response(data: bytes, packet_id: int) -> bool:
    """Verify that the ICMP response matches our request."""
    try:
        # ICMP header starts at byte 20 in the IP packet
        icmp_header = data[20:28]
        type, _, _, received_id, _ = struct.unpack('!BBHHH', icmp_header)
        
        # Only accept echo reply (type 0) with matching packet IDs
        return type == 0 and received_id == packet_id
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
    # Keep INFO level only for large batches that might impact performance
    if len(hosts) > 10:
        logger.info(f"Pinging {len(hosts)} hosts concurrently")
    else:
        logger.debug(f"Pinging {len(hosts)} hosts concurrently")
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


