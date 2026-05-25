/**
 * ui/MapScreen.kt — AWS Maps Only (MapLibre GeoJSON route rendering)
 */
package com.example.catagentdeployer.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.airbnb.lottie.LottieComposition
import com.airbnb.lottie.compose.*
import com.example.catagentdeployer.network.Place
import org.maplibre.android.MapLibre
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.geometry.LatLngBounds
import org.maplibre.android.maps.MapView
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.Style
import org.maplibre.android.style.layers.LineLayer
import org.maplibre.android.style.layers.SymbolLayer
import org.maplibre.android.style.layers.Property
import org.maplibre.android.style.layers.PropertyFactory.*
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Typeface
import org.maplibre.android.style.sources.GeoJsonSource
import org.maplibre.geojson.Feature
import org.maplibre.geojson.FeatureCollection
import org.maplibre.geojson.LineString
import org.maplibre.geojson.Point
import org.maplibre.android.annotations.MarkerOptions

private val HCMC = LatLng(10.7769, 106.7009)
private const val ROUTE_SOURCE_ID = "route-source"
private const val ROUTE_LAYER_ID  = "route-layer"
private const val POINTS_SOURCE_ID = "points-source"
private const val POINTS_LAYER_ID  = "points-layer"

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapScreen(
    viewModel: MapViewModel,
    paddingValues: PaddingValues,
    userName: String,
    onLogout: () -> Unit
) {
    val places         by viewModel.places.collectAsState()
    val originSugg     by viewModel.originSuggestions.collectAsState()
    val destSugg       by viewModel.destSuggestions.collectAsState()
    val selectedPlace  by viewModel.selectedPlace.collectAsState()
    val directions     by viewModel.directions.collectAsState()
    val polylinePoints by viewModel.polylinePoints.collectAsState()
    val loading        by viewModel.loading.collectAsState()
    val query          by viewModel.query.collectAsState()
    val origin         by viewModel.origin.collectAsState()
    val destination    by viewModel.destination.collectAsState()
    val activeTab      by viewModel.activeTab.collectAsState()

    val focusManager = LocalFocusManager.current

    var showControlSheet by remember { mutableStateOf(false) }
    var showPlaceSheet   by remember { mutableStateOf(false) }
    var clickedPos       by remember { mutableStateOf<LatLng?>(null) }
    var recenterTrigger  by remember { mutableIntStateOf(0) }
    var mapInstance      by remember { mutableStateOf<MapLibreMap?>(null) }

    val controlSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    val logoComposition        by rememberLottieComposition(LottieCompositionSpec.Url("https://lottie.host/a10d6761-269f-4700-bdbc-6c7693050caf/SilgbdxVrh.lottie"))
    val searchBtnComposition   by rememberLottieComposition(LottieCompositionSpec.Url("https://lottie.host/30d42053-e9dc-425e-a36e-383873fc86ac/ZDCzXZTXU2.lottie"))
    val markerComposition      by rememberLottieComposition(LottieCompositionSpec.Url("https://lottie.host/28afbcf7-aed2-42c2-aa94-65841d0e9c2b/FacU0GmScW.lottie"))
    val emptyStateComposition  by rememberLottieComposition(LottieCompositionSpec.Url("https://lottie.host/4b1ad8af-d769-4676-a2d6-686a7cc49d82/yF3dvgO9XZ.lottie"))
    val weatherComposition     by rememberLottieComposition(LottieCompositionSpec.Url("https://lottie.host/59ef4efc-bad7-4d4b-bf67-88638a7d6d3b/9MJF1B7EEV.lottie"))

    // Camera zoom khi chọn place
    LaunchedEffect(selectedPlace) {
        selectedPlace?.let { p ->
            if (p.lat != null && p.lng != null) {
                mapInstance?.animateCamera(CameraUpdateFactory.newLatLngZoom(LatLng(p.lat, p.lng), 15.0))
            }
        }
    }

    // Auto-zoom fit route bounds
    LaunchedEffect(polylinePoints) {
        if (polylinePoints.size > 1) {
            mapInstance?.let { map ->
                val bounds = LatLngBounds.Builder().apply {
                    polylinePoints.forEach { include(it) }
                }.build()
                map.animateCamera(CameraUpdateFactory.newLatLngBounds(bounds, 150))
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize().padding(paddingValues)) {
        AwsMapView(
            places        = places,
            polylinePoints = polylinePoints,
            selectedPlace = selectedPlace,
            clickedPos    = clickedPos,
            recenterTrigger = recenterTrigger,
            onMapReady    = { mapInstance = it },
            onMapClick    = { ll -> clickedPos = ll; viewModel.selectPlace(null); showPlaceSheet = false }
        )

        // Header
        Card(
            modifier = Modifier.fillMaxWidth().padding(16.dp).align(Alignment.TopCenter),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xCC050505)),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.1f))
        ) {
            Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                LottieAnimation(composition = logoComposition, iterations = LottieConstants.IterateForever, modifier = Modifier.size(40.dp))
                Spacer(Modifier.width(12.dp))
                Text("MAPVIT", fontWeight = FontWeight.Black, color = Color.White, fontSize = 20.sp, letterSpacing = 1.sp)
                Spacer(Modifier.weight(1f))
                IconButton(onClick = onLogout) { Icon(Icons.Default.Logout, null, tint = Color.White.copy(alpha = 0.6f)) }
            }
        }

        // Weather Widget
        Box(modifier = Modifier.align(Alignment.TopEnd).padding(top = 100.dp, end = 16.dp)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.background(Color(0x88FFFFFF), RoundedCornerShape(20.dp)).padding(horizontal = 12.dp)
            ) {
                Column(horizontalAlignment = Alignment.End) {
                    Text("THỜI TIẾT", fontSize = 9.sp, fontWeight = FontWeight.Black, color = Color.Black)
                    Text("Active ✦", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Black)
                }
                LottieAnimation(composition = weatherComposition, iterations = LottieConstants.IterateForever, modifier = Modifier.size(60.dp))
            }
        }

        // FABs
        Column(
            modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            SmallFloatingActionButton(
                onClick = { recenterTrigger++ },
                containerColor = Color.Black,
                contentColor = Color(0xFFEAFF00),
                shape = CircleShape
            ) { Icon(Icons.Default.MyLocation, null) }

            FloatingActionButton(
                onClick = { showControlSheet = true },
                containerColor = Color(0xFFEAFF00),
                contentColor = Color.Black,
                shape = RoundedCornerShape(16.dp)
            ) {
                Row(modifier = Modifier.padding(horizontal = 20.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Search, null)
                    Spacer(Modifier.width(8.dp))
                    Text("KHÁM PHÁ", fontWeight = FontWeight.Black)
                }
            }
        }

        // Floating Route Stats Card
        if (polylinePoints.isNotEmpty() && !showControlSheet) {
            val directions = viewModel.directions.collectAsState().value
            Card(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(start = 16.dp, bottom = 16.dp, end = 120.dp)
                    .fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xCC050505)),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.1f))
            ) {
                Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("KHOẢNG CÁCH", fontSize = 10.sp, color = Color.Gray, fontWeight = FontWeight.Black)
                        Text(directions?.distance?.text ?: "--", fontSize = 16.sp, color = Color(0xFFEAFF00), fontWeight = FontWeight.Black)
                    }
                    Spacer(Modifier.width(8.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("THỜI GIAN", fontSize = 10.sp, color = Color.Gray, fontWeight = FontWeight.Black)
                        Text(directions?.duration?.text ?: "--", fontSize = 16.sp, color = Color(0xFFEAFF00), fontWeight = FontWeight.Black)
                    }
                }
            }
        }
    }

    // Bottom Sheet: Search & Directions
    if (showControlSheet) {
        ModalBottomSheet(
            onDismissRequest = { showControlSheet = false },
            sheetState = controlSheetState,
            containerColor = Color(0xFF0A0A0A),
            dragHandle = { Box(modifier = Modifier.padding(12.dp).size(40.dp, 4.dp).background(Color.White.copy(alpha = 0.1f), CircleShape)) }
        ) {
            Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp).navigationBarsPadding()) {
                // Tabs
                Row(modifier = Modifier.fillMaxWidth().background(Color.White.copy(alpha = 0.05f), RoundedCornerShape(12.dp)).padding(4.dp)) {
                    listOf("search" to "TÌM KIẾM", "directions" to "CHỈ ĐƯỜNG").forEach { (tab, label) ->
                        Box(
                            modifier = Modifier.weight(1f).height(44.dp)
                                .background(if (activeTab == tab) Color(0xFFEAFF00) else Color.Transparent, RoundedCornerShape(10.dp))
                                .clickable { viewModel.setActiveTab(tab) },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(label, fontWeight = FontWeight.Black, fontSize = 13.sp, color = if (activeTab == tab) Color.Black else Color.White)
                        }
                    }
                }
                Spacer(Modifier.height(24.dp))

                if (activeTab == "search") {
                    SearchPanel(viewModel, focusManager, searchBtnComposition, places, markerComposition, emptyStateComposition) {
                        showPlaceSheet = true
                        showControlSheet = false
                    }
                } else {
                    DirectionsPanel(viewModel, origin, destination, originSugg, destSugg, directions, loading) {
                        showControlSheet = false
                    }
                }
                Spacer(Modifier.height(32.dp))
            }
        }
    }

    // Bottom Sheet: Place Detail
    if (showPlaceSheet && selectedPlace != null) {
        ModalBottomSheet(
            onDismissRequest = { showPlaceSheet = false; viewModel.selectPlace(null) },
            containerColor = Color(0xFF0A0A0A)
        ) {
            Column(modifier = Modifier.fillMaxWidth().padding(24.dp).navigationBarsPadding()) {
                Text(selectedPlace!!.name, color = Color(0xFFEAFF00), fontWeight = FontWeight.Black, fontSize = 26.sp)
                selectedPlace!!.address?.let {
                    Text(it, color = Color.White.copy(alpha = 0.6f), fontSize = 15.sp, modifier = Modifier.padding(top = 8.dp))
                }
                Spacer(Modifier.height(32.dp))
                Button(
                    onClick = {
                        viewModel.setOrigin("Vị trí của bạn", "10.7769,106.7009")
                        viewModel.setDestination(selectedPlace!!.name, "${selectedPlace!!.lat},${selectedPlace!!.lng}")
                        viewModel.setActiveTab("directions")
                        showPlaceSheet = false
                        showControlSheet = true
                    },
                    modifier = Modifier.fillMaxWidth().height(60.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEAFF00), contentColor = Color.Black)
                ) {
                    Icon(Icons.Default.Directions, null)
                    Spacer(Modifier.width(8.dp))
                    Text("CHỈ ĐƯỜNG NGAY", fontWeight = FontWeight.Black, fontSize = 16.sp)
                }
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}

// ─── AWS Map View (MapLibre + GeoJSON route layer) ───────────────────────────

fun createMarkerBitmap(text: String, color: Int): Bitmap {
    val textSize = 32f
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    paint.textSize = textSize
    paint.typeface = Typeface.DEFAULT_BOLD

    val textBounds = Rect()
    paint.getTextBounds(text, 0, text.length, textBounds)
    
    val paddingX = 24f
    val paddingY = 16f
    val pillWidth = textBounds.width() + paddingX * 2
    val pillHeight = textBounds.height() + paddingY * 2
    
    val circleRadius = 14f
    val circleSpacing = 8f 
    
    val width = maxOf(pillWidth, circleRadius * 2).toInt()
    val height = (pillHeight + circleSpacing + circleRadius * 2).toInt()
    
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    
    paint.color = color
    val pillRect = RectF((width - pillWidth) / 2, 0f, (width + pillWidth) / 2, pillHeight)
    canvas.drawRoundRect(pillRect, pillHeight / 2, pillHeight / 2, paint)
    
    paint.color = android.graphics.Color.WHITE
    paint.textAlign = Paint.Align.CENTER
    val textY = pillRect.centerY() + textBounds.height() / 2f - 4f
    canvas.drawText(text, width / 2f, textY, paint)
    
    val circleY = height - circleRadius
    paint.color = color
    canvas.drawCircle(width / 2f, circleY, circleRadius, paint)
    
    paint.color = android.graphics.Color.parseColor("#EAFF00")
    canvas.drawCircle(width / 2f, circleY, circleRadius / 2f, paint)
    
    return bitmap
}

// Giữ ref tới GeoJsonSource để update trực tiếp, tránh dùng style.getSourceAs (không có trong v11)
private var routeSourceRef: GeoJsonSource? = null
private var pointsSourceRef: GeoJsonSource? = null

@Composable
fun AwsMapView(
    places: List<Place>,
    polylinePoints: List<LatLng>,
    selectedPlace: Place?,
    clickedPos: LatLng?,
    recenterTrigger: Int,
    onMapReady: (MapLibreMap) -> Unit,
    onMapClick: (LatLng) -> Unit
) {
    val context   = LocalContext.current
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val currentOnMapClick by rememberUpdatedState(onMapClick)

    val currentPlaces     by rememberUpdatedState(places)
    val currentPolyline   by rememberUpdatedState(polylinePoints)
    val currentClickedPos by rememberUpdatedState(clickedPos)

    val mapView = remember {
        MapLibre.getInstance(context)
        MapView(context)
    }

    var mapRef by remember { mutableStateOf<MapLibreMap?>(null) }

    DisposableEffect(lifecycle) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_START   -> mapView.onStart()
                Lifecycle.Event.ON_RESUME  -> mapView.onResume()
                Lifecycle.Event.ON_PAUSE   -> mapView.onPause()
                Lifecycle.Event.ON_STOP    -> mapView.onStop()
                Lifecycle.Event.ON_DESTROY -> mapView.onDestroy()
                else -> {}
            }
        }
        lifecycle.addObserver(observer)
        onDispose { lifecycle.removeObserver(observer) }
    }

    LaunchedEffect(recenterTrigger) {
        if (recenterTrigger > 0) mapRef?.animateCamera(CameraUpdateFactory.newLatLngZoom(HCMC, 13.0))
    }

    // Redraw khi data thay đổi — dùng routeSourceRef trực tiếp thay vì style.getSourceAs
    LaunchedEffect(places, polylinePoints, clickedPos) {
        val map = mapRef ?: return@LaunchedEffect
        redrawAnnotations(map, currentPlaces, currentPolyline, currentClickedPos)
    }

    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = {
            mapView.apply {
                getMapAsync { map ->
                    mapRef = map
                    onMapReady(map)

                    val region   = "ap-southeast-1"
                    val mapName  = "webappmap-map"
                    val apiKey   = "v1.public.eyJqdGkiOiI2NjFjMjYyYy01MmI3LTQxZDAtODE5Yy1iOWE2ZDdhYTUwNmUifQOcSMbQMtPh2tOYZX3DXZj3FVmMCni0-G5Qa5wY4L7VUDXyURH23RCIcf5w3NiyhZaBp1Xfz6qtk9XAL9-zkqPZgWPWFixFtIROsbdLRaMMihB_J1Paa3SZx0hpZexVU9MLPh0kaZss1IrW6O5q6pzfUEbTfQ6cXGU7Qo_2GOCLXWMHsiVqL0D1YfDV8_ZK9lBQ_pQ9mluZwtPCe9FDlq8KXFaB2LbQnSaoohRx62q-ZhNboIlJj64RCdJs4Q11OOiA8kBTz5WujnyVOdZYtuXLAjQ9Yywme8Bh1MkC43zTcBJRZq_47UL74j9op8kZHOVm43tF7KsX0MY60e5TgU8.MzRjYzZmZGUtZmY3NC00NDZiLWJiMTktNTc4YjUxYTFlOGZi"
                    val styleUrl = "https://maps.geo.$region.amazonaws.com/maps/v0/maps/$mapName/style-descriptor?key=$apiKey"

                    map.setStyle(Style.Builder().fromUri(styleUrl)) { style ->
                        map.cameraPosition = CameraPosition.Builder().target(HCMC).zoom(13.0).build()

                        // Tạo GeoJSON source và lưu ref trực tiếp
                        val src = GeoJsonSource(ROUTE_SOURCE_ID, FeatureCollection.fromFeatures(emptyList()))
                        routeSourceRef = src
                        style.addSource(src)

                        val ptsSrc = GeoJsonSource(POINTS_SOURCE_ID, FeatureCollection.fromFeatures(emptyList()))
                        pointsSourceRef = ptsSrc
                        style.addSource(ptsSrc)

                        // Tạo custom marker images
                        style.addImage("marker_a", createMarkerBitmap("A - Điểm đi", android.graphics.Color.parseColor("#00B16A")))
                        style.addImage("marker_b", createMarkerBitmap("B - Điểm đến", android.graphics.Color.parseColor("#E74C3C")))
                        style.addImage("marker_place", createMarkerBitmap("📍 Điểm", android.graphics.Color.parseColor("#555555")))

                        // Tạo LineLayer (MapLibre v11: dùng withProperties)
                        style.addLayer(
                            LineLayer(ROUTE_LAYER_ID, ROUTE_SOURCE_ID).withProperties(
                                lineColor("#EAFF00"),
                                lineWidth(6f),
                                lineOpacity(0.9f),
                                lineCap(Property.LINE_CAP_ROUND),
                                lineJoin(Property.LINE_JOIN_ROUND)
                            )
                        )

                        // Tạo SymbolLayer để vẽ 2 điểm A và B thay vì CircleLayer
                        style.addLayer(
                            SymbolLayer(POINTS_LAYER_ID, POINTS_SOURCE_ID).withProperties(
                                iconImage(org.maplibre.android.style.expressions.Expression.get("image_name")),
                                iconAllowOverlap(true),
                                iconIgnorePlacement(true),
                                iconAnchor(Property.ICON_ANCHOR_BOTTOM)
                            )
                        )

                        // Draw trạng thái ban đầu
                        redrawAnnotations(map, currentPlaces, currentPolyline, currentClickedPos)
                    }

                    map.addOnMapClickListener { ll ->
                        currentOnMapClick(LatLng(ll.latitude, ll.longitude))
                        true
                    }
                }
            }
        }
    )
}

