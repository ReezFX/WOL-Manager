from redis import Redis, ConnectionPool
from datetime import datetime
import json

# This will be set by the application factory
redis_client = None

def update_redis_pool(pool):
    """Update Redis client to use connection pool"""
    global redis_client
    redis_client = Redis(connection_pool=pool)

def set_host_status(host_id, status, last_check=None):
    """
    Set the status for a host in Redis
    
    Args:
        host_id: The ID of the host
        status: The status ("online", "offline", or "unknown")
        last_check: Optional timestamp, defaults to current UTC time
    """
    if last_check is None:
        last_check = datetime.utcnow().isoformat()
    
    key = f"host_status:{host_id}"
    data = {
        "status": status,
        "last_check": last_check
    }
    
    # Set the data and TTL in a pipeline for atomic operation
    pipe = redis_client.pipeline()
    pipe.set(key, json.dumps(data))
    pipe.expire(key, 60)  # 60 seconds TTL
    pipe.execute()

def get_host_status(host_id):
    """
    Get the status for a host from Redis
    
    Args:
        host_id: The ID of the host
        
    Returns:
        dict: Status data or None if not found
    """
    key = f"host_status:{host_id}"
    data = redis_client.get(key)
    
    if data:
        return json.loads(data)
    
    return {
        "status": "unknown",
        "last_check": None
    }

def get_all_host_statuses(host_ids):
    """
    Get statuses for multiple hosts efficiently using pipeline
    
    Args:
        host_ids: List of host IDs
        
    Returns:
        dict: Mapping of host_id to status data
    """
    pipe = redis_client.pipeline()
    
    # Queue all get operations
    for host_id in host_ids:
        key = f"host_status:{host_id}"
        pipe.get(key)
    
    # Execute pipeline
    results = pipe.execute()
    
    # Process results
    statuses = {}
    for host_id, data in zip(host_ids, results):
        if data:
            statuses[host_id] = json.loads(data)
        else:
            statuses[host_id] = {
                "status": "unknown",
                "last_check": None
            }
    
    return statuses

