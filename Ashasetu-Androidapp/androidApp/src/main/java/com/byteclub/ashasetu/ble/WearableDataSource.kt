package com.byteclub.ashasetu.ble

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.BluetoothStatusCodes
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.ParcelUuid
import android.util.Log
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.UUID
import java.util.zip.CRC32
import javax.inject.Inject
import javax.inject.Singleton

/**
 * BLE Data Source for ASHASetu IoT Wearable.
 *
 * BLE Specs:
 * - Service UUID: a5a50001-0000-4a5a-8a5a-5a5e5a5e5a01
 * - Vitals Characteristic UUID (NOTIFY + READ): a5a50002-0000-4a5a-8a5a-5a5e5a5e5a01
 * - IMAGE_CTRL UUID (WRITE + NOTIFY): a5a50003-0000-4a5a-8a5a-5a5e5a5e5a01
 * - IMAGE_DATA UUID (WRITE): a5a50004-0000-4a5a-8a5a-5a5e5a5e5a01
 * - CCCD Descriptor: 00002902-0000-1000-8000-00805f9b34fb
 */
@Singleton
class WearableDataSource @Inject constructor(
    @ApplicationContext private val context: Context
) {

    companion object {
        private const val TAG_BLE = "WearableBle"
        private const val TAG_IMG = "WearableImage"

        val SERVICE_UUID: UUID = UUID.fromString("a5a50001-0000-4a5a-8a5a-5a5e5a5e5a01")
        val VITALS_CHAR_UUID: UUID = UUID.fromString("a5a50002-0000-4a5a-8a5a-5a5e5a5e5a01")
        val IMAGE_CTRL_UUID: UUID = UUID.fromString("a5a50003-0000-4a5a-8a5a-5a5e5a5e5a01")
        val IMAGE_DATA_UUID: UUID = UUID.fromString("a5a50004-0000-4a5a-8a5a-5a5e5a5e5a01")
        val CCCD_UUID: UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")

        const val TARGET_DEVICE_NAME = "ASHASetu-Wearable"
        private const val SCAN_TIMEOUT_MS = 10000L
        private const val PKT_MAGIC = 0xA5
    }

    private val bluetoothAdapter: BluetoothAdapter? by lazy {
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        manager?.adapter
    }

    private var bluetoothGatt: BluetoothGatt? = null
    private var scanner: BluetoothLeScanner? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private val scope = CoroutineScope(Dispatchers.IO)

    private val _connectionState = MutableStateFlow<BleConnectionState>(BleConnectionState.Idle)
    val connectionState: StateFlow<BleConnectionState> = _connectionState.asStateFlow()

    private val _latestVitals = MutableStateFlow<WearableVitals?>(null)
    val latestVitals: StateFlow<WearableVitals?> = _latestVitals.asStateFlow()

    private val _imageTransferState = MutableStateFlow<ImageTransferState>(ImageTransferState.Idle)
    val imageTransferState: StateFlow<ImageTransferState> = _imageTransferState.asStateFlow()

    private val imageCtrlNotifications = MutableSharedFlow<ByteArray>(
        extraBufferCapacity = 64,
        onBufferOverflow = BufferOverflow.DROP_OLDEST
    )

    private var isUserDisconnecting = false
    private var reconnectCount = 0
    private var currentMtu = 23
    private var negotiatedChunkPayloadSize = 200

    // Serialized GATT Operation Queue & Setup State
    private val gattMutex = Mutex()
    private var pendingWriteDeferred: CompletableDeferred<Int>? = null
    private var pendingDescriptorWriteDeferred: CompletableDeferred<Int>? = null
    private var pendingMtuDeferred: CompletableDeferred<Int>? = null

    private var isImageCtrlCccdEnabled = false
    private var setupReadyDeferred = CompletableDeferred<Boolean>()

    private var activeTransferJob: Job? = null
    private var currentImageId = 1

    private fun cancelPendingOperations(status: Int) {
        pendingWriteDeferred?.complete(status)
        pendingWriteDeferred = null
        pendingDescriptorWriteDeferred?.complete(status)
        pendingDescriptorWriteDeferred = null
        pendingMtuDeferred?.complete(status)
        pendingMtuDeferred = null
    }

    private val scanTimeoutRunnable = Runnable {
        Log.d(TAG_BLE, "Scan timeout reached after ${SCAN_TIMEOUT_MS}ms")
        stopScan()
        if (_connectionState.value is BleConnectionState.Scanning) {
            _connectionState.value = BleConnectionState.Disconnected("Scan timed out after 10s")
        }
    }

    private val scanCallback = object : ScanCallback() {
        @SuppressLint("MissingPermission")
        override fun onScanResult(callbackType: Int, result: ScanResult?) {
            result?.device?.let { device ->
                val name = device.name ?: result.scanRecord?.deviceName ?: "Unknown"
                Log.d(TAG_BLE, "Discovered BLE device: $name [${device.address}]")
                stopScan()
                connectGatt(device)
            }
        }

        override fun onScanFailed(errorCode: Int) {
            Log.d(TAG_BLE, "BLE scan failed with error code: $errorCode")
            stopScan()
            _connectionState.value = BleConnectionState.Error("Scan failed (Error $errorCode)")
        }
    }

    private val gattCallback = object : BluetoothGattCallback() {
        @SuppressLint("MissingPermission")
        override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
            Log.d(TAG_BLE, "onConnectionStateChange: status=$status, newState=$newState")

            if (status != BluetoothGatt.GATT_SUCCESS || newState == BluetoothProfile.STATE_DISCONNECTED) {
                Log.d(TAG_BLE, "GATT Disconnected or error (status $status). Closing GATT handle.")
                cancelPendingOperations(if (status != 0) status else 133)
                try {
                    gatt.close()
                } catch (e: Exception) {
                    Log.d(TAG_BLE, "Error closing GATT: ${e.message}")
                }
                if (bluetoothGatt == gatt) {
                    bluetoothGatt = null
                }

                if (_imageTransferState.value !is ImageTransferState.Idle && _imageTransferState.value !is ImageTransferState.Delivered) {
                    _imageTransferState.value = ImageTransferState.Failed("BLE link lost during transfer")
                }

                _latestVitals.value = null

                if (!isUserDisconnecting && reconnectCount < 3) {
                    reconnectCount++
                    Log.d(TAG_BLE, "Attempting auto-reconnect ($reconnectCount/3)...")
                    _connectionState.value = BleConnectionState.Connecting
                    mainHandler.postDelayed({
                        startScanAndConnect()
                    }, 2000)
                } else {
                    _connectionState.value = BleConnectionState.Disconnected("Disconnected (status $status)")
                }
                return
            }

            if (newState == BluetoothProfile.STATE_CONNECTED) {
                Log.d(TAG_BLE, "Connected to GATT server. Starting service discovery...")
                _connectionState.value = BleConnectionState.Connecting
                reconnectCount = 0
                val discovered = gatt.discoverServices()
                Log.d(TAG_BLE, "discoverServices initiated: $discovered")
            }
        }

        @SuppressLint("MissingPermission")
        override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
            Log.d(TAG_BLE, "onServicesDiscovered status=$status")
            if (status == BluetoothGatt.GATT_SUCCESS) {
                scope.launch {
                    setupGattConnection(gatt)
                }
            } else {
                Log.d(TAG_BLE, "Service discovery failed with status $status")
                _connectionState.value = BleConnectionState.Error("Service discovery failed")
            }
        }

        override fun onMtuChanged(gatt: BluetoothGatt, mtu: Int, status: Int) {
            Log.e(TAG_IMG, "onMtuChanged callback: mtu=$mtu, status=$status")
            if (status == BluetoothGatt.GATT_SUCCESS) {
                currentMtu = mtu
                negotiatedChunkPayloadSize = minOf(200, maxOf(14, mtu - 3 - 3))
                Log.e(TAG_IMG, "Calculated chunkPayloadSize: $negotiatedChunkPayloadSize bytes for MTU $mtu")
            } else {
                negotiatedChunkPayloadSize = 200
                Log.e(TAG_IMG, "MTU negotiation failed. Fallback payload size: $negotiatedChunkPayloadSize bytes")
            }
            pendingMtuDeferred?.complete(status)
            pendingMtuDeferred = null
        }

        override fun onDescriptorWrite(gatt: BluetoothGatt, descriptor: BluetoothGattDescriptor, status: Int) {
            Log.e(TAG_BLE, "onDescriptorWrite desc=${descriptor.uuid}, status=$status")
            pendingDescriptorWriteDeferred?.complete(status)
            pendingDescriptorWriteDeferred = null
        }

        override fun onCharacteristicWrite(
            gatt: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic,
            status: Int
        ) {
            Log.e(
                TAG_IMG,
                "onCharacteristicWrite callback: char=${characteristic.uuid}, status=$status, " +
                        "gattState=${_connectionState.value}, currentMtu=$currentMtu"
            )
            pendingWriteDeferred?.complete(status)
            pendingWriteDeferred = null
        }

        @Suppress("DEPRECATION")
        override fun onCharacteristicChanged(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
            val data = characteristic.value ?: return
            handleNotificationData(characteristic.uuid, data)
        }

        override fun onCharacteristicChanged(
            gatt: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic,
            value: ByteArray
        ) {
            handleNotificationData(characteristic.uuid, value)
        }
    }

    @SuppressLint("MissingPermission")
    private suspend fun setupGattConnection(gatt: BluetoothGatt) {
        val service = gatt.getService(SERVICE_UUID)
        if (service == null) {
            Log.d(TAG_BLE, "Service $SERVICE_UUID not found on device")
            _connectionState.value = BleConnectionState.Error("Wearable service not found")
            setupReadyDeferred.complete(false)
            return
        }

        // 1. Enable notifications on Vitals characteristic
        service.getCharacteristic(VITALS_CHAR_UUID)?.let { vitalsChar ->
            gatt.setCharacteristicNotification(vitalsChar, true)
            vitalsChar.getDescriptor(CCCD_UUID)?.let { cccd ->
                val vitalsCccdStatus = executeDescriptorWrite(gatt, cccd, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE)
                Log.d(TAG_BLE, "Vitals CCCD write completed with status=$vitalsCccdStatus")
            }
        }

        delay(50)

        // 2. Enable notifications on Image Control characteristic
        val ctrlChar = service.getCharacteristic(IMAGE_CTRL_UUID)
        if (ctrlChar != null) {
            gatt.setCharacteristicNotification(ctrlChar, true)
            val ctrlCccd = ctrlChar.getDescriptor(CCCD_UUID)
            if (ctrlCccd != null) {
                val ctrlCccdStatus = executeDescriptorWrite(gatt, ctrlCccd, BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE)
                Log.e(TAG_IMG, "Image Ctrl CCCD write completed with status=$ctrlCccdStatus")
                isImageCtrlCccdEnabled = (ctrlCccdStatus == BluetoothGatt.GATT_SUCCESS)
            } else {
                Log.e(TAG_IMG, "Image Ctrl CCCD descriptor not found")
                isImageCtrlCccdEnabled = false
            }
        } else {
            Log.e(TAG_IMG, "IMAGE_CTRL characteristic not found")
            isImageCtrlCccdEnabled = false
        }

        delay(50)

        // 3. Request larger MTU (247)
        Log.e(TAG_IMG, "Requesting MTU 247...")
        val mtuStatus = executeMtuRequest(gatt, 247)
        Log.e(TAG_IMG, "MTU request completed with status=$mtuStatus, currentMtu=$currentMtu")

        if (isImageCtrlCccdEnabled) {
            _connectionState.value = BleConnectionState.Connected(TARGET_DEVICE_NAME)
            setupReadyDeferred.complete(true)
        } else {
            Log.e(TAG_IMG, "Failed to enable notifications on IMAGE_CTRL CCCD")
            _connectionState.value = BleConnectionState.Error("Failed to enable image control notifications")
            setupReadyDeferred.complete(false)
        }
    }

    @SuppressLint("MissingPermission")
    private suspend fun executeDescriptorWrite(
        gatt: BluetoothGatt,
        descriptor: BluetoothGattDescriptor,
        value: ByteArray
    ): Int = gattMutex.withLock {
        var attempts = 0
        var status = -1
        while (attempts < 2 && status != BluetoothGatt.GATT_SUCCESS) {
            attempts++
            val deferred = CompletableDeferred<Int>()
            pendingDescriptorWriteDeferred = deferred

            val initiated = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                val code = gatt.writeDescriptor(descriptor, value)
                code == BluetoothStatusCodes.SUCCESS
            } else {
                @Suppress("DEPRECATION")
                descriptor.value = value
                @Suppress("DEPRECATION")
                gatt.writeDescriptor(descriptor)
            }

            if (!initiated) {
                pendingDescriptorWriteDeferred = null
                delay(50)
                continue
            }

            status = try {
                withTimeout(3000) {
                    deferred.await()
                }
            } catch (e: Exception) {
                Log.e(TAG_BLE, "Descriptor write timed out for ${descriptor.uuid}")
                -1
            } finally {
                pendingDescriptorWriteDeferred = null
            }

            if (status != BluetoothGatt.GATT_SUCCESS) {
                delay(50)
            }
        }
        status
    }

    @SuppressLint("MissingPermission")
    private suspend fun executeMtuRequest(
        gatt: BluetoothGatt,
        targetMtu: Int
    ): Int = gattMutex.withLock {
        val deferred = CompletableDeferred<Int>()
        pendingMtuDeferred = deferred

        val initiated = gatt.requestMtu(targetMtu)
        if (!initiated) {
            pendingMtuDeferred = null
            return@withLock -1
        }

        try {
            withTimeout(2000) {
                deferred.await()
            }
        } catch (e: Exception) {
            Log.e(TAG_IMG, "MTU request timed out after 2000ms")
            -1
        } finally {
            pendingMtuDeferred = null
        }
    }

    private class WriteResult(
        val success: Boolean,
        val rawReturnCode: Int,
        val gattStatus: Int,
        val timedOut: Boolean
    )

    @SuppressLint("MissingPermission")
    private suspend fun executeCharacteristicWriteOnce(
        gatt: BluetoothGatt,
        characteristic: BluetoothGattCharacteristic,
        data: ByteArray,
        writeType: Int
    ): WriteResult = gattMutex.withLock {
        val deferred = CompletableDeferred<Int>()
        pendingWriteDeferred = deferred

        val rawReturnCode: Int
        val initiated: Boolean

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val code = gatt.writeCharacteristic(characteristic, data, writeType)
            rawReturnCode = code
            initiated = (code == BluetoothStatusCodes.SUCCESS)
            Log.e(
                TAG_IMG,
                "writeCharacteristic API 33+: char=${characteristic.uuid}, writeType=$writeType, " +
                        "dataLen=${data.size}, rawReturnCode=$code, initiated=$initiated, " +
                        "gattState=${_connectionState.value}, currentMtu=$currentMtu"
            )
        } else {
            @Suppress("DEPRECATION")
            characteristic.value = data
            characteristic.writeType = writeType
            @Suppress("DEPRECATION")
            val returnBool = gatt.writeCharacteristic(characteristic)
            rawReturnCode = if (returnBool) 0 else -1
            initiated = returnBool
            Log.e(
                TAG_IMG,
                "writeCharacteristic Legacy: char=${characteristic.uuid}, writeType=$writeType, " +
                        "dataLen=${data.size}, returnBool=$returnBool, rawReturnCode=$rawReturnCode, " +
                        "gattState=${_connectionState.value}, currentMtu=$currentMtu"
            )
        }

        if (!initiated) {
            pendingWriteDeferred = null
            return@withLock WriteResult(
                success = false,
                rawReturnCode = rawReturnCode,
                gattStatus = -1,
                timedOut = false
            )
        }

        var gattStatus = -1
        var timedOut = false
        try {
            gattStatus = withTimeout(3000) {
                deferred.await()
            }
        } catch (e: Exception) {
            timedOut = true
            Log.e(TAG_IMG, "onCharacteristicWrite timed out after 3000ms for char=${characteristic.uuid}")
        } finally {
            pendingWriteDeferred = null
        }

        val success = !timedOut && (gattStatus == BluetoothGatt.GATT_SUCCESS)
        Log.e(
            TAG_IMG,
            "onCharacteristicWrite result: char=${characteristic.uuid}, success=$success, " +
                    "gattStatus=$gattStatus, timedOut=$timedOut, rawReturnCode=$rawReturnCode"
        )

        WriteResult(
            success = success,
            rawReturnCode = rawReturnCode,
            gattStatus = gattStatus,
            timedOut = timedOut
        )
    }

    private suspend fun writeCharacteristicReliably(
        gatt: BluetoothGatt,
        characteristic: BluetoothGattCharacteristic,
        data: ByteArray,
        writeType: Int = BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
    ): WriteResult = withContext(Dispatchers.IO) {
        var attempt = 0
        var lastResult = WriteResult(success = false, rawReturnCode = -1, gattStatus = -1, timedOut = false)

        while (attempt < 3) {
            attempt++
            val result = executeCharacteristicWriteOnce(gatt, characteristic, data, writeType)
            lastResult = result
            if (result.success) {
                return@withContext result
            }
            Log.e(
                TAG_IMG,
                "Write attempt $attempt/3 failed for char=${characteristic.uuid}: " +
                        "rawReturnCode=${result.rawReturnCode}, gattStatus=${result.gattStatus}, timedOut=${result.timedOut}"
            )
            delay(30)
        }
        lastResult
    }

    private fun handleNotificationData(charUuid: UUID, data: ByteArray) {
        when (charUuid) {
            VITALS_CHAR_UUID -> parseAndPublishVitalsPacket(data)
            IMAGE_CTRL_UUID -> {
                Log.d(TAG_IMG, "IMAGE_CTRL Notification received (${data.size} bytes): ${data.joinToString(" ") { "0x%02X".format(it) }}")
                imageCtrlNotifications.tryEmit(data)
            }
        }
    }

    @SuppressLint("MissingPermission")
    fun startScanAndConnect() {
        isUserDisconnecting = false
        setupReadyDeferred = CompletableDeferred<Boolean>()
        isImageCtrlCccdEnabled = false
        val adapter = bluetoothAdapter
        if (adapter == null || !adapter.isEnabled) {
            Log.d(TAG_BLE, "Bluetooth is disabled")
            _connectionState.value = BleConnectionState.Error("Bluetooth is turned off")
            return
        }

        disconnectGatt()

        scanner = adapter.bluetoothLeScanner
        if (scanner == null) {
            Log.d(TAG_BLE, "BluetoothLeScanner is null")
            _connectionState.value = BleConnectionState.Error("Bluetooth LE scanner unavailable")
            return
        }

        val filter = ScanFilter.Builder()
            .setServiceUuid(ParcelUuid(SERVICE_UUID))
            .build()

        val settings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .build()

        Log.d(TAG_BLE, "Starting BLE scan for Service UUID: $SERVICE_UUID...")
        _connectionState.value = BleConnectionState.Scanning

        mainHandler.removeCallbacks(scanTimeoutRunnable)
        mainHandler.postDelayed(scanTimeoutRunnable, SCAN_TIMEOUT_MS)

        try {
            scanner?.startScan(listOf(filter), settings, scanCallback)
        } catch (e: Exception) {
            Log.d(TAG_BLE, "Error starting scan: ${e.message}")
            _connectionState.value = BleConnectionState.Error("Scan error: ${e.message}")
        }
    }

    @SuppressLint("MissingPermission")
    private fun stopScan() {
        mainHandler.removeCallbacks(scanTimeoutRunnable)
        try {
            scanner?.stopScan(scanCallback)
        } catch (e: Exception) {
            Log.d(TAG_BLE, "Error stopping scan: ${e.message}")
        }
    }

    @SuppressLint("MissingPermission")
    private fun connectGatt(device: BluetoothDevice) {
        Log.d(TAG_BLE, "Connecting to device ${device.address} (${device.name ?: TARGET_DEVICE_NAME})...")
        _connectionState.value = BleConnectionState.Connecting
        setupReadyDeferred = CompletableDeferred<Boolean>()
        isImageCtrlCccdEnabled = false
        try {
            bluetoothGatt = device.connectGatt(context, false, gattCallback, BluetoothDevice.TRANSPORT_LE)
        } catch (e: Exception) {
            Log.d(TAG_BLE, "Error connecting GATT: ${e.message}")
            _connectionState.value = BleConnectionState.Error("Connection error: ${e.message}")
        }
    }

    @SuppressLint("MissingPermission")
    fun disconnect() {
        isUserDisconnecting = true
        reconnectCount = 0
        cancelImageTransfer()
        stopScan()
        disconnectGatt()
        _connectionState.value = BleConnectionState.Disconnected("User disconnected")
        _latestVitals.value = null
        Log.d(TAG_BLE, "User initiated BLE disconnect")
    }

    @SuppressLint("MissingPermission")
    private fun disconnectGatt() {
        try {
            bluetoothGatt?.disconnect()
            bluetoothGatt?.close()
        } catch (e: Exception) {
            Log.d(TAG_BLE, "Error closing GATT: ${e.message}")
        } finally {
            bluetoothGatt = null
        }
    }

    private fun parseAndPublishVitalsPacket(data: ByteArray) {
        if (data.size != 9) return

        val buffer = ByteBuffer.wrap(data).order(ByteOrder.LITTLE_ENDIAN)
        val magic = buffer.get().toInt() and 0xFF
        if (magic != PKT_MAGIC) return

        val flags = buffer.get().toInt() and 0xFF
        val seq = buffer.short.toInt() and 0xFFFF
        val rawHr = buffer.short.toInt()
        val rawSpo2 = buffer.get().toInt() and 0xFF
        val rawTempX10 = buffer.short.toInt()

        val fingerPresent = (flags and 0x01) != 0
        val hrValid = (flags and 0x02) != 0
        val spo2Valid = (flags and 0x04) != 0
        val tempValid = (flags and 0x08) != 0

        val hr = if (fingerPresent && hrValid && rawHr in 30..220) rawHr else null
        val spo2 = if (fingerPresent && spo2Valid && rawSpo2 in 70..100) rawSpo2 else null
        val tempC = if (tempValid && rawTempX10 in 0..600) (rawTempX10 / 10.0f) else null

        val vitals = WearableVitals(
            seq = seq,
            fingerPresent = fingerPresent,
            heartRateBpm = hr,
            spo2Percent = spo2,
            temperatureC = tempC
        )

        Log.d(TAG_BLE, "Parsed vitals packet #$seq: finger=$fingerPresent, HR=$hr, SpO2=$spo2, Temp=$tempC")
        _latestVitals.value = vitals
    }

    // -----------------------------------------------------------------------------------
    // RELIABLE BLE IMAGE TRANSFER PROTOCOL (OFFLINE RELAY)
    // -----------------------------------------------------------------------------------

    fun startImageTransfer(jpegBytes: ByteArray) {
        cancelImageTransfer()
        activeTransferJob = scope.launch {
            executeImageTransfer(jpegBytes)
        }
    }

    fun cancelImageTransfer() {
        activeTransferJob?.cancel()
        activeTransferJob = null
        scope.launch {
            sendAbortCommand(currentImageId)
            _imageTransferState.value = ImageTransferState.Idle
        }
    }

    @SuppressLint("MissingPermission")
    private suspend fun executeImageTransfer(jpegBytes: ByteArray) = withContext(Dispatchers.IO) {
        val gatt = bluetoothGatt
        if (gatt == null || _connectionState.value !is BleConnectionState.Connected) {
            _imageTransferState.value = ImageTransferState.Failed("Wearable is not connected")
            return@withContext
        }

        // Wait for GATT setup (MTU & CCCD) to complete
        val setupReady = try {
            withTimeout(5000) {
                setupReadyDeferred.await()
            }
        } catch (e: Exception) {
            false
        }

        if (!setupReady || !isImageCtrlCccdEnabled) {
            Log.e(TAG_IMG, "GATT setup incomplete or IMAGE_CTRL CCCD write failed")
            _imageTransferState.value = ImageTransferState.Failed("IMAGE_CTRL notifications not ready")
            return@withContext
        }

        val service = gatt.getService(SERVICE_UUID)
        val ctrlChar = service?.getCharacteristic(IMAGE_CTRL_UUID)
        val dataChar = service?.getCharacteristic(IMAGE_DATA_UUID)

        if (ctrlChar == null || dataChar == null) {
            Log.e(TAG_IMG, "Image characteristics not found on service $SERVICE_UUID")
            _imageTransferState.value = ImageTransferState.Failed("Image characteristics not found")
            return@withContext
        }

        val totalSize = jpegBytes.size
        val chunkPayloadSize = 200 // Fixed 200 bytes per chunk to match ESPNOW_CHUNK=200
        val totalChunks = (totalSize + chunkPayloadSize - 1) / chunkPayloadSize
        val crc32Val = CRC32().apply { update(jpegBytes) }.value

        var fullRestarts = 0
        var success = false

        while (fullRestarts <= 2 && !success) {
            currentImageId = (currentImageId % 255) + 1
            val imgId = currentImageId

            _imageTransferState.value = ImageTransferState.WaitingReady

            // Construct START command (14 bytes Little-Endian)
            val startPkt = ByteBuffer.allocate(14).order(ByteOrder.LITTLE_ENDIAN)
                .put(0x01.toByte())
                .put((imgId and 0xFF).toByte())
                .putInt(totalSize)
                .putShort(totalChunks.toShort())
                .putShort(chunkPayloadSize.toShort())
                .putInt(crc32Val.toInt())
                .array()

            check(startPkt.size == 14) { "START payload must be exactly 14 bytes, was ${startPkt.size}" }

            val startHex = startPkt.joinToString(" ") { "0x%02X".format(it) }
            Log.e(
                TAG_IMG,
                "Sending START command: bytes=[$startHex], imageId=$imgId, totalSize=$totalSize, " +
                        "totalChunks=$totalChunks, chunkPayloadSize=$chunkPayloadSize, crc32=$crc32Val, " +
                        "char=${ctrlChar.uuid}, writeType=WRITE_TYPE_DEFAULT, " +
                        "gattState=${_connectionState.value}, currentMtu=$currentMtu (Attempt ${fullRestarts + 1})"
            )

            val startResult = writeCharacteristicReliably(gatt, ctrlChar, startPkt, BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT)
            if (!startResult.success) {
                val errReason = when {
                    startResult.timedOut -> "START failed: timeout waiting for callback"
                    startResult.rawReturnCode != 0 -> "START failed: return code ${startResult.rawReturnCode}"
                    else -> "START failed: status ${startResult.gattStatus}"
                }
                Log.e(
                    TAG_IMG,
                    "Failed to send START command: $errReason, rawReturnCode=${startResult.rawReturnCode}, " +
                            "gattStatus=${startResult.gattStatus}, timedOut=${startResult.timedOut}"
                )
                _imageTransferState.value = ImageTransferState.Failed(errReason)
                fullRestarts++
                continue
            }

            Log.e(TAG_IMG, "START command delivered with GATT SUCCESS! Streaming $totalChunks chunks...")
            delay(100)

            // Send initial all chunks
            var missingRounds = 0
            var chunksToResend: List<Int> = (0 until totalChunks).toList()

            while (missingRounds <= 3 && chunksToResend.isNotEmpty() && !success) {
                _imageTransferState.value = ImageTransferState.Sending(0, totalChunks)

                var sendFailed = false
                var lastChunkResult = startResult
                for ((indexCount, chunkIdx) in chunksToResend.withIndex()) {
                    val startOffset = chunkIdx * chunkPayloadSize
                    val endOffset = minOf(startOffset + chunkPayloadSize, totalSize)
                    val payload = jpegBytes.copyOfRange(startOffset, endOffset)

                    val chunkPkt = ByteBuffer.allocate(3 + payload.size).order(ByteOrder.LITTLE_ENDIAN)
                        .put((imgId and 0xFF).toByte())
                        .putShort(chunkIdx.toShort())
                        .put(payload)
                        .array()

                    val chunkResult = writeCharacteristicReliably(gatt, dataChar, chunkPkt, BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT)
                    if (!chunkResult.success) {
                        lastChunkResult = chunkResult
                        Log.e(
                            TAG_IMG,
                            "Failed to write chunk #$chunkIdx/$totalChunks: " +
                                    "rawReturnCode=${chunkResult.rawReturnCode}, status=${chunkResult.gattStatus}"
                        )
                        sendFailed = true
                        break
                    }

                    if ((chunkIdx + 1) % 10 == 0 || chunkIdx == totalChunks - 1) {
                        Log.e(TAG_IMG, "Sent chunk ${chunkIdx + 1}/$totalChunks (imageId=$imgId)")
                    }

                    _imageTransferState.value = ImageTransferState.Sending(indexCount + 1, chunksToResend.size)
                }

                if (sendFailed) {
                    val chunkErrReason = when {
                        lastChunkResult.timedOut -> "Chunk write timeout"
                        lastChunkResult.rawReturnCode != 0 -> "Chunk write failed: return code ${lastChunkResult.rawReturnCode}"
                        else -> "Chunk write failed: status ${lastChunkResult.gattStatus}"
                    }
                    Log.e(TAG_IMG, "Chunk write failed permanently during round $missingRounds: $chunkErrReason")
                    _imageTransferState.value = ImageTransferState.Failed(chunkErrReason)
                    break
                }

                // Send END command
                val endPkt = byteArrayOf(0x02.toByte(), (imgId and 0xFF).toByte())
                Log.e(TAG_IMG, "Sending END command for imageId $imgId to char=${ctrlChar.uuid}")
                val endResult = writeCharacteristicReliably(gatt, ctrlChar, endPkt, BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT)
                if (!endResult.success) {
                    Log.e(TAG_IMG, "END write failed: rawReturnCode=${endResult.rawReturnCode}, status=${endResult.gattStatus}")
                }

                _imageTransferState.value = ImageTransferState.WaitingDelivery

                // Wait for FORWARDING, DELIVERED, MISSING, or ERROR status
                val response = waitForPostEndNotification(imgId, timeoutMs = 25000)
                when (response) {
                    is PostEndResult.Delivered -> {
                        Log.e(TAG_IMG, "DELIVERED received! Transfer successful for imageId=$imgId")
                        _imageTransferState.value = ImageTransferState.Delivered
                        success = true
                    }
                    is PostEndResult.Forwarding -> {
                        Log.e(TAG_IMG, "FORWARDING received for imageId=$imgId")
                        _imageTransferState.value = ImageTransferState.Forwarding
                        // Keep waiting for final DELIVERED
                        val finalDelivered = waitForDeliveredNotification(imgId, timeoutMs = 20000)
                        if (finalDelivered) {
                            Log.e(TAG_IMG, "Final DELIVERED confirmed for imageId=$imgId")
                            _imageTransferState.value = ImageTransferState.Delivered
                            success = true
                        } else {
                            _imageTransferState.value = ImageTransferState.Failed("PHC delivery confirmation timeout")
                            fullRestarts++
                        }
                    }
                    is PostEndResult.Missing -> {
                        Log.e(TAG_IMG, "MISSING received: ${response.missingIndices.size} chunks missing.")
                        chunksToResend = response.missingIndices
                        missingRounds++
                    }
                    is PostEndResult.Error -> {
                        Log.e(TAG_IMG, "ERROR notification received: code ${response.code}")
                        if (response.code == 3 || response.code == 4) {
                            val msg = if (response.code == 3) "PHC Receiver Unreachable" else "Bad Image Header / Size Error"
                            _imageTransferState.value = ImageTransferState.Failed(msg)
                            return@withContext
                        } else {
                            fullRestarts++
                            break
                        }
                    }
                    PostEndResult.Timeout -> {
                        Log.e(TAG_IMG, "Post-END notification timeout")
                        fullRestarts++
                        break
                    }
                }
            }
        }

        if (!success && _imageTransferState.value !is ImageTransferState.Failed) {
            _imageTransferState.value = ImageTransferState.Failed("Transfer failed after retries")
        }
    }



    private sealed class PostEndResult {
        object Delivered : PostEndResult()
        object Forwarding : PostEndResult()
        data class Missing(val missingIndices: List<Int>) : PostEndResult()
        data class Error(val code: Int) : PostEndResult()
        object Timeout : PostEndResult()
    }

    private suspend fun waitForPostEndNotification(imageId: Int, timeoutMs: Long): PostEndResult {
        return try {
            withTimeout(timeoutMs) {
                var result: PostEndResult? = null
                imageCtrlNotifications.first { pkt ->
                    if (pkt.size < 2 || (pkt[1].toInt() and 0xFF) != imageId) return@first false

                    val opCode = pkt[0].toInt() and 0xFF
                    when (opCode) {
                        0x82 -> {
                            result = PostEndResult.Delivered
                            true
                        }
                        0x85 -> {
                            result = PostEndResult.Forwarding
                            true
                        }
                        0x83 -> {
                            val count = if (pkt.size > 2) pkt[2].toInt() and 0xFF else 0
                            val list = mutableListOf<Int>()
                            for (i in 0 until count) {
                                val offset = 3 + (i * 2)
                                if (offset + 1 < pkt.size) {
                                    val idx = (pkt[offset].toInt() and 0xFF) or ((pkt[offset + 1].toInt() and 0xFF) shl 8)
                                    list.add(idx)
                                }
                            }
                            result = PostEndResult.Missing(list)
                            true
                        }
                        0x8F -> {
                            val code = if (pkt.size > 2) pkt[2].toInt() and 0xFF else 0
                            result = PostEndResult.Error(code)
                            true
                        }
                        else -> false
                    }
                }
                result ?: PostEndResult.Timeout
            }
        } catch (e: Exception) {
            PostEndResult.Timeout
        }
    }

    private suspend fun waitForDeliveredNotification(imageId: Int, timeoutMs: Long): Boolean {
        return try {
            withTimeout(timeoutMs) {
                imageCtrlNotifications.first { pkt ->
                    pkt.size >= 2 && (pkt[0].toInt() and 0xFF) == 0x82 && (pkt[1].toInt() and 0xFF) == imageId
                }
                true
            }
        } catch (e: Exception) {
            false
        }
    }

    @SuppressLint("MissingPermission")
    private suspend fun sendAbortCommand(imageId: Int) {
        val gatt = bluetoothGatt ?: return
        val service = gatt.getService(SERVICE_UUID) ?: return
        val ctrlChar = service.getCharacteristic(IMAGE_CTRL_UUID) ?: return

        val abortPkt = byteArrayOf(0x03.toByte(), (imageId and 0xFF).toByte())
        Log.e(TAG_IMG, "Sending ABORT command for imageId $imageId to char=${ctrlChar.uuid}")
        writeCharacteristicReliably(gatt, ctrlChar, abortPkt, BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT)
    }
}
