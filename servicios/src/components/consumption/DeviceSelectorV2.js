import React, { useState, useEffect } from "react";
import DeviceUtils from "../../utils/consumption/deviceUtils";
import { toast } from "react-toastify";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import { Skeleton } from "../ui/skeleton";
import { cn } from "../../lib/utils";

const DeviceSelectorV2 = ({
  selectedDeviceId = null,
  onDeviceChange,
  disabled = false,
  className = "",
}) => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDevice, setCurrentDevice] = useState(null);

  // Cargar dispositivos al montar el componente
  useEffect(() => {
    loadDevices();
  }, []);

  // Manejar cambios en selectedDeviceId desde props
  useEffect(() => {
    if (selectedDeviceId && devices.length > 0) {
      const device = devices.find((d) => d.shelly_id === selectedDeviceId);
      if (device && device.shelly_id !== currentDevice?.shelly_id) {
        setCurrentDevice(device);
      }
    }
  }, [selectedDeviceId, devices, currentDevice]);

  /**
   * Carga la lista de dispositivos activos
   */
  const loadDevices = async () => {
    try {
      setLoading(true);

      const devicesList = await DeviceUtils.getActiveDevices();
      setDevices(devicesList);

      // Auto-seleccionar dispositivo si no hay uno seleccionado
      if (!selectedDeviceId && devicesList.length > 0) {
        const firstDevice = await DeviceUtils.getCurrentDevice();
        setCurrentDevice(firstDevice);

        // Notificar al componente padre
        if (onDeviceChange) {
          onDeviceChange(firstDevice);
        }
      } else if (selectedDeviceId) {
        // Validar dispositivo seleccionado
        const device = devicesList.find((d) => d.shelly_id === selectedDeviceId);
        if (device) {
          setCurrentDevice(device);
        } else {
          // Dispositivo seleccionado no válido, usar primer disponible
          if (devicesList.length > 0) {
            const firstDevice = devicesList[0];
            setCurrentDevice(firstDevice);
            DeviceUtils.saveSelectedDevice(firstDevice.shelly_id);

            if (onDeviceChange) {
              onDeviceChange(firstDevice);
            }

            toast.info(`Dispositivo anterior no disponible. Seleccionado: ${firstDevice.display_name}`, {
              autoClose: 3000,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error cargando dispositivos:", error);
      toast.error("Error cargando dispositivos. Verifique su conexión.", {
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja el cambio de dispositivo seleccionado
   * Nota: handleValueChange recibe el valor como string directamente de Shadcn Select
   * Los shelly_id son strings alfanuméricos (ej: "fce8c0d82d08"), NO números
   */
  const handleValueChange = async (value) => {
    // shelly_id es un string, no un número
    const newDeviceId = value;

    if (!newDeviceId) {
      return;
    }

    // Comparar ambos valores como strings
    if (newDeviceId === currentDevice?.shelly_id) {
      return;
    }

    try {
      // Cambiar dispositivo usando DeviceUtils
      const newDevice = await DeviceUtils.changeSelectedDevice(newDeviceId);
      setCurrentDevice(newDevice);

      // Notificar al componente padre
      if (onDeviceChange) {
        onDeviceChange(newDevice);
      }
    } catch (error) {
      console.error("Error cambiando dispositivo:", error);
      toast.error(`Error seleccionando dispositivo: ${error.message}`, {
        autoClose: 4000,
      });
    }
  };

  // Estado de carga
  if (loading) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <Label className="font-semibold text-sm text-gray-700">Dispositivo:</Label>
        <Skeleton className="h-10 w-full min-w-[200px]" />
      </div>
    );
  }

  // Renderizar selector
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Select
        value={currentDevice?.shelly_id?.toString() || ""}
        onValueChange={handleValueChange}
        disabled={disabled || devices.length === 0}
      >
        <SelectTrigger className={cn(
          "w-full min-w-[200px]",
          "border-0 border-gray-300",
          "focus:border-blue-500 focus:ring-0 focus:ring-blue-500 focus:ring-opacity-10",
          "disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed",
          "shadow-none"
        )}>
          <SelectValue placeholder={
            devices.length === 0
              ? "No hay dispositivos disponibles"
              : "Seleccione un dispositivo"
          } />
        </SelectTrigger>
        <SelectContent>
          {devices.map((device) => (
            <SelectItem key={device.shelly_id} value={device.shelly_id.toString()}>
              {device.display_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default DeviceSelectorV2;