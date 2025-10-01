import fsPromises from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * Get all configured MCP servers
 * @returns {Promise<Object>} All MCP servers configuration
 */
export async function getAllMCPServers() {
    try {
        const homeDir = os.homedir();
        const configPaths = [
            path.join(homeDir, '.claude.json'),
            path.join(homeDir, '.claude', 'settings.json')
        ];

        let configData = null;

        // Try to read from either config file
        for (const filepath of configPaths) {
            try {
                const fileContent = await fsPromises.readFile(filepath, 'utf8');
                configData = JSON.parse(fileContent);
                break;
            } catch (error) {
                // File doesn't exist or is not valid JSON, try next
                continue;
            }
        }

        if (!configData) {
            return {
                hasConfig: false,
                userServers: [],
                projectServers: {}
            };
        }

        const userServers = configData.mcpServers ? Object.keys(configData.mcpServers) : [];
        const projectServers = {};

        if (configData.projects) {
            for (const [projectPath, projectConfig] of Object.entries(configData.projects)) {
                if (projectConfig.mcpServers) {
                    projectServers[projectPath] = Object.keys(projectConfig.mcpServers);
                }
            }
        }

        return {
            hasConfig: true,
            userServers,
            projectServers
        };
    } catch (error) {
        console.error('Error detecting MCP servers:', error);
        return {
            hasConfig: false,
            userServers: [],
            projectServers: {},
            error: error.message
        };
    }
}