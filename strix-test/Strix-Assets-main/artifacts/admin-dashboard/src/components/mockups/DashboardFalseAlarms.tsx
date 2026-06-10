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
  const limit = compact ? 5 : 10;

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-bold text-slate-300 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          {compact ? "الإنذارات الكاذبة المفلترة" : "قائمة الإنذارات الكاذبة"}
          <Badge variant="secondary" className="px-2 py-0 h-5 text-[10px] bg-slate-950 border-slate-800 text-slate-400">{total}</Badge>
        </h3>
        <div className="text-[10px] text-slate-500">
          {!compact && `الصفحة ${page} من ${totalPages || 1}`}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/20 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-900/40 border-slate-800">
                <TableHead className="text-xs font-semibold text-slate-400">التاريخ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400">السبب</TableHead>
                {!compact && <TableHead className="text-xs font-semibold text-slate-400">التفاصيل الفنية</TableHead>}
                <TableHead className="text-xs font-semibold text-slate-400 hidden sm:table-cell">معرف الجهاز</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400">قوة الاصطدام</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={compact ? 4 : 5} className="h-24 text-center text-slate-500 text-xs">
                    جاري تحميل الإنذارات الكاذبة...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={compact ? 4 : 5} className="h-24 text-center text-slate-500 text-xs">
                    لا توجد إنذارات كاذبة مسجلة
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow key={row.id} className="border-slate-800 hover:bg-slate-900/30 transition-colors">
                    <TableCell className="text-xs font-mono text-slate-400 whitespace-nowrap">
                      {new Date(row.reportedAt).toLocaleDateString("ar-SA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <ShieldOff className="w-2.5 h-2.5 ml-1" />{row.reason}
                      </Badge>
                    </TableCell>
                    {!compact && <TableCell className="text-xs text-slate-300 max-w-[200px] truncate">{row.details || "-"}</TableCell>}
                    <TableCell className="text-xs font-mono text-slate-500 hidden sm:table-cell">{row.deviceId?.slice(0, 12)}...</TableCell>
                    <TableCell className="text-xs font-mono text-slate-200">{row.peakGForce ? `${row.peakGForce.toFixed(2)} G` : "غير معروف"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {!compact && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {`${(page - 1) * limit + 1} - ${Math.min(page * limit, total)} من ${total}`}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading} className="h-8 text-xs gap-1 border-slate-800 bg-slate-950/40 text-slate-300 hover:bg-slate-900">
              <ChevronRight className="w-3.5 h-3.5" />السابق
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading || total === 0} className="h-8 text-xs gap-1 border-slate-800 bg-slate-950/40 text-slate-300 hover:bg-slate-900">
              التالي<ChevronLeft className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
