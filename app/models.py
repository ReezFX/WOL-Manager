from datetime import datetime
import re
from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, validates
from flask_login import UserMixin

Base = declarative_base()

class User(Base, UserMixin):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    password_hash = Column(String(128), nullable=False)
    role = Column(String(20), default='user')  # Options: 'admin', 'user'
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    hosts = relationship('Host', back_populates='created_by_user', cascade="all, delete-orphan")
    logs = relationship('Log', back_populates='user', cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<User {self.username}>'

    @property
    def is_admin(self):
        """Check if the user has admin role."""
        return self.role == 'admin'
    
    @validates('username')
    def validate_username(self, key, username):
        if not username:
            raise ValueError("Username cannot be empty")
        if len(username) < 3:
            raise ValueError("Username must be at least 3 characters long")
        return username

class Host(Base):
    __tablename__ = 'hosts'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(64), nullable=False)
    mac_address = Column(String(17), nullable=False, index=True)  # Format: 00:11:22:33:44:55
    ip = Column(String(15), nullable=True)  # Optional IP address
    description = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
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
        return f'<Log {status} - {self.user.username} -> {self.host.name} at {self.timestamp}>'

