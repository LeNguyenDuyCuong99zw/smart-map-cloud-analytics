/**
 * ui/MapScreen.kt — Màn hình bản đồ chính (Vitality Redesign)
 */

package com.example.catagentdeployer.ui

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.airbnb.lottie.compose.*
import com.example.catagentdeployer.network.Place
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.*
import kotlinx.coroutines.launch
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import org.maplibre.android.MapLibre
import org.maplibre.android.maps.MapView
import org.maplibre.android.maps.Style
import org.maplibre.android.geometry.LatLng as MLLatLng
import org.maplibre.android.annotations.MarkerOptions as MLMarkerOptions
import org.maplibre.android.annotations.PolylineOptions as MLPolylineOptions
import org.maplibre.android.camera.CameraPosition as MLCameraPosition
import org.maplibre.android.camera.CameraUpdateFactory as MLCameraUpdateFactory

private val HCMC = LatLng(10.7769, 106.7009)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapScreen(
    viewModel: MapViewModel,
    paddingValues: PaddingValues,
    userName: String,
    onLogout: () -> Unit
) {
    val places         by viewModel.places.collectAsState()
    val selectedPlace  by viewModel.selectedPlace.collectAsState()
    val directions     by viewModel.directions.collectAsState()
    val polylinePoints by viewModel.polylinePoints.collectAsState()
    val loading        by viewModel.loading.collectAsState()
    val toast          by viewModel.toast.collectAsState()
    val query          by viewModel.query.collectAsState()
    val origin         by viewModel.origin.collectAsState()
    val destination    by viewModel.destination.collectAsState()
    val activeTab      by viewModel.activeTab.collectAsState()

    val scope          = rememberCoroutineScope()
    val focusManager   = LocalFocusManager.current

    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(HCMC, 13f)
    }

    var showControlSheet by remember { mutableStateOf(false) }
    var showPlaceSheet   by remember { mutableStateOf(false) }
    var clickedPos       by remember { mutableStateOf<LatLng?>(null) }
    var focusedField     by remember { mutableStateOf("") }
    var useAwsMap        by remember { mutableStateOf(true) }
    val controlSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val placeSheetState   = rememberModalBottomSheetState()

    // Lottie Compositions
    val logoComposition by rememberLottieComposition(LottieCompositionSpec.Url("https://lottie.host/a10d6761-269f-4700-bdbc-6c7693050caf/SilgbdxVrh.lottie"))
    val searchButtonComposition by rememberLottieComposition(LottieCompositionSpec.Url("https://lottie.host/30d42053-e9dc-425e-a36e-383873fc86ac/ZDCzXZTXU2.lottie"))
    val markerComposition by rememberLottieComposition(LottieCompositionSpec.Url("https://lottie.host/28afbcf7-aed2-42c2-aa94-65841d0e9c2b/FacU0GmScW.lottie"))
    val emptyStateComposition by rememberLottieComposition(LottieCompositionSpec.Url("https://lottie.host/4b1ad8af-d769-4676-a2d6-686a7cc49d82/yF3dvgO9XZ.lottie"))
    val weatherComposition by rememberLottieComposition(LottieCompositionSpec.Url("https://lottie.host/59ef4efc-bad7-4d4b-bf67-88638a7d6d3b/9MJF1B7EEV.lottie"))

    LaunchedEffect(selectedPlace) {
        selectedPlace?.let {
            cameraPositionState.animate(CameraUpdateFactory.newLatLngZoom(LatLng(it.lat ?: 0.0, it.lng ?: 0.0), 15f))
        }
    }

    Box(modifier = Modifier.fillMaxSize().padding(paddingValues)) {
        // ── Map Layer ──────────────────────────────────
        if (useAwsMap) {
            AwsMapView(
                places = places,
                polylinePoints = polylinePoints,
                selectedPlace = selectedPlace,
                clickedPos = clickedPos,
                onMapClick = { latLng -> clickedPos = latLng; viewModel.selectPlace(null); showPlaceSheet = false }
            )
        } else {
            GoogleMap(
                modifier = Modifier.fillMaxSize(),
                cameraPositionState = cameraPositionState,
                uiSettings = MapUiSettings(zoomControlsEnabled = false, myLocationButtonEnabled = false),
                onMapClick = { latLng -> clickedPos = latLng; viewModel.selectPlace(null); showPlaceSheet = false }
            ) {
                places.forEach { place ->
                    if (place.lat != null && place.lng != null) {
                        MarkerComposable(
                            state = MarkerState(LatLng(place.lat, place.lng)),
                            onClick = { viewModel.selectPlace(place); showPlaceSheet = true; true }
                        ) {
                            LottieAnimation(composition = markerComposition, iterations = LottieConstants.IterateForever, modifier = Modifier.size(60.dp))
                        }
                    }
                }
                if (polylinePoints.size > 1) {
                    Polyline(points = polylinePoints, color = Color(0xFFEAFF00), width = 12f)
                    
                    // Origin Marker
                    MarkerComposable(state = MarkerState(polylinePoints.first())) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Box(modifier = Modifier.background(Color(0xFF10B981), RoundedCornerShape(12.dp)).padding(horizontal = 8.dp, vertical = 4.dp)) {
                                Text("A - Điểm đi", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                    }
                    
                    // Destination Marker
                    MarkerComposable(state = MarkerState(polylinePoints.last())) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Box(modifier = Modifier.background(Color(0xFFEF4444), RoundedCornerShape(12.dp)).padding(horizontal = 8.dp, vertical = 4.dp)) {
                                Text("B - Điểm đến", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                    }
                }
                
                // Temporary Clicked Pin
                clickedPos?.let { pos ->
                    Marker(state = MarkerState(position = pos), title = "Vị trí đã chọn")
                }

            }
        }

        // ── Top Bar (Header) ───────────────────────────
        Card(
            modifier = Modifier.fillMaxWidth().padding(16.dp).align(Alignment.TopCenter),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xCC050505)),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.1f))
        ) {
            Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                LottieAnimation(composition = logoComposition, iterations = LottieConstants.IterateForever, modifier = Modifier.size(40.dp))
                Spacer(Modifier.width(8.dp))
                Text("MAPVIT", fontWeight = FontWeight.Black, color = Color.White, fontSize = 18.sp)
                Spacer(Modifier.weight(1f))
                IconButton(onClick = onLogout) { Icon(Icons.Default.Logout, null, tint = Color.White.copy(alpha = 0.6f)) }
            }
        }

        // ── Weather Widget (Top Right) ────────────────
        Box(modifier = Modifier.align(Alignment.TopEnd).padding(top = 90.dp, end = 16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(horizontalAlignment = Alignment.End) {
                    Text("THÔNG TIN THỜI TIẾT", fontSize = 10.sp, fontWeight = FontWeight.Black, color = Color.Black)
                    Text("Đang hoạt động ✦", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.Black)
                }
                LottieAnimation(composition = weatherComposition, iterations = LottieConstants.IterateForever, modifier = Modifier.size(80.dp))
            }
        }

        // ── FABs ───────────────────────────────────────
        Column(modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            // Toggle Map Provider Button
            SmallFloatingActionButton(
                onClick = { useAwsMap = !useAwsMap },
                containerColor = Color.White,
                contentColor = Color.Black,
                shape = CircleShape
            ) { Icon(if (useAwsMap) Icons.Default.Public else Icons.Default.Map, null) }

            // Location Button
            SmallFloatingActionButton(
                onClick = { 
                    scope.launch {
                        cameraPositionState.animate(CameraUpdateFactory.newLatLngZoom(HCMC, 15f))
                    }
                },
                containerColor = Color.Black,
                contentColor = Color(0xFFEAFF00),
                shape = CircleShape
            ) { Icon(Icons.Default.MyLocation, null) }

            // Search Button
            FloatingActionButton(
                onClick = { showControlSheet = true },
                containerColor = Color(0xFFEAFF00),
                contentColor = Color.Black,
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(modifier = Modifier.padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Search, null)
                    Spacer(Modifier.width(8.dp))
                    Text("TÌM KIẾM", fontWeight = FontWeight.Black)
                }
            }
        }
    }

    // ── Panels ────────────────────────────────────────
    if (showControlSheet) {
        ModalBottomSheet(
            onDismissRequest = { showControlSheet = false },
            sheetState = controlSheetState,
            containerColor = Color(0xFF050505),
            dragHandle = { Box(modifier = Modifier.padding(12.dp).size(40.dp, 4.dp).background(Color.White.copy(alpha = 0.1f), RoundedCornerShape(2.dp))) }
        ) {
            Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp).navigationBarsPadding()) {
                // Tabs
                Row(modifier = Modifier.fillMaxWidth().background(Color.White.copy(alpha = 0.05f), RoundedCornerShape(8.dp)).padding(4.dp)) {
                    listOf("search" to "TÌM KIẾM", "directions" to "CHỈ ĐƯỜNG").forEach { (tab, label) ->
                        Box(
                            modifier = Modifier.weight(1f).height(40.dp)
                                .background(if (activeTab == tab) Color(0xFFEAFF00) else Color.Transparent, RoundedCornerShape(6.dp))
                                .clickable { viewModel.setActiveTab(tab) },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(label, fontWeight = FontWeight.Black, fontSize = 12.sp, color = if (activeTab == tab) Color.Black else Color.White)
                        }
                    }
                }

                Spacer(Modifier.height(24.dp))

                if (activeTab == "search") {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                        OutlinedTextField(
                            value = query,
                            onValueChange = viewModel::setQuery,
                            modifier = Modifier.weight(1f),
                            placeholder = { Text("Bạn muốn đi đâu?", color = Color.White.copy(alpha = 0.3f)) },
                            shape = RoundedCornerShape(8.dp),
                            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFFEAFF00), unfocusedBorderColor = Color.White.copy(alpha = 0.1f), focusedTextColor = Color.White, unfocusedTextColor = Color.White)
                        )
                        Spacer(Modifier.width(8.dp))
                        Box(
                            modifier = Modifier.size(56.dp).background(Color(0xFFEAFF00), RoundedCornerShape(8.dp)).clickable { focusManager.clearFocus(); viewModel.searchPlaces() },
                            contentAlignment = Alignment.Center
                        ) {
                            LottieAnimation(composition = searchButtonComposition, iterations = LottieConstants.IterateForever, modifier = Modifier.size(44.dp))
                        }
                    }
                } else {
                    OutlinedTextField(
                        value = origin, 
                        onValueChange = { viewModel.setOrigin(it); viewModel.searchPlacesSuggest(it); focusedField = "origin" }, 
                        modifier = Modifier.fillMaxWidth(), 
                        placeholder = { Text("Điểm xuất phát", color = Color.White.copy(alpha = 0.3f)) }, 
                        shape = RoundedCornerShape(8.dp), 
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFFEAFF00), unfocusedBorderColor = Color.White.copy(alpha = 0.1f), focusedTextColor = Color.White, unfocusedTextColor = Color.White)
                    )
                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        value = destination, 
                        onValueChange = { viewModel.setDestination(it); viewModel.searchPlacesSuggest(it); focusedField = "destination" }, 
                        modifier = Modifier.fillMaxWidth(), 
                        placeholder = { Text("Điểm đến", color = Color.White.copy(alpha = 0.3f)) }, 
                        shape = RoundedCornerShape(8.dp), 
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFFEAFF00), unfocusedBorderColor = Color.White.copy(alpha = 0.1f), focusedTextColor = Color.White, unfocusedTextColor = Color.White)
                    )
                    Spacer(Modifier.height(16.dp))

                    // GỢI Ý ĐỊA ĐIỂM (AUTO-SUGGEST)
                    if (places.isNotEmpty() && focusedField.isNotEmpty()) {
                        Card(
                            modifier = Modifier.fillMaxWidth().heightIn(max = 200.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E1E)),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            LazyColumn {
                                items(places) { place ->
                                    Text(
                                        text = place.name + (if (place.address != null) " - ${place.address}" else ""),
                                        color = Color.White,
                                        fontSize = 13.sp,
                                        maxLines = 1,
                                        modifier = Modifier.fillMaxWidth().clickable {
                                            val coords = "${place.lat},${place.lng}"
                                            if (focusedField == "origin") {
                                                viewModel.setOrigin(place.name)
                                                viewModel.setOriginCoords(coords)
                                            } else {
                                                viewModel.setDestination(place.name)
                                                viewModel.setDestinationCoords(coords)
                                            }
                                            viewModel.clearPlaces()
                                            focusedField = ""
                                            focusManager.clearFocus()
                                        }.padding(12.dp)
                                    )
                                    Divider(color = Color.White.copy(alpha=0.1f))
                                }
                            }
                        }
                        Spacer(Modifier.height(16.dp))
                    }

                    Button(onClick = { viewModel.getDirections(); showControlSheet = false; focusedField = "" }, modifier = Modifier.fillMaxWidth().height(50.dp), shape = RoundedCornerShape(8.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEAFF00), contentColor = Color.Black)) {
                        Text("TÌM ĐƯỜNG ĐI", fontWeight = FontWeight.Black)
                    }

                    if (directions != null) {
                        Spacer(Modifier.height(16.dp))
                        Row(modifier = Modifier.fillMaxWidth().background(Color.White.copy(alpha=0.05f), RoundedCornerShape(8.dp)).padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Column {
                                Text("Khoảng cách", color = Color.White.copy(alpha=0.5f), fontSize = 12.sp)
                                Text(directions?.distance?.text ?: "--", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("Thời gian", color = Color.White.copy(alpha=0.5f), fontSize = 12.sp)
                                Text(directions?.duration?.text ?: "--", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            }
                        }
                    }

                }

                Spacer(Modifier.height(24.dp))

                // Results or Empty State
                if (places.isEmpty() && activeTab == "search" && !loading) {
                    Column(modifier = Modifier.fillMaxWidth().padding(bottom = 40.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        LottieAnimation(composition = emptyStateComposition, iterations = LottieConstants.IterateForever, modifier = Modifier.size(200.dp))
                        Text("Bắt đầu khám phá thế giới cùng MAPVIT", color = Color.White.copy(alpha = 0.4f), fontSize = 14.sp, textAlign = TextAlign.Center)
                    }
                } else {
                    LazyColumn(modifier = Modifier.heightIn(max = 400.dp)) {
                        items(places) { place ->
                            Row(modifier = Modifier.fillMaxWidth().clickable { viewModel.selectPlace(place); showPlaceSheet = true }.padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                                LottieAnimation(composition = markerComposition, iterations = LottieConstants.IterateForever, modifier = Modifier.size(32.dp))
                                Spacer(Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(place.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                    place.address?.let { Text(it, color = Color.White.copy(alpha = 0.5f), fontSize = 12.sp) }
                                }
                                IconButton(onClick = { viewModel.addFavorite(place) }) {
                                    Icon(Icons.Default.Favorite, contentDescription = "Yêu thích", tint = Color.Red.copy(alpha = 0.7f))
                                }
                            }
                            Divider(color = Color.White.copy(alpha = 0.05f))
                        }
                    }
                }
                Spacer(Modifier.height(20.dp))
            }
        }
    }

    if (showPlaceSheet && selectedPlace != null) {
        ModalBottomSheet(onDismissRequest = { showPlaceSheet = false; viewModel.selectPlace(null) }, containerColor = Color(0xFF050505)) {
            Column(modifier = Modifier.fillMaxWidth().padding(24.dp).navigationBarsPadding()) {
                Text(selectedPlace!!.name, color = Color(0xFFEAFF00), fontWeight = FontWeight.Black, fontSize = 24.sp)
                selectedPlace!!.address?.let { Text(it, color = Color.White.copy(alpha = 0.7f), fontSize = 14.sp, modifier = Modifier.padding(top = 4.dp)) }
                Spacer(Modifier.height(32.dp))
                Button(
                    onClick = { 
                        viewModel.setOrigin("Vị trí của bạn")
                        viewModel.setOriginCoords("10.7769,106.7009")
                        viewModel.setDestination(selectedPlace!!.name)
                        viewModel.setDestinationCoords("${selectedPlace!!.lat},${selectedPlace!!.lng}")
                        viewModel.setActiveTab("directions")
                        showPlaceSheet = false
                        showControlSheet = true 
                    },
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEAFF00), contentColor = Color.Black)
                ) { Text("CHỈ ĐƯỜNG", fontWeight = FontWeight.Black) }
                Spacer(Modifier.height(20.dp))
            }
        }
    }
}

