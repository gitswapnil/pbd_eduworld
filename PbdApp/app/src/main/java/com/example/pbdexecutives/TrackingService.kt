package com.example.pbdexecutives

import android.Manifest
import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.os.IBinder
import android.os.Looper
import android.provider.ContactsContract.Directory.PACKAGE_NAME
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import androidx.room.Room
import com.google.android.gms.location.*
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import java.util.*
import kotlin.random.Random.Default.nextInt


class TrackingService : Service() {
    private lateinit var gpsSwitchStateReceiver: BroadcastReceiver;
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    val actionBroadcast: String = "$PACKAGE_NAME.broadcastSwitchState";
    val switchInfo: String = "$PACKAGE_NAME.switchInfo";
    private lateinit var locationRequest: LocationRequest;
    private val updateIntervalMilliseconds: Long = 1000 * 60;       //in milliseconds
    private val fastestUpdateIntervalMilliseconds: Long = updateIntervalMilliseconds / 2;
    private lateinit var locationCallback: LocationCallback;
    private var sessionId: Int = 0;

    override fun onCreate() {
        super.onCreate()
        gpsSwitchHandlerAttach();
        createLocationRequest();

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                super.onLocationResult(locationResult)
                saveLocation(locationResult.lastLocation)
            }
        }
    }

    private fun createLocationRequest() {
        locationRequest = LocationRequest();
        locationRequest.interval = updateIntervalMilliseconds
        locationRequest.fastestInterval = fastestUpdateIntervalMilliseconds
        locationRequest.priority = LocationRequest.PRIORITY_HIGH_ACCURACY
    }

    private fun broadcastSwitchState(state: Boolean) {
        val intent = Intent(actionBroadcast);
        intent.putExtra(switchInfo, state);
        Log.i("pbdLog", "Sending the broadcast value: $state");
        LocalBroadcastManager.getInstance(applicationContext).sendBroadcast(intent);
    }

    private fun gpsSwitchHandlerAttach() {
        val filter = IntentFilter(LocationManager.PROVIDERS_CHANGED_ACTION)
        filter.addAction(Intent.ACTION_PROVIDER_CHANGED)

        gpsSwitchStateReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                if (LocationManager.PROVIDERS_CHANGED_ACTION == intent.action) {
                    val locationManager: LocationManager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
                    val isGpsEnabled: Boolean = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
                    val isNetworkEnabled: Boolean = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
                    if (isGpsEnabled || isNetworkEnabled) {
                        // Handle Location turned ON
                        //Do not send broadcast even if the switch is turned ON.
                    } else {
                        // Handle Location turned OFF
                        Log.i("pbdLog", "GPS is turned off. stopping the service.");
                        // Notify anyone listening for broadcasts about the new switch State.
                        broadcastSwitchState(false);
                        stopSelf();
                    }
                }
            }
        }

        this.registerReceiver(gpsSwitchStateReceiver, filter);
    }

    private fun gpsSwitchHandlerDettach() {
        this.unregisterReceiver(gpsSwitchStateReceiver);
    }

    private fun createNotification(): Notification {
        val pendingIntent: PendingIntent = Intent(this, HomeActivity::class.java).let { notificationIntent ->
            PendingIntent.getActivity(this, 0, notificationIntent, 0)
        }

        var notificationBuider: Notification.Builder;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {       //for API level 26 and above.
            notificationBuider = Notification.Builder(this, PbdExecutivesUtils().CHANNEL_ID);
        } else {
            notificationBuider = Notification.Builder(this);
        }

        val notification: Notification = notificationBuider.setContentTitle(getText(R.string.navigation_notification_message))
            .setSmallIcon(R.drawable.pbd_notification_icon)
            .setContentIntent(pendingIntent)
            .build();

        return notification;
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        super.onStartCommand(intent, flags, startId);
        Log.i("pbdLog", "Starting the Tracker Service");
        val notification = createNotification();

        startForeground(64, notification);      //start the service in the foreground
        broadcastSwitchState(true);
        startTracking();

        return START_STICKY;
    }

    private fun startTracking() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            return
        }
        sessionId = (100000..999999).random();
        fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper())
    }

    private fun stopTracking() {
        getLastLocation();
        fusedLocationClient.removeLocationUpdates(locationCallback)
    }

    private fun getLastLocation() {
        try {
            val lastLocation = fusedLocationClient.lastLocation;
            lastLocation.addOnSuccessListener { lastLocation ->
                Log.i("pbdLog","Last location is obtained Latitude: ${lastLocation?.latitude}, Longitude: ${lastLocation?.longitude}")
                saveLocation(lastLocation);
            }

            lastLocation.addOnFailureListener { exception ->
                Log.i("pbdLog", "Failed to get Last Location, error: $exception.");
            }
        } catch (unlikely: SecurityException) {
            Log.e("pbdLog","Lost location permission.$unlikely");
        }
    }

    private fun saveLocation(newLocation: Location) {
        Log.i("pbdLog", "Saving location, Latitude: ${newLocation.latitude}, Longitude: ${newLocation.longitude}");

        val self = this;
        GlobalScope.launch {
            try {
                val db: AppDB = Room.databaseBuilder(self, AppDB::class.java, "PbdDB").build();
                val location = Locations(latitude = newLocation.latitude, longitude = newLocation.longitude, sessionId = sessionId, createdAt = Date());
                db.locationsDao().saveLocation(location);        //store the apiKey in local database.
            } catch(e: Exception) {
                Log.i("pbdLog", "Unable to store the location, exception: ${e}");
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.i("pbdLog", "Tracker Service closed.");
        stopTracking();
        gpsSwitchHandlerDettach();
        broadcastSwitchState(false);
    }

    override fun onBind(intent: Intent): IBinder {
        TODO("Return the communication channel to the service.")
    }

}