# Pending Linking Tasks (exec unavailable)
# Created 2026-06-19

## timestamp-converter.html
- File exists: /root/automaton/content/timestamp-converter.html ✓
- Needs: Add to dev-tools.html Integrations category
- Needs: Add to sitemap.xml
- Needs: IndexNow submission

## Steps (when exec recovers):
1. grep -n "Integrations" /root/automaton/content/dev-tools.html
2. sed -i to insert: {name:"Unix Timestamp Converter",desc:"Convert between Unix timestamps and human-readable dates",type:"free",link:"/timestamp-converter.html"},
3. Insert into sitemap.xml before </urlset>
4. curl IndexNow for Bing + Yandex
