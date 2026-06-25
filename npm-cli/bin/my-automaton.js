#!/usr/bin/env node
/**
 * @my-automaton/cli — CLI entry point
 * 
 * Published: npx @my-automaton/cli review file.js
 */
import('./cli.mjs').catch(err => {
  console.error('Error loading @my-automaton/cli:', err.message);
  process.exit(1);
});