private fun redrawAnnotations(
    map: MapLibreMap,
    places: List<Place>,
    polylinePoints: List<LatLng>,
    clickedPos: LatLng?
) {
    map.clear()
    val allPoints = mutableListOf<Feature>()

    // Route: cập nhật GeoJSON source qua ref trực tiếp
    android.util.Log.e("MAP_DEBUG", "redrawAnnotations called! places: ${places.size}, polyline: ${polylinePoints.size}, routeSourceRef exists? ${routeSourceRef != null}")
    if (polylinePoints.size > 1) {
        val coords  = polylinePoints.map { Point.fromLngLat(it.longitude, it.latitude) }
        val geojson = FeatureCollection.fromFeatures(
            listOf(Feature.fromGeometry(LineString.fromLngLats(coords)))
        )
        routeSourceRef?.setGeoJson(geojson)

        // Thêm 2 điểm A và B vào SymbolLayer
        val featureA = Feature.fromGeometry(Point.fromLngLat(polylinePoints.first().longitude, polylinePoints.first().latitude))
        featureA.addStringProperty("image_name", "marker_a")
        allPoints.add(featureA)

        val featureB = Feature.fromGeometry(Point.fromLngLat(polylinePoints.last().longitude, polylinePoints.last().latitude))
        featureB.addStringProperty("image_name", "marker_b")
        allPoints.add(featureB)
    } else {
        routeSourceRef?.setGeoJson(FeatureCollection.fromFeatures(emptyList()))
    }

    // Place markers và Clicked Pos vẽ bằng SymbolLayer luôn
    places.forEach { place ->
        if (place.lat != null && place.lng != null) {
            val f = Feature.fromGeometry(Point.fromLngLat(place.lng, place.lat))
            f.addStringProperty("image_name", "marker_place")
            allPoints.add(f)
        }
    }
    clickedPos?.let { 
        val f = Feature.fromGeometry(Point.fromLngLat(it.longitude, it.latitude))
        f.addStringProperty("image_name", "marker_place")
        allPoints.add(f) 
    }

    pointsSourceRef?.setGeoJson(FeatureCollection.fromFeatures(allPoints))
}

