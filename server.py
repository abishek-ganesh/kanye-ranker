#!/usr/bin/env python3
import http.server
import socketserver
import os

# Custom handler that suppresses logs
class QuietHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        # Override to suppress request logs
        pass

# Change to the script's directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

PORT = 8000
Handler = QuietHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Server running at http://localhost:{PORT}/")
    print("Press Ctrl+C to stop")
    httpd.serve_forever()