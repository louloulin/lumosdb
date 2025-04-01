"use client"

import Link from "next/link"
import { ResponsiveContainer } from "@/components/ui/responsive-container"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  ChevronLeft, 
  Save,
  RotateCcw,
  ClipboardList,
  Clock,
  Settings2,
  Calendar,
  HardDrive,
  Cloud,
  Shield,
  Info,
  ChevronRight,
  AlertTriangle
} from "lucide-react"

export default function BackupRecoveryPage() {
  return (
    <ResponsiveContainer className="max-w-4xl mx-auto p-6">
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
            Learn how to protect your data with scheduled backups and reliable recovery options
          </p>
          <Separator className="my-6" />
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Introduction to Backup & Recovery</h2>
          <p>
            The LumosDB Backup & Recovery system provides a comprehensive solution for protecting your 
            databases against data loss, corruption, or accidental changes. Regular backups are 
            essential for any production database environment, and our tools make it easy to set 
            up automated backup schedules and perform recoveries when needed.
          </p>
          <p>
            Key features of the Backup & Recovery system include:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Full and incremental database backups</li>
            <li>Customizable backup schedules</li>
            <li>Point-in-time recovery options</li>
            <li>Local and cloud storage support</li>
            <li>Backup verification and validation</li>
            <li>Secure, encrypted backup storage</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Backup Types</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <HardDrive className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Full Backups</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Complete backups of your entire database, including all tables, schemas, indexes, 
                      and stored procedures. Full backups provide the most comprehensive protection but 
                      require more storage space and longer backup times.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Recommended frequency: Weekly or daily, depending on database size and change rate.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Incremental Backups</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Backups that only include data that has changed since the last backup. Incremental 
                      backups are faster and use less storage space, making them ideal for frequent 
                      backups of large databases.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Recommended frequency: Daily or hourly for critical databases.
                    </p>
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
                    <h3 className="font-semibold">Transaction Log Backups</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Backups of the database transaction logs, which record all changes made to the 
                      database. Transaction log backups enable point-in-time recovery and minimize 
                      potential data loss in case of failure.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Recommended frequency: Every 15-30 minutes for databases with frequent changes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Snapshot Backups</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Point-in-time images of your database that can be created almost instantly. 
                      Snapshots are useful for creating quick backups before making major changes or 
                      for development and testing purposes.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Recommended use: Before schema changes, major updates, or as needed.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Creating Backups</h2>
          
          <h3 className="text-xl font-semibold mt-6">Manual Backups</h3>
          <p>
            To create a manual backup of your database:
          </p>
          <ol className="list-decimal list-inside space-y-3 ml-4">
            <li>
              <span className="font-medium">Navigate to the Backup & Recovery section</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Click on &quot;Backup & Recovery&quot; in the main navigation sidebar.
              </p>
            </li>
            <li>
              <span className="font-medium">Select a database to back up</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Choose the database you want to back up from the dropdown menu.
              </p>
            </li>
            <li>
              <span className="font-medium">Choose backup options</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Select the backup type (full, incremental, or transaction log), compression level, 
                and encryption settings.
              </p>
            </li>
            <li>
              <span className="font-medium">Select the backup destination</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Choose where to store the backup: local storage, cloud storage, or network location.
              </p>
            </li>
            <li>
              <span className="font-medium">Start the backup</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Click the &quot;Create Backup&quot; button to start the backup process.
              </p>
            </li>
          </ol>
          
          <Alert className="mt-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Backup Naming</AlertTitle>
            <AlertDescription>
              Backups are automatically named with a timestamp and database name for easy 
              identification. You can add custom identifiers or descriptions to help organize 
              your backups.
            </AlertDescription>
          </Alert>
          
          <h3 className="text-xl font-semibold mt-8">Scheduled Backups</h3>
          <p>
            To set up automatic scheduled backups:
          </p>
          <ol className="list-decimal list-inside space-y-3 ml-4">
            <li>
              <span className="font-medium">Go to the Schedule tab</span>
              <p className="text-muted-foreground ml-6 mt-1">
                In the Backup & Recovery section, click on the &quot;Schedules&quot; tab.
              </p>
            </li>
            <li>
              <span className="font-medium">Create a new backup schedule</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Click the &quot;New Schedule&quot; button to open the scheduler.
              </p>
            </li>
            <li>
              <span className="font-medium">Configure the schedule</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Select the database, backup type, and destination. Then define the schedule 
                frequency (daily, weekly, or custom), time of day, and retention policy.
              </p>
            </li>
            <li>
              <span className="font-medium">Set retention policies</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Define how long to keep backups and when to automatically delete old ones.
              </p>
            </li>
            <li>
              <span className="font-medium">Save and activate</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Click &quot;Save Schedule&quot; to create and activate the automated backup plan.
              </p>
            </li>
          </ol>
          
          <div className="bg-muted p-4 rounded-md mt-6">
            <div className="flex items-center mb-3">
              <Calendar className="h-5 w-5 mr-2" />
              <h4 className="font-semibold">Example Backup Schedule</h4>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-4 gap-4">
                <div className="font-medium">Schedule Name:</div>
                <div className="col-span-3">Production DB Backup Plan</div>
                
                <div className="font-medium">Database:</div>
                <div className="col-span-3">customers_db</div>
                
                <div className="font-medium">Full Backup:</div>
                <div className="col-span-3">Every Sunday at 1:00 AM</div>
                
                <div className="font-medium">Incremental Backup:</div>
                <div className="col-span-3">Daily at 3:00 AM</div>
                
                <div className="font-medium">Transaction Log:</div>
                <div className="col-span-3">Every 30 minutes</div>
                
                <div className="font-medium">Retention:</div>
                <div className="col-span-3">Keep full backups for 3 months, incremental for 2 weeks</div>
                
                <div className="font-medium">Storage:</div>
                <div className="col-span-3">Primary: Cloud Storage / Secondary: Local Network</div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Restoring from Backups</h2>
          
          <Alert className="mt-4" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              Database restoration will overwrite existing data. Make sure you select the correct 
              database and backup before initiating a recovery operation.
            </AlertDescription>
          </Alert>
          
          <h3 className="text-xl font-semibold mt-6">Standard Recovery</h3>
          <p>
            To restore a database from a backup:
          </p>
          <ol className="list-decimal list-inside space-y-3 ml-4">
            <li>
              <span className="font-medium">Navigate to the Recovery section</span>
              <p className="text-muted-foreground ml-6 mt-1">
                In the Backup & Recovery section, click on the &quot;Recovery&quot; tab.
              </p>
            </li>
            <li>
              <span className="font-medium">Select the target database</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Choose the database you want to restore from the dropdown menu.
              </p>
            </li>
            <li>
              <span className="font-medium">Select a backup to restore</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Browse your backups and select the one you want to restore from.
              </p>
            </li>
            <li>
              <span className="font-medium">Choose recovery options</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Select whether to restore to the original location or a new database, 
                and specify any advanced recovery options.
              </p>
            </li>
            <li>
              <span className="font-medium">Start the recovery process</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Click &quot;Start Recovery&quot; to begin restoring your database.
              </p>
            </li>
          </ol>
          
          <h3 className="text-xl font-semibold mt-8">Point-in-Time Recovery</h3>
          <p>
            To restore a database to a specific point in time:
          </p>
          <ol className="list-decimal list-inside space-y-3 ml-4">
            <li>
              <span className="font-medium">Navigate to the Recovery section</span>
              <p className="text-muted-foreground ml-6 mt-1">
                In the Backup & Recovery section, click on the &quot;Recovery&quot; tab.
              </p>
            </li>
            <li>
              <span className="font-medium">Select Point-in-Time Recovery option</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Choose the &quot;Point-in-Time Recovery&quot; option from the recovery types.
              </p>
            </li>
            <li>
              <span className="font-medium">Select the target database</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Choose the database you want to restore.
              </p>
            </li>
            <li>
              <span className="font-medium">Specify the date and time</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Select the exact date and time you want to restore the database to using 
                the calendar and time picker.
              </p>
            </li>
            <li>
              <span className="font-medium">Choose recovery options</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Select whether to restore to the original location or a new database.
              </p>
            </li>
            <li>
              <span className="font-medium">Start the recovery process</span>
              <p className="text-muted-foreground ml-6 mt-1">
                Click &quot;Start Recovery&quot; to begin restoring your database to the 
                specified point in time.
              </p>
            </li>
          </ol>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Backup Storage Options</h2>
          
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
                      Store backups on your local server or workstation. This option provides quick 
                      access for restores but doesn&apos;t protect against hardware failures or disasters 
                      affecting your physical location.
                    </p>
                    <ul className="list-disc list-inside space-y-1 mt-2 text-sm text-muted-foreground">
                      <li>Fast backup and restore speeds</li>
                      <li>No internet connectivity required</li>
                      <li>Limited by available local disk space</li>
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
                      Store backups in cloud storage services like AWS S3, Google Cloud Storage, 
                      or Azure Blob Storage. Cloud storage provides off-site protection and 
                      virtually unlimited capacity.
                    </p>
                    <ul className="list-disc list-inside space-y-1 mt-2 text-sm text-muted-foreground">
                      <li>Protection against local disasters</li>
                      <li>Scalable storage capacity</li>
                      <li>May have higher latency for large backups</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                    <Settings2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Best Practice: 3-2-1 Backup Strategy</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      For optimal data protection, follow the 3-2-1 backup strategy:
                    </p>
                    <ul className="list-disc list-inside space-y-1 mt-2 text-sm text-muted-foreground">
                      <li><span className="font-medium">3</span> copies of your data (including the original)</li>
                      <li><span className="font-medium">2</span> different storage types (e.g., local and cloud)</li>
                      <li><span className="font-medium">1</span> copy stored off-site (e.g., cloud storage)</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2">
                      LumosDB makes it easy to implement this strategy with multiple storage 
                      destinations for each backup job.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Backup Monitoring and Verification</h2>
          
          <p>
            Regularly monitor and verify your backups to ensure they are working correctly:
          </p>
          
          <h3 className="text-xl font-semibold mt-6">Backup Monitoring</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>
              <span className="font-medium">Backup Dashboard</span>: Check the Backup & Recovery dashboard 
              for an overview of recent backups, success rates, and upcoming scheduled backups.
            </li>
            <li>
              <span className="font-medium">Notifications</span>: Configure email or system notifications 
              for backup successes, failures, or warnings.
            </li>
            <li>
              <span className="font-medium">Backup Logs</span>: Review detailed logs for each backup 
              operation to troubleshoot any issues.
            </li>
            <li>
              <span className="font-medium">Storage Usage</span>: Monitor backup storage usage and 
              forecast future needs based on growth patterns.
            </li>
          </ul>
          
          <h3 className="text-xl font-semibold mt-6">Backup Verification</h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>
              <span className="font-medium">Integrity Checks</span>: LumosDB automatically performs 
              checksum verification on backups to ensure data integrity.
            </li>
            <li>
              <span className="font-medium">Test Restores</span>: Periodically perform test restores 
              to a separate environment to verify that backups can be successfully restored.
            </li>
            <li>
              <span className="font-medium">Validation Reports</span>: Generate and review backup 
              validation reports from the Verification tab.
            </li>
          </ul>
          
          <Alert className="mt-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Regular Testing</AlertTitle>
            <AlertDescription>
              The only way to be certain your backup strategy works is to test it regularly. 
              Schedule quarterly or monthly test restores to verify your ability to recover 
              from data loss.
            </AlertDescription>
          </Alert>
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
            <Link href="/dashboard/docs">
              Back to Documentation
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </ResponsiveContainer>
  )
} 