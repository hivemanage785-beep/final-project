import os

# Root project directory
ROOT_DIR = r"c:\Users\Admin\Downloads\final-project-dev-jo\final-project-dev-jo"
OUTPUT_FILE = os.path.join(ROOT_DIR, "buzz_off_full_codebase.txt")

IGNORE_PATTERNS = [
    "node_modules", ".git", "dist", "build", ".next",
    "package-lock.json", "yarn.lock", ".pyc", "__pycache__",
    "buzz_off_full_codebase.txt",  # Avoid self-inclusion
    ".env", # Skip env files to keep keys local unless requested
    "firebase-applet-config.json" # Sensitive
]

def get_file_content(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"Error reading file: {str(e)}"

def main():
    content = []
    
    # Header: File Structure
    content.append("="*80)
    content.append("BUZZ-OFF FULL CODEBASE DOCUMENTATION")
    content.append("="*80)
    content.append("\nDIRECTORY STRUCTURE:\n")
    
    for root, dirs, files in os.walk(ROOT_DIR):
        # Exclude ignored directories
        dirs[:] = [d for d in dirs if d not in IGNORE_PATTERNS]
        
        level = root.replace(ROOT_DIR, '').count(os.sep)
        indent = ' ' * 4 * level
        content.append(f"{indent}{os.path.basename(root)}/")
        sub_indent = ' ' * 4 * (level + 1)
        for f in files:
            if any(item in f for item in IGNORE_PATTERNS):
                continue
            content.append(f"{sub_indent}{f}")

    content.append("\n" + "="*80)
    content.append("FILE CONTENTS")
    content.append("="*80 + "\n")

    # Content: Individual Files
    for root, dirs, files in os.walk(ROOT_DIR):
        # Exclude ignored directories
        dirs[:] = [d for d in dirs if d not in IGNORE_PATTERNS]
        
        for f in files:
            if any(item in f for item in IGNORE_PATTERNS):
                continue
            
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, ROOT_DIR)
            
            content.append("="*80)
            content.append(f"FILE: {rel_path}")
            content.append("="*80)
            content.append(get_file_content(full_path))
            content.append("\n")

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write("\n".join(content))

    print(f"Full codebase written to: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
