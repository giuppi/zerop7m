import subprocess
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def scan():
    files = subprocess.check_output(['git', 'ls-files'], cwd=ROOT, text=True).splitlines()

    suspicious = []
    secret_patterns = [
        re.compile(r'(?i)(?:api[_-]?key|apikey|secret|password|passwd|bearer)\s*[:=]\s*[\'"][^\'"]{8,}'),
        re.compile(r'-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----'),
        re.compile(r'(?i)ghp_[a-zA-Z0-9]{36}'),
        re.compile(r'(?i)github_pat_[a-zA-Z0-9_]{50,}'),
        re.compile(r'AKIA[0-9A-Z]{16}'),
    ]

    path_patterns = [
        re.compile(r'[A-Za-z]:\\Users\\[A-Za-z0-9_.-]+'),
        re.compile(r'/home/[a-zA-Z0-9_.-]+'),
    ]

    for f in files:
        file_path = ROOT / f
        if not file_path.exists():
            continue
        try:
            content = file_path.read_text(encoding='utf-8', errors='ignore')
            for p in secret_patterns:
                matches = p.findall(content)
                if matches:
                    # Filter out obvious false positives (like test strings or bash templates)
                    real_matches = [m for m in matches if "storepass zerop7m" not in m and "keypass zerop7m" not in m]
                    if real_matches:
                        suspicious.append((f, 'secret_pattern', real_matches[:2]))

            if not f.endswith(('.bcmap', '.wasm', '.png', '.ico', '.icns', '.svg')):
                for p in path_patterns:
                    path_matches = p.findall(content)
                    if path_matches:
                        suspicious.append((f, 'local_path', set(path_matches)))
        except Exception as e:
            pass

    print('=== SCAN RESULTS ===')
    print(f'Total tracked files checked: {len(files)}')
    print(f'Suspicious findings: {len(suspicious)}')
    for item in suspicious:
        print(f"File: {item[0]} | Issue: {item[1]} | Data: {item[2]}")

if __name__ == '__main__':
    scan()
