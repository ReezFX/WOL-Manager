"""
Update checker module for WOL-Manager.
Compares local version with GitHub repository version and provides update notifications.
"""

import os
import threading
import time
from typing import Dict, Optional, Tuple
import requests
from packaging import version
from app.logging_config import get_logger

logger = get_logger('app.update_checker')

class UpdateChecker:
    """Handles version checking and update notifications."""
    
    def __init__(self, github_repo: str = "ReezFX/WOL-Manager", check_interval: int = 3600):
        """
        Initialize the update checker.
        
        Args:
            github_repo: GitHub repository in format "owner/repo"
            check_interval: Time in seconds between update checks (default: 1 hour)
        """
        self.github_repo = github_repo
        self.check_interval = check_interval
        self.local_version = None
        self.remote_version = None
        self.update_available = False
        self.last_check = 0
        self.check_error = None
        self._lock = threading.Lock()
        
        # Load local version on initialization
        self._load_local_version()
        
        # Start background update checker
        self._start_background_checker()
    
    def _load_local_version(self) -> None:
        """Load the local version from VERSION file."""
        try:
            version_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'VERSION')
            if os.path.exists(version_file):
                with open(version_file, 'r', encoding='utf-8') as f:
                    self.local_version = f.read().strip()
                logger.info(f"Loaded local version: {self.local_version}")
            else:
                logger.warning("VERSION file not found")
                self.local_version = "unknown"
        except Exception as e:
            logger.error(f"Failed to load local version: {str(e)}")
            self.local_version = "unknown"
    
    def _fetch_remote_version(self) -> Optional[str]:
        """
        Fetch the latest version from GitHub VERSION file.
        
        Returns:
            Latest version string or None if failed
        """
        try:
            version_url = "https://raw.githubusercontent.com/ReezFX/WOL-Manager/refs/heads/main/VERSION"
            logger.info(f"Fetching remote version from: {version_url}")
            
            response = requests.get(version_url, timeout=10)
            
            if response.status_code == 200:
                remote_version = response.text.strip()
                logger.info(f"Successfully fetched remote version: {remote_version}")
                return remote_version
            else:
                logger.warning(f"Failed to fetch VERSION file. Status code: {response.status_code}")
                return None
            
        except requests.RequestException as e:
            logger.error(f"Network error while fetching remote version: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error fetching remote version: {str(e)}")
            return None
    
    def _compare_versions(self, local_ver: str, remote_ver: str) -> bool:
        """
        Compare local and remote versions.
        
        Args:
            local_ver: Local version string
            remote_ver: Remote version string
            
        Returns:
            True if remote version is newer, False otherwise
        """
        try:
            local_version_obj = version.parse(local_ver)
            remote_version_obj = version.parse(remote_ver)
            
            is_newer = remote_version_obj > local_version_obj
            logger.info(f"Version comparison: {local_ver} vs {remote_ver} - Update available: {is_newer}")
            return is_newer
            
        except Exception as e:
            logger.error(f"Error comparing versions {local_ver} vs {remote_ver}: {str(e)}")
            return False
    
    def check_for_updates(self) -> Dict[str, any]:
        """
        Check for updates and return status information.
        
        Returns:
            Dictionary with update status information
        """
        with self._lock:
            current_time = time.time()
            
            # Skip check if recently checked (unless forced)
            if current_time - self.last_check < self.check_interval:
                return self.get_status()
            
            logger.info("Checking for updates...")
            self.check_error = None
            
            try:
                # Reload local version in case it changed
                self._load_local_version()
                
                # Fetch remote version
                remote_ver = self._fetch_remote_version()
                
                if remote_ver:
                    self.remote_version = remote_ver
                    
                    # Compare versions
                    if self.local_version != "unknown":
                        self.update_available = self._compare_versions(self.local_version, self.remote_version)
                    else:
                        self.update_available = False
                        
                    self.last_check = current_time
                    logger.info(f"Update check completed. Update available: {self.update_available}")
                else:
                    self.check_error = "Failed to fetch remote version"
                    logger.warning("Update check failed: Could not fetch remote version")
                    
            except Exception as e:
                self.check_error = str(e)
                logger.error(f"Update check failed: {str(e)}")
            
            return self.get_status()
    
    def get_status(self) -> Dict[str, any]:
        """
        Get current update status.
        
        Returns:
            Dictionary with current status information
        """
        return {
            'local_version': self.local_version,
            'remote_version': self.remote_version,
            'update_available': self.update_available,
            'last_check': self.last_check,
            'check_error': self.check_error,
            'github_repo': self.github_repo
        }
    
    def force_check(self) -> Dict[str, any]:
        """
        Force an immediate update check regardless of check interval.
        
        Returns:
            Dictionary with update status information
        """
        with self._lock:
            current_time = time.time()
            
            logger.info("Force checking for updates...")
            self.check_error = None
            
            try:
                # Reload local version in case it changed
                self._load_local_version()
                
                # Fetch remote version
                remote_ver = self._fetch_remote_version()
                
                if remote_ver:
                    self.remote_version = remote_ver
                    
                    # Compare versions
                    if self.local_version != "unknown":
                        self.update_available = self._compare_versions(self.local_version, self.remote_version)
                    else:
                        self.update_available = False
                        
                    self.last_check = current_time
                    logger.info(f"Force update check completed. Update available: {self.update_available}")
                else:
                    self.check_error = "Failed to fetch remote version"
                    logger.warning("Force update check failed: Could not fetch remote version")
                    
            except Exception as e:
                self.check_error = str(e)
                logger.error(f"Force update check failed: {str(e)}")
            
            return self.get_status()
    
    def _background_check(self) -> None:
        """Background thread function for periodic update checks."""
        while True:
            time.sleep(self.check_interval)
            try:
                # Skip check if one was performed recently
                if time.time() - self.last_check < self.check_interval:
                    continue
                
                self.check_for_updates()
            except Exception as e:
                logger.error(f"Error in background update checker: {str(e)}")
                # Wait a bit before retrying to avoid spinning
                time.sleep(60)
    
    def _start_background_checker(self) -> None:
        """Start the background update checker thread."""
        try:
            check_thread = threading.Thread(target=self._background_check, daemon=True)
            check_thread.start()
            logger.info("Background update checker started")
        except Exception as e:
            logger.error(f"Failed to start background update checker: {str(e)}")


# Global update checker instance
_update_checker_instance: Optional[UpdateChecker] = None

def get_update_checker() -> UpdateChecker:
    """Get the global update checker instance."""
    global _update_checker_instance
    if _update_checker_instance is None:
        _update_checker_instance = UpdateChecker()
    return _update_checker_instance

def init_update_checker(github_repo: str = "ReezFX/WOL-Manager", check_interval: int = 3600) -> UpdateChecker:
    """
    Initialize the global update checker instance.
    
    Args:
        github_repo: GitHub repository in format "owner/repo"
        check_interval: Time in seconds between update checks
        
    Returns:
        UpdateChecker instance
    """
    global _update_checker_instance
    _update_checker_instance = UpdateChecker(github_repo, check_interval)
    return _update_checker_instance
