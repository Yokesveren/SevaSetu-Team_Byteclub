package com.byteclub.ashasetu.domain.wearable

import com.byteclub.ashasetu.data.repository.WearableRepository
import javax.inject.Inject

class SendImageToWearableUseCase @Inject constructor(
    private val repository: WearableRepository
) {
    operator fun invoke(jpegBytes: ByteArray) {
        repository.sendImageOverBle(jpegBytes)
    }
}
