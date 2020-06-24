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

data class RequestObject(
    @SerializedName("apiKey") val apiKey: String,
    @SerializedName("locations") val locations: List<LocationObject>,
    @SerializedName("lastUserDetails") val lastUserDetails: Long,
    @SerializedName("lastPartyDetails") val lastPartyDetails: Long
)

data class UserDetailsResponseObject(
    @SerializedName("name") val name: String,
    @SerializedName("phoneNo") val phoneNo: String,
    @SerializedName("email") val email: String,
    @SerializedName("img") val img: String,
    @SerializedName("address") val address: String,
    @SerializedName("updatedAt") val updatedAt: Long
)

data class PartyDetailsResponseObject(
    @SerializedName("upsert") val upsert: List<Parties>,
    @SerializedName("remove") val remove: List<String>
)

data class MessageObject(
    @SerializedName("locationIds") val locationIds: List<Long>?,
    @SerializedName("userDetails") val userDetails: UserDetailsResponseObject?,
    @SerializedName("partyDetails") val partyDetails: PartyDetailsResponseObject?
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

                    val lastUserDetails: Long = db.userDetailsDao().getCurrentUser().updatedAt

                    val lastPartyDetails = db.partiesDao().getLastUpdatedParty()
                    var lastPartyUpdatedAt:Long = 1

                    if(lastPartyDetails != null) {      //if the user is initially loading the data then Parties table wont ne there hence check for the null rule
                        lastPartyUpdatedAt = lastPartyDetails.updatedAt
                    }

//                    if (locations.size != 0 ) {           //If there are no locations to be synced, just ignore
//                        this.cancel()
//                    }

                    val requestJSONObject: JSONObject = JSONObject(Gson().toJson(RequestObject(apiKey.toString(), locations, lastUserDetails, lastPartyUpdatedAt)))
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

                            if(responseObject.locationIds != null && responseObject.locationIds.isNotEmpty()) {
                                var updateIds: MutableList<Long> = ArrayList()
                                responseObject.locationIds.forEach {
                                    updateIds.add(it);
                                }

                                GlobalScope.launch {
                                    db.locationsDao().updateSyncStatus(updateIds)     //update the locations as synced to database
                                }
                            }

                            if(responseObject.userDetails != null) {
                                val userDetailsRef: UserDetailsResponseObject = responseObject.userDetails
                                GlobalScope.launch {
                                    db.userDetailsDao().saveUserDetails(
                                        name = userDetailsRef.name,
                                        phoneNo = userDetailsRef.phoneNo,
                                        email = userDetailsRef.email,
                                        img = if(userDetailsRef.img != null) Base64.decode(userDetailsRef.img, Base64.DEFAULT) else ByteArray(0x0),
                                        address = userDetailsRef.address,
                                        updatedAt = userDetailsRef.updatedAt
                                    )
                                }
                            }

                            if(responseObject.partyDetails != null) {
                                val idsToRemove: MutableList<String> = ArrayList()
                                val partiesToUpsert: MutableList<Parties> = ArrayList()
                                if(responseObject.partyDetails.remove.isNotEmpty()) {
                                    idsToRemove.addAll(responseObject.partyDetails.remove)
                                }

                                if(responseObject.partyDetails.upsert.isNotEmpty()) {
                                    responseObject.partyDetails.upsert.forEach { party ->
                                        idsToRemove.add(party.id)
                                        partiesToUpsert.add(party)
                                    }
                                }

                                GlobalScope.launch {
                                    Log.i("pbdLog", "idsToRemove: $idsToRemove")
                                    Log.i("pbdLog", "partiesToUpsert: $partiesToUpsert")
                                    db.partiesDao().removeParties(idsToRemove)
                                    db.partiesDao().addParties(partiesToUpsert)
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