// ─── UI Panels ───────────────────────────────────────────────────────────────

@Composable
fun SearchPanel(
    viewModel: MapViewModel,
    focusManager: androidx.compose.ui.focus.FocusManager,
    searchIcon: LottieComposition?,
    places: List<Place>,
    markerIcon: LottieComposition?,
    emptyIcon: LottieComposition?,
    onPlaceClick: () -> Unit
) {
    val query by viewModel.query.collectAsState()

    Row(verticalAlignment = Alignment.CenterVertically) {
        OutlinedTextField(
            value = query,
            onValueChange = { viewModel.setQuery(it); if (it.length > 2) viewModel.searchPlaces(it) },
            modifier = Modifier.weight(1f),
            placeholder = { Text("Tìm quán cà phê, cây xăng...", color = Color.White.copy(alpha = 0.2f)) },
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFFEAFF00),
                unfocusedBorderColor = Color.White.copy(alpha = 0.1f),
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White
            ),
            singleLine = true
        )
        Spacer(Modifier.width(12.dp))
        Box(
            modifier = Modifier.size(56.dp)
                .background(Color(0xFFEAFF00), RoundedCornerShape(12.dp))
                .clickable { focusManager.clearFocus(); viewModel.searchPlaces(query) },
            contentAlignment = Alignment.Center
        ) {
            LottieAnimation(composition = searchIcon, iterations = LottieConstants.IterateForever, modifier = Modifier.size(44.dp))
        }
    }

    Spacer(Modifier.height(24.dp))

    if (places.isEmpty()) {
        Column(modifier = Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            LottieAnimation(composition = emptyIcon, iterations = LottieConstants.IterateForever, modifier = Modifier.size(220.dp))
            Text("Khám phá thế giới cùng MAPVIT", color = Color.White.copy(alpha = 0.3f), fontSize = 14.sp)
        }
    } else {
        Text("${places.size} KẾT QUẢ", color = Color.White.copy(alpha = 0.4f), fontSize = 11.sp, fontWeight = FontWeight.Black)
        Spacer(Modifier.height(8.dp))
        LazyColumn(modifier = Modifier.heightIn(max = 400.dp)) {
            items(places) { place ->
                PlaceItem(place, markerIcon) {
                    viewModel.selectPlace(place)
                    onPlaceClick()
                }
                HorizontalDivider(color = Color.White.copy(alpha = 0.05f))
            }
        }
    }
}

