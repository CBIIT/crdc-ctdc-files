"""Gunicorn configuration for production deployment."""
import multiprocessing
import os

# Server socket
bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
backlog = 2048

# Worker processes
workers = int(os.getenv('GUNICORN_WORKERS', multiprocessing.cpu_count() * 2 + 1))
worker_class = 'uvicorn.workers.UvicornWorker'
worker_connections = 1000
max_requests = 10000
max_requests_jitter = 1000
timeout = 300  # Longer timeout for file streaming
keepalive = 5

# Logging
accesslog = '-'  # Log to stdout
errorlog = '-'   # Log to stderr
loglevel = os.getenv('LOG_LEVEL', 'info').lower()
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = 'gen3-file-proxy'

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# SSL (if needed)
# keyfile = '/path/to/key.pem'
# certfile = '/path/to/cert.pem'

# Preload app for better performance
preload_app = True

# Graceful timeout for shutdown
graceful_timeout = 30


def on_starting(server):
    """Called just before the master process is initialized."""
    server.log.info("Starting Gen3 File Proxy Service")


def on_reload(server):
    """Called to recycle workers during a reload."""
    server.log.info("Reloading workers")


def when_ready(server):
    """Called just after the server is started."""
    server.log.info(f"Server is ready. Spawning {workers} workers")


def on_exit(server):
    """Called just before exiting."""
    server.log.info("Shutting down Gen3 File Proxy Service")
