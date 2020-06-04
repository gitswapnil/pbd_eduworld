package com.example.pbdexecutives

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.annotation.RequiresApi

class TrackingService : Service() {
    override fun onCreate() {
        super.onCreate()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i("pbdLog", "Starting the Navigation Service");

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


        return super.onStartCommand(intent, flags, startId);
    }

    override fun onDestroy() {
        super.onDestroy()
    }

    override fun onBind(intent: Intent): IBinder {
        TODO("Return the communication channel to the service.")
    }
}
