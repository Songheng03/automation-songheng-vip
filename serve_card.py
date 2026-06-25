#!/usr/bin/env python3
"""Serve agent card for ERC-8004 registration on port 8099"""
import http.server, json, os, sys

CARD_PATH = os.path.join(os.path.dirname(__file__), "public", "agent-card.json")

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/agent-card.json":
            try:
                with open(CARD_PATH) as f:
                    data = json.load(f)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps(data, indent=2).encode())
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        else:
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(b"<h1>my-automaton agent card</h1><p><a href='/agent-card.json'>agent-card.json</a></p>")
    def log_message(self, *a): pass

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8099
http.server.HTTPServer(("0.0.0.0", port), Handler).serve_forever()
