/**
 * ui/MapViewModel.kt — Quản lý toàn bộ state và logic gọi API
 * Tương đương với MapPage.jsx trên Web
 */

package com.example.catagentdeployer.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.catagentdeployer.network.*
import org.maplibre.android.geometry.LatLng
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

class MapViewModel : ViewModel() {
    private val auth = FirebaseAuth.getInstance()

    // ── UI State (Đồng bộ với Web) ────────────────────────
    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query.asStateFlow()

    private val _origin = MutableStateFlow("")
    val origin: StateFlow<String> = _origin.asStateFlow()
    private val _originCoords = MutableStateFlow("")

    private val _destination = MutableStateFlow("")
    val destination: StateFlow<String> = _destination.asStateFlow()
    private val _destinationCoords = MutableStateFlow("")

    private val _activeTab = MutableStateFlow("search") // "search" | "directions"
    val activeTab: StateFlow<String> = _activeTab.asStateFlow()

    private val _loading = MutableStateFlow(false)
    val loading: StateFlow<Boolean> = _loading.asStateFlow()

    private val _toast = MutableStateFlow("")
    val toast: StateFlow<String> = _toast.asStateFlow()

    // Danh sách gợi ý tách biệt cho từng input (như web)
    private val _places = MutableStateFlow<List<Place>>(emptyList())
    val places: StateFlow<List<Place>> = _places.asStateFlow()

    private val _originSuggestions = MutableStateFlow<List<Place>>(emptyList())
    val originSuggestions: StateFlow<List<Place>> = _originSuggestions.asStateFlow()

    private val _destSuggestions = MutableStateFlow<List<Place>>(emptyList())
    val destSuggestions: StateFlow<List<Place>> = _destSuggestions.asStateFlow()

    private val _directions = MutableStateFlow<DirectionsResponse?>(null)
    val directions: StateFlow<DirectionsResponse?> = _directions.asStateFlow()

    private val _polylinePoints = MutableStateFlow<List<LatLng>>(emptyList())
    val polylinePoints: StateFlow<List<LatLng>> = _polylinePoints.asStateFlow()

    private val _selectedPlace = MutableStateFlow<Place?>(null)
    val selectedPlace: StateFlow<Place?> = _selectedPlace.asStateFlow()

    private val _favorites = MutableStateFlow<List<Favorite>>(emptyList())
    val favorites: StateFlow<List<Favorite>> = _favorites.asStateFlow()

    // ── Setters ───────────────────────────────────────────
    fun setQuery(q: String) { _query.value = q }
    fun setActiveTab(t: String) { _activeTab.value = t }
    fun selectPlace(p: Place?) { _selectedPlace.value = p }
    
    fun setOrigin(name: String, coords: String = "") {
        _origin.value = name
        _originCoords.value = coords
        _originSuggestions.value = emptyList()
    }
    
    fun setDestination(name: String, coords: String = "") {
        _destination.value = name
        _destinationCoords.value = coords
        _destSuggestions.value = emptyList()
    }

    fun clearDirections() {
        _directions.value = null
        _polylinePoints.value = emptyList()
    }

    fun showToast(msg: String) {
        viewModelScope.launch {
            _toast.value = msg
            delay(3000)
            _toast.value = ""
        }
    }

    private suspend fun getToken(): String {
        val user = auth.currentUser ?: return ""
        return try { "Bearer ${user.getIdToken(false).await().token}" } catch (e: Exception) { "" }
    }

    // ── API Logic ────────────────────────────────────────
    fun searchPlaces(q: String, type: String = "query") {
        if (q.isBlank()) {
            when(type) {
                "origin" -> _originSuggestions.value = emptyList()
                "destination" -> _destSuggestions.value = emptyList()
                else -> _places.value = emptyList()
            }
            return
        }
        
        viewModelScope.launch {
            try {
                val token = getToken()
                val response = RetrofitClient.api.searchPlaces(token, q)
                if (response.isSuccessful) {
                    val result = response.body()?.places ?: emptyList()
                    when(type) {
                        "origin" -> _originSuggestions.value = result
                        "destination" -> _destSuggestions.value = result
                        else -> _places.value = result
                    }
                }
            } catch (_: Exception) {}
        }
    }

    fun getDirections() {
        val start = if (_originCoords.value.isNotBlank()) _originCoords.value else _origin.value
        val end = if (_destinationCoords.value.isNotBlank()) _destinationCoords.value else _destination.value

        if (start.isBlank() || end.isBlank()) return

        viewModelScope.launch {
            _loading.value = true
            try {
                val token = getToken()
                
                // Chuẩn bị tham số
                val finalStart = if (start == "Vị trí của bạn") "10.7769,106.7009" else start
                
                val response = RetrofitClient.api.getDirections(token, finalStart, end)
                if (response.isSuccessful) {
                    val data = response.body()
                    _directions.value = data
                    val pts = data?.geometry
                        ?.filter { it.size >= 2 }
                        ?.map { LatLng(it[1], it[0]) } ?: emptyList()
                    android.util.Log.e("MAP_DEBUG", "API returned geometry size: ${data?.geometry?.size}, parsed to polyline size: ${pts.size}")
                    _polylinePoints.value = pts
                    
                    _places.value = emptyList() 
                    if (_polylinePoints.value.isNotEmpty()) showToast("Đã tìm thấy lộ trình!")
                } else {
                    showToast("Lỗi API: ${response.code()}")
                }
            } catch (e: Exception) {
                android.util.Log.e("MAP_DEBUG", "getDirections ERROR: ", e)
                showToast("Lỗi kết nối: ${e.message}")
            } finally {
                _loading.value = false
            }
        }
    }

    fun addFavorite(place: Place) {
        viewModelScope.launch {
            try {
                val token = getToken()
                RetrofitClient.api.addFavorite(token, AddFavoriteRequest(place.placeId, place.name, place.address, place.lat, place.lng))
                showToast("✅ Đã lưu yêu thích")
            } catch (e: Exception) { showToast(e.message ?: "Lỗi") }
        }
    }

    fun loadFavorites() {
        viewModelScope.launch {
            _loading.value = true
            try {
                val token = getToken()
                val response = RetrofitClient.api.getFavorites(token)
                if (response.isSuccessful) {
                    _favorites.value = response.body()?.favorites ?: emptyList()
                }
            } catch (e: Exception) { showToast(e.message ?: "Lỗi tải yêu thích") }
            finally { _loading.value = false }
        }
    }

    fun removeFavorite(id: String) {
        viewModelScope.launch {
            try {
                val token = getToken()
                RetrofitClient.api.removeFavorite(token, id)
                _favorites.value = _favorites.value.filter { it.id != id }
                showToast("Đã xóa khỏi yêu thích")
            } catch (e: Exception) { showToast("Lỗi xóa yêu thích") }
        }
    }
}
