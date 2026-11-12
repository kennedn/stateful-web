/* Interpret only known status fields. Never infer state from a sent command. */
'use strict';
window.DeviceStatus = (() => {
  const number = (value) => value !== '' && value != null && Number.isFinite(Number(value)) ? Number(value) : null;
  const power = (value) => [1, '1', true, 'on'].includes(value) ? 'on' : [0, '0', false, 'off'].includes(value) ? 'off' : null;
  const metric = (label, value, unit = '', digits = 1) => {
    const n = number(value);
    return n === null ? null : {label, value: n.toLocaleString('en-GB', {maximumFractionDigits: digits}), unit};
  };
  function parse(service, node, payload, code = 'status') {
    let data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
    if (Array.isArray(data)) data = data[0];
    const state = {partial: null, power: null, online: null, heating: null, color: null, brightness: null, value: null, selection: null, metrics: [], flags: [], known: false};
    if (payload?.message && payload.message !== 'OK') return state;
    const add = (entry) => { if (entry) state.metrics.push(entry); };
    if (service === 'radiator' && code === 'battery') {
      state.partial = 'battery';
      const value = number(data?.value);
      if (value !== null && value >= 0 && value <= 100) {
        const entry = metric('Battery', value, '%', 0);
        entry.key = 'battery:' + String(data?.id || 'device');
        add(entry);
        if (value <= 20) state.flags.push('Low battery');
      }
    } else if (['thermostat', 'radiator'].includes(service)) {
      if (data && typeof data === 'object') {
        state.power = power(data.onoff);
        state.online = power(data.online);
        state.heating = typeof data.temperature?.heating === 'boolean' ? data.temperature.heating : null;
        // Heating services return temperatures in tenths of a degree Celsius.
        if (number(data.temperature?.current) !== null) add(metric('Room', Number(data.temperature.current) / 10, '°C'));
        if (number(data.temperature?.target) !== null) add(metric('Target', Number(data.temperature.target) / 10, '°C'));
        if (data.temperature?.openWindow === true) state.flags.push('Window open');
      }
    } else if (data && typeof data === 'object' && !Array.isArray(data)) {
      state.power = power(data.onoff);
      if ('online' in data) state.online = power(data.online);
      if (service === 'meross') {
        const rgb = number(data.rgb), brightness = number(data.luminance);
        if (rgb !== null && Number.isInteger(rgb) && rgb >= 0 && rgb <= 0xffffff) state.color = '#' + rgb.toString(16).padStart(6, '0');
        if (brightness !== null && brightness >= 0 && brightness <= 100) {
          state.brightness = brightness;
        }
      }
      if (service === 'bthome') {
        add(metric('Temperature', data.temperature, '°C'));
        add(metric('Humidity', data.humidity, '%'));
        add(metric('Battery', data.battery, '%', 0));
        if (number(data.battery) !== null && Number(data.battery) <= 20) state.flags.push('Low battery');
      }
      if (service === 'snowdon' && typeof data.input === 'string' && data.input !== 'off') state.flags.push('Input · ' + data.input);
    } else if (service === 'wol' || (service === 'tvcom' && ['power', 'screen_mute', 'volume_mute', 'remote_lock', 'osd_select'].includes(node.name))) {
      state.power = power(data);
    }
    if (service === 'tvcom' && (typeof data === 'string' || typeof data === 'number')) {
      const n = number(data);
      if (n !== null && node.commands.includes(String(data))) {
        state.value = n; add(metric(node.name === 'volume' ? 'Volume' : node.name.replace(/_/g, ' '), n, '', 0));
      } else if (typeof data === 'string' && node.commands.includes(data)) state.selection = state.power === null ? data : null;
    }
    state.known = state.power !== null || state.online !== null || state.heating !== null || state.metrics.length > 0 || state.flags.length > 0 || state.selection !== null || state.color !== null;
    return state;
  }
  function merge(previous, incoming) {
    if (!previous?.known) return incoming;
    const isBattery = (metric) => metric.key?.startsWith('battery:');
    const isLowBattery = (flag) => flag.endsWith('Low battery');
    if (incoming.partial === 'battery') {
      return {...previous, metrics: [...previous.metrics.filter((metric) => !isBattery(metric)), ...incoming.metrics],
        flags: [...previous.flags.filter((flag) => !isLowBattery(flag)), ...incoming.flags]};
    }
    return {...incoming, metrics: [...incoming.metrics, ...previous.metrics.filter(isBattery)],
      flags: [...incoming.flags, ...previous.flags.filter(isLowBattery)]};
  }
  return {parse, merge};
})();
