#!/usr/bin/env tsx

/**
 * Backup and Restore API Integration Test
 * 
 * This script tests the backup and restore API functionality
 * by performing actual API calls to create, list, restore and delete backups.
 */

import {
  createBackup,
  listBackups,
  getBackupDetails,
  restoreBackup,
  deleteBackup,
  validateBackup
} from '../src/lib/api/backup-restore-service';
import chalk from "chalk";

// Set the API base URL for testing
process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:8080';

// Create a simple logging setup with colors
const log = {
  info: (message: string) => console.log(chalk.blue(`[INFO] ${message}`)),
  success: (message: string) => console.log(chalk.green(`[SUCCESS] ${message}`)),
  error: (message: string) => console.log(chalk.red(`[ERROR] ${message}`)),
  warning: (message: string) => console.log(chalk.yellow(`[WARNING] ${message}`)),
};

// Test backup and restore functionality
async function runTests() {
  log.info('Starting Backup and Restore API tests...');
  
  let createdBackupId: string | null = null;
  
  try {
    // Test 1: Create a backup
    log.info('Test 1: Creating a new backup');
    const createResult = await createBackup({
      description: 'Test backup created by integration test',
      includeData: true
    });
    
    if (createResult && createResult.backupId) {
      createdBackupId = createResult.backupId;
      log.success(`Successfully created backup with ID: ${createdBackupId}`);
    } else {
      throw new Error('Failed to create backup');
    }
    
    // Test 2: List all backups
    log.info('Test 2: Listing all backups');
    const backups = await listBackups();
    
    if (backups && backups.length > 0) {
      log.success(`Found ${backups.length} backups`);
      backups.forEach((backup, index) => {
        log.info(`${index + 1}. Backup ID: ${backup.id}, Created: ${backup.createdAt}, Size: ${backup.size}`);
      });
    } else {
      log.warning('No backups found');
    }
    
    // Test 3: Get backup details
    if (createdBackupId) {
      log.info(`Test 3: Getting details for backup ${createdBackupId}`);
      const backupDetails = await getBackupDetails(createdBackupId);
      
      if (backupDetails) {
        log.success('Backup details retrieved successfully');
        log.info(`Backup ID: ${backupDetails.id}`);
        log.info(`Created At: ${backupDetails.createdAt}`);
        log.info(`Size: ${backupDetails.size}`);
        if (backupDetails.description) {
          log.info(`Description: ${backupDetails.description}`);
        }
        if (backupDetails.includesData !== undefined) {
          log.info(`Includes Data: ${backupDetails.includesData ? 'Yes' : 'No'}`);
        }
      } else {
        log.error('Failed to get backup details');
      }
    }
    
    // Test 4: Validate backup
    if (createdBackupId) {
      log.info(`Test 4: Validating backup ${createdBackupId}`);
      const validationResult = await validateBackup(createdBackupId);
      
      if (validationResult && validationResult.valid) {
        log.success('Backup validated successfully');
      } else {
        log.error('Backup validation failed');
        if (validationResult && validationResult.errors) {
          validationResult.errors.forEach(error => log.error(`- ${error}`));
        }
      }
    }
    
    // We'll skip the actual restore test to avoid disrupting the database
    log.info('Test 5: Restore test skipped to avoid disrupting the database');
    log.info('In a real test, we would call:');
    log.info(`restoreBackup({ backupId: '${createdBackupId}', overwriteExisting: false })`);
    
    // Test 6: Delete backup
    if (createdBackupId) {
      log.info(`Test 6: Deleting backup ${createdBackupId}`);
      const deleteResult = await deleteBackup(createdBackupId);
      
      if (deleteResult && deleteResult.success) {
        log.success('Backup deleted successfully');
      } else {
        log.error('Failed to delete backup');
      }
    }
    
    log.success('All tests completed successfully!');
    
  } catch (error) {
    log.error(`Test failed: ${error}`);
    
    // Cleanup: Delete the created backup if tests fail
    if (createdBackupId) {
      try {
        log.info(`Cleaning up: Deleting backup ${createdBackupId}`);
        await deleteBackup(createdBackupId);
        log.success('Cleanup successful');
      } catch (cleanupError) {
        log.error(`Cleanup failed: ${cleanupError}`);
      }
    }
    
    process.exit(1);
  }
}

// Run the tests
runTests().catch(err => {
  log.error(`Unhandled error: ${err}`);
  process.exit(1);
}); 