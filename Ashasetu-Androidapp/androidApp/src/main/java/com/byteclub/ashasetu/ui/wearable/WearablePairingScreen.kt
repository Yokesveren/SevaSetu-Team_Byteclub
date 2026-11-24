package com.byteclub.ashasetu.ui.wearable

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddAPhoto
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Bluetooth
import androidx.compose.material.icons.filled.BluetoothConnected
import androidx.compose.material.icons.filled.BluetoothDisabled
import androidx.compose.material.icons.filled.BluetoothSearching
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DeviceThermostat
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.MonitorHeart
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.byteclub.ashasetu.ble.BleConnectionState
import com.byteclub.ashasetu.ble.ImageCompressor
import com.byteclub.ashasetu.ble.ImageTransferState
import com.byteclub.ashasetu.ble.WearableDataSource
import com.byteclub.ashasetu.ui.theme.*
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WearablePairingScreen(
    wearableDataSource: WearableDataSource,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val connectionState by wearableDataSource.connectionState.collectAsState()
    val vitals by wearableDataSource.latestVitals.collectAsState()
    val transferState by wearableDataSource.imageTransferState.collectAsState()

    var permissionError by remember { mutableStateOf<String?>(null) }
    var compressedResult by remember { mutableStateOf<ImageCompressor.CompressedResult?>(null) }
    var compressionError by remember { mutableStateOf<String?>(null) }
    var tempCameraUri by remember { mutableStateOf<Uri?>(null) }
    var tempPhotoFile by remember { mutableStateOf<File?>(null) }

    val requiredPermissions = remember {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            arrayOf(
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT
            )
        } else {
            arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.BLUETOOTH
            )
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissionsMap ->
        val allGranted = permissionsMap.values.all { it }
        if (allGranted) {
            permissionError = null
            wearableDataSource.startScanAndConnect()
        } else {
            permissionError = "Bluetooth permissions are required to connect to ASHASetu-Wearable."
        }
    }

    fun startBleConnectionWithCheck() {
        val hasPermissions = requiredPermissions.all {
            ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED
        }
        if (hasPermissions) {
            permissionError = null
            wearableDataSource.startScanAndConnect()
        } else {
            permissionLauncher.launch(requiredPermissions)
        }
    }

    fun processUri(uri: Uri) {
        scope.launch(Dispatchers.IO) {
            compressionError = null
            try {
                val result = ImageCompressor.compressUriToTinyJpeg(context, uri)
                compressedResult = result
            } catch (e: Exception) {
                val msg = e.message ?: "Failed to process photo"
                compressionError = "failed to process: $msg"
            }
        }
    }

    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri != null) {
            processUri(uri)
        }
    }

    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success ->
        val uri = tempCameraUri
        val file = tempPhotoFile
        if (success && uri != null && file != null && file.exists() && file.length() > 0L) {
            processUri(uri)
        } else if (success) {
            Log.e("WearableImage", "Camera returned success but photo file is missing or 0 bytes")
            compressionError = "Captured photo is empty or missing."
        }
    }

    fun launchCamera() {
        try {
            val photoFile = File(context.cacheDir, "temp_medical_photo_${System.currentTimeMillis()}.jpg")
            tempPhotoFile = photoFile
            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                photoFile
            )
            tempCameraUri = uri
            cameraLauncher.launch(uri)
        } catch (e: Exception) {
            Log.e(
                "WearableImage",
                "Failed at step [create file / get URI]: exception=${e.javaClass.name}, message=${e.message}",
                e
            )
            compressionError = "Error launching camera: ${e.message}"
        }
    }

    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            launchCamera()
        } else {
            compressionError = "Camera permission required to capture photo."
        }
    }

    fun launchCameraWithCheck() {
        val hasCamPermission = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED

        if (hasCamPermission) {
            launchCamera()
        } else {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("ASHASetu BLE Wearable", fontWeight = FontWeight.Bold, color = CardWhite) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = null, tint = CardWhite)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = NavyPrimary)
            )
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(OffWhiteBg)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Permission / System Error Alert Banner
            if (permissionError != null) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = RedUrgentBg)
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Warning, contentDescription = null, tint = RedUrgent, modifier = Modifier.size(24.dp))
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(permissionError!!, fontSize = 12.sp, color = RedUrgent, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // Connection Status Header Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = CardWhite)
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        val (icon, iconTint, statusText, statusBg, statusTextColor) = when (connectionState) {
                            is BleConnectionState.Connected -> Tuple5(
                                Icons.Default.BluetoothConnected,
                                GreenSynced,
                                "CONNECTED TO ASHASetu-Wearable",
                                GreenSyncedBg,
                                GreenSynced
                            )
                            is BleConnectionState.Connecting -> Tuple5(
                                Icons.Default.BluetoothSearching,
                                OrangeAccent,
                                "CONNECTING TO GATT SERVICE...",
                                YellowModerateBg,
                                NavyPrimary
                            )
                            is BleConnectionState.Scanning -> Tuple5(
                                Icons.Default.BluetoothSearching,
                                OrangeAccent,
                                "SCANNING FOR ASHASetu-Wearable (10s)...",
                                YellowModerateBg,
                                NavyPrimary
                            )
                            is BleConnectionState.Error -> Tuple5(
                                Icons.Default.BluetoothDisabled,
                                RedUrgent,
                                (connectionState as BleConnectionState.Error).message.uppercase(),
                                RedUrgentBg,
                                RedUrgent
                            )
                            is BleConnectionState.Disconnected -> Tuple5(
                                Icons.Default.BluetoothDisabled,
                                TextMuted,
                                (connectionState as BleConnectionState.Disconnected).reason.uppercase(),
                                OffWhiteBg,
                                TextSecondary
                            )
                            BleConnectionState.Idle -> Tuple5(
                                Icons.Default.Bluetooth,
                                NavyPrimary,
                                "READY TO SCAN & PAIR BLE WEARABLE",
                                OffWhiteBg,
                                TextSecondary
                            )
                        }

                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            tint = iconTint,
                            modifier = Modifier.size(56.dp)
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        Text(
                            text = "Target Device: ASHASetu-Wearable",
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            color = TextPrimary
                        )

                        Spacer(modifier = Modifier.height(6.dp))

                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(statusBg)
                                .padding(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = statusText,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = statusTextColor
                            )
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        if (connectionState is BleConnectionState.Scanning || connectionState is BleConnectionState.Connecting) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center
                            ) {
                                CircularProgressIndicator(color = NavyPrimary, modifier = Modifier.size(24.dp))
                                Spacer(modifier = Modifier.width(10.dp))
                                Text(
                                    text = if (connectionState is BleConnectionState.Scanning) "Scanning over BLE..." else "Pairing GATT...",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = NavyPrimary
                                )
                            }
                        } else if (connectionState is BleConnectionState.Connected) {
                            Button(
                                onClick = { wearableDataSource.disconnect() },
                                colors = ButtonDefaults.buttonColors(containerColor = RedUrgent),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp)
                            ) {
                                Icon(Icons.Default.BluetoothDisabled, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("DISCONNECT WEARABLE", fontWeight = FontWeight.Bold)
                            }
                        } else {
                            Button(
                                onClick = { startBleConnectionWithCheck() },
                                colors = ButtonDefaults.buttonColors(containerColor = NavyPrimary),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp)
                            ) {
                                Icon(Icons.Default.Bluetooth, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("SCAN & CONNECT WEARABLE", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            // Live Vitals Sensor Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = CardWhite)
                ) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.MonitorHeart, contentDescription = null, tint = NavyPrimary)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Live BLE Sensor Telemetry", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = NavyPrimary)
                            }

                            if (vitals != null) {
                                Text("#${vitals?.seq}", fontSize = 11.sp, color = TextMuted, fontWeight = FontWeight.Bold)
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        if (vitals == null || connectionState !is BleConnectionState.Connected) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(OffWhiteBg)
                                    .padding(20.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = if (connectionState is BleConnectionState.Connected) "Waiting for live BLE packet notifications..." else "Connect wearable to stream live MAX30102 & DHT11 vitals.",
                                    fontSize = 12.sp,
                                    color = TextSecondary,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        } else {
                            val v = vitals!!

                            if (!v.fingerPresent) {
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 12.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(containerColor = YellowModerateBg)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(12.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(Icons.Default.Warning, contentDescription = null, tint = YellowModerate, modifier = Modifier.size(20.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            text = "Place finger firmly on optical MAX30102 sensor",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = NavyPrimary
                                        )
                                    }
                                }
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("Pulse Rate", fontSize = 11.sp, color = TextSecondary)
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Favorite, contentDescription = null, tint = RedUrgent, modifier = Modifier.size(18.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text(
                                            text = v.heartRateBpm?.let { "$it bpm" } ?: "--",
                                            fontSize = 22.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (v.heartRateBpm != null) TextPrimary else TextMuted
                                        )
                                    }
                                }

                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("SpO2 %", fontSize = 11.sp, color = TextSecondary)
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = v.spo2Percent?.let { "$it%" } ?: "--",
                                        fontSize = 22.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (v.spo2Percent != null) GreenSynced else TextMuted
                                    )
                                }

                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("Temp (°C)", fontSize = 11.sp, color = TextSecondary)
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.DeviceThermostat, contentDescription = null, tint = OrangeAccent, modifier = Modifier.size(18.dp))
                                        Spacer(modifier = Modifier.width(2.dp))
                                        Text(
                                            text = v.temperatureC?.let { String.format("%.1f°C", it) } ?: "--",
                                            fontSize = 22.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (v.temperatureC != null) TextPrimary else TextMuted
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // -----------------------------------------------------------------------------------
            // OFFLINE RELAY: SEND MEDICAL PHOTO TO PHC DESK OVER BLE
            // -----------------------------------------------------------------------------------
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = CardWhite)
                ) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.AddAPhoto, contentDescription = null, tint = NavyPrimary)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Send Medical Photo to PHC Desk (Offline Relay)", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = NavyPrimary)
                        }

                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Capture or select a photo to compress and relay over BLE to wearable for PHC desk delivery.",
                            fontSize = 12.sp,
                            color = TextSecondary
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        if (compressionError != null) {
                            Text(compressionError!!, fontSize = 12.sp, color = RedUrgent, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(10.dp))
                        }

                        if (compressedResult == null) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Button(
                                    onClick = { launchCameraWithCheck() },
                                    colors = ButtonDefaults.buttonColors(containerColor = NavyPrimary),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.weight(1f).height(44.dp)
                                ) {
                                    Icon(Icons.Default.AddAPhoto, contentDescription = null, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("CAMERA", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                }

                                OutlinedButton(
                                    onClick = {
                                        galleryLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                                    },
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.weight(1f).height(44.dp)
                                ) {
                                    Icon(Icons.Default.Image, contentDescription = null, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("GALLERY", color = NavyPrimary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                }
                            }
                        } else {
                            val res = compressedResult!!
                            val sizeKb = String.format("%.1f KB", res.bytes.size / 1024.0)

                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(OffWhiteBg)
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                val bitmap = remember(res.bytes) {
                                    BitmapFactory.decodeByteArray(res.bytes, 0, res.bytes.size)
                                }
                                if (bitmap != null) {
                                    Image(
                                        bitmap = bitmap.asImageBitmap(),
                                        contentDescription = null,
                                        modifier = Modifier
                                            .size(72.dp)
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(NavyDark)
                                    )
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column {
                                    Text("Tiny JPEG Ready", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = NavyPrimary)
                                    Text("Size: $sizeKb (${res.bytes.size} bytes)", fontSize = 11.sp, color = GreenSynced, fontWeight = FontWeight.Bold)
                                    Text("Dimensions: ${res.width}x${res.height} px", fontSize = 11.sp, color = TextSecondary)
                                    Text("CRC32: 0x${java.lang.Long.toHexString(res.crc32).uppercase()}", fontSize = 10.sp, color = TextMuted)
                                }
                            }

                            Spacer(modifier = Modifier.height(14.dp))

                            // Transfer Progress & State Handler
                            when (transferState) {
                                is ImageTransferState.Sending -> {
                                    val sending = transferState as ImageTransferState.Sending
                                    val progress = sending.chunksSent.toFloat() / sending.totalChunks.coerceAtLeast(1)
                                    Column {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text("Sending chunk ${sending.chunksSent}/${sending.totalChunks}...", fontSize = 12.sp, color = NavyPrimary, fontWeight = FontWeight.Bold)
                                            Text("${(progress * 100).toInt()}%", fontSize = 12.sp, color = NavyPrimary, fontWeight = FontWeight.Bold)
                                        }
                                        Spacer(modifier = Modifier.height(6.dp))
                                        LinearProgressIndicator(progress = progress, modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)), color = NavyPrimary)
                                    }
                                    Spacer(modifier = Modifier.height(12.dp))
                                    OutlinedButton(
                                        onClick = { wearableDataSource.cancelImageTransfer() },
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.fillMaxWidth().height(42.dp)
                                    ) {
                                        Icon(Icons.Default.Cancel, contentDescription = null, tint = RedUrgent, modifier = Modifier.size(18.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("CANCEL TRANSFER", color = RedUrgent, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                    }
                                }
                                ImageTransferState.WaitingReady -> {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        CircularProgressIndicator(color = NavyPrimary, modifier = Modifier.size(20.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("Waiting for wearable response...", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = NavyPrimary)
                                    }
                                }
                                ImageTransferState.WaitingDelivery -> {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        CircularProgressIndicator(color = OrangeAccent, modifier = Modifier.size(20.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("Relaying from wearable to PHC desk...", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = OrangeAccent)
                                    }
                                }
                                ImageTransferState.Forwarding -> {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        CircularProgressIndicator(color = OrangeAccent, modifier = Modifier.size(20.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("PHC receiver storing medical photo...", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = OrangeAccent)
                                    }
                                }
                                ImageTransferState.Delivered -> {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = GreenSynced, modifier = Modifier.size(24.dp))
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text("✅ Delivered to PHC Desk Successfully!", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = GreenSynced)
                                    }
                                    Spacer(modifier = Modifier.height(10.dp))
                                    OutlinedButton(
                                        onClick = { compressedResult = null },
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.fillMaxWidth().height(40.dp)
                                    ) {
                                        Text("SEND ANOTHER PHOTO", color = NavyPrimary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                    }
                                }
                                is ImageTransferState.Failed -> {
                                    val reason = (transferState as ImageTransferState.Failed).reason
                                    Text("❌ Failed: $reason", fontSize = 12.sp, color = RedUrgent, fontWeight = FontWeight.Bold)
                                    Spacer(modifier = Modifier.height(10.dp))
                                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                        Button(
                                            onClick = { wearableDataSource.startImageTransfer(res.bytes) },
                                            colors = ButtonDefaults.buttonColors(containerColor = NavyPrimary),
                                            shape = RoundedCornerShape(10.dp),
                                            modifier = Modifier.weight(1f).height(42.dp)
                                        ) {
                                            Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text("RETRY SEND", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                        }
                                        OutlinedButton(
                                            onClick = { compressedResult = null },
                                            shape = RoundedCornerShape(10.dp),
                                            modifier = Modifier.weight(1f).height(42.dp)
                                        ) {
                                            Text("RETAKE", color = NavyPrimary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                        }
                                    }
                                }
                                ImageTransferState.Idle -> {
                                    val isConnected = connectionState is BleConnectionState.Connected
                                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                        Button(
                                            onClick = { wearableDataSource.startImageTransfer(res.bytes) },
                                            enabled = isConnected,
                                            colors = ButtonDefaults.buttonColors(containerColor = NavyPrimary),
                                            shape = RoundedCornerShape(10.dp),
                                            modifier = Modifier.weight(1f).height(44.dp)
                                        ) {
                                            Icon(Icons.Default.Send, contentDescription = null, modifier = Modifier.size(18.dp))
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text(if (isConnected) "SEND TO PHC DESK" else "CONNECT WEARABLE FIRST", fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                        }

                                        OutlinedButton(
                                            onClick = { compressedResult = null },
                                            shape = RoundedCornerShape(10.dp),
                                            modifier = Modifier.height(44.dp)
                                        ) {
                                            Text("RETAKE", color = NavyPrimary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                        }
                                    }
                                }
                                ImageTransferState.Compressing -> {}
                            }
                        }
                    }
                }
            }

            // System Settings Shortcut
            item {
                OutlinedButton(
                    onClick = {
                        try {
                            context.startActivity(Intent(Settings.ACTION_BLUETOOTH_SETTINGS))
                        } catch (ignored: Exception) {}
                    },
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(44.dp)
                ) {
                    Icon(Icons.Default.Settings, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("OPEN PHONE BLUETOOTH SETTINGS", color = NavyPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

private data class Tuple5<A, B, C, D, E>(
    val first: A,
    val second: B,
    val third: C,
    val fourth: D,
    val fifth: E
)
