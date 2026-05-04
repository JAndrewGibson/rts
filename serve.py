import http.server
import socketserver
import sys
import os

PORT = 8000

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def guess_type(self, path):
        mimetype = super().guess_type(path)
        if path.endswith(".js"):
            mimetype = "application/javascript"
        elif path.endswith(".css"):
            mimetype = "text/css"
        elif path.endswith(".html"):
            mimetype = "text/html"
        
        print(f"DEBUG: Path={path} Guess={mimetype}")
        return mimetype

print(f"Starting server on port {PORT}...")
with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.shutdown()
        sys.exit(0)
