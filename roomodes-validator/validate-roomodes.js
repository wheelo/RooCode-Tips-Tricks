// validate-roomodes.js
const fs = require('fs');
const path = require('path');

// Constants
const VALID_TOOL_GROUPS = ['read', 'edit', 'browser', 'command', 'mcp'];

// Command line options
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    filePath: './.roomodes',  // Default to current directory
    fix: false,
    outputPath: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else if (arg === '--fix' || arg === '-f') {
      options.fix = true;
    } else if (arg === '--output' || arg === '-o') {
      if (i + 1 < args.length) {
        options.outputPath = args[++i];
      } else {
        console.error('Error: Missing output path');
        showHelp();
        process.exit(1);
      }
    } else if (arg.startsWith('-')) {
      console.error(`Error: Unknown option ${arg}`);
      showHelp();
      process.exit(1);
    } else {
      // Assume it's a file path
      options.filePath = arg;
    }
  }

  // If fix is true but no output path specified, create default output path
  if (options.fix && !options.outputPath) {
    const dir = path.dirname(options.filePath);
    const basename = path.basename(options.filePath);
    options.outputPath = path.join(dir, `.roomodes-fixed`);
  }

  return options;
}

function showHelp() {
  console.log(`
Roomodes Validator - Validates and fixes .roomodes files

Usage: node validate-roomodes.js [options] [path]

Options:
  -h, --help          Show this help message
  -f, --fix           Generate a fixed version of the file if possible
  -o, --output PATH   Specify output path for fixed file (default: ./.roomodes-fixed)

Arguments:
  path                Path to .roomodes file (default: ./.roomodes)

Examples:
  node validate-roomodes.js
  node validate-roomodes.js ./my-project/.roomodes
  node validate-roomodes.js --fix
  node validate-roomodes.js --fix --output ./fixed.roomodes
  `);
}