// ── AWS MAP (MapLibre Wrapper) ──────────────────────────────────
@Composable
fun AwsMapView(
    places: List<Place>,
    polylinePoints: List<LatLng>,
    selectedPlace: Place?,
    clickedPos: LatLng?,
    onMapClick: (LatLng) -> Unit
) {
    val context = LocalContext.current
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val currentOnMapClick by rememberUpdatedState(onMapClick)
    
    val mapView = remember { 
        MapLibre.getInstance(context)
        MapView(context) 
    }

    DisposableEffect(lifecycle, mapView) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_START -> mapView.onStart()
                Lifecycle.Event.ON_RESUME -> mapView.onResume()
                Lifecycle.Event.ON_PAUSE -> mapView.onPause()
                Lifecycle.Event.ON_STOP -> mapView.onStop()
                Lifecycle.Event.ON_DESTROY -> mapView.onDestroy()
                else -> {}
            }
        }
        lifecycle.addObserver(observer)
        onDispose { lifecycle.removeObserver(observer) }
    }

    AndroidView(
        factory = { 
            mapView.apply {
                getMapAsync { map ->
                    map.addOnMapClickListener { mlLatLng ->
                        currentOnMapClick(LatLng(mlLatLng.latitude, mlLatLng.longitude))
                        true
                    }
                }
            }
        },
        modifier = Modifier.fillMaxSize(),
        update = { view ->
            view.getMapAsync { map ->
                val region = "ap-southeast-1"
                val mapName = "webappmap-map"
                val apiKey = "v1.public.eyJqdGkiOiI2NjFjMjYyYy01MmI3LTQxZDAtODE5Yy1iOWE2ZDdhYTUwNmUifQOcSMbQMtPh2tOYZX3DXZj3FVmMCni0-G5Qa5wY4L7VUDXyURH23RCIcf5w3NiyhZaBp1Xfz6qtk9XAL9-zkqPZgWPWFixFtIROsbdLRaMMihB_J1Paa3SZx0hpZexVU9MLPh0kaZss1IrW6O5q6pzfUEbTfQ6cXGU7Qo_2GOCLXWMHsiVqL0D1YfDV8_ZK9lBQ_pQ9mluZwtPCe9FDlq8KXFaB2LbQnSaoohRx62q-ZhNboIlJj64RCdJs4Q11OOiA8kBTz5WujnyVOdZYtuXLAjQ9Yywme8Bh1MkC43zTcBJRZq_47UL74j9op8kZHOVm43tF7KsX0MY60e5TgU8.MzRjYzZmZGUtZmY3NC00NDZiLWJiMTktNTc4YjUxYTFlOGZi"
                val styleUrl = "https://maps.geo.$region.amazonaws.com/maps/v0/maps/$mapName/style-descriptor?key=$apiKey"
                
                if (map.style == null) {
                    map.setStyle(Style.Builder().fromUri(styleUrl)) {
                        map.cameraPosition = MLCameraPosition.Builder().target(MLLatLng(10.7769, 106.7009)).zoom(13.0).build()
                    }
                }
                
                map.clear() // Clear existing annotations
                
                // Draw Search Results
                places.forEach { place ->
                    if (place.lat != null && place.lng != null) {
                        map.addMarker(MLMarkerOptions().position(MLLatLng(place.lat, place.lng)).title(place.name))
                    }
                }
                
                // Draw Route & A/B Markers
                if (polylinePoints.size > 1) {
                    val pts = polylinePoints.map { MLLatLng(it.latitude, it.longitude) }
                    map.addPolyline(MLPolylineOptions().addAll(pts).color(android.graphics.Color.parseColor("#EAFF00")).width(8f))
                    map.addMarker(MLMarkerOptions().position(pts.first()).title("A - Điểm đi"))
                    map.addMarker(MLMarkerOptions().position(pts.last()).title("B - Điểm đến"))
                }
                
                // Draw Clicked Pin
                clickedPos?.let {
                    map.addMarker(MLMarkerOptions().position(MLLatLng(it.latitude, it.longitude)).title("Vị trí đã chọn"))
                }
                
                // Animate Camera on Selection
                selectedPlace?.let {
                    if (it.lat != null && it.lng != null) {
                        map.animateCamera(MLCameraUpdateFactory.newLatLngZoom(MLLatLng(it.lat, it.lng), 15.0))
                    }
                }
            }
        }
    )
}
