import { ref, watch } from 'vue';
import { useAuth } from './useAuth';

type RadiatorRow = {
  name: string;
  id: string;
  onoff: number | null;
  mode: number | null;
  current: number | null;
  target: number | null;
  heating: boolean | null;
  openWindow: boolean | null;
};

type BthomeRow = {
  name: string;
  packet: number | null;
  battery: number | null;
  temperature: number | null;
  humidity: number | null;
  voltage: number | null;
};

type ThermostatRow = {
  name: string;
  onoff: number | null;
  mode: number | null;
  current: number | null;
  target: number | null;
  heating: boolean | null;
  openWindow: boolean | null;
};

export function useThermostatStatus() {
  const loading = ref(false);
  const errorMessage = ref('');
  const radiatorStatus = ref<RadiatorRow[]>([]);
  const bthomeStatus = ref<BthomeRow[]>([]);
  const thermostatStatus = ref<ThermostatRow | null>(null);

  const { requestWithAuth, authVersion } = useAuth();

  async function fetchJson(path: string) {
    const { response, json, text } = await requestWithAuth(path, {
      method: 'POST',
    });

    if (!response.ok) {
      const body = json ? JSON.stringify(json) : text;
      throw new Error(
        `${response.status} on ${path}: ${body || 'unknown error'}`,
      );
    }

    return json;
  }

  function mapRadiator(json: any): RadiatorRow[] {
    const data = Array.isArray(json?.data) ? json.data : [];
    return data.map((entry: any) => ({
      name: String(entry?.name || '').toUpperCase(),
      id: entry?.status?.id ?? '',
      onoff: entry?.status?.onoff ?? null,
      mode: entry?.status?.mode ?? null,
      current: entry?.status?.temperature?.current ?? null,
      target: entry?.status?.temperature?.target ?? null,
      heating: entry?.status?.temperature?.heating ?? null,
      openWindow: entry?.status?.temperature?.openWindow ?? null,
    }));
  }

  function mapBthome(json: any): BthomeRow[] {
    const devices = Array.isArray(json?.data?.devices) ? json.data.devices : [];
    return devices.map((device: any) => ({
      name: String(device?.name || '').toUpperCase(),
      packet: device?.status?.packet ?? null,
      battery: device?.status?.battery ?? null,
      temperature: device?.status?.temperature ?? null,
      humidity: device?.status?.humidity ?? null,
      voltage: device?.status?.voltage ?? null,
    }));
  }

  function mapThermostat(json: any): ThermostatRow | null {
    if (!json?.data) return null;
    return {
      name: 'THERMOSTAT',
      onoff: json.data.onoff ?? null,
      mode: json.data.mode ?? null,
      current: json.data?.temperature?.current ?? null,
      target: json.data?.temperature?.target ?? null,
      heating: json.data?.temperature?.heating ?? null,
      openWindow: json.data?.temperature?.openWindow ?? null,
    };
  }

  async function refresh() {
    loading.value = true;
    errorMessage.value = '';
    try {
      const [radiatorJson, bthomeJson, thermostatJson] = await Promise.all([
        fetchJson('/radiator?hosts=kitchen,livingroom,office,bedroom&code=status'),
        fetchJson('/bthome?hosts=office,bedroom,livingroom,kitchen&code=status'),
        fetchJson('/thermostat?code=status'),
      ]);

      radiatorStatus.value = mapRadiator(radiatorJson);
      bthomeStatus.value = mapBthome(bthomeJson);
      thermostatStatus.value = mapThermostat(thermostatJson);
    } catch (e: any) {
      errorMessage.value = e?.message || 'Unable to load thermostat data';
    } finally {
      loading.value = false;
    }
  }

  watch(authVersion, () => {
    refresh();
  });

  return {
    loading,
    errorMessage,
    radiatorStatus,
    bthomeStatus,
    thermostatStatus,
    refresh,
  };
}

export type { RadiatorRow, BthomeRow, ThermostatRow };
