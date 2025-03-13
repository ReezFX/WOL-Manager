"""
Ping Cache Module for WOL-Manager

This module provides caching for ping results to reduce unnecessary network traffic
and provide a more stable UI experience by storing successful ping results for a period of time.
Uses Redis as a backend for shared caching across Gunicorn workers.
"""

import os
import time
import json
import redis
import socket
import traceback
from typing import Dict, Optional, List, Any
from app.logging_config import get_logger

# Initialize module-level logger
logger = get_logger('app.ping_cache')


# Default cache expiration time in seconds
DEFAULT_CACHE_EXPIRY = 15  
# Default Redis cache key prefix
DEFAULT_CACHE_PREFIX = "ping_cache:"
# Maximum number of hosts to track in detailed debug output
MAX_DEBUG_HOSTS = 10
# Debug flag to enable super verbose logging
DEBUG_VERBOSE = False
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
        
        try:
            # Detailed connection info
            self.redis = redis.from_url(redis_url)
            connection_info = self._get_redis_info() or {}
            
            # Test connection
            ping_result = self.redis.ping()
            
            logger.info(f"Redis connection successful: {redis_url}")
            logger.debug(f"Redis server info: {connection_info.get('redis_version', 'unknown')} on {connection_info.get('os', 'unknown')}")
                
        except redis.ConnectionError as e:
            self.redis = None
            # Fallback to in-memory cache if Redis is not available
            self._local_cache: Dict[str, Dict] = {}
            
            # Track error
            self._redis_errors += 1
            logger.warning(f"Redis connection failed, using local cache fallback: {str(e)}")
            logger.debug(f"Redis connection error details: {traceback.format_exc()}")
    
    def _get_redis_info(self) -> Optional[Dict]:
        """Get Redis server information for debugging purposes"""
        try:
            if self.redis:
                return self.redis.info()
            return None
        except Exception as e:
            logger.debug(f"Error getting Redis info: {str(e)}")
            return None
            
    def _track_operation(self, op_type: str, host_id: str, details: Dict) -> None:
        """Track a cache operation for debugging purposes"""
        if op_type == "error":
            logger.error(f"Cache {op_type} for host {host_id}: {details.get('error', 'Unknown error')}")
        elif "slow_operation" in details and details["slow_operation"]:
            logger.warning(f"Slow cache {op_type} for host {host_id}: {details.get('op_time_ms', 0):.2f}ms")
        elif DEBUG_VERBOSE:
            logger.debug(f"Cache {op_type} for host {host_id}: {details}")
    
    def _log_operation_summary(self) -> None:
        """Log a summary of recent cache operations"""
        current_time = time.time()
        if current_time - self._last_stats_time > CACHE_STATS_INTERVAL:
            hits_ratio = 0
            total_ops = self._cache_hits + self._cache_misses
            if total_ops > 0:
                hits_ratio = (self._cache_hits / total_ops) * 100
                
            logger.info(f"Cache stats: {self._cache_hits} hits, {self._cache_misses} misses "
                       f"({hits_ratio:.1f}% hit ratio), {self._redis_errors} Redis errors")
            self._last_stats_time = current_time
    
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
        
        return key
        
    def update(self, host_id: str, is_online: bool, response_time: Optional[float] = None,
               error: Optional[str] = None) -> None:
        """Update the cache with a ping result.
        
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
        # Use a longer expiry for online hosts, shorter for offline hosts
        # For online hosts, use the full expiry time
        # For offline hosts, use a slightly longer expiry (3 seconds instead of 1) 
        # to prevent rapid flipping between states
        expiry = self.expiry_seconds if is_online else 3
        
        
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
        
        
        if self.redis:
            try:
                # Store in Redis as JSON
                key = self._get_key(host_id)
                json_data = json.dumps(data)
                
                # Log the exact data being stored
                
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
                
                logger.debug(f"Cache update: host={host_id}, online={is_online}, response_time={response_time}ms, expiry={expiry}s")
                
                
                # Track this host's status change if any
                # Track this host's status change if any
                self._track_host_status_change(host_id, is_online)
                if op_time > SLOW_OPERATION_THRESHOLD:
                    update_details["slow_operation"] = True
                    logger.warning(f"Slow cache update for host {host_id}: {op_time:.2f}ms (threshold: {SLOW_OPERATION_THRESHOLD}ms)")
                # Verify the key was set correctly
                try:
                    ttl = self.redis.ttl(key)
                    exists = self.redis.exists(key)
                    update_details["ttl_check"] = ttl
                    update_details["exists_check"] = exists
                    
                except Exception as e:
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
                
                logger.error(f"Redis error during cache update for host {host_id}: {str(e)}")
                logger.debug(f"Redis error details: {traceback.format_exc()}")
                
                
                # Fallback to local cache
                if hasattr(self, '_local_cache'):
                    # Using local cache fallback for host
                    self._local_cache[host_id] = data
                    update_details["fallback"] = "local_cache"
        else:
            # Use local cache if Redis is not available
            self._local_cache[host_id] = data
            op_time = (time.time() - op_start) * 1000  # ms
            logger.debug(f"Local cache update: host={host_id}, online={is_online}, response_time={response_time}ms")
            
            update_details.update({
                "status": "success",
                "storage": "local_cache",
                "op_time_ms": op_time
            })
            
        
    
    def get(self, host_id: str) -> Optional[Dict]:
        """
        Get cached ping result for a host if available and not expired.
        
        Args:
            host_id: ID of the host
            
        Returns:
            Dict with ping status or None if not cached or expired
        """
            
        # Debug info for get operation
        op_start = time.time()
        get_details = {
            "host_id": host_id,
            "worker_id": self._worker_id,
            "operation": "get"
        }
        
        
        if self.redis:
            try:
                # Try to get from Redis
                key = self._get_key(host_id)
                get_details["redis_key"] = key
                
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
                    
                    logger.debug(f"Cache hit: host={host_id}, online={entry['is_online']}, age={age:.1f}s")
                    
                    # Increment hit counter
                    self._cache_hits += 1
                    
                    # Get TTL for the key
                    try:
                        ttl = self.redis.ttl(key)
                        get_details["ttl_remaining"] = ttl
                        
                        # Warn if TTL is lower than expected
                        expected_ttl = self.expiry_seconds if entry['is_online'] else 3
                        if ttl < 0 or ttl < expected_ttl / 2:
                            get_details["ttl_warning"] = f"TTL ({ttl}) lower than expected ({expected_ttl})"
                    except:
                        pass
                    
                    # Log the cache hit with detailed info
                    if entry['is_online']:
                        # Track timing metrics for cache hits
                        self._add_timing_metric("hit", op_time)
                    else:
                        # Track timing metrics for offline cache hits 
                        self._add_timing_metric("hit", op_time)
                    
                    
                    return entry
                else:
                    # Cache miss
                    self._cache_misses += 1
                    get_details.update({
                        "status": "miss",
                        "reason": "key_not_found"
                    })
                    
                    logger.debug(f"Cache miss: host={host_id}, key not found")
                    
                    
                    # Track timing metrics for cache misses
                    self._add_timing_metric("miss", op_time)
                    
                    # Check if this is a first-time request or if we've seen this host before
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
                
                logger.error(f"Redis error during cache get for host {host_id}: {str(e)}")
                logger.debug(f"Redis error details: {traceback.format_exc()}")
                
                
                
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
            
            
            
            return self._get_from_local_cache(host_id)
    
    def _get_from_local_cache(self, host_id: str) -> Optional[Dict]:
        """Get cached ping result from local cache.
        
        This method attempts to retrieve ping results for a specific host from the local
        in-memory cache. It handles cache hits, misses, and expiration logic differently
        based on whether the host was previously found to be online or offline.
        
        Args:
            host_id: ID of the host to lookup in the cache
            
        Returns:
            Dict with ping status information if the host is found in cache and not expired,
            or None if the host is not in cache or the entry has expired
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
            return entry
        
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
            
            # Local cache hit for offline host
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
        
        # Local cache expired for host
        return None
    
    def clear(self) -> None:
        """Clear all cached ping results"""
        logger.info("Clearing ping cache")
        if self.redis:
            try:
                # Delete all keys with this prefix
                keys = self.redis.keys(f"{self.prefix}*")
                if keys:
                    self.redis.delete(*keys)
                    logger.info(f"Redis ping cache cleared: {len(keys)} keys removed")
                else:
                    logger.info("Redis ping cache was already empty")
            except Exception as e:
                # Error clearing Redis cache
                logger.error(f"Error clearing Redis cache: {str(e)}")
                
        # Clear local cache as well
        if hasattr(self, '_local_cache'):
            entry_count = len(self._local_cache)
            self._local_cache.clear()
            logger.info(f"Local ping cache cleared: {entry_count} entries removed")
    
    def _track_host_status_change(self, host_id: str, is_online: bool) -> None:
        """
        Track changes in host status for debugging.
        
        Args:
            host_id: ID of the host
            is_online: Whether the host is online
        """
        prev_status = self._host_status.get(host_id)
        if prev_status is not None and prev_status != is_online:
            status_str = "online" if is_online else "offline"
            prev_status_str = "online" if prev_status else "offline"
            logger.info(f"Host {host_id} status change: {prev_status_str} -> {status_str}")
            
            # Record the status change
            self._status_changes.append({
                "host_id": host_id,
                "timestamp": time.time(),
                "from": prev_status,
                "to": is_online
            })

    def _add_timing_metric(self, operation_type: str, time_ms: float) -> None:
        """
        Add a timing metric for performance tracking.
        
        Args:
            operation_type: Type of operation (get, update, hit, miss)
            time_ms: Time in milliseconds
        """
        # Empty method as logging functionality is removed
        pass
    
    def _log_cache_statistics(self) -> None:
        """Gather detailed cache statistics periodically"""
        # Empty method as logging functionality is removed
        pass
# Create a global singleton instance of the cache
ping_cache = PingCache(DEFAULT_CACHE_EXPIRY)