@Composable
fun DirectionsPanel(
    viewModel: MapViewModel,
    origin: String,
    destination: String,
    originSugg: List<Place>,
    destSugg: List<Place>,
    directions: com.example.catagentdeployer.network.DirectionsResponse?,
    loading: Boolean,
    onRouteDrawn: () -> Unit
) {
    Column {
        InputWithSuggestions(
            label = "Điểm xuất phát",
            value = origin,
            suggestions = originSugg,
            onValueChange = { viewModel.setOrigin(it); if (it.length > 2) viewModel.searchPlaces(it, "origin") },
            onSelect = { p -> viewModel.setOrigin(p.name, "${p.lat},${p.lng}") }
        )
        Spacer(Modifier.height(12.dp))
        InputWithSuggestions(
            label = "Điểm đến",
            value = destination,
            suggestions = destSugg,
            onValueChange = { viewModel.setDestination(it); if (it.length > 2) viewModel.searchPlaces(it, "destination") },
            onSelect = { p -> viewModel.setDestination(p.name, "${p.lat},${p.lng}") }
        )
        Spacer(Modifier.height(20.dp))
        Button(
            onClick = { viewModel.getDirections(); onRouteDrawn() },
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEAFF00), contentColor = Color.Black),
            enabled = !loading && origin.isNotBlank() && destination.isNotBlank()
        ) {
            if (loading) CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.Black)
            else { Icon(Icons.Default.Directions, null); Spacer(Modifier.width(8.dp)); Text("CHỈ ĐƯỜNG ĐI", fontWeight = FontWeight.Black, fontSize = 16.sp) }
        }

        if (directions != null) {
            Spacer(Modifier.height(20.dp))
            Row(
                modifier = Modifier.fillMaxWidth()
                    .background(Color.White.copy(alpha = 0.05f), RoundedCornerShape(12.dp))
                    .padding(20.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                RouteStat("KHOẢNG CÁCH", directions.distance?.text ?: "--")
                RouteStat("THỜI GIAN", directions.duration?.text ?: "--")
            }
        }
    }
}

