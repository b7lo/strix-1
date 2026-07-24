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
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { dashboardApi } from "../../lib/dashboard-api";
import type { DashboardAssessment } from "../../types/dashboard";

export default function DashboardAssessments() {
  const [data, setData] = useState<DashboardAssessment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [avgDiff, setAvgDiff] = useState<number | null>(null);
  const limit = 10;

  useEffect(() => {
    fetchData();
  }, [page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getAssessments(page, limit);
      setData(res.data);
      setTotal(res.total);
      if (res.averageDifference !== null) setAvgDiff(res.averageDifference);
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
          <h2 className="text-3xl font-bold tracking-tight">Fault Assessments</h2>
          <p className="text-muted-foreground">
            Compare Strix liability engine assessments with official Najm reports.
          </p>
        </div>
        {avgDiff !== null && (
          <div className="bg-muted px-4 py-2 rounded-lg text-sm border flex items-center gap-2">
            <span className="text-muted-foreground">Average Deviation:</span>
            <span className="font-bold text-lg">{avgDiff.toFixed(1)}%</span>
          </div>
        )}
      </div>

      <div className="rounded-md border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Strix Assessment</TableHead>
              <TableHead>Najm Assessment</TableHead>
              <TableHead>Deviation</TableHead>
              <TableHead>Description</TableHead>
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
                  No assessments found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => {
                const isExactMatch = row.liabilityDifference === 0;
                const isHighDeviation = row.liabilityDifference && row.liabilityDifference >= 50;

                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {new Date(row.assessedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">User: {row.appLiabilityUser}%</div>
                      <div className="text-xs text-muted-foreground">Other: {row.appLiabilityOther}%</div>
                    </TableCell>
                    <TableCell>
                      {row.najmLiabilityUser !== null ? (
                        <>
                          <div className="text-sm font-medium">User: {row.najmLiabilityUser}%</div>
                          <div className="text-xs text-muted-foreground">Other: {row.najmLiabilityOther}%</div>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Pending...</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.liabilityDifference !== null ? (
                        <Badge 
                          variant={isExactMatch ? "outline" : isHighDeviation ? "destructive" : "secondary"}
                          className={`flex w-fit items-center gap-1 ${isExactMatch ? 'border-green-600 text-green-600' : ''}`}
                        >
                          {isExactMatch ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          {row.liabilityDifference}%
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-xs max-w-[250px] truncate" title={row.userDescription || ""}>
                        {row.userDescription || "-"}
                      </p>
                    </TableCell>
                  </TableRow>
                );
              })
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
