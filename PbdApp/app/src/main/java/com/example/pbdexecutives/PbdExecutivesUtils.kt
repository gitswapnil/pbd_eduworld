package com.example.pbdexecutives

import android.app.Application
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.NetworkInfo
import android.os.Build
import android.util.Log
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import androidx.room.Room
import androidx.work.WorkManager
import com.android.volley.DefaultRetryPolicy
import com.android.volley.Request
import com.android.volley.Response
import com.android.volley.toolbox.JsonObjectRequest
import com.android.volley.toolbox.Volley
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.*

class PbdExecutivesUtils: Application() {
    //global variables go here...
    val serverAddress = "http://localhost:3000/api";
    val PERMISSION_REQUEST_FINE_ACCESS = 1;
    val REQUEST_CHECK_LOCATION_SETTINGS = 2;
    val CHANNEL_ID = "TrackingServiceChannel";
    val actionUserLoggedOut: String = "${android.provider.ContactsContract.Directory.PACKAGE_NAME}.broadcastUserLoggedOut";

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

    fun logoutUser(context: Context) {
        GlobalScope.launch {
            //clear all of his data first
            val db = Room.databaseBuilder(context, AppDB::class.java, "PbdDB").build();
            db.userDetailsDao().clearUserDetails()

            //clear the worker if the user is logged out
            WorkManager.getInstance(this@PbdExecutivesUtils).cancelUniqueWork("serversync")

            //send the broadcast signal that the user has logged out.
            val intent = Intent(actionUserLoggedOut)
            LocalBroadcastManager.getInstance(this@PbdExecutivesUtils).sendBroadcast(intent)
        }
    }

    fun sendData(context: Context,
                 api: String,
                 jsonRequestObject: JSONObject,
                 successCallback: (code: Int, response: Any) -> Unit,
                 failureCallback: (code: Int, response: Any) -> Unit,
                 policy: DefaultRetryPolicy) {
        val queue = Volley.newRequestQueue(context)       //create a request
        val url = "${PbdExecutivesUtils().serverAddress}/$api"             //url for the request

        val request = JsonObjectRequest(
            Request.Method.POST, url, jsonRequestObject,
            Response.Listener { response ->
                val responseJSON: JSONObject = JSONObject(response.toString())      //convert the response back into JSON Object from the response string
                if(responseJSON.get("error") == false) {            //If it has no errors, then store the apiKey and go to HomeActivity
                    successCallback(responseJSON.get("code") as Int, responseJSON.get("message"))
                } else {            //otherwise keep showing the error
                    failureCallback(responseJSON.get("code") as Int, responseJSON.get("message"))
                }
            },
            Response.ErrorListener {
                failureCallback(500, it)
            })
        // Volley request policy, only one time request to avoid duplicate transaction
        request.retryPolicy = policy
        // Add the volley post request to the request queue
        queue.add(request)
    }
}
