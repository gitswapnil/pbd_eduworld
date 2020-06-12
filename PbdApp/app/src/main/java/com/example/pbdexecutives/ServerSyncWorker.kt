package com.example.pbdexecutives

import android.content.Context
import android.util.Log
import android.view.contentcapture.ContentCaptureSessionId
import androidx.concurrent.futures.CallbackToFutureAdapter
import androidx.room.Room
import androidx.work.ListenableWorker
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.android.volley.DefaultRetryPolicy
import com.android.volley.Request
import com.android.volley.Response
import com.android.volley.toolbox.JsonObjectRequest
import com.android.volley.toolbox.Volley
import com.google.common.util.concurrent.ListenableFuture
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.*
import kotlin.collections.ArrayList

data class LocationObject(
    @SerializedName("id") val id: Long,
    @SerializedName("latitude") val latitude: Double,
    @SerializedName("longitude") val longitude: Double,
    @SerializedName("sessionId") val sessionId: Int,
    @SerializedName("createdAt") val createdAt: Long
)

data class RequestObject(
    @SerializedName("apiKey") val apiKey: String,
    @SerializedName("locations") val locations: List<LocationObject>
)

data class MessageObject(
    @SerializedName("locationIds") val locationIds: ArrayList<Long>?
)

data class ResponseObject(
    @SerializedName("error") val error: Boolean,
    @SerializedName("message") val message: MessageObject
)

class ServerSyncWorker(appContext: Context, workerParams: WorkerParameters): ListenableWorker(appContext, workerParams){
    override fun startWork(): ListenableFuture<Result> {
        Log.i("pbdLog", "Sync worker started.")
        return CallbackToFutureAdapter.getFuture { completer: CallbackToFutureAdapter.Completer<Result> ->
            GlobalScope.launch {
                val db = Room.databaseBuilder(applicationContext, AppDB::class.java, "PbdDB").build();
                val apiKey: String? = db.userDetailsDao().getApiKey();
                if (apiKey != null) {            //if the user is not logged in then dont sync anything.
                    val queue = Volley.newRequestQueue(applicationContext);
                    val url = "${PbdExecutivesUtils().serverAddress}/syncdata";

                    val locations = ArrayList<LocationObject>()
                    db.locationsDao().getUnsyncedLocations().forEach {
                        locations.add(
                            LocationObject(
                                it.id,
                                it.latitude,
                                it.longitude,
                                it.sessionId,
                                it.createdAt
                            )
                        )
                    }

                    if (locations.size != 0) {           //If there are no locations to be synced, just ignore
                        val requestJSONObject: JSONObject = JSONObject(Gson().toJson(RequestObject(apiKey.toString(), locations)))

                        Log.i("pbdLog", "requestJSONObject: $requestJSONObject")

                        val request = JsonObjectRequest(
                            Request.Method.POST, url, requestJSONObject,
                            Response.Listener { response ->
                                val responseObject = Gson().fromJson(
                                    response.toString(),
                                    ResponseObject::class.java
                                );      //convert the response back into JSON Object from the response string
                                Log.i("pbdLog", "responseObject: $responseObject")
                                if (!responseObject.error) {            //If it has no errors, then store the apiKey and go to HomeActivity
                                    //if the response object has location ids then only update them from the local database
                                    if(responseObject.message.locationIds != null && responseObject.message.locationIds.size != 0) {
                                        var updateIds: List<Long> = listOf()
                                        responseObject.message.locationIds.forEach {
                                            updateIds += it;
                                        }
                                        GlobalScope.launch {
                                            db.locationsDao().updateSyncStatus(updateIds)     //update the locations as synced to database
                                            completer.set(Result.success())
                                        }
                                    }
                                } else {            //otherwise keep showing the error
                                    Log.i("pbdLog", "Error from the server: ${responseObject.message}");
                                    completer.set(Result.success())
                                }
                            },
                            Response.ErrorListener {
                                Log.i("pbdLog", "Unable to communicate with the server...${it}")
                                completer.setException(it);
                            })

                        request.retryPolicy = DefaultRetryPolicy(
                            DefaultRetryPolicy.DEFAULT_TIMEOUT_MS,
                            DefaultRetryPolicy.DEFAULT_MAX_RETRIES,
                            DefaultRetryPolicy.DEFAULT_BACKOFF_MULT
                        )

                        // Add the volley post request to the request queue
                        queue.add(request);
                    }
                }
            }
        }
    }

    override fun onStopped() {
        super.onStopped()

        Log.i("pbdLog", "Sync Worker is stopped.")
    }
}