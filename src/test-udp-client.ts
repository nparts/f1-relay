import dgram from 'dgram';
import { PacketCarTelemetryData, PacketHeader, CarTelemetryData } from './types';

// Create UDP client
const client = dgram.createSocket('udp4');

function createTestHeader(): PacketHeader {
  return {
    packet_format: 2023,
    game_year: 23,
    game_major_version: 1,
    game_minor_version: 0,
    packet_version: 1,
    packet_id: 6, // Telemetry packet
    session_uid: BigInt(12345),
    session_time: 123.456,
    frame_identifier: 1234,
    overall_frame_identifier: 1234,
    player_car_index: 0,
    secondary_player_car_index: 255
  };
}

function createTestCarTelemetry(): CarTelemetryData {
  return {
    m_speed: 280,
    m_throttle: 1.0,
    m_steer: 0.0,
    m_brake: 0.0,
    m_clutch: 0,
    m_gear: 7,
    m_engineRPM: 11000,
    m_drs: 1,
    m_revLightsPercent: 100,
    m_revLightsBitValue: 32767,
    m_brakesTemperature: [150, 150, 150, 150],
    m_tyresSurfaceTemperature: [90, 90, 90, 90],
    m_tyresInnerTemperature: [85, 85, 85, 85],
    m_engineTemperature: 105,
    m_tyresPressure: [23.0, 23.0, 23.0, 23.0],
    m_surfaceType: [0, 0, 0, 0]
  };
}

function encodeTelemetryPacket(data: PacketCarTelemetryData): Buffer {
  // Calculate total size
  const headerSize = 24;
  const carDataSize = 60;
  const totalSize = 1352; // Match the expected packet size exactly

  const buffer = Buffer.alloc(totalSize);
  let offset = 0;

  // Encode header
  buffer.writeUInt16LE(data.m_header.packet_format, offset);
  offset += 2;
  buffer.writeUInt8(data.m_header.game_year, offset++);
  buffer.writeUInt8(data.m_header.game_major_version, offset++);
  buffer.writeUInt8(data.m_header.game_minor_version, offset++);
  buffer.writeUInt8(data.m_header.packet_version, offset++);
  buffer.writeUInt8(data.m_header.packet_id, offset++);
  buffer.writeBigUInt64LE(data.m_header.session_uid, offset);
  offset += 8;
  buffer.writeFloatLE(data.m_header.session_time, offset);
  offset += 4;
  buffer.writeUInt32LE(data.m_header.frame_identifier, offset);
  offset += 4;
  buffer.writeUInt32LE(data.m_header.overall_frame_identifier, offset);
  offset += 4;
  buffer.writeUInt8(data.m_header.player_car_index, offset++);
  buffer.writeUInt8(data.m_header.secondary_player_car_index, offset++);

  console.log('After header offset:', offset); // Should be 24

  // Encode car telemetry data array
  for (let i = 0; i < 22; i++) {
    const carData = data.m_carTelemetryData[i];
    if (!carData) continue;

    const startOffset = offset;

    buffer.writeUInt16LE(carData.m_speed, offset);
    offset += 2;
    buffer.writeFloatLE(carData.m_throttle, offset);
    offset += 4;
    buffer.writeFloatLE(carData.m_steer, offset);
    offset += 4;
    buffer.writeFloatLE(carData.m_brake, offset);
    offset += 4;
    buffer.writeUInt8(carData.m_clutch, offset++);
    buffer.writeInt8(carData.m_gear, offset++);
    buffer.writeUInt16LE(carData.m_engineRPM, offset);
    offset += 2;
    buffer.writeUInt8(carData.m_drs, offset++);
    buffer.writeUInt8(carData.m_revLightsPercent, offset++);
    buffer.writeUInt16LE(carData.m_revLightsBitValue, offset);
    offset += 2;

    for (let j = 0; j < 4; j++) {
      buffer.writeUInt16LE(carData.m_brakesTemperature[j], offset);
      offset += 2;
    }
    
    for (let j = 0; j < 4; j++) {
      buffer.writeUInt8(carData.m_tyresSurfaceTemperature[j], offset++);
    }
    
    for (let j = 0; j < 4; j++) {
      buffer.writeUInt8(carData.m_tyresInnerTemperature[j], offset++);
    }
    
    buffer.writeUInt16LE(carData.m_engineTemperature, offset);
    offset += 2;
    
    for (let j = 0; j < 4; j++) {
      buffer.writeFloatLE(carData.m_tyresPressure[j], offset);
      offset += 4;
    }
    
    for (let j = 0; j < 4; j++) {
      buffer.writeUInt8(carData.m_surfaceType[j], offset++);
    }

    console.log(`Car ${i} used ${offset - startOffset} bytes`); // Should be 60
  }

  console.log('Before final fields offset:', offset); // Should be 1346

  // Write MFD and gear data
  buffer.writeUInt8(data.m_mfdPanelIndex || 0, offset++);
  buffer.writeUInt8(data.m_mfdPanelIndexSecondaryPlayer || 0, offset++);
  buffer.writeInt8(data.m_suggestedGear || 0, offset++);

  console.log('Final offset:', offset); // Should be 1349

  return buffer;
}

