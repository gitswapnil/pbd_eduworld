package com.example.pbdexecutives

import android.app.Application
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.NetworkInfo
import android.os.Build
import android.util.Log
import java.util.*

class PbdExecutivesUtils: Application() {
    //global variables go here...
    val serverAddress = "http://localhost:3000/api";
    val PERMISSION_REQUEST_FINE_ACCESS = 1;
    val REQUEST_CHECK_LOCATION_SETTINGS = 2;
    val CHANNEL_ID = "TrackingServiceChannel";

    fun fromTimestamp(value: Long?): Date? {
        return value?.let { Date(it) }
    }

    fun dateToTimestamp(date: Date?): Long? {
        return date?.time?.toLong()
    }

    fun isInternetExists(context: Context): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager;
        if(Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val networkCapabilities = cm.getNetworkCapabilities(cm.activeNetwork);
            Log.i("pbdLog", "networkCapabilities: $networkCapabilities")
            return networkCapabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true;
        } else {
            val activeNetwork: NetworkInfo? = cm.activeNetworkInfo
            return activeNetwork?.isConnectedOrConnecting == true
        }
    }
}