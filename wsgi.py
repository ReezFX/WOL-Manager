from app import create_app, db_session
from app.models import Base
import click
import os

app = create_app()

@app.cli.command("init-db")
def init_db():
    """Initialize the database directly from SQLAlchemy metadata.
    
    This command creates all tables defined in the SQLAlchemy models
    without requiring Flask-Migrate or alembic to be configured.
    """
    try:
        # Create instance directory if it doesn't exist
        instance_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance')
        if not os.path.exists(instance_dir):
            os.makedirs(instance_dir)
            click.echo(f"Created instance directory: {instance_dir}")
        
        # Get database URI from config
        db_uri = app.config.get('SQLALCHEMY_DATABASE_URI')
        click.echo(f"Using database: {db_uri}")
        
        # Create all tables
        from sqlalchemy import create_engine, text
        engine = create_engine(db_uri)
        Base.metadata.create_all(bind=engine)
        
        # Verify database connection
        db_session.execute(text("SELECT 1")).scalar()
        
        click.echo("Database initialized successfully. Tables created.")
    except Exception as e:
        click.echo(f"Error initializing database: {str(e)}", err=True)
        raise

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
