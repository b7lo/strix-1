import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight, FileSearch, ShieldOff, CheckCircle, ClipboardList, MapPin, Gauge, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
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
  const [selectedAccident, setSelectedAccident] = useState<DashboardAccident | null>(null);
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

  // Helper to determine active zones for SVG visualizer
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-bold text-slate-300 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          {compact ? "أحدث حوادث مسجلة" : "قائمة الحوادث"}
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
                <TableHead className="text-xs font-semibold text-slate-400">الشدة</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400 hidden sm:table-cell">منطقة الاصطدام</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400 hidden sm:table-cell">G-Force</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400">المؤشرات</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400 text-left"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-slate-500 text-xs">
                    جاري تحميل البيانات...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-slate-500 text-xs">
                    لا توجد حوادث مسجلة حالياً
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow 
                    key={row.id} 
                    className="border-slate-800 hover:bg-slate-900/30 transition-colors cursor-pointer group"
                    onClick={() => setSelectedAccident(row)}
                  >
                    <TableCell className="text-xs font-mono text-slate-400 whitespace-nowrap">
                      {new Date(row.timestamp).toLocaleDateString("ar-SA", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] font-semibold border ${severityColors[row.severity] || "bg-secondary text-slate-400"}`}>
                        {severityLabels[row.severity] || row.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-300 hidden sm:table-cell font-medium">
                      {row.impactZone.replace(/-/g, " ")}
                    </TableCell>
                    <TableCell className="text-xs hidden sm:table-cell font-mono text-slate-200">
                      {row.peakGForce.toFixed(2)} G
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {row.isFalseAlarm && <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[9px]"><ShieldOff className="w-2.5 h-2.5 ml-0.5" />كاذب</Badge>}
                        {row.matchedAccidentId && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px]"><CheckCircle className="w-2.5 h-2.5 ml-0.5" />مطابق</Badge>}
                        {row.hasAssessment && <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/20 text-[9px]"><ClipboardList className="w-2.5 h-2.5 ml-0.5" />مقيم</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-left">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 group-hover:text-blue-400 transition-colors">
                        <FileSearch className="h-3.5 w-3.5" />
                      </Button>
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
          <div className="text-xs text-slate-500">
            {`${(page - 1) * limit + 1} - ${Math.min(page * limit, total)} من ${total}`}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setPage(p => Math.max(1, p - 1)); }}
              disabled={page === 1 || loading} className="h-8 text-xs gap-1 border-slate-800 bg-slate-950/40 text-slate-300 hover:bg-slate-900">
              <ChevronRight className="w-3.5 h-3.5" />السابق
            </Button>
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setPage(p => Math.min(totalPages, p + 1)); }}
              disabled={page === totalPages || loading || total === 0} className="h-8 text-xs gap-1 border-slate-800 bg-slate-950/40 text-slate-300 hover:bg-slate-900">
              التالي<ChevronLeft className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Accident Detail Popup (Glassmorphic Dialog) */}
      <Dialog open={selectedAccident !== null} onOpenChange={(open) => !open && setSelectedAccident(null)}>
        <DialogContent className="sm:max-w-[500px] border-slate-800 bg-slate-950/95 backdrop-blur-lg text-slate-100 p-6 rounded-2xl shadow-2xl">
          {selectedAccident && (() => {
            const { isFront, isRear, isLeft, isRight } = getActiveZones(selectedAccident.impactZone);
            return (
              <>
                <DialogHeader className="text-right border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2 justify-between">
                    <DialogTitle className="text-lg font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">تفاصيل الحادث المعملي</DialogTitle>
                    <Badge className={`text-[10px] font-semibold border ${severityColors[selectedAccident.severity] || ""}`}>
                      {severityLabels[selectedAccident.severity] || selectedAccident.severity}
                    </Badge>
                  </div>
                </DialogHeader>

                <div className="grid gap-6 py-4 grid-cols-5 items-center">
                  {/* Left Column: Metrics & Coordinates */}
                  <div className="col-span-3 space-y-4">
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-slate-500 font-medium">رمز الجهاز المشفر</div>
                      <div className="text-xs font-mono bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg text-slate-300 select-all truncate">
                        {selectedAccident.deviceId}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-900/50 border border-slate-800/80 p-2.5 rounded-xl text-right">
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mb-1 justify-end">
                          السرعة
                          <Gauge className="w-3 h-3 text-blue-400" />
                        </div>
                        <div className="text-sm font-mono font-bold text-slate-200">{selectedAccident.speedKmh} km/h</div>
                      </div>
                      <div className="bg-slate-900/50 border border-slate-800/80 p-2.5 rounded-xl text-right">
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mb-1 justify-end">
                          شدة الصدمة
                          <ShieldAlert className="w-3 h-3 text-red-400" />
                        </div>
                        <div className="text-sm font-mono font-bold text-slate-200">{selectedAccident.peakGForce.toFixed(2)} G</div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-500 font-medium">الموقع الجغرافي</div>
                      {selectedAccident.latitude && selectedAccident.longitude ? (
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${selectedAccident.latitude},${selectedAccident.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 justify-between bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-2 rounded-xl text-xs transition-colors"
                        >
                          <div className="flex items-center gap-1.5 font-mono">
                            <MapPin className="w-3.5 h-3.5" />
                            {selectedAccident.latitude.toFixed(6)}, {selectedAccident.longitude.toFixed(6)}
                          </div>
                          <span className="text-[10px] underline">خرائط Google</span>
                        </a>
                      ) : (
                        <div className="text-xs text-slate-500 italic px-2">إحداثيات الموقع غير متوفرة</div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Visual Car Mockup highlighting the impact */}
                  <div className="col-span-2 flex flex-col items-center justify-center border-r border-slate-800 pl-2">
                    <div className="text-[10px] text-slate-500 font-medium mb-3">محاكاة منطقة الاصطدام</div>
                    <svg viewBox="0 0 100 200" className="w-24 h-48 drop-shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                      {/* Wheels */}
                      <rect x="18" y="30" width="8" height="20" rx="3" fill="#0f172a" />
                      <rect x="74" y="30" width="8" height="20" rx="3" fill="#0f172a" />
                      <rect x="18" y="130" width="8" height="20" rx="3" fill="#0f172a" />
                      <rect x="74" y="130" width="8" height="20" rx="3" fill="#0f172a" />

                      {/* Main Car Body */}
                      <rect x="25" y="20" width="50" height="140" rx="14" fill="#0f172a" stroke="#334155" strokeWidth="2" />
                      
                      {/* Windows */}
                      <path d="M32 60 L68 60 L62 48 L38 48 Z" fill="#38bdf8" opacity="0.3" />
                      <rect x="30" y="70" width="40" height="40" rx="2" fill="#38bdf8" opacity="0.2" />
                      <path d="M32 125 L68 125 L62 135 L38 135 Z" fill="#38bdf8" opacity="0.3" />

                      {/* FRONT IMPACT ZONE */}
                      <path 
                        d="M25 22 Q50 6 75 22" 
                        fill="none" 
                        stroke={isFront ? "#f43f5e" : "#475569"} 
                        strokeWidth={isFront ? "5" : "2"} 
                        className={isFront ? "animate-pulse" : ""} 
                      />
                      {isFront && <circle cx="50" cy="14" r="4" fill="#f43f5e" className="animate-ping" />}

                      {/* REAR IMPACT ZONE */}
                      <path 
                        d="M25 158 Q50 174 75 158" 
                        fill="none" 
                        stroke={isRear ? "#f43f5e" : "#475569"} 
                        strokeWidth={isRear ? "5" : "2"} 
                        className={isRear ? "animate-pulse" : ""} 
                      />
                      {isRear && <circle cx="50" cy="166" r="4" fill="#f43f5e" className="animate-ping" />}

                      {/* LEFT IMPACT ZONE */}
                      <line 
                        x1="24" y1="40" x2="24" y2="120" 
                        stroke={isLeft ? "#f43f5e" : "#475569"} 
                        strokeWidth={isLeft ? "5" : "2"} 
                        className={isLeft ? "animate-pulse" : ""} 
                      />
                      {isLeft && <circle cx="18" cy="80" r="4" fill="#f43f5e" className="animate-ping" />}

                      {/* RIGHT IMPACT ZONE */}
                      <line 
                        x1="76" y1="40" x2="76" y2="120" 
                        stroke={isRight ? "#f43f5e" : "#475569"} 
                        strokeWidth={isRight ? "5" : "2"} 
                        className={isRight ? "animate-pulse" : ""} 
                      />
                      {isRight && <circle cx="82" cy="80" r="4" fill="#f43f5e" className="animate-ping" />}
                    </svg>
                    <Badge variant="outline" className="mt-3 text-[10px] capitalize bg-slate-900 border-slate-800 text-slate-300">
                      {selectedAccident.impactZone.replace(/-/g, " ")}
                    </Badge>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4 flex justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedAccident(null)}
                    className="border-slate-800 bg-slate-950/40 text-slate-300 hover:bg-slate-900 rounded-xl px-5"
                  >
                    إغلاق التفاصيل
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
