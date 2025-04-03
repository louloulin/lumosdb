"use client"

import { useState, useEffect } from "react"
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
  Loader2,
  RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useLoading } from "@/contexts/loading-context"
import {
  createBackup,
  restoreBackup,
  getBackups,
  getBackupDetails,
  deleteBackup,
  exportBackup,
  verifyBackup,
  getSupportedDatabaseTypes,
  BackupType,
  BackupStatus,
  BackupInfo
} from "@/lib/api/backup-restore-service"

type RecoveryStatus = "none" | "in_progress" | "completed" | "failed"

export default function BackupPage() {
  const [activeTab, setActiveTab] = useState("create")
  const [selectedDatabase, setSelectedDatabase] = useState("sqlite")
  const [selectedDbName, setSelectedDbName] = useState("")
  const [backupName, setBackupName] = useState("")
  const [backupType, setBackupType] = useState<BackupType>(BackupType.FULL)
  const [compressionEnabled, setCompressionEnabled] = useState(true)
  const [encryptionEnabled, setEncryptionEnabled] = useState(false)
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null)
  const [recoveryStatus, setRecoveryStatus] = useState<RecoveryStatus>("none")
  const [databaseTypes, setDatabaseTypes] = useState<string[]>([])
  const [databaseNames, setDatabaseNames] = useState<Record<string, string[]>>({})
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [overwriteExisting, setOverwriteExisting] = useState(true)
  const [validateBeforeRestore, setValidateBeforeRestore] = useState(true)
  const { setModuleLoading } = useLoading()
  
  // 加载支持的数据库类型和备份列表
  useEffect(() => {
    const loadData = async () => {
      setModuleLoading('backup', true)
      try {
        // 获取支持的数据库类型
        const types = await getSupportedDatabaseTypes()
        setDatabaseTypes(types)
        
        // 获取备份列表
        const backupsList = await getBackups()
        setBackups(backupsList)
        
        // TODO: 在真实环境中，这应该从API获取
        // 为演示目的，我们仍然使用一些模拟数据
        setDatabaseNames({
          sqlite: ["main.db", "users.db", "products.db", "analytics.db"],
          duckdb: ["analytics.duckdb", "reports.duckdb", "metrics.duckdb"],
          vectors: ["embeddings.vec", "text_vectors.vec", "image_vectors.vec"]
        })
      } catch (error) {
        console.error("Failed to load backup data:", error)
        toast.error("Failed to load backup data")
      } finally {
        setModuleLoading('backup', false)
      }
    }
    
    loadData()
  }, [setModuleLoading])
  
  // 刷新备份列表
  const refreshBackups = async () => {
    setModuleLoading('backup', true)
    try {
      const backupsList = await getBackups()
      setBackups(backupsList)
      toast.success("Backup list refreshed")
    } catch (error) {
      console.error("Failed to refresh backups:", error)
      toast.error("Failed to refresh backup list")
    } finally {
      setModuleLoading('backup', false)
    }
  }
  
  // 创建备份的处理函数
  const handleCreateBackup = async () => {
    if (!selectedDbName) {
      toast.error("Please select a database")
      return
    }
    
    if (!backupName) {
      const generatedName = `${selectedDbName}_backup_${format(new Date(), "yyyyMMdd_HHmm")}`
      setBackupName(generatedName)
    }
    
    if (scheduleEnabled && !scheduleDate) {
      toast.error("Please select a schedule date")
      return
    }
    
    if (scheduleEnabled) {
      toast.success(`Backup scheduled for ${format(scheduleDate!, "PPpp")}`)
      return
    }
    
    setIsLoading(true)
    setProgress(0)
    setModuleLoading('backup', true)
    
    try {
      const result = await createBackup({
        databaseType: selectedDatabase,
        databaseName: selectedDbName,
        backupName: backupName || undefined,
        backupType: backupType,
        compression: compressionEnabled,
        encryption: encryptionEnabled,
        scheduledTime: scheduleEnabled ? scheduleDate : undefined
      }, (progress) => {
        setProgress(progress)
      })
      
      if (result.success) {
        toast.success("Backup completed successfully")
        // 成功后刷新备份列表
        refreshBackups()
      } else {
        toast.error(`Backup failed: ${result.error}`)
      }
    } catch (error) {
      console.error("Error creating backup:", error)
      toast.error("Failed to create backup")
    } finally {
      setIsLoading(false)
      setModuleLoading('backup', false)
    }
  }
  
  // 恢复备份的处理函数
  const handleRestoreBackup = async () => {
    if (!selectedBackup) {
      toast.error("Please select a backup to restore")
      return
    }
    
    setRecoveryStatus("in_progress")
    setModuleLoading('backup', true)
    
    try {
      const result = await restoreBackup({
        backupId: selectedBackup,
        overwriteExisting: overwriteExisting,
        validateBeforeRestore: validateBeforeRestore
      }, (progress) => {
        setProgress(progress)
      })
      
      if (result.success) {
        setRecoveryStatus("completed")
        toast.success("Backup restored successfully")
      } else {
        setRecoveryStatus("failed")
        toast.error(`Restore failed: ${result.error}`)
      }
    } catch (error) {
      console.error("Error restoring backup:", error)
      setRecoveryStatus("failed")
      toast.error("Failed to restore backup")
    } finally {
      setModuleLoading('backup', false)
    }
  }
  
  // 导出备份
  const handleExportBackup = async (backupId: string) => {
    setModuleLoading('backup', true)
    try {
      const result = await exportBackup(backupId)
      if (result.success) {
        toast.success("Backup exported successfully")
      } else {
        toast.error(`Export failed: ${result.error}`)
      }
    } catch (error) {
      console.error("Error exporting backup:", error)
      toast.error("Failed to export backup")
    } finally {
      setModuleLoading('backup', false)
    }
  }
  
  // 删除备份
  const handleDeleteBackup = async (backupId: string) => {
    if (!confirm("Are you sure you want to delete this backup?")) {
      return
    }
    
    setModuleLoading('backup', true)
    try {
      const result = await deleteBackup(backupId)
      if (result.success) {
        toast.success("Backup deleted successfully")
        // 刷新备份列表
        refreshBackups()
        
        // 如果当前选中的是被删除的备份，清除选择
        if (selectedBackup === backupId) {
          setSelectedBackup(null)
        }
      } else {
        toast.error(`Delete failed: ${result.error}`)
      }
    } catch (error) {
      console.error("Error deleting backup:", error)
      toast.error("Failed to delete backup")
    } finally {
      setModuleLoading('backup', false)
    }
  }
  
  // 验证备份
  const handleVerifyBackup = async (backupId: string) => {
    setModuleLoading('backup', true)
    try {
      const result = await verifyBackup(backupId)
      if (result.success) {
        if (result.isValid) {
          toast.success("Backup verified successfully")
        } else {
          toast.error("Backup verification failed: Backup may be corrupted")
        }
      } else {
        toast.error(`Verification failed: ${result.error}`)
      }
    } catch (error) {
      console.error("Error verifying backup:", error)
      toast.error("Failed to verify backup")
    } finally {
      setModuleLoading('backup', false)
    }
  }
  
  // 获取适当的数据库图标
  const getDatabaseIcon = (dbType: string) => {
    switch (dbType) {
      case "sqlite":
        return <Database className="h-4 w-4" />
      case "duckdb":
        return <HardDrive className="h-4 w-4" />
      case "vectors":
        return <Grid3X3 className="h-4 w-4" />
      default:
        return <Database className="h-4 w-4" />
    }
  }
  
  // 获取状态标签
  const getStatusBadge = (status: BackupStatus) => {
    switch (status) {
      case BackupStatus.COMPLETED:
        return (
          <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
          </Badge>
        )
      case BackupStatus.RUNNING:
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Running
          </Badge>
        )
      case BackupStatus.FAILED:
        return (
          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
            <XCircle className="h-3 w-3 mr-1" /> Failed
          </Badge>
        )
      case BackupStatus.SCHEDULED:
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" /> Scheduled
          </Badge>
        )
      default:
        return null
    }
  }
  
  return (
    <DocWrapper className="space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Backup & Recovery</h2>
        <Button variant="outline" onClick={refreshBackups}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Backups
        </Button>
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
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Create New Backup</CardTitle>
              <CardDescription>
                Back up your database for safekeeping and recovery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="database-type">Database Type</Label>
                  <Select 
                    value={selectedDatabase}
                    onValueChange={value => {
                      setSelectedDatabase(value);
                      setSelectedDbName("");
                    }}
                  >
                    <SelectTrigger id="database-type">
                      <SelectValue placeholder="Select database type" />
                    </SelectTrigger>
                    <SelectContent>
                      {databaseTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-3">
                  <Label htmlFor="database-name">Database Name</Label>
                  <Select 
                    value={selectedDbName}
                    onValueChange={setSelectedDbName}
                    disabled={!selectedDatabase}
                  >
                    <SelectTrigger id="database-name">
                      <SelectValue placeholder="Select database" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedDatabase && databaseNames[selectedDatabase]?.map(name => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-3">
                  <Label htmlFor="backup-name">Backup Name (Optional)</Label>
                  <Input 
                    id="backup-name"
                    placeholder="Enter backup name or leave empty for automatic name"
                    value={backupName}
                    onChange={(e) => setBackupName(e.target.value)}
                  />
                </div>
                
                <div className="grid gap-3">
                  <Label htmlFor="backup-type">Backup Type</Label>
                  <Select
                    value={backupType}
                    onValueChange={(value) => setBackupType(value as BackupType)}
                  >
                    <SelectTrigger id="backup-type">
                      <SelectValue placeholder="Select backup type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={BackupType.FULL}>Full Backup</SelectItem>
                      <SelectItem value={BackupType.INCREMENTAL}>Incremental Backup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Separator className="my-6" />
              
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
                  <div className="pt-2 ml-6">
                    <Label htmlFor="schedule-date" className="mb-2 block">Schedule Date & Time</Label>
                    <div className="flex gap-2 items-start">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-[240px] justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {scheduleDate ? format(scheduleDate, "PPP") : "Pick a date"}
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
                      
                      <Select
                        value={scheduleDate ? format(scheduleDate, "HH:mm") : "12:00"}
                        onValueChange={(time) => {
                          if (scheduleDate) {
                            const [hours, minutes] = time.split(':').map(Number);
                            const newDate = new Date(scheduleDate);
                            newDate.setHours(hours, minutes);
                            setScheduleDate(newDate);
                          }
                        }}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }).map((_, hour) => (
                            [0, 30].map(minute => {
                              const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                              return (
                                <SelectItem key={timeString} value={timeString}>
                                  {timeString}
                                </SelectItem>
                              );
                            })
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
              
              {isLoading && (
                <div className="mt-6">
                  <Label className="block mb-2">Backup Progress</Label>
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{progress.toFixed(0)}% Complete</span>
                      <span>Creating backup...</span>
                    </div>
                  </div>
                </div>
              )}

              <Alert className="mt-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Backups are essential for data safety. We recommend regular backups and secure storage.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                onClick={handleCreateBackup}
                disabled={isLoading || !selectedDbName}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Backup...
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
                {backups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-md">
                    <DownloadCloud className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p>No backups available</p>
                  </div>
                ) : (
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
                          {getStatusBadge(backup.status)}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleExportBackup(backup.id)
                            }}
                            title="Export backup"
                          >
                            <DownloadCloud className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleVerifyBackup(backup.id)
                            }}
                            title="Verify backup"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteBackup(backup.id)
                            }}
                            title="Delete backup"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                onClick={handleRestoreBackup}
                disabled={!selectedBackup || recoveryStatus === "in_progress" || backups.length === 0}
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
                  <Checkbox 
                    id="overwrite" 
                    checked={overwriteExisting}
                    onCheckedChange={(checked) => setOverwriteExisting(checked === true)}
                  />
                  <Label htmlFor="overwrite" className="font-normal">Overwrite existing database</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="validate" 
                    checked={validateBeforeRestore}
                    onCheckedChange={(checked) => setValidateBeforeRestore(checked === true)}
                  />
                  <Label htmlFor="validate" className="font-normal">Validate backup before restoring</Label>
                </div>
                
                <Alert variant="destructive">
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
              <CardDescription>
                View and manage your scheduled backup jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label>Scheduled Backup Jobs</Label>
                
                {backups.filter(b => b.status === BackupStatus.SCHEDULED).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-md mt-4">
                    <CalendarOutline className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p>No scheduled backups</p>
                    <Button 
                      variant="link" 
                      onClick={() => {
                        setActiveTab("create")
                        setScheduleEnabled(true)
                      }}
                    >
                      Create a scheduled backup
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 mt-4">
                    {backups
                      .filter(b => b.status === BackupStatus.SCHEDULED)
                      .map((backup) => (
                        <div 
                          key={backup.id} 
                          className="flex items-center justify-between p-3 border rounded-md"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                              <Clock className="h-4 w-4" />
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
                            {getStatusBadge(backup.status)}
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteBackup(backup.id)}
                              title="Cancel scheduled backup"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DocWrapper>
  )
} 