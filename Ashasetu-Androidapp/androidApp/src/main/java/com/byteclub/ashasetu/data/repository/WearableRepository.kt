package com.byteclub.ashasetu.data.repository

import com.byteclub.ashasetu.ble.BleConnectionState
import com.byteclub.ashasetu.ble.ImageTransferState
import com.byteclub.ashasetu.ble.WearableDataSource
import com.byteclub.ashasetu.ble.WearableVitals
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WearableRepository @Inject constructor(
    private val wearableDataSource: WearableDataSource
) {
    val connectionState: StateFlow<BleConnectionState> = wearableDataSource.connectionState
    val latestVitals: StateFlow<WearableVitals?> = wearableDataSource.latestVitals
    val imageTransferState: StateFlow<ImageTransferState> = wearableDataSource.imageTransferState

    fun startScanAndConnect() {
        wearableDataSource.startScanAndConnect()
    }

    fun disconnect() {
        wearableDataSource.disconnect()
    }

    fun sendImageOverBle(jpegBytes: ByteArray) {
        wearableDataSource.startImageTransfer(jpegBytes)
    }

    fun cancelImageTransfer() {
        wearableDataSource.cancelImageTransfer()
    }
}
