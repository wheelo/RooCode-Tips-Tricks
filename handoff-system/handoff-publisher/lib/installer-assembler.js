/**
 * Installer Assembler for Handoff Publisher
 *
 * This module provides functions for assembling the installer script.
 */

const fs = require('fs');
const path = require('path');

// These variables will be set by the importer
let fileUtils;
let srcAssembler;

/**
 * Initialize the module with dependencies
 * @param {Object} dependencies - Object containing module dependencies
 */
function initialize(dependencies) {
  fileUtils = dependencies['utils'];
  srcAssembler = dependencies['src-assembler'];
  return module.exports;
}

/**
 * Process directories specified in config
 * @param {string} sourceDir - Source directory
 * @param {Array} directories - Array of directory configurations
 * @param {number} maxFileSize - Maximum file size to include
 * @returns {Object} Collected directory files
 */
function processDirectories(sourceDir, directories, maxFileSize) {
  console.log('\n5-6. Processing directories...');
  const fileContents = {};
  
  for (const directory of directories) {
    const dirPath = path.join(sourceDir, directory.source);
    if (fs.existsSync(dirPath)) {
      const files = fileUtils.collectFiles(dirPath, sourceDir, maxFileSize);
      
      // Map the collected files to their target paths
      Object.entries(files).forEach(([srcPath, content]) => {
        // Replace the source directory prefix with the target directory prefix
        const targetPath = srcPath.replace(
          new RegExp(`^${directory.source.replace(/\\/g, '/')}`, 'i'),
          directory.target
        );
        fileContents[targetPath] = content;
      });
      
      console.log(`- Processed directory: ${directory.source} -> ${directory.target}`);
    } else {
      console.warn(`- Warning: Directory not found: ${directory.source}`);
    }
  }
  
  return fileContents;
}

/**
 * Collect source code using the src-assembler based on the component configuration
 * @param {Object} componentConfigs - All component configurations
 * @returns {Object} Assembled source code components
 */
function collectSourceFunctions(componentConfigs) {
  console.log('\nCollecting source functions using component configuration...');
  
  try {
    // Find the source-code component set
    if (!componentConfigs['source-code']) {
      console.warn('- No source-code component set found in configuration');
      return {};
    }
    
    const sourceCodeSet = componentConfigs['source-code'];
    // Use the absolute current working directory as the base
    const cwd = process.cwd();
    const componentsDir = 'handoff-system';
    
    // Construct the full absolute path to the source code directory
    const componentsPath = path.join(cwd, componentsDir, sourceCodeSet.sourcePath);
    
    console.log(`- Using source code components from: ${componentsPath}`);
    
    // Use the src-assembler to assemble the source code components
    const assembledSource = srcAssembler.assembleSourceCode(componentsPath, sourceCodeSet.config);
    
    return assembledSource;
  } catch (err) {
    console.error(`- Error collecting source functions: ${err.message}`);
    return {};
  }
}

/**
 * Extract function implementations from source code
 * @param {string} source - Source code content
 * @returns {string} - Extracted function implementations
 */
function extractFunctionImplementations(source) {
  // Remove imports, exports, and module-specific code
  let code = source.replace(/const\s+\w+\s*=\s*require\(['"][^'"]+['"]\);?/g, '');
  code = code.replace(/module\.exports\s*=\s*{[^}]*};?/g, '');
  
  // Clean up the code by removing excessive blank lines
  code = code.replace(/\n{3,}/g, '\n\n');
  
  return code;
}

/**
 * Generate the installer script
 * @param {Object} fileContents - Collection of all files to embed
 * @param {string} outputFile - Path to output file
 * @param {Object} publishConfig - Publish configuration
 * @param {Object} componentConfigs - All component configurations
 */
