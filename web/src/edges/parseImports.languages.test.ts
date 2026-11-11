import { describe, expect, it } from 'vitest'
import type { ChangedFile } from '../api/types'
import { cIncludeIsLocal, parseImports } from './parseImports'

/** Builds a one-hunk patch whose lines are given with their +/-/space prefix. */
function file(filename: string, ...lines: string[]): ChangedFile {
  const patch = ['@@ -1,10 +1,10 @@', ...lines].join('\n')
  return {
    filename,
    status: 'modified',
    additions: lines.filter((l) => l.startsWith('+')).length,
    deletions: lines.filter((l) => l.startsWith('-')).length,
    patch,
    previousFilename: null,
    changes: lines.length,
    hasPatch: true,
  }
}

const specifiers = (files: ChangedFile[]) => parseImports(files).map((c) => c.specifier)
const internalOf = (files: ChangedFile[], specifier: string) =>
  parseImports(files).find((change) => change.specifier === specifier)?.internal

describe('Python', () => {
  it('reads import and from-import', () => {
    const files = [file('app/main.py', '+import os', '+from pathlib import Path')]
    expect(specifiers(files)).toEqual(['os', 'pathlib'])
  })

  it('reads a dotted module', () => {
    expect(specifiers([file('a.py', '+from django.db import models')])).toEqual(['django.db'])
  })

  it('treats a relative import as internal and a package as not', () => {
    const files = [file('pkg/a.py', '+from .models import User', '+import requests')]
    expect(internalOf(files, '.models')).toBe(true)
    expect(internalOf(files, 'requests')).toBe(false)
  })

  it('ignores a # comment, which is not a C include here', () => {
    expect(specifiers([file('a.py', '+# import os')])).toEqual([])
  })
})

describe('Rust', () => {
  it('reads a use and an extern crate', () => {
    const files = [file('src/main.rs', '+use std::io;', '+extern crate serde;')]
    expect(specifiers(files)).toEqual(['std::io', 'serde'])
  })

  it('reads a pub use', () => {
    expect(specifiers([file('src/lib.rs', '+pub use crate::config::Settings;')])).toEqual([
      'crate::config::Settings',
    ])
  })

  it('counts crate, super and self as internal, and std as not', () => {
    const files = [
      file('src/a.rs', '+use crate::db::Pool;', '+use super::helpers;', '+use std::fmt;'),
    ]
    expect(internalOf(files, 'crate::db::Pool')).toBe(true)
    expect(internalOf(files, 'super::helpers')).toBe(true)
    expect(internalOf(files, 'std::fmt')).toBe(false)
  })
})

describe('Go', () => {
  it('reads a single import and the lines of an import block', () => {
    const files = [file('main.go', '+import "fmt"', '+\t"github.com/pkg/errors"')]
    expect(specifiers(files)).toEqual(['fmt', 'github.com/pkg/errors'])
  })

  it('reads an aliased import', () => {
    expect(specifiers([file('main.go', '+\tjson "encoding/json"')])).toEqual(['encoding/json'])
  })
})

describe('Java and Kotlin', () => {
  it('reads an import and a static import', () => {
    const files = [
      file('src/A.java', '+import java.util.List;', '+import static org.junit.Assert.assertEquals;'),
    ]
    expect(specifiers(files)).toEqual(['java.util.List', 'org.junit.Assert.assertEquals'])
  })

  it('counts a package the pull request declares itself as internal', () => {
    const files = [
      file('src/A.java', '+package acme.core;', '+import acme.util.Clock;', '+import java.io.File;'),
    ]
    expect(internalOf(files, 'acme.util.Clock')).toBe(true)
    expect(internalOf(files, 'java.io.File')).toBe(false)
  })
})

describe('C and C++', () => {
  it('reads both include forms', () => {
    const files = [file('src/main.cpp', '+#include <vector>', '+#include "engine.h"')]
    expect(specifiers(files)).toEqual(['vector', 'engine.h'])
  })

  it('allows spaces after the hash', () => {
    expect(specifiers([file('a.c', '+#  include <stdio.h>')])).toEqual(['stdio.h'])
  })

  it('counts a quoted include as local and an angled one as not', () => {
    const files = [file('src/main.cpp', '+#include <vector>', '+#include "engine.h"')]
    expect(internalOf(files, 'engine.h')).toBe(true)
    expect(internalOf(files, 'vector')).toBe(false)
  })

  it('reads headers too, not just source files', () => {
    expect(specifiers([file('src/engine.hpp', '+#include "math.hpp"')])).toEqual(['math.hpp'])
  })
})

describe('cIncludeIsLocal', () => {
  it('is true for a quoted include', () => {
    expect(cIncludeIsLocal('#include "engine.h"')).toBe(true)
  })

  it('is false for an angled include', () => {
    expect(cIncludeIsLocal('#include <vector>')).toBe(false)
  })

  it('is false for a line that is not an include at all', () => {
    expect(cIncludeIsLocal('int main() {}')).toBe(false)
  })
})
