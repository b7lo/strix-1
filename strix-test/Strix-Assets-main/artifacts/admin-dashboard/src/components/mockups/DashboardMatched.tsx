import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { ChevronLeft, ChevronRight, Search, GitMerge, Download, Filter, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "../ui/input";
import { dashboardApi } from "../../lib/dashboard-api";
import type { DashboardMatched } from "../../types/dashboard";

export default function DashboardMatched({ compact }: { compact?: boolean }) {
  const [data, setData] = useState<DashboardMatched[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const limit = compact ? 5 : 10;

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
    <div className={compact ? "" : "p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto space-y-6"}>
      {!compact && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">الحوادث المشتركة</h2>
            <p className="text-sm text-muted-foreground mt-0.5">تقاطعات الحوادث بين أطراف متعددة</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5" /> تصفية
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
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
                  placeholder="بحث بالمعرف..."
                  className="pr-9 h-9 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Badge variant="secondary" className="text-xs">{total} حادث مشترك</Badge>
            </div>
          </CardHeader>
        )}

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold py-3 px-4">تاريخ المطابقة</TableHead>
                  <TableHead className="text-xs font-semibold py-3">معرف الحادث (طرف أ)</TableHead>
                  <TableHead className="text-xs font-semibold py-3">معرف الحادث (طرف ب)</TableHead>
                  <TableHead className="text-xs font-semibold py-3">الحالة</TableHead>
                  <TableHead className="text-xs font-semibold py-3">توزيع المسؤولية</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: compact ? 5 : 10 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                      <TableCell className="py-3 px-4"><div className="h-4 w-24 bg-muted rounded" /></TableCell>
                      <TableCell className="py-3"><div className="h-4 w-28 bg-muted rounded" /></TableCell>
                      <TableCell className="py-3"><div className="h-4 w-28 bg-muted rounded" /></TableCell>
                      <TableCell className="py-3"><div className="h-5 w-16 bg-muted rounded" /></TableCell>
                      <TableCell className="py-3"><div className="h-4 w-20 bg-muted rounded" /></TableCell>
                    </TableRow>
                  ))
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <GitMerge className="w-8 h-8 opacity-40" />
                        <p className="text-sm">لا توجد حوادث مشتركة</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-xs font-mono text-muted-foreground py-3 px-4">
                        {new Date(row.createdAt).toLocaleDateString("ar-EG", {
                          day: "2-digit", month: "2-digit", year: "numeric", calendar: "gregory"
                        })}
                      </TableCell>
                      <TableCell className="text-xs font-mono py-3">
                        <span className="bg-muted text-muted-foreground px-2 py-1 rounded select-all">{row.accidentAId.slice(0, 8)}...</span>
                      </TableCell>
                      <TableCell className="text-xs font-mono py-3">
                        <span className="bg-muted text-muted-foreground px-2 py-1 rounded select-all">{row.accidentBId.slice(0, 8)}...</span>
                      </TableCell>
                      <TableCell className="py-3">
                        {row.consistencyStatus === "consistent" ? (
                          <Badge variant="secondary" className="bg-success/10 text-success border-0 text-[10px] gap-1 px-1.5 h-5">
                            <CheckCircle2 className="w-3 h-3" /> متطابق تماماً
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-warning/10 text-warning-foreground border-0 text-[10px] gap-1 px-1.5 h-5">
                            <AlertCircle className="w-3 h-3" /> تضارب في البيانات
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-primary">{row.liabilityAPercent}%</span>
                          <span className="text-xs text-muted-foreground">/</span>
                          <span className="text-xs font-semibold text-chart-4">{row.liabilityBPercent}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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
