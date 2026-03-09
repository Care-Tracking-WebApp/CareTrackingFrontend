import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, Clock, Send, CheckCircle, AlertCircle, Loader2, ClipboardList, User, Lock, MapPin, Phone, Upload, X, FileText, Image as ImageIcon, Paperclip } from 'lucide-react';
import { apiRequest, BASE_URL } from '../api';
import { publicAnonKey } from '../../../utils/supabase/info';

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function fmtDate(d: string) {
  if (!d) return '—';
  const [y, m, day] = d.split('-').map(Number);
  return `${day} ${MONTHS_ES[m - 1]} ${y}`;
}

/** Parse schedule like "8:00 - 14:00" and return hours per day */
function parseHoursPerDay(schedule: string): number | null {
  if (!schedule) return null;
  const m = schedule.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const start = parseInt(m[1]) + parseInt(m[2]) / 60;
  const end = parseInt(m[3]) + parseInt(m[4]) / 60;
  return end > start ? end - start : 24 - start + end;
}

const DAY_MAP: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, miércoles: 3, miercoles: 3,
  jueves: 4, viernes: 5, sábado: 6, sabado: 6,
};

function parseWorkDays(days: string): number[] | null {
  if (!days) return null;
  const lower = days.toLowerCase().trim();
  const rangeMatch = lower.match(/^(\w+)\s+a\s+(\w+)$/);
  if (rangeMatch) {
    const from = DAY_MAP[rangeMatch[1]];
    const to = DAY_MAP[rangeMatch[2]];
    if (from == null || to == null) return null;
    const result: number[] = [];
    let d = from;
    while (true) {
      result.push(d);
      if (d === to) break;
      d = (d + 1) % 7;
    }
    return result;
  }
  const parts = lower.split(/[,;y]+/).map(s => s.trim()).filter(Boolean);
  const mapped = parts.map(p => DAY_MAP[p]);
  if (mapped.some(v => v == null)) return null;
  return mapped as number[];
}

