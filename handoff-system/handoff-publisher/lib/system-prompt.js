/**
 * System Prompt Assembler for Handoff Publisher
 * 
 * This module provides functions for assembling the system prompt.
 */

const fs = require('fs');
const path = require('path');

// This will be set by the importer if needed
let fileUtils;

/**
 * Initialize the module with dependencies
 * @param {Object} dependencies - Object containing module dependencies
 */
function initialize(dependencies) {
  fileUtils = dependencies['file-utils'];
  return module.exports;
}

/**
 * Assemble system prompt from components
 * @param {string} componentsPath - Path to components directory
 * @param {Object} promptConfig - Prompt configuration object
 * @returns {string} The assembled system prompt
 */
function assembleSystemPrompt(componentsPath, promptConfig) {
  console.log('\n3. Assembling system prompt from components...');
  
  try {
    let content = '';
    
    // Process each component in order
    for (const component of promptConfig.components) {
      if (component.file) {
        // This is a file component
        const componentPath = path.join(componentsPath, component.file);
        if (fs.existsSync(componentPath)) {
          const componentContent = fs.readFileSync(componentPath, 'utf8');
          content += componentContent;
          console.log(`- Added component: ${component.file}`);
        } else {
          const errorMsg = `Component file not found: ${component.file}`;
          if (promptConfig.errorHandling.missingFile === "error" && 
              !promptConfig.errorHandling.continueOnError) {
            throw new Error(errorMsg);
          } else {
            console.error(`- Warning: ${errorMsg}`);
          }
        }
      } else if (component.special === "toolEssentials") {
        // This is the special tool essentials section
        content += component.content;
        console.log('- Added special component: toolEssentials');
      }
    }
    
    // Do not write to file - just return the content
    console.log(`- System prompt assembled from components`);
    
    return content;
  } catch (err) {
    console.error(`- Error assembling system prompt: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Process root files specified in config
 * @param {string} sourceDir - Source directory
 * @param {string} systemPrompt - The assembled system prompt
 * @param {Array} rootFiles - Array of root files to process
 * @param {Function} encodeFileToBase64 - Function to encode file to base64
 * @returns {Object} Collected root files
 */
function processRootFiles(sourceDir, systemPrompt, rootFiles, encodeFileToBase64) {
  console.log('\n4. Processing root files...');
  const fileContents = {};
  
  // Add the assembled system prompt as a virtual file
  // Must go in .roo directory to be properly detected by Roo-Code
  fileContents['.roo/system-prompt-handoff-manager'] = Buffer.from(systemPrompt, 'utf8').toString('base64');
  console.log(`- Added dynamically assembled system prompt (in .roo directory)`);
  
  // Use the provided encodeFileToBase64 function or the one from fileUtils
  let encodeFn = encodeFileToBase64;
  
  // If encodeFileToBase64 is not provided directly, try to get it from fileUtils
  if (!encodeFn && fileUtils) {
    // Try both possible function names since it might be encodeFileToBase64 or encodeToBase64
    encodeFn = fileUtils.encodeFileToBase64 || fileUtils.encodeToBase64;
  }
  
  if (!encodeFn) {
    console.error('- Error: No encoding function available. Please provide encodeFileToBase64 or initialize with file-utils');
    console.error('- Available functions in file-utils:', Object.keys(fileUtils || {}).join(', '));
    process.exit(1);
  }
  
  for (const rootFile of rootFiles) {
    const filePath = path.join(sourceDir, rootFile);
    if (fs.existsSync(filePath)) {
      fileContents[path.basename(rootFile)] = encodeFn(filePath);
      console.log(`- Processed: ${rootFile}`);
    } else {
      console.warn(`- Warning: Root file not found: ${rootFile}`);
    }
  }
  
  return fileContents;
}

module.exports = {
  initialize,
  assembleSystemPrompt,
  processRootFiles
};