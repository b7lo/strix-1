import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight, FileSearch, ShieldAlert } from "lucide-react";
import { dashboardApi } from "../../lib/dashboard-api";
import type { DashboardAccident } from "../../types/dashboard";

export default function DashboardAccidents() {
  const [data, setData] = useState<DashboardAccident[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 10;

  useEffect(() => {
    fetchData();
  }, [page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getAccidents(page, limit);
      setData(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Recent Accidents</h3>
        <div className="text-sm text-muted-foreground">
          Showing {(page - 1) * limit + 1} to Math.min(page * limit, total) of {total}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Impact Zone</TableHead>
              <TableHead>G-Force</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Loading data...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No accidents found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">
                    {new Date(row.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.severity === "CRITICAL" ? "destructive" : row.severity === "MODERATE" ? "secondary" : "default"}>
                      {row.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.impactZone}</TableCell>
                  <TableCell>{row.peakGForce.toFixed(2)} G</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {row.isFalseAlarm && <Badge variant="destructive">False Alarm</Badge>}
                      {row.matchedAccidentId && <Badge variant="default" className="bg-green-600">Matched</Badge>}
                      {row.hasAssessment && <Badge variant="outline" className="border-blue-600 text-blue-600">Assessed</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" title="View details">
                      <FileSearch className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || loading}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages || loading || total === 0}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
