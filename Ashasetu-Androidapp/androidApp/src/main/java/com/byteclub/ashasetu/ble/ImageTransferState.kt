package com.byteclub.ashasetu.ble

/**
 * State lifecycle of an offline medical image transfer over BLE relay.
 */
sealed class ImageTransferState {
    object Idle : ImageTransferState()
    object Compressing : ImageTransferState()
    object WaitingReady : ImageTransferState()
    data class Sending(val chunksSent: Int, val totalChunks: Int) : ImageTransferState()
    object WaitingDelivery : ImageTransferState()
    object Forwarding : ImageTransferState()
    object Delivered : ImageTransferState()
    data class Failed(val reason: String) : ImageTransferState()
}
