"""
Ping Cache Module for WOL-Manager

This module provides caching for ping results to reduce network traffic
and provide a stable UI experience by storing successful ping results for a period of time.
Uses Redis as a backend with local cache fallback.
"""

import os
import time
import json
import redis
from typing import Dict, Optional, Any
from app.logging_config import get_logger
# Initialize module-level logger
logger = get_logger('app.ping_cache')

# Default cache expiration time in seconds
DEFAULT_CACHE_EXPIRY = 15  
# Default Redis cache key prefix
DEFAULT_CACHE_PREFIX = "ping_cache:"

class PingCache:
    """
    Cache for storing ping results with timestamps.
    Successful pings are remembered for at least the cache_expiry duration.
    Uses Redis as a backend with local cache fallback.
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
        
        # Initialize Redis connection
        redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
        
        try:
            self.redis = redis.from_url(redis_url)
            self.redis.ping()  # Test connection
            logger.debug(f"Redis connection successful: {redis_url}")
        except Exception as e:
            self.redis = None
            # Fallback to in-memory cache if Redis is not available
            self._local_cache: Dict[str, Dict[str, Any]] = {}
    
    def _get_key(self, host_id: str) -> str:
        """
        Get the Redis key for a host_id.
        
        Args:
            host_id: ID of the host
            
        Returns:
            Redis key string
        """
        # Ensure the host_id is consistently a string and normalized
        normalized_id = str(host_id).strip()
        return f"{self.prefix}{normalized_id}"
    
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
        # Use a longer expiry for online hosts, shorter for offline hosts to prevent rapid flipping
        expiry = self.expiry_seconds if is_online else 3
        
        if self.redis:
            try:
                # Store in Redis as JSON
                key = self._get_key(host_id)
                json_data = json.dumps(data)
                self.redis.setex(key, expiry, json_data)
                
                # Log significant updates (slow response times)
                if response_time is not None and response_time > 100:
                    logger.debug(f"Cache update: host={host_id}, online={is_online}, response_time={response_time}ms")
                
            except Exception as e:
                logger.error(f"Redis error during cache update for host {host_id}: {str(e)}")
                
                # Fallback to local cache
                if hasattr(self, '_local_cache'):
                    self._local_cache[host_id] = data
        else:
            # Use local cache if Redis is not available
            self._local_cache[host_id] = data
            
            # Log significant updates
            if response_time is not None and response_time > 100:
                logger.debug(f"Local cache update: host={host_id}, online={is_online}, response_time={response_time}ms")
        
    
    def get(self, host_id: str) -> Optional[Dict]:
        """
        Get cached ping result for a host if available and not expired.
        
        Args:
            host_id: ID of the host
            
        Returns:
            Dict with ping status or None if not cached or expired
        """
        if self.redis:
            try:
                # Try to get from Redis
                key = self._get_key(host_id)
                data = self.redis.get(key)
                
                if data:
                    # Parse the JSON data
                    entry = json.loads(data)
                    return entry
                else:
                    # Cache miss
                    return None
            except Exception as e:
                logger.error(f"Redis error during cache lookup for host {host_id}: {str(e)}")
                # Fallback to local cache
                return self._get_from_local_cache(host_id)
        else:
            # Use local cache if Redis is not available
            return self._get_from_local_cache(host_id)
    
    def _get_from_local_cache(self, host_id: str) -> Optional[Dict]:
        """Get cached ping result from local cache.
        
        Args:
            host_id: ID of the host to lookup in the cache
            
        Returns:
            Dict with ping status information if the host is found in cache and not expired,
            or None if the host is not in cache or the entry has expired
        """
        if not hasattr(self, '_local_cache') or host_id not in self._local_cache:
            return None
        
        entry = self._local_cache[host_id]
        
        # Calculate how old the entry is
        age = time.time() - entry['timestamp']
        
        # If entry is a successful ping and hasn't expired, return it
        if entry['is_online'] and age < self.expiry_seconds:
            return entry
        
        # If the entry is a failed ping, use shorter expiry time
        if not entry['is_online'] and age < 3.0:
            return entry
        
        # Entry expired
        return None
    
    def clear(self) -> None:
        """Clear all cached ping results"""
        if self.redis:
            try:
                # Delete all keys with this prefix
                keys = self.redis.keys(f"{self.prefix}*")
                if keys:
                    self.redis.delete(*keys)
            except Exception as e:
                logger.error(f"Error clearing Redis cache: {str(e)}")
                
        # Clear local cache as well
        if hasattr(self, '_local_cache'):
            self._local_cache.clear()
    
# Create a global singleton instance of the cache
ping_cache = PingCache(DEFAULT_CACHE_EXPIRY)


