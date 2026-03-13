/**
 * Vista admin: horarios base de envío por tipo de alerta y canal (ale_horarios_alerta_canal).
 * Solo administradores. Ruta: /configuracion-horarios-envio
 */

import React, { useState, useEffect } from "react";
import { notificationHorariosBase } from "../services/notificationHorarios_Service";
import HeaderV2 from "./Header_View";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Skeleton } from "./ui/skeleton";
import { useToast } from "../hooks/useToast_Hook";
import { Clock, Plus, Trash2, Pencil } from "lucide-react";

const TIPO_LABEL = { 1: "Temperatura", 2: "Desconexión" };
const DIA_LABEL = { 0: "Feriado", 1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb", 7: "Dom" };

const NotificationHorariosEnvioView = () => {
  const { toast } = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ hora_inicio: "00:00:00", hora_fin: "23:59:59", activo: true, respeta_horario_operacional: true, respeta_feriados: true });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    id_tipo_alerta: 1,
    canal: "email",
    dia_semana: 1,
    hora_inicio: "00:00:00",
    hora_fin: "23:59:59",
    activo: true,
    respeta_horario_operacional: true,
    respeta_feriados: true
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await notificationHorariosBase.list();
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("[NotificationHorariosEnvio] load:", e);
      toast({ title: "Error", description: e.message || "No se pudieron cargar los horarios", variant: "destructive" });
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await notificationHorariosBase.create(form);
      toast({ title: "Creado", description: "Horario base añadido." });
      setShowAdd(false);
      setForm({ id_tipo_alerta: 1, canal: "email", dia_semana: 1, hora_inicio: "00:00:00", hora_fin: "23:59:59", activo: true, respeta_horario_operacional: true, respeta_feriados: true });
      load();
    } catch (e) {
      toast({ title: "Error", description: e.message || "No se pudo crear", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id, patch) => {
    setSaving(true);
    try {
      await notificationHorariosBase.update(id, patch);
      toast({ title: "Actualizado", description: "Horario actualizado." });
      setEditingId(null);
      load();
    } catch (e) {
      toast({ title: "Error", description: e.message || "No se pudo actualizar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este horario base?")) return;
    setSaving(true);
    try {
      await notificationHorariosBase.delete(id);
      toast({ title: "Eliminado", description: "Horario base eliminado." });
      load();
    } catch (e) {
      toast({ title: "Error", description: e.message || "No se pudo eliminar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <HeaderV2 title="Configuración de horarios de envío (admin)" />
      <div className="container max-w-5xl mx-auto py-6 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horarios base por tipo de alerta y canal
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Define las ventanas de envío base por tipo (temperatura, desconexión), canal (email, push) y día (1–7 o 0=feriado). Los usuarios pueden sobrescribir con sus propios horarios.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <>
                {list.length === 0 && !showAdd && (
                  <p className="text-sm text-gray-500">No hay horarios base. Añade uno para definir cuándo se envían las alertas por defecto.</p>
                )}
                {list.length > 0 && (
                  <ul className="space-y-2">
                    {list.map((h) => (
                      <li key={h.id_horario_alerta_canal} className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                        <span className="font-medium">{TIPO_LABEL[h.id_tipo_alerta] || h.id_tipo_alerta}</span>
                        <span className="text-gray-500">·</span>
                        <span>{h.canal}</span>
                        <span className="text-gray-500">·</span>
                        <span>{DIA_LABEL[h.dia_semana] ?? `Día ${h.dia_semana}`}</span>
                        {editingId === h.id_horario_alerta_canal ? (
                          <>
                            <span className="text-gray-500">·</span>
                            <Input type="time" className="w-28 h-8" value={String(editForm.hora_inicio).slice(0, 5)} onChange={(e) => setEditForm((f) => ({ ...f, hora_inicio: e.target.value + ":00" }))} />
                            <span className="text-gray-400">–</span>
                            <Input type="time" className="w-28 h-8" value={String(editForm.hora_fin).slice(0, 5)} onChange={(e) => setEditForm((f) => ({ ...f, hora_fin: e.target.value + ":00" }))} />
                            <Switch checked={editForm.activo} onCheckedChange={(c) => setEditForm((f) => ({ ...f, activo: c }))} />
                            <span className="text-xs">activo</span>
                            <Switch checked={editForm.respeta_horario_operacional} onCheckedChange={(c) => setEditForm((f) => ({ ...f, respeta_horario_operacional: c }))} />
                            <span className="text-xs">resp.op</span>
                            <Switch checked={editForm.respeta_feriados} onCheckedChange={(c) => setEditForm((f) => ({ ...f, respeta_feriados: c }))} />
                            <span className="text-xs">resp.fer</span>
                          </>
                        ) : (
                          <>
                            <span className="text-gray-500">·</span>
                            <span className="text-sm">{String(h.hora_inicio).slice(0, 5)}–{String(h.hora_fin).slice(0, 5)}</span>
                            <span className="text-xs text-gray-400">activo={h.activo ? "Sí" : "No"}</span>
                            <span className="text-xs text-gray-400">resp.op={h.respeta_horario_operacional ? "Sí" : "No"}</span>
                            <span className="text-xs text-gray-400">resp.fer={h.respeta_feriados ? "Sí" : "No"}</span>
                          </>
                        )}
                        <div className="ml-auto flex gap-1">
                          {editingId === h.id_horario_alerta_canal ? (
                            <>
                              <Button size="sm" disabled={saving} onClick={() => handleUpdate(h.id_horario_alerta_canal, editForm)}>Guardar</Button>
                              <Button size="sm" variant="outline" onClick={() => { setEditingId(null); }}>Cancelar</Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => { setEditingId(h.id_horario_alerta_canal); setEditForm({ hora_inicio: h.hora_inicio, hora_fin: h.hora_fin, activo: !!h.activo, respeta_horario_operacional: !!h.respeta_horario_operacional, respeta_feriados: !!h.respeta_feriados }); }}><Pencil className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost" className="text-red-600" disabled={saving} onClick={() => handleDelete(h.id_horario_alerta_canal)}><Trash2 className="h-4 w-4" /></Button>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {showAdd ? (
                  <div className="p-4 rounded-lg border border-teal-200 bg-teal-50/50 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <Label className="text-xs">Tipo</Label>
                        <select className="w-full mt-1 rounded border border-gray-300 px-2 py-1.5 text-sm" value={form.id_tipo_alerta} onChange={(e) => setForm((f) => ({ ...f, id_tipo_alerta: parseInt(e.target.value, 10) }))}>
                          <option value={1}>Temperatura</option>
                          <option value={2}>Desconexión</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">Canal</Label>
                        <select className="w-full mt-1 rounded border border-gray-300 px-2 py-1.5 text-sm" value={form.canal} onChange={(e) => setForm((f) => ({ ...f, canal: e.target.value }))}>
                          <option value="email">Email</option>
                          <option value="push">Push</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">Día (0=feriado)</Label>
                        <select className="w-full mt-1 rounded border border-gray-300 px-2 py-1.5 text-sm" value={form.dia_semana} onChange={(e) => setForm((f) => ({ ...f, dia_semana: parseInt(e.target.value, 10) }))}>
                          {[0, 1, 2, 3, 4, 5, 6, 7].map((d) => (
                            <option key={d} value={d}>{DIA_LABEL[d]}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <div>
                          <Label className="text-xs">Desde</Label>
                          <Input type="time" className="mt-1 h-8" value={form.hora_inicio.slice(0, 5)} onChange={(e) => setForm((f) => ({ ...f, hora_inicio: e.target.value + ":00" }))} />
                        </div>
                        <div>
                          <Label className="text-xs">Hasta</Label>
                          <Input type="time" className="mt-1 h-8" value={form.hora_fin.slice(0, 5)} onChange={(e) => setForm((f) => ({ ...f, hora_fin: e.target.value + ":00" }))} />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <div className="flex items-center gap-2">
                        <Switch id="activo" checked={form.activo} onCheckedChange={(c) => setForm((f) => ({ ...f, activo: c }))} />
                        <Label htmlFor="activo" className="text-xs">Activo</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch id="respOp" checked={form.respeta_horario_operacional} onCheckedChange={(c) => setForm((f) => ({ ...f, respeta_horario_operacional: c }))} />
                        <Label htmlFor="respOp" className="text-xs">Resp. horario operacional</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch id="respFer" checked={form.respeta_feriados} onCheckedChange={(c) => setForm((f) => ({ ...f, respeta_feriados: c }))} />
                        <Label htmlFor="respFer" className="text-xs">Resp. feriados</Label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" disabled={saving} onClick={handleCreate}>Añadir</Button>
                      <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setShowAdd(true)}>
                    <Plus className="h-4 w-4" />
                    Añadir horario base
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationHorariosEnvioView;
