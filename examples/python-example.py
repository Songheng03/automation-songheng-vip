#!/usr/bin/env python3
"""Example: Using my-automaton API from Python"""
import os
import json
import urllib.request

API_KEY = os.getenv('AUTOMATION_API_KEY')
ENDPOINT = 'https://automation.songheng.vip'

def analyze(text, endpoint='/v1/analyze'):
    """Analyze text using my-automaton API"""
    data = json.dumps({'text': text, 'mode': 'analyze'}).encode()
    
    headers = {'Content-Type': 'application/json'}
    if API_KEY:
        headers['X-API-Key'] = API_KEY
    else:
        endpoint = '/free/analyze'  # Use free tier
    
    req = urllib.request.Request(
        f'{ENDPOINT}{endpoint}',
        data=data,
        headers=headers,
        method='POST'
    )
    
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read())

if __name__ == '__main__':
    print('🤖 my-automaton API Example')
    
    code = 'def add(a, b): return a + b'
    print(f'\nAnalyzing: {code}\n')
    
    result = analyze(code)
    print(json.dumps(result, indent=2))
