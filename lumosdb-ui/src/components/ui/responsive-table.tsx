"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface ResponsiveTableProps extends React.HTMLAttributes<HTMLDivElement> {
  data: Record<string, any>[]
  columns: {
    key: string
    title: string
    render?: (value: any, row: Record<string, any>) => React.ReactNode
  }[]
  expandable?: boolean
  expandRender?: (row: Record<string, any>) => React.ReactNode
  rowKey?: string
  emptyText?: string
  stickyHeader?: boolean
}

const ResponsiveTable = React.forwardRef<HTMLDivElement, ResponsiveTableProps>(
  (
    { 
      className, 
      data = [], 
      columns = [], 
      expandable = false, 
      expandRender,
      rowKey = "id", 
      emptyText = "No data available",
      stickyHeader = false,
      ...props 
    }, 
    ref
  ) => {
    const [expandedRows, setExpandedRows] = React.useState<Record<string, boolean>>({})

    const toggleRow = (id: string) => {
      setExpandedRows((prev) => ({
        ...prev,
        [id]: !prev[id]
      }))
    }

    // Determine breakpoint for responsiveness
    const [isMobile, setIsMobile] = React.useState<boolean>(false)
    
    React.useEffect(() => {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768) // 768px is typical md breakpoint
      }
      
      checkMobile()
      window.addEventListener('resize', checkMobile)
      
      return () => {
        window.removeEventListener('resize', checkMobile)
      }
    }, [])

    if (data.length === 0) {
      return (
        <div 
          ref={ref} 
          className={cn(
            "w-full overflow-hidden rounded-md border text-center py-6 text-sm text-muted-foreground",
            className
          )}
          {...props}
        >
          {emptyText}
        </div>
      )
    }

    return (
      <div 
        ref={ref} 
        className={cn(
          "w-full overflow-hidden rounded-md border",
          className
        )}
        {...props}
      >
        {/* Desktop View */}
        {!isMobile && (
          <div className="w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className={cn(
                "[&_tr]:border-b",
                stickyHeader && "sticky top-0 z-10 bg-background"
              )}>
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  {expandable && <th className="h-12 px-4 text-left align-middle font-medium"></th>}
                  {columns.map((column) => (
                    <th 
                      key={column.key} 
                      className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0"
                    >
                      {column.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {data.map((row) => {
                  const rowId = String(row[rowKey])
                  const isExpanded = expandedRows[rowId]
                  
                  return (
                    <React.Fragment key={rowId}>
                      <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        {expandable && (
                          <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                            <button 
                              onClick={() => toggleRow(rowId)}
                              className="p-1 rounded-full hover:bg-muted transition-colors"
                            >
                              <ChevronDown 
                                className={cn(
                                  "h-4 w-4 transition-transform", 
                                  isExpanded && "transform rotate-180"
                                )} 
                              />
                            </button>
                          </td>
                        )}
                        {columns.map((column) => (
                          <td 
                            key={`${rowId}-${column.key}`} 
                            className="p-4 align-middle [&:has([role=checkbox])]:pr-0"
                          >
                            {column.render 
                              ? column.render(row[column.key], row)
                              : String(row[column.key] ?? "")}
                          </td>
                        ))}
                      </tr>
                      {expandable && isExpanded && expandRender && (
                        <tr className="bg-muted/30">
                          <td colSpan={columns.length + 1} className="p-4">
                            {expandRender(row)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Mobile View - Card Layout */}
        {isMobile && (
          <div className="divide-y">
            {data.map((row) => {
              const rowId = String(row[rowKey])
              const isExpanded = expandedRows[rowId]
              
              return (
                <div key={rowId} className="p-4">
                  <div className="space-y-3">
                    {columns.map((column) => (
                      <div key={`${rowId}-${column.key}`} className="flex justify-between items-start gap-2">
                        <div className="font-medium text-sm text-muted-foreground w-1/3">
                          {column.title}
                        </div>
                        <div className="text-sm flex-1 text-right">
                          {column.render 
                            ? column.render(row[column.key], row)
                            : String(row[column.key] ?? "")}
                        </div>
                      </div>
                    ))}
                    
                    {expandable && expandRender && (
                      <div className="pt-2">
                        <button 
                          onClick={() => toggleRow(rowId)}
                          className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors text-sm font-medium"
                        >
                          <span>Details</span>
                          <ChevronDown 
                            className={cn(
                              "h-4 w-4 transition-transform", 
                              isExpanded && "transform rotate-180"
                            )} 
                          />
                        </button>
                        
                        {isExpanded && (
                          <div className="pt-3 border-t mt-3">
                            {expandRender(row)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }
)

ResponsiveTable.displayName = "ResponsiveTable"

export { ResponsiveTable } 