function generateInstaller(fileContents, outputFile, publishConfig, componentConfigs) {
  console.log('\n7. Generating installer script...');
  
  // Collect source functions code using the component-based approach
  const sourceFunctions = collectSourceFunctions(componentConfigs);
  
  // Create sections with extracted function implementations from each component
  const functionSections = [];
  
  // Add each component's code as a section
  for (const [componentName, sourceCode] of Object.entries(sourceFunctions)) {
    if (sourceCode && sourceCode.trim()) {
      functionSections.push(`// ============= ${componentName.toUpperCase()} FUNCTIONS =============\n${sourceCode}`);
    }
  }
  
  // Join all function sections
  const allFunctions = functionSections.join('\n\n');

  // Generate the installer script
  const installerScript = `#!/usr/bin/env node
/**
 * Handoff Manager Standalone Installer (v${publishConfig.version})
 *
 * This is a self-contained script that installs the complete Handoff Manager system.
 * It includes all necessary files and will create the proper directory structure.
 *
 * Generated by handoff-publisher
 *
 * Usage:
 *   node handoff-manager-installer.js [target-directory]
 *
 * If target-directory is not specified, it uses the current directory.
 */

const fs = require('fs');
const path = require('path');

// Get the script directory path
const scriptDir = __dirname;
// Get target directory (either specified by user or current directory)
const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

console.log(\`
╔══════════════════════════════════════════════════╗
║                                                  ║
║            Handoff Manager Installer             ║
║                                                  ║
╚══════════════════════════════════════════════════╝
\`);

console.log(\`Installing Handoff Manager v${publishConfig.version} to: \${targetDir}\`);

// Files to be created (stored as normalized paths with base64 encoded content)
const BASE64_FILES = {
${Object.entries(fileContents)
  .map(([filePath, content]) => `  "${filePath}": "${content}"`)
  .join(',\n')}
};

// Configuration for installation
const CONFIG = ${JSON.stringify({
  directories: publishConfig.directories,
  installOptions: publishConfig.installOptions,
  nextSteps: publishConfig.nextSteps,
  documentation: publishConfig.documentation
}, null, 2)};

${allFunctions}

// Files object with decoded content (for internal use)
const FILES = Object.fromEntries(
  Object.entries(BASE64_FILES).map(([filePath, content]) => [filePath, decodeBase64(content)])
);

// Main installation function
async function installHandoffManager() {
  try {
    // First backup any existing handoff system
    const backupPaths = CONFIG.installOptions.createBackups ? 
      backupExistingInstallation(targetDir) : {};
    
    // Write all files to the target directory
    writeAllFiles(targetDir, FILES);
    
    // Create handoffs directory if it doesn't exist
    const targetHandoffsDir = path.join(targetDir, 'handoffs');
    ensureDir(targetHandoffsDir);
    
    // Merge configuration files if needed
    processConfigMerging(targetDir, CONFIG, FILES);
    
    // Display success message and next steps
    console.log(\`
╔══════════════════════════════════════════════════╗
║                                                  ║
║         Handoff Manager Install Complete         ║
║                                                  ║
╚══════════════════════════════════════════════════╝

The Handoff Manager (v${publishConfig.version}) has been installed to \${targetDir}

Files installed:
- Custom mode in .roomodes
- Handoff rules in .clinerules
- System prompt in .roo directory (required location for Roo-Code to detect it)
\${CONFIG.directories.map(dir => \`- \${dir.target}\`).join('\\n')}
\${Object.keys(backupPaths).length > 0 ? \`
Backup created:\` : ''}
\${Object.entries(backupPaths).map(([dir, path]) => \`- Previous \${dir} preserved in \${path}\`).join('\\n')}

Next Steps:
\${CONFIG.nextSteps.map(step => \`\${step}\`).join('\\n')}

For documentation, see:
\${CONFIG.documentation.map(doc => \`- \${doc}\`).join('\\n')}\`);
    
    return true;
  } catch (error) {
    console.error('Error during installation:', error);
    return false;
  }
}

// Execute the installation
installHandoffManager();`;

  // Ensure the output directory exists
  fileUtils.ensureDirectoryForFile(outputFile);
  
  // Write the installer script
  fs.writeFileSync(outputFile, installerScript);
  console.log(`- Installer generated: ${outputFile}`);
  
  // Make the file executable on Unix-like systems
  if (publishConfig.installOptions.executable) {
    try {
      fs.chmodSync(outputFile, '755');
      console.log('- Made installer executable');
    } catch (err) {
      // Ignore permission errors on Windows
    }
  }
}

// For backward compatibility with direct requires
try {
  fileUtils = require('./file-utils');
  srcAssembler = require('./src-assembler');
} catch (err) {
  console.log('Dependencies not available, will be set by initialize()');
}

module.exports = {
  initialize,
  processDirectories,
  collectSourceFunctions,
  extractFunctionImplementations,
  generateInstaller
};