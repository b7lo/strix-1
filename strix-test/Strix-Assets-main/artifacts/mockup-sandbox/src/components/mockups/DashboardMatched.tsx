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
import { ChevronLeft, ChevronRight, CheckCircle, AlertTriangle } from "lucide-react";
import { dashboardApi } from "../../lib/dashboard-api";
import type { DashboardMatched } from "../../types/dashboard";

export default function DashboardMatched() {
  const [data, setData] = useState<DashboardMatched[]>([]);
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
      const res = await dashboardApi.getMatched(page, limit);
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
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cross-Verified Incidents</h2>
          <p className="text-muted-foreground">
            Accidents where two devices detected an impact and cross-verified forensic data.
          </p>
        </div>
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time (Party A)</TableHead>
              <TableHead>Party A Liability</TableHead>
              <TableHead>Party B Liability</TableHead>
              <TableHead>Impact (A vs B)</TableHead>
              <TableHead>Consistency</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Loading data...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No matched accidents found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {new Date(row.accidentA_timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{row.liabilityAPercent}%</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{row.liabilityBPercent}%</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 items-center text-sm">
                      <Badge variant="outline">{row.verifiedImpactZoneA}</Badge>
                      <span className="text-muted-foreground text-xs">vs</span>
                      <Badge variant="outline">{row.verifiedImpactZoneB}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={row.consistencyStatus === "FULL" ? "default" : row.consistencyStatus === "PARTIAL" ? "secondary" : "destructive"}
                      className={`flex w-fit items-center gap-1 ${row.consistencyStatus === "FULL" ? 'bg-green-600' : ''}`}
                    >
                      {row.consistencyStatus === "FULL" ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {row.consistencyStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="p-4 flex items-center justify-between border-t border-border">
          <div className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} results
          </div>
          <div className="flex items-center space-x-2">
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
      </div>
    </div>
  );
}
