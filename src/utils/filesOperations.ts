import fs from 'fs'

export const getFileNamesInDirectory = (directoryPath: string): string[] => {
    try {
        // Get the names of all files in the directory
        const fileNames = fs.readdirSync(directoryPath);
        return fileNames;
    } catch (error) {
        console.error('Error reading directory:', error);
        return [];
    }
  }