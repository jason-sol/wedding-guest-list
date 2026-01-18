"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDataFile = initializeDataFile;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const DATA_FILE = path.join(__dirname, '../../data/data.json');
// Try multiple template locations (in case volume mount overrides /app/data)
const DATA_TEMPLATE_OPTIONS = [
    path.join(__dirname, '../../data/data.json.template'), // Original location
    path.join(__dirname, '../templates/data.json.template'), // Container template location
];
// Initialize data.json from template if it doesn't exist
function initializeDataFile() {
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
        }
        else {
            console.log(`Data file already exists: ${DATA_FILE}`);
        }
    }
    catch (error) {
        console.error('Error initializing data file:', error);
        // Don't throw - let the app continue even if initialization fails
    }
}
