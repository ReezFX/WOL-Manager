"""
Compatibility layer for Werkzeug 3.x with older Flask extensions.

This module provides compatibility functions for working with 
Flask extensions that still rely on deprecated Werkzeug imports.
"""

import sys
import importlib
from werkzeug import __version__ as werkzeug_version


def patch_werkzeug_for_flask_login():
    """
    Apply patches to make Flask-Login work with Werkzeug 3.x.
    
    Werkzeug 3.x removed several modules and moved functions to different locations.
    This function creates compatibility layers to support older Flask extensions.
    """
    major_version = int(werkzeug_version.split('.')[0])
    
    if major_version >= 3:
        # Create a fake werkzeug.urls module with the required functions
        if 'werkzeug.urls' not in sys.modules:
            # In Werkzeug 3.x, url_decode is in datastructures
            from werkzeug.datastructures import url_decode as new_url_decode
            
            # Create a fake werkzeug.urls module
            class UrlsModule:
                url_decode = new_url_decode
                
            # Add the module to sys.modules
            sys.modules['werkzeug.urls'] = UrlsModule()
            
            # Log that we've applied the patch
            print("Applied Werkzeug 3.x compatibility patch for Flask-Login")

