import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { ChevronLeft, ChevronRight, Search, Users, Download } from "lucide-react";
import { Input } from "../ui/input";
import { dashboardApi } from "../../lib/dashboard-api";
import { exportToCsv } from "../../lib/csv";
import { useDebounce } from "../../hooks/use-debounce";
import type { DashboardLead } from "../../types/dashboard";

export default function DashboardLeads({ compact }: { compact?: boolean }) {
  const [data, setData] = useState<DashboardLead[]>([]);
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
        const res = await dashboardApi.getLeads(page, limit, { search: debouncedSearch });
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

  const filtered = data;

  const handleExport = () => {
    exportToCsv(
      "leads",
      [
        { key: "fullName", header: "الاسم" },
        { key: "mobile", header: "الجوال" },
        { key: "email", header: "البريد الإلكتروني" },
        { key: "createdAt", header: "تاريخ التسجيل" },
      ],
      data.map((r) => ({ ...r })),
    );
  };

  return (
    <div className={compact ? "" : "p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto space-y-6"}>
      {!compact && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">العملاء المسجّلون</h2>
            <p className="text-sm text-muted-foreground mt-0.5">العملاء المسجّلون عبر صفحة الهبوط</p>
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
                  placeholder="بحث بالاسم / الجوال / الإيميل..."
                  className="pr-9 h-9 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Badge variant="secondary" className="text-xs">{total} عميل</Badge>
            </div>
          </CardHeader>
        )}

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold py-3 px-4">الاسم</TableHead>
                  <TableHead className="text-xs font-semibold py-3">رقم الجوال</TableHead>
                  <TableHead className="text-xs font-semibold py-3 hidden sm:table-cell">البريد الإلكتروني</TableHead>
                  <TableHead className="text-xs font-semibold py-3">تاريخ التسجيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: compact ? 5 : 10 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                      <TableCell className="py-3 px-4"><div className="h-4 w-28 bg-muted rounded" /></TableCell>
                      <TableCell className="py-3"><div className="h-4 w-24 bg-muted rounded" /></TableCell>
                      <TableCell className="py-3 hidden sm:table-cell"><div className="h-4 w-32 bg-muted rounded" /></TableCell>
                      <TableCell className="py-3"><div className="h-4 w-24 bg-muted rounded" /></TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Users className="w-8 h-8 opacity-40" />
                        <p className="text-sm">لا يوجد عملاء مسجّلون بعد</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-sm font-medium py-3 px-4">{row.fullName}</TableCell>
                      <TableCell className="text-xs font-mono py-3" dir="ltr">
                        <span className="bg-muted text-foreground px-2 py-1 rounded select-all">{row.mobile}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell py-3" dir="ltr">
                        {row.email || "—"}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground py-3">
                        {new Date(row.createdAt).toLocaleDateString("ar-EG", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit", calendar: "gregory",
                        })}
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
