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
  const limit = compact ? 5 : 10;

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
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-xs sm:text-sm font-bold text-slate-300 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          {compact ? "تقييمات مسؤولية نجم" : "قائمة تقييمات نجم"}
          <Badge variant="secondary" className="px-2 py-0 h-5 text-[10px] bg-slate-950 border-slate-800 text-slate-400">{total}</Badge>
        </h3>
        
        {avgDiff !== null && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-full px-3 py-1 text-[11px] flex items-center gap-2">
            <span className="text-slate-400">متوسط الانحراف:</span>
            <span className="font-bold text-amber-400">{avgDiff.toFixed(1)}%</span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/20 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-900/40 border-slate-800">
                <TableHead className="text-xs font-semibold text-slate-400">التاريخ</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400">تقييم التطبيق (مستخدم/آخر)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400">تقييم نجم (مستخدم/آخر)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400">فرق المسؤولية</TableHead>
                {!compact && <TableHead className="text-xs font-semibold text-slate-400">البيان</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={compact ? 4 : 5} className="h-24 text-center text-slate-500 text-xs">
                    جاري تحميل التقييمات...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={compact ? 4 : 5} className="h-24 text-center text-slate-500 text-xs">
                    لا توجد تقييمات مسجلة
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => {
                  const isExactMatch = row.liabilityDifference === 0;
                  return (
                    <TableRow key={row.id} className="border-slate-800 hover:bg-slate-900/30 transition-colors">
                      <TableCell className="text-xs font-mono text-slate-400 whitespace-nowrap">
                        {new Date(row.assessedAt).toLocaleDateString("ar-SA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        <span className="text-emerald-400 font-semibold">{row.appLiabilityUser}%</span>
                        <span className="text-slate-600 mx-1.5">/</span>
                        <span className="text-orange-400 font-semibold">{row.appLiabilityOther}%</span>
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {row.najmLiabilityUser !== null ? (
                          <>
                            <span className="text-emerald-400 font-semibold">{row.najmLiabilityUser}%</span>
                            <span className="text-slate-600 mx-1.5">/</span>
                            <span className="text-orange-400 font-semibold">{row.najmLiabilityOther}%</span>
                          </>
                        ) : (
                          <span className="text-slate-500 italic">بانتظار نجم...</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.liabilityDifference !== null ? (
                          <Badge className={`text-[10px] font-semibold border ${isExactMatch ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : row.liabilityDifference! >= 50 ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                            {isExactMatch ? <CheckCircle2 className="w-2.5 h-2.5 ml-1" /> : <AlertCircle className="w-2.5 h-2.5 ml-1" />}
                            {row.liabilityDifference}%
                          </Badge>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </TableCell>
                      {!compact && (
                        <TableCell className="text-xs text-slate-400 max-w-[200px] truncate">
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
