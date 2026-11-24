package com.byteclub.ashasetu.ui.triage

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddAPhoto
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Bluetooth
import androidx.compose.material.icons.filled.BluetoothConnected
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DeviceThermostat
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MonitorHeart
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.byteclub.ashasetu.ble.BleConnectionState
import com.byteclub.ashasetu.ble.WearableDataSource
import com.byteclub.ashasetu.data.repository.CloudSyncService
import com.byteclub.ashasetu.domain.triage.RiskBand
import com.byteclub.ashasetu.ui.components.RiskBadge
import com.byteclub.ashasetu.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TriageCaptureScreen(
    viewModel: TriageViewModel,
    wearableDataSource: WearableDataSource? = null,
    cloudSyncService: CloudSyncService? = null,
    onNavigateBack: () -> Unit,
    onNavigateToReferral: () -> Unit,
    onNavigateToSos: (() -> Unit)? = null,
    onNavigateToWearables: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()
    val patients by viewModel.patients.collectAsState()

    var patientDropdownExpanded by remember { mutableStateOf(false) }
    var languageDropdownExpanded by remember { mutableStateOf(false) }

    val languages = listOf("Marathi (मराठी)", "Hindi (हिंदी)", "Tamil (தமிழ்)", "English")

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            viewModel.toggleVoiceRecording()
        }
    }

    val blePermissions = remember {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            arrayOf(Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT)
        } else {
            arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.BLUETOOTH)
        }
    }

    val blePermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissionsMap ->
        if (permissionsMap.values.all { it }) {
            viewModel.connectWearable()
        }
    }

    fun startBleConnectWithCheck() {
        val hasPermissions = blePermissions.all {
            ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED
        }
        if (hasPermissions) {
            viewModel.connectWearable()
        } else {
            blePermissionLauncher.launch(blePermissions)
        }
    }

    if (uiState.selectedPatient == null && patients.isNotEmpty()) {
        viewModel.selectPatient(patients.first())
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("AI Voice Triage & Vitals", fontWeight = FontWeight.Bold, color = CardWhite) },
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
                .padding(16.dp)
        ) {
            // Patient Selection Section
            item {
                Text(
                    text = "Select Patient",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.height(8.dp))

                Box(modifier = Modifier.fillMaxWidth()) {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { patientDropdownExpanded = true },
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = CardWhite)
                    ) {
                        Row(
                            modifier = Modifier.padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = uiState.selectedPatient?.name ?: "Select Patient...",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp,
                                    color = TextPrimary
                                )
                                Text(
                                    text = "ABHA: ${uiState.selectedPatient?.abhaId ?: "N/A"}",
                                    fontSize = 12.sp,
                                    color = TextSecondary
                                )
                            }
                            Text("Change ▼", fontSize = 12.sp, color = NavyPrimary, fontWeight = FontWeight.Bold)
                        }
                    }

                    DropdownMenu(
                        expanded = patientDropdownExpanded,
                        onDismissRequest = { patientDropdownExpanded = false }
                    ) {
                        patients.forEach { patient ->
                            DropdownMenuItem(
                                text = { Text("${patient.name} (${patient.village})") },
                                onClick = {
                                    viewModel.selectPatient(patient)
                                    patientDropdownExpanded = false
                                }
                            )
                        }
                    }
                }
            }

            // BLE Wearable Live Stream & Auto-Fill Card
            item {
                Spacer(modifier = Modifier.height(14.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = CardWhite)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = if (uiState.wearableBleState is BleConnectionState.Connected) Icons.Default.BluetoothConnected else Icons.Default.Bluetooth,
                                    contentDescription = null,
                                    tint = if (uiState.wearableBleState is BleConnectionState.Connected) GreenSynced else TextMuted,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = if (uiState.wearableBleState is BleConnectionState.Connected) "ASHASetu-Wearable BLE" else "Wearable Disconnected",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = NavyPrimary
                                )
                            }

                            val (statusText, statusBg, statusColor) = when (uiState.wearableBleState) {
                                is BleConnectionState.Connected -> Triple("BLE CONNECTED", GreenSyncedBg, GreenSynced)
                                is BleConnectionState.Scanning -> Triple("SCANNING...", YellowModerateBg, NavyPrimary)
                                is BleConnectionState.Connecting -> Triple("CONNECTING...", YellowModerateBg, NavyPrimary)
                                else -> Triple("OFFLINE", OffWhiteBg, TextMuted)
                            }

                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(statusBg)
                                    .padding(horizontal = 8.dp, vertical = 3.dp)
                            ) {
                                Text(
                                    text = statusText,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = statusColor
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        if (uiState.wearableBleState is BleConnectionState.Connected) {
                            val v = uiState.latestWearableVitals

                            if (v != null && !v.fingerPresent) {
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 10.dp),
                                    shape = RoundedCornerShape(10.dp),
                                    colors = CardDefaults.cardColors(containerColor = YellowModerateBg)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(10.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(Icons.Default.Warning, contentDescription = null, tint = YellowModerate, modifier = Modifier.size(18.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("Place finger on wearable sensor", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = NavyPrimary)
                                    }
                                }
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("SpO2", fontSize = 11.sp, color = TextSecondary)
                                    Text(
                                        text = uiState.smoothedSpo2?.let { "$it%" } ?: v?.spo2Percent?.let { "$it%" } ?: "--",
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = GreenSynced
                                    )
                                }
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("Pulse", fontSize = 11.sp, color = TextSecondary)
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.Favorite, contentDescription = null, tint = RedUrgent, modifier = Modifier.size(14.dp))
                                        Spacer(modifier = Modifier.width(2.dp))
                                        Text(
                                            text = uiState.smoothedHeartRate?.let { "$it bpm" } ?: v?.heartRateBpm?.let { "$it bpm" } ?: "--",
                                            fontSize = 18.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = TextPrimary
                                        )
                                    }
                                }
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("Temp (°C)", fontSize = 11.sp, color = TextSecondary)
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Default.DeviceThermostat, contentDescription = null, tint = OrangeAccent, modifier = Modifier.size(14.dp))
                                        Spacer(modifier = Modifier.width(2.dp))
                                        Text(
                                            text = uiState.smoothedTempC?.let { String.format("%.1f°C", it) } ?: v?.temperatureC?.let { String.format("%.1f°C", it) } ?: "--",
                                            fontSize = 18.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = TextPrimary
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(
                                    onClick = { viewModel.lockAndUseWearableVitals() },
                                    colors = ButtonDefaults.buttonColors(containerColor = NavyPrimary),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.weight(1f).height(42.dp)
                                ) {
                                    Icon(Icons.Default.Lock, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("AUTO-FILL FORM", fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                }

                                OutlinedButton(
                                    onClick = { onNavigateToWearables?.invoke() },
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.height(42.dp)
                                ) {
                                    Icon(Icons.Default.AddAPhoto, contentDescription = null, modifier = Modifier.size(16.dp), tint = NavyPrimary)
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("SEND PHOTO", color = NavyPrimary, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                }
                            }
                        } else {
                            Text(
                                text = "Pair with ASHASetu-Wearable over BLE to stream live pulse, SpO2 & temperature, or relay medical photos offline.",
                                fontSize = 12.sp,
                                color = TextSecondary
                            )
                            Spacer(modifier = Modifier.height(10.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(
                                    onClick = { startBleConnectWithCheck() },
                                    colors = ButtonDefaults.buttonColors(containerColor = NavyPrimary),
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.weight(1f).height(40.dp)
                                ) {
                                    Icon(Icons.Default.Bluetooth, contentDescription = null, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("CONNECT BLE WEARABLE", fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                }

                                OutlinedButton(
                                    onClick = { onNavigateToWearables?.invoke() },
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.height(40.dp)
                                ) {
                                    Icon(Icons.Default.AddAPhoto, contentDescription = null, modifier = Modifier.size(16.dp), tint = NavyPrimary)
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("SEND PHOTO", color = NavyPrimary, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                }
                            }
                        }
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(16.dp)) }

            // Voice Language Selector Bar
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Voice Input Language",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )

                    Box {
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .background(NavyPrimary)
                                .clickable { languageDropdownExpanded = true }
                                .padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Language, contentDescription = null, tint = OrangeAccent, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(uiState.selectedLanguage, color = CardWhite, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }

                        DropdownMenu(
                            expanded = languageDropdownExpanded,
                            onDismissRequest = { languageDropdownExpanded = false }
                        ) {
                            languages.forEach { lang ->
                                DropdownMenuItem(
                                    text = { Text(lang) },
                                    onClick = {
                                        viewModel.onLanguageSelected(lang)
                                        languageDropdownExpanded = false
                                    }
                                )
                            }
                        }
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(10.dp)) }

            // Voice Recording Box
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (uiState.isRecording) RedUrgentBg else NavyDark
                    )
                ) {
                    Column(
                        modifier = Modifier.padding(18.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = if (uiState.isRecording) "LISTENING TO MICROPHONE (${uiState.selectedLanguage.uppercase()})..." else "TAP MIC TO SPEAK SYMPTOMS",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (uiState.isRecording) RedUrgent else OrangeAccent
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        Box(
                            modifier = Modifier
                                .size(64.dp)
                                .clip(CircleShape)
                                .background(if (uiState.isRecording) RedUrgent else OrangeAccent)
                                .clickable {
                                    val hasPermission = ContextCompat.checkSelfPermission(
                                        context,
                                        Manifest.permission.RECORD_AUDIO
                                    ) == PackageManager.PERMISSION_GRANTED

                                    if (hasPermission) {
                                        viewModel.toggleVoiceRecording()
                                    } else {
                                        permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                                    }
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = if (uiState.isRecording) Icons.Default.Stop else Icons.Default.Mic,
                                contentDescription = null,
                                tint = CardWhite,
                                modifier = Modifier.size(32.dp)
                            )
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        Text(
                            text = if (uiState.voiceTranscript.isBlank()) "\"Press microphone to speak symptoms in ${uiState.selectedLanguage}\"" else "\"${uiState.voiceTranscript}\"",
                            fontSize = 13.sp,
                            color = if (uiState.voiceTranscript.isBlank()) TextMuted else CardWhite,
                            modifier = Modifier.padding(horizontal = 8.dp)
                        )

                        if (uiState.errorMessage != null) {
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = uiState.errorMessage!!,
                                fontSize = 11.sp,
                                color = RedUrgent,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(16.dp)) }

            // Detected Symptoms Chips
            item {
                Text(
                    text = "Extracted Symptoms (${uiState.detectedSymptoms.size})",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.height(8.dp))

                if (uiState.detectedSymptoms.isEmpty()) {
                    Text("No specific symptom keywords detected.", fontSize = 12.sp, color = TextMuted)
                } else {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(uiState.detectedSymptoms) { symptom ->
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(if (symptom.defaultRisk == RiskBand.RED) RedUrgentBg else YellowModerateBg)
                                    .padding(horizontal = 12.dp, vertical = 6.dp)
                            ) {
                                Text(
                                    text = "• ${symptom.canonicalName}",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (symptom.defaultRisk == RiskBand.RED) RedUrgent else YellowModerate
                                )
                            }
                        }
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(20.dp)) }

            // Vitals Input Section
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Clinical Vitals",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )

                    val isAnyWearableAutofill = uiState.isPulseAutofilled || uiState.isSpo2Autofilled || uiState.isTempAutofilled
                    if (isAnyWearableAutofill) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .background(GreenSyncedBg)
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = "⚡ From Wearable",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = GreenSynced
                            )
                        }
                    } else {
                        Text(
                            text = "(Editable)",
                            fontSize = 11.sp,
                            color = TextMuted
                        )
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = CardWhite)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            OutlinedTextField(
                                value = uiState.bpSystolic,
                                onValueChange = { viewModel.onVitalChanged(bpSystolic = it) },
                                label = { Text("Sys BP (mmHg)") },
                                placeholder = { Text("e.g. 120") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = uiState.bpDiastolic,
                                onValueChange = { viewModel.onVitalChanged(bpDiastolic = it) },
                                label = { Text("Dia BP (mmHg)") },
                                placeholder = { Text("e.g. 80") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            OutlinedTextField(
                                value = uiState.spo2Percent,
                                onValueChange = { viewModel.onVitalChanged(spo2Percent = it) },
                                label = {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text("SpO2 (%)")
                                        if (uiState.isSpo2Autofilled) {
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text("⚡ From wearable", fontSize = 10.sp, color = GreenSynced, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                },
                                placeholder = { Text("e.g. 98") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = uiState.heartRateBpm,
                                onValueChange = { viewModel.onVitalChanged(heartRateBpm = it) },
                                label = {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text("Pulse (bpm)")
                                        if (uiState.isPulseAutofilled) {
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text("⚡ From wearable", fontSize = 10.sp, color = GreenSynced, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                },
                                placeholder = { Text("e.g. 72") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            OutlinedTextField(
                                value = uiState.tempF,
                                onValueChange = { viewModel.onVitalChanged(tempF = it) },
                                label = {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text("Temp (°C)")
                                        if (uiState.isTempAutofilled) {
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text("⚡ From wearable", fontSize = 10.sp, color = GreenSynced, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                },
                                placeholder = { Text("e.g. 37.2") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = uiState.hemoglobin,
                                onValueChange = { viewModel.onVitalChanged(hemoglobin = it) },
                                label = { Text("Hb (g/dL)") },
                                placeholder = { Text("e.g. 12.5") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            OutlinedTextField(
                                value = uiState.fetalHeartRate,
                                onValueChange = { viewModel.onVitalChanged(fetalHeartRate = it) },
                                label = { Text("FHR (bpm)") },
                                placeholder = { Text("e.g. 140") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(20.dp)) }

            // Calculated Risk Result Card
            val result = uiState.calculatedResult
            if (result != null) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = when (result.riskBand) {
                                RiskBand.RED -> RedUrgentBg
                                RiskBand.YELLOW -> YellowModerateBg
                                RiskBand.GREEN -> GreenLowBg
                            }
                        )
                    ) {
                        Column(modifier = Modifier.padding(18.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                RiskBadge(riskBand = result.riskBand)
                                Text(
                                    text = "Specialty: ${result.primarySpecialty}",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    color = TextPrimary
                                )
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            Text(
                                text = "AI Assessment:",
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp,
                                color = TextPrimary
                            )
                            Text(
                                text = result.aiSummary,
                                fontSize = 12.sp,
                                color = TextPrimary
                            )

                            Spacer(modifier = Modifier.height(8.dp))

                            Text(
                                text = "Recommended Action:",
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp,
                                color = TextPrimary
                            )
                            Text(
                                text = result.actionAdvice,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = TextPrimary
                            )
                        }
                    }
                }

                item { Spacer(modifier = Modifier.height(20.dp)) }

                // Actions: Save Triage & Proceed to Referral
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Button(
                            onClick = { viewModel.saveTriageRecord() },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (uiState.isSaved) GreenSynced else NavyPrimary
                            ),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .weight(1f)
                                .height(50.dp)
                        ) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null)
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(if (uiState.isSaved) "SAVED" else "SAVE TRIAGE")
                        }

                        if (result.riskBand != RiskBand.GREEN) {
                            Button(
                                onClick = onNavigateToReferral,
                                colors = ButtonDefaults.buttonColors(containerColor = RedUrgent),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .weight(1f)
                                    .height(50.dp)
                            ) {
                                Text("FIND HOSPITAL", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(30.dp)) }
        }
    }
}
