import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight, FileSearch, ShieldOff, CheckCircle, ClipboardList } from "lucide-react";
import { dashboardApi } from "../../lib/dashboard-api";
import type { DashboardAccident } from "../../types/dashboard";

const severityColors: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/30",
  severe: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  moderate: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  minor: "bg-green-500/10 text-green-400 border-green-500/30",
};

const severityLabels: Record<string, string> = {
  critical: "حرج",
  severe: "شديد",
  moderate: "متوسط",
  minor: "طفيف",
};

export default function DashboardAccidents({ compact }: { compact?: boolean }) {
  const [data, setData] = useState<DashboardAccident[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = compact ? 5 : 10;

  useEffect(() => { fetchData(); }, [page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getAccidents(page, limit);
      setData(res.data);
      setTotal(res.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          {compact ? "آخر الحوادث" : "جميع الحوادث"}
          <span className="text-muted-foreground text-xs mr-2">({total})</span>
        </h3>
        <div className="text-xs text-muted-foreground">
          {!compact && `صفحة ${page} من ${totalPages || 1}`}
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead className="text-xs">التاريخ</TableHead>
                <TableHead className="text-xs">الشدة</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">منطقة الاصطدام</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">G-Force</TableHead>
                <TableHead className="text-xs">الحالة</TableHead>
                {!compact && <TableHead className="text-xs"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={compact ? 5 : 6} className="h-24 text-center text-muted-foreground text-sm">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={compact ? 5 : 6} className="h-24 text-center text-muted-foreground text-sm">
                    لا توجد حوادث
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow key={row.id} className="hover:bg-secondary/30">
                    <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {new Date(row.timestamp).toLocaleDateString("ar-SA", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit"
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] font-medium border ${severityColors[row.severity] || "bg-secondary text-muted-foreground"}`}>
                        {severityLabels[row.severity] || row.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                      {row.impactZone.replace(/-/g, " ")}
                    </TableCell>
                    <TableCell className="text-xs hidden sm:table-cell font-mono">
                      {row.peakGForce.toFixed(2)} G
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {row.isFalseAlarm && <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px]"><ShieldOff className="w-2.5 h-2.5 ml-0.5" />كاذب</Badge>}
                        {row.matchedAccidentId && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]"><CheckCircle className="w-2.5 h-2.5 ml-0.5" />مطابق</Badge>}
                        {row.hasAssessment && <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/30 text-[10px]"><ClipboardList className="w-2.5 h-2.5 ml-0.5" />مقيم</Badge>}
                      </div>
                    </TableCell>
                    {!compact && (
                      <TableCell className="text-left">
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <FileSearch className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
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
