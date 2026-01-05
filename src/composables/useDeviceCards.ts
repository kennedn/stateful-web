import { ref, watch } from 'vue';
import { useAuth } from './useAuth';

type RadiatorRow = {
  name: string;
  id: string;
  host: string;
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

type MerossRow = {
  name: string;
  device: string;
  onoff: number | null;
  temperature: number | null;
  luminance: number | null;
};

type StatusTone = 'on' | 'off' | 'unknown';

export type DeviceType = 'bulb' | 'thermostat' | 'radiator';
export type DeviceIcon = DeviceType;

export type CardElement = {
  label: string;
  value: string;
  tone?: StatusTone;
  power?: PowerControl;
};

export type DeviceCard = {
  id: string;
  name: string;
  eyebrow: string;
  kind: DeviceType;
  icon: DeviceIcon;
  meta?: string;
  status?: { label: string; tone: StatusTone };
  elements: CardElement[];
  isActive: boolean;
};

type PowerTarget =
  | { type: 'thermostat' }
  | { type: 'radiator'; host: string }
  | { type: 'bulb'; device: string };

export type PowerControl = {
  key: string;
  target: PowerTarget;
  state: number | null;
};

export const DEVICE_TYPES: DeviceType[] = ['bulb', 'thermostat', 'radiator'];

const MEROSS_DEVICES = ['office', 'hall_down', 'hall_up'];
const RADIATOR_HOSTS = ['kitchen', 'livingroom', 'office', 'bedroom'];

export function useDeviceCards() {
  const loading = ref(false);
  const errorMessage = ref('');
  const cards = ref<DeviceCard[]>([]);
  const powerLoading = ref(new Set<string>());

  const { requestWithAuth, authVersion } = useAuth();

  async function fetchJson(path: string) {
    const { response, json, text } = await requestWithAuth(path, {
      method: 'POST',
    });

    if (!response.ok) {
      const body = json ? JSON.stringify(json) : text;
      throw new Error(`${response.status} on ${path}: ${body || 'unknown error'}`);
    }

    return json;
  }

  function mapRadiator(json: any, host: string): RadiatorRow {
    const entry = Array.isArray(json?.data) ? json.data[0] : null;
    return {
      name: host.toUpperCase(),
      id: entry?.id ?? '',
      host,
      onoff: entry?.onoff ?? null,
      mode: entry?.mode ?? null,
      current: entry?.temperature?.current ?? null,
      target: entry?.temperature?.target ?? null,
      heating: entry?.temperature?.heating ?? null,
      openWindow: entry?.temperature?.openWindow ?? null,
    };
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

  function mapMeross(json: any, name: string): MerossRow {
    const data = json?.data || {};
    return {
      name: String(name || '').toUpperCase(),
      device: name,
      onoff: data.onoff ?? null,
      temperature: data.temperature ?? null,
      luminance: data.luminance ?? null,
    };
  }

  function formatNumber(value: number | null | undefined) {
    if (value === null || value === undefined) return '—';
    return String(value);
  }

  function formatTemperature(value: number | null | undefined) {
    if (value === null || value === undefined) return '—';
    const celsius = Number(value) / 10;
    return `${celsius.toFixed(2)}°C`;
  }

  function formatBtHomeTemperature(value: number | null | undefined) {
    if (value === null || value === undefined) return '—';
    return `${Number(value).toFixed(2)}°C`;
  }

  function formatHeating(value: boolean | null | undefined) {
    if (value === null || value === undefined) return 'Unknown';
    return value ? 'Heating' : 'Idle';
  }

  function formatBoolean(value: number | boolean | null | undefined, labels = ['On', 'Off']) {
    if (value === null || value === undefined) return 'Unknown';
    const truthy = value === true || value === 1;
    return truthy ? labels[0] : labels[1];
  }

  function formatTone(value: boolean | number | null | undefined): StatusTone {
    if (value === null || value === undefined) return 'unknown';
    return value === true || value === 1 ? 'on' : 'off';
  }

  function formatLightValue(value: number | null | undefined) {
    if (value === null || value === undefined) return '—';
    return String(value);
  }

  function createPowerKey(target: PowerTarget) {
    if (target.type === 'radiator') return `${target.type}:${target.host}`;
    if (target.type === 'bulb') return `${target.type}:${target.device}`;
    return target.type;
  }

  function createPowerControl(target: PowerTarget, state: number | null): PowerControl {
    return {
      key: createPowerKey(target),
      target,
      state,
    };
  }

  function buildPowerElement(control: PowerControl): CardElement {
    return {
      label: 'Power',
      value: formatBoolean(control.state),
      tone: formatTone(control.state),
      power: control,
    };
  }

  function buildThermostatCard(
    status: ThermostatRow,
    sensorTemperature: number | null | undefined,
  ): DeviceCard {
    const heatingTone = formatTone(status.heating);
    const powerControl = createPowerControl({ type: 'thermostat' }, status.onoff);
    return {
      id: 'thermostat-main',
      name: 'Thermostat',
      eyebrow: 'Thermostat',
      kind: 'thermostat',
      icon: 'thermostat',
      meta: `Mode: ${formatNumber(status.mode)}`,
      status: { label: formatHeating(status.heating), tone: heatingTone },
      elements: [
        { label: 'Temperature', value: formatTemperature(status.current) },
        { label: 'Target', value: formatTemperature(status.target) },
        { label: 'BTHome', value: formatBtHomeTemperature(sensorTemperature) },
        buildPowerElement(powerControl),
      ],
      isActive: heatingTone === 'on',
    };
  }

  function buildRadiatorCard(
    radiator: RadiatorRow,
    sensorTemperature: number | null | undefined,
  ): DeviceCard {
    const heatingTone = formatTone(radiator.heating);
    const powerControl = createPowerControl({ type: 'radiator', host: radiator.host }, radiator.onoff);
    return {
      id: `radiator-${radiator.id || radiator.name}`,
      name: radiator.name,
      eyebrow: 'Radiator',
      kind: 'radiator',
      icon: 'radiator',
      meta: `ID: ${radiator.id || '—'}`,
      status: { label: formatHeating(radiator.heating), tone: heatingTone },
      elements: [
        { label: 'Room temp', value: formatTemperature(radiator.current) },
        { label: 'Target', value: formatTemperature(radiator.target) },
        { label: 'BTHome', value: formatBtHomeTemperature(sensorTemperature) },
        buildPowerElement(powerControl),
      ],
      isActive: heatingTone === 'on',
    };
  }

  function buildMerossCard(meross: MerossRow): DeviceCard {
    const powerControl = createPowerControl(
      { type: 'bulb', device: meross.device },
      meross.onoff,
    );
    return {
      id: `meross-${meross.name.toLowerCase()}`,
      name: meross.name,
      eyebrow: 'Bulb',
      kind: 'bulb',
      icon: 'bulb',
      elements: [
        { label: 'Temperature', value: formatLightValue(meross.temperature) },
        { label: 'Luminance', value: formatLightValue(meross.luminance) },
        buildPowerElement(powerControl),
      ],
      isActive: formatTone(meross.onoff) === 'on',
    };
  }

  async function refresh() {
    loading.value = true;
    errorMessage.value = '';
    try {
      const [bthomeJson, thermostatJson, radiatorJsons, merossJsons] = await Promise.all([
        fetchJson('/bthome?hosts=office,bedroom,livingroom,kitchen&code=status'),
        fetchJson('/thermostat?code=status'),
        Promise.all(
          RADIATOR_HOSTS.map((host) =>
            fetchJson(`/radiator/${host}?code=status`).catch((error) => ({ error, host })),
          ),
        ),
        Promise.all(
          MEROSS_DEVICES.map((device) =>
            fetchJson(`/meross/${device}?code=status`).catch((error) => ({ error, device })),
          ),
        ),
      ]);

      const bthomeStatus = mapBthome(bthomeJson);
      const thermostatStatus = mapThermostat(thermostatJson);

      const bthomeTemperatureByName = new Map<string, number | null>();
      bthomeStatus.forEach((row) => {
        bthomeTemperatureByName.set(row.name, row.temperature ?? null);
      });

      const radiatorStatus = RADIATOR_HOSTS.map((host, index) => {
        const payload = radiatorJsons[index];
        if (payload?.error) {
          throw payload.error;
        }
        return mapRadiator(payload, host);
      });

      const merossStatuses = MEROSS_DEVICES.map((device, index) => {
        const payload = merossJsons[index];
        if (payload?.error) {
          throw payload.error;
        }
        return mapMeross(payload, device);
      });

      const cardResults: DeviceCard[] = [];

      if (thermostatStatus) {
        cardResults.push(
          buildThermostatCard(
            thermostatStatus,
            bthomeTemperatureByName.get(thermostatStatus.name) ?? null,
          ),
        );
      }

      radiatorStatus.forEach((radiator) => {
        cardResults.push(
          buildRadiatorCard(radiator, bthomeTemperatureByName.get(radiator.name) ?? null),
        );
      });

      merossStatuses.forEach((meross) => {
        cardResults.push(buildMerossCard(meross));
      });

      cards.value = cardResults;
    } catch (e: any) {
      errorMessage.value = e?.message || 'Unable to load device data';
    } finally {
      loading.value = false;
    }
  }

  function setPowerLoading(key: string, busy: boolean) {
    const next = new Set(powerLoading.value);
    if (busy) {
      next.add(key);
    } else {
      next.delete(key);
    }
    powerLoading.value = next;
  }

  async function togglePower(control: PowerControl) {
    let path = '';

    if (control.target.type === 'thermostat') {
      path = '/thermostat?code=toggle';
    } else if (control.target.type === 'radiator') {
      path = `/radiator/${encodeURIComponent(control.target.host)}?code=toggle`;
    } else {
      path = `/meross/${control.target.device}?code=toggle`;
    }

    setPowerLoading(control.key, true);
    try {
      const { response, json, text } = await requestWithAuth(path, {
        method: 'POST',
      });

      if (!response.ok) {
        const body = json ? JSON.stringify(json) : text;
        throw new Error(`${response.status} on ${path}: ${body || 'unknown error'}`);
      }

      await refresh();
    } catch (e: any) {
      errorMessage.value = e?.message || 'Unable to update power state';
    } finally {
      setPowerLoading(control.key, false);
    }
  }

  watch(authVersion, () => {
    refresh();
  });

  return {
    loading,
    errorMessage,
    cards,
    powerLoading,
    togglePower,
    refresh,
  };
}
export type { RadiatorRow, BthomeRow, ThermostatRow, MerossRow };