// Main validation function
function validateRoomodes(filePath, fixMode = false) {
  console.log(`\n==========================================`);
  console.log(`Validating .roomodes file: ${filePath}`);
  console.log(`==========================================\n`);
  
  const result = {
    isValid: true,
    hasErrors: false,
    fixedContent: null
  };
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error(`❌ ERROR: File does not exist: ${filePath}`);
    result.isValid = false;
    return result;
  }
  
  // Read file content
  let fileContent;
  try {
    fileContent = fs.readFileSync(filePath, 'utf8');
    console.log(`✅ File read successfully`);
  } catch (error) {
    console.error(`❌ ERROR: Could not read file: ${error.message}`);
    result.isValid = false;
    return result;
  }
  
  // Parse JSON
  let parsedContent;
  try {
    parsedContent = JSON.parse(fileContent);
    console.log(`✅ JSON syntax is valid`);
  } catch (error) {
    console.error(`❌ ERROR: Invalid JSON syntax: ${error.message}`);
    console.log(`   Tip: Check for missing commas, unbalanced brackets, or quotes`);
    result.isValid = false;
    result.hasErrors = true;
    return result;
  }
  
  // Prepare fixed content
  let fixedContent = fixMode ? { customModes: [] } : null;
  let hasErrors = false;
  let modesData = [];
  
  // Check structure - look for customModes or modes array
  if (!parsedContent.customModes && !parsedContent.modes) {
    console.error(`❌ ERROR: Missing "customModes" or "modes" array`);
    console.log(`   Tip: File should have structure: { "customModes": [ ... ] }`);
    hasErrors = true;
    result.isValid = false;
    
    if (fixMode) {
      console.log(`   Auto-fix: Created empty customModes array`);
    }
  } else if (parsedContent.modes && !parsedContent.customModes) {
    console.error(`❌ ERROR: Using "modes" instead of "customModes" key`);
    console.log(`   Tip: The correct key name is "customModes", not "modes"`);
    hasErrors = true;
    
    if (!Array.isArray(parsedContent.modes)) {
      console.error(`❌ ERROR: "modes" is not an array`);
    } else {
      modesData = parsedContent.modes;
      if (fixMode) {
        console.log(`   Auto-fix: Renamed "modes" to "customModes"`);
      }
    }
  } else if (!Array.isArray(parsedContent.customModes)) {
    console.error(`❌ ERROR: "customModes" is not an array`);
    hasErrors = true;
  } else {
    modesData = parsedContent.customModes;
    if (fixMode) {
      fixedContent.customModes = [];
    }
  }
  
  // Check if array is empty
  if (modesData.length === 0) {
    console.error(`❌ ERROR: No custom modes defined in the file`);
    hasErrors = true;
    result.isValid = false;
  } else {
    console.log(`✅ Found ${modesData.length} custom mode(s)\n`);
  }
  
  // Validate each mode
  const slugs = new Set();
  
  modesData.forEach((mode, index) => {
    console.log(`Checking mode #${index + 1}${mode.name ? ` (${mode.name})` : ''}:`);
    let modeValid = true;
    
    // Create a fixed version of this mode if in fix mode
    if (fixMode) {
      fixedContent.customModes[index] = JSON.parse(JSON.stringify(mode));
    }
    
    // Required fields
    if (!mode.slug) {
      console.error(`  ❌ ERROR: Missing required "slug" field`);
      hasErrors = true;
      modeValid = false;
      
      if (fixMode) {
        fixedContent.customModes[index].slug = `mode-${index + 1}`;
        console.log(`    Auto-fix: Added placeholder slug "mode-${index + 1}"`);
      }
    } else {
      // Check slug format
      if (!mode.slug.match(/^[a-z0-9-]+$/)) {
        console.error(`  ❌ ERROR: Invalid slug format: "${mode.slug}"`);
        console.log(`     Slug must only contain lowercase letters, numbers, and hyphens`);
        hasErrors = true;
        modeValid = false;
        
        if (fixMode) {
          // Convert to valid slug format
          const fixedSlug = mode.slug.toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
          
          fixedContent.customModes[index].slug = fixedSlug;
          console.log(`    Auto-fix: Fixed slug to "${fixedSlug}"`);
        }
      } else {
        console.log(`  ✅ Valid slug: "${mode.slug}"`);
      }
      
      // Check for duplicate slugs
      if (slugs.has(mode.slug)) {
        console.error(`  ❌ ERROR: Duplicate slug: "${mode.slug}"`);
        console.log(`     Slug must be unique across all modes`);
        hasErrors = true;
        modeValid = false;
        
        if (fixMode) {
          const fixedSlug = `${mode.slug}-${index + 1}`;
          fixedContent.customModes[index].slug = fixedSlug;
          console.log(`    Auto-fix: Changed duplicate slug to "${fixedSlug}"`);
        }
      } else {
        slugs.add(mode.slug);
      }
    }
    
    if (!mode.name) {
      console.error(`  ❌ ERROR: Missing required "name" field`);
      hasErrors = true;
      modeValid = false;
      
      if (fixMode) {
        const name = mode.slug ? mode.slug.charAt(0).toUpperCase() + mode.slug.slice(1).replace(/-./g, x => x[1].toUpperCase()) : `Mode ${index + 1}`;
        fixedContent.customModes[index].name = name;
        console.log(`    Auto-fix: Added placeholder name "${name}"`);
      }
    } else {
      console.log(`  ✅ Valid name: "${mode.name}"`);
    }
    
    if (!mode.roleDefinition) {
      console.error(`  ❌ ERROR: Missing required "roleDefinition" field`);
      hasErrors = true;
      modeValid = false;
      
      if (fixMode) {
        const name = mode.name || `Mode ${index + 1}`;
        fixedContent.customModes[index].roleDefinition = `You are Roo, a ${name.toLowerCase()} assistant.`;
        console.log(`    Auto-fix: Added placeholder roleDefinition`);
      }
    } else if (typeof mode.roleDefinition !== 'string') {
      console.error(`  ❌ ERROR: "roleDefinition" must be a string`);
      hasErrors = true;
      modeValid = false;
      
      if (fixMode) {
        fixedContent.customModes[index].roleDefinition = String(mode.roleDefinition);
        console.log(`    Auto-fix: Converted roleDefinition to string`);
      }
    } else {
      console.log(`  ✅ Role definition is present`);
      
      if (!mode.roleDefinition.includes("You are Roo")) {
        console.log(`  ⚠️  WARNING: roleDefinition should typically start with "You are Roo"`);
        
        if (fixMode && !fixedContent.customModes[index].roleDefinition.startsWith("You are Roo")) {
          fixedContent.customModes[index].roleDefinition = `You are Roo, ${fixedContent.customModes[index].roleDefinition.charAt(0).toLowerCase() + fixedContent.customModes[index].roleDefinition.slice(1)}`;
          console.log(`    Auto-fix: Prepended "You are Roo" to roleDefinition`);
        }
      }
    }
    
    // Check groups
    if (!mode.groups) {
      console.error(`  ❌ ERROR: Missing required "groups" field`);
      hasErrors = true;
      modeValid = false;
      
      if (fixMode) {
        fixedContent.customModes[index].groups = ["read"];
        console.log(`    Auto-fix: Added default "read" group`);
      }
    } else if (!Array.isArray(mode.groups)) {
      console.error(`  ❌ ERROR: "groups" must be an array`);
      hasErrors = true;
      modeValid = false;
      
      if (fixMode) {
        fixedContent.customModes[index].groups = ["read"];
        console.log(`    Auto-fix: Replaced invalid groups with default "read" group`);
      }
    } else {
      const { errors, warnings, fixedGroups } = validateGroups(mode.groups, fixMode);
      
      if (errors.length > 0) {
        hasErrors = true;
        modeValid = false;
        errors.forEach(error => {
          console.error(`  ❌ ERROR: ${error}`);
        });
        
        if (fixMode) {
          fixedContent.customModes[index].groups = fixedGroups;
          console.log(`    Auto-fix: Fixed invalid groups`);
        }
      } else {
        console.log(`  ✅ All groups are valid`);
      }
      
      // Display warnings even if no errors
      warnings.forEach(warning => {
        console.log(`  ⚠️  WARNING: ${warning}`);
      });
    }
    
    console.log(''); // Empty line between modes
  });
  
  // Final result
  result.hasErrors = hasErrors;
  
  if (hasErrors) {
    console.log(`❌ Validation failed with errors`);
    result.isValid = false;
    
    if (fixMode) {
      result.fixedContent = JSON.stringify(fixedContent, null, 2);
      console.log(`💡 Created fixed version of the file`);
    }
  } else {
    console.log(`✅ .roomodes file is valid!`);
    result.isValid = true;
    
    // If everything is valid but the key is 'modes' instead of 'customModes',
    // still create a fixed version with the correct key
    if (fixMode && parsedContent.modes && !parsedContent.customModes) {
      fixedContent.customModes = JSON.parse(JSON.stringify(parsedContent.modes));
      result.fixedContent = JSON.stringify(fixedContent, null, 2);
      console.log(`💡 Created fixed version with correct "customModes" key`);
    }
  }
  
  return result;
}

