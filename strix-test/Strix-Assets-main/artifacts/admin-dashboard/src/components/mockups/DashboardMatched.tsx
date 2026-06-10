import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight, CheckCircle, AlertTriangle } from "lucide-react";
import { dashboardApi } from "../../lib/dashboard-api";
import type { DashboardMatched } from "../../types/dashboard";

const statusColors: Record<string, string> = {
  FULL: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  PARTIAL: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  NONE: "bg-red-500/10 text-red-400 border-red-500/30",
};

const statusLabels: Record<string, string> = {
  FULL: "كامل",
  PARTIAL: "جزئي",
  NONE: "غير متطابق",
};

export default function DashboardMatched({ compact }: { compact?: boolean }) {
  const [data, setData] = useState<DashboardMatched[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 10;

  useEffect(() => { fetchData(); }, [page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getMatched(page, limit);
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
          {!compact && <h2 className="text-xl sm:text-2xl font-bold">الحوادث المشتركة</h2>}
          <p className="text-xs sm:text-sm text-muted-foreground">حوادث تم اكتشافها من جهازين ومطابقتها</p>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead className="text-xs">الوقت (الطرف أ)</TableHead>
                {!compact && <TableHead className="text-xs">الجهاز</TableHead>}
                <TableHead className="text-xs">نسبة أ</TableHead>
                <TableHead className="text-xs">نسبة ب</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">منطقة الاصطدام</TableHead>
                <TableHead className="text-xs">التطابق</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={compact ? 5 : 6} className="h-24 text-center text-muted-foreground text-sm">جاري التحميل...</TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={compact ? 5 : 6} className="h-24 text-center text-muted-foreground text-sm">لا توجد حوادث مشتركة</TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow key={row.id} className="hover:bg-secondary/30">
                    <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {new Date(row.accidentA_timestamp).toLocaleDateString("ar-SA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    {!compact && <TableCell className="text-xs font-mono text-muted-foreground">{row.accidentA_deviceId?.slice(0, 8)}...</TableCell>}
                    <TableCell className="text-xs font-medium">{row.liabilityAPercent}%</TableCell>
                    <TableCell className="text-xs font-medium">{row.liabilityBPercent}%</TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                      <div className="flex gap-1 items-center">
                        <Badge variant="outline" className="text-[10px]">{row.verifiedImpactZoneA?.replace(/-/g, " ")}</Badge>
                        <span className="text-muted-foreground">vs</span>
                        <Badge variant="outline" className="text-[10px]">{row.verifiedImpactZoneB?.replace(/-/g, " ")}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] font-medium gap-1 border ${statusColors[row.consistencyStatus] || "bg-secondary text-muted-foreground"}`}>
                        {row.consistencyStatus === "FULL" ? <CheckCircle className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                        {statusLabels[row.consistencyStatus] || row.consistencyStatus}
                      </Badge>
                    </TableCell>
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
