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

# Get the database URL from Flask config if available
try:
    config.set_main_option('sqlalchemy.url', current_app.config.get('SQLALCHEMY_DATABASE_URI').replace('%', '%%'))
except Exception as e:
    # If Flask current_app is not available, try to get the URL from app config
    from app.config import Config
    config.set_main_option('sqlalchemy.url', Config.SQLALCHEMY_DATABASE_URI.replace('%', '%%'))
    logger.info("Using database URL from app.config.Config")

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
