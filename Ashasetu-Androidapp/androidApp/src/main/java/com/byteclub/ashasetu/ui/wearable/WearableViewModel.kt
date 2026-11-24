package com.byteclub.ashasetu.ui.wearable

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.byteclub.ashasetu.ble.BleConnectionState
import com.byteclub.ashasetu.ble.ImageCompressor
import com.byteclub.ashasetu.ble.ImageTransferState
import com.byteclub.ashasetu.ble.WearableVitals
import com.byteclub.ashasetu.data.repository.WearableRepository
import com.byteclub.ashasetu.domain.wearable.ConnectWearableUseCase
import com.byteclub.ashasetu.domain.wearable.DisconnectWearableUseCase
import com.byteclub.ashasetu.domain.wearable.ObserveWearableVitalsUseCase
import com.byteclub.ashasetu.domain.wearable.SendImageToWearableUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class WearableViewModel @Inject constructor(
    private val connectWearableUseCase: ConnectWearableUseCase,
    private val disconnectWearableUseCase: DisconnectWearableUseCase,
    private val observeWearableVitalsUseCase: ObserveWearableVitalsUseCase,
    private val sendImageToWearableUseCase: SendImageToWearableUseCase,
    val repository: WearableRepository
) : ViewModel() {

    val connectionState: StateFlow<BleConnectionState> = repository.connectionState
    val latestVitals: StateFlow<WearableVitals?> = observeWearableVitalsUseCase()
    val imageTransferState: StateFlow<ImageTransferState> = repository.imageTransferState

    private val _compressedImageResult = MutableStateFlow<ImageCompressor.CompressedResult?>(null)
    val compressedImageResult: StateFlow<ImageCompressor.CompressedResult?> = _compressedImageResult.asStateFlow()

    private val _compressionError = MutableStateFlow<String?>(null)
    val compressionError: StateFlow<String?> = _compressionError.asStateFlow()

    fun connect() {
        connectWearableUseCase()
    }

    fun disconnect() {
        disconnectWearableUseCase()
    }

    fun prepareImageForBle(context: Context, uri: Uri) {
        viewModelScope.launch {
            _compressionError.value = null
            try {
                val result = ImageCompressor.compressUriToTinyJpeg(context, uri)
                _compressedImageResult.value = result
            } catch (e: Exception) {
                _compressionError.value = "Failed to process image: ${e.message}"
            }
        }
    }

    fun sendImageToPhc() {
        val candidate = _compressedImageResult.value ?: return
        sendImageToWearableUseCase(candidate.bytes)
    }

    fun cancelTransfer() {
        repository.cancelImageTransfer()
    }

    fun clearImageSelection() {
        _compressedImageResult.value = null
        _compressionError.value = null
    }
}
