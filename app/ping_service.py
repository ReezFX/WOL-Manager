from redis import Redis, ConnectionPool
from datetime import datetime
import json
from app.logging_config import get_logger

logger = get_logger('app.ping')

# This will be set by the application factory
redis_client = None

def update_redis_pool(pool):
    """Update Redis client to use connection pool"""
    global redis_client
    redis_client = Redis(connection_pool=pool)
    logger.info("Redis connection pool updated for ping service")


def _is_redis_available():
    if redis_client is None:
        logger.error("Redis client is not initialized in ping service")
        return False
    return True

def set_host_status(host_id, status, last_check=None):
    """
    Set the status for a host in Redis
    
    Args:
        host_id: The ID of the host
        status: The status ("online", "offline", or "unknown")
        last_check: Optional timestamp, defaults to current UTC time
    """
    if not _is_redis_available():
        return

    if last_check is None:
        last_check = datetime.utcnow().isoformat()
    
    key = f"host_status:{host_id}"
    data = {
        "status": status,
        "last_check": last_check
    }
    
    # Set the data and TTL in a pipeline for atomic operation
    try:
        pipe = redis_client.pipeline()
        pipe.set(key, json.dumps(data))
        pipe.expire(key, 60)  # 60 seconds TTL
        pipe.execute()
        logger.debug("Host status updated in Redis: host_id=%s status=%s", host_id, status)
    except Exception as e:
        logger.error(
            "Failed to set host status in Redis: host_id=%s status=%s error=%s",
            host_id,
            status,
            str(e),
            exc_info=True
        )

def get_host_status(host_id):
    """
    Get the status for a host from Redis
    
    Args:
        host_id: The ID of the host
        
    Returns:
        dict: Status data or None if not found
    """
    if not _is_redis_available():
        return {
            "status": "unknown",
            "last_check": None
        }

    key = f"host_status:{host_id}"
    try:
        data = redis_client.get(key)
    except Exception as e:
        logger.error(
            "Failed to read host status from Redis: host_id=%s error=%s",
            host_id,
            str(e),
            exc_info=True
        )
        return {
            "status": "unknown",
            "last_check": None
        }
    
    if data:
        try:
            logger.debug("Host status cache hit: host_id=%s", host_id)
            return json.loads(data)
        except Exception as e:
            logger.warning(
                "Invalid host status payload in Redis: host_id=%s error=%s",
                host_id,
                str(e)
            )
    
    logger.debug("Host status cache miss: host_id=%s", host_id)
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
    if not _is_redis_available():
        return {
            host_id: {"status": "unknown", "last_check": None}
            for host_id in host_ids
        }

    pipe = redis_client.pipeline()
    
    # Queue all get operations
    for host_id in host_ids:
        key = f"host_status:{host_id}"
        pipe.get(key)
    
    # Execute pipeline
    try:
        results = pipe.execute()
        logger.debug("Host status batch fetch executed: host_count=%s", len(host_ids))
    except Exception as e:
        logger.error(
            "Failed to read host statuses from Redis pipeline: count=%s error=%s",
            len(host_ids),
            str(e),
            exc_info=True
        )
        return {
            host_id: {"status": "unknown", "last_check": None}
            for host_id in host_ids
        }
    
    # Process results
    statuses = {}
    for host_id, data in zip(host_ids, results):
        if data:
            try:
                statuses[host_id] = json.loads(data)
            except Exception as e:
                logger.warning(
                    "Invalid host status payload in Redis pipeline: host_id=%s error=%s",
                    host_id,
                    str(e)
                )
                statuses[host_id] = {
                    "status": "unknown",
                    "last_check": None
                }
        else:
            statuses[host_id] = {
                "status": "unknown",
                "last_check": None
            }
    
    return statuses

