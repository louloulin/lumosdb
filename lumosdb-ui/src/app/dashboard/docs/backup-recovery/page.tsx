"use client"

import Link from "next/link"
import { DocWrapper } from "@/components/doc-wrapper"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Save, 
  ChevronLeft, 
  History,
  Clock,
  Calendar,
  ArrowDownUp,
  HardDrive,
  AlertTriangle,
  ShieldCheck,
  FileCheck,
  Cloud,
  Settings,
  Undo2,
  CheckCircle2,
  ListChecks
} from "lucide-react"

export default function BackupRecoveryPage() {
  return (
    <DocWrapper>
      <div className="flex items-center mb-6">
        <Link href="/dashboard/docs">
          <Button variant="ghost" size="sm" className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            Back to Documentation
          </Button>
        </Link>
        <div className="ml-auto flex gap-2">
          <Badge variant="outline">Backup</Badge>
          <Badge variant="outline">Recovery</Badge>
          <Badge variant="outline">Data Protection</Badge>
        </div>
      </div>

      <div className="space-y-10">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <Save className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold">Backup & Recovery Guide</h1>
          </div>
          <p className="text-lg text-muted-foreground mb-6">
            How to protect your data with automated backups and recovery options in LumosDB
          </p>
          <Separator className="my-6" />
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Introduction to Database Backup</h2>
          <p>
            Database backups are essential for protecting your data against loss, corruption, or 
            accidental changes. LumosDB provides comprehensive backup and recovery features to ensure 
            your data remains safe and can be restored when needed.
          </p>
          <p>
            Key benefits of using LumosDB's backup system include:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Automated scheduled backups</li>
            <li>Multiple backup types (full, incremental, point-in-time)</li>
            <li>Local and cloud storage options</li>
            <li>Verification and integrity checks</li>
            <li>Simple restore process</li>
            <li>Support for all database types (SQLite, DuckDB, Vector)</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Backup Types</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <HardDrive className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Full Backup</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      A complete copy of your entire database, including all tables, indexes, and data.
                      Provides the simplest recovery option but requires more storage space.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <ArrowDownUp className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Incremental Backup</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Only backs up data that has changed since the last backup. Saves storage space
                      and completes faster, but requires the base backup and all increments for recovery.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <History className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Point-in-Time Recovery</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Uses transaction logs to restore the database to a specific moment in time.
                      Ideal for recovering from accidental changes or data corruption.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Table className="mt-6">
            <TableHeader>
              <TableRow>
                <TableHead>Backup Type</TableHead>
                <TableHead>Storage</TableHead>
                <TableHead>Speed</TableHead>
                <TableHead>Recovery Complexity</TableHead>
                <TableHead>Best For</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Full</TableCell>
                <TableCell>High</TableCell>
                <TableCell>Slower</TableCell>
                <TableCell>Simple</TableCell>
                <TableCell>Weekly backups, critical databases</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Incremental</TableCell>
                <TableCell>Low</TableCell>
                <TableCell>Fast</TableCell>
                <TableCell>Moderate</TableCell>
                <TableCell>Daily backups, high-change databases</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Point-in-Time</TableCell>
                <TableCell>Moderate</TableCell>
                <TableCell>Fast</TableCell>
                <TableCell>Complex</TableCell>
                <TableCell>Precise recovery needs, transactional databases</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Creating Manual Backups</h2>
          
          <p>
            To create a manual backup of your database:
          </p>
          <ol className="list-decimal list-inside space-y-3 ml-4">
            <li>
              <span className="font-medium">Navigate to the Backup section</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Click on "Backup & Recovery" in the main navigation sidebar.
              </p>
            </li>
            <li>
              <span className="font-medium">Select the database</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Choose which database you want to back up from the dropdown list.
              </p>
            </li>
            <li>
              <span className="font-medium">Choose backup type</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Select Full, Incremental, or Point-in-Time backup.
              </p>
            </li>
            <li>
              <span className="font-medium">Configure options</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Set compression level, encryption, and destination path.
              </p>
            </li>
            <li>
              <span className="font-medium">Start backup</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Click "Create Backup" to start the backup process.
              </p>
            </li>
          </ol>
          
          <Alert className="mt-6">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Security Best Practice</AlertTitle>
            <AlertDescription>
              Always enable encryption for backups containing sensitive data, especially when using 
              cloud storage. LumosDB uses AES-256 encryption to protect your backup files.
            </AlertDescription>
          </Alert>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Scheduling Automated Backups</h2>
          
          <p>
            Setting up scheduled backups ensures your data is protected automatically:
          </p>
          <ol className="list-decimal list-inside space-y-3 ml-4">
            <li>
              <span className="font-medium">Go to "Scheduled Backups" tab</span>
              <p className="text-muted-foreground ml-6 mt-1">
                In the Backup & Recovery section, select the "Scheduled" tab.
              </p>
            </li>
            <li>
              <span className="font-medium">Click "Create Schedule"</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Open the schedule creation form.
              </p>
            </li>
            <li>
              <span className="font-medium">Select database and backup type</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Choose which database to back up and the type of backup.
              </p>
            </li>
            <li>
              <span className="font-medium">Configure schedule</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Set frequency (daily, weekly, monthly) and specific time.
              </p>
            </li>
            <li>
              <span className="font-medium">Set retention policy</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Define how many backups to keep before automatic deletion.
              </p>
            </li>
            <li>
              <span className="font-medium">Save schedule</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Click "Save Schedule" to activate automated backups.
              </p>
            </li>
          </ol>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Suggested Schedule</h3>
                    <div className="text-sm space-y-2 mt-2">
                      <p className="flex justify-between">
                        <span className="font-medium">Daily:</span>
                        <span>Incremental backups</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="font-medium">Weekly:</span>
                        <span>Full backup</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="font-medium">Monthly:</span>
                        <span>Full backup (long-term storage)</span>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Retention Policies</h3>
                    <div className="text-sm space-y-2 mt-2">
                      <p className="flex justify-between">
                        <span className="font-medium">Daily backups:</span>
                        <span>Keep for 7-14 days</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="font-medium">Weekly backups:</span>
                        <span>Keep for 4-8 weeks</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="font-medium">Monthly backups:</span>
                        <span>Keep for 3-12 months</span>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Backup Storage Options</h2>
          
          <p>
            LumosDB supports multiple storage locations for your backups:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <HardDrive className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Local Storage</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Store backups on your local file system or network drives.
                      Fast and convenient, but vulnerable to local hardware failures.
                    </p>
                    <ul className="list-disc list-inside text-sm mt-2">
                      <li>Custom directory path</li>
                      <li>Network attached storage</li>
                      <li>External drives</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Cloud className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Cloud Storage</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Store backups in cloud services for better reliability and off-site protection.
                      Requires internet connection but provides better disaster recovery.
                    </p>
                    <ul className="list-disc list-inside text-sm mt-2">
                      <li>AWS S3 / S3-compatible</li>
                      <li>Google Cloud Storage</li>
                      <li>Azure Blob Storage</li>
                      <li>SFTP / WebDAV servers</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Alert className="mt-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>3-2-1 Backup Rule</AlertTitle>
            <AlertDescription>
              For critical data, follow the 3-2-1 backup rule: maintain at least 3 copies of your data, 
              store 2 backup copies on different storage media, and keep 1 copy off-site. LumosDB can be 
              configured to automatically implement this strategy.
            </AlertDescription>
          </Alert>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Restoring from Backup</h2>
          
          <p>
            When you need to recover your data, follow these steps:
          </p>
          <ol className="list-decimal list-inside space-y-3 ml-4">
            <li>
              <span className="font-medium">Navigate to "Backup History"</span>
              <p className="text-muted-foreground ml-6 mt-1">
                In the Backup & Recovery section, go to the "History" tab.
              </p>
            </li>
            <li>
              <span className="font-medium">Find the backup to restore</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Browse or search for the backup you want to restore from.
              </p>
            </li>
            <li>
              <span className="font-medium">Click "Restore" option</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Select the restore option for the chosen backup.
              </p>
            </li>
            <li>
              <span className="font-medium">Choose restore options</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Select whether to overwrite the existing database or restore to a new location.
              </p>
            </li>
            <li>
              <span className="font-medium">For point-in-time recovery</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Select the specific timestamp to restore to, if applicable.
              </p>
            </li>
            <li>
              <span className="font-medium">Confirm and restore</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Verify your choices and click "Restore Database".
              </p>
            </li>
          </ol>
          
          <Alert className="mt-6" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Caution</AlertTitle>
            <AlertDescription>
              Restoring a database will overwrite existing data unless you choose to restore to a new location. 
              Make sure you have selected the correct backup and destination before confirming the restore operation.
            </AlertDescription>
          </Alert>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Backup Verification</h2>
          
          <p>
            LumosDB can automatically verify your backups to ensure they are valid and can be restored:
          </p>
          
          <ul className="list-disc list-inside space-y-3 ml-4">
            <li>
              <span className="font-medium">Automatic verification</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Each backup is verified for integrity immediately after creation.
                This includes checking file integrity, database structure, and data consistency.
              </p>
            </li>
            <li>
              <span className="font-medium">Manual verification</span>
              <p className="text-muted-foreground ml-6 mt-1">
                You can manually verify any backup by selecting it in the backup history
                and clicking the "Verify" button.
              </p>
            </li>
            <li>
              <span className="font-medium">Test restoration</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Perform a test restore to a temporary database to fully validate backup integrity.
                This option is available from the backup's context menu.
              </p>
            </li>
          </ul>
          
          <div className="bg-muted p-4 rounded-md mt-6">
            <div className="flex items-center gap-3 mb-2">
              <FileCheck className="h-5 w-5" />
              <h3 className="font-semibold">Verification Report</h3>
            </div>
            <p className="text-sm mb-3">
              After verification, LumosDB generates a detailed report including:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Backup file integrity check</li>
              <li>Database structure validation</li>
              <li>Data sampling verification</li>
              <li>Recovery time estimate</li>
              <li>Space usage analysis</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Best Practices</h2>
          
          <ul className="list-disc list-inside space-y-3 ml-4">
            <li>
              <span className="font-medium">Test your backups regularly</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Periodically perform test restorations to ensure your backup strategy works.
                This is the only way to be certain your backups are truly viable.
              </p>
            </li>
            <li>
              <span className="font-medium">Diversify backup types</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Use a combination of full and incremental backups to balance 
                between storage efficiency and restore simplicity.
              </p>
            </li>
            <li>
              <span className="font-medium">Store backups in multiple locations</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Configure LumosDB to store backup copies both locally and in cloud storage
                for maximum protection against data loss.
              </p>
            </li>
            <li>
              <span className="font-medium">Enable encryption</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Always encrypt backups containing sensitive or personal data,
                especially when using cloud storage.
              </p>
            </li>
            <li>
              <span className="font-medium">Document your backup strategy</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Keep a record of your backup configuration, schedule, and retention policies.
                Store this information securely outside of the database itself.
              </p>
            </li>
          </ul>
        </section>

        <Separator className="my-6" />

        <div className="flex justify-between items-center">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/docs/sql-editor">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous: SQL Editor Tutorial
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/docs/performance">
              Next: Performance Optimization
              <ChevronLeft className="ml-2 h-4 w-4 rotate-180" />
            </Link>
          </Button>
        </div>
      </div>
    </DocWrapper>
  )
} 