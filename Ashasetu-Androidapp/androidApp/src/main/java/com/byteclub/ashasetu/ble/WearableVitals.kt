package com.byteclub.ashasetu.ble

/**
 * Data model for parsed BLE vitals packet received from ASHASetu-Wearable.
 *
 * Packet format (9 bytes, Little-Endian):
 * - byte 0: magic byte, must equal 0xA5 (PKT_MAGIC)
 * - byte 1: flags bitmask:
 *            bit 0 (0x01) = finger present
 *            bit 1 (0x02) = heart rate valid
 *            bit 2 (0x04) = SpO2 valid
 *            bit 3 (0x08) = temperature valid
 * - bytes 2-3: sequence number (uint16)
 * - bytes 4-5: heart rate in bpm (int16)
 * - byte 6: SpO2 percent (uint8, unsigned)
 * - bytes 7-8: temperature in Celsius x 10 (int16), e.g. 372 = 37.2°C
 */
data class WearableVitals(
    val seq: Int = 0,
    val fingerPresent: Boolean = false,
    val heartRateBpm: Int? = null,
    val spo2Percent: Int? = null,
    val temperatureC: Float? = null,
    val timestamp: Long = System.currentTimeMillis()
)

sealed class BleConnectionState {
    object Idle : BleConnectionState()
    object Scanning : BleConnectionState()
    object Connecting : BleConnectionState()
    data class Connected(val deviceName: String = "ASHASetu-Wearable") : BleConnectionState()
    data class Disconnected(val reason: String = "Disconnected") : BleConnectionState()
    data class Error(val message: String) : BleConnectionState()
}
