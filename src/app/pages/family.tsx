import React, { useEffect, useState } from 'react';
import { Heart, AlertCircle, Loader2, Calendar, Clock, User, MapPin, ClipboardList, Phone, FileText } from 'lucide-react';
import { apiRequest } from '../api';

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function fmtDate(d: string) {
  if (!d) return '—';
  const [y, m, day] = d.split('-').map(Number);
  return `${day} ${MONTHS_ES[m - 1]} ${y}`;
}
function fmtDateShort(d: string) {
  if (!d) return '—';
  const [, m, day] = d.split('-').map(Number);
  return `${day} ${MONTHS_ES[m - 1]}`;
}

interface FamilyInfo {
  patientName: string;
  caregiverName: string;
  startDate: string;
  endDate: string;
  district: string;
  address: string;
  caregiverPhone: string;
  shifts: { id: string; date: string; hours: number; report: string; evidenceUrl?: string; evidenceFileName?: string; evidenceFileType?: string }[];
}

export function FamilyView({ token }: { token: string }) {
  const [info, setInfo] = useState<FamilyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiRequest(`/family/${token}`);
        setInfo(data);
      } catch (e) {
        console.error('Error cargando info familiar:', e);
        setError(e instanceof Error ? e.message : 'Error al cargar la información');
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [token]);

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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-2">
          <div className="w-7 h-7 bg-teal-600 rounded-lg flex items-center justify-center">
            <Heart className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="font-bold text-slate-900 text-sm">CareTracker</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Patient card */}
        <div className="bg-violet-600 rounded-2xl p-5 text-white">
          <p className="text-violet-200 text-xs font-medium uppercase tracking-wider mb-1">Seguimiento del paciente</p>
          <h1 className="text-xl font-bold">{info.patientName}</h1>
          <div className="mt-3 pt-3 border-t border-violet-500 space-y-1.5">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-violet-300" />
              <span className="text-violet-100 text-sm">Cuidador: <span className="text-white font-medium">{info.caregiverName}</span></span>
            </div>
            {info.district && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-violet-300" />
                <span className="text-violet-100 text-sm">{info.address ? `${info.address}${info.district ? `, ${info.district}` : ''}` : info.district}</span>
              </div>
            )}
            {!info.district && info.address && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-violet-300" />
                <span className="text-violet-100 text-sm">{info.address}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-violet-300" />
              <span className="text-violet-100 text-sm">
                {fmtDateShort(info.startDate)} – {fmtDateShort(info.endDate)}
              </span>
            </div>
            {info.caregiverPhone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-violet-300" />
                <span className="text-violet-100 text-sm">Cel. cuidador: <span className="text-white font-medium">{info.caregiverPhone}</span></span>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{info.shifts.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Guardias realizadas</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{totalHours}h</p>
            <p className="text-xs text-slate-500 mt-0.5">Horas de cuidado</p>
          </div>
        </div>

        {/* Reports */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-slate-400" />
            <h3 className="font-semibold text-slate-800 text-sm">Informes diarios</h3>
          </div>

          {info.shifts.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <ClipboardList className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm">Aún no hay guardias registradas</p>
              <p className="text-slate-400 text-xs mt-1">Los informes aparecerán aquí cuando el cuidador los registre</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {[...info.shifts].reverse().map(shift => (
                <div key={shift.id} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-800 text-sm">{fmtDate(shift.date)}</span>
                    </div>
                    <span className="flex items-center gap-1 text-xs bg-teal-50 text-teal-700 border border-teal-100 px-2.5 py-0.5 rounded-full font-medium">
                      <Clock className="w-3 h-3" /> {shift.hours}h
                    </span>
                  </div>
                  {shift.report ? (
                    <p className="text-sm text-slate-600 leading-relaxed pl-6">{shift.report}</p>
                  ) : (
                    <p className="text-xs text-slate-400 pl-6 italic">Sin informe escrito</p>
                  )}
                  {shift.evidenceUrl && (
                    <div className="mt-2 pl-6">
                      {shift.evidenceFileType?.startsWith('image/') ? (
                        <a href={shift.evidenceUrl} target="_blank" rel="noopener noreferrer" className="block">
                          <img
                            src={shift.evidenceUrl}
                            alt={shift.evidenceFileName || 'Evidencia'}
                            className="max-h-40 rounded-lg border border-slate-200 object-cover"
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

        <p className="text-center text-slate-400 text-xs pb-4">
          Esta información es solo de lectura · CareTracker
        </p>
      </main>
    </div>
  );
}