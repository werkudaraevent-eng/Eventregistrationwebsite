/**
 * DataMigrationDialog - UI for migrating localStorage to Supabase
 * 
 * Helps users migrate from localStorage to Supabase database
 * to enable cross-device access and fix standalone page issues
 */

import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Database, Download, Upload, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import * as migration from '../utils/dataMigration';

interface DataMigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DataMigrationDialog({ open, onOpenChange }: DataMigrationDialogProps) {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<migration.MigrationStatus | null>(null);
  const [progress, setProgress] = useState(0);

  const handleMigrate = async () => {
    setIsMigrating(true);
    setProgress(0);
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      // Perform migration
      const status = await migration.migrateToSupabase();
      
      clearInterval(progressInterval);
      setProgress(100);
      setMigrationStatus(status);
      setMigrationComplete(true);
      
    } catch (error: any) {
      console.error('Migration error:', error);
      setMigrationStatus({
        success: false,
        eventsCreated: 0,
        participantsCreated: 0,
        agendaItemsCreated: 0,
        errors: [error.message || 'Unknown error occurred'],
      });
      setMigrationComplete(true);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDownloadBackup = () => {
    migration.downloadBackup();
  };

  const handleClose = () => {
    if (migrationComplete && migrationStatus?.success) {
      // Reload the page to use Supabase data
      window.location.reload();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Migrate to Cloud Database
          </DialogTitle>
          <DialogDescription>
            Migrate your data from local browser storage to Supabase for cross-device access
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!migrationComplete && (
            <>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Why migrate?</strong>
                  <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
                    <li>Enable public registration links that work on any device</li>
                    <li>Allow check-in pages to function independently</li>
                    <li>Share event management across multiple devices</li>
                    <li>Prevent "Event not found" errors on standalone pages</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Before migrating:</strong>
                  <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
                    <li>Ensure Supabase database is set up with the correct schema</li>
                    <li>Download a backup of your local data (recommended)</li>
                    <li>Migration is additive - existing Supabase data won't be deleted</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {isMigrating && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Migrating data...</p>
                  <Progress value={progress} />
                </div>
              )}
            </>
          )}

          {migrationComplete && migrationStatus && (
            <div className="space-y-3">
              {migrationStatus.success ? (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <strong className="text-green-900">Migration successful!</strong>
                    <div className="mt-2 text-sm text-green-800">
                      <p>✓ {migrationStatus.eventsCreated} event(s) migrated</p>
                      <p>✓ {migrationStatus.participantsCreated} participant(s) migrated</p>
                      <p>✓ {migrationStatus.agendaItemsCreated} agenda item(s) migrated</p>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Migration failed</strong>
                    <div className="mt-2 text-sm space-y-1">
                      {migrationStatus.errors.map((error, index) => (
                        <p key={index}>• {error}</p>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadBackup}
            disabled={isMigrating}
            className="w-full sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Backup
          </Button>

          {!migrationComplete ? (
            <Button
              onClick={handleMigrate}
              disabled={isMigrating}
              className="w-full sm:w-auto"
            >
              <Upload className="mr-2 h-4 w-4" />
              {isMigrating ? 'Migrating...' : 'Start Migration'}
            </Button>
          ) : (
            <Button onClick={handleClose} className="w-full sm:w-auto">
              {migrationStatus?.success ? 'Reload & Use Cloud Data' : 'Close'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
