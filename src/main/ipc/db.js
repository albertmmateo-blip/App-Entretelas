const { ipcMain } = require('electron');
const { listBackups, restoreFromBackup } = require('../db/connection');

/**
 * Registers IPC handlers for database backup operations.
 */
function registerDbHandlers() {
  /**
   * Handler: db:listBackups
   * Returns list of available backup files with metadata.
   * @returns {Promise<{success: boolean, data?: Array, error?: {code: string, message: string}}>}
   */
  ipcMain.handle('db:listBackups', async () => {
    try {
      const backups = listBackups();

      // Convert timestamps to ISO strings for IPC serialization
      const serializedBackups = backups.map((backup) => ({
        filename: backup.filename,
        timestamp: backup.timestamp.toISOString(),
        size: backup.size,
      }));

      return {
        success: true,
        data: serializedBackups,
      };
    } catch (error) {
      console.error('Error in db:listBackups handler:', error);
      return {
        success: false,
        error: {
          code: 'LIST_BACKUPS_FAILED',
          message: error.message,
        },
      };
    }
  });

  /**
   * Handler: db:restoreBackup
   * Restores database from a specific backup file.
   * @param {Event} _event - IPC event (unused)
   * @param {string} backupFilename - Name of the backup file to restore
   * @returns {Promise<{success: boolean, error?: {code: string, message: string}}>}
   */
  ipcMain.handle('db:restoreBackup', async (_event, backupFilename) => {
    try {
      // Validate input
      if (!backupFilename || typeof backupFilename !== 'string') {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Backup filename is required and must be a string',
          },
        };
      }

      // Call the restore function
      const result = restoreFromBackup(backupFilename);
      return result;
    } catch (error) {
      console.error('Error in db:restoreBackup handler:', error);
      return {
        success: false,
        error: {
          code: 'RESTORE_HANDLER_FAILED',
          message: error.message,
        },
      };
    }
  });
}

module.exports = {
  registerDbHandlers,
};
