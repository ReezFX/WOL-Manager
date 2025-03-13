from __future__ import with_statement

import logging
import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool, create_engine

from flask import current_app
from alembic import context

# Import the SQLAlchemy components from the app
from app.models import Base
from app import db_session

def get_engine():
    """Get the database engine.
    
    Returns:
        The SQLAlchemy engine connected to the database.
    
    Handles different configurations:
    - When db is available as SQLAlchemy instance with get_engine() method
    - When db is available as SQLAlchemy instance with engine attribute
    - When db is a MetaData object
    - When no Flask application context is available
    """
    try:
        # Try to get the engine from the SQLAlchemy instance
        return current_app.extensions['migrate'].db.get_engine()
    except (AttributeError, KeyError):
        try:
            # Try to access the engine attribute directly
            return current_app.extensions['migrate'].db.engine
        except (AttributeError, KeyError):
            try:
                # Check if db is a MetaData object
                if hasattr(current_app.extensions['migrate'].db, 'bind'):
                    return current_app.extensions['migrate'].db.bind
                
                # If we have a MetaData object but no engine, use the configuration
                return create_engine(current_app.config['SQLALCHEMY_DATABASE_URI'])
            except (AttributeError, KeyError):
                # If no Flask context or no migrate extension, use session binding
                if db_session.bind:
                    return db_session.bind
                
                # Fallback to config
                from app.config import Config
                return create_engine(Config.SQLALCHEMY_DATABASE_URI)

def get_engine_url():
    """Get the database URL from the engine.
    
    Returns:
        str: The database URL formatted for Alembic.
    """
    try:
        url = get_engine().url
        if hasattr(url, 'render_as_string'):
            # SQLAlchemy 1.4+ uses URL objects with render_as_string method
            return url.render_as_string(hide_password=False).replace('%', '%%')
        else:
            # SQLAlchemy 1.3 and earlier uses string URLs
            return str(url).replace('%', '%%')
    except Exception as e:
        logger = logging.getLogger('alembic.env')
        logger.warning(f"Error getting engine URL: {e}")
        # Fallback to config
        from app.config import Config
        return Config.SQLALCHEMY_DATABASE_URI.replace('%', '%%')

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
try:
    fileConfig(config.config_file_name)
except Exception as e:
    # Handle missing formatters section in config file
    logging.basicConfig(format='%(levelname)s: %(message)s', level=logging.INFO)
    logger = logging.getLogger('alembic.env')
    logger.warning("Error loading config file for logging configuration: %s", e)

logger = logging.getLogger('alembic.env')

# Get the database URL using the get_engine_url function
config.set_main_option('sqlalchemy.url', get_engine_url())
logger.info("Using database URL from engine")

# Add your model's MetaData object here for 'autogenerate' support
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.

def process_revision_directives(context, revision, directives):
    """This callback is used to prevent an auto-migration from being generated
    when there are no changes to the schema.
    Reference: http://alembic.zzzcomputing.com/en/latest/cookbook.html
    """
    if getattr(config.cmd_opts, 'autogenerate', False):
        script = directives[0]
        if script.upgrade_ops.is_empty():
            directives[:] = []
            logger.info('No changes in schema detected.')

def run_migrations_offline():
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        process_revision_directives=process_revision_directives
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            process_revision_directives=process_revision_directives
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
