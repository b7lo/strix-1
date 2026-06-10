import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { dashboardApi } from "../../lib/dashboard-api";
import type { DashboardAssessment } from "../../types/dashboard";

export default function DashboardAssessments({ compact }: { compact?: boolean }) {
  const [data, setData] = useState<DashboardAssessment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [avgDiff, setAvgDiff] = useState<number | null>(null);
  const limit = 10;

  useEffect(() => { fetchData(); }, [page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getAssessments(page, limit);
      setData(res.data);
      setTotal(res.total);
      if (res.averageDifference !== null) setAvgDiff(res.averageDifference);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className={compact ? "" : "p-4 lg:p-6 space-y-4 max-w-7xl mx-auto"}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          {!compact && <h2 className="text-xl sm:text-2xl font-bold">تقييمات نجم</h2>}
          <p className="text-xs sm:text-sm text-muted-foreground">مقارنة نسب الخطأ بين التطبيق ونجم</p>
        </div>
        {avgDiff !== null && (
          <div className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs flex items-center gap-2">
            <span className="text-muted-foreground">متوسط الانحراف:</span>
            <span className="font-bold text-amber-400">{avgDiff.toFixed(1)}%</span>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead className="text-xs">التاريخ</TableHead>
                <TableHead className="text-xs">التقييم (التطبيق)</TableHead>
                <TableHead className="text-xs">التقييم (نجم)</TableHead>
                <TableHead className="text-xs">الفرق</TableHead>
                {!compact && <TableHead className="text-xs">الوصف</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={compact ? 4 : 5} className="h-24 text-center text-muted-foreground text-sm">جاري التحميل...</TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={compact ? 4 : 5} className="h-24 text-center text-muted-foreground text-sm">لا توجد تقييمات</TableCell>
                </TableRow>
              ) : (
                data.map((row) => {
                  const isExactMatch = row.liabilityDifference === 0;
                  return (
                    <TableRow key={row.id} className="hover:bg-secondary/30">
                      <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(row.assessedAt).toLocaleDateString("ar-SA", { day: "numeric", month: "short" })}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="text-emerald-400 font-medium">{row.appLiabilityUser}%</span>
                        <span className="text-muted-foreground mx-1">/</span>
                        <span className="text-orange-400">{row.appLiabilityOther}%</span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.najmLiabilityUser !== null ? (
                          <><span className="text-emerald-400 font-medium">{row.najmLiabilityUser}%</span><span className="text-muted-foreground mx-1">/</span><span className="text-orange-400">{row.najmLiabilityOther}%</span></>
                        ) : (
                          <span className="text-muted-foreground italic">قيد الانتظار...</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.liabilityDifference !== null ? (
                          <Badge className={`text-[10px] font-medium gap-1 ${isExactMatch ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : row.liabilityDifference! >= 50 ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30"}`}>
                            {isExactMatch ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                            {row.liabilityDifference}%
                          </Badge>
                        ) : "-"}
                      </TableCell>
                      {!compact && (
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {row.userDescription || "-"}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {!compact && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {`${(page - 1) * limit + 1} - ${Math.min(page * limit, total)} من ${total}`}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading} className="h-8 text-xs gap-1">
              <ChevronRight className="w-3.5 h-3.5" />السابق
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading || total === 0} className="h-8 text-xs gap-1">
              التالي<ChevronLeft className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
