package com.byteclub.ashasetu.domain.wearable

import com.byteclub.ashasetu.data.repository.WearableRepository
import javax.inject.Inject

class ConnectWearableUseCase @Inject constructor(
    private val repository: WearableRepository
) {
    operator fun invoke() {
        repository.startScanAndConnect()
    }
}