// Validate groups array
function validateGroups(groups, fixMode = false) {
  const errors = [];
  const warnings = [];
  let fixedGroups = fixMode ? [] : null;
  
  groups.forEach((group, index) => {
    let isValidGroup = true;
    
    if (typeof group === 'string') {
      // Simple group
      if (!VALID_TOOL_GROUPS.includes(group)) {
        errors.push(`Invalid tool group at index ${index}: "${group}". Valid groups are: ${VALID_TOOL_GROUPS.join(', ')}`);
        isValidGroup = false;
      }
      
      if (fixMode) {
        if (isValidGroup) {
          fixedGroups.push(group);
        } else {
          // Skip invalid group in fixed version
          console.log(`    Auto-fix: Removed invalid group "${group}"`);
        }
      }
    } else if (Array.isArray(group) && group.length === 2) {
      // Group with file restriction
      const [groupName, restriction] = group;
      let fixedGroupName = groupName;
      let fixedRestriction = restriction;
      
      if (!VALID_TOOL_GROUPS.includes(groupName)) {
        errors.push(`Invalid tool group at index ${index}: "${groupName}". Valid groups are: ${VALID_TOOL_GROUPS.join(', ')}`);
        isValidGroup = false;
        
        if (fixMode) {
          // Use "read" as fallback
          fixedGroupName = "read";
        }
      }
      
      if (typeof restriction !== 'object') {
        errors.push(`Group restriction at index ${index} must be an object`);
        isValidGroup = false;
        
        if (fixMode) {
          fixedRestriction = { fileRegex: ".*", description: "All files" };
        }
      } else {
        // Check for required restriction fields
        let fixedRegex = restriction.fileRegex;
        
        if (!restriction.fileRegex) {
          errors.push(`Missing required "fileRegex" in group restriction at index ${index}`);
          isValidGroup = false;
          
          if (fixMode) {
            fixedRegex = ".*";
          }
        } else {
          try {
            // Test if regex is valid
            new RegExp(restriction.fileRegex);
            
            // Check for regex pattern issues in JSON context
            const regexStr = restriction.fileRegex;

            // Check for invalid escaping in JSON context (single backslashes)
            // Look for patterns like \. or \/ that should be \\. or \\/ in JSON
            const invalidEscaping = /(?<!\\)\\([^\\])/.test(regexStr);
            
            if (invalidEscaping) {
              errors.push(`Regex pattern at index ${index} has invalid escaping for JSON: "${regexStr}"`);
              warnings.push(`In JSON, backslashes must be doubled: "\\." not "\\." for a literal period`);
              isValidGroup = false;
              
              if (fixMode) {
                // Fix JSON escaping by replacing single backslashes with single backslashes
                // (which will be properly escaped when writing to JSON)
                fixedRegex = regexStr.replace(/\\(.)/g, '\\$1');
                console.log(`    Auto-fix: Fixed JSON escaping in regex pattern: "${fixedRegex}"`);
              }
            }
          } catch (error) {
            errors.push(`Invalid regex pattern at index ${index}: "${restriction.fileRegex}" - ${error.message}`);
            isValidGroup = false;
            
            if (fixMode) {
              fixedRegex = ".*";
              console.log(`    Auto-fix: Replaced invalid regex with ".*"`);
            }
          }
        }
        
        let fixedDescription = restriction.description;
        
        if (!restriction.description) {
          errors.push(`Missing required "description" in group restriction at index ${index}`);
          isValidGroup = false;
          
          if (fixMode) {
            fixedDescription = "All files";
          }
        }
        
        if (fixMode) {
          fixedRestriction = {
            fileRegex: fixedRegex,
            description: fixedDescription
          };
        }
      }
      
      if (fixMode) {
        if (isValidGroup) {
          fixedGroups.push([fixedGroupName, fixedRestriction]);
        } else if (fixedGroupName && fixedRestriction) {
          fixedGroups.push([fixedGroupName, fixedRestriction]);
          console.log(`    Auto-fix: Fixed group at index ${index}`);
        }
      }
    } else {
      errors.push(`Invalid group format at index ${index}. Must be a string or an array with 2 elements`);
      isValidGroup = false;
      
      if (fixMode) {
        // Skip this invalid group in fixed version
        console.log(`    Auto-fix: Removed invalid group format at index ${index}`);
      }
    }
  });
  
  // Ensure at least read permission
  if (fixMode && fixedGroups.length === 0) {
    fixedGroups.push("read");
    console.log(`    Auto-fix: Added default "read" group since no valid groups were found`);
  }
  
  return { errors, warnings, fixedGroups };
}

// Write fixed content to file
function writeFixedFile(outputPath, content) {
  try {
    fs.writeFileSync(outputPath, content);
    console.log(`\n✅ Fixed version written to: ${outputPath}`);
    return true;
  } catch (error) {
    console.error(`\n❌ ERROR: Failed to write fixed file: ${error.message}`);
    return false;
  }
}

// Main execution
function main() {
  const options = parseArgs();
  
  if (options.fix) {
    console.log(`Fix mode enabled. Output will be written to: ${options.outputPath}`);
  }
  
  const result = validateRoomodes(options.filePath, options.fix);
  
  if (options.fix && result.fixedContent) {
    writeFixedFile(options.outputPath, result.fixedContent);
  }
  
  // Exit with appropriate code for CI/CD pipelines
  process.exit(result.isValid ? 0 : 1);
}

// Run the script
main();