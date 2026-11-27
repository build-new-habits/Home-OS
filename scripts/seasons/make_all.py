#!/usr/bin/env python3
# scripts/seasons/make_all.py — 27 Nov 2026 v1
# Builds every season and occasion file: recipes into data/recipe_library,
# menus into data/menus, and the library index. Idempotent.
import importlib, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import write_all, BuildError  # noqa: E402

ORDER = ['spring', 'summer', 'autumn', 'winter', 'easter', 'birthday', 'halloween', 'bbq', 'outdoor', 'microwave']

books = []
for name in ORDER:
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), f'{name}.py')
    if not os.path.exists(path):
        continue
    try:
        books.append(importlib.import_module(name).b)
    except BuildError as e:
        sys.exit(f'{name}: {e}')
try:
    write_all(books)
except BuildError as e:
    sys.exit(str(e))
