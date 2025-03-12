"""
ICMP Ping Utility for WOL-Manager

This module provides functionality to check if hosts are up or down using ICMP ping.
"""

import logging
import socket
import struct
import time
import os
import concurrent.futures
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

# Configure logging
logger = logging.getLogger(__name__)

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
        return socket.gethostbyname(hostname)
    except socket.gaierror as e:
        logger.error(f"Failed to resolve hostname {hostname}: {str(e)}")
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
    # Log beginning of ping operation
    logger.debug(f"Starting ping of host {host} with timeout={config.timeout}s, retries={config.retries}")
    
    ip_address = resolve_hostname(host)
    if not ip_address:
        logger.warning(f"Failed to resolve hostname: {host}")
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
                    logger.debug(f"Successful ping to {host} ({ip_address}) - response time: {response_time:.2f}ms on attempt {attempt + 1}")
                    return PingResult(
                        host=host,
                        ip_address=ip_address,
                        is_alive=True,
                        response_time=response_time
                    )
            except socket.timeout:
                logger.debug(f"Ping timeout for {host} (attempt {attempt + 1}/{config.retries + 1})")
                
            finally:
                sock.close()
                
            # Wait before retry
            if attempt < config.retries:
                time.sleep(config.interval)
                
        except (socket.error, OSError) as e:
            # Track socket errors but don't immediately fail
            socket_errors += 1
            last_error = str(e)
            logger.warning(f"Ping error for {host}: {str(e)} [error {socket_errors}/{config.max_socket_errors}]")
            
            # Continue if we haven't exceeded the maximum number of socket errors
            if socket_errors < config.max_socket_errors and attempt < config.retries:
                # Exponential backoff for retries - longer wait after each failure
                backoff_time = config.interval * (2 ** attempt)
                logger.debug(f"Retrying ping to {host} after {backoff_time:.2f}s (attempt {attempt+1}/{config.retries})")
                time.sleep(backoff_time)
                continue
                
            # Too many socket errors, return failure
            if socket_errors >= config.max_socket_errors:
                logger.error(f"Ping to {host} failed after {socket_errors} socket errors: {last_error}")
                return PingResult(
                    host=host,
                    ip_address=ip_address,
                    is_alive=False,
                    error=f"Multiple socket errors ({socket_errors}): {last_error}"
                )
    
    # If we get here, all attempts failed
    logger.info(f"All ping attempts to {host} ({ip_address}) failed after {config.retries + 1} attempts")
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
        
        # Log the response details for debugging
        logger.debug(f"ICMP response - type: {type}, code: {code}, id: {received_id}, expected id: {packet_id}")
        
        # Only accept echo reply (type 0) as the standard response
        if type == 0:
            # Strictly validate the packet ID
            if received_id == packet_id:
                logger.debug(f"Received valid echo reply with matching ID")
                return True
            else:
                logger.debug(f"Received echo reply with non-matching ID, ignoring as invalid response")
                return False
        
        # Log other response types but don't accept them as valid
        if type == 8:
            logger.debug(f"Received echo request reflection (type 8), ignoring as invalid response")
        elif type == 3:
            logger.debug(f"Received destination unreachable (type 3, code {code}), ignoring as invalid response")
        elif type == 11:
            logger.debug(f"Received time exceeded (type 11, code {code}), ignoring as invalid response")
        elif type == 12:
            logger.debug(f"Received parameter problem (type 12, code {code}), ignoring as invalid response")
        else:
            logger.debug(f"Received unexpected ICMP type {type}, code {code}, ignoring as invalid response")
        
        # Any response type other than echo reply (0) with matching ID is invalid
        return False
    except Exception as e:
        logger.error(f"Error verifying ICMP response: {str(e)}")
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
    results = {}
    
    # Use a thread pool to ping hosts concurrently
    with ThreadPoolExecutor(max_workers=min(32, len(hosts))) as executor:
        future_to_host = {executor.submit(ping_host, host, config): host for host in hosts}
        for future in concurrent.futures.as_completed(future_to_host):
            host = future_to_host[future]
            try:
                result = future.result()
                results[host] = result
                if result.is_alive:
                    logger.info(f"Host {host} is up (response time: {result.response_time:.2f}ms)")
                else:
                    log_msg = f"Host {host} is down"
                    if result.error:
                        log_msg += f" (error: {result.error})"
                    logger.info(log_msg)
            except Exception as e:
                logger.error(f"Error pinging host {host}: {str(e)}")
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
    config = PingConfig(timeout=timeout, retries=retries, interval=interval)
    return ping_hosts(hosts, config)



