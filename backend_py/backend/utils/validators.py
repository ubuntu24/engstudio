import re
import urllib.parse
import ipaddress

def is_allowed_video_url(url):
    if not url or not isinstance(url, str):
        return False
    url = url.strip()

    # Allow 11-character YouTube video IDs
    if re.match(r'^[a-zA-Z0-9_-]{11}$', url):
        return True

    try:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme not in ('http', 'https'):
            return False

        domain = parsed.hostname
        if not domain:
            return False
        domain = domain.lower()

        # Strict SSRF & Loopback Protection: Block localhost, 127.0.0.1, internal IP ranges
        if domain in ('localhost', '127.0.0.1', '0.0.0.0', '::1'):
            return False
        try:
            ip = ipaddress.ip_address(domain)
            if ip.is_private or ip.is_loopback or ip.is_reserved or ip.is_link_local:
                return False
        except ValueError:
            pass  # Domain is a hostname string, not an IP address

        # Strictly allowed video platforms: YouTube & TikTok
        allowed_domains = [
            'youtube.com', 'm.youtube.com', 'www.youtube.com', 'youtu.be',
            'tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vt.tiktok.com', 'v.tiktok.com', 'tiktok.com.vn'
        ]
        
        return any(domain == allowed or domain.endswith('.' + allowed) for allowed in allowed_domains)
    except Exception:
        return False
