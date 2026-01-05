import { ref, watch } from 'vue';
import { useAuth } from './useAuth';

type RadiatorRow = {
  name: string;
  slug: string;
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
  slug: string;
  onoff: number | null;
  mode: number | null;
  current: number | null;
  target: number | null;
  heating: boolean | null;
  openWindow: boolean | null;
};

type MerossRow = {
  name: string;
  slug: string;
  onoff: number | null;
  rgb: number | null;
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
  isPower?: boolean;
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
  slug: string;
  togglePath?: string;
};

export const DEVICE_TYPES: DeviceType[] = ['bulb', 'thermostat', 'radiator'];

const MEROSS_DEVICES = ['office', 'hall_down', 'hall_up'];

export function useDeviceCards() {
  const loading = ref(false);
  const errorMessage = ref('');
  const cards = ref<DeviceCard[]>([]);

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

  function mapRadiator(json: any): RadiatorRow[] {
    const data = Array.isArray(json?.data) ? json.data : [];
    return data.map((entry: any) => ({
      name: String(entry?.name || '').toUpperCase(),
      slug: String(entry?.name || '').toLowerCase(),
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
      slug: 'thermostat',
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
    const slug = String(name || '').toLowerCase();
    return {
      name: String(name || '').toUpperCase(),
      slug,
      onoff: data.onoff ?? null,
      rgb: data.rgb ?? null,
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

  function formatRgb(value: number | null | undefined) {
    if (value === null || value === undefined) return '—';
    const hex = Number(value).toString(16).padStart(6, '0');
    return `#${hex.toUpperCase()}`;
  }

  function formatLuminance(value: number | null | undefined) {
    if (value === null || value === undefined || value < 0) return '—';
    return `${value} lx`;
  }

  function formatKelvin(value: number | null | undefined) {
    if (value === null || value === undefined) return '—';
    return `${value} K`;
  }

  function buildThermostatCard(
    status: ThermostatRow,
    sensorTemperature: number | null | undefined,
  ): DeviceCard {
    const heatingTone = formatTone(status.heating);
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
        {
          label: 'Power',
          value: formatBoolean(status.onoff),
          tone: formatTone(status.onoff),
          isPower: true,
        },
      ],
      isActive: heatingTone === 'on',
      slug: status.slug,
      togglePath: '/thermostat?code=toggle',
    };
  }

  function buildRadiatorCard(
    radiator: RadiatorRow,
    sensorTemperature: number | null | undefined,
  ): DeviceCard {
    const heatingTone = formatTone(radiator.heating);
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
        {
          label: 'Power',
          value: formatBoolean(radiator.onoff),
          tone: formatTone(radiator.onoff),
          isPower: true,
        },
      ],
      isActive: heatingTone === 'on',
      slug: radiator.slug,
      togglePath: `/radiator/${radiator.slug}?code=toggle`,
    };
  }

  function buildMerossCard(meross: MerossRow): DeviceCard {
    const powerTone = formatTone(meross.onoff);
    return {
      id: `meross-${meross.name.toLowerCase()}`,
      name: meross.name,
      eyebrow: 'Bulb',
      kind: 'bulb',
      icon: 'bulb',
      meta: `Color: ${formatRgb(meross.rgb)}`,
      status: { label: formatBoolean(meross.onoff, ['On', 'Off']), tone: powerTone },
      elements: [
        { label: 'Temperature', value: formatKelvin(meross.temperature) },
        { label: 'Luminance', value: formatLuminance(meross.luminance) },
        { label: 'RGB', value: formatRgb(meross.rgb) },
      ],
      isActive: powerTone === 'on',
      slug: meross.slug,
      togglePath: `/meross/${meross.slug}?code=toggle`,
    };
  }

  async function refresh() {
    loading.value = true;
    errorMessage.value = '';
    try {
      const [radiatorJson, bthomeJson, thermostatJson, merossJsons] = await Promise.all([
        fetchJson('/radiator?hosts=kitchen,livingroom,office,bedroom&code=status'),
        fetchJson('/bthome?hosts=office,bedroom,livingroom,kitchen&code=status'),
        fetchJson('/thermostat?code=status'),
        Promise.all(
          MEROSS_DEVICES.map((device) =>
            fetchJson(`/meross/${device}?code=status`).catch((error) => ({ error, device })),
          ),
        ),
      ]);

      const radiatorStatus = mapRadiator(radiatorJson);
      const bthomeStatus = mapBthome(bthomeJson);
      const thermostatStatus = mapThermostat(thermostatJson);

      const bthomeTemperatureByName = new Map<string, number | null>();
      bthomeStatus.forEach((row) => {
        bthomeTemperatureByName.set(row.name, row.temperature ?? null);
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

  async function togglePower(cardId: string) {
    const card = cards.value.find((entry) => entry.id === cardId);
    if (!card?.togglePath) return;

    try {
      await fetchJson(card.togglePath);
    } catch (e: any) {
      errorMessage.value = e?.message || 'Unable to toggle device power';
      return;
    }

    await refresh();
  }

  watch(authVersion, () => {
    refresh();
  });

  return {
    loading,
    errorMessage,
    cards,
    refresh,
    togglePower,
  };
}

export type { RadiatorRow, BthomeRow, ThermostatRow, MerossRow };
