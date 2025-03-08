#!/usr/bin/env node
/**
 * Handoff Publisher
 * 
 * This is the main entry point for the Handoff Publisher package.
 * It generates a standalone installer for the handoff manager system.
 */

const fs = require('fs');
const path = require('path');

// Get the script directory path
const scriptDir = __dirname;

// Configuration paths
const publishConfigPath = path.join(scriptDir, 'config/publish-config.json');

console.log(`
╔══════════════════════════════════════════════════╗
║                                                  ║
║        Handoff Manager Installer Publisher       ║
║                                                  ║
╚══════════════════════════════════════════════════╝
`);

// Load publish configuration
let publishConfig;
try {
  const configContent = fs.readFileSync(publishConfigPath, 'utf8');
  publishConfig = JSON.parse(configContent);
  console.log(`Loaded publish configuration from ${publishConfigPath}`);
} catch (err) {
  console.error(`Error loading publish configuration: ${err.message}`);
  process.exit(1);
}

/**
 * Load a configuration file
 * @param {string} sourcePath - Path to component directory
 * @param {string} configFile - Name of config file
 * @param {string} componentType - Type of component set
 * @returns {Object} - Parsed configuration
 */
function loadComponentConfig(sourcePath, configFile, componentType) {
  try {
    const configPath = path.join(scriptDir, sourcePath, configFile);
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    console.log(`Loaded ${componentType} configuration from ${configPath}`);
    return config;
  } catch (err) {
    console.error(`Error loading ${componentType} configuration: ${err.message}`);
    process.exit(1);
  }
}

// Load all component set configurations
const componentConfigs = {};
for (const componentSet of publishConfig.componentSets) {
  componentConfigs[componentSet.type] = {
    config: loadComponentConfig(componentSet.sourcePath, componentSet.configFile, componentSet.type),
    sourcePath: componentSet.sourcePath
  };
}

// Load modules from source-code component set
function loadModules() {
  const modules = {};
  
  // Load source code modules from the source-code component set
  if (componentConfigs['source-code']) {
    const sourceCodeConfig = componentConfigs['source-code'];
    const srcBasePath = path.join(scriptDir, sourceCodeConfig.sourcePath);
    
    console.log('\nLoading source code modules:');
    for (const component of sourceCodeConfig.config.components) {
      try {
        // Remove number prefix and extension from filename to get module name
        const moduleName = component.file.replace(/\.\w+$/, '').replace(/^\d+-/, '');
        const modulePath = path.join(srcBasePath, component.file);
        modules[moduleName] = require(modulePath);
        console.log(`- Loaded module: ${moduleName} from ${component.file}`);
      } catch (err) {
        console.error(`- Error loading module from ${component.file}: ${err.message}`);
        process.exit(1);
      }
    }
  } else {
    console.warn('No source-code component set found in configuration');
  }
  
  // Load additional key modules
  console.log('\nLoading additional modules:');
  try {
    modules['system-prompt'] = require('./lib/system-prompt.js');
    console.log(`- Loaded module: system-prompt`);
    
    modules['src-assembler'] = require('./lib/src-assembler.js');
    console.log(`- Loaded module: src-assembler`);
    
    modules['installer-assembler'] = require('./lib/installer-assembler.js');
    console.log(`- Loaded module: installer-assembler`);
  } catch (err) {
    console.error(`- Error loading additional modules: ${err.message}`);
    process.exit(1);
  }
  
  // Initialize modules with dependencies
  console.log('\nInitializing module dependencies:');
  
  // Initialize all modules that have initialize function
  for (const [moduleName, module] of Object.entries(modules)) {
    if (module && typeof module.initialize === 'function') {
      try {
        module.initialize(modules);
        console.log(`- Initialized module: ${moduleName} with dependencies`);
      } catch (err) {
        console.warn(`- Warning: Could not initialize ${moduleName}: ${err.message}`);
      }
    }
  }
  
  return modules;
}

// Load all modules
const modules = loadModules();

// Source and output paths
const sourceDir = path.resolve(scriptDir, publishConfig.sourceDir);
const outputFile = process.argv[2] || path.resolve(scriptDir, publishConfig.outputFile);