function createRandomCarTelemetry(): CarTelemetryData {
  return {
    m_speed: Math.floor(Math.random() * 350),  // 0-350 km/h
    m_throttle: Math.random(),                 // 0-1
    m_steer: (Math.random() * 2 - 1),         // -1 to 1
    m_brake: Math.random(),                    // 0-1
    m_clutch: Math.floor(Math.random() * 101), // 0-100
    m_gear: Math.floor(Math.random() * 9) - 1, // -1 to 8 (including reverse)
    m_engineRPM: Math.floor(Math.random() * 12000) + 1000, // 1000-13000 RPM
    m_drs: Math.random() > 0.8 ? 1 : 0,       // DRS enabled 20% of the time
    m_revLightsPercent: Math.floor(Math.random() * 101), // 0-100
    m_revLightsBitValue: Math.floor(Math.random() * 32768), // 0-32767
    m_brakesTemperature: Array(4).fill(0).map(() => 
      Math.floor(Math.random() * 800) + 100   // 100-900°C
    ),
    m_tyresSurfaceTemperature: Array(4).fill(0).map(() =>
      Math.floor(Math.random() * 50) + 60     // 60-110°C
    ),
    m_tyresInnerTemperature: Array(4).fill(0).map(() =>
      Math.floor(Math.random() * 40) + 70     // 70-110°C
    ),
    m_engineTemperature: Math.floor(Math.random() * 40) + 90, // 90-130°C
    m_tyresPressure: Array(4).fill(0).map(() =>
      20 + Math.random() * 8                  // 20-28 PSI
    ),
    m_surfaceType: Array(4).fill(0).map(() =>
      Math.floor(Math.random() * 5)           // 0-4 different surface types
    )
  };
}

function createRandomTestPacket(): PacketCarTelemetryData {
  const header = createTestHeader();
  // Update some header values to simulate time passing
  header.session_time = performance.now() / 1000; // Current time in seconds
  header.frame_identifier++;
  header.overall_frame_identifier++;

  return {
    m_header: header,
    m_carTelemetryData: Array(22).fill(null).map(() => createRandomCarTelemetry()),
    m_mfdPanelIndex: Math.floor(Math.random() * 255),
    m_mfdPanelIndexSecondaryPlayer: Math.floor(Math.random() * 255),
    m_suggestedGear: Math.floor(Math.random() * 9) - 1  // -1 to 8
  };
}

// Initialize frame counters
let frameIdentifier = 0;
let overallFrameIdentifier = 0;

// Send packets at 120Hz (every ~8.33ms)
const intervalId = setInterval(() => {
  const testPacket = createRandomTestPacket();
  const encodedData = encodeTelemetryPacket(testPacket);
  
  client.send(encodedData, 20777, 'localhost', (err) => {
    if (err) {
      console.error('Error sending packet:', err);
    }
  });
}, 1000 / 120);

// Handle graceful shutdown
process.on('SIGINT', () => {
  clearInterval(intervalId);
  client.close(() => {
    console.log('\nClient closed successfully');
    process.exit(0);
  });
});

console.log('Sending telemetry packets at 120Hz. Press Ctrl+C to stop.');

