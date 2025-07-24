import os
from datetime import timedelta

class Config:
    """Base configuration class"""
    
    # Security
    SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-this-for-production')
    
    # Database
    DATABASE_PATH = os.environ.get('DATABASE_PATH', 'tuxchat.db')
    
    # Encryption
    ENCRYPTION_KEY_PATH = os.environ.get('ENCRYPTION_KEY_PATH', 'encryption.key')
    
    # JWT Settings
    JWT_EXPIRATION_DELTA = timedelta(days=7)
    
    # File Upload Settings
    MAX_CONTENT_LENGTH = 1024 * 1024  # 1MB
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    
    # Rate Limiting
    RATELIMIT_STORAGE_URL = os.environ.get('RATELIMIT_STORAGE_URL', 'memory://')
    
    # CORS Settings
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    
    # Override with more secure defaults for production
    SECRET_KEY = os.environ.get('SECRET_KEY')  # Must be set in production
    
    if not SECRET_KEY:
        raise ValueError("SECRET_KEY environment variable must be set in production")

class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = True
    TESTING = True
    DATABASE_PATH = ':memory:'  # Use in-memory database for testing

# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}