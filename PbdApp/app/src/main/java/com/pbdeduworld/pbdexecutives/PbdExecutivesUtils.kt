package com.pbdeduworld.pbdexecutives

import android.app.ActivityManager
import android.app.Application
import android.content.Context
import android.content.DialogInterface
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.NetworkInfo
import android.os.Build
import android.util.Log
import androidx.appcompat.app.AlertDialog
import androidx.core.content.ContextCompat
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import androidx.room.Room
import androidx.work.*
import com.android.volley.DefaultRetryPolicy
import com.android.volley.Request
import com.android.volley.Response
import com.android.volley.toolbox.JsonObjectRequest
import com.android.volley.toolbox.Volley
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.*
import java.util.concurrent.TimeUnit

class PbdExecutivesUtils: Application() {
    companion object {
        //global variables go here...
//        val serverAddress = "http://localhost:3000/api"
//        val serverAddress = "http://15.207.53.164:3000/api"
        val serverAddress = "https://mypbd.net/api"

        val APP_MAJOR_VERSION = 1.toShort()
        val APP_MINOR_VERSION = 0.toShort()
        val APP_BUILD = 232

        val PERMISSION_REQUEST_FINE_ACCESS = 1
        val REQUEST_CHECK_LOCATION_SETTINGS = 2
        val CHANNEL_ID = "TrackingServiceChannel"
        val actionUserLoggedOut: String = "${android.provider.ContactsContract.Directory.PACKAGE_NAME}.broadcastUserLoggedOut";
        val appVersionChanged: String = "${android.provider.ContactsContract.Directory.PACKAGE_NAME}.broadcastAppVersionChanged";

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
//            Log.i("pbdLog", "networkCapabilities: $networkCapabilities")
                return networkCapabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true;
            } else {
                val activeNetwork: NetworkInfo? = cm.activeNetworkInfo
                return activeNetwork?.isConnectedOrConnecting == true
            }
        }

        //This method gives whether a service is running or not.
        fun isMyServiceRunning(context: Context, serviceClass: Class<*>): Boolean {
            val manager: ActivityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            for (service: ActivityManager.RunningServiceInfo in manager.getRunningServices(Int.MAX_VALUE)) {
                if (serviceClass.name == service.service.className) {
                    return true
                }
            }
            return false
        }

        fun logoutUser(context: Context) {
            GlobalScope.launch {
                //clear all of his data first
                val db = Room.databaseBuilder(context, AppDB::class.java, "PbdDB").build();
                db.userDetailsDao().clearUserDetails()
                db.tasksDao().clearTasks()
                db.followUpsDao().clearFollowUps()
                db.partiesDao().clearParties()
                db.locationsDao().clearLocations()
                db.receiptsDao().clearReceipts()
                db.notificationsDao().clearNotifications()

                //clear the worker if the user is logged out
                WorkManager.getInstance(context).cancelUniqueWork("serversync")

                //send the broadcast signal that the user has logged out.
                val intent = Intent(actionUserLoggedOut)
                LocalBroadcastManager.getInstance(context).sendBroadcast(intent)

                if(isMyServiceRunning(context, TrackingService::class.java)){
                    stopTrackingService(context)     //Stop tracking service if the service is alive.
                }
            }
        }

        fun requestToInstallNewApp(context: Context) {
            //send the broadcast signal that the app version is changed.
            val intent = Intent(appVersionChanged)
            LocalBroadcastManager.getInstance(context).sendBroadcast(intent)
        }

        fun sendData(context: Context,
                     api: String,
                     jsonRequestObject: JSONObject,
                     successCallback: (code: Int, response: Any) -> Unit,
                     failureCallback: (code: Int, response: Any) -> Unit,
                     policy: DefaultRetryPolicy) {
            val queue = Volley.newRequestQueue(context)       //create a request
            val url = "${serverAddress}/$api"             //url for the request

            val request = JsonObjectRequest(
                Request.Method.POST, url, jsonRequestObject,
                { response ->
                    val responseJSON: JSONObject = JSONObject(response.toString())      //convert the response back into JSON Object from the response string
                    if(responseJSON.get("error") == false) {            //If it has no errors, then store the apiKey and go to HomeActivity
                        successCallback(responseJSON.get("code") as Int, responseJSON.get("message"))
                    } else {            //otherwise keep showing the error
                        failureCallback(responseJSON.get("code") as Int, responseJSON.get("message"))
                    }
                },
                {
                    failureCallback(500, it)
                })
            // Volley request policy, only one time request to avoid duplicate transaction
            request.retryPolicy = policy
            // Add the volley post request to the request queue
            queue.add(request)
        }

        fun startTrackingService(context: Context) {
            val serviceIntent = Intent(context, TrackingService::class.java)
            ContextCompat.startForegroundService(context, serviceIntent);
        }

        fun stopTrackingService(context: Context) {
            val serviceIntent = Intent(context, TrackingService::class.java)
            context.stopService(serviceIntent);
        }

        fun syncData(context: Context) {
            var policyOfSyncing: ExistingPeriodicWorkPolicy = ExistingPeriodicWorkPolicy.REPLACE

            val workInfos = WorkManager.getInstance(context).getWorkInfosForUniqueWork("serversync").get()

            if (workInfos.isNotEmpty() && workInfos[0].state == WorkInfo.State.RUNNING) {
                policyOfSyncing = ExistingPeriodicWorkPolicy.KEEP
            }

            val constraints = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
            val serverSyncRequest: PeriodicWorkRequest =
                PeriodicWorkRequestBuilder<ServerSyncWorker>(15, TimeUnit.MINUTES)
                    .setConstraints(constraints)
                    .build()

            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork("serversync", policyOfSyncing, serverSyncRequest)
        }

        fun stopSyncing(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork("serversync")
        }
    }
}
