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
import android.provider.ContactsContract.Directory.PACKAGE_NAME
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices


class TrackingService : Service() {
    lateinit var gpsSwitchStateReceiver: BroadcastReceiver;
    private lateinit var fusedLocationClient: FusedLocationProviderClient
    val actionBroadcast: String = "$PACKAGE_NAME.broadcastSwitchState";

    val switchInfo: String = "$PACKAGE_NAME.switchInfo";

    override fun onCreate() {
        super.onCreate()
        gpsSwitchHandlerAttach();

        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        startTracking();
    }

    fun broadcastSwitchState(state: Boolean) {
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

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        super.onStartCommand(intent, flags, startId);
        Log.i("pbdLog", "Starting the Tracker Service");

        val pendingIntent: PendingIntent = Intent(this, HomeActivity::class.java).let { notificationIntent ->
            PendingIntent.getActivity(this, 0, notificationIntent, 0)
        }

        var notificationBuider: Notification.Builder;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {       //for API level 26 and above.
            notificationBuider = Notification.Builder(this, PbdExecutives().CHANNEL_ID);
        } else {
            notificationBuider = Notification.Builder(this);
        }

        val notification: Notification = notificationBuider.setContentTitle(getText(R.string.navigation_notification_message))
            .setSmallIcon(R.drawable.pbd_notification_icon)
            .setContentIntent(pendingIntent)
            .build()

        startForeground(64, notification);      //start the service in the foreground
        broadcastSwitchState(true);

        return START_STICKY;
    }

    private fun startTracking() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED && ActivityCompat.checkSelfPermission(this,Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            Log.i("pbdLog", "Location Permission is not granted.");
            return
        }

        fusedLocationClient.lastLocation.addOnSuccessListener { location : Location? ->
                // Got last known location. In some rare situations this can be null.
            Log.i("pbdLog", "Longitude: ${location?.longitude}, and Lattitude: ${location?.latitude}");
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.i("pbdLog", "Tracker Service closed.");
        gpsSwitchHandlerDettach();
        broadcastSwitchState(false);
    }

    override fun onBind(intent: Intent): IBinder {
        TODO("Return the communication channel to the service.")
    }
}