import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  ChevronLeft, ChevronRight, Search, ShieldOff, CheckCircle, ClipboardList,
  MapPin, Gauge, ShieldAlert, Download, Filter, Eye,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { dashboardApi } from "../../lib/dashboard-api";
import type { DashboardAccident } from "../../types/dashboard";

const severityConfig: Record<string, { label: string; class: string }> = {
  critical: { label: "حرج", class: "bg-destructive/10 text-destructive border-destructive/20" },
  severe: { label: "شديد", class: "bg-warning/10 text-warning-foreground border-warning/20" },
  moderate: { label: "متوسط", class: "bg-chart-3/10 text-chart-3 border-chart-3/20" },
  minor: { label: "طفيف", class: "bg-success/10 text-success border-success/20" },
};

export default function DashboardAccidents({ compact }: { compact?: boolean }) {
  const [data, setData] = useState<DashboardAccident[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedAccident, setSelectedAccident] = useState<DashboardAccident | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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

  const getActiveZones = (zoneStr: string) => {
    const zone = zoneStr.toLowerCase();
    return {
      isFront: zone.includes("front") || zone.includes("أمامي"),
      isRear: zone.includes("rear") || zone.includes("back") || zone.includes("خلفي"),
      isLeft: zone.includes("left") || zone.includes("يسار"),
      isRight: zone.includes("right") || zone.includes("يمين"),
    };
  };

  return (
    <div className={compact ? "" : "p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto space-y-6"}>
      {/* Page header (full page mode only) */}
      {!compact && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">سجل الحوادث</h2>
            <p className="text-sm text-muted-foreground mt-0.5">جميع الحوادث المسجلة في النظام</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5" />
              تصفية
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" />
              تصدير
            </Button>
          </div>
        </div>
      )}

      <Card className={compact ? "shadow-none border-0 rounded-none" : "shadow-sm border-border"}>
        {/* Search bar */}
        {!compact && (
          <CardHeader className="border-b px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالمعرف أو المنطقة..."
                  className="pr-9 h-9 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Badge variant="secondary" className="text-xs">{total} حادث</Badge>
            </div>
          </CardHeader>
        )}

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold py-3 px-4">التاريخ</TableHead>
                  <TableHead className="text-xs font-semibold py-3">الشدة</TableHead>
                  <TableHead className="text-xs font-semibold py-3 hidden md:table-cell">منطقة الاصطدام</TableHead>
                  <TableHead className="text-xs font-semibold py-3 hidden sm:table-cell">G-Force</TableHead>
                  <TableHead className="text-xs font-semibold py-3">الحالة</TableHead>
                  <TableHead className="text-xs font-semibold py-3 w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: compact ? 5 : 10 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                      <TableCell className="py-3 px-4"><div className="h-4 w-28 bg-muted rounded" /></TableCell>
                      <TableCell className="py-3"><div className="h-5 w-12 bg-muted rounded" /></TableCell>
                      <TableCell className="py-3 hidden md:table-cell"><div className="h-4 w-20 bg-muted rounded" /></TableCell>
                      <TableCell className="py-3 hidden sm:table-cell"><div className="h-4 w-14 bg-muted rounded" /></TableCell>
                      <TableCell className="py-3"><div className="h-5 w-16 bg-muted rounded" /></TableCell>
                      <TableCell className="py-3"><div className="h-6 w-6 bg-muted rounded" /></TableCell>
                    </TableRow>
                  ))
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ShieldAlert className="w-8 h-8 opacity-40" />
                        <p className="text-sm">لا توجد حوادث مسجلة</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row) => {
                    const severity = severityConfig[row.severity];
                    return (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => setSelectedAccident(row)}
                      >
                        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap py-3 px-4">
                          {new Date(row.timestamp).toLocaleDateString("ar-EG", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                            hour: "2-digit", minute: "2-digit", calendar: "gregory",
                          })}
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className={`text-[10px] rounded-md font-semibold ${severity?.class || ""}`}>
                            {severity?.label || row.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-foreground hidden md:table-cell font-medium py-3 capitalize">
                          {row.impactZone.replace(/-/g, " ")}
                        </TableCell>
                        <TableCell className="text-xs hidden sm:table-cell font-mono text-muted-foreground py-3">
                          {row.peakGForce.toFixed(2)} G
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex gap-1 flex-wrap">
                            {row.isFalseAlarm && (
                              <Badge variant="secondary" className="text-[9px] rounded-md h-5 px-1.5 gap-0.5">
                                <ShieldOff className="w-2.5 h-2.5" />مرفوض
                              </Badge>
                            )}
                            {row.matchedAccidentId && (
                              <Badge variant="secondary" className="text-[9px] rounded-md h-5 px-1.5 gap-0.5">
                                <CheckCircle className="w-2.5 h-2.5 text-success" />مشترك
                              </Badge>
                            )}
                            {row.hasAssessment && (
                              <Badge variant="secondary" className="text-[9px] rounded-md h-5 px-1.5 gap-0.5">
                                <ClipboardList className="w-2.5 h-2.5 text-primary" />مقيّم
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t">
            <p className="text-xs text-muted-foreground">
              عرض {(page - 1) * limit + 1} - {Math.min(page * limit, total)} من {total}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8"
                onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <Button key={p} variant={p === page ? "default" : "outline"} size="icon" className="h-8 w-8 text-xs"
                  onClick={() => setPage(p)} disabled={loading}>
                  {p}
                </Button>
              ))}
              <Button variant="outline" size="icon" className="h-8 w-8"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Dialog */}
      <Dialog open={selectedAccident !== null} onOpenChange={(open) => !open && setSelectedAccident(null)}>
        <DialogContent className="sm:max-w-[580px] p-0 overflow-hidden gap-0">
          {selectedAccident && (() => {
            const { isFront, isRear, isLeft, isRight } = getActiveZones(selectedAccident.impactZone);
            const severity = severityConfig[selectedAccident.severity];
            return (
              <>
                <DialogHeader className="p-5 pb-4 border-b bg-muted/20">
                  <div className="flex items-center justify-between">
                    <DialogTitle className="text-base font-bold">تفاصيل الحادث</DialogTitle>
                    <Badge variant="outline" className={`text-[10px] rounded-md font-semibold ${severity?.class || ""}`}>
                      {severity?.label || selectedAccident.severity}
                    </Badge>
                  </div>
                </DialogHeader>

                <div className="grid grid-cols-5 divide-x divide-x-reverse divide-border">
                  {/* Data */}
                  <div className="col-span-3 p-5 space-y-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">معرف الجهاز</p>
                      <p className="text-xs font-mono bg-muted px-2.5 py-1.5 rounded-md select-all truncate">{selectedAccident.deviceId}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 mb-1">
                          <Gauge className="w-3 h-3" /> السرعة
                        </p>
                        <p className="text-lg font-bold font-mono">{selectedAccident.speedKmh} <span className="text-xs text-muted-foreground font-normal">km/h</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 mb-1">
                          <ShieldAlert className="w-3 h-3" /> قوة التسارع
                        </p>
                        <p className="text-lg font-bold font-mono">{selectedAccident.peakGForce.toFixed(2)} <span className="text-xs text-muted-foreground font-normal">G</span></p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">الموقع</p>
                      {selectedAccident.latitude && selectedAccident.longitude ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${selectedAccident.latitude},${selectedAccident.longitude}`}
                          target="_blank" rel="noreferrer"
                          className="flex items-center gap-2 justify-between bg-muted hover:bg-accent border rounded-md px-3 py-2 text-xs transition-colors group"
                        >
                          <span className="flex items-center gap-1.5 font-mono">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                            {selectedAccident.latitude.toFixed(6)}, {selectedAccident.longitude.toFixed(6)}
                          </span>
                          <span className="text-[10px] text-primary">عرض الخريطة</span>
                        </a>
                      ) : (
                        <p className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded-md">غير متوفرة</p>
                      )}
                    </div>
                  </div>

                  {/* Wireframe */}
                  <div className="col-span-2 p-5 flex flex-col items-center justify-center bg-muted/10">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-4">مخطط الضرر</p>
                    <svg viewBox="0 0 100 200" className="w-20 h-40">
                      <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-border" opacity="0.6" />
                      </pattern>
                      <rect width="100" height="200" fill="url(#grid)" />
                      <rect x="18" y="30" width="6" height="18" rx="1" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground" />
                      <rect x="76" y="30" width="6" height="18" rx="1" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground" />
                      <rect x="18" y="132" width="6" height="18" rx="1" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground" />
                      <rect x="76" y="132" width="6" height="18" rx="1" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground" />
                      <rect x="25" y="20" width="50" height="140" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-foreground" />
                      <path d="M30 65 L70 65 L64 50 L36 50 Z" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-muted-foreground" />
                      <rect x="28" y="75" width="44" height="35" rx="1" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-muted-foreground" />
                      <path d="M30 120 L70 120 L64 130 L36 130 Z" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-muted-foreground" />
                      {isFront && <><path d="M25 20 Q50 5 75 20" fill="hsl(var(--destructive))" opacity="0.15" /><path d="M25 20 Q50 5 75 20" fill="none" stroke="hsl(var(--destructive))" strokeWidth="2.5" /></>}
                      {isRear && <><path d="M25 160 Q50 175 75 160" fill="hsl(var(--destructive))" opacity="0.15" /><path d="M25 160 Q50 175 75 160" fill="none" stroke="hsl(var(--destructive))" strokeWidth="2.5" /></>}
                      {isLeft && <><rect x="20" y="45" width="5" height="90" fill="hsl(var(--destructive))" opacity="0.15" /><line x1="25" y1="45" x2="25" y2="135" stroke="hsl(var(--destructive))" strokeWidth="2.5" /></>}
                      {isRight && <><rect x="75" y="45" width="5" height="90" fill="hsl(var(--destructive))" opacity="0.15" /><line x1="75" y1="45" x2="75" y2="135" stroke="hsl(var(--destructive))" strokeWidth="2.5" /></>}
                    </svg>
                    <p className="mt-3 text-[10px] font-semibold text-muted-foreground capitalize">
                      {selectedAccident.impactZone.replace(/-/g, " ")}
                    </p>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