@Composable
fun InputWithSuggestions(
    label: String,
    value: String,
    suggestions: List<Place>,
    onValueChange: (String) -> Unit,
    onSelect: (Place) -> Unit
) {
    Column {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text(label, color = Color.White.copy(alpha = 0.2f)) },
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFFEAFF00),
                unfocusedBorderColor = Color.White.copy(alpha = 0.1f),
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White
            ),
            singleLine = true
        )
        if (suggestions.isNotEmpty()) {
            Card(
                modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1A1A1A)),
                shape = RoundedCornerShape(8.dp)
            ) {
                suggestions.take(4).forEach { p ->
                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { onSelect(p) }.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.LocationOn, null, tint = Color(0xFFEAFF00), modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(8.dp))
                        Column {
                            Text(p.name, color = Color.White, fontSize = 13.sp, maxLines = 1, fontWeight = FontWeight.Medium)
                            p.address?.let { Text(it, color = Color.White.copy(alpha = 0.4f), fontSize = 11.sp, maxLines = 1) }
                        }
                    }
                    HorizontalDivider(color = Color.White.copy(alpha = 0.04f))
                }
            }
        }
    }
}

@Composable
fun PlaceItem(place: Place, icon: LottieComposition?, onClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable { onClick() }.padding(vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        LottieAnimation(composition = icon, iterations = LottieConstants.IterateForever, modifier = Modifier.size(36.dp))
        Spacer(Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(place.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
            place.address?.let { Text(it, color = Color.White.copy(alpha = 0.4f), fontSize = 12.sp, maxLines = 1) }
        }
        Icon(Icons.Default.ChevronRight, null, tint = Color.White.copy(alpha = 0.2f))
    }
}

@Composable
fun RouteStat(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, color = Color.White.copy(alpha = 0.3f), fontSize = 10.sp, fontWeight = FontWeight.Black)
        Text(value, color = Color(0xFFEAFF00), fontWeight = FontWeight.Black, fontSize = 20.sp)
    }
}
