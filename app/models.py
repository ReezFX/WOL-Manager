from datetime import datetime
import enum
import re
from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, validates
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.types import TypeDecorator
import json

# Custom JSON type implementation for compatibility with different database backends
class JSONType(TypeDecorator):
    impl = Text

    def process_bind_param(self, value, dialect):
        if value is not None:
            value = json.dumps(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            value = json.loads(value)
        return value
from flask_login import UserMixin
from sqlalchemy.orm import scoped_session, sessionmaker

# Create a scoped session factory
db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False))
db = db_session

Base = declarative_base()

# Association table for Role-Permission relationship
role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True),
    Column('permission_id', Integer, ForeignKey('permissions.id'), primary_key=True)
)

# Association table for User-Role relationship
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('role_id', Integer, ForeignKey('roles.id'), primary_key=True)
)

class Permission(Base):
    __tablename__ = 'permissions'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(64), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(64), nullable=False, index=True)
    
    # Relationships
    roles = relationship('Role', secondary=role_permissions, back_populates='permissions')
    
    def __repr__(self):
        return f'<Permission {self.name}>'

class Role(Base):
    __tablename__ = 'roles'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(64), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    
    # Relationships
    permissions = relationship('Permission', secondary=role_permissions, back_populates='roles')
    users = relationship('User', secondary=user_roles, back_populates='roles')
    
    def __repr__(self):
        return f'<Role {self.name}>'

class User(Base, UserMixin):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    password_hash = Column(String(128), nullable=False)
    role = Column(String(20), default='user')  # Options: 'admin', 'user' - keeping for backward compatibility
    permissions = Column(JSONType, default=lambda: {})
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    hosts = relationship('Host', back_populates='created_by_user', cascade="all, delete-orphan")
    logs = relationship('Log', back_populates='user', cascade="all, delete-orphan")
    roles = relationship('Role', secondary=user_roles, back_populates='users')
    
    def __repr__(self):
        return f'<User {self.username}>'

    @property
    def is_admin(self):
        """Check if the user has admin role."""
        return self.role == 'admin' or any(role.name == 'admin' for role in self.roles)
    
    @validates('username')
    def validate_username(self, key, username):
        if not username:
            raise ValueError("Username cannot be empty")
        if len(username) < 3:
            raise ValueError("Username must be at least 3 characters long")
        return username
        
    def has_permission(self, permission_name):
        """Check if user has a specific permission either directly or through roles."""
        # Check direct permissions in the JSON field
        if self.permissions and permission_name in self.permissions:
            return self.permissions[permission_name]
            
        # Check permissions via roles
        for role in self.roles:
            if any(perm.name == permission_name for perm in role.permissions):
                return True
                
        # Admins have all permissions by default
        if self.is_admin:
            return True
            
        return False

class Host(Base):
    __tablename__ = 'hosts'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(64), nullable=False)
    mac_address = Column(String(17), nullable=False, index=True)  # Format: 00:11:22:33:44:55
    ip = Column(String(15), nullable=True)  # Optional IP address
    description = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    visible_to_roles = Column(JSONType, default=lambda: [])  # Array of role IDs that can view this host
    
    # Relationships
    created_by_user = relationship('User', back_populates='hosts')
    logs = relationship('Log', back_populates='host', cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<Host {self.name} ({self.mac_address})>'
    
    @validates('mac_address')
    def validate_mac_address(self, key, mac_address):
        # Check if the MAC address matches the format XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX
        pattern = r'^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$'
        if not re.match(pattern, mac_address):
            raise ValueError("Invalid MAC address format. Use XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX")
        return mac_address
    
    @validates('ip')
    def validate_ip(self, key, ip):
        if ip:
            # Simple IPv4 validation
            pattern = r'^(\d{1,3}\.){3}\d{1,3}$'
            if not re.match(pattern, ip):
                raise ValueError("Invalid IP address format")
            
            # Check if each octet is between 0 and 255
            octets = ip.split('.')
            for octet in octets:
                if not 0 <= int(octet) <= 255:
                    raise ValueError("IP address octets must be between 0 and 255")
        return ip
    
class Log(Base):
    __tablename__ = 'logs'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    host_id = Column(Integer, ForeignKey('hosts.id'), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    success = Column(Boolean, default=True)
    message = Column(Text, nullable=True)  # Optional additional information
    
    # Relationships
    user = relationship('User', back_populates='logs')
    host = relationship('Host', back_populates='logs')
    
    def __repr__(self):
        status = "Success" if self.success else "Failed"
        status = "Success" if self.success else "Failed"
        return f'<Log {status} - {self.user.username} -> {self.host.name} at {self.timestamp}>'

class AppSettings(Base):
    __tablename__ = 'app_settings'
    
    id = Column(Integer, primary_key=True)
    min_password_length = Column(Integer, default=8, nullable=False)
    require_special_characters = Column(Boolean, default=False, nullable=False)
    require_numbers = Column(Boolean, default=False, nullable=False)
    password_expiration_days = Column(Integer, default=90, nullable=False)
    session_timeout_minutes = Column(Integer, default=1440, nullable=False)  # Default 1 day (24 hours * 60 minutes)
    max_concurrent_sessions = Column(Integer, default=0, nullable=False)  # 0 means unlimited
    
    def __repr__(self):
        return f'<AppSettings id={self.id}>'
    
    @classmethod
    def get_settings(cls, db_session):
        """
        Get the current application settings.
        If no settings exist, create a default settings record.
        """
        settings = db_session.query(cls).first()
        if not settings:
            settings = cls()
            db_session.add(settings)
            db_session.commit()
        return settings


class LogLevel(enum.Enum):
    DEBUG = 'DEBUG'
    INFO = 'INFO'
    WARNING = 'WARNING'
    ERROR = 'ERROR'
    CRITICAL = 'CRITICAL'

class SystemLog(Base):
    __tablename__ = 'system_logs'
    
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    log_level = Column(String(10), nullable=False, index=True)  # Using string to store enum value
    source_module = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)  # Optional user reference
    log_metadata = Column(JSONType, nullable=True)  # Additional data in JSON format
    
    # Relationship
    user = relationship('User', backref='system_logs')
    
    @validates('log_level')
    def validate_log_level(self, key, log_level):
        """Validate log_level to ensure it's a valid LogLevel enum value."""
        try:
            return LogLevel(log_level).value
        except ValueError:
            valid_levels = ', '.join([level.value for level in LogLevel])
            raise ValueError(f"Invalid log level. Must be one of: {valid_levels}")
    
    def __repr__(self):
        user_info = f"User:{self.user_id}" if self.user_id else "No User"
        metadata_preview = str(self.log_metadata)[:30] + "..." if self.log_metadata else "No metadata"
        return f'<SystemLog [{self.log_level}] {self.timestamp} | {self.source_module} | {user_info} | {self.message[:50]} | {metadata_preview}>'

class AuthLog(Base):
    __tablename__ = 'auth_logs'
    
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)  # Nullable for failed login attempts
    event_type = Column(String(50), nullable=False, index=True)  # login, logout, password_change, etc.
    ip_address = Column(String(45), nullable=True)  # Support IPv6 addresses
    user_agent = Column(Text, nullable=True)
    success = Column(Boolean, default=True)
    details = Column(JSONType, nullable=True)  # Additional details as JSON
    
    # Relationship
    user = relationship('User', backref='auth_logs')
    
    def __repr__(self):
        status = "Success" if self.success else "Failed"
        return f'<AuthLog [{status}] {self.event_type} at {self.timestamp} - User ID: {self.user_id}>'
