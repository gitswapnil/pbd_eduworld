package com.example.pbdexecutives

import android.content.Context
import android.telecom.Call
import android.util.Base64
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

data class UserDetailsObject(
    @SerializedName("updatedAt") val updatedAt: Long
)

data class RequestObject(
    @SerializedName("apiKey") val apiKey: String,
    @SerializedName("locations") val locations: List<LocationObject>,
    @SerializedName("userDetails") val userDetails: UserDetailsObject
)

data class UserDetailsResponseObject(
    @SerializedName("name") val name: String,
    @SerializedName("phoneNo") val phoneNo: String,
    @SerializedName("email") val email: String,
    @SerializedName("img") val img: String,
    @SerializedName("address") val address: String,
    @SerializedName("updatedAt") val updatedAt: Long
)

data class MessageObject(
    @SerializedName("locationIds") val locationIds: ArrayList<Long>?,
    @SerializedName("userDetails") val userDetails: UserDetailsResponseObject
)

class ServerSyncWorker(appContext: Context, workerParams: WorkerParameters): ListenableWorker(appContext, workerParams){
    override fun startWork(): ListenableFuture<Result> {
        Log.i("pbdLog", "Sync worker started.")
        return CallbackToFutureAdapter.getFuture { completer ->
            GlobalScope.launch {
                val db = Room.databaseBuilder(applicationContext, AppDB::class.java, "PbdDB").build()
                val apiKey: String? = db.userDetailsDao().getApiKey()
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

                    val userDetails = db.userDetailsDao().getCurrentUser()
                    val userDetailsObject = UserDetailsObject(userDetails.updatedAt)

//                    if (locations.size != 0 ) {           //If there are no locations to be synced, just ignore
//                        this.cancel()
//                    }

                    val requestJSONObject: JSONObject = JSONObject(Gson().toJson(RequestObject(apiKey.toString(), locations, userDetailsObject)))
                    Log.i("pbdLog", "requestJSONObject: $requestJSONObject")

                    PbdExecutivesUtils().sendData(
                        applicationContext,
                        "syncdata",
                        requestJSONObject,
                        { code, response ->
                            Log.i("pbdLog", "response: $response")
                            val responseObject = Gson().fromJson(
                                response.toString(),
                                MessageObject::class.java
                            );      //convert the response back into JSON Object from the response string
//                            Log.i("pbdLog", "responseObject: $responseObject")
                            //if the response object has location ids then only update them from the local database

                            if(responseObject.userDetails != null) {
                                val userDetails = responseObject.userDetails
                                GlobalScope.launch {
                                    db.userDetailsDao().saveUserDetails(
                                        name = userDetails.name,
                                        phoneNo = userDetails.phoneNo,
                                        email = userDetails.email,
                                        img = if(userDetails.img != null) Base64.decode(userDetails.img, Base64.DEFAULT) else ByteArray(0x0),
                                        address = userDetails.address,
                                        updatedAt = userDetails.updatedAt
                                    )
                                }
                            }

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