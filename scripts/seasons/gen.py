# scripts/seasons/gen.py — 27 Nov 2026 v1
# Phase 44. Small helpers for recipe families: a family is a table of
# proteins and a table of flavours, crossed where the pairing makes sense,
# each cross written as a whole recipe with its own steps.
import re


def t(ref):
    return '{' + ref + '}'


def join(refs):
    refs = [t(r) for r in refs]
    if not refs:
        return ''
    if len(refs) == 1:
        return refs[0]
    return ', '.join(refs[:-1]) + ' and ' + refs[-1]


def refs_of(ings):
    return [i.split()[0] for i in ings]


def slugify(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
