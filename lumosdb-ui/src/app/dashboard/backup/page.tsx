"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DocWrapper } from "@/components/doc-wrapper"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Database,
  Calendar as CalendarIcon,
  Clock,
  HardDrive,
  DownloadCloud,
  UploadCloud,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar as CalendarOutline,
  Grid3X3,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"

type BackupStatus = "completed" | "in_progress" | "failed"
type BackupType = "full" | "incremental"
type RecoveryStatus = "completed" | "in_progress" | "failed" | "none"

interface Backup {
  id: string
  name: string
  databaseType: string
  databaseName: string
  createdAt: Date
  size: string
  type: BackupType
  status: BackupStatus
}

export default function BackupPage() {
  const [, setActiveTab] = useState("create")
  const [selectedDatabase, setSelectedDatabase] = useState("sqlite")
  const [selectedDbName, setSelectedDbName] = useState("")
  const [backupName, setBackupName] = useState("")
  const [backupType, setBackupType] = useState<BackupType>("full")
  const [compressionEnabled, setCompressionEnabled] = useState(true)
  const [encryptionEnabled, setEncryptionEnabled] = useState(false)
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null)
  const [recoveryStatus, setRecoveryStatus] = useState<RecoveryStatus>("none")
  
  // Mock database names
  const databaseNames = {
    sqlite: ["main.db", "users.db", "products.db", "analytics.db"],
    duckdb: ["analytics.duckdb", "reports.duckdb", "metrics.duckdb"],
    vectors: ["embeddings.vec", "text_vectors.vec", "image_vectors.vec"]
  }
  
  // Mock backup data
  const backups: Backup[] = [
    {
      id: "1",
      name: "Daily Backup - Main DB",
      databaseType: "sqlite",
      databaseName: "main.db",
      createdAt: new Date(2023, 5, 15, 3, 30),
      size: "42.7 MB",
      type: "full",
      status: "completed"
    },
    {
      id: "2",
      name: "Weekly Backup - Analytics",
      databaseType: "duckdb",
      databaseName: "analytics.duckdb",
      createdAt: new Date(2023, 5, 12, 2, 0),
      size: "156.3 MB",
      type: "full",
      status: "completed"
    },
    {
      id: "3",
      name: "Pre-Migration Backup",
      databaseType: "sqlite",
      databaseName: "users.db",
      createdAt: new Date(2023, 5, 10, 18, 45),
      size: "28.9 MB",
      type: "full",
      status: "completed"
    },
    {
      id: "4",
      name: "Incremental Update",
      databaseType: "sqlite",
      databaseName: "main.db",
      createdAt: new Date(2023, 5, 14, 12, 15),
      size: "8.2 MB",
      type: "incremental",
      status: "completed"
    },
    {
      id: "5",
      name: "Vector DB Backup",
      databaseType: "vectors",
      databaseName: "embeddings.vec",
      createdAt: new Date(2023, 5, 8, 22, 10),
      size: "215.6 MB",
      type: "full",
      status: "completed"
    }
  ]
  
  // Mock function for creating a backup
  const handleCreateBackup = async () => {
    if (!selectedDbName) {
      alert("Please select a database");
      return;
    }
    
    if (!backupName) {
      setBackupName(`${selectedDbName}_backup_${format(new Date(), "yyyyMMdd_HHmm")}`);
    }
    
    if (scheduleEnabled && !scheduleDate) {
      alert("Please select a schedule date");
      return;
    }
    
    if (scheduleEnabled) {
      alert(`Backup scheduled for ${format(scheduleDate!, "PPpp")}`);
      return;
    }
    
    setIsLoading(true);
    setProgress(0);
    
    // Simulate backup progress
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (1 + Math.random() * 5);
        if (newProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsLoading(false);
            alert("Backup completed successfully");
          }, 500);
          return 100;
        }
        return newProgress;
      });
    }, 200);
  };
  
  // Mock function for restoring a backup
  const handleRestoreBackup = async () => {
    if (!selectedBackup) {
      alert("Please select a backup to restore");
      return;
    }
    
    setRecoveryStatus("in_progress");
    
    // Simulate restore process
    setTimeout(() => {
      setRecoveryStatus("completed");
    }, 3000);
  };
  
  // Get appropriate database icon
  const getDatabaseIcon = (dbType: string) => {
    switch (dbType) {
      case "sqlite":
        return <Database className="h-4 w-4" />;
      case "duckdb":
        return <HardDrive className="h-4 w-4" />;
      case "vectors":
        return <Grid3X3 className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };
  
  return (
    <DocWrapper className="space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Backup & Recovery</h2>
      </div>

      <Tabs defaultValue="create" onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="create" className="flex items-center">
            <DownloadCloud className="mr-2 h-4 w-4" />
            Create Backup
          </TabsTrigger>
          <TabsTrigger value="restore" className="flex items-center">
            <UploadCloud className="mr-2 h-4 w-4" />
            Restore Backup
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            Scheduled Backups
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create New Backup</CardTitle>
              <CardDescription>
                Back up your database to protect against data loss
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="database-type">Database Type</Label>
                  <Select value={selectedDatabase} onValueChange={setSelectedDatabase}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select database type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sqlite">SQLite</SelectItem>
                      <SelectItem value="duckdb">DuckDB</SelectItem>
                      <SelectItem value="vectors">Vector Database</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="database-name">Database Name</Label>
                  <Select value={selectedDbName} onValueChange={setSelectedDbName}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select database" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedDatabase === "sqlite" && 
                        databaseNames.sqlite.map(name => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))
                      }
                      {selectedDatabase === "duckdb" && 
                        databaseNames.duckdb.map(name => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))
                      }
                      {selectedDatabase === "vectors" && 
                        databaseNames.vectors.map(name => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="backup-name">Backup Name</Label>
                <Input 
                  id="backup-name"
                  placeholder={selectedDbName ? `${selectedDbName}_backup_${format(new Date(), "yyyyMMdd")}` : "Enter backup name"}
                  value={backupName}
                  onChange={(e) => setBackupName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="backup-type">Backup Type</Label>
                <Select value={backupType} onValueChange={(value) => setBackupType(value as BackupType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select backup type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Backup</SelectItem>
                    <SelectItem value="incremental">Incremental Backup</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {backupType === "full" 
                    ? "Creates a complete copy of your database"
                    : "Only backs up changes since the last full backup (requires a previous full backup)"
                  }
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <Label>Options</Label>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="compression"
                    checked={compressionEnabled}
                    onCheckedChange={(checked) => setCompressionEnabled(checked === true)}
                  />
                  <Label htmlFor="compression" className="font-normal">Enable compression</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="encryption"
                    checked={encryptionEnabled}
                    onCheckedChange={(checked) => setEncryptionEnabled(checked === true)}
                  />
                  <Label htmlFor="encryption" className="font-normal">Enable encryption</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="schedule"
                    checked={scheduleEnabled}
                    onCheckedChange={(checked) => setScheduleEnabled(checked === true)}
                  />
                  <Label htmlFor="schedule" className="font-normal">Schedule backup</Label>
                </div>
                
                {scheduleEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label>Date and Time</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !scheduleDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {scheduleDate ? format(scheduleDate, "PPP") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={scheduleDate}
                            onSelect={setScheduleDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Recurrence</Label>
                      <Select defaultValue="once">
                        <SelectTrigger>
                          <SelectValue placeholder="Select recurrence" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="once">Once</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
              
              {isLoading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="flex items-center">
                {selectedDbName && (
                  <>
                    {getDatabaseIcon(selectedDatabase)}
                    <Badge variant="outline" className="ml-2">
                      {selectedDatabase} / {selectedDbName}
                    </Badge>
                    {backupType === "full" ? (
                      <Badge variant="outline" className="ml-2">Full</Badge>
                    ) : (
                      <Badge variant="outline" className="ml-2">Incremental</Badge>
                    )}
                  </>
                )}
              </div>
              
              <Button 
                onClick={handleCreateBackup}
                disabled={isLoading || !selectedDbName}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Backup...
                  </>
                ) : scheduleEnabled ? (
                  <>
                    <CalendarOutline className="mr-2 h-4 w-4" />
                    Schedule Backup
                  </>
                ) : (
                  <>
                    <DownloadCloud className="mr-2 h-4 w-4" />
                    Create Backup
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="restore">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Restore from Backup</CardTitle>
              <CardDescription>
                Restore your database from a previous backup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Label>Select a backup to restore</Label>
                <div className="space-y-2">
                  {backups.map((backup) => (
                    <div 
                      key={backup.id} 
                      className={cn(
                        "flex items-center justify-between p-3 border rounded-md cursor-pointer hover:bg-accent/50",
                        selectedBackup === backup.id && "border-primary bg-accent"
                      )}
                      onClick={() => setSelectedBackup(backup.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          {getDatabaseIcon(backup.databaseType)}
                        </div>
                        <div>
                          <p className="font-medium">{backup.name}</p>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <span>{backup.databaseType}/{backup.databaseName}</span>
                            <span className="mx-2">•</span>
                            <span>{format(backup.createdAt, "PPp")}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{backup.size}</Badge>
                        {backup.type === "full" ? (
                          <Badge variant="outline">Full</Badge>
                        ) : (
                          <Badge variant="outline">Incremental</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {recoveryStatus === "in_progress" && (
                  <Alert className="bg-blue-50 border-blue-500">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <AlertTitle>Restoration in Progress</AlertTitle>
                    <AlertDescription>
                      Please wait while your database is being restored...
                    </AlertDescription>
                  </Alert>
                )}
                
                {recoveryStatus === "completed" && (
                  <Alert className="bg-green-50 border-green-500">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle>Restoration Complete</AlertTitle>
                    <AlertDescription>
                      Your database has been successfully restored.
                    </AlertDescription>
                  </Alert>
                )}
                
                {recoveryStatus === "failed" && (
                  <Alert className="bg-red-50 border-red-500">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <AlertTitle>Restoration Failed</AlertTitle>
                    <AlertDescription>
                      There was an error during the restoration process. Please try again.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                onClick={handleRestoreBackup}
                disabled={!selectedBackup || recoveryStatus === "in_progress"}
              >
                {recoveryStatus === "in_progress" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restore Selected Backup
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Recovery Options</CardTitle>
              <CardDescription>Advanced settings for database recovery</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="overwrite" />
                  <Label htmlFor="overwrite" className="font-normal">Overwrite existing database</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox id="restore-to-point" />
                  <Label htmlFor="restore-to-point" className="font-normal">Restore to specific point in time</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox id="validate" defaultChecked />
                  <Label htmlFor="validate" className="font-normal">Validate backup before restoring</Label>
                </div>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    Restoring a database will overwrite existing data. Make sure to create a backup of your current data if needed.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Backups</CardTitle>
              <CardDescription>Manage your scheduled backup tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    id: "sched1",
                    name: "Daily SQLite Backup",
                    database: "main.db",
                    schedule: "Daily at 03:00 AM",
                    nextRun: new Date(2023, 5, 16, 3, 0),
                    type: "full",
                    retention: "7 days"
                  },
                  {
                    id: "sched2",
                    name: "Weekly Analytics Backup",
                    database: "analytics.duckdb",
                    schedule: "Every Sunday at 02:00 AM",
                    nextRun: new Date(2023, 5, 18, 2, 0),
                    type: "full",
                    retention: "4 weeks"
                  },
                  {
                    id: "sched3",
                    name: "Monthly Vector DB Backup",
                    database: "embeddings.vec",
                    schedule: "1st day of month at 01:00 AM",
                    nextRun: new Date(2023, 6, 1, 1, 0),
                    type: "full",
                    retention: "6 months"
                  }
                ].map((schedule) => (
                  <div key={schedule.id} className="flex flex-col sm:flex-row sm:items-center justify-between border p-4 rounded-md">
                    <div>
                      <h3 className="font-medium">{schedule.name}</h3>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center">
                          <Database className="h-3 w-3 mr-1" />
                          <span>{schedule.database}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{schedule.schedule}</span>
                        </div>
                        <div className="flex items-center">
                          <CalendarOutline className="h-3 w-3 mr-1" />
                          <span>Next run: {format(schedule.nextRun, "PPp")}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2 sm:mt-0 flex flex-col sm:items-end gap-2">
                      <div className="flex gap-2">
                        <Badge variant="outline">{schedule.type}</Badge>
                        <Badge variant="outline">Retention: {schedule.retention}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm">
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Empty state */}
                {false && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CalendarOutline className="h-10 w-10 text-muted-foreground mb-2" />
                    <h3 className="font-medium mb-1">No scheduled backups</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Schedule regular backups to protect your databases
                    </p>
                    <Button>
                      Create Scheduled Backup
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full">
                <CalendarOutline className="mr-2 h-4 w-4" />
                Create New Schedule
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </DocWrapper>
  )
} 