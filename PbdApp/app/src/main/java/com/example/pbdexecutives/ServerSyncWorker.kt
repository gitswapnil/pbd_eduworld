package com.example.pbdexecutives

import android.content.Context
import android.telecom.Call
import android.util.Log
import androidx.concurrent.futures.CallbackToFutureAdapter
import androidx.room.Room
import androidx.work.ListenableWorker
import androidx.work.WorkerParameters
import com.android.volley.DefaultRetryPolicy
import com.android.volley.Response
import com.google.common.util.concurrent.ListenableFuture
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.IOException
import java.lang.Exception
import javax.security.auth.callback.Callback

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

class ServerSyncWorker(appContext: Context, workerParams: WorkerParameters): ListenableWorker(appContext, workerParams){
    private fun syncData() {

    }

    override fun startWork(): ListenableFuture<Result> {
        Log.i("pbdLog", "Sync worker started.")
        return CallbackToFutureAdapter.getFuture { completer ->
            GlobalScope.launch {
                val db = Room.databaseBuilder(applicationContext, AppDB::class.java, "PbdDB").build();
                val apiKey: String? = db.userDetailsDao().getApiKey();
                if (apiKey != null) {            //if the user is not logged in then dont sync anything.
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

//                    if (locations.size != 0 ) {           //If there are no locations to be synced, just ignore
//                        this.cancel()
//                    }

                    val requestJSONObject: JSONObject = JSONObject(Gson().toJson(RequestObject(apiKey.toString(), locations)))
                    Log.i("pbdLog", "requestJSONObject: $requestJSONObject")

                    PbdExecutivesUtils().sendData(
                        applicationContext,
                        "syncdata",
                        requestJSONObject,
                        { code, response ->
                            val responseObject = Gson().fromJson(
                                response.toString(),
                                MessageObject::class.java
                            );      //convert the response back into JSON Object from the response string
                            Log.i("pbdLog", "responseObject: $responseObject")
                            //if the response object has location ids then only update them from the local database
                            if(responseObject.locationIds != null && responseObject.locationIds.size != 0) {
                                var updateIds: List<Long> = listOf()
                                responseObject.locationIds.forEach {
                                    updateIds += it;
                                }

                                GlobalScope.launch {
                                    db.locationsDao().updateSyncStatus(updateIds)     //update the locations as synced to database
                                }
                            }
                            completer.set(Result.success())
                        },
                        { code, error ->
                            Log.i("pbdLog", "Error...${error}")
                            if(code == 401) {       //401 means, the user's password is changed by the admin
                                PbdExecutivesUtils().logoutUser(applicationContext)
                            }
                            completer.setException(Throwable(error.toString()))
                        },
                        DefaultRetryPolicy(
                            DefaultRetryPolicy.DEFAULT_TIMEOUT_MS,
                            DefaultRetryPolicy.DEFAULT_MAX_RETRIES,
                            DefaultRetryPolicy.DEFAULT_BACKOFF_MULT
                        )
                    )
                }
            }
        }
    }

    override fun onStopped() {
        super.onStopped()

        Log.i("pbdLog", "Sync Worker is stopped.")
    }
}