import * as fs from 'fs';
import * as path from 'path';

const DATA_FILE = path.join(__dirname, '../../data/data.json');
// Try multiple template locations (in case volume mount overrides /app/data)
const DATA_TEMPLATE_OPTIONS = [
  path.join(__dirname, '../../data/data.json.template'), // Original location
  path.join(__dirname, '../templates/data.json.template'), // Container template location
];

// Initialize data.json from template if it doesn't exist
export function initializeDataFile(): void {
  try {
    const dataDir = path.dirname(DATA_FILE);
    
    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`Created data directory: ${dataDir}`);
    }

    // If data.json doesn't exist, try to copy from template
    if (!fs.existsSync(DATA_FILE)) {
      // Try to find template in any of the possible locations
      let templateFound = false;
      for (const templatePath of DATA_TEMPLATE_OPTIONS) {
        if (fs.existsSync(templatePath)) {
          fs.copyFileSync(templatePath, DATA_FILE);
          console.log(`Initialized data.json from template: ${templatePath}`);
          templateFound = true;
          break;
        }
      }
      
      if (!templateFound) {
        // Create empty data.json with default structure
        const emptyData = {
          guests: [],
          families: [],
          categories: []
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(emptyData, null, 2), 'utf-8');
        console.log(`Created empty data.json at ${DATA_FILE} (no template found)`);
      }
    } else {
      console.log(`Data file already exists: ${DATA_FILE}`);
    }
  } catch (error) {
    console.error('Error initializing data file:', error);
    // Don't throw - let the app continue even if initialization fails
  }
}
