package com.byteclub.ashasetu.domain.wearable

import com.byteclub.ashasetu.ble.WearableVitals
import com.byteclub.ashasetu.data.repository.WearableRepository
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject

class ObserveWearableVitalsUseCase @Inject constructor(
    private val repository: WearableRepository
) {
    operator fun invoke(): StateFlow<WearableVitals?> {
        return repository.latestVitals
    }
}
