#!/usr/bin/env node
/**
 * ============================================================================
 * COREX: Remove Sample Files Script
 * ============================================================================
 *
 * This script removes sample/example files from the codebase and updates
 * all index.ts files to remove their exports.
 *
 * Usage:
 *   npm run remove:samples          # Remove sample files only
 *   npm run remove:samples -- --all # Remove samples + clean dashboard
 *
 * What gets removed:
 * - src/contracts/sample.contract.ts
 * - src/application/usecases/sample.usecase.ts
 * - src/dal/sample.repo.ts
 * - src/core/sample.ts
 * - src/app/api/v1/sample/ (entire directory)
 *
 * What gets updated:
 * - src/contracts/index.ts (removes sample exports)
 * - src/application/index.ts (removes sample exports)
 * - src/dal/index.ts (removes sample exports)
 * - src/core/index.ts (removes sample exports)
 *
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");

// ============================================================================
// Configuration
// ============================================================================

const ROOT = path.join(__dirname, "..");

/**
 * Sample files to remove
 */
const SAMPLE_FILES = [
  "src/contracts/sample.contract.ts",
  "src/application/usecases/sample.usecase.ts",
  "src/dal/sample.repo.ts",
  "src/core/sample.ts",
];

/**
 * Sample directories to remove
 */
const SAMPLE_DIRS = ["src/app/api/v1/sample"];

/**
 * Index files that need export cleanup
 * Each entry specifies the file and the export patterns to remove
 */
const INDEX_CLEANUPS = [
  {
    file: "src/contracts/index.ts",
    // Remove the entire SAMPLE CONTRACTS section
    patterns: [
      /\/\/ =+\n\/\/ SAMPLE CONTRACTS[\s\S]*?from "\.\/sample\.contract";\n\n/g,
    ],
  },
  {
    file: "src/application/index.ts",
    // Remove sample use case exports and comment
    patterns: [
      /\/\/ Sample use cases \(template\)\nexport \{[\s\S]*?\} from "\.\/usecases\/sample\.usecase";\n/g,
    ],
  },
  {
    file: "src/dal/index.ts",
    // Remove sample repository exports and comments
    patterns: [
      /\/\/ Sample repository \(template\)\nexport \* as sampleRepo from "\.\/sample\.repo";\nexport type \{[\s\S]*?\} from "\.\/sample\.repo";\n/g,
    ],
  },
  {
    file: "src/core/index.ts",
    // Remove sample domain logic exports and comments
    patterns: [
      /\/\/ Sample domain logic \(template\)\nexport \{[\s\S]*?\} from "\.\/sample";\n/g,
    ],
  },
];

// ============================================================================
// Utilities
// ============================================================================

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  console.log(`${colors.cyan}[${step}]${colors.reset} ${message}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function logSkip(message) {
  console.log(`${colors.dim}○ ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

// ============================================================================
// File Operations
// ============================================================================

/**
 * Remove a file if it exists
 */
function removeFile(relativePath) {
  const fullPath = path.join(ROOT, relativePath);

  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    logSuccess(`Removed: ${relativePath}`);
    return true;
  } else {
    logSkip(`Not found: ${relativePath}`);
    return false;
  }
}

/**
 * Remove a directory recursively if it exists
 */
function removeDirectory(relativePath) {
  const fullPath = path.join(ROOT, relativePath);

  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true, force: true });
    logSuccess(`Removed directory: ${relativePath}`);
    return true;
  } else {
    logSkip(`Directory not found: ${relativePath}`);
    return false;
  }
}

/**
 * Clean exports from an index file
 */
function cleanIndexFile(config) {
  const fullPath = path.join(ROOT, config.file);

  if (!fs.existsSync(fullPath)) {
    logSkip(`Index not found: ${config.file}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, "utf8");
  let modified = false;

  for (const pattern of config.patterns) {
    const newContent = content.replace(pattern, "");
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  }

  // Clean up multiple blank lines
  content = content.replace(/\n{3,}/g, "\n\n");

  if (modified) {
    fs.writeFileSync(fullPath, content, "utf8");
    logSuccess(`Cleaned exports: ${config.file}`);
    return true;
  } else {
    logSkip(`No changes needed: ${config.file}`);
    return false;
  }
}

// ============================================================================
// Main
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  const removeAll = args.includes("--all");

  console.log("");
  log(
    "╔══════════════════════════════════════════════════════════════╗",
    "cyan",
  );
  log(
    "║              CoreX - Remove Sample Files                     ║",
    "cyan",
  );
  log(
    "╚══════════════════════════════════════════════════════════════╝",
    "cyan",
  );
  console.log("");

  // Step 1: Remove sample files
  logStep("1/3", "Removing sample files...");
  console.log("");

  let filesRemoved = 0;
  for (const file of SAMPLE_FILES) {
    if (removeFile(file)) filesRemoved++;
  }

  console.log("");

  // Step 2: Remove sample directories
  logStep("2/3", "Removing sample directories...");
  console.log("");

  let dirsRemoved = 0;
  for (const dir of SAMPLE_DIRS) {
    if (removeDirectory(dir)) dirsRemoved++;
  }

  console.log("");

  // Step 3: Clean up index files
  logStep("3/3", "Cleaning up index exports...");
  console.log("");

  let indexesCleaned = 0;
  for (const config of INDEX_CLEANUPS) {
    if (cleanIndexFile(config)) indexesCleaned++;
  }

  console.log("");

  // Summary
  log(
    "════════════════════════════════════════════════════════════════",
    "dim",
  );
  console.log("");
  log("Summary:", "cyan");
  console.log(`  Files removed:     ${filesRemoved}/${SAMPLE_FILES.length}`);
  console.log(`  Directories removed: ${dirsRemoved}/${SAMPLE_DIRS.length}`);
  console.log(
    `  Index files cleaned: ${indexesCleaned}/${INDEX_CLEANUPS.length}`,
  );
  console.log("");

  if (filesRemoved > 0 || dirsRemoved > 0) {
    log("✓ Sample files removed successfully!", "green");
    console.log("");
    log("Next steps:", "yellow");
    console.log("  1. Run 'npm run lint' to check for any broken imports");
    console.log("  2. Run 'npm run build' to verify the build");
    console.log("  3. Start building your own features!");
    console.log("");
  } else {
    log(
      "No sample files found - they may have already been removed.",
      "yellow",
    );
    console.log("");
  }

  if (removeAll) {
    console.log("");
    log(
      "Note: --all flag detected but dashboard cleanup is not yet implemented.",
      "yellow",
    );
    log("The dashboard pages are designed as starter templates.", "dim");
    console.log("");
  }
}

main();