function calcAssignedHours(startDate: string, endDate: string, schedule: string, days: string): number | null {
  const hpd = parseHoursPerDay(schedule);
  const workDays = parseWorkDays(days);
  if (hpd == null || workDays == null || !startDate || !endDate) return null;
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (workDays.includes(cur.getDay())) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.round(count * hpd * 10) / 10;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function isImageType(type: string): boolean {
  return type.startsWith('image/');
}

interface ServiceInfo {
  serviceId: string;
  patientName: string;
  caregiverName: string;
  startDate: string;
  endDate: string;
  days: string;
  schedule: string;
  address: string;
  district: string;
  patientPhone: string;
  shifts: { id: string; date: string; hours: number; report: string; evidenceUrl?: string; evidenceFileName?: string; evidenceFileType?: string }[];
}

export function CaregiverView({ token }: { token: string }) {
  const [info, setInfo] = useState<ServiceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [date, setDate] = useState('');
  const [hours, setHours] = useState('');
  const [report, setReport] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiRequest<ServiceInfo>(`/caregiver/${token}`);
        setInfo(data);
      } catch (e) {
        console.error('Error cargando info cuidador:', e);
        setError(e instanceof Error ? e.message : 'Error al cargar la información');
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [token]);

  // Clean up file preview URL
  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    // Max 10MB
    if (selectedFile.size > 10 * 1024 * 1024) {
      setSubmitError('El archivo no puede superar 10 MB');
      return;
    }
    setFile(selectedFile);
    setSubmitError('');
    if (isImageType(selectedFile.type)) {
      setFilePreview(URL.createObjectURL(selectedFile));
    } else {
      setFilePreview(null);
    }
  }, []);

  const removeFile = useCallback(() => {
    setFile(null);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [filePreview]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFileSelect(selectedFile);
  }, [handleFileSelect]);

  const uploadEvidence = async (): Promise<{ filePath: string; fileName: string; fileType: string } | null> => {
    if (!file) return null;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('caregiverToken', token);

      const res = await fetch(`${BASE_URL}/upload-evidence`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      return data;
    } catch (err) {
      console.error('Error subiendo evidencia:', err);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);
    try {
      // Upload evidence first if file is attached
      let evidenceData: { filePath: string; fileName: string; fileType: string } | null = null;
      if (file) {
        evidenceData = await uploadEvidence();
      }

      await apiRequest('/shifts', {
        method: 'POST',
        body: JSON.stringify({
          caregiverToken: token,
          date,
          hours: Number(hours),
          report,
          evidencePath: evidenceData?.filePath || '',
          evidenceFileName: evidenceData?.fileName || '',
          evidenceFileType: evidenceData?.fileType || '',
        }),
      });
      // Refresh info to show new shift
      const data = await apiRequest<ServiceInfo>(`/caregiver/${token}`);
      setInfo(data);
      setSuccess(true);
      setReport('');
      setDate('');
      setHours('');
      removeFile();
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error('Error registrando guardia:', err);
      setSubmitError(err instanceof Error ? err.message : 'Error al registrar la guardia');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
    </div>
  );

  if (error || !info) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-8 max-w-sm w-full text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h2 className="font-semibold text-slate-800 mb-1">Link inválido</h2>
        <p className="text-slate-500 text-sm">{error || 'Este link no existe o ha expirado.'}</p>
      </div>
    </div>
  );

  const totalHours = info.shifts.reduce((s, sh) => s + sh.hours, 0);
  const assignedHours = calcAssignedHours(info.startDate, info.endDate, info.schedule, info.days) || 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-2">
          <img src="/logo.png" alt="CareTracker" className="w-7 h-7 rounded-lg" />
          <span className="font-bold text-slate-900 text-sm">CareTracker</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Magic link notice */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <span className="font-semibold">Link privado y personal.</span>{' '}
            No necesitas contraseña — este link es tu acceso. No lo compartas con nadie.
          </p>
        </div>

        {/* Welcome */}
        <div className="bg-teal-600 rounded-2xl p-5 text-white">
          <p className="text-teal-100 text-xs font-medium uppercase tracking-wider mb-1">Bienvenido</p>
          <h1 className="text-xl font-bold">{info.caregiverName}</h1>
          <div className="mt-3 pt-3 border-t border-teal-500 flex items-center gap-2">
            <User className="w-4 h-4 text-teal-200" />
            <span className="text-teal-100 text-sm">Paciente o familiar: <span className="text-white font-medium">{info.patientName}</span></span>
          </div>
          {info.schedule && (
            <div className="mt-1.5 flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-200" />
              <span className="text-teal-100 text-sm">{info.days} · {info.schedule}</span>
            </div>
          )}
          <div className="mt-1.5 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-200" />
            <span className="text-teal-100 text-sm">{fmtDate(info.startDate)} – {fmtDate(info.endDate)}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-200" />
            <span className="text-teal-100 text-sm">Horas asignadas: <span className="text-white font-medium">{assignedHours}h</span></span>
          </div>
          {info.address && (
            <div className="mt-1.5 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-200" />
              <span className="text-teal-100 text-sm">{info.address}{info.district ? `, ${info.district}` : ''}</span>
            </div>
          )}
          {info.patientPhone && (
            <div className="mt-1.5 flex items-center gap-2">
              <Phone className="w-4 h-4 text-teal-200" />
              <span className="text-teal-100 text-sm">Cel. paciente o familiar: <span className="text-white font-medium">{info.patientPhone}</span></span>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Registrar guardia</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Fecha <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Horas <span className="text-red-500">*</span></span>
                </label>
                <input
                  type="number"
                  value={hours}
                  onChange={e => setHours(e.target.value)}
                  min="1" max="24"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Informe del día <span className="text-red-500">*</span>
              </label>
              <textarea
                value={report}
                onChange={e => setReport(e.target.value)}
                placeholder="Ej: Paciente estable. Caminata corta por el jardín."
                rows={3}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm resize-none"
                required
              />
            </div>

            {/* File upload with drag & drop */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5" /> Evidencia <span className="text-slate-400 font-normal">(opcional)</span></span>
              </label>

              {!file ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                    dragOver
                      ? 'border-teal-400 bg-teal-50'
                      : 'border-slate-200 bg-slate-50 hover:border-teal-300 hover:bg-teal-50/50'
                  }`}
                >
                  <Upload className={`w-8 h-8 mx-auto mb-2 ${dragOver ? 'text-teal-500' : 'text-slate-400'}`} />
                  <p className="text-sm text-slate-600 font-medium">
                    {dragOver ? 'Suelta el archivo aquí' : 'Arrastra una foto o archivo aquí'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    o toca para seleccionar · máx. 10 MB
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  {/* Image preview */}
                  {filePreview && (
                    <div className="relative">
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="w-full max-h-48 object-cover"
                      />
                    </div>
                  )}
                  {/* File info bar */}
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {isImageType(file.type) ? (
                        <ImageIcon className="w-4 h-4 text-teal-600" />
                      ) : (
                        <FileText className="w-4 h-4 text-teal-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                      <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFile(); }}
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {submitError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {submitError}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-700 text-sm">
                <CheckCircle className="w-4 h-4 flex-shrink-0" /> Guardia registrada correctamente
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || uploading}
              className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-medium py-3 rounded-xl transition-colors text-sm"
            >
              {(submitting || uploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {uploading ? 'Subiendo archivo...' : submitting ? 'Enviando...' : 'Enviar informe'}
            </button>
          </form>
        </div>

        {/* Past shifts */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-slate-400" /> Guardias registradas
            </h3>
            <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
              {totalHours}h totales
            </span>
          </div>
          {info.shifts.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">Sin guardias aún</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {info.shifts.map(shift => (
                <div key={shift.id} className="px-5 py-3.5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Calendar className="w-4 h-4 text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">{fmtDate(shift.date)}</span>
                        <span className="text-xs bg-teal-50 text-teal-700 border border-teal-100 px-2 py-0.5 rounded-full">{shift.hours}h</span>
                        {shift.evidenceFileName && (
                          <span className="text-xs bg-violet-50 text-violet-600 border border-violet-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Paperclip className="w-3 h-3" /> Evidencia
                          </span>
                        )}
                      </div>
                      {shift.report && <p className="text-xs text-slate-500 mt-0.5 truncate">{shift.report}</p>}
                    </div>
                  </div>
                  {/* Evidence preview */}
                  {shift.evidenceUrl && shift.evidenceFileType && (
                    <div className="mt-2 ml-11">
                      {isImageType(shift.evidenceFileType) ? (
                        <a href={shift.evidenceUrl} target="_blank" rel="noopener noreferrer" className="block">
                          <img
                            src={shift.evidenceUrl}
                            alt={shift.evidenceFileName || 'Evidencia'}
                            className="max-h-32 rounded-lg border border-slate-200 object-cover"
                          />
                        </a>
                      ) : (
                        <a
                          href={shift.evidenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-xs text-teal-700 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2 hover:bg-teal-100 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {shift.evidenceFileName || 'Ver archivo'}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}