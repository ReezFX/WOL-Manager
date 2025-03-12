"""
Ping Cache Module for WOL-Manager

This module provides caching for ping results to reduce unnecessary network traffic
and provide a more stable UI experience by storing successful ping results for a period of time.
Uses Redis as a backend for shared caching across Gunicorn workers.
"""

import os
import time
import json
import logging
import redis
import socket
import traceback
from typing import Dict, Optional, List, Any

# Configure logging
logger = logging.getLogger(__name__)
# Set log level for this module
logger.setLevel(logging.DEBUG)

# Default cache expiration time in seconds
DEFAULT_CACHE_EXPIRY = 15  
# Default Redis cache key prefix
DEFAULT_CACHE_PREFIX = "ping_cache:"
# Maximum number of hosts to track in detailed debug output
MAX_DEBUG_HOSTS = 10
# Debug flag to enable super verbose logging
DEBUG_VERBOSE = True
# Enable cache statistics logging interval (in seconds)
CACHE_STATS_INTERVAL = 60
# Threshold for slow cache operations (in ms)
SLOW_OPERATION_THRESHOLD = 50

class PingCache:
    """
    Cache for storing ping results with timestamps.
    Successful pings are remembered for at least the cache_expiry duration.
    Uses Redis as a backend for shared caching across Gunicorn workers.
    """
    
    def __init__(self, expiry_seconds: int = DEFAULT_CACHE_EXPIRY, prefix: str = DEFAULT_CACHE_PREFIX):
        """
        Initialize the ping cache with Redis backend.
        
        Args:
            expiry_seconds: How long successful pings should be considered valid, in seconds
            prefix: Prefix for Redis keys
        """
        self.expiry_seconds = expiry_seconds
        self.prefix = prefix
        
        # Debug tracking
        self._cache_hits = 0
        self._cache_misses = 0
        self._redis_errors = 0
        self._worker_id = os.getpid()
        self._hostname = socket.gethostname()
        self._recent_operations: List[Dict[str, Any]] = []
        self._max_recent_operations = 100
        self._last_stats_time = time.time()
        
        # Performance metrics
        self._operation_times = {
            "get": [],
            "update": [],
            "hit": [],
            "miss": []
        }
        self._max_metrics_samples = 100
        
        # Host status tracking
        self._host_status = {}  # Track current status of hosts
        self._status_changes = []  # Track changes in host status
        self._max_status_changes = 50

        # Initialize Redis connection
        redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
        logger.info(f"[CACHE:{self._worker_id}] Initializing Redis cache with URL: {redis_url}")
        
        try:
            # Detailed connection info
            self.redis = redis.from_url(redis_url)
            connection_info = self._get_redis_info() or {}
            
            # Test connection
            ping_result = self.redis.ping()
            
            logger.info(f"[CACHE:{self._worker_id}] Successfully connected to Redis at {redis_url}")
            logger.info(f"[CACHE:{self._worker_id}] Redis server: {connection_info.get('redis_version', 'unknown')}, "
                       f"connected clients: {connection_info.get('connected_clients', 'unknown')}")
            logger.info(f"[CACHE:{self._worker_id}] Initialized Redis-based ping cache with {expiry_seconds} seconds "
                       f"expiry time. Redis ping result: {ping_result}")
            
            # Track detailed Redis info for debugging
            self._track_operation("init", "connection", {
                "status": "success",
                "redis_info": connection_info,
                "expiry_seconds": expiry_seconds,
                "worker_id": self._worker_id,
                "hostname": self._hostname
            })
                
        except redis.ConnectionError as e:
            logger.error(f"[CACHE:{self._worker_id}] Failed to connect to Redis at {redis_url}: {str(e)}")
            logger.error(f"[CACHE:{self._worker_id}] Exception details: {traceback.format_exc()}")
            logger.warning(f"[CACHE:{self._worker_id}] Falling back to local in-memory cache (not shared between workers)")
            self.redis = None
            # Fallback to in-memory cache if Redis is not available
            self._local_cache: Dict[str, Dict] = {}
            
            # Track error
            self._redis_errors += 1
            self._track_operation("init", "connection", {
                "status": "error",
                "error": str(e),
                "error_type": type(e).__name__,
                "stack": traceback.format_exc(),
                "worker_id": self._worker_id,
                "hostname": self._hostname
            })
    
    def _get_redis_info(self) -> Optional[Dict]:
        """Get Redis server information for debugging purposes"""
        try:
            if self.redis:
                return self.redis.info()
            return None
        except Exception as e:
            logger.error(f"[CACHE:{self._worker_id}] Failed to get Redis info: {e}")
            return None
            
    def _track_operation(self, op_type: str, host_id: str, details: Dict) -> None:
        """Track a cache operation for debugging purposes"""
        if not DEBUG_VERBOSE:
            return
            
        timestamp = time.time()
        operation = {
            "timestamp": timestamp,
            "op_type": op_type,
            "host_id": host_id,
            "details": details,
            "worker_id": self._worker_id
        }
        
        # Keep a rolling log of recent operations
        self._recent_operations.append(operation)
        if len(self._recent_operations) > self._max_recent_operations:
            self._recent_operations.pop(0)
            
        # Log summary of operations every 50 operations for the first 1000
        if len(self._recent_operations) % 50 == 0 and len(self._recent_operations) <= 1000:
            self._log_operation_summary()
    
    def _log_operation_summary(self) -> None:
        """Log a summary of recent cache operations"""
        if not self._recent_operations:
            return
            
        # Count operations by type
        op_counts = {}
        host_counts = {}
        
        for op in self._recent_operations:
            op_type = op["op_type"]
            host_id = op["host_id"]
            
            op_counts[op_type] = op_counts.get(op_type, 0) + 1
            host_counts[host_id] = host_counts.get(host_id, 0) + 1
        
        # Log summary
        logger.info(f"[CACHE:{self._worker_id}] Cache operation summary:")
        logger.info(f"[CACHE:{self._worker_id}] - Total operations: {len(self._recent_operations)}")
        logger.info(f"[CACHE:{self._worker_id}] - Operations by type: {op_counts}")
        logger.info(f"[CACHE:{self._worker_id}] - Operations by host (top {MAX_DEBUG_HOSTS}): "
                   f"{dict(sorted(host_counts.items(), key=lambda x: x[1], reverse=True)[:MAX_DEBUG_HOSTS])}")
        logger.info(f"[CACHE:{self._worker_id}] - Cache hits: {self._cache_hits}, misses: {self._cache_misses}, "
                   f"ratio: {self._cache_hits/(self._cache_hits+self._cache_misses)*100:.1f}% "
                   f"(if not 0)")
        logger.info(f"[CACHE:{self._worker_id}] - Redis errors: {self._redis_errors}")
        
        # Log Redis info
        if self.redis:
            try:
                redis_info = self._get_redis_info()
                if redis_info:
                    logger.info(f"[CACHE:{self._worker_id}] - Redis memory: {redis_info.get('used_memory_human', 'unknown')}")
                    logger.info(f"[CACHE:{self._worker_id}] - Redis connected clients: {redis_info.get('connected_clients', 'unknown')}")
                    logger.info(f"[CACHE:{self._worker_id}] - Redis keyspace: {redis_info.get('db0', 'unknown')}")
            except Exception as e:
                logger.error(f"[CACHE:{self._worker_id}] Failed to get Redis info for summary: {e}")
    
    def _get_key(self, host_id: str) -> str:
        """
        Get the Redis key for a host_id.
        
        Args:
            host_id: ID of the host
            
        Returns:
            Redis key string
        """
        # Ensure the host_id is consistently a string (convert if needed)
        host_id_str = str(host_id)
        
        # Normalize the host ID to prevent inconsistencies
        # Remove any potential whitespace
        normalized_id = host_id_str.strip()
        
        # Create the final key
        key = f"{self.prefix}{normalized_id}"
        
        if DEBUG_VERBOSE:
            logger.debug(f"[CACHE:{self._worker_id}] Generated Redis key '{key}' for host ID '{host_id}' (normalized from: '{host_id}')")
        return key

    def update(self, host_id: str, is_online: bool, response_time: Optional[float] = None, 
               error: Optional[str] = None) -> None:
        """
        Update the cache with a ping result.
        
        Args:
            host_id: ID of the host
            is_online: Whether the host is online
            response_time: Ping response time in ms (if available)
            error: Error message (if any)
        """
        # Prepare the data to store
        data = {
            'is_online': is_online,
            'response_time': response_time,
            'error': error,
            'timestamp': time.time()
        }
        
        # Calculate expiration time
        # Calculate expiration time
        # Use a longer expiry for online hosts, shorter for offline hosts
        # For online hosts, use the full expiry time
        # For offline hosts, use a slightly longer expiry (3 seconds instead of 1) 
        # to prevent rapid flipping between states
        expiry = self.expiry_seconds if is_online else 3
        
        # Log reasoning for expiration time
        if is_online:
            logger.debug(f"[CACHE:{self._worker_id}] Host {host_id} is ONLINE - using {expiry}s expiry")
        else:
            logger.debug(f"[CACHE:{self._worker_id}] Host {host_id} is OFFLINE - using reduced {expiry}s expiry (instead of {self.expiry_seconds}s)")
        
        # Debug info for update operation
        op_start = time.time()
        update_details = {
            "host_id": host_id,
            "is_online": is_online,
            "response_time": response_time,
            "error": error,
            "expiry": expiry,
            "worker_id": self._worker_id
        }
        
        logger.info(f"[CACHE:{self._worker_id}] Updating cache for host {host_id}: "
                   f"online={is_online}, response_time={response_time}, "
                   f"error={error}, expiry={expiry}s")
        
        if self.redis:
            try:
                # Store in Redis as JSON
                key = self._get_key(host_id)
                json_data = json.dumps(data)
                
                # Log the exact data being stored
                logger.debug(f"[CACHE:{self._worker_id}] Setting Redis key '{key}' with expiry {expiry}s: {json_data}")
                
                result = self.redis.setex(key, expiry, json_data)
                
                # Track timing and result
                op_time = (time.time() - op_start) * 1000  # ms
                update_details.update({
                    "status": "success",
                    "redis_result": result,
                    "op_time_ms": op_time,
                    "redis_key": key,
                    "data_size": len(json_data)
                })
                
                logger.info(f"[CACHE:{self._worker_id}] Successfully updated Redis cache for host {host_id}: "
                           f"online={is_online}, key={key}, result={result}, time={op_time:.2f}ms")
                
                # Track this host's status change if any
                self._track_host_status_change(host_id, is_online)
                
                # Track operation time for performance metrics
                self._add_timing_metric("update", op_time)
                if op_time > SLOW_OPERATION_THRESHOLD:
                    logger.warning(f"[CACHE:{self._worker_id}] Slow cache update operation detected! "
                                 f"Host {host_id}, time={op_time:.2f}ms > threshold {SLOW_OPERATION_THRESHOLD}ms")
                
                # Verify the key was set correctly
                try:
                    ttl = self.redis.ttl(key)
                    exists = self.redis.exists(key)
                    update_details["ttl_check"] = ttl
                    update_details["exists_check"] = exists
                    
                    logger.debug(f"[CACHE:{self._worker_id}] Verification - Key '{key}': "
                                f"exists={exists}, TTL={ttl}s")
                except Exception as e:
                    logger.warning(f"[CACHE:{self._worker_id}] Failed to verify key {key}: {e}")
                    update_details["ttl_check_error"] = str(e)
                
            except Exception as e:
                # Track error details
                self._redis_errors += 1
                op_time = (time.time() - op_start) * 1000  # ms
                update_details.update({
                    "status": "error",
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "stack": traceback.format_exc(),
                    "op_time_ms": op_time
                })
                
                logger.error(f"[CACHE:{self._worker_id}] Error updating Redis cache for host {host_id}: {e}")
                logger.error(f"[CACHE:{self._worker_id}] Exception details: {traceback.format_exc()}")
                
                # Fallback to local cache
                if hasattr(self, '_local_cache'):
                    self._local_cache[host_id] = data
                    logger.info(f"[CACHE:{self._worker_id}] Fallback: Updated local cache for host {host_id}")
                    update_details["fallback"] = "local_cache"
        else:
            # Use local cache if Redis is not available
            self._local_cache[host_id] = data
            op_time = (time.time() - op_start) * 1000  # ms
            
            update_details.update({
                "status": "success",
                "storage": "local_cache",
                "op_time_ms": op_time
            })
            
            logger.info(f"[CACHE:{self._worker_id}] Updated local cache for host {host_id}: "
                       f"online={is_online}, time={op_time:.2f}ms")
        
        # Track this operation for debugging
        self._track_operation("update", host_id, update_details)
    
    def get(self, host_id: str) -> Optional[Dict]:
        """
        Get cached ping result for a host if available and not expired.
        
        Args:
            host_id: ID of the host
            
        Returns:
            Dict with ping status or None if not cached or expired
        """
        # Check if it's time to log cache statistics
        current_time = time.time()
        if current_time - self._last_stats_time > CACHE_STATS_INTERVAL:
            self._log_cache_statistics()
            self._last_stats_time = current_time
            
        # Debug info for get operation
        op_start = time.time()
        get_details = {
            "host_id": host_id,
            "worker_id": self._worker_id,
            "operation": "get"
        }
        
        logger.info(f"[CACHE:{self._worker_id}] Checking cache for host {host_id}")
        
        if self.redis:
            try:
                # Try to get from Redis
                key = self._get_key(host_id)
                get_details["redis_key"] = key
                
                logger.debug(f"[CACHE:{self._worker_id}] Retrieving Redis key '{key}'")
                data = self.redis.get(key)
                
                # Track timing for Redis operation
                op_time = (time.time() - op_start) * 1000  # ms
                get_details["op_time_ms"] = op_time
                
                if data:
                    # Parse the JSON data
                    entry = json.loads(data)
                    
                    # Calculate how old the entry is
                    age = time.time() - entry['timestamp']
                    get_details.update({
                        "status": "hit",
                        "is_online": entry['is_online'],
                        "age_seconds": age,
                        "data_size": len(data),
                        "response_time": entry.get('response_time')
                    })
                    
                    # Increment hit counter
                    self._cache_hits += 1
                    
                    # Get TTL for the key
                    try:
                        ttl = self.redis.ttl(key)
                        get_details["ttl_remaining"] = ttl
                        
                        # Warn if TTL is lower than expected
                        expected_ttl = self.expiry_seconds if entry['is_online'] else 3
                        if ttl < expected_ttl * 0.5:  # Less than half the expected TTL
                            logger.warning(f"[CACHE:{self._worker_id}] Cache key {key} has unusually low TTL: "
                                         f"{ttl}s (expected ~{expected_ttl}s)")
                            
                        # Verbose logging for TTL values
                        logger.debug(f"[CACHE:{self._worker_id}] Cache key {key} TTL details: "
                                   f"current={ttl}s, expected={expected_ttl}s, "
                                   f"age={age:.1f}s, is_online={entry['is_online']}")
                    except Exception as ttl_err:
                        get_details["ttl_error"] = str(ttl_err)
                    
                    # Log the cache hit with detailed info
                    if entry['is_online']:
                        logger.info(f"[CACHE:{self._worker_id}] Redis cache HIT for host {host_id} " 
                                   f"(age: {age:.1f}s, ttl: {get_details.get('ttl_remaining', 'unknown')}s, "
                                   f"time: {op_time:.2f}ms)")
                        
                        # Track timing metrics for cache hits
                        self._add_timing_metric("hit", op_time)
                        if op_time > SLOW_OPERATION_THRESHOLD:
                            logger.warning(f"[CACHE:{self._worker_id}] Slow cache hit operation detected! "
                                         f"Host {host_id}, time={op_time:.2f}ms > threshold {SLOW_OPERATION_THRESHOLD}ms")
                    else:
                        logger.info(f"[CACHE:{self._worker_id}] Redis cache HIT for OFFLINE host {host_id} "
                                   f"(age: {age:.1f}s, ttl: {get_details.get('ttl_remaining', 'unknown')}s, "
                                   f"time: {op_time:.2f}ms)")
                        
                        # Track timing metrics for offline cache hits 
                        self._add_timing_metric("hit", op_time)
                        if op_time > SLOW_OPERATION_THRESHOLD:
                            logger.warning(f"[CACHE:{self._worker_id}] Slow cache hit operation for OFFLINE host detected! "
                                         f"Host {host_id}, time={op_time:.2f}ms > threshold {SLOW_OPERATION_THRESHOLD}ms")
                    
                    # Track this operation for debugging
                    self._track_operation("get_hit", host_id, get_details)
                    
                    return entry
                else:
                    # Cache miss
                    self._cache_misses += 1
                    get_details.update({
                        "status": "miss",
                        "reason": "key_not_found"
                    })
                    
                    logger.info(f"[CACHE:{self._worker_id}] Redis cache MISS for host {host_id} "
                               f"(key not found, time: {op_time:.2f}ms)")
                    
                    # Track timing metrics for cache misses
                    self._add_timing_metric("miss", op_time)
                    
                    # Check if this is a first-time request or if we've seen this host before
                    if host_id in self._host_status:
                        logger.debug(f"[CACHE:{self._worker_id}] Host {host_id} had previous cache entries but now missing. "
                                   f"Last recorded status: {self._host_status.get(host_id, {}).get('status', 'unknown')}")
                    
                    # Track this operation for debugging
                    self._track_operation("get_miss", host_id, get_details)
                    return None
                
            except Exception as e:
                # Error handling with full details
                self._redis_errors += 1
                op_time = (time.time() - op_start) * 1000  # ms
                get_details.update({
                    "status": "error",
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "stack": traceback.format_exc(),
                    "op_time_ms": op_time
                })
                
                logger.error(f"[CACHE:{self._worker_id}] Error retrieving from Redis cache for host {host_id}: {e}")
                logger.error(f"[CACHE:{self._worker_id}] Exception details: {traceback.format_exc()}")
                logger.info(f"[CACHE:{self._worker_id}] Falling back to local cache for host {host_id}")
                
                # Track error operation
                self._track_operation("get_error", host_id, get_details)
                
                # Fallback to local cache
                return self._get_from_local_cache(host_id)
        else:
            # Use local cache if Redis is not available
            op_time = (time.time() - op_start) * 1000  # ms
            get_details.update({
                "storage": "local_cache",
                "op_time_ms": op_time,
                "reason": "redis_not_available"
            })
            
            logger.info(f"[CACHE:{self._worker_id}] Redis not available, using local cache for host {host_id}")
            
            # Track this operation
            self._track_operation("get_local", host_id, get_details)
            
            return self._get_from_local_cache(host_id)
    
    def _get_from_local_cache(self, host_id: str) -> Optional[Dict]:
        """
        Get cached ping result from local cache.
        
        Args:
            host_id: ID of the host
            
        Returns:
            Dict with ping status or None if not cached or expired
        """
        op_start = time.time()
        local_details = {
            "host_id": host_id,
            "worker_id": self._worker_id,
            "operation": "get_local"
        }
        
        if not hasattr(self, '_local_cache') or host_id not in self._local_cache:
            # Local cache miss - no entry
            self._cache_misses += 1
            op_time = (time.time() - op_start) * 1000  # ms
            local_details.update({
                "status": "miss",
                "reason": "key_not_found",
                "op_time_ms": op_time
            })
            
            logger.info(f"[CACHE:{self._worker_id}] Local cache MISS for host {host_id} (key not found)")
            self._track_operation("local_miss", host_id, local_details)
            return None
        
        entry = self._local_cache[host_id]
        
        # Calculate how old the entry is
        age = time.time() - entry['timestamp']
        local_details["age_seconds"] = age
        local_details["is_online"] = entry['is_online']
        
        # If entry is a successful ping and hasn't expired, return it
        if entry['is_online'] and age < self.expiry_seconds:
            # Local cache hit for online host
            self._cache_hits += 1
            op_time = (time.time() - op_start) * 1000  # ms
            local_details.update({
                "status": "hit",
                "op_time_ms": op_time,
                "expiry": self.expiry_seconds,
                "remaining_seconds": self.expiry_seconds - age
            })
            
            logger.info(f"[CACHE:{self._worker_id}] Local cache HIT for host {host_id} " 
                       f"(age: {age:.1f}s, remaining: {self.expiry_seconds - age:.1f}s)")
            self._track_operation("local_hit", host_id, local_details)
            return entry
        
        # If the entry is a failed ping, we don't cache it for as long
        # If the entry is a failed ping, we don't cache it for as long
        # Failed pings should be retried more frequently but not too rapidly
        # Use 3 seconds instead of 1 second to prevent flickering
        if not entry['is_online'] and age < 3.0:
            self._cache_hits += 1
            op_time = (time.time() - op_start) * 1000  # ms
            local_details.update({
                "status": "hit",
                "op_time_ms": op_time,
                "expiry": 3.0,  # offline hosts have 3s expiry (increased from 1s)
                "remaining_seconds": 3.0 - age
            })
            
            logger.info(f"[CACHE:{self._worker_id}] Local cache HIT for OFFLINE host {host_id} " 
                       f"(age: {age:.1f}s, remaining: {1.0 - age:.1f}s)")
            self._track_operation("local_hit_offline", host_id, local_details)
            return entry
            
        # Entry expired
        self._cache_misses += 1
        op_time = (time.time() - op_start) * 1000  # ms
        local_details.update({
            "status": "miss",
            "reason": "expired",
            "op_time_ms": op_time,
            "expiry": self.expiry_seconds if entry['is_online'] else 1.0
        })
        
        logger.info(f"[CACHE:{self._worker_id}] Local cache EXPIRED for host {host_id} "
                   f"(age: {age:.1f}s, type: {'online' if entry['is_online'] else 'offline'})")
        self._track_operation("local_expired", host_id, local_details)
        return None
    
    def clear(self) -> None:
        """Clear all cached ping results"""
        if self.redis:
            try:
                # Delete all keys with this prefix
                keys = self.redis.keys(f"{self.prefix}*")
                if keys:
                    self.redis.delete(*keys)
                logger.debug("Redis ping cache cleared")
            except Exception as e:
                logger.error(f"Error clearing Redis cache: {e}")
                
        # Clear local cache as well
        if hasattr(self, '_local_cache'):
            self._local_cache.clear()
            logger.debug("Local ping cache cleared")
    
    def _track_host_status_change(self, host_id: str, is_online: bool) -> None:
        """
        Track changes in host status for debugging.
        
        Args:
            host_id: ID of the host
            is_online: Whether the host is online
        """
        if not DEBUG_VERBOSE:
            return
            
        # Get previous status
        prev_status = self._host_status.get(host_id, {}).get('status')
        
        # Update current status
        self._host_status[host_id] = {
            'status': 'online' if is_online else 'offline',
            'last_update': time.time(),
            'worker_id': self._worker_id
        }
        
        # If status changed, record it
        current_status = 'online' if is_online else 'offline'
        if prev_status is not None and prev_status != current_status:
            change = {
                'host_id': host_id,
                'timestamp': time.time(),
                'from': prev_status,
                'to': current_status,
                'worker_id': self._worker_id
            }
            
            self._status_changes.append(change)
            if len(self._status_changes) > self._max_status_changes:
                self._status_changes.pop(0)
                
            logger.warning(f"[CACHE:{self._worker_id}] Host {host_id} status changed: {prev_status} -> {current_status}")
    
    def _add_timing_metric(self, operation_type: str, time_ms: float) -> None:
        """
        Add a timing metric for performance tracking.
        
        Args:
            operation_type: Type of operation (get, update, hit, miss)
            time_ms: Time in milliseconds
        """
        if operation_type in self._operation_times:
            self._operation_times[operation_type].append(time_ms)
            
            # Keep list size manageable
            if len(self._operation_times[operation_type]) > self._max_metrics_samples:
                self._operation_times[operation_type].pop(0)
    
    def _log_cache_statistics(self) -> None:
        """Log detailed cache statistics periodically"""
        logger.info(f"[CACHE:{self._worker_id}] === Cache Performance Statistics ===")
        
        # Overall hit/miss ratio
        total_requests = self._cache_hits + self._cache_misses
        hit_ratio = (self._cache_hits / total_requests * 100) if total_requests > 0 else 0
        
        logger.info(f"[CACHE:{self._worker_id}] Hit ratio: {hit_ratio:.1f}% ({self._cache_hits} hits, {self._cache_misses} misses)")
        logger.info(f"[CACHE:{self._worker_id}] Redis errors: {self._redis_errors}")
        
        # Performance metrics
        for op_type, times in self._operation_times.items():
            if times:
                avg_time = sum(times) / len(times)
                max_time = max(times)
                min_time = min(times)
                logger.info(f"[CACHE:{self._worker_id}] {op_type.capitalize()} performance: avg={avg_time:.2f}ms, min={min_time:.2f}ms, max={max_time:.2f}ms")

# Create a global singleton instance of the cache
ping_cache = PingCache(DEFAULT_CACHE_EXPIRY)


