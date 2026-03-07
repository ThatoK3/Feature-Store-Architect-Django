#!/usr/bin/env python3
import os
import sys
import argparse
from pathlib import Path

def print_tree_with_contents(dir_path=".", output_file=None, max_size=10000, excluded_dirs=None):
    """Print directory tree with file contents, excluding specified directories"""

    # Target file extensions
    target_extensions = {'.py', '.html', '.css', '.js'}

    # Additional Django-specific exclusions
    if excluded_dirs is None:
        excluded_dirs = [
            '.git', '__pycache__', '.venv', 'node_modules', 'dist', 'build',
            '.idea', '.vscode', '.vs', 'venv', 'env', 'target',
            'migrations',  # Exclude Django migrations
            '.pytest_cache', '.mypy_cache', 'htmlcov', '.coverage'
        ]

    # Open output file if specified, otherwise use stdout
    output = open(output_file, 'w', encoding='utf-8') if output_file else sys.stdout

    def write_line(line=""):
        output.write(line + "\n")

    write_line("📁 Directory Structure:")
    write_line("=" * 50)

    # Collect matching files for tree display
    matching_files = []

    # Print tree structure
    for root, dirs, files in os.walk(dir_path):
        # Skip excluded directories
        root_path = Path(root)
        if any(excl in root_path.parts for excl in excluded_dirs):
            dirs[:] = []
            continue

        dirs[:] = [d for d in dirs if d not in excluded_dirs]

        level = root.replace(dir_path, '').count(os.sep)
        indent = ' ' * 2 * level
        dir_name = os.path.basename(root) or '.'

        # Check if this directory has any matching files
        has_matching = any(Path(f).suffix.lower() in target_extensions for f in files)

        if has_matching or level == 0:
            write_line(f"{indent}{dir_name}/")
            subindent = ' ' * 2 * (level + 1)
            for file in sorted(files):
                if Path(file).suffix.lower() in target_extensions:
                    write_line(f"{subindent}{file}")
                    matching_files.append(os.path.join(root, file))

    write_line()
    write_line("📄 File Contents:")
    write_line("=" * 50)

    # Print file contents (only target extensions)
    for filepath in sorted(matching_files):
        try:
            size = os.path.getsize(filepath)
            if size > max_size:
                write_line(f"\n⚠️  Skipping {filepath} (too large: {size:,} bytes)")
                continue

            write_line(f"\n{'='*60}")
            write_line(f"File: {filepath}")
            write_line(f"{'='*60}")

            encodings = ['utf-8', 'latin-1', 'cp1252', 'utf-16', 'ascii']
            content_read = False

            for encoding in encodings:
                try:
                    with open(filepath, 'r', encoding=encoding) as f:
                        content = f.read()

                    content_read = True
                    lines = content.split('\n')

                    if len(lines) > 100:
                        write_line(f"[First 100 lines of {len(lines)} total lines]")
                        write_line("-" * 40)
                        write_line('\n'.join(lines[:100]))
                        write_line("... (truncated)")
                    else:
                        write_line(content)

                    break

                except UnicodeDecodeError:
                    continue
                except Exception as e:
                    continue

            if not content_read:
                write_line(f"❌ Could not read file with any encoding")

        except PermissionError:
            write_line(f"\n🔒 Permission denied: {filepath}")
        except Exception as e:
            write_line(f"\n❌ Error reading {filepath}: {type(e).__name__}: {e}")

    if output_file:
        output.close()
        print(f"✅ Output written to: {output_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Cat tree with contents for web files only')
    parser.add_argument('-o', '--output', help='Output file path (default: stdout)')
    parser.add_argument('-d', '--directory', default='.', help='Root directory to scan (default: current directory)')
    parser.add_argument('--max-size', type=int, default=50000, help='Max file size in bytes (default: 50000)')

    args = parser.parse_args()

    excluded_dirs = [
        '.git', '__pycache__', '.venv', 'node_modules', 'dist', 'build',
        '.idea', '.vscode', '.vs', 'venv', 'env', 'target',
        'migrations',  # Django migrations excluded
        '.pytest_cache', '.mypy_cache', 'htmlcov', '.coverage', 'staticfiles',
        'media', 'logs'
    ]

    print_tree_with_contents(
        dir_path=args.directory,
        output_file=args.output,
        max_size=args.max_size,
        excluded_dirs=excluded_dirs
    )
