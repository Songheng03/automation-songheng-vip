#!/usr/bin/env python3
"""
Add ONLY missing Open Graph and Twitter Card meta tags to all HTML pages.
Keeps existing tags and only adds what's missing. No duplicates.
"""

import os
import re
import html

CONTENT_DIR = '/root/automaton/content'
BASE_URL = 'https://automation.songheng.vip'
OG_IMAGE = 'https://automation.songheng.vip/og-image.png'
SITE_NAME = 'my-automaton'

TAGS_TO_ENSURE = {
    'og:title': 'property',
    'og:description': 'property',
    'og:image': 'property',
    'og:url': 'property',
    'og:type': 'property',
    'og:site_name': 'property',
    'og:locale': 'property',
    'twitter:card': 'name',
    'twitter:title': 'name',
    'twitter:description': 'name',
    'twitter:image': 'name',
}

def get_title_from_file(content):
    m = re.search(r'<title[^>]*>([^<]+)</title>', content, re.IGNORECASE | re.DOTALL)
    if m:
        return m.group(1).strip()
    return None

def get_description_from_file(content):
    m = re.search(r'<meta\s+name=["\']description["\']\s+content=["\']([^"\']+)["\']', content, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    m = re.search(r'<meta\s+content=["\']([^"\']+)["\']\s+name=["\']description["\']', content, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    return None

def tag_exists(content, tag_name, attr_type):
    """Check if a tag already exists in the content."""
    pattern = rf'{attr_type}=["\']{re.escape(tag_name)}["\']'
    return bool(re.search(pattern, content, re.IGNORECASE))

def generate_single_tag(tag_name, attr_type, value):
    """Generate a single meta tag."""
    value_escaped = html.escape(value, quote=True)
    if attr_type == 'property':
        return f'<meta property="{tag_name}" content="{value_escaped}" />'
    else:
        return f'<meta name="{tag_name}" content="{value_escaped}" />'

def get_page_url(rel_path):
    if rel_path == 'index.html':
        return BASE_URL + '/'
    elif rel_path.endswith('/index.html'):
        return BASE_URL + '/' + rel_path[:-11]
    else:
        return BASE_URL + '/' + rel_path

def get_default_title(rel_path):
    name = os.path.splitext(os.path.basename(rel_path))[0]
    name = name.replace('-', ' ').replace('_', ' ').title()
    return f'{name} | my-automaton'

def get_default_description(rel_path, title):
    if title:
        return f'{title} — powered by my-automaton. AI code review, security scanning, and developer tools.'
    name = os.path.splitext(os.path.basename(rel_path))[0]
    name = name.replace('-', ' ').replace('_', ' ').title()
    return f'{name} — powered by my-automaton. AI code review, security scanning, and developer tools.'

def process_file(filepath):
    rel_path = os.path.relpath(filepath, CONTENT_DIR)
    
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    if '</head>' not in content:
        print(f"  SKIP (no </head>): {rel_path}")
        return False
    
    # Extract existing title/description from the page
    title = get_title_from_file(content)
    description = get_description_from_file(content)
    
    url = get_page_url(rel_path)
    if not title:
        title = get_default_title(rel_path)
    if not description:
        description = get_default_description(rel_path, title)
    
    # Determine which tags are missing
    tag_values = {
        'og:title': title,
        'og:description': description,
        'og:image': OG_IMAGE,
        'og:url': url,
        'og:type': 'website',
        'og:site_name': SITE_NAME,
        'og:locale': 'en_US',
        'twitter:card': 'summary_large_image',
        'twitter:title': title,
        'twitter:description': description,
        'twitter:image': OG_IMAGE,
    }
    
    tags_to_add = []
    for tag_name in TAGS_TO_ENSURE:
        attr_type = TAGS_TO_ENSURE[tag_name]
        if not tag_exists(content, tag_name, attr_type):
            value = tag_values[tag_name]
            tags_to_add.append(generate_single_tag(tag_name, attr_type, value))
    
    if not tags_to_add:
        print(f"  OK (all present): {rel_path}")
        return False
    
    # Add the comment header if there are multiple tags
    if len(tags_to_add) > 0:
        injection = '\n'.join(tags_to_add)
        injection_block = f'<!-- Open Graph / Social Meta Tags -->\n{injection}\n'
    else:
        injection_block = '\n'.join(tags_to_add) + '\n'
    
    # Inject just before </head>
    modified = content.replace('</head>', f'{injection_block}</head>', 1)
    
    if modified == content:
        print(f"  FAIL (could not inject): {rel_path}")
        return False
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(modified)
    
    missing_names = [t for t in TAGS_TO_ENSURE if not tag_exists(content, t, TAGS_TO_ENSURE[t])]
    print(f"  UPDATED (added {len(tags_to_add)} tags): {rel_path}")
    for t in tags_to_add:
        print(f"    + {t.strip()}")
    return True

def main():
    html_files = []
    for root, dirs, files in os.walk(CONTENT_DIR):
        for f in files:
            if f.endswith('.html'):
                html_files.append(os.path.join(root, f))
    
    html_files.sort()
    print(f"Found {len(html_files)} HTML files in {CONTENT_DIR}")
    
    updated = 0
    skipped = 0
    failed = 0
    
    for filepath in html_files:
        rel_path = os.path.relpath(filepath, CONTENT_DIR)
        try:
            if process_file(filepath):
                updated += 1
            else:
                skipped += 1
        except Exception as e:
            print(f"  ERROR: {rel_path}: {e}")
            failed += 1
    
    print(f"\nSummary: {updated} updated, {skipped} skipped/ok, {failed} failed")
    return updated

if __name__ == '__main__':
    main()