console.log(`Source directory: ${sourceDir}`);
console.log(`Output file: ${outputFile}`);

/**
 * Main function to generate the installer
 */
function main() {
  try {
    // Step 1-2: Configuration is loaded at the beginning
    
    // Step 3: Assemble system prompt using the system-prompt component set
    const systemPromptSet = componentConfigs['system-prompt'];
    const systemPromptPath = path.join(scriptDir, systemPromptSet.sourcePath);
    const assembledSystemPrompt = modules['system-prompt'].assembleSystemPrompt(
      systemPromptPath, 
      systemPromptSet.config
    );
    
    // Step 4: Process root files
    const rootFilesArray = publishConfig.rootFiles.map(item => {
      if (typeof item === 'string') {
        // Handle legacy format (string only)
        return item;
      } else {
        // Handle new format with source and target paths
        return item.source;
      }
    });
    
    const rootFiles = modules['system-prompt'].processRootFiles(
      sourceDir,
      assembledSystemPrompt,
      rootFilesArray,
      modules['utils'].encodeFileToBase64
    );
    
    // Map root files to their target paths if needed
    const mappedRootFiles = {};
    Object.entries(rootFiles).forEach(([path, content]) => {
      // Find if this path has a mapping
      const mapping = publishConfig.rootFiles.find(item =>
        typeof item === 'object' && item.source === path
      );
      
      if (mapping) {
        // Use the target path from the mapping
        mappedRootFiles[mapping.target] = content;
      } else {
        // Keep original path
        mappedRootFiles[path] = content;
      }
    });
    
    // Use the mapped root files
    const rootFilesWithTargets = mappedRootFiles;
    
    // Step 5-6: Process directories
    const directoryFiles = modules['installer-assembler'].processDirectories(
      sourceDir, 
      publishConfig.directories,
      publishConfig.maxFileSize
    );
    // Combine all files
    const allFiles = { ...rootFilesWithTargets, ...directoryFiles };
    
    // Verify critical files are included
    const criticalFiles = ['.roomodes', '.clinerules'];
    let missingFiles = criticalFiles.filter(file => !allFiles[file]);
    
    if (missingFiles.length > 0) {
      console.warn(`\n⚠️ WARNING: Critical files missing from installation package: ${missingFiles.join(', ')}`);
      console.log('Attempting to add from 1-handoff-custom-mode directory...');
      
      for (const file of missingFiles) {
        const fallbackPath = path.join(sourceDir, '1-handoff-custom-mode', file);
        if (fs.existsSync(fallbackPath)) {
          const content = fs.readFileSync(fallbackPath, 'utf8');
          allFiles[file] = modules['utils'].encodeFileToBase64(content);
          console.log(`✅ Added ${file} from fallback location`);
        } else {
          console.error(`❌ CRITICAL ERROR: ${file} not found in fallback location!`);
        }
      }
    }
    
    console.log(`- Total files collected: ${Object.keys(allFiles).length}`);
    
    // Step 7: Generate installer
    modules['installer-assembler'].generateInstaller(allFiles, outputFile, publishConfig, componentConfigs);
    
    // Copy the readme file to the output directory with the same name
    const readmeSource = path.join(sourceDir, 'handoff-installer-readme.md');
    const readmeTarget = path.join(path.dirname(outputFile), 'handoff-installer-readme.md');
    if (fs.existsSync(readmeSource)) {
      fs.copyFileSync(readmeSource, readmeTarget);
      console.log(`- Copied readme to: ${readmeTarget}`);
    } else {
      console.warn('- Warning: Could not find handoff-installer-readme.md to copy');
    }
    
    // Step 8: Display success message
    console.log(`
╔══════════════════════════════════════════════════╗
║                                                  ║
║        Handoff Installer Creation Complete       ║
║                                                  ║
╚══════════════════════════════════════════════════╝

Standalone installer created at:
- ${outputFile}

This file contains everything needed to install the Handoff Manager v${publishConfig.version}. 
Users can run it directly:

node ${path.basename(outputFile)} [target-directory]

All files will be extracted and installed automatically with proper backups of existing content.
`);
    
  } catch (error) {
    console.error(`Error generating installer: ${error.message}`);
    process.exit(1);
  }
}

// Execute the main function
main();