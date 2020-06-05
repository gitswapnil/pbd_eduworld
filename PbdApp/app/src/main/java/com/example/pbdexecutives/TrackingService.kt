package com.example.pbdexecutives

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.location.LocationManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import java.util.*


class TrackingService : Service() {
    lateinit var gpsSwitchStateReceiver: BroadcastReceiver;

    override fun onCreate() {
        super.onCreate()

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
                    } else {
                        // Handle Location turned OFF
                        Log.i("pbdLog", "GPS is turned off. stopping the service.");
                        stopSelf();
                    }
                }
            }
        }

        this.registerReceiver(gpsSwitchStateReceiver, filter);
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        super.onStartCommand(intent, flags, startId);
        Log.i("pbdLog", "Starting the Tracker Service");
//        monitorLocationSwitch();

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

        return START_STICKY;
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.i("pbdLog", "Tracker Service closed.");

        this.unregisterReceiver(gpsSwitchStateReceiver);
    }

    override fun onBind(intent: Intent): IBinder {
        TODO("Return the communication channel to the service.")
    }
}