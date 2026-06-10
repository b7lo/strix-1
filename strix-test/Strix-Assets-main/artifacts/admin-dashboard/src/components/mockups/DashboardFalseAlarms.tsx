import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight, ShieldOff } from "lucide-react";
import { dashboardApi } from "../../lib/dashboard-api";
import type { DashboardFalseAlarm } from "../../types/dashboard";

export default function DashboardFalseAlarms({ compact }: { compact?: boolean }) {
  const [data, setData] = useState<DashboardFalseAlarm[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 10;

  useEffect(() => { fetchData(); }, [page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getFalseAlarms(page, limit);
      setData(res.data);
      setTotal(res.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className={compact ? "" : "p-4 lg:p-6 space-y-4 max-w-7xl mx-auto"}>
      <div className="flex items-center justify-between">
        <div>
          {!compact && <h2 className="text-xl sm:text-2xl font-bold">الإنذارات الكاذبة</h2>}
          <p className="text-xs sm:text-sm text-muted-foreground">أحداث تم اكتشافها لكن تم رفضها</p>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead className="text-xs">التاريخ</TableHead>
                <TableHead className="text-xs">السبب</TableHead>
                {!compact && <TableHead className="text-xs">التفاصيل</TableHead>}
                <TableHead className="text-xs hidden sm:table-cell">الجهاز</TableHead>
                <TableHead className="text-xs">G-Force</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={compact ? 4 : 5} className="h-24 text-center text-muted-foreground text-sm">جاري التحميل...</TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={compact ? 4 : 5} className="h-24 text-center text-muted-foreground text-sm">لا توجد إنذارات كاذبة</TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow key={row.id} className="hover:bg-secondary/30">
                    <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {new Date(row.reportedAt).toLocaleDateString("ar-SA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <ShieldOff className="w-2.5 h-2.5" />{row.reason}
                      </Badge>
                    </TableCell>
                    {!compact && <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{row.details || "-"}</TableCell>}
                    <TableCell className="text-xs font-mono text-muted-foreground hidden sm:table-cell">{row.deviceId?.slice(0, 8)}...</TableCell>
                    <TableCell className="text-xs font-mono">{row.peakGForce ? `${row.peakGForce.toFixed(2)} G` : "غير معروف"}</TableCell>
                  </TableRow>
                ))
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
