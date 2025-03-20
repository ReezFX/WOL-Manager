import asyncio
import platform
from datetime import datetime
from app.models import Host
from app import db_session
from app.ping_service import set_host_status
from app.logging_config import get_logger
import subprocess
import asyncio
from concurrent.futures import ThreadPoolExecutor

logger = get_logger('app.async_ping')

async def ping_host(ip_address, timeout=2):
    """
    Ping a host asynchronously
    
    Args:
        ip_address: The IP address to ping
        timeout: Timeout in seconds (default: 2)
        
    Returns:
        bool: True if host is online, False otherwise
    """
    try:
        # Different ping command based on OS
        if platform.system().lower() == "windows":
            ping_cmd = ['ping', '-n', '1', '-w', str(timeout * 1000), ip_address]
        else:
            ping_cmd = ['ping', '-c', '1', '-W', str(timeout), ip_address]
        
        # Run ping command in a thread pool to not block
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as pool:
            result = await loop.run_in_executor(
                pool,
                lambda: subprocess.run(ping_cmd, 
                                     stdout=subprocess.PIPE, 
                                     stderr=subprocess.PIPE,
                                     timeout=timeout)
            )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, subprocess.SubprocessError) as e:
        logger.debug(f"Ping failed for {ip_address}: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Error pinging {ip_address}: {str(e)}")
        return False

async def check_hosts():
    """Check status of all hosts and update Redis"""
    try:
        # Get all hosts from database
        hosts = db_session.query(Host).all()
        
        # Create tasks for all hosts with IP addresses
        ping_tasks = []
        for host in hosts:
            if host.ip:
                task = asyncio.create_task(ping_host(host.ip))
                ping_tasks.append((host, task))
        
        # Wait for all pings to complete
        for host, task in ping_tasks:
            try:
                is_online = await task
                status = "online" if is_online else "offline"
                set_host_status(host.id, status)
                logger.debug(f"Host {host.name} ({host.ip}) status: {status}")
            except Exception as e:
                logger.error(f"Error checking host {host.name}: {str(e)}")
                set_host_status(host.id, "unknown")
        
    except Exception as e:
        logger.error(f"Error in check_hosts: {str(e)}")

async def ping_service():
    """Main ping service loop"""
    logger.info("Starting ping service")
    while True:
        try:
            await check_hosts()
            await asyncio.sleep(30)  # Wait 30 seconds before next check
        except Exception as e:
            logger.error(f"Error in ping service loop: {str(e)}")
            await asyncio.sleep(5)  # Wait 5 seconds on error before retry

def start_ping_service():
    """Start the ping service in the background"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.create_task(ping_service())
    loop.run_forever()

