import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { ChevronLeft, ChevronRight, Search, FileText, Download, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Input } from "../ui/input";
import { dashboardApi } from "../../lib/dashboard-api";
import { exportToCsv } from "../../lib/csv";
import { authorityLabel } from "../../lib/authority";
import { useDebounce } from "../../hooks/use-debounce";
import type { DashboardAssessment } from "../../types/dashboard";

/** الانحراف الموقّع = مسؤولية النظام − مسؤولية نجم (موجب: النظام أعلى، سالب: النظام أقل). */
function signedDeviation(row: DashboardAssessment): number | null {
  if (row.najmLiabilityUser === null) return null;
  return row.appLiabilityUser - row.najmLiabilityUser;
}

export default function DashboardAssessments({ compact }: { compact?: boolean }) {
  const [data, setData] = useState<DashboardAssessment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery);
  const limit = compact ? 5 : 10;

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await dashboardApi.getAssessments(page, limit, { search: debouncedSearch });
        if (!active) return;
        setData(res.data);
        setTotal(res.total);
      } catch (err) { console.error(err); }
      finally { if (active) setLoading(false); }
    };
    fetchData();
    return () => { active = false; };
  }, [page, limit, debouncedSearch]);

  const totalPages = Math.ceil(total / limit);

  const handleExport = () => {
    exportToCsv(
      "assessments",
      [
        { key: "accidentId", header: "معرف الحادث" },
        { key: "assessedAt", header: "تاريخ التقييم" },
        { key: "authority", header: "الجهة المسؤولة" },
        { key: "appLiabilityUser", header: "مسؤولية النظام %" },
        { key: "najmLiabilityUser", header: "مسؤولية الجهة %" },
        { key: "signed", header: "الانحراف الموقّع %" },
        { key: "userDescription", header: "وصف المستخدم" },
      ],
      data.map((r) => ({
        accidentId: r.accidentId,
        assessedAt: r.assessedAt,
        authority: authorityLabel(r.authoritySource, r.authorityOther),
        appLiabilityUser: r.appLiabilityUser,
        najmLiabilityUser: r.najmLiabilityUser,
        signed: signedDeviation(r),
        userDescription: r.userDescription,
      })),
    );
  };

  return (
    <div className={compact ? "" : "p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto space-y-6"}>
      {!compact && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">تقييمات نجم</h2>
            <p className="text-sm text-muted-foreground mt-0.5">سجل التقييمات ومقارنات المسؤولية</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExport} disabled={data.length === 0}>
              <Download className="w-3.5 h-3.5" /> تصدير
            </Button>
          </div>
        </div>
      )}

      <Card className={compact ? "shadow-none border-0 rounded-none" : "shadow-sm border-border"}>
        {!compact && (
          <CardHeader className="border-b px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بمعرف الحادث..."
                  className="pr-9 h-9 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Badge variant="secondary" className="text-xs">{total} تقييم</Badge>
            </div>
          </CardHeader>
        )}

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold py-3 px-4">تاريخ التقييم</TableHead>
                  <TableHead className="text-xs font-semibold py-3">معرف الحادث</TableHead>
                  <TableHead className="text-xs font-semibold py-3">الجهة المسؤولة</TableHead>
                  <TableHead className="text-xs font-semibold py-3">مسؤولية النظام</TableHead>
                  <TableHead className="text-xs font-semibold py-3">مسؤولية الجهة</TableHead>
                  <TableHead className="text-xs font-semibold py-3">الانحراف (± مقابل الجهة)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: compact ? 5 : 10 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                      <TableCell className="py-3 px-4"><div className="h-4 w-24 bg-muted rounded" /></TableCell>
                      <TableCell className="py-3"><div className="h-4 w-28 bg-muted rounded" /></TableCell>
                      <TableCell className="py-3"><div className="h-5 w-20 bg-muted rounded" /></TableCell>
                      <TableCell className="py-3"><div className="h-5 w-16 bg-muted rounded" /></TableCell>
                      <TableCell className="py-3"><div className="h-5 w-16 bg-muted rounded" /></TableCell>
                      <TableCell className="py-3"><div className="h-5 w-16 bg-muted rounded" /></TableCell>
                    </TableRow>
                  ))
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FileText className="w-8 h-8 opacity-40" />
                        <p className="text-sm">لا توجد تقييمات مطابقة</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => {
                    const signed = signedDeviation(row);
                    return (
                      <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-xs font-mono text-muted-foreground py-3 px-4">
                          {new Date(row.assessedAt).toLocaleDateString("ar-EG", {
                            day: "2-digit", month: "2-digit", year: "numeric", calendar: "gregory"
                          })}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground py-3">
                          <span className="bg-muted px-2 py-1 rounded select-all">{row.accidentId.slice(0, 8)}...</span>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className="text-[10px] font-medium">
                            {authorityLabel(row.authoritySource, row.authorityOther)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 text-sm font-semibold">
                          {row.appLiabilityUser}%
                        </TableCell>
                        <TableCell className="py-3">
                          {row.najmLiabilityUser !== null ? (
                            <span className="text-sm font-semibold text-primary">{row.najmLiabilityUser}%</span>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">قيد الانتظار</Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          {signed === null ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : signed === 0 ? (
                            <Badge variant="secondary" className="bg-success/10 text-success border-0 text-[10px] px-1.5 gap-1">
                              <Minus className="w-3 h-3" /> مطابق
                            </Badge>
                          ) : signed > 0 ? (
                            <Badge variant="secondary" className="bg-destructive/10 text-destructive border-0 text-[10px] px-1.5 gap-1" title="النظام قدّر مسؤولية أعلى من نجم">
                              <TrendingUp className="w-3 h-3" /> +{signed}%
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-chart-4/10 text-chart-4 border-0 text-[10px] px-1.5 gap-1" title="النظام قدّر مسؤولية أقل من نجم">
                              <TrendingDown className="w-3 h-3" /> {signed}%
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t">
            <p className="text-xs text-muted-foreground">
              عرض {(page - 1) * limit + 1} - {Math.min(page * limit, total)} من {total}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8 text-xs" disabled>{page}</Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
