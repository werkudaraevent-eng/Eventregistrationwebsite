/**
 * MigrationNotice - Alert banner for localStorage users
 * 
 * Displays a prominent notice to users who have localStorage data
 * prompting them to migrate to Supabase for cross-device functionality
 */

import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Database, AlertTriangle, X } from 'lucide-react';
import * as migration from '../utils/dataMigration';

interface MigrationNoticeProps {
  onMigrateClick: () => void;
}

export function MigrationNotice({ onMigrateClick }: MigrationNoticeProps) {
  const [hasLocalData, setHasLocalData] = useState(false);
  const [hasSupabaseData, setHasSupabaseData] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkDataStatus();
  }, []);

  const checkDataStatus = async () => {
    try {
      const localData = migration.hasLocalStorageData();
      const supabaseData = await migration.hasSupabaseData();
      
      setHasLocalData(localData);
      setHasSupabaseData(supabaseData);
      
      // Check if user previously dismissed this notice
      const dismissed = localStorage.getItem('migration_notice_dismissed');
      setIsDismissed(dismissed === 'true');
    } catch (error) {
      console.error('Error checking data status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('migration_notice_dismissed', 'true');
    setIsDismissed(true);
  };

  // Don't show if:
  // - Still loading
  // - No local data exists
  // - Already migrated (has Supabase data but no local data)
  // - User dismissed the notice
  if (isLoading || !hasLocalData || (hasSupabaseData && !hasLocalData) || isDismissed) {
    return null;
  }

  return (
    <Alert className="border-yellow-300 bg-yellow-50 relative">
      <AlertTriangle className="h-5 w-5 text-yellow-600" />
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-yellow-600 hover:text-yellow-800 transition-colors"
        aria-label="Dismiss notice"
      >
        <X className="h-4 w-4" />
      </button>
      
      <AlertTitle className="text-yellow-900">
        Action Required: Migrate to Cloud Database
      </AlertTitle>
      <AlertDescription className="text-yellow-800 space-y-3">
        <p>
          Your data is currently stored only in this browser. This prevents:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
          <li>Public registration links from working on other devices</li>
          <li>Check-in pages from functioning independently</li>
          <li>Managing events from multiple devices</li>
        </ul>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            onClick={onMigrateClick}
            size="sm"
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            <Database className="mr-2 h-4 w-4" />
            Migrate Now
          </Button>
          <Button
            onClick={handleDismiss}
            variant="outline"
            size="sm"
            className="border-yellow-600 text-yellow-700 hover:bg-yellow-100"
          >
            Dismiss
          </Button>
        </div>
        <p className="text-xs mt-2">
          <strong>Important:</strong> This is required for registration and check-in links to work on different devices.
        </p>
      </AlertDescription>
    </Alert>
  );
}
